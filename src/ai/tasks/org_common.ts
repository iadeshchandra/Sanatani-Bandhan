/**
 * ai/tasks/org_common.ts — Blueprint C: shared executor plumbing.
 * =====================================================================
 * Every org executor starts from the same three fail-closed checks:
 * an org context exists (the caller is in an org session), the data
 * domain is inside the caller's desk scope, and only then are rows
 * read — from the caller-scoped port, never from a global store.
 */

import type { TaskCtx } from '../types';
import type { OrgAssistantContext } from '../org/port';
import {
  monthStartISO,
  todayISO,
  weekStartISO,
  isoDaysFromNow,
} from '../org/drafts';

export type OrgPeriod = 'today' | 'week' | 'month';

export function orgOf(ctx: TaskCtx): OrgAssistantContext | null {
  return ctx.org ?? null;
}

export function periodOf(ctx: TaskCtx, fallback: OrgPeriod): OrgPeriod {
  const p = ctx.slots['period'];
  return p === 'today' || p === 'week' || p === 'month' ? p : fallback;
}

export function periodRange(period: OrgPeriod): { from: string; to: string } {
  const today = todayISO();
  if (period === 'today') return { from: today, to: today };
  if (period === 'week') return { from: weekStartISO(), to: today };
  return { from: monthStartISO(), to: today };
}

const PERIOD_LABELS: Record<OrgPeriod, Record<'en' | 'hi' | 'bn', string>> = {
  today: { en: 'Today', hi: 'आज', bn: 'আজ' },
  week: { en: 'This week', hi: 'इस सप्ताह', bn: 'এই সপ্তাহে' },
  month: { en: 'This month', hi: 'इस महीने', bn: 'এই মাসে' },
};

export function periodLabel(period: OrgPeriod, lang: string): string {
  const l = (lang || 'en').toLowerCase();
  const t = PERIOD_LABELS[period];
  return l === 'hi' || l === 'bn' ? t[l] : t.en;
}

/** ISO date for the schedule executor's 'today' | 'tomorrow' slot. */
export function scheduleDateISO(when: string | undefined): { iso: string; tomorrow: boolean } {
  const tomorrow = when === 'tomorrow';
  return { iso: tomorrow ? isoDaysFromNow(1) : todayISO(), tomorrow };
}
