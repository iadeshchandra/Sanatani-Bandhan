/**
 * crisis/PanicButton.tsx — the 3-tap SOS entry point.
 * ===================================================
 * Floating button, ≥64px, fixed in the bottom-right thumb zone, rendered in
 * the app shell next to <GlobalSOSListener /> so it is always visible.
 *
 * Activation: press-and-HOLD for 1.5s (pointerdown timer + SVG progress
 * ring). Releasing early cancels silently — no accidental SOS.
 * Warm design: deep amber / maroon, never alarming red.
 * Haptic: navigator.vibrate(…) on activation.
 *
 * Props: onActivate() — the parent (SOSFlow) opens the SituationPicker.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Siren } from 'lucide-react';
import { crisisCopy, useCrisisT } from './crisisStrings';

const HOLD_MS = 1500;
const SIZE = 72; // ≥64px touch target

export const PanicButton: React.FC<{ onActivate: () => void }> = ({ onActivate }) => {
  const t = useCrisisT();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

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
        onActivate();
      }, HOLD_MS);
    },
    [clear, onActivate, tick]
  );

  const radius = 30;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="fixed bottom-5 right-5 z-[9990] flex flex-col items-center gap-1.5 select-none">
      <span
        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md transition-colors ${
          holding ? 'bg-amber-900 text-amber-100' : 'bg-amber-950/90 text-amber-100/90'
        }`}
        aria-hidden
      >
        {holding ? t(crisisCopy.releaseToCancel) : t(crisisCopy.panicHoldHint)}
      </span>
      <button
        type="button"
        aria-label={t(crisisCopy.panicLabel)}
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
      <span className="text-[11px] font-bold text-amber-950 bg-amber-100/95 px-2.5 py-0.5 rounded-full shadow">
        SOS
      </span>
    </div>
  );
};
