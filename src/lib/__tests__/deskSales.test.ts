/**
 * deskSales.test.ts — REAL-WORLD PACK pure-logic pins.
 * =====================================================================
 * The desk (counter) sale plan: the synthetic desk identity, the
 * quote (the same computeQuote the devotee checkout uses), the
 * born-received venue stamp, and — critically — the exact field
 * shapes firestore.rules pins for a desk create (tkDeskCreateOk's
 * key set, festRsvpShapeOk's key set). If a field is added or
 * renamed here, the rules' hasOnly sets must change with it.
 */
import { planDeskSale, deskUidFor, type DeskSaleInput } from '../deskSales';
import { startMsFor } from '../eventTickets';
import type { FestivalEventDoc, TicketTier } from '../festival';

const tier = (patch: Partial<TicketTier> = {}): TicketTier => ({
  id: 't1',
  name: { en: 'Cultural evening pass', bn: 'সাংস্কৃতিক সন্ধ্যা পাস', hi: 'सांस्कृतिक संध्या पास' },
  kind: 'paid',
  price: 500,
  ...patch,
});

const ev = (over: Partial<FestivalEventDoc> = {}): FestivalEventDoc =>
  ({
    id: 'ws1__fest1',
    workspaceId: 'ws1',
    ticketFeeBearer: 'organiser',
    tierSold: { t1: 3 },
    rsvpHeadcount: 10,
    ...over,
  }) as FestivalEventDoc;

const input = (patch: Partial<DeskSaleInput> = {}): DeskSaleInput => ({
  event: ev(),
  tier: tier(),
  buyerName: 'Ramesh Chandra Pal',
  attendees: [{ name: 'Ramesh Chandra Pal' }, { name: 'Mina Pal' }],
  qty: 2,
  staffUid: 'staff-1',
  staffName: 'Desk Sevadar',
  currency: 'INR',
  nowMs: startMsFor('2026-01-01'),
  ...patch,
});

describe('deskUidFor — the synthetic desk identity', () => {
  it('derives from the ticket id alone', () => {
    expect(deskUidFor('tk-9')).toBe('desk_tk-9');
  });
});

describe('planDeskSale — a paid attendance sale', () => {
  const plan = planDeskSale(input(), 'tk-9');

  it('owns the ticket by the desk identity, attributed to the staff member', () => {
    expect(plan.deskUid).toBe('desk_tk-9');
    expect(plan.ticket.buyerUid).toBe('desk_tk-9');
    expect(plan.ticket.deskSale).toBe(true);
    expect(plan.ticket.recordedBy).toBe('staff-1');
    expect(plan.ticket.buyerName).toBe('Ramesh Chandra Pal');
  });

  it('recomputes the devotee quote (organiser bears the fee)', () => {
    expect(plan.ticket.amounts).toEqual({ price: 1000, discount: 0, fee: 50, gst: 9, total: 1000 });
    expect(plan.ticket.paymentState).toBe('pay-at-venue');
  });

  it('is born received at the desk — the mark-received fields, from birth', () => {
    expect(plan.ticket.venueReceived).toBe(true);
    expect(plan.ticket.receivedBy).toBe('Desk Sevadar');
    expect(plan.ticket.receivedAt).toBe(new Date(startMsFor('2026-01-01')).toISOString());
  });

  it('never carries a discount code', () => {
    expect('discountCode' in plan.ticket).toBe(false);
    expect(plan.ticket.amounts.discount).toBe(0);
  });

  it('writes exactly the field set the rules pin for a desk create', () => {
    const keys = Object.keys(plan.ticket).filter((k) => k !== 'id').sort();
    expect(keys).toEqual([
      'amounts', 'attendees', 'buyerName', 'buyerUid', 'createdAt', 'currency',
      'deskSale', 'festivalId', 'paymentState', 'qty', 'receivedAt', 'receivedBy',
      'recordedBy', 'rsvpId', 'tierId', 'tierName', 'venueReceived', 'workspaceId',
    ]);
  });

  it('lays the party RSVP under the desk identity, in the rules’ pinned shape', () => {
    expect(plan.rsvpId).toBe('ws1__fest1__desk_tk-9');
    expect(plan.ticket.rsvpId).toBe(plan.rsvpId);
    expect(plan.rsvp).toEqual({
      eventId: 'ws1__fest1',
      workspaceId: 'ws1',
      uid: 'desk_tk-9',
      name: 'Ramesh Chandra Pal',
      headcount: 2,
      status: 'confirmed',
      createdAt: new Date(startMsFor('2026-01-01')).toISOString(),
      ticketId: 'tk-9',
    });
  });

  it('moves both anchors by the sale’s qty', () => {
    expect(plan.tierSold).toEqual({ t1: 5 });
    expect(plan.rsvpHeadcount).toBe(12);
  });
});

describe('planDeskSale — a blessed (free) sale', () => {
  const plan = planDeskSale(input({ tier: tier({ kind: 'free', price: 0 }) }), 'tk-free');

  it('is comp, with no money-received stamp', () => {
    expect(plan.ticket.paymentState).toBe('comp');
    expect(plan.ticket.amounts.total).toBe(0);
    expect('venueReceived' in plan.ticket).toBe(false);
    expect('receivedBy' in plan.ticket).toBe(false);
    expect('receivedAt' in plan.ticket).toBe(false);
  });

  it('still lays the party RSVP — the gate list is for every party', () => {
    expect(plan.rsvp).not.toBeNull();
    expect(plan.rsvpHeadcount).toBe(12);
  });
});

describe('planDeskSale — an add-on sale', () => {
  const plan = planDeskSale(
    input({ tier: tier({ kind: 'addon', price: 100 }), attendees: [], qty: 3 }),
    'tk-addon'
  );

  it('carries no RSVP and no headcount move', () => {
    expect(plan.rsvp).toBeNull();
    expect(plan.rsvpId).toBeNull();
    expect('rsvpId' in plan.ticket).toBe(false);
    expect(plan.ticket.qty).toBe(3);
    expect(plan.rsvpHeadcount).toBe(10);
  });

  it('still moves tierSold and is born received', () => {
    expect(plan.tierSold).toEqual({ t1: 6 });
    expect(plan.ticket.paymentState).toBe('pay-at-venue');
    expect(plan.ticket.venueReceived).toBe(true);
  });
});
