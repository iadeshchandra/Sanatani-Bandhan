/**
 * notifications/emit.ts — Phase 3's thin, stable emit adapter.
 * ============================================================================
 * THE contract every module (chat, P2P, SOS, wallet, Suchana, org) uses to
 * reach the NotificationCenter. Other phases import ONLY this file.
 *
 * FROZEN SIGNATURE (do not change without a coordinator decision):
 *
 *   emitNotify(recipientUid: string | null | undefined, event: NotifyEvent): Promise<EmitResult>
 *
 *   - recipientUid = the devotee who should SEE the notification.
 *   - event        = the Phase 1 NotifyEvent contract (kind, priority,
 *                    trilingual title/body, dedupeKey, deepLink, payload).
 *                    Every emit MUST carry a dedupeKey, trilingual
 *                    title/body, and an explicit priority — the adapter
 *                    drops events that lack them, loudly (console.warn).
 *   - returns      = EmitResult { status, itemId, decision, queuedAt? }.
 *
 * Two paths, one pipeline:
 *
 *   1. SELF (recipientUid == the configured/signed-in user, or null):
 *      delegates to the NotificationCenter singleton — full Phase 1
 *      pipeline (prefs, priority engine, smart grouping, delivery,
 *      offline outbox + reconnect replay, quiet-hours holds).
 *
 *   2. OTHER uid: runs the same pipeline directly against that uid
 *      (prefs read → decideRouting → best-effort grouping → deliver →
 *      offline queue when navigator is offline).
 *
 * SECURITY REALITY (read before relying on path 2): the shipped
 * firestore.rules are SELF-WRITE-ONLY by design — a client can only
 * write notifications/{itsOwnUid}/items. So on a real device, path 2
 * succeeds only for the signed-in user; cross-user writes are dropped
 * (logged, never thrown — a notification must never break the product).
 * Cross-user fan-out belongs to the trusted-server path (Cloud Function
 * watching pushRequests). The SUPPORTED client pattern is SELF-LISTEN:
 * the recipient's own device observes shared source data (chat threads,
 * p2pRequests, crisis_events, topupClaims…) and calls
 * emitNotify(myUid, event) for itself. Every Phase 3 wiring in this
 * codebase follows that pattern.
 */
import type { EmitResult, NotificationItem, NotifyEvent, QueuedEvent } from './types';
import { NotificationCenter } from './NotificationCenter';
import { decideRouting, digestOnlyDecision, findGroupTarget, groupedCardText, classifyReplay } from './engine';
import { countItemsToday, deliver, readPrefsDoc, updateInAppItem } from './delivery';
import { createOutbox, backoffMs, type OutboxStore } from './outbox';
import { DEFAULT_PREFS, dailyCapFor, mergePrefs, type NotificationPrefs } from './preferences';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function validEvent(event: NotifyEvent): string | null {
  if (!event) return 'missing event';
  if (!event.kind) return 'missing kind';
  if (!event.priority) return 'missing priority';
  if (!event.dedupeKey || typeof event.dedupeKey !== 'string') return 'missing dedupeKey';
  const t = event.title;
  const b = event.body;
  if (!t || !t.en || !t.bn || !t.hi) return 'title must be trilingual {en,bn,hi}';
  if (!b || !b.en || !b.bn || !b.hi) return 'body must be trilingual {en,bn,hi}';
  return null;
}

function droppedResult(event: NotifyEvent, reason: string): EmitResult {
  console.warn(`[notify] dropped (${reason}):`, event?.dedupeKey);
  let decision;
  try {
    decision = decideRouting(event, DEFAULT_PREFS, Date.now());
  } catch {
    decision = decideRouting(
      { kind: 'security', priority: 'silent', title: { en: '', bn: '', hi: '' }, body: { en: '', bn: '', hi: '' }, dedupeKey: 'invalid' },
      DEFAULT_PREFS,
      Date.now(),
    );
  }
  return { status: 'dropped', itemId: '', decision };
}

/* ------------------------------------------------------------------ */
/* Shared outbox for path-2 (explicit uid) offline emits                */
/* ------------------------------------------------------------------ */

let sharedOutbox: OutboxStore | null = null;
function outbox(): OutboxStore {
  if (!sharedOutbox) sharedOutbox = createOutbox();
  return sharedOutbox;
}

let replayBound = false;

/** A delivery failure that retrying can never fix (Firestore rules denial). */
class PermanentDeliveryError extends Error {}

/** Heuristic: does this deliver() error list smell like a rules denial? */
function isPermissionDenied(errors: string[]): boolean {
  return errors.some((e) => /permission|insufficient permissions|PERMISSION_DENIED/i.test(e));
}

