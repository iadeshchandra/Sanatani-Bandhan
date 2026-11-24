/**
 * staffMoneyNotify.ts — NOTIFICATION WAVE 2: pure picking for the
 * staff money events (DESIGN §2.1).
 * =====================================================================
 * The service half (staffMoneyNotifyService) watches the money
 * collections the reader's own role may already read; this half is
 * the decision logic — no IO, no clock beyond the `now` it is
 * handed — fully unit-testable, in the approvalNotify /
 * ticketDipNotify house shape.
 *
 * What honestly exists in the data layer (verified at build time):
 *  - `payouts` — marketplace provider payouts. A payout the owner
 *    could not settle lands at status 'rejected'. The doc is
 *    provider-scoped (rules: the provider reads only their own), so
 *    this news can only ever reach the maker themselves.
 *  - `paymentClaims` — plan payment claims, workspace-scoped and
 *    readable by the applicant + the workspace's FINANCE roles.
 *    A rejected claim is the workspace-side settlement failure.
 *  - `treasury` — the append-only ledger, readable by OVERSIGHT
 *    roles. A large Income row is news the day it is recorded.
 *  - `subscriptions/{workspaceId}` — the org plan's period. Its
 *    derived status (lib/subscriptionExpiry) drives the plan stages.
 * What does NOT exist: a post-approval treasury payout execution
 * record — an approved payout that later fails at the bank is
 * recorded nowhere (see NOTES.md, gap G-W2-1).
 */
import { DEFAULT_PAYOUT_APPROVAL_THRESHOLD } from './approvals';
import {
  daysUntilExpiry,
  getSubscriptionStatus,
  GRACE_PERIOD_DAYS,
  type SubscriptionLike,
} from './subscriptionExpiry';

/* ------------------------------------------------------------------ */
/* Payout failures (mine) — state ledger, ticketDip discipline         */
/* ------------------------------------------------------------------ */

export interface PayoutLike {
  id: string;
  status?: string;
  amount?: number;
  currency?: string;
  providerUid?: string;
}

export interface PayoutFailureNotice {
  payout: PayoutLike;
  dedupeKey: string;
}

export function payoutDedupeKey(payoutId: string): string {
  return `payout:${payoutId}:failed`;
}

/** payoutId → last settled status. */
export type PayoutLedger = Record<string, string>;

/**
 * A payout is failure news exactly when it stands 'rejected' and
 * the ledger has not already settled that fact: first seen rejected
 * rings once (the desk may have shown it first — a result is news),
 * a change INTO rejected rings, the same rejected again is silence.
 */
export function pickPayoutFailures(
  payouts: readonly PayoutLike[],
  ledger: Readonly<PayoutLedger>,
): { notices: PayoutFailureNotice[]; settled: PayoutLedger } {
  const notices: PayoutFailureNotice[] = [];
  const settled: PayoutLedger = {};
  for (const p of payouts) {
    if (!p || !p.id || typeof p.status !== 'string') continue;
    settled[p.id] = p.status;
    if (p.status !== 'rejected') continue;
    if (ledger[p.id] === 'rejected') continue;
    notices.push({ payout: p, dedupeKey: payoutDedupeKey(p.id) });
  }
  return { notices, settled };
}

/* ------------------------------------------------------------------ */
/* Plan payment claims rejected — state ledger                         */
/* ------------------------------------------------------------------ */

