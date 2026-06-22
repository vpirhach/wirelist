import stringSimilarity from "string-similarity";
import {
  RawTable,
  ColumnClassifier,
  ColumnMapping,
  ColumnMappingEntry,
} from "./types";

// ─── Classifier definitions ──────────────────────────────────────────

const WIRE_NUMBER_PATTERN =
  /^\d{2}[A-Za-z]{2}\d{3}[A-Za-z]{2}\d{4}-\d{2}$/;

const CONNECTOR_PATTERN =
  /^\d{2}[A-Za-z]\d{3}-[A-Za-z0-9]{2,}[A-Za-z]\d{2}-\d{2}$/;

const WIRE_GAUGE_VALUES = new Set([
  "14", "16", "18", "20", "22", "24", "26", "28",
]);

const COLOR_CODES = new Set([
  "WH", "BK", "RD", "BL", "GN", "YL", "OR", "VT",
  "GY", "PK", "BN", "TN", "SL", "PP", "LB",
  // lowercase variants
  "wh", "bk", "rd", "bl", "gn", "yl", "or", "vt",
  "gy", "pk", "bn", "tn", "sl", "pp", "lb",
]);

const IO_TYPES = new Set([
  "DI", "DO", "AI", "AO", "TI", "TO", "PI",
  "di", "do", "ai", "ao", "ti", "to", "pi",
]);

const POWER_TERMS = new Set([
  "DIG GND", "AC PWR", "DC PWR", "ANALOG GND", "CHASSIS GND",
  "GND", "PWR", "+24V", "+5V", "120VAC", "24VDC",
]);

const REMARKS_PATTERN = /POS\s+\d+[A-Za-z]/i;

const ACTION_VALUES = new Set([
  "Del", "Add", "del", "add", "DEL", "ADD",
]);

/**
 * All column classifiers, ordered by priority.
 */
const CLASSIFIERS: ColumnClassifier[] = [
  {
    field: "action",
    label: "Action (Del/Add)",
    headerPatterns: [
      /^del.?add$/i,
      /^del\/add$/i,
      /^action$/i,
      /^дія$/i,        // UA: дія
      /^д[іi]я$/i,
    ],
    knownValues: ACTION_VALUES,
    priority: 0,
  },
  {
    field: "wireNumber",
    label: "Wire Number (Str)",
    headerPatterns: [
      /^стр\.?$/i,
      /wire.?(?:id|number|num|no)/i,
      /провід/i,       // UA: провід
      /провод/i,       // legacy
      /^str$/i,
    ],
    dataPattern: WIRE_NUMBER_PATTERN,
    priority: 1,
  },
  {
    field: "fromDestination",
    label: "From",
    headerPatterns: [
      /^from$/i,
      /^від$/i,        // UA: від
      /^звідки$/i,     // UA: звідки
      /роз'?єм.?1/i,  // UA: роз'єм 1
      /source/i,
    ],
    dataPattern: CONNECTOR_PATTERN,
    priority: 2,
  },
  {
    field: "toDestination",
    label: "To",
    headerPatterns: [
      /^to$/i,
      /^до$/i,
      /^куди$/i,       // UA: куди
      /роз'?єм.?2/i,  // UA: роз'єм 2
      /dest/i,
    ],
    dataPattern: CONNECTOR_PATTERN,
    priority: 3,
  },
  {
    field: "wireCodeId",
    label: "Wire Code (WC)",
    headerPatterns: [
      /^wc$/i,
      /переріз/i,     // UA: переріз
      /перетин/i,     // UA: перетин (alternative)
      /^awg$/i,
      /gauge/i,
      /wire.?code/i,
    ],
    knownValues: WIRE_GAUGE_VALUES,
    priority: 4,
  },
  {
    field: "colorId",
    label: "Color Code (CC)",
    headerPatterns: [
      /^cc$/i,
      /колір/i,       // UA: колір
      /^color$/i,
      /colour/i,
    ],
    knownValues: COLOR_CODES,
    priority: 5,
  },
  {
    field: "ioTypeId",
    label: "IO Type",
    headerPatterns: [
      /^io$/i,
      /^i\/o$/i,
      /тип.?(?:io|вв)/i, // UA/shared: тип IO
    ],
    knownValues: IO_TYPES,
    priority: 6,
  },
  {
    field: "sub",
    label: "Sub",
    headerPatterns: [/^sub$/i],
    dataPattern: /^\d{1,2}$/,
    priority: 10,
  },
  {
    field: "word",
    label: "Word",
    headerPatterns: [
      /^word$/i,
      /^слово$/i,     // UA: слово
    ],
    dataPattern: /^\d{1,3}$/,
    priority: 11,
  },
  {
    field: "bits",
    label: "Bit",
    headerPatterns: [
      /^bits?$/i,
      /^біт$/i,       // UA: біт
    ],
    dataPattern: /^\d{1,2}$/,
    priority: 12,
  },
  {
    field: "remarks",
    label: "Remarks",
    headerPatterns: [
      /remark/i,
      /приміт/i,      // UA: примітки
      /comment/i,
      /коментар/i,    // UA: коментар
    ],
    dataPattern: REMARKS_PATTERN,
    priority: 7,
  },
  {
    field: "power",
    label: "Power",
    headerPatterns: [
      /^power$/i,
      /живлення/i,    // UA: живлення
    ],
    knownValues: POWER_TERMS,
    priority: 8,
  },
  {
    field: "origin",
    label: "Origin",
    headerPatterns: [
      /^origin$/i,
      /джерело/i,     // UA: джерело
      /походження/i,  // UA: походження
    ],
    priority: 13,
  },
  {
    field: "ped",
    label: "PED",
    headerPatterns: [
      /^ped$/i,
    ],
    priority: 14,
  },
  {
    field: "network",
    label: "Network",
    headerPatterns: [
      /^net(?:work)?$/i,
      /^мережа$/i,    // UA: мережа
    ],
    priority: 15,
  },
  {
    field: "noteCode",
    label: "Note Code (NC)",
    headerPatterns: [
      /^nc$/i,
      /note.?code/i,
      /код.?прим/i,   // UA: код примітки
    ],
    priority: 16,
  },
  {
    field: "changeNumber",
    label: "Change / Rev",
    headerPatterns: [
      /^rev$/i,
      /change/i,
      /^зм[іi]/i,     // UA: зміна
      /revision/i,
    ],
    priority: 17,
  },
];

