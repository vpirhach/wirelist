import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import type { LoomPreviewItem } from './loom-diff.service';

export interface StoredLoomPreview {
  previewId: string;
  loomSessionId: string;
  items: LoomPreviewItem[];
  createdAtMs: number;
}

const TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class LoomPreviewStoreService {
  private readonly logger = new Logger(LoomPreviewStoreService.name);
  private readonly store = new Map<string, StoredLoomPreview>();

  save(session: Omit<StoredLoomPreview, 'createdAtMs'>): StoredLoomPreview {
    const createdAtMs = Date.now();
    const entry: StoredLoomPreview = { ...session, createdAtMs };
    this.store.set(session.previewId, entry);
    this.prune();
    return entry;
  }

  get(previewId: string): StoredLoomPreview {
    this.prune();
    const s = this.store.get(previewId);
    if (!s) {
      throw new BadRequestException(
        'Preview expired or invalid. Please upload again to refresh the preview.',
      );
    }
    if (Date.now() - s.createdAtMs > TTL_MS) {
      this.store.delete(previewId);
      throw new BadRequestException('Preview expired. Please upload again.');
    }
    return s;
  }

  private prune(): void {
    const now = Date.now();
    for (const [id, s] of this.store) {
      if (now - s.createdAtMs > TTL_MS) {
        this.store.delete(id);
        this.logger.debug(`Pruned expired loom preview ${id}`);
      }
    }
  }
}