/**
 * Replays queued events for ANY uid when connectivity returns.
 *
 * INTEGRITY RULE: an entry leaves the outbox ONLY after its delivery
 * succeeds. A failed replay keeps the entry and retries with exponential
 * backoff (capped at 15 min) — never deleted for failing. Two exceptions:
 * expired events (their moment passed) and rules-denied writes (retrying
 * can never succeed — dropped loudly so they can't poison the outbox).
 */
async function replayQueued(): Promise<void> {
  const now = Date.now();
  let queued: QueuedEvent[];
  try {
    queued = await outbox().list();
  } catch {
    return;
  }
  for (const q of queued) {
    // Backoff gate: a failed replay waits its turn — never spins hot.
    if (q.nextRetryAt !== undefined && q.nextRetryAt > now) continue;
    const verdict = classifyReplay(q, now);
    if (verdict === 'drop') {
      /* expired — gone quietly */
      try {
        await outbox().remove(q.id);
      } catch {
        /* best-effort */
      }
      continue;
    }
    try {
      if (verdict === 'digest') {
        const prefs = await loadPrefs(q.uid);
        const decision = digestOnlyDecision(prefs.suchana === 'evening' ? 'evening' : 'morning');
        const { ok, errors } = await deliver({
          uid: q.uid,
          item: buildItem(q.uid, q, decision, now),
          decision,
        });
        if (!ok) {
          if (isPermissionDenied(errors)) throw new PermanentDeliveryError(errors.join('; '));
          throw new Error(errors.join('; ') || 'delivery failed');
        }
      } else {
        // emitOnlineTo throws on delivery failure — see the catch below.
        await emitOnlineTo(q.uid, q, now);
      }
      // Delivered: only now may the entry leave the outbox.
      try {
        await outbox().remove(q.id);
      } catch {
        /* best-effort */
      }
    } catch (e) {
      if (e instanceof PermanentDeliveryError) {
        // A denied write (rules) must not poison the outbox with retries
        // that can never succeed — drop it loudly.
        console.warn('[notify] replay dropped (rules deny):', e.message, q.dedupeKey);
        try {
          await outbox().remove(q.id);
        } catch {
          /* best-effort */
        }
        continue;
      }
      // Transient failure: keep the entry, retry with backoff.
      const attempts = (q.attempts || 0) + 1;
      try {
        await outbox().enqueue({ ...q, attempts, nextRetryAt: now + backoffMs(attempts) });
      } catch {
        /* best-effort */
      }
    }
  }
}

function bindReplay(): void {
  if (replayBound || typeof window === 'undefined') return;
  replayBound = true;
  window.addEventListener('online', () => {
    void replayQueued().catch(() => undefined);
  });
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

async function loadPrefs(uid: string): Promise<NotificationPrefs> {
  try {
    const raw = await readPrefsDoc(uid);
    return mergePrefs((raw ?? undefined) as Partial<NotificationPrefs> | undefined);
  } catch {
    return mergePrefs();
  }
}

function newId(prefix: string): string {
  const rand = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function buildItem(
  uid: string,
  event: NotifyEvent,
  decision: NotificationItem['decision'],
  now: number,
): NotificationItem {
  const routes: NotificationItem['routes'] = [];
  if (decision.inApp) routes.push('inapp');
  if (decision.ping || decision.holdUntil !== null) routes.push('push');
  if (decision.persistent) routes.push('persistent');
  return {
    ...event,
    id: newId('n'),
    uid,
    createdAt: now,
    updatedAt: now,
    read: false,
    acknowledged: false,
    groupedCount: 1,
    quietHold: decision.holdUntil !== null,
    holdUntil: decision.holdUntil,
    routes,
    decision,
  };
}

/** Best-effort smart grouping for explicit-uid emits (never blocks delivery). */
async function tryGroup(uid: string, event: NotifyEvent, now: number): Promise<string | null> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'notifications', uid, 'items'),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(25),
      ),
    );
    const candidates = snap.docs.map((d) => {
      const v = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        dedupeKey: typeof v.dedupeKey === 'string' ? v.dedupeKey : '',
        kind: v.kind as NotifyEvent['kind'],
        priority: v.priority as NotifyEvent['priority'],
        actorUid: (v.actor as { uid?: string } | null)?.uid,
        createdAt: typeof v.createdAt === 'number' ? v.createdAt : 0,
        read: v.read === true,
        groupedCount: typeof v.groupedCount === 'number' ? v.groupedCount : 1,
      };
    });
    const target = findGroupTarget(candidates, event, now);
    if (!target) return null;
    const newCount = target.groupedCount + 1;
    const patch: Record<string, unknown> = { groupedCount: newCount, read: false };
    if (event.actor) {
      const text = groupedCardText(newCount, event.actor.name, event.kind);
      patch.title = { en: text.en, bn: text.bn, hi: text.hi };
      patch.body = { en: event.body.en, bn: event.body.bn, hi: event.body.hi };
    }
    await updateInAppItem(uid, target.id, patch);
    return target.id;
  } catch {
    return null; // grouping is an enhancement; delivery proceeds
  }
}

