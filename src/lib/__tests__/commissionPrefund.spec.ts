/**
 * commissionPrefund.spec.ts — unit tests for Seva Professional Phase 3
 * (commission pre-funding). Pure-logic tests + firebase-mocked batch tests.
 * Runs under jest (repo's CommonJS setup); Firebase modules are stubbed.
 *
 * The Phase-2 schedule mirror (scheduleMultiplierFor /
 * effectiveCommissionPercent) is tested against the documented examples
 * so a future swap to the real prathamSeva.ts import stays verified.
 */

const batchInstances: any[] = [];

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((...args: any[]) => ({ __collection: args })),
  doc: jest.fn((...args: any[]) => ({ id: 'mock-doc-id', __args: args })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteField: jest.fn(() => ({ __deleteField: true })),
  writeBatch: jest.fn(() => {
    const b = {
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    batchInstances.push(b);
    return b;
  }),
  serverTimestamp: jest.fn(() => 'MOCK_TS'),
}));
jest.mock('../firebase', () => ({ db: {}, auth: { currentUser: { uid: 'prov-1' } } }));

import { getDoc, getDocs } from 'firebase/firestore';
import {
  getCommissionDue,
  canCompleteSeva,
  estimateSevasCovered,
  planCompletion,
  commitCompletionBatch,
  freezeCommissionOnDispute,
  scheduleMultiplierFor,
  effectiveCommissionPercent,
  consumeFreeSeva,
  canAcceptPaidSevas,
  DEFAULT_PRATHAM_CONFIG,
  PrefundShortfallError,
  type OrderLike,
  type ProfessionalCommissionProfile,
} from '../sevaPro/commissionPrefund';

const getDocMock = getDoc as unknown as jest.Mock;
const getDocsMock = getDocs as unknown as jest.Mock;

function order(partial: Partial<OrderLike> = {}): OrderLike {
  return {
    id: 'order-1',
    providerUid: 'prov-1',
    clientUid: 'client-1',
    gigTitle: 'Satyanarayan Katha',
    amountGross: 1000,
    currency: 'BDT',
    commissionPercent: 12,
    commissionAmount: 120,
    providerNet: 880,
    status: 'in_progress',
    ...partial,
  };
}

function profile(partial: Partial<ProfessionalCommissionProfile> = {}): ProfessionalCommissionProfile {
  return {
    uid: 'prov-1',
    kind: 'purohit',
    profileId: 'prof-1',
    collection: 'purohits',
    verificationTier: 'VERIFIED',
    freeSevasRemaining: 0,
    completedSevasSinceVerified: 0,
    ...partial,
  };
}

function wallet(balance: number, totalSpent = 0): any {
  return {
    uid: 'prov-1', balance, currency: 'BDT',
    totalToppedUp: 0, totalSpent, totalReceived: 0,
  };
}

beforeEach(() => {
  batchInstances.length = 0;
  getDocMock.mockReset();
  getDocsMock.mockReset();
});

describe('Phase-2 mirror: schedule math', () => {
  it('walks brackets in order (documented default schedule)', () => {
    const s = DEFAULT_PRATHAM_CONFIG.commissionSchedule;
    expect(scheduleMultiplierFor(s, 0)).toBe(0);
    expect(scheduleMultiplierFor(s, 2)).toBe(0);
    expect(scheduleMultiplierFor(s, 3)).toBe(0.06);
    expect(scheduleMultiplierFor(s, 7)).toBe(0.06);
    expect(scheduleMultiplierFor(s, 8)).toBe(1.0);
    expect(scheduleMultiplierFor(s, 100)).toBe(1.0);
  });

  it('effectiveCommissionPercent: 12% x 0.06 = 0.72%', () => {
    expect(effectiveCommissionPercent(12, DEFAULT_PRATHAM_CONFIG, 4, 0)).toBe(0.72);
  });

  it('free sevas zero the percent regardless of schedule', () => {
    expect(effectiveCommissionPercent(12, DEFAULT_PRATHAM_CONFIG, 50, 2)).toBe(0);
  });

  it('consumeFreeSeva never goes below zero', () => {
    expect(consumeFreeSeva(3)).toBe(2);
    expect(consumeFreeSeva(0)).toBe(0);
  });

  it('only VERIFIED+ may accept paid sevas', () => {
    expect(canAcceptPaidSevas('VERIFIED')).toBe(true);
    expect(canAcceptPaidSevas('TRUSTED')).toBe(true);
    expect(canAcceptPaidSevas('REGISTERED')).toBe(false);
    expect(canAcceptPaidSevas(undefined)).toBe(false);
  });
});

