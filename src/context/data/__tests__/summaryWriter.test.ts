/**
 * summaryWriter.test.ts — the workspaceSummaries maintenance policy.
 *
 * Pins the laws the writer must never break:
 *   - a maintained summary ALWAYS equals the lib's full-set
 *     computation over the same ledger (never an approximation);
 *   - a Bahi-Khata reversal (compensating row) moves the totals
 *     exactly as the full set does;
 *   - first-open backfill writes ONCE, flagged backfilled: true;
 *   - a failed summary write never breaks the treasury mutation and
 *     never poisons the next attempt;
 *   - windowed mode folds deltas onto a proven base — and when it
 *     cannot fold exactly, it writes NOTHING and marks the workspace
 *     dirty for a full recompute instead of guessing;
 *   - DEMO_ workspaces are never written.
 */
import {
  buildSummaryDoc,
  computeTreasuryAggregates,
  type AggregatableTx,
  type WorkspaceSummaryDoc,
} from '../../../lib/treasuryAggregates';
import {
  WorkspaceSummaryMaintainer,
  lifetimeGivingFromSummary,
  type SummaryCounts,
  type SummaryStore,
} from '../summaryWriter';

const NOW = 1_700_000_000_000;
const WS = 'WS-1001';

const COUNTS: SummaryCounts = {
  devotees: 12,
  puja_bookings: 4,
  treasury: null,
  inventory_items: 30,
};

/* Fixtures — the same small temple ledger as treasuryAggregates.test. */
const T1: AggregatableTx = {
  type: 'Income', amount: 5100, category: 'Pooja Dakshina', date: '2026-08-24',
  devoteeId: 'dev-102', devoteeName: 'Gayatri Devi', is80GEligible: true,
};
const T2: AggregatableTx = {
  type: 'Income', amount: 11000, category: 'Gau Seva Donation', date: '2026-08-23',
  devoteeId: 'dev-201', devoteeName: 'Rajesh Agrawal', is80GEligible: true,
};
const T3: AggregatableTx = {
  type: 'Expense', amount: 3200, category: 'Annadanam Provisions', date: '2026-08-22',
};
const T4: AggregatableTx = {
  type: 'Income', amount: 501, category: 'General Chanda', date: '2026-09-01',
  devoteeName: 'Walk-in Donor', is80GEligible: false,
};
/** Bahi-Khata undo of T2: a compensating Expense row, same amount. */
const T2_REVERSAL: AggregatableTx = {
  type: 'Expense', amount: 11000, category: 'Gau Seva Donation', date: '2026-09-02',
  devoteeId: 'dev-201', devoteeName: 'Rajesh Agrawal',
};
const LEDGER = [T1, T2, T3, T4];

class FakeStore implements SummaryStore {
  docs = new Map<string, WorkspaceSummaryDoc>();
  writes = 0;
  failWrites = false;
  failReads = false;

  async readSummary(workspaceId: string): Promise<WorkspaceSummaryDoc | null> {
    if (this.failReads) throw new Error('permission-denied');
    const doc = this.docs.get(workspaceId);
    return doc ? structuredClone(doc) : null;
  }

  async writeSummary(doc: WorkspaceSummaryDoc): Promise<void> {
    if (this.failWrites) throw new Error('unavailable');
    this.writes += 1;
    this.docs.set(doc.workspaceId, structuredClone(doc));
  }
}

function makeMaintainer(store: FakeStore): WorkspaceSummaryMaintainer {
  return new WorkspaceSummaryMaintainer(store, {
    debounceMs: 60_000, // never auto-fires in tests; flush() is explicit
    now: () => NOW,
    log: () => {},
  });
}

