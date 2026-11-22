/**
 * eventTickets.test.ts — EVENTS E2 pure-logic pins.
 * =====================================================================
 * Pricing math (early-bird edges, every discount kind, fee bearer
 * both ways, GST itemisation), the refund ladder, group caps,
 * capacity counting, config derivation (the maps firestore.rules
 * validates against), transfer checks, and the ticket→RSVP linkage
 * shape. The rules mirror these formulas line-for-line; if a formula
 * changes here, it must change there (see lib/eventTickets header).
 */
import {
  TICKET_FEE_PCT,
  TICKET_GST_PCT,
  buildTicketDoc,
  canAcceptTransfer,
  codeKeyFor,
  computeQuote,
  daysBeforeFestival,
  deriveTicketingConfig,
  isValidDiscountCode,
  normalizeDiscountCode,
  passesOpen,
  publicTicketStamps,
  refundAmountFor,
  refundPercentFor,
  startMsFor,
  ticketEffQty,
  tierRemaining,
  unitPriceAt,
  validateTicketing,
  type EventTicket,
} from '../eventTickets';
import type { FestivalEventDoc, TicketTier } from '../festival';

const tier = (patch: Partial<TicketTier> = {}): TicketTier => ({
  id: 't1',
  name: { en: 'Cultural evening pass', bn: 'সাংস্কৃতিক সন্ধ্যা পাস', hi: 'सांस्कृतिक संध्या पास' },
  kind: 'paid',
  price: 500,
  ...patch,
});

const JAN1 = startMsFor('2026-01-01'); // a fixed "now" for quotes

describe('unitPriceAt — early-bird window edges', () => {
  const t = tier({ price: 500, earlyBird: { price: 300, untilDate: '2026-01-10' } });
  it('applies the early price before and ON the until date', () => {
    expect(unitPriceAt(t, startMsFor('2026-01-05'))).toEqual({ unit: 300, earlyBirdApplied: true });
    expect(unitPriceAt(t, startMsFor('2026-01-10') + 12 * 3600_000).earlyBirdApplied).toBe(true);
    expect(unitPriceAt(t, startMsFor('2026-01-10') + 86399_000).earlyBirdApplied).toBe(true);
  });
  it('falls back to full price the day after', () => {
    expect(unitPriceAt(t, startMsFor('2026-01-11'))).toEqual({ unit: 500, earlyBirdApplied: false });
  });
  it('no early bird configured → list price', () => {
    expect(unitPriceAt(tier(), JAN1)).toEqual({ unit: 500, earlyBirdApplied: false });
  });
});

