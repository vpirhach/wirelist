import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// ============================================================
// Configuration
// ============================================================
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 10;
const DELAY_MS = 150; // Delay between Google Translate requests (ms)

// ============================================================
// Manual Translation Map
// ============================================================
// Exact-match replacements: original → correct Ukrainian translation.
// These override Google Translate for domain-specific terms.
const MANUAL_TRANSLATIONS: Record<string, string> = {
  // --- Сигн pattern ---
  'Сигн А': 'Сигнал (а)',
  'Сигн Б': 'Сигнал (б)',
  'Сигн М': 'Сигнал (м)',

  // --- Technical abbreviations ---
  'ОТКАЗ Д. W': 'Відмова Д. W',
  'ОТКАЗ СРТ': 'Відмова СРТ',
  'НЕИСПР СРТ': 'Несправн СРТ',
  'НЕИСПРАВНОСТЬ': 'Несправність',
  'СБРОС НАГР': 'Скидання навант',
  'РАЗВОРОТ ЗАВ': 'Розворот зав',
  'ВЫДЕРЖ ВРЕМ': 'Витримка часу',
  'РАЗВОРОТ': 'Розворот',

  // --- On/Off ---
  'ОТКЛ': 'Вимкн',
  'ВКЛ': 'Увімкн',
  'ДЕБЛОКИРОВКА': 'Деблокування',

  // --- Equipment ---
  'Управление освещением': 'Керування освітленням',
  'Кондиционер Mitsubishi': 'Кондиціонер Mitsubishi',
  'Кондиционер Funai': 'Кондиціонер Funai',
  'Мастер-контроллер': 'Мастер-контролер',
  'Шнур питания': 'Шнур живлення',
  'Шнур живлення': 'Шнур живлення', // already Ukrainian, keep as-is

  // --- Cables ---
  'KVM кабель': 'KVM кабель',
  'HDMI кабель': 'HDMI кабель',
  'DVI кабель': 'DVI кабель',
  'DB25 видеокабель': 'DB25 відеокабель',

  // --- Audio ---
  'Микрофон НСБ': 'Мікрофон НСБ',
  'Микрофон кабина': 'Мікрофон кабіна',
  'ПК кабина': 'ПК кабіна',

  // --- Витая пара ---
  'Витая пара U/UTP  Cat. 6': 'Вита пара U/UTP Cat. 6',
  'Витая пара U/UTP  Cat. 5': 'Вита пара U/UTP Cat. 5',
  'Вита пара U/UTP  Cat. 5': 'Вита пара U/UTP Cat. 5',

  // --- Measurements ---
  'W ОБ/МИН': 'W об/хв',
  'N МВТ': 'N МВт',
  'P КГС/СМ2': 'P кгс/см2',

  // --- Probing ---
  'Проба': 'Проба',
};

// ============================================================
// Exclusion List (keep as-is, do NOT translate)
// ============================================================
// Exact matches that should be completely skipped.
const KEEP_AS_IS: Set<string> = new Set([
  // --- Інд (Індикатор) pattern — already Ukrainian ---
  'Інд Б',
  'Інд М',
  'Інд О',
  'Інд З',

  // --- Abbreviations that are technical labels ---
  'ПРЛ',
  'ДАТЧ',
  'МУТ-',
  'У МУТ',
  'РЧ-',
  'РЧ+',
  'КВ',
  'СК',
  'РЕЗЕРВ',

  // --- Кабель вита пара (already Ukrainian) ---
  'Кабель вита пара UTP',
  'Кабель Vita пара UTP',
]);

// ============================================================
// Exclusion Patterns (regex-based, keep as-is)
// ============================================================
// Patterns matching remarks that should be skipped entirely.
const KEEP_AS_IS_PATTERNS: RegExp[] = [
  // Н1-A, Н1-B, ..., Н2-A, etc. — hardware identifiers
  /^Н\d+-[A-Z]$/,
];

// ============================================================
// Prisma Client Setup (same adapter as the app)
// ============================================================
function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

// ============================================================
// Language Detection
// ============================================================

// Russian-specific characters NOT found in Ukrainian alphabet
const RUSSIAN_ONLY_CHARS = /[ыэёъЫЭЁЪ]/;
// Ukrainian-specific characters NOT found in Russian alphabet
const UKRAINIAN_ONLY_CHARS = /[ґєїҐЄЇ]/;
// Any Cyrillic character
const CYRILLIC = /[\u0400-\u04FF]/;

/**
 * Detect if text is likely Russian.
 *
 * Logic:
 * - No Cyrillic at all → not Russian (skip)
 * - Contains Russian-only chars (ы, э, ё, ъ) → definitely Russian
 * - Contains Ukrainian-only chars (ґ, є, ї) → definitely Ukrainian (skip)
 * - Contains Cyrillic but no unique markers → assume Russian
 *   (since existing data originates from a Russian-language system)
 */
