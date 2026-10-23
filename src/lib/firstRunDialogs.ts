/**
 * firstRunDialogs.ts — UI/UX audit D-16: first-run dialogs never stack.
 * ============================================================================
 * Entering the demo (or a first session) used to stack the one-time
 * privacy notice and the guided-tour card in the same frame — the user
 * dismissed dialogs before ever seeing the app. This module is the
 * single queue every first-run surface must hold a turn from:
 *
 *   · A surface that wants to show REQUESTS a turn (id + priority).
 *   · Only the active request renders; the rest wait invisibly.
 *   · Lower priority number = earlier turn. The standing order is
 *     privacy notice (0) → language welcome (1) → guided tour (2):
 *     consent/information first, guidance last, exactly as the audit's
 *     fix class prescribes ("privacy → tour offer only after the app
 *     is visible").
 *   · A surface RELEASES its turn on every close path (confirm,
 *     dismiss, backdrop). Releasing advances the queue; a surface
 *     that closes "without marking" (the privacy gate's honest
 *     "Not now") simply requests again on a later session — the
 *     queue itself keeps no memory.
 *   · Equal priorities resolve first-come-first-served, so the order
 *     is deterministic and unit-testable.
 *
 * The queue is pure in-memory state (no storage, no Firebase); React
 * surfaces re-read the active id whenever the change event fires on
 * window (the codebase's CustomEvent pattern — cf. sanatani:navigate,
 * sanatani:desk-panel). In non-DOM environments the notify is a no-op
 * and the pure functions still behave.
 */

export const FIRST_RUN_DIALOGS_CHANGED = 'sanatani:firstrun-dialogs-changed';

/** Standing turn order for first-run surfaces (lower = earlier). */
export const FIRST_RUN_PRIORITY = {
  privacy: 0,
  language: 1,
  tour: 2,
} as const;

interface FirstRunDialogRequest {
  id: string;
  priority: number;
  requestedAt: number;
}

const requests = new Map<string, FirstRunDialogRequest>();
let sequence = 0;

function notifyChange(): void {
  try {
    window.dispatchEvent(new CustomEvent(FIRST_RUN_DIALOGS_CHANGED));
  } catch {
    /* non-DOM environment — pure callers are unaffected */
  }
}

/** The id whose turn it is, or null when no surface is waiting. */
export function activeFirstRunDialog(): string | null {
  let best: FirstRunDialogRequest | null = null;
  for (const r of requests.values()) {
    if (
      !best ||
      r.priority < best.priority ||
      (r.priority === best.priority && r.requestedAt < best.requestedAt)
    ) {
      best = r;
    }
  }
  return best ? best.id : null;
}

/**
 * Register that a surface wants to show. Idempotent per id (a repeat
 * request keeps the original place in line). Returns the active id
 * after the request — the caller renders only when it equals its id.
 */
export function requestFirstRunDialog(id: string, priority: number): string | null {
  if (!requests.has(id)) {
    requests.set(id, { id, priority, requestedAt: sequence++ });
    notifyChange();
  }
  return activeFirstRunDialog();
}

/**
 * Give up the turn (any close path). Releasing an id that never
 * requested is a harmless no-op. Returns the active id after release.
 */
export function releaseFirstRunDialog(id: string): string | null {
  if (requests.delete(id)) notifyChange();
  return activeFirstRunDialog();
}

/** True when it is this surface's turn to be on screen. */
export function isFirstRunDialogActive(id: string): boolean {
  return activeFirstRunDialog() === id;
}

/** Test-only: clear the queue between cases. */
export function _resetFirstRunDialogs(): void {
  requests.clear();
  sequence = 0;
}
