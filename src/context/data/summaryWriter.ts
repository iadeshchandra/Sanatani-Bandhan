/**
 * summaryWriter.ts — the maintained `workspaceSummaries/{workspaceId}`
 * writer (F2 end-state from the scale-surge report §6; design lib:
 * src/lib/treasuryAggregates.ts, QUEUED #40).
 *
 * The Firestore rules block landed 2026-10-22 (commit 3e813297):
 * finance roles (SuperAdmin / Trustee / Accountant) of the workspace
 * may create/update the doc; delete is never allowed; the doc must
 * carry `workspaceId` equal to its path id. This module is the only
 * writer. It is deliberately DERIVED-DATA plumbing:
 *
 *   - It NEVER throws and NEVER blocks a treasury mutation. Every
 *     failure is caught, logged, and left for the next mutation or
 *     workspace open to reconcile.
 *   - It NEVER fabricates. A summary is written only from a real
 *     full-set computation (the in-memory ledger, or a one-time full
 *     read during backfill) or from proven delta folds
 *     (applyTxCreate/Update/Delete — equality-proven against the
 *     full-set computation in treasuryAggregates.test.ts) applied to
 *     such a computation. If neither is available, it writes nothing.
 *   - It NEVER deletes the summary doc (rules forbid it anyway).
 *
 * Two maintenance modes, mirroring DataContext's F2 sync modes:
 *
 *   - Full-sync workspaces (treasury ≤ FULL_SYNC_THRESHOLD): the data
 *     layer already holds the ENTIRE ledger in memory, so each
 *     mutation recomputes from that set. Recompute is self-healing —
 *     any missed or rolled-back write is corrected by the next one.
 *   - Windowed workspaces (> threshold): the in-memory set is only a
 *     page of the ledger, so recomputing from it would UNDERSTATE the
 *     totals — the exact corruption F2 exists to prevent. Instead the
 *     mutation's delta is folded onto the last known summary (primed
 *     by the first-open read/backfill). If no trustworthy base exists,
 *     or a delta cannot be folded exactly (an update whose old row is
 *     outside the window), the workspace is marked dirty and the next
 *     open recomputes from a one-time full read.
 *
 * DEMO_ workspaces are skipped entirely (orgGlance law): their records
 * are ephemeral/local and a maintained summary would be fiction.
 *
 * This module is firebase-free: the store is injected, so the whole
 * maintenance policy is unit-tested against a fake store. The real
 * Firestore adapter lives in ./summaryStore.ts.
 */

import {
  applyTxCreate,
  applyTxDelete,
  applyTxUpdate,
  buildSummaryDoc,
  type AggregatableTx,
  type TreasuryAggregates,
  type WorkspaceSummaryDoc,
} from '../../lib/treasuryAggregates';

export type { WorkspaceSummaryDoc };

/** Collection counts carried on the summary doc (lib shape). */
export interface SummaryCounts {
  devotees: number | null;
  puja_bookings: number | null;
  treasury: number | null;
  inventory_items: number | null;
}

export const NULL_COUNTS: SummaryCounts = {
  devotees: null,
  puja_bookings: null,
  treasury: null,
  inventory_items: null,
};

/**
 * One committed treasury mutation, as the data layer reports it.
 * `create`/`delete` carry the full row; `update` carries old + new
 * (oldTx is null when the row is outside a windowed client's loaded
 * page — the fold then cannot be exact and the workspace goes dirty).
 * `deleteMany` is a batch delete with every removed row known
 * (sample-data purge). `bulk` is any change whose rows are not
 * individually known — only safe in full-sync mode (recompute).
 */
export type TreasuryMutation =
  | { kind: 'create'; tx: AggregatableTx }
  | { kind: 'delete'; tx: AggregatableTx }
  | { kind: 'deleteMany'; txs: readonly AggregatableTx[] }
  | { kind: 'update'; oldTx: AggregatableTx | null; newTx: AggregatableTx }
  | { kind: 'bulk' };

