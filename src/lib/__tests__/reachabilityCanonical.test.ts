/**
 * reachabilityCanonical.test.ts — QUEUED #57 pins (audit A1-D01/D06/
 * D07/D08/D09/D10, A2-D8/D9).
 *
 * The disease: nav, the App Store, the palette and the Setup Wizard
 * each spoke a slightly different module-id dialect, while the mount
 * guard spoke canonical — so desks could be offered, installed and
 * pinned yet never open (112 NAV-ONLY-DEAD cells). The law pinned
 * here: ONE canonical id at every gate.
 *
 *   - the catalog carries canonical ids only, no duplicates, no dead
 *     rows; the registry's native lists are canonical too;
 *   - enableModule stores the canonical id, and a legacy enabled
 *     entry stored under an alias still counts at nav AND mount;
 *   - for every catalog desk × org type, "enable → mount" agrees with
 *     the mount guard's own simulation (wouldMountIfEnabled);
 *   - every desk the Setup Wizard can name is a real catalog desk,
 *     native for its type by default, and mountable once enabled for
 *     every pain combination;
 *   - Samskara One is native to Mandir + Ashram (owner decision);
 *   - the stranded App.tsx imports / unreachable case stay gone.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  workspaceRegistry,
  smartDefaultModulesFor,
  isModuleAllowed,
  isModuleAllowedForOrgMount,
  resolveOrgModuleId,
  wouldMountIfEnabled,
} from '../workspaceRegistry';
import { SHIKSHA_CASE_GROUP_IDS } from '../deskSurfaceGuard';
import { enableModule } from '../../suggestions/store';
import {
  getEssentialDesks,
  WIZARD_ORG_TYPES,
  PAINS,
} from '../../components/onboarding/wizardDeskMap';

const readSrc = (rel: string) => fs.readFileSync(path.join(__dirname, rel), 'utf-8');

const ws = (type: string, enabledModules: string[] = []) =>
  ({ type, enabledModules } as any);

const ALL_TYPES = Object.keys(workspaceRegistry);

// ---- The catalog, extracted from the Sidebar source (the same file
// nav, palette and store all render from). ----
const sidebarSrc = readSrc('../../components/common/Sidebar.tsx');
const catalogBlock = sidebarSrc.slice(
  sidebarSrc.indexOf('export const MODULE_CATALOG'),
  sidebarSrc.indexOf('interface DeskRowProps')
);
const CATALOG_IDS: string[] = [
  ...catalogBlock.matchAll(/\{ id: '([^']+)'/g),
].map((m) => m[1]);

/** The five historical alias doors (catalog id -> canonical id). */
const ALIAS_DOORS: Record<string, string> = {
  'treasury-audit': 'treasury',
  'sanctum-hud': 'purohitDesk',
  shlokaFeed: 'granthLibrary',
  dharmaMarketing: 'dharmicAssistant',
  matrimony: 'sanatani-vivah',
};

describe('catalog hygiene (A1-D01/D08/D09/D10)', () => {
  it('extracts a real catalog', () => {
    expect(CATALOG_IDS.length).toBeGreaterThanOrEqual(70);
  });

  it('has no duplicate rows (crisis-command was listed twice)', () => {
    expect(new Set(CATALOG_IDS).size).toBe(CATALOG_IDS.length);
    expect(CATALOG_IDS.filter((id) => id === 'crisis-command')).toHaveLength(1);
  });

  it('carries no alias doors and no dead devotee-portal row', () => {
    for (const alias of Object.keys(ALIAS_DOORS)) {
      expect(CATALOG_IDS).not.toContain(alias);
    }
    expect(CATALOG_IDS).not.toContain('devotee-portal');
  });

  it('every catalog id is already canonical', () => {
    for (const id of CATALOG_IDS) {
      expect(resolveOrgModuleId(id)).toBe(id);
    }
  });

  it('workspace-hub has a catalog row at last (A1-D09)', () => {
    expect(CATALOG_IDS).toContain('workspace-hub');
  });
});

