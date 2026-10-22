/**
 * voiceEntry.ts — Blueprint D, deliverable 5: Bahi-Khata voice entry
 * (pure logic + the Web Speech seam; no React).
 * ============================================================================
 * The desk-side rung of Bahi-Khata Phase 3: a sevadar at a busy
 * counter speaks a donation — "রতন বর্মন থেকে ৫০০ টাকা অন্নদানের
 * জন্য" — and lands on the EXISTING register form with the entry
 * pre-filled, to check and save by hand. Voice NEVER commits
 * anything: the transcript becomes one review row in an ordinary
 * donors batch (the same review → approve → commit machinery every
 * other entry rides), and a field the words did not clearly carry
 * stays EMPTY for the human — it is never invented.
 *
 * Parsing rides Blueprint C's parser family (ai/org/drafts):
 * parseAmount (Bengali/Devanagari digits, ৳/টাকা markers),
 * parsePaymentMode (has bn/hi hints), parseDraftDate — extended
 * here with the two anchors C's English-only name/purpose parsers
 * lack: Bengali থেকে (from) / জন্য (for) and Hindi से (from) /
 * के लिए (for).
 *
 * Device reality (honest): the Web Speech API's recognition side
 * is Chromium-family only (Chrome/Edge/Android WebView); Firefox
 * and Safari do not expose webkitSpeechRecognition for pages, and
 * Chrome's recognizer is a cloud service (needs connectivity and
 * sends audio to Google). Where the API is absent the mic button
 * is simply not rendered — no fake affordance (see VoiceEntryPanel).
 */

import {
  normalizeDigits,
  parseAmount,
  parseDonorName,
  parseDraftDate,
  parsePaymentMode,
  parsePurpose,
} from '../ai/org/drafts';
import { createBatch } from './bahikhataStore';
import type { BatchActor, ImportBatch, ImportRow } from './types';
import type { BkLang } from './copy';

export interface ParsedVoiceDonation {
  amount: number;
  donorName: string | null;
  purpose: string | null;
  /** Only set when the words named a mode (parsePaymentMode's Cash
   *  fallback is NOT trusted as a spoken fact). */
  paymentMode: string | null;
  /** Only set when the words named a day (yesterday/today family). */
  donationDate: string | null;
  transcript: string;
}

type SRConstructor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
};

/** The recognition constructor, or null where the browser does not
 *  offer speech recognition to pages at all. */
export function speechRecognitionCtor(
  w: (Window & typeof globalThis) | undefined = typeof window !== 'undefined' ? window : undefined
): SRConstructor | null {
  if (!w) return null;
  const anyW = w as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return anyW.SpeechRecognition ?? anyW.webkitSpeechRecognition ?? null;
}

export const isSpeechRecognitionSupported = (): boolean => speechRecognitionCtor() !== null;

/** Recognition language per app language: bn-IN / hi-IN / en-IN. */
export function voiceLangFor(lang: BkLang): string {
  return lang === 'bn' ? 'bn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
}

const cleanName = (s: string): string | null => {
  const name = s
    .replace(/[\d₹৳]/g, ' ')
    .replace(/\b(?:taka|টাকা|rs\.?|inr|rupees?|রুপি|रुपये|रुपया)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;—-]+|[\s,;—-]+$/g, '')
    .trim();
  return name.length >= 2 && name.length <= 60 ? name : null;
};

/** Remove amount phrases ("500 টাকা", "1000 रुपये", "₹500") and
 *  bare currency words from a captured purpose fragment — the
 *  purpose is the words AROUND the money, never the money itself. */
const stripAmountWords = (s: string): string =>
  s
    .replace(/(?:₹|৳)?\s*[\d][\d,]*\s*(?:টাকা|taka|rs\.?|rupees?|রুপি|रुपये|रुपया)?/gi, ' ')
    .split(/\s+/)
    .filter((tok) => tok !== 'টাকা' && !/^taka$/i.test(tok))
    .join(' ')
    .trim();

/** Remove a trailing spoken payment-mode word from a purpose
 *  fragment ("annadanam cash" → "annadanam"). */
const stripModeTail = (s: string): string =>
  s
    .replace(
      /\s+(?:cash|upi|qr|bank transfer|cheque|check|card|নগদ|ব্যাংক|চেক|কার্ড|नकद|बैंक|चेक|कार्ड|यूपीआई|বিকাশ)$/i,
      ''
    )
    .trim();

/** Bengali: "রতন বর্মন থেকে …" — the name precedes থেকে.
 *  (No \b anchors anywhere in this module's bn/hi patterns: JS \b
 *  is ASCII-based and never matches beside Bengali/Devanagari
 *  letters — whitespace lookaheads do the job.) */
function parseNameBn(input: string): string | null {
  const m = /^(.+?)\s+থেকে(?=\s|$)/.exec(input);
  return m ? cleanName(m[1]) : null;
}

