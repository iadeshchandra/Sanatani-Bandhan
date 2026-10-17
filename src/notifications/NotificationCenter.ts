/**
 * notifications/NotificationCenter.ts — the notification brain (singleton).
 * ==========================================================================
 * Every module emits `NotifyEvent`s here; the center decides when and how
 * each one reaches the devotee:
 *
 *   emit(event)
 *     → expired? drop quietly
 *     → offline? IndexedDB outbox (replayed on reconnect)
 *     → priority engine (decideRouting): quiet hours, DND, per-category prefs
 *     → smart grouping (dedupeKey, then actor+kind collapse, 30-min window)
 *     → delivery router (in-app center, FCM push-request docs, Suchana hook)
 *
 * Usage:
 *   import { NotificationCenter } from './notifications/NotificationCenter';
 *   NotificationCenter.get().configure({ uid: user.uid });
 *   await NotificationCenter.get().emit({ kind: 'chat', priority: 'important', ... });
 *
 * STAGE-LOCAL ONLY. Do not push until the coordinator sequences it.
 */

import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type {
  EmitResult,
  NotificationItem,
  NotifyEvent,
  QueuedEvent,
  RoutingDecision,
} from './types';
import {
  DEFAULT_PREFS,
  mergePrefs,
  type NotificationPrefs,
} from './preferences';
import {
  classifyReplay,
  decideRouting,
  digestOnlyDecision,
  findGroupTarget,
  groupedCardText,
  type GroupCandidate,
} from './engine';
import {
  acknowledgeItem,
  deliver,
  markItemRead,
  readPrefsDoc,
  updateInAppItem,
  writeInAppItem,
  writePushRequest,
  writeSuchanaHook,
  writePrefsDoc,
} from './delivery';
import { createOutbox, backoffMs, type OutboxStore } from './outbox';

export interface CenterConfig {
  uid: string;
  /** Partial prefs — merged over DEFAULT_PREFS, then hydrated from Firestore. */
  prefs?: Partial<NotificationPrefs>;
  outbox?: OutboxStore;
  /** Connectivity probe. Defaults to navigator.onLine (true outside browsers). */
  online?: () => boolean;
  /** Recent unread items for grouping. Injected for testability. */
  listRecent?: (uid: string) => Promise<GroupCandidate[]>;
  /** Held items (quietHold) awaiting release. Injected for testability. */
  listHeld?: (uid: string) => Promise<Array<{ id: string; holdUntil: number | null }>>;
}

export interface DrainReport {
  replayed: number;
  digested: number;
  dropped: number;
  /** Kept in the outbox for a later retry (failed delivery or backoff wait). */
  retried: number;
}

