/**
 * jyotish/dakshinaBridge.ts — Consultation → marketplace order bridge (PURE).
 * ===========================================================================
 * Before this bridge, jyotish revenue was fully informal: a consultation
 * reached COMPLETED, the devotee tapped "Confirm & release dakshina"
 * (a workflow-only status flip), and the money moved outside the app
 * with no record, no commission, no provider dashboard visibility.
 *
 * The bridge: on a COMPLETED consultation the devotee sees
 * "🙏 Send dakshina" → amount + currency sheet → one tap creates a
 * proper rail-1 `marketplaceOrders` doc linked to the consultation.
 * The jyotishi sees it in their existing ProviderMarketplace dashboard;
 * the rail-1 lifecycle (pending_payment → provider confirms receipt →
 * paid) handles the rest. Dakshina language throughout — gratitude,
 * never a paywall. Never auto-charges.
 *
 * This module is PURE and jest-safe (no firebase imports). The Firestore
 * write path lives in dakshinaOrders.ts.
 *
 * Rules compliance (verified, zero rules changes):
 * - marketplaceOrders create: clientUid == auth.uid + status ==
 *   'pending_payment'. No field whitelist — consultation-linked fields
 *   (consultationId, gigTitle describing the consultation) pass.
 * - Dedupe link: the devotee (a consultation party) may update the
 *   consultation with from == to status to add `dakshinaOrderId`
 *   (consultationTransitionOk allows from==to; consultationImmutableOk
 *   pins only devoteeUid/id/createdAt/referredBy).
 */
import type { Consultation } from '../types/jyotish';

/** Marker gigId for consultation dakshina orders (consultations are not gigs). */
export const CONSULTATION_DAKSHINA_GIG_ID = 'consultation-dakshina';

export interface DakshinaEligibility {
  ok: boolean;
  /** Machine-readable reason when not ok. */
  reason?:
    | 'not_devotee'
    | 'not_completed'
    | 'no_jyotish'
    | 'already_sent'
    | 'no_amount';
}

export interface DakshinaOrderInput {
  consultation: Consultation;
  amount: number;
  currency: string;
}

/**
 * Pure guard: may this user send dakshina for this consultation?
 * - Must be the devotee who posted it.
 * - Consultation must be COMPLETED (or already DAKSHINA_RELEASED without an order).
 * - Must have an assigned jyotishi.
 * - Must not already have a dakshina order (dedupe).
 */
export function canSendDakshina(
  c: Consultation,
  currentUid: string | null | undefined,
): DakshinaEligibility {
  if (!currentUid || c.devoteeUid !== currentUid) return { ok: false, reason: 'not_devotee' };
  if (c.status !== 'COMPLETED' && c.status !== 'DAKSHINA_RELEASED')
    return { ok: false, reason: 'not_completed' };
  if (!c.assignedJyotishUid) return { ok: false, reason: 'no_jyotish' };
  if ((c as Consultation & { dakshinaOrderId?: string }).dakshinaOrderId)
    return { ok: false, reason: 'already_sent' };
  return { ok: true };
}

/** Pure: sensible amount prefill — agreed > budget max > empty. */
export function defaultDakshinaAmount(c: Consultation): string {
  if (c.dakshinaAgreed && c.dakshinaAgreed > 0) return String(Math.round(c.dakshinaAgreed));
  if (c.budgetMax && c.budgetMax > 0) return String(Math.round(c.budgetMax));
  return '';
}

/** Pure: amount must be a positive whole number within sane bounds. */
export function validateDakshinaAmount(raw: string): { ok: boolean; amount?: number; error?: string } {
  const n = Math.round(Number(raw));
  if (!raw.trim() || !Number.isFinite(n) || n <= 0)
    return { ok: false, error: 'Enter a dakshina amount.' };
  if (n > 1000000) return { ok: false, error: 'That amount looks too large — please check.' };
  return { ok: true, amount: n };
}

/** Pure: builds the marketplaceOrders payload (mirrors createOrder's shape).
 *  Commission fields + createdAt are filled by dakshinaOrders.ts (async). */
export function buildDakshinaOrderPayload(input: DakshinaOrderInput): Record<string, unknown> {
  const { consultation: c, amount, currency } = input;
  return {
    gigId: CONSULTATION_DAKSHINA_GIG_ID,
    gigTitle: `🔮 ${c.consultationType} — consultation dakshina`,
    consultationId: c.id,
    providerUid: c.assignedJyotishUid,
    providerType: 'jyotishi',
    providerName: c.assignedJyotishName || '',
    clientUid: c.devoteeUid,
    clientName: c.devoteeName || '',
    amountGross: amount,
    currency,
    // Commission is filled by createConsultationDakshinaOrder (async).
    rail: 'rail1',
    paymentMethodId: 'direct',
    paymentRef: '',
    payWithWallet: false,
    payAfterTask: false,
    status: 'pending_payment',
    clientNotes: `Dakshina for ${c.consultationType} consultation (${c.id}). Pay the jyotishi directly via bKash / Nagad / UPI / cash.`,
  };
}

