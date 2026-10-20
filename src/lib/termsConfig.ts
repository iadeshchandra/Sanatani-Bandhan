/**
 * termsConfig.ts — the ONE canonical reader for subscription & commission terms.
 * ============================================================================
 * QUEUED #31 (2026-10-20). Owner requirement: "any time I can update all
 * subscription and commission terms always when I want with proper management
 * from GodMode admin dashboard."
 *
 * THE STORE (no new collections, no rules changes):
 * - Plan prices + enforced limits live in Firestore `plans/{canonicalId}`
 *   (canonical ids ONLY: seva | standard | premium | purohit_pro) — public
 *   read, owner write. This is the same collection limit enforcement has
 *   always read; it is now also what checkout, the landing page and every
 *   upsell read.
 * - Commission tier rates live in `platformConfig/commission`
 *   ({ freeRate, proRail1Rate, proRail2Rate, freeGigLimit }) — the doc the
 *   money path has always resolved from.
 *
 * THE PATTERN (same as planLimits / ranking / geo-config before it):
 *   Firestore doc → field-by-field sanitize-merge over code defaults →
 *   5-minute in-memory cache → NEVER throws.
 * Code defaults are generated from `src/config/planPricing.ts` (PLAN_PRICING,
 * locked 2026-10-14) — there is exactly ONE defaults source, so the old
 * planPricing / PLAN_DEFAULTS / PLAN_SEED triple-copy drift is gone.
 *
 * FAIL-OPEN LAW: checkout can never break on config. A missing, corrupt or
 * unreachable doc degrades field-by-field to today's locked prices. A doc
 * can only change a value by containing a valid number for it.
 *
 * SNAPSHOT LAW: term edits apply to NEW checkouts/orders only. Existing
 * subscriptions and past orders keep the terms they were created under —
 * order commission snapshots are never rewritten.
 */

/**
 * NOTE on imports: this module is loaded by PURE consumers (billing
 * planUpgrade price math, unit tests) that must never drag Firebase in at
 * module-eval time. The Firestore read inside getTerms() therefore uses a
 * lazy dynamic import — executed only when terms are actually fetched.
 */
import { PLAN_PRICING, type SubscriptionTier } from '../config/planPricing';

/* ------------------------------- Types ---------------------------------- */

export type TermsPlanId = 'seva' | 'standard' | 'premium' | 'purohit_pro';

export const TERMS_PLAN_IDS: readonly TermsPlanId[] = ['seva', 'standard', 'premium', 'purohit_pro'];

export interface TermsLimits {
  maxDevotees: number; // -1 = unlimited
  maxTransactionsPerMonth: number; // -1 = unlimited
  maxSeats: number; // -1 = unlimited
  maxBranches: number; // -1 = unlimited
}

