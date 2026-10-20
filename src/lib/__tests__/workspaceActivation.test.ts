/**
 * workspaceActivation.test.ts — QUEUED #50 (audit D7) pins.
 * =====================================================================
 * After registering a new organisation, activation must resolve to
 * THE CREATED workspace — never a stale active id, never the demo,
 * never another org — with the creator as Trustee in the staff view.
 * And the Orgs-list "Current" badge follows the active-id pointer,
 * not a fallback-resolved object.
 */

import {
  activationForCreatedWorkspace,
  isCurrentWorkspace,
} from '../workspaceActivation';

describe('activationForCreatedWorkspace', () => {
  it('activates exactly the created workspace', () => {
    const a = activationForCreatedWorkspace({ id: 'WS-2504' });
    expect(a.activeWorkspaceId).toBe('WS-2504');
  });

  it('never resolves to a demo workspace for a real creation', () => {
    const a = activationForCreatedWorkspace({ id: 'WS-5219' });
    expect(a.activeWorkspaceId.startsWith('DEMO_')).toBe(false);
  });

  it('creator lands as Trustee in the manager (staff) view', () => {
    const a = activationForCreatedWorkspace({ id: 'WS-6508' });
    expect(a.role).toBe('Trustee');
    expect(a.viewMode).toBe('MANAGER');
  });

  it('each created org activates itself — no first-org gravity', () => {
    for (const id of ['WS-6508', 'WS-2504', 'WS-5098', 'WS-2358', 'WS-5219']) {
      expect(activationForCreatedWorkspace({ id }).activeWorkspaceId).toBe(id);
    }
  });
});

describe('isCurrentWorkspace', () => {
  it('true only for the exact active id', () => {
    expect(isCurrentWorkspace('WS-2358', 'WS-2358')).toBe(true);
    expect(isCurrentWorkspace('WS-6508', 'WS-2358')).toBe(false);
  });

  it('the audited case: Gurukul in use, Mandir must NOT badge Current', () => {
    // The old badge compared against a fallback-resolved object that
    // returned the first list entry (the Mandir) while the pointer —
    // and the user — were in the Gurukul.
    expect(isCurrentWorkspace('WS-6508', 'WS-2358')).toBe(false);
    expect(isCurrentWorkspace('WS-2358', 'WS-2358')).toBe(true);
  });

  it('empty or missing ids are never current', () => {
    expect(isCurrentWorkspace('', '')).toBe(false);
    expect(isCurrentWorkspace('WS-6508', '')).toBe(false);
    expect(isCurrentWorkspace('', 'WS-6508')).toBe(false);
    expect(isCurrentWorkspace(null, 'WS-6508')).toBe(false);
    expect(isCurrentWorkspace('WS-6508', undefined)).toBe(false);
  });
});
