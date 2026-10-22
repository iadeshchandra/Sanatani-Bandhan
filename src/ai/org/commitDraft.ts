/**
 * ai/org/commitDraft.ts — Blueprint C: the Approve path.
 * =====================================================================
 * The ONLY way a copilot draft becomes real. Called exclusively from
 * the preview card's Approve tap — ask() itself holds no services
 * and cannot commit anything.
 *
 * Every branch goes through the EXISTING commit paths, never a
 * parallel write:
 *  · Treasury income/expense → DataContext.addTreasuryTransaction
 *    (so Blueprint A's audit chain, receipt coverage and the summary
 *    writer all flow exactly as for a desk entry).
 *  · An expense at/above the workspace's maker–checker threshold →
 *    approvalService.request (Blueprint B) with buildPayoutPayload;
 *    the voucher posts only when a DIFFERENT checker approves it
 *    from the Approvals panel. The copilot drafts and files — it
 *    never bypasses dual control, at any amount, for any role
 *    (including a Trustee asking about their "own" payout).
 *  · Notices → org/broadcastService.publishBroadcast.
 *
 * DEMO_ workspaces keep Blueprint B's demo law: nothing real moves
 * there, approvals are refused by the service, so drafts commit
 * directly to the local demo ledger.
 *
 * Never throws: every failure returns { status: 'error' } and the
 * caller shows the honest message — a failed commit changes nothing.
 */

import { buildPayoutPayload } from '../../lib/approvals';
import {
  draftNeedsApproval,
  draftSummaryLine,
  pickDraftLang,
  type CopilotDraft,
  type DraftLang,
} from './drafts';
import type { CallerScope } from './port';

/** The treasury record handed to DataContext.addTreasuryTransaction
 *  (its Omit<…,'id'|…> input shape, structurally). */
export interface TreasuryTxInput {
  date: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  handledBy: string;
  devoteeId?: string;
  devoteeName?: string;
  vendorName?: string;
  paymentMode: string;
  purpose: string;
  workspaceId: string;
}

export interface CopilotCommitServices {
  addTreasuryTransaction: (tx: TreasuryTxInput) => boolean;
  /** Wraps approvalService.request for a treasury.payout filing. */
  filePayoutApproval: (input: {
    payload: Record<string, unknown>;
    summary: string;
    amount: number;
  }) => Promise<{ id: string }>;
  /** Wraps publishBroadcast for the caller's workspace. */
  publishNotice: (input: { title: string; body: string }) => Promise<{ id: string }>;
}

export interface CommitEnv {
  scope: CallerScope;
  /** Maker–checker threshold (the port's — workspace config law). */
  threshold: number;
  formatAmount: (n: number) => string;
  services: CopilotCommitServices;
}

export type CommitResult =
  | { status: 'committed' }
  | { status: 'filed'; requestId: string }
  | { status: 'error'; message: string };

function txFromDraft(
  draft: Extract<CopilotDraft, { kind: 'treasury.income' | 'treasury.expense' }>,
  scope: CallerScope
): TreasuryTxInput {
  const base: TreasuryTxInput = {
    date: draft.date,
    type: draft.kind === 'treasury.income' ? 'Income' : 'Expense',
    category: draft.category,
    amount: draft.amount,
    handledBy: scope.actorName || scope.workspaceRole,
    paymentMode: draft.paymentMode,
    purpose: draft.purpose || (draft.kind === 'treasury.income' ? 'Dana' : draft.category),
    workspaceId: scope.workspaceId,
  };
  if (draft.kind === 'treasury.income') {
    if (draft.devoteeId) base.devoteeId = draft.devoteeId;
    if (draft.devoteeName) base.devoteeName = draft.devoteeName;
  } else if (draft.vendorName) {
    base.vendorName = draft.vendorName;
  }
  return base;
}

