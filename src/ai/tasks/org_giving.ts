/**
 * TASK: org_giving — "Who gave this week?"
 * =====================================================================
 * DATA SOURCE: the caller's scoped port (Blueprint C) over the
 * ACTIVE workspace's treasury — Income rows in the period. The
 * executor cannot name another workspace: the port has no such rows
 * and no parameter that could fetch them.
 * PRIVACY: donor names listed here are the workspace's own ledger
 * entries, visible only to roles whose capability list carries this
 * intent (Trustee / Accountant / Auditor) AND whose desk scope
 * includes treasury. A scoped-out caller gets the 'scoped' variant —
 * no rows, no totals, not even a count.
 * HONESTY: a windowed ledger (F2) that cannot cover the period
 * renders 'summary_partial' — the answer labels itself as from the
 * loaded entries rather than posing as the whole truth.
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';
import { orgOf, periodLabel, periodOf, periodRange } from './org_common';

export function orgGivingTask(ctx: TaskCtx): TaskOutcome {
  const org = orgOf(ctx);
  if (!org) return { params: {}, variant: 'no_org' };
  const { port, scope } = org;
  if (!port.canSee('treasury')) {
    return { params: { workspace: scope.workspaceName }, variant: 'scoped' };
  }
  const period = periodOf(ctx, 'week');
  const { from, to } = periodRange(period);
  const rows = port
    .treasuryInRange(from, to)
    .filter((r) => r.type === 'Income')
    .sort((a, b) => b.amount - a.amount);
  const label = periodLabel(period, ctx.lang);
  if (rows.length === 0) {
    return {
      params: { period: label, workspace: scope.workspaceName },
      variant: 'empty',
      suggestions: suggestionsFor('org_giving', ctx.lang),
    };
  }
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const lines = rows
    .slice(0, 5)
    .map((r) => `• ${r.devoteeName || r.category} — ${port.formatAmount(r.amount)}`)
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
    suggestions: suggestionsFor('org_giving', ctx.lang),
  };
}
