/**
 * trustScore.spec.ts — unit tests for the Seva Professional trust score.
 * Pure logic only; runs under plain jest (no Firestore emulator needed).
 */
import {
  computeTrustScore,
  normalizeTier,
  trustDisplayFor,
  explainScore,
  type RoleTrustSignal,
  type TrustScoreInput,
} from '../sevaPro/trustScore';

const role = (over: Partial<RoleTrustSignal> = {}): RoleTrustSignal => ({
  verificationTier: 'REGISTERED',
  ratingAggregate: 0,
  ratingCount: 0,
  completedSevas: 0,
  ...over,
});

const input = (over: Partial<TrustScoreInput> = {}): TrustScoreInput => ({
  purohit: role(),
  jyotish: null,
  endorsementCount: 0,
  disputeCount: 0,
  avgResponseHours: null,
  ...over,
});

describe('normalizeTier', () => {
  it('maps legacy purohit tiers onto the unified scale', () => {
    expect(normalizeTier('PLATFORM_VERIFIED')).toBe('TRUSTED');
    expect(normalizeTier('ORG_ENDORSED')).toBe('VERIFIED');
    expect(normalizeTier('CREDENTIAL_VERIFIED')).toBe('VERIFIED');
    expect(normalizeTier('REGISTERED')).toBe('REGISTERED');
  });

  it('is case-insensitive and safe on null/unknown', () => {
    expect(normalizeTier('trusted')).toBe('TRUSTED');
    expect(normalizeTier(null)).toBe('REGISTERED');
    expect(normalizeTier('SOMETHING_ELSE')).toBe('REGISTERED');
  });
});

