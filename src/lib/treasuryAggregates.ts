/**
 * treasuryAggregates.ts — F2 (scale-surge REPORT §6): the ONE canonical
 * definition of the treasury aggregates the desks display, as pure
 * functions over a transaction set — plus the incremental delta
 * operations a maintained summary would need.
 *
 * Why this exists: TreasuryLedgerDesk, TaxReceiptDesk, Form10BD,
 * DonorCareDesk and the trustee home each re-derive totals from the
 * full transaction set (Σ income, Σ expense, 80G-eligible income,
 * per-category / per-month / per-donor sums). §6-F2's end-state is a
 * maintained `workspaceSummaries/{workspaceId}` doc holding exactly
 * these figures, updated on each treasury write. The rules block
 * landed 2026-10-22 (commit 3e813297) and the writer is now built:
 * src/context/data/summaryWriter.ts (maintenance policy) +
 * summaryStore.ts (Firestore adapter), wired into DataContext's
 * treasury commit points.
 *
 * What IS built and proven here:
 *   - `computeTreasuryAggregates(txs)` — the full-set computation,
 *     semantics pinned to the desks' own code (amounts coerced with
 *     Number(x || 0); income/expense split on `type`; 80G = Income &&
 *     is80GEligible, exactly as TaxReceiptDesk computes it).
 *   - `applyTxCreate / applyTxUpdate / applyTxDelete` — delta folds.
 *     The test suite proves, on fixtures including updates that change
 *     amount/type/category/devotee/80G-flag and Bahi-Khata reversal
 *     rows, that folding deltas yields EXACTLY the full-set result —
 *     so when the rules land, summary maintenance is a drop-in.
 *   - `WorkspaceSummaryDoc` — the summary document shape, ready for
 *     the rules-approved writer.
 *
 * Reversals: Bahi-Khata undo writes a compensating row (opposite type,
 * same amount). Rows are uniform — a reversal is just a row — so the
 * deltas need no special case, and the fixtures prove it.
 */

export interface AggregatableTx {
  type?: string;
  amount?: number | string | null;
  category?: string | null;
  /** ISO 'YYYY-MM-DD' (or any string whose first 7 chars are 'YYYY-MM'). */
  date?: string | null;
  devoteeId?: string | null;
  devoteeName?: string | null;
  is80GEligible?: boolean | null;
}

export interface CategoryTotals {
  income: number;
  expense: number;
}

export interface TreasuryAggregates {
  /** All rows in the set. */
  count: number;
  totalIncome: number;
  totalExpense: number;
  /** totalIncome − totalExpense. */
  netBalance: number;
  /** Σ amount over Income rows with is80GEligible (TaxReceiptDesk semantics). */
  eligible80GIncome: number;
  /** Count of Income rows with is80GEligible. */
  eligible80GCount: number;
  /** Per-category income/expense; missing category buckets under ''. */
  byCategory: Record<string, CategoryTotals>;
  /** Per-month ('YYYY-MM' from `date`) income/expense; undated rows skip. */
  byMonth: Record<string, CategoryTotals>;
  /** Per-donor lifetime INCOME sum, keyed by devoteeId, falling back to
   *  devoteeName when a row carries no id (DonorCareDesk semantics are
   *  income-side only). */
  byDevoteeIncome: Record<string, number>;
}

export function emptyAggregates(): TreasuryAggregates {
  return {
    count: 0,
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    eligible80GIncome: 0,
    eligible80GCount: 0,
    byCategory: {},
    byMonth: {},
    byDevoteeIncome: {},
  };
}

/** Desk-identical amount coercion: Number(tx.amount || 0), NaN-safe. */
function amt(tx: AggregatableTx): number {
  const n = Number(tx.amount || 0);
  return Number.isFinite(n) ? n : 0;
}

function monthKey(tx: AggregatableTx): string | null {
  const d = typeof tx.date === 'string' ? tx.date : '';
  return d.length >= 7 ? d.slice(0, 7) : null;
}

function donorKey(tx: AggregatableTx): string | null {
  const key = tx.devoteeId || tx.devoteeName || '';
  return key ? String(key) : null;
}

