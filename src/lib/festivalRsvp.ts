/**
 * festivalRsvp.ts — the anchored RSVP write path (EVENTS P0 + P1).
 * =====================================================================
 * The public page's RSVP counters (rsvpHeadcount / slotBooked) are
 * PUBLIC trust numbers — P0 anchored them so they can only move in
 * the same transaction as the devotee's own RSVP record, exactly the
 * delta that record causes (firestore.rules: anchoredFestivalCounter).
 *
 * P1 extends the same transaction family:
 *  - DAY-WISE RSVP — a multi-day festival takes a per-day choice
 *    (`days` on the record); per-day expected counts are DERIVED
 *    from the RSVP list by organiser surfaces (deriveDayCounts),
 *    never stored as a second counter that could drift.
 *  - WAITLIST — when a darshan slot is full, the RSVP is recorded
 *    with status 'waitlisted' and the devotee's uid joins that
 *    slot's queue on the event doc (slotWaitlist — uids only, the
 *    doc is public). A waitlisted record moves NO counter.
 *  - PROMOTION — when a cancellation frees places, the head of the
 *    queue claims theirs (claimFestivalWaitlist): a transaction that
 *    re-reads the queue, verifies the caller IS the head whose party
 *    now fits, and flips the record to 'confirmed' with the counters
 *    moving in the same write. Capacity itself is rules-enforced;
 *    queue order is enforced here, inside the transaction.
 */
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { FestivalEventDoc, RsvpEntry } from './festival';
import { slotRemaining } from './festival';

interface FestCounters {
  rsvpHeadcount: number;
  slotBooked: Record<string, number>;
  slotWaitlist: Record<string, Record<string, number>>;
}

function countersOf(ev: FestivalEventDoc): FestCounters {
  return {
    rsvpHeadcount: ev.rsvpHeadcount || 0,
    slotBooked: { ...(ev.slotBooked || {}) },
    slotWaitlist: ev.slotWaitlist ? JSON.parse(JSON.stringify(ev.slotWaitlist)) : {},
  };
}

/** Does this party fit in the slot right now? (No slot = always fits.) */
function fitsNow(ev: FestivalEventDoc, slotId: string | undefined, headcount: number): boolean {
  if (!slotId) return true;
  const slot = (ev.darshanSlots || []).find((s) => s.id === slotId);
  if (!slot) return true; // the slot left the plan — general darshan
  return slotRemaining(slot, ev.slotBooked || {}) >= headcount;
}

/** The queue for one slot, oldest first: [{uid, joinedAt}]. */
export function waitlistOrder(
  ev: Pick<FestivalEventDoc, 'slotWaitlist'>,
  slotId: string
): { uid: string; joinedAt: number }[] {
  const q = ev.slotWaitlist?.[slotId] || {};
  return Object.entries(q)
    .map(([uid, joinedAt]) => ({ uid, joinedAt: typeof joinedAt === 'number' ? joinedAt : 0 }))
    .sort((a, b) => a.joinedAt - b.joinedAt || (a.uid < b.uid ? -1 : 1));
}

/** 1-based place in line, or 0 when the uid is not queued for the slot. */
export function waitlistPosition(ev: Pick<FestivalEventDoc, 'slotWaitlist'>, slotId: string, uid: string): number {
  return waitlistOrder(ev, slotId).findIndex((e) => e.uid === uid) + 1;
}

export interface ApplyRsvpInput {
  eventId: string;
  workspaceId: string;
  uid: string;
  name: string;
  headcount: number;
  slotId?: string;
  /** P1: chosen days for a multi-day festival (absent = all days). */
  days?: string[];
  /**
   * P1: when the chosen slot is full, join its waitlist instead of
   * failing. Default false — callers opt in explicitly so a devotee
   * is never queued silently.
   */
  joinWaitlistIfFull?: boolean;
}

export type ApplyRsvpOutcome = 'confirmed' | 'waitlisted';

/**
 * Create or replace the caller's RSVP for a festival event, moving
 * the public counters by exactly the delta. Throws 'slot-full' when
 * the chosen slot cannot hold the party and waitlisting was not
 * chosen — the current behaviour and copy of the public page.
 */
