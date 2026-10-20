/**
 * termsConfig.test.ts — QUEUED #31: the canonical terms store.
 * =====================================================================
 * Pins the contract the whole app now relies on:
 * - code defaults ARE the locked law values (generated from PLAN_PRICING);
 * - a stored Firestore doc wins ONLY field-by-field when valid — corrupt
 *   or partial config degrades to today's prices, never breaks checkout;
 * - getTerms never throws (Firestore down → defaults);
 * - checkout (planPrice) is config-first once the cache is warm, and
 *   exactly the old constants before it;
 * - editor validation: errors block, warnings flag the classic footguns
 *   (annual < monthly, paid tier at 0, inverted tiers);
 * - the commission shadowing truth: any active global rule shadows the
 *   tier rates (the resolver falls back to the first active rule);
 * - rule/override min/max now clamp REAL orders via computeCommission.
 */

// Firebase modules are stubbed (same pattern as dueJobsService.test.ts);
// termsConfig reaches Firestore only through a lazy dynamic import.
const mockDocs = new Map<string, Record<string, unknown> | undefined>();
let mockFail = false;

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, ...segments: string[]) => ({ __path: segments.join('/') })),
  getDoc: jest.fn(async (ref: { __path: string }) => {
    if (mockFail) throw new Error('firestore unavailable');
    const data = mockDocs.get(ref.__path);
    return { exists: () => data !== undefined, data: () => data };
  }),
}));
jest.mock('../firebase', () => ({ db: {} }));

import {
  DEFAULT_TERMS, DEFAULT_COMMISSION, TERMS_PLAN_IDS,
  defaultTermsPlans, sanitizePlanDoc, sanitizeCommissionConfig,
  validatePlanTerms, validateTermsSet, validateCommissionTerms,
  activeRuleShadowsTierRates, shadowedServiceTypes,
  priceFor, planIdForTier, getTerms, getTermsSync, clearTermsCache,
  type TermsPlan,
} from '../termsConfig';
import { planPrice } from '../../billing/planUpgrade';
import { computeCommission } from '../firestoreAdmin';

beforeEach(() => {
  mockDocs.clear();
  mockFail = false;
  clearTermsCache();
});

/* ------------------------------ Defaults -------------------------------- */

describe('code defaults are the locked law values', () => {
  it('plan prices match the FINAL pricing (2026-10-14)', () => {
    const p = DEFAULT_TERMS.plans;
    expect(p.seva.priceMonthlyINR).toBe(0);
    expect([p.standard.priceMonthlyINR, p.standard.priceMonthlyBDT, p.standard.priceMonthlyUSD]).toEqual([499, 700, 6]);
    expect([p.standard.priceYearlyINR, p.standard.priceYearlyBDT, p.standard.priceYearlyUSD]).toEqual([4999, 7000, 60]);
    expect([p.premium.priceMonthlyINR, p.premium.priceMonthlyBDT, p.premium.priceMonthlyUSD]).toEqual([1999, 2800, 24]);
    expect([p.premium.priceYearlyINR, p.premium.priceYearlyBDT, p.premium.priceYearlyUSD]).toEqual([19999, 28000, 240]);
    expect([p.purohit_pro.priceMonthlyINR, p.purohit_pro.priceMonthlyBDT, p.purohit_pro.priceMonthlyUSD]).toEqual([199, 280, 2.5]);
    expect(p.purohit_pro.commissionPercent).toBe(12);
  });

  it('limits match the freemium law (Seva 100/500/2/1, Std 1000/∞/10/3, Premium ∞)', () => {
    expect(DEFAULT_TERMS.plans.seva.limits).toEqual({ maxDevotees: 100, maxTransactionsPerMonth: 500, maxSeats: 2, maxBranches: 1 });
    expect(DEFAULT_TERMS.plans.standard.limits).toEqual({ maxDevotees: 1000, maxTransactionsPerMonth: -1, maxSeats: 10, maxBranches: 3 });
    expect(DEFAULT_TERMS.plans.premium.limits).toEqual({ maxDevotees: -1, maxTransactionsPerMonth: -1, maxSeats: -1, maxBranches: -1 });
  });

  it('commission defaults are 15 / 8 / 12 with a free-gig cap of 3', () => {
    expect(DEFAULT_COMMISSION).toEqual({ freeRate: 15, proRail1Rate: 8, proRail2Rate: 12, freeGigLimit: 3 });
    expect(DEFAULT_TERMS.commission).toEqual(DEFAULT_COMMISSION);
  });
});

