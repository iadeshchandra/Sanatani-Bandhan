/**
 * referralMath.ts — pure referral-credit math (no Firebase imports).
 * =====================================================================
 * Kept free of Firestore so it stays unit-testable under the repo's jest
 * setup (which cannot load firebase.ts as ESM). Re-exported by referrals.ts.
 *
 * Money rule: credit = min(round(sevaValue × referralBps / 10000),
 * platformCommission). The referrer can never earn more than the platform's
 * own commission on that order — the platform keeps the remainder, and never
 * a paisa comes from the other provider's earnings.
 */

/** Platform commission % for seva gigs/consultations (referral math input).
 * Mirrors the marketplace default (GodMode → commission rules, currently 12%). */
export const DEFAULT_PLATFORM_COMMISSION_PERCENT = 12;

/** Clamp a percent into [0, 50]. */
export function clampReferralPercent(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(50, Math.max(0, p));
}

/** Convert a percent (e.g. 2.5) to integer basis points (250). */
export function percentToBps(percent: number): number {
  return Math.round(clampReferralPercent(percent) * 100);
}

export interface ComputedReferralCredit {
  creditAmount: number;
  platformNet: number;
  referralBps: number;
}

/**
 * Pure math: credit = min(round(sevaValue × bps / 10000), platformCommission).
 * Fail-closed: negatives and NaNs become zero.
 */
export function computeReferralCredit(
  sevaValue: number,
  referralBps: number,
  platformCommission: number
): ComputedReferralCredit {
  const value = Math.max(0, Math.round(sevaValue || 0));
  const commission = Math.max(0, Math.round(platformCommission || 0));
  const bps = Math.max(0, Math.round(referralBps || 0));
  const raw = Math.round((value * bps) / 10000);
  const creditAmount = Math.min(raw, commission);
  return { creditAmount, platformNet: commission - creditAmount, referralBps: bps };
}

export interface DirectionReferralConfig {
  enabled: boolean;
  /** Percent, e.g. 2 = 2%. Converted to basis points at settle time. */
  percent: number;
}

/** platformConfig/sevaReferralConfig — GodMode-owned (rules already owner-write). */
export interface SevaReferralConfig {
  'jyotish-to-purohit': DirectionReferralConfig;
  'purohit-to-jyotish': DirectionReferralConfig;
  updatedAt?: number;
  updatedBy?: string;
}

export const DEFAULT_REFERRAL_CONFIG: SevaReferralConfig = {
  'jyotish-to-purohit': { enabled: true, percent: 2 },
  'purohit-to-jyotish': { enabled: true, percent: 2 },
};
