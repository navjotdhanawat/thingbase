import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateAuditLogDto {
  tenantId: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

interface AuditLogQueryParams {
  page?: number;
  pageSize?: number;
  action?: string;
  resourceType?: string;
  userId?: string;
  startTime?: string;
  endTime?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Create an audit log entry
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: dto.tenantId,
          userId: dto.userId,
          action: dto.action,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          metadata: (dto.metadata || {}) as any,
        },
      });

      this.logger.debug(
        `Audit: ${dto.action} on ${dto.resourceType}/${dto.resourceId} by ${dto.userId || 'system'}`
      );
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      this.logger.error(`Failed to create audit log: ${error}`);
    }
  }

  /**
   * List audit logs for a tenant
   */
  async findAll(tenantId: string, params: AuditLogQueryParams = {}) {
    const {
      page = 1,
      pageSize = 50,
      action,
      resourceType,
      userId,
      startTime,
      endTime,
    } = params;
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (userId) where.userId = userId;
    if (startTime || endTime) {
      where.createdAt = {};
      if (startTime) where.createdAt.gte = new Date(startTime);
      if (endTime) where.createdAt.lte = new Date(endTime);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: logs.map((log: { id: string; action: string; resourceType: string | null; resourceId: string | null; metadata: unknown; createdAt: Date; user: { id: string; email: string; name: string | null } | null }) => ({
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        metadata: log.metadata,
        createdAt: log.createdAt,
        user: log.user
          ? {
            id: log.user.id,
            email: log.user.email,
            name: log.user.name,
          }
          : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get audit logs for a specific resource
   */
  async findByResource(
    tenantId: string,
    resourceType: string,
    resourceId: string,
    params: { page?: number; pageSize?: number } = {}
  ) {
    const { page = 1, pageSize = 20 } = params;
    const skip = (page - 1) * pageSize;

    const where = { tenantId, resourceType, resourceId };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: logs.map((log: { id: string; action: string; metadata: unknown; createdAt: Date; user: { id: string; email: string; name: string | null } | null }) => ({
        id: log.id,
        action: log.action,
        metadata: log.metadata,
        createdAt: log.createdAt,
        user: log.user
          ? {
            id: log.user.id,
            email: log.user.email,
            name: log.user.name,
          }
          : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get distinct action types for filtering
   */
  async getActionTypes(tenantId: string): Promise<string[]> {
    const result = await this.prisma.auditLog.findMany({
      where: { tenantId },
      distinct: ['action'],
      select: { action: true },
    });

    return result.map((r: { action: string }) => r.action);
  }

  /**
   * Get distinct resource types for filtering
   */
  async getResourceTypes(tenantId: string): Promise<string[]> {
    const result = await this.prisma.auditLog.findMany({
      where: { tenantId, resourceType: { not: null } },
      distinct: ['resourceType'],
      select: { resourceType: true },
    });

    return result.map((r: { resourceType: string | null }) => r.resourceType).filter(Boolean) as string[];
  }
}

