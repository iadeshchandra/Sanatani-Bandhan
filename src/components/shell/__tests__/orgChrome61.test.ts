/**
 * orgChrome61.test.ts — QUEUED #61 org chrome/UX law pins (audit A3).
 *
 * The components' import chains are not jest-loadable in the node env
 * (same constraint as paletteDiscoverability #48), so the pins read the
 * sources. What is pinned is the user-visible contract the audit set:
 *  A3-6  every swept org-desk modal docks as a bottom sheet on small
 *        screens and its panel carries the dvh height cap (actions
 *        always reachable — the Dharamshala Save-button defect);
 *  A3-1  ONE Suchana bell (the org shell's), ONE org name (the ERP
 *        header's), and the header role label is the per-org role;
 *  A3-4  the helpdesk floater never mounts in an org session;
 *  A3-5  the toast viewport never sits in the SOS corner;
 *  A3-11 the SOS sub-controls carry 44px hit areas;
 *  A3-3  Sahayata has a door below 2xl (the avatar menu);
 *  A3-10 per-desk guide anchors are wired;
 *  clipping: Settings tabs wrap, Rituals prices never shrink, the
 *        directory filter strip can shrink (min-w-0) inside its card.
 */
import * as fs from 'fs';
import * as path from 'path';

const COMPONENTS = path.join(__dirname, '../..');
const SRC = path.join(__dirname, '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(COMPONENTS, rel), 'utf-8');
}

/** Modal overlay lines in a file: fixed inset-0 + centred content. */
function overlayIdxs(lines: string[]): number[] {
  const out: number[] = [];
  lines.forEach((l, i) => {
    if (l.includes('fixed inset-0') && l.includes('justify-center')) out.push(i);
  });
  return out;
}

/** The panel className for an overlay: first bg-* className within 5 lines. */
function panelClass(lines: string[], overlayIdx: number): string | null {
  for (let j = overlayIdx + 1; j < Math.min(overlayIdx + 6, lines.length); j++) {
    const m = lines[j].match(/className="([^"]*)"/);
    if (m && /(bg-white|bg-temple|bg-stone|bg-slate)/.test(m[1])) return m[1];
  }
  return null;
}

const MODAL_FILES = [
  'domain1/FamilyHouseholdDesk.tsx',
  'domain1/GuestManagerDesk.tsx',
  'domain1/VanshavaliDesk.tsx',
  'domain1/RakthaSevaDesk.tsx',
  'domain1/DevoteeGrid.tsx',
  'domain2/AssetInventoryDesk.tsx',
  'domain2/Form10BDComplianceDesk.tsx',
  'domain2/InventoryDesk.tsx',
  'domain2/MandirCampaignsDesk.tsx',
  'domain2/TaxReceiptDesk.tsx',
  'domain2/TreasuryLedgerDesk.tsx',
  'domain2/RatnaBhandarAssetDesk.tsx',
  'domain2/RecurringSevaDesk.tsx',
  'domain2/QuickChandaPOS.tsx',
  'domain3/PitruShradhDesk.tsx',
  'domain3/PoojaBookingDesk.tsx',
  'domain3/PurohitManagementDesk.tsx',
  'domain3/PurohitPortalUnified.tsx',
  'domain4/AnnadanamKitchenDesk.tsx',
  'domain4/DharamshalaDesk.tsx',
  'domain4/SmartBhandarProcurementDesk.tsx',
  'domain4/VedicSevaShikshaDesk.tsx',
  'domain4/SanataniVivahDesk.tsx',
  'domain5/VedicCalendarEventsDesk.tsx',
  'domain5/DevoteeAccountPortal.tsx',
  'domain6/MasterSettingsDesk.tsx',
  'domain6/UserRolesDesk.tsx',
  'domain6/PanchayatPollingDesk.tsx',
  'domain6/OrgBrandingSection.tsx',
  'org/JoinRequestModal.tsx',
];

describe('A3-6 modal law — bottom-sheet dock + dvh cap on every swept desk modal', () => {
  for (const rel of MODAL_FILES) {
    it(`${rel}: every modal overlay docks and every panel is capped`, () => {
      const lines = read(rel).split('\n');
      const idxs = overlayIdxs(lines);
      expect(idxs.length).toBeGreaterThan(0);
      for (const i of idxs) {
        expect(lines[i]).toContain('items-end sm:items-center');
        const panel = panelClass(lines, i);
        expect(panel).not.toBeNull();
        expect(panel as string).toContain('max-h-[calc(100dvh-1rem)]');
      }
    });
  }

  it('the shared ui/Modal docks as a sheet and carries the dvh cap', () => {
    const src = read('common/ui/Modal.tsx');
    expect(src).toContain('items-end sm:items-center');
    expect(src).toContain('max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]');
    expect(src).toContain('rounded-t-3xl sm:rounded-2xl');
  });

  it('Dharamshala booking modal: fields scroll, Save footer is pinned', () => {
    const src = read('domain4/DharamshalaDesk.tsx');
    expect(src).toContain('overflow-y-auto min-h-0 px-6 py-4 space-y-3');
    expect(src).toMatch(/border-t border-slate-200 shrink-0 px-6 py-4/);
  });
});

