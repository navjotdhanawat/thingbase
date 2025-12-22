import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import type { User, CreateUser, UpdateUser, InviteUser, PaginationParams } from '@thingbase/shared';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@thingbase/shared';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List users in tenant
   */
  async findAll(tenantId: string, params: PaginationParams = {}) {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { tenantId } }),
    ]);

    return {
      items: users.map(this.mapToDto),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get user by ID (within tenant)
   */
  async findById(tenantId: string, id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return this.mapToDto(user);
  }

  /**
   * Get user by email (within tenant)
   */
  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: { email, tenantId },
    });

    return user ? this.mapToDto(user) : null;
  }

  /**
   * Create user (for invite flow)
   */
  async create(tenantId: string, dto: CreateUser): Promise<User> {
    // Check if email exists in tenant
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId },
    });

    if (existing) {
      throw new ConflictException('Email already exists in this tenant');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role || 'user',
        status: 'active',
      },
    });

    this.logger.log(`Created user: ${user.email} in tenant: ${tenantId}`);

    return this.mapToDto(user);
  }

  /**
   * Invite user (creates pending user)
   */
  async invite(tenantId: string, dto: InviteUser): Promise<User> {
    // Check if email exists in tenant
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId },
    });

    if (existing) {
      throw new ConflictException('Email already exists in this tenant');
    }

    // Create user with pending status and temporary password
    const tempPasswordHash = await bcrypt.hash(Math.random().toString(36), 12);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash: tempPasswordHash,
        role: dto.role || 'user',
        status: 'pending',
      },
    });

    this.logger.log(`Invited user: ${user.email} to tenant: ${tenantId}`);

    // TODO: Send invitation email with password reset link

    return this.mapToDto(user);
  }

  /**
   * Update user
   */
  async update(tenantId: string, id: string, dto: UpdateUser): Promise<User> {
    // Verify user exists in tenant
    await this.findById(tenantId, id);

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Updated user: ${user.email}`);

    return this.mapToDto(user);
  }

  /**
   * Delete user
   */
  async delete(tenantId: string, id: string): Promise<void> {
    // Verify user exists in tenant
    await this.findById(tenantId, id);

    await this.prisma.user.delete({
      where: { id },
    });

    this.logger.log(`Deleted user: ${id}`);
  }

  private mapToDto(user: any): User {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}


