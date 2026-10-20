/**
 * ai/godmode/__tests__/goldenAnswers.test.ts — QUEUED #36 golden bank.
 * =====================================================================
 * Representative owner questions with PINNED expected facts, run
 * against fixture stores (terms cache + mocked Firestore counts/docs).
 * This suite is the measurable accuracy gate for the Copilot: if any
 * future change makes an answer state a wrong figure, drop a source,
 * break a verification, or phrase over missing data — a golden fails.
 *
 * Fixture values (same as copilot32): Standard BDT monthly ৳777 and a
 * 17.5% community commission — distinctive on purpose.
 */
import {
  adminAdviseTask,
  adminAnomalyTask,
  adminBriefingTask,
  adminDraftChangeTask,
  adminHistoryTask,
  adminModerationHelpTask,
  adminSimulateTask,
  adminStatsTask,
  adminTermsTask,
} from '../copilotTasks';
import {
  __setTermsCacheForTest,
  DEFAULT_TERMS,
  type PlatformTerms,
} from '../../../lib/termsConfig';
import { verifyFigures } from '../accuracy';
import { ask } from '../../assistant';
import type { Role, TaskCtx } from '../../types';

/* ------------------------------------------------------------------ */
/* Mock Firestore — counts keyed by collection|field@age / field=value */
/* ------------------------------------------------------------------ */

const mockCounts = new Map<string, number>();
const mockFailKeys = new Set<string>();
const mockDocsByCol: Record<string, Array<{ id: string; data: Record<string, unknown> }>> = {};

function mockConstraintKey(c: { field: string; value: unknown }): string {
  const v = c.value;
  if (v instanceof Date) {
    const ageDays = Math.round((Date.now() - v.getTime()) / 86400000);
    return `${c.field}@${ageDays}d`;
  }
  return `${c.field}=${String(v)}`;
}
function mockCountKey(col: string, constraints: Array<{ field: string; value: unknown }>): string {
  return [col, ...constraints.map(mockConstraintKey)].join('|');
}

jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ __col: name }),
  where: (field: string, op: string, value: unknown) => ({ field, op, value }),
  limit: (n: number) => ({ __limit: n }),
  query: (col: { __col: string }, ...constraints: unknown[]) => ({ __col: col.__col, constraints }),
  getCountFromServer: async (q: { __col: string; constraints: Array<{ field: string; value: unknown }> }) => {
    const key = mockCountKey(q.__col, q.constraints || []);
    if (mockFailKeys.has(key)) throw new Error('mock read failure');
    return { data: () => ({ count: mockCounts.get(key) ?? 0 }) };
  },
  getDocs: async (q: { __col: string }) => {
    const docs = mockDocsByCol[q.__col] || [];
    return {
      forEach: (cb: (d: { id: string; data: () => Record<string, unknown> }) => void) =>
        docs.forEach((d) => cb({ id: d.id, data: () => d.data })),
    };
  },
}));

jest.mock('../../../firebase', () => ({ db: {}, auth: { currentUser: null } }));

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

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

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
  t.plans.standard.priceMonthlyBDT = 777; // FIXTURE
  t.commission.freeRate = 17.5; // FIXTURE
  t.loadedAt = 1760000000000;
  return t;
}

function ctx(input: string, role: Role = 'owner'): TaskCtx {
  return { uid: 'u1', lang: 'en', role, input, slots: {} };
}

function setCount(col: string, key: string, n: number) {
  mockCounts.set(key ? `${col}|${key}` : col, n);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCounts.clear();
  mockFailKeys.clear();
  for (const k of Object.keys(mockDocsByCol)) delete mockDocsByCol[k];
  __setTermsCacheForTest(fixtureTerms());
  mockTermsHistory.mockResolvedValue({ ok: true, data: { ok: true, entries: [FIXTURE_ENTRY] } });
});

afterAll(() => {
  __setTermsCacheForTest(null);
});

/* ------------------------------------------------------------------ */
/* admin_terms                                                         */
/* ------------------------------------------------------------------ */

