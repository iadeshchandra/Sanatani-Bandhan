/**
 * settingsHonesty.test.ts — QUEUED #51 (audit D9).
 * Pure tests: the plan Settings must name comes from the terms snapshot
 * (+ subscription lifecycle), limits pair real usage with terms caps,
 * the public slug is the org's own or empty, the name label can never
 * glue, and payment history always reaches a terminal state.
 */
import {
  canonicalSettingsPlanId,
  resolveSettingsPlan,
  planPriceLabel,
  buildSettingsUsageRows,
  resolvePublicSlugDefault,
  workspaceTypeNameLabel,
  paymentHistoryView,
} from '../settingsHonesty';
import { DEFAULT_TERMS } from '../termsConfig';

const DAY = 86400000;
const iso = (ms: number) => new Date(ms).toISOString();
const FUTURE = iso(Date.now() + 30 * DAY);
const LONG_PAST = iso(Date.now() - 90 * DAY); // beyond the 7-day grace window

describe('canonicalSettingsPlanId', () => {
  it('maps every stored spelling to a terms plan id', () => {
    expect(canonicalSettingsPlanId('SEVA')).toBe('seva');
    expect(canonicalSettingsPlanId('LITE')).toBe('seva');
    expect(canonicalSettingsPlanId('STANDARD')).toBe('standard');
    expect(canonicalSettingsPlanId('PREMIUM')).toBe('premium');
    expect(canonicalSettingsPlanId('ENTERPRISE')).toBe('premium');
    expect(canonicalSettingsPlanId('SMART_PRO')).toBe('premium');
    expect(canonicalSettingsPlanId('PUROHIT_PRO')).toBe('purohit_pro');
    expect(canonicalSettingsPlanId('DEMO')).toBe('seva');
    expect(canonicalSettingsPlanId(undefined)).toBe('seva');
    expect(canonicalSettingsPlanId('nonsense')).toBe('seva');
  });
});

describe('resolveSettingsPlan', () => {
  it('names the free Seva plan for a default org (D9a)', () => {
    const info = resolveSettingsPlan({ planId: 'SEVA' });
    expect(info.planId).toBe('seva');
    expect(info.name).toBe(DEFAULT_TERMS.plans.seva.name);
    expect(info.status).toBe('free');
    expect(info.periodLabel).toContain('Free forever');
    expect(info.nextPlanId).toBe('standard');
    expect(info.limits.maxDevotees).toBe(DEFAULT_TERMS.plans.seva.limits.maxDevotees);
  });

  it('names an active paid plan and its period end', () => {
    const info = resolveSettingsPlan({
      planId: 'STANDARD',
      subscription: { status: 'active', endDate: FUTURE },
    });
    expect(info.planId).toBe('standard');
    expect(info.name).toBe(DEFAULT_TERMS.plans.standard.name);
    expect(info.status).toBe('active');
    expect(info.periodLabel).toContain('Current period ends');
    expect(info.nextPlanId).toBe('premium');
  });

  it('honestly downgrades an expired paid plan to Seva (no fake Premium)', () => {
    const info = resolveSettingsPlan({
      planId: 'PREMIUM',
      subscription: { status: 'active', endDate: LONG_PAST },
    });
    expect(info.planId).toBe('seva');
    expect(info.downgraded).toBe(true);
    expect(info.status).toBe('expired');
    expect(info.name).toBe(DEFAULT_TERMS.plans.seva.name);
  });

  it('top tier offers no next plan', () => {
    const info = resolveSettingsPlan({
      planId: 'PREMIUM',
      subscription: { status: 'active', endDate: FUTURE },
    });
    expect(info.nextPlanId).toBeNull();
    expect(info.nextPlanName).toBeNull();
  });

  it('reads names/limits from a custom terms snapshot, not hard-coded copies', () => {
    const terms = structuredClone(DEFAULT_TERMS);
    terms.plans.seva.name = 'Seva (Custom)';
    terms.plans.seva.limits.maxDevotees = 42;
    const info = resolveSettingsPlan({ planId: 'SEVA', terms });
    expect(info.name).toBe('Seva (Custom)');
    expect(info.limits.maxDevotees).toBe(42);
  });

  it('demo orgs are labelled as a sandbox, not a billing plan', () => {
    const info = resolveSettingsPlan({ planId: 'DEMO', isDemo: true });
    expect(info.status).toBe('demo');
    expect(info.periodLabel).toContain('Demo sandbox');
  });
});

