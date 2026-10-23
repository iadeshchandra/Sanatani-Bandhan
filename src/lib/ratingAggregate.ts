/**
 * ratingAggregate.ts — SECURITY P1 (Finding 1): anchored rating math.
 * ============================================================================
 * Pure logic (no Firebase) for the professional-profile aggregates
 * (purohits / jyotishProfiles). The formula is the same running average
 * the marketplace has always used (lib/gigRatings.nextAvg — one decimal
 * place), so stored values keep their meaning.
 *
 * THE ANCHOR LAW (enforced in firestore.rules, mirrored here so client
 * and rules can never drift): a profile's ratingAggregate/ratingCount
 * may change ONLY as the second half of a real review —
 *   · ratingCount rises by exactly 1;
 *   · the profile records `lastReviewId` = the review doc being added
 *     (deterministic id, one per party per gig/consultation, immutable);
 *   · the new average must be the running average of the old sum plus
 *     THAT review's rating, within the rounding tolerance below.
 * A client that wants a different average is denied by the rules, not
 * by politeness. This module computes the one legal next state.
 */

/** The one legal next aggregate after a new rating lands. */
export function nextProfileAggregate(
  oldAggregate: number,
  oldCount: number,
  rating: number
): { ratingAggregate: number; ratingCount: number } {
  const ratingCount = oldCount + 1;
  const ratingAggregate =
    Math.round(((oldAggregate * oldCount + rating) / ratingCount) * 10) / 10;
  return { ratingAggregate, ratingCount };
}

/**
 * Rounding tolerance the rules allow around the exact running sum.
 * The stored aggregate is rounded to 1dp, so the stored sum can drift
 * from the true sum by up to 0.05 per rating already counted, plus the
 * new rounding step. The tolerance covers exactly that drift — the
 * anchor (a real, unique review by the caller) is what carries the
 * security weight; this only absorbs honest rounding.
 */
export function aggregateSumTolerance(newCount: number): number {
  return 0.06 * newCount + 0.1;
}

/** True when (newAgg,newCount) is the legal successor of (oldAgg,oldCount) for `rating`. */
export function isLegalAggregateStep(
  oldAggregate: number,
  oldCount: number,
  newAggregate: number,
  newCount: number,
  rating: number
): boolean {
  if (newCount !== oldCount + 1) return false;
  const expected = nextProfileAggregate(oldAggregate, oldCount, rating);
  if (newAggregate !== expected.ratingAggregate) return false;
  const sumDelta = newAggregate * newCount - oldAggregate * oldCount;
  return Math.abs(sumDelta - rating) <= aggregateSumTolerance(newCount);
}
