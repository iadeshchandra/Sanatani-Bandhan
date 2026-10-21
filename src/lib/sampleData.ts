/**
 * sampleData.ts — QUEUED #59 (audit A4-4 + the #53 sample-era review):
 * making the SetupWizard's sample-data promise true.
 *
 * The wizard's pre-ticked option promises: "Load sample records so I
 * can explore — Clearly marked as sample — delete them anytime."
 * Until #59 the first half was false (`isDemoSeed` had ZERO render
 * consumers — no SAMPLE badge anywhere) and the second half was
 * impossible (no clear affordance existed). This module is the shared
 * machinery both halves stand on:
 *
 *  1. `isSampleRecord` — the one test every badge and the one-tap
 *     clear use: the record carries the seeder's own tag,
 *     `isDemoSeed === true`. Nothing else is ever treated as sample.
 *  2. `countSampleRecords` — per-collection counts over the seeded
 *     sets (devotees, treasury, gurukulStudents, cows, guests,
 *     campaigns — exactly what DataContext.seedDemoData lays down).
 *  3. Sample-ERA suite rows (the #53 residual). seedPurge law 5 left
 *     the uid()-minted seed collections unpurged because a row's OWN
 *     id cannot distinguish it from a real row. Some of those rows
 *     CAN still be identified with certainty — not by their own id,
 *     but by a dangling reference to a seed entity that no longer
 *     exists:
 *       - goshala milk rows whose `nandiId` is a registered seed
 *         nandi id (n_1…n_8) AND that nandi is not in the live herd;
 *       - goshala fodderUse rows whose `itemId` is a registered seed
 *         fodder-item id (f_1…f_4) AND that item is not in live stock;
 *       - pathshala marks rows whose `parikshaId` is the registered
 *         seed pariksha id (par_1) AND that pariksha no longer exists.
 *     Seed ids can only ever be minted by buildSeed (real creation
 *     sites mint `uid()` ids with a base36-timestamp segment), and in
 *     a demo workspace the referenced entities are alive — so the
 *     "referenced seed entity is GONE" half of the test is what makes
 *     the identification certain rather than heuristic. Where even
 *     this is impossible (pathshala upasthiti / staffUpasthiti /
 *     skillGrades — rows referencing REAL student ids), the rows are
 *     deliberately NOT identified, NOT badged and NOT cleared; the
 *     Settings card says so in plain words (honest copy, no sweep).
 */
import { SUITE_SEED_IDS } from './seedPurge';

/* ------------------------- DataContext records ------------------------- */

/** The one sample test: the seeder's own tag, nothing else. */
export function isSampleRecord(record: unknown): boolean {
  return (
    !!record &&
    typeof record === 'object' &&
    (record as { isDemoSeed?: unknown }).isDemoSeed === true
  );
}

export interface SampleRecordCounts {
  devotees: number;
  treasury: number;
  gurukulStudents: number;
  cows: number;
  guests: number;
  campaigns: number;
  total: number;
}

export const emptySampleRecordCounts = (): SampleRecordCounts => ({
  devotees: 0,
  treasury: 0,
  gurukulStudents: 0,
  cows: 0,
  guests: 0,
  campaigns: 0,
  total: 0,
});

export function countSampleRecords(sets: {
  devotees: readonly unknown[];
  treasury: readonly unknown[];
  gurukulStudents: readonly unknown[];
  cows: readonly unknown[];
  guests: readonly unknown[];
  campaigns: readonly unknown[];
}): SampleRecordCounts {
  const counts: SampleRecordCounts = {
    devotees: sets.devotees.filter(isSampleRecord).length,
    treasury: sets.treasury.filter(isSampleRecord).length,
    gurukulStudents: sets.gurukulStudents.filter(isSampleRecord).length,
    cows: sets.cows.filter(isSampleRecord).length,
    guests: sets.guests.filter(isSampleRecord).length,
    campaigns: sets.campaigns.filter(isSampleRecord).length,
    total: 0,
  };
  counts.total =
    counts.devotees +
    counts.treasury +
    counts.gurukulStudents +
    counts.cows +
    counts.guests +
    counts.campaigns;
  return counts;
}

/* --------------------- sample-era suite rows --------------------- */

const seedIdSet = (suite: string, collection: string): ReadonlySet<string> =>
  new Set(SUITE_SEED_IDS[suite]?.[collection] ?? []);

const idOf = (row: unknown): string | null =>
  row && typeof row === 'object' && typeof (row as { id?: unknown }).id === 'string'
    ? ((row as { id: string }).id as string)
    : null;

const liveIds = (rows: readonly unknown[]): ReadonlySet<string> => {
  const out = new Set<string>();
  for (const row of rows) {
    const id = idOf(row);
    if (id) out.add(id);
  }
  return out;
};

/** Milk row left behind by the seed herd: references a buildSeed nandi
 *  that is no longer in the herd. Certainty argument in the header. */
export function isSampleEraMilkRow(
  row: { nandiId?: unknown },
  liveNandiIds: ReadonlySet<string>,
): boolean {
  return (
    typeof row?.nandiId === 'string' &&
    seedIdSet('goshala', 'nandis').has(row.nandiId) &&
    !liveNandiIds.has(row.nandiId)
  );
}

/** Fodder-use row left behind by the seed stock register. */
export function isSampleEraFodderUseRow(
  row: { itemId?: unknown },
  liveItemIds: ReadonlySet<string>,
): boolean {
  return (
    typeof row?.itemId === 'string' &&
    seedIdSet('goshala', 'fodderItems').has(row.itemId) &&
    !liveItemIds.has(row.itemId)
  );
}

