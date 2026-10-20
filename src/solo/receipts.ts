import type { GivingRecord } from './types';

/* receipts.ts — pure logic for the solo "My giving & receipts" view (QUEUED #30).
 * ============================================================================
 * HONESTY CONTRACT: the only giving data a solo user can truthfully call
 * "mine" is their own personal ledger — `SoloPersonalState.giving`, stored
 * per-uid on this device (ExpressDanaSheet + the GivingTab offline form).
 * Organisation-issued 80G certificates live in each org's treasury, keyed by
 * the org's own devotee record — there is NO uid/SAN-id link from a treasury
 * row back to a solo account, so this module NEVER invents a receipt
 * document. A record either carries a receipt number the devotee recorded
 * ('recorded') or it doesn't ('none') — and the view says exactly that.
 */

export type PeriodMode = 'fy' | 'cy';

export interface GivingPeriod {
  /** 'fy-2025' (Indian FY starting Apr 2025) or 'cy-2026'. */
  key: string;
  /** 'FY 2025-26' or '2026'. */
  label: string;
  /** Records in this period, newest first (date desc, createdAt desc tiebreak). */
  records: GivingRecord[];
  /** Truthful sum of the VALID records in this period only. */
  total: number;
  count: number;
  withReceiptNo: number;
  withoutReceiptNo: number;
}

/** A date string is usable only as a real YYYY-MM-DD calendar date. */
export function isValidDateISO(date: unknown): date is string {
  if (typeof date !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * Mine-filter: keep only records that can honestly be the user's own giving.
 * The solo store is per-uid by construction, but imports (importJSON from an
 * export file) and older app versions can leave malformed rows behind —
 * a truthful total must exclude anything that isn't a well-formed personal
 * giving record: finite positive amount, real date, a named organisation.
 */
export function isOwnGivingRecord(g: unknown): g is GivingRecord {
  if (!g || typeof g !== 'object') return false;
  const r = g as Partial<GivingRecord>;
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    typeof r.orgName === 'string' &&
    r.orgName.trim().length > 0 &&
    typeof r.amount === 'number' &&
    Number.isFinite(r.amount) &&
    r.amount > 0 &&
    isValidDateISO(r.date)
  );
}

export function ownGiving(records: readonly GivingRecord[]): GivingRecord[] {
  return records.filter(isOwnGivingRecord);
}

/** Indian financial year (Apr 1 – Mar 31) start year for a YYYY-MM-DD date. */
export function indianFYStartYear(dateISO: string): number {
  const year = Number(dateISO.slice(0, 4));
  const month = Number(dateISO.slice(5, 7)); // 1-12; April = 4
  return month >= 4 ? year : year - 1;
}

export function fyLabel(fyStartYear: number): string {
  return `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
}

export function periodKeyFor(dateISO: string, mode: PeriodMode): string {
  return mode === 'fy' ? `fy-${indianFYStartYear(dateISO)}` : `cy-${Number(dateISO.slice(0, 4))}`;
}

export function periodLabelFor(dateISO: string, mode: PeriodMode): string {
  return mode === 'fy' ? fyLabel(indianFYStartYear(dateISO)) : String(Number(dateISO.slice(0, 4)));
}

/** 'recorded' only when a non-blank receipt number exists — never inferred. */
export function receiptStatus(g: GivingRecord): 'recorded' | 'none' {
  return typeof g.receiptNo === 'string' && g.receiptNo.trim().length > 0 ? 'recorded' : 'none';
}

const byNewest = (a: GivingRecord, b: GivingRecord): number =>
  b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0);

/** Group the user's own giving into periods, newest period first. */
export function groupGivingByPeriod(records: readonly GivingRecord[], mode: PeriodMode): GivingPeriod[] {
  const buckets = new Map<string, { label: string; records: GivingRecord[] }>();
  for (const g of ownGiving(records)) {
    const key = periodKeyFor(g.date, mode);
    const bucket = buckets.get(key) || { label: periodLabelFor(g.date, mode), records: [] };
    bucket.records.push(g);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .map(([key, b]) => {
      const sorted = [...b.records].sort(byNewest);
      return {
        key,
        label: b.label,
        records: sorted,
        total: sorted.reduce((s, g) => s + g.amount, 0),
        count: sorted.length,
        withReceiptNo: sorted.filter((g) => receiptStatus(g) === 'recorded').length,
        withoutReceiptNo: sorted.filter((g) => receiptStatus(g) === 'none').length,
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

/** All of the user's giving in one chronological list, newest first. */
export function chronologicalGiving(records: readonly GivingRecord[]): GivingRecord[] {
  return [...ownGiving(records)].sort(byNewest);
}

/** Truthful total of the user's own giving (invalid rows excluded). */
export function sumOwnGiving(records: readonly GivingRecord[]): number {
  return ownGiving(records).reduce((s, g) => s + g.amount, 0);
}

const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The period (per mode) containing `now` — the Home door's headline total. */
export function currentPeriod(records: readonly GivingRecord[], mode: PeriodMode, now: Date = new Date()): GivingPeriod {
  const today = toISODate(now);
  const key = periodKeyFor(today, mode);
  const found = groupGivingByPeriod(records, mode).find((p) => p.key === key);
  return (
    found || {
      key,
      label: periodLabelFor(today, mode),
      records: [],
      total: 0,
      count: 0,
      withReceiptNo: 0,
      withoutReceiptNo: 0,
    }
  );
}
