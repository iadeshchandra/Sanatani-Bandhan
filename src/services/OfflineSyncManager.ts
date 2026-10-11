import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  addDoc,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { get, set } from 'idb-keyval';
import { db, auth } from '../lib/firebase';

export type MutationAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface PendingMutation {
  id: string;
  collectionName: string;
  docId: string;
  action: MutationAction;
  payload: Record<string, any>;
  timestamp: number;
  retryCount: number;
  communityId?: string;
  authorUid?: string;
  lastError?: string;
}

export interface QueuedAction {
  id: string;
  type:
    | 'SOS'
    | 'MESSAGE'
    | 'LOCATION'
    | 'RICH_SOS'
    | 'DIRECT_MESSAGE'
    | 'RESPOND_SOS'
    | 'FORWARD_SOS'
    | 'RESOLVE_SOS'
    | 'POST_SOCIAL'
    | 'PRANAM_POST'
    | 'HIDE_SOCIAL_POST'
    | 'COMMENT_SOCIAL';
  payload: any;
  timestamp: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  communityId?: string;
  authorUid?: string;
}

export interface SyncStats {
  synced: number;
  failed: number;
  discarded: number;
}

const MUTATIONS_STORAGE_KEY = 'sanatani_offline_pending_mutations';
const LEGACY_QUEUE_STORAGE_KEY = 'yatra_offline_queue';
const MAX_RETRY_LIMIT = 5;

// Error codes considered fatal / non-retryable
const HARD_ERROR_CODES = new Set([
  'permission-denied',
  'invalid-argument',
  'not-found',
  'already-exists',
  'unauthenticated',
  'failed-precondition',
  'out-of-range'
]);

/**
 * Enterprise OfflineSyncManager
 * Manages client network status, IndexedDB offline write buffering,
 * automated reconciliation playback, and transactional conflict resilience.
 */
