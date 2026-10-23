/**
 * firstRunDialogs.test.ts — UI/UX audit D-16 pins.
 *
 * D-16: entering the demo stacked the one-time privacy notice and the
 * guided-tour card in the same frame, and the language welcome sheet
 * listed its two big-card languages again in the full list below.
 *
 * The queue (lib/firstRunDialogs) is the sequencing law: one first-run
 * surface at a time, in priority order (privacy 0 → language 1 →
 * tour 2), each waiting for the previous to close. These tests pin
 * the pure queue semantics plus the wiring contracts of the three
 * surfaces that hold turns, and the picker de-duplication.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  FIRST_RUN_PRIORITY,
  _resetFirstRunDialogs,
  activeFirstRunDialog,
  isFirstRunDialogActive,
  releaseFirstRunDialog,
  requestFirstRunDialog,
} from '../firstRunDialogs';

const root = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf-8');

beforeEach(() => _resetFirstRunDialogs());

describe('D-16 — the first-run queue: one dialog at a time, in order', () => {
  it('a single requester is active immediately', () => {
    expect(requestFirstRunDialog('privacy-notice', FIRST_RUN_PRIORITY.privacy)).toBe('privacy-notice');
    expect(isFirstRunDialogActive('privacy-notice')).toBe(true);
  });

  it('the tour waits while the privacy notice holds the turn', () => {
    requestFirstRunDialog('privacy-notice', FIRST_RUN_PRIORITY.privacy);
    expect(requestFirstRunDialog('demo-tour', FIRST_RUN_PRIORITY.tour)).toBe('privacy-notice');
    expect(isFirstRunDialogActive('demo-tour')).toBe(false);
  });

  it('priority beats arrival order: privacy preempts a tour that asked first', () => {
    requestFirstRunDialog('demo-tour', FIRST_RUN_PRIORITY.tour);
    expect(activeFirstRunDialog()).toBe('demo-tour');
    requestFirstRunDialog('privacy-notice', FIRST_RUN_PRIORITY.privacy);
    expect(activeFirstRunDialog()).toBe('privacy-notice');
    expect(isFirstRunDialogActive('demo-tour')).toBe(false);
  });

  it('releasing the holder advances the queue to the next waiter', () => {
    requestFirstRunDialog('demo-tour', FIRST_RUN_PRIORITY.tour);
    requestFirstRunDialog('privacy-notice', FIRST_RUN_PRIORITY.privacy);
    requestFirstRunDialog('native-language', FIRST_RUN_PRIORITY.language);
    expect(releaseFirstRunDialog('privacy-notice')).toBe('native-language');
    expect(releaseFirstRunDialog('native-language')).toBe('demo-tour');
    expect(releaseFirstRunDialog('demo-tour')).toBeNull();
    expect(activeFirstRunDialog()).toBeNull();
  });

  it('equal priorities resolve first-come-first-served', () => {
    requestFirstRunDialog('b-surface', 5);
    requestFirstRunDialog('a-surface', 5);
    expect(activeFirstRunDialog()).toBe('b-surface');
    releaseFirstRunDialog('b-surface');
    expect(activeFirstRunDialog()).toBe('a-surface');
  });

  it('re-requesting the same id is idempotent and keeps its place', () => {
    requestFirstRunDialog('demo-tour', FIRST_RUN_PRIORITY.tour);
    requestFirstRunDialog('native-language', FIRST_RUN_PRIORITY.language);
    expect(requestFirstRunDialog('demo-tour', FIRST_RUN_PRIORITY.tour)).toBe('native-language');
    releaseFirstRunDialog('native-language');
    expect(activeFirstRunDialog()).toBe('demo-tour');
  });

  it('releasing an id that never requested is a harmless no-op', () => {
    requestFirstRunDialog('demo-tour', FIRST_RUN_PRIORITY.tour);
    expect(releaseFirstRunDialog('never-asked')).toBe('demo-tour');
    expect(activeFirstRunDialog()).toBe('demo-tour');
  });

  it('a surface that closed unmarked can request again later (privacy "Not now")', () => {
    requestFirstRunDialog('privacy-notice', FIRST_RUN_PRIORITY.privacy);
    releaseFirstRunDialog('privacy-notice');
    expect(requestFirstRunDialog('privacy-notice', FIRST_RUN_PRIORITY.privacy)).toBe('privacy-notice');
  });
});

describe('D-16 — wiring contracts: the three first-run surfaces hold turns', () => {
  it('the privacy gate requests the privacy turn and releases on close', () => {
    const gate = read('src/components/account/PrivacyNotice.tsx');
    expect(gate).toContain("requestFirstRunDialog('privacy-notice', FIRST_RUN_PRIORITY.privacy)");
    expect(gate).toContain("releaseFirstRunDialog('privacy-notice')");
    expect(gate).toContain('FIRST_RUN_DIALOGS_CHANGED');
  });

  it('the demo tour requests the tour turn and renders only on its turn', () => {
    const tour = read('src/components/public/DemoTour.tsx');
    expect(tour).toContain("requestFirstRunDialog('demo-tour', FIRST_RUN_PRIORITY.tour)");
    expect(tour).toContain("releaseFirstRunDialog('demo-tour')");
    expect(tour).toContain("turn !== 'demo-tour'");
  });

  it('the language welcome sheet requests the language turn', () => {
    const sheet = read('src/components/language/NativeWelcomeSheet.tsx');
    expect(sheet).toContain("requestFirstRunDialog('native-language', FIRST_RUN_PRIORITY.language)");
    expect(sheet).toContain("releaseFirstRunDialog('native-language')");
    expect(sheet).toContain("turn !== 'native-language'");
  });
});

describe('D-16 — the language sheet never lists a language twice', () => {
  it('the full list excludes the two big-card languages in low-confidence mode', () => {
    const sheet = read('src/components/language/NativeWelcomeSheet.tsx');
    // The list is filtered by the presented card codes when the cards show.
    expect(sheet).toContain('const listLanguages = lowConfidence');
    expect(sheet).toContain('!top2.includes(l.code)');
    expect(sheet).toContain('listLanguages.map((l)');
  });
});
