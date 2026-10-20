/**
 * ai/godmode/__tests__/copilot32.test.ts — QUEUED #32 executors.
 * =====================================================================
 * Gate parity (executor layer), real-read behaviour with fixture terms,
 * draft-never-writes, and failure honesty. Fixture values: a 17.5%
 * community commission and a ৳777 Standard BDT price — the isolation
 * pack (src/ai/__tests__/isolation.test.ts) asserts these NEVER reach
 * a non-owner; here we assert the owner DOES see them (real reads).
 */
import {
  adminAdviseTask,
  adminDraftChangeTask,
  adminHistoryTask,
  adminSimulateTask,
  adminTermsTask,
} from '../copilotTasks';
import {
  __setTermsCacheForTest,
  DEFAULT_TERMS,
  type PlatformTerms,
} from '../../../lib/termsConfig';
import type { Role, TaskCtx } from '../../types';

const mockTermsHistory = jest.fn();
const mockPlanSave = jest.fn();
const mockSaveCommissionConfig = jest.fn();
jest.mock('../../../lib/firestoreAdmin', () => ({
  firestoreAdmin: {
    termsHistory: (...args: unknown[]) => mockTermsHistory(...args),
    planSave: (...args: unknown[]) => mockPlanSave(...args),
    saveCommissionConfig: (...args: unknown[]) => mockSaveCommissionConfig(...args),
  },
}));

const FIXTURE_ENTRY = {
  id: 'fx1',
  action: 'terms.plans.save',
  at: '2026-10-19T10:30:00.000Z',
  actorUid: 'owner-uid',
  actorEmail: 'owner@example.com',
  kind: 'plan' as const,
  planId: 'standard',
  before: { ...DEFAULT_TERMS.plans.standard, priceMonthlyBDT: 700 },
  after: { ...DEFAULT_TERMS.plans.standard, priceMonthlyBDT: 750 },
  warnings: [],
};

function fixtureTerms(): PlatformTerms {
  const t: PlatformTerms = JSON.parse(JSON.stringify(DEFAULT_TERMS));
  t.plans.standard.priceMonthlyBDT = 777; // FIXTURE — must never leak to devotees
  t.commission.freeRate = 17.5; // FIXTURE — must never leak to devotees
  t.loadedAt = 1760000000000;
  return t;
}

function ctx(role: Role, input: string): TaskCtx {
  return { uid: 'u1', lang: 'en', role, input, slots: {} };
}

const EXECUTORS = [
  ['admin_terms', adminTermsTask, 'What are our terms?'],
  ['admin_history', adminHistoryTask, 'What changed?'],
  ['admin_simulate', adminSimulateTask, 'What if Rail-2 goes to 10%?'],
  ['admin_draft_change', adminDraftChangeTask, 'Change Standard BDT monthly to 750'],
  ['admin_advise', adminAdviseTask, 'Should I raise Pro?'],
] as const;

beforeEach(() => {
  jest.clearAllMocks();
  __setTermsCacheForTest(fixtureTerms());
  mockTermsHistory.mockResolvedValue({ ok: true, data: { ok: true, entries: [FIXTURE_ENTRY] } });
});

afterAll(() => {
  __setTermsCacheForTest(null);
});

describe('gate parity — executor layer (H4)', () => {
  it.each(EXECUTORS)('%s denies every non-owner role with clean copy', async (_name, fn, input) => {
    for (const role of ['devotee', 'sevadar', 'priest', 'accountant', 'trustee', 'purohit', 'jyotish'] as Role[]) {
      const out = await fn(ctx(role, input));
      expect(out.variant).toBe('denied');
      const text = String(out.params['text']);
      expect(text).toMatch(/GodMode/);
      expect(text).not.toMatch(/777|17\.5/); // denial never carries figures
      expect(out.params['proposal']).toBeUndefined();
    }
  });

  it('no executor ever calls a config write', async () => {
    for (const [, fn, input] of EXECUTORS) {
      await fn(ctx('owner', input));
    }
    expect(mockPlanSave).not.toHaveBeenCalled();
    expect(mockSaveCommissionConfig).not.toHaveBeenCalled();
  });
});

