/**
 * receiptCoverage.test.ts — Blueprint A, deliverable 4: a receipt
 * for 100% of donations.
 *
 * Enumerates income fixtures shaped like every real entry path —
 * QuickChanda POS, Bahi-Khata commits, manual desk vouchers, suite
 * auto-logs (booking dakshina, goshala sponsorship, campaign
 * donations) and anonymous hundi totals — and asserts:
 *   - the coverage classification is honest for STORED rows (a
 *     pre-law POS row whose number lives in referenceNo is covered;
 *     a pre-law donor row with no number anywhere is 'missing');
 *   - after the assignment law runs at the commit point, EVERY
 *     donor-attached income fixture is 'covered' and every
 *     anonymous fixture is honestly 'anonymous' — never missing,
 *     never fabricated;
 *   - numbers are sequential per series and never re-issued;
 *   - expenses and caller-provided numbers are untouched.
 */
import {
  assignReceiptNumber,
  auditReceiptCoverage,
  receiptCoverageFor,
  receiptNumberFor,
  type ReceiptTxLike,
} from '../receiptCoverage';

const YEAR = 2026;

/* Fixtures shaped like each entry path's stored rows (pre-law). */
const PATHS: Record<string, ReceiptTxLike> = {
  // POS with 80G requested: number stored in taxReceiptNumber.
  pos80G: {
    type: 'Income', devoteeId: 'dev-1', devoteeName: 'Rina Das',
    is80GEligible: true, taxReceiptNumber: 'SB-CHANDA-2026-0007',
    referenceNo: 'SB-CHANDA-2026-0007',
  },
  // POS plain chanda: printed SB-CHANDA number, stored ONLY in referenceNo.
  posPlain: {
    type: 'Income', devoteeName: 'Sanatani Devotee',
    is80GEligible: false, referenceNo: 'SB-CHANDA-2026-0009',
  },
  // POS plain chanda where the print number never reached the record.
  posUntransferred: {
    type: 'Income', devoteeName: 'Walk-in Donor', is80GEligible: false,
  },
  // Bahi-Khata committed donation line (name-keyed, no number).
  bahiKhata: {
    type: 'Income', devoteeName: 'Gayatri Devi', is80GEligible: false,
  },
  // Manual desk voucher, 80G-marked (the old law auto-numbered these).
  manual80G: { type: 'Income', devoteeName: 'Rajesh Agrawal', is80GEligible: true },
  // Manual desk voucher, general donation.
  manualGeneral: {
    type: 'Income', devoteeId: 'dev-9', devoteeName: 'Meera Nair',
    is80GEligible: false,
  },
  // Booking dakshina auto-log (addPoojaBooking -> addTreasuryTransaction).
  bookingDakshina: {
    type: 'Income', devoteeName: 'Arjun Deshmukh', is80GEligible: true,
  },
  // Goshala sponsorship / campaign auto-logs.
  suiteAutoLog: {
    type: 'Income', devoteeName: 'Lakshmi Venkat', is80GEligible: false,
  },
  // Anonymous hundi total — no donor attached, by design.
  hundiAnonymous: { type: 'Income', is80GEligible: false },
  // An expense (receipts never apply).
  expense: { type: 'Expense', devoteeName: 'Vendor', is80GEligible: false },
};

