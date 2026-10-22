/**
 * approvalsStore.ts — Blueprint B: maker–checker persistence +
 * decision orchestration (the policy law lives in lib/approvals).
 * =====================================================================
 * ApprovalService is firebase-free at its core (backend injected,
 * the auditWriter pattern): it owns the lifecycle —
 *
 *   request()  → PENDING doc (digest computed here, never trusted
 *                from the caller) + `approval.requested` audit event
 *   decide()   → the status flip is CLAIMED transactionally: exactly
 *                one decider can win a PENDING request; a second
 *                decide on the same request fails ALREADY_DECIDED.
 *                On approval, the applier runs AFTER the claim and
 *                the doc is marked appliedAt — so the change lands
 *                exactly once. A failed apply is recorded
 *                (applyError) and can be retried (retryApply) — the
 *                approval itself is never re-decided.
 *   cancel()   → maker-only withdrawal of a PENDING request.
 *
 * Every transition reports to Blueprint A's audit stream through
 * the injected sink (the singleton wires auditRecorder; tests wire
 * a capture array). Audit failures never break the lifecycle — the
 * recorder itself is fail-open, and this class never throws for an
 * audit reason.
 *
 * DEMO_ workspaces are refused at request(): maker–checker governs
 * real money and real roles; demo sandboxes keep the direct flow
 * (nothing real moves there).
 */

import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  APPROVAL_REQUIRED,
  canApplyApproval,
  canCancelApproval,
  canDecideApproval,
  canMakeApproval,
  payloadDigest,
  verifyPayloadDigest,
  type ApprovalActor,
  type ApprovalKind,
  type ApprovalRequestDoc,
} from '../../lib/approvals';
import { auditRecorder } from './auditStore';

export interface ApprovalsBackend {
  create(req: ApprovalRequestDoc): Promise<void>;
  fetchForWorkspace(workspaceId: string): Promise<ApprovalRequestDoc[]>;
  /**
   * Transactionally flip a PENDING request to `toStatus`, stamping
   * the decider fields. Returns the flipped doc, or null when the
   * request was no longer PENDING (already decided/cancelled).
   */
  claimDecision(
    id: string,
    toStatus: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    decider: { uid: string; name: string },
    note?: string
  ): Promise<ApprovalRequestDoc | null>;
  markApplied(id: string, appliedAt: number): Promise<void>;
  markApplyError(id: string, error: string): Promise<void>;
}

export type ApprovalAuditAction =
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected'
  | 'approval.cancelled'
  | 'approval.applied'
  | 'approval.applyFailed';

export type ApprovalAuditSink = (
  req: ApprovalRequestDoc,
  action: ApprovalAuditAction,
  actor: ApprovalActor
) => void;

export type ApprovalApplier = (req: ApprovalRequestDoc) => Promise<void>;

