/**
 * solo/FirstRunSequence.tsx — first-run orchestrator (Step 9).
 * ============================================================================
 * Replaces the three colliding first-run mounts in SoloWorkspaceShell:
 *   - SoloOnboardingTour (was always mounted, self-guarded)
 *   - OnboardingFlow (retired — its intent question lives in the wizard now;
 *     its promised Q2/Q3 were dead copy)
 *
 * The NativeWelcomeSheet stays global in App.tsx (it serves all sessions);
 * the sequencer simply waits for the language step before showing the wizard.
 *
 * Exactly one surface at a time, each shown once. Polls every 600ms because
 * the language sheet and the tour expose no completion callbacks — they
 * only write their localStorage flags.
 */
import React, { useEffect, useState } from 'react';
import { SoloOnboardingTour } from './SoloOnboardingTour';
import { SoloSetupWizard } from './SoloSetupWizard';
import {
  currentFirstRunStep,
  type FirstRunStep,
} from './firstRun';

export const FirstRunSequence: React.FC<{
  uid: string;
  onNavigate: (tab: string) => void;
}> = ({ uid, onNavigate }) => {
  const [step, setStep] = useState<FirstRunStep>(() => currentFirstRunStep());

  useEffect(() => {
    if (step === 'done') return;
    const timer = setInterval(() => {
      const next = currentFirstRunStep();
      setStep((prev) => (prev === next ? prev : next));
    }, 600);
    return () => clearInterval(timer);
  }, [step]);

  // Language step: the global NativeWelcomeSheet (App.tsx) handles the UI.
  // We render nothing and wait for its flag.
  if (step === 'language' || step === 'done') return null;

  if (step === 'setup') {
    return (
      <SoloSetupWizard
        uid={uid}
        onDone={() => setStep(currentFirstRunStep())}
      />
    );
  }

  // step === 'tour'
  return <SoloOnboardingTour onNavigate={onNavigate} />;
};