/** Marks row left behind by the seed pariksha (par_1, #53-purged from
 *  the parikshas register on real workspaces; its marks were not). */
export function isSampleEraMarksRow(
  row: { parikshaId?: unknown },
  liveParikshaIds: ReadonlySet<string>,
): boolean {
  return (
    typeof row?.parikshaId === 'string' &&
    seedIdSet('pathshala', 'parikshas').has(row.parikshaId) &&
    !liveParikshaIds.has(row.parikshaId)
  );
}

/** Split a row set into kept / sample-era-removed, preserving order and
 *  object identity for the kept rows. */
export function partitionSampleEra<T>(
  rows: readonly T[],
  isEra: (row: T) => boolean,
): { kept: T[]; removed: T[] } {
  const kept: T[] = [];
  const removed: T[] = [];
  for (const row of rows) (isEra(row) ? removed : kept).push(row);
  return { kept, removed };
}

/* --------------- persisted-blob counting + sweeping --------------- */

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

export interface SuiteSampleEraCounts {
  goshalaMilk: number;
  goshalaFodderUse: number;
  pathshalaMarks: number;
  total: number;
}

export const emptySuiteSampleEraCounts = (): SuiteSampleEraCounts => ({
  goshalaMilk: 0,
  goshalaFodderUse: 0,
  pathshalaMarks: 0,
  total: 0,
});

type Blob = Record<string, unknown>;

function readBlob(storage: StorageLike, key: string): Blob | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Blob;
  } catch {
    return null;
  }
}

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/**
 * Partition one workspace's persisted suite blobs into sample-era
 * removals. Pure over the parsed blobs — the caller decides whether to
 * write the kept rows back (`sweepSuiteSampleEraRows`) or only report
 * (`countSuiteSampleEraRows`).
 */
export function planSuiteSampleEraSweep(
  goshala: Blob | null,
  pathshala: Blob | null,
): {
  counts: SuiteSampleEraCounts;
  goshalaKept: { milk: unknown[]; fodderUse: unknown[] } | null;
  pathshalaKeptMarks: unknown[] | null;
} {
  const counts = emptySuiteSampleEraCounts();
  let goshalaKept: { milk: unknown[]; fodderUse: unknown[] } | null = null;
  let pathshalaKeptMarks: unknown[] | null = null;

  if (goshala) {
    const nandiIds = liveIds(arr(goshala.nandis));
    const itemIds = liveIds(arr(goshala.fodderItems));
    const milk = partitionSampleEra(arr(goshala.milk), (r) =>
      isSampleEraMilkRow(r as { nandiId?: unknown }, nandiIds),
    );
    const fodderUse = partitionSampleEra(arr(goshala.fodderUse), (r) =>
      isSampleEraFodderUseRow(r as { itemId?: unknown }, itemIds),
    );
    counts.goshalaMilk = milk.removed.length;
    counts.goshalaFodderUse = fodderUse.removed.length;
    if (milk.removed.length || fodderUse.removed.length) {
      goshalaKept = { milk: milk.kept, fodderUse: fodderUse.kept };
    }
  }

  if (pathshala) {
    const parikshaIds = liveIds(arr(pathshala.parikshas));
    const marks = partitionSampleEra(arr(pathshala.marks), (r) =>
      isSampleEraMarksRow(r as { parikshaId?: unknown }, parikshaIds),
    );
    counts.pathshalaMarks = marks.removed.length;
    if (marks.removed.length) pathshalaKeptMarks = marks.kept;
  }

  counts.total = counts.goshalaMilk + counts.goshalaFodderUse + counts.pathshalaMarks;
  return { counts, goshalaKept, pathshalaKeptMarks };
}

export function countSuiteSampleEraRows(
  workspaceId: string,
  storage: StorageLike | null = defaultStorage(),
): SuiteSampleEraCounts {
  if (!storage || !workspaceId) return emptySuiteSampleEraCounts();
  const g = readBlob(storage, `sb_goshala_${workspaceId}`);
  const p = readBlob(storage, `sb_pathshala_${workspaceId}`);
  return planSuiteSampleEraSweep(g, p).counts;
}

/**
 * Remove the identifiable sample-era rows from the persisted suite
 * blobs (Settings-surface sweep; the suite desks clear through their
 * own providers when open). Only collections with removals are
 * rewritten; every other key in the blob is carried through untouched.
 * Returns what was removed.
 */
export function sweepSuiteSampleEraRows(
  workspaceId: string,
  storage: StorageLike | null = defaultStorage(),
): SuiteSampleEraCounts {
  if (!storage || !workspaceId) return emptySuiteSampleEraCounts();
  const gKey = `sb_goshala_${workspaceId}`;
  const pKey = `sb_pathshala_${workspaceId}`;
  const g = readBlob(storage, gKey);
  const p = readBlob(storage, pKey);
  const plan = planSuiteSampleEraSweep(g, p);
  try {
    if (g && plan.goshalaKept) {
      storage.setItem(
        gKey,
        JSON.stringify({
          ...g,
          milk: plan.goshalaKept.milk,
          fodderUse: plan.goshalaKept.fodderUse,
        }),
      );
    }
    if (p && plan.pathshalaKeptMarks) {
      storage.setItem(pKey, JSON.stringify({ ...p, marks: plan.pathshalaKeptMarks }));
    }
  } catch {
    /* quota / unavailable — the desks' own clear remains available */
  }
  return plan.counts;
}