/* ----------------------------- Sanitizers ------------------------------- */

describe('sanitizePlanDoc — stored values win only when valid', () => {
  it('takes every valid stored field verbatim (write/read round-trip)', () => {
    const stored: TermsPlan = {
      id: 'standard', name: 'Standard Plus', active: false,
      priceMonthlyINR: 599, priceYearlyINR: 5990,
      priceMonthlyBDT: 850, priceYearlyBDT: 8500,
      priceMonthlyUSD: 7, priceYearlyUSD: 70,
      limits: { maxDevotees: 2000, maxTransactionsPerMonth: 9000, maxSeats: 12, maxBranches: 4 },
    };
    expect(sanitizePlanDoc('standard', stored)).toMatchObject(stored);
  });

  it('degrades corrupt fields to defaults, field by field', () => {
    const out = sanitizePlanDoc('standard', {
      priceMonthlyINR: 'five hundred', priceYearlyINR: -1, priceMonthlyBDT: 750,
      limits: { maxDevotees: Number.NaN, maxSeats: 15 },
    });
    expect(out.priceMonthlyINR).toBe(499); // string → default
    expect(out.priceYearlyINR).toBe(4999); // negative → default
    expect(out.priceMonthlyBDT).toBe(750); // valid stored value wins
    expect(out.limits.maxDevotees).toBe(1000); // NaN → default
    expect(out.limits.maxSeats).toBe(15); // valid stored value wins
    expect(out.limits.maxBranches).toBe(3); // missing → default
  });

  it('preserves the -1 unlimited sentinel and rejects limits below -1', () => {
    const out = sanitizePlanDoc('seva', { limits: { maxDevotees: -1, maxSeats: -5 } });
    expect(out.limits.maxDevotees).toBe(-1);
    expect(out.limits.maxSeats).toBe(2); // -5 is junk → default
  });

  it('rounds fractional limits and falls back on junk input entirely', () => {
    expect(sanitizePlanDoc('seva', { limits: { maxDevotees: 100.6 } }).limits.maxDevotees).toBe(101);
    expect(sanitizePlanDoc('seva', null)).toEqual(defaultTermsPlans().seva);
    expect(sanitizePlanDoc('seva', 'garbage')).toEqual(defaultTermsPlans().seva);
  });

  it('keeps commissionPercent only on the Pro plan, clamped to 0–100', () => {
    expect(sanitizePlanDoc('purohit_pro', { commissionPercent: 10 }).commissionPercent).toBe(10);
    expect(sanitizePlanDoc('purohit_pro', { commissionPercent: 140 }).commissionPercent).toBe(12);
    expect(sanitizePlanDoc('standard', { commissionPercent: 5 }).commissionPercent).toBeUndefined();
  });
});

describe('sanitizeCommissionConfig', () => {
  it('returns law defaults for missing/garbage docs', () => {
    expect(sanitizeCommissionConfig(undefined)).toEqual(DEFAULT_COMMISSION);
    expect(sanitizeCommissionConfig({ freeRate: 'high' })).toEqual(DEFAULT_COMMISSION);
  });

  it('takes valid stored rates and rounds the gig cap', () => {
    expect(sanitizeCommissionConfig({ freeRate: 14, proRail1Rate: 7.5, freeGigLimit: 4.6 }))
      .toEqual({ freeRate: 14, proRail1Rate: 7.5, proRail2Rate: 12, freeGigLimit: 5 });
  });
});

