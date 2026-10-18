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

type Step = 'idle' | 'pick' | 'confirm' | 'active';

export const SOSFlow: React.FC = () => {
  const { isAuthenticated, firebaseUser } = useAuthWorkspace();
  const [step, setStep] = useState<Step>('idle');
  const [selection, setSelection] = useState<SituationSelection | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  // Quick Guide: "what happens when you press" — invitational, never
  // auto-playing; the pill shows once, the tour is always re-runnable.
  const uid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  const sosGuide = useGuide('sos', uid);

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

  if (!isAuthenticated) return null;

  return (
    <>
      {/* The panic button hides while the SOS flow's own modals are up
          (pick/confirm/active render at z-[9995], above the FAB) — the
          flow is already in hand, so the entry point is redundant. */}
      {step === 'idle' && <PanicButton onActivate={() => setStep('pick')} />}
      {sosGuide.pillVisible && (
        <TourPill
          guide={GUIDES.sos}
          uid={uid}
          onStart={sosGuide.start}
          onDismiss={sosGuide.dismissPill}
          className="!left-auto !translate-x-0 right-5 bottom-[calc(180px+env(safe-area-inset-bottom))] md:bottom-24"
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