/**
 * Persistence for the summary doc. Implementations must set the doc
 * whose id is `doc.workspaceId` (creating or replacing it — never a
 * merge of aggregates, never a delete).
 */
export interface SummaryStore {
  /** Resolve the stored doc, or null when none exists. Throw on error
   *  (permission, network) so callers can tell "absent" from "unknown". */
  readSummary(workspaceId: string): Promise<WorkspaceSummaryDoc | null>;
  /** Create/replace the summary doc. Throw on error. */
  writeSummary(doc: WorkspaceSummaryDoc): Promise<void>;
}

export type EnsureResult =
  | 'exists' // a stored doc was adopted as the delta base
  | 'backfilled' // no doc existed; computed once from the full set and written
  | 'recomputed' // a dirty doc was replaced by a fresh full computation
  | 'empty' // no treasury records — nothing honest to write yet
  | 'skipped' // demo workspace, or already ensured this session
  | 'unavailable'; // read failed (e.g. role cannot read summaries)

export interface EnsureArgs {
  workspaceId: string;
  /** True when DataContext syncs this workspace's treasury windowed. */
  windowed: boolean;
  /**
   * Produce the workspace's FULL treasury set. Full-sync mode passes
   * the in-memory ledger (zero extra reads); windowed mode performs
   * the one-time full read. Only invoked when a computation is
   * actually required.
   */
  loadFullSet: () => Promise<readonly AggregatableTx[]>;
  counts: SummaryCounts;
  /**
   * Windowed backfill performs a costly one-time full read whose only
   * purpose is a write — pass false when the current role positively
   * cannot write summaries (rules: R_FINANCE) so the read is not
   * burned for nothing. The cheap existence read still happens.
   */
  mayWrite?: boolean;
}

export interface MutationArgs {
  workspaceId: string;
  windowed: boolean;
  mutation: TreasuryMutation;
  /** Post-mutation in-memory treasury set for THIS workspace
   *  (full-sync mode recomputes from it; ignored when windowed). */
  fullSet: readonly AggregatableTx[];
  counts: SummaryCounts;
}

const isDemoWorkspace = (id: string) => id.startsWith('DEMO_');

export class WorkspaceSummaryMaintainer {
  /** Last summary this session read or wrote, per workspace — the
   *  delta base for windowed maintenance. */
  private cache = new Map<string, WorkspaceSummaryDoc>();
  /** Workspaces whose first-open check already ran this session. */
  private ensured = new Set<string>();
  /** Workspaces whose stored summary is known/suspected stale in a
   *  way deltas cannot repair — next open recomputes from full set. */
  private dirty = new Set<string>();
  /** Coalesced pending mutation maintenance, per workspace. Bursts
   *  (Bahi-Khata bulk commits, POS runs) collapse into one write:
   *  full-sync mode keeps only the latest post-mutation set (the
   *  recompute makes earlier ones moot); windowed mode keeps every
   *  delta, in commit order, because each must be folded. */
  private pending = new Map<string, PendingEntry>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly debounceMs: number;
  private readonly now: () => number;
  private readonly log: (msg: string, err?: unknown) => void;

  constructor(
    private store: SummaryStore,
    opts: {
      debounceMs?: number;
      now?: () => number;
      log?: (msg: string, err?: unknown) => void;
    } = {}
  ) {
    this.debounceMs = opts.debounceMs ?? 250;
    this.now = opts.now ?? Date.now;
    this.log =
      opts.log ??
      ((msg, err) =>
        console.warn(`[workspaceSummaries] ${msg}`, err ?? ''));
  }

  /** The last summary this session read or wrote for a workspace. */
  getCached(workspaceId: string): WorkspaceSummaryDoc | null {
    return this.cache.get(workspaceId) ?? null;
  }

  isDirty(workspaceId: string): boolean {
    return this.dirty.has(workspaceId);
  }

