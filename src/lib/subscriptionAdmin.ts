/**
 * subscriptionAdmin.ts — owner subscription housekeeping (pure).
 * ========================================================================
 * QUEUED #24 (2026-10-20). Plan STATUS is derived at read
 * (subscriptionExpiry.ts: endDate + 7-day grace → 'expired'), but nothing
 * ever EXECUTES the flip: a lapsed doc keeps stored status 'active'
 * forever. Two readers trust the stored field, so the lie has teeth:
 *   - GodMode insights count/MRR query `where('status','==','active')`
 *     → lapsed plans inflate the platform's revenue picture;
 *   - the Pro tier verdict (proSubscription.providerTierFromSubscription)
 *     keys off status === 'active'.
 * Org plan CAPS are date-derived (planLimits), so flipping the stored
 * status never breaks the grace promise — it only makes the record true.
 *
 * "Due" definition (deliberate): derived status 'expired' — endDate AND
 * the full 7-day grace are past — AND stored status still 'active'.
 * Grace-period docs are NOT swept: grace is a promised benefit (org caps
 * stay paid through it), and a housekeeping sweep must never shorten it.
 *
 * Zero Firebase imports — the scan/extend math is fully unit-testable;
 * firestoreAdmin.ts performs the writes + audit.
 */
import {
  getSubscriptionStatus,
  type SubscriptionLike,
} from './subscriptionExpiry';
import { isProSubscriptionDoc } from './proSubscription';

const DAY_MS = 86400000;

/** A subscriptions doc as the admin layer sees it (doc id + fields). */
export interface SubscriptionAdminDoc extends SubscriptionLike {
  id: string;
  kind?: unknown;
  providerUid?: string | null;
  workspaceId?: string | null;
}

/** One row of the "expire due" dry-run preview. */
export interface DueSubscription {
  id: string;
  planId: string;
  kind: 'pro' | 'org';
  /** Who the subscription belongs to: providerUid (Pro) / workspaceId (org). */
  subject: string;
  /** Normalized ISO endDate (null when unparseable — such docs are never due). */
  endDate: string | null;
  /** Whole days since endDate passed (grace already included in dueness). */
  daysOverdue: number;
}

/** Stored status, normalized: a missing status means 'active' (every
 *  writer — claimApprove, seeds — sets it; legacy docs predate nothing). */
export function storedStatusOf(sub: SubscriptionLike | null | undefined): string {
  const s = typeof sub?.status === 'string' ? sub.status.trim().toLowerCase() : '';
  return s || 'active';
}

function endDateMs(sub: SubscriptionLike): number | null {
  const e = sub.endDate;
  if (e == null || e === '') return null;
  if (typeof e === 'number') return Number.isFinite(e) ? e : null;
  const t = Date.parse(e);
  return Number.isFinite(t) ? t : null;
}

/**
 * Pure: is this subscription due for the owner expiry sweep?
 * True only when the paid period AND grace are fully past (derived
 * 'expired') while the stored status still claims 'active'. Already
 * 'expired'/'cancelled' docs are false — the sweep is idempotent.
 */
export function isDueForExpiry(
  sub: SubscriptionAdminDoc | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!sub) return false;
  if (storedStatusOf(sub) !== 'active') return false;
  return getSubscriptionStatus(sub, nowMs) === 'expired';
}

/**
 * Pure: scan a list of subscription docs → the due preview rows,
 * most overdue first. Pro docs (kind:'pro' or a Pro planId) are
 * classified distinctly — their doc id is a person, not a workspace.
 */
export function findDueSubscriptions(
  subs: readonly SubscriptionAdminDoc[],
  nowMs: number = Date.now(),
): DueSubscription[] {
  const due: DueSubscription[] = [];
  for (const s of subs) {
    if (!isDueForExpiry(s, nowMs)) continue;
    const end = endDateMs(s);
    const pro = isProSubscriptionDoc(s as { planId?: unknown; kind?: unknown });
    due.push({
      id: s.id,
      planId: typeof s.planId === 'string' && s.planId ? s.planId : '—',
      kind: pro ? 'pro' : 'org',
      subject:
        (pro ? s.providerUid : s.workspaceId) ||
        s.workspaceId ||
        s.providerUid ||
        s.id,
      endDate: end != null ? new Date(end).toISOString() : null,
      daysOverdue: end != null ? Math.max(0, Math.floor((nowMs - end) / DAY_MS)) : 0,
    });
  }
  return due.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export const MIN_EXTEND_MONTHS = 1;
export const MAX_EXTEND_MONTHS = 60;

/**
 * Pure: endDate + N months → new ISO endDate (same JS Date month math
 * claimApprove uses, so an extension lands exactly where a renewal of
 * that length would). Null when months is not a whole 1..60 or the
 * endDate is missing/unparseable (a lifetime doc has nothing to extend).
 */
export function extendedEndDateIso(
  endDate: string | number | null | undefined,
  months: number,
): string | null {
  if (!Number.isFinite(months) || Math.floor(months) !== months) return null;
  if (months < MIN_EXTEND_MONTHS || months > MAX_EXTEND_MONTHS) return null;
  const probe: SubscriptionLike = { endDate: endDate ?? null };
  const ms = endDateMs(probe);
  if (ms == null) return null;
  const d = new Date(ms);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/** The stored flip the expiry sweep / expire-now writes (caller adds updatedAt). */
export function buildExpireUpdate(nowIso: string): { status: 'expired'; expiredAt: string } {
  return { status: 'expired', expiredAt: nowIso };
}

/**
 * Pure: the update an owner extension writes — new endDate, status back
 * to 'active' (extending an expired doc IS reactivating it; the Fix #4
 * corrections depend on that), and the stale expiredAt stamp cleared.
 * Null when the doc has no extendable endDate.
 */
export function buildExtendUpdate(
  sub: SubscriptionLike | null | undefined,
  months: number,
): { endDate: string; status: 'active'; expiredAt: null } | null {
  if (!sub) return null;
  const endDate = extendedEndDateIso(sub.endDate, months);
  if (!endDate) return null;
  return { endDate, status: 'active', expiredAt: null };
}
