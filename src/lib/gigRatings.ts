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

/* =====================================================================
 * QUEUED #22 — silo reconciliation (service cards ↔ marketplaceGigs).
 * =====================================================================
 * Both listing surfaces book into the SAME marketplaceOrders collection,
 * but Seva Bazar orders carry `gigId: ''` plus a `sevaBazar` extension —
 * there is no gig doc to hang an aggregate on. Ratings therefore anchor
 * to the PROVIDER (every gigRatings doc already carries providerUid,
 * and the rules' create whitelist permits it: the server checks only
 * the order's status + clientUid). Gig orders keep their gig aggregate;
 * gig-less orders write the rating doc alone, and provider-wide trust
 * is a READ MODEL over gigRatings — no migration, no new collection.
 */

export type RatingTarget =
  | { kind: 'gig'; gigId: string }
  | { kind: 'provider' };

/**
 * Where should a completed order's blessing aggregate?
 * A real gigId → the gig doc. A Seva Bazar order (empty gigId, or the
 * `sevaBazar` extension present) → the provider alone.
 */
export function ratingTargetForOrder(order: {
  gigId?: unknown;
  sevaBazar?: unknown;
}): RatingTarget {
  const gigId = typeof order?.gigId === 'string' ? order.gigId.trim() : '';
  if (gigId && !order?.sevaBazar) return { kind: 'gig', gigId };
  return { kind: 'provider' };
}

/**
 * Build the gigRatings doc body (minus createdAt, which the writer sets
 * via serverTimestamp). Keys are EXACTLY the rules whitelist — a stray
 * key makes the create fail closed.
 */
export function buildRatingDoc(input: {
  gigId: string;
  orderId: string;
  clientUid: string;
  providerUid: string;
  rating: number;
  review: string;
}): {
  gigId: string;
  orderId: string;
  clientUid: string;
  providerUid: string;
  rating: number;
  review: string;
} {
  return {
    gigId: input.gigId,
    orderId: input.orderId,
    clientUid: input.clientUid,
    providerUid: input.providerUid,
    rating: input.rating,
    review: (input.review || '').trim().slice(0, 500),
  };
}

export interface BlessingsSummary {
  /** Mean rating, 1 decimal; 0 when no blessings yet. */
  avg: number;
  /** Total blessings (ratings) counted. */
  count: number;
  /** How many carried a written message. */
  writtenCount: number;
}

/**
 * Provider-wide blessings summary over rating rows from BOTH silos
 * (gig orders and seva-notice orders alike — every row carries
 * providerUid). Invalid rows are ignored, never fatal.
 */
export function summarizeBlessings(
  ratings: Array<{ rating?: unknown; review?: unknown }>
): BlessingsSummary {
  let sum = 0;
  let count = 0;
  let writtenCount = 0;
  for (const r of ratings || []) {
    const v = Number(r?.rating);
    if (!Number.isFinite(v) || v < 1 || v > 5) continue;
    sum += v;
    count += 1;
    if (typeof r?.review === 'string' && r.review.trim()) writtenCount += 1;
  }
  return {
    avg: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
    count,
    writtenCount,
  };
}
