/**
 * offlineSyncService.ts — Phase 21: Offline-first mutation queue with real cloud sync.
 * ----------------------------------------------------------------------------
 * IndexedDB-backed outbox ("sanatani-sync-db"):
 *   - STORE_NAME 'mutations'        : pending mutations waiting to flush
 *   - DEAD_LETTER_STORE              : mutations rejected by the cloud with a
 *                                      non-retryable 4xx (kept for inspection /
 *                                      manual retry instead of looping forever)
 *
 * Sync policy:
 *   - Cloud ENABLED  (VITE_CLOUD_API_BASE_URL set): batch pending mutations via
 *     cloudApiClient.syncMutationsBatch(). On 401 → dispatch
 *     'sanatani:cloud-auth-required' and keep items queued. On retryable
 *     failure (network / 429 / 5xx) → keep queued and rethrow so the caller
 *     (OfflineIndicator) backs off. On non-retryable 4xx → move the batch to
 *     the dead-letter store and continue with the next batch.
 *   - Cloud DISABLED: preserve the historical local behavior (log + remove),
 *     but WITHOUT the old simulated 500ms latency. A lightweight
 *     `navigator.onLine` check keeps the queue intact while fully offline.
 */
import { openDB, IDBPDatabase } from 'idb';
import {
  CloudApiError,
  isCloudEnabled,
  getSyncBatchSize,
  syncMutationsBatch,
} from './cloudApiClient';

const DB_NAME = 'sanatani-sync-db';
/** v2 adds the sync_dead_letter store; the v1 'mutations' store is preserved by the upgrade handler. */
const DB_VERSION = 2;
const STORE_NAME = 'mutations';
const DEAD_LETTER_STORE = 'sync_dead_letter';

export interface QueuedMutation {
  id: string;
  collection: string;
  action: 'create' | 'update' | 'delete' | string;
  payload: any;
  timestamp: number;
}

export interface DeadLetterMutation extends QueuedMutation {
  failedAt: number;
  errorCode: string;
  errorMessage: string;
  status: number;
}

/**
 * Initializes and returns the IndexedDB instance for offline mutation queuing.
 */
export const initDB = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      // v2: dead-letter store for non-retryable cloud rejections.
      if (oldVersion < 2 && !db.objectStoreNames.contains(DEAD_LETTER_STORE)) {
        db.createObjectStore(DEAD_LETTER_STORE, { keyPath: 'id' });
      }
    },
  });
};

/**
 * Queues a mutation to IndexedDB when offline or preserving local-first changes.
 */
export const queueMutation = async (
  collection: string,
  action: string,
  payload: any
): Promise<QueuedMutation> => {
  const db = await initDB();
  const mutation: QueuedMutation = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    collection,
    action,
    payload,
    timestamp: Date.now(),
  };

  await db.put(STORE_NAME, mutation);
  console.log(`[OfflineSync] Queued mutation ${mutation.id} for collection "${collection}" [${action}]`);
  return mutation;
};

/**
 * Processes all pending mutations in the IndexedDB queue and syncs with backend/cloud.
 */
export const processSyncQueue = async (): Promise<{ syncedCount: number }> => {
  const db = await initDB();
  const mutations: QueuedMutation[] = await db.getAll(STORE_NAME);

  if (!mutations || mutations.length === 0) {
    return { syncedCount: 0 };
  }

  console.log(`[OfflineSync] Processing ${mutations.length} pending mutation(s)...`);

  if (!isCloudEnabled()) {
    return processLocalQueue(db, mutations);
  }

  return processCloudQueue(db, mutations);
};

/**
 * Cloud-disabled behavior: keep the historical "log + remove" semantics but drop
 * the old simulated network latency. A lightweight `navigator.onLine` check
 * keeps the queue intact while the device is fully offline.
 */
const processLocalQueue = async (
  db: IDBPDatabase,
  mutations: QueuedMutation[]
): Promise<{ syncedCount: number }> => {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (!online) {
    console.log(`[OfflineSync] Device offline — keeping ${mutations.length} mutation(s) queued (cloud disabled).`);
    return { syncedCount: 0 };
  }

  let syncedCount = 0;
  for (const mutation of mutations) {
    console.log(
      `[OfflineSync] Syncing mutation ${mutation.id} -> ${mutation.collection} (${mutation.action}):`,
      mutation.payload
    );
    await db.delete(STORE_NAME, mutation.id);
    syncedCount++;
  }

  console.log(`[OfflineSync] Successfully synced ${syncedCount} mutation(s) [local mode]`);
  return { syncedCount };
};

/**
 * Cloud-enabled behavior: flush pending mutations in batches via
 * POST /v1/sync/mutations.
 */
