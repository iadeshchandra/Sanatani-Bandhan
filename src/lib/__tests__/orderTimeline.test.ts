/**
 * orderTimeline.test.ts — QUEUED #26: the pure stage→timeline model.
 * Pins every path (wallet / rail-1 / rail-2 / Seva Bazar / pay-after-task),
 * every live status, and the honest terminal states.
 */
import { buildOrderTimeline, orderPathOf, tsToIso, type OrderLike } from '../orderTimeline';

const fakeTs = (iso: string) => ({ toDate: () => new Date(iso) });
const stage = (m: ReturnType<typeof buildOrderTimeline>, k: string) =>
  m.stages.find((s) => s.key === k)!;
const keys = (m: ReturnType<typeof buildOrderTimeline>) => m.stages.map((s) => s.key);

describe('tsToIso', () => {
  it('handles Firestore-like timestamps, seconds, strings, Dates, garbage', () => {
    expect(tsToIso(fakeTs('2026-10-20T05:00:00.000Z'))).toBe('2026-10-20T05:00:00.000Z');
    expect(tsToIso({ seconds: 1792488000 })).toBe(new Date(1792488000 * 1000).toISOString());
    expect(tsToIso('2026-10-20T05:00:00.000Z')).toBe('2026-10-20T05:00:00.000Z');
    expect(tsToIso(new Date('2026-10-20T05:00:00.000Z'))).toBe('2026-10-20T05:00:00.000Z');
    expect(tsToIso('not a date')).toBeUndefined();
    expect(tsToIso(null)).toBeUndefined();
    expect(tsToIso(undefined)).toBeUndefined();
    expect(tsToIso({})).toBeUndefined();
  });
});

describe('orderPathOf', () => {
  it('resolves the payment path with sane precedence', () => {
    expect(orderPathOf({ payAfterTask: true, rail: 'rail2' })).toBe('after_task');
    expect(orderPathOf({ sevaBazar: { postId: 'p1' }, rail: 'rail2' })).toBe('seva_bazar');
    expect(orderPathOf({ payWithWallet: true, rail: 'rail1' })).toBe('wallet');
    expect(orderPathOf({ walletPaid: true })).toBe('wallet');
    expect(orderPathOf({ rail: 'rail2' })).toBe('rail2');
    expect(orderPathOf({ rail: 'rail1' })).toBe('rail1');
    expect(orderPathOf({})).toBe('rail1');
  });
});

describe('rail-1 journey', () => {
  const base: OrderLike = { rail: 'rail1', createdAt: '2026-10-20T04:00:00.000Z' };

  it('pending_payment: request placed, dakshina current, provider acts (confirms receipt)', () => {
    const m = buildOrderTimeline({ ...base, status: 'pending_payment' });
    expect(m.path).toBe('rail1');
    expect(m.outcome).toBe('in_journey');
    expect(keys(m)).toEqual(['requested', 'dakshina', 'accepted', 'in_seva', 'blessed']);
    expect(stage(m, 'requested').state).toBe('done');
    expect(stage(m, 'requested').at).toBe('2026-10-20T04:00:00.000Z');
    expect(stage(m, 'dakshina').state).toBe('current');
    expect(stage(m, 'dakshina').actor).toBe('provider');
    expect(stage(m, 'accepted').state).toBe('upcoming');
    expect(m.currentKey).toBe('dakshina');
  });

  it('paid: dakshina done with paidAt, acceptance current', () => {
    const m = buildOrderTimeline({ ...base, status: 'paid', paidAt: fakeTs('2026-10-20T05:00:00.000Z') });
    expect(stage(m, 'dakshina').state).toBe('done');
    expect(stage(m, 'dakshina').at).toBe('2026-10-20T05:00:00.000Z');
    expect(stage(m, 'accepted').state).toBe('current');
    expect(stage(m, 'accepted').actor).toBe('provider');
  });

  it('accepted: seva stage current, awaiting the muhurat', () => {
    const m = buildOrderTimeline({ ...base, status: 'accepted' });
    expect(stage(m, 'in_seva').state).toBe('current');
    expect(stage(m, 'in_seva').detail).toBe('to_begin');
  });

  it('in_progress: seva stage current and underway', () => {
    const m = buildOrderTimeline({ ...base, status: 'in_progress' });
    expect(stage(m, 'in_seva').state).toBe('current');
    expect(stage(m, 'in_seva').detail).toBe('underway');
    expect(stage(m, 'blessed').state).toBe('upcoming');
  });

  it('completed: every stage done, blessed carries completedAt', () => {
    const m = buildOrderTimeline({ ...base, status: 'completed', completedAt: '2026-10-21T06:00:00.000Z' });
    expect(m.outcome).toBe('complete');
    expect(m.stages.every((s) => s.state === 'done')).toBe(true);
    expect(stage(m, 'blessed').at).toBe('2026-10-21T06:00:00.000Z');
    expect(m.currentKey).toBeUndefined();
  });
});

