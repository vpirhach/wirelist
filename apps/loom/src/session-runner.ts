import { randomUUID } from "crypto";
import type { Express } from "express";
import { extractWireList } from "./extract-wirelist";
import {
  createInitialSessionDoc,
  readSession,
  type MulterFileLike,
  writeSession,
} from "./session-store";

/**
 * Create a session from uploaded buffers and start background extraction.
 */
export async function createSessionAndRun(
  files: Express.Multer.File[]
): Promise<{ sessionId: string }> {
  const sessionId = randomUUID();
  const likes: MulterFileLike[] = files.map((f) => ({
    buffer: f.buffer,
    mimetype: f.mimetype,
    originalname: f.originalname,
    size: f.size,
  }));

  let doc = createInitialSessionDoc(sessionId, likes);

  // Stash buffers by file id for the runner (not persisted)
  const buffers = new Map<string, Buffer>();
  files.forEach((f, i) => {
    buffers.set(String(i + 1), f.buffer);
  });

  await writeSession(doc);

  if (files.length === 0) {
    return { sessionId };
  }

  doc.status = "processing";
  await writeSession(doc);

  void runSessionExtraction(sessionId, buffers).catch((err) => {
    console.error(`[session ${sessionId}] runner error:`, err);
  });

  return { sessionId };
}

async function runSessionExtraction(
  sessionId: string,
  buffers: Map<string, Buffer>
): Promise<void> {
  let doc = await readSession(sessionId);
  if (!doc) return;

  for (const fileEntry of doc.files) {
    doc = await readSession(sessionId);
    if (!doc) return;

    const idx = doc.files.findIndex((f) => f.id === fileEntry.id);
    if (idx < 0) continue;

    const fe = doc.files[idx];
    if (fe.status !== "queued") continue;

    fe.status = "processing";
    doc.status = "processing";
    await writeSession(doc);

    const buffer = buffers.get(fe.id);
    if (!buffer) {
      fe.status = "failed";
      fe.error = "Internal error: missing file buffer";
      fe.processingTimeMs = 0;
      await writeSession(doc);
      continue;
    }

    try {
      const result = await extractWireList(buffer, fe.mimeType, fe.originalName);
      fe.status = "completed";
      fe.processingTimeMs = result.processingTimeMs;
      fe.extraction = result;
      delete fe.error;
    } catch (err) {
      fe.status = "failed";
      fe.processingTimeMs = undefined;
      fe.error = (err as Error).message;
      delete fe.extraction;
    }

    doc.files[idx] = fe;
    await writeSession(doc);
  }

  doc = await readSession(sessionId);
  if (doc) {
    await writeSession(doc);
  }
}
