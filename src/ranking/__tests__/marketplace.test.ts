/**
 * ranking/__tests__/marketplace.test.ts — Marketplace ranking engine tests.
 */
import {
  trustTierScore,
  relevanceScore,
  performanceScore,
  responsivenessScore,
  providerRecencyScore,
  newcomerBoost,
  scoreProvider,
  rankProviders,
  explainScore,
  emptyProviderStats,
  DEFAULT_MARKETPLACE_WEIGHTS,
  type RankableProvider,
  type ProviderStats,
} from '../marketplace';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function makeProvider(overrides: Partial<RankableProvider> = {}): RankableProvider {
  return {
    uid: `prov_${Math.random().toString(36).slice(2, 8)}`,
    name: 'Pandit Ramesh Sharma',
    tier: 'VERIFIED',
    joinedAt: new Date(NOW - 100 * DAY).toISOString(),
    categories: ['vivah', 'griha-pravesh'],
    serviceCard: {
      devotionalText: 'With 20 years of Vedic learning, I perform sacred Vivah samskaras with full devotion and traditional samagri.',
      serviceLine: 'Traditional Vivah ceremony at your home',
      dakshina: 11000,
      currency: 'INR',
      modes: ['home'],
      providerName: 'Pandit Ramesh Sharma',
      providerUid: 'prov_test',
      providerTier: 'VERIFIED',
    },
    ...overrides,
  };
}

function makeStats(overrides: Partial<ProviderStats> = {}): ProviderStats {
  return { ...emptyProviderStats(), ...overrides };
}

describe('trustTierScore', () => {
  it('ranks TRUSTED > VERIFIED > REGISTERED', () => {
    expect(trustTierScore('TRUSTED')).toBe(1.0);
    expect(trustTierScore('VERIFIED')).toBe(0.7);
    expect(trustTierScore('REGISTERED')).toBe(0.4);
    expect(trustTierScore('TRUSTED')).toBeGreaterThan(trustTierScore('VERIFIED'));
  });
});

describe('relevanceScore', () => {
  it('returns 0.5 neutral for empty query', () => {
    expect(relevanceScore(makeProvider(), '')).toBe(0.5);
    expect(relevanceScore(makeProvider(), '   ')).toBe(0.5);
  });
  it('scores exact keyword matches highly', () => {
    const p = makeProvider();
    expect(relevanceScore(p, 'vivah')).toBe(1.0);
    expect(relevanceScore(p, 'vivah ceremony')).toBeGreaterThan(0.5);
  });
  it('scores non-matching queries low', () => {
    const p = makeProvider();
    expect(relevanceScore(p, 'astrology horoscope kundli')).toBeLessThan(0.5);
  });
  it('handles partial matches', () => {
    const p = makeProvider();
    // "vivaha" should partially match "vivah"
    expect(relevanceScore(p, 'vivaha')).toBeGreaterThan(0);
  });
  it('ignores single-letter words in partial matching', () => {
    // Regression: "I" (from "I perform...") must not match "vivah"
    const p = makeProvider({
      categories: ['shanti-path'],
      serviceCard: {
        devotionalText: 'I perform Shanti Path ceremonies for peace.',
        serviceLine: 'Shanti Path for home peace',
        dakshina: 5000, currency: 'INR', modes: ['home'],
        providerName: 'Pandit Shanti', providerUid: 'px', providerTier: 'TRUSTED',
      },
    });
    expect(relevanceScore(p, 'vivah')).toBe(0);
  });
});

describe('performanceScore', () => {
  it('returns 0.5 neutral for new providers (no orders)', () => {
    expect(performanceScore(makeStats())).toBe(0.5);
  });
  it('rewards high completion and on-time rates', () => {
    const great = makeStats({ totalOrders: 100, completedOrders: 98, onTimeOrders: 95, gratitudeCount: 60 });
    const poor = makeStats({ totalOrders: 100, completedOrders: 50, onTimeOrders: 30, gratitudeCount: 2 });
    expect(performanceScore(great)).toBeGreaterThan(performanceScore(poor));
    expect(performanceScore(great)).toBeGreaterThan(0.7);
  });
  it('log-scales gratitude to prevent gaming', () => {
    const s1 = makeStats({ totalOrders: 10, completedOrders: 10, onTimeOrders: 10, gratitudeCount: 1000 });
    const s2 = makeStats({ totalOrders: 10, completedOrders: 10, onTimeOrders: 10, gratitudeCount: 50 });
    // 20x gratitude should not mean 20x score
    expect(performanceScore(s1)).toBeLessThan(performanceScore(s2) * 1.5);
  });
});

describe('responsivenessScore', () => {
  it('rewards fast responses', () => {
    expect(responsivenessScore(0.5)).toBe(1.0);
    expect(responsivenessScore(3)).toBe(0.7);
    expect(responsivenessScore(12)).toBe(0.4);
    expect(responsivenessScore(48)).toBe(0.1);
  });
});

describe('newcomerBoost', () => {
  it('gives new providers a boost', () => {
    const joined = new Date(NOW - 5 * DAY).toISOString();
    const boost = newcomerBoost(joined, 2, NOW);
    expect(boost).toBeGreaterThan(0);
    expect(boost).toBeLessThanOrEqual(0.3);
  });
  it('decays linearly over 30 days', () => {
    const day1 = newcomerBoost(new Date(NOW - 1 * DAY).toISOString(), 0, NOW);
    const day15 = newcomerBoost(new Date(NOW - 15 * DAY).toISOString(), 0, NOW);
    const day29 = newcomerBoost(new Date(NOW - 29 * DAY).toISOString(), 0, NOW);
    expect(day1).toBeGreaterThan(day15);
    expect(day15).toBeGreaterThan(day29);
  });
  it('expires after 30 days or 5+ orders', () => {
    expect(newcomerBoost(new Date(NOW - 31 * DAY).toISOString(), 0, NOW)).toBe(0);
    expect(newcomerBoost(new Date(NOW - 5 * DAY).toISOString(), 5, NOW)).toBe(0);
    expect(newcomerBoost(new Date(NOW - 100 * DAY).toISOString(), 0, NOW)).toBe(0);
  });
});

