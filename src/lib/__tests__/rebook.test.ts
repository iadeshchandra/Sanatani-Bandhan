/**
 * rebook.test.ts — QUEUED #27: one-tap rebook decisions.
 * Pins the eligibility matrix (completed + cancelled only, gig vs
 * Seva Bazar targets, no-target orders excluded), the gig-state
 * ladder, and the honest price-change note.
 */
import {
  rebookEligibility,
  rebookGigState,
  priceChangeNote,
  type RebookOrderLike,
} from '../rebook';

const gigOrder = (over: Partial<RebookOrderLike> = {}): RebookOrderLike => ({
  status: 'completed',
  gigId: 'gig_123',
  providerUid: 'provider_1',
  amountGross: 1100,
  currency: 'BDT',
  ...over,
});

const bazarOrder = (over: Partial<RebookOrderLike> = {}): RebookOrderLike => ({
  status: 'completed',
  gigId: '',
  providerUid: 'provider_1',
  sevaBazar: { postId: 'post_9' },
  amountGross: 501,
  currency: 'INR',
  ...over,
});

describe('rebookEligibility — status matrix', () => {
  it('completed gig order is eligible via the gig flow', () => {
    expect(rebookEligibility(gigOrder())).toEqual({ eligible: true, kind: 'gig' });
  });

  it('cancelled gig order is eligible (the seva never happened)', () => {
    expect(rebookEligibility(gigOrder({ status: 'cancelled' }))).toEqual({
      eligible: true,
      kind: 'gig',
    });
  });

  it('live journeys are never eligible — no stacked duplicates', () => {
    for (const status of ['pending_payment', 'paid', 'accepted', 'in_progress', 'awaiting_commission']) {
      expect(rebookEligibility(gigOrder({ status })).eligible).toBe(false);
    }
  });

  it('disputed and refunded orders are excluded (their own statuses)', () => {
    expect(rebookEligibility(gigOrder({ status: 'disputed' })).eligible).toBe(false);
    expect(rebookEligibility(gigOrder({ status: 'refunded' })).eligible).toBe(false);
  });

  it('unknown or missing status is excluded', () => {
    expect(rebookEligibility(gigOrder({ status: 'whatever' })).eligible).toBe(false);
    expect(rebookEligibility(gigOrder({ status: undefined })).eligible).toBe(false);
    expect(rebookEligibility(null).eligible).toBe(false);
    expect(rebookEligibility(undefined).eligible).toBe(false);
  });
});

describe('rebookEligibility — target resolution', () => {
  it('completed Seva Bazar order is eligible via its notice', () => {
    expect(rebookEligibility(bazarOrder())).toEqual({ eligible: true, kind: 'seva_bazar' });
  });

  it('cancelled Seva Bazar order is eligible via its notice', () => {
    expect(rebookEligibility(bazarOrder({ status: 'cancelled' }))).toEqual({
      eligible: true,
      kind: 'seva_bazar',
    });
  });

  it('gigId wins when both targets exist', () => {
    expect(rebookEligibility(bazarOrder({ gigId: 'gig_7' })).kind).toBe('gig');
  });

  it('gig-less order without a post id has no faithful target (consultation dakshina)', () => {
    const dakshina = gigOrder({ gigId: '', sevaBazar: undefined });
    expect(rebookEligibility(dakshina)).toEqual({ eligible: false, kind: null });
  });

  it('Seva Bazar order with a blank post id is not eligible', () => {
    expect(rebookEligibility(bazarOrder({ sevaBazar: { postId: '  ' } })).eligible).toBe(false);
    expect(rebookEligibility(bazarOrder({ sevaBazar: null })).eligible).toBe(false);
  });

  it('Seva Bazar order without a provider uid cannot open its door', () => {
    expect(rebookEligibility(bazarOrder({ providerUid: '' })).eligible).toBe(false);
  });

  it('a whitespace gigId is not a target', () => {
    expect(rebookEligibility(gigOrder({ gigId: '   ' })).eligible).toBe(false);
  });
});

describe('rebookGigState', () => {
  it('missing gig is gone', () => {
    expect(rebookGigState(null)).toBe('gone');
    expect(rebookGigState(undefined)).toBe('gone');
  });

  it('explicitly inactive gig is inactive', () => {
    expect(rebookGigState({ active: false })).toBe('inactive');
  });

  it('active or unspecified gig is available (mirrors createOrder guard)', () => {
    expect(rebookGigState({ active: true })).toBe('available');
    expect(rebookGigState({})).toBe('available');
  });
});

describe('priceChangeNote', () => {
  it('same price and currency → no note', () => {
    expect(priceChangeNote(gigOrder(), { priceAmount: 1100, priceCurrency: 'BDT' })).toBeNull();
  });

  it('fractional equality rounds the way createOrder charges → no note', () => {
    expect(priceChangeNote(gigOrder({ amountGross: 1100.4 }), { priceAmount: 1100, priceCurrency: 'BDT' })).toBeNull();
  });

  it('amount changed → note carries both sides', () => {
    expect(priceChangeNote(gigOrder(), { priceAmount: 1250, priceCurrency: 'BDT' })).toEqual({
      wasAmount: 1100,
      wasCurrency: 'BDT',
      nowAmount: 1250,
      nowCurrency: 'BDT',
    });
  });

  it('currency changed at the same number → still a note (honest units)', () => {
    const note = priceChangeNote(gigOrder({ currency: 'INR' }), { priceAmount: 1100, priceCurrency: 'BDT' });
    expect(note).toEqual({ wasAmount: 1100, wasCurrency: 'INR', nowAmount: 1100, nowCurrency: 'BDT' });
  });

  it('missing currencies default to INR on both sides', () => {
    expect(
      priceChangeNote(gigOrder({ currency: undefined }), { priceAmount: 1100, priceCurrency: undefined }),
    ).toBeNull();
  });
});
