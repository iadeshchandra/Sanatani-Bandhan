/**
 * orderNotify.test.ts — QUEUED #29: Suchana learns marketplace orders.
 * Pins the transition→item mapping per role, the baseline law, the
 * status ledger, dedupe keys, deep links, and the priority contract
 * (payment-due/dispute = important; routine progress = gentle; nothing
 * is ever critical — critical belongs to SOS alone).
 */
import {
  CLIENT_ORDERS_LINK,
  ORDER_NOTIFY_MAX_PER_CHECK,
  orderEventFor,
  orderRoleFor,
  pickOrderNotifications,
  type OrderLite,
} from '../orderNotify';

const ME = 'uid-me';
const OTHER = 'uid-other';
const NOW = 1_800_000_000_000; // fixed clock
const FRESH = NOW - 60_000; // updated a minute ago
const STALE = NOW - 30 * 24 * 60 * 60 * 1000; // updated 30 days ago

function order(over: Partial<OrderLite> = {}): OrderLite {
  return {
    id: 'ord1',
    status: 'pending_payment',
    gigTitle: 'Satyanarayan Katha',
    providerUid: OTHER,
    clientUid: ME,
    amountGross: 1100,
    currency: 'BDT',
    rail: 'rail1',
    updatedAtMs: FRESH,
    ...over,
  };
}
const asProvider = (over: Partial<OrderLite> = {}) =>
  order({ providerUid: ME, clientUid: OTHER, ...over });

const pick = (
  orders: OrderLite[],
  ledger: Record<string, string> = {},
  baseline = false,
  now = NOW,
) => pickOrderNotifications({ orders, ledger, uid: ME, now, baseline });

describe('orderRoleFor', () => {
  it('resolves client, provider, stranger, and self-booking', () => {
    expect(orderRoleFor(order(), ME)).toBe('client');
    expect(orderRoleFor(asProvider(), ME)).toBe('provider');
    expect(orderRoleFor(order({ clientUid: 'x', providerUid: 'y' }), ME)).toBeNull();
    expect(orderRoleFor(order({ clientUid: ME, providerUid: ME }), ME)).toBeNull();
  });
});

describe('client transitions', () => {
  it('accepted → sevaAccepted, IMPORTANT, deep-linked to MyBookings', () => {
    const ev = orderEventFor({ order: order({ status: 'accepted' }), role: 'client', prevStatus: 'paid' });
    expect(ev).not.toBeNull();
    expect(ev!.copyKey).toBe('sevaAccepted');
    expect(ev!.priority).toBe('important');
    expect(ev!.deepLink).toBe(CLIENT_ORDERS_LINK);
    expect(ev!.deepLink).toBe('/app/home/marketplace?view=bookings');
    expect(ev!.dedupeKey).toBe('order:ord1:accepted');
  });

  it('in_progress → sevaBegun, GENTLE (routine progress never shouts)', () => {
    const ev = orderEventFor({ order: order({ status: 'in_progress' }), role: 'client', prevStatus: 'accepted' });
    expect(ev!.copyKey).toBe('sevaBegun');
    expect(ev!.priority).toBe('gentle');
  });

  it('awaiting_commission → contributionDue, IMPORTANT (the payment-due moment)', () => {
    const ev = orderEventFor({
      order: order({ status: 'awaiting_commission', payAfterTask: true }),
      role: 'client',
      prevStatus: 'in_progress',
    });
    expect(ev!.copyKey).toBe('contributionDue');
    expect(ev!.priority).toBe('important');
  });

  it('completed → sevaComplete, GENTLE', () => {
    const ev = orderEventFor({ order: order({ status: 'completed' }), role: 'client', prevStatus: 'in_progress' });
    expect(ev!.copyKey).toBe('sevaComplete');
    expect(ev!.priority).toBe('gentle');
  });

  it('cancelled / disputed / refunded → IMPORTANT with honest copy keys', () => {
    expect(orderEventFor({ order: order({ status: 'cancelled' }), role: 'client', prevStatus: 'paid' })!.copyKey).toBe('orderCancelled');
    expect(orderEventFor({ order: order({ status: 'disputed' }), role: 'client', prevStatus: 'paid' })!.priority).toBe('important');
    expect(orderEventFor({ order: order({ status: 'disputed' }), role: 'client', prevStatus: 'paid' })!.copyKey).toBe('disputeOpened');
    expect(orderEventFor({ order: order({ status: 'refunded' }), role: 'client', prevStatus: 'disputed' })!.copyKey).toBe('refundSettled');
  });

  it('paid rings ONLY on rail-1 (provider-confirmed); my own payments stay silent', () => {
    const rail1 = orderEventFor({ order: order({ status: 'paid', rail: 'rail1' }), role: 'client', prevStatus: 'pending_payment' });
    expect(rail1!.copyKey).toBe('dakshinaReceived');
    expect(rail1!.priority).toBe('important');
    expect(orderEventFor({ order: order({ status: 'paid', rail: 'rail2' }), role: 'client', prevStatus: 'pending_payment' })).toBeNull();
    expect(orderEventFor({ order: order({ status: 'paid', payWithWallet: true }), role: 'client', prevStatus: 'pending_payment' })).toBeNull();
    expect(orderEventFor({ order: order({ status: 'paid', sevaBazar: { postId: 'p' } }), role: 'client', prevStatus: 'pending_payment' })).toBeNull();
  });

  it('a first-sighting order never rings for the client (I placed it myself)', () => {
    expect(orderEventFor({ order: order({ status: 'accepted' }), role: 'client', prevStatus: undefined })).toBeNull();
    expect(orderEventFor({ order: order({ status: 'completed' }), role: 'client', prevStatus: undefined })).toBeNull();
  });
});

