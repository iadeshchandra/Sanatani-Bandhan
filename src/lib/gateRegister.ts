/**
 * gateRegister.ts — REAL-WORLD PACK: the printable gate register
 * + the attendee list (pure builders).
 * =====================================================================
 * The gate's paper twin. Phones die, networks fail, and a queue at
 * the gate cannot wait for either — so before the day, the
 * committee prints a register: one line per confirmed party for
 * that day, with a BLANK column to tick by hand as each party is
 * admitted. It is built from the SAME festival_rsvps records the
 * gate itself admits from (the war store's list), never from a
 * second source that could drift.
 *
 * A party attends a day when its record says so: a record with no
 * day list attends every day (the P1 law, deriveDayCounts); a
 * record with days attends exactly those. Waitlisted parties are
 * NOT on the register — they hold a queue place, not a place at
 * the gate (the War Room's "Who is coming" shows them apart).
 *
 * Phone: the RSVP record carries no phone field today; the row
 * keeps an optional phone so a record that ever carries one shows
 * it — absent renders blank, never invented.
 */
import type { RsvpEntry } from './festival';
import type { EventTicket } from './eventTickets';

/** An RSVP record as the register reads it (phone optional — see header). */
export type RegisterRsvp = Pick<
  RsvpEntry, 'name' | 'headcount' | 'status' | 'days' | 'checkedIn' | 'ticketId'
> & { phone?: string };

export interface GateRegisterRow {
  /** The party's name (the record's lead name — what the gate calls out). */
  name: string;
  headcount: number;
  /** The pass tier's name, when the party holds a pass. */
  tierName: string;
  /** Only when the record itself carries one — otherwise ''. */
  phone: string;
  /** Already admitted (checked in at the gate) when the register was built. */
  checkedIn: boolean;
}

/** Does this party attend this day? (No day list = every day.) */
export function attendsDay(r: RegisterRsvp, dayISO: string): boolean {
  return !r.days || r.days.length === 0 || r.days.includes(dayISO);
}

const byName = (a: GateRegisterRow, b: GateRegisterRow) =>
  a.name.localeCompare(b.name) || b.headcount - a.headcount;

function toRow(r: RegisterRsvp, ticketsById: ReadonlyMap<string, EventTicket>): GateRegisterRow {
  const tk = r.ticketId ? ticketsById.get(r.ticketId) : undefined;
  return {
    name: r.name || '',
    headcount: Math.max(0, r.headcount || 0),
    tierName: tk?.tierName || '',
    phone: (r as { phone?: string }).phone || '',
    checkedIn: r.checkedIn === true,
  };
}

/**
 * The register for ONE day: confirmed parties attending that day,
 * in name order — the order a gate volunteer calls out and ticks.
 */
export function buildGateRegisterRows(
  rsvps: readonly RegisterRsvp[],
  ticketsById: ReadonlyMap<string, EventTicket>,
  dayISO: string
): GateRegisterRow[] {
  return rsvps
    .filter((r) => (r.status || 'confirmed') === 'confirmed')
    .filter((r) => attendsDay(r, dayISO))
    .map((r) => toRow(r, ticketsById))
    .sort(byName);
}

/** The register's expected totals for a day (parties + heads). */
export function gateRegisterTotals(rows: readonly GateRegisterRow[]): { parties: number; heads: number } {
  return {
    parties: rows.length,
    heads: rows.reduce((s, r) => s + r.headcount, 0),
  };
}

/**
 * The attendee CSV: every confirmed booking for the festival —
 * name, the days they attend (the festival's own day list, in
 * order), headcount, pass tier, and state (Arrived once the gate
 * has checked the party in, Confirmed until then). Header row
 * first; the caller escapes and downloads (the DebriefCard idiom).
 */
export function buildAttendeeCsvRows(
  rsvps: readonly RegisterRsvp[],
  ticketsById: ReadonlyMap<string, EventTicket>,
  allDays: readonly string[]
): string[][] {
  const rows: string[][] = [['Name', 'Days', 'Headcount', 'Pass', 'State']];
  const confirmed = rsvps
    .filter((r) => (r.status || 'confirmed') === 'confirmed')
    .map((r) => ({ r, row: toRow(r, ticketsById) }))
    .sort((a, b) => byName(a.row, b.row));
  for (const { r, row } of confirmed) {
    const days = r.days && r.days.length > 0
      ? allDays.filter((d) => r.days!.includes(d))
      : [...allDays];
    rows.push([
      row.name,
      days.join(' '),
      String(row.headcount),
      row.tierName,
      row.checkedIn ? 'Arrived' : 'Confirmed',
    ]);
  }
  return rows;
}
