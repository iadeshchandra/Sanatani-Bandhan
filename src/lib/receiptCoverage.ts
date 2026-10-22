/**
 * receiptCoverage.ts — Blueprint A, deliverable 4: a receipt for
 * 100% of donations (pure logic, no React, no Firebase).
 * ============================================================================
 * The research law (§2c): a donor-visible receipt for EVERY gift, not
 * only tax-threshold ones — amount, date, purpose, receipt number.
 *
 * The audit of the existing machinery found the number assignment
 * lived in exactly one place — DataContext.addTreasuryTransaction —
 * and it only assigned a number when the caller supplied one or the
 * voucher was 80G-eligible:
 *   - QuickChanda POS prints an SB-CHANDA number on every receipt but
 *     stored it only in `referenceNo`, and only copied it into
 *     `taxReceiptNumber` when 80G was requested — so a plain chanda
 *     record's canonical receipt field stayed empty;
 *   - manual desk vouchers, suite auto-logs (goshala sponsorship,
 *     annadanam, campaigns, booking dakshina) and Bahi-Khata commits
 *     that were not 80G-marked got NO number at all, even though a
 *     named donor gave the money.
 *
 * This module is the single assignment + coverage law, extracted pure
 * so the coverage test can enumerate fixtures from every entry path:
 *
 *   ASSIGNMENT (at the commit point, for a NEW Income record):
 *     1. a caller-provided taxReceiptNumber always wins (POS print
 *        parity — the printed number IS the stored number);
 *     2. an 80G-eligible record takes the next SB-80G number;
 *     3. any other DONOR-ATTACHED income record adopts a parseable
 *        SB-series number already carried in referenceNo (the POS
 *        print-first flow), else takes the next SB-CHANDA number;
 *     4. ANONYMOUS income (no devoteeId and no devoteeName — hundi
 *        totals, counter aggregates) takes NO number: there is no
 *        donor to give a receipt to, and inventing one would be a
 *        fabricated receipt. Its honest state is 'anonymous'.
 *     Expenses never take receipt numbers.
 *
 *   COVERAGE (for any stored record):
 *     'covered'   — Income with a donor and a receipt number
 *                   (taxReceiptNumber, or an SB-series referenceNo);
 *     'missing'   — Income with a donor but no number (legacy rows
 *                   written before this law; surfaced honestly in
 *                   the ledger, never silently back-filled with a
 *                   number that was never issued);
 *     'anonymous' — Income with no donor attached;
 *     'not-income'— Expense rows (receipts do not apply).
 */

import {
  formatReceiptNumber,
  nextReceiptSeq,
  parseReceiptNumber,
} from '../utils/receiptNumbers';

/** The receipt-relevant slice of a treasury record. */
export interface ReceiptTxLike {
  type?: string;
  devoteeId?: string | null;
  devoteeName?: string | null;
  is80GEligible?: boolean | null;
  taxReceiptNumber?: string | null;
  referenceNo?: string | null;
  /** Blueprint D — practice-mode row (lib/practiceMode). */
  isPractice?: boolean | null;
}

export type ReceiptCoverage =
  | 'covered'
  | 'missing'
  | 'anonymous'
  | 'not-income'
  /** Blueprint D: a practice row — no real receipt exists or is owed;
   *  it never consumes a sequence number and never counts as a
   *  coverage gap. */
  | 'practice';

/** A record has a donor when an id or a real name is attached. */
export function hasDonor(tx: ReceiptTxLike): boolean {
  if ((tx.devoteeId || '').trim()) return true;
  return !!(tx.devoteeName || '').trim();
}

/** The record's receipt number, wherever the entry path stored it. */
export function receiptNumberFor(tx: ReceiptTxLike): string | null {
  const own = (tx.taxReceiptNumber || '').trim();
  if (own) return own;
  const ref = (tx.referenceNo || '').trim();
  if (ref && parseReceiptNumber(ref)) return ref;
  return null;
}

export function receiptCoverageFor(tx: ReceiptTxLike): ReceiptCoverage {
  // Practice first: a practice row is not a real donation in ANY
  // state — it must never read as a coverage gap ('missing') and
  // never inflate the covered count.
  if (tx.isPractice === true) return 'practice';
  if (tx.type !== 'Income') return 'not-income';
  if (!hasDonor(tx)) return 'anonymous';
  return receiptNumberFor(tx) ? 'covered' : 'missing';
}

export interface ReceiptCoverageCounts {
  covered: number;
  missing: number;
  anonymous: number;
  notIncome: number;
  /** Blueprint D: practice rows, counted apart (never a gap). */
  practice: number;
}

export function auditReceiptCoverage(
  txs: readonly ReceiptTxLike[]
): ReceiptCoverageCounts {
  const counts: ReceiptCoverageCounts = {
    covered: 0,
    missing: 0,
    anonymous: 0,
    notIncome: 0,
    practice: 0,
  };
  for (const tx of txs) {
    const c = receiptCoverageFor(tx);
    if (c === 'not-income') counts.notIncome += 1;
    else counts[c] += 1;
  }
  return counts;
}

/**
 * The assignment law for a NEW record (see header). `existingNumbers`
 * are the workspace's stored receipt numbers; `cachedNext` carries
 * the windowed mode's server-prefetched next-sequence per series
 * (F2 receiptSeqCache) when available. Returns the number to store
 * in `taxReceiptNumber`, or undefined when the record honestly has
 * none (expense, or anonymous income).
 */
export function assignReceiptNumber(
  tx: ReceiptTxLike,
  existingNumbers: Array<string | undefined | null>,
  year: number,
  cachedNext?: { 'SB-80G'?: number; 'SB-CHANDA'?: number } | null
): string | undefined {
  // Blueprint D: practice rows take NO receipt number — a practice
  // donation must never consume a real sequence number (the sequence
  // is gap-detectable; a practice gap would read as a missing real
  // receipt) and must never carry a number a donor could mistake
  // for a real one. Even a caller-provided number is not stored.
  if (tx.isPractice === true) return undefined;
  if (tx.type !== 'Income') return undefined;
  const caller = (tx.taxReceiptNumber || '').trim();
  if (caller) return caller;
  if (tx.is80GEligible) {
    return formatReceiptNumber(
      'SB-80G',
      year,
      cachedNext?.['SB-80G'] ?? nextReceiptSeq(existingNumbers, 'SB-80G', year)
    );
  }
  if (!hasDonor(tx)) return undefined; // anonymous — honest no-receipt state
  const ref = (tx.referenceNo || '').trim();
  if (ref && parseReceiptNumber(ref)) return ref;
  return formatReceiptNumber(
    'SB-CHANDA',
    year,
    cachedNext?.['SB-CHANDA'] ?? nextReceiptSeq(existingNumbers, 'SB-CHANDA', year)
  );
}
