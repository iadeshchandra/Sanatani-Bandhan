/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — the closing verification report. Pure.    */
/*                                                                     */
/* When a batch commits, the trustee gets proof, not vibes: counts     */
/* against the entrant's page sessions, money against the page totals  */
/* the entrant double-keyed from the register's own footers, three     */
/* random spot-checks to compare against the photos, and the org's    */
/* own accuracy numbers — cells the machine read cleanly vs cells a    */
/* human had to touch. All computed locally from the batch itself;     */
/* nothing leaves the device.                                          */
/* ------------------------------------------------------------------ */

import type { ImportBatch, ImportRow, SpotCheck } from './types';

/** Rows that actually landed at commit (the commit predicate). */
export const committedRows = (batch: ImportBatch): ImportRow[] =>
  batch.rows.filter((r) => r.approved && r.state === 'ok');

/* --------------------------- accuracy ------------------------------- */

export interface PageAccuracy { pageNo: number; total: number; autoGreen: number; touched: number }

export interface AccuracyStats {
  totalCells: number;
  /** Cells the machine read cleanly AND no human ever had to touch. */
  autoGreen: number;
  /** Cells a human confirmed, corrected, or accepted a fix for —
   *  plus every non-green cell (those always needed a look). */
  touched: number;
  perPage: PageAccuracy[];
}

export function accuracyStats(rows: ImportRow[]): AccuracyStats {
  let total = 0;
  let autoGreen = 0;
  const byPage = new Map<number, PageAccuracy>();
  for (const row of rows) {
    if (!row.cells) continue;
    for (const cell of Object.values(row.cells)) {
      total++;
      const clean = cell.cls === 'green' && !cell.confirmed && !cell.touched;
      if (clean) autoGreen++;
      const page = byPage.get(row.pageNo) || { pageNo: row.pageNo, total: 0, autoGreen: 0, touched: 0 };
      page.total++;
      if (clean) page.autoGreen++;
      else page.touched++;
      byPage.set(row.pageNo, page);
    }
  }
  return {
    totalCells: total,
    autoGreen,
    touched: total - autoGreen,
    perPage: [...byPage.values()].sort((a, b) => a.pageNo - b.pageNo),
  };
}

/* --------------------------- spot checks ---------------------------- */

/** Stable string hash (FNV-1a) — the spot-check pick must be the same
 *  every time the report opens, on every device, forever. */
export function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Pick `n` committed rows as spot-checks, deterministically seeded
 *  by the batch id (same three rows at every opening). */
export function pickSpotCheckRows(batch: ImportBatch, n = 3): ImportRow[] {
  const rows = committedRows(batch);
  return [...rows]
    .sort((a, b) => stableHash(`${batch.id}:${a.rowId}`) - stableHash(`${batch.id}:${b.rowId}`))
    .slice(0, n);
}

export function freshSpotChecks(batch: ImportBatch, n = 3): SpotCheck[] {
  return pickSpotCheckRows(batch, n).map((r) => ({ rowId: r.rowId, pageNo: r.pageNo, ok: false }));
}

/* ------------------------------ totals ------------------------------ */

export interface PageCheck { pageNo: number; keyed: number; actual: number; match: boolean }

export interface VerificationData {
  pagesPhotographed: number;
  pagesWithRows: number[];
  rowsRead: number;
  rowsCommitted: number;
  rowsExcluded: number;
  duplicatesSkipped: number;
  /** Donation money control (donors batches; zeros elsewhere). */
  hasMoneyCheck: boolean;
  keyedTotal: number;
  approvedLineTotal: number;
  pageChecks: PageCheck[];
  mismatchedPages: number[];
  totalsMatch: boolean;
  accuracy: AccuracyStats;
}

export function buildVerification(batch: ImportBatch): VerificationData {
  const committed = committedRows(batch);
  const pagesWithRows = [...new Set(batch.rows.map((r) => r.pageNo))].sort((a, b) => a - b);

  const keyed = batch.pageTotals || {};
  const keyedPages = Object.keys(keyed).map(Number);
  const actualByPage = new Map<number, number>();
  for (const row of committed) {
    const amt = typeof row.mapped.donationAmount === 'number' ? row.mapped.donationAmount : 0;
    if (amt > 0) actualByPage.set(row.pageNo, (actualByPage.get(row.pageNo) || 0) + amt);
  }
  const checkPages = [...new Set([...keyedPages, ...actualByPage.keys()])].sort((a, b) => a - b);
  const pageChecks: PageCheck[] = checkPages.map((pageNo) => {
    const k = keyed[pageNo] || 0;
    const a = actualByPage.get(pageNo) || 0;
    return { pageNo, keyed: k, actual: a, match: k === a };
  });
  const mismatchedPages = pageChecks.filter((c) => !c.match).map((c) => c.pageNo);

  return {
    pagesPhotographed: batch.pagePhotoRefs.length,
    pagesWithRows,
    rowsRead: batch.rows.length,
    rowsCommitted: committed.length,
    rowsExcluded: batch.rows.filter((r) => r.state === 'excluded').length,
    duplicatesSkipped: batch.commitSummary?.skippedDuplicates
      ?? batch.rows.filter((r) => r.state === 'duplicate').length,
    hasMoneyCheck: batch.target === 'donors' && (keyedPages.length > 0 || actualByPage.size > 0),
    keyedTotal: keyedPages.reduce((s, p) => s + (keyed[p] || 0), 0),
    approvedLineTotal: [...actualByPage.values()].reduce((s, v) => s + v, 0),
    pageChecks,
    mismatchedPages,
    totalsMatch: mismatchedPages.length === 0,
    accuracy: accuracyStats(committed),
  };
}
