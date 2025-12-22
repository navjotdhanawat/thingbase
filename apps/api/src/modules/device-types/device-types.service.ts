import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  CreateDeviceTypeInput, 
  UpdateDeviceTypeInput, 
  DEVICE_TYPE_PRESETS,
  DeviceTypeSchema,
} from '@repo/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class DeviceTypesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new device type
   */
  async create(tenantId: string, input: CreateDeviceTypeInput) {
    // Check if slug already exists for this tenant
    const existing = await this.prisma.deviceType.findUnique({
      where: { tenantId_slug: { tenantId, slug: input.slug } },
    });

    if (existing) {
      throw new ConflictException(`Device type with slug "${input.slug}" already exists`);
    }

    return this.prisma.deviceType.create({
      data: {
        tenantId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        icon: input.icon || 'cpu',
        color: input.color || '#6366f1',
        schema: input.schema as unknown as Prisma.InputJsonValue,
        isSystem: false,
      },
    });
  }

  /**
   * Create device type from preset
   */
  async createFromPreset(tenantId: string, presetSlug: string) {
    const preset = DEVICE_TYPE_PRESETS[presetSlug];
    if (!preset) {
      throw new BadRequestException(`Unknown preset: ${presetSlug}`);
    }

    // Check if already exists
    const existing = await this.prisma.deviceType.findUnique({
      where: { tenantId_slug: { tenantId, slug: preset.slug } },
    });

    if (existing) {
      throw new ConflictException(`Device type "${preset.name}" already exists`);
    }

    return this.prisma.deviceType.create({
      data: {
        tenantId,
        name: preset.name,
        slug: preset.slug,
        description: preset.description,
        icon: preset.icon || 'cpu',
        color: preset.color || '#6366f1',
        schema: preset.schema as unknown as Prisma.InputJsonValue,
        isSystem: true, // Presets are marked as system
      },
    });
  }

  /**
   * Get all device types for a tenant
   */
  async findAll(tenantId: string) {
    return this.prisma.deviceType.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });
  }

  /**
   * Get a device type by ID
   */
  async findById(tenantId: string, id: string) {
    const deviceType = await this.prisma.deviceType.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });

    if (!deviceType) {
      throw new NotFoundException('Device type not found');
    }

    return deviceType;
  }

  /**
   * Get a device type by slug
   */
  async findBySlug(tenantId: string, slug: string) {
    const deviceType = await this.prisma.deviceType.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });

    if (!deviceType) {
      throw new NotFoundException('Device type not found');
    }

    return deviceType;
  }

  /**
   * Update a device type
   */
  async update(tenantId: string, id: string, input: UpdateDeviceTypeInput) {
    const deviceType = await this.findById(tenantId, id);

    // Check slug uniqueness if changing
    if (input.slug && input.slug !== deviceType.slug) {
      const existing = await this.prisma.deviceType.findUnique({
        where: { tenantId_slug: { tenantId, slug: input.slug } },
      });

      if (existing) {
        throw new ConflictException(`Device type with slug "${input.slug}" already exists`);
      }
    }

    return this.prisma.deviceType.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        icon: input.icon,
        color: input.color,
        schema: input.schema ? (input.schema as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  /**
   * Delete a device type
   */
  async delete(tenantId: string, id: string) {
    const deviceType = await this.findById(tenantId, id);

    // Check if any devices are using this type
    const deviceCount = await this.prisma.device.count({
      where: { typeId: id },
    });

    if (deviceCount > 0) {
      throw new ConflictException(
        `Cannot delete device type "${deviceType.name}" - ${deviceCount} device(s) are using it`
      );
    }

    return this.prisma.deviceType.delete({
      where: { id },
    });
  }

  /**
   * Get available presets that haven't been added yet
   */
  async getAvailablePresets(tenantId: string) {
    const existingTypes = await this.prisma.deviceType.findMany({
      where: { tenantId },
      select: { slug: true },
    });

    const existingSlugs = new Set(existingTypes.map((t) => t.slug));

    return Object.entries(DEVICE_TYPE_PRESETS)
      .filter(([slug]) => !existingSlugs.has(slug))
      .map(([slug, preset]) => ({
        slug,
        name: preset.name,
        description: preset.description,
        icon: preset.icon,
        color: preset.color,
        fieldCount: preset.schema.fields.length,
      }));
  }

  /**
   * Get schema for a device (from its type or null)
   */
  async getDeviceSchema(tenantId: string, deviceId: string): Promise<DeviceTypeSchema | null> {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
      include: { type: true },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (!device.type) {
      return null;
    }

    return device.type.schema as unknown as DeviceTypeSchema;
  }
}


