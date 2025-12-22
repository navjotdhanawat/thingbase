import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviceTypeSchema, DeviceField } from '@thingbase/shared';

interface TelemetryQueryParams {
  startTime?: string;
  endTime?: string;
  interval?: '1m' | '5m' | '1h' | '1d';
  limit?: number;
}

export interface TelemetryDataPoint {
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface FieldStats {
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface TelemetryStats {
  count: number;
  firstReading?: Date;
  lastReading?: Date;
  fields: Record<string, FieldStats>;
}

export interface AggregatedDataPoint {
  bucket: Date;
  count: number;
  fields: Record<string, { avg: number; min: number; max: number }>;
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Get telemetry data for a device with time range
   */
  async getTelemetry(
    tenantId: string,
    deviceId: string,
    params: TelemetryQueryParams = {},
  ): Promise<TelemetryDataPoint[]> {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const endTime = params.endTime ? new Date(params.endTime) : new Date();
    const startTime = params.startTime
      ? new Date(params.startTime)
      : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const limit = Math.min(params.limit || 1000, 5000);

    const telemetry = await this.prisma.telemetry.findMany({
      where: {
        deviceId,
        tenantId,
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return telemetry.map((t) => ({
      timestamp: t.timestamp,
      data: t.data as Record<string, unknown>,
    }));
  }

  /**
   * Get latest telemetry reading for a device
   */
  async getLatestTelemetry(
    tenantId: string,
    deviceId: string,
  ): Promise<TelemetryDataPoint | null> {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const latest = await this.prisma.telemetry.findFirst({
      where: { deviceId, tenantId },
      orderBy: { timestamp: 'desc' },
    });

    if (!latest) {
      return null;
    }

    return {
      timestamp: latest.timestamp,
      data: latest.data as Record<string, unknown>,
    };
  }

  /**
   * Get telemetry statistics for a device - GENERIC version
   * Automatically detects and aggregates all numeric fields
   */
  async getTelemetryStats(
    tenantId: string,
    deviceId: string,
    params: { startTime?: string; endTime?: string } = {},
  ): Promise<TelemetryStats> {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
      include: { type: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const endTime = params.endTime ? new Date(params.endTime) : new Date();
    const startTime = params.startTime
      ? new Date(params.startTime)
      : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const telemetry = await this.prisma.telemetry.findMany({
      where: {
        deviceId,
        tenantId,
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (telemetry.length === 0) {
      return { count: 0, fields: {} };
    }

    // Get schema fields if device has a type (to know which fields to look for)
    const schemaFields = device.type?.schema
      ? (device.type.schema as unknown as DeviceTypeSchema).fields
      : null;

    // Collect values for each numeric field
    const fieldValues: Record<string, number[]> = {};

    for (const t of telemetry) {
      const rawData = t.data as Record<string, unknown>;
      const data = (rawData.data as Record<string, unknown>) || rawData;

      // If we have a schema, use those fields; otherwise, auto-detect
      const fieldsToCheck = schemaFields
        ? schemaFields.filter((f: DeviceField) => f.type === 'number').map((f: DeviceField) => f.key)
        : Object.keys(data);

      for (const key of fieldsToCheck) {
        const value = data[key];
        if (typeof value === 'number' && !isNaN(value)) {
          if (!fieldValues[key]) {
            fieldValues[key] = [];
          }
          fieldValues[key].push(value);
        }
      }
    }

    // Calculate stats for each field
    const fields: Record<string, FieldStats> = {};
    for (const [key, values] of Object.entries(fieldValues)) {
      if (values.length > 0) {
        fields[key] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
          count: values.length,
        };
      }
    }

    return {
      count: telemetry.length,
      firstReading: telemetry[0].timestamp,
      lastReading: telemetry[telemetry.length - 1].timestamp,
      fields,
    };
  }

  /**
   * Get aggregated telemetry data in time buckets - GENERIC version
   */
  async getAggregatedTelemetry(
    tenantId: string,
    deviceId: string,
    params: TelemetryQueryParams = {},
  ): Promise<AggregatedDataPoint[]> {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
      include: { type: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const endTime = params.endTime ? new Date(params.endTime) : new Date();
    const startTime = params.startTime
      ? new Date(params.startTime)
      : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

    const interval = params.interval || '1h';
    const intervalMs = this.getIntervalMs(interval);

    const telemetry = await this.prisma.telemetry.findMany({
      where: {
        deviceId,
        tenantId,
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Get schema fields if device has a type
    const schemaFields = device.type?.schema
      ? (device.type.schema as unknown as DeviceTypeSchema).fields
      : null;

    // Group by interval buckets
    const buckets = new Map<number, { count: number; fieldValues: Record<string, number[]> }>();

    for (const t of telemetry) {
      const bucketTime = Math.floor(t.timestamp.getTime() / intervalMs) * intervalMs;

      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, { count: 0, fieldValues: {} });
      }

      const bucket = buckets.get(bucketTime)!;
      bucket.count++;

      const rawData = t.data as Record<string, unknown>;
      const data = (rawData.data as Record<string, unknown>) || rawData;

      // If we have a schema, use those fields; otherwise, auto-detect
      const fieldsToCheck = schemaFields
        ? schemaFields.filter((f: DeviceField) => f.type === 'number').map((f: DeviceField) => f.key)
        : Object.keys(data);

      for (const key of fieldsToCheck) {
        const value = data[key];
        if (typeof value === 'number' && !isNaN(value)) {
          if (!bucket.fieldValues[key]) {
            bucket.fieldValues[key] = [];
          }
          bucket.fieldValues[key].push(value);
        }
      }
    }

    // Calculate aggregates for each bucket
    const result: AggregatedDataPoint[] = [];

    for (const [bucketTime, bucket] of buckets) {
      const fields: Record<string, { avg: number; min: number; max: number }> = {};

      for (const [key, values] of Object.entries(bucket.fieldValues)) {
        if (values.length > 0) {
          fields[key] = {
            avg: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
            min: Math.min(...values),
            max: Math.max(...values),
          };
        }
      }

      result.push({
        bucket: new Date(bucketTime),
        count: bucket.count,
        fields,
      });
    }

    return result.sort((a, b) => a.bucket.getTime() - b.bucket.getTime());
  }

  /**
   * Get device schema (from device type or auto-discovered from recent telemetry)
   */
  async getDeviceSchema(
    tenantId: string,
    deviceId: string,
  ): Promise<{ schema: DeviceTypeSchema | null; discovered: DeviceField[] }> {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
      include: { type: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // If device has a type, return its schema
    if (device.type?.schema) {
      return {
        schema: device.type.schema as unknown as DeviceTypeSchema,
        discovered: [],
      };
    }

    // Otherwise, auto-discover fields from recent telemetry
    const recentTelemetry = await this.prisma.telemetry.findMany({
      where: { deviceId, tenantId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    if (recentTelemetry.length === 0) {
      return { schema: null, discovered: [] };
    }

    // Discover field types from data
    const fieldTypes: Record<string, Set<string>> = {};

    for (const t of recentTelemetry) {
      const rawData = t.data as Record<string, unknown>;
      const data = (rawData.data as Record<string, unknown>) || rawData;

      for (const [key, value] of Object.entries(data)) {
        if (!fieldTypes[key]) {
          fieldTypes[key] = new Set();
        }
        fieldTypes[key].add(typeof value);
      }
    }

    // Generate discovered fields
    const discovered: DeviceField[] = [];
    for (const [key, types] of Object.entries(fieldTypes)) {
      const typeArray = Array.from(types);
      let fieldType: 'number' | 'boolean' | 'string' = 'string';

      if (typeArray.includes('number') && typeArray.length === 1) {
        fieldType = 'number';
      } else if (typeArray.includes('boolean') && typeArray.length === 1) {
        fieldType = 'boolean';
      }

      discovered.push({
        key,
        label: this.formatLabel(key),
        type: fieldType,
        ...this.getDefaultFieldConfig(key, fieldType),
      });
    }

    return { schema: null, discovered };
  }

  private getIntervalMs(interval: string): number {
    switch (interval) {
      case '1m':
        return 60 * 1000;
      case '5m':
        return 5 * 60 * 1000;
      case '1h':
        return 60 * 60 * 1000;
      case '1d':
        return 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  }

  private formatLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private getDefaultFieldConfig(key: string, type: 'number' | 'boolean' | 'string'): Partial<DeviceField> {
    // Known field configurations
    const knownFields: Record<string, Partial<DeviceField>> = {
      temperature: { unit: '°C', icon: 'thermometer', color: '#f97316', chartType: 'line' },
      humidity: { unit: '%', icon: 'droplets', color: '#3b82f6', chartType: 'line' },
      pressure: { unit: 'kPa', icon: 'gauge', color: '#8b5cf6', chartType: 'line' },
      battery: { unit: '%', icon: 'battery', color: '#22c55e', chartType: 'line' },
      rssi: { unit: 'dBm', icon: 'wifi', color: '#06b6d4', showInChart: false },
      voltage: { unit: 'V', icon: 'zap', color: '#eab308', chartType: 'line' },
      current: { unit: 'A', icon: 'activity', color: '#f97316', chartType: 'line' },
      power: { icon: 'power', chartType: 'boolean' },
      flow_rate: { unit: 'L/min', icon: 'waves', color: '#06b6d4', chartType: 'line' },
      moisture: { unit: '%', icon: 'droplets', color: '#3b82f6', chartType: 'line' },
    };

    if (knownFields[key]) {
      return knownFields[key];
    }

    // Default config based on type
    if (type === 'number') {
      return { icon: 'activity', color: '#6366f1', chartType: 'line' };
    } else if (type === 'boolean') {
      return { icon: 'toggle-left', chartType: 'boolean' };
    }

    return { icon: 'type' };
  }

  // ============================================================================
  // SCHEDULED JOBS - DATA RETENTION
  // ============================================================================

  /**
   * Clean up old telemetry data (runs daily at 3 AM)
   * Default retention: 30 days for free plan, can be extended per tenant
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldTelemetry() {
    this.logger.log('Starting telemetry data cleanup...');

    try {
      // Get all tenants with their plans
      const tenants = await this.prisma.tenant.findMany({
        select: { id: true, plan: true },
      });

      let totalDeleted = 0;

      for (const tenant of tenants) {
        // Retention period based on plan
        const retentionDays = this.getRetentionDays(tenant.plan);
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

        const result = await this.prisma.telemetry.deleteMany({
          where: {
            tenantId: tenant.id,
            timestamp: { lt: cutoffDate },
          },
        });

        if (result.count > 0) {
          this.logger.log(
            `Deleted ${result.count} telemetry records for tenant ${tenant.id} (older than ${retentionDays} days)`
          );
          totalDeleted += result.count;
        }
      }

      if (totalDeleted > 0) {
        this.logger.log(`Telemetry cleanup complete: ${totalDeleted} total records deleted`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup telemetry data', error);
    }
  }

  /**
   * Get retention days based on tenant plan
   */
  private getRetentionDays(plan: string): number {
    const retentionByPlan: Record<string, number> = {
      free: 7,        // 7 days for free tier
      starter: 30,    // 30 days for starter
      pro: 90,        // 90 days for pro
      enterprise: 365, // 1 year for enterprise
    };

    return retentionByPlan[plan] || 30; // Default 30 days
  }

  /**
   * Get telemetry storage statistics for tenant
   */
  async getStorageStats(tenantId: string): Promise<{
    totalRecords: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
    deviceBreakdown: Array<{ deviceId: string; deviceName: string; count: number }>;
  }> {
    const [totalRecords, oldest, newest, breakdown] = await Promise.all([
      this.prisma.telemetry.count({ where: { tenantId } }),
      this.prisma.telemetry.findFirst({
        where: { tenantId },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true },
      }),
      this.prisma.telemetry.findFirst({
        where: { tenantId },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      }),
      this.prisma.telemetry.groupBy({
        by: ['deviceId'],
        where: { tenantId },
        _count: { id: true },
      }),
    ]);

    // Get device names for the breakdown
    const deviceIds = breakdown.map(b => b.deviceId);
    const devices = await this.prisma.device.findMany({
      where: { id: { in: deviceIds } },
      select: { id: true, name: true },
    });
    const deviceMap = new Map(devices.map(d => [d.id, d.name]));

    return {
      totalRecords,
      oldestRecord: oldest?.timestamp || null,
      newestRecord: newest?.timestamp || null,
      deviceBreakdown: breakdown.map(b => ({
        deviceId: b.deviceId,
        deviceName: deviceMap.get(b.deviceId) || 'Unknown',
        count: b._count.id,
      })),
    };
  }
}
