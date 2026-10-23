/**
 * moduleRedesign.test.ts — guards for the module-system redesign
 * (2026-10-23, owner-delegated decision).
 *
 * The App Store model of module discovery is retired. The laws
 * pinned here:
 *
 *   - Presence is universal: `isModuleAllowed` no longer reads
 *     `enabledModules`; a never-installed desk is present (and, where
 *     its family fits, mountable) in every workspace. The one denial
 *     left is 'sevaTrust' — no component exists (#58).
 *   - `enabledModules` is an ADOPTION RECORD: `enableModule` still
 *     appends canonically (recommendation bookkeeping reads it), it
 *     just no longer decides whether a desk exists.
 *   - The directory family map is TOTAL over MODULE_CATALOG: every
 *     desk appears exactly once (lib/deskFamilies).
 *   - The directory model (lib/deskDirectory) shows a desk iff the
 *     caller could actually open it: canonical role visibility ∧
 *     desk scope ∧ shiksha family mount truth ∧ the federation
 *     branch rule. Role-hidden stays hidden; a scoped member loses
 *     out-of-scope desks AND the Bahi-Khata door (its target is
 *     Treasury); the Auditor sees exactly its read set.
 *   - Plan locks never hide a desk: with today's empty
 *     MODULE_PLAN_TIER nothing is locked, and the model drops
 *     nothing for plan reasons on any plan.
 *   - Source pins: the palette has no install shelf, the Plan &
 *     Add-ons desk sells no modules, the locator + Sidebar call the
 *     desk "Plan & Add-ons", App.tsx mounts the directory, and
 *     RoleHome's Discover grid uses the canonical predicate (its
 *     hand-copied role lists are gone).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  isModuleAllowed,
  isModuleAllowedForOrgMount,
  isDeskInWorkspaceSet,
  workspaceRegistry,
} from '../workspaceRegistry';
import { isShikshaFamilyMountAllowed } from '../deskSurfaceGuard';
import { AUDITOR_READ_DESKS, isDeskVisibleForRole } from '../deskVisibility';
import { DESK_FAMILY, DESK_FAMILIES, groupByFamily } from '../deskFamilies';
import {
  buildDirectoryModel,
  directoryDeskMatchesSearch,
  type DirectoryDeskLike,
} from '../deskDirectory';
import { enableModule } from '../../suggestions/store';

const readSrc = (rel: string) =>
  fs.readFileSync(path.join(__dirname, rel), 'utf-8');

// ---- The catalog, extracted from the Sidebar source (the same file
// nav, palette and directory all render from). ----
const sidebarSrc = readSrc('../../components/common/Sidebar.tsx');
const catalogBlock = sidebarSrc.slice(
  sidebarSrc.indexOf('export const MODULE_CATALOG'),
  sidebarSrc.indexOf('interface DeskRowProps')
);
const CATALOG: DirectoryDeskLike[] = [
  ...catalogBlock.matchAll(/\{ id: '([^']+)'[^}]*?domain: (\d+)/g),
].map((m) => ({ id: m[1], domain: Number(m[2]) }));
const CATALOG_IDS = CATALOG.map((c) => c.id);

const ws = (type: string, extra: Record<string, any> = {}) =>
  ({ type, enabledModules: [], branches: [], ...extra } as any);

/** checkPermission stub for an effective role (uppercase compare,
 *  exactly how AuthWorkspaceContext answers role-constant arrays). */
const permFor = (role: string) => (required: string[]) =>
  required.some((r) => r.toUpperCase() === role.toUpperCase());

const accessFor = (role: string, deskScope?: string[] | null) => ({
  role,
  checkPermission: permFor(role),
  deskScope,
});

const modelIds = (type: string, role: string, extra = {}, deskScope?: string[] | null) =>
  buildDirectoryModel(ws(type, extra), accessFor(role, deskScope), CATALOG).desks.map(
    (d) => d.id
  );

