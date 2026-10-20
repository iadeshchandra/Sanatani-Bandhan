/**
 * ai/godmode/__tests__/goldenGrowth.test.ts — QUEUED #37 golden bank.
 * =====================================================================
 * admin_growth pinned against fixture counts: the full funnel answer
 * (aggregate behaviour synthesis + three-lens plays), the abstention
 * cases (#36 laws: never counsel from guesses, never print a number
 * that wasn't read), the anti-pattern refusals, gate parity for every
 * non-owner role, and the pipeline end-to-end (provenance + verified).
 *
 * This suite has its OWN firestore mock: constraint keys normalize
 * Date values AND epoch-ms numbers (>1e12, referralClaims.createdAt)
 * into @Nd age buckets so seeds are deterministic.
 */
import { adminGrowthTask } from '../copilotTasks';
import { routeCopilotIntent } from '../copilot';
import { composeGrowthWithClaims, type GrowthSnapshot } from '../growthTools';
import { verifyFigures } from '../accuracy';
import { ask } from '../../assistant';
import type { Role, TaskCtx } from '../../types';

/* ------------------------------------------------------------------ */
/* Mock Firestore — counts keyed by collection|field@age / field=value */
/* ------------------------------------------------------------------ */

const mockCounts = new Map<string, number>();
const mockFailKeys = new Set<string>();

function mockConstraintKey(c: { field: string; value: unknown }): string {
  const v = c.value;
  if (v instanceof Date) {
    const ageDays = Math.round((Date.now() - v.getTime()) / 86400000);
    return `${c.field}@${ageDays}d`;
  }
  if (typeof v === 'number' && v > 1e12) {
    const ageDays = Math.round((Date.now() - v) / 86400000);
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
  getDocs: async () => ({ forEach: (_cb: unknown) => undefined }),
}));

jest.mock('../../../firebase', () => ({ db: {}, auth: { currentUser: null } }));

const mockPlanSave = jest.fn();
const mockSaveCommissionConfig = jest.fn();
jest.mock('../../../lib/firestoreAdmin', () => ({
  firestoreAdmin: {
    termsHistory: jest.fn(async () => ({ ok: true, data: { ok: true, entries: [] } })),
    planSave: (...args: unknown[]) => mockPlanSave(...args),
    saveCommissionConfig: (...args: unknown[]) => mockSaveCommissionConfig(...args),
  },
}));

/* ------------------------------------------------------------------ */
/* Fixtures — distinctive values on purpose                            */
/* ------------------------------------------------------------------ */

function ctx(input: string, role: Role = 'owner'): TaskCtx {
  return { uid: 'u1', lang: 'en', role, input, slots: {} };
}

function setCount(col: string, key: string, n: number) {
  mockCounts.set(key ? `${col}|${key}` : col, n);
}

function seedFull() {
  setCount('users', 'createdAt@7d', 12);
  setCount('users', 'createdAt@14d', 21); // prior week: 9
  setCount('users', 'lastActiveAt@7d', 30);
  setCount('users', '', 240);
  setCount('sevaProfessionals', '', 18);
  setCount('marketplaceOrders', 'createdAt@7d', 40);
  setCount('marketplaceOrders', 'createdAt@14d', 75); // prior week: 35
  setCount('marketplaceOrders', 'createdAt@30d', 96);
  setCount('marketplaceOrders', 'createdAt@30d|status=completed', 58);
  setCount('marketplaceOrders', 'createdAt@30d|status=pending_payment', 24);
  setCount('marketplaceOrders', 'createdAt@30d|status=cancelled', 9);
  setCount('marketplaceOrders', 'createdAt@30d|status=disputed', 2);
  setCount('workspaces', '', 8);
  setCount('workspaces', 'createdAt@30d', 3);
  setCount('campusMaps', '', 25);
  setCount('subscriptions', 'status=active', 15);
  setCount('subscriptions', 'status=active|planId=purohit_pro', 6);
  setCount('referralClaims', 'createdAt@7d', 5);
  setCount('referralClaims', 'createdAt@30d', 18);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCounts.clear();
  mockFailKeys.clear();
});

/* ------------------------------------------------------------------ */
/* The full counsel — aggregate-grounded, three lenses                 */
/* ------------------------------------------------------------------ */

