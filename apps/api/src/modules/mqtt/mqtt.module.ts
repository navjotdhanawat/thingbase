import { Module, forwardRef } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { MqttHandlers } from './mqtt.handlers';
import { MqttAuthController } from './mqtt-auth.controller';
import { CommandsModule } from '../commands/commands.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    forwardRef(() => CommandsModule),
    forwardRef(() => AlertsModule),
  ],
  providers: [MqttService, MqttHandlers],
  controllers: [MqttAuthController],
  exports: [MqttService],
})
export class MqttModule { }