describe('family map totality (directory completeness)', () => {
  it('the extracted catalog is the real 72-desk catalog', () => {
    expect(CATALOG_IDS.length).toBe(72);
    expect(new Set(CATALOG_IDS).size).toBe(72);
  });

  it('every catalog desk has exactly one family, and nothing else does', () => {
    expect(Object.keys(DESK_FAMILY).sort()).toEqual([...CATALOG_IDS].sort());
    for (const fam of DESK_FAMILIES) {
      expect(
        Object.values(DESK_FAMILY).filter((f) => f === fam.id).length
      ).toBeGreaterThan(0);
    }
  });

  it('groupByFamily covers the catalog exactly once', () => {
    const grouped = groupByFamily(CATALOG.map((c) => ({ id: c.id })));
    const flat = grouped.flatMap((g) => g.items.map((i) => i.id));
    expect(flat.sort()).toEqual([...CATALOG_IDS].sort());
    expect(grouped.map((g) => g.family.id)).toEqual(
      DESK_FAMILIES.map((f) => f.id)
    );
  });
});

describe('no-install gating (the retired gate)', () => {
  it('isModuleAllowed is true for every real desk in every org type, installed or not', () => {
    for (const type of Object.keys(workspaceRegistry)) {
      for (const id of CATALOG_IDS) {
        expect(isModuleAllowed(ws(type, { enabledModules: [] }), id)).toBe(true);
      }
    }
  });

  it("the one denial left is 'sevaTrust' (no component exists, #58)", () => {
    for (const type of Object.keys(workspaceRegistry)) {
      expect(isModuleAllowed(ws(type), 'sevaTrust')).toBe(false);
      expect(isModuleAllowedForOrgMount(ws(type), 'sevaTrust')).toBe(false);
    }
  });

  it('mount truth is exactly the family guard — enable state is irrelevant', () => {
    for (const type of Object.keys(workspaceRegistry)) {
      for (const id of CATALOG_IDS) {
        const expected = isShikshaFamilyMountAllowed(type, id);
        expect(isModuleAllowedForOrgMount(ws(type, { enabledModules: [] }), id)).toBe(expected);
        expect(isModuleAllowedForOrgMount(ws(type, { enabledModules: [id] }), id)).toBe(expected);
      }
    }
  });

  it('enableModule still records adoption canonically (bookkeeping, not gating)', () => {
    const noop = () => undefined;
    expect(enableModule([], 'tally-export', noop)).toEqual(['tally-export']);
    expect(enableModule(['tally-export'], 'tally-export', noop)).toEqual(['tally-export']);
  });

  it('belonging (landing preference) still speaks the old language — native/adopted only', () => {
    // isDeskInWorkspaceSet is NOT a gate: it answers "part of this
    // org's own working set?" for the persona landing pick. A
    // non-native, unadopted desk does not belong; adopting it (or
    // being native) makes it belong. The probe desk is chosen from
    // the registry itself — a real Mandir non-native.
    const nonNative = ['gurukul', 'vidyalaya', 'pathshala', 'sanghaDrills', 'gurukulAcademy'].find(
      (id) => !(workspaceRegistry.Mandir || []).includes(id)
    )!;
    expect(nonNative).toBeTruthy();
    expect(isDeskInWorkspaceSet(ws('Mandir'), nonNative)).toBe(false);
    expect(isDeskInWorkspaceSet(ws('Mandir', { enabledModules: [nonNative] }), nonNative)).toBe(true);
    expect(isDeskInWorkspaceSet(ws('Mandir'), 'treasury')).toBe(true);
    expect(isDeskInWorkspaceSet(ws('Mandir'), 'dashboard')).toBe(true);
    // …while presence (the gate that retired) says yes regardless.
    expect(isModuleAllowed(ws('Mandir'), nonNative)).toBe(true);
  });
});

