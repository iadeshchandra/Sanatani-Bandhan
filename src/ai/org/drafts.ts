/**
 * ai/org/drafts.ts — Blueprint C: copilot write drafts.
 * =====================================================================
 * Research §3a.3: "Draft–preview–approve for every write. The
 * assistant produces a draft in plain language; a human with the
 * permission confirms; only then does the system execute."
 *
 * A CopilotDraft is a PURE VALUE — creating one writes nothing,
 * anywhere. It is produced by an executor from the user's words,
 * rendered by the sheet as a preview card (fields below), edited in
 * place if the user wishes, and committed ONLY through
 * commitDraft.ts when the user taps Approve. Rejecting a draft is a
 * local state change: no data trace, by construction.
 *
 * Parsing is deterministic and conservative: an amount must be
 * findable, a donor name is linked to a devotee record ONLY on a
 * unique in-workspace match (see org_record.ts for the ambiguity
 * law), and anything missing stays visibly missing in the preview —
 * the copilot never invents a figure, a name, or a purpose.
 */

import { payoutNeedsApproval } from '../../lib/approvals';
import { labelFor } from '../lang/shared';

export type CopilotDraft =
  | {
      kind: 'treasury.income';
      amount: number;
      devoteeId?: string;
      devoteeName?: string;
      category: string;
      purpose: string;
      paymentMode: string;
      /** ISO date (yyyy-mm-dd). */
      date: string;
    }
  | {
      kind: 'treasury.expense';
      amount: number;
      category: string;
      purpose: string;
      paymentMode: string;
      vendorName?: string;
      date: string;
    }
  | {
      kind: 'notice';
      title: string;
      body: string;
    };

export type DraftLang = 'en' | 'hi' | 'bn';

export function pickDraftLang(lang: string | undefined): DraftLang {
  const l = (lang || 'en').toLowerCase();
  return l === 'hi' || l === 'bn' ? l : 'en';
}

