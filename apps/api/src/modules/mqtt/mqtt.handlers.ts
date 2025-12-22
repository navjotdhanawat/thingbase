import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { MqttService, MqttMessage } from './mqtt.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CommandsService } from '../commands/commands.service';
import { AlertEvaluatorService } from '../alerts/alert-evaluator.service';
import { REDIS_KEYS } from '@thingbase/shared';
import { mqttAckPayloadSchema } from '@thingbase/shared';

@Injectable()
export class MqttHandlers implements OnModuleInit {
  private readonly logger = new Logger(MqttHandlers.name);

  constructor(
    private readonly mqtt: MqttService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => CommandsService))
    private readonly commands: CommandsService,
    @Inject(forwardRef(() => AlertEvaluatorService))
    private readonly alertEvaluator: AlertEvaluatorService,
  ) { }

  onModuleInit() {
    // Register handlers for different message types
    this.mqtt.registerHandler('telemetry', this.handleTelemetry.bind(this));
    this.mqtt.registerHandler('ack', this.handleAck.bind(this));
    this.mqtt.registerHandler('status', this.handleStatus.bind(this));
  }

  /**
   * Handle telemetry messages from devices
   */
  private async handleTelemetry(message: MqttMessage) {
    const { tenantId, deviceId, payload } = message;

    if (!tenantId || !deviceId) {
      this.logger.warn('Invalid telemetry message: missing tenantId or deviceId');
      return;
    }

    try {
      const data = JSON.parse(payload.toString());

      // Store telemetry in database
      await this.prisma.telemetry.create({
        data: {
          tenantId,
          deviceId,
          data,
        },
      });

      // Update device last seen
      await this.prisma.device.update({
        where: { id: deviceId },
        data: {
          lastSeen: new Date(),
          status: 'online',
        },
      });

      // Flatten telemetry data for easier access in UI widgets
      const telemetryData = data.data && typeof data.data === 'object' ? data.data : {};

      // Update device state in Redis
      const currentState = await this.redis.get(REDIS_KEYS.DEVICE_STATE(deviceId));
      const state = currentState ? JSON.parse(currentState) : {};

      const newState = {
        ...state,
        ...data,
        ...telemetryData,
        lastSeen: new Date().toISOString(),
        online: true,
      };

      await this.redis.set(
        REDIS_KEYS.DEVICE_STATE(deviceId),
        JSON.stringify(newState),
      );

      // Publish update to Redis channel for WebSocket fan-out
      await this.redis.publish(
        REDIS_KEYS.DEVICE_UPDATES_CHANNEL(tenantId),
        JSON.stringify({
          type: 'device:telemetry',
          deviceId,
          data: { ...data, ...telemetryData }, // Send flattened data to frontend
          timestamp: new Date().toISOString(),
        }),
      );

      // Evaluate telemetry against alert rules (threshold alerts)
      try {
        const telemetryData = data.data || data; // Handle nested data structure
        await this.alertEvaluator.evaluateTelemetry(tenantId, deviceId, telemetryData);
      } catch (error) {
        this.logger.error(`Failed to evaluate alerts for ${deviceId}`, error);
      }

      this.logger.debug(`Processed telemetry from device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to process telemetry from ${deviceId}`, error);
    }
  }

  /**
   * Handle acknowledgment messages from devices
   */
  private async handleAck(message: MqttMessage) {
    const { tenantId, deviceId, payload } = message;

    if (!tenantId || !deviceId) {
      this.logger.warn('Invalid ack message: missing tenantId or deviceId');
      return;
    }

    try {
      const data = JSON.parse(payload.toString());
      const parseResult = mqttAckPayloadSchema.safeParse(data);

      if (!parseResult.success) {
        this.logger.warn(`Invalid ack payload from ${deviceId}:`, parseResult.error);
        return;
      }

      const ackData = parseResult.data;

      // Update command status
      await this.commands.handleCommandAck(
        ackData.correlationId,
        ackData.status === 'success' ? 'acked' : 'failed',
        ackData.error,
      );

      // Update device state if provided
      if (ackData.state) {
        const currentState = await this.redis.get(REDIS_KEYS.DEVICE_STATE(deviceId));
        const state = currentState ? JSON.parse(currentState) : {};

        const newState = {
          ...state,
          ...ackData.state,
          lastSeen: new Date().toISOString(),
          online: true,
        };

        await this.redis.set(
          REDIS_KEYS.DEVICE_STATE(deviceId),
          JSON.stringify(newState),
        );
      }

      // Publish update to Redis channel
      await this.redis.publish(
        REDIS_KEYS.DEVICE_UPDATES_CHANNEL(tenantId),
        JSON.stringify({
          type: 'command:ack',
          deviceId,
          correlationId: ackData.correlationId,
          status: ackData.status,
          error: ackData.error,
          state: ackData.state,
          timestamp: new Date().toISOString(),
        }),
      );

      this.logger.debug(`Processed ack for command ${ackData.correlationId}`);
    } catch (error) {
      this.logger.error(`Failed to process ack from ${deviceId}`, error);
    }
  }

  /**
   * Handle status messages (LWT - Last Will and Testament)
   */
  private async handleStatus(message: MqttMessage) {
    const { tenantId, deviceId, payload } = message;

    if (!tenantId || !deviceId) {
      this.logger.warn('Invalid status message: missing tenantId or deviceId');
      return;
    }

    try {
      const data = JSON.parse(payload.toString());
      const online = data.status === 'online';

      // Update device status
      await this.prisma.device.update({
        where: { id: deviceId },
        data: {
          status: online ? 'online' : 'offline',
          lastSeen: new Date(),
        },
      });

      // Update Redis state
      const currentState = await this.redis.get(REDIS_KEYS.DEVICE_STATE(deviceId));
      const state = currentState ? JSON.parse(currentState) : {};

      const newState = {
        ...state,
        online,
        lastSeen: new Date().toISOString(),
      };

      await this.redis.set(
        REDIS_KEYS.DEVICE_STATE(deviceId),
        JSON.stringify(newState),
      );

      // Publish update
      await this.redis.publish(
        REDIS_KEYS.DEVICE_UPDATES_CHANNEL(tenantId),
        JSON.stringify({
          type: 'device:status',
          deviceId,
          online,
          timestamp: new Date().toISOString(),
        }),
      );

      // Evaluate device status against alert rules
      try {
        if (online) {
          // Device came online - auto-resolve offline alerts
          await this.alertEvaluator.evaluateDeviceOnline(tenantId, deviceId);
        } else {
          // Device went offline - trigger offline alerts
          await this.alertEvaluator.evaluateDeviceOffline(tenantId, deviceId);
        }
      } catch (error) {
        this.logger.error(`Failed to evaluate status alerts for ${deviceId}`, error);
      }

      this.logger.log(`Device ${deviceId} is now ${online ? 'online' : 'offline'}`);
    } catch (error) {
      this.logger.error(`Failed to process status from ${deviceId}`, error);
    }
  }
}

