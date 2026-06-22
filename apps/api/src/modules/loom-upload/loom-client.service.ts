import { Injectable, Logger, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LoomImportOutput } from './dto/loom-import-output.dto';

interface LoomSessionDoc {
  sessionId: string;
  status: string;
  files?: { status: string; error?: string }[];
}

@Injectable()
export class LoomClientService {
  private readonly logger = new Logger(LoomClientService.name);

  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    const url = this.config.get<string>('LOOM_BASE_URL') || 'http://localhost:3050';
    return url.replace(/\/$/, '');
  }

  async createSession(files: Express.Multer.File[]): Promise<string> {
    if (!files?.length) {
      throw new BadRequestException('At least one file is required');
    }

    const form = new FormData();
    for (const f of files) {
      const blob = new Blob([f.buffer], { type: f.mimetype || 'application/octet-stream' });
      form.append('files', blob, f.originalname);
    }

    const res = await fetch(`${this.baseUrl()}/sessions`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`Loom POST /sessions failed: ${res.status} ${text}`);
      throw new BadRequestException(`Loom upload failed: ${res.status}`);
    }

    const data = (await res.json()) as { sessionId?: string };
    if (!data.sessionId) {
      throw new ServiceUnavailableException('Loom did not return sessionId');
    }
    return data.sessionId;
  }

  async waitForSession(
    sessionId: string,
    opts: { pollMs?: number; maxWaitMs?: number } = {},
  ): Promise<void> {
    const pollMs = opts.pollMs ?? 500;
    const maxWaitMs = opts.maxWaitMs ?? 5 * 60 * 1000;
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      const res = await fetch(`${this.baseUrl()}/sessions/${sessionId}`);
      if (!res.ok) {
        throw new ServiceUnavailableException(`Loom session poll failed: ${res.status}`);
      }
      const doc = (await res.json()) as LoomSessionDoc;
      const terminal = ['completed', 'failed', 'partial'].includes(doc.status);
      if (terminal) {
        return;
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }

    throw new ServiceUnavailableException('Timed out waiting for Loom extraction');
  }

  async fetchOutput(sessionId: string): Promise<LoomImportOutput> {
    const res = await fetch(`${this.baseUrl()}/sessions/${sessionId}/output`);
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`Loom output fetch failed: ${res.status} ${text}`);
      throw new BadRequestException(`Could not load Loom output: ${res.status}`);
    }
    return (await res.json()) as LoomImportOutput;
  }
}
