/**
 * roleCoherence.test.ts — QUEUED #56 pins (audit A2-D1/D2/D4/D6, A1-D05).
 *
 *  D1  The invite dropdown offered 'Manager'/'Member' — roles the
 *      resolver rejects — blackholing invitees into their global role.
 *      Pins: grantable lists contain ONLY self-resolving canonical
 *      roles; stored edge roles resolve deterministically
 *      (resolveEdgeRole); a present-but-legacy edge speaks at landing
 *      instead of the global fallback (victims freed, bleed closed).
 *  D4  Nav/mount traps. Pins: the shared nav helper's answers for the
 *      four audited pairs + source pins for the widened App.tsx mount
 *      guards and the palette's quick-action gates.
 *  D6  dashboard is nav-visible for every staff role (a way home).
 *  D2  Palette + Sidebar consume ONE visibility helper (source pins).
 *  D05 Persona homes resolve to desks that mount in the entered
 *      workspace (real-registry pins), never alias/restricted traps.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ROLE_MIGRATION_MAP, type UserRole } from '../../types';
import {
  TRUSTEE_GRANTABLE_ROLES,
  SUPERADMIN_GRANTABLE_ROLES,
} from '../../types/membership';
import {
  normalizeMembershipRole,
  resolveEdgeRole,
  resolveOrgLandingRole,
  landingSurfaceForMembership,
  personaHomeModule,
} from '../landingSurface';
import { isDeskVisibleForRole, type PermissionCheck } from '../deskVisibility';
import { isModuleAllowedForOrgMount, isDeskInWorkspaceSet } from '../workspaceRegistry';

const readSrc = (rel: string) =>
  fs.readFileSync(path.join(__dirname, rel), 'utf-8');

/** Faithful replica of AuthWorkspaceContext.checkPermission semantics. */
const makeCheck =
  (eff: string): PermissionCheck =>
  (allowed) => {
    if (eff === 'SuperAdmin') return true;
    return allowed.some((a) => {
      const n = ROLE_MIGRATION_MAP[a as string] || a;
      if (n === eff || a === eff) return true;
      if (
        eff === 'Trustee' &&
        ['Priest', 'Accountant', 'Sevadar', 'Devotee', 'CSO'].includes(n as string)
      ) {
        return true;
      }
      return false;
    });
  };

const CANONICAL: UserRole[] = [
  'SuperAdmin',
  'Trustee',
  'Priest',
  'Accountant',
  'Sevadar',
  'Devotee',
  'CSO',
];

describe('D1 — resolveEdgeRole: stored edge roles resolve deterministically', () => {
  it('passes canonical roles through unchanged', () => {
    for (const r of CANONICAL) expect(resolveEdgeRole(r)).toBe(r);
  });

  it('collapses legacy spellings to their migration-map intent', () => {
    expect(resolveEdgeRole('MANAGER')).toBe('Sevadar');
    expect(resolveEdgeRole('PUROHIT')).toBe('Priest');
    expect(resolveEdgeRole('VOLUNTEER')).toBe('Sevadar');
    expect(resolveEdgeRole('SUPER_ADMIN')).toBe('SuperAdmin');
    expect(resolveEdgeRole('TRUSTEE')).toBe('Trustee');
  });

  it('sweeps the title-case spellings exact map lookups miss', () => {
    expect(resolveEdgeRole('Manager')).toBe('Sevadar');
    expect(resolveEdgeRole('Purohit')).toBe('Priest');
    expect(resolveEdgeRole('Volunteer')).toBe('Sevadar');
    expect(resolveEdgeRole('Superadmin')).toBe('SuperAdmin');
    expect(resolveEdgeRole('Cso')).toBe('CSO');
  });

  it("resolves the invite-invented 'Member' — and any unknown string — DOWN to Devotee", () => {
    expect(resolveEdgeRole('Member')).toBe('Devotee');
    expect(resolveEdgeRole('member')).toBe('Devotee');
    expect(resolveEdgeRole('Wizard')).toBe('Devotee');
    expect(resolveEdgeRole('')).toBe('Devotee');
    expect(resolveEdgeRole(null)).toBe('Devotee');
    expect(resolveEdgeRole(undefined)).toBe('Devotee');
  });
});

