import { parseDocument } from "./doc-parser";
import { processTable } from "./schema-mapper";
import type { ExtractionResult } from "./types";

export type ExtractWireListResult = ExtractionResult & { message?: string };

/**
 * Shared extraction pipeline used by POST /extract and session runner.
 */
export async function extractWireList(
  buffer: Buffer,
  mimetype: string,
  originalname: string
): Promise<ExtractWireListResult> {
  const startTime = Date.now();
  const rawTables = await parseDocument(buffer, mimetype, originalname);

  if (rawTables.length === 0) {
    return {
      fileName: originalname,
      processingTimeMs: Date.now() - startTime,
      tables: [],
      message: "No tables found in the document.",
    };
  }

  const tables = rawTables.map((table, idx) => processTable(table, idx));
  const processingTimeMs = Date.now() - startTime;

  return {
    fileName: originalname,
    processingTimeMs,
    tables,
  };
}
