/**
 * deskSurfaceGuard.test.ts — QUEUED #48 org-guard matrix pins.
 *
 * The bug class: App.tsx mounts ONE component (VedicSevaShikshaDesk)
 * for a family of module ids across org families. A Sangha opening its
 * native 'sanghaDrills' desk received the Gurukul desk. These tests pin,
 * for EVERY org type in workspaceRegistry, that:
 *   - the surface resolved for the org is the family surface of every
 *     case-group desk id the org can natively mount, and
 *   - the mount guard (isModuleAllowedForOrgMount) admits exactly the
 *     mounts whose component family matches the org — and denies the
 *     one id ('sevaTrust') for which no correct component exists.
 *
 * QUEUED #57 (audit A1-D07) strengthened the cross-enable half: #48
 * denied only 'restricted'-surface orgs, so an ENABLED foreign-family
 * id still mounted (wrong desk, right-looking breadcrumb). The guard
 * now requires the module's family to EQUAL the org's surface; the
 * one #48 pin that asserted the old cross-enable mount (Gurukul +
 * 'sanghaDrills') is flipped below, deliberately.
 */
import {
  SHIKSHA_CASE_GROUP_IDS,
  SHIKSHA_DESK_SURFACE_BY_ORG_TYPE,
  resolveShikshaDeskSurface,
  isShikshaFamilyMountAllowed,
  type ShikshaDeskSurface,
} from '../deskSurfaceGuard';
import {
  workspaceRegistry,
  isModuleAllowed,
  isModuleAllowedForOrgMount,
} from '../workspaceRegistry';

const ws = (type: string, enabledModules: string[] = []) =>
  ({ type, enabledModules } as any);

const ALL_TYPES = Object.keys(workspaceRegistry);

/** The surface each case-group id must resolve to when natively mounted. */
const EXPECTED_SURFACE_BY_ID: Record<string, ShikshaDeskSurface> = {
  gurukul: 'gurukul',
  gurukulAcademy: 'gurukul',
  vidyalaya: 'gurukul',
  sanghaDrills: 'sangha-mobilization',
  satsang: 'satsang',
  // 'sevaTrust' has NO correct component — its mount must be denied, so
  // it has no expected surface here (asserted separately).
};

describe('deskSurfaceGuard — surface map sanity', () => {
  it('only names real workspace types', () => {
    for (const type of Object.keys(SHIKSHA_DESK_SURFACE_BY_ORG_TYPE)) {
      expect(ALL_TYPES).toContain(type);
    }
  });

  it('unknown / missing types resolve to restricted (never a guessed family)', () => {
    expect(resolveShikshaDeskSurface(undefined)).toBe('restricted');
    expect(resolveShikshaDeskSurface(null)).toBe('restricted');
    expect(resolveShikshaDeskSurface('NoSuchOrgType')).toBe('restricted');
  });
});

describe('deskSurfaceGuard — per-type matrix over the shared case group', () => {
  for (const type of ALL_TYPES) {
    for (const id of SHIKSHA_CASE_GROUP_IDS) {
      const native = isModuleAllowed(ws(type), id);
      if (!native) continue;
      if (id === 'sevaTrust') {
        it(`${type} natively mounts 'sevaTrust' → mount DENIED (no correct component exists)`, () => {
          expect(isModuleAllowedForOrgMount(ws(type), 'sevaTrust')).toBe(false);
        });
      } else {
        it(`${type} natively mounts '${id}' → surface '${EXPECTED_SURFACE_BY_ID[id]}', mount allowed`, () => {
          expect(resolveShikshaDeskSurface(type)).toBe(EXPECTED_SURFACE_BY_ID[id]);
          expect(isModuleAllowedForOrgMount(ws(type), id)).toBe(true);
        });
      }
    }
  }

  it('no org type can natively mount two case-group ids from different families', () => {
    // If a future registry edit gives one org type, say, both
    // 'sanghaDrills' and 'gurukul', a single surface cannot serve both —
    // this pin forces that edit to be made deliberately.
    for (const type of ALL_TYPES) {
      const surfaces = [...SHIKSHA_CASE_GROUP_IDS]
        .filter((id) => id !== 'sevaTrust' && isModuleAllowed(ws(type), id))
        .map((id) => EXPECTED_SURFACE_BY_ID[id]);
      expect(new Set(surfaces).size).toBeLessThanOrEqual(1);
    }
  });
});

