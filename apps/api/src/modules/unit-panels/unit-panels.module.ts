import { Module } from '@nestjs/common';
import { UnitPanelsController } from './unit-panels.controller';
import { UnitPanelsService } from './unit-panels.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UnitPanelsController],
  providers: [UnitPanelsService],
  exports: [UnitPanelsService],
})
export class UnitPanelsModule {}