describe('golden: growth — full data', () => {
  it('Q: "Give me a growth plan" — exact funnel facts, verified claims, sources', async () => {
    seedFull();
    const out = await adminGrowthTask(ctx('Give me a growth plan'));
    const text = String(out.params['text']);
    // Where we stand — exact fixture figures.
    expect(text).toContain('12 new signups this week (9 the week before)');
    expect(text).toContain('30 active seekers this week');
    expect(text).toContain('40 bookings this week (35 the week before)');
    expect(text).toContain('8 organisations on the platform — 3 joined in the last 30 days');
    expect(text).toContain('25 temples mapped');
    expect(text).toContain('15 active subscriptions — 6 of them Pro (the bypass-proof floor)');
    expect(text).toContain('18 bookings came through shared links in the last 30 days (5 this week)');
    // Behaviour synthesis — aggregate funnel shape + hypothesis labelled.
    expect(text).toContain('Funnel (last 30 days): 58 completed · 24 still wait at payment · 9 were cancelled');
    expect(text).toContain('out of 96 bookings');
    expect(text).toContain('Hypothesis: the drop sits between booking and payment');
    expect(text).toContain('Rhythm: 30 seekers were active this week against 12 new arrivals');
    expect(text).toContain('240 accounts · 8 organisations · 18 professionals');
    // Three lenses present, every play observation → play → measure.
    expect(text).toContain('[Product]');
    expect(text).toContain('Unblock the payment step');
    expect(text).toContain('[Profit]');
    expect(text).toContain('Deepen the Pro floor');
    expect(text).toContain('[Marketing]');
    expect(text).toContain('Observation:');
    expect(text).toContain('Measure:');
    expect(text).toContain('What NOT to do:');
    // Accuracy machinery.
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
    const labels = (out.sources ?? []).map((s) => s.label).join(' ');
    expect(labels).toMatch(/users/);
    expect(labels).toMatch(/marketplaceOrders/);
    expect(labels).toMatch(/referralClaims/);
    expect(out.sources?.every((s) => s.live)).toBe(true);
    // The Copilot NEVER writes.
    expect(mockPlanSave).not.toHaveBeenCalled();
    expect(mockSaveCommissionConfig).not.toHaveBeenCalled();
  });

  it('cold share loop — "Light the share loop", never the alive variant', async () => {
    seedFull();
    setCount('referralClaims', 'createdAt@30d', 0);
    setCount('referralClaims', 'createdAt@7d', 0);
    const out = await adminGrowthTask(ctx('Give me a growth plan'));
    const text = String(out.params['text']);
    expect(text).toContain('0 bookings came through shared links in the last 30 days');
    expect(text).toContain('Light the share loop');
    expect(text).not.toContain('Feed the Kritagyata loop');
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Abstention — the #36 laws                                           */
/* ------------------------------------------------------------------ */

describe('golden: growth — abstention', () => {
  it('whole funnel core dark — abstains, counsels nothing, claims nothing', async () => {
    seedFull();
    mockFailKeys.add('users|createdAt@7d');
    mockFailKeys.add('marketplaceOrders|createdAt@7d');
    mockFailKeys.add('workspaces');
    const out = await adminGrowthTask(ctx('Give me a growth plan'));
    expect(out.variant).toBe('unavailable');
    expect(String(out.params['text'])).toMatch(/won’t counsel from guesses/);
    expect(out.claims ?? []).toHaveLength(0);
  });

  it('behaviour aggregates dark — behaviour section abstains, counsel continues on what WAS read', async () => {
    seedFull();
    mockFailKeys.add('users|lastActiveAt@7d');
    mockFailKeys.add('users');
    mockFailKeys.add('sevaProfessionals');
    for (const st of ['', '|status=completed', '|status=pending_payment', '|status=cancelled', '|status=disputed']) {
      mockFailKeys.add(`marketplaceOrders|createdAt@30d${st}`);
    }
    const out = await adminGrowthTask(ctx('Give me a growth plan'));
    const text = String(out.params['text']);
    expect(text).toContain('could not read the behaviour aggregates');
    expect(text).not.toContain('Funnel (last 30 days)');
    expect((out.claims ?? []).some((c) => c.id === 'growth.orders30dTotal')).toBe(false);
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });

  it('referral corner dark — named as a gap, no share-loop figures anywhere', async () => {
    seedFull();
    mockFailKeys.add('referralClaims|createdAt@7d');
    mockFailKeys.add('referralClaims|createdAt@30d');
    const out = await adminGrowthTask(ctx('Give me a growth plan'));
    const text = String(out.params['text']);
    expect(text).toContain("couldn't read:");
    expect(text).toContain('referral claims');
    expect(text).not.toContain('came through shared links');
    expect((out.claims ?? []).some((c) => c.id.startsWith('growth.referral'))).toBe(false);
    expect(verifyFigures(text, out.claims ?? []).ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Refusals — anti-patterns, incl. the forcing/dark-pattern tactic     */
/* ------------------------------------------------------------------ */

describe('golden: growth — refusals', () => {
  it('"Should we buy fake reviews?" — refused, Kritagyata offered instead, no claims', async () => {
    const out = await adminGrowthTask(ctx('Should we buy fake reviews to look popular?'));
    expect(out.variant).toBe('refused');
    const text = String(out.params['text']);
    expect(text).toContain('fake reviews');
    expect(text).toContain('Kritagyata');
    expect(out.claims ?? []).toHaveLength(0);
    expect(out.sources).toBeUndefined();
  });

  it('"50% discount on pujas" — refused under never-discount-the-sacred', async () => {
    const out = await adminGrowthTask(ctx('Give 50% discount on pujas to boost bookings'));
    expect(out.variant).toBe('refused');
    expect(String(out.params['text'])).toMatch(/sacred/);
  });

  it('"fake urgency / dark patterns" — a forcing tactic, refused', async () => {
    const out = await adminGrowthTask(ctx('Use fake urgency and dark patterns to push bookings'));
    expect(out.variant).toBe('refused');
    expect(String(out.params['text'])).toContain('dark patterns');
  });
});

/* ------------------------------------------------------------------ */
/* Router + gate parity + pipeline                                     */
/* ------------------------------------------------------------------ */

describe('golden: growth — routing', () => {
  it('growth + market questions land on admin_growth', () => {
    expect(routeCopilotIntent('Give me a growth plan')).toBe('admin_growth');
    expect(routeCopilotIntent('What is our marketing plan for Diwali?')).toBe('admin_growth');
    expect(routeCopilotIntent('How do we beat WhatsApp groups?')).toBe('admin_growth');
    expect(routeCopilotIntent('Should we buy fake reviews?')).toBe('admin_growth');
  });

  it('bare revenue growth stays advise; terms stays terms (pinned behaviour preserved)', () => {
    expect(routeCopilotIntent('How do I grow revenue without hurting temples?')).toBe('admin_advise');
    expect(routeCopilotIntent('What are our terms?')).toBe('admin_terms');
  });
});

describe('golden: growth — gate parity', () => {
  it('every non-owner role is denied, with no figure leakage', async () => {
    seedFull();
    for (const role of ['devotee', 'sevadar', 'priest', 'accountant', 'trustee', 'purohit', 'jyotish'] as Role[]) {
      const out = await adminGrowthTask(ctx('Give me a growth plan', role));
      expect(out.variant).toBe('denied');
      expect(String(out.params['text'])).not.toContain('58 completed');
      expect(out.sources).toBeUndefined();
      expect(out.claims ?? []).toHaveLength(0);
    }
  });
});

describe('golden: growth — pipeline', () => {
  const ownerCtx = { uid: 'u1', lang: 'en', role: 'owner' as Role };

  it('ask "Give me a growth plan" → provenance attached + figures verified', async () => {
    seedFull();
    const res = await ask('Give me a growth plan', ownerCtx);
    expect(res.text).toContain('12 new signups this week');
    expect(res.sources?.length).toBeGreaterThan(0);
    expect(res.verification?.status).toBe('verified');
    expect(res.verification?.figures).toBeGreaterThan(0);
  });

  it('ask as a devotee → NO sources, NO verification, NO growth figures (isolation)', async () => {
    seedFull();
    const res = await ask('Give me a growth plan', { uid: 'u9', lang: 'en', role: 'devotee' as Role });
    expect(res.sources).toBeUndefined();
    expect(res.verification).toBeUndefined();
    expect(res.text).not.toContain('bookings came through shared links');
    expect(res.text).not.toContain('58 completed');
  });
});

/* ------------------------------------------------------------------ */
/* Pure composition — festival + market frame                          */
/* ------------------------------------------------------------------ */

describe('golden: growth — composition', () => {
  const base: GrowthSnapshot = {
    signups7d: 12, signupsPrior7d: 9, activeUsers7d: 30,
    usersTotal: 240, providersTotal: 18,
    bookings7d: 40, bookingsPrior7d: 35,
    orders30dTotal: 96, orders30dCompleted: 58, orders30dPendingPayment: 24,
    orders30dCancelled: 9, orders30dDisputed: 2,
    orgsTotal: 8, orgsNew30d: 3, templesMapped: 25,
    subsActive: 15, subsProActive: 6,
    referralClaims7d: 5, referralClaims30d: 18,
    nextFestival: null,
  };

  it('festival proximity — the panjika beat is claimed and rendered', () => {
    const { text, claims } = composeGrowthWithClaims(
      { ...base, nextFestival: { name: 'Fixture Utsav', daysUntil: 9 } },
      'en'
    );
    expect(text).toContain('Fixture Utsav is in 9 days');
    expect(text).toContain('Festival readiness — Fixture Utsav');
    expect(claims.some((c) => c.id === 'growth.nextFestival.daysUntil' && c.value === 9)).toBe(true);
    expect(verifyFigures(text, claims).ok).toBe(true);
  });

  it('market focus — "Where we win" against the real frame, labelled general knowledge', () => {
    const { text, claims } = composeGrowthWithClaims(base, 'en', { marketFocus: true });
    expect(text).toContain('Where we win');
    expect(text).toContain('general knowledge, not our data');
    expect(text).toContain('WhatsApp groups');
    expect(text).toContain('Bahi-Khata');
    expect(text).toContain('switching cost');
    expect(verifyFigures(text, claims).ok).toBe(true);
  });

  it('without market focus the market section absents itself', () => {
    const { text } = composeGrowthWithClaims(base, 'en');
    expect(text).not.toContain('Where we win');
  });
});
