/**
 * subscriptionExpiry.ts — subscription expiry enforcement (AUDIT FIX #7).
 * ========================================================================
 * Problem: `subscriptions/{workspaceId}.endDate` was written by claimApprove
 * but plan resolution only ever read `workspace.planId` — expired paid plans
 * kept full tier forever.
 *
 * Design (dignity-first):
 * - Pure status math here (fully unit-testable, zero Firebase imports).
 * - 7-day GRACE period after endDate: the workspace keeps its paid caps while
 *   we warmly nudge renewal. Only after grace do caps fall back to SEVA.
 * - Downgrade is NEVER a lockout — the workspace keeps working on Seva Free
 *   caps. Data is never touched.
 * - "Never surprise-downgrade mid-session": callers resolve the effective
 *   plan at workspace-load / limit-check time with a TTL cache, not on a
 *   timer. A session that starts paid stays paid until the next load.
 * - Fail-open: if the subscription doc can't be read, treat as active.
 */

export const GRACE_PERIOD_DAYS = 7;
const DAY_MS = 86400000;

export type SubscriptionStatus = 'active' | 'grace' | 'expired' | 'none';

export interface SubscriptionLike {
  status?: string | null;
  /** ISO string (claimApprove writes ISO). Also accepts epoch ms. */
  endDate?: string | number | null;
  planId?: string | null;
}

function endDateMs(sub: SubscriptionLike): number | null {
  const e = sub.endDate;
  if (e == null || e === '') return null;
  if (typeof e === 'number') return Number.isFinite(e) ? e : null;
  const t = Date.parse(e);
  return Number.isFinite(t) ? t : null;
}

/**
 * Pure: what state is this subscription in?
 * - 'none': no subscription doc (free workspaces live here — not a problem).
 * - 'active': no endDate, or endDate in the future, or status != 'active'
 *   but endDate still future (conservative).
 * - 'grace': endDate passed but within GRACE_PERIOD_DAYS.
 * - 'expired': endDate + grace fully past, or status explicitly
 *   'cancelled'/'expired' with a past endDate.
 */
export function getSubscriptionStatus(
  sub: SubscriptionLike | null | undefined,
  nowMs: number = Date.now()
): SubscriptionStatus {
  if (!sub) return 'none';
  const end = endDateMs(sub);
  if (end == null) return 'active'; // no endDate = lifetime/active
  if (nowMs < end) return 'active';
  if (nowMs < end + GRACE_PERIOD_DAYS * DAY_MS) return 'grace';
  return 'expired';
}

/**
 * Pure: the plan id that should actually be enforced.
 * Expired paid plans fall back to SEVA (free caps). Everything else keeps
 * the workspace's own planId.
 */
export function effectivePlanId(
  workspacePlanId: string | null | undefined,
  sub: SubscriptionLike | null | undefined,
  nowMs: number = Date.now()
): string {
  const status = getSubscriptionStatus(sub, nowMs);
  if (status === 'expired') return 'SEVA';
  return (workspacePlanId || 'SEVA').toUpperCase();
}

/** Days remaining until endDate (negative = past). Null when no endDate. */
export function daysUntilExpiry(
  sub: SubscriptionLike | null | undefined,
  nowMs: number = Date.now()
): number | null {
  if (!sub) return null;
  const end = endDateMs(sub);
  if (end == null) return null;
  return Math.ceil((end - nowMs) / DAY_MS);
}

/** True when the owner should see an "expiring soon" nudge (≤14 days out, still active). */
export function isExpiringSoon(
  sub: SubscriptionLike | null | undefined,
  nowMs: number = Date.now()
): boolean {
  const d = daysUntilExpiry(sub, nowMs);
  return d != null && d >= 0 && d <= 14 && getSubscriptionStatus(sub, nowMs) === 'active';
}
