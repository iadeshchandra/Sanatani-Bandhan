/**
 * revenueMetrics.ts — honest revenue numbers, derived from canonical pricing.
 * ===========================================================================
 * AUDIT FIX #8 (2026-10-19): the old MRR computation in firestoreAdmin.insights()
 * was fiction three ways —
 *   (a) planPrices() read `v.priceMonthly` but the seed writes `priceMonthlyINR`
 *       (plus BDT/USD) — so the read always missed and the fallback fired;
 *   (b) seeds use lowercase IDs ('standard') while subscriptions write UPPERCASE
 *       ('STANDARD') — so even a correct read would have missed the lookup;
 *   (c) the fallback was stale half-renamed tiers: { LITE: 0, STANDARD: 1499,
 *       ENTERPRISE: 4999 } — wrong names, wrong prices, PREMIUM missing entirely.
 * This module is the single source of truth for MRR. Everything is pure so it
 * is fully unit-testable; firestoreAdmin.insights() delegates to it.
 *
 * MRR currency: INR (the dashboard's reporting currency). Yearly plans count
 * at price/12 — a ₹4,999 annual Standard plan contributes ₹416.58 to MRR.
 */
import { PLAN_PRICING, type SubscriptionTier } from '../config/planPricing';

/** Legacy / half-renamed tier IDs mapped to canonical tiers. */
const LEGACY_TIER_MAP: Record<string, SubscriptionTier> = {
  LITE: 'SEVA',
  ENTERPRISE: 'PREMIUM',
};

/**
 * Normalize any plan identifier to a canonical SubscriptionTier.
 * Case-insensitive; legacy rename-landmine IDs map to their canonical tier.
 * Unknown IDs → null (callers treat as ₹0, honestly counted, never guessed).
 */
export function normalizePlanId(id: string | null | undefined): SubscriptionTier | null {
  if (!id) return null;
  const upper = String(id).toUpperCase().trim();
  if ((CANONICAL_MONTHLY_INR as Record<string, number>)[upper] !== undefined) {
    return upper as SubscriptionTier;
  }
  const legacy = LEGACY_TIER_MAP[upper];
  return legacy ?? null;
}

export type BillingCadence = 'monthly' | 'annual';

/** Price pair (INR) for a plan — monthly and annual, before cadence math. */
export interface PlanPricePair {
  monthly: number;
  annual: number;
}

/** Canonical price pairs, straight from locked planPricing. */
export const CANONICAL_PRICES: Record<SubscriptionTier, PlanPricePair> = {
  SEVA: { monthly: PLAN_PRICING.SEVA.price.monthly, annual: PLAN_PRICING.SEVA.price.annual },
  STANDARD: { monthly: PLAN_PRICING.STANDARD.price.monthly, annual: PLAN_PRICING.STANDARD.price.annual },
  PREMIUM: { monthly: PLAN_PRICING.PREMIUM.price.monthly, annual: PLAN_PRICING.PREMIUM.price.annual },
  PUROHIT_PRO: {
    monthly: PLAN_PRICING.PUROHIT_PRO.price.monthly,
    annual: PLAN_PRICING.PUROHIT_PRO.price.annual,
  },
};

/** Back-compat: canonical monthly prices. */
export const CANONICAL_MONTHLY_INR: Record<SubscriptionTier, number> = {
  SEVA: CANONICAL_PRICES.SEVA.monthly,
  STANDARD: CANONICAL_PRICES.STANDARD.monthly,
  PREMIUM: CANONICAL_PRICES.PREMIUM.monthly,
  PUROHIT_PRO: CANONICAL_PRICES.PUROHIT_PRO.monthly,
};

/** Monthly revenue equivalent of a price on a given cadence. */
export function monthlyEquivalent(price: number, cadence: BillingCadence): number {
  const p = Math.max(0, Number(price) || 0);
  return cadence === 'annual' ? p / 12 : p;
}

const DAY_MS = 86_400_000;

