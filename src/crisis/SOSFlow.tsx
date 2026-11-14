/**
 * crisis/SOSFlow.tsx — orchestrates the 3-tap SOS flow.
 * =====================================================
 * PanicButton (hold 1.5s) → SituationPicker (tap 1) → SOSConfirm (tap 2:
 * big Confirm) → SOSTimeline (tap 3 is implicit: the SOS is live).
 *
 * Mount ONCE in the app shell, next to <GlobalSOSListener />:
 *
 *   import { SOSFlow } from './crisis/SOSFlow';
 *   …
 *   <GlobalSOSListener />
 *   <SOSFlow />
 *
 * Only rendered for authenticated users; the PanicButton is the only
 * always-visible element (the modals mount on demand).
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { PanicButton } from './PanicButton';
import { SituationPicker, type SituationSelection } from './SituationPicker';
import { SOSConfirm } from './SOSConfirm';
import { SOSTimeline } from './SOSTimeline';
import { GUIDES, useGuide, TourPill, CoachMark } from '../components/guide';
import { SOS_OPEN_EVENT } from './sosEntry';
import { useAnyOverlayOpen } from '../lib/overlaySignal';

type Step = 'idle' | 'pick' | 'confirm' | 'active';

/**
 * Design Audit 2 #2: the SOS tour pill's dismissal is a DEVICE-level
 * promise — once a devotee dismisses it, it never returns, across
 * sessions and across accounts on the same phone. The guide store is
 * per-uid (`sb-guide-v1:<uid>:sos`); a fresh uid (signed out → in, a
 * new demo session) used to resurrect the pill, which is exactly the
 * "lives on every screen" behaviour the audit flagged. This flag is
 * keyed to the device, not the account, and is only ever SET by an
 * explicit dismiss tap — never by merely showing the pill.
 */
const SOS_PILL_DISMISSED_KEY = 'sb-sos-tour-pill-dismissed';

function sosPillDismissed(): boolean {
  try {
    return localStorage.getItem(SOS_PILL_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export const SOSFlow: React.FC = () => {
  const { isAuthenticated, firebaseUser } = useAuthWorkspace();
  const [step, setStep] = useState<Step>('idle');
  const [selection, setSelection] = useState<SituationSelection | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  // Quick Guide: "what happens when you press" — invitational, never
  // auto-playing; the pill shows once, the tour is always re-runnable.
  const uid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  const sosGuide = useGuide('sos', uid);
  // Design Audit 2 #2: the pill yields while any wired overlay (tour
  // card, sheet, modal) is on screen, and never returns once dismissed.
  const overlayOpen = useAnyOverlayOpen();
  const [pillDismissed, setPillDismissed] = useState<boolean>(() => sosPillDismissed());

  const dismissSosPill = useCallback(() => {
    try {
      localStorage.setItem(SOS_PILL_DISMISSED_KEY, '1');
    } catch {
      /* ignore — the per-uid guide dismissal below still applies */
    }
    setPillDismissed(true);
    sosGuide.dismissPill();
  }, [sosGuide]);

  const reset = useCallback(() => {
    setStep('idle');
    setSelection(null);
    setEventId(null);
  }, []);

  // FIX 1 (systemic SOS overlap): the FAB only renders for authenticated
  // sessions. Publish its presence on <body> so global CSS can reserve
  // matching bottom clearance on every scroll container — logged-out
  // pages (landing, login) are untouched.
  useEffect(() => {
    if (isAuthenticated) document.body.classList.add('sb-has-sos');
    else document.body.classList.remove('sb-has-sos');
    return () => {
      document.body.classList.remove('sb-has-sos');
    };
  }, [isAuthenticated]);

  // Programmatic SOS entry (e.g. the AI assistant's `sos` responses call
  // openSosFlow() from crisis/sosEntry). The flow itself stays the single
  // implementation — this is just another door into it.
  useEffect(() => {
    const onOpen = () => setStep('pick');
    window.addEventListener(SOS_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SOS_OPEN_EVENT, onOpen);
  }, []);

  if (!isAuthenticated) return null;

  return (
    <>
      {/* The panic button hides while the SOS flow's own modals are up
          (pick/confirm/active render at z-[9995], above the FAB) — the
          flow is already in hand, so the entry point is redundant. */}
      {step === 'idle' && <PanicButton onActivate={() => setStep('pick')} />}
      {sosGuide.pillVisible && !pillDismissed && !overlayOpen && (
        <TourPill
          guide={GUIDES.sos}
          uid={uid}
          onStart={sosGuide.start}
          onDismiss={dismissSosPill}
        />
      )}
      {sosGuide.tourActive && <CoachMark guide={GUIDES.sos} onFinish={sosGuide.finish} />}

      {step === 'pick' && (
        <SituationPicker
          onClose={reset}
          onSelect={(sel) => {
            setSelection(sel);
            setStep('confirm');
          }}
        />
      )}

      {step === 'confirm' && selection && (
        <SOSConfirm
          selection={selection}
          onCancel={reset}
          onRestartTour={() => {
            // The tour always runs from the calm idle state — close the
            // confirm sheet first so the spotlight can find its anchors.
            reset();
            sosGuide.restart();
          }}
          onSent={(id) => {
            setEventId(id);
            setStep('active');
          }}
        />
      )}

      {step === 'active' && eventId && <SOSTimeline eventId={eventId} onClose={reset} />}
    </>
  );
};