// ─── Scoring ────────────────────────────────────────────────────────

/**
 * Score how well a column's header matches a classifier.
 * Uses regex pattern matching first, then fuzzy string similarity.
 */
function scoreHeader(header: string, classifier: ColumnClassifier): number {
  if (!header) return 0;

  const normalized = header.trim().toLowerCase();
  if (!normalized) return 0;

  // Exact regex match = high confidence
  for (const pattern of classifier.headerPatterns) {
    if (pattern.test(header)) {
      return 1.0;
    }
  }

  // Fuzzy match against pattern source strings
  const patternStrings = classifier.headerPatterns.map((p) =>
    p.source
      .replace(/^\^/, "")
      .replace(/\$$/, "")
      .replace(/\\/g, "")
      .replace(/\?/g, "")
      .replace(/\.\*/g, " ")
      .replace(/\|/g, " ")
      .toLowerCase()
  );

  let bestScore = 0;
  for (const ps of patternStrings) {
    const words = ps.split(/\s+/).filter(Boolean);
    for (const word of words) {
      if (word.length >= 2) {
        const sim = stringSimilarity.compareTwoStrings(normalized, word);
        bestScore = Math.max(bestScore, sim);
      }
    }
  }

  // Also try matching the classifier label
  const labelSim = stringSimilarity.compareTwoStrings(
    normalized,
    classifier.label.toLowerCase()
  );
  bestScore = Math.max(bestScore, labelSim);

  return bestScore;
}

/**
 * Score how well a column's data values match a classifier.
 */
function scoreData(
  values: string[],
  classifier: ColumnClassifier
): number {
  const nonEmpty = values.filter((v) => v.length > 0);
  if (nonEmpty.length === 0) return 0;

  let matchCount = 0;

  for (const val of nonEmpty) {
    if (classifier.dataPattern && classifier.dataPattern.test(val)) {
      matchCount++;
      continue;
    }

    if (classifier.knownValues) {
      if (classifier.knownValues.has(val) || classifier.knownValues.has(val.toUpperCase())) {
        matchCount++;
        continue;
      }
    }
  }

  return matchCount / nonEmpty.length;
}

// ─── Detection algorithm ────────────────────────────────────────────

/**
 * Detect which Wire model field each column in the table corresponds to.
 *
 * @param table - Raw table with rows (first row may be headers)
 * @returns Column mapping: columnIndex -> field assignment
 */
