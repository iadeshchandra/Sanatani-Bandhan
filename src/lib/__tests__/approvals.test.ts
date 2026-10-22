/**
 * approvals.test.ts — Blueprint B maker–checker law (pure half).
 * ================================================================
 * Pins: self-approval is impossible for every kind; only the
 * kind's checkers may decide or apply; the maker alone cancels;
 * the payout threshold law (default 10,000, positive override only,
 * expenses only, at-or-above gates); payload digests are stable
 * and tamper-evident.
 */
import {
  buildPayoutPayload,
  canApplyApproval,
  canCancelApproval,
  canDecideApproval,
  canMakeApproval,
  payoutApprovalThreshold,
  payoutNeedsApproval,
  payloadDigest,
  verifyPayloadDigest,
  type ApprovalActor,
  type ApprovalRequestDoc,
} from '../approvals';

const maker: ApprovalActor = { uid: 'maker1', name: 'Maker', role: 'Accountant' };
const trustee: ApprovalActor = { uid: 'trustee1', name: 'Trustee', role: 'Trustee' };
const sevadar: ApprovalActor = { uid: 'sev1', name: 'Sev', role: 'Sevadar' };
const auditor: ApprovalActor = { uid: 'aud1', name: 'Aud', role: 'Auditor' };

const req = (over: Partial<ApprovalRequestDoc> = {}): ApprovalRequestDoc => ({
  id: 'apr_1',
  workspaceId: 'WS-1',
  workspaceName: 'Test Mandir',
  kind: 'treasury.payout',
  payload: { note: 'x' },
  payloadDigest: payloadDigest({ note: 'x' }),
  summary: 'Payout · Test · 100',
  requestedBy: maker.uid,
  requestedByName: maker.name,
  requestedByRole: maker.role,
  requestedAt: 1000,
  status: 'PENDING',
  ...over,
});

describe('separation of duties', () => {
  it('the maker can NEVER decide their own request, whatever their role', () => {
    const selfTrustee: ApprovalActor = { uid: maker.uid, name: 'Maker', role: 'Trustee' };
    expect(canDecideApproval(req(), selfTrustee)).toEqual({ ok: false, reason: 'SELF_APPROVAL' });
    expect(canDecideApproval(req(), maker)).toEqual({ ok: false, reason: 'SELF_APPROVAL' });
  });

  it('a different eligible checker may decide a payout', () => {
    expect(canDecideApproval(req(), trustee)).toEqual({ ok: true, reason: null });
    const otherAccountant: ApprovalActor = { uid: 'acc2', name: 'A2', role: 'Accountant' };
    expect(canDecideApproval(req(), otherAccountant)).toEqual({ ok: true, reason: null });
  });

  it('payment details and role grants are Trustee-level decisions', () => {
    const payReq = req({ kind: 'payment.details' });
    const otherAccountant: ApprovalActor = { uid: 'acc2', name: 'A2', role: 'Accountant' };
    expect(canDecideApproval(payReq, otherAccountant)).toEqual({ ok: false, reason: 'NOT_CHECKER' });
    expect(canDecideApproval(payReq, trustee)).toEqual({ ok: true, reason: null });
  });

  it('Sevadar and Auditor can never decide anything', () => {
    expect(canDecideApproval(req(), sevadar)).toEqual({ ok: false, reason: 'NOT_CHECKER' });
    expect(canDecideApproval(req(), auditor)).toEqual({ ok: false, reason: 'NOT_CHECKER' });
  });

  it('a decided request cannot be decided again', () => {
    expect(canDecideApproval(req({ status: 'APPROVED' }), trustee)).toEqual({
      ok: false,
      reason: 'NOT_PENDING',
    });
  });

  it('apply follows the same law (non-maker checker only, once)', () => {
    const approved = req({ status: 'APPROVED', decidedBy: trustee.uid });
    expect(canApplyApproval(approved, trustee)).toEqual({ ok: true, reason: null });
    expect(canApplyApproval(approved, { ...trustee, uid: maker.uid })).toEqual({
      ok: false,
      reason: 'SELF_APPROVAL',
    });
    expect(canApplyApproval(req({ status: 'APPROVED', appliedAt: 5 }), trustee).ok).toBe(false);
  });

  it('only the maker cancels, and only while pending', () => {
    expect(canCancelApproval(req(), maker)).toBe(true);
    expect(canCancelApproval(req(), trustee)).toBe(false);
    expect(canCancelApproval(req({ status: 'APPROVED' }), maker)).toBe(false);
  });

  it('makers are role-gated per kind', () => {
    expect(canMakeApproval('treasury.payout', maker)).toBe(true);
    expect(canMakeApproval('treasury.payout', sevadar)).toBe(false);
    expect(canMakeApproval('payment.details', maker)).toBe(false); // Accountant may not file payment changes
    expect(canMakeApproval('payment.details', trustee)).toBe(true);
    expect(canMakeApproval('role.grant', auditor)).toBe(false);
  });
});

describe('payout threshold law', () => {
  it('defaults to 10,000', () => {
    expect(payoutApprovalThreshold(undefined)).toBe(10000);
    expect(payoutApprovalThreshold(null)).toBe(10000);
    expect(payoutApprovalThreshold({})).toBe(10000);
  });

  it('a positive workspace override wins; zero/negative/garbage cannot disable', () => {
    expect(payoutApprovalThreshold({ makerCheckerPayoutThreshold: 5000 })).toBe(5000);
    expect(payoutApprovalThreshold({ makerCheckerPayoutThreshold: 0 })).toBe(10000);
    expect(payoutApprovalThreshold({ makerCheckerPayoutThreshold: -5 })).toBe(10000);
    expect(payoutApprovalThreshold({ makerCheckerPayoutThreshold: 'abc' as never })).toBe(10000);
  });

  it('only EXPENSES at or above the threshold need approval', () => {
    expect(payoutNeedsApproval({ type: 'Expense', amount: 10000 }, 10000)).toBe(true);
    expect(payoutNeedsApproval({ type: 'Expense', amount: 25000 }, 10000)).toBe(true);
    expect(payoutNeedsApproval({ type: 'Expense', amount: 9999 }, 10000)).toBe(false);
    expect(payoutNeedsApproval({ type: 'Income', amount: 10_00_000 }, 10000)).toBe(false);
  });
});

describe('payload digest', () => {
  it('is stable across key order and skips undefined', () => {
    expect(payloadDigest({ a: 1, b: { c: 2, d: undefined } })).toBe(
      payloadDigest({ b: { d: undefined, c: 2 }, a: 1 })
    );
  });

  it('detects tampering', () => {
    const r = req();
    expect(verifyPayloadDigest(r)).toBe(true);
    expect(verifyPayloadDigest({ ...r, payload: { note: 'forged' } })).toBe(false);
  });

  it('buildPayoutPayload keeps the whole voucher for the checker', () => {
    const tx = { id: 'tx1', type: 'Expense', amount: 15000, category: 'Repairs' };
    const p = buildPayoutPayload(tx);
    expect(p.tx).toEqual(tx);
  });
});
