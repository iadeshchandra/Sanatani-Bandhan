/**
 * ranking/marketplace.ts — Seva Bazar Ranking Engine.
 * ====================================================================
 * Fiverr-style ranking, Sanatani values. Deterministic, client-side, $0.
 *
 * The law: TRUST over TRANSACTIONS. Verification tier matters most after
 * relevance. New providers get a fair shot (newcomer boost). No black boxes —
 * every ranking is explainable.
 */

import type { ServiceCardDetails } from '../sangam/types';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** A provider as seen by the ranking engine. */
export interface RankableProvider {
  uid: string;
  name: string;
  tier: 'REGISTERED' | 'VERIFIED' | 'TRUSTED';
  /** ISO date when they joined (for newcomer boost). */
  joinedAt: string;
  /** Service card details (for relevance scoring). */
  serviceCard?: ServiceCardDetails;
  /** Categories they serve, e.g. ['vivah', 'griha-pravesh']. */
  categories: string[];
}

/** Performance stats — from Firestore, cached locally. */
export interface ProviderStats {
  totalOrders: number;
  completedOrders: number;
  onTimeOrders: number;
  gratitudeCount: number; // Kritagyata wall count (not star ratings)
  avgResponseHours: number; // average chat response time
  activeDisputes: number;
  cancelledOrders: number;
  /** Timestamp of last activity (for recency). */
  lastActiveAt: number;
}

export const emptyProviderStats = (): ProviderStats => ({
  totalOrders: 0,
  completedOrders: 0,
  onTimeOrders: 0,
  gratitudeCount: 0,
  avgResponseHours: 24,
  activeDisputes: 0,
  cancelledOrders: 0,
  lastActiveAt: Date.now(),
});

/** Tunable weights — GodMode can override. */
export interface MarketplaceWeights {
  relevance: number;     // 0.30
  trustTier: number;     // 0.25
  performance: number;   // 0.20
  responsiveness: number; // 0.10
  recency: number;       // 0.05
  newcomerBoost: number; // 0.10
  disputePenalty: number; // 0.50 (score reduction)
  cancellationPenalty: number; // 0.30 (score reduction)
}

export const DEFAULT_MARKETPLACE_WEIGHTS: MarketplaceWeights = {
  relevance: 0.30,
  trustTier: 0.25,
  performance: 0.20,
  responsiveness: 0.10,
  recency: 0.05,
  newcomerBoost: 0.10,
  disputePenalty: 0.50,
  cancellationPenalty: 0.30,
};

export interface ScoredProvider {
  provider: RankableProvider;
  score: number;
  breakdown: {
    relevance: number;
    trustTier: number;
    performance: number;
    responsiveness: number;
    recency: number;
    newcomerBoost: number;
    disputePenaltyApplied: boolean;
    cancellationPenaltyApplied: boolean;
  };
}

/* ------------------------------------------------------------------ */
/* Scoring functions (all pure)                                        */
/* ------------------------------------------------------------------ */

const TIER_SCORES: Record<RankableProvider['tier'], number> = {
  TRUSTED: 1.0,
  VERIFIED: 0.7,
  REGISTERED: 0.4,
};

export function trustTierScore(tier: RankableProvider['tier']): number {
  return TIER_SCORES[tier] ?? 0.4;
}

/**
 * Relevance: simple TF scoring on title + description + category vs query.
 * Tokenizes both, counts query-term hits, normalizes by query length.
 * Empty query = 0.5 neutral (browse mode).
 */
export function relevanceScore(
  provider: RankableProvider,
  query: string,
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0.5;

  const terms = q.split(/\s+/).filter((t) => t.length > 1);
  if (terms.length === 0) return 0.5;

  const haystack = [
    provider.serviceCard?.serviceLine || '',
    provider.serviceCard?.devotionalText || '',
    provider.serviceCard?.availability || '',
    provider.name,
    ...provider.categories,
  ].join(' ').toLowerCase();

  let hits = 0;
  for (const term of terms) {
    if (haystack.includes(term)) hits++;
    // Partial match: term is a substring of a word, or vice versa.
    // Both must be >=4 chars to avoid single-letter noise ("I" in "vivah").
    else if (term.length >= 4) {
      const words = haystack.split(/\s+/);
      if (words.some((w) => w.length >= 4 && (w.includes(term) || term.includes(w)))) hits += 0.5;
    }
  }

  return Math.min(1, hits / terms.length);
}

/**
 * Performance: completion rate (50%) + on-time rate (30%) + gratitude (20%, log-scaled).
 * New providers with no orders get 0.5 neutral — not punished for being new.
 */
export function performanceScore(stats: ProviderStats): number {
  if (stats.totalOrders === 0) return 0.5;

  const completionRate = stats.completedOrders / stats.totalOrders;
  const onTimeRate = stats.totalOrders > 0
    ? stats.onTimeOrders / Math.max(1, stats.completedOrders)
    : 0;
  const gratitude = Math.min(1, Math.log(1 + stats.gratitudeCount) / Math.log(51)); // 50+ = 1.0

  return completionRate * 0.5 + onTimeRate * 0.3 + gratitude * 0.2;
}

/**
 * Responsiveness: <1h = 1.0, <6h = 0.7, <24h = 0.4, >24h = 0.1.
 * No data = 0.5 neutral.
 */
