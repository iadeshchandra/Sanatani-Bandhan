/**
 * crisis/sosEntry.ts — the single programmatic entry into the SOS flow.
 * =====================================================================
 * The SOS flow itself lives in exactly one place (SOSFlow.tsx). Anything
 * else that must open SOS — today: the AI assistant's `sos` responses —
 * calls `openSosFlow()`, and SOSFlow subscribes to the event and moves to
 * its SituationPicker. No duplicate SOS implementations, ever: one flow,
 * many doors.
 */

export const SOS_OPEN_EVENT = 'sb:open-sos';

/** Opens the SOS flow's SituationPicker from anywhere in the app. */
export function openSosFlow(): void {
  window.dispatchEvent(new CustomEvent(SOS_OPEN_EVENT));
}