export interface PaymentClaimLike {
  id: string;
  workspaceId?: string;
  workspaceName?: string;
  applicantUid?: string;
  plan?: string;
  period?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

export interface ClaimRejectionNotice {
  claim: PaymentClaimLike;
  dedupeKey: string;
}

export function claimDedupeKey(claimId: string): string {
  return `payclaim:${claimId}:rejected`;
}

/** claimId → last settled status. */
export type ClaimLedger = Record<string, string>;

/** Same discipline as payouts: a claim standing 'rejected' is news
 *  once — first sight or transition — then silence. */
export function pickClaimRejections(
  claims: readonly PaymentClaimLike[],
  ledger: Readonly<ClaimLedger>,
): { notices: ClaimRejectionNotice[]; settled: ClaimLedger } {
  const notices: ClaimRejectionNotice[] = [];
  const settled: ClaimLedger = {};
  for (const c of claims) {
    if (!c || !c.id || typeof c.status !== 'string') continue;
    settled[c.id] = c.status;
    if (c.status !== 'rejected') continue;
    if (ledger[c.id] === 'rejected') continue;
    notices.push({ claim: c, dedupeKey: claimDedupeKey(c.id) });
  }
  return { notices, settled };
}

/* ------------------------------------------------------------------ */
/* Large donations — append-only source, notified-set discipline       */
/* ------------------------------------------------------------------ */

/**
 * The "large" line for a recorded offering. DESIGN §2.1 sets it in
 * workspace settings with the maker–checker threshold as the
 * default — the same ₹10,000 at which a payout needs a second pair
 * of eyes (lib/approvals DEFAULT_PAYOUT_APPROVAL_THRESHOLD, with
 * the workspace's `makerCheckerPayoutThreshold` override resolved
 * by payoutApprovalThreshold). One named line for money in and
 * money out: a committee that must double-check ₹10,000 leaving
 * hears about ₹10,000 arriving.
 */
export const LARGE_DONATION_DEFAULT_THRESHOLD = DEFAULT_PAYOUT_APPROVAL_THRESHOLD;

export interface TreasuryTxLike {
  id: string;
  workspaceId?: string;
  type?: string;
  amount?: number;
  /** Practice-mode rows are rehearsals, never news. */
  isPractice?: boolean;
}

export function isLargeDonation(tx: TreasuryTxLike, threshold: number): boolean {
  if (!tx || tx.type !== 'Income') return false;
  if (tx.isPractice) return false;
  return typeof tx.amount === 'number' && Number.isFinite(tx.amount) && tx.amount >= threshold;
}

export function donationDedupeKey(txnId: string): string {
  return `txn:${txnId}`;
}

export interface LargeDonationNotice {
  tx: TreasuryTxLike;
  dedupeKey: string;
}

/**
 * The ledger is append-only, so a transaction is news when its id
 * has never been settled AND it clears the threshold. Below-threshold
 * rows are settled silently by the service (they join the weekly
 * digest's world, not a bell).
 */
export function pickLargeDonations(
  txs: readonly TreasuryTxLike[],
  notified: ReadonlySet<string>,
  threshold: number,
): LargeDonationNotice[] {
  const out: LargeDonationNotice[] = [];
  for (const tx of txs) {
    if (!tx || !tx.id) continue;
    const key = donationDedupeKey(tx.id);
    if (notified.has(key)) continue;
    if (!isLargeDonation(tx, threshold)) continue;
    out.push({ tx, dedupeKey: key });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Plan stages — derived at read (subscriptionExpiry), period-keyed    */
/* ------------------------------------------------------------------ */

/** Days before the period ends at which the renewal first speaks. */
export const PLAN_EXPIRY_NOTICE_DAYS = 7;

export type PlanStage = 'expiring' | 'grace' | 'expired';

export interface PlanStageNotice {
  stage: PlanStage;
  dedupeKey: string;
  /** Whole days until the period ends (negative once past). */
  daysLeft: number | null;
  /** Epoch ms of the period end — the stage's identity anchor. */
  endMs: number | null;
  /** When this stage's news stops meaning anything (outbox expiry):
   *  expiring → the period end; grace → the grace end; expired →
   *  none (the lapse stands until a renewal rewrites the period). */
  expiresAt?: number;
}

export function planDedupeKey(workspaceId: string, endMs: number, stage: PlanStage): string {
  return `plan:${workspaceId}:${endMs}:${stage}`;
}

function endMsOf(sub: SubscriptionLike): number | null {
  const e = sub.endDate;
  if (e == null || e === '') return null;
  if (typeof e === 'number') return Number.isFinite(e) ? e : null;
  const t = Date.parse(e);
  return Number.isFinite(t) ? t : null;
}

/**
 * The ONE stage a subscription speaks now, or null. Furthest stage
 * wins (a plan first seen already lapsed speaks 'expired', never a
 * stale 'expiring'). Suppression is structural (L4): the dedupe key
 * is keyed to the PERIOD (its endMs), so a renewal — which rewrites
 * endDate — makes every old stage key irrelevant, and a renewed
 * plan simply never matches a notice again.
 */
export function pickPlanStage(
  sub: SubscriptionLike | null | undefined,
  workspaceId: string,
  now: number,
): PlanStageNotice | null {
  if (!sub) return null;
  const status = getSubscriptionStatus(sub, now);
  if (status === 'none') return null;
  const endMs = endMsOf(sub);
  if (endMs === null) return null; // lifetime plan — nothing can lapse
  const daysLeft = daysUntilExpiry(sub, now);
  if (status === 'expired') {
    return { stage: 'expired', dedupeKey: planDedupeKey(workspaceId, endMs, 'expired'), daysLeft, endMs };
  }
  if (status === 'grace') {
    return {
      stage: 'grace',
      dedupeKey: planDedupeKey(workspaceId, endMs, 'grace'),
      daysLeft,
      endMs,
      expiresAt: endMs + GRACE_PERIOD_DAYS * 86_400_000,
    };
  }
  // active: speak only inside the notice window.
  if (daysLeft !== null && daysLeft <= PLAN_EXPIRY_NOTICE_DAYS && daysLeft >= 0) {
    return {
      stage: 'expiring',
      dedupeKey: planDedupeKey(workspaceId, endMs, 'expiring'),
      daysLeft,
      endMs,
      expiresAt: endMs,
    };
  }
  return null;
}
