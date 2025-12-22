import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MqttService } from '../mqtt/mqtt.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    mqtt: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mqtt: MqttService,
  ) {}

  async check(): Promise<HealthStatus> {
    const [database, redis, mqtt] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMqtt(),
    ]);

    const allOk = database.status === 'ok' && redis.status === 'ok' && mqtt.status === 'ok';

    return {
      status: allOk ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database,
        redis,
        mqtt,
      },
    };
  }

  async checkReadiness(): Promise<{ status: string }> {
    const health = await this.check();
    if (health.status !== 'ok') {
      throw new Error('Service not ready');
    }
    return { status: 'ok' };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        latency: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.redis.getClient().ping();
      return {
        status: 'ok',
        latency: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkMqtt(): Promise<ServiceStatus> {
    try {
      const connected = this.mqtt.isConnected();
      return {
        status: connected ? 'ok' : 'error',
        error: connected ? undefined : 'MQTT broker not connected',
      };
    } catch (error) {
      this.logger.error('MQTT health check failed', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

