/**
 * eventTickets.ts — seva passes & tickets (EVENTS E2).
 * =====================================================================
 * The money record for a festival pass is ONE document in the NEW
 * collection `event_tickets`. The design laws, all enforced in
 * firestore.rules and mirrored by the pure helpers below:
 *
 *  - ONE flexible pass object (tiers on the festival definition):
 *    free pass / paid pass / add-on, early seva price until a plainly
 *    stated date, discount codes, a published refund ladder.
 *  - HOUSEHOLD BOOKING: one buyer names every attendee. An attendance
 *    pass (free/paid tier) creates the buyer's party RSVP record
 *    through the anchored festivalRsvp path (headcount = party size,
 *    ticketId stamped on it), so the E3 gate pass, the War Room and
 *    every public counter work unchanged. Add-ons never touch RSVP.
 *  - ITEMISED BEFORE CONFIRM: price − discount + platform seva fee +
 *    GST on the fee (INR only), each line shown. The fee is borne by
 *    the organiser or the buyer — the trustee chooses; the buyer
 *    always sees the truth before paying.
 *  - ANCHORED COUNTS: tierSold on the public event doc moves only in
 *    the same batch as the ticket record that causes it, witnessed
 *    by tierAnchorTicketId (anchoredTierCounter in the rules) —
 *    never a client-kept count. Discount-code uses increment through
 *    an anchored field-path increment on the plan (anchoredDiscountUse).
 *  - NO CUSTODY: wallet passes debit the buyer's own Seva Wallet
 *    through the rules-pinned wallet anchor (lastDebitTicketId);
 *    venue passes are settled in cash/UPI at the desk and only
 *    RECORDED here. No card money ever touches this code.
 *  - REFUNDS FOLLOW THE PUBLISHED LADDER: percent by whole days
 *    before the festival; an organiser-cancelled festival returns
 *    100%, fee included. One-way, auditable state transitions.
 *
 * The constants below are mirrored as literals in firestore.rules
 * (ticketAmountsOk) — change them together or not at all.
 */
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type {
  FestivalEventDoc,
  RefundTier,
  TicketDiscountCode,
  TicketTier,
  TicketingConfig,
} from './festival';
import { applyFestivalRsvp, removeFestivalRsvp } from './festivalRsvp';

/** Platform seva fee on a pass, percent of the discounted price. */
export const TICKET_FEE_PCT = 5;
/** GST on the platform fee, percent — INR only (mirrors the rules). */
export const TICKET_GST_PCT = 18;
/** Household cap when a tier sets none (the TTD group law). */
export const DEFAULT_MAX_PER_BOOKING = 6;
/** The RSVP record's own party ceiling — a booking never exceeds it. */
export const MAX_BOOKING_HEADS = 20;

const DAY_MS = 86400000;

/* ------------------------------------------------------------------ */
/* The ticket record                                                   */
/* ------------------------------------------------------------------ */

export type TicketPaymentState =
  | 'paid-wallet'
  | 'pay-at-venue'
  | 'comp'
  | 'refunded'
  | 'cancelled';

export interface TicketAttendee {
  name: string;
  age?: number;
}

export interface TicketAmounts {
  /** Unit price × qty, before discount. */
  price: number;
  discount: number;
  /** Platform seva fee (recorded whoever bears it). */
  fee: number;
  /** GST on the fee (INR only; 0 otherwise). */
  gst: number;
  /** What the buyer actually pays. */
  total: number;
}

export interface EventTicket {
  id: string;
  workspaceId: string;
  /** The festival_events doc id (`${workspaceId}__${festivalKey}`). */
  festivalId: string;
  tierId: string;
  /** Tier name snapshot (English) — the tier may later be edited. */
  tierName: string;
  buyerUid: string;
  buyerName: string;
  attendees: TicketAttendee[];
  qty: number;
  amounts: TicketAmounts;
  currency: string;
  discountCode?: string;
  paymentState: TicketPaymentState;
  /** The party RSVP this purchase created (attendance passes only). */
  rsvpId?: string;
  createdAt: string;
  updatedAt?: string;
  /* Refund (one-way, auditable) */
  refundAmount?: number;
  refundedAt?: string;
  /* Pay-at-venue settlement, marked by staff at the desk */
  venueReceived?: boolean;
  receivedBy?: string;
  receivedAt?: string;
  /* Treasury posting stamp (staff) — the real transaction id */
  treasuryTxId?: string;
  treasuryPostedAt?: string;
  /* Transfer (Stage 3) */
  transferToUid?: string;
  transferToName?: string;
  transferState?: 'offered' | 'declined';
  offeredAt?: string;
  transferFromUid?: string;
  transferredAt?: string;
}