/** Canonical plan doc shape — exactly what `plans/{id}` stores and readers use. */
export interface TermsPlan {
  id: TermsPlanId;
  name: string;
  priceMonthlyINR: number;
  priceYearlyINR: number;
  priceMonthlyBDT: number;
  priceYearlyBDT: number;
  priceMonthlyUSD: number;
  priceYearlyUSD: number;
  limits: TermsLimits;
  /** purohit_pro only: marketplace commission % advertised for the Pro plan. */
  commissionPercent?: number;
  active: boolean;
  /** Stamps from the stored doc (ISO strings when present). */
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface CommissionTerms {
  /** Community (free) tier rate %. Law default 15. */
  freeRate: number;
  /** Pro, Rail-1 (platform-processed) rate %. Law default 8. */
  proRail1Rate: number;
  /** Pro, Rail-2 (direct / pay-after-task) rate %. Law default 12. */
  proRail2Rate: number;
  /** Max ACTIVE gigs a community-tier provider may list. Law default 3. */
  freeGigLimit: number;
}

export interface PlatformTerms {
  plans: Record<TermsPlanId, TermsPlan>;
  commission: CommissionTerms;
  /** Epoch ms when this snapshot was loaded from Firestore; null = defaults-only. */
  loadedAt: number | null;
}

/* --------------------------- Code defaults ------------------------------ */
/* Generated from PLAN_PRICING — the single defaults source. These are the
 * FINAL law values (2026-10-14) and double as the seed + fail-open fallback:
 *   Seva free · Standard ₹499·৳700·$6 · Premium ₹1,999·৳2,800·$24 ·
 *   Pro ₹199·৳280·$2.50 · annual = 2 months free · commission 15/8/12. */

export const PRO_COMMISSION_PERCENT = 12;

export const DEFAULT_COMMISSION: CommissionTerms = {
  freeRate: 15,
  proRail1Rate: 8,
  proRail2Rate: 12,
  freeGigLimit: 3,
};

const TIER_FOR_PLAN: Record<TermsPlanId, SubscriptionTier> = {
  seva: 'SEVA',
  standard: 'STANDARD',
  premium: 'PREMIUM',
  purohit_pro: 'PUROHIT_PRO',
};

const PLAN_FOR_TIER: Record<SubscriptionTier, TermsPlanId> = {
  SEVA: 'seva',
  STANDARD: 'standard',
  PREMIUM: 'premium',
  PUROHIT_PRO: 'purohit_pro',
};

export function planIdForTier(tier: SubscriptionTier): TermsPlanId {
  return PLAN_FOR_TIER[tier];
}

export function tierForPlan(id: TermsPlanId): SubscriptionTier {
  return TIER_FOR_PLAN[id];
}

function defaultPlan(id: TermsPlanId): TermsPlan {
  const cfg = PLAN_PRICING[TIER_FOR_PLAN[id]];
  const rp = cfg.regionalPrices;
  return {
    id,
    name: cfg.name,
    priceMonthlyINR: rp.inr.monthly,
    priceYearlyINR: rp.inr.annual,
    priceMonthlyBDT: rp.bdt.monthly,
    priceYearlyBDT: rp.bdt.annual,
    priceMonthlyUSD: rp.usd.monthly,
    priceYearlyUSD: rp.usd.annual,
    limits: {
      maxDevotees: cfg.limits.devotees,
      maxTransactionsPerMonth: cfg.limits.transactions,
      maxSeats: cfg.limits.adminSeats,
      maxBranches: cfg.limits.branches,
    },
    ...(id === 'purohit_pro' ? { commissionPercent: PRO_COMMISSION_PERCENT } : {}),
    active: true,
  };
}

/** The full default plan set, generated from PLAN_PRICING. Also the seed. */
export function defaultTermsPlans(): Record<TermsPlanId, TermsPlan> {
  return {
    seva: defaultPlan('seva'),
    standard: defaultPlan('standard'),
    premium: defaultPlan('premium'),
    purohit_pro: defaultPlan('purohit_pro'),
  };
}

export const DEFAULT_TERMS: PlatformTerms = {
  plans: defaultTermsPlans(),
  commission: { ...DEFAULT_COMMISSION },
  loadedAt: null,
};

/* ----------------------------- Sanitizers ------------------------------- */
/* Pure. A stored value wins ONLY when it is a valid number/string of the
 * right shape; anything else degrades to the code default for that field. */

function priceField(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
}

function limitField(v: unknown, fallback: number): number {
  // -1 is the unlimited sentinel and must survive; anything below -1 is junk.
  return typeof v === 'number' && Number.isFinite(v) && v >= -1 ? Math.round(v) : fallback;
}

function rateField(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : fallback;
}

function stampIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === 'function') {
    try { return t.toDate().toISOString(); } catch { return null; }
  }
  return null;
}

/** Merge a raw `plans/{id}` doc over the code default for that plan. */
export function sanitizePlanDoc(id: TermsPlanId, raw: unknown): TermsPlan {
  const d = defaultPlan(id);
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const lim = (r.limits && typeof r.limits === 'object' ? r.limits : {}) as Record<string, unknown>;
  const out: TermsPlan = {
    id,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.slice(0, 80) : d.name,
    priceMonthlyINR: priceField(r.priceMonthlyINR, d.priceMonthlyINR),
    priceYearlyINR: priceField(r.priceYearlyINR, d.priceYearlyINR),
    priceMonthlyBDT: priceField(r.priceMonthlyBDT, d.priceMonthlyBDT),
    priceYearlyBDT: priceField(r.priceYearlyBDT, d.priceYearlyBDT),
    priceMonthlyUSD: priceField(r.priceMonthlyUSD, d.priceMonthlyUSD),
    priceYearlyUSD: priceField(r.priceYearlyUSD, d.priceYearlyUSD),
    limits: {
      maxDevotees: limitField(lim.maxDevotees, d.limits.maxDevotees),
      maxTransactionsPerMonth: limitField(lim.maxTransactionsPerMonth, d.limits.maxTransactionsPerMonth),
      maxSeats: limitField(lim.maxSeats, d.limits.maxSeats),
      maxBranches: limitField(lim.maxBranches, d.limits.maxBranches),
    },
    active: r.active !== false,
    updatedAt: stampIso(r.updatedAt),
    updatedBy: typeof r.updatedBy === 'string' ? r.updatedBy : null,
  };
  if (id === 'purohit_pro') {
    out.commissionPercent = rateField(r.commissionPercent, PRO_COMMISSION_PERCENT);
  }
  return out;
}

