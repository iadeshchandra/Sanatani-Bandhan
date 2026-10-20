/**
 * workspaceKind.test.ts — QUEUED #45 seed-law gating.
 *
 * Pins the rule: fictitious seed data may hydrate ONLY in an explicit demo
 * context (DEMO_* ids or the legacy fixture org ids). Every real workspace
 * id the register flow can mint ("WS-XXXX") must refuse seed data, so a
 * fresh org boots honestly empty.
 */
import { isDemoWorkspaceId, isFixtureWorkspaceId, allowsSeedData } from '../workspaceKind';

describe('isDemoWorkspaceId', () => {
  it('accepts the quarantined demo workspaces', () => {
    expect(isDemoWorkspaceId('DEMO_ws-mandir')).toBe(true);
    expect(isDemoWorkspaceId('DEMO_ws-goshala')).toBe(true);
    expect(isDemoWorkspaceId('DEMO_ws-sangha')).toBe(true);
  });

  it('rejects real, fixture, solo and empty ids', () => {
    expect(isDemoWorkspaceId('WS-6508')).toBe(false);
    expect(isDemoWorkspaceId('ws-mandir')).toBe(false);
    expect(isDemoWorkspaceId('')).toBe(false);
    expect(isDemoWorkspaceId(undefined)).toBe(false);
    expect(isDemoWorkspaceId(null)).toBe(false);
  });
});

describe('isFixtureWorkspaceId', () => {
  it('accepts the legacy fixture org ids stamped on INITIAL_* data', () => {
    expect(isFixtureWorkspaceId('ws-mandir')).toBe(true);
    expect(isFixtureWorkspaceId('ws-goshala')).toBe(true);
    expect(isFixtureWorkspaceId('ws-gurukul')).toBe(true);
  });

  it('rejects demo and real ids', () => {
    expect(isFixtureWorkspaceId('DEMO_ws-mandir')).toBe(false);
    expect(isFixtureWorkspaceId('WS-2504')).toBe(false);
    expect(isFixtureWorkspaceId('ws-unknown')).toBe(false);
  });
});

describe('allowsSeedData (the seed law)', () => {
  it('allows seed data in explicit demo contexts only', () => {
    expect(allowsSeedData('DEMO_ws-mandir')).toBe(true);
    expect(allowsSeedData('DEMO_ws-ashram')).toBe(true);
    expect(allowsSeedData('ws-mandir')).toBe(true);
  });

  it('REFUSES seed data for every real workspace the register flow mints', () => {
    // The five audit orgs from the #45 sweep — all showed fictitious data.
    for (const id of ['WS-6508', 'WS-2504', 'WS-5098', 'WS-2358', 'WS-5219']) {
      expect(allowsSeedData(id)).toBe(false);
    }
  });

  it('fails closed for solo / unknown / missing ids', () => {
    expect(allowsSeedData('')).toBe(false);
    expect(allowsSeedData(undefined)).toBe(false);
    expect(allowsSeedData(null)).toBe(false);
    expect(allowsSeedData('SAN-VDWN4R')).toBe(false);
  });
});
