/**
 * ticketDipNotifyService — NOTIFICATION WAVE 1: the self-listen
 * watcher for my seva-pass tickets and my e-dip results (DESIGN
 * §2.2).
 * ==========================================================================
 * Both sources are self-scoped — event_tickets where buyerUid is
 * me, event_dip_entries where uid is me — so my device watches my
 * own records and emits into my own inbox. The pure half
 * (lib/ticketDipNotify) diffs each record's status against the
 * per-device state ledger: a first sighting in a settled status is
 * news, a change is news, the same status again is silence.
 *
 * Baseline law: the FIRST run records every current state and
 * rings nothing — history is a baseline, not a backlog.
 *
 * Festival facts (name, the dip's claim-by moment, the festival's
 * end) are read from the public festival_events doc, fail-soft:
 * a missing doc degrades the copy, never the bell.
 */
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyDipEvent, notifyTicketEvent } from '../notifications/notifyHelpers';
import type { EventTicket } from './eventTickets';
import type { DipEntry } from './eventDip';
import type { DipDrawRecord } from './festival';
import {
  pickDipNotices,
  pickTicketNotices,
  type DipLedger,
  type TicketLedger,
} from './ticketDipNotify';

const TICKET_LEDGER_KEY = 'sb.ticketNotify.ledger.v1';
const TICKET_BASELINE_KEY = 'sb.ticketNotify.baselined.v1';
const DIP_LEDGER_KEY = 'sb.dipNotify.ledger.v1';
const DIP_BASELINE_KEY = 'sb.dipNotify.baselined.v1';
const POLL_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — bells may repeat, never crash */
  }
}

function trimLedger<T extends Record<string, string>>(ledger: T): T {
  const entries = Object.entries(ledger).slice(-500);
  return Object.fromEntries(entries) as T;
}

interface FestivalFacts {
  name: string;
  /** Festival end (endDateISO else dateISO) + a day, epoch ms. */
  endsAt?: number;
  dipDraws?: Record<string, DipDrawRecord>;
}

async function fetchFestivalFacts(festivalId: string): Promise<FestivalFacts> {
  try {
    const snap = await getDoc(doc(db, 'festival_events', festivalId));
    if (!snap.exists()) return { name: '' };
    const d = snap.data() as Record<string, unknown>;
    const name = (d.name as { en?: string } | undefined)?.en || '';
    const endISO =
      (typeof d.endDateISO === 'string' && d.endDateISO) ||
      (typeof d.dateISO === 'string' ? d.dateISO : '');
    const parsed = endISO ? Date.parse(endISO) : NaN;
    return {
      name: typeof name === 'string' ? name : '',
      ...(Number.isFinite(parsed) ? { endsAt: parsed + DAY_MS } : {}),
      ...(d.dipDraws && typeof d.dipDraws === 'object'
        ? { dipDraws: d.dipDraws as Record<string, DipDrawRecord> }
        : {}),
    };
  } catch {
    return { name: '' };
  }
}

async function runTickets(uid: string): Promise<void> {
  let tickets: EventTicket[] = [];
  try {
    const snap = await getDocs(
      query(collection(db, 'event_tickets'), where('buyerUid', '==', uid)),
    );
    snap.forEach((d) => tickets.push({ ...(d.data() as EventTicket), id: d.id }));
  } catch {
    return; // fail-soft: no read, no bells, no baseline burn
  }

  const ledger = readJson<TicketLedger>(TICKET_LEDGER_KEY, {});
  const { notices, settled } = pickTicketNotices(tickets, ledger);
  const baselined = readJson<boolean>(TICKET_BASELINE_KEY, false);
  writeJson(TICKET_LEDGER_KEY, trimLedger({ ...ledger, ...settled }));
  if (!baselined) {
    writeJson(TICKET_BASELINE_KEY, true);
    return; // baseline law: history never bursts
  }

  const facts = new Map<string, FestivalFacts>();
  for (const n of notices) {
    if (!facts.has(n.ticket.festivalId)) {
      facts.set(n.ticket.festivalId, await fetchFestivalFacts(n.ticket.festivalId));
    }
    const f = facts.get(n.ticket.festivalId) as FestivalFacts;
    try {
      await notifyTicketEvent(uid, {
        copyKey:
          n.status === 'purchased'
            ? 'ticketPurchased'
            : n.status === 'cancelled'
              ? 'ticketCancelled'
              : 'ticketRefunded',
        festivalName: f.name || 'Festival',
        tierName: n.ticket.tierName || 'Seva pass',
        ticketId: n.ticket.id,
        workspaceId: n.ticket.workspaceId,
        festivalId: n.ticket.festivalId,
        dedupeKey: n.dedupeKey,
        ...(n.status === 'purchased' && f.endsAt ? { expiresAt: f.endsAt } : {}),
      });
    } catch {
      /* one failed bell must not stop the others */
    }
  }
}

async function runDips(uid: string): Promise<void> {
  let entries: DipEntry[] = [];
  try {
    const snap = await getDocs(
      query(collection(db, 'event_dip_entries'), where('uid', '==', uid)),
    );
    snap.forEach((d) => entries.push({ ...(d.data() as DipEntry), id: d.id }));
  } catch {
    return;
  }

  const ledger = readJson<DipLedger>(DIP_LEDGER_KEY, {});
  const { notices, settled } = pickDipNotices(entries, ledger);
  const baselined = readJson<boolean>(DIP_BASELINE_KEY, false);
  writeJson(DIP_LEDGER_KEY, trimLedger({ ...ledger, ...settled }));
  if (!baselined) {
    writeJson(DIP_BASELINE_KEY, true);
    return;
  }

  const facts = new Map<string, FestivalFacts>();
  for (const n of notices) {
    if (!facts.has(n.entry.festivalId)) {
      facts.set(n.entry.festivalId, await fetchFestivalFacts(n.entry.festivalId));
    }
    const f = facts.get(n.entry.festivalId) as FestivalFacts;
    const claimBy = f.dipDraws?.[n.entry.tierId]?.claimByMs;
    try {
      await notifyDipEvent(uid, {
        copyKey:
          n.status === 'selected'
            ? 'dipSelected'
            : n.status === 'waitlisted'
              ? 'dipWaitlisted'
              : n.status === 'lapsed'
                ? 'dipLapsed'
                : 'dipClaimed',
        festivalName: f.name || 'Festival',
        entryId: n.entry.id,
        workspaceId: n.entry.workspaceId,
        festivalId: n.entry.festivalId,
        dedupeKey: n.dedupeKey,
        ...(n.status === 'selected' && typeof claimBy === 'number' && claimBy > Date.now()
          ? { expiresAt: claimBy }
          : {}),
      });
    } catch {
      /* one failed bell must not stop the others */
    }
  }
}

async function runCheck(uid: string): Promise<void> {
  await runTickets(uid);
  await runDips(uid);
}

/** Start the watcher for a signed-in user. Returns a stop fn. */
export function startTicketDipNotify(uid: string): () => void {
  let stopped = false;
  let timer: number | undefined;

  const tick = () => {
    if (stopped) return;
    runCheck(uid).catch(() => undefined);
  };
  const schedule = () => {
    timer = window.setTimeout(
      () => {
        tick();
        schedule();
      },
      POLL_MS + Math.floor(Math.random() * 15_000),
    );
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') tick();
  };

  tick();
  schedule();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