export function responsivenessScore(avgResponseHours: number): number {
  if (avgResponseHours <= 0) return 0.5;
  if (avgResponseHours < 1) return 1.0;
  if (avgResponseHours < 6) return 0.7;
  if (avgResponseHours < 24) return 0.4;
  return 0.1;
}

/**
 * Recency: active in last 7 days = 1.0, decaying to 0.2 at 90 days.
 */
export function providerRecencyScore(lastActiveAt: number, now: number = Date.now()): number {
  const daysAgo = (now - lastActiveAt) / 86_400_000;
  if (daysAgo <= 7) return 1.0;
  if (daysAgo >= 90) return 0.2;
  return 1.0 - (0.8 * (daysAgo - 7)) / 83;
}

/**
 * Newcomer boost: providers <30 days old with <5 orders get +0.3, decaying linearly.
 * This is the fairness mechanism — prevents winner-take-all.
 */
export function newcomerBoost(
  joinedAt: string,
  totalOrders: number,
  now: number = Date.now(),
): number {
  if (totalOrders >= 5) return 0;
  const joined = new Date(joinedAt).getTime();
  if (isNaN(joined)) return 0;
  const daysOld = (now - joined) / 86_400_000;
  if (daysOld >= 30 || daysOld < 0) return 0;
  return 0.3 * (1 - daysOld / 30);
}

/**
 * Full provider score: weighted sum + penalties.
 */
export function scoreProvider(
  provider: RankableProvider,
  query: string,
  stats: ProviderStats,
  weights: MarketplaceWeights = DEFAULT_MARKETPLACE_WEIGHTS,
  now: number = Date.now(),
): number {
  const relevance = relevanceScore(provider, query);
  const trust = trustTierScore(provider.tier);
  const performance = performanceScore(stats);
  const responsiveness = responsivenessScore(stats.avgResponseHours);
  const recency = providerRecencyScore(stats.lastActiveAt, now);
  const newcomer = newcomerBoost(provider.joinedAt, stats.totalOrders, now);

  let score =
    weights.relevance * relevance +
    weights.trustTier * trust +
    weights.performance * performance +
    weights.responsiveness * responsiveness +
    weights.recency * recency +
    weights.newcomerBoost * newcomer;

  // Penalties
  if (stats.activeDisputes > 0) {
    score *= (1 - weights.disputePenalty);
  }
  const cancellationRate = stats.totalOrders > 0
    ? stats.cancelledOrders / stats.totalOrders
    : 0;
  if (cancellationRate > 0.2) {
    score *= (1 - weights.cancellationPenalty);
  }

  return Math.max(0, score);
}

/**
 * Rank providers for a query. Returns sorted with full breakdowns.
 */
export function rankProviders(
  providers: RankableProvider[],
  query: string,
  statsMap: Record<string, ProviderStats>,
  weights: MarketplaceWeights = DEFAULT_MARKETPLACE_WEIGHTS,
  now: number = Date.now(),
): ScoredProvider[] {
  const scored: ScoredProvider[] = providers.map((provider) => {
    const stats = statsMap[provider.uid] || emptyProviderStats();
    const cancellationRate = stats.totalOrders > 0
      ? stats.cancelledOrders / stats.totalOrders
      : 0;

    const breakdown: ScoredProvider['breakdown'] = {
      relevance: relevanceScore(provider, query),
      trustTier: trustTierScore(provider.tier),
      performance: performanceScore(stats),
      responsiveness: responsivenessScore(stats.avgResponseHours),
      recency: providerRecencyScore(stats.lastActiveAt, now),
      newcomerBoost: newcomerBoost(provider.joinedAt, stats.totalOrders, now),
      disputePenaltyApplied: stats.activeDisputes > 0,
      cancellationPenaltyApplied: cancellationRate > 0.2,
    };

    return {
      provider,
      score: scoreProvider(provider, query, stats, weights, now),
      breakdown,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * Human-readable explanation of a provider's rank.
 * Shown on the provider card as "Why am I seeing this?" — transparency builds trust.
 */
export function explainScore(sp: ScoredProvider, rank: number): string {
  const b = sp.breakdown;
  const reasons: string[] = [];

  // Trust tier (always mention — it's the most visible signal)
  if (sp.provider.tier === 'TRUSTED') reasons.push('TRUSTED tier');
  else if (sp.provider.tier === 'VERIFIED') reasons.push('VERIFIED tier');

  // Performance highlights
  if (b.performance > 0.8) reasons.push('excellent completion record');
  else if (b.performance > 0.6) reasons.push('strong completion record');

  // Responsiveness
  if (b.responsiveness >= 1.0) reasons.push('responds within an hour');
  else if (b.responsiveness >= 0.7) reasons.push('responds within hours');

  // Newcomer
  if (b.newcomerBoost > 0.1) reasons.push('new provider getting a fair chance');

  // Relevance
  if (b.relevance > 0.7) reasons.push('closely matches your search');

  // Penalties (honest about downsides)
  if (b.disputePenaltyApplied) reasons.push('⚠️ has active disputes');
  if (b.cancellationPenaltyApplied) reasons.push('⚠️ high cancellation rate');

  const rankWord = rank === 1 ? '#1' : `#${rank}`;
  if (reasons.length === 0) return `Ranked ${rankWord} by overall relevance.`;
  return `Ranked ${rankWord} because: ${reasons.join(', ')}.`;
}
