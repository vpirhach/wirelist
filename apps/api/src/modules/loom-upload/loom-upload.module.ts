import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ChangeRequestsModule } from '../change-requests/change-requests.module';
import { LoomUploadController } from './loom-upload.controller';
import { LoomUploadService } from './loom-upload.service';
import { LoomClientService } from './loom-client.service';
import { LoomDiffService } from './loom-diff.service';
import { LoomPreviewStoreService } from './loom-preview-store.service';

@Module({
  imports: [ConfigModule, PrismaModule, ChangeRequestsModule],
  controllers: [LoomUploadController],
  providers: [
    LoomUploadService,
    LoomClientService,
    LoomDiffService,
    LoomPreviewStoreService,
  ],
})
export class LoomUploadModule {}