describe('directory model — presence without installs', () => {
  it('a never-installed desk is visible to a permitted role (Mandir Trustee, enabledModules empty)', () => {
    const ids = modelIds('Mandir', 'Trustee');
    // The anecdotes that motivated the redesign: desks a Mandir had
    // to "install" before anyone could find them.
    expect(ids).toContain('sanatani-vivah');
    expect(ids).toContain('tally-export');
    expect(ids).toContain('bhoomi');
    expect(ids).toContain('vanshavali');
    expect(ids).toContain('appStore');
    expect(ids).toContain('dashboard');
  });

  it("Yoga's Tally desk is present on its own (not via taxReceipts)", () => {
    expect(modelIds('Yoga', 'Trustee')).toContain('tally-export');
  });

  it('plan never drops a desk: STANDARD and PREMIUM models equal the free model', () => {
    const free = modelIds('Mandir', 'Trustee', { planId: 'SEVA' });
    expect(modelIds('Mandir', 'Trustee', { planId: 'STANDARD' })).toEqual(free);
    expect(modelIds('Mandir', 'Trustee', { planId: 'PREMIUM' })).toEqual(free);
  });

  it('lockedIds is empty under the freemium tier map (locks tag, never hide)', () => {
    const model = buildDirectoryModel(
      ws('Mandir', { planId: 'SEVA' }),
      accessFor('Trustee'),
      CATALOG
    );
    expect(model.lockedIds.size).toBe(0);
  });
});

describe('directory model — role and scope still rule', () => {
  it('role-hidden stays hidden: a Sevadar sees no Treasury, no settings, no store', () => {
    const ids = modelIds('Mandir', 'Sevadar');
    expect(ids).not.toContain('treasury');
    expect(ids).not.toContain('masterSettings');
    expect(ids).not.toContain('appStore');
    expect(ids).not.toContain('membership');
    expect(ids).toContain('checkin');
  });

  it('the model EQUALS the canonical predicate for every role (no second decision)', () => {
    // The directory may never invent its own visibility: for each
    // role, its set is exactly canonical-visibility ∧ family ∧
    // federation, computed independently here.
    for (const role of ['Trustee', 'Sevadar', 'Accountant', 'Priest', 'Auditor', 'CSO', 'SuperAdmin']) {
      const expected = CATALOG.filter(
        (m) =>
          isDeskVisibleForRole(m, role, permFor(role), {}) &&
          isShikshaFamilyMountAllowed('Mandir', m.id) &&
          m.id !== 'federation'
      ).map((m) => m.id);
      expect(modelIds('Mandir', role).sort()).toEqual(expected.sort());
    }
  });

  it('the Auditor sees exactly its read set (family/branch rules still apply)', () => {
    const ids = modelIds('Mandir', 'Auditor');
    for (const id of ids) expect(AUDITOR_READ_DESKS).toContain(id);
    expect(ids).toContain('treasury');
    expect(ids).not.toContain('devotees');
    // Owner decision 2026-10-23: the legacy hundi desk is a posting
    // surface — never in the Auditor's read set.
    expect(ids).not.toContain('hundi-audit');
  });

  it('a Devotee is offered no staff desks', () => {
    const ids = modelIds('Mandir', 'Devotee');
    expect(ids).not.toContain('treasury');
    expect(ids).not.toContain('devotees');
    expect(ids).not.toContain('trusteeGovernance');
  });

  it('desk scope narrows the directory — and takes the Bahi-Khata door with it', () => {
    const scoped = buildDirectoryModel(
      ws('Mandir'),
      accessFor('Trustee', ['devotees']),
      CATALOG
    );
    expect(scoped.desks.map((d) => d.id)).not.toContain('treasury');
    expect(scoped.desks.map((d) => d.id)).not.toContain('campaigns');
    expect(scoped.doors.map((d) => d.id)).not.toContain('bahikhata');

    const treasuryScoped = buildDirectoryModel(
      ws('Mandir'),
      accessFor('Trustee', ['treasury']),
      CATALOG
    );
    expect(treasuryScoped.desks.map((d) => d.id)).toContain('treasury');
    expect(treasuryScoped.doors.map((d) => d.id)).toContain('bahikhata');
  });

  it('the Bahi-Khata door follows Treasury visibility (Sevadar: no door)', () => {
    const sevadar = buildDirectoryModel(ws('Mandir'), accessFor('Sevadar'), CATALOG);
    expect(sevadar.doors).toHaveLength(0);
    const trustee = buildDirectoryModel(ws('Mandir'), accessFor('Trustee'), CATALOG);
    expect(trustee.doors.map((d) => d.id)).toContain('bahikhata');
  });
});

