/**
 * ticketDipNotify.test.ts — NOTIFICATION WAVE 1 pure-logic pins.
 * =====================================================================
 * The state-ledger discipline for my tickets and my e-dip results:
 * a record first seen in a settled status is news (a result rings
 * once even if the desk showed it first), a status CHANGE is news,
 * the same status again is silence. Desk (counter) sales never
 * belong to an account and never ring.
 */
import {
  dipDedupeKey,
  dipNoticeStatus,
  pickDipNotices,
  pickTicketNotices,
  ticketDedupeKey,
  ticketNoticeStatus,
} from '../ticketDipNotify';
import type { EventTicket } from '../eventTickets';
import type { DipEntry } from '../eventDip';

function ticket(partial: Partial<EventTicket> & { id: string }): EventTicket {
  const baseTicket: EventTicket = {
    id: partial.id,
    workspaceId: 'ws1',
    festivalId: 'ws1__fest1',
    tierId: 'tier1',
    tierName: 'General darshan',
    buyerUid: 'me',
    buyerName: 'Me',
    attendees: [],
    qty: 1,
    amounts: { price: 0, discount: 0, fee: 0, gst: 0, total: 0 },
    currency: 'INR',
    paymentState: 'paid-wallet',
    createdAt: '2026-11-24T00:00:00.000Z',
  };
  return Object.assign(baseTicket, partial);
}

function entry(partial: Partial<DipEntry> & { id: string }): DipEntry {
  return {
    festivalId: 'ws1__fest1',
    tierId: 'tier1',
    workspaceId: 'ws1',
    uid: 'me',
    buyerName: 'Me',
    attendees: [],
    heads: 1,
    status: 'entered',
    createdAt: 1,
    ...partial,
  };
}

describe('status mappings', () => {
  it('ticket payment states speak purchased / cancelled / refunded', () => {
    expect(ticketNoticeStatus('paid-wallet')).toBe('purchased');
    expect(ticketNoticeStatus('pay-at-venue')).toBe('purchased');
    expect(ticketNoticeStatus('comp')).toBe('purchased');
    expect(ticketNoticeStatus('cancelled')).toBe('cancelled');
    expect(ticketNoticeStatus('refunded')).toBe('refunded');
    expect(ticketNoticeStatus('something-else')).toBeNull();
    expect(ticketNoticeStatus(undefined)).toBeNull();
  });

  it('dip statuses speak results only — entered is silence', () => {
    expect(dipNoticeStatus('selected')).toBe('selected');
    expect(dipNoticeStatus('waitlisted')).toBe('waitlisted');
    expect(dipNoticeStatus('lapsed')).toBe('lapsed');
    expect(dipNoticeStatus('claimed')).toBe('claimed');
    expect(dipNoticeStatus('entered')).toBeNull();
  });

  it('dedupe keys carry the design shapes', () => {
    expect(ticketDedupeKey('t1', 'refunded')).toBe('ticket:t1:refunded');
    expect(dipDedupeKey('e1', 'selected')).toBe('dip:e1:selected');
  });
});

describe('pickTicketNotices', () => {
  it('a ticket first seen paid is purchased news', () => {
    const { notices, settled } = pickTicketNotices([ticket({ id: 't1' })], {});
    expect(notices).toHaveLength(1);
    expect(notices[0].status).toBe('purchased');
    expect(notices[0].dedupeKey).toBe('ticket:t1:purchased');
    expect(settled).toEqual({ t1: 'paid-wallet' });
  });

  it('the same state again is silence', () => {
    const { notices } = pickTicketNotices([ticket({ id: 't1' })], { t1: 'paid-wallet' });
    expect(notices).toHaveLength(0);
  });

  it('a refund after purchase is refund news (the buyer hears it without opening the desk)', () => {
    const { notices } = pickTicketNotices(
      [ticket({ id: 't1', paymentState: 'refunded' })],
      { t1: 'paid-wallet' },
    );
    expect(notices).toHaveLength(1);
    expect(notices[0].status).toBe('refunded');
    expect(notices[0].dedupeKey).toBe('ticket:t1:refunded');
  });

  it('a ticket first seen already refunded rings the refund, not a phantom purchase', () => {
    const { notices } = pickTicketNotices([ticket({ id: 't1', paymentState: 'refunded' })], {});
    expect(notices.map((n) => n.status)).toEqual(['refunded']);
  });

  it('desk-sale tickets never ring', () => {
    const { notices, settled } = pickTicketNotices(
      [ticket({ id: 't9', deskSale: true })],
      {},
    );
    expect(notices).toHaveLength(0);
    expect(settled).toEqual({});
  });
});

describe('pickDipNotices', () => {
  it('an entered entry is not a result — silence, nothing settled', () => {
    const { notices, settled } = pickDipNotices([entry({ id: 'e1' })], {});
    expect(notices).toHaveLength(0);
    expect(settled).toEqual({});
  });

  it('a selection first seen after the draw rings once', () => {
    const { notices, settled } = pickDipNotices([entry({ id: 'e1', status: 'selected' })], {});
    expect(notices).toHaveLength(1);
    expect(notices[0].status).toBe('selected');
    expect(notices[0].dedupeKey).toBe('dip:e1:selected');
    expect(settled).toEqual({ e1: 'selected' });
  });

  it('waitlisted → selected is news; selected → selected is silence', () => {
    const moved = pickDipNotices([entry({ id: 'e1', status: 'selected' })], { e1: 'waitlisted' });
    expect(moved.notices).toHaveLength(1);
    const still = pickDipNotices([entry({ id: 'e1', status: 'selected' })], { e1: 'selected' });
    expect(still.notices).toHaveLength(0);
  });

  it('a lapsed claim rings lapsed', () => {
    const { notices } = pickDipNotices([entry({ id: 'e1', status: 'lapsed' })], { e1: 'selected' });
    expect(notices.map((n) => n.status)).toEqual(['lapsed']);
  });
});
