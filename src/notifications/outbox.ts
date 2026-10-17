/**
 * notifications/outbox.ts — the offline outbox for queued events.
 * ================================================================
 * Zero-Internet protocol: when the devotee is offline, emitted events are
 * stored locally and replayed on reconnect through the normal priority
 * engine (with the gentle-staleness rule from engine.ts).
 *
 * Storage: native IndexedDB (`sb-notifications` / `outbox`), no new deps.
 * In non-browser environments (tests, SSR) it transparently falls back to
 * an in-memory store with the identical interface.
 */

import type { QueuedEvent } from './types';

export interface OutboxStore {
  enqueue(item: QueuedEvent): Promise<void>;
  list(): Promise<QueuedEvent[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

/** In-memory store — used in tests and wherever IndexedDB is unavailable. */
export class MemoryOutbox implements OutboxStore {
  private items = new Map<string, QueuedEvent>();

  async enqueue(item: QueuedEvent): Promise<void> {
    // Dedupe at the door: same dedupeKey for the same user = same event.
    for (const [id, existing] of this.items) {
      if (existing.uid === item.uid && existing.dedupeKey === item.dedupeKey) {
        this.items.delete(id);
        break;
      }
    }
    this.items.set(item.id, item);
  }

  async list(): Promise<QueuedEvent[]> {
    return [...this.items.values()].sort((a, b) => a.queuedAt - b.queuedAt);
  }

  async remove(id: string): Promise<void> {
    this.items.delete(id);
  }

  async clear(): Promise<void> {
    this.items.clear();
  }
}

const DB_NAME = 'sb-notifications';
const STORE_NAME = 'outbox';
const DB_VERSION = 1;

function indexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

/** Native IndexedDB store — the real offline outbox in the PWA. */
export class IndexedDbOutbox implements OutboxStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('byUid', 'uid', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
      });
    }
    return this.dbPromise;
  }

  private async tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE_NAME, mode);
      const store = t.objectStore(STORE_NAME);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
      t.onerror = () => reject(t.error ?? new Error('IndexedDB transaction failed'));
    });
  }

  async enqueue(item: QueuedEvent): Promise<void> {
    // Dedupe at the door: same dedupeKey for the same user = same event.
    const existing = await this.list();
    const dup = existing.find((e) => e.uid === item.uid && e.dedupeKey === item.dedupeKey);
    if (dup) await this.remove(dup.id);
    await this.tx('readwrite', (s) => s.put(item));
  }

  async list(): Promise<QueuedEvent[]> {
    const items = await this.tx('readonly', (s) => s.getAll());
    return (items as QueuedEvent[]).sort((a, b) => a.queuedAt - b.queuedAt);
  }

  async remove(id: string): Promise<void> {
    await this.tx('readwrite', (s) => s.delete(id));
  }

  async clear(): Promise<void> {
    await this.tx('readwrite', (s) => s.clear());
  }
}

/**
 * The right outbox for this environment. Browser → real IndexedDB;
 * anything else → memory. Callers never need to care which.
 */
export function createOutbox(): OutboxStore {
  return indexedDBAvailable() ? new IndexedDbOutbox() : new MemoryOutbox();
}

/**
 * Exponential backoff for failed outbox replays: 10s, 20s, 40s … capped
 * at 15 minutes. Offline-friendly: a flaky connection retries gently
 * instead of spinning hot, and the event is never deleted for failing.
 */
export function backoffMs(attempts: number): number {
  const step = Math.min(Math.max(Math.floor(attempts), 1), 7);
  return Math.min(10_000 * 2 ** (step - 1), 15 * 60_000);
}
