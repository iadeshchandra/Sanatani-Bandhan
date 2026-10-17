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
import React, { useState, useCallback } from 'react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { PanicButton } from './PanicButton';
import { SituationPicker, type SituationSelection } from './SituationPicker';
import { SOSConfirm } from './SOSConfirm';
import { SOSTimeline } from './SOSTimeline';

type Step = 'idle' | 'pick' | 'confirm' | 'active';

export const SOSFlow: React.FC = () => {
  const { isAuthenticated } = useAuthWorkspace();
  const [step, setStep] = useState<Step>('idle');
  const [selection, setSelection] = useState<SituationSelection | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep('idle');
    setSelection(null);
    setEventId(null);
  }, []);

  if (!isAuthenticated) return null;

  return (
    <>
      <PanicButton onActivate={() => setStep('pick')} />

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