describe('computeQuote — itemised math', () => {
  it('plain paid quote, organiser bears the fee', () => {
    const q = computeQuote({ tier: tier(), qty: 2, feeBearer: 'organiser', currency: 'INR', nowMs: JAN1 });
    expect(q.price).toBe(1000);
    expect(q.discount).toBe(0);
    expect(q.fee).toBe(Math.floor(1000 * TICKET_FEE_PCT / 100)); // 50
    expect(q.gst).toBe(Math.floor(50 * TICKET_GST_PCT / 100)); // 9
    expect(q.total).toBe(1000); // fee recorded, not charged to buyer
  });
  it('buyer bears the fee → fee + GST land in the total', () => {
    const q = computeQuote({ tier: tier(), qty: 2, feeBearer: 'buyer', currency: 'INR', nowMs: JAN1 });
    expect(q.total).toBe(1000 + 50 + 9);
  });
  it('GST applies to INR only', () => {
    const q = computeQuote({ tier: tier(), qty: 1, feeBearer: 'buyer', currency: 'BDT', nowMs: JAN1 });
    expect(q.gst).toBe(0);
    expect(q.total).toBe(500 + 25);
  });
  it('flat discount, capped at the price', () => {
    const q = computeQuote({
      tier: tier(), qty: 1, feeBearer: 'organiser', currency: 'INR', nowMs: JAN1,
      codeTerms: { kind: 'flat', value: 700 },
    });
    expect(q.discount).toBe(500);
    expect(q.total).toBe(0);
  });
  it('percent discount floors', () => {
    const q = computeQuote({
      tier: tier({ price: 333 }), qty: 1, feeBearer: 'organiser', currency: 'INR', nowMs: JAN1,
      codeTerms: { kind: 'percent', value: 10 },
    });
    expect(q.discount).toBe(33); // floor(33.3)
    expect(q.fee).toBe(Math.floor(300 * TICKET_FEE_PCT / 100));
  });
  it('full code → comp: total 0, fee 0', () => {
    const q = computeQuote({
      tier: tier(), qty: 3, feeBearer: 'buyer', currency: 'INR', nowMs: JAN1,
      codeTerms: { kind: 'full', value: 0 },
    });
    expect(q.discount).toBe(1500);
    expect(q.fee).toBe(0);
    expect(q.gst).toBe(0);
    expect(q.total).toBe(0);
  });
  it('early-bird price feeds the quote inside its window', () => {
    const q = computeQuote({
      tier: tier({ earlyBird: { price: 300, untilDate: '2026-01-10' } }),
      qty: 2, feeBearer: 'organiser', currency: 'INR', nowMs: startMsFor('2026-01-09'),
    });
    expect(q.unitPrice).toBe(300);
    expect(q.price).toBe(600);
    expect(q.earlyBirdApplied).toBe(true);
  });
  it('unknown code (null terms) → no discount promised', () => {
    const q = computeQuote({
      tier: tier(), qty: 1, feeBearer: 'organiser', currency: 'INR', nowMs: JAN1, codeTerms: null,
    });
    expect(q.discount).toBe(0);
    expect(q.discountApplied).toBe(false);
  });
  it('the lines always sum: price − discount + (buyer fee+gst) = total', () => {
    for (const feeBearer of ['organiser', 'buyer'] as const) {
      const q = computeQuote({
        tier: tier({ price: 275 }), qty: 3, feeBearer, currency: 'INR', nowMs: JAN1,
        codeTerms: { kind: 'percent', value: 15 },
      });
      const expected = q.price - q.discount + (feeBearer === 'buyer' ? q.fee + q.gst : 0);
      expect(q.total).toBe(expected);
    }
  });
});

describe('refund ladder', () => {
  const ladder = [
    { minDaysBefore: 7, percent: 100 },
    { minDaysBefore: 3, percent: 50 },
    { minDaysBefore: 0, percent: 0 },
  ];
  it('walks rungs by whole days before', () => {
    expect(refundPercentFor(ladder, 30)).toBe(100);
    expect(refundPercentFor(ladder, 7)).toBe(100); // exact rung day
    expect(refundPercentFor(ladder, 6)).toBe(50);
    expect(refundPercentFor(ladder, 3)).toBe(50);
    expect(refundPercentFor(ladder, 2)).toBe(0);
    expect(refundPercentFor(ladder, 0)).toBe(0);
    expect(refundPercentFor(ladder, -2)).toBe(0); // after the start
  });
  it('organiser-cancelled festival returns 100% at any distance', () => {
    expect(refundPercentFor(ladder, 0, true)).toBe(100);
    expect(refundPercentFor([], 0, true)).toBe(100);
  });
  it('no policy → nothing promised', () => {
    expect(refundPercentFor([], 30)).toBe(0);
    expect(refundPercentFor(undefined, 30)).toBe(0);
  });
  it('refund amount floors like the rules', () => {
    expect(refundAmountFor({ total: 999 }, 50)).toBe(499);
    expect(refundAmountFor({ total: 1000 }, 100)).toBe(1000);
    expect(refundAmountFor({ total: 1000 }, 0)).toBe(0);
  });
  it('daysBeforeFestival floors partial days (the rules formula)', () => {
    const start = startMsFor('2026-02-10');
    expect(daysBeforeFestival(start, start - 7 * 86400000)).toBe(7);
    expect(daysBeforeFestival(start, start - 7 * 86400000 + 3600000)).toBe(6);
    expect(daysBeforeFestival(start, start + 3600000)).toBe(-1);
  });
});

