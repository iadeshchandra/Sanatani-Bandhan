/**
 * TASKS: record_donation / record_expense — draft-only writers.
 * =====================================================================
 * These executors NEVER write. They parse the caller's words into a
 * CopilotDraft (org/drafts.ts) and hand it to the sheet's preview
 * card; the commit happens only through commitDraft.ts after the
 * user taps Approve.
 *
 * The ambiguity law (research §3 + spec): a donor name that matches
 * MORE THAN ONE devotee in this workspace yields a clarification —
 * candidates listed, no draft, no figure, and above all no guessed
 * link. A unique match links the record; no match keeps the typed
 * name as the record's donor name (the ledger's walk-in case).
 * A missing amount yields a question, never an invented figure.
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';
import {
  draftNeedsApproval,
  draftSummaryLine,
  parseAmount,
  parseDraftDate,
  parseDonorName,
  parseExpenseCategory,
  parsePaymentMode,
  parsePurpose,
  type CopilotDraft,
} from '../org/drafts';
import { orgOf } from './org_common';

export function recordDonationTask(ctx: TaskCtx): TaskOutcome {
  const org = orgOf(ctx);
  if (!org) return { params: {}, variant: 'no_org' };
  const { port, scope } = org;
  if (!port.canSee('treasury')) {
    return { params: { workspace: scope.workspaceName }, variant: 'scoped' };
  }
  const amount = parseAmount(ctx.input);
  if (amount == null) {
    return { params: {}, variant: 'need_amount' };
  }
  const typedName = parseDonorName(ctx.input);
  let devoteeId: string | undefined;
  let devoteeName: string | undefined;
  if (typedName) {
    const matches = port.findDevoteesByName(typedName);
    if (matches.length > 1) {
      const candidates = matches
        .map((m) => `• ${m.name}${m.hint ? ` (${m.hint})` : ''}`)
        .join('\n');
      return {
        params: { name: typedName, candidates },
        variant: 'clarify',
        suggestions: suggestionsFor('record_donation', ctx.lang),
      };
    }
    if (matches.length === 1) {
      devoteeId = matches[0].id;
      devoteeName = matches[0].name;
    } else {
      devoteeName = typedName;
    }
  }
  const draft: CopilotDraft = {
    kind: 'treasury.income',
    amount,
    ...(devoteeId ? { devoteeId } : {}),
    ...(devoteeName ? { devoteeName } : {}),
    category: 'Donation',
    purpose: parsePurpose(ctx.input) ?? '',
    paymentMode: parsePaymentMode(ctx.input),
    date: parseDraftDate(ctx.input),
  };
  return {
    params: { summary: draftSummaryLine(draft, port.formatAmount) },
    variant: 'draft_ready',
    draft,
    suggestions: suggestionsFor('record_donation', ctx.lang),
  };
}

export function recordExpenseTask(ctx: TaskCtx): TaskOutcome {
  const org = orgOf(ctx);
  if (!org) return { params: {}, variant: 'no_org' };
  const { port, scope } = org;
  if (!port.canSee('treasury')) {
    return { params: { workspace: scope.workspaceName }, variant: 'scoped' };
  }
  const amount = parseAmount(ctx.input);
  if (amount == null) {
    return { params: {}, variant: 'need_amount' };
  }
  const category = parseExpenseCategory(ctx.input);
  const draft: CopilotDraft = {
    kind: 'treasury.expense',
    amount,
    category,
    purpose: parsePurpose(ctx.input) ?? '',
    paymentMode: parsePaymentMode(ctx.input),
    date: parseDraftDate(ctx.input),
  };
  const gated = draftNeedsApproval(draft, port.payoutThreshold());
  return {
    params: { summary: draftSummaryLine(draft, port.formatAmount) },
    variant: gated ? 'draft_gated' : 'draft_ready',
    draft,
    suggestions: suggestionsFor('record_expense', ctx.lang),
  };
}
