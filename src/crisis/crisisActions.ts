/**
 * Crisis Command — coordinator actions (Firestore writes).
 * =========================================================================
 * Every action is optimistic-UI safe: callers wrap in try/catch and toast.
 * UI-level RBAC comes from `useCrisisAccess`; the server-side boundary is
 * firestore.rules (see the rules author notes — the rules file is NOT
 * touched by Phase 2).
 */
import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { CrisisEvent, CrisisAssignment } from './crisisCommandTypes';
import { ackSOS, markArrived, resolveSOS } from './sosService';

export interface Actor {
  uid: string;
  name: string;
}

/**
 * Coordinator acknowledge → status 'acknowledged'. Sender sees
 * "Help is being dispatched". Coordinator-specific (records WHO
 * acknowledged); responder "I'm coming" goes through setResponseStatus
 * → Phase 1's ackSOS instead.
 */
export async function acknowledgeEvent(event: CrisisEvent, actor: Actor): Promise<void> {
  await updateDoc(doc(db, 'crisis_events', event.id), {
    status: 'acknowledged',
    acknowledgedBy: actor.name,
    acknowledgedAt: Date.now(),
    ackCount: increment(1),
  });
}

/**
 * Responder en-route / arrived — delegates to Phase 1's sosService
 * (single implementation of the responses-subcollection writes).
 */
export async function setResponseStatus(
  eventId: string,
  actor: Actor,
  photo: string | undefined,
  status: 'coming' | 'arrived',
): Promise<void> {
  if (status === 'arrived') {
    await markArrived(eventId, actor.uid);
  } else {
    await ackSOS(eventId, { uid: actor.uid, name: actor.name, photo: photo ?? null });
  }
}

/**
 * Assign sevadars: appends to the event's assignments array, stamps an
 * assignment note, and notifies each assignee via the existing
 * yatra_broadcasts infra (type CRISIS_ASSIGNMENT).
 */
export async function assignSevadars(
  event: CrisisEvent,
  actor: Actor,
  assignees: { uid: string; name: string }[],
  orgId: string,
): Promise<void> {
  const now = Date.now();
  const newAssignments: CrisisAssignment[] = assignees.map((a) => ({
    uid: a.uid,
    name: a.name,
    assignedBy: actor.name,
    assignedAt: now,
  }));
  const prev = event.assignments ?? [];
  await updateDoc(doc(db, 'crisis_events', event.id), {
    assignments: [...prev, ...newAssignments],
    status: event.status === 'active' ? 'responding' : event.status,
    responderCount: increment(assignees.length),
  });
  // Notify each assignee through the broadcast rail.
  await Promise.all(
    assignees.map((a) =>
      addDoc(collection(db, 'yatra_broadcasts'), {
        type: 'CRISIS_ASSIGNMENT',
        senderId: actor.uid,
        senderName: actor.name,
        recipientId: a.uid,
        recipientName: a.name,
        communityId: orgId,
        crisisEventId: event.id,
        situation: event.situation,
        text: `🙏 ${a.name}, you have been assigned to a ${event.situation} emergency by ${actor.name}. Please open the Crisis Command dashboard.`,
        originalTimestamp: now,
        syncedAt: serverTimestamp(),
      }),
    ),
  );
}

export interface EscalateLinks {
  tel108: string;
  tel101: string;
  tel100: string;
  sms: string;
}

/** One-tap helplines with the location pre-composed as an SMS body. */
export function buildEscalateLinks(event: CrisisEvent): EscalateLinks {
  const loc = event.location;
  const where = loc?.address
    ? loc.address
    : loc
      ? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`
      : 'location unknown';
  const maps = loc ? ` https://maps.google.com/?q=${loc.lat},${loc.lng}` : '';
  const body = encodeURIComponent(
    `EMERGENCY (${event.situation.toUpperCase()}) — ${event.senderName}. Location: ${where}.${maps} Please respond. — Sanatani Bandhan Crisis Command`,
  );
  return {
    tel108: 'tel:108',
    tel101: 'tel:101',
    tel100: 'tel:100',
    sms: `sms:?body=${body}`,
  };
}

/** Broadcast an org-wide "please avoid [area]" alert via yatra_broadcasts. */
export async function broadcastAlert(
  event: CrisisEvent,
  actor: Actor,
  orgId: string,
  areaText: string,
): Promise<void> {
  await addDoc(collection(db, 'yatra_broadcasts'), {
    type: 'CRISIS_ALERT',
    senderId: actor.uid,
    senderName: actor.name,
    communityId: orgId,
    crisisEventId: event.id,
    situation: event.situation,
    text: `⚠️ Community alert: Please avoid ${areaText} — an emergency is being handled there. Your cooperation keeps everyone safe. 🙏`,
    originalTimestamp: Date.now(),
    syncedAt: serverTimestamp(),
  });
}

/**
 * Resolve: outcome note is required (Phase-2 guard), then delegates to
 * Phase 1's resolveSOS — the single implementation of the close write.
 */
export async function resolveEvent(
  event: CrisisEvent,
  _actor: Actor,
  outcomeNote: string,
): Promise<void> {
  const note = outcomeNote.trim();
  if (!note) throw new Error('outcome-required');
  await resolveSOS(event.id, note);
}

/** Crisis coordinator edge writes (trustee-only UI). */
export async function addCoordinator(
  orgId: string,
  uid: string,
  name: string,
  assignedBy: string,
): Promise<void> {
  await setDoc(doc(db, 'crisisCoordinators', `${orgId}_${uid}`), {
    orgId,
    uid,
    name,
    assignedBy,
    assignedAt: Date.now(),
  });
}

export async function removeCoordinator(orgId: string, uid: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'crisisCoordinators', `${orgId}_${uid}`));
}
