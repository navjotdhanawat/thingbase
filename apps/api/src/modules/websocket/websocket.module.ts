import { Module } from '@nestjs/common';
import { DeviceGateway } from './device.gateway';
import { RedisModule } from '../../redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [RedisModule, PrismaModule],
  providers: [DeviceGateway],
  exports: [DeviceGateway],
})
export class WebSocketModule {}


