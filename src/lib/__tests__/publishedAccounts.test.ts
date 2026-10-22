/**
 * publishedAccounts.test.ts — Blueprint A, deliverable 3: the
 * publish flow's snapshot math.
 *
 * The law under test: a published snapshot EQUALS the canonical
 * full-set aggregates over exactly the month's rows — the same
 * computeTreasuryAggregates the desks and workspaceSummaries use —
 * so a figure on the public Transparency Board can never disagree
 * with the ledger it came from. Also pinned: month bucketing,
 * distinct donor counting (a count, never names), and that the
 * snapshot document carries no donor-identifying data at all.
 */
import {
  buildPublishedSnapshot,
  donorCountFor,
  monthKeyOf,
  monthsPresent,
  publishedAccountsDocId,
  rowsForMonth,
} from '../publishedAccounts';
import {
  computeTreasuryAggregates,
  type AggregatableTx,
} from '../treasuryAggregates';

const LEDGER: AggregatableTx[] = [
  { type: 'Income', amount: 5100, category: 'Pooja Dakshina', date: '2026-09-05', devoteeId: 'dev-1', devoteeName: 'A' },
  { type: 'Income', amount: 11000, category: 'Gau Seva', date: '2026-09-12', devoteeId: 'dev-2', devoteeName: 'B' },
  { type: 'Income', amount: 2100, category: 'Pooja Dakshina', date: '2026-09-20', devoteeName: 'A (name-keyed)' },
  { type: 'Expense', amount: 3200, category: 'Annadanam', date: '2026-09-15' },
  { type: 'Income', amount: 999, category: 'Pooja Dakshina', date: '2026-10-01', devoteeId: 'dev-1', devoteeName: 'A' },
  { type: 'Expense', amount: 500, category: 'Annadanam', date: '2026-10-02' },
  // A Bahi-Khata reversal pair inside September: +1000 then -1000 as
  // a compensating Expense-shaped row via category semantics — the
  // aggregates treat rows uniformly, and so must the snapshot.
  { type: 'Income', amount: 1000, category: 'General', date: '2026-09-25', devoteeName: 'C' },
  { type: 'Expense', amount: 1000, category: 'Reversal — Bahi-Khata', date: '2026-09-26' },
];

describe('month bucketing', () => {
  it('monthKeyOf reads the YYYY-MM prefix, null when undated', () => {
    expect(monthKeyOf('2026-09-05')).toBe('2026-09');
    expect(monthKeyOf('')).toBeNull();
    expect(monthKeyOf(undefined)).toBeNull();
  });

  it('rowsForMonth selects exactly the month', () => {
    expect(rowsForMonth(LEDGER, '2026-09')).toHaveLength(6);
    expect(rowsForMonth(LEDGER, '2026-10')).toHaveLength(2);
    expect(rowsForMonth(LEDGER, '2026-11')).toHaveLength(0);
  });

  it('monthsPresent lists newest first', () => {
    expect(monthsPresent(LEDGER)).toEqual(['2026-10', '2026-09']);
  });
});

describe('buildPublishedSnapshot', () => {
  const september = rowsForMonth(LEDGER, '2026-09');
  const snapshot = buildPublishedSnapshot({
    workspaceId: 'WS-1001',
    month: '2026-09',
    monthRows: september,
    currencyCode: 'BDT',
    publishedBy: 'uid-trustee',
    publishedByName: 'Karim Trustee',
    note: 'Published after monthly reconciliation',
    now: 1_700_000_000_000,
  });

  it('equals the canonical aggregates over the same rows', () => {
    const agg = computeTreasuryAggregates(september);
    expect(snapshot.totalIncome).toBe(agg.totalIncome);
    expect(snapshot.totalExpense).toBe(agg.totalExpense);
    expect(snapshot.netBalance).toBe(agg.netBalance);
    expect(snapshot.byCategory).toEqual(agg.byCategory);
    expect(snapshot.txCount).toBe(agg.count);
  });

  it('carries the publish metadata and the doc id shape', () => {
    expect(snapshot.id).toBe(publishedAccountsDocId('WS-1001', '2026-09'));
    expect(snapshot.id).toBe('WS-1001_2026-09');
    expect(snapshot.currencyCode).toBe('BDT');
    expect(snapshot.publishedBy).toBe('uid-trustee');
    expect(snapshot.publishedByName).toBe('Karim Trustee');
    expect(snapshot.publishedAt).toBe(1_700_000_000_000);
    expect(snapshot.note).toBe('Published after monthly reconciliation');
  });

  it('donorCount counts DISTINCT donors (id or name keyed), income only', () => {
    // dev-1, dev-2, the name-keyed donor, and 'C' = 4 distinct.
    expect(donorCountFor(september)).toBe(4);
    expect(snapshot.donorCount).toBe(4);
  });

  it('the snapshot carries NO donor-identifying data', () => {
    const raw = JSON.stringify(snapshot);
    expect(raw).not.toContain('dev-1');
    expect(raw).not.toContain('dev-2');
    expect(raw).not.toContain('uid-trustee'.replace('uid-', 'dev-'));
    // byCategory keys are category names only.
    for (const key of Object.keys(snapshot.byCategory)) {
      expect(['Pooja Dakshina', 'Gau Seva', 'Annadanam', 'General', 'Reversal — Bahi-Khata']).toContain(key);
    }
  });

  it('an empty month snapshots to honest zeros, never invented figures', () => {
    const empty = buildPublishedSnapshot({
      workspaceId: 'WS-1001',
      month: '2026-11',
      monthRows: [],
      currencyCode: 'INR',
      publishedBy: 'uid-trustee',
      publishedByName: 'Karim Trustee',
      now: 1_700_000_000_000,
    });
    expect(empty.totalIncome).toBe(0);
    expect(empty.totalExpense).toBe(0);
    expect(empty.txCount).toBe(0);
    expect(empty.donorCount).toBe(0);
    expect(empty.note).toBeUndefined();
  });
});
