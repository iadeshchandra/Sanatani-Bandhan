/**
 * approvalsStore.test.ts — Blueprint B maker–checker lifecycle.
 * ================================================================
 * Runs ApprovalService against an in-memory backend whose
 * claimDecision mimics the Firestore transaction (PENDING-only
 * flip). Pins the whole lifecycle law:
 *  - filing is maker-gated and DEMO-refused;
 *  - self-approval throws BEFORE any state change;
 *  - approval applies the change EXACTLY ONCE (a second decide on
 *    the claimed doc throws ALREADY_DECIDED / NOT_PENDING);
 *  - rejection applies NOTHING;
 *  - a failing applier leaves the request APPROVED + retryable,
 *    and the retry applies it (still exactly once);
 *  - a tampered payload digest refuses the apply;
 *  - every step fires its audit event.
 */
import {
  ApprovalService,
  ApprovalError,
  type ApprovalAuditAction,
  type ApprovalsBackend,
} from '../approvalsStore';
import type { ApprovalActor, ApprovalRequestDoc } from '../../../lib/approvals';

// The service core is backend-injected; the module's firebase
// wiring (singleton + Firestore backend) is not under test here —
// mock it out (the codebase's established pattern for this chain).
jest.mock('../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  runTransaction: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn(),
}));
jest.mock('../auditStore', () => ({
  auditRecorder: { record: jest.fn() },
}));

class FakeBackend implements ApprovalsBackend {
  store = new Map<string, ApprovalRequestDoc>();
  async create(req: ApprovalRequestDoc) {
    this.store.set(req.id, { ...req });
  }
  async fetchForWorkspace(workspaceId: string) {
    return [...this.store.values()].filter((r) => r.workspaceId === workspaceId);
  }
  async claimDecision(
    id: string,
    toStatus: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    decider: { uid: string; name: string },
    note?: string
  ) {
    const cur = this.store.get(id);
    if (!cur || cur.status !== 'PENDING') return null;
    const next: ApprovalRequestDoc = {
      ...cur,
      status: toStatus,
      decidedBy: decider.uid,
      decidedByName: decider.name,
      decidedAt: 2000,
      ...(note ? { note } : {}),
    };
    this.store.set(id, next);
    return next;
  }
  async markApplied(id: string, appliedAt: number) {
    const cur = this.store.get(id)!;
    this.store.set(id, { ...cur, appliedAt });
  }
  async markApplyError(id: string, error: string) {
    const cur = this.store.get(id)!;
    this.store.set(id, { ...cur, applyError: error });
  }
}

const NOW = 1000;
const maker: ApprovalActor = { uid: 'm1', name: 'Maker', role: 'Accountant' };
const checker: ApprovalActor = { uid: 'c1', name: 'Checker', role: 'Trustee' };

function setup() {
  const backend = new FakeBackend();
  const events: ApprovalAuditAction[] = [];
  const svc = new ApprovalService(
    backend,
    (req, action) => events.push(action),
    { now: () => NOW, makeId: () => 'apr_test' }
  );
  return { backend, events, svc };
}

const filePayout = (svc: ApprovalService) =>
  svc.request(
    {
      workspaceId: 'WS-1',
      workspaceName: 'Test Mandir',
      kind: 'treasury.payout',
      payload: { tx: { id: 'tx1', amount: 15000 } },
      summary: 'Payout · Repairs · 15000',
      amount: 15000,
    },
    maker
  );