  /**
   * First-open check for a workspace: adopt the stored summary as the
   * delta base, or backfill it once from the full set when absent
   * (flagged `backfilled: true`, per the lib's honesty law). Runs at
   * most once per workspace per session. Never throws.
   */
  async ensureBackfill(args: EnsureArgs): Promise<EnsureResult> {
    const { workspaceId } = args;
    if (!workspaceId || isDemoWorkspace(workspaceId)) return 'skipped';
    if (this.ensured.has(workspaceId)) return 'skipped';
    this.ensured.add(workspaceId);
    try {
      let existing: WorkspaceSummaryDoc | null = null;
      try {
        existing = await this.store.readSummary(workspaceId);
      } catch (err) {
        // Role cannot read summaries (rules: finance only) or offline
        // with an empty cache. Nothing to adopt, nothing we could
        // write either — stay silent until a mutation/open with a
        // finance role reconciles.
        this.log(`existence check failed for ${workspaceId}; skipping`, err);
        return 'unavailable';
      }
      if (existing && !this.dirty.has(workspaceId)) {
        this.cache.set(workspaceId, existing);
        return 'exists';
      }
      if (args.windowed && args.mayWrite === false) {
        // A one-time full read we could never persist is pure quota
        // burn. A finance-role open will backfill instead.
        if (existing) this.cache.set(workspaceId, existing);
        return existing ? 'exists' : 'unavailable';
      }
      const txs = await args.loadFullSet();
      if (!existing && txs.length === 0) {
        // No records: the lib's honest answer is NO doc (never an
        // invented zero summary). The first mutation creates it.
        return 'empty';
      }
      const doc = buildSummaryDoc(
        workspaceId,
        args.counts,
        txs,
        this.now(),
        true
      );
      await this.store.writeSummary(doc);
      this.cache.set(workspaceId, doc);
      this.dirty.delete(workspaceId);
      return existing ? 'recomputed' : 'backfilled';
    } catch (err) {
      this.log(`backfill failed for ${workspaceId}`, err);
      return 'unavailable';
    }
  }

  /**
   * Report a committed treasury mutation. Synchronous and safe to
   * call from inside a mutator: it only records the mutation and
   * schedules the (async, coalesced) write.
   */
  noteMutation(args: MutationArgs): void {
    const { workspaceId } = args;
    if (!workspaceId || isDemoWorkspace(workspaceId)) return;
    const prev = this.pending.get(workspaceId);
    if (prev && prev.windowed === args.windowed) {
      prev.mutations.push(args.mutation);
      prev.fullSet = args.fullSet;
      prev.counts = args.counts;
    } else {
      this.pending.set(workspaceId, {
        workspaceId,
        windowed: args.windowed,
        mutations: [args.mutation],
        fullSet: args.fullSet,
        counts: args.counts,
      });
    }
    const existing = this.timers.get(workspaceId);
    if (existing) clearTimeout(existing);
    this.timers.set(
      workspaceId,
      setTimeout(() => {
        void this.flush(workspaceId);
      }, this.debounceMs)
    );
  }