describe('capacity counting', () => {
  it('tierRemaining honours the cap and never goes negative', () => {
    expect(tierRemaining({ capacity: 100 }, { t1: 40 }, 't1')).toBe(60);
    expect(tierRemaining({ capacity: 100 }, { t1: 140 }, 't1')).toBe(0);
    expect(tierRemaining({}, {}, 't1')).toBe(Number.POSITIVE_INFINITY);
    expect(tierRemaining({ capacity: 10 }, undefined, 't1')).toBe(10);
  });
  it('effective qty: live passes count, dead ones do not', () => {
    expect(ticketEffQty({ paymentState: 'paid-wallet', qty: 4 })).toBe(4);
    expect(ticketEffQty({ paymentState: 'pay-at-venue', qty: 2 })).toBe(2);
    expect(ticketEffQty({ paymentState: 'comp', qty: 1 })).toBe(1);
    expect(ticketEffQty({ paymentState: 'cancelled', qty: 4 })).toBe(0);
    expect(ticketEffQty({ paymentState: 'refunded', qty: 4 })).toBe(0);
  });
});

describe('deriveTicketingConfig — the rules-validation maps', () => {
  const editor = {
    tiers: [
      tier({ capacity: 100, maxPerBooking: 4, earlyBird: { price: 300, untilDate: '2026-01-10' } }),
      tier({ id: 't2', kind: 'addon', price: 150, name: { en: 'Prasad box', bn: 'প্রসাদ বাক্স', hi: 'प्रसाद डिब्बा' } }),
    ],
    discountCodes: [
      { code: 'diwali10', kind: 'percent' as const, value: 10, maxUses: 50 },
      { code: 'SEVA', kind: 'full' as const, value: 0 },
    ],
    refundPolicy: [
      { minDaysBefore: 3, percent: 50 },
      { minDaysBefore: 7, percent: 100 },
    ],
    feeBearer: 'buyer' as const,
  };
  const cfg = deriveTicketingConfig(editor, { DIWALI10: 7 }, '2026-02-10', '2026-02-12');

  it('stamps price / kind / cap maps for every tier', () => {
    expect(cfg.tierPrices).toEqual({ t1: 500, t2: 150 });
    expect(cfg.tierKinds).toEqual({ t1: 'paid', t2: 'addon' });
    expect(cfg.tierMax).toEqual({ t1: 4, t2: 6 }); // default cap 6
  });
  it('early-bird stamp runs to the END of its date', () => {
    expect(cfg.tierEarly.t1.price).toBe(300);
    expect(cfg.tierEarly.t1.untilMs).toBe(startMsFor('2026-01-10') + 86400000 - 1);
  });
  it('codes normalise into the map; uses carry forward untouched', () => {
    expect(cfg.codeMap.DIWALI10).toEqual({ kind: 'percent', value: 10, maxUses: 50 });
    expect(cfg.codeMap.SEVA).toEqual({ kind: 'full', value: 0 });
    expect(cfg.discountUses).toEqual({ DIWALI10: 7 });
  });
  it('ladder sorts desc and gains a 0-day floor row', () => {
    expect(cfg.refundLadder).toEqual([
      { minDaysBefore: 7, percent: 100 },
      { minDaysBefore: 3, percent: 50 },
      { minDaysBefore: 0, percent: 0 },
    ]);
  });
  it('festival clock stamps are UTC midnights', () => {
    expect(cfg.startMs).toBe(startMsFor('2026-02-10'));
    expect(cfg.endMs).toBe(startMsFor('2026-02-12') + 86400000 - 1);
  });
  it('public stamps carry tiers/caps/policy but never a code', () => {
    const pub = publicTicketStamps(cfg);
    expect(pub.tierCaps).toEqual({ t1: 100 });
    expect(pub.ticketFeeBearer).toBe('buyer');
    expect(Object.keys(pub.discountTerms)).toEqual([codeKeyFor('DIWALI10'), codeKeyFor('SEVA')]);
    expect(JSON.stringify(pub)).not.toContain('DIWALI10');
    expect(JSON.stringify(pub)).not.toContain('SEVA');
  });
});

