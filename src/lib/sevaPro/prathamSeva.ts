/**
 * prathamSeva.ts — Welcome reward engine for the Pratham Seva program.
 * ====================================================================
 * On reaching VERIFIED, a professional is granted `freeSevasRemaining`
 * (default 3). While it is > 0, completed sevas carry ZERO platform
 * commission. Each completed seva decrements the counter.
 *
 * Beyond the welcome blessing, a tiered commission schedule eases the
 * professional into the full platform rate:
 *
 *   commissionSchedule: [
 *     { sevas: 3, rate: 0 },     // first 3 sevas: 0% of the standard rate
 *     { sevas: 5, rate: 0.06 },   // next 5 sevas: 6% of the standard rate
 *     { rate: 1.0 },              // everything after: the full standard rate
 *   ]
 *
 * `rate` is a MULTIPLIER of the standard commission rate (the platform's
 * resolved percent from resolveCommissionRate), NOT an absolute percent.
 * Example: standard 12% with multiplier 0.5 → effective 6%.
 *
 * The schedule counts COMPLETED sevas since verification (a stable,
 * auditable number), while `freeSevasRemaining` is the live counter the
 * professional sees. Both are kept: the counter for display, the completed
 * count for the schedule bracket.
 */
import { sevaProCopy, type SevaProLang } from './sevaProCopy';

export interface CommissionScheduleBracket {
  /** How many completed sevas this bracket covers. Omit = unlimited. */
  sevas?: number;
  /** Multiplier of the standard commission rate. 0 = commission-free. */
  rate: number;
}

