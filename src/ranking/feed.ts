/**
 * ranking/feed.ts — Sangam Feed Ranking Engine.
 * ====================================================================
 * Facebook-style ranking, Sanatani values. Deterministic, client-side, $0.
 *
 * The law: MEANINGFUL over VIRAL. A thoughtful comment outweighs ten
 * quick Ashirvads. Reported content sinks. No rage-bait amplification.
 *
 * Every weight is tunable from GodMode (platformConfig/ranking) and every
 * score is explainable — no black boxes.
 */

import type { SangamPost, PostKind } from '../sangam/types';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** What the user has done — stored locally in IndexedDB, never leaves the device. */
export interface UserSignals {
  /** authorUid -> weighted interaction score (Ashirvad=1, comment=3, share=5, follow=10) */
  authorAffinity: Record<string, number>;
  /** PostKind -> engagement count (for content affinity) */
  kindAffinity: Partial<Record<PostKind, number>>;
  /** postIds the user has already seen (for impression tracking) */
  seenPostIds: string[];
}

export const emptyUserSignals = (): UserSignals => ({
  authorAffinity: {},
  kindAffinity: {},
  seenPostIds: [],
});

/** Tunable weights — GodMode can override these. */
export interface FeedWeights {
  recency: number;      // 0.25 default
  closeness: number;    // 0.30 default
  meaningfulness: number; // 0.25 default
  contentAffinity: number; // 0.10 default
  diversityPenalty: number; // 0.50 default (applied as multiplier reduction)
  reportPenalty: number;   // 0.80 default (score reduction)
  stalePenalty: number;    // 0.30 default (zero-engagement after impressions)
}

export const DEFAULT_FEED_WEIGHTS: FeedWeights = {
  recency: 0.25,
  closeness: 0.30,
  meaningfulness: 0.25,
  contentAffinity: 0.10,
  diversityPenalty: 0.50,
  reportPenalty: 0.80,
  stalePenalty: 0.30,
};

/** A post with its computed score and human-readable explanation. */
export interface ScoredPost {
  post: SangamPost;
  score: number;
  breakdown: {
    recency: number;
    closeness: number;
    meaningfulness: number;
    contentAffinity: number;
    diversityApplied: boolean;
    reportPenaltyApplied: boolean;
    stalePenaltyApplied: boolean;
  };
}

/* ------------------------------------------------------------------ */
/* Scoring functions (all pure)                                        */
/* ------------------------------------------------------------------ */

/**
 * Recency score: gentle 48h exponential decay.
 * A post from 1 hour ago ≈ 0.98. From 24h ago ≈ 0.61. From 48h ≈ 0.37.
 */
export function recencyScore(createdAt: number, now: number = Date.now()): number {
  const hoursOld = Math.max(0, (now - createdAt) / 3_600_000);
  return Math.exp(-hoursOld / 48);
}

/**
 * Closeness score: normalized 0-1 based on interaction history with the author.
 * Uses log scaling so one super-fan doesn't dominate: score = ln(1 + affinity) / ln(1 + 50).
 * 50+ affinity points ≈ 1.0 (that's ~5 follows or ~10 shares worth).
 */
export function closenessScore(authorUid: string, signals: UserSignals): number {
  const affinity = signals.authorAffinity[authorUid] || 0;
  if (affinity <= 0) return 0;
  return Math.min(1, Math.log(1 + affinity) / Math.log(51));
}

/**
 * Meaningfulness score: the post's own engagement, log-scaled to prevent viral blowout.
 * Formula: ln(1 + comments×3 + shares×5 + ashirvads×1) / ln(1 + 200).
 * A post with 200 weighted engagements ≈ 1.0. Diminishing returns beyond that.
 */
export function meaningfulnessScore(post: SangamPost): number {
  const weighted = (post.commentCount || 0) * 3 + (post.shareCount || 0) * 5 + (post.ashirvadCount || 0);
  if (weighted <= 0) return 0;
  return Math.min(1, Math.log(1 + weighted) / Math.log(201));
}

/**
 * Content affinity: does this user engage with this kind of content?
 * Normalized against their most-engaged kind.
 */
export function contentAffinityScore(kind: PostKind, signals: UserSignals): number {
  const counts = Object.values(signals.kindAffinity);
  if (counts.length === 0) return 0.5; // neutral when no history
  const max = Math.max(...counts, 1);
  return (signals.kindAffinity[kind] || 0) / max;
}

/**
 * Full post score: weighted sum of the four signals.
 * Returns 0-1 (before penalties).
 */
export function scorePost(
  post: SangamPost,
  signals: UserSignals,
  weights: FeedWeights = DEFAULT_FEED_WEIGHTS,
  now: number = Date.now(),
): number {
  const recency = recencyScore(post.createdAt, now);
  const closeness = closenessScore(post.authorUid, signals);
  const meaningfulness = meaningfulnessScore(post);
  const affinity = contentAffinityScore(post.kind, signals);

  return (
    weights.recency * recency +
    weights.closeness * closeness +
    weights.meaningfulness * meaningfulness +
    weights.contentAffinity * affinity
  );
}

