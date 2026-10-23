/**
 * deskPanel.ts — deep-link INTO a desk's inner panel (UI/UX audit D-06).
 *
 * Some features are panels inside a desk, not desks themselves —
 * Bahi-Khata Seva lives inside the Treasury & Expense Ledger desk.
 * A sidebar "door" (see deskDoors.ts) must land the user on the parent
 * desk WITH the panel already open. Two halves make that reliable:
 *
 *  1. A consume-once pending request (module state). The door records
 *     the request BEFORE navigating; the parent desk consumes it on
 *     mount. This covers the common case where the desk is not yet
 *     mounted and cannot hear an event.
 *  2. A 'sanatani:desk-panel' CustomEvent for the already-mounted case
 *     (the user is sitting on Treasury and taps the door again).
 *
 * Navigation itself rides the app's existing 'sanatani:navigate'
 * contract (detail { module: <deskId> }) — the same event the Copilot
 * feature locator's openDesk action dispatches. Desk ids are NOT
 * routes; nothing here touches react-router.
 */

export const DESK_PANEL_EVENT = 'sanatani:desk-panel';
export const NAVIGATE_EVENT = 'sanatani:navigate';

export interface DeskPanelRequest {
  desk: string;
  panel: string;
}

let pending: DeskPanelRequest | null = null;

function dispatch(event: string, detail: unknown): void {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(event, { detail }));
    }
  } catch {
    /* non-DOM environment (tests, SSR) — the pending store still works */
  }
}

/** Record a panel request and notify any already-mounted desk. */
export function requestDeskPanel(desk: string, panel: string): void {
  pending = { desk, panel };
  dispatch(DESK_PANEL_EVENT, { desk, panel });
}

/**
 * Take the pending request for `desk`, if one exists. Consume-once:
 * a stale request can never re-open a panel on a later, unrelated
 * visit to the desk.
 */
export function consumeDeskPanel(desk: string): string | null {
  if (pending && pending.desk === desk) {
    const { panel } = pending;
    pending = null;
    return panel;
  }
  return null;
}

/** Peek without consuming (tests / diagnostics). */
export function peekDeskPanel(): DeskPanelRequest | null {
  return pending;
}

/** Clear any pending request (tests). */
export function clearDeskPanel(): void {
  pending = null;
}

/**
 * The full door action: record the panel request, then navigate to the
 * parent desk through the app's desk-routing event.
 */
export function openDeskPanel(desk: string, panel: string): void {
  requestDeskPanel(desk, panel);
  dispatch(NAVIGATE_EVENT, { module: desk });
}
