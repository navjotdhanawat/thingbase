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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { AdminOnly } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators/public.decorator';
import { createDeviceSchema, updateDeviceSchema } from '@thingbase/shared';

@ApiTags('Devices')
@ApiBearerAuth('access-token')
@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'List devices', description: 'Get paginated list of devices in tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'provisioned', 'online', 'offline'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of devices' })
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.devicesService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
      search,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device', description: 'Get device by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Device UUID' })
  @ApiResponse({ status: 200, description: 'Device details' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const device = await this.devicesService.findById(tenantId, id);
    return {
      success: true,
      data: device,
    };
  }

  @Get(':id/state')
  @ApiOperation({ summary: 'Get device state', description: 'Get current device state from Redis shadow' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Current device state' })
  async getState(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const state = await this.devicesService.getState(tenantId, id);
    return {
      success: true,
      data: state,
    };
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Create device', description: 'Register a new device (admin only)' })
  @ApiResponse({ status: 201, description: 'Device created' })
  @ApiResponse({ status: 409, description: 'Device with external ID already exists' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createDeviceSchema)) body: any,
  ) {
    const device = await this.devicesService.create(tenantId, body);
    return {
      success: true,
      data: device,
    };
  }

  @Post(':id/provision')
  @AdminOnly()
  @ApiOperation({ summary: 'Generate provision token', description: 'Generate a one-time provisioning token (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Token generated' })
  async generateProvisionToken(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { expiresInHours?: number },
  ) {
    const result = await this.devicesService.generateProvisionToken(
      tenantId,
      id,
      body.expiresInHours,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post(':id/activate')
  @Public()
  @ApiOperation({ summary: 'Activate device', description: 'Provision device using token and get MQTT credentials' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Device provisioned with MQTT credentials' })
  @ApiResponse({ status: 404, description: 'Invalid or expired provision token' })
  async provision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { provisionToken: string },
  ) {
    const result = await this.devicesService.provision(id, body.provisionToken);
    return {
      success: true,
      data: result,
    };
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Update device', description: 'Update device details (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Device updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateDeviceSchema)) body: any,
  ) {
    const device = await this.devicesService.update(tenantId, id, body);
    return {
      success: true,
      data: device,
    };
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Delete device', description: 'Delete device and all related data (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Device deleted' })
  async delete(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.devicesService.delete(tenantId, id);
    return {
      success: true,
      message: 'Device deleted successfully',
    };
  }

  // ============================================================================
  // MOBILE APP CLAIM TOKEN FLOW
  // ============================================================================

  @Post('claim-token')
  @ApiOperation({ 
    summary: 'Generate claim token', 
    description: 'Generate a short-lived claim token for mobile app device onboarding. Token expires in 15 minutes.' 
  })
  @ApiResponse({ status: 201, description: 'Claim token generated with QR code data' })
  async generateClaimToken(
    @CurrentTenant() tenantId: string,
    @Body() body: { 
      deviceTypeId?: string; 
      name: string; 
      metadata?: Record<string, unknown>;
    },
  ) {
    const result = await this.devicesService.generateClaimToken(tenantId, body);
    return {
      success: true,
      data: result,
    };
  }

  @Get('claim-status/:token')
  @ApiOperation({ 
    summary: 'Check claim status', 
    description: 'Poll to check if device has claimed the token and is online' 
  })
  @ApiParam({ name: 'token', type: String, description: 'Claim token' })
  @ApiResponse({ status: 200, description: 'Claim status with device info if claimed' })
  async getClaimStatus(@Param('token') token: string) {
    const result = await this.devicesService.getClaimStatus(token);
    return {
      success: true,
      data: result,
    };
  }

  @Post('claim')
  @Public()
  @ApiOperation({ 
    summary: 'Claim device', 
    description: 'Device calls this endpoint with claim token to get MQTT credentials. Public endpoint for devices.' 
  })
  @ApiResponse({ status: 200, description: 'MQTT credentials for device' })
  @ApiResponse({ status: 400, description: 'Invalid or expired claim token' })
  async claimDevice(
    @Body() body: { 
      claimToken: string; 
      deviceInfo?: {
        macAddress?: string;
        firmwareVersion?: string;
        chipId?: string;
        model?: string;
      };
    },
  ) {
    const result = await this.devicesService.claimDevice(body);
    return {
      success: true,
      data: result,
    };
  }
}
