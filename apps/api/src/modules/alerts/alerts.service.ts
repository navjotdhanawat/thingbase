import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateAlertRuleDto {
  deviceId?: string;
  name: string;
  type: 'device_offline' | 'threshold' | 'no_data';
  condition: Record<string, unknown>;
  enabled?: boolean;
}

interface UpdateAlertRuleDto {
  name?: string;
  type?: 'device_offline' | 'threshold' | 'no_data';
  condition?: Record<string, unknown>;
  enabled?: boolean;
}

interface AlertRuleQueryParams {
  page?: number;
  pageSize?: number;
  deviceId?: string;
  type?: string;
  enabled?: boolean;
}

interface AlertQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  ruleId?: string;
  deviceId?: string;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // ALERT RULES
  // ============================================================================

  /**
   * List all alert rules for a tenant
   */
  async findAllRules(tenantId: string, params: AlertRuleQueryParams = {}) {
    const { page = 1, pageSize = 20, deviceId, type, enabled } = params;
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };
    if (deviceId) where.deviceId = deviceId;
    if (type) where.type = type;
    if (enabled !== undefined) where.enabled = enabled;

    const [rules, total] = await Promise.all([
      this.prisma.alertRule.findMany({
        where,
        include: {
          device: {
            select: { id: true, name: true },
          },
          _count: {
            select: { alerts: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.alertRule.count({ where }),
    ]);

    return {
      items: rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        type: rule.type,
        condition: rule.condition,
        enabled: rule.enabled,
        deviceId: rule.deviceId,
        deviceName: rule.device?.name,
        alertCount: rule._count.alerts,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a single alert rule
   */
  async findRuleById(tenantId: string, ruleId: string) {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, tenantId },
      include: {
        device: {
          select: { id: true, name: true },
        },
        alerts: {
          take: 10,
          orderBy: { triggeredAt: 'desc' },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Alert rule not found');
    }

    return rule;
  }

  /**
   * Create a new alert rule
   */
  async createRule(tenantId: string, dto: CreateAlertRuleDto) {
    // If deviceId is specified, verify it exists in tenant
    if (dto.deviceId) {
      const device = await this.prisma.device.findFirst({
        where: { id: dto.deviceId, tenantId },
      });
      if (!device) {
        throw new NotFoundException('Device not found');
      }
    }

    const rule = await this.prisma.alertRule.create({
      data: {
        tenantId,
        deviceId: dto.deviceId,
        name: dto.name,
        type: dto.type,
        condition: dto.condition as any,
        enabled: dto.enabled ?? true,
      },
    });

    this.logger.log(`Created alert rule: ${rule.name} (${rule.id})`);

    return rule;
  }

  /**
   * Update an alert rule
   */
  async updateRule(tenantId: string, ruleId: string, dto: UpdateAlertRuleDto) {
    const existing = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Alert rule not found');
    }

    const rule = await this.prisma.alertRule.update({
      where: { id: ruleId },
      data: {
        name: dto.name,
        type: dto.type,
        condition: dto.condition as any,
        enabled: dto.enabled,
      },
    });

    this.logger.log(`Updated alert rule: ${rule.name} (${rule.id})`);

    return rule;
  }

  /**
   * Delete an alert rule
   */
  async deleteRule(tenantId: string, ruleId: string) {
    const existing = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Alert rule not found');
    }

    await this.prisma.alertRule.delete({
      where: { id: ruleId },
    });

    this.logger.log(`Deleted alert rule: ${existing.name} (${ruleId})`);
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  /**
   * List triggered alerts for a tenant
   */
  async findAllAlerts(tenantId: string, params: AlertQueryParams = {}) {
    const { page = 1, pageSize = 20, status, ruleId, deviceId } = params;
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (ruleId) where.ruleId = ruleId;
    if (deviceId) where.deviceId = deviceId;

    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        include: {
          rule: {
            select: { id: true, name: true, type: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { triggeredAt: 'desc' },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      items: alerts.map((alert) => ({
        id: alert.id,
        ruleId: alert.ruleId,
        ruleName: alert.rule.name,
        ruleType: alert.rule.type,
        deviceId: alert.deviceId,
        status: alert.status,
        metadata: alert.metadata,
        triggeredAt: alert.triggeredAt,
        resolvedAt: alert.resolvedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a single alert
   */
  async findAlertById(tenantId: string, alertId: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { id: alertId, tenantId },
      include: {
        rule: true,
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return alert;
  }

  /**
   * Create a new alert (triggered by evaluator)
   */
  async createAlert(data: {
    tenantId: string;
    ruleId: string;
    deviceId: string;
    metadata?: Record<string, unknown>;
  }) {
    const alert = await this.prisma.alert.create({
      data: {
        tenantId: data.tenantId,
        ruleId: data.ruleId,
        deviceId: data.deviceId,
        metadata: (data.metadata || {}) as any,
      },
    });

    this.logger.log(`Created alert for rule ${data.ruleId} on device ${data.deviceId}`);

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(tenantId: string, alertId: string) {
    const existing = await this.prisma.alert.findFirst({
      where: { id: alertId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Alert not found');
    }

    const alert = await this.prisma.alert.update({
      where: { id: alertId },
      data: { status: 'acknowledged' },
    });

    this.logger.log(`Acknowledged alert: ${alertId}`);

    return alert;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(tenantId: string, alertId: string) {
    const existing = await this.prisma.alert.findFirst({
      where: { id: alertId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Alert not found');
    }

    const alert = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    });

    this.logger.log(`Resolved alert: ${alertId}`);

    return alert;
  }

  /**
   * Get active alerts count for a tenant
   */
  async getActiveAlertsCount(tenantId: string) {
    return this.prisma.alert.count({
      where: {
        tenantId,
        status: 'active',
      },
    });
  }

  /**
   * Get enabled rules for a tenant (used by evaluator)
   */
  async getEnabledRules(tenantId: string) {
    return this.prisma.alertRule.findMany({
      where: {
        tenantId,
        enabled: true,
      },
    });
  }
}

