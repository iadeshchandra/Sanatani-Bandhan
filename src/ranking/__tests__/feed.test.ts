/**
 * ranking/__tests__/feed.test.ts — Feed ranking engine tests.
 */
import {
  recencyScore,
  closenessScore,
  meaningfulnessScore,
  contentAffinityScore,
  scorePost,
  rankFeed,
  recordInteraction,
  explainFeedScore,
  emptyUserSignals,
  DEFAULT_FEED_WEIGHTS,
  type UserSignals,
} from '../feed';
import type { SangamPost } from '../../sangam/types';

const NOW = 1_700_000_000_000; // fixed timestamp for determinism
const HOUR = 3_600_000;

function makePost(overrides: Partial<SangamPost> = {}): SangamPost {
  return {
    id: `post_${Math.random().toString(36).slice(2, 8)}`,
    authorUid: 'author1',
    authorName: 'Test Author',
    authorSanId: 'SAN-TEST01',
    authorKind: 'devotee',
    isOfficialPagePost: false,
    kind: 'text',
    text: 'Test post',
    createdAt: NOW - HOUR,
    ashirvadCount: 0,
    commentCount: 0,
    shareCount: 0,
    visibility: 'public',
    status: 'active',
    ...overrides,
  };
}

describe('recencyScore', () => {
  it('scores a brand-new post near 1.0', () => {
    expect(recencyScore(NOW, NOW)).toBeCloseTo(1.0, 2);
  });
  it('decays gently: 24h old is ~0.61', () => {
    expect(recencyScore(NOW - 24 * HOUR, NOW)).toBeCloseTo(0.607, 2);
  });
  it('48h old is ~0.37', () => {
    expect(recencyScore(NOW - 48 * HOUR, NOW)).toBeCloseTo(0.368, 2);
  });
  it('never goes negative for very old posts', () => {
    expect(recencyScore(NOW - 365 * 24 * HOUR, NOW)).toBeGreaterThanOrEqual(0);
  });
  it('clamps future timestamps to 1.0', () => {
    expect(recencyScore(NOW + HOUR, NOW)).toBeCloseTo(1.0, 2);
  });
});

describe('closenessScore', () => {
  it('returns 0 for unknown authors', () => {
    expect(closenessScore('stranger', emptyUserSignals())).toBe(0);
  });
  it('scales with affinity, capped at 1.0', () => {
    const signals = emptyUserSignals();
    signals.authorAffinity['friend'] = 10; // one follow
    const s1 = closenessScore('friend', signals);
    expect(s1).toBeGreaterThan(0);
    expect(s1).toBeLessThan(1);

    signals.authorAffinity['bff'] = 500;
    expect(closenessScore('bff', signals)).toBe(1.0);
  });
});

describe('meaningfulnessScore', () => {
  it('returns 0 for zero engagement', () => {
    expect(meaningfulnessScore(makePost())).toBe(0);
  });
  it('weights comments 3x and shares 5x over ashirvads', () => {
    const commentPost = makePost({ commentCount: 2 }); // 6 weighted
    const ashirvadPost = makePost({ ashirvadCount: 6 }); // 6 weighted
    expect(meaningfulnessScore(commentPost)).toBeCloseTo(
      meaningfulnessScore(ashirvadPost), 5,
    );
    // But 2 comments (6) vs 1 share (5): comments win slightly
    const sharePost = makePost({ shareCount: 1 });
    expect(meaningfulnessScore(commentPost)).toBeGreaterThan(meaningfulnessScore(sharePost));
  });
  it('log-scales to prevent viral blowout', () => {
    const viral = makePost({ ashirvadCount: 10000 });
    const popular = makePost({ ashirvadCount: 200 });
    // 50x more engagement should NOT mean 50x the score
    const ratio = meaningfulnessScore(viral) / meaningfulnessScore(popular);
    expect(ratio).toBeLessThan(2);
  });
});

describe('contentAffinityScore', () => {
  it('returns 0.5 neutral with no history', () => {
    expect(contentAffinityScore('photo', emptyUserSignals())).toBe(0.5);
  });
  it('boosts kinds the user engages with', () => {
    const signals = emptyUserSignals();
    signals.kindAffinity = { photo: 10, text: 2 };
    expect(contentAffinityScore('photo', signals)).toBe(1.0);
    expect(contentAffinityScore('text', signals)).toBe(0.2);
    expect(contentAffinityScore('event', signals)).toBe(0);
  });
});