describe('validateTicketing', () => {
  it('accepts a sound config', () => {
    expect(validateTicketing({ tiers: [tier()], discountCodes: [], refundPolicy: [], feeBearer: 'organiser' })).toBeNull();
  });
  it('rejects a paid tier with no price and a free tier with one', () => {
    expect(validateTicketing({ tiers: [tier({ price: 0 })], discountCodes: [], refundPolicy: [], feeBearer: 'organiser' })).toBe('tier-price');
    expect(validateTicketing({ tiers: [tier({ kind: 'free', price: 10 })], discountCodes: [], refundPolicy: [], feeBearer: 'organiser' })).toBe('tier-price');
  });
  it('rejects bad codes and duplicate tiers', () => {
    expect(validateTicketing({ tiers: [tier()], discountCodes: [{ code: 'x', kind: 'flat', value: 5 }], refundPolicy: [], feeBearer: 'organiser' })).toBe('code-shape');
    expect(validateTicketing({ tiers: [tier(), tier()], discountCodes: [], refundPolicy: [], feeBearer: 'organiser' })).toBe('tier-id');
  });
  it('code shape law: uppercase words only', () => {
    expect(normalizeDiscountCode(' diwali 10 ')).toBe('DIWALI10');
    expect(isValidDiscountCode('DIWALI10')).toBe(true);
    expect(isValidDiscountCode('DIWALI.10')).toBe(false);
    expect(isValidDiscountCode('AB')).toBe(false);
  });
});

describe('buildTicketDoc — the ticket→RSVP linkage shape', () => {
  const event = { id: 'ws1__diwali_2026-10-20', workspaceId: 'ws1' } as Pick<FestivalEventDoc, 'id' | 'workspaceId'>;
  const amounts = { price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 };
  it('an attendance pass links the buyer party RSVP doc id', () => {
    const doc = buildTicketDoc({
      id: 'tk1', event, tier: tier(), buyerUid: 'u1', buyerName: 'Ananda',
      attendees: [{ name: 'Ananda' }, { name: 'Mira' }], qty: 2, amounts,
      currency: 'INR', paymentState: 'paid-wallet', nowIso: '2026-01-01T00:00:00.000Z',
    });
    expect(doc.rsvpId).toBe('ws1__diwali_2026-10-20__u1');
    expect(doc.festivalId).toBe(event.id);
    expect(doc.qty).toBe(2);
  });
  it('an add-on carries no RSVP link and no attendee names', () => {
    const doc = buildTicketDoc({
      id: 'tk2', event, tier: tier({ id: 't2', kind: 'addon', price: 150 }), buyerUid: 'u1', buyerName: 'Ananda',
      attendees: [], qty: 3, amounts: { price: 450, discount: 0, fee: 22, gst: 3, total: 450 },
      currency: 'INR', paymentState: 'pay-at-venue', nowIso: '2026-01-01T00:00:00.000Z',
    });
    expect(doc.rsvpId).toBeUndefined();
    expect(doc.attendees).toEqual([]);
  });
  it('the discount code is stored normalised', () => {
    const doc = buildTicketDoc({
      id: 'tk3', event, tier: tier(), buyerUid: 'u1', buyerName: 'A',
      attendees: [{ name: 'A' }], qty: 1, amounts, currency: 'INR',
      discountCode: ' diwali10 ', paymentState: 'paid-wallet', nowIso: '2026-01-01T00:00:00.000Z',
    });
    expect(doc.discountCode).toBe('DIWALI10');
  });
});

describe('canAcceptTransfer — accept window and state', () => {
  const start = startMsFor('2026-02-10');
  const base: Pick<EventTicket, 'paymentState' | 'transferState' | 'transferToUid'> = {
    paymentState: 'paid-wallet', transferState: 'offered', transferToUid: 'u2',
  };
  it('accepts a live offer before the festival begins', () => {
    expect(canAcceptTransfer(base, 'u2', start - 1000, start)).toBe(true);
  });
  it('the cutoff is the festival start', () => {
    expect(canAcceptTransfer(base, 'u2', start, start)).toBe(false);
    expect(canAcceptTransfer(base, 'u2', start + 1000, start)).toBe(false);
  });
  it('only the named recipient, only while offered, only while live', () => {
    expect(canAcceptTransfer(base, 'u3', start - 1000, start)).toBe(false);
    expect(canAcceptTransfer({ ...base, transferState: 'declined' }, 'u2', start - 1000, start)).toBe(false);
    expect(canAcceptTransfer({ ...base, paymentState: 'cancelled' }, 'u2', start - 1000, start)).toBe(false);
    expect(canAcceptTransfer({ ...base, paymentState: 'comp' }, 'u2', start - 1000, start)).toBe(true);
  });
});

