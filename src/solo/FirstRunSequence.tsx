/**
 * solo/FirstRunSequence.tsx — first-run orchestrator (Step 9).
 * ============================================================================
 * Replaces the three colliding first-run mounts in SoloWorkspaceShell:
 *   - SoloOnboardingTour (was always mounted, self-guarded)
 *   - OnboardingFlow (retired — its intent question lives in the wizard now;
 *     its promised Q2/Q3 were dead copy)
 *
 * The NativeWelcomeSheet stays global in App.tsx (it serves all sessions);
 * the sequencer waits for the language step before showing the wizard.
 *
 * Exactly one surface at a time, each shown once. Polls every 600ms because
 * the language sheet and the tour expose no completion callbacks — they
 * only write their localStorage flags.
 *
 * Design Audit 2 #3: the welcome sheet no longer auto-opens anywhere, so
 * at the language step the sequencer now renders the NativeLanguageStrip
 * — the devotee taps it to open the sheet (confirm sets sb-lang-chosen)
 * or dismisses it (sets sb-native-sheet-dismissed). Either flag completes
 * the step; without this, the step would wait forever.
 */
import React, { useEffect, useState } from 'react';
import { SoloOnboardingTour } from './SoloOnboardingTour';
import { SoloSetupWizard } from './SoloSetupWizard';
import { NativeLanguageStrip } from '../components/language/NativeLanguageStrip';
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

  // Language step: the devotee meets the language strip (audit #3) —
  // tapping it opens the global NativeWelcomeSheet; the sheet's confirm
  // or dismiss (or the strip's own ×) writes the flag the poll waits for.
  if (step === 'language') return <NativeLanguageStrip />;
  if (step === 'done') return null;

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
