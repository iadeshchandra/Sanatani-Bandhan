/**
 * lib/orderNotify.ts — Suchana learns the marketplace order journey (pure).
 * ============================================================================
 * QUEUED #29. Until now the unified Suchana center (NotificationCenter)
 * aggregated chat, money requests, wallet, org broadcasts, referrals —
 * but was blind to the devotee's most important journey: their seva
 * bookings. Order status transitions in `marketplaceOrders` notified
 * nobody (the only order-adjacent bells were wallet-side: the provider's
 * commission due and escrow payouts).
 *
 * Observation model — SELF-LISTEN, the only pattern the self-write-only
 * `notifications/{uid}/items` rules allow (same as org broadcasts #14
 * and referral thanks #25): my own device reads MY orders — rules let a
 * participant read them (`clientUid == uid || providerUid == uid`; the
 * two single-field equality queries are exactly what
 * myOrdersAsClient/myOrdersAsProvider already run) — and emits to my
 * OWN inbox. ZERO new collections, ZERO rules changes.
 *
 * What can and cannot be observed, honestly:
 *  - Every status is observable by both parties. The AUTHOR of a
 *    transition is NOT recorded on the order doc, so self-authored
 *    moves are suppressed by ROLE+PATH knowledge instead: the provider
 *    accepts/starts (no provider bell for accepted/in_progress); the
 *    client pays on rail-2/wallet (no client bell for `paid` there);
 *    rail-1 `paid` is provider-confirmed, so the client DOES learn of
 *    it; rail-2/seva-bazar `paid` is devotee-submitted proof, so the
 *    provider DOES learn of it.
 *  - `awaiting_commission` for the PROVIDER is deliberately silent
 *    here — the wallet watcher already rings notifyCommissionDue for
 *    that exact state (once per order per day). Two bells for one fact
 *    is spam. For the CLIENT the same state is their payment-due
 *    moment, and it rings (IMPORTANT).
 *  - Priorities follow the calm-chronology contract: NOTHING here is
 *    critical — critical is reserved for SOS (types.ts; the header
 *    bell's red pulse is SOS-only). Payment-due and disputes are
 *    IMPORTANT; routine progress (begun, complete) is GENTLE.
 *  - Deep links: the client lands exactly on MyBookings
 *    (`/app/home/marketplace?view=bookings` — ClientMarketplace honors
 *    the param; the #26 OrderTimeline is on every card there). The
 *    provider's orders live inside the purohit/jyotish workspace
 *    shells, whose tabs are in-memory state — NO URL reaches
 *    ProviderOrders today, so provider events carry NO deepLink
 *    rather than a wrong-surface one; `payload.surface` names the
 *    intended surface for the day shell routing honors links.
 *
 * This file is firebase-free and jest-safe; Firestore + the localStorage
 * ledger live in orderNotifyService.ts, the watcher shell beside it.
 */
import { orderPathOf, type OrderLike } from './orderTimeline';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** The slice of a marketplaceOrders doc the watcher reasons about. */
export interface OrderLite extends OrderLike {
  id: string;
  status: string;
  gigTitle: string;
  providerUid: string;
  clientUid: string;
  /** Present on Seva Bazar orders; gig orders do not carry it. */
  providerName?: string;
  amountGross: number;
  currency: string;
  /** Epoch ms of the last write (0 when the doc carries none). */
  updatedAtMs: number;
}

export type OrderRole = 'client' | 'provider';

export type OrderCopyKey =
  | 'newRequest'
  | 'advanceReceived'
  | 'dakshinaReceived'
  | 'sevaAccepted'
  | 'sevaBegun'
  | 'contributionDue'
  | 'sevaComplete'
  | 'orderCancelled'
  | 'disputeOpened'
  | 'refundSettled';

