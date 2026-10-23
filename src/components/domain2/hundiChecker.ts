/**
 * hundiChecker.ts — maker-checker comparison for the legacy Hundi
 * Counting desk (HundiCountingAuditDesk).
 * ============================================================================
 * GAP THIS CLOSES: the legacy desk's "Review & Co-Sign" step was a
 * visual review only — the same counts the maker typed were posted
 * after a scroll-past. The Cash Custody suite (src/cashcustody) does
 * maker-checker properly: an independent second count, per-denomination
 * comparison, and no close until mismatches are resolved. This module
 * is the pure comparison core the legacy desk's review step now gates
 * on, kept free of React so it is unit-testable:
 *
 *   - both totals are computed from the two count maps independently;
 *   - every denomination whose piece counts differ is reported;
 *   - `matches` is true only when every denomination agrees (a total
 *     can coincide while the mix is wrong — mix is what the bank
 *     deposit is made of, so mix is what is checked).
 */

export interface DenominationMismatch {
  key: string;
  maker: number;
  checker: number;
}

export interface CheckerComparison {
  mismatches: DenominationMismatch[];
  makerTotal: number;
  checkerTotal: number;
  matches: boolean;
  /** True when the checker has entered at least one piece — an empty
   *  checker grid is "not yet counted", not a mismatch to resolve. */
  checkerStarted: boolean;
}

/**
 * Compare two denomination count maps.
 * @param maker   piece counts from the first counter
 * @param checker piece counts from the independent verifier
 * @param values  ₹ value per denomination key (coins keyed e.g. '5_COIN')
 */
export function compareDenominationCounts(
  maker: Record<string, number>,
  checker: Record<string, number>,
  values: Record<string, number>
): CheckerComparison {
  const keys = new Set<string>([
    ...Object.keys(values),
    ...Object.keys(maker),
    ...Object.keys(checker),
  ]);
  const mismatches: DenominationMismatch[] = [];
  let makerTotal = 0;
  let checkerTotal = 0;
  let checkerStarted = false;

  for (const key of keys) {
    const m = Math.max(0, Math.floor(Number(maker[key]) || 0));
    const c = Math.max(0, Math.floor(Number(checker[key]) || 0));
    const v = Number(values[key]) || 0;
    makerTotal += m * v;
    checkerTotal += c * v;
    if (c > 0) checkerStarted = true;
    if (m !== c) mismatches.push({ key, maker: m, checker: c });
  }

  return {
    mismatches,
    makerTotal,
    checkerTotal,
    matches: mismatches.length === 0,
    checkerStarted,
  };
}

/**
 * Posting gate for the review step, mirroring the custody suite's law
 * and this desk's existing seal-tamper rule:
 *   - checker has not counted yet            → blocked ('not-counted')
 *   - counts match                            → allowed
 *   - counts differ AND a discrepancy note of at least `minNoteLength`
 *     characters documents the resolution     → allowed ('note')
 *   - counts differ, note too short           → blocked ('unresolved')
 */
export type CheckerGate =
  | { allowed: true; via: 'match' | 'note' }
  | { allowed: false; reason: 'not-counted' | 'unresolved' };

export function checkerPostingGate(
  comparison: CheckerComparison,
  discrepancyNote: string,
  minNoteLength = 20
): CheckerGate {
  if (!comparison.checkerStarted) return { allowed: false, reason: 'not-counted' };
  if (comparison.matches) return { allowed: true, via: 'match' };
  if ((discrepancyNote || '').trim().length >= minNoteLength) {
    return { allowed: true, via: 'note' };
  }
  return { allowed: false, reason: 'unresolved' };
}