/* --------------------------- Cached reader ------------------------------ */

describe('getTerms — Firestore-first, fail-open', () => {
  it('reads stored docs over defaults (owner edit wins)', async () => {
    mockDocs.set('plans/standard', { priceMonthlyINR: 649 });
    mockDocs.set('platformConfig/commission', { freeRate: 13 });
    const terms = await getTerms();
    expect(terms.plans.standard.priceMonthlyINR).toBe(649);
    expect(terms.plans.standard.priceMonthlyBDT).toBe(700); // untouched field → default
    expect(terms.plans.premium.priceMonthlyINR).toBe(1999); // no doc → default
    expect(terms.commission.freeRate).toBe(13);
    expect(terms.loadedAt).not.toBeNull();
  });

  it('never throws when Firestore fails — defaults come back', async () => {
    mockFail = true;
    const terms = await getTerms();
    expect(terms.plans).toEqual(defaultTermsPlans());
    expect(terms.commission).toEqual(DEFAULT_COMMISSION);
  });

  it('caches: a second read does not re-fetch', async () => {
    mockDocs.set('plans/standard', { priceMonthlyINR: 555 });
    const first = await getTerms();
    mockDocs.set('plans/standard', { priceMonthlyINR: 777 });
    const second = await getTerms();
    expect(second.plans.standard.priceMonthlyINR).toBe(first.plans.standard.priceMonthlyINR);
    clearTermsCache();
    const third = await getTerms();
    expect(third.plans.standard.priceMonthlyINR).toBe(777);
  });
});

describe('checkout is config-first (planPrice via the terms cache)', () => {
  it('before any load, prices are exactly the locked constants', () => {
    expect(planPrice('STANDARD', 'monthly', 'IN')).toEqual({ amount: 499, currency: 'INR', symbol: '₹' });
    expect(planPrice('PUROHIT_PRO', 'annual', 'BD').amount).toBe(2800);
  });

  it('after terms load, the owner-edited price is what buyers are quoted', async () => {
    mockDocs.set('plans/standard', { priceMonthlyINR: 649, priceYearlyBDT: 9100 });
    await getTerms();
    expect(planPrice('STANDARD', 'monthly', 'IN').amount).toBe(649);
    expect(planPrice('STANDARD', 'annual', 'BD').amount).toBe(9100);
    expect(planPrice('PREMIUM', 'monthly', 'IN').amount).toBe(1999); // unedited plan unaffected
  });
});

/* ----------------------------- Validation ------------------------------- */

