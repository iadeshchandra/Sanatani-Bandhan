/**
 * solo/firstRun.ts — first-run sequencing logic (Step 9).
 * ============================================================================
 * Three welcome surfaces used to fire simultaneously for fresh Solo users:
 *   1. NativeWelcomeSheet (global, App.tsx) — language/region
 *   2. SoloSetupWizard (new) — intent + first activation
 *   3. SoloOnboardingTour — guided tour of the app
 *
 * This module is the pure, testable sequencing brain. The orchestrator
 * component (FirstRunSequence.tsx) polls these predicates and renders
 * exactly one surface at a time.
 *
 * All state is localStorage — first-run is per-browser, never per-account.
 * Every step is skippable; dismissal counts as completion (never nag).
 */

export type FirstRunStep = 'language' | 'setup' | 'tour' | 'done';

/** Keys owned by the pre-existing welcome surfaces — read, never renamed. */
export const LANG_CHOSEN_KEY = 'sb-lang-chosen';
export const LANG_SHEET_DISMISSED_KEY = 'sb-native-sheet-dismissed';
export const TOUR_DONE_KEY = 'sb_solo_tour_done';

/** Keys owned by the new first-run sequence. */
export const SETUP_WIZARD_DONE_KEY = 'sb-setup-wizard-done';
export const FIRST_RUN_DONE_KEY = 'sb-firstrun-done';

function flag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function setFlag(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* ignore — sandboxed iframes */
  }
}

/** Language step is done when the devotee chose or dismissed the sheet. */
export function isLanguageStepDone(): boolean {
  return flag(LANG_CHOSEN_KEY) || flag(LANG_SHEET_DISMISSED_KEY);
}

/** Setup step is done when the wizard was completed or skipped. */
export function isSetupStepDone(): boolean {
  return flag(SETUP_WIZARD_DONE_KEY);
}

export function markSetupWizardDone(): void {
  setFlag(SETUP_WIZARD_DONE_KEY);
}

/** Tour step is done when SoloOnboardingTour recorded completion. */
export function isTourStepDone(): boolean {
  return flag(TOUR_DONE_KEY);
}

export function markFirstRunDone(): void {
  setFlag(FIRST_RUN_DONE_KEY);
}

export function isFirstRunDone(): boolean {
  return flag(FIRST_RUN_DONE_KEY);
}

/**
 * The first incomplete step, in order. Returns 'done' when everything
 * is complete OR when the whole sequence was previously finished.
 */
export function currentFirstRunStep(): FirstRunStep {
  if (isFirstRunDone()) return 'done';
  if (!isLanguageStepDone()) return 'language';
  if (!isSetupStepDone()) return 'setup';
  if (!isTourStepDone()) return 'tour';
  // All steps individually complete but the sequence flag was never set
  // (e.g. returning user from before the sequencer existed) — treat as done.
  markFirstRunDone();
  return 'done';
}

/** Reset all first-run flags (used by tests and the "replay tour" affordance). */
export function resetFirstRun(): void {
  try {
    localStorage.removeItem(SETUP_WIZARD_DONE_KEY);
    localStorage.removeItem(FIRST_RUN_DONE_KEY);
  } catch {
    /* ignore */
  }
}
