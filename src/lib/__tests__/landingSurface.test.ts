/**
 * landingSurface.test.ts — QUEUED #55 pins.
 * =====================================================================
 * Org landing follows the user's ACTUAL role in THIS org: staff land
 * on the staff workspace, devotee-only members land on the Devotee
 * view, and an unresolved role lands on NEITHER (pending hold) — the
 * audited bug was a Trustee greeted by the Devotee view because the
 * guard guessed from the global 'Devotee' fallback before the
 * workspaceMembers edge resolved, and never released the guess.
 */

import {
  landingSurfaceForMembership,
  normalizeMembershipRole,
  resolveOrgLandingRole,
} from '../landingSurface';

const STAFF_ROLES = ['SuperAdmin', 'Trustee', 'Priest', 'Accountant', 'Sevadar', 'CSO'];

describe('normalizeMembershipRole', () => {
  it('passes canonical roles through', () => {
    for (const r of [...STAFF_ROLES, 'Devotee']) {
      expect(normalizeMembershipRole(r)).toBe(r);
    }
  });

  it('normalizes legacy spellings via the migration map', () => {
    expect(normalizeMembershipRole('SUPER_ADMIN')).toBe('SuperAdmin');
    expect(normalizeMembershipRole('TRUSTEE')).toBe('Trustee');
    expect(normalizeMembershipRole('PUROHIT')).toBe('Priest');
    expect(normalizeMembershipRole('MANAGER')).toBe('Sevadar');
    expect(normalizeMembershipRole('VOLUNTEER')).toBe('Sevadar');
    expect(normalizeMembershipRole('DEVOTEE')).toBe('Devotee');
  });

  it('returns null for absent or unreadable values', () => {
    expect(normalizeMembershipRole(null)).toBeNull();
    expect(normalizeMembershipRole(undefined)).toBeNull();
    expect(normalizeMembershipRole('')).toBeNull();
    expect(normalizeMembershipRole('wizard')).toBeNull();
  });
});

describe('landingSurfaceForMembership', () => {
  it('sends every staff role to the workspace', () => {
    for (const r of STAFF_ROLES) {
      expect(landingSurfaceForMembership(r, true)).toBe('workspace');
    }
  });

  it('sends a devotee-only member to the devotee view — their org home', () => {
    expect(landingSurfaceForMembership('Devotee', true)).toBe('devotee');
  });

  it('resolves legacy spellings to the same surfaces', () => {
    expect(landingSurfaceForMembership('PUROHIT', true)).toBe('workspace');
    expect(landingSurfaceForMembership('MANAGER', true)).toBe('workspace');
    expect(landingSurfaceForMembership('DEVOTEE', true)).toBe('devotee');
  });

  it('never decides while the role is unresolved — not even for a Trustee', () => {
    for (const r of [...STAFF_ROLES, 'Devotee']) {
      expect(landingSurfaceForMembership(r, false)).toBe('pending');
    }
  });

  it('holds at pending for a resolved-but-unreadable role instead of guessing', () => {
    expect(landingSurfaceForMembership(null, true)).toBe('pending');
    expect(landingSurfaceForMembership(undefined, true)).toBe('pending');
    expect(landingSurfaceForMembership('wizard', true)).toBe('pending');
  });
});

describe('resolveOrgLandingRole', () => {
  const base = {
    workspaceId: 'WS-6508',
    membershipRole: null,
    membershipsLoaded: false,
    globalRole: 'Devotee',
    isCreator: false,
  };

  it('THE AUDIT CASE: the edge role wins over the global Devotee fallback, even mid-load', () => {
    // Owner of 🧪 Audit Mandir: global role Devotee, edge role Trustee.
    const r = resolveOrgLandingRole({ ...base, membershipRole: 'Trustee' });
    expect(r).toEqual({ role: 'Trustee', resolved: true });
    expect(landingSurfaceForMembership(r.role, r.resolved)).toBe('workspace');
  });

  it('a Devotee edge in THIS org wins over a staff global role (Trustee elsewhere)', () => {
    const r = resolveOrgLandingRole({
      ...base,
      membershipRole: 'Devotee',
      membershipsLoaded: true,
      globalRole: 'Trustee',
    });
    expect(r).toEqual({ role: 'Devotee', resolved: true });
    expect(landingSurfaceForMembership(r.role, r.resolved)).toBe('devotee');
  });

  it('staff edges land staff-side for every staff role', () => {
    for (const role of STAFF_ROLES) {
      const r = resolveOrgLandingRole({ ...base, membershipRole: role });
      expect(landingSurfaceForMembership(r.role, r.resolved)).toBe('workspace');
    }
  });

  it('no edge + list not loaded yet = pending (the role is still resolving)', () => {
    const r = resolveOrgLandingRole({ ...base });
    expect(r).toEqual({ role: null, resolved: false });
    expect(landingSurfaceForMembership(r.role, r.resolved)).toBe('pending');
  });

  it('no edge + list loaded = the global fallback speaks (legacy users-doc access)', () => {
    const devotee = resolveOrgLandingRole({ ...base, membershipsLoaded: true });
    expect(devotee).toEqual({ role: 'Devotee', resolved: true });
    const staff = resolveOrgLandingRole({
      ...base,
      membershipsLoaded: true,
      globalRole: 'Accountant',
    });
    expect(staff).toEqual({ role: 'Accountant', resolved: true });
  });

  it('H-11: the recorded creator is Trustee even before the edge list loads', () => {
    const r = resolveOrgLandingRole({ ...base, isCreator: true });
    expect(r).toEqual({ role: 'Trustee', resolved: true });
  });

  it('SuperAdmin global role resolves staff-side everywhere (mirrors effectiveRole)', () => {
    const r = resolveOrgLandingRole({
      ...base,
      membershipRole: 'Devotee',
      globalRole: 'SuperAdmin',
    });
    expect(r).toEqual({ role: 'SuperAdmin', resolved: true });
  });

  it('demo sandboxes resolve from the persona role — no edges exist there', () => {
    const trustee = resolveOrgLandingRole({
      ...base,
      workspaceId: 'DEMO_ws-mandir',
      globalRole: 'Trustee',
    });
    expect(landingSurfaceForMembership(trustee.role, trustee.resolved)).toBe('workspace');
    const devotee = resolveOrgLandingRole({
      ...base,
      workspaceId: 'DEMO_ws-mandir',
      globalRole: 'Devotee',
    });
    expect(landingSurfaceForMembership(devotee.role, devotee.resolved)).toBe('devotee');
  });

  it('a freshly created org lands its creator staff-side (activation consistency)', () => {
    // #50 activation also sets the global role to Trustee synchronously;
    // either evidence alone must suffice.
    const byCreator = resolveOrgLandingRole({ ...base, workspaceId: 'WS-9999', isCreator: true });
    expect(landingSurfaceForMembership(byCreator.role, byCreator.resolved)).toBe('workspace');
    const byGlobal = resolveOrgLandingRole({
      ...base,
      workspaceId: 'WS-9999',
      membershipsLoaded: true,
      globalRole: 'Trustee',
    });
    expect(landingSurfaceForMembership(byGlobal.role, byGlobal.resolved)).toBe('workspace');
  });
});
