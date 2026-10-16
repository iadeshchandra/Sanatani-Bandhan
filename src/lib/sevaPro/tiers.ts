/**
 * tiers.ts — Seva Professional verification tiers, formalized.
 * ============================================================
 * Three tiers of sacred trust:
 *
 *   REGISTERED — basic signup. Limited visibility. Cannot accept paid sevas.
 *   VERIFIED ✓  — sacred credentials honored by the platform. Full
 *                  marketplace access + the Pratham Seva welcome reward
 *                  (first N sevas commission-free).
 *   TRUSTED 🌟  — verified + ≥10 completed sevas + ≥4.5★ rating + a temple
 *                  endorsement. Top placement in search and the marketplace.
 *
 * The tier field already exists on purohits / jyotishProfiles documents
 * (`verificationTier`). These helpers are the single source of truth for
 * reading and reasoning about it.
 */
import { sevaProCopy, type SevaProLang } from './sevaProCopy';

export type SevaProTier = 'REGISTERED' | 'VERIFIED' | 'TRUSTED';

/** All tiers in ascending order of trust. */
export const TIER_ORDER: SevaProTier[] = ['REGISTERED', 'VERIFIED', 'TRUSTED'];

/** Numeric rank for comparisons (higher = more trusted). */
export function tierRank(tier: SevaProTier | string | undefined | null): number {
  const i = TIER_ORDER.indexOf((tier as SevaProTier) || 'REGISTERED');
  return i < 0 ? 0 : i;
}

export interface TierBadgeMeta {
  tier: SevaProTier;
  /** Short badge label, e.g. "Verified ✓". */
  label: string;
  /** Small icon glyph for the badge. */
  icon: string;
  /** One-line blessing shown under the badge. */
  blessing: string;
  /** Tailwind-friendly accent used by badge components. */
  accentClass: string;
}

/**
 * Badge metadata for a tier in the requested language.
 * Warm, dignified copy — never compliance language.
 */
export function tierBadge(tier: SevaProTier | string | undefined | null, lang: SevaProLang = 'en'): TierBadgeMeta {
  const t: SevaProTier = TIER_ORDER.includes(tier as SevaProTier) ? (tier as SevaProTier) : 'REGISTERED';
  switch (t) {
    case 'VERIFIED':
      return {
        tier: t,
        label: sevaProCopy(lang, 'tierVerifiedLabel'),
        icon: '✓',
        blessing: sevaProCopy(lang, 'tierVerifiedBlessing'),
        accentClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      };
    case 'TRUSTED':
      return {
        tier: t,
        label: sevaProCopy(lang, 'tierTrustedLabel'),
        icon: '🌟',
        blessing: sevaProCopy(lang, 'tierTrustedBlessing'),
        accentClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      };
    case 'REGISTERED':
    default:
      return {
        tier: 'REGISTERED',
        label: sevaProCopy(lang, 'tierRegisteredLabel'),
        icon: '🪔',
        blessing: sevaProCopy(lang, 'tierRegisteredBlessing'),
        accentClass: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
      };
  }
}

/** Read the tier from a profile document (purohits or jyotishProfiles). */
export function getTier(profile: { verificationTier?: string } | null | undefined): SevaProTier {
  const t = profile?.verificationTier;
  return TIER_ORDER.includes(t as SevaProTier) ? (t as SevaProTier) : 'REGISTERED';
}

/**
 * Only VERIFIED and above may accept paid sevas. REGISTERED professionals
 * can browse and build their profile, but the marketplace keeps paid work
 * behind honored credentials.
 */
export function canAcceptPaidSevas(tier: SevaProTier | string | undefined | null): boolean {
  return tierRank(tier) >= tierRank('VERIFIED');
}

/** TRUSTED professionals get top placement in search/marketplace listings. */
export function getsTopPlacement(tier: SevaProTier | string | undefined | null): boolean {
  return tier === 'TRUSTED';
}

/** TRUSTED 🌟 bar — all three must hold, plus the tier above. */
export const TRUSTED_REQUIREMENTS = {
  minCompletedSevas: 10,
  minRating: 4.5,
  minTempleEndorsements: 1,
} as const;

export interface TrustedEligibility {
  eligible: boolean;
  completedSevas: number;
  rating: number;
  endorsements: number;
  missing: string[];
}

/**
 * Check whether a VERIFIED professional qualifies for the TRUSTED 🌟 blessing.
 * Pure function — the caller decides when/how to apply the promotion
 * (manual GodMode grant or an auto-advance job).
 */
export function qualifiesForTrusted(input: {
  completedSevas: number;
  rating: number;
  ratingCount: number;
  templeEndorsements: number;
}): TrustedEligibility {
  const missing: string[] = [];
  if (input.completedSevas < TRUSTED_REQUIREMENTS.minCompletedSevas) {
    missing.push(`needs ${TRUSTED_REQUIREMENTS.minCompletedSevas - input.completedSevas} more completed sevas`);
  }
  if (input.ratingCount < 3 || input.rating < TRUSTED_REQUIREMENTS.minRating) {
    missing.push(`needs a ${TRUSTED_REQUIREMENTS.minRating}★ rating (at least 3 devotee reviews)`);
  }
  if (input.templeEndorsements < TRUSTED_REQUIREMENTS.minTempleEndorsements) {
    missing.push('needs a temple or matha endorsement');
  }
  return {
    eligible: missing.length === 0,
    completedSevas: input.completedSevas,
    rating: input.rating,
    endorsements: input.templeEndorsements,
    missing,
  };
}

/** Is `next` a forward step from `current` (never a silent downgrade)? */
export function isTierAdvancement(current: SevaProTier | string | undefined | null, next: SevaProTier): boolean {
  return tierRank(next) > tierRank(current);
}
