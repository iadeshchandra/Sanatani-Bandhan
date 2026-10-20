/**
 * treasuryAggregates.test.ts — F2 equality proofs.
 *
 * The accounting law: a maintained summary must NEVER disagree with
 * the full-set computation the desks display today. These tests pin
 * the full-set semantics to hand-computed values, then prove that
 * folding create/update/delete deltas — including amount+type+
 * category+devotee+80G edits and a Bahi-Khata-style reversal row —
 * reproduces the full-set result EXACTLY.
 */
import {
  AggregatableTx,
  applyTxCreate,
  applyTxDelete,
  applyTxUpdate,
  buildSummaryDoc,
  computeTreasuryAggregates,
  emptyAggregates,
} from '../treasuryAggregates';

/* Fixtures — a small temple ledger. */
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
  devoteeName: 'Walk-in Donor', // no devoteeId — name-keyed donor
  is80GEligible: false,
};
/** Bahi-Khata undo of T2 writes a compensating Expense row. */
const T2_REVERSAL: AggregatableTx = {
  type: 'Expense', amount: 11000, category: 'Gau Seva Donation', date: '2026-09-02',
  devoteeId: 'dev-201', devoteeName: 'Rajesh Agrawal',
};
const ALL = [T1, T2, T3, T4];

describe('computeTreasuryAggregates — full-set semantics pinned', () => {
  it('matches hand-computed desk totals', () => {
    const agg = computeTreasuryAggregates(ALL);
    expect(agg.count).toBe(4);
    expect(agg.totalIncome).toBe(5100 + 11000 + 501);
    expect(agg.totalExpense).toBe(3200);
    expect(agg.netBalance).toBe(16601 - 3200);
    // 80G: Income && is80GEligible only (T1 + T2; T4 is not eligible)
    expect(agg.eligible80GIncome).toBe(16100);
    expect(agg.eligible80GCount).toBe(2);
  });

  it('buckets by category and month exactly', () => {
    const agg = computeTreasuryAggregates(ALL);
    expect(agg.byCategory['Pooja Dakshina']).toEqual({ income: 5100, expense: 0 });
    expect(agg.byCategory['Annadanam Provisions']).toEqual({ income: 0, expense: 3200 });
    expect(agg.byMonth['2026-08']).toEqual({ income: 16100, expense: 3200 });
    expect(agg.byMonth['2026-09']).toEqual({ income: 501, expense: 0 });
  });

  it('sums per-donor income, keyed by id with name fallback', () => {
    const agg = computeTreasuryAggregates(ALL);
    expect(agg.byDevoteeIncome['dev-102']).toBe(5100);
    expect(agg.byDevoteeIncome['dev-201']).toBe(11000);
    expect(agg.byDevoteeIncome['Walk-in Donor']).toBe(501);
    // Expenses never enter the donor income map
    expect(Object.keys(agg.byDevoteeIncome)).toHaveLength(3);
  });

  it('coerces amounts like the desks (Number(x || 0), junk-safe)', () => {
    const agg = computeTreasuryAggregates([
      { type: 'Income', amount: '250' as unknown as number },
      { type: 'Income', amount: undefined },
      { type: 'Expense', amount: 'junk' as unknown as number },
      { type: 'Income', amount: 100 },
    ]);
    expect(agg.totalIncome).toBe(350);
    expect(agg.totalExpense).toBe(0);
    expect(agg.count).toBe(4);
  });

  it('empty set → zeroed aggregates', () => {
    expect(computeTreasuryAggregates([])).toEqual(emptyAggregates());
  });
});

describe('delta folds == full-set recompute (the summary-maintenance proof)', () => {
  it('folding creates in order reproduces the full-set result', () => {
    let agg = emptyAggregates();
    for (const tx of ALL) agg = applyTxCreate(agg, tx);
    expect(agg).toEqual(computeTreasuryAggregates(ALL));
  });

  it('a Bahi-Khata reversal row nets the original donation to zero', () => {
    const withReversal = [...ALL, T2_REVERSAL];
    let agg = emptyAggregates();
    for (const tx of withReversal) agg = applyTxCreate(agg, tx);
    expect(agg).toEqual(computeTreasuryAggregates(withReversal));
    expect(agg.netBalance).toBe(16601 - 3200 - 11000);
    expect(agg.byCategory['Gau Seva Donation']).toEqual({ income: 11000, expense: 11000 });
  });

  it('an update changing amount, type, category, devotee AND 80G flag stays exact', () => {
    // T1 is corrected: it was really a 6,000 expense by another donor, not 80G.
    const T1_FIXED: AggregatableTx = {
      type: 'Expense', amount: 6000, category: 'Repairs', date: '2026-08-24',
      devoteeId: 'dev-999', devoteeName: 'Someone Else', is80GEligible: false,
    };
    const before = computeTreasuryAggregates(ALL);
    const viaDelta = applyTxUpdate(before, T1, T1_FIXED);
    const viaFullSet = computeTreasuryAggregates([T1_FIXED, T2, T3, T4]);
    expect(viaDelta).toEqual(viaFullSet);
    expect(viaDelta.totalIncome).toBe(11501);
    expect(viaDelta.eligible80GIncome).toBe(11000);
    expect(viaDelta.byDevoteeIncome['dev-102']).toBeUndefined();
  });

  it('a delete removes the row exactly (receipt-void path)', () => {
    const before = computeTreasuryAggregates(ALL);
    const viaDelta = applyTxDelete(before, T3);
    expect(viaDelta).toEqual(computeTreasuryAggregates([T1, T2, T4]));
    expect(viaDelta.totalExpense).toBe(0);
    expect(viaDelta.byCategory['Annadanam Provisions']).toBeUndefined();
  });

  it('a create→update→delete chain returns to the empty aggregate', () => {
    let agg = emptyAggregates();
    agg = applyTxCreate(agg, T1);
    agg = applyTxUpdate(agg, T1, { ...T1, amount: 7000 });
    agg = applyTxDelete(agg, { ...T1, amount: 7000 });
    expect(agg).toEqual(emptyAggregates());
  });

  it('deltas do not mutate the previous aggregate (immutability)', () => {
    const before = computeTreasuryAggregates(ALL);
    const snapshot = JSON.stringify(before);
    applyTxCreate(before, T2_REVERSAL);
    applyTxDelete(before, T1);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('buildSummaryDoc — the rules-pending summary shape', () => {
  it('carries the full-set aggregates and the true treasury count', () => {
    const doc = buildSummaryDoc(
      'ws-big',
      { devotees: 40000, puja_bookings: 9000, treasury: null, inventory_items: 300 },
      ALL,
      1760000000000,
      true
    );
    expect(doc.workspaceId).toBe('ws-big');
    expect(doc.counts.treasury).toBe(4);
    expect(doc.treasury).toEqual(computeTreasuryAggregates(ALL));
    expect(doc.backfilled).toBe(true);
  });
});