const processCloudQueue = async (
  db: IDBPDatabase,
  mutations: QueuedMutation[]
): Promise<{ syncedCount: number }> => {
  const batchSize = getSyncBatchSize();
  let syncedCount = 0;
  let authEventDispatched = false;

  for (let i = 0; i < mutations.length; i += batchSize) {
    const batch = mutations.slice(i, i + batchSize);

    try {
      console.log(
        `[OfflineSync] Flushing cloud batch ${Math.floor(i / batchSize) + 1} (${batch.length} mutation(s))...`
      );
      const response = await syncMutationsBatch(batch);

      // Delete accepted mutations; surface any per-item rejections for visibility.
      // (A missing `accepted` array is treated as full acceptance for
      //  backend-compat; an explicit empty array keeps everything queued.)
      const acceptedIds = response.accepted ? new Set(response.accepted) : null;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const mutation of batch) {
        if (acceptedIds === null || acceptedIds.has(mutation.id)) {
          await store.delete(mutation.id);
          syncedCount++;
        } else {
          console.warn(`[OfflineSync] Mutation ${mutation.id} was not accepted by cloud; keeping it queued.`);
        }
      }
      await tx.done;

      if (response.rejected && response.rejected.length > 0) {
        console.warn('[OfflineSync] Cloud rejected mutations in batch:', response.rejected);
      }
    } catch (err) {
      if (err instanceof CloudApiError) {
        // 401 → cloud session dead: notify AuthContext (silent refresh attempt),
        // keep everything queued, and stop this run.
        if (err.status === 401) {
          if (!authEventDispatched) {
            window.dispatchEvent(new CustomEvent('sanatani:cloud-auth-required'));
            authEventDispatched = true;
          }
          console.warn(
            `[OfflineSync] Cloud auth required (401) — keeping ${mutations.length - syncedCount} mutation(s) queued.`
          );
          break;
        }

        // Non-retryable 4xx → quarantine the batch in the dead-letter store
        // so it stops consuming retries; operators can inspect / retry manually.
        if (!err.retryable) {
          console.error(
            `[OfflineSync] Batch rejected with non-retryable ${err.status} (${err.code}) — moving ${batch.length} mutation(s) to dead-letter store.`
          );
          await moveBatchToDeadLetter(db, batch, err);
          continue;
        }
      }

      // Retryable failure (network error / timeout / 429 / 5xx):
      // keep the queue intact and rethrow so the caller backs off.
      console.error(
        `[OfflineSync] Retryable cloud sync failure — keeping ${mutations.length - syncedCount} mutation(s) queued.`,
        err
      );
      throw err;
    }
  }

  console.log(`[OfflineSync] Successfully synced ${syncedCount} mutation(s) [cloud mode]`);
  return { syncedCount };
};

const moveBatchToDeadLetter = async (
  db: IDBPDatabase,
  batch: QueuedMutation[],
  err: CloudApiError
): Promise<void> => {
  const tx = db.transaction([STORE_NAME, DEAD_LETTER_STORE], 'readwrite');
  const deadLetters = tx.objectStore(DEAD_LETTER_STORE);
  const queue = tx.objectStore(STORE_NAME);

  for (const mutation of batch) {
    const deadLetter: DeadLetterMutation = {
      ...mutation,
      failedAt: Date.now(),
      errorCode: err.code,
      errorMessage: err.message,
      status: err.status,
    };
    await deadLetters.put(deadLetter);
    await queue.delete(mutation.id);
  }
  await tx.done;
};

/**
 * Returns the total count of pending mutations currently waiting in the offline queue.
 */
export const getPendingCount = async (): Promise<number> => {
  try {
    const db = await initDB();
    const count = await db.count(STORE_NAME);
    return count;
  } catch (err) {
    console.error('[OfflineSync] Error reading pending mutation count:', err);
    return 0;
  }
};

/**
 * Returns the count of mutations quarantined in the dead-letter store after
 * non-retryable cloud rejections.
 */
export const getDeadLetterCount = async (): Promise<number> => {
  try {
    const db = await initDB();
    return await db.count(DEAD_LETTER_STORE);
  } catch (err) {
    console.error('[OfflineSync] Error reading dead-letter count:', err);
    return 0;
  }
};

/**
 * Moves dead-lettered mutations back into the pending queue and runs a sync pass.
 * Returns the number of dead letters re-queued for retry.
 */
export const retryDeadLetters = async (): Promise<{ retriedCount: number }> => {
  try {
    const db = await initDB();
    const deadLetters: DeadLetterMutation[] = await db.getAll(DEAD_LETTER_STORE);

    if (!deadLetters.length) {
      return { retriedCount: 0 };
    }

    const tx = db.transaction([STORE_NAME, DEAD_LETTER_STORE], 'readwrite');
    const queue = tx.objectStore(STORE_NAME);
    const deadStore = tx.objectStore(DEAD_LETTER_STORE);

    for (const dead of deadLetters) {
      const mutation: QueuedMutation = {
        id: dead.id,
        collection: dead.collection,
        action: dead.action,
        payload: dead.payload,
        timestamp: dead.timestamp,
      };
      await queue.put(mutation);
      await deadStore.delete(dead.id);
    }
    await tx.done;

    console.log(`[OfflineSync] Re-queued ${deadLetters.length} dead-lettered mutation(s) for retry.`);
    await processSyncQueue();
    return { retriedCount: deadLetters.length };
  } catch (err) {
    console.error('[OfflineSync] Error retrying dead-lettered mutations:', err);
    return { retriedCount: 0 };
  }
};
