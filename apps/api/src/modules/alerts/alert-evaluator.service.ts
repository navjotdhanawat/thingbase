import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from './alerts.service';
import { EmailService } from '../email/email.service';
import { RedisService } from '../../redis/redis.service';

interface TelemetryData {
  temperature?: number;
  humidity?: number;
  [key: string]: unknown;
}

interface ThresholdCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
}

@Injectable()
export class AlertEvaluatorService {
  private readonly logger = new Logger(AlertEvaluatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
    private readonly emailService: EmailService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Evaluate telemetry data against threshold rules
   */
  async evaluateTelemetry(
    tenantId: string,
    deviceId: string,
    data: TelemetryData,
  ) {
    // Get enabled threshold rules for this device or all devices
    const rules = await this.prisma.alertRule.findMany({
      where: {
        tenantId,
        enabled: true,
        type: 'threshold',
        OR: [
          { deviceId },
          { deviceId: null }, // Global rules
        ],
      },
    });

    for (const rule of rules) {
      try {
        const condition = rule.condition as unknown as ThresholdCondition;
        const value = data[condition.metric];

        if (typeof value !== 'number') continue;

        const triggered = this.evaluateCondition(value, condition.operator, condition.value);

        if (triggered) {
          await this.triggerAlert(tenantId, rule.id, deviceId, {
            metric: condition.metric,
            value,
            threshold: condition.value,
            operator: condition.operator,
          });
        }
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.id}: ${error}`);
      }
    }
  }

  /**
   * Evaluate device status change for offline rules
   */
  async evaluateDeviceOffline(tenantId: string, deviceId: string) {
    // Get enabled offline rules for this device or all devices
    const rules = await this.prisma.alertRule.findMany({
      where: {
        tenantId,
        enabled: true,
        type: 'device_offline',
        OR: [
          { deviceId },
          { deviceId: null },
        ],
      },
    });

    for (const rule of rules) {
      try {
        await this.triggerAlert(tenantId, rule.id, deviceId, {
          event: 'device_offline',
        });
      } catch (error) {
        this.logger.error(`Error triggering offline alert ${rule.id}: ${error}`);
      }
    }
  }

  /**
   * Auto-resolve device_offline alerts when device comes online
   */
  async evaluateDeviceOnline(tenantId: string, deviceId: string) {
    // Find active offline alerts for this device
    const activeAlerts = await this.prisma.alert.findMany({
      where: {
        tenantId,
        deviceId,
        status: 'active',
        rule: {
          type: 'device_offline',
        },
      },
    });

    for (const alert of activeAlerts) {
      await this.prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
        },
      });
      this.logger.log(`Auto-resolved offline alert ${alert.id} - device came online`);
    }
  }

  /**
   * Trigger an alert and send notifications
   */
  private async triggerAlert(
    tenantId: string,
    ruleId: string,
    deviceId: string,
    metadata: Record<string, unknown>,
  ) {
    // Check if there's already an active alert for this rule+device combo
    const existingActive = await this.prisma.alert.findFirst({
      where: {
        tenantId,
        ruleId,
        deviceId,
        status: 'active',
      },
    });

    if (existingActive) {
      this.logger.debug(`Skipping duplicate alert for rule ${ruleId} on device ${deviceId}`);
      return;
    }

    // Get rule and device info for notification
    const [rule, device] = await Promise.all([
      this.prisma.alertRule.findUnique({ where: { id: ruleId } }),
      this.prisma.device.findUnique({ where: { id: deviceId } }),
    ]);

    if (!rule || !device) {
      this.logger.error(`Rule or device not found: rule=${ruleId}, device=${deviceId}`);
      return;
    }

    // Create the alert
    const alert = await this.alertsService.createAlert({
      tenantId,
      ruleId,
      deviceId,
      metadata,
    });

    // Send email notification to admins
    try {
      const admins = await this.prisma.user.findMany({
        where: {
          tenantId,
          role: 'admin',
          status: 'active',
        },
      });

      const message = this.buildAlertMessage(rule.type, rule.name, metadata);

      for (const admin of admins) {
        await this.emailService.sendAlertNotification({
          to: admin.email,
          alertType: rule.type,
          deviceName: device.name,
          message,
          deviceId,
        });
      }

      this.logger.log(`Alert triggered and notifications sent: ${rule.name} on ${device.name}`);
    } catch (error) {
      this.logger.error(`Failed to send alert notification: ${error}`);
    }

    return alert;
  }

  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number,
  ): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      case '!=':
        return value !== threshold;
      default:
        return false;
    }
  }

  private buildAlertMessage(
    type: string,
    ruleName: string,
    metadata: Record<string, unknown>,
  ): string {
    switch (type) {
      case 'threshold':
        return `Alert "${ruleName}": ${metadata.metric} is ${metadata.value} (threshold: ${metadata.operator} ${metadata.threshold})`;
      case 'device_offline':
        return `Alert "${ruleName}": Device has gone offline`;
      case 'no_data':
        return `Alert "${ruleName}": No data received from device`;
      default:
        return `Alert "${ruleName}" triggered`;
    }
  }

  // ============================================================================
  // SCHEDULED JOBS
  // ============================================================================

  /**
   * Check for devices that haven't sent data (no_data alerts)
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async evaluateNoDataAlerts() {
    this.logger.debug('Running no_data alert evaluation...');

    try {
      // Get all enabled no_data rules grouped by tenant
      const noDataRules = await this.prisma.alertRule.findMany({
        where: {
          type: 'no_data',
          enabled: true,
        },
        include: {
          device: true,
        },
      });

      if (noDataRules.length === 0) {
        return;
      }

      // Group rules by tenant for efficient processing
      const rulesByTenant = new Map<string, typeof noDataRules>();
      for (const rule of noDataRules) {
        const existing = rulesByTenant.get(rule.tenantId) || [];
        existing.push(rule);
        rulesByTenant.set(rule.tenantId, existing);
      }

      // Process each tenant's rules
      for (const [tenantId, rules] of rulesByTenant) {
        await this.processNoDataRulesForTenant(tenantId, rules);
      }

      this.logger.debug(`Evaluated ${noDataRules.length} no_data rules`);
    } catch (error) {
      this.logger.error('Failed to evaluate no_data alerts', error);
    }
  }

  /**
   * Process no_data rules for a specific tenant
   */
  private async processNoDataRulesForTenant(
    tenantId: string,
    rules: Array<{
      id: string;
      deviceId: string | null;
      condition: any;
      device: { id: string; name: string; lastSeen: Date | null } | null;
    }>,
  ) {
    // Default threshold: 10 minutes without data
    const DEFAULT_NO_DATA_THRESHOLD_MINUTES = 10;

    for (const rule of rules) {
      try {
        // Get threshold from rule condition or use default
        const thresholdMinutes =
          (rule.condition as any)?.minutes || DEFAULT_NO_DATA_THRESHOLD_MINUTES;
        const thresholdTime = new Date(
          Date.now() - thresholdMinutes * 60 * 1000,
        );

        // Get devices to check
        let devicesToCheck: Array<{ id: string; name: string; lastSeen: Date | null }>;

        if (rule.deviceId && rule.device) {
          // Rule targets a specific device
          devicesToCheck = [rule.device];
        } else {
          // Rule targets all devices in tenant
          devicesToCheck = await this.prisma.device.findMany({
            where: {
              tenantId,
              status: { in: ['online', 'provisioned'] }, // Only check active devices
            },
            select: { id: true, name: true, lastSeen: true },
          });
        }

        // Check each device
        for (const device of devicesToCheck) {
          // Skip devices that have never been seen (newly provisioned)
          if (!device.lastSeen) continue;

          // Check if device hasn't sent data within threshold
          if (device.lastSeen < thresholdTime) {
            await this.triggerAlert(tenantId, rule.id, device.id, {
              event: 'no_data',
              lastSeen: device.lastSeen.toISOString(),
              thresholdMinutes,
            });
          }
        }
      } catch (error) {
        this.logger.error(`Error evaluating no_data rule ${rule.id}: ${error}`);
      }
    }
  }

  /**
   * Cleanup old resolved alerts (runs daily at 2 AM)
   * Keeps alerts for 30 days by default
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldAlerts() {
    const RETENTION_DAYS = 30;
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    try {
      const result = await this.prisma.alert.deleteMany({
        where: {
          status: 'resolved',
          resolvedAt: { lt: cutoffDate },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} old resolved alerts`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old alerts', error);
    }
  }
}

