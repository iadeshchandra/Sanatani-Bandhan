/**
 * truth59.test.tsx — QUEUED #59 component + source pins (audit A4).
 *
 * 1. GurukulHome Parampara — renders the Pathshala register's real
 *    numbers (7 acharyas / 4 parikshas), reads NOTHING from the dead
 *    sb_gurukul_exams_ key, and shows honest zeros (never the old
 *    fabricated floor of 3) when the register is absent.
 * 2. AuditLogDesk — no fabricated audit rows: the invented people,
 *    IPs and SHA stamps are gone; an honest empty state renders.
 * 3. RoleHome KpiGrid — no "KYC 100%" pill (no KYC field exists), no
 *    unconditional "Synced"; the member count is the probed total and
 *    the treasury pill names what the number is.
 * 4. Source pins for the wiring that needs the full provider to
 *    exercise (DataContext.clearSampleData's exact predicate, the
 *    SAMPLE badge mounts, the Settings card mount, fallback identities).
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(SRC, p), 'utf8');

/* ---------------- in-memory localStorage (node test env) ---------------- */
const makeStorage = () => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
  };
};
const storage = makeStorage();
(globalThis as any).localStorage = storage;

/* ------------------------------- mocks ------------------------------- */
const mockData: any = {
  gurukulStudents: [],
  devotees: [],
  treasury: [],
  poojaBookings: [],
  cows: [],
  collectionWindows: {
    devotees: { total: 42, windowed: true },
    treasury: { windowed: true },
    puja_bookings: { total: null, windowed: false },
  },
  treasuryExactTotals: { totalIncome: 1000, totalExpense: 250 },
};
const mockAuth: any = {
  activeWorkspace: { id: 'WS-T59', name: 'Test Gurukul', type: 'Gurukul', currencySymbol: '₹' },
  checkPermission: () => true,
  currentUser: { name: 'Real Person' },
};

jest.mock('../context/DataContext', () => ({
  useData: () => mockData,
}));
jest.mock('../context/AuthWorkspaceContext', () => ({
  useAuthWorkspace: () => mockAuth,
}));
jest.mock('../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    safeTranslate: (_k: string, en: string) => en,
    getTaxonomy: () => ({ memberNoun: 'Bhaktas', directoryName: 'Devotee Directory', workspaceLabel: 'Mandir' }),
  }),
}));
jest.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('../hooks/useWorkspaceTaxonomy', () => ({
  useWorkspaceTaxonomy: () => ({
    memberNoun: 'Bhaktas',
    kartaNoun: 'Bhaktas',
    offeringNoun: 'Chanda',
    directoryName: 'Devotee Directory',
    workspaceLabel: 'Mandir',
  }),
}));
jest.mock('../components/common/Sidebar', () => ({ MODULE_CATALOG: [] }));
jest.mock('../components/common/ui/CountUp', () => ({
  // Render the final value directly — the KPI tests pin WHICH number
  // the card passes, not the tween.
  CountUp: ({ value, format }: any) => <span>{format ? format(value) : String(value)}</span>,
}));
jest.mock('../components/common/WindowedNotice', () => ({ WindowedNotice: () => null }));
jest.mock('../utils/csvEngine', () => ({ exportToCSV: jest.fn() }));
jest.mock('../suggestions/recommend', () => ({ getRecommendations: () => [], localizeText: (x: string) => x }));
jest.mock('../suggestions/festivals', () => ({ getUpcomingFestival: () => null }));
jest.mock('../suggestions/moduleCopy', () => ({ getModuleCopy: () => null }));
jest.mock('../suggestions/store', () => ({
  enableModule: jest.fn(),
  isSuggestionDismissed: () => true,
  dismissSuggestion: jest.fn(),
}));

import { GurukulHome } from '../components/dashboard/GurukulHome';
import { AuditLogDesk } from '../components/domain6/AuditLogDesk';
import { KpiGrid } from '../components/dashboard/RoleHome';
import { SampleBadge } from '../components/common/SampleBadge';