describe('getCommissionDue', () => {
  it('zeroes the due when free sevas remain (Pratham Seva)', () => {
    const due = getCommissionDue(order(), profile({ freeSevasRemaining: 3 }));
    expect(due.amount).toBe(0);
    expect(due.isFreeSeva).toBe(true);
    expect(due.sevasRemaining).toBe(2); // after this completion
    expect(due.source).toBe('free_seva');
  });

  it('treats missing profile / missing fields as full commission (fail-safe)', () => {
    for (const p of [null, undefined, profile({ freeSevasRemaining: 0, verificationTier: 'REGISTERED' })]) {
      const due = getCommissionDue(order(), p as any);
      expect(due.amount).toBe(120);
      expect(due.isFreeSeva).toBe(false);
    }
  });

  it('applies the schedule multiplier: 4 completed sevas -> 0.06 x 12% of 1000 = 7', () => {
    const due = getCommissionDue(
      order(),
      profile({ completedSevasSinceVerified: 4 })
    );
    expect(due.source).toBe('schedule_tier');
    expect(due.percent).toBe(0.72);
    expect(due.amount).toBe(7); // min(round(1000*0.72/100), 120)
    expect(due.isFreeSeva).toBe(false);
  });

  it('full rate after the easing brackets: 20 completed sevas -> 120', () => {
    const due = getCommissionDue(order(), profile({ completedSevasSinceVerified: 20 }));
    expect(due.amount).toBe(120);
    expect(due.percent).toBe(12);
  });

  it('never exceeds the booking-time snapshot, even with a generous config', () => {
    const due = getCommissionDue(
      order({ commissionAmount: 50 }),
      profile({
        completedSevasSinceVerified: 20,
        prathamSevaConfigSnapshot: { commissionSchedule: [{ rate: 2.0 }] }, // clamped to 1.0 anyway
      })
    );
    expect(due.amount).toBeLessThanOrEqual(50);
  });

  it('free seva wins over any schedule position', () => {
    const due = getCommissionDue(
      order(),
      profile({ freeSevasRemaining: 1, completedSevasSinceVerified: 20 })
    );
    expect(due.isFreeSeva).toBe(true);
    expect(due.amount).toBe(0);
  });
});

describe('canCompleteSeva', () => {
  const due = getCommissionDue(order(), null);
  it('ok when balance exactly covers', () => {
    expect(canCompleteSeva(120, due)).toEqual({ ok: true, shortfall: 0 });
  });
  it('reports the shortfall otherwise', () => {
    expect(canCompleteSeva(45, due)).toEqual({ ok: false, shortfall: 75 });
  });
  it('a free seva always completes (zero due)', () => {
    const free = getCommissionDue(order(), profile({ freeSevasRemaining: 2 }));
    expect(canCompleteSeva(0, free)).toEqual({ ok: true, shortfall: 0 });
  });
});

describe('estimateSevasCovered', () => {
  it('floors balance / avg commission', () => {
    expect(estimateSevasCovered(1200, 120)).toBe(10);
    expect(estimateSevasCovered(1199, 120)).toBe(9);
  });
  it('returns 0 for missing/zero average', () => {
    expect(estimateSevasCovered(1200, 0)).toBe(0);
    expect(estimateSevasCovered(1200, NaN as any)).toBe(0);
  });
});

describe('planCompletion (pure)', () => {
  it('plans a schedule-tier debit: balance - due, totalSpent + due, counter +1', () => {
    const p = profile({ completedSevasSinceVerified: 4 }); // due = 7
    const plan = planCompletion({ order: order(), professional: p, wallet: wallet(500, 100) });
    expect(plan.due.amount).toBe(7);
    expect(plan.debitFromWallet).toBe(true);
    expect(plan.walletNewBalance).toBe(493);
    expect(plan.walletNewTotalSpent).toBe(107);
    expect(plan.profile?.completedSevasSinceVerified).toBe(5);
    expect(plan.profile?.decrementFreeSeva).toBe(false);
    expect(plan.profile?.freeSevasRemaining).toBeUndefined();
  });

  it('plans a free seva: no debit, counter decrements and advances', () => {
    const plan = planCompletion({
      order: order(),
      professional: profile({ freeSevasRemaining: 3, completedSevasSinceVerified: 1 }),
      wallet: wallet(0),
    });
    expect(plan.debitFromWallet).toBe(false);
    expect(plan.profile?.freeSevasRemaining).toBe(2);
    expect(plan.profile?.completedSevasSinceVerified).toBe(2);
    expect(plan.profile?.decrementFreeSeva).toBe(true);
  });

  it('skips the profile leg when no profile was found', () => {
    const plan = planCompletion({ order: order(), professional: null, wallet: wallet(500) });
    expect(plan.profile).toBeNull();
    expect(plan.due.amount).toBe(120);
  });

  it('throws PrefundShortfallError with structured data on shortfall', () => {
    try {
      planCompletion({
        order: order(), professional: profile({ completedSevasSinceVerified: 20 }), wallet: wallet(50),
      });
      fail('should have thrown');
    } catch (e: any) {
      expect(e).toBeInstanceOf(PrefundShortfallError);
      expect(e.shortfall).toBe(70);
      expect(e.balance).toBe(50);
      expect(e.due.amount).toBe(120);
    }
  });
});