describe('wallet + rail-2 + seva bazar journeys', () => {
  it('wallet pending: dakshina current, the CLIENT acts (pays from wallet)', () => {
    const m = buildOrderTimeline({ status: 'pending_payment', payWithWallet: true });
    expect(m.path).toBe('wallet');
    expect(stage(m, 'dakshina').state).toBe('current');
    expect(stage(m, 'dakshina').actor).toBe('client');
  });

  it('rail-2 paid: dakshina done via proof submission time', () => {
    const m = buildOrderTimeline({
      status: 'paid', rail: 'rail2',
      rail2Proof: { submittedAt: '2026-10-20T05:30:00.000Z' },
    });
    expect(stage(m, 'dakshina').state).toBe('done');
    expect(stage(m, 'dakshina').at).toBe('2026-10-20T05:30:00.000Z');
    expect(stage(m, 'accepted').state).toBe('current');
  });

  it('seva bazar: rail-2 family, token-advance stage, client acts first', () => {
    const m = buildOrderTimeline({ status: 'pending_payment', rail: 'rail2', sevaBazar: { postId: 'x' } });
    expect(m.path).toBe('seva_bazar');
    expect(stage(m, 'dakshina').state).toBe('current');
    expect(stage(m, 'dakshina').actor).toBe('client');
  });
});

describe('pay-after-task journey (no dakshina stage)', () => {
  const base: OrderLike = { payAfterTask: true, rail: 'rail2' };

  it('pending_payment waits on acceptance, not payment', () => {
    const m = buildOrderTimeline({ ...base, status: 'pending_payment' });
    expect(keys(m)).toEqual(['requested', 'accepted', 'in_seva', 'contribution', 'blessed']);
    expect(stage(m, 'accepted').state).toBe('current');
    expect(m.currentKey).toBe('accepted');
  });

  it('awaiting_commission: seva offered, contribution current, client acts', () => {
    const m = buildOrderTimeline({
      ...base, status: 'awaiting_commission', taskCompletedAt: '2026-10-21T07:00:00.000Z',
    });
    expect(stage(m, 'in_seva').state).toBe('done');
    expect(stage(m, 'in_seva').detail).toBe('offered');
    expect(stage(m, 'in_seva').at).toBe('2026-10-21T07:00:00.000Z');
    expect(stage(m, 'contribution').state).toBe('current');
    expect(stage(m, 'contribution').actor).toBe('client');
    expect(stage(m, 'blessed').state).toBe('upcoming');
  });

  it('completed after-task journey includes the contribution stage, done', () => {
    const m = buildOrderTimeline({ ...base, status: 'completed', completedAt: '2026-10-22T07:00:00.000Z' });
    expect(keys(m)).toContain('contribution');
    expect(m.stages.every((s) => s.state === 'done')).toBe(true);
  });

  it('awaiting_commission on a non-after-task order still inserts the stage', () => {
    const m = buildOrderTimeline({ status: 'awaiting_commission', rail: 'rail2' });
    expect(keys(m)).toEqual(['requested', 'dakshina', 'accepted', 'in_seva', 'contribution', 'blessed']);
    expect(stage(m, 'contribution').state).toBe('current');
  });
});

describe('terminal states — honest ends, never a fake happy path', () => {
  it('cancelled before payment: dakshina skipped, terminal marked', () => {
    const m = buildOrderTimeline({ status: 'cancelled', rail: 'rail1', updatedAt: '2026-10-20T09:00:00.000Z' });
    expect(m.outcome).toBe('cancelled');
    expect(m.terminal?.kind).toBe('cancelled');
    expect(m.terminal?.at).toBe('2026-10-20T09:00:00.000Z');
    expect(stage(m, 'requested').state).toBe('done');
    expect(stage(m, 'dakshina').state).toBe('skipped');
    expect(stage(m, 'blessed').state).toBe('skipped');
    expect(m.currentKey).toBeUndefined();
  });

  it('cancelled after payment: dakshina honestly done, the rest skipped', () => {
    const m = buildOrderTimeline({ status: 'cancelled', rail: 'rail1', paidAt: '2026-10-20T05:00:00.000Z' });
    expect(stage(m, 'dakshina').state).toBe('done');
    expect(stage(m, 'accepted').state).toBe('skipped');
  });

  it('disputed: payment stage done (disputes open after payment), journey paused', () => {
    const m = buildOrderTimeline({ status: 'disputed', rail: 'rail2' });
    expect(m.outcome).toBe('disputed');
    expect(stage(m, 'dakshina').state).toBe('done');
    expect(stage(m, 'in_seva').state).toBe('skipped');
  });

  it('refunded: dakshina was offered and returned', () => {
    const m = buildOrderTimeline({ status: 'refunded', rail: 'rail1' });
    expect(m.outcome).toBe('refunded');
    expect(stage(m, 'dakshina').state).toBe('done');
    expect(stage(m, 'blessed').state).toBe('skipped');
  });
});

describe('unknown status', () => {
  it('falls back to the start of the journey — never crashes, never invents', () => {
    const m = buildOrderTimeline({ status: 'bogus' });
    expect(m.outcome).toBe('in_journey');
    expect(m.currentKey).toBe('requested');
    expect(stage(m, 'requested').state).toBe('current');
  });

  it('empty order is safe', () => {
    const m = buildOrderTimeline({});
    expect(m.stages.length).toBeGreaterThan(0);
    expect(m.path).toBe('rail1');
  });
});