beforeEach(() => {
  storage.clear();
  mockData.treasuryExactTotals = { totalIncome: 1000, totalExpense: 250 };
  mockData.collectionWindows = {
    devotees: { total: 42, windowed: true },
    treasury: { windowed: true },
    puja_bookings: { total: null, windowed: false },
  };
});

describe('Q59 A4-3 — GurukulHome Parampara tells the truth', () => {
  it('renders the Pathshala register counts (gurus / parikshas)', () => {
    storage.setItem(
      'sb_pathshala_WS-T59',
      JSON.stringify({
        gurus: Array.from({ length: 7 }, (_, i) => ({ id: `g${i}` })),
        parikshas: Array.from({ length: 4 }, (_, i) => ({ id: `p${i}` })),
      }),
    );
    const html = renderToString(<GurukulHome onNavigate={() => {}} />);
    expect(html).toContain('font-black">7<');
    expect(html).toContain('font-black">4<');
  });

  it('ignores the dead sb_gurukul_exams_ key entirely', () => {
    storage.setItem(
      'sb_gurukul_exams_WS-T59',
      JSON.stringify(
        Array.from({ length: 9 }, (_, i) => ({ examinerAcharya: `Ghost ${i}` })),
      ),
    );
    storage.setItem(
      'sb_pathshala_WS-T59',
      JSON.stringify({ gurus: [{ id: 'g1' }], parikshas: [] }),
    );
    const html = renderToString(<GurukulHome onNavigate={() => {}} />);
    expect(html).toContain('font-black">1<');
    expect(html).not.toContain('font-black">9<');
  });

  it('honest zeros with no register — the fabricated floor of 3 is dead', () => {
    const html = renderToString(<GurukulHome onNavigate={() => {}} />);
    expect(html).toContain('font-black">0<');
    expect(html).not.toContain('font-black">3<');
    const src = read('components/dashboard/GurukulHome.tsx');
    expect(src).not.toContain('Math.max(acharyas.length, 3)');
    expect(src).not.toContain('getItem(`sb_gurukul_exams_');
  });
});

describe('Q59 — AuditLogDesk fabricates nothing', () => {
  it('renders the honest empty state and none of the invented rows', () => {
    const html = renderToString(<AuditLogDesk />);
    expect(html).toContain('No audit entries recorded yet');
    expect(html).not.toContain('adhyaksha@sanatanibandhan.org');
    expect(html).not.toContain('accountant@kashi-mandir.org');
    expect(html).not.toContain('log-101');
    expect(html).not.toContain('Immutable Cryptographic Audit Trail');
    expect(html).not.toContain('Tamper-proof record');
  });

  it('source: no hard-coded audit rows remain', () => {
    const src = read('components/domain6/AuditLogDesk.tsx');
    expect(src).not.toContain('BATCH_INGEST_DEVOTEES');
    expect(src).not.toContain('PIN_AUTH_FAILED');
    expect(src).not.toContain('a7b8c9d0e1f2');
  });
});

describe('Q59 A4-7 — RoleHome KPI honesty', () => {
  it('member count is the probed total; no KYC pill; treasury pill says Full ledger with exact totals', () => {
    const html = renderToString(<KpiGrid onNavigate={() => {}} />);
    expect(html).not.toContain('KYC 100%');
    expect(html).not.toContain('>Synced<');
    expect(html).toContain('Full ledger');
    expect(html).toContain('42'); // probed devotees total, not the loaded length (0)
    expect(html).toContain('750'); // exact net 1000 − 250, not the windowed sum (0)
  });

  it('windowed without exact totals → the pill admits it is only the loaded window', () => {
    mockData.treasuryExactTotals = null;
    const html = renderToString(<KpiGrid onNavigate={() => {}} />);
    expect(html).toContain('Loaded window only');
    expect(html).not.toContain('>Synced<');
  });

  it('source: the fabricated pills are gone from RoleHome', () => {
    const src = read('components/dashboard/RoleHome.tsx');
    expect(src).not.toContain('>KYC 100%<');
    expect(src).not.toContain('>Synced<');
    expect(src).toContain('collectionWindows.devotees.total ?? devotees.length');
    expect(src).toContain('resolveHerdCount');
  });
});