describe('commitCompletionBatch (mocked firebase)', () => {
  it('writes all legs atomically: order, wallet debit, txn, revenue, profile counters', async () => {
    const p = profile({ completedSevasSinceVerified: 4 }); // due = 7
    const plan = planCompletion({ order: order(), professional: p, wallet: wallet(500, 100) });
    await commitCompletionBatch(plan);
    expect(batchInstances).toHaveLength(1);
    const b = batchInstances[0];
    const argsOf = (c: any[]) => JSON.stringify(c[0]?.__args ?? '');

    const orderUpdate = b.update.mock.calls.find((c: any[]) => argsOf(c).includes('marketplaceOrders'));
    expect(orderUpdate[1].status).toBe('completed');
    expect(orderUpdate[1].commissionCollected).toBe(7);
    expect(orderUpdate[1].completedVia).toBe('prefunded_commission');

    const walletUpdate = b.update.mock.calls.find((c: any[]) => argsOf(c).includes('wallets'));
    expect(walletUpdate[1].balance).toBe(493);
    expect(walletUpdate[1].totalSpent).toBe(107);
    expect(walletUpdate[1].lastCommissionOrderId).toBe('order-1');

    const txn = b.set.mock.calls.find((c: any[]) => c[1]?.type === 'commission');
    expect(txn[1].amount).toBe(7);
    expect(txn[1].orderId).toBe('order-1');

    const revenue = b.set.mock.calls.find((c: any[]) => argsOf(c).includes('platformRevenue'));
    expect(revenue[1].amount).toBe(7);
    expect(revenue[1].commissionWaived).toBeUndefined();

    const profUpdate = b.update.mock.calls.find((c: any[]) => argsOf(c).includes('purohits'));
    expect(profUpdate[1].completedSevasSinceVerified).toBe(5);
    expect(profUpdate[1].lastCommissionOrderId).toBe('order-1');
    expect('freeSevasRemaining' in profUpdate[1]).toBe(false); // unchanged -> not written

    expect(b.commit).toHaveBeenCalled();
  });

  it('free seva batch: no wallet leg, waived revenue doc, counter decrement', async () => {
    const plan = planCompletion({
      order: order(),
      professional: profile({ freeSevasRemaining: 3, completedSevasSinceVerified: 1 }),
      wallet: wallet(0),
    });
    await commitCompletionBatch(plan);
    const b = batchInstances[0];
    const argsOf = (c: any[]) => JSON.stringify(c[0]?.__args ?? '');

    expect(b.update.mock.calls.find((c: any[]) => argsOf(c).includes('wallets'))).toBeUndefined();

    const orderUpdate = b.update.mock.calls.find((c: any[]) => argsOf(c).includes('marketplaceOrders'));
    expect(orderUpdate[1].freeSevaApplied).toBe(true);

    const revenue = b.set.mock.calls.find((c: any[]) => argsOf(c).includes('platformRevenue'));
    expect(revenue[1].amount).toBe(0);
    expect(revenue[1].commissionWaived).toBe(true);
    expect(revenue[1].waivedReason).toBe('free_seva');

    const profUpdate = b.update.mock.calls.find((c: any[]) => argsOf(c).includes('purohits'));
    expect(profUpdate[1].freeSevasRemaining).toBe(2);
    expect(profUpdate[1].completedSevasSinceVerified).toBe(2);
  });
});

describe('freezeCommissionOnDispute (mocked firebase)', () => {
  it('moves an active order to commission_held with the dispute doc in one batch', async () => {
    getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ ...order(), status: 'in_progress' }) });
    const disputeId = await freezeCommissionOnDispute('order-1', 'Client says the katha was cut short.');
    const b = batchInstances[0];
    const argsOf = (c: any[]) => JSON.stringify(c[0]?.__args ?? '');

    const dispute = b.set.mock.calls.find((c: any[]) => argsOf(c).includes('marketplaceDisputes'));
    expect(dispute[1].status).toBe('open');
    expect(dispute[1].reason).toBe('commission_hold');

    const orderUpdate = b.update.mock.calls.find((c: any[]) => argsOf(c).includes('marketplaceOrders'));
    expect(orderUpdate[1].status).toBe('commission_held');
    expect(orderUpdate[1].commissionHold.frozenByUid).toBe('prov-1');
    expect(orderUpdate[1].commissionHold.disputeId).toBe(disputeId);
  });

  it('refuses to hold a completed order (use the freeze-request path instead)', async () => {
    getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ ...order(), status: 'completed' }) });
    await expect(freezeCommissionOnDispute('order-1', 'x'.repeat(10))).rejects.toThrow(
      'Only an active seva can be put on hold.'
    );
  });

  it('requires a reason', async () => {
    getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ ...order(), status: 'paid' }) });
    await expect(freezeCommissionOnDispute('order-1', '   ')).rejects.toThrow(
      'Please say what the issue is.'
    );
  });
});
