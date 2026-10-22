/**
 * practiceMode.test.ts — Blueprint D, deliverable 1: practice mode
 * must be airtight. The brief's test, verbatim in spirit:
 * "practice entries never leak into treasury totals,
 * workspaceSummaries inputs, audit public surfaces, or published
 * accounts; clear removes exactly practice rows."
 *
 * What is pinned here, at the canonical-fold level every consumer
 * shares:
 *   - computeTreasuryAggregates skips practice rows ENTIRELY
 *     (totals, counts, categories, months, per-donor, 80G);
 *   - the summary delta fold (create/delete/update) is a no-op for
 *     practice rows — a windowed workspace's summary can never
 *     drift by practising;
 *   - buildSummaryDoc's treasury count is practice-free;
 *   - published snapshots + donor counts exclude practice rows;
 *   - receipt law: a practice row is classified 'practice', never
 *     consumes a sequence number, and a caller-provided number is
 *     refused for it;
 *   - countPracticeRecords counts exactly the practice rows;
 *   - practiceVisible hides practice rows with the mode off only.
 */
import {
  applyTxCreate,
  applyTxDelete,
  applyTxUpdate,
  buildSummaryDoc,
  computeTreasuryAggregates,
  emptyAggregates,
  type AggregatableTx,
} from '../treasuryAggregates';
import { buildPublishedSnapshot, donorCountFor } from '../publishedAccounts';
import { assignReceiptNumber, receiptCoverageFor } from '../receiptCoverage';
import {
  countPracticeRecords,
  isPracticeModeOn,
  isPracticeRecord,
  practiceStamp,
  practiceVisible,
} from '../practiceMode';

const REAL_INCOME: AggregatableTx = {
  type: 'Income',
  amount: 1000,
  category: 'Chanda',
  date: '2026-10-05',
  devoteeId: 'dev-1',
  devoteeName: 'Real Donor',
  is80GEligible: true,
};
const PRACTICE_INCOME: AggregatableTx = {
  ...REAL_INCOME,
  amount: 999999,
  devoteeName: 'Practice Donor',
  isPractice: true,
};
const REAL_EXPENSE: AggregatableTx = {
  type: 'Expense',
  amount: 200,
  category: 'Utilities',
  date: '2026-10-06',
};
const PRACTICE_EXPENSE: AggregatableTx = { ...REAL_EXPENSE, amount: 8888, isPractice: true };

describe('the canonical fold', () => {
  it('excludes practice rows from every aggregate', () => {
    const agg = computeTreasuryAggregates([REAL_INCOME, PRACTICE_INCOME, REAL_EXPENSE, PRACTICE_EXPENSE]);
    expect(agg.count).toBe(2);
    expect(agg.totalIncome).toBe(1000);
    expect(agg.totalExpense).toBe(200);
    expect(agg.netBalance).toBe(800);
    expect(agg.eligible80GIncome).toBe(1000);
    expect(agg.eligible80GCount).toBe(1);
    expect(agg.byCategory['Chanda']).toEqual({ income: 1000, expense: 0 });
    expect(agg.byMonth['2026-10']).toEqual({ income: 1000, expense: 200 });
    expect(agg.byDevoteeIncome).toEqual({ 'dev-1': 1000 });
  });

  it('delta folds are no-ops for practice rows (windowed summaries cannot drift)', () => {
    const base = computeTreasuryAggregates([REAL_INCOME, REAL_EXPENSE]);
    expect(applyTxCreate(base, PRACTICE_INCOME)).toEqual(base);
    expect(applyTxDelete(base, PRACTICE_EXPENSE)).toEqual(base);
    expect(applyTxUpdate(base, REAL_INCOME, PRACTICE_INCOME)).toEqual(
      computeTreasuryAggregates([REAL_EXPENSE])
    );
    // A flip practice→real is a deliberate real change, and counts
    // exactly as a full recompute would count it — the invariant is
    // fold ≡ recompute, always.
    expect(applyTxUpdate(base, PRACTICE_INCOME, REAL_INCOME)).toEqual(
      computeTreasuryAggregates([REAL_INCOME, REAL_EXPENSE, REAL_INCOME])
    );
    // and the empty fold stays empty under practice-only traffic
    expect(applyTxCreate(emptyAggregates(), PRACTICE_EXPENSE).count).toBe(0);
  });

  it('buildSummaryDoc reports a practice-free treasury count', () => {
    const doc = buildSummaryDoc(
      'WS-1',
      { devotees: 3, puja_bookings: 0, treasury: 999, inventory_items: 0 },
      [REAL_INCOME, PRACTICE_INCOME, PRACTICE_EXPENSE],
      123,
      false
    );
    expect(doc.counts.treasury).toBe(1);
    expect(doc.treasury.totalIncome).toBe(1000);
  });
});

