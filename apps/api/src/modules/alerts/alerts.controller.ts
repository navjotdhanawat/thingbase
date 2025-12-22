import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Alerts')
@ApiBearerAuth('access-token')
@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // ============================================================================
  // ALERT RULES
  // ============================================================================

  @Get('rules')
  @ApiOperation({ summary: 'List alert rules', description: 'Get all alert rules for tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'deviceId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['device_offline', 'threshold', 'no_data'] })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of alert rules' })
  async listRules(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('deviceId') deviceId?: string,
    @Query('type') type?: string,
    @Query('enabled') enabled?: string,
  ) {
    const data = await this.alertsService.findAllRules(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      deviceId,
      type,
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
    });

    return {
      success: true,
      data,
    };
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get alert rule', description: 'Get alert rule by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Alert rule details' })
  async getRule(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const rule = await this.alertsService.findRuleById(tenantId, id);

    return {
      success: true,
      data: rule,
    };
  }

  @Post('rules')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create alert rule', description: 'Create a new alert rule (admin only)' })
  @ApiResponse({ status: 201, description: 'Rule created' })
  async createRule(
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      deviceId?: string;
      name: string;
      type: 'device_offline' | 'threshold' | 'no_data';
      condition: Record<string, unknown>;
      enabled?: boolean;
    },
  ) {
    const rule = await this.alertsService.createRule(tenantId, body);

    return {
      success: true,
      data: rule,
    };
  }

  @Patch('rules/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update alert rule', description: 'Update an alert rule (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  async updateRule(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      name?: string;
      type?: 'device_offline' | 'threshold' | 'no_data';
      condition?: Record<string, unknown>;
      enabled?: boolean;
    },
  ) {
    const rule = await this.alertsService.updateRule(tenantId, id, body);

    return {
      success: true,
      data: rule,
    };
  }

  @Delete('rules/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete alert rule', description: 'Delete an alert rule (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Rule deleted' })
  async deleteRule(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.alertsService.deleteRule(tenantId, id);
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'List alerts', description: 'Get triggered alerts for tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'acknowledged', 'resolved'] })
  @ApiQuery({ name: 'ruleId', required: false, type: String })
  @ApiQuery({ name: 'deviceId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of alerts' })
  async listAlerts(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('ruleId') ruleId?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    const data = await this.alertsService.findAllAlerts(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
      ruleId,
      deviceId,
    });

    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert', description: 'Get alert by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Alert details' })
  async getAlert(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const alert = await this.alertsService.findAlertById(tenantId, id);

    return {
      success: true,
      data: alert,
    };
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge alert', description: 'Mark an alert as acknowledged' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const alert = await this.alertsService.acknowledgeAlert(tenantId, id);

    return {
      success: true,
      data: alert,
    };
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve alert', description: 'Mark an alert as resolved' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  async resolveAlert(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const alert = await this.alertsService.resolveAlert(tenantId, id);

    return {
      success: true,
      data: alert,
    };
  }

  @Get('stats/active-count')
  @ApiOperation({ summary: 'Get active alerts count', description: 'Get count of unresolved alerts' })
  @ApiResponse({ status: 200, description: 'Active alerts count' })
  async getActiveCount(@CurrentTenant() tenantId: string) {
    const count = await this.alertsService.getActiveAlertsCount(tenantId);

    return {
      success: true,
      data: { count },
    };
  }
}