/** Path 2: the online pipeline for an explicit recipient uid. */
async function emitOnlineTo(uid: string, event: NotifyEvent, now: number): Promise<EmitResult> {
  const prefs = await loadPrefs(uid);
  // Blueprint D: same cap discipline as the singleton path (the ONE
  // pipeline law — a sender cannot dodge the devotee's controls by
  // choosing the other emit path). No cap set → no count read, and
  // routing is exactly as before.
  let decision = decideRouting(event, prefs, now);
  if (dailyCapFor(prefs) > 0 && event.priority !== 'critical') {
    try {
      const deliveredToday = await countItemsToday(uid, now);
      decision = decideRouting(event, prefs, now, { deliveredToday });
    } catch {
      /* a failed count never swallows a notification */
    }
  }
  // A switched-off kind is silent: no grouping, no write.
  if (decision.suppressed === 'category') {
    return { status: 'dropped', itemId: '', decision };
  }

  const groupedId = await tryGroup(uid, event, now);
  if (groupedId) return { status: 'grouped', itemId: groupedId, decision };

  const item = buildItem(uid, event, decision, now);
  const { ok, errors } = await deliver({ uid, item, decision });
  if (!ok) {
    // Signal the failure instead of silently dropping: the live emitNotify
    // path reports it as 'dropped'; the offline replay path keeps the
    // event and retries with backoff — EXCEPT a rules denial, which can
    // never succeed and must not poison the outbox.
    console.warn('[notify] delivery failed:', errors.join('; '), event.dedupeKey);
    if (isPermissionDenied(errors)) throw new PermanentDeliveryError(errors.join('; '));
    throw new Error(errors.join('; ') || 'delivery failed');
  }
  return {
    status: decision.holdUntil !== null ? 'held' : 'delivered',
    itemId: item.id,
    decision,
  };
}

/* ------------------------------------------------------------------ */
/* The adapter                                                         */
/* ------------------------------------------------------------------ */

/**
 * Emit one notification event. Thin, stable, never throws for bad input
 * (returns status 'dropped'); Firestore/network failures inside the
 * pipeline are caught per-rail by deliver() and reported via the result.
 *
 * Fire-and-forget usage: `void emitNotify(uid, event);`
 */
export async function emitNotify(
  recipientUid: string | null | undefined,
  event: NotifyEvent,
): Promise<EmitResult> {
  bindReplay();
  const problem = validEvent(event);
  if (problem) return droppedResult(event, problem);

  const now = Date.now();
  if (event.expiresAt !== undefined && event.expiresAt <= now) {
    return droppedResult(event, 'expired');
  }

  // Path 1 — self: the configured singleton owns the full pipeline.
  if (!recipientUid) {
    try {
      return await NotificationCenter.get().emit(event);
    } catch (e) {
      console.warn(
        '[notify] singleton not configured — call NotificationWiring or configure() with the signed-in uid:',
        e instanceof Error ? e.message : String(e),
      );
      return droppedResult(event, 'center-not-configured');
    }
  }

  // Path 2 — explicit uid.
  if (!isOnline()) {
    const queued: QueuedEvent = { ...event, id: newId('q'), uid: recipientUid, queuedAt: now };
    try {
      await outbox().enqueue(queued);
    } catch (e) {
      console.warn('[notify] outbox enqueue failed:', e instanceof Error ? e.message : String(e));
      return droppedResult(event, 'outbox-failed');
    }
    const prefs = await loadPrefs(recipientUid);
    return { status: 'queued', itemId: queued.id, decision: decideRouting(event, prefs, now), queuedAt: now };
  }

  try {
    return await emitOnlineTo(recipientUid, event, now);
  } catch (e) {
    console.warn('[notify] emit failed:', e instanceof Error ? e.message : String(e), event.dedupeKey);
    return droppedResult(event, 'emit-threw');
  }
}

/**
 * Manually replay the shared offline outbox (the 'online' listener calls
 * this automatically). Returns how many items were processed.
 */
export async function drainEmitOutbox(): Promise<number> {
  const before = await outbox()
    .list()
    .then((l) => l.length)
    .catch(() => 0);
  await replayQueued().catch(() => undefined);
  return before;
}

/** Read one notification item (used by held-release flows). Never throws. */
export async function readNotifyItem(uid: string, itemId: string): Promise<NotificationItem | null> {
  try {
    const snap = await getDoc(doc(db, 'notifications', uid, 'items', itemId));
    if (!snap.exists()) return null;
    return snap.data() as NotificationItem;
  } catch {
    return null;
  }
}