  /** Perform any pending maintenance write for a workspace (or all). */
  async flush(workspaceId?: string): Promise<void> {
    const ids = workspaceId ? [workspaceId] : [...this.pending.keys()];
    for (const id of ids) {
      const timer = this.timers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(id);
      }
      const entry = this.pending.get(id);
      if (!entry) continue;
      this.pending.delete(id);
      try {
        await this.applyMutations(entry);
      } catch (err) {
        // Derived data must never break the mutation that triggered
        // it — log and let the next mutation/open reconcile.
        this.log(`maintenance write failed for ${id}`, err);
      }
    }
  }

  private async applyMutations(entry: PendingEntry): Promise<void> {
    const { workspaceId, counts } = entry;

    if (!entry.windowed) {
      // Full-sync: recompute from the latest post-mutation in-memory
      // ledger. Exact by construction and self-healing — a rolled-back
      // or remotely-arrived row is corrected by the next mutation.
      const doc = buildSummaryDoc(
        workspaceId,
        counts,
        entry.fullSet,
        this.now(),
        false
      );
      await this.store.writeSummary(doc);
      this.cache.set(workspaceId, doc);
      this.dirty.delete(workspaceId);
      return;
    }

    // Windowed: fold the deltas, in commit order, onto the last
    // known summary.
    let base = this.cache.get(workspaceId) ?? null;
    if (!base) {
      try {
        base = await this.store.readSummary(workspaceId);
      } catch (err) {
        this.log(`delta base read failed for ${workspaceId}`, err);
      }
      if (base) this.cache.set(workspaceId, base);
    }
    if (!base) {
      // No trustworthy base (summary never backfilled, or this role
      // cannot read it) — writing from a window would fabricate
      // totals. Skip; the next finance-role open backfills.
      this.log(
        `no summary base for windowed workspace ${workspaceId}; skipping delta (next open reconciles)`
      );
      return;
    }
    let folded = base.treasury;
    for (const mutation of entry.mutations) {
      const next = foldMutation(folded, mutation);
      if (!next) {
        // A delta we cannot fold exactly (update with unknown old
        // row, or an undescribed bulk change). Do NOT guess: mark
        // dirty so the next open recomputes from a full read.
        this.dirty.add(workspaceId);
        this.ensured.delete(workspaceId);
        this.log(
          `unfoldable delta for ${workspaceId}; marked dirty for next-open recompute`
        );
        return;
      }
      folded = next;
    }
    const doc: WorkspaceSummaryDoc = {
      ...base,
      updatedAtMs: this.now(),
      backfilled: false,
      counts: { ...base.counts, treasury: folded.count },
      treasury: folded,
    };
    await this.store.writeSummary(doc);
    this.cache.set(workspaceId, doc);
  }
}

/** Coalesced maintenance waiting for its debounce flush. */
interface PendingEntry {
  workspaceId: string;
  windowed: boolean;
  mutations: TreasuryMutation[];
  /** Latest post-mutation in-memory set (full-sync recompute source). */
  fullSet: readonly AggregatableTx[];
  counts: SummaryCounts;
}

/** Fold one (possibly coalesced) mutation into aggregates.
 *  Returns null when the fold cannot be exact. */
function foldMutation(
  agg: TreasuryAggregates,
  mutation: TreasuryMutation
): TreasuryAggregates | null {
  switch (mutation.kind) {
    case 'create':
      return applyTxCreate(agg, mutation.tx);
    case 'delete':
      return applyTxDelete(agg, mutation.tx);
    case 'deleteMany': {
      let next = agg;
      for (const tx of mutation.txs) next = applyTxDelete(next, tx);
      return next;
    }
    case 'update':
      if (!mutation.oldTx) return null;
      return applyTxUpdate(agg, mutation.oldTx, mutation.newTx);
    case 'bulk':
      return null;
  }
}

/**
 * Per-devotee lifetime giving from a summary doc, mirroring the lib's
 * donor keying: a row counts under its devoteeId when it carries one,
 * else under devoteeName — so a devotee's lifetime giving is the sum
 * of their id bucket and their name bucket. Absent doc/buckets → 0
 * (nothing known, never an invented figure).
 */
export function lifetimeGivingFromSummary(
  doc: WorkspaceSummaryDoc | null | undefined,
  devoteeId: string | null | undefined,
  devoteeName?: string | null
): number {
  const byDevotee = doc?.treasury?.byDevoteeIncome;
  if (!byDevotee) return 0;
  let total = 0;
  if (devoteeId) total += Number(byDevotee[devoteeId] || 0);
  if (devoteeName && devoteeName !== devoteeId) {
    total += Number(byDevotee[devoteeName] || 0);
  }
  return Number.isFinite(total) ? total : 0;
}
