#!/usr/bin/env node
/**
 * Stage 1: map each extracted cell-grid to normalized wire rows.
 *
 * Reads  scripts/extracted/<NNN>__*.json  ({ file, tables: [ [ [cell,...] ] ] })
 * Writes scripts/parsed/<NNN>__*.json      ({ file, isWireList, headerFields, rows, skippedRows, notes })
 *        scripts/parsed/_summary.json
 *
 * Column mapping is by header name (synonyms cover Family A "change-sheets" and
 * Family B "from_des" connection lists). A table is a wire list iff its header maps
 * BOTH fromDestination and toDestination. Field values are kept as raw trimmed
 * strings here; type coercion + DB merge happen in Stage 2.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const IN = join(here, 'extracted');
const OUT = join(here, 'parsed');

// header cell (lowercased) -> canonical field
const FIELD_BY_HEADER = {
  deladd: 'action', 'del add': 'action', 'del/add': 'action', del: 'action', add: 'action',
  'стр': 'wireNumber', 'стор.': 'wireNumber', 'стор': 'wireNumber', str: 'wireNumber',
  from: 'fromDestination', from_des: 'fromDestination', 'звідки': 'fromDestination', 'від': 'fromDestination',
  to: 'toDestination', to_des: 'toDestination', 'куди': 'toDestination', 'до': 'toDestination',
  wc: 'wireCodeId', wire_code: 'wireCodeId',
  cc: 'colorId', color_code: 'colorId',
  nc: 'noteCode', note_code: 'noteCode',
  io: 'ioTypeId',
  sub: 'sub', s: 'sub',
  word: 'word',
  bit: 'bits', bits: 'bits',
  remarks: 'remarks',
  power: 'power',
  origin: 'origin',
  net: 'network', network: 'network',
  ped: 'ped',
  rev: 'changeNumber',
  // write_data (Family B) intentionally left unmapped (always blank in samples)
};

const WIRE_FIELDS = new Set(Object.values(FIELD_BY_HEADER));

function mapHeader(headerRow) {
  // returns { colIndex -> field }, and the set of fields covered
  const map = {};
  headerRow.forEach((h, i) => {
    const key = (h ?? '').toLowerCase().trim();
    if (FIELD_BY_HEADER[key] && map[i] === undefined) map[i] = FIELD_BY_HEADER[key];
  });
  return map;
}

function looksLikeHeader(row) {
  const m = mapHeader(row);
  const fields = new Set(Object.values(m));
  return fields.has('fromDestination') && fields.has('toDestination');
}

function normalizeAction(v) {
  const s = (v ?? '').toLowerCase().trim();
  if (s.startsWith('add')) return 'ADD';
  if (s.startsWith('del')) return 'DEL';
  return ''; // unknown/blank
}

function parseFile(doc) {
  const out = { file: doc.file, isWireList: false, headerFields: null, rows: [], skippedRows: 0, notes: [] };
  for (const table of doc.tables ?? []) {
    // find header row within this table (first row that maps from+to)
    let hIdx = table.findIndex((r) => looksLikeHeader(r));
    if (hIdx === -1) continue;
    const header = table[hIdx];
    const colMap = mapHeader(header);
    const hasAction = Object.values(colMap).includes('action');
    out.isWireList = true;
    out.headerFields = header;

    for (let i = hIdx + 1; i < table.length; i++) {
      const row = table[i];
      // skip panel markers / section rows / repeated headers
      if (looksLikeHeader(row)) continue;
      const rec = {};
      for (const [ci, field] of Object.entries(colMap)) {
        const val = (row[Number(ci)] ?? '').trim();
        if (val !== '') rec[field] = val;
      }
      const from = rec.fromDestination ?? '';
      const to = rec.toDestination ?? '';
      if (!from || !to) { out.skippedRows++; continue; } // panel marker / blank / non-wire row
      rec.action = hasAction ? normalizeAction(rec.action) : '';
      out.rows.push(rec);
    }
  }
  return out;
}

function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const files = readdirSync(IN).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort();
  const summary = [];
  for (const f of files) {
    const doc = JSON.parse(readFileSync(join(IN, f), 'utf-8'));
    const parsed = parseFile(doc);
    writeFileSync(join(OUT, f), JSON.stringify(parsed, null, 1));
    const adds = parsed.rows.filter((r) => r.action === 'ADD').length;
    const dels = parsed.rows.filter((r) => r.action === 'DEL').length;
    const noact = parsed.rows.filter((r) => !r.action).length;
    summary.push({
      file: parsed.file, isWireList: parsed.isWireList,
      rows: parsed.rows.length, adds, dels, noAction: noact, skipped: parsed.skippedRows,
    });
  }
  writeFileSync(join(OUT, '_summary.json'), JSON.stringify(summary, null, 1));

  const wl = summary.filter((s) => s.isWireList);
  const nonwl = summary.filter((s) => !s.isWireList);
  const totalRows = wl.reduce((s, x) => s + x.rows, 0);
  console.log(`Parsed ${summary.length} files.`);
  console.log(`Wire-list files: ${wl.length}  (total ${totalRows} wire rows)`);
  console.log(`Non-wire-list (skipped): ${nonwl.length}`);
  nonwl.forEach((s) => console.log(`   skip: ${s.file}`));
  const withDel = wl.filter((s) => s.dels > 0);
  console.log(`\nFiles containing DEL rows: ${withDel.length}`);
  withDel.slice(0, 20).forEach((s) => console.log(`   ${s.dels} DEL / ${s.rows} rows  ${s.file}`));
}

main();