describe('full-sync maintenance (recompute from the in-memory ledger)', () => {
  it('a create updates the summary to exactly the full-set computation', async () => {
    const store = new FakeStore();
    const m = makeMaintainer(store);
    m.noteMutation({
      workspaceId: WS, windowed: false,
      mutation: { kind: 'create', tx: T1 },
      fullSet: [T1], counts: COUNTS,
    });
    await m.flush();
    const doc = store.docs.get(WS);
    expect(doc).toBeDefined();
    expect(doc!.workspaceId).toBe(WS);
    expect(doc!.version).toBe(1);
    expect(doc!.backfilled).toBe(false);
    expect(doc!.updatedAtMs).toBe(NOW);
    expect(doc!.treasury).toEqual(computeTreasuryAggregates([T1]));
    expect(doc!.counts).toEqual({ ...COUNTS, treasury: 1 });
  });

  it('a reversal (compensating expense row) decreases the net exactly', async () => {
    const store = new FakeStore();
    const m = makeMaintainer(store);
    m.noteMutation({
      workspaceId: WS, windowed: false,
      mutation: { kind: 'create', tx: T2 },
      fullSet: [T2], counts: COUNTS,
    });
    await m.flush();
    const before = store.docs.get(WS)!.treasury;
    expect(before.totalIncome).toBe(11000);
    expect(before.netBalance).toBe(11000);

    m.noteMutation({
      workspaceId: WS, windowed: false,
      mutation: { kind: 'create', tx: T2_REVERSAL },
      fullSet: [T2, T2_REVERSAL], counts: COUNTS,
    });
    await m.flush();
    const after = store.docs.get(WS)!.treasury;
    expect(after).toEqual(computeTreasuryAggregates([T2, T2_REVERSAL]));
    expect(after.totalIncome).toBe(11000); // income row still exists
    expect(after.totalExpense).toBe(11000); // reversal lands as expense
    expect(after.netBalance).toBe(0); // the money is exactly undone
  });

  it('a create followed by its rollback delete nets to the original state', async () => {
    const store = new FakeStore();
    const m = makeMaintainer(store);
    m.noteMutation({
      workspaceId: WS, windowed: false,
      mutation: { kind: 'create', tx: T1 },
      fullSet: [T1, T3], counts: COUNTS,
    });
    // The treasury write was rejected; DataContext rolls back and
    // reports the inverse with the post-rollback set.
    m.noteMutation({
      workspaceId: WS, windowed: false,
      mutation: { kind: 'delete', tx: T1 },
      fullSet: [T3], counts: COUNTS,
    });
    await m.flush();
    expect(store.docs.get(WS)!.treasury).toEqual(
      computeTreasuryAggregates([T3])
    );
  });

  it('bursts coalesce into one write with the latest set', async () => {
    const store = new FakeStore();
    const m = makeMaintainer(store);
    for (let i = 0; i < LEDGER.length; i++) {
      m.noteMutation({
        workspaceId: WS, windowed: false,
        mutation: { kind: 'create', tx: LEDGER[i] },
        fullSet: LEDGER.slice(0, i + 1), counts: COUNTS,
      });
    }
    await m.flush();
    expect(store.writes).toBe(1);
    expect(store.docs.get(WS)!.treasury).toEqual(
      computeTreasuryAggregates(LEDGER)
    );
  });
});