/** Merge a raw `platformConfig/commission` doc over the law defaults. */
export function sanitizeCommissionConfig(raw: unknown): CommissionTerms {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_COMMISSION };
  const r = raw as Record<string, unknown>;
  const gig = r.freeGigLimit;
  return {
    freeRate: rateField(r.freeRate, DEFAULT_COMMISSION.freeRate),
    proRail1Rate: rateField(r.proRail1Rate, DEFAULT_COMMISSION.proRail1Rate),
    proRail2Rate: rateField(r.proRail2Rate, DEFAULT_COMMISSION.proRail2Rate),
    freeGigLimit:
      typeof gig === 'number' && Number.isFinite(gig) && gig >= 0
        ? Math.round(gig)
        : DEFAULT_COMMISSION.freeGigLimit,
  };
}

/* ----------------------------- Validation ------------------------------- */
/* Used by the GodMode editor BEFORE save. Errors block; warnings need an
 * explicit owner confirm (they are legal but usually unintended). */

export interface TermsValidation {
  errors: string[];
  warnings: string[];
}

const CURRENCIES = ['INR', 'BDT', 'USD'] as const;

export function validatePlanTerms(plan: TermsPlan): TermsValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const c of CURRENCIES) {
    const m = plan[`priceMonthly${c}`];
    const y = plan[`priceYearly${c}`];
    if (!Number.isFinite(m) || m < 0) errors.push(`${plan.id}: monthly ${c} price must be a number ≥ 0.`);
    if (!Number.isFinite(y) || y < 0) errors.push(`${plan.id}: yearly ${c} price must be a number ≥ 0.`);
    if (Number.isFinite(m) && Number.isFinite(y) && m > 0 && y < m) {
      warnings.push(`${plan.name}: annual ${c} price (${y}) is less than one month (${m}) — the "2 months free" annual should be about ${10 * m}.`);
    }
    if (Number.isFinite(m) && Number.isFinite(y) && m > 0 && y > 12 * m) {
      warnings.push(`${plan.name}: annual ${c} price (${y}) is more than 12 × monthly (${m}) — annual should never cost more than paying monthly.`);
    }
  }
  const lim = plan.limits;
  for (const k of Object.keys(lim) as (keyof TermsLimits)[]) {
    if (!Number.isFinite(lim[k]) || lim[k] < -1) errors.push(`${plan.id}: limit ${k} must be -1 (unlimited) or ≥ 0.`);
  }
  if (plan.id !== 'seva') {
    if (plan.priceMonthlyINR === 0 && plan.priceMonthlyBDT === 0 && plan.priceMonthlyUSD === 0) {
      warnings.push(`${plan.name} is a PAID plan but its monthly price is 0 in every currency — it would be free.`);
    }
  }
  if (plan.id === 'purohit_pro' && plan.commissionPercent !== undefined) {
    if (!Number.isFinite(plan.commissionPercent) || plan.commissionPercent < 0 || plan.commissionPercent > 100) {
      errors.push('purohit_pro: commission % must be between 0 and 100.');
    }
  }
  return { errors, warnings };
}

/** Cross-plan sanity: tier ordering should not silently invert. */
export function validateTermsSet(plans: Record<TermsPlanId, TermsPlan>): TermsValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const id of TERMS_PLAN_IDS) {
    const v = validatePlanTerms(plans[id]);
    errors.push(...v.errors);
    warnings.push(...v.warnings);
  }
  if (plans.premium.priceMonthlyINR < plans.standard.priceMonthlyINR) {
    warnings.push(`Premium monthly INR (₹${plans.premium.priceMonthlyINR}) is cheaper than Standard (₹${plans.standard.priceMonthlyINR}) — tier order looks inverted.`);
  }
  if (plans.standard.priceMonthlyINR < plans.purohit_pro.priceMonthlyINR) {
    warnings.push(`Standard monthly INR (₹${plans.standard.priceMonthlyINR}) is cheaper than Pro (₹${plans.purohit_pro.priceMonthlyINR}) — check this is intended.`);
  }
  return { errors, warnings };
}

export function validateCommissionTerms(c: CommissionTerms): TermsValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const k of ['freeRate', 'proRail1Rate', 'proRail2Rate'] as const) {
    if (!Number.isFinite(c[k]) || c[k] < 0 || c[k] > 100) errors.push(`Commission ${k} must be between 0 and 100.`);
  }
  if (!Number.isFinite(c.freeGigLimit) || c.freeGigLimit < 0) errors.push('Free gig limit must be ≥ 0.');
  if (c.proRail1Rate > c.freeRate) warnings.push('Pro Rail-1 rate is higher than the community rate — Pro would pay MORE than free tier on Rail-1.');
  if (c.proRail2Rate > c.freeRate) warnings.push('Pro Rail-2 rate is higher than the community rate — Pro would pay MORE than free tier on Rail-2.');
  return { errors, warnings };
}

