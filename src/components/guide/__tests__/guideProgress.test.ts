/**
 * guide/__tests__/guideProgress.test.ts — guide progress persistence.
 * =============================================================
 * Pins the state machine's resting behaviour, above all the U8d law:
 * a tour opens only on a tap in the current session. A persisted
 * 'active' left behind by an interrupted session (app killed, tab
 * closed, devotee tapped another tab mid-tour — the coach mark is
 * non-blocking) must NEVER resurrect the tour on the next mount;
 * it decays to 'offered'. Terminal states (done / dismissed) are
 * returned verbatim forever: a finished guide stays finished.
 */

/* In-memory localStorage behind a `window` shim (node test env). */
const memStore: Record<string, string> = {};
const memLocalStorage = {
  getItem: (k: string) => (k in memStore ? memStore[k] : null),
  setItem: (k: string, v: string) => {
    memStore[k] = String(v);
  },
  removeItem: (k: string) => {
    delete memStore[k];
  },
};
(global as unknown as { window: unknown }).window = { localStorage: memLocalStorage };
(global as unknown as { localStorage: unknown }).localStorage = memLocalStorage;

import { getGuideStatus, setGuideStatus, resetGuide } from '../guideProgress';

beforeEach(() => {
  Object.keys(memStore).forEach((k) => delete memStore[k]);
});

describe('getGuideStatus', () => {
  it('defaults to unseen for a devotee who never met the guide', () => {
    expect(getGuideStatus('wallet', 'uid-1')).toBe('unseen');
  });

  it('returns offered verbatim (the pill was shown once; never nag again)', () => {
    setGuideStatus('wallet', 'uid-1', 'offered');
    expect(getGuideStatus('wallet', 'uid-1')).toBe('offered');
  });

  it('returns done verbatim — a completed tour stays done', () => {
    setGuideStatus('wallet', 'uid-1', 'done');
    expect(getGuideStatus('wallet', 'uid-1')).toBe('done');
    expect(getGuideStatus('wallet', 'uid-1')).toBe('done');
  });

  it('returns dismissed verbatim — a skipped tour stays skipped', () => {
    setGuideStatus('wallet', 'uid-1', 'dismissed');
    expect(getGuideStatus('wallet', 'uid-1')).toBe('dismissed');
  });

  it('U8d: a persisted active decays to offered — an interrupted tour never resurrects on mount', () => {
    setGuideStatus('wallet', 'uid-1', 'active');
    // The next mount (a fresh session for the state machine) must not
    // see 'active': the devotee never tapped anything in this session.
    expect(getGuideStatus('wallet', 'uid-1')).toBe('offered');
    // Stable across repeated reads — it cannot flip back to active.
    expect(getGuideStatus('wallet', 'uid-1')).toBe('offered');
  });

  it('U8d: a fresh start after an interruption completes normally to done', () => {
    setGuideStatus('wallet', 'uid-1', 'active'); // interrupted session
    expect(getGuideStatus('wallet', 'uid-1')).toBe('offered');
    setGuideStatus('wallet', 'uid-1', 'active'); // devotee taps "Take a tour"
    setGuideStatus('wallet', 'uid-1', 'done'); // finishes this time
    expect(getGuideStatus('wallet', 'uid-1')).toBe('done');
  });

  it('keeps progress separate per devotee', () => {
    setGuideStatus('wallet', 'uid-1', 'done');
    expect(getGuideStatus('wallet', 'uid-2')).toBe('unseen');
  });

  it('keeps progress separate per guide', () => {
    setGuideStatus('wallet', 'uid-1', 'done');
    expect(getGuideStatus('sos', 'uid-1')).toBe('unseen');
  });
});

describe('resetGuide', () => {
  it('forgets the guide back to unseen', () => {
    setGuideStatus('wallet', 'uid-1', 'done');
    resetGuide('wallet', 'uid-1');
    expect(getGuideStatus('wallet', 'uid-1')).toBe('unseen');
  });
});