describe('filing', () => {
  it('creates a PENDING request with a digest and audits it', async () => {
    const { svc, events } = setup();
    const req = await filePayout(svc);
    expect(req.status).toBe('PENDING');
    expect(req.payloadDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(events).toEqual(['approval.requested']);
  });

  it('refuses makers without a maker role', async () => {
    const { svc } = setup();
    await expect(
      svc.request(
        {
          workspaceId: 'WS-1',
          workspaceName: 'T',
          kind: 'treasury.payout',
          payload: {},
          summary: 'x',
        },
        { uid: 's1', name: 'Sev', role: 'Sevadar' }
      )
    ).rejects.toMatchObject({ code: 'NOT_MAKER' });
  });

  it('refuses DEMO workspaces outright', async () => {
    const { svc } = setup();
    await expect(
      svc.request(
        {
          workspaceId: 'DEMO_ws',
          workspaceName: 'Demo',
          kind: 'treasury.payout',
          payload: {},
          summary: 'x',
        },
        maker
      )
    ).rejects.toMatchObject({ code: 'DEMO_WORKSPACE' });
  });
});

describe('decide + apply', () => {
  it('self-approval is denied and changes nothing', async () => {
    const { svc, backend, events } = setup();
    const req = await filePayout(svc);
    const selfChecker: ApprovalActor = { uid: maker.uid, name: 'Maker', role: 'Trustee' };
    await expect(svc.decide(req, selfChecker, true, async () => {})).rejects.toMatchObject({
      code: 'SELF_APPROVAL',
    });
    expect(backend.store.get(req.id)!.status).toBe('PENDING');
    expect(events).toEqual(['approval.requested']);
  });

  it('approval applies the change exactly once', async () => {
    const { svc, backend, events } = setup();
    const req = await filePayout(svc);
    let applied = 0;
    const { applied: ok } = await svc.decide(req, checker, true, async () => {
      applied += 1;
    });
    expect(ok).toBe(true);
    expect(applied).toBe(1);
    expect(backend.store.get(req.id)!.status).toBe('APPROVED');
    expect(backend.store.get(req.id)!.appliedAt).toBe(NOW);
    expect(events).toEqual(['approval.requested', 'approval.approved', 'approval.applied']);
    // A second decide attempt on the decided doc is refused.
    const decided = backend.store.get(req.id)!;
    await expect(svc.decide(decided, checker, true, async () => { applied += 1; })).rejects.toBeInstanceOf(
      ApprovalError
    );
    expect(applied).toBe(1);
  });

  it('rejection applies nothing', async () => {
    const { svc, backend, events } = setup();
    const req = await filePayout(svc);
    let applied = 0;
    const { applied: ok } = await svc.decide(req, checker, false, async () => {
      applied += 1;
    });
    expect(ok).toBe(false);
    expect(applied).toBe(0);
    expect(backend.store.get(req.id)!.status).toBe('REJECTED');
    expect(events).toEqual(['approval.requested', 'approval.rejected']);
  });

  it('a failing applier leaves the request retryable; the retry applies once', async () => {
    const { svc, backend, events } = setup();
    const req = await filePayout(svc);
    const { applied: first } = await svc.decide(req, checker, true, async () => {
      throw new Error('quota blocked');
    });
    expect(first).toBe(false);
    const failed = backend.store.get(req.id)!;
    expect(failed.status).toBe('APPROVED');
    expect(failed.applyError).toContain('quota blocked');
    expect(events).toContain('approval.applyFailed');

    let applied = 0;
    const retried = await svc.retryApply(failed, checker, async () => {
      applied += 1;
    });
    expect(retried).toBe(true);
    expect(applied).toBe(1);
    expect(backend.store.get(req.id)!.appliedAt).toBe(NOW);
  });

  it('a tampered payload is refused at apply', async () => {
    const { svc, backend } = setup();
    const req = await filePayout(svc);
    const tampered: ApprovalRequestDoc = {
      ...req,
      payload: { tx: { id: 'tx1', amount: 999999 } },
    };
    backend.store.set(req.id, tampered);
    let applied = 0;
    const { applied: ok } = await svc.decide(tampered, checker, true, async () => {
      applied += 1;
    });
    expect(ok).toBe(false);
    expect(applied).toBe(0);
    expect(backend.store.get(req.id)!.applyError).toContain('digest mismatch');
  });
});

describe('cancel', () => {
  it('the maker may cancel; a checker may not', async () => {
    const { svc, backend, events } = setup();
    const req = await filePayout(svc);
    await expect(svc.cancel(req, checker)).rejects.toMatchObject({ code: 'NOT_CANCELLABLE' });
    const cancelled = await svc.cancel(req, maker);
    expect(cancelled.status).toBe('CANCELLED');
    expect(backend.store.get(req.id)!.status).toBe('CANCELLED');
    expect(events).toEqual(['approval.requested', 'approval.cancelled']);
  });
});
