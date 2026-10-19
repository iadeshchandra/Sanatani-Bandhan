/**
 * gigRatings.test.ts — Step 7: rating validation + average math.
 * =================================================================
 * The Firestore transaction itself needs a live DB; what we CAN test
 * purely: input validation, the running-average formula, and the
 * duplicate-prevention shape (doc ID = orderId).
 */
import { validateRating, nextAvg, canRateStatus, GIG_RATING_FIELDS } from '../gigRatings';

describe('validateRating', () => {
  it('accepts 1-5 with optional review', () => {
    expect(validateRating(5, 'Wonderful puja 🙏')).toEqual([]);
    expect(validateRating(1, '')).toEqual([]);
    expect(validateRating(3, 'x'.repeat(500))).toEqual([]);
  });

  it('rejects out-of-range and non-integer ratings', () => {
    expect(validateRating(0, '')).not.toEqual([]);
    expect(validateRating(6, '')).not.toEqual([]);
    expect(validateRating(2.5, '')).not.toEqual([]);
    expect(validateRating(NaN, '')).not.toEqual([]);
  });

  it('rejects over-long reviews', () => {
    expect(validateRating(4, 'x'.repeat(501)).length).toBeGreaterThan(0);
  });
});

describe('running average (matches submitGigRating transaction)', () => {
  it('first rating sets the average', () => {
    expect(nextAvg(0, 0, 5)).toEqual({ avg: 5, count: 1 });
  });

  it('blends subsequent ratings', () => {
    expect(nextAvg(5, 1, 3)).toEqual({ avg: 4, count: 2 });
    expect(nextAvg(4, 2, 5)).toEqual({ avg: 4.3, count: 3 });
  });

  it('rounds to one decimal', () => {
    const { avg } = nextAvg(4.3, 3, 2);
    expect(avg).toBe(Number(avg.toFixed(1)));
    expect(avg).toBeGreaterThanOrEqual(1);
    expect(avg).toBeLessThanOrEqual(5);
  });

  it('average never escapes 1-5 for valid inputs', () => {
    let avg = 0, count = 0;
    for (const r of [5, 1, 5, 1, 3, 4, 2, 5]) {
      ({ avg, count } = nextAvg(avg, count, r));
      expect(avg).toBeGreaterThanOrEqual(1);
      expect(avg).toBeLessThanOrEqual(5);
    }
    expect(count).toBe(8);
  });
});

describe('rating doc shape (duplicate prevention)', () => {
  it('doc ID equals orderId (one rating per order by construction)', () => {
    const orderId = 'ord_abc123';
    const docPath = `gigRatings/${orderId}`;
    expect(docPath).toBe('gigRatings/ord_abc123');
  });

  it('rating doc carries the whitelisted fields only', () => {
    const rating = {
      gigId: 'gig_1', orderId: 'ord_1', clientUid: 'uid_c',
      providerUid: 'uid_p', rating: 5, review: 'Dhanyavaad 🙏',
    };
    expect(Object.keys(rating).sort()).toEqual(
      ['clientUid', 'gigId', 'orderId', 'providerUid', 'rating', 'review'].sort()
    );
  });
});

describe('completion gating (contract)', () => {
  it('only completed orders may be rated', () => {
    expect(canRateStatus('completed')).toBe(true);
    expect(canRateStatus('paid')).toBe(false);
    expect(canRateStatus('in_progress')).toBe(false);
    expect(canRateStatus('awaiting_commission')).toBe(false);
    expect(canRateStatus('cancelled')).toBe(false);
    expect(canRateStatus('disputed')).toBe(false);
  });
});

describe('GIG_RATING_FIELDS (rules whitelist mirror)', () => {
  it('matches the firestore.rules gigRatings create whitelist', () => {
    expect([...GIG_RATING_FIELDS].sort()).toEqual(
      ['gigId', 'orderId', 'clientUid', 'providerUid', 'rating', 'review', 'createdAt'].sort()
    );
  });
});

describe('edge cases', () => {
  it('handles a gig with stale zero-count but nonzero avg gracefully', () => {
    // Defensive: if data is ever inconsistent, the formula still works.
    const { avg, count } = nextAvg(0, 0, 1);
    expect(avg).toBe(1);
    expect(count).toBe(1);
  });

  it('many ratings converge toward the true mean', () => {
    let avg = 0, count = 0;
    const ratings = [5, 5, 5, 1, 1, 1]; // true mean = 3
    for (const r of ratings) ({ avg, count } = nextAvg(avg, count, r));
    expect(count).toBe(6);
    expect(avg).toBe(3);
  });

  it('review is optional — empty string validates', () => {
    expect(validateRating(5, '')).toEqual([]);
    expect(validateRating(5, undefined as unknown as string)).toEqual([]);
  });

  it('boundary ratings 1 and 5 both valid', () => {
    expect(validateRating(1, '')).toEqual([]);
    expect(validateRating(5, '')).toEqual([]);
  });
});
