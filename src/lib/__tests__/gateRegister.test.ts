/**
 * gateRegister.test.ts — REAL-WORLD PACK pure-logic pins.
 * =====================================================================
 * The printable gate register + attendee CSV: confirmed parties
 * only (a waitlisted party holds a queue place, not a gate place),
 * the P1 day law (no day list = every day), the tier join through
 * the party's ticket, phone only when the record itself carries
 * one, and name order — the order the gate calls out.
 */
import {
  buildAttendeeCsvRows, buildGateRegisterRows, gateRegisterTotals,
  type RegisterRsvp,
} from '../gateRegister';
import type { EventTicket } from '../eventTickets';

const D1 = '2026-11-21';
const D2 = '2026-11-22';
const DAYS = [D1, D2];

const tickets = new Map<string, EventTicket>([
  ['tk-1', { id: 'tk-1', tierName: 'Cultural evening pass' } as EventTicket],
  ['tk-2', { id: 'tk-2', tierName: 'Yatra seat' } as EventTicket],
]);

const rsvp = (p: Partial<RegisterRsvp>): RegisterRsvp => ({
  name: 'Party', headcount: 2, ...p,
});

const RSVPS: RegisterRsvp[] = [
  rsvp({ name: 'Zoya Khatun', headcount: 3, days: [D2], ticketId: 'tk-2' }),
  rsvp({ name: 'Ananda Das', headcount: 2, ticketId: 'tk-1', phone: '+8801700000000' }),
  rsvp({ name: 'Mina Pal', headcount: 4, days: [D1, D2], checkedIn: true }),
  rsvp({ name: 'Queued Family', headcount: 5, status: 'waitlisted' }),
  rsvp({ name: 'Bina Rani', headcount: 1, days: [D2] }),
];

describe('buildGateRegisterRows — one day of the gate', () => {
  it('day 1: only the parties attending that day, in name order', () => {
    const rows = buildGateRegisterRows(RSVPS, tickets, D1);
    expect(rows.map((r) => r.name)).toEqual(['Ananda Das', 'Mina Pal']);
  });

  it('day 2: day-listed and every-day parties alike', () => {
    const rows = buildGateRegisterRows(RSVPS, tickets, D2);
    expect(rows.map((r) => r.name)).toEqual(['Ananda Das', 'Bina Rani', 'Mina Pal', 'Zoya Khatun']);
  });

  it('never lists a waitlisted party', () => {
    for (const d of DAYS) {
      expect(buildGateRegisterRows(RSVPS, tickets, d).map((r) => r.name)).not.toContain('Queued Family');
    }
  });

  it('joins the pass tier through the party’s ticket; blank without one', () => {
    const rows = buildGateRegisterRows(RSVPS, tickets, D1);
    expect(rows.find((r) => r.name === 'Ananda Das')!.tierName).toBe('Cultural evening pass');
    expect(rows.find((r) => r.name === 'Mina Pal')!.tierName).toBe('');
  });

  it('shows a phone only when the record itself carries one', () => {
    const rows = buildGateRegisterRows(RSVPS, tickets, D1);
    expect(rows.find((r) => r.name === 'Ananda Das')!.phone).toBe('+8801700000000');
    expect(rows.find((r) => r.name === 'Mina Pal')!.phone).toBe('');
  });

  it('carries the checked-in mark for a same-day reprint', () => {
    const rows = buildGateRegisterRows(RSVPS, tickets, D1);
    expect(rows.find((r) => r.name === 'Mina Pal')!.checkedIn).toBe(true);
    expect(rows.find((r) => r.name === 'Ananda Das')!.checkedIn).toBe(false);
  });

  it('totals count parties and heads', () => {
    expect(gateRegisterTotals(buildGateRegisterRows(RSVPS, tickets, D2))).toEqual({ parties: 4, heads: 10 });
    expect(gateRegisterTotals([])).toEqual({ parties: 0, heads: 0 });
  });
});

describe('buildAttendeeCsvRows — the whole festival list', () => {
  const rows = buildAttendeeCsvRows(RSVPS, tickets, DAYS);

  it('starts with the header and lists every confirmed booking once', () => {
    expect(rows[0]).toEqual(['Name', 'Days', 'Headcount', 'Pass', 'State']);
    expect(rows.slice(1).map((r) => r[0])).toEqual(['Ananda Das', 'Bina Rani', 'Mina Pal', 'Zoya Khatun']);
  });

  it('expands an every-day booking across the festival’s days, in order', () => {
    expect(rows.find((r) => r[0] === 'Ananda Das')![1]).toBe(`${D1} ${D2}`);
    expect(rows.find((r) => r[0] === 'Zoya Khatun')![1]).toBe(D2);
  });

  it('states Arrived only once the gate has checked the party in', () => {
    expect(rows.find((r) => r[0] === 'Mina Pal')![4]).toBe('Arrived');
    expect(rows.find((r) => r[0] === 'Bina Rani')![4]).toBe('Confirmed');
  });
});
