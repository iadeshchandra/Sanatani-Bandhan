/**
 * planTierRename.test.ts — the 2026-10-23 display rename, pinned.
 * =====================================================================
 * Owner decision (2026-10-23): the free tier displays as "Lite" and the
 * top tier as "Enterprise" (superseding the 2026-10-14 "never rename"
 * law for DISPLAY NAMES ONLY). This suite pins the safety contract that
 * makes the rename a label change and nothing more:
 *
 *  1. SINGLE SOURCE — every canonical tier id resolves in planPricing
 *     with a name, a badge and full regional pricing; the display names
 *     are exactly the owner's, and no retired name survives anywhere in
 *     the pricing model.
 *  2. PRICES DID NOT MOVE — the locked 2026-10-14 figures, per region.
 *  3. STORED DATA IS SAFE — every plan-id spelling a workspace or doc
 *     may already carry ('SEVA', 'LITE', 'PREMIUM', 'ENTERPRISE', any
 *     case) resolves to the same canonical tier in EVERY resolver the
 *     app ships (workspaceRegistry / planLimits / settingsHonesty), and
 *     the legacy SUBSCRIPTION_PLANS aliases carry the same display name
 *     and price as their canonical tier.
 *  4. BOOT PATH — the exact data the landing page renders (landingPricing
 *     cards over the terms defaults) can never hit an undefined tier:
 *     the historical crash was a consumer reading PLAN_PRICING.LITE /
 *     PLAN_PRICING.ENTERPRISE (undefined.badge) from a half-landed
 *     rename. Source guards pin that pattern out of the consumers.
 */

import * as fs from 'fs';
import * as path from 'path';

// planLimits imports the app's firebase barrel at module level; stub it
// (same pattern as lib/__tests__/termsConfig.test.ts) — normalizePlanId
// is pure and never touches Firestore.
jest.mock('../../firebase', () => ({ db: {} }));

import {
  PLAN_PRICING,
  SUBSCRIPTION_PLANS,
  TIER_LEVELS,
  type PlanId,
  type SubscriptionTier,
} from '../planPricing';
import {
  DEFAULT_TERMS,
  TERMS_PLAN_IDS,
  defaultTermsPlans,
  sanitizePlanDoc,
  tierForPlan,
} from '../../lib/termsConfig';
import { landingCard, landingPriceCards } from '../../lib/landingPricing';
import { resolvePlanId } from '../../lib/workspaceRegistry';
import { normalizePlanId } from '../../lib/planLimits';
import { canonicalSettingsPlanId } from '../../lib/settingsHonesty';

const TIERS: SubscriptionTier[] = ['SEVA', 'STANDARD', 'PREMIUM', 'PUROHIT_PRO'];