describe('first-open backfill', () => {
  it('writes once with backfilled: true when no summary exists', async () => {
    const store = new FakeStore();
    const m = makeMaintainer(store);
    const result = await m.ensureBackfill({
      workspaceId: WS, windowed: false,
      loadFullSet: async () => LEDGER, counts: COUNTS,
    });
    expect(result).toBe('backfilled');
    expect(store.writes).toBe(1);
    const doc = store.docs.get(WS)!;
    expect(doc.backfilled).toBe(true);
    expect(doc.treasury).toEqual(computeTreasuryAggregates(LEDGER));
    expect(doc.counts.treasury).toBe(LEDGER.length);

    // Second open in the same session: no further work.
    const again = await m.ensureBackfill({
      workspaceId: WS, windowed: false,
      loadFullSet: async () => { throw new Error('must not be called'); },
      counts: COUNTS,
    });
    expect(again).toBe('skipped');
    expect(store.writes).toBe(1);
  });

  it('adopts an existing summary without writing', async () => {
    const store = new FakeStore();
    store.docs.set(WS, buildSummaryDoc(WS, COUNTS, LEDGER, NOW - 1000, true));
    const m = makeMaintainer(store);
    const result = await m.ensureBackfill({
      workspaceId: WS, windowed: true,
      loadFullSet: async () => { throw new Error('must not be called'); },
      counts: COUNTS,
    });
    expect(result).toBe('exists');
    expect(store.writes).toBe(0);
    expect(m.getCached(WS)!.treasury).toEqual(computeTreasuryAggregates(LEDGER));
  });

  it('writes NO doc for a workspace with no treasury records', async () => {
    const store = new FakeStore();
    const m = makeMaintainer(store);
    const result = await m.ensureBackfill({
      workspaceId: WS, windowed: false,
      loadFullSet: async () => [], counts: COUNTS,
    });
    expect(result).toBe('empty');
    expect(store.writes).toBe(0);
    expect(store.docs.has(WS)).toBe(false);
  });

  it('an unreadable summary (non-finance role) is a quiet no-op', async () => {
    const store = new FakeStore();
    store.failReads = true;
    const m = makeMaintainer(store);
    const result = await m.ensureBackfill({
      workspaceId: WS, windowed: false,
      loadFullSet: async () => LEDGER, counts: COUNTS,
    });
    expect(result).toBe('unavailable');
    expect(store.writes).toBe(0);
  });
});

describe('failure isolation', () => {
  it('a summary-write failure never throws and never poisons the next write', async () => {
    const store = new FakeStore();
    const m = makeMaintainer(store);
    store.failWrites = true;
    m.noteMutation({
      workspaceId: WS, windowed: false,
      mutation: { kind: 'create', tx: T1 },
      fullSet: [T1], counts: COUNTS,
    });
    await expect(m.flush()).resolves.toBeUndefined();
    expect(store.docs.has(WS)).toBe(false);

    store.failWrites = false;
    m.noteMutation({
      workspaceId: WS, windowed: false,
      mutation: { kind: 'create', tx: T3 },
      fullSet: [T1, T3], counts: COUNTS,
    });
    await m.flush();
    // The retry recomputes from the full set — T1 is not lost.
    expect(store.docs.get(WS)!.treasury).toEqual(
      computeTreasuryAggregates([T1, T3])
    );
  });
});

