/**
 * crisisNotify.ts — Phase 3 notification wrappers for Crisis Command.
 * ====================================================================
 * WRAPS sosService.ts — never duplicates it, never edits it (a parallel
 * program owns that file). These wrappers add NotificationCenter emits
 * around the existing lifecycle:
 *
 *   triggerSOS  → CRITICAL reassurance to the SENDER ("Help is on the way")
 *   cancelSOS   → IMPORTANT stand-down to the SENDER ("All is well")
 *
 * The other two directions are self-listen (see GlobalSOSListener):
 *   - nearby devotees' devices observe crisis_events → CRITICAL responder
 *     alert to themselves;
 *   - the sender's device observes the event's responses → CRITICAL
 *     "X heard your call" to themselves;
 *   - responders' devices observe the alert leaving the active set →
 *     IMPORTANT "All is well" to themselves.
 *
 * Every wrapper is SOS-safe: the notification emit can never fail the
 * underlying SOS operation (fire-and-forget, errors logged only).
 */
import { getAuth } from 'firebase/auth';
import { cancelSOS, triggerSOS } from './sosService';
import type { TriggerSOSInput } from './types';
import { notifySOSResolved, notifySOSSent } from '../notifications/notifyHelpers';

/**
 * Trigger an SOS, then reassure the sender through the NotificationCenter.
 * The CRITICAL priority breaks through quiet hours and DND — the sender
 * must know their sangha was notified even if their phone was sleeping.
 */
export async function triggerSOSWithNotify(input: TriggerSOSInput): Promise<string> {
  const eventId = await triggerSOS(input);
  try {
    const uid = getAuth().currentUser?.uid;
    if (uid) {
      void notifySOSSent(uid, eventId);
    }
  } catch {
    /* the SOS itself already succeeded — never fail it over a notification */
  }
  return eventId;
}

/**
 * Cancel ("I'm safe") an SOS, then stand the sender down through the
 * NotificationCenter. Responders learn via their own listeners.
 */
export async function cancelSOSWithNotify(eventId: string, wasFalseAlarm = false): Promise<void> {
  await cancelSOS(eventId, wasFalseAlarm);
  try {
    const uid = getAuth().currentUser?.uid;
    if (uid) {
      void notifySOSResolved(uid, {
        senderUid: uid,
        senderName: 'You',
        eventId,
        situation: '',
      }).then(() => undefined, () => undefined);
    }
  } catch {
    /* the cancel already succeeded */
  }
}
