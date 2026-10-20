/**
 * windowing.ts — F2 (scale-surge REPORT §6): size-aware sync decisions
 * for the four core DataContext collections.
 *
 * The problem (measured, scale-surge audit §4): DataContext opened
 * UNBOUNDED onSnapshot listeners on devotees / puja_bookings / treasury /
 * inventory_items. One staff boot at a 40k-devotee temple costs ~140k
 * reads — ~3× the whole project's daily Spark read quota — and holds
 * every document in phone memory.
 *
 * The fix is NOT a blind limit(): desks compute money totals, receipt
 * sequences and donor sums from the full set, so a silent cap corrupts
 * accounting. Instead:
 *
 *   1. At workspace open, each core collection is measured with
 *      getCountFromServer (one aggregate read, index-safe).
 *   2. At or below FULL_SYNC_THRESHOLD the collection keeps today's
 *      full sync — byte-for-byte the same query, zero behaviour change
 *      for the overwhelming majority of workspaces.
 *   3. Above the threshold the listener is windowed (orderBy + limit,
 *      "load more" grows the limit) and the context exposes honest
 *      metadata (`CollectionWindowState`) so desks can label partial
 *      figures instead of presenting window sums as ledger totals.
 *   4. A failed probe (permission denied, offline, missing index…)
 *      yields `null` → mode 'full' — fail-open to today's behaviour,
 *      never a blocked desk.
 *
 * This module is pure: every decision is unit-tested without Firestore.
 */

/** The four collections DataContext live-syncs per workspace. */
export type CoreCollectionKey =
  | 'devotees'
  | 'puja_bookings'
  | 'treasury'
  | 'inventory_items';

export const CORE_COLLECTIONS: readonly CoreCollectionKey[] = [
  'devotees',
  'puja_bookings',
  'treasury',
  'inventory_items',
] as const;

/**
 * Full-sync ceiling per collection. Rationale: at 2,000 docs a boot
 * costs ~2,000 reads for that collection (≈4% of the Spark daily read
 * quota) and ~2k small records sit comfortably in a 2 GB floor device's
 * memory. Above it, the read bill and the memory both stop being
 * acceptable, and windowing — with honestly labelled partial figures —
 * is the lesser cost. Matches the scale-surge report's ~2,000 figure.
 */
export const FULL_SYNC_THRESHOLD = 2000;

/**
 * Windowed-mode page size: the initial listener limit and the
 * "load more" step. 500 recent records cover a desk's working set
 * (a busy temple logs tens of treasury entries a day; 500 ≈ a month+
 * of ledger on screen) while capping a windowed boot at 500 reads per
 * collection — a 40k/100k workspace boots on ~2k reads total instead
 * of ~140k.
 */
export const WINDOW_PAGE_SIZE = 500;

export type WindowMode = 'full' | 'windowed';

/**
 * Decide the sync mode from a server count.
 * `null` = probe failed / not permitted → fail open to full sync
 * (exactly today's behaviour; the listener itself also fails open).
 */
export function decideWindowMode(count: number | null | undefined): WindowMode {
  if (count == null || !Number.isFinite(count)) return 'full';
  return count > FULL_SYNC_THRESHOLD ? 'windowed' : 'full';
}

/**
 * Per-collection window ordering. Windowed mode shows the most useful
 * slice first:
 *  - treasury: newest first — `date` is a required ISO string on every
 *    write path (POS, Bahi-Khata, bookings, campaigns all stamp it),
 *    and ISO dates sort chronologically as strings.
 *  - devotees: alphabetical directory order — `fullName` is required.
 *  - puja_bookings: newest booking first — `bookingDate` is stamped by
 *    the booking desks.
 *  - inventory_items: alphabetical — `itemName` is required.
 * Documents missing the order field are excluded by Firestore from an
 * orderBy query; in a >2,000-doc workspace (necessarily written at
 * scale through these paths) that set is negligible, and the desks'
 * window notice states the loaded/total figures honestly.
 */
export const COLLECTION_WINDOW_ORDER: Record<
  CoreCollectionKey,
  { field: string; direction: 'asc' | 'desc' }
> = {
  devotees: { field: 'fullName', direction: 'asc' },
  puja_bookings: { field: 'bookingDate', direction: 'desc' },
  treasury: { field: 'date', direction: 'desc' },
  inventory_items: { field: 'itemName', direction: 'asc' },
};

/** Live metadata the context publishes per core collection. */
export interface CollectionWindowState {
  /** Server-side total for the active workspace; null when unprobed/failed. */
  total: number | null;
  /** True when the listener is windowed (total > FULL_SYNC_THRESHOLD). */
  windowed: boolean;
  /** Current listener limit when windowed; equals the page size in full mode. */
  limit: number;
}

export const DEFAULT_WINDOW_STATE: CollectionWindowState = {
  total: null,
  windowed: false,
  limit: WINDOW_PAGE_SIZE,
};

export function windowStateForCount(count: number | null): CollectionWindowState {
  return {
    total: count,
    windowed: decideWindowMode(count) === 'windowed',
    limit: WINDOW_PAGE_SIZE,
  };
}

/** Next limit for a "load more" step; never exceeds the known total. */
export function nextWindowLimit(state: CollectionWindowState): number {
  const grown = state.limit + WINDOW_PAGE_SIZE;
  return state.total != null ? Math.min(grown, state.total) : grown;
}

/** True while a windowed collection still has unloaded records. */
export function hasMoreToLoad(state: CollectionWindowState, loaded: number): boolean {
  if (!state.windowed) return false;
  if (state.total != null) return loaded < state.total;
  return loaded >= state.limit;
}
