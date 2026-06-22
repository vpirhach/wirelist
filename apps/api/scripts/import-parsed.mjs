#!/usr/bin/env node
/**
 * Stage 2 + 3: merge-diff parsed rows against the live DB and import one PENDING
 * change_request per file via POST /api/change-requests.
 *
 * Merge rule (all files):
 *   - match each row to DB by fromDestination|toDestination
 *   - action DEL            -> DELETE (resolve wireId by route; 0/>1 flagged)
 *   - route exists (ADD/'') -> UPDATE with only changed fields (file wins; empty/
 *                              non-coercible file values never overwrite the DB)
 *   - route absent          -> CREATE
 *   - existing route, no field changes -> no-op (no record)
 *
 * Usage:
 *   node scripts/import-parsed.mjs --dry-run [--verbose] [--limit=N] [match...]
 *   node scripts/import-parsed.mjs [--limit=N] [match...]
 * `match...` = substrings; only files whose path contains one are processed (pilot).
 *
 * Env: API_BASE (http://localhost:3002/api), CID (db container ebbfcf65a902),
 *      LOGIN_USER (default WireAgent), LOGIN_PASS (required — no default)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PARSED = join(here, 'parsed');
const API_BASE = process.env.API_BASE ?? 'http://localhost:3002/api';
const CID = process.env.CID ?? 'ebbfcf65a902';
const LOGIN_USER = process.env.LOGIN_USER ?? 'WireAgent';
const LOGIN_PASS = process.env.LOGIN_PASS; // required — set via env, never hardcode a credential

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const VERBOSE = argv.includes('--verbose');
const LIMIT = (() => { const a = argv.find((x) => x.startsWith('--limit=')); return a ? +a.split('=')[1] : Infinity; })();
const MATCH = argv.filter((a) => !a.startsWith('--'));

const NUM_FIELDS = new Set(['colorId', 'sub', 'word', 'bits', 'hwModelsId']);
// wire_code_id is intentionally EXCLUDED: the docs store AWG gauge (22/16/14) but the DB
// column holds a different 0-9 code, so it is never read or written.
const MERGE_FIELDS = ['colorId', 'ioTypeId', 'sub', 'word', 'bits', 'power',
  'origin', 'wireNumber', 'hwModelsId', 'remarks', 'noteCode', 'changeNumber', 'changeDate',
  'hwAddress', 'coord', 'decommissioned', 'ped', 'network'];

// Collapse a value that is just one whitespace-separated token repeated
// (merged-cell artifact, e.g. "БПРІ-01 БПРІ-01 БПРІ-01") back to that token.
function collapseRepeats(s) {
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length > 1 && parts.every((p) => p === parts[0])) return parts[0];
  return s;
}
function coerce(field, raw) {
  if (raw == null) return undefined;
  let s = String(raw).trim();
  if (s === '') return undefined;
  if (NUM_FIELDS.has(field)) { const n = parseInt(s, 10); return Number.isFinite(n) ? n : undefined; }
  s = collapseRepeats(s);
  const cap = field === 'fromDestination' || field === 'toDestination' ? 100 : 255;
  if (s.length > cap) s = s.slice(0, cap); // never exceed the column type
  return s;
}
function norm(v) { return v == null ? '' : (typeof v === 'number' ? String(v) : String(v).trim()); }
const routeKey = (f, t) => `${(f ?? '').trim()}|${(t ?? '').trim()}`;

function loadDbWires() {
  const sql = `COPY (SELECT row_to_json(t) FROM (
    SELECT id, from_destination AS "fromDestination", to_destination AS "toDestination",
      wire_code_id AS "wireCodeId", color_id AS "colorId", io_type_id AS "ioTypeId",
      sub, word, bits, power, origin, wire_number AS "wireNumber", hw_models_id AS "hwModelsId",
      remarks, note_code AS "noteCode", change_number AS "changeNumber",
      change_date AS "changeDate", hw_address AS "hwAddress", coord, decommissioned, ped, network
    FROM wireslist) t) TO STDOUT`;
  const out = execFileSync('docker', ['exec', CID, 'psql', '-U', 'postgres', '-d', 'wirelist_db', '-tAc', sql],
    { maxBuffer: 256 * 1024 * 1024, encoding: 'utf-8' });
  const byRoute = new Map();
  let n = 0;
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const w = JSON.parse(line); n++;
    const k = routeKey(w.fromDestination, w.toDestination);
    if (!byRoute.has(k)) byRoute.set(k, []);
    byRoute.get(k).push(w);
  }
  console.log(`Loaded ${n} DB wires (${byRoute.size} distinct routes)`);
  return byRoute;
}

function buildRecords(parsed, byRoute, stat) {
  const records = [];
  for (const r of parsed.rows) {
    const from = collapseRepeats((r.fromDestination ?? '').trim());
    const to = collapseRepeats((r.toDestination ?? '').trim());
    if (from.length > 100 || to.length > 100) { stat.overlongKey = (stat.overlongKey ?? 0) + 1; continue; }
    const k = routeKey(from, to);
    const dbList = byRoute.get(k) ?? [];
    const fileFields = {};
    for (const f of MERGE_FIELDS) { const c = coerce(f, r[f]); if (c !== undefined) fileFields[f] = c; }

    if (r.action === 'DEL') {
      if (dbList.length === 0) { stat.delUnresolved++; stat.notes.push(`DEL no-match ${k}`); continue; }
      if (dbList.length > 1) stat.delAmbiguous++;
      for (const w of dbList) {
        records.push({ recordType: 'DELETE', wireId: Number(w.id), fromDestination: from, toDestination: to });
        stat.deletes++;
      }
      continue;
    }
    // ADD or no action -> upsert
    if (dbList.length === 0) {
      records.push({ recordType: 'CREATE', fromDestination: from, toDestination: to, ...fileFields });
      stat.creates++;
    } else {
      const w = dbList[0];
      if (dbList.length > 1) stat.updateAmbiguous++;
      const changes = {};
      const proposed = {};
      for (const f of MERGE_FIELDS) {
        if (fileFields[f] === undefined) continue;          // file empty -> never overwrite
        if (norm(fileFields[f]) !== norm(w[f])) {
          changes[f] = { oldValue: w[f] ?? null, newValue: fileFields[f] };
          proposed[f] = fileFields[f];
          if (f === 'wireCodeId' || f === 'colorId') stat.encodingOverwrites++;
        }
      }
      if (Object.keys(changes).length === 0) { stat.noops++; continue; }
      records.push({ recordType: 'UPDATE', wireId: Number(w.id), fromDestination: from, toDestination: to, ...proposed, changes });
      stat.updates++;
    }
  }
  return records;
}

async function login() {
  if (!LOGIN_PASS) throw new Error('Set LOGIN_PASS env var (no hardcoded credential)');
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: LOGIN_USER, password: LOGIN_PASS }),
  });
  if (!res.ok) throw new Error(`login failed ${res.status}: ${await res.text()}`);
  return (await res.json()).accessToken;
}
async function postChangeRequest(token, comment, records) {
  const res = await fetch(`${API_BASE}/change-requests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ comment, records }),
  });
  if (!res.ok) throw new Error(`create failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function main() {
  console.log(DRY ? '*** DRY RUN — no change_requests created ***' : 'LIVE RUN');
  const byRoute = loadDbWires();
  let files = readdirSync(PARSED).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort();

  const token = DRY ? null : await login();
  const report = [];
  let processed = 0, imported = 0;

  for (const f of files) {
    const parsed = JSON.parse(readFileSync(join(PARSED, f), 'utf-8'));
    if (!parsed.isWireList) continue;
    if (MATCH.length && !MATCH.some((m) => parsed.file.includes(m))) continue;
    if (processed >= LIMIT) break;
    processed++;

    const stat = { creates: 0, updates: 0, deletes: 0, noops: 0, delUnresolved: 0, delAmbiguous: 0, updateAmbiguous: 0, encodingOverwrites: 0, notes: [] };
    const records = buildRecords(parsed, byRoute, stat);
    const row = { file: parsed.file, wireRows: parsed.rows.length, ...stat, recordCount: records.length };
    delete row.notes;

    if (VERBOSE) {
      console.log(`\n• ${parsed.file}`);
      console.log(`   rows=${parsed.rows.length} -> C:${stat.creates} U:${stat.updates} D:${stat.deletes} noop:${stat.noops} delUnresolved:${stat.delUnresolved} encOverwrite:${stat.encodingOverwrites}`);
      records.slice(0, 6).forEach((r) => console.log(`     [${r.recordType}] ${r.fromDestination} -> ${r.toDestination}` + (r.changes ? ` changes=${JSON.stringify(r.changes)}` : '')));
    } else {
      process.stdout.write('.');
    }

    if (!DRY && records.length > 0) {
      try {
        const res = await postChangeRequest(token, `[doc-import] ${parsed.file}`, records);
        row.changeRequestId = res.id ?? res.changeRequestId;
        imported++;
      } catch (e) {
        row.error = String(e.message).slice(0, 200);
        process.stdout.write('E');
      }
    }
    report.push(row);
  }

  const agg = report.reduce((a, r) => {
    a.creates += r.creates; a.updates += r.updates; a.deletes += r.deletes; a.noops += r.noops;
    a.delUnresolved += r.delUnresolved; a.encodingOverwrites += r.encodingOverwrites; return a;
  }, { creates: 0, updates: 0, deletes: 0, noops: 0, delUnresolved: 0, encodingOverwrites: 0 });

  const emptyFiles = report.filter((r) => r.recordCount === 0);
  console.log(`\n\n===== ${DRY ? 'DRY-RUN' : 'IMPORT'} SUMMARY =====`);
  console.log(`Files processed: ${processed}   With records: ${processed - emptyFiles.length}   ${DRY ? 'Would import' : 'Imported'}: ${DRY ? processed - emptyFiles.length : imported}`);
  console.log(`Records  CREATE:${agg.creates}  UPDATE:${agg.updates}  DELETE:${agg.deletes}  no-op:${agg.noops}`);
  console.log(`DEL unresolved (no DB match): ${agg.delUnresolved}`);
  console.log(`Coded-field overwrites remaining (should be 0): ${agg.encodingOverwrites}`);
  console.log(`\nFiles skipped (0 records — nothing to propose): ${emptyFiles.length}`);
  emptyFiles.forEach((r) => console.log(`   ${r.file}  (rows=${r.wireRows}, delUnresolved=${r.delUnresolved})`));
  writeFileSync(join(here, 'import-report.json'), JSON.stringify({ dryRun: DRY, agg, report }, null, 2));
  console.log(`\nReport -> scripts/import-report.json`);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
