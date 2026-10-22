/**
 * membershipAccess.test.ts — Blueprint B scope + expiry law.
 * ================================================================
 * Pins: expired → Devotee floor + no staff desks; scope is an
 * intersection with honest exemptions (home can never be fenced);
 * the creator can never expire/demote/be removed; the last active
 * Trustee can never be drained by an edit or a removal — but a
 * workspace already at zero is not trapped.
 */
import {
  effectiveDeskScope,
  expiryState,
  guardAccessChange,
  guardMemberRemoval,
  isDeskInScope,
  membershipEffectiveRole,
  type MembershipAccessEdge,
} from '../membershipAccess';

const NOW = new Date('2026-10-22T00:00:00').getTime();
const DAY = 24 * 60 * 60 * 1000;

const edge = (over: Partial<MembershipAccessEdge>): MembershipAccessEdge => ({
  uid: 'u1',
  role: 'Sevadar',
  ...over,
});

describe('expiry', () => {
  it('an expired staff role degrades to the Devotee floor', () => {
    const e = edge({ role: 'Accountant', roleExpiresAt: NOW - 1 });
    expect(membershipEffectiveRole(e, NOW)).toBe('Devotee');
    expect(effectiveDeskScope(e, NOW)).toEqual([]);
  });

  it('an unexpired role keeps its role and scope', () => {
    const e = edge({ role: 'Accountant', roleExpiresAt: NOW + DAY, deskScope: ['treasury'] });
    expect(membershipEffectiveRole(e, NOW)).toBe('Accountant');
    expect(effectiveDeskScope(e, NOW)).toEqual(['treasury']);
  });

  it('the creator NEVER expires out of their own workspace', () => {
    const e = edge({ uid: 'creator', role: 'Trustee', roleExpiresAt: NOW - DAY });
    expect(membershipEffectiveRole(e, NOW, { creatorUid: 'creator' })).toBe('Trustee');
    expect(effectiveDeskScope(e, NOW, { creatorUid: 'creator' })).toBeNull();
  });

  it('legacy role strings resolve down (Manager → Sevadar)', () => {
    expect(membershipEffectiveRole(edge({ role: 'Manager' }), NOW)).toBe('Sevadar');
    expect(membershipEffectiveRole(edge({ role: 'Wizard' }), NOW)).toBe('Devotee');
  });

  it('a missing edge is the Devotee floor with no scope', () => {
    expect(membershipEffectiveRole(undefined, NOW)).toBe('Devotee');
    expect(effectiveDeskScope(undefined, NOW)).toBeNull();
  });

  it('expiryState reports the honest state', () => {
    expect(expiryState(edge({}), NOW)).toBe('none');
    expect(expiryState(edge({ roleExpiresAt: NOW + 30 * DAY }), NOW)).toBe('active');
    expect(expiryState(edge({ roleExpiresAt: NOW + 3 * DAY }), NOW)).toBe('expiringSoon');
    expect(expiryState(edge({ roleExpiresAt: NOW - 1 }), NOW)).toBe('expired');
  });
});

describe('scope', () => {
  it('null scope = everything in scope', () => {
    expect(isDeskInScope('treasury', null)).toBe(true);
    expect(isDeskInScope('anything', undefined)).toBe(true);
  });

  it('scope admits only its desks', () => {
    expect(isDeskInScope('treasury', ['dashboard', 'treasury'])).toBe(true);
    expect(isDeskInScope('campaigns', ['dashboard', 'treasury'])).toBe(false);
  });

  it('home and devotee surfaces are scope-exempt (never stranded)', () => {
    expect(isDeskInScope('dashboard', [])).toBe(true);
    expect(isDeskInScope('devotee-portal', [])).toBe(true);
  });
});

describe('continuity guards', () => {
  const trustees: MembershipAccessEdge[] = [
    edge({ uid: 't1', role: 'Trustee' }),
    edge({ uid: 's1', role: 'Sevadar' }),
  ];

  it('demoting the last Trustee is refused', () => {
    const r = guardAccessChange(trustees, 't1', { role: 'Sevadar' }, NOW);
    expect(r).toEqual({ ok: false, reason: 'LAST_TRUSTEE' });
  });

  it('expiring the last Trustee into the past is refused', () => {
    const r = guardAccessChange(trustees, 't1', { roleExpiresAt: NOW - 1 }, NOW);
    expect(r).toEqual({ ok: false, reason: 'LAST_TRUSTEE' });
  });

  it('removing the last Trustee is refused', () => {
    expect(guardMemberRemoval(trustees, 't1', NOW)).toEqual({
      ok: false,
      reason: 'LAST_TRUSTEE',
    });
  });

  it('with two Trustees, one may step down', () => {
    const two = [...trustees, edge({ uid: 't2', role: 'Trustee' })];
    expect(guardAccessChange(two, 't1', { role: 'Sevadar' }, NOW)).toEqual({ ok: true, reason: null });
    expect(guardMemberRemoval(two, 't1', NOW)).toEqual({ ok: true, reason: null });
  });

  it('the creator cannot be demoted, expired or removed', () => {
    const g = { creatorUid: 't1' };
    expect(guardAccessChange(trustees, 't1', { role: 'Sevadar' }, NOW, g)).toEqual({
      ok: false,
      reason: 'CREATOR_PROTECTED',
    });
    expect(guardAccessChange(trustees, 't1', { roleExpiresAt: NOW + DAY }, NOW, g)).toEqual({
      ok: false,
      reason: 'CREATOR_PROTECTED',
    });
    expect(guardMemberRemoval(trustees, 't1', NOW, g)).toEqual({
      ok: false,
      reason: 'CREATOR_PROTECTED',
    });
  });

  it('an already-drained workspace is not trapped by the guard', () => {
    const drained: MembershipAccessEdge[] = [
      edge({ uid: 't1', role: 'Trustee', roleExpiresAt: NOW - DAY }),
      edge({ uid: 's1', role: 'Sevadar' }),
    ];
    // No ACTIVE trustee remains (t1 lapsed) — editing s1 must not be blocked.
    expect(guardAccessChange(drained, 's1', { role: 'Accountant' }, NOW)).toEqual({ ok: true, reason: null });
  });
});