describe('published accounts (the audit PUBLIC surface)', () => {
  it('snapshots and donor counts exclude practice rows', () => {
    const rows = [REAL_INCOME, PRACTICE_INCOME];
    const snap = buildPublishedSnapshot({
      workspaceId: 'WS-1',
      month: '2026-10',
      monthRows: rows,
      currencyCode: 'INR',
      publishedBy: 'uid-1',
      publishedByName: 'Trustee',
      now: 456,
    });
    expect(snap.totalIncome).toBe(1000);
    expect(snap.txCount).toBe(1);
    expect(snap.donorCount).toBe(1);
    expect(donorCountFor(rows)).toBe(1);
    expect(donorCountFor([PRACTICE_INCOME])).toBe(0);
  });
});

describe('receipt law', () => {
  it('practice rows are classified practice and never consume a number', () => {
    const practiceTx = {
      type: 'Income',
      amount: 500,
      devoteeId: 'dev-9',
      isPractice: true,
    };
    expect(receiptCoverageFor(practiceTx)).toBe('practice');
    expect(assignReceiptNumber(practiceTx, [], 2026)).toBeUndefined();
    // even a caller-provided number is refused for a practice row
    expect(
      assignReceiptNumber({ ...practiceTx, taxReceiptNumber: 'SB-80G-2026-0007' }, [], 2026)
    ).toBeUndefined();
    // a real row in the same set still gets the FIRST sequence number —
    // the practice row consumed nothing.
    const realTx = { type: 'Income', amount: 500, devoteeId: 'dev-9', is80GEligible: true };
    expect(assignReceiptNumber(realTx, [], 2026)).toBe('SB-80G-2026-0001');
  });
});

describe('the tag helpers', () => {
  it('isPracticeRecord / practiceStamp / mode gate behave exactly', () => {
    expect(isPracticeRecord({ isPractice: true })).toBe(true);
    expect(isPracticeRecord({ isPractice: false })).toBe(false);
    expect(isPracticeRecord({})).toBe(false);
    expect(isPracticeRecord(null)).toBe(false);
    expect(practiceStamp(true)).toEqual({ isPractice: true });
    expect(practiceStamp(false)).toEqual({});
    expect(isPracticeModeOn({ practiceMode: true })).toBe(true);
    expect(isPracticeModeOn({ practiceMode: false })).toBe(false);
    expect(isPracticeModeOn({})).toBe(false);
    expect(isPracticeModeOn(null)).toBe(false);
  });

  it('practiceVisible hides practice rows only while the mode is off', () => {
    const practice = { isPractice: true };
    const real = {};
    expect(practiceVisible(practice, true)).toBe(true);
    expect(practiceVisible(practice, false)).toBe(false);
    expect(practiceVisible(real, false)).toBe(true);
  });

  it('countPracticeRecords counts exactly the practice rows, per set', () => {
    const counts = countPracticeRecords({
      devotees: [{ isPractice: true }, {}, { isPractice: true }],
      treasury: [{ isPractice: true }],
      poojaBookings: [{}],
      inventory: [],
      gurukulStudents: [{ isPractice: true }],
      cows: [],
      guests: [{}],
      campaigns: [],
      shifts: [{ isPractice: true }, { isPractice: true }],
    });
    expect(counts).toEqual({
      devotees: 2,
      treasury: 1,
      poojaBookings: 0,
      inventory: 0,
      gurukulStudents: 1,
      cows: 0,
      guests: 0,
      campaigns: 0,
      shifts: 2,
      total: 6,
    });
  });
});
