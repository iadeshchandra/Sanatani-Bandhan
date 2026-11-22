/**
 * festivalSponsors.ts — EVENTS E6: sponsors & stalls register +
 * seva departments (pure logic).
 * =====================================================================
 * The register lives on the Utsav Festival record inside the
 * existing `utsav_stores` doc — no new collection, no rules change
 * (the doc's staff whole-write carries the new optional fields).
 * This module is the register's arithmetic, kept pure and tested:
 *
 *  - Money rollups count ONLY what is money. A 'kind' sponsor (who
 *    gives goods) or a 'seva' sponsor (who gives their labour)
 *    carries no pledged/received figure into any total — honouring
 *    them must never invent a rupee amount.
 *  - The budget stays the single source of truth for planned /
 *    actual: the register shows its pledged / received NEXT TO the
 *    matching budget head ('Sponsorships' / 'Stall fees') as a
 *    read-only reconciliation hint. It never writes a budget line;
 *    the treasury posting is what moves actuals.
 *  - Public gratitude is consent-shaped: `publicAckNames` is the
 *    ONLY list that may ever leave the record — sponsors whose
 *    publicAck is exactly true, names only (this shape cannot
 *    carry an amount or a contact), in register order. Stall
 *    holders are never part of it.
 *  - Department coverage is target vs the committee's own
 *    volunteer list — a gap is a planning fact, stated plainly.
 */
import type {
  BudgetLine, FestivalSponsor, FestivalStall, SevaDepartment,
} from '../utsav/types';
import { DEPARTMENT_PRESETS } from '../utsav/types';

/* ------------------------------------------------------------------ */
/* 1. Money rollups                                                    */
/* ------------------------------------------------------------------ */

export interface RegisterTotals {
  /** Rows that carry money at all (cash sponsors / all stalls). */
  moneyRows: number;
  pledged: number;
  received: number;
  /** pledged − received, never below 0. */
  pending: number;
  /** Rows whose money reached the treasury (linkedTxId stamped). */
  postedRows: number;
}

const rollup = (
  rows: ReadonlyArray<{ pledged: number; received: number; linkedTxId?: string }>
): RegisterTotals => {
  const pledged = rows.reduce((s, r) => s + Math.max(0, r.pledged || 0), 0);
  const received = rows.reduce((s, r) => s + Math.max(0, r.received || 0), 0);
  return {
    moneyRows: rows.length,
    pledged,
    received,
    pending: Math.max(0, pledged - received),
    postedRows: rows.filter((r) => !!r.linkedTxId).length,
  };
};

/** Cash sponsors only — 'kind' and 'seva' sponsors never enter a
 *  money total (their pledged/received fields are meaningless). */
export function sponsorTotals(
  sponsors: readonly FestivalSponsor[] | undefined
): RegisterTotals {
  const cash = (sponsors ?? [])
    .filter((s) => s.kind === 'cash')
    .map((s) => ({ pledged: s.pledged, received: s.received, linkedTxId: s.linkedTxId }));
  return rollup(cash);
}

/** Stall fees: fee is the pledged side, received the collected. */
export function stallTotals(
  stalls: readonly FestivalStall[] | undefined
): RegisterTotals {
  const rows = (stalls ?? []).map((s) => ({
    pledged: s.fee, received: s.received, linkedTxId: s.linkedTxId,
  }));
  return rollup(rows);
}

/** What "mark received" would post for one row: the outstanding
 *  amount, never negative, 0 when fully received. */
export function outstandingOf(pledged: number, received: number): number {
  return Math.max(0, (pledged || 0) - (received || 0));
}

/* ------------------------------------------------------------------ */
/* 2. The budget-head reconciliation hint (read-only)                  */
/* ------------------------------------------------------------------ */

export interface BudgetHeadTotals {
  planned: number;
  actual: number;
}

/** Sum of the festival's INCOME budget lines under one head —
 *  'Sponsorships' or 'Stall fees' (INCOME_HEADS). The register
 *  reads this to sit beside the head; it writes nothing here. */
export function budgetHeadTotals(
  lines: readonly BudgetLine[] | undefined,
  festivalId: string,
  head: string
): BudgetHeadTotals {
  const t: BudgetHeadTotals = { planned: 0, actual: 0 };
  for (const l of lines ?? []) {
    if (l.festivalId !== festivalId || l.kind !== 'income' || l.head !== head) continue;
    t.planned += l.planned || 0;
    t.actual += l.actual || 0;
  }
  return t;
}

/* ------------------------------------------------------------------ */
/* 3. Public gratitude — consent-shaped, names only                    */
/* ------------------------------------------------------------------ */

/**
 * The ONLY sponsor data that may ever reach the public festival
 * page: the names of sponsors who explicitly consented
 * (publicAck === true), trimmed, non-empty, in register order.
 * A sponsor without consent NEVER appears — the filter is the
 * whole law, and the returned shape (a list of name strings)
 * cannot carry an amount, a contact or a note.
 */
export function publicAckNames(
  sponsors: readonly FestivalSponsor[] | undefined
): string[] {
  return (sponsors ?? [])
    .filter((s) => s.publicAck === true)
    .map((s) => (s.name || '').trim())
    .filter((n) => n.length > 0);
}

/* ------------------------------------------------------------------ */
/* 4. Seva departments                                                 */
/* ------------------------------------------------------------------ */

/** The preset board a festival starts from (fresh ids from the
 *  caller's factory — the store's uid in the app, a counter in
 *  tests). Empty volunteer lists: people offer themselves anew. */
export function seedDepartments(newId: (name: string) => string): SevaDepartment[] {
  return DEPARTMENT_PRESETS.map((p) => ({
    id: newId(p.name),
    name: p.name,
    targetVolunteers: p.targetVolunteers,
    volunteerNames: [],
  }));
}

export interface DepartmentCoverageRow {
  id: string;
  name: string;
  leadName?: string;
  target: number;
  assigned: number;
  /** target − assigned, never below 0. */
  gap: number;
  covered: boolean;
}

export interface DepartmentCoverage {
  rows: DepartmentCoverageRow[];
  totalTarget: number;
  totalAssigned: number;
  totalGap: number;
  /** Departments still short of their target. */
  openDepartments: number;
}

/** Target vs assigned (the committee's volunteerNames list) per
 *  department, plus the board's totals. A name listed twice is
 *  still one sevadar — duplicates never inflate the count. */
export function departmentCoverage(
  departments: readonly SevaDepartment[] | undefined
): DepartmentCoverage {
  const rows: DepartmentCoverageRow[] = (departments ?? []).map((d) => {
    const names = new Set(
      (d.volunteerNames ?? []).map((n) => n.trim()).filter((n) => n.length > 0)
    );
    const target = Math.max(0, d.targetVolunteers || 0);
    const assigned = names.size;
    return {
      id: d.id,
      name: d.name,
      ...(d.leadName ? { leadName: d.leadName } : {}),
      target,
      assigned,
      gap: Math.max(0, target - assigned),
      covered: assigned >= target,
    };
  });
  return {
    rows,
    totalTarget: rows.reduce((s, r) => s + r.target, 0),
    totalAssigned: rows.reduce((s, r) => s + r.assigned, 0),
    totalGap: rows.reduce((s, r) => s + r.gap, 0),
    openDepartments: rows.filter((r) => !r.covered).length,
  };
}
