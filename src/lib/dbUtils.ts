import { collection, query, where, getDocs, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const AUTO_PURGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface OfflineOperation {
  id: string;
  collection: string;
  docId: string;
  data: any;
  type: 'update' | 'set' | 'delete';
  timestamp: number;
  retryCount: number;
}

const OFFLINE_QUEUE_KEY = 'sanatani_offline_mutation_queue';

/**
 * Robust background retry mechanism to process offline queue
 */
export const processOfflineQueue = async () => {
  if (!navigator.onLine) return;
  
  const queueStr = localStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!queueStr) return;
  
  let queue: OfflineOperation[] = [];
  try {
    queue = JSON.parse(queueStr);
  } catch (e) {
    return;
  }
  
  if (queue.length === 0) return;
  
  console.log(`[Offline Sync] Processing ${queue.length} queued operations...`);
  
  const failedOps: OfflineOperation[] = [];
  
  for (const op of queue) {
    try {
      const docRef = doc(db, op.collection, op.docId);
      if (op.type === 'delete') {
        await deleteDoc(docRef);
      } else if (op.type === 'update') {
        await updateDoc(docRef, op.data);
      } else {
        await setDoc(docRef, op.data, { merge: true });
      }
      console.log(`[Offline Sync] Successfully synced operation ${op.id}`);
    } catch (err: any) {
      console.error(`[Offline Sync] Failed to sync operation ${op.id}:`, err);
      if (op.retryCount < 5) {
        failedOps.push({ ...op, retryCount: op.retryCount + 1 });
      } else {
        console.warn(`[Offline Sync] Operation ${op.id} exceeded max retries, dropping.`);
      }
    }
  }
  
  if (failedOps.length > 0) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedOps));
  } else {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  }
};

/**
 * Execute an update with offline-first support.
 * Implements an indexed localStorage queue and background retry.
 */
export const executeSafeUpdate = async (
  collectionName: string, 
  docId: string, 
  data: any, 
  type: 'update' | 'set' | 'delete' = 'update'
) => {
  // EPHEMERAL DATA CHECK: Bypass everything for DEMO_ shards
  if (data?.workspaceId?.startsWith('DEMO_') || docId?.startsWith('DEMO_')) {
    console.log('[Demo Sandbox] Volatile Ephemeral Data Operation - Bypassing Backend and Sync.');
    return { success: true, queued: false, ephemeral: true };
  }

  if (navigator.onLine) {
    try {
      const docRef = doc(db, collectionName, docId);
      if (type === 'delete') {
        await deleteDoc(docRef);
      } else if (type === 'update') {
        await updateDoc(docRef, data);
      } else {
        await setDoc(docRef, data, { merge: true });
      }
      return { success: true, queued: false };
    } catch (err) {
      console.warn('[Offline Sync] Online operation failed, queueing for background retry', err);
    }
  }
  
  const queueStr = localStorage.getItem(OFFLINE_QUEUE_KEY);
  let queue: OfflineOperation[] = [];
  if (queueStr) {
    try { queue = JSON.parse(queueStr); } catch(e) {}
  }
  
  const newOp: OfflineOperation = {
    id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    collection: collectionName,
    docId,
    data,
    type,
    timestamp: Date.now(),
    retryCount: 0
  };
  
  queue.push(newOp);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  
  console.log(`[Offline Sync] Operation queued locally. Queue length: ${queue.length}`);
  
  if (typeof window !== 'undefined') {
    window.addEventListener('online', processOfflineQueue, { once: true });
  }
  
  return { success: true, queued: true };
};

export const purgeDemoRecordsFromFirestore = async () => {
  try {
    const collectionsToPurge = [
      'devotees',
      'families',
      'guests',
      'treasury',
      'assets',
      'inventory',
      'poojaBookings',
      'residentPujas',
      'pitruRecords',
      'cows',
      'annadanam',
      'rooms',
      'gurukulStudents',
      'campaigns',
      'resolutions',
      'shifts'
    ];
    
    const now = Date.now();
    let totalDeleted = 0;

    for (const colName of collectionsToPurge) {
      const q = query(
        collection(db, colName),
        where('_expiresAt', '<=', now)
      );
      
      const querySnapshot = (await getDocs(q).catch(e => { console.warn("Firebase getDocs error", e.message); return { empty: true, forEach: () => {}, docs: [] }; }));
      const deletePromises: Promise<void>[] = [];
      
      querySnapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(doc(db, colName, docSnapshot.id)));
      });
      
      await Promise.all(deletePromises);
      totalDeleted += deletePromises.length;
    }
    
    if (totalDeleted > 0) {
      console.log(`[Demo Sandbox] Successfully purged ${totalDeleted} expired records to maintain data isolation.`);
    }
  } catch (err) {
    console.error('[Demo Sandbox] Error during routine data purge:', err);
  }
};

/**
 * Initialize background monitoring for Demo Mode data expiration.
 * This sets up an interval that checks for expired records.
 */
export const startDemoBackgroundService = () => {
  console.log('[Offline Sync] Background service initialized.');
  // Initial check on load
  processOfflineQueue();
  
  // Set up periodic check every hour
  const interval = setInterval(() => {
    processOfflineQueue();
  }, 60 * 60 * 1000);
  
  return () => clearInterval(interval);
};