describe('windowed maintenance (delta folds onto a proven base)', () => {
  async function primedWindowed() {
    const store = new FakeStore();
    const m = makeMaintainer(store);
    const result = await m.ensureBackfill({
      workspaceId: WS, windowed: true,
      loadFullSet: async () => LEDGER, counts: COUNTS,
    });
    expect(result).toBe('backfilled');
    return { store, m };
  }

  it('folds a create delta to exactly the full-set result', async () => {
    const { store, m } = await primedWindowed();
    const T5: AggregatableTx = {
      type: 'Income', amount: 2100, category: 'General Chanda', date: '2026-09-05',
      devoteeId: 'dev-102', devoteeName: 'Gayatri Devi',
    };
    m.noteMutation({
      workspaceId: WS, windowed: true,
      mutation: { kind: 'create', tx: T5 },
      fullSet: [T5], // the loaded window only — must NOT be recomputed from
      counts: COUNTS,
    });
    await m.flush();
    const doc = store.docs.get(WS)!;
    expect(doc.backfilled).toBe(false); // now incrementally maintained
    expect(doc.treasury).toEqual(computeTreasuryAggregates([...LEDGER, T5]));
  });

  it('folds a delete delta so totals decrease exactly', async () => {
    const { store, m } = await primedWindowed();
    m.noteMutation({
      workspaceId: WS, windowed: true,
      mutation: { kind: 'delete', tx: T2 },
      fullSet: [], counts: COUNTS,
    });
    await m.flush();
    const agg = store.docs.get(WS)!.treasury;
    const expected = computeTreasuryAggregates([T1, T3, T4]);
    expect(agg).toEqual(expected);
    expect(agg.totalIncome).toBe(expected.totalIncome); // 11000 removed
  });

  it('folds an update delta (remove-old + add-new) exactly', async () => {
    const { store, m } = await primedWindowed();
    const edited: AggregatableTx = { ...T1, amount: 6100 };
    m.noteMutation({
      workspaceId: WS, windowed: true,
      mutation: { kind: 'update', oldTx: T1, newTx: edited },
      fullSet: [], counts: COUNTS,
    });
    await m.flush();
    expect(store.docs.get(WS)!.treasury).toEqual(
      computeTreasuryAggregates([edited, T2, T3, T4])
    );
  });

  it('an update with an unknown old row writes NOTHING and marks dirty; next open recomputes', async () => {
    const { store, m } = await primedWindowed();
    const writesBefore = store.writes;
    m.noteMutation({
      workspaceId: WS, windowed: true,
      mutation: { kind: 'update', oldTx: null, newTx: { ...T1, amount: 1 } },
      fullSet: [], counts: COUNTS,
    });
    await m.flush();
    expect(store.writes).toBe(writesBefore); // no guessed write
    expect(m.isDirty(WS)).toBe(true);

    const corrected = [{ ...T1, amount: 1 }, T2, T3, T4];
    const result = await m.ensureBackfill({
      workspaceId: WS, windowed: true,
      loadFullSet: async () => corrected, counts: COUNTS,
    });
    expect(result).toBe('recomputed');
    const doc = store.docs.get(WS)!;
    expect(doc.backfilled).toBe(true);
    expect(doc.treasury).toEqual(computeTreasuryAggregates(corrected));
    expect(m.isDirty(WS)).toBe(false);
  });

  it('with no base anywhere it writes nothing rather than fabricating from a window', async () => {
    const store = new FakeStore();
    const m = makeMaintainer(store);
    m.noteMutation({
      workspaceId: WS, windowed: true,
      mutation: { kind: 'create', tx: T1 },
      fullSet: [T1], counts: COUNTS,
    });
    await m.flush();
    expect(store.writes).toBe(0);
    expect(store.docs.has(WS)).toBe(false);
  });
});

describe('DEMO_ workspaces', () => {
  it('are never backfilled and never maintained', async () => {
    const store = new FakeStore();
    const m = makeMaintainer(store);
    const result = await m.ensureBackfill({
      workspaceId: 'DEMO_ws-1', windowed: false,
      loadFullSet: async () => LEDGER, counts: COUNTS,
    });
    expect(result).toBe('skipped');
    m.noteMutation({
      workspaceId: 'DEMO_ws-1', windowed: false,
      mutation: { kind: 'create', tx: T1 },
      fullSet: [T1], counts: COUNTS,
    });
    await m.flush();
    expect(store.writes).toBe(0);
  });
});

describe('lifetimeGivingFromSummary (PersonalizedReminderService source)', () => {
  const doc = buildSummaryDoc('WS-9', COUNTS, LEDGER, NOW, true);

  it('reads the id-keyed bucket', () => {
    expect(lifetimeGivingFromSummary(doc, 'dev-201')).toBe(11000);
  });

  it('reads the name-keyed bucket (rows stamped with a name only)', () => {
    expect(lifetimeGivingFromSummary(doc, 'dev-unknown', 'Walk-in Donor')).toBe(501);
  });

  it('sums id and name buckets for the same person', () => {
    // T1 is keyed by id (dev-102); a name-only row for the same person
    // would land in the name bucket — both are their giving.
    expect(lifetimeGivingFromSummary(doc, 'dev-102', 'Gayatri Devi')).toBe(5100);
  });

  it('is 0 when there is no summary or no giving — never invented', () => {
    expect(lifetimeGivingFromSummary(null, 'dev-102')).toBe(0);
    expect(lifetimeGivingFromSummary(undefined, 'dev-102')).toBe(0);
    expect(lifetimeGivingFromSummary(doc, 'dev-nobody')).toBe(0);
    expect(lifetimeGivingFromSummary(doc, null)).toBe(0);
  });
});
