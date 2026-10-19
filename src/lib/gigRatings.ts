/**
 * lib/gigRatings.ts — Pure rating logic (Step 7).
 * =================================================
 * Kept free of Firebase imports so every function is unit-testable
 * under plain jest. The Firestore transaction lives in marketplace.ts
 * (submitGigRating) and MUST keep its average formula in sync with
 * nextAvg() here — pinned by test.
 */

/** Validate a blessing submission. Returns human-readable errors. */
export function validateRating(rating: number, review: string): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    errors.push('Please choose 1 to 5 blessings.');
  if ((review || '').length > 500)
    errors.push('Your message is a little long — 500 characters max.');
  return errors;
}

/**
 * Running-average update. Mirrors the submitGigRating transaction:
 * newAvg = round(((oldAvg * oldCount + rating) / newCount) * 10) / 10.
 */
export function nextAvg(
  oldAvg: number, oldCount: number, rating: number
): { avg: number; count: number } {
  const newCount = oldCount + 1;
  const newAvg = Math.round(((oldAvg * oldCount + rating) / newCount) * 10) / 10;
  return { avg: newAvg, count: newCount };
}

/** Order statuses that may receive blessings. */
export function canRateStatus(status: string): boolean {
  return status === 'completed';
}

/** The exact fields the gigRatings rules whitelist on create. */
export const GIG_RATING_FIELDS = [
  'gigId', 'orderId', 'clientUid', 'providerUid', 'rating', 'review', 'createdAt',
] as const;
