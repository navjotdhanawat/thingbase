import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs', description: 'Get audit logs for tenant (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'resourceType', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startTime', required: false, type: String })
  @ApiQuery({ name: 'endTime', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  async listLogs(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('userId') userId?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    const data = await this.auditService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      action,
      resourceType,
      userId,
      startTime,
      endTime,
    });

    return {
      success: true,
      data,
    };
  }

  @Get('resource/:type/:id')
  @ApiOperation({ summary: 'Get resource logs', description: 'Get audit logs for a specific resource' })
  @ApiParam({ name: 'type', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Resource audit logs' })
  async getResourceLogs(
    @CurrentTenant() tenantId: string,
    @Param('type') resourceType: string,
    @Param('id') resourceId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.auditService.findByResource(
      tenantId,
      resourceType,
      resourceId,
      {
        page: page ? parseInt(page, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      }
    );

    return {
      success: true,
      data,
    };
  }

  @Get('actions')
  @ApiOperation({ summary: 'Get action types', description: 'Get distinct action types for filtering' })
  @ApiResponse({ status: 200, description: 'List of action types' })
  async getActions(@CurrentTenant() tenantId: string) {
    const actions = await this.auditService.getActionTypes(tenantId);

    return {
      success: true,
      data: actions,
    };
  }

  @Get('resource-types')
  @ApiOperation({ summary: 'Get resource types', description: 'Get distinct resource types for filtering' })
  @ApiResponse({ status: 200, description: 'List of resource types' })
  async getResourceTypes(@CurrentTenant() tenantId: string) {
    const types = await this.auditService.getResourceTypes(tenantId);

    return {
      success: true,
      data: types,
    };
  }
}