describe('editor validation', () => {
  const plan = (over: Partial<TermsPlan> = {}): TermsPlan => ({
    ...defaultTermsPlans().standard, ...over,
  });

  it('accepts the default plans with no errors or warnings', () => {
    const v = validateTermsSet(defaultTermsPlans());
    expect(v.errors).toEqual([]);
    expect(v.warnings).toEqual([]);
  });

  it('blocks negative prices and out-of-range limits', () => {
    const v = validatePlanTerms(plan({ priceMonthlyINR: -5, limits: { maxDevotees: -2, maxTransactionsPerMonth: -1, maxSeats: 10, maxBranches: 3 } }));
    expect(v.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('warns when annual < monthly and when annual > 12× monthly', () => {
    expect(validatePlanTerms(plan({ priceYearlyINR: 100 })).warnings.join(' ')).toMatch(/annual/i);
    expect(validatePlanTerms(plan({ priceYearlyINR: 99999 })).warnings.join(' ')).toMatch(/12 × monthly/);
  });

  it('warns when a paid tier is priced 0 in every currency', () => {
    const v = validatePlanTerms(plan({ priceMonthlyINR: 0, priceMonthlyBDT: 0, priceMonthlyUSD: 0 }));
    expect(v.warnings.join(' ')).toMatch(/PAID plan/);
    expect(validatePlanTerms(defaultTermsPlans().seva).warnings).toEqual([]); // Seva being 0 is the law
  });

  it('warns on inverted tiers across the set', () => {
    const set = defaultTermsPlans();
    set.premium = { ...set.premium, priceMonthlyINR: 100 };
    expect(validateTermsSet(set).warnings.join(' ')).toMatch(/inverted/);
  });

  it('commission: blocks >100, warns when Pro pays more than community', () => {
    expect(validateCommissionTerms({ freeRate: 101, proRail1Rate: 8, proRail2Rate: 12, freeGigLimit: 3 }).errors.length).toBe(1);
    const v = validateCommissionTerms({ freeRate: 10, proRail1Rate: 12, proRail2Rate: 12, freeGigLimit: 3 });
    expect(v.warnings.join(' ')).toMatch(/MORE than free/);
  });
});

/* ------------------------- Shadowing (trap a) --------------------------- */

describe('commission precedence truth — global rules shadow tier rates', () => {
  it('no rules / only inactive rules → no shadowing', () => {
    expect(activeRuleShadowsTierRates([])).toBe(false);
    expect(activeRuleShadowsTierRates([{ serviceType: 'both', active: false }])).toBe(false);
    expect(shadowedServiceTypes([{ serviceType: 'both', active: false }])).toEqual([]);
  });

  it('one active "both" rule shadows every provider type', () => {
    const rules = [{ serviceType: 'both', active: true, ratePercent: 10 }];
    expect(activeRuleShadowsTierRates(rules)).toBe(true);
    expect(shadowedServiceTypes(rules).sort()).toEqual(['jyotishi', 'purohit']);
  });

  it('a type-specific active rule still shadows (resolver falls back to the first active rule)', () => {
    const rules = [{ serviceType: 'purohit', active: true }];
    expect(activeRuleShadowsTierRates(rules)).toBe(true);
    expect(shadowedServiceTypes(rules)).toEqual(['purohit']);
  });
});

/* --------------------- Min/max wiring (trap b) -------------------------- */

describe('rule min/max clamp REAL orders (computeCommission, as wired at all order paths)', () => {
  it('min raises a small fee to the floor', () => {
    // ₹500 order at 12% = ₹60 → rule min ₹100 wins
    expect(computeCommission(500, 12, 100, 0)).toEqual({ commission: 100, net: 400 });
  });

  it('max caps a large fee', () => {
    // ₹50,000 order at 12% = ₹6,000 → rule max ₹2,000 wins
    expect(computeCommission(50000, 12, 0, 2000)).toEqual({ commission: 2000, net: 48000 });
  });

  it('zero min/max leaves the plain percentage untouched (tier-default layer)', () => {
    expect(computeCommission(1000, 15, 0, 0)).toEqual({ commission: 150, net: 850 });
  });
});

/* ------------------------------ Price reads ----------------------------- */

describe('priceFor / planIdForTier mapping', () => {
  it('maps every tier to its canonical plan id', () => {
    expect(TERMS_PLAN_IDS.map((id) => id)).toEqual(['seva', 'standard', 'premium', 'purohit_pro']);
    expect(planIdForTier('PUROHIT_PRO')).toBe('purohit_pro');
    expect(planIdForTier('SEVA')).toBe('seva');
  });

  it('reads the right field per currency × period', () => {
    const std = defaultTermsPlans().standard;
    expect(priceFor(std, 'INR', 'monthly')).toBe(499);
    expect(priceFor(std, 'BDT', 'annual')).toBe(7000);
    expect(priceFor(std, 'USD', 'annual')).toBe(60);
  });

  it('getTermsSync returns defaults before any load (first-paint safety)', () => {
    expect(getTermsSync().plans.standard.priceMonthlyINR).toBe(499);
  });
});
