import type { ExtractionResult, ExtractedWire, TableResult } from "./types";

/** Per-file state inside an upload session */
export type SessionFileStatus = "queued" | "processing" | "completed" | "failed";

/** Aggregate session lifecycle */
export type SessionAggregateStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "partial";

/**
 * One uploaded file’s extraction outcome (persisted in session JSON).
 */
export interface SessionFileEntry {
  /** Stable id within the session (1-based index as string) */
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  status: SessionFileStatus;
  processingTimeMs?: number;
  error?: string;
  /** Same shape as POST /extract JSON for successful extractions */
  extraction?: ExtractionResult & { message?: string };
}

/**
 * Normalized payload for downstream DB import (one artifact per upload session).
 */
export interface LoomImportPayload {
  source: "loom";
  schemaVersion: 1;
  sessionId: string;
  createdAt: string;
  completedAt?: string;
  /** Flattened wires with provenance for bulk insert */
  /** Provenance fields are strings so rows stay JSON-serializable with ExtractedWire */
  wires: Array<
    ExtractedWire & {
      sourceFileName: string;
      tableIndex: string;
      rowIndex: string;
    }
  >;
  /** Per-document summaries (tables + rows), mirrors extractions */
  documents: Array<{
    fileName: string;
    processingTimeMs: number;
    tables: TableResult[];
    message?: string;
  }>;
}

/**
 * Full persisted session document (disk + GET /sessions/:id).
 */
export interface LoomSessionDocument {
  version: 1;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  status: SessionAggregateStatus;
  fileCount: number;
  completedCount: number;
  failedCount: number;
  files: SessionFileEntry[];
  output: LoomImportPayload;
}
