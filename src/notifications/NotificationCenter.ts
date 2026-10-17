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
import { createOutbox, type OutboxStore } from './outbox';

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
    await deliver({ uid, item, decision });
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
   */
  async drainOutbox(): Promise<DrainReport> {
    if (!this.uid || this.draining) return { replayed: 0, digested: 0, dropped: 0 };
    // Never drain while offline — failed Firestore writes must not eat the queue.
    if (!this.online()) return { replayed: 0, digested: 0, dropped: 0 };
    this.draining = true;
    const report: DrainReport = { replayed: 0, digested: 0, dropped: 0 };
    try {
      const now = Date.now();
      const queued = await this.outbox.list();
      for (const q of queued) {
        if (q.uid !== this.uid) continue;
        const verdict = classifyReplay(q, now);
        if (verdict === 'drop') {
          report.dropped += 1;
        } else if (verdict === 'digest') {
          const decision = digestOnlyDecision(digestWindowPref(this.prefs));
          const item = this.buildItem(q.uid, q, decision, now);
          await deliver({ uid: q.uid, item, decision });
          report.digested += 1;
        } else {
          await this.emitOnline(q, now);
          report.replayed += 1;
        }
        await this.outbox.remove(q.id);
      }
    } finally {
      this.draining = false;
    }
    return report;
  }

  // ------------------------------------------------------------ held items
  /**
   * Release pushes whose quiet-hours/DND hold has expired. Called when
   * quiet hours end (Phase 3 scheduler), when DND is switched off, and on
   * configure() — the in-app cards were already written at emit time.
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
