/**
 * referrals.test.ts — pure-logic tests for the referral credit engine.
 * Repo convention: jest (see src/tests/). Run via the project's test script.
 */
import {
  clampReferralPercent,
  computeReferralCredit,
  percentToBps,
  DEFAULT_REFERRAL_CONFIG,
} from './referralMath';

describe('computeReferralCredit', () => {
  it('pays the configured share of the seva value', () => {
    // ₹1,000 seva, 2% referral, ₹120 platform commission → ₹20 credit, ₹100 kept.
    const r = computeReferralCredit(1000, 200, 120);
    expect(r.creditAmount).toBe(20);
    expect(r.platformNet).toBe(100);
  });

  it('never exceeds the platform commission', () => {
    // Misconfigured 40% referral on a 5% commission: capped at the commission.
    const r = computeReferralCredit(1000, 4000, 50);
    expect(r.creditAmount).toBe(50);
    expect(r.platformNet).toBe(0);
  });

  it('rounds to whole currency units', () => {
    const r = computeReferralCredit(999, 200, 120);
    expect(r.creditAmount).toBe(20); // 19.98 → 20
  });

  it('yields zero for zero value or zero commission', () => {
    expect(computeReferralCredit(0, 200, 120).creditAmount).toBe(0);
    expect(computeReferralCredit(1000, 200, 0).creditAmount).toBe(0);
    expect(computeReferralCredit(1000, 0, 120).creditAmount).toBe(0);
  });

  it('treats negatives as zero (fail-closed)', () => {
    expect(computeReferralCredit(-500, 200, 120).creditAmount).toBe(0);
  });
});

describe('percent helpers', () => {
  it('clamps percents to [0, 50]', () => {
    expect(clampReferralPercent(2)).toBe(2);
    expect(clampReferralPercent(99)).toBe(50);
    expect(clampReferralPercent(-3)).toBe(0);
    expect(clampReferralPercent(NaN)).toBe(0);
  });

  it('converts percent to integer basis points', () => {
    expect(percentToBps(2)).toBe(200);
    expect(percentToBps(2.5)).toBe(250);
  });
});

describe('DEFAULT_REFERRAL_CONFIG', () => {
  it('defaults to 2% both directions, enabled', () => {
    expect(DEFAULT_REFERRAL_CONFIG['jyotish-to-purohit']).toEqual({ enabled: true, percent: 2 });
    expect(DEFAULT_REFERRAL_CONFIG['purohit-to-jyotish']).toEqual({ enabled: true, percent: 2 });
  });
});
