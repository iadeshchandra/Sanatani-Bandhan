/**
 * yatraFootprint.test.ts — PILGRIMAGE + MY PASSES batch.
 * =====================================================================
 * The pure shaping behind two surfaces:
 *  - the portal footprint tab (visits → log rows; only true GPS pairs
 *    may stand on the map), and
 *  - the Personal "My passes" shelf (live tickets only, upcoming
 *    first, desk-sale records never held by an account).
 * Plus the Smart Pass identity value: the shelf mints from the bare
 * Sanatani ID and the family's own verifier must accept it.
 *
 * The two jest shims are the repo's established pattern for importing
 * utils/qrUtils under ts-jest/node (see eventPass.test.ts): the
 * firebaseClient stub (it reads import.meta.env) and the crypto-js
 * default re-export. Neither touches the signing code — the tamper
 * test below fails against the genuine HMAC check.
 */
jest.mock('../../services/firebaseClient', () => ({ auth: { currentUser: null }, db: {} }));
jest.mock('crypto-js', () => {
  const actual = jest.requireActual('crypto-js');
  return { __esModule: true, default: actual, ...actual };
});

import {
  festivalStartMs,
  mappableRows,
  shapeFootprint,
  shapeHeldPasses,
  visitToFootprintRow,
  type HeldPass,
} from '../yatraFootprint';
import type { VisitEntry } from '../../tirtha/types';
import type { EventTicket } from '../eventTickets';
import type { FestivalEventDoc } from '../festival';
import { generateIdentityPassValue, verifyIdentityQRPayload } from '../../utils/qrUtils';

const visit = (over: Partial<VisitEntry>): VisitEntry => ({
  id: 'v_1',
  uid: 'u1',
  templeName: 'Kashi Vishwanath',
  visitedAt: '2026-11-20T06:00:00.000Z',
  createdAt: '2026-11-20T06:00:00.000Z',
  ...over,
});

describe('footprint shaping', () => {
  it('a GPS check-in row carries its pair and is mappable', () => {
    const row = visitToFootprintRow(visit({ lat: 25.3176, lng: 82.9739 }));
    expect(row).not.toBeNull();
    expect(row?.coords).toEqual([25.3176, 82.9739]);
    expect(row?.gps).toBe(true);
    expect(mappableRows(row ? [row] : [])).toHaveLength(1);
  });

  it('a diary visit without a pair stays in the log but off the map', () => {
    const row = visitToFootprintRow(visit({}));
    expect(row?.coords).toBeNull();
    expect(row?.gps).toBe(false);
    expect(mappableRows(row ? [row] : [])).toHaveLength(0);
  });

  it('a stored half-pair or out-of-range pair never reaches the map', () => {
    expect(visitToFootprintRow(visit({ lat: 25.3 }))?.coords).toBeNull();
    expect(visitToFootprintRow(visit({ lat: 999, lng: 0 }))?.coords).toBeNull();
  });

  it('nameless rows drop out; the log is newest first', () => {
    const rows = shapeFootprint([
      visit({ id: 'a', visitedAt: '2026-11-10T06:00:00.000Z' }),
      visit({ id: 'b', templeName: '   ' }),
      visit({ id: 'c', visitedAt: '2026-11-22T06:00:00.000Z' }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(['c', 'a']);
  });
});

const ticket = (over: Partial<EventTicket>): EventTicket => ({
  id: 't_1',
  workspaceId: 'ws1',
  festivalId: 'ws1__fest',
  tierId: 'tier1',
  tierName: 'General',
  buyerUid: 'u1',
  buyerName: 'Devotee',
  attendees: [{ name: 'Devotee' }],
  qty: 1,
  amounts: { price: 0, discount: 0, fee: 0, gst: 0, total: 0 },
  currency: 'INR',
  paymentState: 'paid-wallet',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...over,
});

const event = (over: Partial<FestivalEventDoc>): FestivalEventDoc => ({
  id: 'ws1__fest',
  workspaceId: 'ws1',
  festivalKey: 'fest',
  orgName: 'Temple',
  name: { en: 'Festival', bn: 'Festival', hi: 'Festival' },
  significance: { en: '', bn: '', hi: '' },
  dateISO: '2026-12-01',
  endDateISO: '2026-12-01',
  tithiLine: '',
  timings: [],
  story: { en: '', bn: '', hi: '' },
  rsvpEnabled: true,
  darshanSlots: [],
  published: true,
  publishedHeadcount: 0,
  slotBooked: {},
  rsvpHeadcount: 0,
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...over,
});

const TODAY = Date.parse('2026-11-26T00:00:00');

describe('held passes shaping', () => {
  it('keeps only live tickets — cancelled and refunded are not passes', () => {
    const held = shapeHeldPasses(
      [
        ticket({ id: 'live', paymentState: 'paid-wallet' }),
        ticket({ id: 'venue', paymentState: 'pay-at-venue' }),
        ticket({ id: 'comp', paymentState: 'comp' }),
        ticket({ id: 'gone', paymentState: 'cancelled' }),
        ticket({ id: 'back', paymentState: 'refunded' }),
      ],
      new Map(),
      TODAY,
    );
    expect(held.map((h) => h.ticket.id).sort()).toEqual(['comp', 'live', 'venue']);
  });

  it('desk-sale records are never an account pass', () => {
    const held = shapeHeldPasses(
      [ticket({ id: 'desk', deskSale: true }), ticket({ id: 'desk2', buyerUid: 'desk_t_9' })],
      new Map(),
      TODAY,
    );
    expect(held).toHaveLength(0);
  });

  it('orders upcoming first (soonest first), then past (newest first)', () => {
    const events = new Map<string, FestivalEventDoc>([
      ['ws1__soon', event({ id: 'ws1__soon', dateISO: '2026-11-30' })],
      ['ws1__later', event({ id: 'ws1__later', dateISO: '2026-12-25' })],
      ['ws1__past', event({ id: 'ws1__past', dateISO: '2026-11-01' })],
    ]);
    const held: HeldPass[] = shapeHeldPasses(
      [
        ticket({ id: 'later', festivalId: 'ws1__later' }),
        ticket({ id: 'past', festivalId: 'ws1__past' }),
        ticket({ id: 'soon', festivalId: 'ws1__soon' }),
        ticket({ id: 'nodate', festivalId: 'ws1__missing' }),
      ],
      events,
      TODAY,
    );
    expect(held.map((h) => h.ticket.id)).toEqual(['soon', 'later', 'nodate', 'past']);
    expect(held[3].event?.id).toBe('ws1__past');
    expect(held[2].event).toBeNull();
  });

  it('festivalStartMs accepts only real YYYY-MM-DD dates', () => {
    expect(festivalStartMs('2026-12-01')).toBe(Date.parse('2026-12-01T00:00:00'));
    expect(festivalStartMs('01-12-2026')).toBeNull();
    expect(festivalStartMs(undefined)).toBeNull();
    expect(festivalStartMs('')).toBeNull();
  });
});

describe('smart pass identity value', () => {
  it('the shelf-minted value verifies with the family verifier', () => {
    const value = generateIdentityPassValue('SAN-7K2Q9M');
    const read = verifyIdentityQRPayload(value);
    expect(read.valid).toBe(true);
    expect(read.memberId).toBe('SAN-7K2Q9M');
  });

  it('a tampered id does not verify', () => {
    const value = generateIdentityPassValue('SAN-7K2Q9M');
    const tampered = value.replace('SAN-7K2Q9M', 'SAN-XXXXXX');
    expect(verifyIdentityQRPayload(tampered).valid).toBe(false);
  });
});
