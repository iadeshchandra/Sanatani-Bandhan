import { useCallback, useEffect, useRef, useState } from 'react';
import { OfflineSyncManager } from '../services/OfflineSyncManager';

/**
 * useOfflineQueueStatus — VIBE B2: the ONE feed behind every offline
 * surface (the floating pill, the home status strip, the queue desks).
 * =====================================================================
 * The canonical outbox is services/OfflineSyncManager — every real
 * producer routes through it (DataContext writes, cash-custody sync,
 * chat/SOS/social actions). It carries two live queues, and the count
 * shown to the user is their honest sum:
 *
 *   · pending Firestore mutations (IndexedDB, getPendingMutations)
 *   · queued actions — SOS / messages / posts (localStorage queue,
 *     entries still PENDING or FAILED)
 *
 * (services/offlineSyncService is a legacy parallel queue with NO
 * producers anywhere in the app — only the old OfflineIndicator ever
 * read it — so it is deliberately not counted: a number the user sees
 * must be a number that will actually be sent.)
 *
 * Freshness: the manager broadcasts on every change
 * ('offline_mutations_updated', 'offline_queue_updated',
 * 'sanatani_network_status'), the browser fires online/offline, and a
 * slow 20 s poll backstops anything missed. Counts are recomputed from
 * the queues on every signal — never cached, never hard-coded.
 */

export interface OfflineQueueStatus {
  online: boolean;
  /** Real queued items waiting to be sent from this device. */
  pending: number;
  /** True until the first read completes (render calm, not "All sent"). */
  loading: boolean;
}

export async function computePendingCount(): Promise<number> {
  let mutations = 0;
  try {
    mutations = (await OfflineSyncManager.getPendingMutations()).length;
  } catch {
    mutations = 0;
  }
  let actions = 0;
  try {
    actions = OfflineSyncManager.getQueue().filter(
      (a) => a.status === 'PENDING' || a.status === 'FAILED',
    ).length;
  } catch {
    actions = 0;
  }
  return mutations + actions;
}

export function useOfflineQueueStatus(): OfflineQueueStatus {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pending, setPending] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const aliveRef = useRef(true);

  const refresh = useCallback(async () => {
    const count = await computePendingCount();
    if (!aliveRef.current) return;
    setPending(count);
    setLoading(false);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    void refresh();

    const onSignal = () => {
      void refresh();
    };
    const onOnline = () => {
      setOnline(true);
      void refresh();
    };
    const onOffline = () => {
      setOnline(false);
      void refresh();
    };

    window.addEventListener('offline_mutations_updated', onSignal);
    window.addEventListener('offline_queue_updated', onSignal);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const unsubNetwork = OfflineSyncManager.onNetworkStatusChange((isOnline) => {
      if (aliveRef.current) setOnline(isOnline);
    });
    const interval = setInterval(onSignal, 20000);

    return () => {
      aliveRef.current = false;
      window.removeEventListener('offline_mutations_updated', onSignal);
      window.removeEventListener('offline_queue_updated', onSignal);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      unsubNetwork();
      clearInterval(interval);
    };
  }, [refresh]);

  return { online, pending, loading };
}