function newId(prefix: string): string {
  const rand = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/** Which digest window the devotee asked Suchana-style items to join. */
function digestWindowPref(prefs: NotificationPrefs): 'morning' | 'evening' | null {
  if (prefs.suchana === 'evening') return 'evening';
  if (prefs.suchana === 'off') return null;
  return 'morning';
}

class NotificationCenter {
  private static instance: NotificationCenter | null = null;

  private uid: string | null = null;
  private prefs: NotificationPrefs = mergePrefs();
  private outbox: OutboxStore = createOutbox();
  private online: () => boolean = () =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
  private listRecent: (uid: string) => Promise<GroupCandidate[]> = defaultListRecent;
  private listHeld: (uid: string) => Promise<Array<{ id: string; holdUntil: number | null }>> =
    defaultListHeld;
  private networkBound = false;
  private draining = false;

  static get(): NotificationCenter {
    if (!NotificationCenter.instance) NotificationCenter.instance = new NotificationCenter();
    return NotificationCenter.instance;
  }

  /** Test/SSR escape hatch — a fresh, unconfigured center. */
  static fresh(): NotificationCenter {
    return new NotificationCenter();
  }

  /**
   * Configure for the signed-in user. Hydrates prefs from the owner-only
   * Firestore doc (local patch wins on first run), binds online/offline
   * listeners, and drains any offline outbox.
   */
  async configure(config: CenterConfig): Promise<void> {
    this.uid = config.uid;
    this.prefs = mergePrefs(config.prefs);
    if (config.outbox) this.outbox = config.outbox;
    if (config.online) this.online = config.online;
    if (config.listRecent) this.listRecent = config.listRecent;
    if (config.listHeld) this.listHeld = config.listHeld;

    try {
      const stored = await readPrefsDoc(config.uid);
      if (stored) this.prefs = mergePrefs(stored as Partial<NotificationPrefs>);
    } catch {
      // Prefs read is best-effort offline; defaults carry the calm.
    }

    this.bindNetworkEvents();
    // Fire-and-forget: the outbox must not block sign-in.
    void this.drainOutbox().catch(() => undefined);
    // Quiet-hours holds may have expired while the app was closed —
    // release them now (in-app cards were already written at emit time).
    void this.flushHeld().catch(() => undefined);
  }

  getPrefs(): NotificationPrefs {
    return { ...this.prefs, quietHours: { ...this.prefs.quietHours } };
  }

  async setPrefs(patch: Partial<NotificationPrefs>): Promise<void> {
    this.prefs = mergePrefs({ ...this.prefs, ...patch });
    if (!this.uid) return;
    try {
      await writePrefsDoc(this.uid, this.prefs as unknown as Record<string, unknown>);
    } catch {
      // Offline: prefs live in memory until the next successful write.
    }
  }

  setDnd(on: boolean): Promise<void> {
    const was = this.prefs.dnd;
    return this.setPrefs({ dnd: on }).then(() => {
      if (was && !on) void this.flushHeld().catch(() => undefined);
    });
  }

  // ------------------------------------------------------------------ emit
  async emit(event: NotifyEvent): Promise<EmitResult> {
    if (!this.uid) throw new Error('NotificationCenter not configured — call configure() first.');
    const now = Date.now();

    // Self-release: quiet-hours/DND holds expire on their own clock, and a
    // PWA has no reliable background timer — so every emit opportunistically
    // releases expired holds (throttled inside maybeFlushHeld).
    void this.maybeFlushHeld(now).catch(() => undefined);

    if (event.expiresAt !== undefined && event.expiresAt <= now) {
      return {
        status: 'dropped',
        itemId: '',
        decision: decideRouting(event, this.prefs, now),
      };
    }

    if (!this.online()) {
      const queued: QueuedEvent = {
        ...event,
        id: newId('q'),
        uid: this.uid,
        queuedAt: now,
      };
      await this.outbox.enqueue(queued);
      return {
        status: 'queued',
        itemId: queued.id,
        decision: decideRouting(event, this.prefs, now),
        queuedAt: now,
      };
    }

    return this.emitOnline(event, now);
  }

  /** The online pipeline, shared by emit() and outbox replay. */
  private async emitOnline(event: NotifyEvent, now: number): Promise<EmitResult> {
    const uid = this.uid as string;
    const decision = decideRouting(event, this.prefs, now);

    // Smart grouping — one calm card instead of a buzzing stack.
    let target: GroupCandidate | null = null;
    try {
      target = findGroupTarget(await this.listRecent(uid), event, now);
    } catch {
      target = null; // Grouping is an enhancement; never block delivery.
    }

    if (target) {
      const newCount = target.groupedCount + 1;
      const patch: Record<string, unknown> = {
        groupedCount: newCount,
        read: false,
      };
      if (event.actor) {
        const text = groupedCardText(newCount, event.actor.name, event.kind);
        patch.title = { en: text.en, bn: text.bn, hi: text.hi };
        patch.body = { en: event.body.en, bn: event.body.bn, hi: event.body.hi };
      }
      try {
        await updateInAppItem(uid, target.id, patch);
      } catch {
        // Fall through to creating a fresh card if the update fails.
        target = null;
      }
      if (target) return { status: 'grouped', itemId: target.id, decision };
    }

    const item = this.buildItem(uid, event, decision, now);
    const { ok, errors } = await deliver({ uid, item, decision });
    if (!ok) {
      // Surface delivery failure to the caller. The outbox replay path
      // keeps the event for backoff retry (never deletes undelivered
      // events); live emit() callers report it via their own handling.
      throw new Error(`delivery failed: ${errors.join('; ') || 'unknown error'}`);
    }
    return {
      status: decision.holdUntil !== null ? 'held' : 'delivered',
      itemId: item.id,
      decision,
    };
  }

  private buildItem(
    uid: string,
    event: NotifyEvent,
    decision: RoutingDecision,
    now: number,
  ): NotificationItem {
    const routes: NotificationItem['routes'] = [];
    if (decision.inApp) routes.push('inapp');
    if (decision.ping || decision.holdUntil !== null) routes.push('push');
    if (decision.toSuchana) routes.push('suchana');
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

  // ------------------------------------------------------- offline replay
  /**
   * Drain the offline outbox. Gentle items older than 6h go straight to the
   * digest (never ping); important/critical replay normally; expired items
   * are dropped quietly.
   *
   * INTEGRITY RULE: an entry leaves the outbox ONLY after its delivery
   * succeeds. A failed replay keeps the entry and schedules it for a later
   * attempt with exponential backoff (capped at 15 min) — an undelivered
   * event (e.g. a critical SOS reassurance) is never deleted for failing.
   * Expired events are the single exception: their moment has passed.
   */
  async drainOutbox(): Promise<DrainReport> {
    if (!this.uid || this.draining) return { replayed: 0, digested: 0, dropped: 0, retried: 0 };
    // Never drain while offline — failed Firestore writes must not eat the queue.
    if (!this.online()) return { replayed: 0, digested: 0, dropped: 0, retried: 0 };
    this.draining = true;
    const report: DrainReport = { replayed: 0, digested: 0, dropped: 0, retried: 0 };
    try {
      const now = Date.now();
      const queued = await this.outbox.list();
      for (const q of queued) {
        if (q.uid !== this.uid) continue;
        // Backoff gate: a failed replay waits its turn — never spins hot.
        if (q.nextRetryAt !== undefined && q.nextRetryAt > now) {
          report.retried += 1;
          continue;
        }
        const verdict = classifyReplay(q, now);
        if (verdict === 'drop') {
          await this.outbox.remove(q.id).catch(() => undefined);
          report.dropped += 1;
          continue;
        }
        try {
          if (verdict === 'digest') {
            const decision = digestOnlyDecision(digestWindowPref(this.prefs));
            const item = this.buildItem(q.uid, q, decision, now);
            const { ok, errors } = await deliver({ uid: q.uid, item, decision });
            if (!ok) throw new Error(errors.join('; ') || 'delivery failed');
            report.digested += 1;
          } else {
            // emitOnline throws when delivery fails — see the catch below.
            await this.emitOnline(q, now);
            report.replayed += 1;
          }
          // Delivered: only now may the entry leave the outbox.
          await this.outbox.remove(q.id).catch(() => undefined);
        } catch (e) {
          // Delivery failed: keep the entry, retry with backoff.
          const attempts = (q.attempts || 0) + 1;
          await this.outbox
            .enqueue({ ...q, attempts, nextRetryAt: now + backoffMs(attempts) })
            .catch(() => undefined);
          report.retried += 1;
        }
      }
    } finally {
      this.draining = false;
    }
    return report;
  }

  // ------------------------------------------------------------ held items
  /**
   * Release pushes whose quiet-hours/DND hold has expired. Called when
   * quiet hours end, when DND is switched off, on configure(), on app
   * foreground (see NotificationWiring), and opportunistically on every
   * emit() via maybeFlushHeld() — the in-app cards were already written
   * at emit time, so this only dispatches the deferred push requests.
   *
   * ARCHITECTURE NOTE: there is deliberately no background timer or
   * scheduler for this. A PWA cannot rely on timers while backgrounded,
   * so held notifications self-release instead: every entry point that
   * means "the devotee is here now" (configure/boot, foreground return,
   * any emit) checks holdUntil and releases what's due.
   */
  async flushHeld(now: number = Date.now()): Promise<number> {
    if (!this.uid) return 0;
    const uid = this.uid;
    let held: Array<{ id: string; holdUntil: number | null }>;
    try {
      held = await this.listHeld(uid);
    } catch {
      return 0;
    }
    let released = 0;
    for (const h of held) {
      if (h.holdUntil !== null && h.holdUntil > now) continue;
      try {
        // The item doc already exists; write the deferred push request and
        // clear the hold so the card reads as delivered.
        const item = await this.readItemForRelease(uid, h.id);
        if (item) {
          const releasedItem: NotificationItem = {
            ...item,
            quietHold: false,
            holdUntil: null,
            updatedAt: now,
          };
          await writePushRequest(uid, releasedItem);
        }
        await updateInAppItem(uid, h.id, { quietHold: false, holdUntil: null });
        released += 1;
      } catch {
        // One stuck item must not block the rest of the release.
      }
    }
    return released;
  }

  private lastFlushHeldAt = 0;

  /**
   * Opportunistic held-release for the self-release contract: runs
   * flushHeld() at most once per 60 seconds so hot paths (every emit,
   * foreground returns) stay cheap while no expired hold waits long.
   */
  async maybeFlushHeld(now: number = Date.now()): Promise<number> {
    if (now - this.lastFlushHeldAt < 60_000) return 0;
    this.lastFlushHeldAt = now;
    return this.flushHeld(now);
  }

  private async readItemForRelease(
    uid: string,
    itemId: string,
  ): Promise<NotificationItem | null> {
    // Minimal re-read: the push payload needs title/body/kind/priority.
    // Any failure → null → the hold is still cleared above.
    try {
      const snap = await getDoc(doc(db, 'notifications', uid, 'items', itemId));
      if (!snap.exists()) return null;
      return snap.data() as NotificationItem;
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------------------ misc
  async acknowledge(itemId: string): Promise<void> {
    if (!this.uid) return;
    await acknowledgeItem(this.uid, itemId);
  }

  async markRead(itemId: string): Promise<void> {
    if (!this.uid) return;
    await markItemRead(this.uid, itemId);
  }

  onOnline(): Promise<DrainReport> {
    return this.drainOutbox();
  }

  private bindNetworkEvents(): void {
    if (this.networkBound || typeof window === 'undefined') return;
    this.networkBound = true;
    window.addEventListener('online', () => {
      void this.drainOutbox().catch(() => undefined);
    });
  }
}

// ------------------------------------------------- default Firestore readers
async function defaultListRecent(uid: string): Promise<GroupCandidate[]> {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
    limit(25),
  );
  const snap = await getDocs(q);
  const out: GroupCandidate[] = [];
  snap.forEach((d) => {
    const v = d.data() as Record<string, unknown>;
    out.push({
      id: d.id,
      dedupeKey: typeof v.dedupeKey === 'string' ? v.dedupeKey : '',
      kind: v.kind as GroupCandidate['kind'],
      priority: v.priority as GroupCandidate['priority'],
      actorUid: (v.actor as { uid?: string } | null)?.uid,
      createdAt: typeof v.createdAt === 'number' ? v.createdAt : 0,
      read: v.read === true,
      groupedCount: typeof v.groupedCount === 'number' ? v.groupedCount : 1,
    });
  });
  return out;
}

async function defaultListHeld(uid: string): Promise<Array<{ id: string; holdUntil: number | null }>> {
  const q = query(
    collection(db, 'notifications', uid, 'items'),
    where('quietHold', '==', true),
    orderBy('holdUntil', 'asc'),
    limit(50),
  );
  const snap = await getDocs(q);
  const out: Array<{ id: string; holdUntil: number | null }> = [];
  snap.forEach((d) => {
    const v = d.data() as Record<string, unknown>;
    out.push({ id: d.id, holdUntil: typeof v.holdUntil === 'number' ? v.holdUntil : null });
  });
  return out;
}

export { NotificationCenter };
export type { GroupCandidate };
