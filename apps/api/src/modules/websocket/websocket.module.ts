import { Module, forwardRef } from '@nestjs/common';
import { DeviceGateway } from './device.gateway';
import { RedisModule } from '../../redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommandsModule } from '../commands/commands.module';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    forwardRef(() => CommandsModule),
  ],
  providers: [DeviceGateway],
  exports: [DeviceGateway],
})
export class WebSocketModule { }


