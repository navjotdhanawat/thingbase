import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { AdminOnly } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { updateTenantSchema } from '@repo/shared';

@ApiTags('Tenant')
@ApiBearerAuth('access-token')
@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get tenant info', description: 'Get current tenant details' })
  @ApiResponse({ status: 200, description: 'Tenant info' })
  async getCurrentTenant(@CurrentTenant() tenantId: string) {
    const tenant = await this.tenantsService.findById(tenantId);
    return {
      success: true,
      data: tenant,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get tenant stats', description: 'Get tenant statistics (devices, users, etc.)' })
  @ApiResponse({ status: 200, description: 'Tenant statistics' })
  async getStats(@CurrentTenant() tenantId: string) {
    const stats = await this.tenantsService.getStats(tenantId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('branding')
  @ApiOperation({ 
    summary: 'Get branding config', 
    description: 'Get white-label branding configuration for mobile app' 
  })
  @ApiResponse({ status: 200, description: 'Branding configuration' })
  async getBranding(@CurrentTenant() tenantId: string) {
    const branding = await this.tenantsService.getBranding(tenantId);
    return {
      success: true,
      data: branding,
    };
  }

  @Patch()
  @AdminOnly()
  @ApiOperation({ summary: 'Update tenant', description: 'Update tenant details (admin only)' })
  @ApiResponse({ status: 200, description: 'Tenant updated' })
  async updateTenant(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(updateTenantSchema)) body: any,
  ) {
    const tenant = await this.tenantsService.update(tenantId, body);
    return {
      success: true,
      data: tenant,
    };
  }

  @Patch('branding')
  @AdminOnly()
  @ApiOperation({ 
    summary: 'Update branding', 
    description: 'Update white-label branding configuration (admin only)' 
  })
  @ApiResponse({ status: 200, description: 'Branding updated' })
  async updateBranding(
    @CurrentTenant() tenantId: string,
    @Body() body: {
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      logoUrl?: string;
      logoUrlDark?: string;
      appName?: string;
      fontFamily?: string;
      useDarkMode?: boolean;
      allowThemeToggle?: boolean;
    },
  ) {
    const branding = await this.tenantsService.updateBranding(tenantId, body);
    return {
      success: true,
      data: branding,
    };
  }
}


