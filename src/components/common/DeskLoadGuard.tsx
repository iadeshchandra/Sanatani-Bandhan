import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react';
import {
  DESK_LOAD_TIMEOUT_MS,
  deskHangSignature,
} from '../../lib/deskLoadTimeout';

interface DeskLoadGuardProps {
  /** Desk id — the caller keys the guard by it, so navigation resets it. */
  moduleId: string;
  /** Called when the user chooses "Back to Command Center". */
  onBackToDashboard: () => void;
  /** Probe delay; defaults to the D-02 law (10s). */
  timeoutMs?: number;
  children: React.ReactNode;
}

/**
 * DeskLoadGuard — the global "no desk spins forever" guarantee
 * (UI/UX audit D-02).
 *
 * Wraps the desk region (Suspense + DeskErrorBoundary + the desk).
 * One probe, DESK_LOAD_TIMEOUT_MS after mount: if the Suspense
 * loading fallback (marked `data-desk-loading`) is still mounted, or
 * the desk area holds literally nothing but a spinner, the desk is
 * judged hung and swapped for an honest error state — Try again
 * (remounts the desk fresh) and Back to Command Center. Desks with
 * real content are never touched: the signature requires zero text
 * plus a spinner, or the still-mounted loading fallback.
 *
 * Complements DeskErrorBoundary (render crashes) — this catches the
 * silent-hang class a boundary cannot see.
 */
export const DeskLoadGuard: React.FC<DeskLoadGuardProps> = ({
  moduleId,
  onBackToDashboard,
  timeoutMs = DESK_LOAD_TIMEOUT_MS,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setTimedOut(false);
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const hung = deskHangSignature({
        hasLoadingMarker: !!el.querySelector('[data-desk-loading]'),
        textLength: (el.textContent || '').trim().length,
        hasSpinner: !!el.querySelector('.animate-spin'),
      });
      if (hung) setTimedOut(true);
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [moduleId, attempt, timeoutMs]);

  if (timedOut) {
    return (
      <div
        role="alert"
        data-testid="desk-load-timeout"
        className="flex flex-col items-center justify-center text-center px-6 py-16"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7 text-amber-700" aria-hidden="true" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700 mb-2">
          ॥ धर्मो रक्षति रक्षितः ॥
        </p>
        <h2 className="text-xl font-extrabold text-stone-900 mb-2">
          This desk is taking too long to load
        </h2>
        <p className="text-sm text-stone-500 font-medium max-w-md leading-relaxed mb-1">
          It may be a slow connection, or the desk hit a problem while
          loading. Nothing else is affected — your header, sidebar and
          navigation keep working.
        </p>
        <p className="text-xs text-stone-400 font-medium mb-6">
          Desk: <span className="font-bold text-stone-600">{moduleId}</span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-colors cursor-pointer min-h-[44px]"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Try again
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-sm font-bold transition-colors cursor-pointer min-h-[44px]"
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            Back to Command Center
          </button>
        </div>
      </div>
    );
  }

  // `display: contents` — the probe wrapper adds no layout box, so the
  // desk region lays out exactly as if the guard were not there.
  return (
    <div ref={containerRef} className="contents">
      {children}
    </div>
  );
};
