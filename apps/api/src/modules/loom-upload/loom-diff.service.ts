import { Injectable } from '@nestjs/common';
import { Wire } from '@prisma/client';
import {
  CreateChangeRecordDto,
  ChangeRecordType,
  FieldChange,
} from '../change-requests/dto/create-change-record.dto';
import type { LoomImportWireRow } from './dto/loom-import-output.dto';
import { randomUUID } from 'crypto';

export type LoomPreviewAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface LoomPreviewItem {
  id: string;
  action: LoomPreviewAction;
  routeKey: string;
  /** DB wire id(s) involved — string for JSON */
  wireId?: string;
  /** Human-readable route */
  fromDestination: string;
  toDestination: string;
  /** Full change record ready for submit */
  record: CreateChangeRecordDto;
  warnings: string[];
}

export interface LoomDiffResult {
  loomSessionId: string;
  summary: { added: number; edited: number; deleted: number };
  items: LoomPreviewItem[];
  collisionWarnings: string[];
}

function routeKey(from: string | undefined, to: string | undefined): string {
  return `${(from ?? '').trim()}|${(to ?? '').trim()}`;
}

function parseOptInt(v: string | undefined): number | undefined {
  if (v === undefined || v === null || String(v).trim() === '') return undefined;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : undefined;
}

function wireIdString(id: bigint): string {
  return id.toString();
}

function wireIdNumber(id: bigint): number {
  const n = Number(id);
  return n;
}

/** Interpret the document's Del/Add column. Lenient: trims, case-insensitive, prefix match. */
function normalizeAction(v: string | undefined): 'ADD' | 'DEL' | 'UNKNOWN' {
  const s = (v ?? '').trim().toLowerCase();
  if (s.startsWith('add')) return 'ADD';
  if (s.startsWith('del')) return 'DEL';
  return 'UNKNOWN';
}

/** Map Loom extracted row to wire field object for CREATE/UPDATE proposed state */
export function loomRowToProposedFields(row: LoomImportWireRow): Omit<
  CreateChangeRecordDto,
  'recordType' | 'wireId' | 'changes'
> {
  return {
    fromDestination: row.fromDestination?.trim() ?? '',
    toDestination: row.toDestination?.trim() ?? '',
    wireCodeId: parseOptInt(row.wireCodeId as string),
    colorId: parseOptInt(row.colorId as string),
    ioTypeId: row.ioTypeId?.trim() || undefined,
    sub: parseOptInt(row.sub as string),
    word: parseOptInt(row.word as string),
    bits: parseOptInt(row.bits as string),
    power: row.power?.trim() || undefined,
    origin: row.origin?.trim() || undefined,
    wireNumber: row.wireNumber?.trim() || undefined,
    hwModelsId: parseOptInt(row.hwModelsId as string),
    remarks: row.remarks?.trim() || undefined,
    noteCode: row.noteCode?.trim() || undefined,
    changeNumber: row.changeNumber?.trim() || undefined,
    changeDate: row.changeDate?.trim() || undefined,
    hwAddress: row.hwAddress?.trim() || undefined,
    coord: row.coord?.trim() || undefined,
    decommissioned: row.decommissioned?.trim() || undefined,
    ped: row.ped?.trim() || undefined,
    network: row.network?.trim() || undefined,
  };
}

function wireToFields(w: Wire): Omit<CreateChangeRecordDto, 'recordType' | 'wireId' | 'changes'> {
  return {
    fromDestination: w.fromDestination,
    toDestination: w.toDestination,
    wireCodeId: w.wireCodeId ?? undefined,
    colorId: w.colorId ?? undefined,
    ioTypeId: w.ioTypeId ?? undefined,
    sub: w.sub ?? undefined,
    word: w.word ?? undefined,
    bits: w.bits ?? undefined,
    power: w.power ?? undefined,
    origin: w.origin ?? undefined,
    wireNumber: w.wireNumber ?? undefined,
    hwModelsId: w.hwModelsId ?? undefined,
    remarks: w.remarks ?? undefined,
    noteCode: w.noteCode ?? undefined,
    changeNumber: w.changeNumber ?? undefined,
    changeDate: w.changeDate ? w.changeDate.toISOString().slice(0, 10) : undefined,
    hwAddress: w.hwAddress ?? undefined,
    coord: w.coord ?? undefined,
    decommissioned: w.decommissioned ?? undefined,
    ped: w.ped ?? undefined,
    network: w.network ?? undefined,
  };
}

const COMPARABLE_FIELDS: (keyof ReturnType<typeof wireToFields>)[] = [
  'fromDestination',
  'toDestination',
  'wireCodeId',
  'colorId',
  'ioTypeId',
  'sub',
  'word',
  'bits',
  'power',
  'origin',
  'wireNumber',
  'hwModelsId',
  'remarks',
  'noteCode',
  'changeNumber',
  'changeDate',
  'hwAddress',
  'coord',
  'decommissioned',
  'ped',
  'network',
];

