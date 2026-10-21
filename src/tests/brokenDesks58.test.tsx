/**
 * brokenDesks58.test.tsx — QUEUED #58 regression pins (fake/broken desks).
 *
 * 1. YatraNet crash — pinned behaviorally in
 *    src/maps/__tests__/tileProviders58.test.ts (the root cause lived in
 *    the shared tile layer, not the desk). Here: the desk's mount route
 *    and its ResilientTileLayer path stay intact.
 * 2. spiritualSettings — the "Module Upgrading" placeholder is gone from
 *    App.tsx; the real SpiritualSettingsDesk renders the workspace's own
 *    sampradaya / kuladevata / darshan timings.
 * 3. legalVault — name and content agree: catalog + i18n call it the
 *    "Security & Audit Log" it mounts; no "Encrypted Legal Vault" remains.
 * 4. sevaTrust — no longer native to Trust / AkshayaPatra and no longer
 *    in the catalog (nav / store / palette), while the mount guard still
 *    denies it honestly for stored enables and deep links.
 * 5/6. Campaigns + Fixed Assets — honest empty states instead of a blank
 *    body on real (seed-law-empty) workspaces.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as fs from 'fs';

const mockStore: any = {
  campaigns: [],
  assets: [],
  addCampaignDonation: jest.fn(),
  addAsset: jest.fn(),
};

const mockAuth: any = {
  activeWorkspace: {
    id: 'WS-TEST',
    name: 'Test Mandir',
    type: 'Mandir',
    sampradaya: 'Gaudiya Vaishnava',
    kuladevata: 'Lord Krishna',
    darshanTimings: [{ label: 'Mangala Aarti', time: '5:00 AM' }],
  },
  updateWorkspaceDetails: jest.fn(),
  checkPermission: () => true,
};

jest.mock('../context/DataContext', () => ({
  useData: () => mockStore,
}));
jest.mock('../context/AuthWorkspaceContext', () => ({
  useAuthWorkspace: () => mockAuth,
}));
jest.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
jest.mock('../lib/dbUtils', () => ({
  executeSafeUpdate: jest.fn().mockResolvedValue(undefined),
}));

import { MandirCampaignsDesk } from '../components/domain2/MandirCampaignsDesk';
import { AssetInventoryDesk } from '../components/domain2/AssetInventoryDesk';
import { SpiritualSettingsDesk } from '../components/domain6/SpiritualSettingsDesk';
import { isModuleAllowed, isModuleAllowedForOrgMount } from '../lib/workspaceRegistry';

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('Q58 — Campaigns desk honest empty state', () => {
  it('renders an empty state (not a blank body) when there are no campaigns', () => {
    mockStore.campaigns = [];
    const html = renderToString(<MandirCampaignsDesk />);
    expect(html).toContain('No campaigns yet');
    expect(html).toContain('Dharmic Campaigns &amp; Crowdfund Desk');
  });

  it('renders real campaign content when campaigns exist', () => {
    mockStore.campaigns = [
      {
        id: 'c1',
        title: 'Mandir Nirman — Garbhagriha Renovation',
        category: 'Construction',
        collectedAmount: 50000,
        targetAmount: 200000,
        topDonors: [],
        workspaceId: 'WS-TEST',
      },
    ];
    const html = renderToString(<MandirCampaignsDesk />);
    expect(html).toContain('Mandir Nirman — Garbhagriha Renovation');
    expect(html).toContain('No contributions yet');
    expect(html).not.toContain('No campaigns yet');
  });
});

describe('Q58 — Fixed Assets desk honest empty state', () => {
  it('renders an empty state (not a blank body) when there are no assets', () => {
    mockStore.assets = [];
    const html = renderToString(<AssetInventoryDesk />);
    expect(html).toContain('No fixed assets registered yet');
  });

  it('renders real asset content when assets exist', () => {
    mockStore.assets = [
      {
        id: 'a1',
        name: 'Swarna Mukut (Gold Crown)',
        category: 'Deity Ornaments & Gold',
        valuation: 500000,
        acquisitionDate: '2020-01-01',
        condition: 'Pristine',
        custodian: 'Head Priest',
        location: 'Sanctum Central Vault',
        workspaceId: 'WS-TEST',
      },
    ];
    const html = renderToString(<AssetInventoryDesk />);
    expect(html).toContain('Swarna Mukut (Gold Crown)');
    expect(html).not.toContain('No fixed assets registered yet');
  });
});

describe('Q58 — SpiritualSettingsDesk is a real desk over real fields', () => {
  it('renders the workspace sampradaya, kuladevata and darshan timings', () => {
    const html = renderToString(<SpiritualSettingsDesk />);
    expect(html).toContain('Gaudiya Vaishnava');
    expect(html).toContain('Lord Krishna');
    expect(html).toContain('Mangala Aarti');
    expect(html).toContain('Save Spiritual Settings');
  });

  it('source persists through the MasterSettings path (updateWorkspaceDetails + executeSafeUpdate)', () => {
    const src = read('src/components/domain6/SpiritualSettingsDesk.tsx');
    expect(src).toContain('updateWorkspaceDetails');
    expect(src).toContain('executeSafeUpdate');
    expect(src).toContain('darshanTimings');
  });

  it('App.tsx mounts it and the fake placeholder is deleted', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('<SpiritualSettingsDesk />');
    // The placeholder's rendered copy is gone (the removal comment in
    // App.tsx may still name what it deleted — the sentence may not).
    expect(app).not.toContain('This module is currently receiving');
    expect(app).not.toContain('will be available shortly');
  });
});

describe('Q58 — legalVault: the label tells the truth', () => {
  it('Sidebar catalog names the desk it mounts', () => {
    const sidebar = read('src/components/common/Sidebar.tsx');
    expect(sidebar).not.toContain('Encrypted Legal Vault');
    const row = sidebar.split('\n').find((l) => l.includes("id: 'legalVault'"));
    expect(row).toBeDefined();
    expect(row).toContain('Security & Audit Log');
  });

  it('i18n suites copy agrees (en/hi/bn)', () => {
    for (const lang of ['en', 'hi', 'bn']) {
      const suites = read(`src/i18n/lang/${lang}/suites.ts`);
      expect(suites).not.toContain('Encrypted Legal Vault');
      expect(suites).not.toContain('एन्क्रिप्टेड विधि तिजोरी');
      expect(suites).not.toContain('এনক্রিপ্টেড আইনি সিন্দুক');
    }
    expect(read('src/i18n/lang/en/suites.ts')).toContain('Security & Audit Log');
  });

  it('App.tsx still mounts AuditLogDesk for the id', () => {
    const app = read('src/App.tsx');
    expect(app).toContain("case 'legalVault':");
    expect(app).toContain('<AuditLogDesk />');
  });
});

describe('Q58 — sevaTrust: the app no longer promises an unbuilt desk', () => {
  it('is not native to Trust or AkshayaPatra anymore', () => {
    expect(isModuleAllowed({ type: 'Trust', enabledModules: [] }, 'sevaTrust')).toBe(false);
    expect(isModuleAllowed({ type: 'AkshayaPatra', enabledModules: [] }, 'sevaTrust')).toBe(false);
  });

  it('has no catalog row (nav / App Store / palette all read MODULE_CATALOG)', () => {
    const sidebar = read('src/components/common/Sidebar.tsx');
    expect(sidebar).not.toContain("id: 'sevaTrust'");
  });

  it('the mount guard still denies it honestly for stored enables / deep links', () => {
    expect(
      isModuleAllowedForOrgMount({ type: 'Trust', enabledModules: ['sevaTrust'] }, 'sevaTrust')
    ).toBe(false);
  });
});

describe('Q58 — YatraNet mount path intact', () => {
  it('App.tsx routes yatraNet to YatraNetDesk, which renders through ResilientTileLayer', () => {
    const app = read('src/App.tsx');
    expect(app).toContain("case 'yatraNet':");
    expect(app).toContain('<YatraNetDesk />');
    const desk = read('src/components/domain7/YatraNetDesk.tsx');
    expect(desk).toContain('ResilientTileLayer');
  });
});
