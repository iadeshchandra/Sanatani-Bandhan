/**
 * lib/sevaPro/tierMapping.ts — ONE mapping between the app's tier enums.
 * =====================================================================
 * The Seva Professional program speaks three "tier" dialects that grew
 * independently:
 *
 *   SevaProTier (canonical, display-facing):
 *     REGISTERED → VERIFIED → TRUSTED
 *
 *   PurohitVerificationTier (4-step pipeline, never skips):
 *     REGISTERED → CREDENTIAL_VERIFIED → ORG_ENDORSED → PLATFORM_VERIFIED
 *   (Sangam's VerificationTier is the same 4-step pipeline.)
 *
 *   SanataniVerificationTier (devotee identity, subset):
 *     REGISTERED → VERIFIED
 *
 * This module is the single source of truth for converting between them.
 * It changes NO behavior — it only names the mapping so every consumer
 * (Seva Bazar cards, trust badges, triage) reads from one place.
 *
 * Mapping rationale (documented, not derived):
 * - CREDENTIAL_VERIFIED → VERIFIED: sacred credentials honored = verified.
 * - ORG_ENDORSED → VERIFIED: an org reference is strong, but TRUSTED is
 *   *earned* through the trust-score system (≥10 sevas, ≥4.5★, reference).
 *   Endorsement alone does not skip the queue.
 * - PLATFORM_VERIFIED → TRUSTED: the platform's full verification is the
 *   TRUSTED bar.
 */

import type { SevaProTier } from './tiers';
import type { PurohitVerificationTier } from '../../types/purohit';
import { normalizePurohitTier } from '../../types/purohit';
import type { SanataniVerificationTier } from '../../solo/types';

/**
 * JY-FIX-B (JY-03): the stored-value normaliser lives with the tier type
 * (types/purohit.ts) and is re-exported here so SevaPro consumers have
 * one import surface. Any reader indexing PUROHIT_TIER_META MUST pass
 * the stored value through it first — legacy docs may carry the SevaPro
 * dialect ('VERIFIED' / 'TRUSTED') in `verificationTier`.
 */
export { normalizePurohitTier };

export type { SevaProTier };

/** The canonical ordered tiers, re-exported for consumers. */
export const SEVA_PRO_TIERS: readonly SevaProTier[] = ['REGISTERED', 'VERIFIED', 'TRUSTED'] as const;

/** Purohit 4-step pipeline → canonical SevaPro tier. */
export function purohitTierToSevaProTier(tier: PurohitVerificationTier | string | null | undefined): SevaProTier {
  switch (tier) {
    case 'PLATFORM_VERIFIED':
      return 'TRUSTED';
    case 'CREDENTIAL_VERIFIED':
    case 'ORG_ENDORSED':
      return 'VERIFIED';
    case 'REGISTERED':
    default:
      return 'REGISTERED';
  }
}

/** Canonical SevaPro tier → nearest purohit pipeline step (reverse map). */
export function sevaProTierToPurohitTier(tier: SevaProTier | string | null | undefined): PurohitVerificationTier {
  switch (tier) {
    case 'TRUSTED':
      return 'PLATFORM_VERIFIED';
    case 'VERIFIED':
      return 'CREDENTIAL_VERIFIED';
    case 'REGISTERED':
    default:
      return 'REGISTERED';
  }
}

/** Devotee identity tier → canonical SevaPro tier (subset, identity map). */
export function sanataniTierToSevaProTier(tier: SanataniVerificationTier | string | null | undefined): SevaProTier {
  return tier === 'VERIFIED' ? 'VERIFIED' : 'REGISTERED';
}

/** Type guard — is this string a canonical SevaPro tier? */
export function isSevaProTier(value: unknown): value is SevaProTier {
  return value === 'REGISTERED' || value === 'VERIFIED' || value === 'TRUSTED';
}

/** Rank for ordering (higher = more trusted). Unknown → -1. */
export function sevaProTierRank(tier: SevaProTier | string | null | undefined): number {
  const i = (SEVA_PRO_TIERS as readonly string[]).indexOf(tier as string);
  return i;
}

/** Warm display label for the tier badge (EN/HI/BN). */
export function sevaProTierLabel(
  tier: SevaProTier,
  lang: 'en' | 'hi' | 'bn' = 'en'
): string {
  const labels: Record<SevaProTier, Record<'en' | 'hi' | 'bn', string>> = {
    REGISTERED: { en: 'Registered', hi: 'पंजीकृत', bn: 'নিবন্ধিত' },
    VERIFIED: { en: '✓ Verified Sevak', hi: '✓ सत्यापित सेवक', bn: '✓ যাচাইকৃত সেবক' },
    TRUSTED: { en: '🌟 Trusted Sevak', hi: '🌟 विश्वसनीय सेवक', bn: '🌟 বিশ্বস্ত সেবক' },
  };
  return labels[tier][lang];
}
