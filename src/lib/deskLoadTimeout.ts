/**
 * deskLoadTimeout.ts — the desk load-timeout law (UI/UX audit D-02).
 * ==========================================================================
 * Two org-catalog desks (Sadhana & Japa Counters, Sanatani Vivah
 * Portal) spun forever in the institution shell: their internal
 * loading state cleared only on a Firestore snapshot SUCCESS, and the
 * error callback merely logged — so any denied/failed read hung the
 * desk silently, with no message and no way out.
 *
 * The desks' own loading paths are fixed at the source; this module
 * is the GLOBAL guarantee behind them: no desk may spin forever.
 * DeskLoadGuard (components/common) probes the mounted desk once,
 * DESK_LOAD_TIMEOUT_MS after mount, with this pure signature:
 *
 *  - the Suspense loading fallback is STILL mounted (its node carries
 *    `data-desk-loading`) — the desk chunk never arrived; or
 *  - the desk area contains literally nothing but a spinner
 *    (zero text + an `animate-spin` element) — the desk mounted but
 *    its own loading state never resolved.
 *
 * Anything with real content — even content plus a small spinner
 * widget — is NEVER judged hung. The guard then swaps in an honest
 * error state with Try again / Back to Command Center.
 */

export const DESK_LOAD_TIMEOUT_MS = 10_000;

export interface DeskHangProbe {
  /** The Suspense fallback (marked data-desk-loading) is still mounted. */
  hasLoadingMarker: boolean;
  /** Visible text length inside the desk area (trimmed). */
  textLength: number;
  /** An element with the animate-spin class is present. */
  hasSpinner: boolean;
}

export function deskHangSignature(probe: DeskHangProbe): boolean {
  if (probe.hasLoadingMarker) return true;
  return probe.textLength === 0 && probe.hasSpinner;
}
