/**
 * solo/__tests__/firstRun.test.ts — first-run sequencing tests (Step 9).
 */

/* In-memory localStorage (node env). */
const memStore: Record<string, string> = {};
(global as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (k in memStore ? memStore[k] : null),
  setItem: (k: string, v: string) => { memStore[k] = v; },
  removeItem: (k: string) => { delete memStore[k]; },
};

import {
  currentFirstRunStep,
  isLanguageStepDone,
  isSetupStepDone,
  isTourStepDone,
  isFirstRunDone,
  markSetupWizardDone,
  markFirstRunDone,
  resetFirstRun,
  LANG_CHOSEN_KEY,
  LANG_SHEET_DISMISSED_KEY,
  TOUR_DONE_KEY,
  SETUP_WIZARD_DONE_KEY,
  FIRST_RUN_DONE_KEY,
} from '../firstRun';

function clearAll(): void {
  [
    LANG_CHOSEN_KEY,
    LANG_SHEET_DISMISSED_KEY,
    TOUR_DONE_KEY,
    SETUP_WIZARD_DONE_KEY,
    FIRST_RUN_DONE_KEY,
  ].forEach((k) => localStorage.removeItem(k));
}

beforeEach(clearAll);
afterEach(clearAll);

describe('isLanguageStepDone', () => {
  it('is false when nothing is set', () => {
    expect(isLanguageStepDone()).toBe(false);
  });
  it('is true when language was chosen', () => {
    localStorage.setItem(LANG_CHOSEN_KEY, '1');
    expect(isLanguageStepDone()).toBe(true);
  });
  it('is true when the sheet was dismissed (never nag)', () => {
    localStorage.setItem(LANG_SHEET_DISMISSED_KEY, '1');
    expect(isLanguageStepDone()).toBe(true);
  });
});

describe('isSetupStepDone / markSetupWizardDone', () => {
  it('is false initially, true after marking', () => {
    expect(isSetupStepDone()).toBe(false);
    markSetupWizardDone();
    expect(isSetupStepDone()).toBe(true);
  });
});

describe('isTourStepDone', () => {
  it('reads the tour flag', () => {
    expect(isTourStepDone()).toBe(false);
    localStorage.setItem(TOUR_DONE_KEY, '1');
    expect(isTourStepDone()).toBe(true);
  });
});

describe('currentFirstRunStep', () => {
  it('starts at language for a fresh user', () => {
    expect(currentFirstRunStep()).toBe('language');
  });
  it('advances language → setup → tour → done in order', () => {
    expect(currentFirstRunStep()).toBe('language');
    localStorage.setItem(LANG_CHOSEN_KEY, '1');
    expect(currentFirstRunStep()).toBe('setup');
    markSetupWizardDone();
    expect(currentFirstRunStep()).toBe('tour');
    localStorage.setItem(TOUR_DONE_KEY, '1');
    expect(currentFirstRunStep()).toBe('done');
  });
  it('dismissed language sheet still advances (never blocks)', () => {
    localStorage.setItem(LANG_SHEET_DISMISSED_KEY, '1');
    expect(currentFirstRunStep()).toBe('setup');
  });
  it('returns done immediately when the sequence flag is set', () => {
    markFirstRunDone();
    expect(currentFirstRunStep()).toBe('done');
    expect(isFirstRunDone()).toBe(true);
  });
  it('treats all-individually-complete as done (pre-sequencer users)', () => {
    localStorage.setItem(LANG_CHOSEN_KEY, '1');
    markSetupWizardDone();
    localStorage.setItem(TOUR_DONE_KEY, '1');
    expect(currentFirstRunStep()).toBe('done');
    // And the sequence flag gets set for next time.
    expect(isFirstRunDone()).toBe(true);
  });
  it('never shows two steps at once — exactly one current step', () => {
    localStorage.setItem(LANG_CHOSEN_KEY, '1');
    const step = currentFirstRunStep();
    expect(['setup', 'tour', 'done']).toContain(step);
    expect(step).toBe('setup'); // setup must come before tour
  });
});

describe('resetFirstRun', () => {
  it('clears the wizard and sequence flags', () => {
    markSetupWizardDone();
    markFirstRunDone();
    resetFirstRun();
    expect(isSetupStepDone()).toBe(false);
    expect(isFirstRunDone()).toBe(false);
    // Pre-existing surface flags are untouched.
    localStorage.setItem(LANG_CHOSEN_KEY, '1');
    resetFirstRun();
    expect(isLanguageStepDone()).toBe(true);
  });
});