function normalizeVal(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

function computeChanges(
  oldF: ReturnType<typeof wireToFields>,
  newF: ReturnType<typeof loomRowToProposedFields>,
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const key of COMPARABLE_FIELDS) {
    const ov = normalizeVal(oldF[key]);
    const nv = normalizeVal(newF[key]);
    if (ov !== nv) {
      changes[key] = {
        oldValue: oldF[key] ?? null,
        newValue: newF[key] ?? null,
      };
    }
  }
  return changes;
}

function deleteRecordFromWire(w: Wire): CreateChangeRecordDto {
  const fields = wireToFields(w);
  return {
    recordType: ChangeRecordType.DELETE,
    wireId: wireIdNumber(w.id),
    ...fields,
  };
}

@Injectable()
export class LoomDiffService {
  computeDiff(
    loomSessionId: string,
    dbWires: Wire[],
    loomRows: LoomImportWireRow[],
    options: { skipDeletes: boolean; fullDbDeleteSync?: boolean; actionDriven?: boolean },
  ): LoomDiffResult {
    if (options.actionDriven) {
      return this.computeActionDriven(loomSessionId, dbWires, loomRows);
    }

    const collisionWarnings: string[] = [];

    /** `fromDestination` values that appear in the import — used to limit DELETE to this upload's scope */
    const fromDestinationsInFile = new Set<string>();
    for (const row of loomRows) {
      const from = loomRowToProposedFields(row).fromDestination?.trim();
      if (from) fromDestinationsInFile.add(from);
    }

    // Index DB by route key -> wires (sorted by id)
    const dbByKey = new Map<string, Wire[]>();
    for (const w of dbWires) {
      const k = routeKey(w.fromDestination, w.toDestination);
      if (!dbByKey.has(k)) dbByKey.set(k, []);
      dbByKey.get(k)!.push(w);
    }
    for (const [, arr] of dbByKey) {
      arr.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }

    // Collapse Loom rows per key (last wins); detect duplicates
    const loomByKey = new Map<string, LoomImportWireRow>();
    for (const row of loomRows) {
      const proposed = loomRowToProposedFields(row);
      const k = routeKey(proposed.fromDestination, proposed.toDestination);
      if (!k || k === '|') {
        collisionWarnings.push('Skipped Loom row with empty from/to');
        continue;
      }
      if (loomByKey.has(k)) {
        collisionWarnings.push(
          `Duplicate route in Loom file for ${k} — using the last occurrence`,
        );
      }
      loomByKey.set(k, row);
    }

    const dbKeys = new Set(dbByKey.keys());
    const loomKeys = new Set(loomByKey.keys());

    const items: LoomPreviewItem[] = [];

    // DELETED: DB route missing from Loom for the same logical import scope
    // - Default: only delete if this wire's fromDestination appears somewhere in the file
    //   (partial documents no longer wipe unrelated DB rows).
    // - fullDbDeleteSync: legacy behavior — any DB route not in Loom is deleted.
    if (!options.skipDeletes) {
      const fullSync = options.fullDbDeleteSync === true;
      if (!fullSync && fromDestinationsInFile.size === 0 && loomRows.length > 0) {
        collisionWarnings.push(
          'No from-destination values could be read from the file; DELETE proposals are skipped. Use "full DB delete sync" if you need global deletes.',
        );
      }
      for (const k of dbKeys) {
        if (loomKeys.has(k)) continue;
        const wires = dbByKey.get(k)!;
        for (const w of wires) {
          const fromDb = w.fromDestination.trim();
          if (!fullSync && !fromDestinationsInFile.has(fromDb)) {
            continue;
          }
          const warnings: string[] = [];
          if (wires.length > 1) {
            warnings.push(
              `Multiple DB wires share this route (${wires.length}); each is listed separately`,
            );
          }
          items.push({
            id: randomUUID(),
            action: 'DELETE',
            routeKey: k,
            wireId: wireIdString(w.id),
            fromDestination: w.fromDestination,
            toDestination: w.toDestination,
            record: deleteRecordFromWire(w),
            warnings,
          });
        }
      }
    }

    // ADDED + UPDATED
    for (const k of loomKeys) {
      const row = loomByKey.get(k)!;
      const proposed = loomRowToProposedFields(row);
      const dbList = dbByKey.get(k) ?? [];

      if (dbList.length === 0) {
        const rec: CreateChangeRecordDto = {
          recordType: ChangeRecordType.CREATE,
          ...proposed,
        };
        items.push({
          id: randomUUID(),
          action: 'CREATE',
          routeKey: k,
          fromDestination: proposed.fromDestination,
          toDestination: proposed.toDestination,
          record: rec,
          warnings: [],
        });
      } else {
        const w = dbList[0];
        const oldF = wireToFields(w);
        const changes = computeChanges(oldF, proposed);
        const warnings: string[] = [];
        if (dbList.length > 1) {
          warnings.push(
            `Multiple DB wires (${dbList.length}) share this route — updating wire id ${wireIdString(w.id)} only`,
          );
        }
        if (Object.keys(changes).length === 0) {
          // no-op for this key
          continue;
        }
        const rec: CreateChangeRecordDto = {
          recordType: ChangeRecordType.UPDATE,
          wireId: wireIdNumber(w.id),
          ...proposed,
          changes,
        };
        items.push({
          id: randomUUID(),
          action: 'UPDATE',
          routeKey: k,
          wireId: wireIdString(w.id),
          fromDestination: proposed.fromDestination,
          toDestination: proposed.toDestination,
          record: rec,
          warnings,
        });
      }
    }

    const summary = {
      added: items.filter((i) => i.action === 'CREATE').length,
      edited: items.filter((i) => i.action === 'UPDATE').length,
      deleted: items.filter((i) => i.action === 'DELETE').length,
    };

    return {
      loomSessionId,
      summary,
      items,
      collisionWarnings,
    };
  }

