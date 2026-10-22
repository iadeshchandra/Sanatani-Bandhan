/**
 * publishedAccounts.ts — Blueprint A, deliverable 3: published
 * monthly accounts for the public Transparency Board (pure logic).
 * ============================================================================
 * The research law (§2c): transparency is PUBLISHED on a rhythm —
 * a trustee deliberately publishes a month's accounts after
 * reconciliation; devotees never see a live raw ledger (half-entered
 * data, donor PII). Nothing is public until published, and every
 * figure in a snapshot is COMPUTED from the ledger — never typed in
 * by hand.
 *
 * The snapshot is a pure function of the month's treasury rows via
 * the canonical computeTreasuryAggregates (the same computation the
 * desks and workspaceSummaries use — the publish test proves the
 * snapshot EQUALS the aggregates over the same set). Privacy shape:
 * totals + per-category breakdown + a donor COUNT and a record
 * COUNT. No donor names, no individual amounts, no actor names —
 * the public board physically cannot render what the doc does not
 * carry.
 */

import {
  computeTreasuryAggregates,
  type AggregatableTx,
  type CategoryTotals,
} from './treasuryAggregates';

/** The `publishedAccounts/{workspaceId}_{month}` document. */
export interface PublishedAccountsDoc {
  /** `${workspaceId}_${month}` — one snapshot per workspace+month. */
  id: string;
  workspaceId: string;
  /** 'YYYY-MM'. */
  month: string;
  totalIncome: number;
  totalExpense: number;
  /** totalIncome − totalExpense for the month. */
  netBalance: number;
  /** Per-category income/expense for the month (canonical lib shape). */
  byCategory: Record<string, CategoryTotals>;
  /** Number of ledger records in the month. */
  txCount: number;
  /** DISTINCT donors who gave in the month — a count, never names. */
  donorCount: number;
  /** The workspace's operating currency code at publish time
   *  (resolveWorkspaceCurrency) — the figures were computed in this
   *  currency, and the public board renders in it regardless of who
   *  is viewing. */
  currencyCode: string;
  /** Uid of the publishing finance-role member. */
  publishedBy: string;
  /** Publisher's resolved name (resolveActorName at publish time). */
  publishedByName: string;
  /** Epoch ms of (re)publication. */
  publishedAt: number;
  /** Optional trustee note shown on the board ("Published after the
   *  monthly reconciliation…"). Free text, may be empty. */
  note?: string;
}

export function publishedAccountsDocId(workspaceId: string, month: string): string {
  return `${workspaceId}_${month}`;
}

/** 'YYYY-MM' bucket of a treasury row's ISO date; null when undated. */
export function monthKeyOf(date: string | null | undefined): string | null {
  const d = typeof date === 'string' ? date : '';
  return d.length >= 7 ? d.slice(0, 7) : null;
}

/** The rows of one month from a full ledger set (exact, not a page). */
export function rowsForMonth<T extends AggregatableTx>(
  txs: readonly T[],
  month: string
): T[] {
  return txs.filter((tx) => monthKeyOf(tx.date) === month);
}

/** Distinct months present in a ledger set, newest first. */
export function monthsPresent(txs: readonly AggregatableTx[]): string[] {
  const set = new Set<string>();
  for (const tx of txs) {
    const m = monthKeyOf(tx.date);
    if (m) set.add(m);
  }
  return [...set].sort().reverse();
}

/** Distinct donor keys (id-or-name, the lib's donor keying). */
export function donorCountFor(txs: readonly AggregatableTx[]): number {
  const keys = new Set<string>();
  for (const tx of txs) {
    // Blueprint D: a practice "donor" is not a donor — the public
    // board's donor count must never include practice rows (the
    // totals already exclude them via computeTreasuryAggregates).
    if (tx.isPractice === true) continue;
    if (tx.type !== 'Income') continue;
    const key = tx.devoteeId || tx.devoteeName || '';
    if (key) keys.add(String(key));
  }
  return keys.size;
}

/**
 * Build the snapshot for one month from that month's EXACT rows.
 * The caller (publish flow) supplies the full-set rows for the month
 * — a one-time full read when the workspace is windowed, the same
 * honesty discipline as the summary backfill. Totals and categories
 * are computeTreasuryAggregates over exactly these rows.
 */
export function buildPublishedSnapshot(args: {
  workspaceId: string;
  month: string;
  monthRows: readonly AggregatableTx[];
  currencyCode: string;
  publishedBy: string;
  publishedByName: string;
  note?: string;
  now: number;
}): PublishedAccountsDoc {
  const agg = computeTreasuryAggregates(args.monthRows);
  return {
    id: publishedAccountsDocId(args.workspaceId, args.month),
    workspaceId: args.workspaceId,
    month: args.month,
    totalIncome: agg.totalIncome,
    totalExpense: agg.totalExpense,
    netBalance: agg.netBalance,
    byCategory: agg.byCategory,
    txCount: agg.count,
    donorCount: donorCountFor(args.monthRows),
    currencyCode: args.currencyCode,
    publishedBy: args.publishedBy,
    publishedByName: args.publishedByName,
    publishedAt: args.now,
    ...(args.note?.trim() ? { note: args.note.trim() } : {}),
  };
}
