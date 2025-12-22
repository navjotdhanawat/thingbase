import { Module } from '@nestjs/common';
import { DeviceTypesController } from './device-types.controller';
import { DeviceTypesService } from './device-types.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DeviceTypesController],
  providers: [DeviceTypesService],
  exports: [DeviceTypesService],
})
export class DeviceTypesModule {}


