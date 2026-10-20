/**
 * ai/godmode/__tests__/ownerBrief.test.ts — QUEUED #32.
 * The Owner Brief: baseline integrity + the warning rubric.
 */
import {
  OWNER_HEURISTICS,
  STANDING_LAWS,
  briefForPrompt,
  checkAgainstBrief,
  lawBaselineTerms,
} from '../ownerBrief';
import { DEFAULT_TERMS, type PlatformTerms } from '../../../lib/termsConfig';

function liveTerms(mutate?: (t: PlatformTerms) => void): PlatformTerms {
  const t: PlatformTerms = JSON.parse(JSON.stringify(DEFAULT_TERMS));
  t.loadedAt = 1760000000000; // a real config read
  if (mutate) mutate(t);
  return t;
}

describe('lawBaselineTerms', () => {
  it('carries the locked FINAL pricing law', () => {
    const b = lawBaselineTerms();
    expect(b.plans.seva.priceMonthlyINR).toBe(0);
    expect(b.plans.standard.priceMonthlyINR).toBe(499);
    expect(b.plans.standard.priceMonthlyBDT).toBe(700);
    expect(b.plans.standard.priceMonthlyUSD).toBe(6);
    expect(b.plans.premium.priceMonthlyINR).toBe(1999);
    expect(b.plans.premium.priceMonthlyBDT).toBe(2800);
    expect(b.plans.purohit_pro.priceMonthlyINR).toBe(199);
    expect(b.plans.purohit_pro.priceMonthlyBDT).toBe(280);
    expect(b.commission).toEqual({ freeRate: 15, proRail1Rate: 8, proRail2Rate: 12, freeGigLimit: 3 });
  });

  it('returns a defensive copy', () => {
    const b = lawBaselineTerms();
    b.plans.standard.priceMonthlyINR = 1;
    expect(lawBaselineTerms().plans.standard.priceMonthlyINR).toBe(499);
  });
});

describe('checkAgainstBrief', () => {
  it('is silent on the law itself (loaded)', () => {
    expect(checkAgainstBrief(liveTerms())).toEqual([]);
  });

  it('is silent on unloaded defaults (no drift theatre)', () => {
    const t = liveTerms();
    t.loadedAt = null;
    expect(checkAgainstBrief(t)).toEqual([]);
  });

  it('flags drift from the baseline with the law value named', () => {
    const w = checkAgainstBrief(liveTerms((t) => { t.plans.standard.priceMonthlyBDT = 777; }));
    const drift = w.filter((x) => x.kind === 'drift');
    expect(drift.length).toBeGreaterThan(0);
    expect(drift.map((x) => x.message).join(' ')).toMatch(/777/);
    expect(drift.map((x) => x.message).join(' ')).toMatch(/700/);
  });

  it('flags commission drift', () => {
    const w = checkAgainstBrief(liveTerms((t) => { t.commission.proRail2Rate = 14; }));
    expect(w.some((x) => x.kind === 'drift' && /Commission/.test(x.message))).toBe(true);
  });

  it('flags annual-ratio breaks of the "2 months free" law', () => {
    const w = checkAgainstBrief(liveTerms((t) => { t.plans.standard.priceYearlyINR = 499 * 12; }));
    expect(w.some((x) => x.kind === 'annual_ratio')).toBe(true);
  });

  it('flags tier inversion', () => {
    const w = checkAgainstBrief(liveTerms((t) => { t.plans.premium.priceMonthlyINR = 100; }));
    expect(w.some((x) => x.kind === 'tier_inversion')).toBe(true);
  });

  it('flags a paid tier priced at zero', () => {
    const w = checkAgainstBrief(
      liveTerms((t) => {
        t.plans.standard.priceMonthlyINR = 0;
        t.plans.standard.priceMonthlyBDT = 0;
        t.plans.standard.priceMonthlyUSD = 0;
      })
    );
    expect(w.some((x) => x.kind === 'free_paid_tier')).toBe(true);
  });

  it('flags Pro rates above the community rate', () => {
    const w = checkAgainstBrief(liveTerms((t) => { t.commission.proRail1Rate = 16; }));
    expect(w.some((x) => x.kind === 'pro_inversion')).toBe(true);
  });

  it('flags the bypass-risk band, citing the Pathao lesson', () => {
    const w = checkAgainstBrief(liveTerms((t) => { t.commission.freeRate = 25; }));
    const hit = w.find((x) => x.kind === 'bypass_risk');
    expect(hit).toBeDefined();
    expect(hit?.message).toMatch(/Pathao|bypass/i);
  });
});

describe('brief content', () => {
  it('carries the five named heuristics and the standing laws', () => {
    expect(OWNER_HEURISTICS.map((h) => h.id)).toEqual([
      'bypass-proof-revenue',
      'never-discount-the-sacred',
      'trust-is-the-moat',
      'floor-before-flagship',
      'honest-disagreement',
    ]);
    expect(STANDING_LAWS.length).toBeGreaterThanOrEqual(8);
    expect(STANDING_LAWS.join(' ')).toMatch(/Blaze/);
  });

  it('briefForPrompt renders vision, laws, heuristics and the baseline', () => {
    const s = briefForPrompt();
    expect(s).toMatch(/all-in-one Sanatani life companion/);
    expect(s).toMatch(/Bypass-proof revenue first/);
    expect(s).toMatch(/Standard ₹499/);
    expect(s.length).toBeLessThan(4000); // compact DATA block, not a novel
  });
});
