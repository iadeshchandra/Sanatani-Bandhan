/**
 * demoSessionRole.test.ts — UI/UX audit D-01 pins.
 * =====================================================================
 * The public demo delivered the Devotee app for EVERY chosen persona:
 * loginAsRole set the chosen role, then the anonymous sign-in it
 * triggered resolved into the auth listener's C-2 branch, which reset
 * the role to 'Devotee'. The fix (lib/demoSession): the explicit demo
 * grant is stashed session-scoped BEFORE the sign-in, and the
 * listener resolves through resolveAnonymousSessionRole.
 *
 * Boot matrix: every demo org type × every demo view must boot into
 * exactly the role the visitor picked. C-2 must ALSO hold: with no
 * explicit grant — or an unreadable one — anonymous means Devotee,
 * and an unknown stash can never escalate anyone.
 */

import { readFileSync } from 'fs';
import { resolve as pathResolve } from 'path';
import {
  DEMO_ROLE_FOR_VIEW,
  clearDemoSessionRole,
  readDemoSessionRole,
  resolveAnonymousSessionRole,
  stashDemoSessionRole,
} from '../demoSession';
import type { DemoView } from '../../components/public/DemoSelectionModal';
import type { WorkspaceType } from '../../types';

// The demo picker's org types (DemoSelectionModal ORG_TYPES).
const DEMO_ORG_TYPES: WorkspaceType[] = [
  'Mandir', 'Goshala', 'Sangha', 'Ashram', 'Gurukul',
  'AkshayaPatra', 'MahotsavSamiti', 'PurohitSabha', 'KashiKshetra', 'Trust',
  'Tirth', 'Vidyalaya',
];

const DEMO_VIEWS: DemoView[] = [
  'trustee', 'devotee', 'priest', 'accountant', 'sevadar', 'superadmin',
];

describe('demo boot matrix — every type × view boots the chosen role', () => {
  for (const type of DEMO_ORG_TYPES) {
    for (const view of DEMO_VIEWS) {
      it(`${type} × ${view} → ${DEMO_ROLE_FOR_VIEW[view]}`, () => {
        const chosen = DEMO_ROLE_FOR_VIEW[view];
        // What the visitor picked is exactly what loginAsRole stashes,
        // and exactly what the anonymous branch must resolve to —
        // for every org type alike (the type never changes the role).
        expect(resolveAnonymousSessionRole(chosen)).toBe(chosen);
      });
    }
  }

  it('maps the picker views to the intended roles', () => {
    expect(DEMO_ROLE_FOR_VIEW.trustee).toBe('Trustee');
    expect(DEMO_ROLE_FOR_VIEW.devotee).toBe('Devotee');
    expect(DEMO_ROLE_FOR_VIEW.priest).toBe('Priest');
    expect(DEMO_ROLE_FOR_VIEW.accountant).toBe('Accountant');
    expect(DEMO_ROLE_FOR_VIEW.sevadar).toBe('Sevadar');
    expect(DEMO_ROLE_FOR_VIEW.superadmin).toBe('SuperAdmin');
  });
});

describe('C-2 still holds — no explicit grant, no elevation', () => {
  it('no stash resolves to Devotee', () => {
    expect(resolveAnonymousSessionRole(null)).toBe('Devotee');
    expect(resolveAnonymousSessionRole(undefined)).toBe('Devotee');
    expect(resolveAnonymousSessionRole('')).toBe('Devotee');
  });

  it('an unreadable or unknown stash resolves DOWN to Devotee', () => {
    expect(resolveAnonymousSessionRole('garbage')).toBe('Devotee');
    expect(resolveAnonymousSessionRole('RootUser')).toBe('Devotee');
    expect(resolveAnonymousSessionRole('owner')).toBe('Devotee');
    expect(resolveAnonymousSessionRole('super-user')).toBe('Devotee');
  });

  it('legacy spellings of a real grant still resolve (migration map)', () => {
    expect(resolveAnonymousSessionRole('TRUSTEE')).toBe('Trustee');
    expect(resolveAnonymousSessionRole('SUPER_ADMIN')).toBe('SuperAdmin');
    expect(resolveAnonymousSessionRole('PUROHIT')).toBe('Priest');
  });

  it('the stash helpers never throw without web storage (node)', () => {
    expect(() => stashDemoSessionRole('Trustee')).not.toThrow();
    expect(() => clearDemoSessionRole()).not.toThrow();
    // Node has no sessionStorage — read degrades to "no grant".
    expect(readDemoSessionRole()).toBeNull();
  });
});

describe('wiring contracts (source guards)', () => {
  const root = pathResolve(__dirname, '..', '..', '..');
  const authCtx = readFileSync(
    pathResolve(root, 'src', 'context', 'AuthWorkspaceContext.tsx'),
    'utf8'
  );
  const starter = readFileSync(
    pathResolve(root, 'src', 'hooks', 'useDemoStarter.ts'),
    'utf8'
  );

  it('the anonymous branch resolves through the demo-session law', () => {
    expect(authCtx).toContain('resolveAnonymousSessionRole(');
    expect(authCtx).toContain('readDemoSessionRole()');
  });

  it('loginAsRole stashes the grant before the anonymous sign-in', () => {
    expect(authCtx).toContain('stashDemoSessionRole(normalized)');
    const stashAt = authCtx.indexOf('stashDemoSessionRole(normalized)');
    const signInAt = authCtx.indexOf('signInAnonymously(auth)', stashAt);
    expect(stashAt).toBeGreaterThan(-1);
    expect(signInAt).toBeGreaterThan(stashAt);
  });

  it('logout and exitDemo clear the grant', () => {
    expect(authCtx).toContain('clearDemoSessionRole()');
    expect(authCtx.split('clearDemoSessionRole()').length - 1).toBeGreaterThanOrEqual(3);
  });

  it('the demo starter uses the one shared role map', () => {
    expect(starter).toContain(
      "import { DEMO_ROLE_FOR_VIEW } from '../lib/demoSession'"
    );
  });
});
