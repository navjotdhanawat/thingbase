import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import type { Device, CreateDevice, UpdateDevice } from '@thingbase/shared';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, REDIS_KEYS } from '@thingbase/shared';

interface DeviceFilterParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

interface ClaimTokenData {
  deviceId: string;
  tenantId: string;
  status: 'pending' | 'claimed' | 'expired';
  createdAt: string;
  expiresAt: string;
  deviceInfo?: {
    macAddress?: string;
    firmwareVersion?: string;
    chipId?: string;
    model?: string;
  };
}

interface CreateClaimTokenInput {
  deviceTypeId?: string;
  name: string;
  metadata?: Record<string, unknown>;
}

interface DeviceClaimInput {
  claimToken: string;
  deviceInfo?: {
    macAddress?: string;
    firmwareVersion?: string;
    chipId?: string;
    model?: string;
  };
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) { }

  /**
   * List devices in tenant with optional filters
   */
  async findAll(tenantId: string, params: DeviceFilterParams = {}) {
    const page = params.page || 1;
    const pageSize = Math.min(
      params.pageSize || DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const skip = (page - 1) * pageSize;

    // Build where clause with optional filters
    const where: any = { tenantId };

    // Filter by status if provided
    if (params.status) {
      where.status = params.status;
    }

    // Search by name or externalId if provided
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { externalId: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { type: true },
      }),
      this.prisma.device.count({ where }),
    ]);

    return {
      items: devices.map(this.mapToDto),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get device by ID (within tenant)
   */
  async findById(tenantId: string, id: string): Promise<Device> {
    const device = await this.prisma.device.findFirst({
      where: { id, tenantId },
      include: { type: true },
    });

    if (!device) {
      throw new NotFoundException(`Device with id ${id} not found`);
    }

    return this.mapToDto(device);
  }

  /**
   * Create device
   */
  async create(tenantId: string, dto: CreateDevice): Promise<Device> {
    // Normalize externalId: treat empty strings as null
    const externalId = dto.externalId && dto.externalId.trim() !== '' ? dto.externalId.trim() : null;

    // Check for duplicate external ID within tenant if provided
    if (externalId) {
      const existing = await this.prisma.device.findFirst({
        where: { tenantId, externalId },
      });

      if (existing) {
        throw new ConflictException(
          'Device with this external ID already exists',
        );
      }
    }

    // Validate typeId belongs to tenant if provided
    if (dto.typeId) {
      const deviceType = await this.prisma.deviceType.findFirst({
        where: { id: dto.typeId, tenantId },
      });
      if (!deviceType) {
        throw new NotFoundException('Device type not found');
      }
    }

    const device = await this.prisma.device.create({
      data: {
        tenantId,
        typeId: dto.typeId,
        name: dto.name,
        externalId: externalId,
        metadata: (dto.metadata || {}) as any,
        status: 'pending',
      },
      include: { type: true },
    });

    this.logger.log(`Created device: ${device.name} (${device.id})`);

    return this.mapToDto(device);
  }

  /**
   * Update device
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateDevice,
  ): Promise<Device> {
    // Verify device exists in tenant
    await this.findById(tenantId, id);

    // Normalize externalId if provided
    let externalId = dto.externalId;
    if (externalId !== undefined) {
      externalId = externalId && externalId.trim() !== '' ? externalId.trim() : null;
    }

    // Check for duplicate external ID if updating
    if (externalId) {
      const existing = await this.prisma.device.findFirst({
        where: {
          tenantId,
          externalId: externalId,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          'Device with this external ID already exists',
        );
      }
    }

    // Validate typeId belongs to tenant if provided
    if (dto.typeId) {
      const deviceType = await this.prisma.deviceType.findFirst({
        where: { id: dto.typeId, tenantId },
      });
      if (!deviceType) {
        throw new NotFoundException('Device type not found');
      }
    }

    const device = await this.prisma.device.update({
      where: { id },
      data: {
        name: dto.name,
        typeId: dto.typeId,
        externalId: externalId,
        metadata: dto.metadata as any,
      },
      include: { type: true },
    });

    this.logger.log(`Updated device: ${device.name} (${device.id})`);

    return this.mapToDto(device);
  }

  /**
   * Delete device
   */
  async delete(tenantId: string, id: string): Promise<void> {
    // Verify device exists in tenant
    await this.findById(tenantId, id);

    // Delete device state from Redis
    await this.redis.del(REDIS_KEYS.DEVICE_STATE(id));

    // Delete related records first (commands, telemetry)
    await this.prisma.$transaction([
      this.prisma.command.deleteMany({
        where: { deviceId: id },
      }),
      this.prisma.telemetry.deleteMany({
        where: { deviceId: id },
      }),
      this.prisma.device.delete({
        where: { id },
      }),
    ]);

    this.logger.log(`Deleted device: ${id}`);
  }

  /**
   * Generate provisioning token for device
   */
  async generateProvisionToken(
    tenantId: string,
    deviceId: string,
    expiresInHours = 24,
  ): Promise<{ token: string; expiresAt: Date }> {
    // Verify device exists in tenant
    const device = await this.findById(tenantId, deviceId);

    // Generate random token
    const token = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // Store credential
    await this.prisma.deviceCredential.create({
      data: {
        deviceId,
        tokenHash,
        type: 'provision',
        expiresAt,
      },
    });

    this.logger.log(`Generated provision token for device: ${device.name}`);

    return { token, expiresAt };
  }

  /**
   * Validate provisioning token and provision device
   */
  async provision(
    deviceId: string,
    provisionToken: string,
  ): Promise<{
    mqttCredentials: { clientId: string; username: string; password: string };
  }> {
    // Find device
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        credentials: {
          where: {
            type: 'provision',
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Validate provision token
    let validCredential = null;
    for (const cred of device.credentials) {
      const isValid = await bcrypt.compare(provisionToken, cred.tokenHash);
      if (isValid) {
        validCredential = cred;
        break;
      }
    }

    if (!validCredential) {
      throw new NotFoundException('Invalid or expired provision token');
    }

    // Generate MQTT credentials
    const mqttPassword = randomBytes(32).toString('hex');
    const mqttPasswordHash = await bcrypt.hash(mqttPassword, 10);

    // Create MQTT credential
    await this.prisma.deviceCredential.create({
      data: {
        deviceId,
        tokenHash: mqttPasswordHash,
        type: 'mqtt',
      },
    });

    // Revoke provision token
    await this.prisma.deviceCredential.update({
      where: { id: validCredential.id },
      data: { revokedAt: new Date() },
    });

    // Update device status
    await this.prisma.device.update({
      where: { id: deviceId },
      data: { status: 'provisioned' },
    });

    this.logger.log(`Provisioned device: ${device.name} (${device.id})`);

    return {
      mqttCredentials: {
        clientId: `device-${deviceId}`,
        username: deviceId,
        password: mqttPassword,
      },
    };
  }

  /**
   * Get device state from Redis
   */
  async getState(
    tenantId: string,
    deviceId: string,
  ): Promise<Record<string, unknown> | null> {
    // Verify device exists in tenant
    await this.findById(tenantId, deviceId);

    const stateJson = await this.redis.get(REDIS_KEYS.DEVICE_STATE(deviceId));
    return stateJson ? JSON.parse(stateJson) : null;
  }

  private mapToDto(device: any): Device {
    return {
      id: device.id,
      tenantId: device.tenantId,
      typeId: device.typeId,
      type: device.type ? {
        id: device.type.id,
        name: device.type.name,
        slug: device.type.slug,
        icon: device.type.icon,
        color: device.type.color,
        schema: device.type.schema,
      } : null,
      name: device.name,
      externalId: device.externalId,
      status: device.status,
      lastSeen: device.lastSeen,
      metadata: device.metadata,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }

  // ============================================================================
  // MOBILE APP CLAIM TOKEN FLOW
  // ============================================================================

  /**
   * Generate a claim token for mobile app device onboarding
   * The token is stored in Redis with 15 minute expiry
   */
  async generateClaimToken(
    tenantId: string,
    input: CreateClaimTokenInput,
  ): Promise<{
    claimToken: string;
    deviceId: string;
    qrCodeData: string;
    expiresAt: Date;
    expiresInSeconds: number;
  }> {
    // Validate device type if provided
    if (input.deviceTypeId) {
      const deviceType = await this.prisma.deviceType.findFirst({
        where: { id: input.deviceTypeId, tenantId },
      });
      if (!deviceType) {
        throw new NotFoundException('Device type not found');
      }
    }

    // Create device in pending state
    const device = await this.prisma.device.create({
      data: {
        tenantId,
        typeId: input.deviceTypeId,
        name: input.name,
        metadata: (input.metadata || {}) as any,
        status: 'pending',
      },
    });

    // Generate claim token (ct_ prefix for identification)
    const tokenBytes = randomBytes(24);
    const claimToken = `ct_${tokenBytes.toString('base64url')}`;

    // Token expires in 15 minutes
    const expiresInSeconds = 15 * 60;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // Store claim token data in Redis
    const claimData: ClaimTokenData = {
      deviceId: device.id,
      tenantId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const redisKey = this.getClaimTokenKey(claimToken);
    await this.redis.set(redisKey, JSON.stringify(claimData), expiresInSeconds);

    // Also store reverse lookup: deviceId -> claimToken (for WebSocket notifications)
    const deviceClaimKey = `device:claim:${device.id}`;
    await this.redis.set(deviceClaimKey, claimToken, expiresInSeconds);

    this.logger.log(`Generated claim token for device: ${device.name} (${device.id})`);

    // QR code data format for mobile app
    const qrCodeData = `iot://claim?token=${claimToken}&device=${device.id}`;

    return {
      claimToken,
      deviceId: device.id,
      qrCodeData,
      expiresAt,
      expiresInSeconds,
    };
  }

  /**
   * Check claim token status (called by mobile app via polling or WebSocket)
   */
  async getClaimStatus(claimToken: string): Promise<{
    status: 'pending' | 'claimed' | 'expired' | 'online';
    device?: Device;
  }> {
    const redisKey = this.getClaimTokenKey(claimToken);
    const claimDataJson = await this.redis.get(redisKey);

    if (!claimDataJson) {
      return { status: 'expired' };
    }

    const claimData: ClaimTokenData = JSON.parse(claimDataJson);

    // Get device info
    const device = await this.prisma.device.findUnique({
      where: { id: claimData.deviceId },
      include: { type: true },
    });

    if (!device) {
      return { status: 'expired' };
    }

    // Check if device is online
    if (device.status === 'online') {
      return {
        status: 'online',
        device: this.mapToDto(device),
      };
    }

    if (claimData.status === 'claimed' || device.status === 'provisioned') {
      return {
        status: 'claimed',
        device: this.mapToDto(device),
      };
    }

    return {
      status: 'pending',
      device: this.mapToDto(device),
    };
  }

  /**
   * Device claims itself using the token (called by physical device)
   * Returns MQTT credentials for the device
   */
  async claimDevice(input: DeviceClaimInput): Promise<{
    deviceId: string;
    tenantId: string;
    mqtt: {
      broker: string;
      clientId: string;
      username: string;
      password: string;
      topics: {
        telemetry: string;
        commands: string;
        status: string;
      };
    };
  }> {
    const redisKey = this.getClaimTokenKey(input.claimToken);
    const claimDataJson = await this.redis.get(redisKey);

    if (!claimDataJson) {
      throw new BadRequestException('Invalid or expired claim token');
    }

    const claimData: ClaimTokenData = JSON.parse(claimDataJson);

    if (claimData.status !== 'pending') {
      throw new BadRequestException('Claim token has already been used');
    }

    // Get device
    const device = await this.prisma.device.findUnique({
      where: { id: claimData.deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Generate MQTT credentials
    const mqttPassword = randomBytes(32).toString('hex');
    const mqttPasswordHash = await bcrypt.hash(mqttPassword, 10);

    // Store MQTT credentials
    await this.prisma.deviceCredential.create({
      data: {
        deviceId: device.id,
        tokenHash: mqttPasswordHash,
        type: 'mqtt',
      },
    });

    // Update device status and store device info
    const updatedMetadata = {
      ...(device.metadata as any),
      deviceInfo: input.deviceInfo,
      provisionedAt: new Date().toISOString(),
    };

    await this.prisma.device.update({
      where: { id: device.id },
      data: {
        status: 'provisioned',
        metadata: updatedMetadata,
      },
    });

    // Update claim token status in Redis
    claimData.status = 'claimed';
    claimData.deviceInfo = input.deviceInfo;
    await this.redis.set(redisKey, JSON.stringify(claimData), 60 * 60); // Keep for 1 hour after claim

    // Publish event for WebSocket notification
    await this.redis.publish('device:claimed', JSON.stringify({
      deviceId: device.id,
      tenantId: device.tenantId,
      claimToken: input.claimToken,
      status: 'claimed',
    }));

    this.logger.log(`Device claimed: ${device.name} (${device.id})`);

    // Get MQTT broker URL from config
    const mqttBroker = process.env.MQTT_URL || 'mqtt://localhost:1883';

    return {
      deviceId: device.id,
      tenantId: device.tenantId,
      mqtt: {
        broker: mqttBroker,
        clientId: `d_${device.id}`,
        username: device.id,
        password: mqttPassword,
        topics: {
          telemetry: `t/${device.tenantId}/d/${device.id}/telemetry`,
          commands: `t/${device.tenantId}/d/${device.id}/cmd`,
          status: `t/${device.tenantId}/d/${device.id}/status`,
        },
      },
    };
  }

  /**
   * Get Redis key for claim token
   */
  private getClaimTokenKey(token: string): string {
    // Hash the token for storage (don't store raw tokens)
    const tokenHash = createHash('sha256').update(token).digest('hex').substring(0, 16);
    return `claim:${tokenHash}`;
  }
}
