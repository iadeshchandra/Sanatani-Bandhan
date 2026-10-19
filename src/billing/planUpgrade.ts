/**
 * billing/planUpgrade.ts — pure logic for the self-serve PlanUpgradeFlow.
 * ========================================================================
 * Claim validation, amount matching, duplicate prevention, price resolution.
 * All pure functions — fully testable, zero Firebase imports.
 */

import { PLAN_PRICING, type SubscriptionTier } from '../config/planPricing';

/** Plans a user can upgrade to (SEVA is free — never shown as an upgrade target). */
export const UPGRADEABLE_TIERS: SubscriptionTier[] = ['STANDARD', 'PREMIUM', 'PUROHIT_PRO'];

export type BillingPeriod = 'monthly' | 'annual';
export type PayRegionId = 'BD' | 'IN' | 'INTL';

/**
 * Months of subscription a billing period grants.
 * ==========================================================================
 * AUDIT FIX #4 (2026-10-19): `claimApprove` checked `period === 'yearly'`,
 * but PlanUpgradeFlow writes `BillingPeriod` = 'monthly' | 'annual' — so
 * annual payers silently received 1-month subscriptions. This is the single
 * source of truth: 'monthly' → 1, 'annual' → 12, legacy 'yearly' → 12,
 * anything unrecognized → 1 (conservative — never grant time on bad data).
 */
export function subscriptionMonthsForPeriod(period: string | undefined | null): number {
  if (period === 'annual' || period === 'yearly') return 12;
  return 1;
}

/** Resolve the price for a tier + period + region. */
export function planPrice(tier: SubscriptionTier, period: BillingPeriod, region: string): { amount: number; currency: string; symbol: string } {
  const cfg = PLAN_PRICING[tier];
  const r = region.toUpperCase();
  if (r === 'BD') {
    return { amount: period === 'monthly' ? cfg.regionalPrices.bdt.monthly : cfg.regionalPrices.bdt.annual, currency: 'BDT', symbol: '৳' };
  }
  if (r === 'IN') {
    return { amount: period === 'monthly' ? cfg.regionalPrices.inr.monthly : cfg.regionalPrices.inr.annual, currency: 'INR', symbol: '₹' };
  }
  return { amount: period === 'monthly' ? cfg.regionalPrices.usd.monthly : cfg.regionalPrices.usd.annual, currency: 'USD', symbol: '$' };
}

/** Format a price for display. */
export function formatPrice(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

export interface ClaimDraft {
  plan: SubscriptionTier;
  period: BillingPeriod;
  method: string;
  transactionId: string;
  amount: number;
  currency: string;
  senderInfo: string;
  notes: string;
}

export interface ClaimValidation {
  ok: boolean;
  errors: Partial<Record<'transactionId' | 'amount' | 'method' | 'senderInfo', string>>;
  /** Non-blocking warning when the entered amount differs from the plan price. */
  amountMismatch: boolean;
  expectedAmount: number;
}

/**
 * Validate a claim draft. TrxID required (min 6 chars), method required,
 * amount must be a positive number. Amount mismatch is a WARNING, not a
 * blocker — users sometimes pay rounded amounts or include fees.
 */
export function validateClaim(draft: ClaimDraft, region: string): ClaimValidation {
  const errors: ClaimValidation['errors'] = {};
  const expected = planPrice(draft.plan, draft.period, region);

  const trx = draft.transactionId.trim();
  if (!trx) errors.transactionId = 'Transaction ID is required.';
  else if (trx.length < 6) errors.transactionId = 'Transaction ID looks too short — please double-check.';

  if (!draft.method.trim()) errors.method = 'Please choose how you paid.';

  if (!draft.amount || draft.amount <= 0 || !Number.isFinite(draft.amount)) {
    errors.amount = 'Please enter the amount you paid.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    amountMismatch: !errors.amount && draft.amount !== expected.amount,
    expectedAmount: expected.amount,
  };
}

/**
 * Check for a duplicate pending claim. Returns true if the user already has
 * a pending claim for the same plan+period — they should wait, not re-submit.
 */
export function hasDuplicatePendingClaim(
  existingClaims: Array<{ plan: string; period: string; status: string }>,
  plan: SubscriptionTier,
  period: BillingPeriod,
): boolean {
  return existingClaims.some(
    (c) => c.status === 'pending' && c.plan === plan && c.period === period,
  );
}

/** Build the Firestore document for a new claim. Caller adds serverTimestamp. */
export function buildClaimDoc(draft: ClaimDraft, opts: {
  applicantUid: string;
  workspaceId: string;
  workspaceName: string;
}): Record<string, unknown> {
  return {
    applicantUid: opts.applicantUid,
    workspaceId: opts.workspaceId,
    workspaceName: opts.workspaceName,
    plan: draft.plan,
    period: draft.period,
    method: draft.method.trim(),
    transactionId: draft.transactionId.trim(),
    amount: draft.amount,
    currency: draft.currency,
    senderInfo: draft.senderInfo.trim().slice(0, 200),
    notes: draft.notes.trim().slice(0, 500),
    status: 'pending',
  };
}

/** Payment method shape (subset of the paymentMethods collection docs). */
export interface PaymentMethodInfo {
  id: string;
  region: string;
  label: string;
  type: string;
  number?: string;
  qrImageUrl?: string;
  instructionsEn: string[];
  instructionsBn: string[];
  enabled: boolean;
}

/** Filter payment methods to the user's region (enabled only). Falls back to all enabled if none match. */
export function methodsForRegion(methods: PaymentMethodInfo[], region: string): PaymentMethodInfo[] {
  const r = region.toUpperCase();
  const regional = methods.filter((m) => m.enabled && m.region.toUpperCase() === r);
  if (regional.length > 0) return regional;
  return methods.filter((m) => m.enabled);
}

/** Pick instruction lines by language. */
export function methodInstructions(m: PaymentMethodInfo, lang: string): string[] {
  if (lang === 'bn' && m.instructionsBn.length > 0) return m.instructionsBn;
  return m.instructionsEn;
}
