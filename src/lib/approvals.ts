/**
 * approvals.ts — Blueprint B: maker–checker (dual control) law.
 * =====================================================================
 * Research §1/§2: money never moves on one pair of eyes. The maker
 * creates a PENDING request; a DIFFERENT checker approves or
 * rejects; no self-approval — enforced here in code (this module),
 * again in the data layer (context guards), and a third time in
 * Firestore rules (status-transition + decidedBy binding). The
 * underlying change applies EXACTLY ONCE, only on approval;
 * rejection applies nothing, ever.
 *
 * Three gated kinds:
 *  (a) 'treasury.payout'  — an Expense voucher at/above the
 *      workspace threshold (payouts ARE expense records in this
 *      codebase — there is no separate payout entity). The full
 *      voucher rides in the payload and is committed through
 *      DataContext.addTreasuryTransaction by the checker's client
 *      on approval — so a payout keeps every downstream behaviour
 *      (receipt coverage, summary writer, audit stream) of a
 *      directly-posted voucher.
 *  (b) 'payment.details'  — changes to the organisation's bank /
 *      payout details (the fields a fraudster would reroute).
 *      Applied via the settings choke point (updateWorkspaceDetails)
 *      on approval — which also fires Blueprint A's settings audit.
 *  (c) 'role.grant'       — role grants / template assignments
 *      above the Sevadar line (roleTemplates.GATED_GRANT_ROLES),
 *      in invite form or as an edit to an existing membership.
 *
 * Payload integrity: every request carries payloadDigest =
 * sha256(stableStringify(payload)) (the audit chain's canonical
 * form). What the checker approves is provably what gets applied;
 * any tamper between filing and applying breaks the digest and the
 * apply is refused.
 */

import type { UserRole } from '../types';
import { stableStringify } from './auditChain';
import { sha256Hex } from '../cashcustody/cashCustodyStore';

export type ApprovalKind = 'treasury.payout' | 'payment.details' | 'role.grant';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/** Thrown (as Error.code) by write paths when a gated action is
 *  attempted without a recorded checker decision. */
export const APPROVAL_REQUIRED = 'APPROVAL_REQUIRED';

export interface ApprovalActor {
  uid: string;
  name: string;
  /** Canonical role in THIS workspace at action time. */
  role: UserRole | string;
}

/** The `approvalRequests/{id}` document shape. */
export interface ApprovalRequestDoc {
  id: string;
  workspaceId: string;
  /** Denormalised at filing for display/notification copy only. */
  workspaceName: string;
  kind: ApprovalKind;
  /** The full change, applied verbatim on approval. */
  payload: Record<string, unknown>;
  /** sha256 of stableStringify(payload) — approval integrity. */
  payloadDigest: string;
  /** Plain-language one-liner the maker composed at filing (data,
   *  like an entity label — rendered inside i18n templates). */
  summary: string;
  /** Money amount when the request moves money (payouts). */
  amount?: number;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: string;
  requestedAt: number;
  status: ApprovalStatus;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: number;
  /** Checker's note (or maker's cancel note). */
  note?: string;
  /** Set when the approved change has actually been applied. */
  appliedAt?: number;
  /** Set when an approved change failed to apply (retryable). */
  applyError?: string;
}

/** Who may CREATE each kind (makers). */
export const MAKER_ROLES: Record<ApprovalKind, readonly UserRole[]> = {
  'treasury.payout': ['Trustee', 'Accountant', 'SuperAdmin'],
  'payment.details': ['Trustee', 'SuperAdmin'],
  'role.grant': ['Trustee', 'SuperAdmin'],
};

/**
 * Who may DECIDE each kind (checkers) — always a different person
 * than the maker (dynamic law, canDecideApproval). Payouts are a
 * finance decision (Treasurer/Accountant peer + Trustee); payment
 * details and role grants are governance decisions (Trustee+).
 * Auditor is deliberately absent everywhere: read-only means
 * read-only.
 */
export const CHECKER_ROLES: Record<ApprovalKind, readonly UserRole[]> = {
  'treasury.payout': ['Trustee', 'Accountant', 'SuperAdmin'],
  'payment.details': ['Trustee', 'SuperAdmin'],
  'role.grant': ['Trustee', 'SuperAdmin'],
};

export function payloadDigest(payload: Record<string, unknown>): string {
  return sha256Hex(stableStringify(payload));
}

export function verifyPayloadDigest(req: ApprovalRequestDoc): boolean {
  return payloadDigest(req.payload) === req.payloadDigest;
}

export function canMakeApproval(
  kind: ApprovalKind,
  actor: ApprovalActor
): boolean {
  return (MAKER_ROLES[kind] as readonly string[]).includes(actor.role);
}

