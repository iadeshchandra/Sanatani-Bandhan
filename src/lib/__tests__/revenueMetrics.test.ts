/**
 * revenueMetrics.test.ts — AUDIT FIX #8: MRR must be real.
 */
import {
  CANONICAL_MONTHLY_INR,
  computeMrr,
  explainMrr,
  inferCadence,
  monthlyEquivalent,
  normalizePlanId,
} from '../revenueMetrics';

describe('normalizePlanId', () => {
  test('uppercases plan IDs', () => {
    expect(normalizePlanId('standard')).toBe('STANDARD');
    expect(normalizePlanId('Premium')).toBe('PREMIUM');
    expect(normalizePlanId('PUROHIT_PRO')).toBe('PUROHIT_PRO');
    expect(normalizePlanId('seva')).toBe('SEVA');
  });

  test('maps legacy half-renamed tiers', () => {
    expect(normalizePlanId('LITE')).toBe('SEVA');
    expect(normalizePlanId('ENTERPRISE')).toBe('PREMIUM');
  });

  test('unknown / empty IDs → null (never guessed)', () => {
    expect(normalizePlanId('GOLD')).toBeNull();
    expect(normalizePlanId('')).toBeNull();
    expect(normalizePlanId(null)).toBeNull();
    expect(normalizePlanId(undefined)).toBeNull();
  });
});

describe('canonical pricing', () => {
  test('matches locked planPricing (INR)', () => {
    expect(CANONICAL_MONTHLY_INR.SEVA).toBe(0);
    expect(CANONICAL_MONTHLY_INR.STANDARD).toBe(499);
    expect(CANONICAL_MONTHLY_INR.PREMIUM).toBe(1999);
    expect(CANONICAL_MONTHLY_INR.PUROHIT_PRO).toBe(199);
  });
});

describe('monthlyEquivalent', () => {
  test('annual → /12', () => {
    expect(monthlyEquivalent(4999, 'annual')).toBeCloseTo(416.58, 1);
  });
  test('monthly unchanged', () => {
    expect(monthlyEquivalent(499, 'monthly')).toBe(499);
  });
  test('negative / NaN → 0', () => {
    expect(monthlyEquivalent(-5, 'monthly')).toBe(0);
    expect(monthlyEquivalent(NaN, 'annual')).toBe(0);
  });
});

describe('inferCadence', () => {
  test('12-month span → annual', () => {
    expect(inferCadence('2026-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z')).toBe('annual');
  });
  test('1-month span → monthly', () => {
    expect(inferCadence('2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')).toBe('monthly');
  });
  test('missing / bad dates → monthly (conservative)', () => {
    expect(inferCadence(null, null)).toBe('monthly');
    expect(inferCadence('garbage', '2027-01-01')).toBe('monthly');
  });
});

describe('computeMrr', () => {
  test('zero subs → zero MRR', () => {
    const r = computeMrr([]);
    expect(r.mrr).toBe(0);
    expect(r.activeCount).toBe(0);
    expect(r.lines).toEqual([]);
  });

  test('monthly subs sum at full price', () => {
    const r = computeMrr([
      { planId: 'STANDARD', period: 'monthly' },
      { planId: 'STANDARD', period: 'monthly' },
      { planId: 'PREMIUM', period: 'monthly' },
    ]);
    expect(r.mrr).toBe(499 * 2 + 1999);
    expect(r.activeCount).toBe(3);
  });

  test('annual subs count at annual/12 (not monthly/12)', () => {
    const r = computeMrr([
      { planId: 'standard', period: 'annual' }, // lowercase ID — the old case bug
    ]);
    expect(r.mrr).toBeCloseTo(4999 / 12, 5);
    expect(r.activeCount).toBe(1);
  });

  test('mixed monthly + annual', () => {
    const r = computeMrr([
      { planId: 'STANDARD', period: 'monthly' },
      { planId: 'PREMIUM', period: 'annual' },
    ]);
    expect(r.mrr).toBeCloseTo(499 + 19999 / 12, 5);
  });

  test('cadence inferred from dates when period missing', () => {
    const r = computeMrr([
      { planId: 'STANDARD', startDate: '2026-01-01T00:00:00.000Z', endDate: '2027-01-01T00:00:00.000Z' },
    ]);
    expect(r.mrr).toBeCloseTo(4999 / 12, 5);
  });

  test('lowercase seed-style IDs resolve (old case bug)', () => {
    const r = computeMrr([{ planId: 'premium', period: 'monthly' }]);
    expect(r.mrr).toBe(1999);
  });

  test('legacy renamed tiers resolve', () => {
    const r = computeMrr([{ planId: 'ENTERPRISE', period: 'monthly' }]);
    expect(r.mrr).toBe(1999); // canonical PREMIUM, not the stale 4999
  });

  test('unknown plans excluded honestly', () => {
    const r = computeMrr([{ planId: 'GOLD', period: 'monthly' }, { planId: 'STANDARD', period: 'monthly' }]);
    expect(r.mrr).toBe(499);
    expect(r.activeCount).toBe(1);
  });

  test('owner-edited price overrides respected (case-insensitive keys)', () => {
    const r = computeMrr(
      [{ planId: 'STANDARD', period: 'monthly' }],
      { standard: { monthly: 599, annual: 5990 } },
    );
    expect(r.mrr).toBe(599);
  });

  test('owner-edited annual override uses the annual price', () => {
    const r = computeMrr(
      [{ planId: 'STANDARD', period: 'annual' }],
      { STANDARD: { monthly: 599, annual: 5990 } },
    );
    expect(r.mrr).toBeCloseTo(5990 / 12, 5);
  });

  test('PUROHIT_PRO counted', () => {
    const r = computeMrr([{ planId: 'PUROHIT_PRO', period: 'monthly' }]);
    expect(r.mrr).toBe(199);
  });

  test('SEVA free plans contribute nothing but count as active', () => {
    const r = computeMrr([{ planId: 'SEVA', period: 'monthly' }]);
    expect(r.mrr).toBe(0);
    expect(r.activeCount).toBe(1);
  });
});

describe('explainMrr', () => {
  test('empty → honest message', () => {
    expect(explainMrr(computeMrr([]))).toBe('No active paid subscriptions.');
  });
  test('shows the math', () => {
    const text = explainMrr(computeMrr([
      { planId: 'STANDARD', period: 'monthly' },
      { planId: 'STANDARD', period: 'annual' },
    ]));
    expect(text).toContain('1 × STANDARD (₹499/mo)');
    expect(text).toContain('÷ 12');
    expect(text).toContain('= ₹');
  });
});