describe('coverage classification of stored rows', () => {
  it('POS 80G and POS plain (number in referenceNo) are covered', () => {
    expect(receiptCoverageFor(PATHS.pos80G)).toBe('covered');
    expect(receiptCoverageFor(PATHS.posPlain)).toBe('covered');
    expect(receiptNumberFor(PATHS.posPlain)).toBe('SB-CHANDA-2026-0009');
  });

  it('a UPI reference in referenceNo is NOT mistaken for a receipt number', () => {
    const tx: ReceiptTxLike = {
      type: 'Income', devoteeName: 'Donor', referenceNo: 'UPI/123456789012',
    };
    expect(receiptCoverageFor(tx)).toBe('missing');
    expect(receiptNumberFor(tx)).toBeNull();
  });

  it('pre-law donor rows without any number are honestly missing', () => {
    expect(receiptCoverageFor(PATHS.posUntransferred)).toBe('missing');
    expect(receiptCoverageFor(PATHS.bahiKhata)).toBe('missing');
    expect(receiptCoverageFor(PATHS.manualGeneral)).toBe('missing');
    expect(receiptCoverageFor(PATHS.suiteAutoLog)).toBe('missing');
  });

  it('anonymous income is anonymous; expenses are not-income', () => {
    expect(receiptCoverageFor(PATHS.hundiAnonymous)).toBe('anonymous');
    expect(receiptCoverageFor(PATHS.expense)).toBe('not-income');
  });
});

describe('the assignment law at the commit point', () => {
  const existing = ['SB-CHANDA-2026-0009', 'SB-80G-2026-0003'];

  it('every donor-attached income fixture ends covered', () => {
    for (const [name, tx] of Object.entries(PATHS)) {
      if (tx.type !== 'Income') continue;
      if (name === 'hundiAnonymous') continue;
      const assigned = assignReceiptNumber(tx, existing, YEAR);
      const after: ReceiptTxLike = { ...tx, taxReceiptNumber: assigned ?? tx.taxReceiptNumber };
      expect([name, receiptCoverageFor(after)]).toEqual([name, 'covered']);
    }
  });

  it('anonymous income gets NO number (honest state, not a fabricated receipt)', () => {
    expect(assignReceiptNumber(PATHS.hundiAnonymous, existing, YEAR)).toBeUndefined();
  });

  it('expenses get no number', () => {
    expect(assignReceiptNumber(PATHS.expense, existing, YEAR)).toBeUndefined();
  });

  it('a caller-provided number always wins (POS print parity)', () => {
    expect(assignReceiptNumber(PATHS.pos80G, existing, YEAR)).toBe('SB-CHANDA-2026-0007');
  });

  it('POS print-first: a parseable SB referenceNo is adopted, not duplicated', () => {
    expect(assignReceiptNumber(PATHS.posPlain, existing, YEAR)).toBe('SB-CHANDA-2026-0009');
  });

  it('80G-eligible income takes the next SB-80G sequence', () => {
    expect(assignReceiptNumber(PATHS.manual80G, existing, YEAR)).toBe('SB-80G-2026-0004');
    expect(assignReceiptNumber(PATHS.bookingDakshina, existing, YEAR)).toBe('SB-80G-2026-0004');
  });

  it('general donor income takes the next SB-CHANDA sequence', () => {
    expect(assignReceiptNumber(PATHS.bahiKhata, existing, YEAR)).toBe('SB-CHANDA-2026-0010');
    expect(assignReceiptNumber(PATHS.manualGeneral, existing, YEAR)).toBe('SB-CHANDA-2026-0010');
  });

  it('windowed cached next-sequences win over the visible window', () => {
    expect(
      assignReceiptNumber(PATHS.bahiKhata, existing, YEAR, { 'SB-CHANDA': 42 })
    ).toBe('SB-CHANDA-2026-0042');
    expect(
      assignReceiptNumber(PATHS.manual80G, existing, YEAR, { 'SB-80G': 11 })
    ).toBe('SB-80G-2026-0011');
  });

  it('a full ledger audit after assignment: missing = 0', () => {
    const after = Object.values(PATHS).map((tx) => ({
      ...tx,
      taxReceiptNumber: assignReceiptNumber(tx, existing, YEAR) ?? tx.taxReceiptNumber,
    }));
    const counts = auditReceiptCoverage(after);
    expect(counts.missing).toBe(0);
    expect(counts.anonymous).toBe(1); // the hundi total, honestly
    expect(counts.covered).toBe(8); // every other income fixture
    expect(counts.notIncome).toBe(1);
  });
});