export async function commitCopilotDraft(
  draft: CopilotDraft,
  env: CommitEnv
): Promise<CommitResult> {
  const { scope, services } = env;
  try {
    if (draft.kind === 'notice') {
      await services.publishNotice({ title: draft.title, body: draft.body });
      return { status: 'committed' };
    }
    const tx = txFromDraft(draft, scope);
    const isDemo = scope.workspaceId.startsWith('DEMO_');
    if (!isDemo && draftNeedsApproval(draft, env.threshold)) {
      const filed = await services.filePayoutApproval({
        payload: buildPayoutPayload(
          tx as unknown as Record<string, unknown>
        ) as unknown as Record<string, unknown>,
        summary: draftSummaryLine(draft, env.formatAmount),
        amount: draft.amount,
      });
      return { status: 'filed', requestId: filed.id };
    }
    const ok = services.addTreasuryTransaction(tx);
    return ok
      ? { status: 'committed' }
      : { status: 'error', message: 'The treasury refused the entry.' };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Commit failed.',
    };
  }
}

/* ------------------------------------------------------------------ */
/* Result copy (en/hi/bn — the sheet renders these verbatim)           */
/* ------------------------------------------------------------------ */

const RESULT_TEXT: Record<string, Record<DraftLang, string>> = {
  committedIncome: {
    en: '✅ Recorded — the donation is in the treasury now, with its receipt as usual. Dhanyavaad! 🙏',
    hi: '✅ दर्ज हो गया — दान अब कोष में है, उसकी रसीद सहित, हमेशा की तरह। धन्यवाद! 🙏',
    bn: '✅ লেখা হয়েছে — দান এখন তহবিলে আছে, যথারীতি রসিদসহ। ধন্যবাদ! 🙏',
  },
  committedExpense: {
    en: '✅ Recorded — the expense is in the treasury now. 🙏',
    hi: '✅ दर्ज हो गया — खर्च अब कोष में है। 🙏',
    bn: '✅ লেখা হয়েছে — খরচ এখন তহবিলে আছে। 🙏',
  },
  committedNotice: {
    en: '✅ Your notice is posted for the org’s followers. 🪔',
    hi: '✅ आपकी सूचना संगठन के अनुयायियों के लिए प्रकाशित हो गई है। 🪔',
    bn: '✅ আপনার বিজ্ঞপ্তি সংগঠনের অনুসরণকারীদের জন্য প্রকাশিত হয়েছে। 🪔',
  },
  filed: {
    en: '🪔 Filed for a checker’s approval — nothing has been posted yet. It will apply only when a different Trustee or Accountant approves it in the Approvals panel.',
    hi: '🪔 जाँचकर्ता के अनुमोदन के लिए भेजा गया — अभी कुछ भी दर्ज नहीं हुआ है। यह तभी लागू होगा जब कोई अन्य ट्रस्टी या अकाउंटेंट अनुमोदन पैनल में इसे स्वीकृत करेगा।',
    bn: '🪔 যাচাইকারীর অনুমোদনের জন্য পাঠানো হয়েছে — এখনও কিছুই লেখা হয়নি। অন্য কোনো ট্রাস্টি বা হিসাবরক্ষক অনুমোদন প্যানেলে অনুমোদন দিলেই এটি কার্যকর হবে।',
  },
  error: {
    en: '🙏 That could not be saved just now — nothing was changed. Please try again, or use the desk directly.',
    hi: '🙏 यह अभी सहेजा नहीं जा सका — कुछ भी नहीं बदला। कृपया पुनः प्रयास करें, या सीधे डेस्क का उपयोग करें।',
    bn: '🙏 এটি এখনই সংরক্ষণ করা যায়নি — কিছুই বদলায়নি। আবার চেষ্টা করুন, অথবা সরাসরি ডেস্ক ব্যবহার করুন।',
  },
  rejected: {
    en: '🙏 Draft discarded — nothing was saved.',
    hi: '🙏 मसौदा हटा दिया — कुछ भी सहेजा नहीं गया।',
    bn: '🙏 খসড়া বাতিল — কিছুই সংরক্ষিত হয়নি।',
  },
};

export function commitResultText(
  result: CommitResult,
  draft: CopilotDraft,
  lang: string
): string {
  const l = pickDraftLang(lang);
  if (result.status === 'filed') return RESULT_TEXT['filed'][l];
  if (result.status === 'error') return RESULT_TEXT['error'][l];
  if (draft.kind === 'notice') return RESULT_TEXT['committedNotice'][l];
  return draft.kind === 'treasury.income'
    ? RESULT_TEXT['committedIncome'][l]
    : RESULT_TEXT['committedExpense'][l];
}

export function draftRejectedText(lang: string): string {
  return RESULT_TEXT['rejected'][pickDraftLang(lang)];
}