function isLikelyRussian(text: string): boolean {
  if (!CYRILLIC.test(text)) return false;
  if (UKRAINIAN_ONLY_CHARS.test(text)) return false;
  if (RUSSIAN_ONLY_CHARS.test(text)) return true;

  // Cyrillic text with no unique markers — assume Russian
  return true;
}

// ============================================================
// Translation Logic
// ============================================================

/**
 * Determine the correct translation for a remark.
 * Priority:
 *   1. Exclusion list → return null (keep as-is)
 *   2. Manual mapping → return mapped value
 *   3. Google Translate → return translated value
 */
async function translateRemark(text: string): Promise<string | null> {
  const trimmed = text.trim();

  // 1. Check exclusion list (exact match)
  if (KEEP_AS_IS.has(trimmed)) {
    return null; // signal: skip this remark
  }

  // 2. Check exclusion patterns
  for (const pattern of KEEP_AS_IS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return null;
    }
  }

  // 3. Check manual translations (exact match)
  if (MANUAL_TRANSLATIONS[trimmed] !== undefined) {
    const mapped = MANUAL_TRANSLATIONS[trimmed];
    // If manual mapping is same as original, skip
    return mapped === trimmed ? null : mapped;
  }

  // 4. Fall back to Google Translate
  return translateRuToUk(trimmed);
}

/**
 * Translate text from Russian to Ukrainian using Google Translate.
 * Uses the free gtx endpoint (no API key required).
 */
async function translateRuToUk(text: string): Promise<string> {
  const url =
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=ru&tl=uk&dt=t&q=${encodeURIComponent(text)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Translate HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // Response shape: [[["translated","source",…], …], null, "ru"]
  const translated: string = data[0]
    .map((segment: any[]) => segment[0])
    .join('');

  return translated;
}

// ============================================================
// Helpers
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('========================================');
  console.log('  Wirelist — Translate Remarks RU → UK');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will update DB)'}`);
  console.log('========================================\n');

  const prisma = createPrismaClient();

  try {
    // 1. Fetch all wires with non-empty remarks
    console.log('Fetching remarks from database...\n');

    const wires = await prisma.wire.findMany({
      where: {
        remarks: { not: null },
      },
      select: { id: true, remarks: true },
    });

    const nonEmpty = wires.filter((w) => w.remarks && w.remarks.trim() !== '');
    console.log(`Total wires with remarks: ${nonEmpty.length}`);

    // 2. Filter to Russian-only remarks
    const russianRemarks = nonEmpty.filter((w) => isLikelyRussian(w.remarks!));
    console.log(`Remarks detected as Russian: ${russianRemarks.length}\n`);

    if (russianRemarks.length === 0) {
      console.log('No Russian remarks found. Nothing to translate.');
      return;
    }

    // 3. Preview first 10
    console.log('--- Preview (first 10 Russian remarks) ---');
    for (const wire of russianRemarks.slice(0, 10)) {
      console.log(`  ID ${wire.id}: "${wire.remarks}"`);
    }
    console.log('---\n');

    // 4. Translate in batches
    let translated = 0;
    let skipped = 0;
    let excluded = 0;
    let failed = 0;

    for (let i = 0; i < russianRemarks.length; i += BATCH_SIZE) {
      const batch = russianRemarks.slice(i, i + BATCH_SIZE);

      for (const wire of batch) {
        const original = wire.remarks!;

        try {
          const result = await translateRemark(original);

          // null means "keep as-is" (exclusion or no change)
          if (result === null) {
            console.log(`  EXCL  ID ${wire.id}: "${original}" (kept as-is)`);
            excluded++;
            continue;
          }

          if (result === original) {
            console.log(`  SKIP  ID ${wire.id}: "${original}" (no change)`);
            skipped++;
            continue;
          }

          if (DRY_RUN) {
            console.log(`  [DRY] ID ${wire.id}:`);
            console.log(`         RU: "${original}"`);
            console.log(`         UK: "${result}"`);
          } else {
            await prisma.wire.update({
              where: { id: wire.id },
              data: { remarks: result },
            });
            console.log(`  OK    ID ${wire.id}: "${original}" → "${result}"`);
          }

          translated++;
        } catch (error: any) {
          console.error(`  FAIL  ID ${wire.id}: "${original}" — ${error.message}`);
          failed++;
        }

        await sleep(DELAY_MS);
      }

      const progress = Math.min(i + BATCH_SIZE, russianRemarks.length);
      console.log(`\n  Progress: ${progress}/${russianRemarks.length}\n`);
    }

    // 5. Summary
    console.log('========================================');
    console.log('  Summary');
    console.log('========================================');
    console.log(`  Total Russian remarks: ${russianRemarks.length}`);
    console.log(`  Translated:            ${translated}`);
    console.log(`  Excluded (kept as-is): ${excluded}`);
    console.log(`  Skipped (no change):   ${skipped}`);
    console.log(`  Failed:                ${failed}`);
    if (DRY_RUN) {
      console.log('\n  This was a DRY RUN. No database changes were made.');
      console.log('  Run without --dry-run to apply changes.');
    }
    console.log('========================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