export interface OrderNotifyEvent {
  orderId: string;
  role: OrderRole;
  /** The status the order was observed in (the transition target). */
  status: string;
  copyKey: OrderCopyKey;
  priority: 'important' | 'gentle';
  /** Stable per (order, status) — the center's backstop against doubles. */
  dedupeKey: string;
  /** Client events only — see the header note on provider surfaces. */
  deepLink?: string;
  sevaTitle: string;
  amountGross: number;
  currency: string;
  /** The other party, when a name is honestly knowable. */
  counterpartUid: string;
  counterpartName?: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** MyBookings, exactly — ClientMarketplace honors `?view=bookings`. */
export const CLIENT_ORDERS_LINK = '/app/home/marketplace?view=bookings';

/** A transition older than this is history, not news — ledger it quietly. */
export const ORDER_NOTIFY_RECENCY_MS = 7 * 24 * 60 * 60 * 1000;

/** Max bells per watcher check — a returning devotee is greeted, not flooded. */
export const ORDER_NOTIFY_MAX_PER_CHECK = 3;

/** Statuses a first-sighting provider bell makes sense for (live journey). */
const PROVIDER_NEW_LIVE = ['pending_payment', 'paid', 'accepted', 'in_progress'];

/* ------------------------------------------------------------------ */
/* Role                                                                */
/* ------------------------------------------------------------------ */

/**
 * My role on this order — or null when it is not mine, or when I am
 * somehow both parties (a self-booking carries no one to notify).
 */
export function orderRoleFor(order: OrderLite, uid: string): OrderRole | null {
  if (!order || !uid) return null;
  const asClient = order.clientUid === uid;
  const asProvider = order.providerUid === uid;
  if (asClient && asProvider) return null;
  if (asClient) return 'client';
  if (asProvider) return 'provider';
  return null;
}

/* ------------------------------------------------------------------ */
/* The transition → event mapping                                      */
/* ------------------------------------------------------------------ */

function mkEvent(
  order: OrderLite,
  role: OrderRole,
  copyKey: OrderCopyKey,
  priority: 'important' | 'gentle',
): OrderNotifyEvent {
  const isClient = role === 'client';
  return {
    orderId: order.id,
    role,
    status: order.status,
    copyKey,
    priority,
    dedupeKey: `order:${order.id}:${order.status}`,
    ...(isClient ? { deepLink: CLIENT_ORDERS_LINK } : {}),
    sevaTitle: order.gigTitle || 'Seva',
    amountGross: Number(order.amountGross || 0),
    currency: order.currency || 'INR',
    counterpartUid: isClient ? order.providerUid : order.clientUid,
    ...(isClient && order.providerName ? { counterpartName: order.providerName } : {}),
  };
}

/**
 * Decide the Suchana event for ONE observed order state.
 *
 * @param prevStatus  the status my ledger last recorded for this order,
 *                    or undefined when this device has never seen it.
 * Returns null for every state that must stay silent (see header).
 */
export function orderEventFor(args: {
  order: OrderLite;
  role: OrderRole;
  prevStatus: string | undefined;
}): OrderNotifyEvent | null {
  const { order, role, prevStatus } = args;
  const status = order.status;
  const isNew = prevStatus === undefined;
  if (!isNew && prevStatus === status) return null; // no transition

  if (role === 'provider') {
    if (isNew) {
      // A booking that arrived while I was away. Only a LIVE journey
      // earns the request bell — a first sighting already cancelled,
      // disputed, refunded or complete is history, not a request.
      return PROVIDER_NEW_LIVE.includes(status)
        ? mkEvent(order, role, 'newRequest', 'important')
        : null;
    }
    switch (status) {
      case 'paid': {
        // Rail-2 / Seva Bazar: the devotee submitted advance proof —
        // news to me. Rail-1 `paid` is MY confirmation; wallet `paid`
        // rode in with the booking itself. Both stay silent.
        const path = orderPathOf(order);
        return path === 'rail2' || path === 'seva_bazar'
          ? mkEvent(order, role, 'advanceReceived', 'important')
          : null;
      }
      case 'awaiting_commission':
        // The wallet watcher owns this bell (notifyCommissionDue).
        return null;
      case 'completed':
        return mkEvent(order, role, 'sevaComplete', 'gentle');
      case 'cancelled':
        return mkEvent(order, role, 'orderCancelled', 'important');
      case 'disputed':
        return mkEvent(order, role, 'disputeOpened', 'important');
      case 'refunded':
        return mkEvent(order, role, 'refundSettled', 'important');
      default:
        // accepted / in_progress are my own moves; unknown states are
        // not narrated rather than mis-narrated.
        return null;
    }
  }

  // role === 'client'
  if (isNew) return null; // I placed this booking — creation is self-known
  switch (status) {
    case 'paid': {
      // Rail-1 only: the provider confirmed my direct dakshina. On
      // every other path *I* am the one who paid — no bell for my
      // own tap.
      return orderPathOf(order) === 'rail1'
        ? mkEvent(order, role, 'dakshinaReceived', 'important')
        : null;
    }
    case 'accepted':
      return mkEvent(order, role, 'sevaAccepted', 'important');
    case 'in_progress':
      return mkEvent(order, role, 'sevaBegun', 'gentle');
    case 'awaiting_commission':
      // Pay-after-task: the seva is offered and MY contribution step
      // is what the journey waits on — the payment-due bell.
      return mkEvent(order, role, 'contributionDue', 'important');
    case 'completed':
      return mkEvent(order, role, 'sevaComplete', 'gentle');
    case 'cancelled':
      return mkEvent(order, role, 'orderCancelled', 'important');
    case 'disputed':
      return mkEvent(order, role, 'disputeOpened', 'important');
    case 'refunded':
      return mkEvent(order, role, 'refundSettled', 'important');
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Watcher decision                                                    */
/* ------------------------------------------------------------------ */

export interface PickOrderResult {
  /** Events to emit now, oldest transition first, capped per check. */
  notify: OrderNotifyEvent[];
  /** orderId → status for EVERY observed order, so nothing re-fires. */
  markLedger: Record<string, string>;
}

/**
 * Decide what one watcher check should do.
 *
 * Laws (mirroring org/broadcast.ts pickNotifications):
 *  - EVERY observed order is ledgered at its current status — even
 *    ones that stay silent — so history can never re-blast.
 *  - On the very first check (`baseline`), nothing notifies.
 *  - A transition notifies only when it is fresh (the order's
 *    updatedAt is within RECENCY); older diffs ledger quietly.
 *  - At most MAX bells per check, oldest first; overflow ledgers
 *    without a bell (better silent than a flood).
 */
export function pickOrderNotifications(args: {
  orders: OrderLite[];
  ledger: Record<string, string>;
  uid: string;
  now: number;
  baseline: boolean;
}): PickOrderResult {
  const markLedger: Record<string, string> = {};
  const candidates: Array<{ event: OrderNotifyEvent; updatedAtMs: number }> = [];

  for (const order of args.orders ?? []) {
    if (!order || typeof order.id !== 'string' || !order.id) continue;
    const role = orderRoleFor(order, args.uid);
    if (!role) continue;
    markLedger[order.id] = order.status;
    if (args.baseline) continue;
    const event = orderEventFor({ order, role, prevStatus: args.ledger[order.id] });
    if (!event) continue;
    // Freshness: transitions are inferred from updatedAt — an order
    // whose last write predates the window changed long ago (or the
    // doc carries no timestamp at all) and must not ring now.
    if (!(order.updatedAtMs > 0) || args.now - order.updatedAtMs > ORDER_NOTIFY_RECENCY_MS) continue;
    if (order.updatedAtMs > args.now + 5 * 60 * 1000) continue; // clock skew
    candidates.push({ event, updatedAtMs: order.updatedAtMs });
  }

  candidates.sort((a, b) => a.updatedAtMs - b.updatedAtMs); // oldest first
  return {
    notify: candidates.slice(0, ORDER_NOTIFY_MAX_PER_CHECK).map((c) => c.event),
    markLedger,
  };
}
