/**
 * festivalRsvp.ts — Festival RSVP writes (EVENTS + POLLS P0).
 * =====================================================================
 * One implementation for both RSVP surfaces (the public festival page
 * and the war room's cloud hook), replacing the old two-step writes
 * (an addDoc for the RSVP, then a separate counter updateDoc) whose
 * counters could be raised by ANY signed-in user with no RSVP at all,
 * never decreased, and drifted whenever one half landed without the
 * other.
 *
 * The model now:
 *  - The RSVP doc id is derived — `festival_rsvps/{eventId}__{uid}` —
 *    one RSVP per member per event, so firestore.rules can find THIS
 *    RSVP as the anchor for the counter move.
 *  - RSVP + counters move in ONE transaction. The rules validate the
 *    counter delta against the RSVP's before/after headcount and slot
 *    (anchored increments), including decreases on change/cancel.
 *  - Slot capacity is enforced HERE from the event's own darshanSlots
 *    (re-read inside the transaction, so two devotees racing for the
 *    last places cannot both pass), and AGAIN in the rules against
 *    the published `slotCaps` map whenever the event carries one.
 *
 * Errors are thrown as stable codes ('slot-full', 'slot-unavailable',
 * 'event-missing') so callers render calm, honest copy.
 */
import { doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { db } from './firebase';
import type { FestivalEventDoc, RsvpEntry } from './festival';

export interface FestivalRsvpInput {
  eventId: string;
  workspaceId: string;
  uid: string;
  name: string;
  /** 1–20 (clamped here as a final guard). */
  headcount: number;
  slotId?: string;
}

/** The derived RSVP doc id — the rules' anchor path depends on it. */
export function festivalRsvpDocId(eventId: string, uid: string): string {
  return `${eventId}__${uid}`;
}

export async function applyFestivalRsvp(input: FestivalRsvpInput): Promise<void> {
  const hc = Math.min(20, Math.max(1, Math.round(input.headcount)));
  const evRef = doc(db, 'festival_events', input.eventId);
  const rsvpRef = doc(db, 'festival_rsvps', festivalRsvpDocId(input.eventId, input.uid));

  await runTransaction(db, async (tx) => {
    const evSnap = await tx.get(evRef);
    if (!evSnap.exists()) throw new Error('event-missing');
    const ev = evSnap.data() as FestivalEventDoc;

    const prevSnap = await tx.get(rsvpRef);
    const prev = prevSnap.exists() ? (prevSnap.data() as Omit<RsvpEntry, 'id'>) : null;
    const prevHc = prev?.headcount || 0;
    const prevSlot = prev?.slotId || '';
    const nextSlot = input.slotId || '';

    // Net headcount movement per slot (a slot change moves both).
    const slotDeltas = new Map<string, number>();
    if (prevSlot) slotDeltas.set(prevSlot, (slotDeltas.get(prevSlot) || 0) - prevHc);
    if (nextSlot) slotDeltas.set(nextSlot, (slotDeltas.get(nextSlot) || 0) + hc);

    // Capacity: any slot gaining heads must stay within its published
    // capacity, judged on the transaction's own read of the bookings.
    for (const [slotId, delta] of slotDeltas) {
      if (delta <= 0) continue;
      const slot = (ev.darshanSlots || []).find((s) => s.id === slotId);
      if (!slot) throw new Error('slot-unavailable');
      const booked = (ev.slotBooked || {})[slotId] || 0;
      if (booked + delta > slot.capacity) throw new Error('slot-full');
    }

    if (prev) {
      // Edit in place: only headcount/slotId may change (the rules pin
      // exactly those keys on the owner update path).
      const next: Record<string, unknown> = { ...prev, headcount: hc };
      if (nextSlot) next.slotId = nextSlot;
      else delete next.slotId;
      tx.set(rsvpRef, next);
    } else {
      tx.set(rsvpRef, {
        eventId: input.eventId,
        workspaceId: input.workspaceId,
        uid: input.uid,
        name: input.name.trim().slice(0, 80),
        headcount: hc,
        ...(nextSlot ? { slotId: nextSlot } : {}),
        createdAt: new Date().toISOString(),
      });
    }

    const counters: Record<string, unknown> = {
      rsvpHeadcount: increment(hc - prevHc),
      updatedAt: serverTimestamp(),
    };
    for (const [slotId, delta] of slotDeltas) {
      if (delta !== 0) counters[`slotBooked.${slotId}`] = increment(delta);
    }
    tx.update(evRef, counters);
  });
}

/** Cancel the caller's own RSVP: record and counters move together. */
export async function removeFestivalRsvp(input: { eventId: string; uid: string }): Promise<void> {
  const evRef = doc(db, 'festival_events', input.eventId);
  const rsvpRef = doc(db, 'festival_rsvps', festivalRsvpDocId(input.eventId, input.uid));

  await runTransaction(db, async (tx) => {
    const prevSnap = await tx.get(rsvpRef);
    if (!prevSnap.exists()) return;
    const prev = prevSnap.data() as Omit<RsvpEntry, 'id'>;
    tx.delete(rsvpRef);
    const counters: Record<string, unknown> = {
      rsvpHeadcount: increment(-(prev.headcount || 0)),
      updatedAt: serverTimestamp(),
    };
    if (prev.slotId) counters[`slotBooked.${prev.slotId}`] = increment(-(prev.headcount || 0));
    tx.update(evRef, counters);
  });
}