/* ------------------------------------------------------------------ */
/* Ranking (with diversity + calm guardrails)                          */
/* ------------------------------------------------------------------ */

/**
 * Rank a feed: score all posts, apply penalties, sort by score, enforce diversity.
 *
 * Diversity rule: if 2+ posts from the same author are already in the top 10,
 * subsequent posts from that author get -diversityPenalty score.
 *
 * Calm guardrails:
 * - Reported posts: -reportPenalty (they sink but aren't hidden — admin decides)
 * - Zero engagement after 100+ impressions: -stalePenalty (nobody cares, stop showing)
 */
export function rankFeed(
  posts: SangamPost[],
  signals: UserSignals,
  weights: FeedWeights = DEFAULT_FEED_WEIGHTS,
  impressions: Record<string, number> = {},
  now: number = Date.now(),
): ScoredPost[] {
  // Score everything first
  const scored: ScoredPost[] = posts.map((post) => {
    let score = scorePost(post, signals, weights, now);
    const breakdown: ScoredPost['breakdown'] = {
      recency: recencyScore(post.createdAt, now),
      closeness: closenessScore(post.authorUid, signals),
      meaningfulness: meaningfulnessScore(post),
      contentAffinity: contentAffinityScore(post.kind, signals),
      diversityApplied: false,
      reportPenaltyApplied: false,
      stalePenaltyApplied: false,
    };

    // Calm guardrail: reported content sinks
    if (post.status === 'reported') {
      score *= (1 - weights.reportPenalty);
      breakdown.reportPenaltyApplied = true;
    }

    // Calm guardrail: zero engagement after significant impressions
    const imp = impressions[post.id] || 0;
    const totalEngagement = (post.commentCount || 0) + (post.shareCount || 0) + (post.ashirvadCount || 0);
    if (imp >= 100 && totalEngagement === 0) {
      score *= (1 - weights.stalePenalty);
      breakdown.stalePenaltyApplied = true;
    }

    return { post, score, breakdown };
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Diversity pass: walk the sorted list, penalize author clustering in top 10
  const authorCountInTop10: Record<string, number> = {};
  for (let i = 0; i < scored.length; i++) {
    const sp = scored[i];
    if (i < 10) {
      const count = authorCountInTop10[sp.post.authorUid] || 0;
      if (count >= 2) {
        sp.score *= (1 - weights.diversityPenalty);
        sp.breakdown.diversityApplied = true;
      }
      authorCountInTop10[sp.post.authorUid] = count + 1;
    }
  }

  // Re-sort after diversity penalties
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

/* ------------------------------------------------------------------ */
/* Signal recording (local only)                                       */
/* ------------------------------------------------------------------ */

export type InteractionType = 'ashirvad' | 'comment' | 'share' | 'follow' | 'view';

const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
  ashirvad: 1,
  comment: 3,
  share: 5,
  follow: 10,
  view: 0, // views don't build affinity, only impressions
};

/**
 * Record a user interaction — returns updated signals (immutable update).
 * Call this when the user Ashirvads, comments, shares, or follows.
 */
export function recordInteraction(
  signals: UserSignals,
  type: InteractionType,
  authorUid: string,
  postKind?: PostKind,
): UserSignals {
  const weight = INTERACTION_WEIGHTS[type];
  const newAffinity = { ...signals.authorAffinity };
  if (weight > 0) {
    newAffinity[authorUid] = (newAffinity[authorUid] || 0) + weight;
  }

  const newKindAffinity = { ...signals.kindAffinity };
  if (postKind && weight > 0) {
    newKindAffinity[postKind] = (newKindAffinity[postKind] || 0) + 1;
  }

  return {
    authorAffinity: newAffinity,
    kindAffinity: newKindAffinity,
    seenPostIds: signals.seenPostIds,
  };
}

/**
 * Human-readable explanation of why a post ranks where it does.
 * Transparency builds trust — users can see the machinery.
 */
export function explainFeedScore(sp: ScoredPost): string {
  const parts: string[] = [];
  const b = sp.breakdown;

  if (b.closeness > 0.5) parts.push('from someone you interact with often');
  else if (b.closeness > 0.2) parts.push('from someone you\'ve engaged with');

  if (b.meaningfulness > 0.5) parts.push('sparking meaningful conversation');
  else if (b.meaningfulness > 0.2) parts.push('getting thoughtful engagement');

  if (b.recency > 0.8) parts.push('posted recently');
  else if (b.recency < 0.3) parts.push('from a while ago');

  if (b.diversityApplied) parts.push('lowered for feed diversity');
  if (b.reportPenaltyApplied) parts.push('lowered — under review');
  if (b.stalePenaltyApplied) parts.push('lowered — low engagement');

  if (parts.length === 0) return 'Ranked by recency and relevance.';
  return `Ranked here because it's ${parts.join(', ')}.`;
}