describe('EVENTS E8 — the pass release gate', () => {
  const RELEASE_ISO = '2026-01-05T09:00:00.000Z';
  const releaseMs = Date.parse(RELEASE_ISO);

  it('passesOpen: absent or 0 stamp is the old, ungated path', () => {
    expect(passesOpen({}, releaseMs - 1000)).toBe(true);
    expect(passesOpen({ ticketReleaseAtMs: 0 }, releaseMs - 1000)).toBe(true);
    expect(passesOpen({ ticketReleaseAtMs: undefined }, releaseMs - 1000)).toBe(true);
  });

  it('passesOpen: before the moment closed, AT the moment open', () => {
    const ev = { ticketReleaseAtMs: releaseMs };
    expect(passesOpen(ev, releaseMs - 1)).toBe(false);
    expect(passesOpen(ev, releaseMs)).toBe(true);
    expect(passesOpen(ev, releaseMs + 1)).toBe(true);
  });

  it('deriveTicketingConfig carries the release moment twice (ISO + ms)', () => {
    const cfg = deriveTicketingConfig(
      { tiers: [tier()], discountCodes: [], refundPolicy: [], feeBearer: 'organiser', releaseAt: RELEASE_ISO },
      {}, '2026-02-01', '2026-02-01'
    );
    expect(cfg.releaseAt).toBe(RELEASE_ISO);
    expect(cfg.releaseAtMs).toBe(releaseMs);
  });

  it('deriveTicketingConfig without a release carries neither field', () => {
    const cfg = deriveTicketingConfig(
      { tiers: [tier()], discountCodes: [], refundPolicy: [], feeBearer: 'organiser' },
      {}, '2026-02-01', '2026-02-01'
    );
    expect('releaseAt' in cfg).toBe(false);
    expect('releaseAtMs' in cfg).toBe(false);
    const bad = deriveTicketingConfig(
      { tiers: [tier()], discountCodes: [], refundPolicy: [], feeBearer: 'organiser', releaseAt: 'not-a-date' },
      {}, '2026-02-01', '2026-02-01'
    );
    expect('releaseAtMs' in bad).toBe(false);
  });

  it('validateTicketing rejects an unreadable release moment', () => {
    expect(validateTicketing({
      tiers: [tier()], discountCodes: [], refundPolicy: [], feeBearer: 'organiser', releaseAt: 'whenever',
    })).toBe('release-date');
    expect(validateTicketing({
      tiers: [tier()], discountCodes: [], refundPolicy: [], feeBearer: 'organiser', releaseAt: RELEASE_ISO,
    })).toBeNull();
  });

  it('the publish stamp is pinned: ticketReleaseAtMs always a number', () => {
    const withGate = publicTicketStamps(deriveTicketingConfig(
      { tiers: [tier()], discountCodes: [], refundPolicy: [], feeBearer: 'organiser', releaseAt: RELEASE_ISO },
      {}, '2026-02-01', '2026-02-01'
    ));
    expect(withGate.ticketReleaseAtMs).toBe(releaseMs);
    const noGate = publicTicketStamps(deriveTicketingConfig(
      { tiers: [tier()], discountCodes: [], refundPolicy: [], feeBearer: 'organiser' },
      {}, '2026-02-01', '2026-02-01'
    ));
    // 0 — never absent, never null: a cleared release cannot leave
    // a stale future stamp on the merge publish, and the rules
    // read one shape only.
    expect(noGate.ticketReleaseAtMs).toBe(0);
  });
});