/**
 * Infer billing cadence from a subscription's start/end dates, because the
 * subscription doc shape (written by claimApprove) carries no period field.
 * ≥11 months duration → annual (covers 365-day and 12-calendar-month plans).
 * Anything shorter or unparseable → monthly (conservative, never inflates).
 */
export function inferCadence(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): BillingCadence {
  try {
    if (!startDate || !endDate) return 'monthly';
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'monthly';
    const months = (end - start) / DAY_MS / 30.4375;
    return months >= 11 ? 'annual' : 'monthly';
  } catch {
    return 'monthly';
  }
}

export interface MrrSubscriptionLike {
  planId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  /** Explicit cadence when the source has one (preferred over inference). */
  period?: string | null;
}

export interface MrrLine {
  planId: SubscriptionTier;
  count: number;
  /** Monthly price per subscription (already cadence-adjusted). */
  monthlyEach: number;
  monthlyTotal: number;
  cadence: BillingCadence;
}

export interface MrrResult {
  /** Total monthly recurring revenue, INR. */
  mrr: number;
  activeCount: number;
  lines: MrrLine[];
}

/**
 * Compute MRR from a list of active subscriptions.
 *
 * `prices` is an optional override map (e.g. owner-edited `plans` collection
 * docs); keys are matched case-insensitively after normalization. Missing or
 * unrecognized plans fall back to canonical pricing — never to stale values.
 * Annual subscriptions count at annual_price / 12 (not monthly / 12).
 */
export function computeMrr(
  subs: MrrSubscriptionLike[],
  prices?: Record<string, PlanPricePair>,
): MrrResult {
  const byKey = new Map<string, { planId: SubscriptionTier; count: number; monthlyEach: number; cadence: BillingCadence }>();

  for (const s of subs) {
    const planId = normalizePlanId(s.planId);
    if (!planId) continue; // unknown plan: honestly excluded, not guessed
    const periodRaw = String(s.period || '').toLowerCase();
    const cadence: BillingCadence =
      periodRaw === 'annual' || periodRaw === 'yearly'
        ? 'annual'
        : periodRaw === 'monthly'
          ? 'monthly'
          : inferCadence(s.startDate, s.endDate);
    const overrideRaw = prices ? prices[planId] ?? prices[planId.toLowerCase()] : undefined;
    const pair: PlanPricePair =
      overrideRaw && Number.isFinite(overrideRaw.monthly) && Number.isFinite(overrideRaw.annual)
        ? { monthly: Math.max(0, overrideRaw.monthly), annual: Math.max(0, overrideRaw.annual) }
        : CANONICAL_PRICES[planId];
    const monthlyEach = monthlyEquivalent(cadence === 'annual' ? pair.annual : pair.monthly, cadence);
    const key = `${planId}|${cadence}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byKey.set(key, { planId, count: 1, monthlyEach, cadence });
    }
  }

  const lines: MrrLine[] = [...byKey.values()].map((g) => ({
    planId: g.planId,
    count: g.count,
    monthlyEach: g.monthlyEach,
    monthlyTotal: g.monthlyEach * g.count,
    cadence: g.cadence,
  }));
  lines.sort((a, b) => b.monthlyTotal - a.monthlyTotal);

  const mrr = lines.reduce((sum, l) => sum + l.monthlyTotal, 0);
  const activeCount = lines.reduce((sum, l) => sum + l.count, 0);
  return { mrr, activeCount, lines };
}

/** One-line human explanation of the MRR number, e.g. for the GodMode card. */
export function explainMrr(result: MrrResult): string {
  if (result.activeCount === 0) return 'No active paid subscriptions.';
  const parts = result.lines.map((l) => {
    const price =
      l.cadence === 'annual'
        ? `₹${Math.round(l.monthlyEach * 12).toLocaleString('en-IN')}/yr ÷ 12`
        : `₹${Math.round(l.monthlyEach).toLocaleString('en-IN')}/mo`;
    return `${l.count} × ${l.planId} (${price})`;
  });
  return `${parts.join(' + ')} = ₹${Math.round(result.mrr).toLocaleString('en-IN')}/mo across ${result.activeCount} active.`;
}