export type DecisionCheck =
  | { ok: true; reason: null }
  | { ok: false; reason: 'NOT_PENDING' | 'SELF_APPROVAL' | 'NOT_CHECKER' };

/** The dynamic separation-of-duties law, in one place. */
export function canDecideApproval(
  req: ApprovalRequestDoc,
  actor: ApprovalActor
): DecisionCheck {
  if (req.status !== 'PENDING') return { ok: false, reason: 'NOT_PENDING' };
  if (actor.uid === req.requestedBy) return { ok: false, reason: 'SELF_APPROVAL' };
  if (!(CHECKER_ROLES[req.kind] as readonly string[]).includes(actor.role)) {
    return { ok: false, reason: 'NOT_CHECKER' };
  }
  return { ok: true, reason: null };
}

/** An approved-but-unapplied request may be (re)applied by any
 *  eligible checker who is not the maker. */
export function canApplyApproval(
  req: ApprovalRequestDoc,
  actor: ApprovalActor
): DecisionCheck {
  if (req.status !== 'APPROVED' || req.appliedAt != null) {
    return { ok: false, reason: 'NOT_PENDING' };
  }
  if (actor.uid === req.requestedBy) return { ok: false, reason: 'SELF_APPROVAL' };
  if (!(CHECKER_ROLES[req.kind] as readonly string[]).includes(actor.role)) {
    return { ok: false, reason: 'NOT_CHECKER' };
  }
  return { ok: true, reason: null };
}

/** The maker may cancel their own pending request (research:
 *  reversibility before execution). Nobody else cancels. */
export function canCancelApproval(
  req: ApprovalRequestDoc,
  actor: ApprovalActor
): boolean {
  return req.status === 'PENDING' && actor.uid === req.requestedBy;
}

/* ------------------------------------------------------------------ */
/* Payout threshold                                                    */
/* ------------------------------------------------------------------ */

/**
 * Default dual-control threshold for expense vouchers, in the
 * workspace's own currency units: 10,000 (the research brief's
 * worked example for authorisation limits, §1d). A workspace may
 * override it with `makerCheckerPayoutThreshold` on its config —
 * a positive number wins; anything else falls back to the default.
 * There is deliberately NO way to set it to 0/negative to disable
 * dual control: the floor is the default. (A workspace that wants
 * every payout checked sets a threshold of 1.)
 */
export const DEFAULT_PAYOUT_APPROVAL_THRESHOLD = 10000;

export function payoutApprovalThreshold(
  ws: { makerCheckerPayoutThreshold?: number | null } | null | undefined
): number {
  const v = ws?.makerCheckerPayoutThreshold;
  return typeof v === 'number' && Number.isFinite(v) && v > 0
    ? v
    : DEFAULT_PAYOUT_APPROVAL_THRESHOLD;
}

export function payoutNeedsApproval(
  tx: { type: string; amount: number },
  threshold: number
): boolean {
  return tx.type === 'Expense' && Number.isFinite(tx.amount) && tx.amount >= threshold;
}

/* ------------------------------------------------------------------ */
/* Payload builders (the shapes the appliers consume)                  */
/* ------------------------------------------------------------------ */

/** (a) The voucher object TreasuryLedgerDesk would have posted —
 *  stored whole; the applier hands it to addTreasuryTransaction. */
export interface PayoutPayload {
  tx: Record<string, unknown>;
}

export function buildPayoutPayload(tx: Record<string, unknown>): PayoutPayload {
  return { tx };
}

/** (b) The workspace-doc fields to change (payment details only —
 *  the applier writes exactly these through the settings path). */
export interface PaymentDetailsPayload {
  fields: {
    paymentAccountName?: string;
    paymentAccountNumber?: string;
    paymentBankName?: string;
    paymentIfsc?: string;
    paymentUpiId?: string;
  };
}

export const PAYMENT_DETAIL_FIELDS = [
  'paymentAccountName',
  'paymentAccountNumber',
  'paymentBankName',
  'paymentIfsc',
  'paymentUpiId',
] as const;

/** (c) A role grant, in invite form or membership-edit form. */
export interface RoleGrantPayload {
  mode: 'invite' | 'membership';
  /** invite mode: the sendInvite input, verbatim. */
  invite?: Record<string, unknown>;
  /** membership mode: the edge id + target uid being edited. */
  membershipId?: string;
  targetUid?: string;
  targetName: string;
  /** The resolved assignment (roleTemplates.resolveAssignment). */
  role: string;
  templateId: string | null;
  deskScope: string[] | null;
  roleExpiresAt: number | null;
}
