import { Module, forwardRef } from '@nestjs/common';
import { CommandsService } from './commands.service';
import { CommandsController } from './commands.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => MqttModule),
  ],
  controllers: [CommandsController],
  providers: [CommandsService],
  exports: [CommandsService],
})
export class CommandsModule {}


