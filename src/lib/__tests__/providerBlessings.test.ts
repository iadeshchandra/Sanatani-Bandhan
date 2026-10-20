/**
 * providerBlessings.test.ts — QUEUED #22: silo reconciliation core.
 * =================================================================
 * Pins the three pure decisions the reconciliation rests on:
 *  1. ratingTargetForOrder — gig orders aggregate onto their gig;
 *     Seva Bazar (gig-less) orders anchor to the provider alone.
 *  2. buildRatingDoc — the written doc carries EXACTLY the fields the
 *     gigRatings rules whitelist allows (a stray key fails closed).
 *  3. summarizeBlessings — the provider-wide read model over ratings
 *     from BOTH silos (gig orders + seva-notice orders).
 * The Firestore reads/writes themselves live in marketplace.ts and
 * need a live DB; everything decidable is decided here, purely.
 */
import {
  ratingTargetForOrder,
  buildRatingDoc,
  summarizeBlessings,
  GIG_RATING_FIELDS,
} from '../gigRatings';

describe('ratingTargetForOrder — where a blessing aggregates', () => {
  it('a gig order aggregates onto its gig', () => {
    expect(ratingTargetForOrder({ gigId: 'gig_123' })).toEqual({ kind: 'gig', gigId: 'gig_123' });
  });

  it('a Seva Bazar order (gigId empty + sevaBazar extension) anchors to the provider', () => {
    const order = { gigId: '', sevaBazar: { postId: 'post_1', mode: 'home' } };
    expect(ratingTargetForOrder(order)).toEqual({ kind: 'provider' });
  });

  it('an empty gigId anchors to the provider even without the extension', () => {
    expect(ratingTargetForOrder({ gigId: '' })).toEqual({ kind: 'provider' });
    expect(ratingTargetForOrder({})).toEqual({ kind: 'provider' });
    expect(ratingTargetForOrder({ gigId: undefined })).toEqual({ kind: 'provider' });
  });

  it('a whitespace-only gigId is not a gig', () => {
    expect(ratingTargetForOrder({ gigId: '   ' })).toEqual({ kind: 'provider' });
  });

  it('the sevaBazar extension wins over a stray gigId (defensive)', () => {
    // A card-booked order must never try to aggregate onto a gig doc.
    expect(
      ratingTargetForOrder({ gigId: 'gig_x', sevaBazar: { postId: 'p' } })
    ).toEqual({ kind: 'provider' });
  });

  it('trims a real gigId', () => {
    expect(ratingTargetForOrder({ gigId: '  gig_9 ' })).toEqual({ kind: 'gig', gigId: 'gig_9' });
  });
});

describe('buildRatingDoc — rules-whitelist exactness', () => {
  const doc = buildRatingDoc({
    gigId: 'gig_1',
    orderId: 'ord_1',
    clientUid: 'uid_c',
    providerUid: 'uid_p',
    rating: 5,
    review: '  Dhanyavaad 🙏  ',
  });

  it('carries exactly the whitelisted fields (createdAt is added by the writer)', () => {
    const allowed = [...GIG_RATING_FIELDS].filter((f) => f !== 'createdAt');
    expect(Object.keys(doc).sort()).toEqual([...allowed].sort());
  });

  it('trims the review and caps it at 500 chars', () => {
    expect(doc.review).toBe('Dhanyavaad 🙏');
    const long = buildRatingDoc({
      gigId: '', orderId: 'o', clientUid: 'c', providerUid: 'p',
      rating: 4, review: 'x'.repeat(900),
    });
    expect(long.review.length).toBe(500);
  });

  it('a provider-anchored doc carries gigId as empty string, never undefined', () => {
    const d = buildRatingDoc({
      gigId: '', orderId: 'ord_sb', clientUid: 'c', providerUid: 'p', rating: 5, review: '',
    });
    expect(d.gigId).toBe('');
    expect(d.providerUid).toBe('p');
  });
});

describe('summarizeBlessings — provider-wide read model', () => {
  it('empty stream → zeros, never NaN', () => {
    expect(summarizeBlessings([])).toEqual({ avg: 0, count: 0, writtenCount: 0 });
  });

  it('averages across BOTH silos (gig rows and gig-less rows alike)', () => {
    const rows = [
      { gigId: 'gig_1', rating: 5, review: 'Wonderful' },
      { gigId: '', rating: 4, review: '' },          // seva-notice blessing
      { gigId: 'gig_2', rating: 3, review: '  ' },
      { gigId: '', rating: 5, review: 'So grateful' }, // seva-notice blessing
    ];
    const s = summarizeBlessings(rows);
    expect(s.count).toBe(4);
    expect(s.avg).toBe(4.3); // (5+4+3+5)/4 = 4.25 → 4.3
    expect(s.writtenCount).toBe(2);
  });

  it('rounds the average to one decimal', () => {
    const s = summarizeBlessings([{ rating: 5 }, { rating: 5 }, { rating: 4 }]);
    expect(s.avg).toBe(4.7);
  });

  it('ignores invalid rows instead of poisoning the average', () => {
    const s = summarizeBlessings([
      { rating: 5 },
      { rating: 0 },
      { rating: 9 },
      { rating: 'five' },
      { rating: NaN },
      {},
      { rating: 1 },
    ]);
    expect(s.count).toBe(2);
    expect(s.avg).toBe(3);
  });

  it('writtenCount counts only non-blank written blessings', () => {
    const s = summarizeBlessings([
      { rating: 5, review: 'Thank you' },
      { rating: 5, review: '   ' },
      { rating: 5 },
      { rating: 5, review: 42 },
    ]);
    expect(s.writtenCount).toBe(1);
    expect(s.count).toBe(4);
  });
});
