#!/usr/bin/env node
/**
 * Stage 0: convert each .doc/.docx to an exact cell grid via LibreOffice headless,
 * parse the resulting HTML tables into 2D string arrays, and dump one JSON per file.
 *
 * Output:
 *   scripts/extracted/<NNN>__<sanitized>.json  = { file, tables: [ [ [cell,...], ... ] ] }
 *   scripts/extracted/_index.json              = [ { file, idx, tableCount, rowCount, header } ]
 *
 * Run:  node scripts/extract-doc-tables.mjs
 * Env:  DOCS_DIR (default docs/0_ПРАВКА_ДОК), SOFFICE (default mac path)
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const here = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = process.env.DOCS_DIR ?? '/Users/valentynpirhach/dev/wirelist/docs/0_ПРАВКА_ДОК';
const SOFFICE = process.env.SOFFICE ?? '/Applications/LibreOffice.app/Contents/MacOS/soffice';
const OUT = join(here, 'extracted');
const TMP = '/tmp/loconv_stage0';
const PROFILE = 'file:///tmp/lo_profile_stage0';

function collectDocs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) { out.push(...collectDocs(full)); continue; }
    const n = e.name.toLowerCase();
    if (e.name.startsWith('~$') || e.name.startsWith('~WRL') || n.endsWith('.tmp')) continue;
    if (n.endsWith('.doc') || n.endsWith('.docx')) out.push(full);
  }
  return out;
}

function cell(text) {
  return text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function htmlToTables(htmlPath) {
  const $ = cheerio.load(readFileSync(htmlPath, 'utf-8'));
  const tables = [];
  $('table').each((_i, tEl) => {
    const rows = [];
    $(tEl).find('tr').each((_r, rEl) => {
      const cells = [];
      $(rEl).find('td, th').each((_c, cEl) => cells.push(cell($(cEl).text())));
      if (cells.some((c) => c !== '')) rows.push(cells);
    });
    if (rows.length) tables.push(rows);
  });
  return tables;
}

function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  const files = collectDocs(DOCS_DIR).sort();
  console.log(`Converting ${files.length} files via LibreOffice...`);

  const index = [];
  let ok = 0, noTable = 0, failed = 0;

  files.forEach((src, i) => {
    const rel = relative(DOCS_DIR, src);
    const idx = String(i).padStart(3, '0');
    const fileTmp = join(TMP, idx);
    mkdirSync(fileTmp, { recursive: true });
    let tables = [];
    try {
      execFileSync(SOFFICE, [
        '--headless', '--norestore', '--nologo',
        `-env:UserInstallation=${PROFILE}`,
        '--convert-to', 'html', '--outdir', fileTmp, src,
      ], { stdio: 'ignore', timeout: 90_000 });
      const html = readdirSync(fileTmp).find((f) => f.toLowerCase().endsWith('.html'));
      if (html) tables = htmlToTables(join(fileTmp, html));
    } catch (e) {
      failed++;
      index.push({ file: rel, idx, error: String(e.message).slice(0, 120), tableCount: 0, rowCount: 0 });
      process.stdout.write('x');
      return;
    }
    const rowCount = tables.reduce((s, t) => s + t.length, 0);
    const header = tables[0]?.[0] ?? [];
    writeFileSync(join(OUT, `${idx}__${rel.replace(/[\/ ]+/g, '_')}.json`),
      JSON.stringify({ file: rel, idx, tables }, null, 1));
    index.push({ file: rel, idx, tableCount: tables.length, rowCount, header });
    if (rowCount === 0) { noTable++; process.stdout.write('-'); } else { ok++; process.stdout.write('.'); }
  });

  writeFileSync(join(OUT, '_index.json'), JSON.stringify(index, null, 1));
  console.log(`\n\nDone. with-tables=${ok}  no-table=${noTable}  failed=${failed}  total=${files.length}`);

  // Survey distinct header signatures
  const sigs = new Map();
  for (const e of index) {
    if (!e.header?.length) continue;
    const sig = e.header.map((h) => h.toLowerCase()).join('|');
    if (!sigs.has(sig)) sigs.set(sig, []);
    sigs.get(sig).push(e.file);
  }
  console.log(`\n=== ${sigs.size} distinct header signatures ===`);
  [...sigs.entries()].sort((a, b) => b[1].length - a[1].length).forEach(([sig, fs], i) => {
    console.log(`\n[${i}] (${fs.length} files) ${sig.slice(0, 200)}`);
  });
}

main();
