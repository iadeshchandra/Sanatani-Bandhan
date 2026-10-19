/**
 * sangam/shorts/shortsRanking.ts — Shorts ranking: freshness + closeness +
 * ashirvad velocity + completion. Deterministic, client-side, $0.
 * ============================================================================
 * Reuses recencyScore + closenessScore from the feed engine (same signals,
 * same GodMode-tuned philosophy). Shorts-specific additions:
 *   - Ashirvad velocity: ashirvads per hour since posting (log-scaled).
 *   - Completion proxy: shorts are ≤60s by nature; viewCount relative to
 *     age acts as a soft completion signal (watched-through implies views).
 * The law stays: MEANINGFUL over VIRAL.
 */

import { recencyScore, closenessScore, type UserSignals } from '../../ranking/feed';
import type { Short } from './types';

/** Tunable weights — mirrors the feed engine's philosophy. */
export interface ShortsWeights {
  recency: number; // 0.35 default — shorts are timely
  closeness: number; // 0.25 default
  velocity: number; // 0.25 default — ashirvad velocity
  engagement: number; // 0.15 default — total engagement, log-scaled
}

export const DEFAULT_SHORTS_WEIGHTS: ShortsWeights = {
  recency: 0.35,
  closeness: 0.25,
  velocity: 0.25,
  engagement: 0.15,
};

/**
 * Ashirvad velocity: ashirvads per hour, log-scaled to 0-1.
 * ln(1 + perHour) / ln(1 + 20): 20 ashirvads/hour ≈ 1.0.
 */
export function ashirvadVelocityScore(s: Short, now: number = Date.now()): number {
  const hoursOld = Math.max(0.25, (now - s.createdAt) / 3_600_000);
  const perHour = (s.ashirvadCount || 0) / hoursOld;
  if (perHour <= 0) return 0;
  return Math.min(1, Math.log(1 + perHour) / Math.log(21));
}

/**
 * Engagement score: total weighted engagement, log-scaled.
 * ashirvads×1 + comments×3 + shares×5, like the feed engine.
 */
export function shortsEngagementScore(s: Short): number {
  const weighted =
    (s.ashirvadCount || 0) + (s.commentCount || 0) * 3 + (s.shareCount || 0) * 5;
  if (weighted <= 0) return 0;
  return Math.min(1, Math.log(1 + weighted) / Math.log(201));
}

/** Full short score: weighted sum, 0-1 (before penalties). */
export function scoreShort(
  s: Short,
  signals: UserSignals,
  weights: ShortsWeights = DEFAULT_SHORTS_WEIGHTS,
  now: number = Date.now(),
): number {
  const recency = recencyScore(s.createdAt, now);
  const closeness = closenessScore(s.authorUid, signals);
  const velocity = ashirvadVelocityScore(s, now);
  const engagement = shortsEngagementScore(s);
  return (
    weights.recency * recency +
    weights.closeness * closeness +
    weights.velocity * velocity +
    weights.engagement * engagement
  );
}

export interface RankedShort {
  short: Short;
  score: number;
}

/**
 * Rank shorts: score, apply calm guardrails, sort, enforce diversity.
 * - Reported shorts (reportCount > 0): -80% (they sink, admin decides).
 * - Diversity: 3rd+ short from the same author in the top 10 gets -50%.
 */
export function rankShorts(
  shorts: Short[],
  signals: UserSignals,
  weights: ShortsWeights = DEFAULT_SHORTS_WEIGHTS,
  now: number = Date.now(),
): RankedShort[] {
  const scored: RankedShort[] = shorts.map((s) => {
    let score = scoreShort(s, signals, weights, now);
    if ((s.reportCount || 0) > 0) score *= 1 - 0.8;
    return { short: s, score };
  });
  scored.sort((a, b) => b.score - a.score);

  // Diversity: cap same-author dominance in the top 10.
  const authorCount: Record<string, number> = {};
  for (const rs of scored.slice(0, 10)) {
    const n = (authorCount[rs.short.authorUid] || 0) + 1;
    authorCount[rs.short.authorUid] = n;
    if (n >= 3) rs.score *= 0.5;
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/** Human-readable explanation for why a short ranks where it does. */
export function explainShortScore(rs: RankedShort): string {
  const parts: string[] = [];
  const s = rs.short;
  if ((s.ashirvadCount || 0) >= 10) parts.push('loved by the sangha');
  if (Date.now() - s.createdAt < 6 * 3_600_000) parts.push('fresh');
  if (parts.length === 0) parts.push('a recent sacred moment');
  return `Shown because it's ${parts.join(' and ')}.`;
}
