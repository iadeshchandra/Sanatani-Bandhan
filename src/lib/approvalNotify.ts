/**
 * approvalNotify — Blueprint B: pure notification picking for the
 * maker–checker inbox.
 * ==========================================================================
 * Firestore rules bind every inbox write to its owner, so approvals
 * can only ever notify through the SELF-LISTEN pattern (the same
 * law as orderNotifyService): my device observes the approval
 * requests I can see and emits into MY OWN Suchana inbox.
 *
 * This module is the pure half — given the requests visible to me
 * and the ledger of already-notified dedupe keys, it decides what
 * is new:
 *  - a checker sees each NEW PENDING request they did not make
 *    (dedupe `approval:<id>:pending`);
 *  - a requester sees their own DECISIONS, once each
 *    (dedupe `approval:<id>:<status>`).
 * No IO, no clock — fully unit-testable.
 */
import {
  canDecideApproval,
  type ApprovalActor,
  type ApprovalRequestDoc,
} from './approvals';

export interface ApprovalNotice {
  request: ApprovalRequestDoc;
  dedupeKey: string;
  copyKey: 'approvalRequested' | 'approvalApproved' | 'approvalRejected';
}

export function pickApprovalNotices(
  requests: readonly ApprovalRequestDoc[],
  me: ApprovalActor,
  notified: ReadonlySet<string>
): ApprovalNotice[] {
  const out: ApprovalNotice[] = [];
  for (const r of requests) {
    if (r.status === 'PENDING') {
      if (canDecideApproval(r, me).ok) {
        const dedupeKey = `approval:${r.id}:pending`;
        if (!notified.has(dedupeKey)) {
          out.push({ request: r, dedupeKey, copyKey: 'approvalRequested' });
        }
      }
      continue;
    }
    if (r.requestedBy === me.uid && (r.status === 'APPROVED' || r.status === 'REJECTED')) {
      const dedupeKey = `approval:${r.id}:${r.status.toLowerCase()}`;
      if (!notified.has(dedupeKey)) {
        out.push({
          request: r,
          dedupeKey,
          copyKey: r.status === 'APPROVED' ? 'approvalApproved' : 'approvalRejected',
        });
      }
    }
  }
  return out;
}
