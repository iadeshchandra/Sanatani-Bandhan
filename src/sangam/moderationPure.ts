/**
 * sangam/moderationPure.ts — firebase-free moderation decision logic.
 * ===================================================================
 * Kept free of firebase imports so it stays jest-safe (same pattern as
 * serializers.ts). The impure Firestore pieces live in moderation.ts.
 */
import type { SangamReport } from './types';

export type ModerationAction = 'dismiss' | 'hide_content' | 'warn_user' | 'suspend_user';

export interface ModerationReportLike {
  targetType?: string;
  targetId?: string;
  reporterUid?: string;
}

/** Pure helper for tests: does this id sit in the hidden set? */
export function isHidden(hidden: Set<string>, targetId: string): boolean {
  return hidden.has(targetId);
}

/**
 * AUDIT FIX #9: the old code checked `rep.targetUid` — a field that never
 * exists on report docs. Warnings go to the reported USER's uid.
 */
export function warnTargetForReport(rep: ModerationReportLike): string | null {
  const uid = rep.targetType === 'user' ? String(rep.targetId || '') : '';
  return uid ? uid : null;
}

/** Reporters are thanked for every action except dismiss. Never what was done. */
export function shouldThankReporter(action: ModerationAction, rep: ModerationReportLike): boolean {
  return action !== 'dismiss' && !!rep.reporterUid;
}

/** Which actions make sense for a given report target type (drives the UI). */
export function actionsForTarget(targetType?: string): ModerationAction[] {
  const base: ModerationAction[] = ['dismiss'];
  if (targetType === 'user') return [...base, 'warn_user', 'suspend_user'];
  return [...base, 'hide_content'];
}

/** The exact sangamReports create whitelist (mirrors firestore.rules). */
export const REPORT_CREATE_WHITELIST = [
  'reporterUid', 'reporterName', 'targetType', 'targetId',
  'reason', 'details', 'status', 'createdAt',
] as const;

/** Validates a report payload against the whitelist (extra keys rejected). */
export function reportPayloadKeysValid(payload: Record<string, unknown>): boolean {
  const allowed = new Set<string>(REPORT_CREATE_WHITELIST);
  return Object.keys(payload).every((k) => allowed.has(k));
}

export type { SangamReport };