describe('admin_terms (owner)', () => {
  it('reads the live config — fixture values ARE served to the owner', async () => {
    const out = await adminTermsTask(ctx('owner', 'What are our terms?'));
    const text = String(out.params['text']);
    expect(text).toMatch(/৳777/);
    expect(text).toMatch(/community 17\.5%/);
  });

  it('flags drift from the law baseline', async () => {
    const out = await adminTermsTask(ctx('owner', 'What are our terms?'));
    expect(String(out.params['text'])).toMatch(/Drift from your law baseline/);
  });

  it('falls back to labelled defaults when the config cannot be read', async () => {
    // Exactly the state getTerms() fail-opens to: defaults, loadedAt null.
    const dflt: PlatformTerms = JSON.parse(JSON.stringify(DEFAULT_TERMS));
    dflt.loadedAt = null;
    __setTermsCacheForTest(dflt);
    const out = await adminTermsTask(ctx('owner', 'What are our terms?'));
    const text = String(out.params['text']);
    expect(text).toMatch(/locked code defaults/);
    expect(text).not.toMatch(/777|17\.5/); // never invented figures
  });
});

describe('admin_history (owner)', () => {
  it('renders field-level changes from the #31 audit entries', async () => {
    const out = await adminHistoryTask(ctx('owner', 'What changed?'));
    const text = String(out.params['text']);
    expect(text).toMatch(/Monthly BDT: ৳700 → ৳750/);
    expect(text).toMatch(/owner@example\.com/);
  });

  it('is honestly unavailable when the history read fails — no figures', async () => {
    mockTermsHistory.mockResolvedValue({ ok: false, error: 'denied' });
    const out = await adminHistoryTask(ctx('owner', 'What changed?'));
    expect(out.variant).toBe('unavailable');
    expect(String(out.params['text'])).not.toMatch(/\d/);
  });
});

describe('admin_simulate (owner)', () => {
  it('computes the impact and changes nothing', async () => {
    const out = await adminSimulateTask(ctx('owner', 'What if Rail-2 goes to 10%?'));
    const text = String(out.params['text']);
    expect(text).toMatch(/Simulation only — nothing has changed/);
    expect(text).toMatch(/₹240 → ₹200/);
    expect(mockSaveCommissionConfig).not.toHaveBeenCalled();
  });

  it('asks a clarifying question instead of guessing', async () => {
    const out = await adminSimulateTask(ctx('owner', 'Simulate a change'));
    expect(out.variant).toBe('clarify');
  });
});

describe('admin_draft_change (owner)', () => {
  it('produces a proposal card payload — and writes NOTHING', async () => {
    const out = await adminDraftChangeTask(ctx('owner', 'Change Standard BDT monthly to 750'));
    expect(out.variant).toBe('proposal');
    const proposal = out.params['proposal'] as { patch: Record<string, number>; fieldLabel: string };
    expect(proposal.patch).toEqual({ priceMonthlyBDT: 750 });
    expect(proposal.fieldLabel).toMatch(/Standard/);
    expect(mockPlanSave).not.toHaveBeenCalled();
    expect(mockSaveCommissionConfig).not.toHaveBeenCalled();
  });

  it('refuses to draft an invalid change', async () => {
    const out = await adminDraftChangeTask(ctx('owner', 'Set Rail-1 to 160%'));
    expect(out.variant).toBe('invalid');
    expect(out.params['proposal']).toBeUndefined();
  });

  it('clarifies rather than guessing at an unpinnable ask', async () => {
    const out = await adminDraftChangeTask(ctx('owner', 'Draft a change'));
    expect(out.variant).toBe('clarify');
    expect(out.params['proposal']).toBeUndefined();
  });
});

describe('admin_advise (owner)', () => {
  it('counsels from the brief with live numbers', async () => {
    const out = await adminAdviseTask(ctx('owner', 'How do I grow revenue?'));
    const text = String(out.params['text']);
    expect(text).toMatch(/My counsel/);
    expect(text).toMatch(/bypass-proof/);
  });
});