/** Hindi: "रतन बर्मन से …" — the name precedes से. */
function parseNameHi(input: string): string | null {
  const m = /^(.+?)\s+से(?=\s|$)/.exec(input);
  return m ? cleanName(m[1]) : null;
}

/** Bengali purpose: "… অন্নদানের জন্য" — the purpose precedes জন্য.
 *  Take the trailing phrase before জন্য (bounded, never the whole
 *  sentence: the amount/name also live in it). */
function parsePurposeBn(input: string): string | null {
  const m = /([^\s,]+(?:\s+[^\s,]+){0,2})\s+জন্য/.exec(input);
  if (!m) return null;
  const p = stripAmountWords(m[1]);
  return p.length >= 2 && !/থেকে/.test(p) ? p : null;
}

/** Hindi purpose: "… के लिए अन्नदान" or "अन्नदान के लिए …" —
 *  speech order varies; prefer the phrase AFTER के लिए, else the
 *  trailing phrase before it. */
function parsePurposeHi(input: string): string | null {
  const after = /के लिए\s+([^\s,]+(?:\s+[^\s,]+){0,2})/.exec(input);
  if (after) {
    const p = stripAmountWords(after[1]);
    // "… के लिए यूपीआई" — what follows is the payment mode, not
    // the purpose; fall through to the before-phrase instead.
    if (p.length >= 2 && !MODE_HINT.test(p)) return p;
  }
  const before = /([^\s,]+(?:\s+[^\s,]+){0,2})\s+के लिए/.exec(input);
  if (before) {
    const p = stripAmountWords(before[1].replace(/से\s*$/, ''));
    return p.length >= 2 ? p : null;
  }
  return null;
}

const MODE_HINT =
  /upi|qr|bank|cheque|check|card|cash|নগদ|বিকাশ|ব্যাংক|চেক|কার্ড|नकद|बैंक|चेक|कार्ड|यूपीआई/i;
const DAY_HINT = /yesterday|today|গতকাল|আজ|बीता कल|आज/i;

/**
 * Parse one spoken donation line. Returns null when no amount was
 * heard — without an amount there is no entry to pre-fill, and the
 * panel asks the speaker to try once more rather than opening an
 * empty form.
 */
export function parseVoiceDonation(transcript: string): ParsedVoiceDonation | null {
  const original = (transcript || '').trim();
  if (!original) return null;
  // Parse on the digit-normalized line (Bengali/Devanagari digits
  // become ASCII, so every anchor below behaves identically in all
  // three languages); the ORIGINAL line is what the reviewer sees.
  const text = normalizeDigits(original);
  const amount = parseAmount(text);
  if (amount == null) return null;
  const rawName = parseDonorName(text) ?? parseNameBn(text) ?? parseNameHi(text);
  const donorName = rawName ? cleanName(rawName) : null;
  const rawPurpose = parsePurpose(text) ?? parsePurposeBn(text) ?? parsePurposeHi(text);
  const purpose = rawPurpose ? stripModeTail(rawPurpose) || null : null;
  // C's parsePaymentMode knows UPI in Latin + Bengali script; hi-IN
  // recognition returns Devanagari यूपीआई, so the voice seam checks
  // that one spelling itself before delegating the rest.
  const paymentMode = !MODE_HINT.test(text)
    ? null
    : /यूपीआई/.test(text)
      ? 'UPI / QR'
      : parsePaymentMode(text);
  const donationDate = DAY_HINT.test(text) ? parseDraftDate(text) : null;
  return { amount, donorName, purpose, paymentMode, donationDate, transcript: original };
}

/**
 * Build the ordinary donors batch the voice entry rides: ONE row,
 * pre-filled with exactly what was heard (unheard fields absent),
 * carrying the transcript verbatim in `raw` so the reviewer sees
 * the words behind the fields. State 'ok', approved by default —
 * the human's review in RegisterMode is the gate, exactly as for
 * typed rows.
 */
export function buildVoiceBatch(args: {
  workspaceId: string;
  enteredBy: BatchActor;
  label: string;
  parsed: ParsedVoiceDonation;
}): ImportBatch {
  const batch = createBatch({
    workspaceId: args.workspaceId,
    target: 'donors',
    source: 'register',
    label: args.label,
    enteredBy: args.enteredBy,
  });
  const p = args.parsed;
  const mapped: Record<string, unknown> = { donationAmount: p.amount };
  if (p.donorName) mapped.fullName = p.donorName;
  if (p.purpose) mapped.purpose = p.purpose;
  if (p.paymentMode) mapped.paymentMode = p.paymentMode;
  if (p.donationDate) mapped.donationDate = p.donationDate;
  const row: ImportRow = {
    rowId: `voice-${batch.id}`,
    pageNo: 1,
    raw: { transcript: p.transcript },
    mapped,
    state: 'ok',
    issues: [],
    defaultedFields: [],
    approved: true,
  };
  return { ...batch, rows: [row] };
}
