/**
 * landingPricing.test.ts — QUEUED #44: the landing pricing cards.
 * =====================================================================
 * Pins the public pricing section to the canonical pricing law:
 * - FOUR tiers render — Lite, Standard, Enterprise, Purohit/Jyotishi
 *   Pro — under their law names (DISPLAY RENAME, owner decision
 *   2026-10-23: free tier "Lite", top tier "Enterprise"; canonical ids
 *   seva / premium and every price unchanged; Pro exists and is the
 *   professionals' tier);
 * - every number comes from the terms snapshot: code defaults are the
 *   locked 2026-10-14 figures in ₹ AND ৳ AND $;
 * - a GodMode terms edit (config override) flows into the cards — the
 *   #31 spot-check (Standard ₹499 → ₹549) at the mapping layer;
 * - annual figures follow the annual law stored in terms (monthly × 10,
 *   "2 months free") and the annual per-month display spreads them /12.
 */

import {
  landingPriceCards,
  landingCard,
  cardPerMonthInr,
  formatUsd,
} from '../landingPricing';
import {
  DEFAULT_TERMS,
  sanitizePlanDoc,
  type PlatformTerms,
} from '../termsConfig';

function termsWith(planId: string, raw: Record<string, unknown>): PlatformTerms {
  const terms: PlatformTerms = JSON.parse(JSON.stringify(DEFAULT_TERMS));
  terms.plans[planId as keyof PlatformTerms['plans']] = sanitizePlanDoc(
    planId as never,
    raw,
  );
  terms.loadedAt = 1760000000000;
  return terms;
}

describe('landingPriceCards — defaults are the locked law', () => {
  const cards = landingPriceCards(DEFAULT_TERMS);

  it('renders exactly the four canonical tiers, in order', () => {
    expect(cards.map((c) => c.id)).toEqual([
      'seva',
      'standard',
      'premium',
      'purohit_pro',
    ]);
  });

  it('uses law names — Lite / Standard / Enterprise / Pro (owner rename 2026-10-23)', () => {
    expect(cards.map((c) => c.name)).toEqual([
      'Lite',
      'Standard',
      'Enterprise',
      'Purohit / Jyotishi Pro',
    ]);
    // The retired display names must not resurface on any card.
    expect(cards.map((c) => c.name)).not.toContain('Seva Free');
    expect(cards.map((c) => c.name)).not.toContain('Premium');
  });

  it('Standard is the one POPULAR card', () => {
    expect(cards.filter((c) => c.popular).map((c) => c.id)).toEqual(['standard']);
    expect(landingCard(cards, 'standard').badge).toBe('POPULAR');
  });

  it('carries ₹, ৳ and $ prices for every tier (monthly + annual law)', () => {
    const seva = landingCard(cards, 'seva');
    expect([seva.inrMonthly, seva.bdtMonthly, seva.usdMonthly]).toEqual([0, 0, 0]);
    expect(seva.isFree).toBe(true);

    const standard = landingCard(cards, 'standard');
    expect([standard.inrMonthly, standard.bdtMonthly, standard.usdMonthly]).toEqual([499, 700, 6]);
    expect([standard.inrAnnual, standard.bdtAnnual, standard.usdAnnual]).toEqual([4999, 7000, 60]);
    expect(standard.isFree).toBe(false);

    const premium = landingCard(cards, 'premium');
    expect([premium.inrMonthly, premium.bdtMonthly, premium.usdMonthly]).toEqual([1999, 2800, 24]);
    expect([premium.inrAnnual, premium.bdtAnnual, premium.usdAnnual]).toEqual([19999, 28000, 240]);

    const pro = landingCard(cards, 'purohit_pro');
    expect(pro.professional).toBe(true);
    expect([pro.inrMonthly, pro.bdtMonthly, pro.usdMonthly]).toEqual([199, 280, 2.5]);
    expect([pro.inrAnnual, pro.bdtAnnual, pro.usdAnnual]).toEqual([1990, 2800, 25]);
    expect(pro.commissionPercent).toBe(12);
  });

  it('limits ride along from terms (Lite caps, Enterprise unlimited)', () => {
    expect(landingCard(cards, 'seva').maxDevotees).toBe(100);
    expect(landingCard(cards, 'premium').maxDevotees).toBe(-1);
  });

  it('annual per-month display spreads the annual total over 12', () => {
    const standard = landingCard(cards, 'standard');
    expect(cardPerMonthInr(standard, false)).toBe(499);
    expect(cardPerMonthInr(standard, true)).toBe(Math.round(4999 / 12));
  });
});

describe('landingPriceCards — config override flows through (#31 law)', () => {
  it('a GodMode edit of Standard ₹499 → ₹549 renders on the card', () => {
    const terms = termsWith('standard', { priceMonthlyINR: 549 });
    const standard = landingCard(landingPriceCards(terms), 'standard');
    expect(standard.inrMonthly).toBe(549);
    // Untouched fields keep the law defaults — sanitize-merge, field by field.
    expect(standard.bdtMonthly).toBe(700);
    expect(standard.inrAnnual).toBe(4999);
    // And the other tiers are untouched.
    expect(landingCard(landingPriceCards(terms), 'premium').inrMonthly).toBe(1999);
  });

  it('a stored plan doc cannot rename the tier on the landing (code copy wins)', () => {
    // A stale stored doc still carrying the retired name loses to the
    // code name — the landing name comes from planPricing, always.
    const terms = termsWith('premium', { name: 'Premium' });
    expect(landingCard(landingPriceCards(terms), 'premium').name).toBe('Enterprise');
    const terms2 = termsWith('seva', { name: 'Seva Free' });
    expect(landingCard(landingPriceCards(terms2), 'seva').name).toBe('Lite');
  });
});

describe('formatUsd', () => {
  it('keeps cents only where the law has them', () => {
    expect(formatUsd(6)).toBe('6');
    expect(formatUsd(24)).toBe('24');
    expect(formatUsd(2.5)).toBe('2.50');
    expect(formatUsd(0)).toBe('0');
  });
});