describe('planPriceLabel — pricing law values from the terms snapshot', () => {
  it('BDT org sees the BDT monthly price', () => {
    expect(planPriceLabel(DEFAULT_TERMS.plans.standard, 'BDT', 'monthly')).toBe('৳700/mo');
    expect(planPriceLabel(DEFAULT_TERMS.plans.premium, 'BDT', 'monthly')).toBe('৳2,800/mo');
  });

  it('INR org sees the INR monthly price; annual is 2 months free (×10)', () => {
    expect(planPriceLabel(DEFAULT_TERMS.plans.standard, 'INR', 'monthly')).toBe('₹499/mo');
    expect(planPriceLabel(DEFAULT_TERMS.plans.standard, 'INR', 'annual')).toBe('₹4,999/yr');
  });

  it('USD/international sees the USD price', () => {
    expect(planPriceLabel(DEFAULT_TERMS.plans.premium, 'USD', 'monthly')).toBe('$24/mo');
  });

  it('the free plan is labelled Free, never priced', () => {
    expect(planPriceLabel(DEFAULT_TERMS.plans.seva, 'BDT', 'monthly')).toBe('Free');
  });
});

describe('buildSettingsUsageRows', () => {
  it('pairs REAL usage with the terms limits (no sample constants)', () => {
    const rows = buildSettingsUsageRows(DEFAULT_TERMS.plans.seva.limits, {
      devotees: 6,
      transactions: 12,
      seats: 1,
      branches: 1,
    });
    const byMetric = Object.fromEntries(rows.map((r) => [r.metric, r]));
    expect(byMetric.devotees.used).toBe(6);
    expect(byMetric.devotees.limit).toBe(DEFAULT_TERMS.plans.seva.limits.maxDevotees);
    expect(byMetric.transactions.used).toBe(12);
    expect(byMetric.devotees.label).toBe('Registered Members');
  });

  it('renders unlimited (-1) without a percent or over-limit flag', () => {
    const rows = buildSettingsUsageRows(
      { maxDevotees: -1, maxTransactionsPerMonth: -1, maxSeats: -1, maxBranches: -1 },
      { devotees: 9999 }
    );
    expect(rows[0].limit).toBe(-1);
    expect(rows[0].percent).toBe(0);
    expect(rows[0].overLimit).toBe(false);
  });

  it('flags a metric at its cap and never exceeds 100%', () => {
    const rows = buildSettingsUsageRows(DEFAULT_TERMS.plans.seva.limits, { devotees: 500 });
    expect(rows[0].used).toBe(500);
    expect(rows[0].percent).toBe(100);
    expect(rows[0].overLimit).toBe(true);
  });

  it('missing usage counts as 0, never as an invented number', () => {
    const rows = buildSettingsUsageRows(DEFAULT_TERMS.plans.seva.limits, {});
    expect(rows.every((r) => r.used === 0)).toBe(true);
  });
});

describe('resolvePublicSlugDefault (D9c)', () => {
  it('is EMPTY until the org sets a slug — never a hard-coded temple', () => {
    const r = resolvePublicSlugDefault({ name: 'Sri Sri Gopinath Mandir', publicSlug: undefined });
    expect(r.value).toBe('');
  });

  it('suggests the slug of the org’s OWN name', () => {
    const r = resolvePublicSlugDefault({ name: 'Sri Sri Gopinath Mandir' });
    expect(r.suggested).toBe('sri-sri-gopinath-mandir');
  });

  it('keeps the org’s own saved slug (normalized), never another org’s', () => {
    const r = resolvePublicSlugDefault({ name: 'Other Name', publicSlug: 'My Org Page!' });
    expect(r.value).toBe('my-org-page');
    expect(r.value).not.toBe('dakshineswar-kali-mandir');
  });

  it('an unrelated famous temple slug never appears as a default', () => {
    const r = resolvePublicSlugDefault({ name: 'Dakshineswar Kali Mandir' });
    // Even here it is only a *suggestion derived from the org's own name*;
    // the field value stays empty until the org saves it.
    expect(r.value).toBe('');
    expect(r.suggested).toBe('dakshineswar-kali-mandir');
  });
});

describe('workspaceTypeNameLabel (D9d)', () => {
  it('always separates the type and Name with a space', () => {
    expect(workspaceTypeNameLabel('MANDIR')).toBe('MANDIR Name');
    expect(workspaceTypeNameLabel('Mandir')).toBe('Mandir Name');
    expect(workspaceTypeNameLabel('  GOSHALA  ')).toBe('GOSHALA Name');
  });

  it('falls back to plain Name for an unknown type', () => {
    expect(workspaceTypeNameLabel('')).toBe('Name');
    expect(workspaceTypeNameLabel(undefined)).toBe('Name');
  });
});

describe('paymentHistoryView (D9e)', () => {
  it('loading wins while the fetch is in flight', () => {
    expect(paymentHistoryView({ loading: true, count: 0 })).toBe('loading');
  });

  it('an error is a terminal state — never an endless spinner, never fake-empty', () => {
    expect(paymentHistoryView({ loading: false, error: 'offline', count: 0 })).toBe('error');
  });

  it('zero records with no error is the honest empty state', () => {
    expect(paymentHistoryView({ loading: false, error: null, count: 0 })).toBe('empty');
  });

  it('records render as a list', () => {
    expect(paymentHistoryView({ loading: false, count: 3 })).toBe('list');
  });
});
