/**
 * proSubscription.ts — Purohit / Jyotishi Pro subscription truth (pure).
 * ========================================================================
 * QUEUED #23 (2026-10-20). Pro (₹199 · ৳280 · $2.50/mo) existed as pricing
 * and as a reader (`getProviderTier` in firestoreAdmin.ts) but could never
 * actually be bought into effect:
 *
 *   - `claimApprove` wrote the subscription to `subscriptions/{workspaceId}`
 *     with planId verbatim from the claim ('PUROHIT_PRO'), while
 *     `getProviderTier` reads `subscriptions/{providerUid}` and expects
 *     planId 'purohit_pro' / 'jyotishi_pro'. Key AND value both missed.
 *   - Solo providers file claims with workspaceId 'personal', so every
 *     solo approval overwrote ONE shared doc — subscriptions/personal.
 *
 * TIER-STORAGE DECISION: the canonical home of an individual's Pro
 * subscription is `subscriptions/{providerUid}` — exactly where
 * `getProviderTier` already reads. It needs the least new machinery
 * (zero reader moves), it can never collide between users, and the
 * subscriptions rules already treat the doc id as the scope key
 * (create/update = owner-only, which claimApprove satisfies). Org plans
 * keep living at `subscriptions/{workspaceId}` untouched.
 *
 * This module is the pure core: plan-id normalization, the doc shape
 * claimApprove writes, and the tier verdict. Zero Firebase imports.
 */

/** Canonical planId stored on a Pro subscription doc. */
export const PRO_PLAN_ID = 'purohit_pro';

/** Every planId that means "individual Pro" (either professional kind). */
export const PRO_PLAN_IDS = ['purohit_pro', 'jyotishi_pro'] as const;

/**
 * Is this plan identifier a Pro plan? Accepts the claim-flow tier id
 * ('PUROHIT_PRO'), the stored ids ('purohit_pro' / 'jyotishi_pro'), and
 * any case variation — claims and seeds have used all of them.
 */
export function isProPlanId(planId: string | null | undefined): boolean {
  if (!planId) return false;
  const p = String(planId).trim().toLowerCase();
  return p === 'purohit_pro' || p === 'jyotishi_pro' || p === 'purohit pro';
}

/**
 * Normalize a Pro plan identifier to its stored form.
 * 'PUROHIT_PRO' (the SubscriptionTier id claims carry) → 'purohit_pro';
 * a jyotishi-specific id keeps its identity. Non-Pro input → ''.
 */
export function normalizeProPlanId(planId: string | null | undefined): string {
  if (!planId) return '';
  const p = String(planId).trim().toLowerCase();
  if (p === 'jyotishi_pro') return 'jyotishi_pro';
  if (p === 'purohit_pro' || p === 'purohit pro') return 'purohit_pro';
  return '';
}

/** Does this subscriptions doc describe an individual Pro subscription? */
export function isProSubscriptionDoc(
  data: { planId?: unknown; kind?: unknown } | null | undefined,
): boolean {
  if (!data) return false;
  return data.kind === 'pro' || isProPlanId(typeof data.planId === 'string' ? data.planId : null);
}

/**
 * The tier verdict for one subscriptions doc — the pure heart of
 * `getProviderTier`. 'pro' only when ALL hold:
 *   - the doc exists and is a Pro plan (see isProSubscriptionDoc)
 *   - status is 'active'
 *   - endDate is absent (no expiry recorded) or still in the future
 *   - if the doc carries a providerUid, it names the expected provider
 *     (defends against a mis-keyed doc granting the wrong person Pro)
 * Anything else is 'community'. Fail-closed on data, fail-open at the
 * I/O layer (a read error resolves to 'community' there, as before).
 */
export function providerTierFromSubscription(
  data: Record<string, unknown> | null | undefined,
  expectedUid: string,
  now: Date = new Date(),
): 'pro' | 'community' {
  if (!data) return 'community';
  if (!isProSubscriptionDoc(data as { planId?: unknown; kind?: unknown })) return 'community';
  if (data.status !== 'active') return 'community';
  if (typeof data.providerUid === 'string' && data.providerUid && data.providerUid !== expectedUid) {
    return 'community';
  }
  const end = typeof data.endDate === 'string' ? new Date(data.endDate) : null;
  if (end && !Number.isNaN(end.getTime()) && end.getTime() <= now.getTime()) return 'community';
  return 'pro';
}

/** The claim fields claimApprove needs (structural subset of a claim doc). */
export interface ProClaimLike {
  applicantUid?: string;
  plan?: string;
  method?: string;
  transactionId?: string;
}

/**
 * Build the subscriptions/{providerUid} document for an approved Pro
 * claim. The doc id (the provider's uid) is the key; providerUid and
 * workspaceId both record it so every existing reader (GodMode list,
 * expiry helpers, tenant-shaped queries) sees a coherent doc.
 * Caller adds updatedAt (serverTimestamp) at write time.
 */
export function buildProSubscriptionDoc(
  claim: ProClaimLike,
  start: Date,
  end: Date,
): Record<string, unknown> {
  const providerUid = claim.applicantUid || '';
  return {
    providerUid,
    workspaceId: providerUid,
    kind: 'pro',
    planId: normalizeProPlanId(claim.plan) || PRO_PLAN_ID,
    status: 'active',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    paymentMethod: claim.method || '',
    transactionId: claim.transactionId || '',
  };
}

/** GodMode-facing label distinguishing the two subscription families. */
export function subscriptionKindLabel(
  data: { planId?: unknown; kind?: unknown } | null | undefined,
): 'Pro (individual)' | 'Organisation plan' {
  return isProSubscriptionDoc(data) ? 'Pro (individual)' : 'Organisation plan';
}
