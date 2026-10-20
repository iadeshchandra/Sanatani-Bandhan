/**
 * crisis/safetyNudge.ts — one-time "set up your safety circle" nudge.
 * =====================================================================
 * Pure, jest-safe logic for the warm prompt in Profile → 🛡️ Safety:
 * "Who should we call if you're in danger?" The nudge appears only
 * while the family circle is empty AND the devotee has not dismissed
 * it. Dismissal is permanent (localStorage flag) — we ask once, with
 * dignity, and never nag. Adding a contact also ends it forever:
 * the circle is no longer empty.
 *
 * Storage is injected so tests never touch a real localStorage and a
 * storage failure can never crash the profile (fail-open: a broken
 * store means "not dismissed", the nudge simply shows).
 */

export const SAFETY_NUDGE_DISMISSED_KEY = 'sb.safetyNudge.dismissed';

export interface NudgeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The browser's localStorage, or null when unavailable (SSR/tests). */
export function browserNudgeStorage(): NudgeStorage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Should the one-time safety nudge be visible?
 * - `contactsCount === null` means "not loaded yet / load failed" —
 *   stay quiet rather than nag on a guess.
 * - A non-empty circle never shows it (setup already done).
 * - Dismissed once = never again.
 */
export function shouldShowSafetyNudge(
  storage: NudgeStorage | null,
  contactsCount: number | null,
): boolean {
  if (contactsCount === null) return false;
  if (contactsCount > 0) return false;
  if (!storage) return true;
  try {
    return storage.getItem(SAFETY_NUDGE_DISMISSED_KEY) !== '1';
  } catch {
    return true;
  }
}

/** Record the one-time dismissal. Never throws. */
export function dismissSafetyNudge(storage: NudgeStorage | null): void {
  if (!storage) return;
  try {
    storage.setItem(SAFETY_NUDGE_DISMISSED_KEY, '1');
  } catch {
    /* a full/blocked store must never break the profile */
  }
}