/** Pure: warm order summary line for the confirm sheet. */
export function dakshinaSummary(amount: number, currency: string): string {
  const symbols: Record<string, string> = { BDT: '৳', INR: '₹', USD: '$' };
  const sym = symbols[currency] || '₹';
  const grouped = amount.toLocaleString(currency === 'USD' ? 'en-US' : 'en-IN');
  return `${sym}${grouped} 🙏`;
}

/* ------------------------- Trilingual copy ------------------------- */

export type DakshinaLang = 'en' | 'hi' | 'bn';

export const DAKSHINA_COPY: Record<DakshinaLang, {
  sendDakshina: string;
  sheetTitle: string;
  sheetSub: string;
  amountLabel: string;
  currencyLabel: string;
  confirm: string;
  cancel: string;
  sending: string;
  sent: string;
  sentSub: string;
  alreadySent: string;
  directNote: string;
}> = {
  en: {
    sendDakshina: '🙏 Send dakshina',
    sheetTitle: 'Offer dakshina with gratitude',
    sheetSub: 'Your consultation is complete. This records your dakshina properly — the jyotishi will confirm once received.',
    amountLabel: 'Dakshina amount',
    currencyLabel: 'Currency',
    confirm: '🙏 Send dakshina',
    cancel: 'Not now',
    sending: 'Sending…',
    sent: 'Dakshina recorded 🙏',
    sentSub: 'Pay the jyotishi directly. They will confirm receipt in their dashboard.',
    alreadySent: 'Dakshina already recorded for this consultation.',
    directNote: 'Pay directly via bKash / Nagad / UPI / cash — no money moves inside the app until confirmed.',
  },
  hi: {
    sendDakshina: '🙏 दक्षिणा भेजें',
    sheetTitle: 'कृतज्ञता के साथ दक्षिणा अर्पित करें',
    sheetSub: 'आपका परामर्श पूर्ण हो गया है। इससे आपकी दक्षिणा का उचित रिकॉर्ड बनेगा — ज्योतिषी प्राप्ति पर पुष्टि करेंगे।',
    amountLabel: 'दक्षिणा राशि',
    currencyLabel: 'मुद्रा',
    confirm: '🙏 दक्षिणा भेजें',
    cancel: 'अभी नहीं',
    sending: 'भेजा जा रहा है…',
    sent: 'दक्षिणा दर्ज हो गई 🙏',
    sentSub: 'ज्योतिषी को सीधे भुगतान करें। वे अपने डैशबोर्ड में प्राप्ति की पुष्टि करेंगे।',
    alreadySent: 'इस परामर्श की दक्षिणा पहले से दर्ज है।',
    directNote: 'bKash / Nagad / UPI / नकद से सीधे भुगतान करें — पुष्टि तक ऐप में कोई पैसा नहीं चलता।',
  },
  bn: {
    sendDakshina: '🙏 দক্ষিণা পাঠান',
    sheetTitle: 'কৃতজ্ঞতার সাথে দক্ষিণা অর্পণ করুন',
    sheetSub: 'আপনার পরামর্শ সম্পূর্ণ হয়েছে। এতে আপনার দক্ষিণার সঠিক রেকর্ড থাকবে — জ্যোতিষী প্রাপ্তির পর নিশ্চিত করবেন।',
    amountLabel: 'দক্ষিণার পরিমাণ',
    currencyLabel: 'মুদ্রা',
    confirm: '🙏 দক্ষিণা পাঠান',
    cancel: 'এখন নয়',
    sending: 'পাঠানো হচ্ছে…',
    sent: 'দক্ষিণা রেকর্ড হয়েছে 🙏',
    sentSub: 'জ্যোতিষীকে সরাসরি পেমেন্ট করুন। তিনি তার ড্যাশবোর্ডে প্রাপ্তি নিশ্চিত করবেন।',
    alreadySent: 'এই পরামর্শের দক্ষিণা ইতিমধ্যে রেকর্ড করা হয়েছে।',
    directNote: 'বিকাশ / নগদ / UPI / নগদে সরাসরি পেমেন্ট করুন — নিশ্চিত না হওয়া পর্যন্ত অ্যাপে কোনো টাকা চলে না।',
  },
};

export function toDakshinaLang(lang: string): DakshinaLang {
  if (lang === 'hi') return 'hi';
  if (lang === 'bn') return 'bn';
  return 'en';
}
