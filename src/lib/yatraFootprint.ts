/**
 * yatraFootprint.ts — pure shaping for the devotee's own pilgrimage
 * record and held passes (PILGRIMAGE + MY PASSES batch).
 * =====================================================================
 * Two honest records, shaped here so the surfaces stay thin and the
 * rules are testable without Firestore:
 *
 *  1. THE FOOTPRINT. The Tirtha Diary (`tirthaVisits/{uid}/visits`)
 *     is the one pilgrimage record — the diary's "Record this visit"
 *     and the portal's GPS check-in both write there through
 *     tirthaStore. This module shapes those VisitEntry rows for the
 *     portal's footprint tab: a visit appears on the map ONLY when it
 *     carries a valid GPS pair (recorded by an explicit check-in);
 *     diary visits without a pair stay in the log, unmapped — the
 *     record never invents a place.
 *
 *  2. HELD PASSES. A devotee's live event_tickets (the E2 seva-pass
 *     family), joined to their festival_events docs and ordered
 *     upcoming-first for the Personal "My passes" shelf. Cancelled /
 *     refunded tickets are not passes and never appear; desk-sale
 *     records belong to walk-ins, not to an account.
 *
 * Everything here is pure: no Firestore, no clock reads except the
 * `nowMs` the caller passes in.
 */
import type { VisitEntry } from '../tirtha/types';
import { validCoordPair } from '../tirtha/types';
import type { EventTicket } from './eventTickets';
import { isLiveTicket } from './eventTickets';
import type { FestivalEventDoc } from './festival';

/* ------------------------------------------------------------------ */
/* The footprint                                                       */
/* ------------------------------------------------------------------ */

export interface FootprintRow {
  /** The visit record's own id. */
  id: string;
  shrineName: string;
  /** [lat, lng] when the visit carries a valid GPS pair, else null. */
  coords: [number, number] | null;
  /** Epoch ms of the visit (0 when the stored time is unreadable). */
  visitedAtMs: number;
  /** True when this row came from an explicit GPS check-in. */
  gps: boolean;
  /** The devotee's own darshan kind, when they recorded one. */
  darshanKind?: string;
  /** The devotee's own note, when they wrote one. */
  note?: string;
}

/** Shape one stored visit for the footprint log; null when unusable. */
export function visitToFootprintRow(v: VisitEntry): FootprintRow | null {
  if (!v || typeof v.templeName !== 'string' || v.templeName.trim() === '') return null;
  const pair = validCoordPair(v.lat, v.lng);
  const ms = Date.parse(v.visitedAt || '');
  return {
    id: v.id,
    shrineName: v.templeName,
    coords: pair ? [pair.lat, pair.lng] : null,
    visitedAtMs: Number.isFinite(ms) ? ms : 0,
    gps: pair !== null,
    darshanKind: v.darshanKind,
    note: v.note,
  };
}

/** The whole log, newest first; unusable rows drop out silently. */
export function shapeFootprint(visits: readonly VisitEntry[]): FootprintRow[] {
  const rows: FootprintRow[] = [];
  for (const v of visits) {
    const row = visitToFootprintRow(v);
    if (row) rows.push(row);
  }
  rows.sort((a, b) => b.visitedAtMs - a.visitedAtMs);
  return rows;
}

/** A footprint row whose GPS pair is present — the map's only input. */
export interface FootprintPin extends FootprintRow {
  coords: [number, number];
}

/** Only the rows a map may honestly draw — those with a real GPS pair. */
export function mappableRows(rows: readonly FootprintRow[]): FootprintPin[] {
  return rows.filter((r): r is FootprintPin => r.coords !== null);
}

/* ------------------------------------------------------------------ */
/* Held passes                                                         */
/* ------------------------------------------------------------------ */

export interface HeldPass {
  ticket: EventTicket;
  /** The festival's published doc, when it could be read. */
  event: FestivalEventDoc | null;
  /** Festival start (epoch ms from dateISO), when known. */
  startMs: number | null;
}

/** Start-of-day epoch ms for a YYYY-MM-DD date; null when unreadable. */
export function festivalStartMs(dateISO: string | undefined): number | null {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return null;
  const ms = Date.parse(`${dateISO}T00:00:00`);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * The passes a devotee actually holds, upcoming first.
 * Live tickets only (paid / pay-at-venue / comp); a ticket whose
 * festival has already ended still lists — below the upcoming ones,
 * newest first — because the record of having held it is true.
 * Tickets with no readable festival date sit between the upcoming
 * and the past, in purchase order (newest first).
 */
export function shapeHeldPasses(
  tickets: readonly EventTicket[],
  eventsById: ReadonlyMap<string, FestivalEventDoc>,
  todayStartMs: number,
): HeldPass[] {
  const held: HeldPass[] = [];
  for (const ticket of tickets) {
    if (!isLiveTicket(ticket)) continue;
    if (ticket.deskSale) continue;
    if (ticket.buyerUid.startsWith('desk_')) continue;
    const event = eventsById.get(ticket.festivalId) ?? null;
    held.push({ ticket, event, startMs: festivalStartMs(event?.dateISO) });
  }
  const rank = (p: HeldPass): number => {
    if (p.startMs === null) return 1;
    return p.startMs >= todayStartMs ? 0 : 2;
  };
  held.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0) return (a.startMs ?? 0) - (b.startMs ?? 0);
    if (ra === 2) return (b.startMs ?? 0) - (a.startMs ?? 0);
    return String(b.ticket.createdAt).localeCompare(String(a.ticket.createdAt));
  });
  return held;
}