const SRC = path.resolve(__dirname, '..', '..');
function src(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

describe('single source — every canonical tier resolves completely', () => {
  it('PLAN_PRICING holds exactly the four canonical tier ids', () => {
    expect(Object.keys(PLAN_PRICING).sort()).toEqual([...TIERS].sort());
  });

  it.each(TIERS)('%s resolves with name, badge, tagline and full regional pricing', (tier) => {
    const cfg = PLAN_PRICING[tier];
    expect(cfg).toBeDefined();
    expect(typeof cfg.name).toBe('string');
    expect(cfg.name.length).toBeGreaterThan(0);
    expect(typeof cfg.badge).toBe('string');
    expect((cfg.badge as string).length).toBeGreaterThan(0);
    expect(cfg.tagline.length).toBeGreaterThan(0);
    expect(Number.isFinite(cfg.price.monthly)).toBe(true);
    expect(Number.isFinite(cfg.price.annual)).toBe(true);
    for (const region of ['inr', 'bdt', 'usd'] as const) {
      expect(Number.isFinite(cfg.regionalPrices[region].monthly)).toBe(true);
      expect(Number.isFinite(cfg.regionalPrices[region].annual)).toBe(true);
      expect(cfg.regionalPrices[region].monthly).toBeGreaterThanOrEqual(0);
    }
    expect(cfg.limits).toBeDefined();
    expect(cfg.highlightedPerks.length).toBeGreaterThan(0);
  });

  it('display names are exactly the owner rename (2026-10-23)', () => {
    expect(PLAN_PRICING.SEVA.name).toBe('Lite');
    expect(PLAN_PRICING.STANDARD.name).toBe('Standard');
    expect(PLAN_PRICING.PREMIUM.name).toBe('Enterprise');
    expect(PLAN_PRICING.PUROHIT_PRO.name).toBe('Purohit / Jyotishi Pro');
  });

  it('no retired display name survives anywhere in the pricing model', () => {
    const names = [
      ...TIERS.map((t) => PLAN_PRICING[t].name),
      ...(Object.keys(SUBSCRIPTION_PLANS) as PlanId[]).map((id) => SUBSCRIPTION_PLANS[id].name),
    ];
    expect(names).not.toContain('Seva Free');
    expect(names).not.toContain('Premium');
    const copy = TIERS.flatMap((t) => [
      PLAN_PRICING[t].description,
      ...PLAN_PRICING[t].highlightedPerks,
    ]).join(' ');
    expect(copy).not.toMatch(/Seva Free/);
  });
});

describe('prices did not move (locked 2026-10-14)', () => {
  it('regional prices per tier are the locked figures', () => {
    expect(PLAN_PRICING.SEVA.regionalPrices).toEqual({
      inr: { monthly: 0, annual: 0 },
      bdt: { monthly: 0, annual: 0 },
      usd: { monthly: 0, annual: 0 },
    });
    expect(PLAN_PRICING.STANDARD.regionalPrices).toEqual({
      inr: { monthly: 499, annual: 4999 },
      bdt: { monthly: 700, annual: 7000 },
      usd: { monthly: 6, annual: 60 },
    });
    expect(PLAN_PRICING.PREMIUM.regionalPrices).toEqual({
      inr: { monthly: 1999, annual: 19999 },
      bdt: { monthly: 2800, annual: 28000 },
      usd: { monthly: 24, annual: 240 },
    });
    expect(PLAN_PRICING.PUROHIT_PRO.regionalPrices).toEqual({
      inr: { monthly: 199, annual: 1990 },
      bdt: { monthly: 280, annual: 2800 },
      usd: { monthly: 2.5, annual: 25 },
    });
  });

  it('tier levels are unchanged', () => {
    expect(TIER_LEVELS).toEqual({ SEVA: 1, STANDARD: 2, PREMIUM: 3, PUROHIT_PRO: 2 });
  });
});

describe('legacy SUBSCRIPTION_PLANS aliases resolve to the same display + price', () => {
  it.each(Object.keys(SUBSCRIPTION_PLANS) as PlanId[])('%s resolves with name, badge and price', (id) => {
    const def = SUBSCRIPTION_PLANS[id];
    expect(def).toBeDefined();
    expect(def.name.length).toBeGreaterThan(0);
    expect(typeof def.badge).toBe('string');
    expect((def.badge as string).length).toBeGreaterThan(0);
    expect(Number.isFinite(def.price.monthly)).toBe(true);
    expect(Number.isFinite(def.price.annual)).toBe(true);
  });

  it('LITE is the free tier under its new display name; ENTERPRISE is the top tier', () => {
    expect(SUBSCRIPTION_PLANS.LITE.name).toBe(PLAN_PRICING.SEVA.name);
    expect(SUBSCRIPTION_PLANS.LITE.price).toEqual(PLAN_PRICING.SEVA.price);
    expect(SUBSCRIPTION_PLANS.ENTERPRISE.name).toBe(PLAN_PRICING.PREMIUM.name);
    expect(SUBSCRIPTION_PLANS.ENTERPRISE.price).toEqual(PLAN_PRICING.PREMIUM.price);
    expect(SUBSCRIPTION_PLANS.MANDIR.name).toBe(PLAN_PRICING.STANDARD.name);
    expect(SUBSCRIPTION_PLANS.SMART_PRO.name).toBe(PLAN_PRICING.PREMIUM.name);
    expect(SUBSCRIPTION_PLANS.SAMPRADAYA.name).toBe(PLAN_PRICING.PREMIUM.name);
  });
});

describe('stored plan ids keep resolving — every spelling, every resolver', () => {
  it('workspaceRegistry.resolvePlanId maps legacy + canonical spellings', () => {
    expect(resolvePlanId('SEVA')).toBe('SEVA');
    expect(resolvePlanId('LITE')).toBe('SEVA');
    expect(resolvePlanId('lite')).toBe('SEVA');
    expect(resolvePlanId('PREMIUM')).toBe('PREMIUM');
    expect(resolvePlanId('ENTERPRISE')).toBe('PREMIUM');
    expect(resolvePlanId('enterprise')).toBe('PREMIUM');
    expect(resolvePlanId('STANDARD')).toBe('STANDARD');
    expect(resolvePlanId('PUROHIT_PRO')).toBe('PUROHIT_PRO');
    expect(resolvePlanId('DEMO')).toBe('DEMO');
    expect(resolvePlanId(undefined)).toBe('SEVA');
    expect(resolvePlanId('')).toBe('SEVA');
    expect(resolvePlanId('GARBAGE')).toBe('SEVA');
  });

  it('planLimits.normalizePlanId maps the same spellings to terms ids', () => {
    expect(normalizePlanId('SEVA')).toBe('seva');
    expect(normalizePlanId('LITE')).toBe('seva');
    expect(normalizePlanId('lite')).toBe('seva');
    expect(normalizePlanId('PREMIUM')).toBe('premium');
    expect(normalizePlanId('ENTERPRISE')).toBe('premium');
    expect(normalizePlanId('STANDARD')).toBe('standard');
    expect(normalizePlanId(undefined)).toBe('seva');
  });

  it('settingsHonesty.canonicalSettingsPlanId agrees', () => {
    expect(canonicalSettingsPlanId('seva')).toBe('seva');
    expect(canonicalSettingsPlanId('lite')).toBe('seva');
    expect(canonicalSettingsPlanId('premium')).toBe('premium');
    expect(canonicalSettingsPlanId('enterprise')).toBe('premium');
    expect(canonicalSettingsPlanId('smart_pro')).toBe('premium');
    expect(canonicalSettingsPlanId('standard')).toBe('standard');
    expect(canonicalSettingsPlanId('purohit_pro')).toBe('purohit_pro');
    expect(canonicalSettingsPlanId(undefined)).toBe('seva');
  });

  it('the resolvers agree with each other on every stored spelling', () => {
    for (const spelling of ['SEVA', 'LITE', 'PREMIUM', 'ENTERPRISE', 'STANDARD']) {
      const canonical = normalizePlanId(spelling);
      // None of these spellings is a demo plan; narrowing honestly (the
      // runtime assertion is what licenses the TermsPlanId use below).
      expect(canonical).not.toBe('demo');
      if (canonical === 'demo') throw new Error('unreachable for these spellings');
      expect(tierForPlan(canonical)).toBe(resolvePlanId(spelling));
      const tier = resolvePlanId(spelling);
      expect(tier).not.toBe('DEMO');
      expect(PLAN_PRICING[tier as SubscriptionTier]).toBeDefined();
    }
  });
});

describe('terms defaults carry the new names from the single source', () => {
  it('defaultTermsPlans names equal the planPricing names for every plan id', () => {
    const plans = defaultTermsPlans();
    for (const id of TERMS_PLAN_IDS) {
      expect(plans[id].name).toBe(PLAN_PRICING[tierForPlan(id)].name);
    }
    expect(plans.seva.name).toBe('Lite');
    expect(plans.premium.name).toBe('Enterprise');
    expect(DEFAULT_TERMS.plans.seva.name).toBe('Lite');
    expect(DEFAULT_TERMS.plans.premium.name).toBe('Enterprise');
  });

  it('a stored doc name still wins inside the terms snapshot (owner-editable by design)', () => {
    // This is the documented #31 behaviour the rename does NOT change:
    // GodMode → Plans & Terms owns the stored `name`; surfaces rendering
    // TermsPlan.name follow the doc until the owner re-saves it. The
    // landing page is immune (it reads code copy — pinned in
    // landingPricing.test.ts).
    expect(sanitizePlanDoc('seva', { name: 'Seva Free' }).name).toBe('Seva Free');
    expect(sanitizePlanDoc('premium', { name: 'Premium' }).name).toBe('Premium');
    expect(sanitizePlanDoc('premium', {}).name).toBe('Enterprise');
  });
});

describe('boot path — the data the landing renders can never hit an undefined tier', () => {
  it('all four landing cards resolve with name, badge and finite prices', () => {
    const cards = landingPriceCards(DEFAULT_TERMS);
    expect(cards).toHaveLength(4);
    for (const id of TERMS_PLAN_IDS) {
      const card = landingCard(cards, id);
      expect(card.name.length).toBeGreaterThan(0);
      expect(typeof card.badge).toBe('string');
      expect((card.badge as string).length).toBeGreaterThan(0);
      expect(Number.isFinite(card.inrMonthly)).toBe(true);
      expect(Number.isFinite(card.inrAnnual)).toBe(true);
      expect(Number.isFinite(card.bdtMonthly)).toBe(true);
      expect(Number.isFinite(card.usdMonthly)).toBe(true);
    }
    expect(landingCard(cards, 'seva').name).toBe('Lite');
    expect(landingCard(cards, 'premium').name).toBe('Enterprise');
  });

  it('source guards: no consumer reads a non-existent PLAN_PRICING key', () => {
    const consumers = [
      'pages/LandingPage.tsx',
      'components/common/UpsellModal.tsx',
      'components/common/PlanLockedDesk.tsx',
      'components/common/Sidebar.tsx',
      'components/onboarding/wizardDeskMap.ts',
    ];
    for (const rel of consumers) {
      expect(src(rel)).not.toMatch(/PLAN_PRICING\.(LITE|ENTERPRISE)\b/);
    }
  });

  it('source guards: retired hard-coded names stay out of the consumers', () => {
    expect(src('pages/LandingPage.tsx')).not.toContain('Seva Free');
    expect(src('components/common/UpsellModal.tsx')).not.toContain('DISPLAY_NAMES');
    expect(src('components/common/UpsellModal.tsx')).not.toContain("'Seva Free'");
    expect(src('components/common/Sidebar.tsx')).not.toContain("'STANDARD' ? 'STANDARD' : 'ENTERPRISE'");
    expect(src('components/onboarding/wizardDeskMap.ts')).not.toContain('ENTERPRISE: 3');
    expect(src('lib/settingsHonesty.ts')).not.toContain('Seva Free limits now apply');
  });
});
