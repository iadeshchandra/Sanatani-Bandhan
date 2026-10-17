/**
 * sosService.ts — Crisis Command Phase 1 lifecycle engine.
 * =========================================================
 * Creates, updates and resolves crisis_events docs plus their
 * responses subcollection. Safety-critical paths are defensive:
 * an SOS is NEVER dropped because an auxiliary step failed.
 *
 * Offline-first:
 * - All Firestore writes ride the app-wide multi-tab IndexedDB
 *   persistence (src/lib/firebase.ts): writes land locally first and
 *   sync when the network returns. No custom doc queue is needed.
 * - Voice-note uploads cannot use Firestore persistence, so blobs are
 *   staged in a tiny IndexedDB outbox (below) and uploaded on reconnect.
 *
 * Fan-out: best-effort client-side bounding-box query over
 * `sanataniProfiles` lat/lng fields within 2 km of the SOS point.
 * Where the app's notification pipeline exists, listeners pick up the
 * new crisis_events doc and fan out from there too.
 *
 * Abuse: false alarms are counted in crisisAbuse/{uid}; 3 false alarms
 * inside a rolling 30-day window sets warned=true; further false alarms
 * set a soft 24h cooldownUntil (a calm nudge in the UI, NEVER a hard ban —
 * a real emergency must always be sendable).
 *
 * This service never touches firestore.rules.
 */
import { db, storage } from '../firebase';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  CRISIS_COLLECTIONS,
  SITUATION_SEVERITY,
  type AckStatus,
  type CrisisAbuseRecord,
  type CrisisEvent,
  type CrisisResponse,
  type EmergencyContact,
  type EmergencyContactsDoc,
  type SenderSnapshot,
  type SOSLocation,
  type SOSStatus,
  type TriggerSOSInput,
} from './types';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const GEO_TIMEOUT_MS = 8000;
const LAST_LOCATION_KEY = 'sb_last_location';
/** 30-day rolling window for false-alarm counting. */
const ABUSE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const ABUSE_WARN_THRESHOLD = 3;
/** Soft cooldown after the warning threshold is exceeded. */
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const NEARBY_RADIUS_KM = 2;
const IDB_DB = 'crisis_outbox';
const IDB_STORE = 'voice_notes';

/* ------------------------------------------------------------------ */
/* Location capture                                                    */
/* ------------------------------------------------------------------ */

/**
 * Captures a GPS fix ONLY at the SOS moment. Never tracks.
 * Falls back to the last fix stored in localStorage, then to nulls.
 * The SOS is sent regardless — a missing fix never blocks help.
 */
export async function captureSOSLocation(): Promise<SOSLocation> {
  const fix = await new Promise<GeolocationPosition | null>((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    const timer = window.setTimeout(() => resolve(null), GEO_TIMEOUT_MS);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve(pos);
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 60_000 }
    );
  });

  if (fix) {
    const loc: SOSLocation = {
      lat: fix.coords.latitude,
      lng: fix.coords.longitude,
      address: null, // Reverse-geocoded by a later phase; coords are enough to dispatch.
      capturedAt: Date.now(),
    };
    try {
      localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(loc));
    } catch {
      /* storage full / private mode — non-fatal */
    }
    return loc;
  }

  try {
    const raw = localStorage.getItem(LAST_LOCATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SOSLocation;
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return { ...parsed, capturedAt: parsed.capturedAt ?? null };
      }
    }
  } catch {
    /* corrupted entry — fall through to nulls */
  }
  return { lat: null, lng: null, address: null, capturedAt: null };
}

/* ------------------------------------------------------------------ */
/* Sender snapshot (profile-derived, SOS-context only)                 */
/* ------------------------------------------------------------------ */

/** Reads the private profile ONLY to attach medical share + identity to an SOS. */
export async function loadSenderSnapshot(uid: string): Promise<SenderSnapshot> {
  const auth = getAuth();
  const fbUser = auth.currentUser;
  const snap: SenderSnapshot = {
    uid,
    name: fbUser?.displayName ?? 'A devotee',
    photo: fbUser?.photoURL ?? null,
    sanId: null,
    bloodGroup: null,
    allergies: [],
    conditions: [],
    workspaceId: null,
    orgId: null,
  };
  try {
    const q = query(collection(db, 'sanataniProfiles'), where('id', '==', uid), limit(1));
    const res = await getDocs(q);
    if (!res.empty) {
      const p = res.docs[0].data() as Record<string, unknown>;
      if (typeof p.displayName === 'string' && p.displayName) snap.name = p.displayName;
      if (typeof p.name === 'string' && p.name) snap.name = p.name;
      if (typeof p.photoURL === 'string') snap.photo = p.photoURL;
      if (typeof p.sanId === 'string') snap.sanId = p.sanId;
      if (typeof p.bloodGroup === 'string') snap.bloodGroup = p.bloodGroup;
      if (Array.isArray(p.allergies)) snap.allergies = p.allergies.filter((a): a is string => typeof a === 'string');
      if (Array.isArray(p.conditions)) snap.conditions = p.conditions.filter((c): c is string => typeof c === 'string');
      if (typeof p.defaultWorkspaceId === 'string') snap.workspaceId = p.defaultWorkspaceId;
      if (typeof p.orgId === 'string') snap.orgId = p.orgId;
    }
  } catch {
    /* profile read failed (offline/permissions) — send the SOS with auth basics */
  }
  return snap;
}

