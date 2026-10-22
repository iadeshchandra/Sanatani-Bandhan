/**
 * assistedAuditWiring.ts — Blueprint D, deliverable 4: the one
 * firebase-touching seam of assisted mode. Registers the pure
 * assistedByForEvent provider (lib/assistedSession) on the app-wide
 * audit recorder singleton, so every audit event the session writes
 * is stamped at the recorder's ONE seam. Kept apart from
 * assistedSession.ts so the session logic (and its tests) never
 * pull the Firestore stack. Idempotent.
 */
import { auditRecorder } from '../context/data/auditStore';
import { assistedByForEvent } from './assistedSession';

let registered = false;

export function registerAssistedAuditStamping(): void {
  if (registered) return;
  registered = true;
  auditRecorder.setAssistedByProvider((input) => assistedByForEvent(input));
}

export default registerAssistedAuditStamping;
