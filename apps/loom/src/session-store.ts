import fs from "fs/promises";
import path from "path";
import type {
  LoomImportPayload,
  LoomSessionDocument,
  SessionAggregateStatus,
  SessionFileEntry,
} from "./session-types";

const LOOM_ROOT = process.env.LOOM_APP_ROOT
  ? path.resolve(process.env.LOOM_APP_ROOT)
  : path.resolve(process.cwd());

export function getSessionsDir(): string {
  return process.env.LOOM_SESSIONS_DIR
    ? path.resolve(process.env.LOOM_SESSIONS_DIR)
    : path.join(LOOM_ROOT, "data", "sessions");
}

export async function ensureSessionsDir(): Promise<void> {
  await fs.mkdir(getSessionsDir(), { recursive: true });
}

function sessionFilePath(sessionId: string): string {
  // Prevent path traversal
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
    throw new Error("Invalid session id");
  }
  return path.join(getSessionsDir(), `${sessionId}.json`);
}

export function buildImportPayload(doc: LoomSessionDocument): LoomImportPayload {
  const documents: LoomImportPayload["documents"] = [];
  const wires: LoomImportPayload["wires"] = [];

  for (const f of doc.files) {
    if (f.status !== "completed" || !f.extraction) continue;
    const ex = f.extraction;
    documents.push({
      fileName: ex.fileName,
      processingTimeMs: ex.processingTimeMs,
      tables: ex.tables,
      message: ex.message,
    });
    for (const table of ex.tables) {
      table.rows.forEach((row, rowIndex) => {
        wires.push({
          ...row,
          sourceFileName: ex.fileName,
          tableIndex: String(table.index),
          rowIndex: String(rowIndex),
        });
      });
    }
  }

  return {
    source: "loom",
    schemaVersion: 1,
    sessionId: doc.sessionId,
    createdAt: doc.createdAt,
    completedAt:
      doc.status === "completed" ||
      doc.status === "failed" ||
      doc.status === "partial"
        ? doc.updatedAt
        : undefined,
    documents,
    wires,
  };
}

export function recomputeSessionAggregates(doc: LoomSessionDocument): void {
  doc.fileCount = doc.files.length;
  doc.completedCount = doc.files.filter((f) => f.status === "completed").length;
  doc.failedCount = doc.files.filter((f) => f.status === "failed").length;

  if (doc.fileCount === 0) {
    doc.status = "completed";
    doc.output = buildImportPayload(doc);
    return;
  }

  const allTerminal = doc.files.every(
    (f) => f.status === "completed" || f.status === "failed"
  );
  if (!allTerminal) {
    if (doc.files.some((f) => f.status === "processing")) {
      doc.status = "processing";
    } else {
      doc.status = "queued";
    }
    doc.output = buildImportPayload(doc);
    return;
  }

  if (doc.completedCount === doc.fileCount && doc.fileCount > 0) {
    doc.status = "completed";
  } else if (doc.failedCount === doc.fileCount) {
    doc.status = "failed";
  } else {
    doc.status = "partial";
  }
  doc.output = buildImportPayload(doc);
}

export interface MulterFileLike {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export function createInitialSessionDoc(
  sessionId: string,
  files: MulterFileLike[]
): LoomSessionDocument {
  const now = new Date().toISOString();
  const entries: SessionFileEntry[] = files.map((file, i) => ({
    id: String(i + 1),
    originalName: file.originalname,
    sizeBytes: file.size,
    mimeType: file.mimetype,
    status: "queued",
  }));

  const doc: LoomSessionDocument = {
    version: 1,
    sessionId,
    createdAt: now,
    updatedAt: now,
    status: files.length === 0 ? "completed" : "queued",
    fileCount: files.length,
    completedCount: 0,
    failedCount: 0,
    files: entries,
    output: {
      source: "loom",
      schemaVersion: 1,
      sessionId,
      createdAt: now,
      documents: [],
      wires: [],
    },
  };

  recomputeSessionAggregates(doc);
  return doc;
}

export async function writeSession(doc: LoomSessionDocument): Promise<void> {
  await ensureSessionsDir();
  doc.updatedAt = new Date().toISOString();
  recomputeSessionAggregates(doc);
  const p = sessionFilePath(doc.sessionId);
  await fs.writeFile(p, JSON.stringify(doc, null, 2), "utf8");
}

export async function readSession(sessionId: string): Promise<LoomSessionDocument | null> {
  try {
    const raw = await fs.readFile(sessionFilePath(sessionId), "utf8");
    return JSON.parse(raw) as LoomSessionDocument;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw e;
  }
}

export interface SessionListItem {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  status: SessionAggregateStatus;
  fileCount: number;
  completedCount: number;
  failedCount: number;
}

export async function listSessions(): Promise<SessionListItem[]> {
  await ensureSessionsDir();
  const dir = getSessionsDir();
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const jsonFiles = names.filter((n) => n.endsWith(".json"));
  const items: SessionListItem[] = [];

  for (const name of jsonFiles) {
    const sessionId = name.replace(/\.json$/, "");
    if (!isValidSessionId(sessionId)) continue;
    try {
      const doc = await readSession(sessionId);
      if (!doc) continue;
      items.push({
        sessionId: doc.sessionId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        status: doc.status,
        fileCount: doc.fileCount,
        completedCount: doc.completedCount,
        failedCount: doc.failedCount,
      });
    } catch {
      // skip corrupt
    }
  }

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items;
}

export function isValidSessionId(id: string): boolean {
  return /^[a-f0-9-]{36}$/i.test(id);
}