describe('scoreProvider penalties', () => {
  it('penalizes active disputes by 50%', () => {
    const p = makeProvider({ tier: 'TRUSTED' });
    const clean = makeStats({ totalOrders: 50, completedOrders: 48, onTimeOrders: 45 });
    const disputed = makeStats({ totalOrders: 50, completedOrders: 48, onTimeOrders: 45, activeDisputes: 1 });
    const cleanScore = scoreProvider(p, '', clean, DEFAULT_MARKETPLACE_WEIGHTS, NOW);
    const disputedScore = scoreProvider(p, '', disputed, DEFAULT_MARKETPLACE_WEIGHTS, NOW);
    expect(disputedScore).toBeCloseTo(cleanScore * 0.5, 5);
  });
  it('penalizes high cancellation rates', () => {
    const p = makeProvider();
    const normal = makeStats({ totalOrders: 100, completedOrders: 90, cancelledOrders: 5 });
    const canceller = makeStats({ totalOrders: 100, completedOrders: 60, cancelledOrders: 30 });
    const normalScore = scoreProvider(p, '', normal, DEFAULT_MARKETPLACE_WEIGHTS, NOW);
    const cancellerScore = scoreProvider(p, '', canceller, DEFAULT_MARKETPLACE_WEIGHTS, NOW);
    expect(cancellerScore).toBeLessThan(normalScore * 0.8);
  });
});

describe('rankProviders', () => {
  it('ranks TRUSTED providers above REGISTERED with equal stats', () => {
    const trusted = makeProvider({ uid: 't1', tier: 'TRUSTED' });
    const registered = makeProvider({ uid: 'r1', tier: 'REGISTERED' });
    const stats = makeStats({ totalOrders: 20, completedOrders: 18, onTimeOrders: 17 });
    const ranked = rankProviders(
      [registered, trusted], '',
      { t1: stats, r1: stats },
      DEFAULT_MARKETPLACE_WEIGHTS, NOW,
    );
    expect(ranked[0].provider.uid).toBe('t1');
  });
  it('newcomer boost helps new providers compete', () => {
    const veteran = makeProvider({ uid: 'vet', tier: 'VERIFIED', joinedAt: new Date(NOW - 200 * DAY).toISOString() });
    const newcomer = makeProvider({ uid: 'new', tier: 'VERIFIED', joinedAt: new Date(NOW - 5 * DAY).toISOString() });
    const vetStats = makeStats({ totalOrders: 50, completedOrders: 45, onTimeOrders: 40 });
    const newStats = makeStats({ totalOrders: 2, completedOrders: 2, onTimeOrders: 2 });
    const ranked = rankProviders(
      [veteran, newcomer], '',
      { vet: vetStats, new: newStats },
      DEFAULT_MARKETPLACE_WEIGHTS, NOW,
    );
    // Newcomer should have a boost in breakdown even if veteran still wins
    const newcomerResult = ranked.find((r) => r.provider.uid === 'new')!;
    expect(newcomerResult.breakdown.newcomerBoost).toBeGreaterThan(0);
  });
  it('relevance dominates when query matches', () => {
    const vivahPro = makeProvider({ uid: 'v1', tier: 'REGISTERED' });
    const genericPro = makeProvider({
      uid: 'g1', tier: 'TRUSTED', categories: ['shanti-path'],
      serviceCard: {
        devotionalText: 'I perform Shanti Path ceremonies for peace and harmony in your home with Vedic mantras.',
        serviceLine: 'Shanti Path for home peace',
        dakshina: 5000, currency: 'INR', modes: ['home'],
        providerName: 'Pandit Shanti', providerUid: 'prov_shanti', providerTier: 'TRUSTED',
      },
    });
    const stats = makeStats({ totalOrders: 10, completedOrders: 9, onTimeOrders: 9 });
    const ranked = rankProviders(
      [genericPro, vivahPro], 'vivah',
      { v1: stats, g1: stats },
      DEFAULT_MARKETPLACE_WEIGHTS, NOW,
    );
    expect(ranked[0].provider.uid).toBe('v1');
  });
});

describe('explainScore', () => {
  it('produces human-readable explanations with rank', () => {
    const p = makeProvider({ tier: 'TRUSTED' });
    const stats = makeStats({
      totalOrders: 100, completedOrders: 98, onTimeOrders: 95,
      gratitudeCount: 60, avgResponseHours: 0.5,
    });
    const [scored] = rankProviders([p], '', { [p.uid]: stats }, DEFAULT_MARKETPLACE_WEIGHTS, NOW);
    const explanation = explainScore(scored, 1);
    expect(explanation).toContain('#1');
    expect(explanation).toContain('TRUSTED');
    expect(explanation.length).toBeGreaterThan(20);
  });
  it('honestly reports penalties', () => {
    const p = makeProvider();
    const stats = makeStats({ totalOrders: 50, completedOrders: 40, activeDisputes: 2 });
    const [scored] = rankProviders([p], '', { [p.uid]: stats }, DEFAULT_MARKETPLACE_WEIGHTS, NOW);
    expect(scored.breakdown.disputePenaltyApplied).toBe(true);
    expect(explainScore(scored, 3)).toContain('disputes');
  });
});
