import mammoth from "mammoth";
import * as cheerio from "cheerio";
import WordExtractor from "word-extractor";
import { RawTable } from "./types";

/**
 * Parse a .docx or .doc document buffer and extract all tables
 * as 2D string arrays.
 *
 * @param buffer - The file buffer
 * @param mimeType - MIME type to determine parsing strategy
 * @param fileName - Original file name (used for extension-based detection)
 * @returns Array of raw tables found in the document
 */
export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  fileName?: string
): Promise<RawTable[]> {
  const ext = fileName?.toLowerCase().slice(fileName.lastIndexOf(".")) || "";

  if (isDocx(mimeType) || ext === ".docx") {
    return parseDocx(buffer);
  }

  if (isDoc(mimeType) || ext === ".doc") {
    return parseDoc(buffer);
  }

  throw new Error(
    `Unsupported file type: ${mimeType} (${fileName || "unknown"}). Use .doc or .docx files.`
  );
}

/**
 * Check if the MIME type corresponds to a .docx file.
 */
function isDocx(mimeType: string): boolean {
  return (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/docx"
  );
}

/**
 * Check if the MIME type corresponds to a .doc file.
 */
function isDoc(mimeType: string): boolean {
  return (
    mimeType === "application/msword" ||
    mimeType === "application/doc"
  );
}

/**
 * Parse a .docx file by converting to HTML with mammoth,
 * then extracting tables with cheerio.
 */
async function parseDocx(buffer: Buffer): Promise<RawTable[]> {
  const result = await mammoth.convertToHtml({ buffer });

  if (result.messages.length > 0) {
    console.log(
      `[doc-parser] mammoth warnings: ${result.messages.map((m) => m.message).join("; ")}`
    );
  }

  const $ = cheerio.load(result.value);
  const tables: RawTable[] = [];

  $("table").each((_tableIdx, tableEl) => {
    const rows: string[][] = [];

    $(tableEl)
      .find("tr")
      .each((_rowIdx, rowEl) => {
        const cells: string[] = [];
        $(rowEl)
          .find("td, th")
          .each((_cellIdx, cellEl) => {
            cells.push($(cellEl).text().trim());
          });
        if (cells.length > 0) {
          rows.push(cells);
        }
      });

    if (rows.length > 0) {
      tables.push({ rows });
    }
  });

  return tables;
}

/**
 * Parse a legacy .doc file using word-extractor.
 *
 * These Wire List .doc files have a specific structure where word-extractor
 * flattens table rows into "mega-lines" -- each panel's rows are concatenated
 * into a single text line with hundreds of tab-separated values.
 *
 * The parser detects the header row, determines the row width, and chunks
 * the mega-lines back into individual table rows.
 */
async function parseDoc(buffer: Buffer): Promise<RawTable[]> {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  const bodyText = doc.getBody();

  return parseWireListBody(bodyText);
}

/**
 * Known header keywords that identify the header row in Wire List documents.
 */
const HEADER_KEYWORDS = [
  "deladd", "del/add", "стр", "from", "to", "wc", "cc",
  "nc", "io", "sub", "word", "bit", "remarks", "power",
  "origin", "net", "ped", "rev", "str", "провід",
  "звідки", "куди", "переріз", "колір", "живлення",
];

/**
 * Parse the body text of a Wire List .doc file.
 *
 * Structure:
 * - Lines 0-N: title/subtitle (plain text, no tabs or few tabs)
 * - Header line: tab-separated column names (e.g. "DelAdd\tСтр\tFrom\t...")
 *   followed by optional panel marker (e.g. "\tПанель HY07\t")
 * - Data mega-lines: hundreds of tab-separated values per line,
 *   each being multiple rows concatenated. Every `rowWidth` values = one row.
 * - Panel markers appear as chunks where most cells are empty and one
 *   contains "Панель ..." -- these are section separators, not data.
 */
