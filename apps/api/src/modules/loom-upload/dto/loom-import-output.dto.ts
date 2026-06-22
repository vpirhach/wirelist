/**
 * Subset of Loom `GET /sessions/:id/output` JSON (schemaVersion 1).
 */
export interface LoomImportWireRow {
  sourceFileName?: string;
  tableIndex?: string;
  rowIndex?: string;
  [key: string]: string | undefined;
}

export interface LoomImportOutput {
  source: 'loom';
  schemaVersion: number;
  sessionId: string;
  createdAt: string;
  completedAt?: string;
  documents?: unknown[];
  wires: LoomImportWireRow[];
}