describe('deskSurfaceGuard — the audited defects, pinned', () => {
  it('Sangha opening Sangha & Shakha Mobilization never resolves to the Gurukul surface', () => {
    expect(resolveShikshaDeskSurface('Sangha')).toBe('sangha-mobilization');
    expect(resolveShikshaDeskSurface('Samaj')).toBe('sangha-mobilization');
    expect(resolveShikshaDeskSurface('MahotsavSamiti')).toBe('sangha-mobilization');
    expect(isModuleAllowedForOrgMount(ws('Sangha'), 'sanghaDrills')).toBe(true);
  });

  it('Gurukul family keeps its own desk', () => {
    expect(resolveShikshaDeskSurface('Gurukul')).toBe('gurukul');
    expect(resolveShikshaDeskSurface('Vidyalaya')).toBe('gurukul');
    expect(isModuleAllowedForOrgMount(ws('Gurukul'), 'gurukul')).toBe(true);
    expect(isModuleAllowedForOrgMount(ws('Gurukul'), 'gurukul-education')).toBe(true);
    expect(isModuleAllowedForOrgMount(ws('Vidyalaya'), 'vidyalaya')).toBe(true);
  });

  it('Satsang-family orgs resolve to the Satsang surface, not Gurukul', () => {
    for (const type of ['Satsang', 'Ashram', 'Yoga', 'KashiKshetra']) {
      expect(resolveShikshaDeskSurface(type)).toBe('satsang');
      expect(isModuleAllowedForOrgMount(ws(type), 'satsang')).toBe(true);
    }
  });

  it('an App-Store opt-in cannot smuggle the shared component into a foreign org family', () => {
    // Mandir enabling 'sanghaDrills' via enabledModules: isModuleAllowed
    // (nav level) says yes, but the mount guard must still refuse —
    // the mounted component family excludes Mandir for that id.
    expect(isModuleAllowed(ws('Mandir', ['sanghaDrills']), 'sanghaDrills')).toBe(true);
    expect(isModuleAllowedForOrgMount(ws('Mandir', ['sanghaDrills']), 'sanghaDrills')).toBe(false);
    // QUEUED #57 (audit A1-D07) — FLIPPED from the #48 pin: a Gurukul
    // enabling 'sanghaDrills' used to MOUNT (the Gurukul surface under
    // a "Sangha & Shakha Mobilization" breadcrumb — a wrong desk).
    // The mount now requires family == surface, so it is denied and
    // the restricted screen's guidance shows instead.
    expect(isModuleAllowedForOrgMount(ws('Gurukul', ['sanghaDrills']), 'sanghaDrills')).toBe(false);
    expect(isModuleAllowedForOrgMount(ws('Sangha', ['gurukul']), 'gurukul')).toBe(false);
    expect(isModuleAllowedForOrgMount(ws('Sangha', ['satsang']), 'satsang')).toBe(false);
    // Same-family cross-enables still mount: the surface IS the desk.
    expect(isModuleAllowedForOrgMount(ws('Vidyalaya', ['gurukulAcademy']), 'gurukulAcademy')).toBe(true);
    expect(isModuleAllowedForOrgMount(ws('Samaj', ['sanghaDrills']), 'sanghaDrills')).toBe(true);
  });

  it('fails open when the workspace type is unknown (legacy behaviour preserved)', () => {
    expect(isShikshaFamilyMountAllowed(undefined, 'gurukul')).toBe(true);
    expect(isShikshaFamilyMountAllowed(null, 'sanghaDrills')).toBe(true);
    expect(isModuleAllowedForOrgMount(null, 'gurukul')).toBe(true);
    expect(isShikshaFamilyMountAllowed('Sangha', 'treasury')).toBe(true);
  });

  it('non-family modules are untouched by the family guard', () => {
    expect(isModuleAllowedForOrgMount(ws('Sangha'), 'treasury')).toBe(true);
    expect(isModuleAllowedForOrgMount(ws('Gurukul'), 'sanatani-vivah')).toBe(false);
    expect(isModuleAllowedForOrgMount(ws('Gurukul'), 'pathshala')).toBe(true);
  });
});
