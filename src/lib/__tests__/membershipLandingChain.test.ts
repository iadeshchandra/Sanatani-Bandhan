/**
 * membershipLandingChain.test.ts — UI/UX audit U7 pins.
 * =====================================================================
 * After a cache clear on a near-dead connection, a Trustee landed in
 * the Devotee view for the whole session. The chain: refreshMemberships
 * was one-shot; its catch set the list empty AND marked it loaded, so
 * the landing resolver's step 5 let the GLOBAL fallback ('Devotee' on
 * a Solo-first account) speak, and both landing layers agreed on the
 * wrong surface.
 *
 * The fixed chain, pinned here end to end at the law level:
 *  1. a failed fetch NEVER raises membershipsLoaded
 *     (membershipsLoadedAfterFetch);
 *  2. with the flag honestly false, the resolver holds UNRESOLVED
 *     and the surface is 'pending' — the render guard's neutral hold
 *     — never the devotee preview off the global fallback;
 *  3. when the retry succeeds, the real evidence speaks: a staff edge
 *     lands on the workspace;
 *  4. the #55 law is preserved: a genuinely devotee-only member
 *     (successful fetch, no edge) still lands on the Devotee view,
 *     and the workspace creator is never held pending.
 */

import { readFileSync } from 'fs';
import { resolve as pathResolve } from 'path';
import {
  landingSurfaceForMembership,
  membershipsLoadedAfterFetch,
  resolveOrgLandingRole,
} from '../landingSurface';

describe('membershipsLoadedAfterFetch — only success is evidence', () => {
  it('a failed FIRST fetch leaves the flag down', () => {
    expect(membershipsLoadedAfterFetch(false, false)).toBe(false);
  });

  it('a successful fetch raises the flag', () => {
    expect(membershipsLoadedAfterFetch(false, true)).toBe(true);
  });

  it('a failed RE-fetch keeps an already-proven flag up', () => {
    expect(membershipsLoadedAfterFetch(true, false)).toBe(true);
    expect(membershipsLoadedAfterFetch(true, true)).toBe(true);
  });
});

describe('the U7 chain — failed fetch holds at pending, retry heals', () => {
  const base = {
    workspaceId: 'WS-6508',
    globalRole: 'Devotee', // a Solo-first account's global role
    isCreator: false,
  };

  it('failed fetch → unresolved → pending (never the devotee preview)', () => {
    const loaded = membershipsLoadedAfterFetch(false, /* fetchSucceeded */ false);
    const state = resolveOrgLandingRole({ ...base, membershipsLoaded: loaded });
    expect(state.resolved).toBe(false);
    expect(landingSurfaceForMembership(state.role, state.resolved)).toBe('pending');
  });

  it('retry succeeds with a Trustee edge → workspace', () => {
    const loaded = membershipsLoadedAfterFetch(false, /* fetchSucceeded */ true);
    const state = resolveOrgLandingRole({
      ...base,
      membershipRole: 'Trustee',
      membershipsLoaded: loaded,
    });
    expect(state).toEqual({ role: 'Trustee', resolved: true });
    expect(landingSurfaceForMembership(state.role, state.resolved)).toBe('workspace');
  });

  it('retry succeeds, edge arrives a beat later → the edge speaks even mid-load', () => {
    const state = resolveOrgLandingRole({
      ...base,
      membershipRole: 'Accountant',
      membershipsLoaded: false,
    });
    expect(state.resolved).toBe(true);
    expect(landingSurfaceForMembership(state.role, state.resolved)).toBe('workspace');
  });
});

describe('#55 law preserved', () => {
  it('a genuinely devotee-only member lands on the Devotee view', () => {
    const state = resolveOrgLandingRole({
      workspaceId: 'WS-6508',
      membershipsLoaded: true, // fetch SUCCEEDED — empty is real evidence here
      globalRole: 'Devotee',
      isCreator: false,
    });
    expect(state.resolved).toBe(true);
    expect(landingSurfaceForMembership(state.role, state.resolved)).toBe('devotee');
  });

  it('the workspace creator is never held pending by a failed fetch', () => {
    const state = resolveOrgLandingRole({
      workspaceId: 'WS-6508',
      membershipsLoaded: membershipsLoadedAfterFetch(false, false),
      globalRole: 'Devotee',
      isCreator: true,
    });
    expect(state).toEqual({ role: 'Trustee', resolved: true });
    expect(landingSurfaceForMembership(state.role, state.resolved)).toBe('workspace');
  });

  it('a global SuperAdmin is never held pending', () => {
    const state = resolveOrgLandingRole({
      workspaceId: 'WS-6508',
      membershipsLoaded: false,
      globalRole: 'SuperAdmin',
      isCreator: false,
    });
    expect(state.resolved).toBe(true);
    expect(landingSurfaceForMembership(state.role, state.resolved)).toBe('workspace');
  });
});

describe('wiring contracts (source guards)', () => {
  const root = pathResolve(__dirname, '..', '..', '..');
  const membershipCtx = readFileSync(
    pathResolve(root, 'src', 'context', 'MembershipContext.tsx'),
    'utf8'
  );
  const shell = readFileSync(
    pathResolve(root, 'src', 'components', 'shell', 'OrgSpaceShell.tsx'),
    'utf8'
  );

  it('refreshMemberships settles the flag through the law, not a finally', () => {
    expect(membershipCtx).toContain(
      'membershipsLoadedAfterFetch(membershipsLoadedRef.current, fetchOk)'
    );
    expect(membershipCtx).not.toContain('finally {\n      setMembershipsLoaded(true);');
  });

  it('membership reads normalize timestamps at the reader (U1)', () => {
    expect(membershipCtx).toContain('normalizeMembershipDoc(d.data())');
  });

  it('reconnect retries the fetch', () => {
    expect(membershipCtx).toContain("addEventListener('online'");
  });

  it('org entry retries the fetch while evidence is unresolved', () => {
    expect(shell).toContain('if (orgId && !membershipsLoaded)');
    expect(shell).toContain('void refreshMemberships()');
  });
});