function parseWireListBody(text: string): RawTable[] {
  const lines = text.split("\n");

  // Step 1: Find the header line by looking for known column keywords
  let headerLineIdx = -1;
  let headerCells: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes("\t")) continue;

    const cells = lines[i].split("\t").map((c) => c.trim());
    const lowerCells = cells.map((c) => c.toLowerCase());

    const matchCount = lowerCells.filter((c) =>
      HEADER_KEYWORDS.includes(c)
    ).length;

    if (matchCount >= 3) {
      headerLineIdx = i;
      headerCells = cells;
      break;
    }
  }

  if (headerLineIdx === -1) {
    console.log("[doc-parser] No header row found, trying simple tab-separated fallback");
    return parseSimpleTabSeparated(text);
  }

  // Step 2: Determine the row width from the header.
  // The header may include trailing empty cells and a panel marker.
  // Find the core data columns (before panel marker / trailing empties).
  const rowWidth = detectRowWidth(headerCells);

  console.log(
    `[doc-parser] Header at line ${headerLineIdx}: ${rowWidth} cols per row ` +
    `(raw header has ${headerCells.length} cells)`
  );
  console.log(
    `[doc-parser] Columns: ${headerCells.slice(0, rowWidth).join(" | ")}`
  );

  // Step 3: Extract title from lines before the header
  const titleLines = lines
    .slice(0, headerLineIdx)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (titleLines.length > 0) {
    console.log(`[doc-parser] Title: ${titleLines.join(" / ")}`);
  }

  // Step 4: Build the header row (just the data columns)
  const header = headerCells.slice(0, rowWidth).map((c) => c.trim());

  // Step 5: Extract the panel name from the header line (if present)
  let currentPanel = extractPanelName(headerCells.slice(rowWidth));

  // Step 6: Chunk all data mega-lines into individual rows
  const allRows: string[][] = [header];

  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.includes("\t")) continue;

    const allCells = line.split("\t").map((c) => c.trim());

    // Chunk into groups of rowWidth
    for (let offset = 0; offset < allCells.length; offset += rowWidth) {
      const chunk = allCells.slice(offset, offset + rowWidth);

      // Pad short chunks (last chunk may be shorter)
      while (chunk.length < rowWidth) {
        chunk.push("");
      }

      // Check if this chunk is a panel marker
      const panelName = extractPanelName(chunk);
      if (panelName) {
        currentPanel = panelName;
        continue;
      }

      // Skip completely empty chunks
      if (chunk.every((c) => c === "")) continue;

      allRows.push(chunk);
    }
  }

  if (allRows.length <= 1) {
    console.log("[doc-parser] No data rows found after chunking");
    return [];
  }

  console.log(
    `[doc-parser] Extracted ${allRows.length - 1} data rows ` +
    `(${currentPanel ? "last panel: " + currentPanel : "no panel markers"})`
  );

  return [{ rows: allRows }];
}

/**
 * Detect the actual row width (number of data columns per row).
 *
 * The header line may have trailing empty cells and a panel marker.
 * We find where the meaningful headers end by looking for the pattern:
 * [data cols...] [empty] [panel name] [empty]
 *
 * If no panel marker is found, use the full header length minus trailing empties.
 */
function detectRowWidth(headerCells: string[]): number {
  // Look for a panel marker in the header line
  for (let i = 0; i < headerCells.length; i++) {
    if (/^панель\s+/i.test(headerCells[i])) {
      // Row width is everything before the empty cell preceding the panel marker
      // Typical: [...data cols..., "", "Панель HY07", ""]
      let width = i;
      // Trim trailing empty cells before the panel marker
      while (width > 0 && headerCells[width - 1] === "") {
        width--;
      }
      return width > 0 ? width + 1 : i; // +1 to include the trailing empty separator
    }
  }

  // No panel marker found: trim trailing empty cells
  let width = headerCells.length;
  while (width > 0 && headerCells[width - 1] === "") {
    width--;
  }

  return width;
}

/**
 * Extract a panel name from a chunk of cells.
 * A panel marker is a chunk where most cells are empty and one matches "Панель ...".
 * Returns the panel name or null if not a panel marker.
 */
function extractPanelName(cells: string[]): string | null {
  if (cells.length === 0) return null;

  const nonEmpty = cells.filter((c) => c.length > 0);

  // A panel marker typically has 1-2 non-empty cells, one of which is the panel name
  if (nonEmpty.length > 3) return null;

  for (const cell of nonEmpty) {
    if (/^панель\s+/i.test(cell)) {
      return cell;
    }
  }

  return null;
}

/**
 * Simple fallback: parse tab-separated text where each line is one row.
 * Used when no Wire List header pattern is detected.
 */
function parseSimpleTabSeparated(text: string): RawTable[] {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const tabLines = lines.filter((line) => line.includes("\t"));

  if (tabLines.length < 2) return [];

  const rows = tabLines.map((line) =>
    line.split("\t").map((cell) => cell.trim())
  );

  // Use the most common column count as the expected width
  const colCounts = rows.map((r) => r.length);
  const countFreq = new Map<number, number>();
  for (const c of colCounts) {
    countFreq.set(c, (countFreq.get(c) || 0) + 1);
  }
  const expectedCols = [...countFreq.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  const filteredRows = rows.filter((r) => r.length === expectedCols);

  if (filteredRows.length < 2) return [];

  return [{ rows: filteredRows }];
}
