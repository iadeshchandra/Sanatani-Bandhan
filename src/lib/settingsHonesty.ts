/**
 * settingsHonesty.ts — pure resolvers behind Workspace Settings (QUEUED #51).
 * ============================================================================
 * The audit (D9) found Settings → Billing presenting fiction: the current
 * plan was never named, "current limits" were hard-coded constants
 * (15 members / 2 PDFs) that contradicted the dashboard and the directory,
 * the public-profile slug arrived prefilled with an unrelated temple's
 * name, the org-name label glued itself together ("MANDIRNAME*"), and the
 * payment history could spin forever with no terminal state.
 *
 * Every resolver here is pure and unit-tested. The desk feeds them the ONE
 * source of truth the rest of the app already uses:
 *   - plan + limits + prices: the #31 terms snapshot (`lib/termsConfig`,
 *     Firestore `plans/{id}` sanitized over the locked planPricing defaults);
 *   - effective plan: `lib/subscriptionExpiry` (expired paid plans fall back
 *     to free-tier (Lite) caps — dignity, never a lockout);
 *   - usage: the same server counts `lib/planLimits.checkLimit` enforces.
 * Nothing in this module invents a number.
 */

import { PLAN_PRICING, type SubscriptionTier } from '../config/planPricing';
import {
  DEFAULT_TERMS,
  priceFor,
  type PlatformTerms,
  type TermsPlan,
  type TermsPlanId,
} from './termsConfig';
import { getSubscriptionStatus, type SubscriptionLike } from './subscriptionExpiry';
import { formatWorkspaceAmount, resolveWorkspaceCurrency } from './treasuryDisplay';

/* ------------------------------------------------------------------ */
/* Current plan                                                        */
/* ------------------------------------------------------------------ */

export type SettingsPlanStatus = 'free' | 'active' | 'grace' | 'expired' | 'demo';

export interface SettingsPlanInfo {
  /** Canonical terms plan id actually in force (after expiry fallback). */
  planId: TermsPlanId;
  /** Display name from the terms snapshot — never a hard-coded copy. */
  name: string;
  status: SettingsPlanStatus;
  /** One honest line: "Free forever · no renewal", "Current period ends …". */
  periodLabel: string;
  /** True when a paid plan expired and free-tier (Lite) caps now apply. */
  downgraded: boolean;
  limits: TermsPlan['limits'];
  /** The plan a "next" upsell may honestly offer (null on the top tier). */
  nextPlanId: TermsPlanId | null;
  nextPlanName: string | null;
}

/**
 * Normalize any stored workspace planId spelling to a terms plan id.
 * Mirrors the app-wide law (planLimits.normalizePlanId + workspaceRegistry):
 * legacy LITE → seva, ENTERPRISE / SMART_PRO / SAMPRADAYA → premium,
 * DEMO → seva terms (demo quotas bind separately), unknown → seva.
 */
export function canonicalSettingsPlanId(planId?: string | null): TermsPlanId {
  const p = (planId || '').trim().toLowerCase();
  if (p === 'standard') return 'standard';
  if (p === 'premium' || p === 'enterprise' || p === 'smart_pro' || p === 'sampradaya') return 'premium';
  if (p === 'purohit_pro' || p === 'purohit pro') return 'purohit_pro';
  return 'seva'; // seva, lite, demo, '', unknown → free tier
}

