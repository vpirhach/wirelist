import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ChangeRequestsService } from '../change-requests/change-requests.service';
import { CreateChangeRecordDto } from '../change-requests/dto/create-change-record.dto';
import { LoomClientService } from './loom-client.service';
import { LoomDiffService } from './loom-diff.service';
import { LoomPreviewStoreService } from './loom-preview-store.service';

@Injectable()
export class LoomUploadService {
  private readonly logger = new Logger(LoomUploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loomClient: LoomClientService,
    private readonly loomDiff: LoomDiffService,
    private readonly previewStore: LoomPreviewStoreService,
    private readonly changeRequests: ChangeRequestsService,
  ) {}

  async preview(
    files: Express.Multer.File[],
    skipDeletes: boolean,
    fullDbDeleteSync: boolean,
    actionDriven = false,
  ): Promise<{
    previewId: string;
    loomSessionId: string;
    summary: { added: number; edited: number; deleted: number };
    items: ReturnType<LoomDiffService['computeDiff']>['items'];
    collisionWarnings: string[];
  }> {
    const sessionId = await this.loomClient.createSession(files);
    await this.loomClient.waitForSession(sessionId);
    const output = await this.loomClient.fetchOutput(sessionId);

    if (!output.wires?.length) {
      this.logger.warn(`Loom session ${sessionId} produced no wires`);
    }

    const dbWires = await this.prisma.wire.findMany({
      orderBy: [{ id: 'asc' }],
    });

    const diff = this.loomDiff.computeDiff(sessionId, dbWires, output.wires ?? [], {
      skipDeletes,
      fullDbDeleteSync,
      actionDriven,
    });

    const previewId = randomUUID();
    this.previewStore.save({
      previewId,
      loomSessionId: diff.loomSessionId,
      items: diff.items,
    });

    return {
      previewId,
      loomSessionId: diff.loomSessionId,
      summary: diff.summary,
      items: diff.items,
      collisionWarnings: diff.collisionWarnings,
    };
  }

  async submit(
    previewId: string,
    selectedItemIds: string[],
    comment: string | undefined,
    _user: User,
  ): Promise<{ changeRequestId: string; recordCount: number }> {
    if (!selectedItemIds?.length) {
      throw new BadRequestException('Select at least one change to submit');
    }

    const stored = this.previewStore.get(previewId);
    const selected = new Set(selectedItemIds);
    const records: CreateChangeRecordDto[] = [];

    for (const item of stored.items) {
      if (!selected.has(item.id)) continue;
      records.push(item.record);
    }

    if (records.length === 0) {
      throw new BadRequestException('No matching preview rows for the given selection');
    }

    const loomComment = comment?.trim()
      ? `${comment.trim()} (Loom session ${stored.loomSessionId})`
      : `Loom import (session ${stored.loomSessionId})`;

    const created = await this.changeRequests.create(
      { comment: loomComment, records },
      _user,
    );

    return {
      changeRequestId: created.id,
      recordCount: records.length,
    };
  }
}