describe('registry purity', () => {
  it('every native list speaks canonical ids, without duplicates', () => {
    for (const type of ALL_TYPES) {
      const natives = workspaceRegistry[type as keyof typeof workspaceRegistry];
      expect(new Set(natives).size).toBe(natives.length);
      for (const id of natives) {
        expect(resolveOrgModuleId(id)).toBe(id);
      }
    }
  });

  it('smart defaults are canonical and allowed from birth', () => {
    for (const type of ALL_TYPES) {
      const defaults = smartDefaultModulesFor(type);
      for (const id of defaults) {
        expect(resolveOrgModuleId(id)).toBe(id);
        expect(isModuleAllowed(ws(type, defaults), id)).toBe(true);
      }
    }
  });
});

describe('the canonical enable law (A1-D01)', () => {
  it('enableModule stores the canonical id for every historical alias door', () => {
    for (const [alias, canonical] of Object.entries(ALIAS_DOORS)) {
      let stored: string[] | null = null;
      const out = enableModule([], alias, (u) => {
        stored = u.enabledModules;
      });
      expect(out).toEqual([canonical]);
      expect(stored).toEqual([canonical]);
    }
  });

  it('enableModule dedupes canonically (a legacy alias entry already covers the desk)', () => {
    const noop = () => undefined;
    expect(enableModule(['purohitDesk'], 'sanctum-hud', noop)).toEqual(['purohitDesk']);
    expect(enableModule(['sanctum-hud'], 'purohitDesk', noop)).toEqual(['sanctum-hud']);
  });

  it('legacy alias entries in enabledModules still count at nav and mount', () => {
    for (const type of ALL_TYPES) {
      for (const [alias, canonical] of Object.entries(ALIAS_DOORS)) {
        const legacy = ws(type, [alias]);
        const fresh = ws(type, [canonical]);
        expect(isModuleAllowed(legacy, canonical)).toBe(true);
        expect(isModuleAllowedForOrgMount(legacy, canonical)).toBe(
          isModuleAllowedForOrgMount(fresh, canonical)
        );
      }
    }
  });

  it("'tally-export' is a desk, not an alias of 'taxReceipts' (the sixth door)", () => {
    expect(resolveOrgModuleId('tally-export')).toBe('tally-export');
    expect(resolveOrgModuleId('tallyExport')).toBe('tally-export');
    const noop = () => undefined;
    expect(enableModule([], 'tally-export', noop)).toEqual(['tally-export']);
    // Yoga has no native 'taxReceipts': the Tally desk must mount on
    // its own enable, not on a different desk's availability.
    expect(isModuleAllowedForOrgMount(ws('Yoga', ['tally-export']), 'tally-export')).toBe(true);
    expect(isModuleAllowedForOrgMount(ws('Yoga'), 'tally-export')).toBe(false);
  });

  it("Trust's AI desk is alive again: 'dharmicAssistant' is native and mounts", () => {
    expect(isModuleAllowed(ws('Trust'), 'dharmicAssistant')).toBe(true);
    expect(isModuleAllowedForOrgMount(ws('Trust'), 'dharmicAssistant')).toBe(true);
  });

  it('old alias dispatches still resolve at mount (deep links keep working)', () => {
    // 'sanctum-hud' is no longer sold anywhere, but a stored recent /
    // deep link naming it must land on the real desk, not a wall.
    expect(isModuleAllowedForOrgMount(ws('Mandir', ['purohitDesk']), 'sanctum-hud')).toBe(true);
    expect(isModuleAllowedForOrgMount(ws('PurohitSabha'), 'sanctum-hud')).toBe(true);
  });
});