describe('directory model — family and federation truth', () => {
  it('cross-family desks are out (Gurukul gets no Sangha Drills, Sangha no Gurukul)', () => {
    expect(modelIds('Gurukul', 'Trustee')).not.toContain('sanghaDrills');
    expect(modelIds('Gurukul', 'Trustee')).toContain('gurukul');
    expect(modelIds('Sangha', 'Trustee')).toContain('sanghaDrills');
    expect(modelIds('Sangha', 'Trustee')).not.toContain('gurukul');
  });

  it('federation appears only with 2+ branches', () => {
    expect(modelIds('Mandir', 'Trustee', { branches: [] })).not.toContain('federation');
    expect(modelIds('Mandir', 'Trustee', { branches: [{ id: 'b1' }] })).not.toContain('federation');
    expect(
      modelIds('Mandir', 'Trustee', { branches: [{ id: 'b1' }, { id: 'b2' }] })
    ).toContain('federation');
  });

  it("the model never promises 'sevaTrust'", () => {
    for (const type of Object.keys(workspaceRegistry)) {
      expect(modelIds(type, 'Trustee')).not.toContain('sevaTrust');
    }
  });
});

describe('directory search', () => {
  const treasury = CATALOG.find((c) => c.id === 'treasury')!;
  it('matches id, domain title, keywords and the localised name', () => {
    const rich = { ...treasury, name: 'Treasury & Expense Ledger', domainTitle: 'Financials & Assets', keywords: 'ledger khata' };
    expect(directoryDeskMatchesSearch(rich, 'treasury', 'Treasury', 'Treasury')).toBe(true);
    expect(directoryDeskMatchesSearch(rich, 'financials', 'Treasury', 'Treasury')).toBe(true);
    expect(directoryDeskMatchesSearch(rich, 'khata', 'Treasury', 'Treasury')).toBe(true);
    expect(directoryDeskMatchesSearch(rich, 'খাতা', 'Treasury', 'খাতা বই')).toBe(true);
    expect(directoryDeskMatchesSearch(rich, 'zzzz', 'Treasury', 'Treasury')).toBe(false);
    expect(directoryDeskMatchesSearch(rich, '', 'Treasury', 'Treasury')).toBe(true);
  });
});

describe('source pins — the seams cannot silently reopen', () => {
  it('the Command Palette has no install shelf and offers the directory', () => {
    const palette = readSrc('../../components/common/CommandPalette.tsx');
    expect(palette).not.toContain('installable');
    expect(palette).not.toContain('handleInstall');
    expect(palette).not.toContain("'install'");
    expect(palette).toContain("'desk-directory'");
    expect(palette).toContain('Browse all desks');
  });

  it('the Plan & Add-ons desk sells no modules', () => {
    const desk = readSrc('../../components/domain6/AppStoreDesk.tsx');
    expect(desk).not.toContain('handleToggleModule');
    expect(desk).not.toContain('processedModules');
    expect(desk).toContain('openPlanUpgrade');
    expect(desk).toContain('PLAN_PRICING');
  });

  it('Sidebar + locator call the desk "Plan & Add-ons"; App.tsx mounts the directory', () => {
    expect(sidebarSrc).toContain("name: 'Plan & Add-ons'");
    expect(sidebarSrc).toContain("'desk-directory'");
    const locator = readSrc('../../ai/locator.ts');
    expect(locator).toContain("'Plan & Add-ons'");
    const app = readSrc('../../App.tsx');
    expect(app).toContain("activeModule === 'desk-directory'");
    expect(app).toContain('DeskDirectory');
  });

  it("RoleHome's Discover grid uses the canonical predicate (hand-copied lists gone)", () => {
    const roleHome = readSrc('../../components/dashboard/RoleHome.tsx');
    expect(roleHome).toContain('isDeskOpenableFor');
    expect(roleHome).not.toContain("['bulkImport', 'campaigns', 'assets', 'sandeshBroadcast']");
    expect(roleHome).toContain('usePendingApprovalsCount');
  });

  it('the restricted screen no longer offers an App Store enable', () => {
    const restricted = readSrc('../../components/common/OrgTypeRestrictedDesk.tsx');
    expect(restricted).not.toContain('onOpenAppStore');
    expect(restricted).not.toContain('Enable via App Store');
  });
});