describe('provider transitions', () => {
  it('new live order → newRequest, IMPORTANT, and NO deep link (no URL reaches ProviderOrders)', () => {
    const ev = orderEventFor({ order: asProvider(), role: 'provider', prevStatus: undefined });
    expect(ev!.copyKey).toBe('newRequest');
    expect(ev!.priority).toBe('important');
    expect(ev!.deepLink).toBeUndefined();
    expect(ev!.counterpartUid).toBe(OTHER);
  });

  it('new order first seen already terminal → silent (history, not a request)', () => {
    expect(orderEventFor({ order: asProvider({ status: 'cancelled' }), role: 'provider', prevStatus: undefined })).toBeNull();
    expect(orderEventFor({ order: asProvider({ status: 'completed' }), role: 'provider', prevStatus: undefined })).toBeNull();
    expect(orderEventFor({ order: asProvider({ status: 'awaiting_commission' }), role: 'provider', prevStatus: undefined })).toBeNull();
  });

  it('paid rings on rail-2 and Seva Bazar (proof submitted), never on rail-1/wallet (my own confirm)', () => {
    expect(orderEventFor({ order: asProvider({ status: 'paid', rail: 'rail2' }), role: 'provider', prevStatus: 'pending_payment' })!.copyKey).toBe('advanceReceived');
    expect(orderEventFor({ order: asProvider({ status: 'paid', sevaBazar: { postId: 'p' } }), role: 'provider', prevStatus: 'pending_payment' })!.copyKey).toBe('advanceReceived');
    expect(orderEventFor({ order: asProvider({ status: 'paid', rail: 'rail1' }), role: 'provider', prevStatus: 'pending_payment' })).toBeNull();
    expect(orderEventFor({ order: asProvider({ status: 'paid', payWithWallet: true }), role: 'provider', prevStatus: 'pending_payment' })).toBeNull();
  });

  it('awaiting_commission stays silent for the provider — the wallet watcher owns the dues bell', () => {
    expect(orderEventFor({
      order: asProvider({ status: 'awaiting_commission', payAfterTask: true }),
      role: 'provider',
      prevStatus: 'in_progress',
    })).toBeNull();
  });

  it('accepted / in_progress are the provider’s own moves — silent', () => {
    expect(orderEventFor({ order: asProvider({ status: 'accepted' }), role: 'provider', prevStatus: 'paid' })).toBeNull();
    expect(orderEventFor({ order: asProvider({ status: 'in_progress' }), role: 'provider', prevStatus: 'accepted' })).toBeNull();
  });

  it('completed → GENTLE; cancelled / disputed / refunded → IMPORTANT', () => {
    expect(orderEventFor({ order: asProvider({ status: 'completed' }), role: 'provider', prevStatus: 'in_progress' })!.priority).toBe('gentle');
    expect(orderEventFor({ order: asProvider({ status: 'cancelled' }), role: 'provider', prevStatus: 'paid' })!.copyKey).toBe('orderCancelled');
    expect(orderEventFor({ order: asProvider({ status: 'disputed' }), role: 'provider', prevStatus: 'paid' })!.priority).toBe('important');
    expect(orderEventFor({ order: asProvider({ status: 'refunded' }), role: 'provider', prevStatus: 'disputed' })!.copyKey).toBe('refundSettled');
  });
});

