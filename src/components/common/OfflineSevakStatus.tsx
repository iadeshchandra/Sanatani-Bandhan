import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CloudUpload, WifiOff } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useOfflineQueueStatus } from '../../hooks/useOfflineQueueStatus';

/**
 * OfflineSevakStatus — VIBE B2: the offline vocabulary, completed.
 * =====================================================================
 * Design North-Star: offline is framed as strength — "The temple works
 * without signal; everything syncs when you return." One shared
 * component, fed by the real sync-queue state (useOfflineQueueStatus),
 * speaks it everywhere in the user's language:
 *
 *   · offline          → "You are offline — everything keeps working"
 *                        (+ "Saved on this phone (n)" when work waits)
 *   · online, n > 0    → "Saved on this phone (n)"
 *   · online, n = 0    → "All sent" (bar variant; the pill shows it
 *                        briefly after a real drain, then rests)
 *
 * The count is the queue's own count — never typed, never simulated.
 * No red shouting (refusals law): brass/peacock sanctum tones only.
 *
 * Variants:
 *   · 'bar'  — a slim strip mounted on the homes and the queue desks
 *              (Hundi/Cash Custody, Treasury). Always present, calm.
 *   · 'pill' — the floating app-wide indicator (bottom-left); renders
 *              nothing while online with an empty queue, except the
 *              brief "All sent" moment right after a drain it observed.
 */

interface StatusFace {
  online: boolean;
  pending: number;
  loading: boolean;
}

const Face: React.FC<StatusFace & { t: (key: string) => string }> = ({ online, pending, loading, t }) => {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 text-temple-400">
        <span className="w-2 h-2 rounded-full bg-brass-300 animate-pulse" aria-hidden="true" />
        <span className="sr-only">…</span>
      </span>
    );
  }
  if (!online) {
    return (
      <span className="inline-flex items-center gap-2 flex-wrap">
        <WifiOff className="w-4 h-4 text-brass-600 shrink-0" aria-hidden="true" />
        <span>{t('vibe.offlineWorking')}</span>
        {pending > 0 && (
          <span className="font-bold text-temple-800">
            · {t('vibe.savedOnPhone').replace('{count}', String(pending))}
          </span>
        )}
      </span>
    );
  }
  if (pending > 0) {
    return (
      <span className="inline-flex items-center gap-2">
        <CloudUpload className="w-4 h-4 text-brass-600 shrink-0" aria-hidden="true" />
        <span className="font-bold text-temple-800">
          {t('vibe.savedOnPhone').replace('{count}', String(pending))}
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 text-peacock-600 shrink-0" aria-hidden="true" />
      <span>{t('vibe.allSent')}</span>
    </span>
  );
};

export const OfflineSevakStatus: React.FC<{
  variant?: 'bar' | 'pill';
  className?: string;
}> = ({ variant = 'bar', className = '' }) => {
  const { t } = useLanguage();
  const status = useOfflineQueueStatus();

  // Pill drain memory: show "All sent" for a few seconds only when THIS
  // mount watched a real queue go from waiting to empty while online.
  const prevPendingRef = useRef<number | null>(null);
  const [drainedAt, setDrainedAt] = useState<number>(0);
  useEffect(() => {
    if (status.loading) return;
    const prev = prevPendingRef.current;
    prevPendingRef.current = status.pending;
    if (prev !== null && prev > 0 && status.pending === 0 && status.online) {
      setDrainedAt(Date.now());
      const timer = setTimeout(() => setDrainedAt(0), 4000);
      return () => clearTimeout(timer);
    }
  }, [status.pending, status.online, status.loading]);

  if (variant === 'pill') {
    const showAllSent = drainedAt > 0 && status.pending === 0 && status.online;
    if (status.online && status.pending === 0 && !showAllSent) return null;
    return (
      <div
        role="status"
        className="fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div className="sanctum-header lamplight flex items-center rounded-full border border-brass-200 px-4 py-2.5 text-xs font-semibold text-temple-700 shadow-lg shadow-brass-900/10">
          <Face {...status} t={t} />
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`flex items-center rounded-xl border border-brass-200 bg-white/70 px-3.5 py-2 text-xs font-medium text-temple-600 ${className}`}
    >
      <Face {...status} t={t} />
    </div>
  );
};

export default OfflineSevakStatus;
