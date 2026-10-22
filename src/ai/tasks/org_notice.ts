/**
 * TASK: draft_notice — draft an org broadcast notice.
 * =====================================================================
 * Draft-only, like the record tasks: the executor turns the caller's
 * words into a notice draft; the sheet's preview card shows it;
 * Approve publishes through org/broadcastService.publishBroadcast —
 * the same path the Broadcast desk uses. Nothing posts from here.
 *
 * Who may draft: Trustees, and Managers (Blueprint B 'org-manager'
 * template — notices are in the manager's desk scope). The check is
 * made HERE, on the session scope, in addition to the pipeline's
 * role gate: a plain Sevadar who types the words gets the warm
 * 'scoped' answer, because drafting the org's public voice is not
 * part of the generic Sevadar role.
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';
import { draftSummaryLine, parseNotice, type CopilotDraft } from '../org/drafts';
import { orgOf } from './org_common';

export function draftNoticeTask(ctx: TaskCtx): TaskOutcome {
  const org = orgOf(ctx);
  if (!org) return { params: {}, variant: 'no_org' };
  const { port, scope } = org;
  const mayDraft =
    scope.role === 'trustee' || scope.templateId === 'org-manager';
  if (!mayDraft || !port.canSee('notices')) {
    return { params: { workspace: scope.workspaceName }, variant: 'scoped' };
  }
  const parsed = parseNotice(ctx.input);
  if (!parsed) {
    return { params: {}, variant: 'need_details' };
  }
  const draft: CopilotDraft = { kind: 'notice', title: parsed.title, body: parsed.body };
  return {
    params: { summary: draftSummaryLine(draft, (n) => String(n)) },
    variant: 'draft_ready',
    draft,
    suggestions: suggestionsFor('draft_notice', ctx.lang),
  };
}
