/**
 * TASK: priest_schedule — "Today's pujas" / "Tomorrow's bookings"
 * =====================================================================
 * DATA SOURCE: the caller's scoped port over the ACTIVE workspace's
 * puja bookings for one day. Cancelled bookings are not listed —
 * they are not happening. Bookings without a concrete date were
 * already excluded by the host (never guessed onto a day).
 * The slot 'when' comes from the router's day words; the data
 * itself carries no instructions the renderer could obey — a
 * booking whose name contains orders is still just a name here
 * (red-team pinned in blueprintC tests).
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';
import { orgOf, scheduleDateISO } from './org_common';

const DAY_LABELS = {
  today: { en: 'Today', hi: 'आज', bn: 'আজ' },
  tomorrow: { en: 'Tomorrow', hi: 'कल', bn: 'আগামীকাল' },
} as const;

export function priestScheduleTask(ctx: TaskCtx): TaskOutcome {
  const org = orgOf(ctx);
  if (!org) return { params: {}, variant: 'no_org' };
  const { port, scope } = org;
  if (!port.canSee('bookings')) {
    return { params: { workspace: scope.workspaceName }, variant: 'scoped' };
  }
  const { iso, tomorrow } = scheduleDateISO(ctx.slots['when']);
  const l = ctx.lang === 'hi' || ctx.lang === 'bn' ? ctx.lang : 'en';
  const day = DAY_LABELS[tomorrow ? 'tomorrow' : 'today'][l];
  const rows = port
    .bookingsOn(iso)
    .filter((b) => b.status !== 'Cancelled')
    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  if (rows.length === 0) {
    return {
      params: { day, workspace: scope.workspaceName },
      variant: 'empty',
      suggestions: suggestionsFor('priest_schedule', ctx.lang),
    };
  }
  const lines = rows
    .slice(0, 8)
    .map((b) => `• ${b.timeSlot} — ${b.poojaName} · ${b.devoteeName}`)
    .join('\n');
  return {
    params: { day, workspace: scope.workspaceName, count: rows.length, lines },
    variant: 'list',
    suggestions: suggestionsFor('priest_schedule', ctx.lang),
  };
}
