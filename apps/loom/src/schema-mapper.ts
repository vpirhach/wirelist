import { RawTable, ColumnMapping, ExtractedWire, TableResult } from "./types";
import { detectColumns, getCanonicalFields } from "./column-classifier";

/**
 * Map a raw table's rows to the canonical Wire model schema
 * using the auto-detected column mapping.
 *
 * @param table - Raw table (first row may be headers)
 * @param mapping - Column mapping from detectColumns()
 * @returns Array of ExtractedWire objects
 */
export function mapToSchema(
  table: RawTable,
  mapping: ColumnMapping
): ExtractedWire[] {
  if (table.rows.length === 0) return [];

  // Determine if first row is headers (if any column has a non-empty header in mapping)
  const hasHeaders = Object.values(mapping).some((m) => m.header.length > 0);
  const dataRows = hasHeaders ? table.rows.slice(1) : table.rows;

  const canonicalFields = new Set(getCanonicalFields());
  const wires: ExtractedWire[] = [];

  for (const row of dataRows) {
    // Skip completely empty rows
    if (row.every((cell) => cell.trim() === "")) continue;

    const wire: ExtractedWire = {};

    for (const [colStr, entry] of Object.entries(mapping)) {
      const colIdx = parseInt(colStr, 10);
      const value = (row[colIdx] || "").trim();

      if (canonicalFields.has(entry.field)) {
        wire[entry.field] = value;
      } else {
        // Preserve unknown fields with their key
        wire[entry.field] = value;
      }
    }

    wires.push(wire);
  }

  return wires;
}

/**
 * Process a single raw table: detect columns and map to schema.
 * Returns a complete TableResult.
 */
export function processTable(table: RawTable, tableIndex: number): TableResult {
  const mapping = detectColumns(table);

  const canonicalFields = new Set(getCanonicalFields());
  const unmappedColumns: number[] = [];
  const detectedHeaders: string[] = [];

  // Build headers array and find unmapped columns
  const colCount = Math.max(...table.rows.map((r) => r.length));
  for (let col = 0; col < colCount; col++) {
    const entry = mapping[String(col)];
    if (entry) {
      detectedHeaders.push(entry.header || entry.field);
      if (!canonicalFields.has(entry.field)) {
        unmappedColumns.push(col);
      }
    } else {
      detectedHeaders.push("");
      unmappedColumns.push(col);
    }
  }

  const rows = mapToSchema(table, mapping);

  return {
    index: tableIndex,
    columnMapping: mapping,
    unmappedColumns,
    detectedHeaders,
    rows,
  };
}