describe('computeTrustScore', () => {
  it('gives a brand-new REGISTERED professional a low score with zero bonuses', () => {
    const r = computeTrustScore(input());
    expect(r.score).toBe(0);
    expect(r.band).toBe('new');
    expect(r.tier).toBe('REGISTERED');
  });

  it('anchors the score on verification tier: VERIFIED=40, TRUSTED=60 base', () => {
    const v = computeTrustScore(input({ purohit: role({ verificationTier: 'VERIFIED' }) }));
    const t = computeTrustScore(input({ purohit: role({ verificationTier: 'TRUSTED' }) }));
    expect(v.breakdown.tierBase).toBe(40);
    expect(t.breakdown.tierBase).toBe(60);
    expect(t.score).toBeGreaterThan(v.score);
  });

  it('takes the better of the two role tiers (trust is about the person)', () => {
    const r = computeTrustScore(
      input({
        purohit: role({ verificationTier: 'REGISTERED' }),
        jyotish: role({ verificationTier: 'TRUSTED' }),
      })
    );
    expect(r.tier).toBe('TRUSTED');
    expect(r.breakdown.tierBase).toBe(60);
  });

  it('log-scales experience: early sevas count most, padding volume saturates', () => {
    const few = computeTrustScore(input({ purohit: role({ completedSevas: 10 }) }));
    const many = computeTrustScore(input({ purohit: role({ completedSevas: 100 }) }));
    const padded = computeTrustScore(input({ purohit: role({ completedSevas: 1000 }) }));
    expect(many.breakdown.experience).toBeGreaterThan(few.breakdown.experience);
    expect(many.breakdown.experience).toBeLessThanOrEqual(15);
    // Saturation: 10x volume beyond 100 earns nothing more
    expect(padded.breakdown.experience).toBe(many.breakdown.experience);
  });

  it('combines completed sevas across both roles', () => {
    const dual = computeTrustScore(
      input({
        purohit: role({ completedSevas: 50 }),
        jyotish: role({ completedSevas: 50 }),
      })
    );
    const single = computeTrustScore(input({ purohit: role({ completedSevas: 50 }) }));
    expect(dual.sevasCompleted).toBe(100);
    expect(dual.breakdown.experience).toBeGreaterThan(single.breakdown.experience);
  });

  it('withholds ashirvad points until enough reviews build confidence', () => {
    const oneFiveStar = computeTrustScore(
      input({ purohit: role({ ratingAggregate: 5, ratingCount: 1 }) })
    );
    expect(oneFiveStar.breakdown.ashirvad).toBeLessThanOrEqual(1); // 1/10 confidence

    const solid = computeTrustScore(
      input({ purohit: role({ ratingAggregate: 4.8, ratingCount: 25 }) })
    );
    expect(solid.breakdown.ashirvad).toBeGreaterThan(oneFiveStar.breakdown.ashirvad);
    expect(solid.breakdown.ashirvad).toBeLessThanOrEqual(10);
  });

  it('caps temple endorsements at 3 — quality over quantity', () => {
    const three = computeTrustScore(input({ endorsementCount: 3 }));
    const thirty = computeTrustScore(input({ endorsementCount: 30 }));
    expect(three.breakdown.endorsements).toBe(10);
    expect(thirty.breakdown.endorsements).toBe(10);
  });

  it('rewards fast response but never punishes unknown response time', () => {
    const unknown = computeTrustScore(input({ avgResponseHours: null }));
    const fast = computeTrustScore(input({ avgResponseHours: 2 }));
    const slow = computeTrustScore(input({ avgResponseHours: 200 }));
    expect(unknown.breakdown.punctuality).toBe(0);
    expect(fast.breakdown.punctuality).toBe(5);
    expect(slow.breakdown.punctuality).toBe(0);
    expect(slow.score).toBe(unknown.score);
  });

  it('penalizes disputes by count AND rate, capped at 15', () => {
    const disputed = computeTrustScore(
      input({ purohit: role({ verificationTier: 'TRUSTED', completedSevas: 10 }), disputeCount: 2 })
    );
    expect(disputed.breakdown.disputePenalty).toBeGreaterThan(0);
    expect(disputed.breakdown.disputePenalty).toBeLessThanOrEqual(15);

    // Same count, higher volume → lower rate → smaller penalty
    const diluted = computeTrustScore(
      input({ purohit: role({ verificationTier: 'TRUSTED', completedSevas: 200 }), disputeCount: 2 })
    );
    expect(diluted.breakdown.disputePenalty).toBeLessThan(disputed.breakdown.disputePenalty);

    // Penalty can never exceed its 15pt ceiling no matter how bad
    const terrible = computeTrustScore(
      input({ purohit: role({ completedSevas: 1 }), disputeCount: 50 })
    );
    expect(terrible.breakdown.disputePenalty).toBe(15);
    expect(terrible.score).toBe(0); // clamped at floor
  });

  it('reaches "renowned" only with the full picture, and explains itself', () => {
    const r = computeTrustScore(
      input({
        purohit: role({
          verificationTier: 'TRUSTED',
          ratingAggregate: 4.9,
          ratingCount: 40,
          completedSevas: 120,
        }),
        endorsementCount: 5,
        avgResponseHours: 3,
      })
    );
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.band).toBe('renowned');
    const explanation = explainScore(r);
    expect(explanation).toContain('Trust score');
    expect(explanation).toContain('TRUSTED');
    // Breakdown sums to the score (no hidden math)
    const b = r.breakdown;
    expect(b.tierBase + b.experience + b.ashirvad + b.endorsements + b.punctuality - b.disputePenalty)
      .toBe(r.score);
  });
});

describe('trustDisplayFor — devotees never see the raw number', () => {
  it('uses warm copy with the seva count, never the score digits', () => {
    const r = computeTrustScore(
      input({
        purohit: role({
          verificationTier: 'TRUSTED',
          ratingAggregate: 4.9,
          ratingCount: 47,
          completedSevas: 47,
        }),
      })
    );
    const d = trustDisplayFor(r, 'en');
    expect(d.headline.toLowerCase()).toContain('trusted by 47 families');
    expect(d.headline).not.toContain(String(r.score));
    expect(d.sevaLine).toContain('47 sevas completed with devotion');
    expect(d.tierBadge).toBe('Trusted Seva Provider');
  });

  it('is trilingual and falls back to English', () => {
    const r = computeTrustScore(
      input({ purohit: role({ verificationTier: 'VERIFIED', completedSevas: 12 }) })
    );
    expect(trustDisplayFor(r, 'bn').tierBadge).toBe('যাচাইকৃত সেবা প্রদানকারী');
    expect(trustDisplayFor(r, 'hi').tierBadge).toBe('सत्यापित सेवा प्रदाता');
  });
});
