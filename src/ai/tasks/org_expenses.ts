/**
 * TASK: org_expenses — "This month's expenses"
 * =====================================================================
 * DATA SOURCE: the caller's scoped port over the ACTIVE workspace's
 * treasury — Expense rows in the period. Same scoping, privacy and
 * windowing-honesty laws as org_giving.
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';
import { orgOf, periodLabel, periodOf, periodRange } from './org_common';

export function orgExpensesTask(ctx: TaskCtx): TaskOutcome {
  const org = orgOf(ctx);
  if (!org) return { params: {}, variant: 'no_org' };
  const { port, scope } = org;
  if (!port.canSee('treasury')) {
    return { params: { workspace: scope.workspaceName }, variant: 'scoped' };
  }
  const period = periodOf(ctx, 'month');
  const { from, to } = periodRange(period);
  const rows = port
    .treasuryInRange(from, to)
    .filter((r) => r.type === 'Expense')
    .sort((a, b) => b.amount - a.amount);
  const label = periodLabel(period, ctx.lang);
  if (rows.length === 0) {
    return {
      params: { period: label, workspace: scope.workspaceName },
      variant: 'empty',
      suggestions: suggestionsFor('org_expenses', ctx.lang),
    };
  }
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const lines = rows
    .slice(0, 5)
    .map((r) => `• ${r.purpose || r.category} — ${port.formatAmount(r.amount)}`)
    .join('\n');
  const complete = port.treasuryPeriodComplete(from);
  return {
    params: {
      period: label,
      workspace: scope.workspaceName,
      total: port.formatAmount(total),
      count: rows.length,
      lines,
    },
    variant: complete ? 'summary' : 'summary_partial',
    suggestions: suggestionsFor('org_expenses', ctx.lang),
  };
}
