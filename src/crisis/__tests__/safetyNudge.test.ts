/**
 * crisis/__tests__/safetyNudge.test.ts — one-time safety nudge logic.
 * =====================================================================
 * Pins the "Who should we call if you're in danger?" prompt rules:
 * show once while the circle is empty, never again after dismissal or
 * setup, and never crash on hostile storage.
 */

import {
  dismissSafetyNudge,
  SAFETY_NUDGE_DISMISSED_KEY,
  shouldShowSafetyNudge,
  type NudgeStorage,
} from '../safetyNudge';

function memStorage(seed: Record<string, string> = {}): NudgeStorage {
  const data = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}

describe('shouldShowSafetyNudge', () => {
  it('shows when the circle is empty and nothing was dismissed', () => {
    expect(shouldShowSafetyNudge(memStorage(), 0)).toBe(true);
  });

  it('hides once a contact exists — setup ends the nudge forever', () => {
    expect(shouldShowSafetyNudge(memStorage(), 1)).toBe(false);
    expect(shouldShowSafetyNudge(memStorage(), 5)).toBe(false);
  });

  it('hides after dismissal, even with an empty circle', () => {
    const s = memStorage({ [SAFETY_NUDGE_DISMISSED_KEY]: '1' });
    expect(shouldShowSafetyNudge(s, 0)).toBe(false);
  });

  it('stays quiet when the count is unknown — no nagging on a guess', () => {
    expect(shouldShowSafetyNudge(memStorage(), null)).toBe(false);
    expect(shouldShowSafetyNudge(null, null)).toBe(false);
  });

  it('fail-opens on a missing storage — a warm prompt is harmless', () => {
    expect(shouldShowSafetyNudge(null, 0)).toBe(true);
  });

  it('survives a throwing storage without crashing', () => {
    const evil: NudgeStorage = {
      getItem: () => {
        throw new Error('quota');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(shouldShowSafetyNudge(evil, 0)).toBe(true);
    expect(() => dismissSafetyNudge(evil)).not.toThrow();
  });
});

describe('dismissSafetyNudge', () => {
  it('writes the dismissal flag', () => {
    const s = memStorage();
    dismissSafetyNudge(s);
    expect(s.getItem(SAFETY_NUDGE_DISMISSED_KEY)).toBe('1');
    expect(shouldShowSafetyNudge(s, 0)).toBe(false);
  });

  it('is a no-op on null storage', () => {
    expect(() => dismissSafetyNudge(null)).not.toThrow();
  });
});
