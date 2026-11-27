/**
 * crisis/PanicButton.tsx — the 3-tap SOS entry point (ALWAYS SURFACED).
 * ================================================================
 * Floating button, fixed in the bottom-right thumb zone, rendered in
 * the app shell next to <GlobalSOSListener /> so it is always visible.
 *
 * SURFACED (owner decision 2026-11-24, closing Test #2 finding F5):
 * the full 72px panic button renders at all times — there is no
 * collapsed mini and no "Show SOS button" reveal step. A person in a
 * crowd crush must reach SOS in one visible place, never hunt a
 * toggle. The accident protection was never the hiding: it is the
 * press-and-HOLD (1.5s, release cancels silently), and the flow's
 * own SituationPicker + Confirm steps behind it — both untouched.
 *
 * History: the button used to collapse to a 48px edge mini (FIX 1 —
 * systemic SOS-overlap fix) that expanded on tap and auto-collapsed
 * after 8s idle / on scroll / on tap-outside. That machinery is
 * retired whole: no collapsed state, no expand/collapse controls,
 * no idle timer. The overlap guarantee survives it — PanicButton
 * publishes `sb-sos-open` on <body> for its whole mounted life, so
 * global CSS (index.css) permanently reserves the EXPANDED
 * footprint's bottom clearance on every scroll container, and no
 * tappable element ever renders underneath the hit area.
 *
 * Activation: press-and-HOLD for 1.5s (pointerdown timer + SVG progress
 * ring). Releasing early cancels silently — no accidental SOS.
 * Warm design: deep amber / maroon, never alarming red.
 * Haptic: navigator.vibrate(…) on activation.
 *
 * Props: onActivate() — the parent (SOSFlow) opens the SituationPicker.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Siren } from 'lucide-react';
import { crisisCopy, useCrisisT } from './crisisStrings';

/**
 * Focused form routes (QUEUED #41): on the auth / org-registration forms
 * the bottom-right anchor floated over the scrolling form card and
 * covered the primary CTA's right end. On these routes the button docks
 * to the top-centre instead — the auth scene's header strip is empty
 * between the Back pill and the language pill — so it stays fully
 * reachable (same full button, same hold-to-fire) while never covering
 * a field or a CTA.
 *
 * QUEUED #52 (audit D12): top-centre alone was not enough — the audit
 * caught the floater over the page's centred "Create workspace" heading.
 * On these routes the button also sets `sb-form-sos` on <body> and
 * index.css reserves the full surfaced cluster's strip at the top of
 * the page, so the dock floats over empty scene only.
 */
const FORM_ROUTES = ['/register-org', '/login', '/signup'];

const HOLD_MS = 1500;
const SIZE = 72; // ≥64px touch target (the full panic button)
const HINT_SEEN_KEY = 'sb_sos_hint_seen';
const SOS_OPEN_CLASS = 'sb-sos-open';
/** QUEUED #52 (audit D12): while the button docks top-centre on a form
 * route, this body class makes the page reserve the cluster's strip at
 * the top (see index.css `body.sb-form-sos`) so it can never sit over
 * the page's centred heading. */
const FORM_SOS_CLASS = 'sb-form-sos';

export const PanicButton: React.FC<{ onActivate: () => void }> = ({ onActivate }) => {
  const t = useCrisisT();
  const { pathname } = useLocation();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  // The "Press and hold 1.5s" hint shows ONCE ever — dismiss forever on first
  // activation, manual dismiss, or a first press attempt (persisted flag).
  const [hintVisible, setHintVisible] = useState(() => {
    try {
      return window.localStorage.getItem(HINT_SEEN_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

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

  // Publish the (now permanent) expanded state on <body> for the whole
  // mounted life, so global CSS reserves the larger bottom clearance
  // while the full button is out — which is always.
  useEffect(() => {
    document.body.classList.add(SOS_OPEN_CLASS);
    return () => {
      document.body.classList.remove(SOS_OPEN_CLASS);
    };
  }, []);

  // QUEUED #52 (audit D12): on form routes the button docks top-centre —
  // publish that on <body> so the page reserves the top strip and its
  // centred heading never slides underneath the floater.
  useEffect(() => {
    const onFormRoute = FORM_ROUTES.includes(pathname);
    document.body.classList.toggle(FORM_SOS_CLASS, onFormRoute);
    return () => {
      document.body.classList.remove(FORM_SOS_CLASS);
    };
  }, [pathname]);

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
    [clear, dismissHintForever, onActivate, tick]
  );

  const radius = 30;
  const circumference = 2 * Math.PI * radius;

  /* Mobile: floats ABOVE the fixed bottom tab bar (~64px) + safe-area;
     desktop keeps the original corner. On focused form routes the
     anchor moves to the top-centre header strip (QUEUED #41) so the
     button can never cover form fields or the primary CTA.
     LAYER LAW (F1, canonical table in index.css): this FAB is the
     top of the FAB layer (z-9990) — above all chrome (≤90), below
     every dialog/sheet/menu (OVERLAY band ≥10010), so an open
     overlay's controls are never underneath it. */
  const anchorCls = FORM_ROUTES.includes(pathname)
    ? 'fixed left-1/2 -translate-x-1/2 top-[calc(10px+env(safe-area-inset-top))] z-[9990] select-none'
    : 'fixed right-5 z-[9990] select-none bottom-[calc(92px+env(safe-area-inset-bottom))] md:bottom-5';

  // ── The full 72px panic button, always rendered. There is no
  // collapsed state and nothing to expand: this is the only face
  // the button has.
  return (
    <div className={`${anchorCls} flex flex-col items-center gap-1.5`}>
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
              onClick={dismissHintForever}
              aria-label={t(crisisCopy.close)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center"
            >
              {/* QUEUED #61 (A3-11): 44px hit area, original 28px visual. */}
              <span className="w-7 h-7 rounded-full bg-amber-950/90 text-amber-100/90 text-sm font-bold flex items-center justify-center shadow-md hover:bg-amber-900">
                ×
              </span>
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        aria-label={t(crisisCopy.panicLabel)}
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
      <span className="text-[11px] font-bold text-amber-950 bg-amber-100/95 px-2.5 py-0.5 rounded-full shadow">
        SOS
      </span>
    </div>
  );
};