export function detectColumns(table: RawTable): ColumnMapping {
  if (table.rows.length === 0) return {};

  const colCount = Math.max(...table.rows.map((r) => r.length));
  if (colCount === 0) return {};

  // Heuristic: first row is a header if most cells are short text
  // and don't match typical data patterns
  const firstRow = table.rows[0];
  const isHeaderRow = detectHeaderRow(firstRow);

  const headers = isHeaderRow ? firstRow : [];
  const dataRows = isHeaderRow ? table.rows.slice(1) : table.rows;

  // Collect values per column
  const columnValues: string[][] = Array.from({ length: colCount }, () => []);
  for (const row of dataRows) {
    for (let c = 0; c < colCount; c++) {
      const val = (row[c] || "").trim();
      columnValues[c].push(val);
    }
  }

  // Build score matrix: [columnIndex][classifierIndex] = score
  const scoreMatrix: number[][] = Array.from({ length: colCount }, () =>
    Array(CLASSIFIERS.length).fill(0)
  );

  const HEADER_WEIGHT = 0.4;
  const DATA_WEIGHT = 0.6;

  for (let col = 0; col < colCount; col++) {
    const header = headers[col] || "";
    const values = columnValues[col];

    for (let ci = 0; ci < CLASSIFIERS.length; ci++) {
      const classifier = CLASSIFIERS[ci];
      const hScore = scoreHeader(header, classifier);
      const dScore = scoreData(values, classifier);

      // If we have a header, weight both; if no header, rely entirely on data
      const combined = header
        ? HEADER_WEIGHT * hScore + DATA_WEIGHT * dScore
        : dScore;

      scoreMatrix[col][ci] = combined;
    }
  }

  // Greedy assignment: pick the highest score globally, assign, repeat
  const assigned = new Set<number>(); // classifier indices already assigned
  const usedCols = new Set<number>(); // column indices already assigned
  const mapping: ColumnMapping = {};

  const CONFIDENCE_THRESHOLD = 0.15;

  while (assigned.size < CLASSIFIERS.length && usedCols.size < colCount) {
    let bestScore = 0;
    let bestCol = -1;
    let bestCi = -1;

    for (let col = 0; col < colCount; col++) {
      if (usedCols.has(col)) continue;
      for (let ci = 0; ci < CLASSIFIERS.length; ci++) {
        if (assigned.has(ci)) continue;
        if (scoreMatrix[col][ci] > bestScore) {
          bestScore = scoreMatrix[col][ci];
          bestCol = col;
          bestCi = ci;
        }
      }
    }

    if (bestCol === -1 || bestScore < CONFIDENCE_THRESHOLD) break;

    const classifier = CLASSIFIERS[bestCi];
    mapping[String(bestCol)] = {
      field: classifier.field,
      confidence: Math.round(bestScore * 100) / 100,
      header: headers[bestCol] || "",
      columnIndex: bestCol,
    };

    assigned.add(bestCi);
    usedCols.add(bestCol);
  }

  // Disambiguate from/to: if both matched with connector patterns,
  // ensure "from" comes before "to" positionally
  disambiguateFromTo(mapping);

  // Label remaining unmatched columns as unknown
  for (let col = 0; col < colCount; col++) {
    if (!usedCols.has(col)) {
      const header = headers[col] || "";
      mapping[String(col)] = {
        field: header ? `unknown:${header}` : `unknown_${col}`,
        confidence: 0,
        header,
        columnIndex: col,
      };
    }
  }

  return mapping;
}

/**
 * Ensure fromDestination appears before toDestination positionally.
 * If they're swapped, swap them.
 */
function disambiguateFromTo(mapping: ColumnMapping): void {
  let fromEntry: ColumnMappingEntry | null = null;
  let toEntry: ColumnMappingEntry | null = null;
  let fromKey = "";
  let toKey = "";

  for (const [key, entry] of Object.entries(mapping)) {
    if (entry.field === "fromDestination") {
      fromEntry = entry;
      fromKey = key;
    }
    if (entry.field === "toDestination") {
      toEntry = entry;
      toKey = key;
    }
  }

  if (fromEntry && toEntry) {
    if (fromEntry.columnIndex > toEntry.columnIndex) {
      // Swap: "from" should be the earlier column
      mapping[fromKey] = { ...toEntry, field: "fromDestination" };
      mapping[toKey] = { ...fromEntry, field: "toDestination" };
    }
  }
}

/**
 * Heuristic to detect if the first row is a header row.
 *
 * Headers tend to be:
 * - Short text (< 30 chars)
 * - Don't match numeric-heavy data patterns
 * - Mostly non-empty
 */
function detectHeaderRow(row: string[]): boolean {
  if (row.length === 0) return false;

  const nonEmpty = row.filter((c) => c.trim().length > 0);
  if (nonEmpty.length < row.length * 0.5) return false;

  let looksLikeHeader = 0;
  for (const cell of nonEmpty) {
    const trimmed = cell.trim();
    // Short, non-numeric, no dashes suggesting wire IDs
    if (
      trimmed.length < 30 &&
      !/^\d{2}[A-Z]{2}\d{3}/.test(trimmed) &&
      !/^\d+$/.test(trimmed)
    ) {
      looksLikeHeader++;
    }
  }

  return looksLikeHeader / nonEmpty.length > 0.6;
}

/**
 * Get the list of all known canonical field names.
 */
export function getCanonicalFields(): string[] {
  return CLASSIFIERS.map((c) => c.field);
}