describe('enable -> mount agreement, every catalog desk x org type', () => {
  for (const type of ALL_TYPES) {
    it(`${type}: enabling any catalog desk agrees with the mount guard`, () => {
      for (const id of CATALOG_IDS) {
        const enabled = ws(type, [resolveOrgModuleId(id)]);
        // Taxonomy always honours an enable (the store escape hatch).
        expect(isModuleAllowed(enabled, id)).toBe(true);
        // Mount agrees with the guard's own simulation of that enable.
        expect(isModuleAllowedForOrgMount(enabled, id)).toBe(
          wouldMountIfEnabled(ws(type), id)
        );
      }
    });
  }

  it('shiksha-family desks mount after enable only inside their own family', () => {
    for (const type of ALL_TYPES) {
      for (const id of SHIKSHA_CASE_GROUP_IDS) {
        const mounted = isModuleAllowedForOrgMount(ws(type, [id]), id);
        // wouldMountIfEnabled is the palette's shelf gate — same answer.
        expect(wouldMountIfEnabled(ws(type), id)).toBe(mounted);
      }
    }
    // Spot-check the audited wrong-desk cells:
    expect(isModuleAllowedForOrgMount(ws('Gurukul', ['sanghaDrills']), 'sanghaDrills')).toBe(false);
    expect(isModuleAllowedForOrgMount(ws('Sangha', ['gurukul']), 'gurukul')).toBe(false);
    expect(isModuleAllowedForOrgMount(ws('Vidyalaya', ['gurukulAcademy']), 'gurukulAcademy')).toBe(true);
    expect(isModuleAllowedForOrgMount(ws('Sangha', ['sevaTrust']), 'sevaTrust')).toBe(false);
  });

  it('workspace-hub mounts for every org type (Trustee gate lives in App.tsx)', () => {
    for (const type of ALL_TYPES) {
      expect(isModuleAllowed(ws(type), 'workspace-hub')).toBe(true);
      expect(isModuleAllowedForOrgMount(ws(type), 'workspace-hub')).toBe(true);
    }
  });
});

describe('Samskara One natives (owner decision)', () => {
  it('is native — no enable needed — for Mandir and Ashram', () => {
    for (const type of ['Mandir', 'Ashram']) {
      expect(isModuleAllowed(ws(type), 'samskara-one')).toBe(true);
      expect(isModuleAllowedForOrgMount(ws(type), 'samskara-one')).toBe(true);
    }
  });

  it('stays an App Store enable elsewhere (the decision named two types)', () => {
    expect(isModuleAllowedForOrgMount(ws('Goshala'), 'samskara-one')).toBe(false);
    expect(isModuleAllowedForOrgMount(ws('Goshala', ['samskara-one']), 'samskara-one')).toBe(true);
  });
});

describe('the Setup Wizard keeps its promises (A1-D06)', () => {
  const painIds = PAINS.map((p) => p.id);
  const combos: string[][] = [
    [],
    ...painIds.map((p) => [p]),
    painIds.slice(0, 3),
    painIds.slice(3, 6),
    painIds.slice(6),
  ];

  for (const type of WIZARD_ORG_TYPES) {
    it(`${type}: defaults are native, and every pick mounts once enabled`, () => {
      // No pains: the org's signature desks — all native/always-allowed.
      for (const d of getEssentialDesks(type, [], null)) {
        expect(CATALOG_IDS).toContain(d);
        expect(isModuleAllowed(ws(type), d)).toBe(true);
        expect(isModuleAllowedForOrgMount(ws(type), d)).toBe(true);
      }
      // Every pain combination: the wizard enables its picks, so each
      // named desk must mount with those enables in place.
      for (const pains of combos) {
        for (const size of [null, 'l', 'xl'] as const) {
          const desks = getEssentialDesks(type, pains, size);
          const enabledWs = ws(type, desks.map((d) => resolveOrgModuleId(d)));
          for (const d of desks) {
            expect(CATALOG_IDS).toContain(d);
            expect(wouldMountIfEnabled(ws(type), d)).toBe(true);
            expect(isModuleAllowedForOrgMount(enabledWs, d)).toBe(true);
          }
        }
      }
    });
  }
});

describe('source pins — the seams cannot silently reopen', () => {
  it('the palette install shelf gates on wouldMountIfEnabled', () => {
    const palette = readSrc('../../components/common/CommandPalette.tsx');
    expect(palette).toContain('wouldMountIfEnabled');
  });

  it('the wizard enables its picks at finish', () => {
    const wizard = readSrc('../../components/onboarding/SetupWizard.tsx');
    expect(wizard).toContain('enableModule(');
  });

  it('App.tsx carries no stranded desk imports and no unreachable Family Roots case', () => {
    const app = readSrc('../../App.tsx');
    expect(app).not.toContain("domain3/PurohitDesk'");
    expect(app).not.toContain("domain3/PanchangMuhuratDesk'");
    expect(app).not.toContain("domain3/PurohitMarketDesk'");
    expect(app).not.toContain("domain6/CrisisCommandCenter'");
    expect(app).not.toContain("domain6/FamilyRootsMatrimonyDesk'");
    expect(app).not.toContain("case 'familyRootsMatrimony':");
  });
});
