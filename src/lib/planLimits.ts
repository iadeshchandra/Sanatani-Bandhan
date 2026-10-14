/**
 * planLimits.ts — Freemium usage-limit enforcement.
 *
 * WHAT THIS IS:
 * Client-side usage-limit checks for the freemium model: every workspace gets
 * ALL features; paid plans raise the usage caps (devotees, monthly
 * transactions, staff seats, branches). When a workspace hits a cap, the UI
 * shows a celebratory upgrade prompt (LimitReachedModal), never a dead-end
 * error.
 *
 * PLAN SOURCE:
 * 1. Firestore `plans/{canonicalId}` (owner-editable via GodMode → Settings
 *    → Plan Editor). Lets the owner change prices AND limits without a deploy.
 * 2. Hardcoded PLAN_DEFAULTS below (failover when Firestore is unreachable).
 *
 * SECURITY HONESTY (read before relying on this):
 * - This is CLIENT-SIDE ONLY. A technically savvy user can bypass these
 *   checks in their own browser. That is acceptable for the Spark/free tier.
 * - On the Blaze migration, add SERVER-SIDE enforcement (Cloud Functions
 *   pre-write checks or Firestore rules with aggregate guards) for
 *   tamper-proofing. The `plans` collection + this module's canonical plan
 *   IDs are designed to be reused by that server code unchanged.
 * - Firestore security rules remain the hard trust boundary for data access;
 *   these limits are a monetization nudge, not an access control.
 *
 * FAIL-OPEN:
 * If plan lookup or usage counting fails for ANY reason, the action is
 * ALLOWED and a warning is logged. We never block a legitimate user because
 * our own metering broke.
 *
 * DEMO workspaces skip limits entirely — the binding constraint for demos is
 * the separate 5-creates-per-module demo quota (DataContext), which fires
 * long before any plan limit could.
 */

import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getCountFromServer,
  query,
  where,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export type LimitMetric = 'devotees' | 'transactions' | 'seats' | 'branches';
export type CanonicalPlan = 'seva' | 'standard' | 'premium' | 'demo';

export interface PlanLimits {
  maxDevotees: number; // -1 = unlimited
  maxTransactionsPerMonth: number; // -1 = unlimited
  maxSeats: number; // -1 = unlimited
  maxBranches: number; // -1 = unlimited
}

export interface PlanDoc {
  id: string;
  name: string;
  priceMonthlyINR: number;
  priceYearlyINR: number;
  priceMonthlyBDT: number;
  priceYearlyBDT: number;
  limits: PlanLimits;
  active: boolean;
}

/** Hardcoded failover — matches the approved freemium structure. */
const PLAN_DEFAULTS: Record<Exclude<CanonicalPlan, 'demo'>, PlanDoc> = {
  seva: {
    id: 'seva',
    name: 'Seva Free',
    priceMonthlyINR: 0,
    priceYearlyINR: 0,
    priceMonthlyBDT: 0,
    priceYearlyBDT: 0,
    limits: { maxDevotees: 100, maxTransactionsPerMonth: 500, maxSeats: 2, maxBranches: 1 },
    active: true,
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    priceMonthlyINR: 499,
    priceYearlyINR: 4999,
    priceMonthlyBDT: 700,
    priceYearlyBDT: 7000,
    limits: { maxDevotees: 1000, maxTransactionsPerMonth: -1, maxSeats: 10, maxBranches: 3 },
    active: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceMonthlyINR: 1999,
    priceYearlyINR: 19999,
    priceMonthlyBDT: 2800,
    priceYearlyBDT: 28000,
    limits: { maxDevotees: -1, maxTransactionsPerMonth: -1, maxSeats: -1, maxBranches: -1 },
    active: true,
  },
};

/** Next paid tier for upgrade prompts. */
export const NEXT_PLAN: Record<Exclude<CanonicalPlan, 'demo'>, Exclude<CanonicalPlan, 'demo'> | null> = {
  seva: 'standard',
  standard: 'premium',
  premium: null,
};

export const METRIC_LABEL: Record<LimitMetric, string> = {
  devotees: 'devotees',
  transactions: 'transactions this month',
  seats: 'staff seats',
  branches: 'branches',
};

/**
 * Normalize any plan id spelling to the canonical tier.
 * Legacy ids: LITE → seva, STANDARD → standard, ENTERPRISE → premium.
 * Unknown/missing → seva (free). DEMO handled separately (quota system).
 */
