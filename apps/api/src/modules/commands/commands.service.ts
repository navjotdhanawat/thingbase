import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MqttService } from '../mqtt/mqtt.service';
import { v4 as uuidv4 } from 'uuid';
import { REDIS_KEYS, COMMAND_STATUS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@repo/shared';

interface CreateCommandDto {
  deviceId: string;
  type: string;
  payload: Record<string, unknown>;
}

interface FindAllParams {
  deviceId?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);
  private readonly COMMAND_TIMEOUT_MS = 30000; // 30 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => MqttService))
    private readonly mqtt: MqttService,
  ) {}

  /**
   * List commands for a device within a tenant with pagination
   */
  async findAll(tenantId: string, params: FindAllParams = {}) {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (page - 1) * pageSize;

    const where = {
      tenantId,
      ...(params.deviceId && { deviceId: params.deviceId }),
    };

    const [commands, total] = await Promise.all([
      this.prisma.command.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.command.count({ where }),
    ]);

    return {
      items: commands,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a specific command
   */
  async findOne(tenantId: string, id: string) {
    const command = await this.prisma.command.findFirst({
      where: { id, tenantId },
    });

    if (!command) {
      throw new NotFoundException('Command not found');
    }

    return command;
  }

  /**
   * Send a command to a device
   */
  async sendCommand(tenantId: string, dto: CreateCommandDto) {
    // Verify device exists and belongs to tenant
    const device = await this.prisma.device.findFirst({
      where: { id: dto.deviceId, tenantId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Generate correlation ID for tracking
    const correlationId = uuidv4();

    // Create command record
    const command = await this.prisma.command.create({
      data: {
        tenantId,
        deviceId: dto.deviceId,
        correlationId,
        type: dto.type,
        payload: dto.payload as any,
        status: COMMAND_STATUS.PENDING,
      },
    });

    // Store correlation mapping in Redis for fast lookup
    await this.redis.set(
      REDIS_KEYS.COMMAND_CORRELATION(correlationId),
      JSON.stringify({
        commandId: command.id,
        tenantId,
        deviceId: dto.deviceId,
      }),
      this.COMMAND_TIMEOUT_MS / 1000,
    );

    try {
      // Publish command via MQTT
      await this.mqtt.publishCommand(tenantId, dto.deviceId, {
        correlationId,
        action: dto.type,
        params: dto.payload,
        timestamp: new Date().toISOString(),
      });

      // Update status to sent
      const updatedCommand = await this.prisma.command.update({
        where: { id: command.id },
        data: {
          status: COMMAND_STATUS.SENT,
          sentAt: new Date(),
        },
      });

      // Schedule timeout check
      this.scheduleTimeoutCheck(command.id, correlationId);

      return updatedCommand;
    } catch (error) {
      // Mark as failed if publish fails
      const failedCommand = await this.prisma.command.update({
        where: { id: command.id },
        data: {
          status: COMMAND_STATUS.FAILED,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Handle command acknowledgement from device
   */
  async handleCommandAck(
    correlationId: string,
    status: 'acked' | 'failed',
    errorMessage?: string,
  ) {
    // Look up command from correlation ID
    const correlationData = await this.redis.get(
      REDIS_KEYS.COMMAND_CORRELATION(correlationId),
    );

    if (!correlationData) {
      this.logger.warn(`Command correlation not found: ${correlationId}`);
      return;
    }

    const { commandId, tenantId } = JSON.parse(correlationData);

    // Update command status
    const command = await this.prisma.command.update({
      where: { id: commandId },
      data: {
        status,
        errorMessage,
        completedAt: new Date(),
      },
    });

    // Clear correlation from Redis
    await this.redis.del(REDIS_KEYS.COMMAND_CORRELATION(correlationId));

    // Publish update via Redis pub/sub for WebSocket
    await this.redis.publish(
      REDIS_KEYS.COMMAND_UPDATES_CHANNEL(tenantId),
      JSON.stringify({
        type: 'command:update',
        commandId: command.id,
        status: command.status,
        errorMessage: command.errorMessage,
        completedAt: command.completedAt,
      }),
    );

    this.logger.log(`Command ${commandId} completed with status: ${status}`);
  }

  /**
   * Schedule a timeout check for a command
   */
  private scheduleTimeoutCheck(commandId: string, correlationId: string) {
    setTimeout(async () => {
      // Check if correlation still exists (means not acked)
      const exists = await this.redis.get(
        REDIS_KEYS.COMMAND_CORRELATION(correlationId),
      );

      if (exists) {
        const { tenantId } = JSON.parse(exists);

        // Mark as timeout
        await this.prisma.command.update({
          where: { id: commandId },
          data: {
            status: COMMAND_STATUS.TIMEOUT,
            errorMessage: 'Command timed out waiting for device response',
            completedAt: new Date(),
          },
        });

        // Clear correlation
        await this.redis.del(REDIS_KEYS.COMMAND_CORRELATION(correlationId));

        // Publish timeout event
        await this.redis.publish(
          REDIS_KEYS.COMMAND_UPDATES_CHANNEL(tenantId),
          JSON.stringify({
            type: 'command:timeout',
            commandId,
            status: COMMAND_STATUS.TIMEOUT,
          }),
        );

        this.logger.warn(`Command ${commandId} timed out`);
      }
    }, this.COMMAND_TIMEOUT_MS);
  }

  /**
   * Retry a failed command
   */
  async retryCommand(tenantId: string, commandId: string) {
    const command = await this.findOne(tenantId, commandId);

    if (
      command.status !== COMMAND_STATUS.FAILED &&
      command.status !== COMMAND_STATUS.TIMEOUT
    ) {
      throw new BadRequestException(
        'Can only retry failed or timed-out commands',
      );
    }

    // Create a new command with the same payload
    return this.sendCommand(tenantId, {
      deviceId: command.deviceId,
      type: command.type,
      payload: command.payload as Record<string, unknown>,
    });
  }
}
