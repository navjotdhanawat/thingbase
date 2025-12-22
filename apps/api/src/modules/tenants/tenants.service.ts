import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateTenant, UpdateTenant, Tenant } from '@repo/shared';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get tenant by ID
   */
  async findById(id: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${id} not found`);
    }

    return this.mapToDto(tenant);
  }

  /**
   * Get tenant by slug
   */
  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug ${slug} not found`);
    }

    return this.mapToDto(tenant);
  }

  /**
   * Check if slug is available
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    return !existing;
  }

  /**
   * Update tenant (admin only)
   */
  async update(id: string, dto: UpdateTenant): Promise<Tenant> {
    // Check if new slug conflicts
    if (dto.slug) {
      const existing = await this.prisma.tenant.findFirst({
        where: {
          slug: dto.slug,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Tenant slug already exists');
      }
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Updated tenant: ${tenant.slug}`);

    return this.mapToDto(tenant);
  }

  /**
   * Get tenant stats
   */
  async getStats(tenantId: string) {
    const [userCount, deviceCount, onlineDeviceCount, alertCount] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.device.count({ where: { tenantId } }),
      this.prisma.device.count({ where: { tenantId, status: 'online' } }),
      this.prisma.alert.count({ where: { tenantId, status: 'active' } }),
    ]);

    return {
      userCount,
      deviceCount,
      onlineDeviceCount,
      alertCount,
    };
  }

  /**
   * Get branding configuration for white-label apps
   */
  async getBranding(tenantId: string): Promise<BrandingConfig> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, branding: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    const branding = (tenant.branding || {}) as any;

    // Return branding with defaults
    return {
      tenantId,
      tenantName: tenant.name,
      primaryColor: branding.primaryColor || '#6366F1',
      secondaryColor: branding.secondaryColor || '#8B5CF6',
      accentColor: branding.accentColor || '#F59E0B',
      logoUrl: branding.logoUrl || null,
      logoUrlDark: branding.logoUrlDark || null,
      appName: branding.appName || tenant.name,
      fontFamily: branding.fontFamily || 'Inter',
      useDarkMode: branding.useDarkMode ?? false,
      allowThemeToggle: branding.allowThemeToggle ?? true,
      features: {
        enableBleProvisioning: branding.features?.enableBleProvisioning ?? true,
        enableWifiProvisioning: branding.features?.enableWifiProvisioning ?? true,
        enableQrScanning: branding.features?.enableQrScanning ?? true,
        enableTelemetryCharts: branding.features?.enableTelemetryCharts ?? true,
        enableCommands: branding.features?.enableCommands ?? true,
        enableAlerts: branding.features?.enableAlerts ?? true,
        enableOfflineMode: branding.features?.enableOfflineMode ?? false,
        enableBiometricAuth: branding.features?.enableBiometricAuth ?? false,
      },
    };
  }

  /**
   * Update branding configuration
   */
  async updateBranding(tenantId: string, dto: Partial<BrandingConfig>): Promise<BrandingConfig> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    // Merge with existing branding
    const existingBranding = (tenant.branding || {}) as any;
    const updatedBranding = {
      ...existingBranding,
      ...dto,
      features: dto.features 
        ? { ...existingBranding.features, ...dto.features }
        : existingBranding.features,
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { branding: updatedBranding },
    });

    this.logger.log(`Updated branding for tenant: ${tenantId}`);

    return this.getBranding(tenantId);
  }

  private mapToDto(tenant: any): Tenant {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}

export interface BrandingConfig {
  tenantId: string;
  tenantName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  logoUrl?: string | null;
  logoUrlDark?: string | null;
  appName?: string;
  fontFamily?: string;
  useDarkMode?: boolean;
  allowThemeToggle?: boolean;
  features?: {
    enableBleProvisioning?: boolean;
    enableWifiProvisioning?: boolean;
    enableQrScanning?: boolean;
    enableTelemetryCharts?: boolean;
    enableCommands?: boolean;
    enableAlerts?: boolean;
    enableOfflineMode?: boolean;
    enableBiometricAuth?: boolean;
  };
}