describe('recordInteraction', () => {
  it('builds affinity with correct weights', () => {
    let s = emptyUserSignals();
    s = recordInteraction(s, 'ashirvad', 'a1', 'text');
    expect(s.authorAffinity['a1']).toBe(1);
    s = recordInteraction(s, 'comment', 'a1', 'text');
    expect(s.authorAffinity['a1']).toBe(4); // 1 + 3
    s = recordInteraction(s, 'follow', 'a1');
    expect(s.authorAffinity['a1']).toBe(14); // 4 + 10
  });
  it('tracks kind affinity', () => {
    let s = emptyUserSignals();
    s = recordInteraction(s, 'share', 'a1', 'photo');
    expect(s.kindAffinity['photo']).toBe(1);
  });
  it('does not mutate the input', () => {
    const s = emptyUserSignals();
    const s2 = recordInteraction(s, 'ashirvad', 'a1');
    expect(s.authorAffinity['a1']).toBeUndefined();
    expect(s2.authorAffinity['a1']).toBe(1);
  });
});

describe('rankFeed', () => {
  it('ranks higher-engagement posts above low-engagement ones', () => {
    const hot = makePost({ id: 'hot', commentCount: 20, shareCount: 5 });
    const cold = makePost({ id: 'cold' });
    const ranked = rankFeed([cold, hot], emptyUserSignals(), DEFAULT_FEED_WEIGHTS, {}, NOW);
    expect(ranked[0].post.id).toBe('hot');
  });
  it('applies diversity penalty for author clustering', () => {
    const posts = Array.from({ length: 5 }, (_, i) =>
      makePost({ id: `p${i}`, authorUid: 'spammer', commentCount: 10 - i }),
    );
    posts.push(makePost({ id: 'other', authorUid: 'other', commentCount: 1 }));
    const ranked = rankFeed(posts, emptyUserSignals(), DEFAULT_FEED_WEIGHTS, {}, NOW);
    // The 3rd+ post from 'spammer' should be penalized
    const spammerPosts = ranked.filter((r) => r.post.authorUid === 'spammer');
    const penalized = spammerPosts.filter((r) => r.breakdown.diversityApplied);
    expect(penalized.length).toBeGreaterThan(0);
  });
  it('sinks reported posts', () => {
    const reported = makePost({ id: 'reported', status: 'reported', commentCount: 50 });
    const normal = makePost({ id: 'normal', commentCount: 1 });
    const ranked = rankFeed([reported, normal], emptyUserSignals(), DEFAULT_FEED_WEIGHTS, {}, NOW);
    expect(ranked[0].post.id).toBe('normal');
    expect(ranked.find((r) => r.post.id === 'reported')!.breakdown.reportPenaltyApplied).toBe(true);
  });
  it('penalizes zero-engagement posts with high impressions', () => {
    const stale = makePost({ id: 'stale' });
    const fresh = makePost({ id: 'fresh' });
    const ranked = rankFeed(
      [stale, fresh], emptyUserSignals(), DEFAULT_FEED_WEIGHTS,
      { stale: 150 }, NOW,
    );
    const staleResult = ranked.find((r) => r.post.id === 'stale')!;
    expect(staleResult.breakdown.stalePenaltyApplied).toBe(true);
  });
  it('does not penalize low-impression posts', () => {
    const post = makePost({ id: 'new' });
    const ranked = rankFeed([post], emptyUserSignals(), DEFAULT_FEED_WEIGHTS, { new: 10 }, NOW);
    expect(ranked[0].breakdown.stalePenaltyApplied).toBe(false);
  });
});

describe('explainFeedScore', () => {
  it('produces human-readable explanations', () => {
    const signals = emptyUserSignals();
    signals.authorAffinity['close_friend'] = 30;
    const post = makePost({ authorUid: 'close_friend', commentCount: 15 });
    const [scored] = rankFeed([post], signals, DEFAULT_FEED_WEIGHTS, {}, NOW);
    const explanation = explainFeedScore(scored);
    expect(explanation).toContain('interact with');
    expect(typeof explanation).toBe('string');
    expect(explanation.length).toBeGreaterThan(10);
  });
});