export function todayISO(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function isoDaysFromNow(days: number, now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

/** Monday of the current week (ISO) — the copilot's "this week". */
export function weekStartISO(now = new Date()): string {
  const d = new Date(now);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return todayISO(d);
}

export function monthStartISO(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/* ------------------------------------------------------------------ */
/* Deterministic slot parsing                                          */
/* ------------------------------------------------------------------ */

/**
 * First money amount in the text. Currency-marked amounts win
 * (₹ / ৳ / Rs / taka / টাকা, either side); otherwise the first
 * standalone number. Returns null when nothing amount-like exists —
 * the executor then ASKS instead of guessing.
 */
/** Bengali (০-৯) and Devanagari (०-९) digits → ASCII, so amounts
 *  typed in the caller's own script parse identically. */
export function normalizeDigits(text: string): string {
  return text.replace(/[০-৯०-९]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const zero = code >= 0x09e6 && code <= 0x09ef ? 0x09e6 : 0x0966;
    return String(code - zero);
  });
}

export function parseAmount(input: string): number | null {
  const text = normalizeDigits(input || '');
  const marked =
    /(?:₹|৳|rs\.?|inr|taka|টাকা)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i.exec(text) ||
    /([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:₹|৳|taka|টাকা|rs\.?\b)/i.exec(text);
  const raw = marked?.[1] ?? /\b([0-9][0-9,]*(?:\.[0-9]+)?)\b/.exec(text)?.[1];
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Donor name after "from …" (up to " for …" or end of input). */
export function parseDonorName(input: string): string | null {
  const m = /\bfrom\s+(.+?)(?=\s+for\s+|\s*[.,;]\s*$|$)/i.exec(input || '');
  if (!m) return null;
  const name = m[1].replace(/\s+/g, ' ').trim();
  return name.length >= 2 ? name : null;
}

/** Purpose after " for …" (to end of input). */
export function parsePurpose(input: string): string | null {
  const m = /\bfor\s+(.+)$/i.exec(input || '');
  if (!m) return null;
  const p = m[1].replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
  return p.length >= 2 ? p : null;
}

const EXPENSE_CATEGORY_HINTS: Array<{ re: RegExp; category: string }> = [
  { re: /bijli|electric|বিদ্যুৎ|बिजली|current bill/i, category: 'Utilities' },
  { re: /rent|ভাড়া|किराया|kiraya/i, category: 'Rent' },
  { re: /salary|বেতন|वेतन|beton/i, category: 'Salary' },
  { re: /flower|phool|ফুল|फूल|samagri|সামগ্রী|puja item/i, category: 'Puja Samagri' },
  { re: /annadan|food|আহার|খাবার|भोजन|ration/i, category: 'Annadanam' },
  { re: /repair|মেরামত|मरम्मत|maintenance/i, category: 'Maintenance' },
  { re: /print|stationery|ছাপা|छपाई/i, category: 'Printing & Stationery' },
];

export function parseExpenseCategory(input: string): string {
  for (const h of EXPENSE_CATEGORY_HINTS) if (h.re.test(input || '')) return h.category;
  return 'General';
}

export function parsePaymentMode(input: string): string {
  const t = input || '';
  if (/upi|qr|ইউপিআই/i.test(t)) return 'UPI / QR';
  if (/bank|ব্যাংক|बैंक/i.test(t)) return 'Bank Transfer';
  if (/cheque|check|চেক|चेक/i.test(t)) return 'Cheque';
  if (/card|কার্ড|कार्ड/i.test(t)) return 'Card';
  return 'Cash';
}

export function parseDraftDate(input: string): string {
  if (/yesterday|গতকাল|बीता कल/i.test(input || '')) return isoDaysFromNow(-1);
  return todayISO();
}

/**
 * Notice content after the command words. Title = first line (or
 * first sentence), capped at the broadcast title law (120); the rest
 * is the body. Returns null when there is no content to draft.
 */
export function parseNotice(input: string): { title: string; body: string } | null {
  let text = (input || '').trim();
  text = text
    .replace(
      /^(please\s+)?(draft|write|make|compose)\s+(a\s+|an\s+)?(notice|announcement)\s*[:\-–]?\s*/i,
      ''
    )
    .replace(/^(notice|announcement|বিজ্ঞপ্তি|सूचना)\s*[:\-–]\s*/i, '')
    // Card prompts in bn/hi carry the command as a prefix phrase —
    // strip it too, so a bare card tap yields "no content" (the
    // executor then asks) instead of drafting the command itself.
    .replace(/^বিজ্ঞপ্তি\S*\s+(খসড়া\s+)?(তৈরি করুন|তৈরি|বানাও|বানান|লিখুন)\s*[:\-–]?\s*/u, '')
    .replace(/^নোটিশ\S*\s+(খসড়া\s+)?(তৈরি করুন|তৈরি|বানাও|বানান|লিখুন)\s*[:\-–]?\s*/u, '')
    .replace(/^सूचना\s+का\s+मसौदा\s+(बनाएं|बनाओ|लिखें|लिखिए)\s*[:\-–]?\s*/u, '')
    .trim();
  if (text.length < 3) return null;
  const [first, ...rest] = text.split(/\n+/);
  const firstTrim = first.trim();
  const title =
    firstTrim.length <= 120 ? firstTrim : `${firstTrim.slice(0, 117).trim()}…`;
  const body = rest.join('\n').trim();
  return { title, body };
}

/* ------------------------------------------------------------------ */
/* Preview + gating                                                    */
/* ------------------------------------------------------------------ */

/** True when approving this draft must FILE a maker–checker request
 *  instead of applying (Blueprint B hard law — the copilot drafts
 *  and files; it never bypasses dual control). */
export function draftNeedsApproval(draft: CopilotDraft, threshold: number): boolean {
  return (
    draft.kind === 'treasury.expense' &&
    payoutNeedsApproval({ type: 'Expense', amount: draft.amount }, threshold)
  );
}

export interface DraftLine {
  key: string;
  label: string;
  value: string;
  /** In-place editable fields on the preview card. */
  editable?: 'text' | 'number';
  field?: 'amount' | 'devoteeName' | 'purpose' | 'title' | 'body' | 'vendorName';
}

const LINE_LABELS: Record<string, Record<DraftLang, string>> = {
  amount: { en: 'Amount', hi: 'राशि', bn: 'পরিমাণ' },
  donor: { en: 'Donor', hi: 'दाता', bn: 'দাতা' },
  purpose: { en: 'Purpose', hi: 'उद्देश्य', bn: 'উদ্দেশ্য' },
  category: { en: 'Category', hi: 'श्रेणी', bn: 'বিভাগ' },
  mode: { en: 'Payment', hi: 'भुगतान', bn: 'পরিশোধ' },
  date: { en: 'Date', hi: 'तिथि', bn: 'তারিখ' },
  vendor: { en: 'Paid to', hi: 'भुगतान पाने वाला', bn: 'প্রাপক' },
  title: { en: 'Title', hi: 'शीर्षक', bn: 'শিরোনাম' },
  body: { en: 'Message', hi: 'संदेश', bn: 'বার্তা' },
  notGiven: { en: 'Not given', hi: 'नहीं दिया गया', bn: 'দেওয়া হয়নি' },
};

/** The exact fields the preview card shows — the commit uses these
 *  same values (after any in-place edit), never a re-parse. */
export function draftPreviewLines(
  draft: CopilotDraft,
  lang: string,
  formatAmount: (n: number) => string
): DraftLine[] {
  const l = pickDraftLang(lang);
  // B2-C: draft languages (ta/te/mr/gu/kn/ml/sa) read their line labels
  // from the overlays; en/hi/bn keep LINE_LABELS — labelFor is undefined
  // for them, and for any key an overlay did not author.
  const L = (k: string) => labelFor(lang, `draft.${k}`) ?? LINE_LABELS[k][l];
  const lines: DraftLine[] = [];
  if (draft.kind === 'notice') {
    lines.push({ key: 'title', label: L('title'), value: draft.title, editable: 'text', field: 'title' });
    if (draft.body) {
      lines.push({ key: 'body', label: L('body'), value: draft.body, editable: 'text', field: 'body' });
    }
    return lines;
  }
  lines.push({
    key: 'amount',
    label: L('amount'),
    value: formatAmount(draft.amount),
    editable: 'number',
    field: 'amount',
  });
  if (draft.kind === 'treasury.income') {
    lines.push({
      key: 'donor',
      label: L('donor'),
      value: draft.devoteeName || L('notGiven'),
      editable: 'text',
      field: 'devoteeName',
    });
  } else if (draft.vendorName) {
    lines.push({ key: 'vendor', label: L('vendor'), value: draft.vendorName, editable: 'text', field: 'vendorName' });
  }
  lines.push({ key: 'purpose', label: L('purpose'), value: draft.purpose || L('notGiven'), editable: 'text', field: 'purpose' });
  lines.push({ key: 'category', label: L('category'), value: draft.category });
  lines.push({ key: 'mode', label: L('mode'), value: draft.paymentMode });
  lines.push({ key: 'date', label: L('date'), value: draft.date });
  return lines;
}

/** One-line summary of a draft — used for the approval request's
 *  plain-language summary and the sheet's result messages. */
export function draftSummaryLine(
  draft: CopilotDraft,
  formatAmount: (n: number) => string
): string {
  if (draft.kind === 'notice') return `Notice: ${draft.title}`;
  if (draft.kind === 'treasury.income') {
    return `Donation ${formatAmount(draft.amount)}${draft.devoteeName ? ` from ${draft.devoteeName}` : ''} for ${draft.purpose || 'general dana'}`;
  }
  return `Expense ${formatAmount(draft.amount)} for ${draft.purpose || draft.category}`;
}
