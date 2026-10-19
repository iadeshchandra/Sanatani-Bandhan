/**
 * sevaPro/gratitudeWall.ts — Kritagyata wall data logic (pure, jest-safe).
 * ============================================================================
 * The GratitudeWall component (src/sangam/GratitudeWall.tsx) was built but
 * never mounted anywhere. This module holds the firebase-free logic for
 * selecting a provider's gratitude posts; ProviderGratitudeWall.tsx does
 * the Firestore fetch and renders the wall on the Seva Pro profile.
 *
 * STANDING LAW: gratitude is "N families shared gratitude" — never star
 * numbers, never scores.
 */

import type { SangamPost } from '../../sangam/types';

/** GratitudeWall accepts en/hi/bn; everything else falls back to en. */
export type WallLang = 'en' | 'hi' | 'bn';

export function toWallLang(lang: string | undefined | null): WallLang {
  return lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';
}

/**
 * Select the posts to show on a provider's gratitude wall.
 * - keeps only kind === 'gratitude' (the query is providerUid-scoped, but
 *   other post kinds may also carry providerUid — e.g. service cards)
 * - drops removed posts
 * - newest first, capped at `max`
 */
export function selectGratitudePosts(posts: SangamPost[], max = 10): SangamPost[] {
  const safeMax = Number.isFinite(max) && max > 0 ? Math.floor(max) : 10;
  return posts
    .filter((p) => p && p.kind === 'gratitude' && p.status !== 'removed')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, safeMax);
}