describe('D1 — grantable lists contain only roles the resolver accepts', () => {
  it('every grantable role is canonical and resolves to itself', () => {
    for (const list of [TRUSTEE_GRANTABLE_ROLES, SUPERADMIN_GRANTABLE_ROLES]) {
      for (const r of list) {
        expect(normalizeMembershipRole(r)).toBe(r);
        expect(resolveEdgeRole(r)).toBe(r);
      }
    }
  });

  it("the blackhole roles 'Manager' and 'Member' are no longer grantable", () => {
    expect(TRUSTEE_GRANTABLE_ROLES as readonly string[]).not.toContain('Manager');
    expect(TRUSTEE_GRANTABLE_ROLES as readonly string[]).not.toContain('Member');
    expect(SUPERADMIN_GRANTABLE_ROLES as readonly string[]).not.toContain('Manager');
    expect(SUPERADMIN_GRANTABLE_ROLES as readonly string[]).not.toContain('Member');
  });

  it('a Trustee still cannot grant Trustee/SuperAdmin; a SuperAdmin can', () => {
    expect(TRUSTEE_GRANTABLE_ROLES as readonly string[]).not.toContain('Trustee');
    expect(TRUSTEE_GRANTABLE_ROLES as readonly string[]).not.toContain('SuperAdmin');
    expect(SUPERADMIN_GRANTABLE_ROLES as readonly string[]).toContain('Trustee');
    expect(SUPERADMIN_GRANTABLE_ROLES as readonly string[]).toContain('SuperAdmin');
  });
});

describe('D1 — a present-but-legacy edge speaks at landing (victims freed, bleed closed)', () => {
  const base = {
    workspaceId: 'WS-6508',
    membershipsLoaded: false,
    globalRole: 'Devotee',
    isCreator: false,
  };

  it("'Manager' edge + Devotee global → Sevadar on the workspace surface", () => {
    const r = resolveOrgLandingRole({ ...base, membershipRole: 'Manager' });
    expect(r).toEqual({ role: 'Sevadar', resolved: true });
    expect(landingSurfaceForMembership(r.role, r.resolved)).toBe('workspace');
  });

  it("'Member' edge + Trustee global (staff elsewhere) → Devotee here — no cross-org bleed", () => {
    const r = resolveOrgLandingRole({
      ...base,
      membershipRole: 'Member',
      membershipsLoaded: true,
      globalRole: 'Trustee',
    });
    expect(r).toEqual({ role: 'Devotee', resolved: true });
    expect(landingSurfaceForMembership(r.role, r.resolved)).toBe('devotee');
  });

  it('unknown edge role + staff global → Devotee resolved, never the global staff role', () => {
    const r = resolveOrgLandingRole({
      ...base,
      membershipRole: 'Wizard',
      membershipsLoaded: true,
      globalRole: 'Accountant',
    });
    expect(r).toEqual({ role: 'Devotee', resolved: true });
  });

  it('a blank edge role is no edge at all — the #55 fallback order still applies', () => {
    const r = resolveOrgLandingRole({ ...base, membershipRole: '  ' });
    expect(r).toEqual({ role: null, resolved: false });
  });
});

describe('D6 — every staff role has a sidebar path home to the Command Center', () => {
  const dashboard = { id: 'dashboard', domain: 1 };
  for (const role of ['Priest', 'Accountant', 'CSO', 'Trustee', 'Sevadar', 'SuperAdmin']) {
    it(`${role} sees dashboard`, () => {
      expect(isDeskVisibleForRole(dashboard, role, makeCheck(role))).toBe(true);
    });
  }
  it('Devotee-only members see no admin desks at all', () => {
    expect(isDeskVisibleForRole(dashboard, 'Devotee', makeCheck('Devotee'))).toBe(false);
    expect(
      isDeskVisibleForRole({ id: 'treasury', domain: 2 }, 'Devotee', makeCheck('Devotee')),
    ).toBe(false);
  });
});

describe('D4 — nav answers for the audited trap pairs (shared helper)', () => {
  it('Sevadar: membership is NOT promised (mount is Trustee-only governance)', () => {
    expect(
      isDeskVisibleForRole({ id: 'membership', domain: 1 }, 'Sevadar', makeCheck('Sevadar')),
    ).toBe(false);
    expect(
      isDeskVisibleForRole({ id: 'membership', domain: 1 }, 'Trustee', makeCheck('Trustee')),
    ).toBe(true);
  });

  it('Sevadar: quick-chanda-pos stays promised — and the mount now honours it (source pin below)', () => {
    expect(
      isDeskVisibleForRole(
        { id: 'quick-chanda-pos', domain: 2 },
        'Sevadar',
        makeCheck('Sevadar'),
      ),
    ).toBe(true);
  });

  it('CSO: sevadar-roster is promised by nav — and the mount now honours it (source pin below)', () => {
    expect(
      isDeskVisibleForRole({ id: 'sevadar-roster', domain: 1 }, 'CSO', makeCheck('CSO')),
    ).toBe(true);
  });

  it('Accountant: campaigns + assets promised by nav — mounts widened to match (source pin below)', () => {
    expect(
      isDeskVisibleForRole({ id: 'campaigns', domain: 2 }, 'Accountant', makeCheck('Accountant')),
    ).toBe(true);
    expect(
      isDeskVisibleForRole({ id: 'assets', domain: 2 }, 'Accountant', makeCheck('Accountant')),
    ).toBe(true);
  });

  it('branch sanity: Priest never sees treasury; CSO never sees treasury; Sevadar inherits MANAGER sets (D3 truth, unchanged)', () => {
    expect(
      isDeskVisibleForRole({ id: 'treasury', domain: 2 }, 'Priest', makeCheck('Priest')),
    ).toBe(false);
    expect(
      isDeskVisibleForRole({ id: 'treasury', domain: 2 }, 'CSO', makeCheck('CSO')),
    ).toBe(false);
    expect(
      isDeskVisibleForRole({ id: 'purohitDesk', domain: 3 }, 'Priest', makeCheck('Priest')),
    ).toBe(true);
    expect(
      isDeskVisibleForRole({ id: 'treasury', domain: 2 }, 'Sevadar', makeCheck('Sevadar')),
    ).toBe(true);
  });
});