describe('A3-1 one header law', () => {
  const header = read('common/Header.tsx');
  const shell = read('shell/OrgSpaceShell.tsx');

  it('the ERP Header renders no NotificationBell — the shell bell is the only one', () => {
    expect(header).not.toContain('<NotificationBell');
    expect(header).not.toContain("from '../../notifications/NotificationBell'");
    expect(shell.match(/<NotificationBell/g)?.length).toBe(1);
  });

  it('the header role label is the per-org effectiveRole, not the global role', () => {
    expect(header).toContain('getRoleLabel(effectiveRole)');
    expect(header).not.toContain('{getRoleLabel(currentRole)}');
  });

  it('the avatar shows person initials, never role initials', () => {
    expect(header).toContain('avatarInitials');
    expect(header).not.toContain('currentRole.substring(0,2)');
  });

  it('the shell renders the org name zero times as a heading; the crumb root is the Command Center', () => {
    expect(shell).not.toContain('>{orgName}</h1>');
    expect(shell).toContain('commandCenterLabel');
    expect(shell).toContain("{commandCenterLabel}");
  });

  it('the breadcrumb desk segment can truncate (min-w-0) instead of clipping', () => {
    expect(shell).toMatch(/truncate min-w-0/);
    expect(shell).toContain("deskId !== 'dashboard'");
  });
});

describe('A3-4 floater law', () => {
  it('the helpdesk widget returns null for org sessions', () => {
    const src = read('common/TawkToWidget.tsx');
    expect(src).toContain("if (sessionKind === 'org') return null;");
    // the guard must sit before the trigger button render
    expect(src.indexOf("sessionKind === 'org'")).toBeLessThan(
      src.indexOf('live-helpdesk-trigger-btn'),
    );
  });
});

describe('A3-5 toast viewport', () => {
  it('toasts never sit in the SOS corner', () => {
    const src = fs.readFileSync(path.join(SRC, 'context/ToastContext.tsx'), 'utf-8');
    expect(src).not.toContain('bottom-6 right-6');
    expect(src).toContain('bottom-6 left-1/2');
    expect(src).toContain('md:top-[152px]');
  });
});

describe('A3-11 touch targets', () => {
  it('the SOS hint-dismiss and collapse controls carry 44px hit areas', () => {
    const src = fs.readFileSync(path.join(SRC, 'crisis/PanicButton.tsx'), 'utf-8');
    expect(src).not.toContain('min-w-[28px]');
    expect(src).not.toContain('min-w-[32px]');
    expect((src.match(/min-w-\[44px\] min-h-\[44px\]/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('the sidebar collapse + mobile-close toggles are 44px', () => {
    const src = read('common/Sidebar.tsx');
    expect(src).toMatch(/hidden lg:flex p-1\.5 min-w-\[44px\] min-h-\[44px\]/);
    expect(src).toMatch(/lg:hidden p-2 min-w-\[44px\] min-h-\[44px\]/);
  });
});

describe('A3-3 Sahayata door at every width', () => {
  it('the avatar menu carries the Community — Sahayata entry', () => {
    const header = read('common/Header.tsx');
    expect(header).toContain('Community — Sahayata');
    expect(header).toContain('onOpenSahayata();');
  });
});

describe('A3-10 guide anchors wired', () => {
  const cases: [string, string][] = [
    ['common/Sidebar.tsx', 'org-desk-search'],
    ['common/Header.tsx', 'org-desk-palette'],
    ['domain4/DharamshalaDesk.tsx', 'org-dharamshala-new-booking'],
    ['domain1/GuestManagerDesk.tsx', 'org-guests-add'],
    ['domain5/VedicCalendarEventsDesk.tsx', 'org-events-add'],
    ['domain2/InventoryDesk.tsx', 'org-inventory-add'],
    ['domain2/AssetInventoryDesk.tsx', 'org-assets-add'],
    ['domain3/PoojaBookingDesk.tsx', 'org-rituals-book'],
    ['domain1/DevoteeGrid.tsx', 'org-directory-add'],
  ];
  for (const [rel, anchor] of cases) {
    it(`${rel} exposes data-guide-anchor="${anchor}"`, () => {
      expect(read(rel)).toContain(`data-guide-anchor="${anchor}"`);
    });
  }
});

describe('mobile clipping fixes at the root', () => {
  it('Settings tabs wrap instead of scrolling behind a hidden scrollbar', () => {
    const src = read('domain6/MasterSettingsDesk.tsx');
    expect(src).toContain('flex flex-wrap gap-2 border-b border-gray-200');
    expect(src).not.toContain('overflow-x-auto scrollbar-hide');
  });

  it('Rituals prices never shrink or break', () => {
    const src = read('domain3/PoojaBookingDesk.tsx');
    expect(src).toMatch(/font-mono font-bold text-amber-400 text-\[11px\] shrink-0 whitespace-nowrap/);
  });

  it('the directory filter strip can shrink within its card (min-w-0) and wraps on mobile', () => {
    const src = read('domain1/DevoteeGrid.tsx');
    expect(src).toContain('flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto sm:min-w-0 sm:overflow-x-auto');
  });
});