export function normalizePlanId(planId?: string | null): CanonicalPlan {
  const p = (planId || '').trim().toLowerCase();
  if (p === 'demo') return 'demo';
  if (p === 'standard') return 'standard';
  if (p === 'premium' || p === 'enterprise') return 'premium';
  return 'seva'; // seva, lite, '', unknown → free tier
}

// ---- Plan fetching with 5-minute cache ----

interface CacheEntry {
  plan: PlanDoc;
  at: number;
}
const planCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function mergeWithDefaults(canonical: Exclude<CanonicalPlan, 'demo'>, data: Record<string, unknown>): PlanDoc {
  const d = PLAN_DEFAULTS[canonical];
  const lim = (data.limits || {}) as Partial<PlanLimits>;
  return {
    id: canonical,
    name: typeof data.name === 'string' ? data.name : d.name,
    priceMonthlyINR: typeof data.priceMonthlyINR === 'number' ? data.priceMonthlyINR : d.priceMonthlyINR,
    priceYearlyINR: typeof data.priceYearlyINR === 'number' ? data.priceYearlyINR : d.priceYearlyINR,
    priceMonthlyBDT: typeof data.priceMonthlyBDT === 'number' ? data.priceMonthlyBDT : d.priceMonthlyBDT,
    priceYearlyBDT: typeof data.priceYearlyBDT === 'number' ? data.priceYearlyBDT : d.priceYearlyBDT,
    limits: {
      maxDevotees: typeof lim.maxDevotees === 'number' ? lim.maxDevotees : d.limits.maxDevotees,
      maxTransactionsPerMonth:
        typeof lim.maxTransactionsPerMonth === 'number' ? lim.maxTransactionsPerMonth : d.limits.maxTransactionsPerMonth,
      maxSeats: typeof lim.maxSeats === 'number' ? lim.maxSeats : d.limits.maxSeats,
      maxBranches: typeof lim.maxBranches === 'number' ? lim.maxBranches : d.limits.maxBranches,
    },
    active: data.active !== false,
  };
}

/** Fetch the effective plan (Firestore `plans/{id}` → hardcoded fallback). Never throws. */
export async function getPlan(rawPlanId?: string | null): Promise<{ plan: PlanDoc; canonical: CanonicalPlan; fromCache: boolean }> {
  const canonical = normalizePlanId(rawPlanId);
  if (canonical === 'demo') {
    // Demo: treat as unlimited here; demo quota is enforced separately.
    return {
      plan: { ...PLAN_DEFAULTS.premium, id: 'demo', name: 'Demo' },
      canonical,
      fromCache: false,
    };
  }
  const cached = planCache.get(canonical);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { plan: cached.plan, canonical, fromCache: true };
  }
  try {
    const snap = await getDoc(doc(db, 'plans', canonical));
    if (snap.exists()) {
      const plan = mergeWithDefaults(canonical, snap.data() as Record<string, unknown>);
      planCache.set(canonical, { plan, at: Date.now() });
      return { plan, canonical, fromCache: false };
    }
  } catch (e) {
    console.warn('[planLimits] plan fetch failed, using defaults:', e);
  }
  const plan = PLAN_DEFAULTS[canonical];
  planCache.set(canonical, { plan, at: Date.now() });
  return { plan, canonical, fromCache: false };
}

/** Clear the plan cache (used after the owner edits plans in GodMode). */
export function clearPlanCache(): void {
  planCache.clear();
}

// ---- Usage counting (index-safe: single-field where clauses only) ----

async function countDevotees(workspaceId: string): Promise<number> {
  const s = await getCountFromServer(query(collection(db, 'devotees'), where('workspaceId', '==', workspaceId)));
  return s.data().count;
}

async function countSeats(workspaceId: string): Promise<number> {
  const s = await getCountFromServer(
    query(collection(db, 'workspaceMembers'), where('workspaceId', '==', workspaceId))
  );
  return s.data().count;
}

