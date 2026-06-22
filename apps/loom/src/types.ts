/**
 * A raw table extracted from a document.
 * rows[0] may be headers; all values are trimmed strings.
 */
export interface RawTable {
  rows: string[][];
}

/**
 * Defines how to recognize a specific Wire model field
 * from table header text and cell data patterns.
 */
export interface ColumnClassifier {
  /** Canonical Wire model field name */
  field: string;
  /** Display label for the field */
  label: string;
  /** Regex patterns to match header text */
  headerPatterns: RegExp[];
  /** Regex to match individual cell values in data rows */
  dataPattern?: RegExp;
  /** Known/expected values (for enum-like columns) */
  knownValues?: Set<string>;
  /** Priority for conflict resolution (lower = matched first) */
  priority: number;
}

/**
 * Result of mapping a single table column to a Wire model field.
 */
export interface ColumnMappingEntry {
  /** Canonical Wire model field name, or "unknown_N" */
  field: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Original header text from the document (if any) */
  header: string;
  /** Column index in the raw table */
  columnIndex: number;
}

/**
 * Complete column mapping for a table.
 * Key = column index (as string), Value = mapping entry.
 */
export type ColumnMapping = Record<string, ColumnMappingEntry>;

/**
 * A single wire record extracted and mapped to the canonical schema.
 * All values are strings; type conversion happens downstream.
 */
export interface ExtractedWire {
  action?: string;
  wireNumber?: string;
  fromDestination?: string;
  toDestination?: string;
  wireCodeId?: string;
  colorId?: string;
  ioTypeId?: string;
  sub?: string;
  word?: string;
  bits?: string;
  power?: string;
  origin?: string;
  remarks?: string;
  noteCode?: string;
  ped?: string;
  network?: string;
  changeNumber?: string;
  /** Any unknown/unmapped fields preserved with their column header or index */
  [key: string]: string | undefined;
}

/**
 * Extraction result for a single table within a document.
 */
export interface TableResult {
  /** Table index within the document */
  index: number;
  /** How each column was mapped */
  columnMapping: ColumnMapping;
  /** Column indices that could not be mapped to any known field */
  unmappedColumns: number[];
  /** Header row as detected */
  detectedHeaders: string[];
  /** Extracted wire records */
  rows: ExtractedWire[];
}

/**
 * Full extraction result for a document.
 */
export interface ExtractionResult {
  fileName: string;
  processingTimeMs: number;
  tables: TableResult[];
}