export class OfflineSyncManager {
  private isOnline: boolean;
  private isSyncing: boolean = false;
  private networkListeners: Array<(online: boolean) => void> = [];

  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.initNetworkListeners();
  }

  /**
   * 1. Network Detection
   * Tracks browser network connectivity and attaches lifecycle listeners.
   */
  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyNetworkStatus(true);
      console.log('🌐 [OfflineSyncManager] Network connected. Initiating automated sync reconciliation...');
      this.syncPendingMutations();
      this.flushQueue(); // Maintain sync for legacy social/mesh queues
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyNetworkStatus(false);
      console.warn('📶 [OfflineSyncManager] Device offline. Offline mutations buffered to IndexedDB.');
    });
  }

  public getNetworkStatus(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : this.isOnline;
  }

  public onNetworkStatusChange(callback: (online: boolean) => void): () => void {
    this.networkListeners.push(callback);
    callback(this.getNetworkStatus());
    return () => {
      this.networkListeners = this.networkListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyNetworkStatus(online: boolean): void {
    this.networkListeners.forEach((listener) => {
      try {
        listener(online);
      } catch (err) {
        console.error('[OfflineSyncManager] Network listener callback error:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sanatani_network_status', { detail: { online } }));
    }
  }

  /**
   * 2. IndexedDB Queueing (Offline Buffer)
   * Safely queues writes to local persistent storage using idb-keyval.
   */
  public async getPendingMutations(): Promise<PendingMutation[]> {
    try {
      const stored = await get<PendingMutation[]>(MUTATIONS_STORAGE_KEY);
      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      console.error('[OfflineSyncManager] Failed reading mutations from IndexedDB:', error);
      return [];
    }
  }

  private async savePendingMutations(mutations: PendingMutation[]): Promise<void> {
    try {
      await set(MUTATIONS_STORAGE_KEY, mutations);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('offline_mutations_updated', {
            detail: { count: mutations.length, mutations }
          })
        );
      }
    } catch (error) {
      console.error('[OfflineSyncManager] Failed persisting mutations to IndexedDB:', error);
    }
  }

  /**
   * Public write gateway for components to queue mutations when offline
   * or when deferred consistency is required.
   */
  public async queueMutation(
    mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<PendingMutation> {
    const queue = await this.getPendingMutations();

    const newMutation: PendingMutation = {
      ...mutation,
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      authorUid: auth.currentUser?.uid || mutation.authorUid,
      communityId: mutation.communityId || mutation.payload?.workspaceId || mutation.payload?.communityId
    };

    queue.push(newMutation);
    await this.savePendingMutations(queue);

    console.log(
      `📥 [OfflineSyncManager] Queued mutation [${newMutation.action}] for ${newMutation.collectionName}/${newMutation.docId}`
    );

    // If online, immediately attempt playback
    if (this.getNetworkStatus()) {
      this.syncPendingMutations().catch((err) => {
        console.error('[OfflineSyncManager] Immediate playback attempt failed:', err);
      });
    }

    return newMutation;
  }

  /**
   * 3. Reconciliation & Playback
   * Plays back all queued mutations to Firestore in chronological sequence.
   */
  public async syncPendingMutations(): Promise<SyncStats> {
    if (this.isSyncing) {
      console.log('[OfflineSyncManager] Sync cycle already running. Skipping concurrent trigger.');
      return { synced: 0, failed: 0, discarded: 0 };
    }

    if (!this.getNetworkStatus()) {
      console.log('[OfflineSyncManager] Cannot sync while device is offline.');
      return { synced: 0, failed: 0, discarded: 0 };
    }

    this.isSyncing = true;
    const stats: SyncStats = { synced: 0, failed: 0, discarded: 0 };

    try {
      const queue = await this.getPendingMutations();
      if (queue.length === 0) {
        return stats;
      }

      // Sort chronologically (oldest mutations first to prevent out-of-order state overwrite)
      const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);
      const remainingQueue: PendingMutation[] = [];

      for (const mutation of sortedQueue) {
        // Double-check connectivity between mutation replays
        if (!this.getNetworkStatus()) {
          console.warn('[OfflineSyncManager] Connectivity lost during reconciliation. Pausing playback.');
          remainingQueue.push(mutation);
          continue;
        }

        try {
          await this.executeFirestoreMutation(mutation);
          stats.synced++;
          console.log(`✅ [OfflineSyncManager] Successfully reconciled mutation ${mutation.id}`);
        } catch (error: any) {
          const errorCode = error?.code || '';
          const isHardError = HARD_ERROR_CODES.has(errorCode);
          const reachedMaxRetries = mutation.retryCount + 1 >= MAX_RETRY_LIMIT;

          if (isHardError || reachedMaxRetries) {
            // Discard hard errors or permanently exhausted mutations to unblock queue
            stats.discarded++;
            console.error(
              `⛔ [OfflineSyncManager] Discarding invalid/unauthorized mutation ${mutation.id} (${errorCode || 'Max Retries Exceeded'}):`,
              error
            );
          } else {
            // Transient or network failure: Retain in queue with incremented retry count
            stats.failed++;
            mutation.retryCount += 1;
            mutation.lastError = error?.message || String(error);
            remainingQueue.push(mutation);
            console.warn(
              `⚠️ [OfflineSyncManager] Transient error syncing mutation ${mutation.id} (Attempt ${mutation.retryCount}/${MAX_RETRY_LIMIT}):`,
              error?.message
            );
          }
        }
      }

      await this.savePendingMutations(remainingQueue);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('offline_sync_completed', {
            detail: { ...stats, remaining: remainingQueue.length }
          })
        );
      }

      return stats;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Applies individual mutation to Firestore target doc
   */
  private async executeFirestoreMutation(mutation: PendingMutation): Promise<void> {
    const targetDocRef = doc(db, mutation.collectionName, mutation.docId);

    switch (mutation.action) {
      case 'CREATE': {
        const payloadWithTimestamps = {
          ...mutation.payload,
          id: mutation.docId,
          _offlineSyncId: mutation.id,
          syncedAt: serverTimestamp(),
          originalTimestamp: mutation.timestamp,
          updatedAt: serverTimestamp()
        };
        await setDoc(targetDocRef, payloadWithTimestamps, { merge: true });
        break;
      }

      case 'UPDATE': {
        const updatePayload = {
          ...mutation.payload,
          _lastOfflineSync: mutation.id,
          updatedAt: serverTimestamp()
        };
        await updateDoc(targetDocRef, updatePayload);
        break;
      }

      case 'DELETE': {
        await deleteDoc(targetDocRef);
        break;
      }

      default:
        throw new Error(`Unsupported mutation action: ${(mutation as any).action}`);
    }
  }

  // =========================================================================
  // Backwards Compatibility Gateways (YatraNet, Social Feed & Existing Desks)
  // =========================================================================

  public getQueue(): QueuedAction[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const q = localStorage.getItem(LEGACY_QUEUE_STORAGE_KEY);
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  }

  public setQueue(queue: QueuedAction[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LEGACY_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offline_queue_updated'));
    }
  }

  public addToQueue(type: QueuedAction['type'], payload: any, explicitCommunityId?: string): void {
    const queue = this.getQueue();
    const communityId = explicitCommunityId || payload?.communityId || payload?.workspaceId;
    const authorUid =
      auth.currentUser?.uid ||
      payload?.senderId ||
      payload?.authorId ||
      payload?.responderId ||
      payload?.resolverId ||
      payload?.forwarderId;

    const safePayload = { ...payload };
    if (communityId && !safePayload.communityId && !safePayload.workspaceId) {
      safePayload.communityId = communityId;
    }

    const newAction: QueuedAction = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      payload: safePayload,
      timestamp: Date.now(),
      status: 'PENDING',
      retryCount: 0,
      communityId,
      authorUid
    };

    queue.push(newAction);
    this.setQueue(queue);

    // Native bridge simulation
    if (type === 'RICH_SOS' || type === 'SOS' || type === 'FORWARD_SOS') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('native_mesh_broadcast', { detail: newAction }));
      }
    }

    if (this.getNetworkStatus()) {
      this.flushQueue();
    }
  }

  public async flushQueue(): Promise<void> {
    if (!this.getNetworkStatus()) return;

    const queue = this.getQueue();
    const pending = queue.filter((item) => item.status === 'PENDING' || item.status === 'FAILED');
    if (pending.length === 0) return;

    let hasUpdates = false;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'SYNCED') continue;

      const currentUid = auth.currentUser?.uid;
      if (item.authorUid && currentUid && item.authorUid !== currentUid) {
        continue;
      }
      if (item.authorUid && !currentUid) {
        continue;
      }

      try {
        const boundCommunityId = item.communityId || item.payload?.communityId || item.payload?.workspaceId;

        if (
          item.type === 'SOS' ||
          item.type === 'MESSAGE' ||
          item.type === 'LOCATION' ||
          item.type === 'RICH_SOS' ||
          item.type === 'DIRECT_MESSAGE'
        ) {
          await addDoc(collection(db, 'yatra_broadcasts'), {
            ...item.payload,
            communityId: boundCommunityId,
            syncedAt: serverTimestamp(),
            originalTimestamp: item.timestamp,
            type: item.type
          });
        } else if (item.type === 'RESPOND_SOS' && item.payload?.sosId) {
          await updateDoc(doc(db, 'yatra_broadcasts', item.payload.sosId), {
            sosStatus: 'RESPONDED',
            responderId: item.payload.responderId,
            responderName: item.payload.responderName,
            respondedAt: serverTimestamp()
          });
        } else if (item.type === 'FORWARD_SOS' && item.payload?.sosId) {
          await updateDoc(doc(db, 'yatra_broadcasts', item.payload.sosId), {
            forwardCount: increment(1)
          });
        } else if (item.type === 'RESOLVE_SOS' && item.payload?.sosId) {
          await updateDoc(doc(db, 'yatra_broadcasts', item.payload.sosId), {
            sosStatus: 'RESOLVED',
            resolvedAt: serverTimestamp(),
            resolverId: item.payload.resolverId,
            resolverName: item.payload.resolverName
          });
        } else if (item.type === 'POST_SOCIAL') {
          const workspaceId = boundCommunityId || 'demo';
          const postId = item.payload?.id || `post_${item.timestamp}_${Math.random().toString(36).substring(2, 7)}`;
          await setDoc(doc(db, `communities/${workspaceId}/social_feed`, postId), {
            ...item.payload,
            id: postId,
            workspaceId,
            syncedAt: serverTimestamp()
          });
        } else if (item.type === 'PRANAM_POST') {
          const workspaceId = boundCommunityId;
          const { postId, pranams, flowersOffered, diyasLit } = item.payload;
          if (workspaceId && postId) {
            const updates: any = {};
            if (pranams) updates.pranams = increment(pranams);
            if (flowersOffered) updates.flowersOffered = increment(flowersOffered);
            if (diyasLit) updates.diyasLit = increment(diyasLit);
            await updateDoc(doc(db, `communities/${workspaceId}/social_feed`, postId), updates);
          }
        } else if (item.type === 'HIDE_SOCIAL_POST') {
          const workspaceId = boundCommunityId;
          const { postId } = item.payload;
          if (workspaceId && postId) {
            await updateDoc(doc(db, `communities/${workspaceId}/social_feed`, postId), {
              isHidden: true
            });
          }
        } else if (item.type === 'COMMENT_SOCIAL') {
          const workspaceId = boundCommunityId;
          const { postId, comment } = item.payload;
          if (workspaceId && postId && comment) {
            await updateDoc(doc(db, `communities/${workspaceId}/social_feed`, postId), {
              comments: arrayUnion(comment)
            });
          }
        }

        item.status = 'SYNCED';
        hasUpdates = true;
      } catch (err) {
        console.error('[OfflineSyncManager] Failed to sync legacy queue item', item.id, err);
        item.retryCount += 1;
        item.status = 'FAILED';
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      const newQueue = queue.filter((item) => item.status !== 'SYNCED');
      this.setQueue(newQueue);
    }
  }

  public initListener(): void {
    // Handled in constructor; provided for backward compatibility
  }

  // Static proxy methods to allow both Class and Singleton usage patterns seamlessly
  public static queueMutation(
    mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<PendingMutation> {
    return offlineSyncManager.queueMutation(mutation);
  }

  public static syncPendingMutations(): Promise<SyncStats> {
    return offlineSyncManager.syncPendingMutations();
  }

  public static getPendingMutations(): Promise<PendingMutation[]> {
    return offlineSyncManager.getPendingMutations();
  }

  public static getNetworkStatus(): boolean {
    return offlineSyncManager.getNetworkStatus();
  }

  public static onNetworkStatusChange(callback: (online: boolean) => void): () => void {
    return offlineSyncManager.onNetworkStatusChange(callback);
  }

  public static getQueue(): QueuedAction[] {
    return offlineSyncManager.getQueue();
  }

  public static setQueue(queue: QueuedAction[]): void {
    offlineSyncManager.setQueue(queue);
  }

  public static addToQueue(type: QueuedAction['type'], payload: any, explicitCommunityId?: string): void {
    offlineSyncManager.addToQueue(type, payload, explicitCommunityId);
  }

  public static flushQueue(): Promise<void> {
    return offlineSyncManager.flushQueue();
  }

  public static initListener(): void {
    offlineSyncManager.initListener();
  }
}

// Export singleton instance
export const offlineSyncManager = new OfflineSyncManager();

export default offlineSyncManager;