export async function applyFestivalRsvp(
  db: Firestore,
  input: ApplyRsvpInput
): Promise<ApplyRsvpOutcome> {
  const { eventId, uid } = input;
  const evRef = doc(db, 'festival_events', eventId);
  const rsvpRef = doc(db, 'festival_rsvps', `${eventId}__${uid}`);
  let outcome: ApplyRsvpOutcome = 'confirmed';
  await runTransaction(db, async (tx) => {
    const [evSnap, rsvpSnap] = await Promise.all([tx.get(evRef), tx.get(rsvpRef)]);
    if (!evSnap.exists()) throw new Error('event-not-found');
    const ev = evSnap.data() as FestivalEventDoc;
    const prev = rsvpSnap.exists() ? (rsvpSnap.data() as RsvpEntry) : null;

    const fits = fitsNow(ev, input.slotId, input.headcount);
    const wantWaitlist = !fits && input.joinWaitlistIfFull === true && !!input.slotId;
    if (!fits && !wantWaitlist) throw new Error('slot-full');
    const status: 'confirmed' | 'waitlisted' = wantWaitlist ? 'waitlisted' : 'confirmed';
    outcome = status;

    // A CONFIRMED place in another slot is never silently demoted
    // into a queue here — cancelling and joining fresh is the honest
    // path, and the UI offers exactly that.
    if (wantWaitlist && prev && (prev.status || 'confirmed') === 'confirmed') {
      throw new Error('slot-full');
    }

    const c = countersOf(ev);
    // Remove the previous record's EFFECT (waitlisted records hold none).
    if (prev && (prev.status || 'confirmed') === 'confirmed') {
      c.rsvpHeadcount -= prev.headcount || 0;
      if (prev.slotId) c.slotBooked[prev.slotId] = Math.max(0, (c.slotBooked[prev.slotId] || 0) - (prev.headcount || 0));
    }
    // Remove the previous queue entry (the slot may have changed).
    if (prev && (prev.status || 'confirmed') === 'waitlisted' && prev.slotId) {
      if (c.slotWaitlist[prev.slotId]) delete c.slotWaitlist[prev.slotId][input.uid];
    }
    // Apply the new record's effect.
    if (status === 'confirmed') {
      c.rsvpHeadcount += input.headcount;
      if (input.slotId) c.slotBooked[input.slotId] = (c.slotBooked[input.slotId] || 0) + input.headcount;
    } else if (input.slotId) {
      const keepJoinedAt =
        prev && (prev.status || 'confirmed') === 'waitlisted' && prev.slotId === input.slotId
          ? (ev.slotWaitlist?.[input.slotId]?.[input.uid] ?? Date.now())
          : Date.now();
      c.slotWaitlist[input.slotId] = { ...(c.slotWaitlist[input.slotId] || {}), [input.uid]: keepJoinedAt };
    }
    if (c.rsvpHeadcount < 0) c.rsvpHeadcount = 0;

    tx.update(evRef, {
      rsvpHeadcount: c.rsvpHeadcount,
      slotBooked: c.slotBooked,
      slotWaitlist: c.slotWaitlist,
      updatedAt: serverTimestamp(),
    });
    const payload: Record<string, unknown> = {
      eventId: input.eventId,
      workspaceId: input.workspaceId,
      uid: input.uid,
      name: input.name,
      headcount: input.headcount,
      status,
      createdAt: prev?.createdAt || new Date().toISOString(),
    };
    if (input.slotId) payload.slotId = input.slotId;
    if (input.days && input.days.length > 0) payload.days = [...input.days].sort();
    tx.set(rsvpRef, payload);
  });
  return outcome;
}

