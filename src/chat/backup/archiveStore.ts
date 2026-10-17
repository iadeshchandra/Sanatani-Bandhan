/**
 * chat/backup/archiveStore.ts — read-only archive of restored words.
 * ================================================================
 * Restored backups land HERE (device-local IndexedDB), never back into
 * Firestore. Reasons:
 *  - Writing old messages to shared threads would resurrect them for the
 *    other participant and cost Firestore writes for history we already own.
 *  - The archive is the user's private memory — read, search, reflect.
 *    New words live in live conversations.
 *
 * Tiny promise wrapper over IndexedDB; no new dependencies.
 */
import type { BackupPayload, SerializedThread } from './backupService';

const DB_NAME = 'sb-chat-backup-archive';
const DB_VERSION = 1;
const STORE_THREADS = 'threads';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_THREADS)) {
        db.createObjectStore(STORE_THREADS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('idb-open-failed'));
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_THREADS, mode);
    const req = fn(t.objectStore(STORE_THREADS));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('idb-tx-failed'));
    t.oncomplete = () => db.close();
    t.onerror = () => {
      try {
        db.close();
      } catch {
        /* ignore */
      }
    };
  });
}

/** Replace the archive with a freshly restored payload. */
export async function saveArchive(payload: BackupPayload): Promise<void> {
  const db = await openDb();
  const clearTx = db.transaction(STORE_THREADS, 'readwrite');
  await new Promise<void>((resolve, reject) => {
    const cr = clearTx.objectStore(STORE_THREADS).clear();
    cr.onsuccess = () => resolve();
    cr.onerror = () => reject(cr.error || new Error('idb-clear-failed'));
  });
  await new Promise<void>((resolve, reject) => {
    clearTx.oncomplete = () => resolve();
    clearTx.onerror = () => reject(clearTx.error || new Error('idb-clear-failed'));
  });
  const db2 = await openDb();
  await tx<void>(db2, 'readwrite', (store) => {
    for (const th of payload.threads) store.put(th);
    // Return a dummy request — the puts are what matter.
    return store.count() as unknown as IDBRequest<void>;
  });
  void db;
}

/** All archived threads, newest first. */
export async function listArchivedThreads(): Promise<SerializedThread[]> {
  const db = await openDb();
  const all = await tx<SerializedThread[]>(db, 'readonly', (store) => store.getAll() as unknown as IDBRequest<SerializedThread[]>);
  return (all || []).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** One archived thread with its messages. */
export async function getArchivedThread(id: string): Promise<SerializedThread | null> {
  const db = await openDb();
  const th = await tx<SerializedThread | undefined>(db, 'readonly', (store) => store.get(id) as unknown as IDBRequest<SerializedThread | undefined>);
  return th || null;
}

/** Does any archive exist on this device? */
export async function hasArchive(): Promise<boolean> {
  try {
    const db = await openDb();
    const n = await tx<number>(db, 'readonly', (store) => store.count());
    return n > 0;
  } catch {
    return false;
  }
}
