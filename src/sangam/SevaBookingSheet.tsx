/* Seva Bazar Phase 2 — booking bottom sheet.
 * =====================================================================
 * The devotee books a seva from a service card: mode → muhurat →
 * sankalpa → dakshina + shradhā → confirm → token advance → done.
 * ≤5 taps, selection-only (typing only for names). Follows the
 * ExpressDanaSheet pattern: fixed inset-0 z-[130], bottom sheet,
 * ≥44px targets, warm Sanatani copy — dakshina language, never
 * escrow/SaaS-speak.
 *
 * Money engine: the EXISTING marketplace rails (marketplaceOrders,
 * rail2, commission snapshot, disputes). This sheet only shapes the
 * devotee-facing flow.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { SangamPost } from './types';
import { T } from '../solo/ui';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { GUIDES, useGuide, TourPill, CoachMark } from '../components/guide';
import { formatServiceDakshina } from './ServiceCardPost';
import {
  SHRADHA_STEPS,
  computeBookingTotal,
  suggestTokenAdvance,
  suggestMuhuratSlots,
  validateBookingDraft,
  advanceRailLabel,
  bookingModeLabel,
  type AdvanceRail,
  type BookingDraft,
  type BookingMode,
} from './sevaBooking';
import { createSevaBazarOrder, submitAdvanceProof } from '../lib/sevaBazarOrders';
import { extractReferrer, resolveReferralAttribution } from './referrals';
import { recordReferralClaim } from './referralThanksService';
import { getOrCreateDirectChat, sendMessage } from '../chat/chatService';
import type { ChatParticipant } from '../chat/types';

export interface SevaBookingSheetProps {
  post: SangamPost;
  viewer: { uid: string; name: string; sanId?: string };
  onClose: () => void;
  /** Order created and thread ready — parent opens the Chat UI. */
  onBooked: (orderId: string, chatId: string) => void;
}

type Screen = 'form' | 'advance' | 'done';

const RAILS: AdvanceRail[] = ['upi', 'bkash', 'nagad', 'other'];

function toTierLang(currentLang: string): 'en' | 'hi' | 'bn' {
  return currentLang === 'hi' ? 'hi' : currentLang === 'bn' ? 'bn' : 'en';
}