/* ------------------------- Commission precedence ------------------------ */
/* The resolution order for a NEW order (firestoreAdmin.resolveCommissionRate):
 *   provider override → category override → global rule → tier default.
 * A "global rule" (commissionRules) therefore SHADOWS the tier rates for
 * every order whose providerType matches — the #31 trap. These pure helpers
 * let the GodMode UI say so out loud instead of letting the owner wonder why
 * the tier-rate editor "does nothing". */

export interface CommissionRuleLike {
  serviceType?: string;
  active?: boolean;
  ratePercent?: number;
}

/** True when at least one ACTIVE global rule exists (any active rule shadows
 *  tier rates: the resolver falls back to the first active rule). */
export function activeRuleShadowsTierRates(rules: CommissionRuleLike[]): boolean {
  return (rules || []).some((r) => r && r.active !== false);
}

/** Which provider types an active-rule set shadows ('both' covers all). */
export function shadowedServiceTypes(rules: CommissionRuleLike[]): string[] {
  const types = new Set<string>();
  for (const r of rules || []) {
    if (!r || r.active === false) continue;
    const t = String(r.serviceType || 'both');
    if (t === 'both') { types.add('purohit'); types.add('jyotishi'); }
    else types.add(t);
  }
  return [...types];
}

export const COMMISSION_PRECEDENCE_EXPLAINER =
  'How a new order\'s commission is decided: 1) a provider override wins, then 2) a category override, then 3) an active global rule, and only then 4) the tier rates below (community / Pro Rail-1 / Pro Rail-2). Min/max on the winning override or rule clamp the fee. Changes apply to NEW orders only — past orders keep their snapshot.';

/* ------------------------------ Price reads ----------------------------- */

export type TermsCurrency = 'INR' | 'BDT' | 'USD';
export type TermsPeriod = 'monthly' | 'annual';

export function priceFor(plan: TermsPlan, currency: TermsCurrency, period: TermsPeriod): number {
  const key = (period === 'monthly' ? 'priceMonthly' : 'priceYearly') + currency as
    'priceMonthlyINR' | 'priceYearlyINR' | 'priceMonthlyBDT' | 'priceYearlyBDT' | 'priceMonthlyUSD' | 'priceYearlyUSD';
  return plan[key];
}

/* --------------------------- Cached I/O reader -------------------------- */

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { terms: PlatformTerms; at: number } | null = null;
let inflight: Promise<PlatformTerms> | null = null;

/**
 * Load the effective terms: the 4 `plans/` docs + `platformConfig/commission`,
 * each sanitized over code defaults. 5-min cache. NEVER throws — any failure
 * degrades to defaults (checkout must never break on config).
 */
export async function getTerms(): Promise<PlatformTerms> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.terms;
  if (inflight) return inflight;
  inflight = (async () => {
    const plans = defaultTermsPlans();
    let commission: CommissionTerms = { ...DEFAULT_COMMISSION };
    try {
      const [{ doc, getDoc }, { db }] = await Promise.all([
        import('firebase/firestore'),
        import('../firebase'),
      ]);
      const snaps = await Promise.all([
        ...TERMS_PLAN_IDS.map((id) => getDoc(doc(db, 'plans', id))),
        getDoc(doc(db, 'platformConfig', 'commission')),
      ]);
      TERMS_PLAN_IDS.forEach((id, i) => {
        const snap = snaps[i];
        if (snap.exists()) plans[id] = sanitizePlanDoc(id, snap.data());
      });
      const commSnap = snaps[snaps.length - 1];
      if (commSnap.exists()) commission = sanitizeCommissionConfig(commSnap.data());
      const terms: PlatformTerms = { plans, commission, loadedAt: Date.now() };
      cache = { terms, at: Date.now() };
      return terms;
    } catch (e) {
      console.warn('[termsConfig] terms load failed, using code defaults:', e instanceof Error ? e.message : e);
      const terms: PlatformTerms = { plans, commission, loadedAt: null };
      // Cache defaults briefly too — don't hammer Firestore while it's down,
      // but recover fast (30s) once it returns.
      cache = { terms, at: Date.now() - (CACHE_TTL_MS - 30_000) };
      return terms;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Synchronous read for sync consumers (checkout math): cache or defaults.
 *  Callers that render UI should warm the cache first (useTerms hook) — the
 *  first paint with defaults shows exactly today's locked prices. */
export function getTermsSync(): PlatformTerms {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.terms;
  return DEFAULT_TERMS;
}

/** Fire-and-forget cache warm (mount-time). Safe to call repeatedly. */
export function warmTermsCache(): void {
  void getTerms().catch(() => { /* getTerms never throws; belt & braces */ });
}

export function clearTermsCache(): void {
  cache = null;
}

/** Test seam: replace the cache with a fixed snapshot. */
export function __setTermsCacheForTest(terms: PlatformTerms | null): void {
  cache = terms ? { terms, at: Date.now() } : null;
}
