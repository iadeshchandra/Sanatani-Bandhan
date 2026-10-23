/**
 * ratingAggregate.test.ts — SECURITY P1 (Finding 1): the anchored
 * aggregate law for professional profiles (purohits / jyotishProfiles).
 * The rules enforce exactly this math via the lastReviewId anchor; the
 * client must produce the one legal next state and nothing else.
 */
import {
  nextProfileAggregate,
  isLegalAggregateStep,
  aggregateSumTolerance,
} from '../ratingAggregate';
import { nextAvg } from '../gigRatings';

describe('nextProfileAggregate', () => {
  it('first rating becomes the average', () => {
    expect(nextProfileAggregate(0, 0, 5)).toEqual({ ratingAggregate: 5, ratingCount: 1 });
    expect(nextProfileAggregate(0, 0, 3)).toEqual({ ratingAggregate: 3, ratingCount: 1 });
  });
  it('running average, one decimal place', () => {
    expect(nextProfileAggregate(5, 1, 4)).toEqual({ ratingAggregate: 4.5, ratingCount: 2 });
    expect(nextProfileAggregate(4.5, 2, 5)).toEqual({ ratingAggregate: 4.7, ratingCount: 3 });
    expect(nextProfileAggregate(4.7, 3, 1)).toEqual({ ratingAggregate: 3.8, ratingCount: 4 });
  });
  it('matches the marketplace nextAvg formula exactly (one law, two surfaces)', () => {
    for (const [agg, count, rating] of [
      [0, 0, 5],
      [4.2, 7, 3],
      [4.9, 41, 5],
      [3.3, 12, 2],
    ] as const) {
      const a = nextProfileAggregate(agg, count, rating);
      const b = nextAvg(agg, count, rating);
      expect(a.ratingAggregate).toBe(b.avg);
      expect(a.ratingCount).toBe(b.count);
    }
  });
});

describe('isLegalAggregateStep', () => {
  it('accepts the computed step', () => {
    const n = nextProfileAggregate(4.5, 2, 5);
    expect(isLegalAggregateStep(4.5, 2, n.ratingAggregate, n.ratingCount, 5)).toBe(true);
  });
  it('rejects a jump of more than one rating', () => {
    expect(isLegalAggregateStep(4.5, 2, 4.7, 4, 5)).toBe(false);
  });
  it('rejects setting the average freely (the old fake)', () => {
    expect(isLegalAggregateStep(3.1, 4, 5, 5, 1)).toBe(false);
    expect(isLegalAggregateStep(0, 0, 5, 100, 5)).toBe(false);
  });
  it('rejects a step that does not match the anchored rating', () => {
    const n = nextProfileAggregate(4.5, 2, 5);
    expect(isLegalAggregateStep(4.5, 2, n.ratingAggregate, n.ratingCount, 1)).toBe(false);
  });
  it('tolerance covers the 1-dp rounding drift and nothing wild', () => {
    expect(aggregateSumTolerance(3)).toBeGreaterThan(0.05 * 3);
    expect(aggregateSumTolerance(3)).toBeLessThan(1);
  });
});
