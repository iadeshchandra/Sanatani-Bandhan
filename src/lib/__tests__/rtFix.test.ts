/**
 * rtFix.test.ts — RT-FIX closures for the 2026-10-31 route/org-door
 * audit (~/workspace/staging/route-audit/REPORT.md).
 *
 * RT-01/03: the portal Org toggle's lock verdict comes from per-org
 *   evidence (lib/orgConsoleAccess), never the global role alone; the
 *   locked toggle opens an explanation sheet (render-pinned below).
 * RT-02: the portal carries Grow + Margdarshan doors (source-pinned).
 * RT-04: 'margdarshan' is in the ONE devotee allow-list both App
 *   gates consume, and the diagnostics mirror agrees.
 * RT-05: no fabricated pass ID anywhere in src (the old hardcoded
 *   fallback is gone); displaySanataniId shows the real ID or an
 *   honest pending label.
 * RT-06: public paths match EXACTLY; unknown sub-paths fall to 404.
 * RT-07: lazy public routes use the warm skeleton fallback.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveOrgConsoleAccess } from '../orgConsoleAccess';
import type { MembershipAccessEdge } from '../membershipAccess';
import { isPublicPath, PUBLIC_PATHS } from '../publicPaths';
import { displaySanataniId } from '../passId';
import { canRoleAccessDesk } from '../../utils/rbacDiagnostics';
import { OrgConsoleLockSheet } from '../../components/domain5/OrgConsoleLockSheet';

jest.mock('react-dom', () => {
  const actual = jest.requireActual('react-dom');
  return { ...actual, createPortal: (children: unknown) => children };
});

// The resolver under test is pure; the hook's contexts pull Firebase
// ESM into the module graph, so they are stubbed at the boundary.
jest.mock('../../context/AuthWorkspaceContext', () => ({
  useAuthWorkspace: () => ({
    activeWorkspace: null,
    currentRole: 'Devotee',
    firebaseUser: null,
  }),
}));

jest.mock('../../context/MembershipContext', () => ({
  useMembership: () => ({ myMemberships: [], membershipsLoaded: true }),
}));

jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string) => {
      if (k === 'surfaces.devoteePortal.orgLockSheetTitle') return 'The {org} console is staff-only';
      if (k === 'surfaces.devoteePortal.orgLockWhy') return 'Why: {org} staff only';
      if (k === 'surfaces.devoteePortal.orgLockStaffNote') return 'Staff note for {org}';
      return k;
    },
  }),
}));

const FABRICATED_ID = 'SB-PASS-' + '1008';
const SRC = path.join(__dirname, '..', '..');
const readSrc = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

const edge = (role: string, over: Partial<MembershipAccessEdge> = {}): MembershipAccessEdge => ({
  uid: 'u1',
  role,
  deskScope: null,
  roleExpiresAt: null,
  ...over,
});

const base = {
  workspaceId: 'WS-1',
  membership: null as MembershipAccessEdge | null,
  membershipsLoaded: true,
  globalRole: 'Devotee',
  isCreator: false,
};

describe('RT-03 — org console verdict from per-org evidence', () => {
  it('staff of THIS org unlocks even when the global role is Devotee', () => {
    const v = resolveOrgConsoleAccess({ ...base, membership: edge('Sevadar') });
    expect(v).toEqual({ canOpenConsole: true, role: 'Sevadar', resolved: true });
  });

  it('legacy edge spellings canonicalise before judging (Volunteer → Sevadar)', () => {
    const v = resolveOrgConsoleAccess({ ...base, membership: edge('VOLUNTEER') });
    expect(v.canOpenConsole).toBe(true);
    expect(v.role).toBe('Sevadar');
  });

  it('staff of ANOTHER org only stays locked (the owner-report case class)', () => {
    // The hook hands the resolver only THIS workspace's edge; a
    // Trustee elsewhere arrives as membership: null with a global
    // Trustee role — and the global role must NOT unlock this door.
    const v = resolveOrgConsoleAccess({ ...base, globalRole: 'Trustee', membership: null });
    expect(v.canOpenConsole).toBe(false);
    expect(v.role).toBe('Devotee');
    expect(v.resolved).toBe(true);
  });

  it('a pure devotee of this org is locked', () => {
    const v = resolveOrgConsoleAccess({ ...base, membership: edge('Devotee') });
    expect(v.canOpenConsole).toBe(false);
    expect(v.role).toBe('Devotee');
  });

  it('an expired staff edge degrades to the devotee floor', () => {
    const v = resolveOrgConsoleAccess({
      ...base,
      membership: edge('Sevadar', { roleExpiresAt: 1 }),
    });
    expect(v.canOpenConsole).toBe(false);
    expect(v.role).toBe('Devotee');
  });

  it('unloaded memberships report unresolved and stay locked (never a false unlock)', () => {
    const v = resolveOrgConsoleAccess({ ...base, membershipsLoaded: false });
    expect(v).toEqual({ canOpenConsole: false, role: null, resolved: false });
  });

  it('the recorded creator of the workspace unlocks as Trustee', () => {
    const v = resolveOrgConsoleAccess({ ...base, isCreator: true });
    expect(v).toEqual({ canOpenConsole: true, role: 'Trustee', resolved: true });
  });

  it('SuperAdmin always unlocks', () => {
    const v = resolveOrgConsoleAccess({ ...base, globalRole: 'SuperAdmin' });
    expect(v.canOpenConsole).toBe(true);
    expect(v.role).toBe('SuperAdmin');
  });

  it('demo workspaces judge by the persona role', () => {
    expect(
      resolveOrgConsoleAccess({ ...base, workspaceId: 'DEMO_6508', globalRole: 'Trustee' }).canOpenConsole,
    ).toBe(true);
    expect(
      resolveOrgConsoleAccess({ ...base, workspaceId: 'DEMO_6508', globalRole: 'Devotee' }).canOpenConsole,
    ).toBe(false);
  });
});

describe('RT-01 — the lock sheet itself', () => {
  beforeAll(() => {
    // node test env: the sheet portals into document.body; the
    // react-dom mock above returns the children unwrapped, so a
    // stub body is all the render needs.
    (globalThis as { document?: unknown }).document = { body: {} };
  });

  const props = {
    orgName: 'Test Mandir',
    onClose: () => undefined,
    onGoHome: () => undefined,
    onCreateOrg: () => undefined,
  };

  it('renders the explanation and both honest doors when open', () => {
    const html = renderToStaticMarkup(React.createElement(OrgConsoleLockSheet, { ...props, open: true }));
    expect(html).toContain('The Test Mandir console is staff-only');
    expect(html).toContain('Why: Test Mandir staff only');
    expect(html).toContain('Staff note for Test Mandir');
    expect(html).toContain('surfaces.devoteePortal.orgLockDoorHomeTitle');
    expect(html).toContain('surfaces.devoteePortal.orgLockDoorCreateTitle');
    expect(html).toContain('role="dialog"');
  });

  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(React.createElement(OrgConsoleLockSheet, { ...props, open: false }));
    expect(html).toBe('');
  });

  it('portal source: the locked toggle is a real button that opens the sheet', () => {
    const portal = readSrc('components/domain5/DevoteeAccountPortal.tsx');
    expect(portal).toContain('setShowOrgLockSheet(true)');
    expect(portal).toContain('aria-haspopup="dialog"');
    expect(portal).toContain('<OrgConsoleLockSheet');
    // the old tooltip-only explanation is no longer how the lock speaks
    expect(portal).not.toContain('organisationConsoleIsReservedForTemple');
    // the verdict is the shared per-org hook, not a global substring test
    expect(portal).toContain('useOrgConsoleAccess()');
    expect(portal).not.toContain("currentRole.toUpperCase().includes('SEVADAR')");
  });
});

describe('RT-02 — the portal carries the modern exits', () => {
  const portal = readSrc('components/domain5/DevoteeAccountPortal.tsx');

  it('Grow card with create + join doors in JoinUpgrade destinations', () => {
    expect(portal).toContain("t('surfaces.devoteePortal.growTitle')");
    expect(portal).toContain("t('surfaces.devoteePortal.growCreateBtn')");
    expect(portal).toContain("t('surfaces.devoteePortal.growJoinBtn')");
    expect(portal).toContain("window.location.href = '/register-org'");
    expect(portal).toContain("window.location.href = '/orgs'");
  });

  it('Margdarshan row reusing the Solo profile row copy', () => {
    expect(portal).toContain("t('marg.profileRowTitle')");
    expect(portal).toContain("t('marg.profileRowDesc')");
  });
});

describe('RT-04 — devotee guard allows Margdarshan in every copy', () => {
  it('the diagnostics mirror allows a Devotee into margdarshan', () => {
    expect(canRoleAccessDesk('Devotee', 'margdarshan')).toBe(true);
  });

  it('App.tsx gates both consume the ONE DEVOTEE_ALLOWED_MODULES list', () => {
    const app = readSrc('App.tsx');
    expect(app).toContain('export const DEVOTEE_ALLOWED_MODULES');
    expect(app).toContain("'margdarshan'");
    expect(app).toContain('landingSurfaceForMembership(');
    expect(app.match(/!DEVOTEE_ALLOWED_MODULES\.includes\(activeModule\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(app).toContain('!DEVOTEE_ALLOWED_MODULES.includes(activeModule)');
    expect(app).toContain("activeModule === 'margdarshan'");
    expect(app).toContain('<MargdarshanCentre onNavigate=');
  });
});

describe('RT-05 — honest pass ID', () => {
  it('shows the record real ID when present', () => {
    expect(displaySanataniId('SAN-XYZ987', 'ID pending')).toBe('SAN-XYZ987');
    expect(displaySanataniId('  SAN-XYZ987  ', 'ID pending')).toBe('SAN-XYZ987');
  });

  it('shows the pending label — never a fabricated number — when absent', () => {
    for (const missing of [undefined, null, '', '   ']) {
      const shown = displaySanataniId(missing, 'ID pending');
      expect(shown).toBe('ID pending');
      expect(shown).not.toBe(FABRICATED_ID);
    }
  });

  it('the fabricated fallback literal exists nowhere in src (tests excluded)', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== '__tests__') walk(p);
        } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) {
          if (fs.readFileSync(p, 'utf8').includes(FABRICATED_ID)) hits.push(p);
        }
      }
    };
    walk(SRC);
    expect(hits).toEqual([]);
  });

  it('all three portal ID sites go through displaySanataniId', () => {
    const portal = readSrc('components/domain5/DevoteeAccountPortal.tsx');
    expect(portal.match(/displaySanataniId\(/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe('RT-06 — public paths match exactly', () => {
  it('every legitimate public path still matches', () => {
    expect(PUBLIC_PATHS).toEqual([
      '/',
      '/login',
      '/signup',
      '/contact',
      '/ask-ai',
      '/mysecretlogin',
      '/get-app',
      '/for-institutions',
    ]);
    for (const p of PUBLIC_PATHS) expect(isPublicPath(p)).toBe(true);
  });

  it('unknown sub-paths under public prefixes do NOT match (they 404)', () => {
    for (const p of ['/contact/xyz', '/login/extra', '/signup/2', '/ask-ai/deep', '/get-app/x']) {
      expect(isPublicPath(p)).toBe(false);
    }
  });

  it('app and param routes are not public paths', () => {
    for (const p of ['/app', '/app/home', '/orgs', '/margdarshan', '/u/abc', '/shorts/xyz', '']) {
      expect(isPublicPath(p)).toBe(false);
    }
  });

  it('MainAppView uses the exact matcher, not prefix matching', () => {
    const app = readSrc('App.tsx');
    expect(app).toContain('matchesPublicPath(currentPath)');
    expect(app).not.toContain('currentPath.startsWith(p)');
  });
});

describe('RT-07 — warm skeleton on lazy public routes', () => {
  it('the six public lazy routes use PublicWarmSkeleton', () => {
    const app = readSrc('App.tsx');
    expect(app).toContain("import { PublicWarmSkeleton } from './components/common/Skeleton'");
    expect(app.match(/fallback=\{<PublicWarmSkeleton \/>\}/g)?.length).toBeGreaterThanOrEqual(6);
  });
});

describe('RT-FIX i18n — the new keys exist in all ten languages', () => {
  const KEYS = [
    'idPending',
    'orgLockSheetTitle',
    'orgLockSheetSub',
    'orgLockWhy',
    'orgLockDoorHomeTitle',
    'orgLockDoorHomeDesc',
    'orgLockDoorCreateTitle',
    'orgLockDoorCreateDesc',
    'orgLockStaffNote',
    'orgLockClose',
    'orgLockWelcomeHome',
    'growTitle',
    'growDesc',
    'growCreateBtn',
    'growJoinBtn',
  ];

  it('all 15 keys present in every devotee fragment', () => {
    for (const code of ['en', 'hi', 'bn', 'sa', 'ta', 'te', 'mr', 'gu', 'kn', 'ml']) {
      const text = readSrc(`i18n/lang/${code}/devotee.ts`);
      for (const k of KEYS) expect(text).toContain(`${k}:`);
    }
  });
});
