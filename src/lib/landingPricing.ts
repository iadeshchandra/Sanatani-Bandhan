/**
 * landingPricing.ts — pure mapping: canonical terms → landing pricing cards.
 * ============================================================================
 * QUEUED #44 (2026-10-20). The public pricing section must show the FOUR
 * canonical tiers under their law names, and Pro is a real tier, not an
 * afterthought. DISPLAY RENAME (owner decision, 2026-10-23 — supersedes
 * the #44-era "never rename" law for names only): the free tier displays
 * as "Lite" and the top institution tier as "Enterprise"; the canonical
 * ids (seva / standard / premium / purohit_pro) and every price are
 * unchanged. Names still come from code copy in config/planPricing —
 * never from a stored plan doc — so this rename is exactly a change of
 * the `name` fields in that one file.
 *
 * Data source law (#31): every NUMBER comes from the terms store snapshot
 * (config-first via lib/termsConfig — a GodMode → Plans & Terms edit flows
 * to this page with no deploy; code defaults are the locked law values).
 * Names / badges / taglines / audiences are marketing copy and stay in
 * code, sourced from config/planPricing — the same source the defaults
 * are generated from, so copy and numbers can never describe different
 * tiers.
 *
 * Pure module: no React, no Firebase. The component formats and renders;
 * this module decides WHAT the cards say numerically.
 */
import { PLAN_PRICING, type SubscriptionTier } from '../config/planPricing';
import {
  TERMS_PLAN_IDS,
  priceFor,
  tierForPlan,
  type PlatformTerms,
  type TermsPlanId,
} from './termsConfig';

export interface LandingPriceCard {
  id: TermsPlanId;
  tier: SubscriptionTier;
  /** Canonical tier name from planPricing copy (never from a stored doc). */
  name: string;
  badge?: string;
  tagline: string;
  targetAudience: string;
  /** Standard carries the POPULAR highlight, as the design has always done. */
  popular: boolean;
  /** purohit_pro — the individual professionals' tier. */
  professional: boolean;
  /** Free in every currency (Seva). */
  isFree: boolean;
  inrMonthly: number;
  inrAnnual: number;
  bdtMonthly: number;
  bdtAnnual: number;
  usdMonthly: number;
  usdAnnual: number;
  maxDevotees: number;
  maxTransactionsPerMonth: number;
  maxSeats: number;
  maxBranches: number;
  /** purohit_pro only: marketplace commission % from terms. */
  commissionPercent?: number;
}

/** All four tiers, in display order, priced entirely from the terms snapshot. */
export function landingPriceCards(terms: PlatformTerms): LandingPriceCard[] {
  return TERMS_PLAN_IDS.map((id) => {
    const plan = terms.plans[id];
    const tier = tierForPlan(id);
    const cfg = PLAN_PRICING[tier];
    return {
      id,
      tier,
      name: cfg.name,
      badge: cfg.badge,
      tagline: cfg.tagline,
      targetAudience: cfg.targetAudience,
      popular: id === 'standard',
      professional: id === 'purohit_pro',
      isFree:
        plan.priceMonthlyINR === 0 &&
        plan.priceMonthlyBDT === 0 &&
        plan.priceMonthlyUSD === 0,
      inrMonthly: priceFor(plan, 'INR', 'monthly'),
      inrAnnual: priceFor(plan, 'INR', 'annual'),
      bdtMonthly: priceFor(plan, 'BDT', 'monthly'),
      bdtAnnual: priceFor(plan, 'BDT', 'annual'),
      usdMonthly: priceFor(plan, 'USD', 'monthly'),
      usdAnnual: priceFor(plan, 'USD', 'annual'),
      maxDevotees: plan.limits.maxDevotees,
      maxTransactionsPerMonth: plan.limits.maxTransactionsPerMonth,
      maxSeats: plan.limits.maxSeats,
      maxBranches: plan.limits.maxBranches,
      ...(plan.commissionPercent !== undefined
        ? { commissionPercent: plan.commissionPercent }
        : {}),
    };
  });
}

/** One card by id (the section renders each tier in its own styled slot). */
export function landingCard(
  cards: LandingPriceCard[],
  id: TermsPlanId,
): LandingPriceCard {
  const card = cards.find((c) => c.id === id);
  if (!card) throw new Error(`landingCard: missing tier ${id}`);
  return card;
}

/**
 * The big number on a card: the monthly price, or — in annual mode — the
 * annual total spread over 12 months (the design's existing treatment;
 * annual = monthly × 10 by law, i.e. "2 months free").
 */
export function cardPerMonthInr(card: LandingPriceCard, annual: boolean): number {
  return annual ? Math.round(card.inrAnnual / 12) : card.inrMonthly;
}

/** USD display: whole dollars bare ($6), cents kept where the law has them ($2.50). */
export function formatUsd(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
