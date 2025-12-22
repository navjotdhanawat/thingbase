import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './modules/email/email.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { DeviceTypesModule } from './modules/device-types/device-types.module';
import { DevicesModule } from './modules/devices/devices.module';
import { CommandsModule } from './modules/commands/commands.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AuditModule } from './modules/audit/audit.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Scheduled tasks
    ScheduleModule.forRoot(),
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,  // 1 second
        limit: 10,  // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 50,  // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    RedisModule,
    EmailModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    DeviceTypesModule,
    DevicesModule,
    CommandsModule,
    TelemetryModule,
    AlertsModule,
    AuditModule,
    MqttModule,
    WebSocketModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