/* ------------------------------------------------------------------ */
/* Emergency contacts                                                  */
/* ------------------------------------------------------------------ */

const contactsDoc = (uid: string) => doc(db, CRISIS_COLLECTIONS.emergencyContacts, uid);

export async function loadEmergencyContacts(uid: string): Promise<EmergencyContact[]> {
  try {
    const s = await getDoc(contactsDoc(uid));
    if (!s.exists()) return [];
    const data = s.data() as Partial<EmergencyContactsDoc>;
    return Array.isArray(data.contacts) ? data.contacts : [];
  } catch {
    return [];
  }
}

/** Replaces the whole family circle (add/edit/delete are list rewrites). */
export async function saveEmergencyContacts(uid: string, contacts: EmergencyContact[]): Promise<void> {
  await setDoc(contactsDoc(uid), { contacts, updatedAt: serverTimestamp() }, { merge: true });
}

/* ------------------------------------------------------------------ */
/* Voice-note outbox (IndexedDB, for offline uploads)                  */
/* ------------------------------------------------------------------ */

function openOutbox(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE, { keyPath: 'eventId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

interface VoiceOutboxEntry {
  eventId: string;
  uid: string;
  blob: Blob;
  queuedAt: number;
}

async function stageVoiceNote(entry: VoiceOutboxEntry): Promise<void> {
  const dbx = await openOutbox();
  await new Promise<void>((resolve, reject) => {
    const tx = dbx.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  dbx.close();
}

async function drainVoiceNote(eventId: string): Promise<VoiceOutboxEntry | null> {
  const dbx = await openOutbox();
  const entry = await new Promise<VoiceOutboxEntry | null>((resolve, reject) => {
    const tx = dbx.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(eventId);
    req.onsuccess = () => resolve((req.result as VoiceOutboxEntry | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  dbx.close();
  return entry;
}

async function removeStagedVoiceNote(eventId: string): Promise<void> {
  try {
    const dbx = await openOutbox();
    await new Promise<void>((resolve) => {
      const tx = dbx.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(eventId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    dbx.close();
  } catch {
    /* best-effort cleanup */
  }
}

async function uploadVoiceNote(uid: string, eventId: string, blob: Blob): Promise<string> {
  const path = CRISIS_COLLECTIONS.voiceNoteStoragePath(uid, eventId);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'audio/webm' });
  return getDownloadURL(storageRef);
}

/**
 * Drains any staged voice note for this event (called on reconnect).
 * Safe to call any time; no-ops when nothing is staged.
 */
export async function flushVoiceOutbox(eventId: string): Promise<void> {
  if (!navigator.onLine) return;
  const entry = await drainVoiceNote(eventId).catch(() => null);
  if (!entry) return;
  try {
    const url = await uploadVoiceNote(entry.uid, entry.eventId, entry.blob);
    await updateDoc(doc(db, CRISIS_COLLECTIONS.events, eventId), { voiceNoteUrl: url });
    await removeStagedVoiceNote(eventId);
  } catch {
    /* stays staged; next online event retries */
  }
}

/* Views call flushVoiceOutbox(eventId) on mount and on 'online' to retry
 * any staged voice note. No global listener here — the eventId is known
 * only to the view that owns the SOS. */

/* ------------------------------------------------------------------ */
/* Core lifecycle                                                      */
/* ------------------------------------------------------------------ */

const eventsCol = () => collection(db, CRISIS_COLLECTIONS.events);
const eventDoc = (eventId: string) => doc(db, CRISIS_COLLECTIONS.events, eventId);
const responsesCol = (eventId: string) => collection(db, CRISIS_COLLECTIONS.events, eventId, CRISIS_COLLECTIONS.responses);

/**
 * Triggers an SOS. The crisis_events doc is created FIRST with whatever we
 * have; the voice note is attached afterwards (or staged offline). Nothing
 * auxiliary is allowed to fail the SOS itself.
 */
export async function triggerSOS(input: TriggerSOSInput): Promise<string> {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('auth-required');

  const [location, sender, contacts] = await Promise.all([
    captureSOSLocation(),
    loadSenderSnapshot(uid),
    loadEmergencyContacts(uid).catch((): EmergencyContact[] => []),
  ]);

  const severity = SITUATION_SEVERITY[input.situation];

  const event: Omit<CrisisEvent, 'id'> = {
    senderUid: uid,
    senderName: sender.name,
    senderPhoto: sender.photo,
    sanId: sender.sanId,
    bloodGroup: sender.bloodGroup,
    situation: input.situation,
    details: input.details?.trim() ? input.details.trim() : null,
    voiceNoteUrl: null,
    location,
    medicalShare: { allergies: sender.allergies, conditions: sender.conditions },
    status: 'active',
    severity,
    orgId: sender.orgId,
    workspaceId: sender.workspaceId,
    // In-app contacts carry uids; family-circle entries are external so we
    // record them as `phone:<number>` markers for the rules/UI author.
    familyNotified: contacts.map((c) => `phone:${c.phone}`),
    createdAt: Date.now(),
    resolvedAt: null,
    outcomeNote: null,
    ackCount: 0,
    responderCount: 0,
  };

  const refDoc = await addDoc(eventsCol(), { ...event, createdAt: serverTimestamp() });
  const eventId = refDoc.id;

  // Voice note: upload now, or stage for reconnect. Never blocks the SOS.
  if (input.voiceNoteBlob) {
    uploadVoiceNote(uid, eventId, input.voiceNoteBlob)
      .then((url) => updateDoc(eventDoc(eventId), { voiceNoteUrl: url }).catch(() => undefined))
      .catch(async () => {
        await stageVoiceNote({ eventId, uid, blob: input.voiceNoteBlob as Blob, queuedAt: Date.now() }).catch(
          () => undefined
        );
      });
  }

  // Nearest-Sanatanis fan-out (best-effort, fire-and-forget).
  void fanOutToNearby(eventId, location);

  // Let any mounted listeners react instantly (in-app + audio).
  window.dispatchEvent(new CustomEvent('crisis_sos_triggered', { detail: { eventId, situation: input.situation } }));

  return eventId;
}

/**
 * "I'm safe" — cancels the SOS and broadcasts the stand-down so every
 * listener (in-app banner, audio, responder views) clears at once.
 * Pass wasFalseAlarm=true when the sender admits it was a mistake.
 */
export async function cancelSOS(eventId: string, wasFalseAlarm = false): Promise<void> {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  await updateDoc(eventDoc(eventId), {
    status: 'cancelled' as SOSStatus,
    resolvedAt: serverTimestamp(),
  });
  if (wasFalseAlarm && uid) {
    await recordFalseAlarm(uid).catch(() => undefined);
  }
  window.dispatchEvent(new CustomEvent('crisis_sos_cancelled', { detail: { eventId, wasFalseAlarm } }));
}

/**
 * A responder taps "I'm coming". Writes responses/{uid} and bumps the
 * denormalized ackCount atomically. Idempotent per uid.
 */
export async function ackSOS(
  eventId: string,
  responder: { uid: string; name: string; photo?: string | null; distanceM?: number | null }
): Promise<void> {
  const response: CrisisResponse = {
    uid: responder.uid,
    name: responder.name,
    photo: responder.photo ?? null,
    status: 'coming',
    distanceM: responder.distanceM ?? null,
    createdAt: Date.now(),
  };
  await setDoc(doc(responsesCol(eventId), responder.uid), response, { merge: true });
  await updateDoc(eventDoc(eventId), {
    ackCount: increment(1),
    responderCount: increment(1),
    status: 'acknowledged' as SOSStatus,
  }).catch(() => undefined);
}

/** Responder arrived on scene. */
export async function markArrived(eventId: string, uid: string): Promise<void> {
  await updateDoc(doc(responsesCol(eventId), uid), {
    status: 'arrived' as AckStatus,
  });
}

/** Closes the event with an optional outcome note for the sangha's learning. */
export async function resolveSOS(eventId: string, outcomeNote?: string | null): Promise<void> {
  await updateDoc(eventDoc(eventId), {
    status: 'resolved' as SOSStatus,
    resolvedAt: serverTimestamp(),
    outcomeNote: outcomeNote?.trim() ? outcomeNote.trim() : null,
  });
  window.dispatchEvent(new CustomEvent('crisis_sos_resolved', { detail: { eventId } }));
}

/** Live subscription to one event doc. Returns the Firestore unsubscribe. */
export function subscribeToEvent(eventId: string, onEvent: (event: CrisisEvent | null) => void): Unsubscribe {
  return onSnapshot(
    eventDoc(eventId),
    (snap) => {
      if (!snap.exists()) {
        onEvent(null);
        return;
      }
      onEvent({ id: snap.id, ...(snap.data() as Omit<CrisisEvent, 'id'>) });
    },
    () => onEvent(null)
  );
}

/** Live subscription to the responses subcollection, oldest first. */
export function subscribeToResponses(
  eventId: string,
  onResponses: (responses: CrisisResponse[]) => void
): Unsubscribe {
  const q = query(responsesCol(eventId), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onResponses(snap.docs.map((d) => d.data() as CrisisResponse));
    },
    () => onResponses([])
  );
}

/* ------------------------------------------------------------------ */
/* Nearest-Sanatanis fan-out (best-effort client query)                */
/* ------------------------------------------------------------------ */

function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

/**
 * Best-effort: finds profiles with last-known lat/lng inside a 2 km box and
 * writes a lightweight `notified` ping doc per nearby uid under
 * crisis_events/{eventId}/notified/{uid}. Listeners (Phase 2+) turn these
 * into push/in-app alerts. If the profile fields don't exist, the query
 * simply matches nobody — the SOS itself is unaffected.
 */
export async function fanOutToNearby(eventId: string, location: SOSLocation): Promise<number> {
  if (location.lat == null || location.lng == null) return 0;
  try {
    const box = boundingBox(location.lat, location.lng, NEARBY_RADIUS_KM);
    const q = query(
      collection(db, 'sanataniProfiles'),
      where('lat', '>=', box.minLat),
      where('lat', '<=', box.maxLat),
      limit(50)
    );
    const res = await getDocs(q);
    let notified = 0;
    const writes = res.docs
      .map((d) => {
        const p = d.data() as Record<string, unknown>;
        const plat = typeof p.lat === 'number' ? p.lat : null;
        const plng = typeof p.lng === 'number' ? p.lng : null;
        const puid = typeof p.id === 'string' ? p.id : d.id;
        if (plat == null || plng == null) return null;
        if (plng < box.minLng || plng > box.maxLng) return null;
        notified += 1;
        return setDoc(
          doc(db, CRISIS_COLLECTIONS.events, eventId, 'notified', puid),
          { uid: puid, notifiedAt: serverTimestamp(), distanceM: null },
          { merge: true }
        );
      })
      .filter((w): w is Promise<void> => w !== null);
    await Promise.allSettled(writes);
    return notified;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Abuse tracking (soft cooldown, NEVER a hard ban)                    */
/* ------------------------------------------------------------------ */

const abuseDoc = (uid: string) => doc(db, CRISIS_COLLECTIONS.abuse, uid);

export async function getAbuseRecord(uid: string): Promise<CrisisAbuseRecord | null> {
  try {
    const s = await getDoc(abuseDoc(uid));
    if (!s.exists()) return null;
    const d = s.data() as Partial<CrisisAbuseRecord>;
    return {
      falseCount: typeof d.falseCount === 'number' ? d.falseCount : 0,
      windowStart: typeof d.windowStart === 'number' ? d.windowStart : Date.now(),
      warned: d.warned === true,
      cooldownUntil: typeof d.cooldownUntil === 'number' ? d.cooldownUntil : null,
    };
  } catch {
    return null;
  }
}

/**
 * Records a false alarm. Rolling 30-day window: at 3 falses the sender is
 * flagged warned; beyond that each false alarm refreshes a soft 24h
 * cooldownDuring which the UI shows a calm nudge — the SOS can still be sent.
 */
export async function recordFalseAlarm(uid: string): Promise<CrisisAbuseRecord> {
  const now = Date.now();
  const prev = (await getAbuseRecord(uid)) ?? {
    falseCount: 0,
    windowStart: now,
    warned: false,
    cooldownUntil: null,
  };
  // Roll the window when it has expired.
  const inWindow = now - prev.windowStart < ABUSE_WINDOW_MS;
  const falseCount = (inWindow ? prev.falseCount : 0) + 1;
  const windowStart = inWindow ? prev.windowStart : now;
  const warned = prev.warned || falseCount >= ABUSE_WARN_THRESHOLD;
  const cooldownUntil =
    falseCount > ABUSE_WARN_THRESHOLD ? now + COOLDOWN_MS : prev.cooldownUntil;
  const next: CrisisAbuseRecord = { falseCount, windowStart, warned, cooldownUntil };
  await setDoc(abuseDoc(uid), next, { merge: true }).catch(() => undefined);
  return next;
}

/** True while a soft cooldown is in effect (UI shows a nudge, SOS still allowed). */
export function isInCooldown(record: CrisisAbuseRecord | null): boolean {
  if (!record?.cooldownUntil) return false;
  return Date.now() < record.cooldownUntil;
}