describe('Q59 A4-4 — sample marking + clearing wiring (source pins)', () => {
  it('SampleBadge renders the SAMPLE label', () => {
    const html = renderToString(<SampleBadge />);
    expect(html).toContain('Sample');
  });

  it('DataContext.clearSampleData removes exactly isDemoSeed ∧ workspace, and is exposed', () => {
    const src = read('context/DataContext.tsx');
    expect(src).toContain('clearSampleData: (workspaceId: string) => SampleRecordCounts');
    expect(src).toContain("r.isDemoSeed === true && r.workspaceId === workspaceId");
    expect(src).toContain("deleteDoc(doc(db, 'devotees', r.id))");
    expect(src).toContain("deleteDoc(doc(db, 'treasury', r.id))");
    expect((src.match(/clearSampleData,/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('badges are mounted where the seeded records list', () => {
    expect(read('components/domain1/DevoteeGrid.tsx')).toContain('isSampleRecord(devotee)');
    expect(read('components/domain2/TreasuryLedgerDesk.tsx')).toContain('isSampleRecord(tx)');
    expect(read('pathshala/ShishyaTab.tsx')).toContain('isSampleRecord(s)');
    expect(read('goshala/DugdhaTab.tsx')).toContain('isSampleEraMilkRow');
    expect(read('goshala/CharaTab.tsx')).toContain('isSampleEraFodderUseRow');
    expect(read('pathshala/ParikshaTab.tsx')).toContain('isSampleEraMarksRow');
  });

  it('Settings mounts the one-tap clear card', () => {
    const src = read('components/domain6/MasterSettingsDesk.tsx');
    expect(src).toContain("import { SampleDataCard } from './SampleDataCard';");
    expect(src).toContain('<SampleDataCard />');
  });
});

describe('Q59 A4-8/A4-9 — nouns + fallback identities (source pins)', () => {
  it('generic desks speak the org’s own member noun', () => {
    expect(read('components/domain1/FederationMultiBranchDesk.tsx')).toContain('taxonomy.memberNoun');
    expect(read('components/domain1/DonorCareDesk.tsx')).toContain('taxonomy.directoryName');
    expect(read('components/domain2/RecurringSevaDesk.tsx')).toContain('{taxonomy.memberNoun} Name *');
    expect(read('components/domain2/KarmaLedgerDesk.tsx')).toContain('{taxonomy.memberNoun}');
    expect(read('components/domain1/DevoteeGrid.tsx')).toContain('Loading {taxonomy.directoryName} from Firestore...');
    expect(read('components/domain1/DevoteeGrid.tsx')).not.toContain('Loading Devotee Records from Firestore');
  });

  it('no fabricated fallback identities remain', () => {
    const desk = read('components/domain4/AshramGoshalaGurukulDesk.tsx');
    expect(desk).not.toContain("'Sanatan Mandir Trust'");
    expect(desk).not.toContain("|| 'Acharya'");
    const ctx = read('context/AuthWorkspaceContext.tsx');
    expect(ctx).not.toContain("'Acharya / Trustee Administrator';");
    expect(ctx).not.toContain("|| '+91 98765 43210'");
    expect(ctx).not.toContain("|| 'admin@sanatanmandir.org'");
    expect(ctx).toContain('resolveActorName');
  });

  it('DashboardHome hero reads the herd through the one resolver', () => {
    const src = read('components/dashboard/DashboardHome.tsx');
    expect(src).toContain('resolveHerdCount(activeWorkspace.id, { legacyCowCount: cows.length })');
  });
});
