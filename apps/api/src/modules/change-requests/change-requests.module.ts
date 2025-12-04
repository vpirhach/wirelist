import { Module } from '@nestjs/common';
import { ChangeRequestsController } from './change-requests.controller';
import { ChangeRequestsService } from './change-requests.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ChangeRequestsController],
  providers: [ChangeRequestsService],
  exports: [ChangeRequestsService],
})
export class ChangeRequestsModule {}

