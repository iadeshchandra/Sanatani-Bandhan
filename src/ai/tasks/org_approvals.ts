/**
 * TASK: org_pending_approvals — "Pending approvals"
 * =====================================================================
 * DATA SOURCE: the caller's scoped port — pending maker–checker
 * requests (Blueprint B) pre-filtered by the host to the rules read
 * law (oversight roles see the workspace queue; everyone else sees
 * only their own filings). The executor can only ever describe what
 * the port hands it.
 * HONESTY: when the approvals read failed, approvalsAvailable() is
 * false and the answer is 'unavailable' — never a false "all clear".
 * This intent is READ-ONLY for every role, including checkers:
 * deciding happens in the Approvals panel, where the transactional
 * claim and the dual-control law live — not in chat.
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';
import { labelFor } from '../lang/shared';
import { orgOf } from './org_common';

const KIND_LABELS: Record<string, Record<'en' | 'hi' | 'bn', string>> = {
  'treasury.payout': { en: 'Payout', hi: 'भुगतान', bn: 'পরিশোধ' },
  'payment.details': { en: 'Payment details', hi: 'भुगतान विवरण', bn: 'পরিশোধের বিবরণ' },
  'role.grant': { en: 'Role grant', hi: 'भूमिका प्रदान', bn: 'ভূমিকা প্রদান' },
};

const BY_LABEL: Record<'en' | 'hi' | 'bn', string> = {
  en: 'by',
  hi: 'द्वारा',
  bn: '—',
};

const YOU_LABEL: Record<'en' | 'hi' | 'bn', string> = {
  en: '(filed by you)',
  hi: '(आपके द्वारा भेजा गया)',
  bn: '(আপনার পাঠানো)',
};

export function orgApprovalsTask(ctx: TaskCtx): TaskOutcome {
  const org = orgOf(ctx);
  if (!org) return { params: {}, variant: 'no_org' };
  const { port, scope } = org;
  if (!port.canSee('approvals')) {
    return { params: { workspace: scope.workspaceName }, variant: 'scoped' };
  }
  if (!port.approvalsAvailable()) {
    return { params: { workspace: scope.workspaceName }, variant: 'unavailable' };
  }
  const rows = port.pendingApprovals();
  if (rows.length === 0) {
    return {
      params: { workspace: scope.workspaceName },
      variant: 'empty',
      suggestions: suggestionsFor('org_pending_approvals', ctx.lang),
    };
  }
  // B2-C: draft languages read their labels from the overlays
  // (src/ai/lang/shared.labelFor); en/hi/bn keep the inline tables and
  // anything unauthored falls back to the English label — never blank.
  const l = (ctx.lang || 'en').toLowerCase();
  const tri: 'en' | 'hi' | 'bn' = l === 'hi' || l === 'bn' ? l : 'en';
  const kindLabel = (kind: string): string => {
    if (tri !== 'en') return KIND_LABELS[kind]?.[tri] ?? kind;
    if (l !== 'en') {
      const overlayKey =
        kind === 'treasury.payout' ? 'kind.payout'
        : kind === 'payment.details' ? 'kind.payment_details'
        : kind === 'role.grant' ? 'kind.role_grant'
        : undefined;
      const o = overlayKey ? labelFor(l, overlayKey) : undefined;
      if (o) return o;
    }
    return KIND_LABELS[kind]?.en ?? kind;
  };
  const byLabel = tri !== 'en' ? BY_LABEL[tri] : (labelFor(l, 'approvals.by') ?? BY_LABEL.en);
  const youRaw = tri !== 'en' ? YOU_LABEL[tri] : labelFor(l, 'approvals.you');
  const youLabel = youRaw
    ? youRaw.startsWith('(')
      ? youRaw
      : `(${youRaw})`
    : YOU_LABEL.en;
  const lines = rows
    .slice(0, 6)
    .map((r) => {
      const kind = kindLabel(r.kind);
      const amount = r.amount != null ? ` · ${port.formatAmount(r.amount)}` : '';
      const who = r.mine ? youLabel : `${byLabel} ${r.requestedByName}`;
      return `• ${kind} — ${r.summary}${amount} · ${who}`;
    })
    .join('\n');
  return {
    params: { workspace: scope.workspaceName, count: rows.length, lines },
    variant: 'list',
    suggestions: suggestionsFor('org_pending_approvals', ctx.lang),
  };
}