async function countTransactionsThisMonth(workspaceId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  try {
    // NOTE: workspaceId == X AND createdAt >= Y needs a composite Firestore
    // index. If it is missing, Firestore throws failed-precondition — we
    // fail OPEN (allow the action) and log so the owner can create the index
    // from the console link in the error.
    const s = await getCountFromServer(
      query(
        collection(db, 'treasury'),
        where('workspaceId', '==', workspaceId),
        where('createdAt', '>=', Timestamp.fromDate(start))
      )
    );
    return s.data().count;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('failed-precondition') || msg.includes('index')) {
      console.warn(
        '[planLimits] monthly transaction count needs a composite index ' +
          '(treasury: workspaceId ASC, createdAt ASC). Failing open. Create it in the Firebase console.'
      );
    } else {
      console.warn('[planLimits] transaction count failed, failing open:', msg);
    }
    return 0; // fail open → treated as under limit
  }
}

export async function countUsage(workspaceId: string, metric: LimitMetric, branchCount?: number): Promise<number> {
  switch (metric) {
    case 'devotees':
      return countDevotees(workspaceId);
    case 'seats':
      return countSeats(workspaceId);
    case 'transactions':
      return countTransactionsThisMonth(workspaceId);
    case 'branches':
      return branchCount ?? 0;
  }
}

// ---- The check ----

export interface WorkspaceLike {
  id: string;
  planId?: string | null;
  limitsBypassed?: boolean;
  /** Current branch count (branches live on the workspace doc). */
  branchCount?: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  used: number;
  limit: number; // -1 = unlimited
  percentUsed: number; // 0-100 (100 when unlimited → 0)
  bypassed: boolean;
  metric: LimitMetric;
  planName: string;
  canonical: CanonicalPlan;
  nextPlan: PlanDoc | null;
}

function limitFor(plan: PlanDoc, metric: LimitMetric): number {
  switch (metric) {
    case 'devotees':
      return plan.limits.maxDevotees;
    case 'transactions':
      return plan.limits.maxTransactionsPerMonth;
    case 'seats':
      return plan.limits.maxSeats;
    case 'branches':
      return plan.limits.maxBranches;
  }
}

/**
 * Check whether `workspace` may perform one more `metric` action.
 * NEVER throws and NEVER blocks on internal error (fail-open).
 */
export async function checkLimit(ws: WorkspaceLike, metric: LimitMetric): Promise<LimitCheckResult> {
  const failOpen = (reason: string): LimitCheckResult => {
    if (reason) console.warn('[planLimits] fail-open:', reason);
    return {
      allowed: true,
      used: 0,
      limit: -1,
      percentUsed: 0,
      bypassed: true,
      metric,
      planName: 'Unknown',
      canonical: 'seva',
      nextPlan: null,
    };
  };

  try {
    if (!ws.id || ws.id.startsWith('DEMO_')) {
      return { ...failOpen(''), bypassed: true, metric, planName: 'Demo', canonical: 'demo' };
    }
    if (ws.limitsBypassed) {
      return { ...failOpen(''), bypassed: true, metric, planName: 'Bypassed', canonical: normalizePlanId(ws.planId) };
    }
    const { plan, canonical } = await getPlan(ws.planId);
    const limit = limitFor(plan, metric);
    if (limit === -1) {
      return { allowed: true, used: 0, limit: -1, percentUsed: 0, bypassed: false, metric, planName: plan.name, canonical, nextPlan: null };
    }
    const used = await countUsage(ws.id, metric, ws.branchCount);
    const allowed = used < limit;
    const nextKey = NEXT_PLAN[canonical as Exclude<CanonicalPlan, 'demo'>];
    const nextPlan = nextKey ? (await getPlan(nextKey)).plan : null;
    return {
      allowed,
      used,
      limit,
      percentUsed: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
      bypassed: false,
      metric,
      planName: plan.name,
      canonical,
      nextPlan,
    };
  } catch (e) {
    return failOpen(e instanceof Error ? e.message : String(e));
  }
}

// ---- Audit: every blocked action is recorded (upgrade-demand signal) ----

/**
 * Best-effort audit entry for a blocked limit action. Never throws.
 * Uses `actorId` so the tenant-member create rule passes.
 */
export async function auditBlockedAction(
  workspaceId: string,
  metric: LimitMetric,
  used: number,
  limit: number,
  actorUid: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action: 'plan.limit.blocked',
      actorId: actorUid,
      actorUid,
      workspaceId,
      metric,
      used,
      limit,
      severity: 'info',
      createdAt: serverTimestamp(),
      note: `Blocked ${metric} create at ${used}/${limit} (plan limit)`,
    });
  } catch (e) {
    console.warn('[planLimits] blocked-action audit write failed:', e);
  }
}
