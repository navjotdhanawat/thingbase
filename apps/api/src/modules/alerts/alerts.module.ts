import { Module, forwardRef } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertEvaluatorService } from './alert-evaluator.service';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [forwardRef(() => MqttModule)],
  controllers: [AlertsController],
  providers: [AlertsService, AlertEvaluatorService],
  exports: [AlertsService, AlertEvaluatorService],
})
export class AlertsModule {}

