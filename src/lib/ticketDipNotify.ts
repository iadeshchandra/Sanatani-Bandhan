/**
 * ticketDipNotify.ts — NOTIFICATION WAVE 1: pure picking for my
 * seva-pass tickets and my e-dip results (DESIGN §2.2).
 * =====================================================================
 * Both sources are SELF-scoped — the ticket is mine (buyerUid ==
 * me), the dip entry is mine (uid == me) — so my device watches my
 * own records and emits into my own inbox (the self-listen pattern).
 *
 * The picking discipline is a STATE LEDGER: the device remembers
 * the last status it settled for each record. A record first seen
 * in a settled status is news (a result is news, not a nag — it
 * rings once even if I already saw it in the desk); a status CHANGE
 * is news; the same status again is silence. The service's first
 * run is the baseline: it records every current state and rings
 * nothing (baseline law).
 *
 * No IO, no clock — fully unit-testable.
 */
import type { EventTicket, TicketPaymentState } from './eventTickets';
import type { DipEntry, DipEntryStatus } from './eventDip';

/* ------------------------------------------------------------------ */
/* Tickets                                                             */
/* ------------------------------------------------------------------ */

export type TicketNoticeStatus = 'purchased' | 'cancelled' | 'refunded';

/** The notice status a payment state speaks, or null (no news). */
export function ticketNoticeStatus(state: TicketPaymentState | string | undefined): TicketNoticeStatus | null {
  switch (state) {
    case 'paid-wallet':
    case 'pay-at-venue':
    case 'comp':
      return 'purchased';
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
      return 'refunded';
    default:
      return null;
  }
}

export function ticketDedupeKey(ticketId: string, status: TicketNoticeStatus): string {
  return `ticket:${ticketId}:${status}`;
}

export interface TicketNotice {
  ticket: EventTicket;
  status: TicketNoticeStatus;
  dedupeKey: string;
}

/** ticketId → last settled paymentState. */
export type TicketLedger = Record<string, string>;

export function pickTicketNotices(
  tickets: readonly EventTicket[],
  ledger: Readonly<TicketLedger>,
): { notices: TicketNotice[]; settled: TicketLedger } {
  const notices: TicketNotice[] = [];
  const settled: TicketLedger = {};
  for (const t of tickets) {
    if (!t || !t.id) continue;
    // Desk (counter) sales belong to a walk-in, not to an account —
    // their synthetic buyerUid is never a signed-in user, but the
    // guard is stated so the rule survives a future data shape.
    if (t.deskSale) continue;
    const status = ticketNoticeStatus(t.paymentState);
    if (!status) continue;
    settled[t.id] = String(t.paymentState);
    if (ledger[t.id] === String(t.paymentState)) continue; // no change
    notices.push({ ticket: t, status, dedupeKey: ticketDedupeKey(t.id, status) });
  }
  return { notices, settled };
}

/* ------------------------------------------------------------------ */
/* E-dip                                                               */
/* ------------------------------------------------------------------ */

export type DipNoticeStatus = 'selected' | 'waitlisted' | 'lapsed' | 'claimed';

/** The notice status an entry status speaks, or null ('entered' is
 *  not a result yet — silence). */
export function dipNoticeStatus(status: DipEntryStatus | string | undefined): DipNoticeStatus | null {
  switch (status) {
    case 'selected':
    case 'waitlisted':
    case 'lapsed':
    case 'claimed':
      return status;
    default:
      return null;
  }
}

export function dipDedupeKey(entryId: string, status: DipNoticeStatus): string {
  return `dip:${entryId}:${status}`;
}

export interface DipNotice {
  entry: DipEntry;
  status: DipNoticeStatus;
  dedupeKey: string;
}

/** entryId → last settled entry status. */
export type DipLedger = Record<string, string>;

export function pickDipNotices(
  entries: readonly DipEntry[],
  ledger: Readonly<DipLedger>,
): { notices: DipNotice[]; settled: DipLedger } {
  const notices: DipNotice[] = [];
  const settled: DipLedger = {};
  for (const e of entries) {
    if (!e || !e.id) continue;
    const status = dipNoticeStatus(e.status);
    if (!status) continue;
    settled[e.id] = String(e.status);
    if (ledger[e.id] === String(e.status)) continue; // no change
    notices.push({ entry: e, status, dedupeKey: dipDedupeKey(e.id, status) });
  }
  return { notices, settled };
}