  /**
   * Action-driven diff: the change record type is taken from the document's
   * Del/Add column, not from comparing routes against the DB. A change request
   * is treated as a declared intention (like a PR), so:
   *   - Add -> CREATE (wireId null). If the route already exists in the DB, a
   *     non-blocking collision warning is attached; the CREATE is still emitted.
   *   - Del -> DELETE, resolving wireId from the DB by route key. 0 matches ->
   *     the row is reported in collisionWarnings and NOT emitted (a DELETE with
   *     no wireId would fail change-request validation). >1 matches -> one
   *     DELETE per matching wire, each warned as ambiguous.
   *   - unknown/blank action -> reported in collisionWarnings and skipped.
   * Absence of a wire from the file never produces a DELETE here.
   */
  private computeActionDriven(
    loomSessionId: string,
    dbWires: Wire[],
    loomRows: LoomImportWireRow[],
  ): LoomDiffResult {
    const collisionWarnings: string[] = [];

    const dbByKey = new Map<string, Wire[]>();
    for (const w of dbWires) {
      const k = routeKey(w.fromDestination, w.toDestination);
      if (!dbByKey.has(k)) dbByKey.set(k, []);
      dbByKey.get(k)!.push(w);
    }
    for (const [, arr] of dbByKey) {
      arr.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }

    const items: LoomPreviewItem[] = [];

    for (const row of loomRows) {
      const proposed = loomRowToProposedFields(row);
      const k = routeKey(proposed.fromDestination, proposed.toDestination);
      if (!k || k === '|') {
        collisionWarnings.push('Skipped row with empty from/to');
        continue;
      }
      const action = normalizeAction(row.action);
      const dbList = dbByKey.get(k) ?? [];

      if (action === 'ADD') {
        const warnings: string[] = [];
        if (dbList.length > 0) {
          const extra = dbList.length > 1 ? ` +${dbList.length - 1} more` : '';
          warnings.push(
            `Route already exists in DB (wire id ${wireIdString(dbList[0].id)}${extra}) — importing as CREATE per document intent`,
          );
        }
        const rec: CreateChangeRecordDto = {
          recordType: ChangeRecordType.CREATE,
          ...proposed,
        };
        items.push({
          id: randomUUID(),
          action: 'CREATE',
          routeKey: k,
          fromDestination: proposed.fromDestination,
          toDestination: proposed.toDestination,
          record: rec,
          warnings,
        });
      } else if (action === 'DEL') {
        if (dbList.length === 0) {
          collisionWarnings.push(
            `DELETE for ${k} cannot be resolved — no matching wire in DB; skipped`,
          );
          continue;
        }
        if (dbList.length > 1) {
          collisionWarnings.push(
            `DELETE for ${k} is ambiguous — ${dbList.length} DB wires share this route; each listed separately`,
          );
        }
        for (const w of dbList) {
          const warnings: string[] = [];
          if (dbList.length > 1) {
            warnings.push(
              `Ambiguous DELETE — ${dbList.length} DB wires share this route`,
            );
          }
          items.push({
            id: randomUUID(),
            action: 'DELETE',
            routeKey: k,
            wireId: wireIdString(w.id),
            fromDestination: w.fromDestination,
            toDestination: w.toDestination,
            record: deleteRecordFromWire(w),
            warnings,
          });
        }
      } else {
        collisionWarnings.push(
          `Row for ${k} has unrecognized action "${(row.action ?? '').trim()}" — skipped`,
        );
        continue;
      }
    }

    const summary = {
      added: items.filter((i) => i.action === 'CREATE').length,
      edited: items.filter((i) => i.action === 'UPDATE').length,
      deleted: items.filter((i) => i.action === 'DELETE').length,
    };

    return { loomSessionId, summary, items, collisionWarnings };
  }
}