describe('D4/D2 — source pins: mount guards and palette gates say the same thing', () => {
  const app = readSrc('../../App.tsx');
  const palette = readSrc('../../components/common/CommandPalette.tsx');
  const sidebar = readSrc('../../components/common/Sidebar.tsx');

  it('App.tsx: CSO mounts the sevadar roster', () => {
    expect(app).toContain(
      "checkPermission(['TRUSTEE', 'MANAGER', 'SEVADAR', 'VOLUNTEER', 'CSO']) ? <SevadarRosterDesk />",
    );
  });

  it('App.tsx: Sevadar mounts the Quick Chanda POS (counter staffing)', () => {
    expect(app).toContain(
      "checkPermission(['TRUSTEE', 'ACCOUNTANT', 'SEVADAR', 'SuperAdmin']) ? <QuickChandaPOS />",
    );
  });

  it('App.tsx: Accountant mounts Campaigns and Assets', () => {
    expect(app).toContain(
      "checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <MandirCampaignsDesk />",
    );
    expect(app).toContain(
      "checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']) ? <AssetInventoryDesk />",
    );
  });

  it('CommandPalette: desks are role-filtered through the shared helper', () => {
    expect(palette).toContain('isDeskVisibleForRole(m, effectiveRole, checkPermission)');
  });

  it('CommandPalette: quick actions are gated by the mount-guard sets', () => {
    expect(palette).toContain("checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE'])");
    expect(palette).toContain(
      "checkPermission(['TRUSTEE', 'ACCOUNTANT', 'SEVADAR', 'SuperAdmin'])",
    );
  });

  it('Sidebar: the role decision is delegated to the same shared helper (no second copy)', () => {
    expect(sidebar).toContain(
      'isDeskVisibleForRole(m, effectiveRole, checkPermission)',
    );
  });
});

describe('D05 — persona homes land on desks that mount in the entered workspace', () => {
  // The production caller (AuthWorkspaceContext loginAsRole) feeds
  // personaHomeModule the BELONGING predicate since the 2026-10-23
  // redesign: under universal presence every candidate mounts, so
  // org fit (native/adopted) is what picks the persona's home. The
  // mount assertion itself lives in the third test below.
  const canMountIn = (type: string) => (id: string) =>
    isDeskInWorkspaceSet({ type } as never, id);

  it('demo Mandir: Priest → poojaBooking (purohitDesk is not Mandir-native), Accountant → treasury, CSO → checkin', () => {
    expect(personaHomeModule('Priest', canMountIn('Mandir'))).toBe('poojaBooking');
    expect(personaHomeModule('Accountant', canMountIn('Mandir'))).toBe('treasury');
    expect(personaHomeModule('CSO', canMountIn('Mandir'))).toBe('checkin');
  });

  it('Tirth: Priest → purohitDesk (ritual-native there)', () => {
    expect(personaHomeModule('Priest', canMountIn('Tirth'))).toBe('purohitDesk');
  });

  it('the result ALWAYS mounts and is never the old trap targets', () => {
    for (const type of ['Mandir', 'Goshala', 'Sangha', 'Ashram', 'Gurukul']) {
      for (const role of ['Priest', 'Accountant', 'CSO', 'Trustee', 'Sevadar']) {
        const home = personaHomeModule(role, canMountIn(type));
        expect(home).not.toBe('sanctum-hud');
        expect(home).not.toBe('tactical-radar');
        expect(home).not.toBe('treasury-audit');
        expect(isModuleAllowedForOrgMount({ type } as never, home)).toBe(true);
      }
    }
  });

  it('falls back to the Command Center when no candidate can mount', () => {
    expect(personaHomeModule('Priest', () => false)).toBe('dashboard');
    expect(personaHomeModule('CSO', () => false)).toBe('dashboard');
    expect(personaHomeModule('Trustee', () => true)).toBe('dashboard');
    expect(personaHomeModule(null, () => true)).toBe('dashboard');
  });
});
