/**
 * bootWatchdog.ts — the stale-copy escape decision logic
 * (SPLASH & GODMODE BATCH, part B).
 * =====================================================================
 * The watchdog itself is an inline, dependency-free script in
 * index.html: it has to run even when this bundle never loads, which
 * is exactly the failure it exists for (an installed PWA holding an
 * old service-worker shell whose boot path waits on events that never
 * fire — the 2026-11-25 owner-phone hang). Every other recovery tool
 * (UpdatePrompt, BootGate) lives inside the bundle such a device
 * never reaches.
 *
 * This module is the watchdog's testable mirror: the inline script
 * carries the SAME constants and the SAME decision table below, and
 * the unit tests pin them here. Keep the two in sync — the Sandhya
 * pre-paint script in index.html follows the same mirror law.
 *
 * The decision table (elapsed = time since page parse):
 *   booted (window.__SB_BOOTED__ set by main.tsx at splash dismissal)
 *     → 'none' at any elapsed time; a healthy boot clears nothing.
 *   elapsed ≥ 20 s, no boot, escape not yet tried this session
 *     → 'auto-reset' (unregister service workers, delete Cache
 *       Storage caches, set the guard, reload) — attempted ONCE.
 *   elapsed ≥ 20 s, no boot, guard already set
 *     → 'show-recovery' — never auto-reset twice in a session; the
 *       manual button stays available and may always be used.
 *   elapsed ≥ 12 s, no boot
 *     → 'show-recovery' (the honest "taking longer than usual" line
 *       plus the ≥44 px "Refresh the app" button in the splash DOM).
 *   elapsed < 12 s, no boot
 *     → 'none' (a merely slow network is still young; Test #2
 *       measured ~3.4 s to usable on 400 Kbps).
 */

/** Show the recovery block after this long without a boot signal. */
export const BOOT_WATCH_WARN_MS = 12_000;

/** Attempt the one automatic reset after this long without a boot. */
export const BOOT_WATCH_RESET_MS = 20_000;

/** sessionStorage key: an escape reset was already tried this session. */
export const BOOT_ESCAPE_GUARD_KEY = 'sb-escape-tried';

export type BootWatchAction = 'none' | 'show-recovery' | 'auto-reset';

export function bootWatchAction(input: {
  booted: boolean;
  guardSet: boolean;
  elapsedMs: number;
}): BootWatchAction {
  if (input.booted) return 'none';
  if (input.elapsedMs >= BOOT_WATCH_RESET_MS) {
    return input.guardSet ? 'show-recovery' : 'auto-reset';
  }
  if (input.elapsedMs >= BOOT_WATCH_WARN_MS) return 'show-recovery';
  return 'none';
}