describe('pickOrderNotifications — ledger, baseline, freshness, caps', () => {
  it('no transition → no event, but the ledger still records the status', () => {
    const r = pick([order({ status: 'accepted' })], { ord1: 'accepted' });
    expect(r.notify).toHaveLength(0);
    expect(r.markLedger).toEqual({ ord1: 'accepted' });
  });

  it('baseline: everything is ledgered, nothing rings', () => {
    const r = pick(
      [order({ status: 'accepted' }), asProvider({ id: 'ord2', status: 'pending_payment' })],
      {},
      true,
    );
    expect(r.notify).toHaveLength(0);
    expect(r.markLedger).toEqual({ ord1: 'accepted', ord2: 'pending_payment' });
  });

  it('a skipped intermediate state collapses to the observed one (paid → completed rings complete only)', () => {
    const r = pick([order({ status: 'completed' })], { ord1: 'paid' });
    expect(r.notify).toHaveLength(1);
    expect(r.notify[0].copyKey).toBe('sevaComplete');
  });

  it('stale transitions ledger quietly — a long-closed app never replays ancient history', () => {
    const r = pick([order({ status: 'accepted', updatedAtMs: STALE })], { ord1: 'paid' });
    expect(r.notify).toHaveLength(0);
    expect(r.markLedger).toEqual({ ord1: 'accepted' });
  });

  it('an order with no timestamp at all never rings (freshness is evidence-based)', () => {
    const r = pick([order({ status: 'accepted', updatedAtMs: 0 })], { ord1: 'paid' });
    expect(r.notify).toHaveLength(0);
    expect(r.markLedger).toEqual({ ord1: 'accepted' });
  });

  it('caps bells per check, oldest first; overflow is ledgered without a bell', () => {
    const orders = [1, 2, 3, 4, 5].map((n) =>
      order({ id: `ord${n}`, status: 'accepted', updatedAtMs: FRESH + n * 1000 }),
    );
    const ledger = Object.fromEntries(orders.map((o) => [o.id, 'paid']));
    const r = pick(orders, ledger);
    expect(r.notify).toHaveLength(ORDER_NOTIFY_MAX_PER_CHECK);
    expect(r.notify.map((e) => e.orderId)).toEqual(['ord1', 'ord2', 'ord3']);
    expect(Object.keys(r.markLedger)).toHaveLength(5);
  });

  it('orders that are not mine, and self-bookings, are ignored entirely', () => {
    const r = pick([
      order({ id: 'ordX', clientUid: 'a', providerUid: 'b', status: 'accepted' }),
      order({ id: 'ordY', clientUid: ME, providerUid: ME, status: 'accepted' }),
    ], { ordX: 'paid', ordY: 'paid' });
    expect(r.notify).toHaveLength(0);
    expect(r.markLedger).toEqual({});
  });

  it('unknown statuses are ledgered but never narrated', () => {
    const r = pick([order({ status: 'some_future_status' })], { ord1: 'paid' });
    expect(r.notify).toHaveLength(0);
    expect(r.markLedger).toEqual({ ord1: 'some_future_status' });
  });

  it('dedupe keys are stable per order+status across checks', () => {
    const a = orderEventFor({ order: order({ status: 'accepted' }), role: 'client', prevStatus: 'paid' });
    const b = orderEventFor({ order: order({ status: 'accepted' }), role: 'client', prevStatus: 'pending_payment' });
    expect(a!.dedupeKey).toBe(b!.dedupeKey);
  });
});