/** Remove the caller's RSVP, unwinding counters and any queue entry. */
export async function removeFestivalRsvp(
  db: Firestore,
  input: { eventId: string; uid: string }
): Promise<void> {
  const { eventId, uid } = input;
  const evRef = doc(db, 'festival_events', eventId);
  const rsvpRef = doc(db, 'festival_rsvps', `${eventId}__${uid}`);
  await runTransaction(db, async (tx) => {
    const [evSnap, rsvpSnap] = await Promise.all([tx.get(evRef), tx.get(rsvpRef)]);
    if (!rsvpSnap.exists()) return;
    const prev = rsvpSnap.data() as RsvpEntry;
    tx.delete(rsvpRef);
    if (!evSnap.exists()) return;
    const ev = evSnap.data() as FestivalEventDoc;
    const c = countersOf(ev);
    if ((prev.status || 'confirmed') === 'confirmed') {
      c.rsvpHeadcount = Math.max(0, c.rsvpHeadcount - (prev.headcount || 0));
      if (prev.slotId) {
        c.slotBooked[prev.slotId] = Math.max(0, (c.slotBooked[prev.slotId] || 0) - (prev.headcount || 0));
      }
    }
    if ((prev.status || 'confirmed') === 'waitlisted' && prev.slotId && c.slotWaitlist[prev.slotId]) {
      delete c.slotWaitlist[prev.slotId][input.uid];
    }
    tx.update(evRef, {
      rsvpHeadcount: c.rsvpHeadcount,
      slotBooked: c.slotBooked,
      slotWaitlist: c.slotWaitlist,
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Claim a freed place: the caller must be waitlisted, must be at the
 * head of their slot's queue (nobody who waited longer is skipped),
 * and their whole party must now fit. Returns true when the claim
 * landed; false when it is not (yet) the caller's turn or the party
 * still does not fit — the UI says "your place in line is safe".
 */
export async function claimFestivalWaitlist(
  db: Firestore,
  input: { eventId: string; uid: string }
): Promise<boolean> {
  const { eventId, uid } = input;
  const evRef = doc(db, 'festival_events', eventId);
  const rsvpRef = doc(db, 'festival_rsvps', `${eventId}__${uid}`);
  let claimed = false;
  await runTransaction(db, async (tx) => {
    const [evSnap, rsvpSnap] = await Promise.all([tx.get(evRef), tx.get(rsvpRef)]);
    if (!evSnap.exists() || !rsvpSnap.exists()) return;
    const ev = evSnap.data() as FestivalEventDoc;
    const prev = rsvpSnap.data() as RsvpEntry;
    if ((prev.status || 'confirmed') !== 'waitlisted' || !prev.slotId) return;
    const order = waitlistOrder(ev, prev.slotId);
    if (order.length === 0 || order[0].uid !== input.uid) return; // not head of line
    if (!fitsNow(ev, prev.slotId, prev.headcount || 1)) return; // party still too big
    const c = countersOf(ev);
    c.rsvpHeadcount += prev.headcount || 0;
    c.slotBooked[prev.slotId] = (c.slotBooked[prev.slotId] || 0) + (prev.headcount || 0);
    if (c.slotWaitlist[prev.slotId]) delete c.slotWaitlist[prev.slotId][input.uid];
    tx.update(evRef, {
      rsvpHeadcount: c.rsvpHeadcount,
      slotBooked: c.slotBooked,
      slotWaitlist: c.slotWaitlist,
      updatedAt: serverTimestamp(),
    });
    tx.update(rsvpRef, { status: 'confirmed' });
    claimed = true;
  });
  return claimed;
}

/**
 * P1 day-wise derivation: expected heads per civil date from the
 * RSVP list. Confirmed records only; a record without `days` attends
 * every day of the festival. Organiser surfaces compute this from
 * the list they already load — no second counter exists to drift.
 */
export function deriveDayCounts(
  rsvps: readonly RsvpEntry[],
  allDays: readonly string[]
): { date: string; heads: number; parties: number }[] {
  const byDay = new Map<string, { heads: number; parties: number }>();
  for (const d of allDays) byDay.set(d, { heads: 0, parties: 0 });
  for (const r of rsvps) {
    if ((r.status || 'confirmed') !== 'confirmed') continue;
    const days = r.days && r.days.length > 0 ? r.days : allDays;
    for (const d of days) {
      const cur = byDay.get(d);
      if (cur) {
        cur.heads += r.headcount || 0;
        cur.parties += 1;
      }
    }
  }
  return allDays.map((d) => ({ date: d, heads: byDay.get(d)?.heads || 0, parties: byDay.get(d)?.parties || 0 }));
}

/** Read one event doc (small helper for surfaces that need fresh counters). */
export async function fetchFestivalEvent(db: Firestore, eventId: string): Promise<FestivalEventDoc | null> {
  const snap = await getDoc(doc(db, 'festival_events', eventId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as FestivalEventDoc) : null;
}
