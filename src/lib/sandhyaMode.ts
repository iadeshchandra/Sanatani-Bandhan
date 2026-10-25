/**
 * sandhyaMode.ts — VIBE B3: Sandhya Mode (the dusk theme).
 * ============================================================================
 * The north-star's evening theme: "Day = temple courtyard; evening =
 * sanctum." Deep warm maroon/browns and lamplight, derived from the
 * sanctum palette — NOT a generic dark mode. The theme itself is
 * scoped in CSS (index.css, `[data-sandhya="on"]` token overrides +
 * surface remaps); this module is only the state machine:
 *
 *   mode 'off'  → never active (the default)
 *   mode 'on'   → always active
 *   mode 'auto' → active inside the local dusk window only
 *
 * The user's choice always wins and is persisted on the device
 * (localStorage `sb-sandhya-mode`). Nothing here phones home; the
 * dusk window is a fixed local-time window (17:30–21:00) — "about
 * sunset" for the subcontinent the app serves, stated plainly in the
 * settings copy rather than dressed up as astronomy.
 *
 * The pre-paint boot script in index.html mirrors the window
 * constants below so an enabled Sandhya is painted before first
 * frame (no flash); keep them in sync.
 */

export type SandhyaMode = 'off' | 'on' | 'auto';

export const SANDHYA_STORAGE_KEY = 'sb-sandhya-mode';
export const SANDHYA_ATTR = 'data-sandhya';
export const SANDHYA_CHANGED_EVENT = 'sb-sandhya-changed';

/** Dusk window in local minutes-of-day: 17:30 → 21:00. */
export const DUSK_START_MIN = 17 * 60 + 30;
export const DUSK_END_MIN = 21 * 60;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Pure: is Sandhya active for this mode at this moment? */
export function isSandhyaActive(mode: SandhyaMode, now: Date = new Date()): boolean {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= DUSK_START_MIN && mins < DUSK_END_MIN;
}

export function getSandhyaMode(storage: StorageLike | null = defaultStorage()): SandhyaMode {
  try {
    const v = storage?.getItem(SANDHYA_STORAGE_KEY);
    return v === 'on' || v === 'auto' ? v : 'off';
  } catch {
    return 'off';
  }
}

export function storeSandhyaMode(
  mode: SandhyaMode,
  storage: StorageLike | null = defaultStorage()
): void {
  try {
    storage?.setItem(SANDHYA_STORAGE_KEY, mode);
  } catch {
    /* private mode etc. — the in-memory apply still happens */
  }
}

/**
 * Apply the current persisted mode to <html data-sandhya>. Returns
 * whether Sandhya is now active. Safe outside the browser (no-op).
 */
export function applySandhya(now: Date = new Date()): boolean {
  const active = isSandhyaActive(getSandhyaMode(), now);
  try {
    if (typeof document !== 'undefined') {
      if (active) document.documentElement.setAttribute(SANDHYA_ATTR, 'on');
      else document.documentElement.removeAttribute(SANDHYA_ATTR);
    }
  } catch {
    /* never let a theme break the app */
  }
  return active;
}

/** Persist + apply + notify (the settings UI and the root applier). */
export function setSandhyaMode(mode: SandhyaMode): boolean {
  storeSandhyaMode(mode);
  const active = applySandhya();
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(SANDHYA_CHANGED_EVENT));
    }
  } catch {
    /* ignore */
  }
  return active;
}