/** Fold one row into the aggregates with sign +1 (add) or −1 (remove). */
function fold(agg: TreasuryAggregates, tx: AggregatableTx, sign: 1 | -1): void {
  const amount = amt(tx);
  agg.count += sign;
  const cat = String(tx.category || '');
  const catTotals = (agg.byCategory[cat] ||= { income: 0, expense: 0 });
  const mk = monthKey(tx);
  const monthTotals = mk ? (agg.byMonth[mk] ||= { income: 0, expense: 0 }) : null;

  if (tx.type === 'Income') {
    agg.totalIncome += sign * amount;
    catTotals.income += sign * amount;
    if (monthTotals) monthTotals.income += sign * amount;
    if (tx.is80GEligible) {
      agg.eligible80GIncome += sign * amount;
      agg.eligible80GCount += sign;
    }
    const dk = donorKey(tx);
    if (dk) agg.byDevoteeIncome[dk] = (agg.byDevoteeIncome[dk] || 0) + sign * amount;
  } else if (tx.type === 'Expense') {
    agg.totalExpense += sign * amount;
    catTotals.expense += sign * amount;
    if (monthTotals) monthTotals.expense += sign * amount;
  }
  agg.netBalance = agg.totalIncome - agg.totalExpense;

  // Prune emptied buckets so a folded aggregate deep-equals a fresh
  // full-set computation (the equality tests rely on this).
  if (catTotals.income === 0 && catTotals.expense === 0) delete agg.byCategory[cat];
  if (monthTotals && monthTotals.income === 0 && monthTotals.expense === 0 && mk) {
    delete agg.byMonth[mk];
  }
  if (tx.type === 'Income') {
    const dk = donorKey(tx);
    if (dk && agg.byDevoteeIncome[dk] === 0) delete agg.byDevoteeIncome[dk];
  }
}

/** The canonical full-set computation — what every desk displays today. */
export function computeTreasuryAggregates(
  txs: readonly AggregatableTx[]
): TreasuryAggregates {
  const agg = emptyAggregates();
  for (const tx of txs) fold(agg, tx, 1);
  return agg;
}

/** Delta: a new row was created. Returns a NEW aggregates object. */
export function applyTxCreate(agg: TreasuryAggregates, tx: AggregatableTx): TreasuryAggregates {
  const next = structuredClone(agg);
  fold(next, tx, 1);
  return next;
}

/** Delta: a row was deleted. Returns a NEW aggregates object. */
export function applyTxDelete(agg: TreasuryAggregates, tx: AggregatableTx): TreasuryAggregates {
  const next = structuredClone(agg);
  fold(next, tx, -1);
  return next;
}

/**
 * Delta: a row was edited (amount, type, category, date, devotee or
 * 80G flag may all have changed). Exactly remove-old + add-new.
 */
export function applyTxUpdate(
  agg: TreasuryAggregates,
  oldTx: AggregatableTx,
  newTx: AggregatableTx
): TreasuryAggregates {
  const removed = applyTxDelete(agg, oldTx);
  return applyTxCreate(removed, newTx);
}

/**
 * The `workspaceSummaries/{workspaceId}` document (F2 end-state).
 * Written by src/context/data/summaryWriter.ts since the rules block
 * landed (2026-10-22, 3e813297: R_FINANCE read/write, delete never).
 * Its treasury section is produced by `buildSummaryDoc` (full-set
 * computation) or by the equality-proven delta folds above.
 */
export interface WorkspaceSummaryDoc {
  workspaceId: string;
  version: 1;
  /** Epoch ms of the last maintained write (or one-time backfill). */
  updatedAtMs: number;
  /** True when produced by the one-time full-read backfill at first
   *  open of a pre-existing large workspace; false once incrementally
   *  maintained. Never fabricated: a summary exists only after a real
   *  full computation or a chain of proven deltas from one. */
  backfilled: boolean;
  counts: {
    devotees: number | null;
    puja_bookings: number | null;
    treasury: number | null;
    inventory_items: number | null;
  };
  treasury: TreasuryAggregates;
}

export function buildSummaryDoc(
  workspaceId: string,
  counts: WorkspaceSummaryDoc['counts'],
  txs: readonly AggregatableTx[],
  updatedAtMs: number,
  backfilled: boolean
): WorkspaceSummaryDoc {
  return {
    workspaceId,
    version: 1,
    updatedAtMs,
    backfilled,
    counts: { ...counts, treasury: txs.length },
    treasury: computeTreasuryAggregates(txs),
  };
}
