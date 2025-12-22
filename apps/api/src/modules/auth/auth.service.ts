import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EmailService } from '../email/email.service';
import { REDIS_KEYS } from '@thingbase/shared';
import type { Register, Login, AuthTokens, JwtPayload, ForgotPassword, ResetPassword, ChangePassword, UpdateProfile } from '@thingbase/shared';
import { randomUUID, createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
  ) { }

  /**
   * Register a new tenant with admin user
   */
  async register(dto: Register): Promise<AuthTokens> {
    // Check if tenant slug exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });

    if (existingTenant) {
      throw new ConflictException('Tenant slug already exists');
    }

    // Check if email exists in any tenant
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create tenant and admin user in transaction
    const { tenant, user } = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: dto.tenantSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          name: dto.name,
          role: 'admin', // First user is always admin
        },
      });

      return { tenant, user };
    });

    this.logger.log(`Registered new tenant: ${tenant.slug} with admin: ${user.email}`);

    // Generate tokens
    return this.generateTokens(user.id, tenant.id, user.email, user.role);
  }

  /**
   * Login with email and password
   */
  async login(dto: Login): Promise<AuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    this.logger.log(`User logged in: ${user.email}`);

    return this.generateTokens(user.id, user.tenantId, user.email, user.role);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Hash the refresh token to compare with stored hash
    const tokenHash = this.hashRefreshToken(refreshToken);

    // Find valid refresh token
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { user } = storedToken;

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Revoke the old refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    return this.generateTokens(user.id, user.tenantId, user.email, user.role);
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(userId: string): Promise<void> {
    // Revoke all refresh tokens for user
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Clear from Redis cache
    await this.redis.del(REDIS_KEYS.REFRESH_TOKEN(userId));

    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Validate JWT payload (used by JwtStrategy)
   */
  async validateJwtPayload(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      tenant: user.tenant,
    };
  }

  /**
   * Request password reset email
   */
  async forgotPassword(dto: ForgotPassword): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.log(`Password reset requested for unknown email: ${dto.email}`);
      return;
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing reset tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Store new reset token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Send password reset email
    await this.email.sendPasswordReset({
      to: user.email,
      resetToken: token,
      userName: user.name || undefined,
    });

    this.logger.log(`Password reset email sent to: ${user.email}`);
  }

  /**
   * Reset password with token
   */
  async resetPassword(dto: ResetPassword): Promise<void> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, status: 'active' },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens for security
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password reset completed for: ${resetToken.user.email}`);
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(userId: string, dto: ChangePassword): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    this.logger.log(`Password changed for user: ${user.email}`);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, dto: UpdateProfile): Promise<{ id: string; email: string; name: string | null; role: string }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
    });

    this.logger.log(`Profile updated for user: ${user.email}`);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    tenantId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      tenantId,
      email,
      role: role as 'admin' | 'user',
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomUUID();

    // Store refresh token hash in database
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
    const expiresAt = this.calculateExpiry(refreshExpiresIn);
    const tokenHash = this.hashRefreshToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    // Cache in Redis for quick lookup
    await this.redis.set(
      REDIS_KEYS.REFRESH_TOKEN(userId),
      tokenHash,
      this.getExpirySeconds(refreshExpiresIn),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpirySeconds(
        this.configService.get<string>('jwt.accessExpiresIn') || '15m',
      ),
    };
  }

  private hashRefreshToken(token: string): string {
    // Use SHA-256 for deterministic hashing (so we can look up the token later)
    return createHash('sha256').update(token).digest('hex');
  }

  private calculateExpiry(duration: string): Date {
    const seconds = this.getExpirySeconds(duration);
    return new Date(Date.now() + seconds * 1000);
  }

  private getExpirySeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}