function formatPeriodDate(end: string | number | null | undefined): string | null {
  if (end == null || end === '') return null;
  const d = new Date(end);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Resolve the plan Settings must NAME for a workspace: the terms snapshot
 * entry for the workspace's planId, corrected by the subscription lifecycle
 * (an expired paid plan is honestly presented as the free Lite plan — named
 * from the snapshot, never a hard-coded copy — with a note).
 */
export function resolveSettingsPlan(input: {
  planId?: string | null;
  subscription?: SubscriptionLike | null;
  terms?: PlatformTerms;
  isDemo?: boolean;
}): SettingsPlanInfo {
  const terms = input.terms ?? DEFAULT_TERMS;
  const stored = canonicalSettingsPlanId(input.planId);
  const subStatus = getSubscriptionStatus(input.subscription ?? null);
  const downgraded = subStatus === 'expired' && stored !== 'seva';
  const effective: TermsPlanId = downgraded ? 'seva' : stored;
  const plan = terms.plans[effective];
  const endLabel = formatPeriodDate(input.subscription?.endDate);

  let status: SettingsPlanStatus;
  let periodLabel: string;
  if (input.isDemo) {
    status = 'demo';
    periodLabel = 'Demo sandbox — no billing period';
  } else if (downgraded) {
    status = 'expired';
    periodLabel = endLabel
      ? `Paid plan ended ${endLabel} — ${plan.name} limits now apply`
      : `Paid plan ended — ${plan.name} limits now apply`;
  } else if (effective === 'seva') {
    status = 'free';
    periodLabel = 'Free forever · no renewal';
  } else if (subStatus === 'grace') {
    status = 'grace';
    periodLabel = endLabel ? `Renewal grace period — access continues until ${endLabel}` : 'Renewal grace period';
  } else {
    status = 'active';
    periodLabel = endLabel ? `Current period ends ${endLabel}` : 'Active · no end date on record';
  }

  const nextPlanId: TermsPlanId | null =
    effective === 'seva' ? 'standard' : effective === 'standard' ? 'premium' : null;

  return {
    planId: effective,
    name: plan.name,
    status,
    periodLabel,
    downgraded,
    limits: { ...plan.limits },
    nextPlanId,
    nextPlanName: nextPlanId ? terms.plans[nextPlanId].name : null,
  };
}

/** Monthly/annual price of a terms plan in the workspace's currency region. */
export function planPriceLabel(
  plan: TermsPlan,
  currencyCode: string | undefined,
  period: 'monthly' | 'annual'
): string {
  const code = (currencyCode || 'INR').toUpperCase();
  // Terms prices exist for INR/BDT/USD; any other operating currency is
  // quoted in the international (USD) terms price — geo-payments law.
  const termsCurrency: 'INR' | 'BDT' | 'USD' =
    code === 'BDT' ? 'BDT' : code === 'INR' ? 'INR' : 'USD';
  const amount = priceFor(plan, termsCurrency, period);
  if (!amount) return 'Free';
  const cur = resolveWorkspaceCurrency({ currency: termsCurrency });
  return `${formatWorkspaceAmount(amount, cur)}${period === 'monthly' ? '/mo' : '/yr'}`;
}

/** Marketing perks for a tier (code copy in planPricing — not owner terms). */
export function planPerks(planId: TermsPlanId): string[] {
  const tier: SubscriptionTier =
    planId === 'standard'
      ? 'STANDARD'
      : planId === 'premium'
        ? 'PREMIUM'
        : planId === 'purohit_pro'
          ? 'PUROHIT_PRO'
          : 'SEVA';
  return [...PLAN_PRICING[tier].highlightedPerks];
}

/* ------------------------------------------------------------------ */
/* Usage rows (real counts vs terms limits — one source)               */
/* ------------------------------------------------------------------ */

export type SettingsUsageMetric = 'devotees' | 'transactions' | 'seats' | 'branches';

export interface SettingsUsageRow {
  metric: SettingsUsageMetric;
  label: string;
  used: number;
  /** -1 = unlimited. */
  limit: number;
  /** 0–100; 0 when unlimited (nothing to fill). */
  percent: number;
  overLimit: boolean;
}

/**
 * Build the Settings "Current Limits" rows from REAL usage counts and the
 * terms limits of the effective plan. Counts are injected (the desk passes
 * `planLimits.checkLimit` results / DataContext totals) so this stays pure —
 * and so a hard-coded sample count can never sneak back in.
 */
export function buildSettingsUsageRows(
  limits: TermsPlan['limits'],
  usage: Partial<Record<SettingsUsageMetric, number>>
): SettingsUsageRow[] {
  const row = (
    metric: SettingsUsageMetric,
    label: string,
    limit: number
  ): SettingsUsageRow => {
    const used = Math.max(0, Math.floor(Number(usage[metric]) || 0));
    return {
      metric,
      label,
      used,
      limit,
      percent: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
      overLimit: limit >= 0 && used >= limit,
    };
  };
  return [
    row('devotees', 'Registered Members', limits.maxDevotees),
    row('transactions', 'Transactions This Month', limits.maxTransactionsPerMonth),
    row('seats', 'Staff Seats', limits.maxSeats),
    row('branches', 'Branches', limits.maxBranches),
  ];
}

/* ------------------------------------------------------------------ */
/* Public-profile slug                                                 */
/* ------------------------------------------------------------------ */

/**
 * The slug a Settings form may show for an org (D9c) lives with the other
 * slug logic in `lib/orgPublic.ts` — re-exported here so Settings code
 * imports every #51 resolver from one module.
 */
export { resolvePublicSlugDefault } from './orgPublic';

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/**
 * The org-name field label (D9d). Composed as ONE string so JSX whitespace
 * collapsing can never glue the type and "Name" together ("MANDIRNAME*").
 * `nameWord` lets the caller pass the localized word for "Name".
 */
export function workspaceTypeNameLabel(type?: string | null, nameWord: string = 'Name'): string {
  const t = String(type || '').trim().replace(/\s+/g, ' ');
  const w = String(nameWord || 'Name').trim() || 'Name';
  return t ? `${t} ${w}` : w;
}

/* ------------------------------------------------------------------ */
/* Payment history terminal state (D9e)                                */
/* ------------------------------------------------------------------ */

export type PaymentHistoryView = 'loading' | 'error' | 'empty' | 'list';

/**
 * Payment & Request History must always reach a terminal state: a spinner
 * is a transition, never a destination. Error beats empty (a failed load
 * must not masquerade as "no records"), empty beats list only at zero.
 */
export function paymentHistoryView(input: {
  loading: boolean;
  error?: string | null;
  count: number;
}): PaymentHistoryView {
  if (input.loading) return 'loading';
  if (input.error) return 'error';
  return input.count > 0 ? 'list' : 'empty';
}
