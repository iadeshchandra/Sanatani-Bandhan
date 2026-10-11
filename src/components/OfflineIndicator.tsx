import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { processSyncQueue, getPendingCount } from '../services/offlineSyncService';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState<boolean>(false);

  // Poll or check pending count on mount and status changes
  const refreshPendingCount = async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  };

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = async () => {
      setIsOnline(true);
      const count = await getPendingCount();
      setPendingCount(count);

      if (count > 0) {
        setIsSyncing(true);
        try {
          await processSyncQueue();
          const remaining = await getPendingCount();
          setPendingCount(remaining);
          setShowSyncSuccess(true);
          setTimeout(() => setShowSyncSuccess(false), 3000);
        } catch (err) {
          console.error('[OfflineIndicator] Sync error:', err);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    const handleOffline = async () => {
      setIsOnline(false);
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check for pending mutations
    const interval = setInterval(refreshPendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await processSyncQueue();
      const count = await getPendingCount();
      setPendingCount(count);
      setShowSyncSuccess(true);
      setTimeout(() => setShowSyncSuccess(false), 3000);
    } catch (err) {
      console.error('[OfflineIndicator] Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // If online, not syncing, and no pending mutations to show, hide pill
  if (isOnline && pendingCount === 0 && !isSyncing && !showSyncSuccess) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* 1. Offline Pill */}
      {!isOnline && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-rose-600 text-white shadow-lg shadow-rose-900/20 text-xs font-bold border border-rose-500">
          <WifiOff className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span>Offline Mode &mdash; {pendingCount} Pending Sync{pendingCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* 2. Syncing Pill */}
      {isOnline && isSyncing && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-amber-500 text-white shadow-lg shadow-amber-900/20 text-xs font-bold border border-amber-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Syncing ({pendingCount} pending)...</span>
        </div>
      )}

      {/* 3. Sync Success Temporary Pill */}
      {isOnline && !isSyncing && showSyncSuccess && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 text-xs font-bold border border-emerald-500">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>All Changes Synced</span>
        </div>
      )}

      {/* 4. Online with Pending Queue Pill */}
      {isOnline && !isSyncing && !showSyncSuccess && pendingCount > 0 && (
        <button
          type="button"
          onClick={triggerManualSync}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-900 text-white shadow-lg text-xs font-bold border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{pendingCount} Pending Syncs &bull; Click to Sync</span>
        </button>
      )}
    </div>
  );
};

export default OfflineIndicator;