export class ApprovalError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const newRequestId = () =>
  `apr_${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;

export class ApprovalService {
  private readonly now: () => number;
  private readonly makeId: () => string;

  constructor(
    private backend: ApprovalsBackend,
    private audit: ApprovalAuditSink,
    opts: { now?: () => number; makeId?: () => string } = {}
  ) {
    this.now = opts.now ?? Date.now;
    this.makeId = opts.makeId ?? newRequestId;
  }

  /** File a new PENDING request. The maker must hold a maker role
   *  for the kind; the digest is computed here from the payload. */
  async request(
    input: {
      workspaceId: string;
      workspaceName: string;
      kind: ApprovalKind;
      payload: Record<string, unknown>;
      summary: string;
      amount?: number;
    },
    actor: ApprovalActor
  ): Promise<ApprovalRequestDoc> {
    if (input.workspaceId.startsWith('DEMO_')) {
      throw new ApprovalError(
        'DEMO_WORKSPACE',
        'Approvals apply to real organisations; the demo sandbox keeps the direct flow.'
      );
    }
    if (!canMakeApproval(input.kind, actor)) {
      throw new ApprovalError(
        'NOT_MAKER',
        `Role ${actor.role} cannot file a ${input.kind} request.`
      );
    }
    const req: ApprovalRequestDoc = {
      id: this.makeId(),
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
      kind: input.kind,
      payload: input.payload,
      payloadDigest: payloadDigest(input.payload),
      summary: input.summary,
      ...(input.amount != null ? { amount: input.amount } : {}),
      requestedBy: actor.uid,
      requestedByName: actor.name,
      requestedByRole: String(actor.role),
      requestedAt: this.now(),
      status: 'PENDING',
    };
    await this.backend.create(req);
    this.audit(req, 'approval.requested', actor);
    return req;
  }

  /**
   * Decide a request. Approval applies the change via `applier`
   * (exactly once — after the transactional claim). Returns the
   * final doc + whether the change was applied.
   */
  async decide(
    req: ApprovalRequestDoc,
    actor: ApprovalActor,
    approve: boolean,
    applier: ApprovalApplier,
    note?: string
  ): Promise<{ req: ApprovalRequestDoc; applied: boolean }> {
    const check = canDecideApproval(req, actor);
    if (!check.ok) {
      throw new ApprovalError(
        check.reason,
        check.reason === 'SELF_APPROVAL'
          ? 'Self-approval is not allowed.'
          : `Cannot decide this request (${check.reason}).`
      );
    }
    const claimed = await this.backend.claimDecision(
      req.id,
      approve ? 'APPROVED' : 'REJECTED',
      { uid: actor.uid, name: actor.name },
      note
    );
    if (!claimed) {
      throw new ApprovalError(
        'ALREADY_DECIDED',
        'This request was already decided by another checker.'
      );
    }
    this.audit(claimed, approve ? 'approval.approved' : 'approval.rejected', actor);
    if (!approve) return { req: claimed, applied: false };
    const applied = await this.applyClaimed(claimed, actor, applier);
    return { req: claimed, applied };
  }

  /** Retry the apply of an APPROVED-but-unapplied request (e.g.
   *  after a transient failure). The decision is never re-taken. */
  async retryApply(
    req: ApprovalRequestDoc,
    actor: ApprovalActor,
    applier: ApprovalApplier
  ): Promise<boolean> {
    const check = canApplyApproval(req, actor);
    if (!check.ok) {
      throw new ApprovalError(check.reason, `Cannot apply this request (${check.reason}).`);
    }
    return this.applyClaimed(req, actor, applier);
  }

  /** Maker withdraws their own PENDING request. */
  async cancel(
    req: ApprovalRequestDoc,
    actor: ApprovalActor,
    note?: string
  ): Promise<ApprovalRequestDoc> {
    if (!canCancelApproval(req, actor)) {
      throw new ApprovalError(
        'NOT_CANCELLABLE',
        'Only the maker can cancel a pending request.'
      );
    }
    const claimed = await this.backend.claimDecision(
      req.id,
      'CANCELLED',
      { uid: actor.uid, name: actor.name },
      note
    );
    if (!claimed) {
      throw new ApprovalError('ALREADY_DECIDED', 'This request was already decided.');
    }
    this.audit(claimed, 'approval.cancelled', actor);
    return claimed;
  }

  private async applyClaimed(
    req: ApprovalRequestDoc,
    actor: ApprovalActor,
    applier: ApprovalApplier
  ): Promise<boolean> {
    // Integrity: what was approved is what gets applied. A digest
    // mismatch means the payload changed after filing — refuse.
    if (!verifyPayloadDigest(req)) {
      const msg = 'Payload digest mismatch — the approved content changed after filing. Apply refused.';
      await this.backend.markApplyError(req.id, msg);
      this.audit(req, 'approval.applyFailed', actor);
      return false;
    }
    try {
      await applier(req);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.backend.markApplyError(req.id, msg);
      this.audit(req, 'approval.applyFailed', actor);
      return false;
    }
    await this.backend.markApplied(req.id, this.now());
    this.audit({ ...req, appliedAt: this.now() }, 'approval.applied', actor);
    return true;
  }
}

/* ------------------------------------------------------------------ */
/* Firestore backend                                                   */
/* ------------------------------------------------------------------ */

const COLLECTION = 'approvalRequests';

export const firestoreApprovalsBackend: ApprovalsBackend = {
  async create(req) {
    // Strip undefined (Firestore rejects it) — payloads are built by
    // the filing surfaces and may carry optional blanks.
    const clean = JSON.parse(JSON.stringify(req)) as ApprovalRequestDoc;
    await setDoc(doc(db, COLLECTION, req.id), clean);
  },

  async fetchForWorkspace(workspaceId) {
    const snap = await getDocs(
      query(collection(db, COLLECTION), where('workspaceId', '==', workspaceId))
    );
    const rows = snap.docs.map((d) => ({ ...(d.data() as any) }) as ApprovalRequestDoc);
    // Client-side sort: equality-only query, no composite index.
    return rows.sort((a, b) => b.requestedAt - a.requestedAt);
  },

  async claimDecision(id, toStatus, decider, note) {
    const ref = doc(db, COLLECTION, id);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return null;
      const current = snap.data() as ApprovalRequestDoc;
      if (current.status !== 'PENDING') return null;
      const flipped: ApprovalRequestDoc = {
        ...current,
        status: toStatus,
        decidedBy: decider.uid,
        decidedByName: decider.name,
        decidedAt: Date.now(),
        ...(note ? { note } : {}),
      };
      tx.update(ref, {
        status: toStatus,
        decidedBy: decider.uid,
        decidedByName: decider.name,
        decidedAt: flipped.decidedAt,
        ...(note ? { note } : {}),
      });
      return flipped;
    });
  },

  async markApplied(id, appliedAt) {
    await updateDoc(doc(db, COLLECTION, id), { appliedAt, applyError: '' });
  },

  async markApplyError(id, error) {
    await updateDoc(doc(db, COLLECTION, id), { applyError: error.slice(0, 300) });
  },
};

/* ------------------------------------------------------------------ */
/* Singleton (audit-wired)                                             */
/* ------------------------------------------------------------------ */

const SUMMARY_KEYS: Record<ApprovalAuditAction, string> = {
  'approval.requested': 'org.audit.history.approvalRequested',
  'approval.approved': 'org.audit.history.approvalApproved',
  'approval.rejected': 'org.audit.history.approvalRejected',
  'approval.cancelled': 'org.audit.history.approvalCancelled',
  'approval.applied': 'org.audit.history.approvalApplied',
  'approval.applyFailed': 'org.audit.history.approvalApplyFailed',
};

export const approvalService = new ApprovalService(
  firestoreApprovalsBackend,
  (req, action, actor) => {
    auditRecorder.record({
      workspaceId: req.workspaceId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: String(actor.role),
      action,
      entityType: 'approval',
      entityId: req.id,
      entityLabel: req.summary,
      summaryKey: SUMMARY_KEYS[action],
      summaryParams: { summary: req.summary },
      ...(req.amount != null ? { amount: req.amount } : {}),
    });
  }
);

/** Re-exported so membership write paths can throw the shared code. */
export { APPROVAL_REQUIRED };
