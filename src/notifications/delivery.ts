/**
 * notifications/delivery.ts — where a decided notification actually goes.
 * ========================================================================
 * Two rails, one router:
 *
 *   1. IN-APP CENTER — Firestore `notifications/{uid}/items/{id}`. Always
 *      written (except nothing — even silent lands here). This is the
 *      reliable rail: it works on the $0 Spark plan with zero server.
 *
 *   2. FCM PUSH — Firestore `notifications/{uid}/pushRequests/{id}` holding a
 *      server-style payload doc. HONEST LIMITATION: no client can deliver
 *      push notifications by itself. A Cloud Function (or any trusted
 *      server) must watch this collection and dispatch via the device tokens
 *      in `users/{uid}/fcmTokens`, flipping `status` pending → sent. Until
 *      such a function is deployed (needs Blaze), these docs accumulate as
 *      the honest request queue and the in-app center carries the product.
 *      The payload is already shaped the way FCM expects it, so the server
 *      side is a thin forwarder, not a redesign.
 *
 * REMOVED (2026-10-19): the third rail — SUCHANA FEED
 * (`notifications/{uid}/suchanaItems/{id}`) — was written on every gentle
 * emit but never read by any UI. The actual Suchana feed (useSuchana) is
 * pure local computation (panjika + app intelligence), and gentle
 * notifications now surface in the "From your sangha" inbox with read
 * states and deep-links. Wiring the dead rail would have duplicated every
 * item in two places. Deleted honestly instead.
 *
 * Critical items additionally get `persistentUntilAck: true` on the in-app
 * doc — Phase 3 UI renders the banner that stays until `acknowledge()` is
 * called. Sound/vibration for critical are client-side concerns (the push
 * payload carries `critical: true` so the service worker can escalate).
 */

import { collection, doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type {
  NotificationItem,
  NotifyEvent,
  RoutingDecision,
  TriText,
} from './types';

function itemsCol(uid: string) {
  return collection(db, 'notifications', uid, 'items');
}
function pushCol(uid: string) {
  return collection(db, 'notifications', uid, 'pushRequests');
}
function prefsDoc(uid: string) {
  return doc(db, 'notifications', uid, 'prefs');
}

// ---------------------------------------------------------------------------
// 1. In-app center
// ---------------------------------------------------------------------------

/** Serialize the item for Firestore (strip undefined, keep it plain JSON). */
export function toFirestoreDoc(item: NotificationItem): Record<string, unknown> {
  const clean = (t: TriText) => ({ en: t.en, bn: t.bn, hi: t.hi });
  return {
    id: item.id,
    uid: item.uid,
    kind: item.kind,
    priority: item.priority,
    actor: item.actor ?? null,
    title: clean(item.title),
    body: clean(item.body),
    dedupeKey: item.dedupeKey,
    deepLink: item.deepLink ?? null,
    payload: item.payload ?? {},
    expiresAt: item.expiresAt ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    read: item.read,
    acknowledged: item.acknowledged,
    groupedCount: item.groupedCount,
    quietHold: item.quietHold,
    holdUntil: item.holdUntil,
    routes: item.routes,
    persistentUntilAck: item.decision.persistent,
    decision: {
      ping: item.decision.ping,
      inApp: item.decision.inApp,
      persistent: item.decision.persistent,
      holdUntil: item.decision.holdUntil,
      holdReason: item.decision.holdReason,
      digestCandidate: item.decision.digestCandidate,
      digestWindow: item.decision.digestWindow,
    },
    serverCreatedAt: serverTimestamp(),
  };
}

export async function writeInAppItem(uid: string, item: NotificationItem): Promise<void> {
  await setDoc(doc(itemsCol(uid), item.id), toFirestoreDoc(item));
}

export async function updateInAppItem(
  uid: string,
  itemId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(itemsCol(uid), itemId), { ...patch, updatedAt: Date.now() });
}

export async function markItemRead(uid: string, itemId: string): Promise<void> {
  await updateInAppItem(uid, itemId, { read: true });
}

export async function acknowledgeItem(uid: string, itemId: string): Promise<void> {
  await updateInAppItem(uid, itemId, { acknowledged: true, read: true });
}

// ---------------------------------------------------------------------------
// 2. FCM push — server-style payload docs (see module header)
// ---------------------------------------------------------------------------

export interface PushRequestDoc {
  toUser: string;
  notification: { title: string; body: string };
  data: {
    kind: NotifyEvent['kind'];
    priority: NotifyEvent['priority'];
    itemId: string;
    dedupeKey: string;
    deepLink: string;
    critical: boolean;
  };
  android: { priority: 'high' | 'normal'; notification: { sound: string; channelId: string } };
  apns: { payload: { aps: { sound: string; 'interruption-level': string } } };
  /** Epoch ms before which the server must NOT dispatch (quiet-hours hold). */
  notBefore: number | null;
  critical: boolean;
  status: 'pending';
  createdAt: unknown;
}

export function buildPushRequest(
  uid: string,
  item: NotificationItem,
  lang: 'en' | 'bn' | 'hi' = 'en',
): PushRequestDoc {
  const critical = item.priority === 'critical';
  return {
    toUser: uid,
    notification: { title: item.title[lang], body: item.body[lang] },
    data: {
      kind: item.kind,
      priority: item.priority,
      itemId: item.id,
      dedupeKey: item.dedupeKey,
      deepLink: item.deepLink ?? '',
      critical,
    },
    android: {
      priority: critical ? 'high' : 'normal',
      notification: {
        sound: critical ? 'sos_alert' : 'default',
        channelId: critical ? 'sos_critical' : 'sanatani_default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: critical ? 'sos_alert.caf' : 'default',
          'interruption-level': critical ? 'critical' : 'active',
        },
      },
    },
    notBefore: item.holdUntil,
    critical,
    status: 'pending',
    createdAt: serverTimestamp(),
  };
}

export async function writePushRequest(uid: string, item: NotificationItem): Promise<void> {
  await setDoc(doc(pushCol(uid), item.id), buildPushRequest(uid, item));
}

// ---------------------------------------------------------------------------
// The router
// ---------------------------------------------------------------------------

export interface DeliverInput {
  uid: string;
  item: NotificationItem;
  decision: RoutingDecision;
}

/**
 * Fan out one decided item. Rails are independent — a push failure never
 * blocks the in-app write. Failures are collected and returned so the
 * center can log/retry honestly.
 */
export async function deliver(input: DeliverInput): Promise<{ ok: boolean; errors: string[] }> {
  const { uid, item, decision } = input;
  const errors: string[] = [];

  if (decision.inApp) {
    try {
      await writeInAppItem(uid, item);
    } catch (e) {
      errors.push(`inapp: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (decision.ping || decision.holdUntil !== null) {
    try {
      await writePushRequest(uid, item);
    } catch (e) {
      errors.push(`push: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Preferences persistence (owner-only doc)
// ---------------------------------------------------------------------------

export async function readPrefsDoc(uid: string): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(prefsDoc(uid));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

export async function writePrefsDoc(
  uid: string,
  prefs: Record<string, unknown>,
): Promise<void> {
  await setDoc(prefsDoc(uid), { ...prefs, updatedAt: serverTimestamp() }, { merge: true });
}