export const SevaBookingSheet: React.FC<SevaBookingSheetProps> = ({
  post,
  viewer,
  onClose,
  onBooked,
}) => {
  const card = post.serviceCard;
  const { currentLang } = useLanguage();
  const lang = toTierLang(currentLang);
  const { showToast } = useToast();
  const guide = useGuide('sevaBooking', viewer.uid || 'anon');

  const [screen, setScreen] = useState<Screen>('form');
  const [draft, setDraft] = useState<BookingDraft>({
    mode: card && card.modes.length === 1 ? card.modes[0] : null,
    slotId: null,
    name: viewer.name || '',
    gotra: '',
    notes: '',
  });
  const [shradhaIdx, setShradhaIdx] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [rail, setRail] = useState<AdvanceRail>('upi');
  const [trxId, setTrxId] = useState('');
  const [advanceBusy, setAdvanceBusy] = useState(false);

  const slots = useMemo(() => suggestMuhuratSlots(new Date(), lang), [lang]);
  const shradhaPct = SHRADHA_STEPS[shradhaIdx] ?? 0;
  const totals = useMemo(
    () => computeBookingTotal(card?.dakshina ?? 0, shradhaPct),
    [card, shradhaPct]
  );
  const advance = useMemo(() => suggestTokenAdvance(totals.total), [totals.total]);
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!card) return null;

  const set = <K extends keyof BookingDraft>(k: K, v: BookingDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const money = (n: number) => formatServiceDakshina(n, card.currency);

  const confirmBooking = async () => {
    const violations = validateBookingDraft(draft, lang);
    if (violations.length > 0) {
      showToast(violations[0].message, 'warning');
      return;
    }
    if (viewer.uid === 'anon') {
      showToast(
        lang === 'bn' ? 'বুক করতে সাইন ইন করুন 🙏' : lang === 'hi' ? 'बुक करने के लिए साइन इन करें 🙏' : 'Please sign in to book 🙏',
        'error'
      );
      return;
    }
    const slot = slots.find((s) => s.id === draft.slotId);
    if (!slot || !draft.mode) return;
    setSubmitting(true);
    try {
      // Referral attribution: if the booker arrived via a shared link (?ref=SAN-XXXXXX),
      // credit the sharer. QUEUED #25: the self-guard is actually wired now —
      // resolveReferralAttribution drops self-referrals and unverifiable
      // attributions silently (the booking proceeds untouched either way).
      const referrer = resolveReferralAttribution(
        extractReferrer(window.location.search),
        viewer.sanId,
      );
      const id = await createSevaBazarOrder({
        serviceCardPostId: post.id,
        providerUid: card.providerUid,
        providerName: card.providerName,
        providerTier: card.providerTier,
        serviceLine: card.serviceLine,
        mode: draft.mode,
        slot,
        devoteeName: draft.name.trim(),
        gotra: draft.gotra.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        currency: card.currency,
        dakshinaSuggested: totals.base,
        shradhaPct,
        shradhaExtra: totals.extra,
        amountGross: totals.total,
        tokenAdvance: advance,
        ...(referrer ? { referredBy: referrer } : {}),
      });
      // Sharer thanks claim (QUEUED #25): leave the small claim row the
      // sharer's own device self-listens for. Fire-and-forget — it can
      // never fail or delay the booking.
      if (referrer) {
        void recordReferralClaim({
          orderId: id,
          sharerSanId: referrer,
          providerName: card.providerName,
          bookerUid: viewer.uid,
        });
      }
      // Lazy chat thread with the booking as context — feed discovers,
      // chat checks out.
      const selfInfo: ChatParticipant = { uid: viewer.uid, displayName: viewer.name || 'Sanatani' };
      const providerInfo: ChatParticipant = { uid: card.providerUid, displayName: card.providerName };
      const cid = await getOrCreateDirectChat(viewer.uid, card.providerUid, selfInfo, providerInfo);
      const summary =
        lang === 'bn'
          ? `🪔 সেবা বুকিং — "${card.serviceLine}" (${bookingModeLabel(draft.mode, lang)}, ${slot.dayLabel}) · দক্ষিণা ${money(totals.total)}${totals.extra > 0 ? ` (শ্রদ্ধা ${money(totals.extra)} সহ)` : ''} · মুহূর্ত ধরে রাখতে টোকেন অগ্রিম ${money(advance)}।`
          : lang === 'hi'
            ? `🪔 सेवा बुकिंग — "${card.serviceLine}" (${bookingModeLabel(draft.mode, lang)}, ${slot.dayLabel}) · दक्षिणा ${money(totals.total)}${totals.extra > 0 ? ` (श्रद्धा ${money(totals.extra)} सहित)` : ''} · मुहूर्त हेतु टोकन अग्रिम ${money(advance)}।`
            : `🪔 Seva booking — "${card.serviceLine}" (${bookingModeLabel(draft.mode, lang)}, ${slot.dayLabel}) · Dakshina ${money(totals.total)}${totals.extra > 0 ? ` (incl. ${money(totals.extra)} shradhā)` : ''} · Token advance ${money(advance)} to hold the muhurat.`;
      try {
        await sendMessage(cid, viewer.uid, 'text', summary);
      } catch {
        /* offline — the order is queued, the message follows on sync */
      }
      setOrderId(id);
      setChatId(cid);
      setScreen('advance');
    } catch (e: unknown) {
      showToast(
        (e as Error)?.message ||
          (lang === 'bn' ? 'বুকিং করা যায়নি — আবার চেষ্টা করুন' : lang === 'hi' ? 'बुकिंग नहीं हो पाई — पुनः प्रयास करें' : 'Booking could not be placed — please try again'),
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitAdvance = async () => {
    if (!orderId || !chatId) return;
    if (trxId.trim().length < 4) {
      showToast(
        lang === 'bn'
          ? 'পেমেন্ট অ্যাপ থেকে লেনদেন রেফারেন্স দিন 🙏'
          : lang === 'hi'
            ? 'पेमेंट ऐप से लेनदेन संदर्भ डालें 🙏'
            : 'Enter the transaction reference from your payment app 🙏',
        'warning'
      );
      return;
    }
    setAdvanceBusy(true);
    try {
      await submitAdvanceProof({ orderId, trxId: trxId.trim(), rail });
      // The WhatsApp receipt-as-invoice, formalized — rides in the thread.
      try {
        await sendMessage(chatId, viewer.uid, 'receipt', `🧾 ${money(advance)}`, {
          receiptMeta: {
            orderId,
            amount: advance,
            currency: card.currency,
            trxId: trxId.trim().slice(0, 80),
            rail,
            providerUid: card.providerUid,
            providerName: card.providerName,
          },
        });
      } catch {
        /* offline — queued with the proof */
      }
      setScreen('done');
    } catch (e: unknown) {
      showToast(
        (e as Error)?.message ||
          (lang === 'bn' ? 'অগ্রিম জমা দেওয়া যায়নি' : lang === 'hi' ? 'अग्रिम दर्ज नहीं हो पाया' : 'Advance could not be recorded'),
        'error'
      );
    } finally {
      setAdvanceBusy(false);
    }
  };

  const skipAdvance = () => setScreen('done');

  return (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-temple-950/60" onClick={onClose} aria-hidden />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92dvh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur px-4 py-3 border-b border-amber-100">
          <div>
            <h3 className="text-base font-extrabold text-stone-800">
              {screen === 'form' && <T en="Book seva 🪔" hi="सेवा बुक करें 🪔" bn="সেবা বুক করুন 🪔" />}
              {screen === 'advance' && <T en="Token advance" hi="टोकन अग्रिम" bn="টোকেন অগ্রিম" />}
              {screen === 'done' && <T en="Dhanyavaad 🙏" hi="धन्यवाद 🙏" bn="ধন্যবাদ 🙏" />}
            </h3>
            <p className="text-xs text-stone-500">
              {card.serviceLine} · {card.providerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {offline && (
            <p className="mb-3 rounded-xl bg-sky-50 border border-sky-200 px-3.5 py-2.5 text-xs text-sky-900">
              <T
                en="You're offline — your booking is saved on this device and will reach the provider when you're back online."
                hi="आप ऑफ़लाइन हैं — आपकी बुकिंग इस डिवाइस पर सहेजी है और ऑनलाइन आते ही प्रदाता तक पहुँचेगी।"
                bn="আপনি অফলাইনে — আপনার বুকিং এই ডিভাইসে সংরক্ষিত, অনলাইনে এলেই প্রদানকারীর কাছে পৌঁছাবে।"
              />
            </p>
          )}

          {screen === 'form' && (
            <div className="space-y-5">
              {/* Mode chips */}
              <div data-guide-anchor="sevabooking-mode">
                <p className="text-sm font-extrabold text-stone-800 mb-2">
                  <T en="How shall the seva reach you?" hi="सेवा आप तक कैसे पहुँचे?" bn="সেবা কীভাবে আপনার কাছে পৌঁছাবে?" />
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {card.modes.map((m: BookingMode) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => set('mode', m)}
                      aria-pressed={draft.mode === m}
                      className={`min-h-[52px] rounded-xl border-2 text-sm font-bold transition-colors ${
                        draft.mode === m
                          ? 'border-amber-600 bg-amber-50 text-amber-900'
                          : 'border-stone-200 text-stone-600'
                      }`}
                    >
                      {m === 'home' ? '🏠' : m === 'temple' ? '🛕' : '📹'}{' '}
                      <T
                        en={bookingModeLabel(m, 'en')}
                        hi={bookingModeLabel(m, 'hi')}
                        bn={bookingModeLabel(m, 'bn')}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Muhurat slots */}
              <div data-guide-anchor="sevabooking-muhurat">
                <p className="text-sm font-extrabold text-stone-800 mb-2">
                  <T en="Choose a preferred morning" hi="एक पसंदीदा सुबह चुनें" bn="একটি পছন্দের সকাল বেছে নিন" />
                </p>
                <div className="space-y-2">
                  {slots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => set('slotId', s.id)}
                      aria-pressed={draft.slotId === s.id}
                      className={`w-full min-h-[56px] rounded-xl border-2 px-4 py-2.5 text-left transition-colors ${
                        draft.slotId === s.id
                          ? 'border-amber-600 bg-amber-50'
                          : 'border-stone-200'
                      }`}
                    >
                      <span className="block text-sm font-extrabold text-stone-800">
                        🌅 {s.dayLabel}
                      </span>
                      <span className="block text-xs text-stone-500 mt-0.5">
                        {s.tithi} ·{' '}
                        <T en="morning window" hi="सुबह का समय" bn="সকালের সময়" />
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-stone-500 mt-1.5">
                  <T
                    en="Panditji confirms the exact muhurat with you in chat."
                    hi="पंडितजी चैट में आपसे सही मुहूर्त पक्का करेंगे।"
                    bn="পণ্ডিতজি চ্যাটে আপনার সঙ্গে সঠিক মুহূর্ত ঠিক করবেন।"
                  />
                </p>
              </div>

              {/* Sankalpa details */}
              <div className="space-y-3">
                <p className="text-sm font-extrabold text-stone-800">
                  <T en="Sankalpa details" hi="संकल्प विवरण" bn="সংকল্পের বিবরণ" />
                </p>
                <label className="block">
                  <span className="text-xs font-semibold text-stone-600">
                    <T en="Name for the sankalpa *" hi="संकल्प हेतु नाम *" bn="সংকল্পের জন্য নাম *" />
                  </span>
                  <input
                    value={draft.name}
                    onChange={(e) => set('name', e.target.value)}
                    className="mt-1 w-full px-3.5 py-3 rounded-xl border border-stone-300 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="—"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-stone-600">
                    <T en="Gotra (optional)" hi="गोत्र (वैकल्पिक)" bn="গোত্র (ঐচ্ছিক)" />
                  </span>
                  <input
                    value={draft.gotra}
                    onChange={(e) => set('gotra', e.target.value)}
                    className="mt-1 w-full px-3.5 py-3 rounded-xl border border-stone-300 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="—"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-stone-600">
                    <T en="Notes (optional)" hi="नोट (वैकल्पिक)" bn="নোট (ঐচ্ছিক)" />
                  </span>
                  <textarea
                    value={draft.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    rows={2}
                    className="mt-1 w-full px-3.5 py-3 rounded-xl border border-stone-300 text-sm min-h-[48px] focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    placeholder="—"
                  />
                </label>
              </div>

              {/* Shradhā slider */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-extrabold text-amber-900">
                    <T en="Add a little extra as shradhā" hi="श्रद्धा के रूप में थोड़ा अतिरिक्त दें" bn="শ্রদ্ধা হিসেবে একটু বাড়তি দিন" />
                  </span>
                  <span className="text-sm font-black text-amber-700">+{shradhaPct}%</span>
                </div>
                <p className="text-xs text-stone-600 mb-2">
                  <T
                    en="More, never less — and always your choice. 🪔"
                    hi="अधिक ही, कभी कम नहीं — और हमेशा आपकी इच्छा। 🪔"
                    bn="বেশিই, কখনও কম নয় — আর সবসময় আপনার ইচ্ছা। 🪔"
                  />
                </p>
                <input
                  type="range"
                  min={0}
                  max={SHRADHA_STEPS.length - 1}
                  step={1}
                  value={shradhaIdx}
                  onChange={(e) => setShradhaIdx(Number(e.target.value))}
                  className="w-full h-11 accent-amber-700 cursor-pointer"
                  aria-label="Shradhā percent"
                />
              </div>

              {/* Dakshina Suraksha explainer */}
              <div data-guide-anchor="sevabooking-suraksha" className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <p className="text-sm font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <span aria-hidden>🛡</span>
                  <T en="Dakshina Suraksha" hi="दक्षिणा सुरक्षा" bn="দক্ষিণা সুরক্ষা" />
                </p>
                <ul className="mt-2 space-y-1 text-xs text-stone-600 leading-relaxed list-none">
                  <li>
                    <T
                      en="✓ Only a small token advance holds your muhurat — the rest after the seva."
                      hi="✓ केवल छोटा टोकन अग्रिम आपका मुहूर्त रखता है — शेष सेवा के बाद।"
                      bn="✓ শুধু ছোট টোকেন অগ্রিম আপনার মুহূর্ত ধরে রাখে — বাকিটা সেবার পর।"
                    />
                  </li>
                  <li>
                    <T
                      en="✓ Your advance proof is recorded — the provider confirms receipt in chat."
                      hi="✓ आपका अग्रिम प्रमाण दर्ज होता है — प्रदाता चैट में प्राप्ति की पुष्टि करते हैं।"
                      bn="✓ আপনার অগ্রিমের প্রমাণ লিপিবদ্ধ হয় — প্রদানকারী চ্যাটে প্রাপ্তি নিশ্চিত করেন।"
                    />
                  </li>
                  <li>
                    <T
                      en="✓ We only coordinate — your money moves directly, never through us."
                      hi="✓ हम केवल समन्वय करते हैं — आपका धन सीधे जाता है, हमारे माध्यम से कभी नहीं।"
                      bn="✓ আমরা শুধু সমন্বয় করি — আপনার অর্থ সরাসরি যায়, আমাদের মাধ্যমে কখনও নয়।"
                    />
                  </li>
                </ul>
              </div>

              {/* Total + confirm */}
              <div className="rounded-2xl bg-stone-900 text-amber-50 p-4 flex items-center justify-between">
                <span className="text-sm font-bold opacity-80">
                  <T en="Dakshina" hi="दक्षिणा" bn="দক্ষিণা" />
                </span>
                <span className="text-2xl font-black tabular-nums">
                  {money(totals.total)}
                  {totals.extra > 0 && (
                    <span className="block text-[11px] font-bold opacity-70 text-right">
                      {money(totals.base)} + {money(totals.extra)}{' '}
                      <T en="shradhā" hi="श्रद्धा" bn="শ্রদ্ধা" />
                    </span>
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={confirmBooking}
                disabled={submitting}
                className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white text-base font-bold shadow disabled:opacity-50 active:scale-[0.99]"
              >
                {submitting ? (
                  <T en="Sending…" hi="भेजा जा रहा…" bn="পাঠানো হচ্ছে…" />
                ) : (
                  <T en="🪔 Confirm booking" hi="🪔 बुकिंग पक्का करें" bn="🪔 বুকিং নিশ্চিত করুন" />
                )}
              </button>
            </div>
          )}

          {screen === 'advance' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-xs font-bold text-stone-500">
                  <T en="Token advance to hold your muhurat" hi="मुहूर्त हेतु टोकन अग्रिम" bn="মুহূর্তের জন্য টোকেন অগ্রিম" />
                </p>
                <p className="text-3xl font-black text-amber-900 tabular-nums mt-1">{money(advance)}</p>
                <p className="text-[11px] text-stone-500 mt-1">
                  <T
                    en="of your total dakshina — the rest after the seva."
                    hi="आपकी कुल दक्षिणा में से — शेष सेवा के बाद।"
                    bn="আপনার মোট দক্ষিণার — বাকিটা সেবার পর।"
                  />
                </p>
              </div>

              <p className="text-sm text-stone-600 leading-relaxed">
                <T
                  en="Ask in the chat below for the provider's UPI / bKash / Nagad number — then come back and share your transaction reference. The provider taps Received ✓, and your muhurat is held. 🪔"
                  hi="चैट में प्रदाता से उनका UPI / bKash / Nagad नंबर माँगें — फिर लौटकर अपना लेनदेन संदर्भ साझा करें। प्रदाता Received ✓ दबाएँगे, और आपका मुहूर्त सुरक्षित। 🪔"
                  bn="চ্যাটে প্রদানকারীর কাছে তার UPI / বিকাশ / নগদ নম্বর চান — তারপর ফিরে এসে লেনদেন রেফারেন্স দিন। প্রদানকারী Received ✓ চাপবেন, আর আপনার মুহূর্ত সংরক্ষিত। 🪔"
                />
              </p>

              <div>
                <p className="text-xs font-bold text-stone-600 mb-2">
                  <T en="Paid via" hi="भुगतान माध्यम" bn="পেমেন্ট মাধ্যম" />
                </p>
                <div className="flex flex-wrap gap-2">
                  {RAILS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRail(r)}
                      aria-pressed={rail === r}
                      className={`min-h-[44px] px-4 rounded-full border-2 text-sm font-bold ${
                        rail === r ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-stone-200 text-stone-600'
                      }`}
                    >
                      <T en={advanceRailLabel(r, 'en')} hi={advanceRailLabel(r, 'hi')} bn={advanceRailLabel(r, 'bn')} />
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-stone-600">
                  <T en="Transaction reference *" hi="लेनदेन संदर्भ *" bn="লেনদেন রেফারেন্স *" />
                </span>
                <input
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="mt-1 w-full px-3.5 py-3 rounded-xl border border-stone-300 text-sm min-h-[48px] font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="UTR / TrxID"
                  autoComplete="off"
                />
              </label>

              <button
                type="button"
                onClick={submitAdvance}
                disabled={advanceBusy}
                className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 text-white text-base font-bold shadow disabled:opacity-50"
              >
                {advanceBusy ? (
                  <T en="Recording…" hi="दर्ज हो रहा…" bn="লেখা হচ্ছে…" />
                ) : (
                  <T en="✓ I've sent the advance" hi="✓ मैंने अग्रिम भेज दिया" bn="✓ আমি অগ্রিম পাঠিয়েছি" />
                )}
              </button>
              <button
                type="button"
                onClick={skipAdvance}
                className="w-full min-h-[44px] text-sm font-bold text-stone-500 hover:text-stone-700"
              >
                <T en="I'll do this later" hi="मैं बाद में करूँगा/करूँगी" bn="পরে করব" />
              </button>
            </div>
          )}

          {screen === 'done' && (
            <div className="space-y-4 text-center py-2">
              <div className="text-5xl" aria-hidden>
                🪔
              </div>
              <h4 className="text-lg font-extrabold text-stone-900">
                <T en="Booking placed" hi="बुकिंग हो गई" bn="বুকিং সম্পন্ন" />
              </h4>
              <p className="text-sm text-stone-600 max-w-xs mx-auto leading-relaxed">
                <T
                  en="Your request is with the provider. Chat with them to confirm the muhurat and samagri — all coordination happens there, warmly."
                  hi="आपका अनुरोध प्रदाता के पास है। मुहूर्त और सामग्री पक्का करने के लिए उनसे चैट करें — सारा समन्वय वहीं, स्नेह से।"
                  bn="আপনার অনুরোধ প্রদানকারীর কাছে। মুহূর্ত ও সামগ্রী ঠিক করতে তার সঙ্গে চ্যাট করুন — সব সমন্বয় সেখানেই, আন্তরিকভাবে।"
                />
              </p>
              <button
                type="button"
                onClick={() => orderId && chatId && onBooked(orderId, chatId)}
                className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white text-base font-bold shadow"
              >
                <T en="💬 Chat with the provider" hi="💬 प्रदाता से चैट करें" bn="💬 প্রদানকারীর সঙ্গে চ্যাট করুন" />
              </button>
            </div>
          )}
        </div>
      </div>

      {guide.pillVisible && (
        <TourPill guide={GUIDES.sevaBooking} uid={viewer.uid || 'anon'} onStart={guide.start} onDismiss={guide.dismissPill} />
      )}
      {guide.tourActive && <CoachMark guide={GUIDES.sevaBooking} onFinish={guide.finish} />}
    </div>
  );
};

export default SevaBookingSheet;
