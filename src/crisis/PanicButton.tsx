/**
 * crisis/PanicButton.tsx — the 3-tap SOS entry point (collapsible).
 * ================================================================
 * Floating button, fixed in the bottom-right thumb zone, rendered in
 * the app shell next to <GlobalSOSListener /> so it is always visible.
 *
 * COLLAPSIBLE (FIX 1 — systemic SOS-overlap fix): the default state is a
 * small 48px edge mini. One tap expands the full 72px panic button; it
 * auto-collapses after 8s idle, on any scroll, or on tap-outside. The
 * panic action stays one tap away from anywhere (tap mini → hold 1.5s).
 *
 * Activation: press-and-HOLD for 1.5s (pointerdown timer + SVG progress
 * ring). Releasing early cancels silently — no accidental SOS.
 * Warm design: deep amber / maroon, never alarming red.
 * Haptic: navigator.vibrate(…) on activation.
 *
 * Overlap guarantee: PanicButton toggles `sb-sos-open` on <body> while
 * expanded; global CSS (index.css) reserves bottom clearance on every
 * scroll container for the collapsed AND expanded footprints, so no
 * tappable element ever renders underneath the hit area in either state.
 *
 * Props: onActivate() — the parent (SOSFlow) opens the SituationPicker.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Siren, X } from 'lucide-react';
import { crisisCopy, useCrisisT } from './crisisStrings';

const HOLD_MS = 1500;
const SIZE = 72; // ≥64px touch target (expanded)
const MINI_SIZE = 48; // ≥44px touch target (collapsed mini)
const HINT_SEEN_KEY = 'sb_sos_hint_seen';
const COLLAPSE_IDLE_MS = 8000; // auto-collapse the expanded button when idle
const SOS_OPEN_CLASS = 'sb-sos-open';

export const PanicButton: React.FC<{ onActivate: () => void }> = ({ onActivate }) => {
  const t = useCrisisT();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  // Collapsed by default: a 48px mini that can never swallow a control.
  const [collapsed, setCollapsed] = useState(true);
  // The "Press and hold 1.5s" hint shows ONCE ever — dismiss forever on first
  // activation, manual dismiss, or a first press attempt (persisted flag).
  const [hintVisible, setHintVisible] = useState(() => {
    try {
      return window.localStorage.getItem(HINT_SEEN_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const idleRef = useRef<number | null>(null);

  const dismissHintForever = useCallback(() => {
    try {
      window.localStorage.setItem(HINT_SEEN_KEY, '1');
    } catch {
      /* storage unavailable — hint just reappears next load */
    }
    setHintVisible(false);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setHolding(false);
    setProgress(0);
  }, []);

  useEffect(() => clear, [clear]);

  // Publish the expanded state on <body> so global CSS can reserve the
  // larger bottom clearance while the full button is out.
  useEffect(() => {
    document.body.classList.toggle(SOS_OPEN_CLASS, !collapsed);
    return () => {
      document.body.classList.remove(SOS_OPEN_CLASS);
    };
  }, [collapsed]);

  const collapse = useCallback(() => {
    if (idleRef.current !== null) {
      window.clearTimeout(idleRef.current);
      idleRef.current = null;
    }
    clear(); // a collapse always cancels an in-progress hold
    setCollapsed(true);
  }, [clear]);

  const pokeIdle = useCallback(() => {
    if (idleRef.current !== null) window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => {
      setCollapsed(true);
    }, COLLAPSE_IDLE_MS);
  }, []);

  const expand = useCallback(() => {
    // The one-time hold hint is NOT dismissed here — it appears above the
    // expanded button to teach the hold gesture, and retires on the first
    // hold attempt, activation, or manual dismiss (as before).
    setCollapsed(false);
    pokeIdle();
  }, [pokeIdle]);

  // While expanded: auto-collapse on any scroll (capture catches inner
  // scrollers too) and on tap-outside — the standard transient-FAB
  // dismiss pattern. Taps inside the cluster just reset the idle timer.
  useEffect(() => {
    if (collapsed) return;
    const onScroll = () => setCollapsed(true);
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setCollapsed(true);
      }
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [collapsed]);

  // Clear the idle timer on unmount.
  useEffect(
    () => () => {
      if (idleRef.current !== null) window.clearTimeout(idleRef.current);
    },
    []
  );

  const tick = useCallback(() => {
    const elapsed = performance.now() - startRef.current;
    setProgress(Math.min(1, elapsed / HOLD_MS));
    if (elapsed < HOLD_MS) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const startHold = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      // First press attempt → the one-time hint has served its purpose.
      dismissHintForever();
      // Interacting with the button keeps it expanded a little longer.
      pokeIdle();
      startRef.current = performance.now();
      setHolding(true);
      rafRef.current = requestAnimationFrame(tick);
      timerRef.current = window.setTimeout(() => {
        clear();
        // Haptic on activation — vibrate is guarded for iOS Safari.
        try {
          if ('vibrate' in navigator) navigator.vibrate([60, 40, 60]);
        } catch {
          /* haptics unavailable — visual feedback already given */
        }
        // First real use → the one-time hint never returns.
        dismissHintForever();
        onActivate();
      }, HOLD_MS);
    },
    [clear, dismissHintForever, onActivate, pokeIdle, tick]
  );

  const radius = 30;
  const circumference = 2 * Math.PI * radius;

  /* Mobile: floats ABOVE the fixed bottom tab bar (~64px) + safe-area;
     desktop keeps the original corner. */
  const anchorCls =
    'fixed right-5 z-[9990] select-none bottom-[calc(92px+env(safe-area-inset-bottom))] md:bottom-5';

  // ── Collapsed: the 48px mini — prominent (warm glow + siren) but with
  // a footprint no control can hide behind. One tap expands the full
  // panic button, so help stays one tap away from anywhere.
  if (collapsed) {
    return (
      <div ref={rootRef} className={anchorCls}>
        <button
          type="button"
          aria-label={t(crisisCopy.panicExpand)}
          aria-expanded={false}
          data-guide-anchor="sos-button"
          onClick={expand}
          onContextMenu={(e) => e.preventDefault()}
          className="relative rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70"
          style={{ width: MINI_SIZE, height: MINI_SIZE }}
        >
          {/* Soft warm halo — visibility without alarm */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-full animate-pulse"
            style={{ boxShadow: '0 0 0 6px rgba(251,191,36,0.16), 0 8px 24px rgba(124,45,18,0.45)' }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full flex items-center justify-center shadow-2xl"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, #b45309 0%, #92400e 45%, #7c2d12 100%)',
            }}
          >
            <Siren className="text-amber-100" style={{ width: 22, height: 22 }} />
          </span>
        </button>
      </div>
    );
  }

  // ── Expanded: the full 72px panic button + explicit collapse control.
  return (
    <div ref={rootRef} className={`${anchorCls} flex flex-col items-center gap-1.5`}>
      {/* One-time "Press and hold 1.5s" hint (dismissed forever via
          localStorage); "Release to cancel" still shows during any hold. */}
      {(hintVisible || holding) && (
        <div className="relative flex items-center gap-1.5">
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md transition-colors ${
              holding ? 'bg-amber-900 text-amber-100' : 'bg-amber-950/90 text-amber-100/90'
            }`}
            aria-hidden
          >
            {holding ? t(crisisCopy.releaseToCancel) : t(crisisCopy.panicHoldHint)}
          </span>
          {hintVisible && !holding && (
            <button
              type="button"
              onClick={() => {
                dismissHintForever();
                pokeIdle();
              }}
              aria-label={t(crisisCopy.close)}
              className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-amber-950/90 text-amber-100/90 text-sm font-bold flex items-center justify-center shadow-md hover:bg-amber-900"
            >
              ×
            </button>
          )}
        </div>
      )}
      <div className="relative">
        <button
          type="button"
          aria-label={t(crisisCopy.panicLabel)}
          aria-expanded={true}
          data-guide-anchor="sos-button"
          onPointerDown={startHold}
          onPointerUp={clear}
          onPointerLeave={clear}
          onPointerCancel={clear}
          onContextMenu={(e) => e.preventDefault()}
          className="relative rounded-full touch-none focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70"
          style={{ width: SIZE, height: SIZE }}
        >
          {/* Progress ring */}
          <svg
            viewBox="0 0 72 72"
            className="absolute inset-0 w-full h-full -rotate-90"
            aria-hidden
          >
            <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
            <circle
              cx="36"
              cy="36"
              r={radius}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-75"
            />
          </svg>
          {/* Warm amber/maroon core — deliberately not alarming red */}
          <span
            className={`absolute rounded-full flex items-center justify-center shadow-2xl transition-transform ${
              holding ? 'scale-95' : 'scale-100'
            }`}
            style={{
              inset: 8,
              background: 'radial-gradient(circle at 35% 30%, #b45309 0%, #92400e 45%, #7c2d12 100%)',
              boxShadow: holding
                ? '0 0 0 10px rgba(251,191,36,0.25), 0 10px 30px rgba(124,45,18,0.55)'
                : '0 0 0 4px rgba(251,191,36,0.18), 0 10px 30px rgba(124,45,18,0.45)',
            }}
          >
            <Siren className={`text-amber-100 ${holding ? 'animate-pulse' : ''}`} style={{ width: 30, height: 30 }} />
          </span>
        </button>
        {/* Explicit collapse — the expanded state is transient; this (plus
            tap-outside, scroll, and the 8s idle timer) puts it away. */}
        <button
          type="button"
          onClick={collapse}
          aria-label={t(crisisCopy.panicCollapse)}
          className="absolute -top-2 -right-2 w-8 h-8 min-w-[32px] min-h-[32px] rounded-full bg-stone-900/90 text-amber-100 flex items-center justify-center shadow-lg border border-amber-400/30 hover:bg-stone-800"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>
      <span className="text-[11px] font-bold text-amber-950 bg-amber-100/95 px-2.5 py-0.5 rounded-full shadow">
        SOS
      </span>
    </div>
  );
};