/** A live pass still holds its place (and its tier capacity). */
export function isLiveTicket(t: Pick<EventTicket, 'paymentState'>): boolean {
  return t.paymentState === 'paid-wallet' || t.paymentState === 'pay-at-venue' || t.paymentState === 'comp';
}

/** Effective sold quantity of a record — the anchoredTierCounter law. */
export function ticketEffQty(t: Pick<EventTicket, 'paymentState' | 'qty'>): number {
  return isLiveTicket(t) ? t.qty || 0 : 0;
}

/* ------------------------------------------------------------------ */
/* Discount-code lookup key (public terms, never the code)             */
/* ------------------------------------------------------------------ */

/** Codes are uppercase words: letters, digits, dash, underscore. */
export function normalizeDiscountCode(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidDiscountCode(code: string): boolean {
  return /^[A-Z0-9_-]{3,24}$/.test(code);
}

/**
 * FNV-1a (32-bit) lookup key for a code — the zoneQr family's hash.
 * The public event doc carries discount TERMS under this key so a
 * buyer can be shown the itemised quote for a code they hold,
 * without the code itself ever being published. This is a lookup
 * key, not a security boundary: the rules validate the real code
 * against the staff-side plan before any money moves.
 */
export function codeKeyFor(rawCode: string): string {
  const code = normalizeDiscountCode(rawCode);
  let h = 0x811c9dc5;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `ck_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

/* ------------------------------------------------------------------ */
/* Festival clock — one formula for client and rules                   */
/* ------------------------------------------------------------------ */

/** UTC midnight of a civil date — the stamped festival start. */
export function startMsFor(dateISO: string): number {
  const t = Date.parse(`${dateISO}T00:00:00.000Z`);
  return Number.isFinite(t) ? t : 0;
}

/** Whole days from `nowMs` until the festival start (rules formula). */
export function daysBeforeFestival(startMs: number, nowMs: number): number {
  return Math.floor((startMs - nowMs) / DAY_MS);
}

/* ------------------------------------------------------------------ */
/* Pricing — pure, and mirrored line-for-line in the rules             */
/* ------------------------------------------------------------------ */

/** The unit price right now: the early seva price inside its window. */
export function unitPriceAt(
  tier: Pick<TicketTier, 'price' | 'earlyBird'>,
  nowMs: number
): { unit: number; earlyBirdApplied: boolean } {
  if (tier.earlyBird && Number.isFinite(tier.earlyBird.price)) {
    const untilMs = startMsFor(tier.earlyBird.untilDate) + DAY_MS - 1;
    if (nowMs <= untilMs) return { unit: Math.max(0, Math.round(tier.earlyBird.price)), earlyBirdApplied: true };
  }
  return { unit: Math.max(0, Math.round(tier.price)), earlyBirdApplied: false };
}

export interface TicketQuote extends TicketAmounts {
  unitPrice: number;
  earlyBirdApplied: boolean;
  discountApplied: boolean;
}

/**
 * The itemised quote. `codeTerms` is the entered code's terms when
 * the code is real (resolved by the caller — publicly via the event
 * doc's discountTerms, or from the config in the editor preview);
 * null when no code / an unknown code (no discount is shown for a
 * code we cannot verify — the purchase then fails honestly in the
 * rules rather than promising a discount that does not exist).
 */
export function computeQuote(input: {
  tier: TicketTier;
  qty: number;
  codeTerms?: { kind: 'flat' | 'percent' | 'full'; value: number } | null;
  feeBearer: 'organiser' | 'buyer';
  currency: string;
  nowMs: number;
}): TicketQuote {
  const qty = Math.max(0, Math.floor(input.qty || 0));
  const { unit, earlyBirdApplied } = unitPriceAt(input.tier, input.nowMs);
  const price = unit * qty;
  let discount = 0;
  const ct = input.codeTerms;
  if (ct && price > 0) {
    if (ct.kind === 'flat') discount = Math.min(Math.max(0, ct.value), price);
    else if (ct.kind === 'percent') discount = Math.floor((price * Math.min(100, Math.max(0, ct.value))) / 100);
    else if (ct.kind === 'full') discount = price;
  }
  const feeBase = price - discount;
  const fee = Math.floor((feeBase * TICKET_FEE_PCT) / 100);
  const gst = input.currency === 'INR' ? Math.floor((fee * TICKET_GST_PCT) / 100) : 0;
  const total = feeBase + (input.feeBearer === 'buyer' ? fee + gst : 0);
  return {
    unitPrice: unit,
    earlyBirdApplied,
    discountApplied: discount > 0,
    price,
    discount,
    fee,
    gst,
    total,
  };
}

/** Passes remaining for a tier (Infinity when unmetered). */
export function tierRemaining(
  tier: Pick<TicketTier, 'capacity'>,
  sold: Record<string, number> | undefined,
  tierId: string
): number {
  if (!tier || tier.capacity === undefined || tier.capacity === null) return Number.POSITIVE_INFINITY;
  return Math.max(0, tier.capacity - (sold?.[tierId] || 0));
}

/* ------------------------------------------------------------------ */
/* Refunds — the published ladder                                      */
/* ------------------------------------------------------------------ */

/**
 * Percent back for cancelling `daysBefore` whole days ahead.
 * The ladder is walked highest-threshold first; below every rung,
 * the last (0-day) row speaks. An organiser-cancelled festival
 * returns everything — 100%, fee included (the BookMyShow law).
 */
export function refundPercentFor(
  ladder: readonly RefundTier[] | undefined,
  daysBefore: number,
  festivalCancelled?: boolean
): number {
  if (festivalCancelled) return 100;
  if (!ladder || ladder.length === 0) return 0;
  const sorted = [...ladder].sort((a, b) => b.minDaysBefore - a.minDaysBefore);
  for (const rung of sorted) {
    if (daysBefore >= rung.minDaysBefore) return Math.min(100, Math.max(0, rung.percent));
  }
  const last = sorted[sorted.length - 1];
  return Math.min(100, Math.max(0, last.percent));
}

/** Whole-unit refund for a ticket at a ladder percent (floored —
 *  the same floor the rules apply, so client and rules agree). */
export function refundAmountFor(amounts: Pick<TicketAmounts, 'total'>, pct: number): number {
  return Math.floor(((amounts.total || 0) * Math.min(100, Math.max(0, pct))) / 100);
}

/* ------------------------------------------------------------------ */
/* Ticketing config derivation (editor → rules-validation maps)        */
/* ------------------------------------------------------------------ */

export interface TicketingEditorShape {
  tiers: TicketTier[];
  discountCodes: TicketDiscountCode[];
  refundPolicy: RefundTier[];
  feeBearer: 'organiser' | 'buyer';
  festivalCancelled?: boolean;
}

/**
 * Build the full TicketingConfig from what the trustee edited:
 * validation maps as the rules need them (maps, never list searches)
 * and the refund ladder sorted with a guaranteed 0-day floor row.
 * `prevUses` carries the live discount-use counts forward — a config
 * save must never rewind them.
 */
export function deriveTicketingConfig(
  editor: TicketingEditorShape,
  prevUses: Record<string, number> | undefined,
  dateISO: string,
  endDateISO: string
): TicketingConfig {
  const tierPrices: Record<string, number> = {};
  const tierEarly: TicketingConfig['tierEarly'] = {};
  const tierMax: Record<string, number> = {};
  const tierKinds: TicketingConfig['tierKinds'] = {};
  for (const tier of editor.tiers) {
    tierPrices[tier.id] = Math.max(0, Math.round(tier.price || 0));
    tierKinds[tier.id] = tier.kind;
    tierMax[tier.id] = Math.min(
      MAX_BOOKING_HEADS,
      Math.max(1, Math.floor(tier.maxPerBooking || DEFAULT_MAX_PER_BOOKING))
    );
    if (tier.earlyBird && tier.kind !== 'free') {
      tierEarly[tier.id] = {
        price: Math.max(0, Math.round(tier.earlyBird.price || 0)),
        // The early price holds through the END of its stated date.
        untilMs: startMsFor(tier.earlyBird.untilDate) + DAY_MS - 1,
      };
    }
  }
  const codeMap: TicketingConfig['codeMap'] = {};
  for (const c of editor.discountCodes) {
    const code = normalizeDiscountCode(c.code);
    if (!isValidDiscountCode(code)) continue;
    codeMap[code] = {
      kind: c.kind,
      value: Math.max(0, Math.round(c.value || 0)),
      ...(c.maxUses && c.maxUses > 0 ? { maxUses: Math.floor(c.maxUses) } : {}),
    };
  }
  const ladder = [...editor.refundPolicy]
    .map((r) => ({
      minDaysBefore: Math.max(0, Math.floor(r.minDaysBefore || 0)),
      percent: Math.min(100, Math.max(0, Math.round(r.percent || 0))),
    }))
    .sort((a, b) => b.minDaysBefore - a.minDaysBefore);
  if (ladder.length === 0 || ladder[ladder.length - 1].minDaysBefore !== 0) {
    ladder.push({ minDaysBefore: 0, percent: 0 });
  }
  return {
    tiers: editor.tiers,
    discountCodes: editor.discountCodes,
    refundPolicy: editor.refundPolicy,
    feeBearer: editor.feeBearer,
    ...(editor.festivalCancelled ? { festivalCancelled: true } : {}),
    tierPrices,
    tierEarly,
    tierMax,
    tierKinds,
    codeMap,
    refundLadder: ladder.slice(0, 5),
    discountUses: { ...(prevUses || {}) },
    startMs: startMsFor(dateISO),
    endMs: startMsFor(endDateISO || dateISO) + DAY_MS - 1,
  };
}

/** Editor-side validation; returns a short reason key or null. */
export function validateTicketing(editor: TicketingEditorShape): string | null {
  const ids = new Set<string>();
  for (const tier of editor.tiers) {
    if (!tier.id || ids.has(tier.id)) return 'tier-id';
    ids.add(tier.id);
    if (!tier.name?.en?.trim()) return 'tier-name';
    if (tier.kind !== 'free' && (!Number.isFinite(tier.price) || tier.price <= 0)) return 'tier-price';
    if (tier.kind === 'free' && tier.price !== 0) return 'tier-price';
    if (tier.capacity !== undefined && (!Number.isFinite(tier.capacity) || tier.capacity < 1)) return 'tier-capacity';
    if (tier.earlyBird) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tier.earlyBird.untilDate)) return 'tier-early-date';
      if (!Number.isFinite(tier.earlyBird.price) || tier.earlyBird.price < 0) return 'tier-early-price';
    }
  }
  const codes = new Set<string>();
  for (const c of editor.discountCodes) {
    const code = normalizeDiscountCode(c.code);
    if (!isValidDiscountCode(code) || codes.has(code)) return 'code-shape';
    codes.add(code);
    if (c.kind === 'percent' && (c.value < 1 || c.value > 100)) return 'code-value';
    if (c.kind === 'flat' && c.value <= 0) return 'code-value';
  }
  for (const r of editor.refundPolicy) {
    if (!Number.isFinite(r.minDaysBefore) || r.minDaysBefore < 0) return 'refund-days';
    if (!Number.isFinite(r.percent) || r.percent < 0 || r.percent > 100) return 'refund-pct';
  }
  return null;
}

/** Public-safe stamps for the event doc, from a config. */
export function publicTicketStamps(cfg: TicketingConfig): {
  ticketTiers: TicketTier[];
  tierCaps: Record<string, number>;
  ticketFeeBearer: 'organiser' | 'buyer';
  refundPolicy: RefundTier[];
  discountTerms: NonNullable<FestivalEventDoc['discountTerms']>;
  festivalCancelled: boolean;
} {
  const tierCaps: Record<string, number> = {};
  for (const tier of cfg.tiers) {
    if (tier.capacity !== undefined && tier.capacity !== null) tierCaps[tier.id] = Math.floor(tier.capacity);
  }
  const discountTerms: NonNullable<FestivalEventDoc['discountTerms']> = {};
  for (const c of cfg.discountCodes) {
    discountTerms[codeKeyFor(c.code)] = { kind: c.kind, value: c.value };
  }
  return {
    ticketTiers: cfg.tiers,
    tierCaps,
    ticketFeeBearer: cfg.feeBearer,
    refundPolicy: cfg.refundPolicy,
    discountTerms,
    festivalCancelled: cfg.festivalCancelled === true,
  };
}

/* ------------------------------------------------------------------ */
/* Transfer (Stage 3) — pure checks                                    */
/* ------------------------------------------------------------------ */

/**
 * A transfer may be accepted while the offer stands and the festival
 * has not begun (the cutoff is the festival's first moment — after
 * that, passes belong to the day, not to the market).
 */
export function canAcceptTransfer(
  t: Pick<EventTicket, 'paymentState' | 'transferState' | 'transferToUid'>,
  myUid: string,
  nowMs: number,
  startMs: number
): boolean {
  return (
    isLiveTicket(t) &&
    t.transferState === 'offered' &&
    !!t.transferToUid &&
    t.transferToUid === myUid &&
    nowMs < startMs
  );
}

/* ------------------------------------------------------------------ */
/* The ticket document (pure builder — linkage shape lives here)       */
/* ------------------------------------------------------------------ */

export function buildTicketDoc(input: {
  id: string;
  event: Pick<FestivalEventDoc, 'id' | 'workspaceId'>;
  tier: TicketTier;
  buyerUid: string;
  buyerName: string;
  attendees: TicketAttendee[];
  qty: number;
  amounts: TicketAmounts;
  currency: string;
  discountCode?: string;
  paymentState: TicketPaymentState;
  nowIso: string;
}): EventTicket {
  const isAttendance = input.tier.kind !== 'addon';
  return {
    id: input.id,
    workspaceId: input.event.workspaceId,
    festivalId: input.event.id,
    tierId: input.tier.id,
    tierName: input.tier.name.en,
    buyerUid: input.buyerUid,
    buyerName: input.buyerName,
    attendees: input.attendees,
    qty: input.qty,
    amounts: input.amounts,
    currency: input.currency,
    ...(input.discountCode ? { discountCode: normalizeDiscountCode(input.discountCode) } : {}),
    paymentState: input.paymentState,
    // THE LINKAGE: an attendance pass's party record is the buyer's
    // own RSVP doc — the id the whole anchored system already knows.
    ...(isAttendance ? { rsvpId: `${input.event.id}__${input.buyerUid}` } : {}),
    createdAt: input.nowIso,
  };
}

/* ------------------------------------------------------------------ */
/* Firestore operations                                                */
/* ------------------------------------------------------------------ */

export interface PurchaseInput {
  event: FestivalEventDoc;
  tier: TicketTier;
  buyerUid: string;
  buyerName: string;
  attendees: TicketAttendee[];
  /** Add-ons: the chosen count. Attendance: attendees.length rules. */
  qty: number;
  /** The raw code the buyer typed ('' = none). */
  discountCode?: string;
  payWith: 'wallet' | 'venue';
  currency: string;
  nowMs: number;
}

/**
 * Buy a seva pass. Two commits, each atomic:
 *  1. attendance passes first lay the party RSVP through the anchored
 *     festivalRsvp transaction (counters + capacity law unchanged);
 *  2. one batch: the ticket record + the tierSold anchor move + the
 *     wallet debit (rules-pinned via lastDebitTicketId) + the spend
 *     ledger line + the discount-use increment.
 * If the batch fails, the RSVP is rolled back (best effort) so a
 * devotee never holds a confirmed place they did not pay for.
 */
export async function purchaseTicket(db: Firestore, input: PurchaseInput): Promise<EventTicket> {
  const { event, tier } = input;
  const isAttendance = tier.kind !== 'addon';
  const qty = isAttendance ? input.attendees.length : Math.max(1, Math.floor(input.qty || 1));
  const code = normalizeDiscountCode(input.discountCode || '');
  const codeTerms = code
    ? event.discountTerms?.[codeKeyFor(code)] || null
    : null;
  if (code && !codeTerms) throw new Error('code-invalid');
  const quote = computeQuote({
    tier,
    qty,
    codeTerms,
    feeBearer: event.ticketFeeBearer || 'organiser',
    currency: input.currency,
    nowMs: input.nowMs,
  });
  const paymentState: TicketPaymentState =
    quote.total <= 0 ? 'comp' : input.payWith === 'wallet' ? 'paid-wallet' : 'pay-at-venue';

  const ticketRef = doc(collection(db, 'event_tickets'));
  const ticket = buildTicketDoc({
    id: ticketRef.id,
    event,
    tier,
    buyerUid: input.buyerUid,
    buyerName: input.buyerName,
    attendees: isAttendance ? input.attendees : [],
    qty,
    amounts: {
      price: quote.price,
      discount: quote.discount,
      fee: quote.fee,
      gst: quote.gst,
      total: quote.total,
    },
    currency: input.currency,
    ...(code ? { discountCode: code } : {}),
    paymentState,
    nowIso: new Date(input.nowMs).toISOString(),
  });

  // Wallet readiness is checked BEFORE the RSVP is laid, so an
  // insufficient balance fails the purchase with nothing written.
  // The wallet's currency must be the pass currency — a debit in
  // mixed currencies would silently move the wrong money.
  let wallet: { balance: number; totalSpent: number } | null = null;
  if (paymentState === 'paid-wallet') {
    const wSnap = await getDoc(doc(db, 'wallets', input.buyerUid));
    const w = wSnap.exists() ? (wSnap.data() as { balance?: number; totalSpent?: number; currency?: string }) : null;
    if (w?.currency && w.currency !== input.currency) throw new Error('currency-mismatch');
    wallet = { balance: Number(w?.balance || 0), totalSpent: Number(w?.totalSpent || 0) };
    if (wallet.balance < quote.total) throw new Error('insufficient-balance');
  }

  if (isAttendance) {
    await applyFestivalRsvp(db, {
      eventId: event.id,
      workspaceId: event.workspaceId,
      uid: input.buyerUid,
      name: input.attendees[0]?.name || input.buyerName,
      headcount: qty,
      ticketId: ticket.id,
    });
  }

  try {
    const batch = writeBatch(db);
    const ticketData: Record<string, unknown> = { ...ticket };
    delete ticketData.id; // the doc id carries it — never a field
    batch.set(ticketRef, ticketData);
    if (paymentState === 'paid-wallet' && wallet) {
      batch.update(doc(db, 'wallets', input.buyerUid), {
        balance: wallet.balance - quote.total,
        totalSpent: wallet.totalSpent + quote.total,
        lastDebitTicketId: ticket.id,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, 'walletTransactions')), {
        uid: input.buyerUid,
        type: 'spend',
        amount: quote.total,
        currency: input.currency,
        orderId: ticket.id,
        note: `Seva pass — ${tier.name.en} (${event.name.en})`,
        createdAt: serverTimestamp(),
      });
    }
    const tierSold = { ...(event.tierSold || {}) };
    tierSold[tier.id] = (tierSold[tier.id] || 0) + qty;
    batch.update(doc(db, 'festival_events', event.id), {
      tierSold,
      tierAnchorTicketId: ticket.id,
      updatedAt: serverTimestamp(),
    });
    if (code) {
      // Anchored increment: the rules resolve the resulting plan
      // state and verify exactly this code rose by one, under its cap.
      batch.update(
        doc(db, 'festival_plans', event.id),
        `ticketing.discountUses.${code}`,
        increment(1)
      );
    }
    await batch.commit();
  } catch (e) {
    if (isAttendance) {
      await removeFestivalRsvp(db, { eventId: event.id, uid: input.buyerUid }).catch(() => undefined);
    }
    throw e;
  }
  return ticket;
}

export interface CancelOutcome {
  newState: TicketPaymentState;
  refundAmount: number;
  pct: number;
}

/**
 * Buyer cancellation (Stage 2). Wallet passes refund by the
 * published ladder into the buyer's own wallet (rules-pinned via
 * lastRefundTicketId); venue passes simply release their place —
 * if the desk already took the money, the ticket lands 'cancelled'
 * with venueReceived still set, which the organiser list reads as
 * "cash refund due at desk" until staff mark it refunded.
 */
export async function cancelTicket(
  db: Firestore,
  input: { ticket: EventTicket; event: FestivalEventDoc; nowMs: number }
): Promise<CancelOutcome> {
  const { ticket, event } = input;
  if (!isLiveTicket(ticket)) throw new Error('not-live');
  const pct = refundPercentFor(
    event.refundPolicy,
    daysBeforeFestival(startMsFor(event.dateISO), input.nowMs),
    event.festivalCancelled === true
  );
  const refundAmount =
    ticket.paymentState === 'paid-wallet' ? refundAmountFor(ticket.amounts, pct) : 0;
  const newState: TicketPaymentState = refundAmount > 0 ? 'refunded' : 'cancelled';
  const nowIso = new Date(input.nowMs).toISOString();

  if (ticket.rsvpId) {
    await removeFestivalRsvp(db, { eventId: ticket.festivalId, uid: ticket.buyerUid }).catch(() => undefined);
  }

  let wallet: { balance: number; totalReceived: number } | null = null;
  if (refundAmount > 0) {
    const wSnap = await getDoc(doc(db, 'wallets', ticket.buyerUid));
    const w = wSnap.exists() ? (wSnap.data() as { balance?: number; totalReceived?: number }) : null;
    wallet = { balance: Number(w?.balance || 0), totalReceived: Number(w?.totalReceived || 0) };
  }

  const batch = writeBatch(db);
  batch.update(doc(db, 'event_tickets', ticket.id), {
    paymentState: newState,
    ...(refundAmount > 0 ? { refundAmount, refundedAt: nowIso } : {}),
    updatedAt: nowIso,
  });
  const tierSold = { ...(event.tierSold || {}) };
  tierSold[ticket.tierId] = Math.max(0, (tierSold[ticket.tierId] || 0) - (ticket.qty || 0));
  batch.update(doc(db, 'festival_events', ticket.festivalId), {
    tierSold,
    tierAnchorTicketId: ticket.id,
    updatedAt: serverTimestamp(),
  });
  if (refundAmount > 0 && wallet) {
    batch.update(doc(db, 'wallets', ticket.buyerUid), {
      balance: wallet.balance + refundAmount,
      totalReceived: wallet.totalReceived + refundAmount,
      lastRefundTicketId: ticket.id,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(collection(db, 'walletTransactions')), {
      uid: ticket.buyerUid,
      type: 'refund',
      amount: refundAmount,
      currency: ticket.currency,
      orderId: ticket.id,
      note: `Seva pass refund — ${ticket.tierName}`,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return { newState, refundAmount, pct };
}

/* ------------------------- transfer ------------------------- */

/** Find a devotee by SAN ID (SAN-XXXXXX) or spoken VDA alias. */
export async function lookupDevoteeForTransfer(
  db: Firestore,
  raw: string
): Promise<{ uid: string; displayName: string; sanId: string } | null> {
  const q = (raw || '').trim();
  if (!q) return null;
  let uid = '';
  if (q.includes('@')) {
    const aliasSnap = await getDoc(doc(db, 'vdaAliases', q.toLowerCase()));
    if (!aliasSnap.exists()) return null;
    uid = String((aliasSnap.data() as { uid?: string }).uid || '');
  } else {
    const snap = await getDocs(
      query(collection(db, 'sanataniProfiles'), where('id', '==', q.toUpperCase()), limit(1))
    );
    if (snap.empty) return null;
    uid = snap.docs[0].id;
    const d = snap.docs[0].data() as { displayName?: string; id?: string };
    return { uid, displayName: d.displayName || '', sanId: d.id || q.toUpperCase() };
  }
  if (!uid) return null;
  const prof = await getDoc(doc(db, 'sanataniProfiles', uid));
  if (!prof.exists()) return null;
  const d = prof.data() as { displayName?: string; id?: string };
  return { uid, displayName: d.displayName || '', sanId: d.id || '' };
}

export async function offerTransfer(
  db: Firestore,
  ticketId: string,
  to: { uid: string; displayName: string },
  nowMs: number
): Promise<void> {
  await updateDoc(doc(db, 'event_tickets', ticketId), {
    transferToUid: to.uid,
    transferToName: to.displayName,
    transferState: 'offered',
    offeredAt: new Date(nowMs).toISOString(),
    updatedAt: new Date(nowMs).toISOString(),
  });
}

export async function withdrawTransfer(db: Firestore, ticketId: string, nowMs: number): Promise<void> {
  await updateDoc(doc(db, 'event_tickets', ticketId), {
    transferToUid: deleteField(),
    transferToName: deleteField(),
    transferState: deleteField(),
    offeredAt: deleteField(),
    updatedAt: new Date(nowMs).toISOString(),
  });
}

export async function declineTransfer(db: Firestore, ticketId: string, nowMs: number): Promise<void> {
  await updateDoc(doc(db, 'event_tickets', ticketId), {
    transferState: 'declined',
    updatedAt: new Date(nowMs).toISOString(),
  });
}

/**
 * Accept a transferred pass (Stage 3). One transaction: the ticket
 * rebinds to me, my party RSVP is created (attendance passes), and
 * the giver's RSVP — the one this ticket created — is deleted. The
 * public counters never move: the same party attends, under a new
 * name. The E3 gate pass follows automatically, because it binds
 * the RSVP record, and the record is now mine.
 */
export async function acceptTransfer(
  db: Firestore,
  input: { ticket: EventTicket; myUid: string; myName: string; nowMs: number; festivalStartMs: number }
): Promise<void> {
  const { ticket, myUid, myName } = input;
  if (!canAcceptTransfer(ticket, myUid, input.nowMs, input.festivalStartMs)) {
    throw new Error('transfer-not-acceptable');
  }
  const ticketRef = doc(db, 'event_tickets', ticket.id);
  const nowIso = new Date(input.nowMs).toISOString();
  await runTransaction(db, async (tx) => {
    // Reads before writes (the transaction law): the ticket, then —
    // for attendance passes — my own RSVP slot, whose existence
    // would mean I already hold a place for this festival.
    const snap = await tx.get(ticketRef);
    if (!snap.exists()) throw new Error('transfer-not-acceptable');
    const fresh = { id: snap.id, ...(snap.data() as Omit<EventTicket, 'id'>) };
    if (!canAcceptTransfer(fresh, myUid, input.nowMs, input.festivalStartMs)) {
      throw new Error('transfer-not-acceptable');
    }
    const oldBuyer = fresh.buyerUid;
    let myRsvpRef: ReturnType<typeof doc> | null = null;
    let oldRsvpRef: ReturnType<typeof doc> | null = null;
    if (fresh.rsvpId) {
      myRsvpRef = doc(db, 'festival_rsvps', `${fresh.festivalId}__${myUid}`);
      oldRsvpRef = doc(db, 'festival_rsvps', fresh.rsvpId);
      const mine = await tx.get(myRsvpRef);
      if (mine.exists()) throw new Error('already-have-place');
    }
    tx.update(ticketRef, {
      buyerUid: myUid,
      buyerName: myName,
      transferFromUid: oldBuyer,
      transferredAt: nowIso,
      transferToUid: deleteField(),
      transferToName: deleteField(),
      transferState: deleteField(),
      offeredAt: deleteField(),
      // The stored RSVP link follows the new owner — it names the
      // recipient's own party record now, never the giver's (deleted
      // below in this same transaction).
      ...(fresh.rsvpId ? { rsvpId: `${fresh.festivalId}__${myUid}` } : {}),
      updatedAt: nowIso,
    });
    if (fresh.rsvpId && myRsvpRef && oldRsvpRef) {
      tx.set(myRsvpRef, {
        eventId: fresh.festivalId,
        workspaceId: fresh.workspaceId,
        uid: myUid,
        name: myName,
        headcount: fresh.qty,
        status: 'confirmed',
        createdAt: nowIso,
        ticketId: fresh.id,
      });
      tx.delete(oldRsvpRef);
    }
  });
}
