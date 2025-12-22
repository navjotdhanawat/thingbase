import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DeviceTypesService } from './device-types.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { 
  createDeviceTypeSchema, 
  updateDeviceTypeSchema,
  CreateDeviceTypeInput,
  UpdateDeviceTypeInput,
} from '@thingbase/shared';

@ApiTags('Device Types')
@ApiBearerAuth('access-token')
@Controller('device-types')
@UseGuards(JwtAuthGuard)
export class DeviceTypesController {
  constructor(private readonly deviceTypesService: DeviceTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Create device type', description: 'Create a new device type with schema' })
  @ApiResponse({ status: 201, description: 'Device type created' })
  async create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createDeviceTypeSchema)) body: CreateDeviceTypeInput,
  ) {
    const deviceType = await this.deviceTypesService.create(tenantId, body);
    return { success: true, data: deviceType };
  }

  @Post('presets/:slug')
  @ApiOperation({ summary: 'Create from preset', description: 'Create device type from a predefined preset' })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({ status: 201, description: 'Device type created from preset' })
  async createFromPreset(
    @CurrentTenant() tenantId: string,
    @Param('slug') slug: string,
  ) {
    const deviceType = await this.deviceTypesService.createFromPreset(tenantId, slug);
    return { success: true, data: deviceType };
  }

  @Get('presets')
  @ApiOperation({ summary: 'List presets', description: 'Get available device type presets' })
  @ApiResponse({ status: 200, description: 'List of presets' })
  async getAvailablePresets(@CurrentTenant() tenantId: string) {
    const presets = await this.deviceTypesService.getAvailablePresets(tenantId);
    return { success: true, data: presets };
  }

  @Get()
  @ApiOperation({ summary: 'List device types', description: 'Get all device types for tenant' })
  @ApiResponse({ status: 200, description: 'List of device types' })
  async findAll(@CurrentTenant() tenantId: string) {
    const deviceTypes = await this.deviceTypesService.findAll(tenantId);
    return { success: true, data: deviceTypes };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device type', description: 'Get device type by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Device type details' })
  async findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const deviceType = await this.deviceTypesService.findById(tenantId, id);
    return { success: true, data: deviceType };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update device type', description: 'Update device type details' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Device type updated' })
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDeviceTypeSchema)) body: UpdateDeviceTypeInput,
  ) {
    const deviceType = await this.deviceTypesService.update(tenantId, id, body);
    return { success: true, data: deviceType };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete device type', description: 'Delete device type' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Device type deleted' })
  async delete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.deviceTypesService.delete(tenantId, id);
    return { success: true, message: 'Device type deleted' };
  }
}