export interface PrathamSevaConfig {
  /** Welcome blessing: free sevas granted when a profile reaches VERIFIED. */
  defaultFreeSevas: number;
  /** Tiered easing schedule applied after the free sevas are consumed. */
  commissionSchedule: CommissionScheduleBracket[];
  /** Days a TRUSTED 🌟 boost lasts when auto-granted (0 = manual only). */
  trustedBoostDays: number;
  /** Days a manual search boost lasts by default when set from GodMode. */
  manualBoostDays: number;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PRATHAM_CONFIG: PrathamSevaConfig = {
  defaultFreeSevas: 3,
  commissionSchedule: [
    { sevas: 3, rate: 0 },
    { sevas: 5, rate: 0.06 },
    { rate: 1.0 },
  ],
  trustedBoostDays: 90,
  manualBoostDays: 30,
};

/** Firestore document id for the single global config. */
export const PRATHAM_CONFIG_DOC_ID = 'global';

/* ------------------------- Schedule resolution ------------------------- */

/**
 * Which schedule multiplier applies at a given completed-seva count?
 * Brackets are consumed in order; the last open bracket ({ rate }) applies
 * to everything beyond.
 */
export function scheduleMultiplierFor(
  schedule: CommissionScheduleBracket[],
  completedSevasSinceVerified: number
): number {
  if (!schedule || schedule.length === 0) return 1.0;
  let cursor = completedSevasSinceVerified;
  for (const b of schedule) {
    const span = typeof b.sevas === 'number' && b.sevas > 0 ? b.sevas : Infinity;
    if (cursor < span) return clampRate(b.rate);
    cursor -= span;
  }
  const last = schedule[schedule.length - 1];
  return clampRate(last.rate);
}

function clampRate(rate: number): number {
  if (typeof rate !== 'number' || Number.isNaN(rate)) return 1.0;
  return Math.min(1, Math.max(0, rate));
}

/**
 * Effective commission PERCENT for the next completed seva.
 *
 * @param standardPercent  platform's resolved commission percent (e.g. 12)
 * @param config           the Pratham Seva program config
 * @param completedSinceVerified completed sevas since reaching VERIFIED
 * @param freeSevasRemaining   live welcome-reward counter (>0 → free)
 */
export function effectiveCommissionPercent(
  standardPercent: number,
  config: PrathamSevaConfig,
  completedSinceVerified: number,
  freeSevasRemaining: number
): number {
  const std = Number(standardPercent) || 0;
  if (Number(freeSevasRemaining) > 0) return 0;
  const mult = scheduleMultiplierFor(config.commissionSchedule, completedSinceVerified);
  return round2(std * mult);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Human summary of where a professional sits in the schedule. */
export function schedulePosition(
  config: PrathamSevaConfig,
  completedSinceVerified: number,
  freeSevasRemaining: number,
  lang: SevaProLang = 'en'
): { inFreeSevas: boolean; bracketLabel: string } {
  if (Number(freeSevasRemaining) > 0) {
    return {
      inFreeSevas: true,
      bracketLabel: sevaProCopy(lang, 'freeSevasRemaining', { n: freeSevasRemaining }),
    };
  }
  const mult = scheduleMultiplierFor(config.commissionSchedule, completedSinceVerified);
  if (mult <= 0) return { inFreeSevas: false, bracketLabel: '0% — blessing rate' };
  if (mult >= 1) return { inFreeSevas: false, bracketLabel: 'full standard rate' };
  return { inFreeSevas: false, bracketLabel: `${round2(mult * 100)}% of the standard rate` };
}

/* --------------------------- Reward lifecycle --------------------------- */

export interface WelcomeRewardGrant {
  freeSevasRemaining: number;
  prathamSevaGrantedAt: string;
  prathamSevaConfigSnapshot: {
    defaultFreeSevas: number;
    commissionSchedule: CommissionScheduleBracket[];
  };
  completedSevasSinceVerified: number;
}

/**
 * Payload to write onto the professional's profile doc when they reach
 * VERIFIED. Keeps a snapshot of the schedule so later config changes never
 * rewrite a professional's promised blessing.
 */
export function buildWelcomeRewardGrant(config: PrathamSevaConfig, nowIso: string = new Date().toISOString()): WelcomeRewardGrant {
  return {
    freeSevasRemaining: Math.max(0, Math.floor(Number(config.defaultFreeSevas) || 0)),
    prathamSevaGrantedAt: nowIso,
    prathamSevaConfigSnapshot: {
      defaultFreeSevas: config.defaultFreeSevas,
      commissionSchedule: config.commissionSchedule.map((b) => ({ ...b })),
    },
    completedSevasSinceVerified: 0,
  };
}

/** Decrement after a seva completes. Never below zero. */
export function consumeFreeSeva(freeSevasRemaining: number): number {
  return Math.max(0, Math.floor(Number(freeSevasRemaining) || 0) - 1);
}

/** Bonus top-ups from GodMode (never negative totals). */
export function addBonusFreeSevas(current: number, bonus: number): number {
  return Math.max(0, Math.floor(Number(current) || 0) + Math.floor(Number(bonus) || 0));
}

/** Blessing copy shown to the professional the moment they are honored. */
export function welcomeBlessing(config: PrathamSevaConfig, lang: SevaProLang = 'en'): { title: string; body: string } {
  return {
    title: sevaProCopy(lang, 'welcomeRewardTitle'),
    body: sevaProCopy(lang, 'welcomeRewardBody', { n: config.defaultFreeSevas }),
  };
}

/* --------------------------- Config validation --------------------------- */

/** Sanitize admin-entered config before persisting (pure, testable). */
export function sanitizeConfig(input: Partial<PrathamSevaConfig>): PrathamSevaConfig {
  const schedule = Array.isArray(input.commissionSchedule) && input.commissionSchedule.length > 0
    ? input.commissionSchedule
        .map((b) => ({
          ...(typeof b.sevas === 'number' && b.sevas > 0 ? { sevas: Math.floor(b.sevas) } : {}),
          rate: clampRate(Number((b as any).rate)),
        }))
        .slice(0, 10)
    : DEFAULT_PRATHAM_CONFIG.commissionSchedule;
  return {
    defaultFreeSevas: Math.min(50, Math.max(0, Math.floor(Number(input.defaultFreeSevas) || 0))),
    commissionSchedule: schedule,
    trustedBoostDays: Math.min(365, Math.max(0, Math.floor(Number(input.trustedBoostDays) || 0))),
    manualBoostDays: Math.min(365, Math.max(0, Math.floor(Number(input.manualBoostDays) || 0))),
  };
}
