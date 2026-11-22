/**
 * deskSales.ts — REAL-WORLD PACK: counter (desk) sales.
 * =====================================================================
 * A walk-in at the festival desk may hold no account at all — cash
 * in hand, perhaps no phone. Staff sell them a seva pass here, and
 * the sale is a FIRST-CLASS record, not a side note: the same
 * event_tickets ledger, the same tierSold anchor, the same party
 * festival_rsvps record the gate admits from (found by NAME SEARCH
 * — a phoneless walk-in has no pass card, and none is faked).
 *
 * THE IDENTITY MODEL (the honest answer to "who is the buyer?"):
 * the ticket is owned by a synthetic desk identity derived from
 * the sale itself — buyerUid 'desk_' + ticketId. It is not a
 * login: no auth account carries it, and no rules clause lets it
 * act. The human accountability sits beside it on the same record:
 * deskSale: true and recordedBy: <the staff member's uid>. The
 * party RSVP lives under the same identity
 * (festival_rsvps/{eventId}__desk_{ticketId}), so the anchored
 * counters, the gate register and the debrief all see one party.
 *
 * THE MONEY LAW, unchanged: the quote is computed by the same
 * computeQuote the devotee checkout uses, and firestore.rules
 * recomputes it again (tkAmountsOk) before accepting the record.
 * A desk sale is FULL payment at the desk: the recorded total is
 * the amount received (venueReceived from birth, receivedBy the
 * staff member's name — the exact fields the panel's "mark
 * received" writes for a devotee's venue pass). A part-payment is
 * not a desk sale; it stays on the devotee pay-at-venue path.
 * States are 'pay-at-venue' (money) or 'comp' (blessed free) —
 * never 'paid-wallet': a desk identity holds no wallet. Discount
 * codes are refused: the rules' discount anchor can only witness
 * a real buyer, so codes stay a devotee-channel feature.
 *
 * ONE BATCH, ALL OR NOTHING: the ticket, the party RSVP, the
 * headcount anchor (rsvpAnchorUid — the desk twin of
 * tierAnchorTicketId) and the tierSold anchor commit together or
 * not at all. There is no rollback path because there is no
 * second commit. The anchors make the batch fail closed: if the
 * event doc moved since the panel read it, the rules' arithmetic
 * no longer matches and the whole sale is refused, loudly.
 */
import {
  collection, doc, serverTimestamp, writeBatch, type Firestore,
} from 'firebase/firestore';
import type { FestivalEventDoc, TicketTier } from './festival';
import {
  buildTicketDoc, computeQuote, passesOpen,
  type EventTicket, type TicketAttendee,
} from './eventTickets';

/** The synthetic buyer identity for a desk sale's ticket id. */
export function deskUidFor(ticketId: string): string {
  return `desk_${ticketId}`;
}

export interface DeskSaleInput {
  event: FestivalEventDoc;
  tier: TicketTier;
  /** The walk-in's name — the party's name at the gate. */
  buyerName: string;
  /** Named attendees (attendance passes: exactly qty of them). */
  attendees: TicketAttendee[];
  /** Add-ons: the chosen count. Attendance: attendees.length rules. */
  qty: number;
  /** The staff member recording the sale (accountability anchor). */
  staffUid: string;
  /** The staff member's display name (the receivedBy stamp). */
  staffName: string;
  currency: string;
  nowMs: number;
}

/** The pure shape of a desk sale — everything the batch writes,
 *  computed without touching Firestore, so it can be unit-tested. */
export interface DeskSalePlan {
  ticket: EventTicket;
  deskUid: string;
  /** The party RSVP payload (attendance passes only). */
  rsvp: Record<string, unknown> | null;
  rsvpId: string | null;
  /** The event doc's next tierSold map. */
  tierSold: Record<string, number>;
  /** The event doc's next public RSVP headcount (attendance only). */
  rsvpHeadcount: number;
}

export function planDeskSale(input: DeskSaleInput, ticketId: string): DeskSalePlan {
  const { event, tier } = input;
  const isAttendance = tier.kind !== 'addon';
  const qty = isAttendance ? input.attendees.length : Math.max(1, Math.floor(input.qty || 1));
  const quote = computeQuote({
    tier,
    qty,
    codeTerms: null, // desk sales never carry a discount code
    feeBearer: event.ticketFeeBearer || 'organiser',
    currency: input.currency,
    nowMs: input.nowMs,
  });
  const deskUid = deskUidFor(ticketId);
  const nowIso = new Date(input.nowMs).toISOString();
  const base = buildTicketDoc({
    id: ticketId,
    event,
    tier,
    buyerUid: deskUid,
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
    paymentState: quote.total <= 0 ? 'comp' : 'pay-at-venue',
    nowIso,
  });
  const ticket: EventTicket = {
    ...base,
    deskSale: true,
    recordedBy: input.staffUid,
    ...(quote.total > 0
      ? { venueReceived: true, receivedBy: input.staffName || 'Desk', receivedAt: nowIso }
      : {}),
  };
  const rsvp: Record<string, unknown> | null = isAttendance
    ? {
        eventId: event.id,
        workspaceId: event.workspaceId,
        uid: deskUid,
        name: input.attendees[0]?.name || input.buyerName,
        headcount: qty,
        status: 'confirmed',
        createdAt: nowIso,
        ticketId,
      }
    : null;
  const tierSold = { ...(event.tierSold || {}) };
  tierSold[tier.id] = (tierSold[tier.id] || 0) + qty;
  return {
    ticket,
    deskUid,
    rsvp,
    rsvpId: isAttendance ? `${event.id}__${deskUid}` : null,
    tierSold,
    rsvpHeadcount: (event.rsvpHeadcount || 0) + (isAttendance ? qty : 0),
  };
}

/**
 * Sell a pass at the desk. One writeBatch — ticket + party RSVP +
 * both counter anchors — so a sale can never half-exist. Throws
 * 'passes-not-open' before the release moment (the rules refuse
 * it too), 'desk-sale-shape' for a form the rules would refuse.
 */
export async function sellPassAtDesk(db: Firestore, input: DeskSaleInput): Promise<EventTicket> {
  const { event, tier } = input;
  if (!passesOpen(event, input.nowMs)) throw new Error('passes-not-open');
  const isAttendance = tier.kind !== 'addon';
  if (isAttendance && input.attendees.length === 0) throw new Error('desk-sale-shape');
  if (!input.buyerName.trim() || !input.staffUid) throw new Error('desk-sale-shape');

  const ticketRef = doc(collection(db, 'event_tickets'));
  const plan = planDeskSale(input, ticketRef.id);

  const batch = writeBatch(db);
  const ticketData: Record<string, unknown> = { ...plan.ticket };
  delete ticketData.id; // the doc id carries it — never a field
  batch.set(ticketRef, ticketData);
  if (plan.rsvp && plan.rsvpId) {
    batch.set(doc(db, 'festival_rsvps', plan.rsvpId), plan.rsvp);
    batch.update(doc(db, 'festival_events', event.id), {
      rsvpHeadcount: plan.rsvpHeadcount,
      rsvpAnchorUid: plan.deskUid,
      updatedAt: serverTimestamp(),
    });
  }
  batch.update(doc(db, 'festival_events', event.id), {
    tierSold: plan.tierSold,
    tierAnchorTicketId: plan.ticket.id,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return plan.ticket;
}