describe('golden: terms', () => {
  it('Q: "What are our terms?" — live figures, provenance, verified claims', async () => {
    const out = await adminTermsTask(ctx('What are our terms?'));
    const text = String(out.params['text']);
    expect(text).toContain('৳777');
    expect(text).toContain('community 17.5%');
    expect(text).toContain('₹4,999'); // Standard yearly INR
    expect(text).toContain('₹19,999'); // Premium yearly INR
    expect(text).toContain('$2.50'); // Pro monthly USD, never rounded away
    expect(out.sources?.map((s) => s.label).join(' ')).toMatch(/plans\//);
    expect(out.sources?.map((s) => s.label).join(' ')).toMatch(/platformConfig\/commission/);
    expect(out.sources?.every((s) => s.live)).toBe(true);
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });

  it('Q: "What are our terms?" on defaults — labelled, sources not live, no fixture leak', async () => {
    const dflt: PlatformTerms = JSON.parse(JSON.stringify(DEFAULT_TERMS));
    dflt.loadedAt = null;
    __setTermsCacheForTest(dflt);
    const out = await adminTermsTask(ctx('What are our terms?'));
    const text = String(out.params['text']);
    expect(out.variant).toBe('defaults');
    expect(text).toContain('locked code defaults');
    expect(text).not.toContain('777');
    expect(text).not.toContain('17.5');
    expect(out.sources?.every((s) => !s.live)).toBe(true);
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* admin_history                                                       */
/* ------------------------------------------------------------------ */

describe('golden: history', () => {
  it('Q: "What changed?" — field-level facts + audit source', async () => {
    const out = await adminHistoryTask(ctx('What changed?'));
    const text = String(out.params['text']);
    expect(text).toContain('Monthly BDT: ৳700 → ৳750');
    expect(text).toContain('owner@example.com');
    expect(out.sources?.[0].label).toMatch(/audit_logs/);
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });

  it('Q: "What changed?" with an empty history — honest emptiness', async () => {
    mockTermsHistory.mockResolvedValue({ ok: true, data: { ok: true, entries: [] } });
    const out = await adminHistoryTask(ctx('What changed?'));
    expect(String(out.params['text'])).toContain('No terms changes recorded yet');
    expect(out.claims ?? []).toHaveLength(0);
  });

  it('Q: "What changed?" when the read fails — abstains, invents nothing', async () => {
    mockTermsHistory.mockResolvedValue({ ok: false });
    const out = await adminHistoryTask(ctx('What changed?'));
    expect(out.variant).toBe('unavailable');
    expect(String(out.params['text'])).toMatch(/won't invent figures/);
  });
});

/* ------------------------------------------------------------------ */
/* admin_simulate                                                      */
/* ------------------------------------------------------------------ */

describe('golden: simulate', () => {
  it('Q: "What if Rail-2 goes to 10%?" — dual-computed sample maths, strict-verified', async () => {
    const out = await adminSimulateTask(ctx('What if Rail-2 goes to 10%?'));
    const text = String(out.params['text']);
    expect(text).toContain('platform keeps ₹60 → ₹50');
    expect(text).toContain('provider receives ₹440 → ₹450');
    expect(text).toContain('platform keeps ₹1,200 → ₹1,000');
    expect(out.variant).not.toBe('discrepancy');
    const v = verifyFigures(text, out.claims ?? [], {
      strict: true,
      extraNumbers: out.extraNumbers,
    });
    expect(v).toEqual({ ok: true, missing: [], stray: [] });
  });

  it('Q: "What if Standard BDT monthly becomes 750?" — annual-law figures from the fixture', async () => {
    const out = await adminSimulateTask(ctx('What if Standard BDT monthly becomes 750?'));
    const text = String(out.params['text']);
    expect(text).toContain('৳777 → ৳750');
    expect(text).toContain('yearly ৳7,000 = 9.3 × monthly');
    const v = verifyFigures(text, out.claims ?? [], {
      strict: true,
      extraNumbers: out.extraNumbers,
    });
    expect(v.ok).toBe(true);
  });

  it('Q: "What if community commission goes to 12%?" — decimal-rate maths (17.5% fixture)', async () => {
    const out = await adminSimulateTask(ctx('What if community commission goes to 12%?'));
    const text = String(out.params['text']);
    expect(text).toContain('platform keeps ₹88 → ₹60'); // ₹500 × 17.5% = ₹88 by BOTH paths
    expect(text).toContain('provider receives ₹412 → ₹440');
  });

  it('Q: "What if free tier gig cap goes to 5?" — cap maths', async () => {
    const out = await adminSimulateTask(ctx('What if free tier gig cap goes to 5?'));
    expect(String(out.params['text'])).toContain('could hold 5 active gigs (today 3)');
  });

  it('Q: "What if Rail-1 goes to 150%?" — invalid change is named, not hidden', async () => {
    const out = await adminSimulateTask(ctx('What if Rail-1 goes to 150%?'));
    expect(String(out.params['text'])).toContain('could NOT be saved');
  });

  it('Q: "What if we do something nice?" — clarifies, cites no figures', async () => {
    const out = await adminSimulateTask(ctx('What if we do something nice?'));
    expect(out.variant).toBe('clarify');
    expect(out.claims ?? []).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* admin_draft_change                                                  */
/* ------------------------------------------------------------------ */

describe('golden: draft change', () => {
  it('Q: "Change Standard BDT monthly to 750" — proposal from the LIVE value, never a write', async () => {
    const out = await adminDraftChangeTask(ctx('Change Standard BDT monthly to 750'));
    expect(out.variant).toBe('proposal');
    expect(String(out.params['text'])).toContain('777 → 750');
    const proposal = out.params['proposal'] as { newValue: number; field: string };
    expect(proposal.newValue).toBe(750);
    expect(proposal.field).toBe('priceMonthlyBDT');
    expect(out.sources?.length).toBeGreaterThan(0);
    expect(mockPlanSave).not.toHaveBeenCalled();
    expect(mockSaveCommissionConfig).not.toHaveBeenCalled();
  });

  it('Q: "Set Rail-1 to 7%" — commission proposal', async () => {
    const out = await adminDraftChangeTask(ctx('Set Rail-1 to 7%'));
    const proposal = out.params['proposal'] as { field: string; oldValue: number; newValue: number };
    expect(proposal.field).toBe('proRail1Rate');
    expect(proposal.oldValue).toBe(8);
    expect(proposal.newValue).toBe(7);
  });

  it('Q: "Set Rail-1 to 150%" — refused with the validation reason', async () => {
    const out = await adminDraftChangeTask(ctx('Set Rail-1 to 150%'));
    expect(out.variant).toBe('invalid');
    expect(String(out.params['text'])).toContain("won't draft");
    expect(out.params['proposal']).toBeUndefined();
  });

  it('Q: "Change something please" — clarifies instead of guessing at prices', async () => {
    const out = await adminDraftChangeTask(ctx('Change something please'));
    expect(out.variant).toBe('clarify');
  });
});

/* ------------------------------------------------------------------ */
/* admin_advise                                                        */
/* ------------------------------------------------------------------ */

describe('golden: advise', () => {
  it('Q: "Should I raise Pro BDT to 320?" — counsel on live numbers, dual-computed halfway', async () => {
    const out = await adminAdviseTask(ctx('Should I raise Pro BDT to 320?'));
    const text = String(out.params['text']);
    expect(text).toContain('is ৳280 today');
    expect(text).toContain('Meet halfway at 300');
    expect(text).toContain('1 terms change(s) in the recent window');
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });

  it('Q: "How do I grow revenue without hurting temples?" — growth counsel with live prices', async () => {
    const out = await adminAdviseTask(ctx('How do I grow revenue without hurting temples?'));
    const text = String(out.params['text']);
    expect(text).toContain('Standard ₹499·৳777/mo');
    expect(text).toContain('commission 17.5/8/12%');
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });

  it('Q: "Is our commission too high?" — rates + the law baseline', async () => {
    const out = await adminAdviseTask(ctx('Is our commission too high?'));
    const text = String(out.params['text']);
    expect(text).toContain('community 17.5%');
    expect(text).toContain('your law baseline is 15 / 8 / 12');
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });

  it('Q: "Should the community commission be 20%?" — Pro floor price is the LIVE one', async () => {
    const out = await adminAdviseTask(ctx('Should the community commission be 20%?'));
    const text = String(out.params['text']);
    expect(text).toContain('Pro at ৳280/mo');
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });

  it('Q: price counsel when history is unreadable — abstains on momentum (#36)', async () => {
    mockTermsHistory.mockResolvedValue({ ok: false });
    const out = await adminAdviseTask(ctx('Should I raise Pro BDT to 320?'));
    const text = String(out.params['text']);
    expect(text).toContain("couldn't read the recent change history");
    expect(text).not.toContain('0 terms change(s)');
  });

  it('Q: "Advise me" (no topic) — honest scope, no figures claimed', async () => {
    const out = await adminAdviseTask(ctx('Advise me'));
    expect(String(out.params['text'])).toContain('I never advise blind');
    expect(out.claims ?? []).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* admin_briefing / admin_stats (mocked counts)                        */
/* ------------------------------------------------------------------ */

describe('golden: briefing + stats', () => {
  function seedBriefing() {
    setCount('sevaProfessionals', 'verificationStatus=pending', 2);
    setCount('sangamPosts', 'status=flagged', 3);
    setCount('disputes', 'status=open', 1);
  }

  it('Q: "What needs my attention?" — exact counts + collection sources', async () => {
    seedBriefing();
    const out = await adminBriefingTask(ctx('What needs my attention?'));
    const text = String(out.params['text']);
    expect(text).toContain('2 verifications waiting');
    expect(text).toContain('3 flagged posts to review');
    expect(text).toContain('1 open disputes');
    expect(out.variant).toBe('busy');
    expect(out.sources?.map((s) => s.label).join(' ')).toMatch(/sevaProfessionals/);
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });

  it('Q: briefing when one count read fails — says it cannot read, guesses nothing', async () => {
    seedBriefing();
    mockFailKeys.add('disputes|status=open');
    const out = await adminBriefingTask(ctx('What needs my attention?'));
    expect(String(out.params['text'])).toMatch(/won’t guess/);
    expect(out.claims ?? []).toHaveLength(0);
  });

  function seedStats() {
    setCount('marketplaceOrders', 'createdAt@7d', 40);
    setCount('users', 'createdAt@7d', 12);
    setCount('users', 'lastActiveAt@7d', 30);
    setCount('campusMaps', '', 25);
  }

  it('Q: "How many bookings this week?" — exact weekly numbers', async () => {
    seedStats();
    const out = await adminStatsTask(ctx('How many bookings this week?'));
    const text = String(out.params['text']);
    expect(text).toContain('40 bookings');
    expect(text).toContain('30 active seekers');
    expect(text).toContain('12 new signups');
    expect(text).toContain('25 temples mapped');
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });

  it('Q: stats when the active-users read fails — abstains instead of printing 0 (#36)', async () => {
    seedStats();
    mockFailKeys.add('users|lastActiveAt@7d');
    const out = await adminStatsTask(ctx('How many bookings this week?'));
    const text = String(out.params['text']);
    expect(text).toMatch(/aren’t available/);
    expect(text).not.toContain('0 active seekers');
  });
});

/* ------------------------------------------------------------------ */
/* admin_moderation_help + admin_anomaly (mocked docs/counts)          */
/* ------------------------------------------------------------------ */

describe('golden: moderation + anomaly', () => {
  it('Q: "Review flagged posts" — queue facts + rubric outcomes', async () => {
    mockDocsByCol['sangamPosts'] = [
      { id: 'p1', data: { kind: 'post', text: 'spammy offer', authorName: 'A', reportCount: 6, reportReasons: ['spam'] } },
      { id: 'p2', data: { kind: 'post', text: 'a photo', authorName: 'B', reportCount: 1, reportReasons: ['other'] } },
    ];
    const out = await adminModerationHelpTask(ctx('Review flagged posts'));
    expect(out.variant).toBe('queue');
    const items = out.params['items'] as Array<{ recommendation: string; reportCount: number }>;
    expect(items).toHaveLength(2);
    expect(items[0].recommendation).toBe('remove'); // 6 reports
    expect(items[1].recommendation).toBe('review'); // 1 report
    expect(out.sources?.[0].label).toMatch(/sangamPosts/);
  });

  it('Q: "Anything unusual?" — a real report spike with CORRECT trailing maths (#36)', async () => {
    setCount('sangamPosts', 'reportedAt@1d', 6);
    setCount('sangamPosts', 'reportedAt@7d', 13);
    setCount('sangamPosts', 'reportedAt@14d', 20); // prior week: 7 reports → 1/day
    setCount('users', 'createdAt@1d', 2);
    setCount('users', 'createdAt@7d', 14);
    setCount('users', 'createdAt@14d', 21);
    setCount('marketplaceOrders', 'status=cancelled&createdAt@7d', 2);
    setCount('marketplaceOrders', 'status=cancelled&createdAt@14d', 4);
    const out = await adminAnomalyTask(ctx('Anything unusual?'));
    const text = String(out.params['text']);
    expect(out.variant).toBe('findings');
    expect(text).toContain('6.0× the 7-day average (6 in 24h vs ~1/day)');
    expect(text).not.toContain('Infinity');
  });

  it('Q: "Anything unusual?" on a calm platform — calm, no invented findings', async () => {
    setCount('sangamPosts', 'reportedAt@1d', 1);
    setCount('sangamPosts', 'reportedAt@7d', 8);
    setCount('sangamPosts', 'reportedAt@14d', 15);
    setCount('users', 'createdAt@1d', 3);
    setCount('users', 'createdAt@7d', 21);
    setCount('users', 'createdAt@14d', 42);
    setCount('marketplaceOrders', 'status=cancelled&createdAt@7d', 1);
    setCount('marketplaceOrders', 'status=cancelled&createdAt@14d', 2);
    const out = await adminAnomalyTask(ctx('Anything unusual?'));
    expect(out.variant).toBe('calm');
    expect(String(out.params['text'])).toContain('Nothing unusual');
  });
});

/* ------------------------------------------------------------------ */
/* Pipeline (ask) — provenance + verification end to end                 */
/* ------------------------------------------------------------------ */

describe('golden: pipeline integration', () => {
  const ownerCtx = { uid: 'u1', lang: 'en', role: 'owner' as Role };

  it('ask "What are our terms?" → sources attached + verification verified', async () => {
    const res = await ask('What are our terms?', ownerCtx);
    expect(res.text).toContain('৳777');
    expect(res.sources?.length).toBeGreaterThan(0);
    expect(res.verification?.status).toBe('verified');
    expect(res.verification?.figures).toBeGreaterThan(0);
  });

  it('ask "What if Rail-2 goes to 10%?" → strict verification passes end to end', async () => {
    const res = await ask('What if Rail-2 goes to 10%?', ownerCtx);
    expect(res.text).toContain('platform keeps ₹60 → ₹50');
    expect(res.verification?.status).toBe('verified');
  });

  it('ask "Review flagged posts" → template-rebuilt text still verifies', async () => {
    mockDocsByCol['sangamPosts'] = [
      { id: 'p1', data: { kind: 'post', text: 'spammy offer', authorName: 'A', reportCount: 6, reportReasons: ['spam'] } },
    ];
    const res = await ask('Review flagged posts', ownerCtx);
    expect(res.text).toContain('6 reports');
    expect(res.verification?.status).toBe('verified');
    expect(res.sources?.[0].label).toMatch(/sangamPosts/);
  });

  it('ask "Change Standard BDT monthly to 750" → proposal survives the pipeline', async () => {
    const res = await ask('Change Standard BDT monthly to 750', ownerCtx);
    const proposal = (res.data?.['proposal'] ?? null) as { newValue: number } | null;
    expect(proposal?.newValue).toBe(750);
  });

  it('ask as a devotee → NO sources, NO verification, NO figures (isolation unchanged)', async () => {
    const res = await ask('What are our terms?', { uid: 'u9', lang: 'en', role: 'devotee' as Role });
    expect(res.sources).toBeUndefined();
    expect(res.verification).toBeUndefined();
    expect(res.text).not.toContain('777');
    expect(res.text).not.toContain('17.5');
  });
});
