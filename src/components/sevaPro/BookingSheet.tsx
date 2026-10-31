/**
 * Seva Professional Program — Phase 1
 * Tabbed booking sheet for the unified profile.
 * ============================================================================
 * - Purohit + Jyotishi present → two tabs ("Purohit Seva" | "Jyotish
 *   Consultation"), matching the profile's Book CTA.
 * - Single specialization → that tab only.
 *
 * Booking writes use the EXISTING marketplace collections + rules:
 * the devotee creates an OPEN gig/consultation addressed to this professional
 * (assignedPurohitUid / assignedJyotishUid pre-set); the professional accepts
 * through the existing claim transition in PurohitContext/JyotishContext.
 * No rule changes needed — Phase 2 (commission pre-funding) will extend this.
 *
 * Sign-in is required to book; guests see a warm sign-in prompt.
 */
import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useLanguage } from '../../context/LanguageContext';
import { GUIDES, useGuide, TourPill, TourLink, CoachMark, WhatsThis } from '../guide';
import { RITUAL_TYPES } from '../../types/purohit';
import {
  CONSULTATION_TYPES,
  type ConsultationType,
} from '../../types/jyotish';
import type {
  SpecializationKind,
  UnifiedProfessional,
} from '../../lib/sevaPro/profile';
import { JyotishAvailabilityNote, JyotishAvailabilityStrip } from '../../jyotish/JyotishAvailability';
import { useGeoCurrency } from '../../jyotish/useGeoCurrency';

interface BookingSheetProps {
  profile: UnifiedProfessional;
  initialTab: SpecializationKind;
  onClose: () => void;
}

const inputCls =
  'w-full px-3.5 py-3 rounded-xl border border-stone-300 text-sm min-h-[48px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-400';

export const BookingSheet: React.FC<BookingSheetProps> = ({
  profile,
  initialTab,
  onClose,
}) => {
  const { safeTranslate } = useLanguage();
  const tx = (en: string, bn: string, hi: string) => safeTranslate('', en, bn, hi);
  // JY-FIX-B (JY-14): the budget label follows the booker's currency.
  const { symbol } = useGeoCurrency();

  const tabs: SpecializationKind[] = [
    ...(profile.hasPurohit ? (['purohit'] as SpecializationKind[]) : []),
    ...(profile.hasJyotish ? (['jyotish'] as SpecializationKind[]) : []),
  ];
  const [tab, setTab] = useState<SpecializationKind>(
    tabs.includes(initialTab) ? initialTab : tabs[0]
  );

  const [ritualType, setRitualType] = useState<string>(RITUAL_TYPES[0]);
  const [consultType, setConsultType] = useState<ConsultationType>(CONSULTATION_TYPES[0]);
  const [mode, setMode] = useState<'chat' | 'call' | 'video'>('chat');
  const [preferredDate, setPreferredDate] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('');
  const [budget, setBudget] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const user = auth.currentUser;
  // Quick Guide: booking flow explainer — invitational, never auto-playing
  // on this money screen.
  const bookingGuide = useGuide('booking', user?.uid || 'anon');

  const parseBudget = (): [number, number] => {
    const nums = budget
      .split(/[-–]/)
      .map((s) => parseInt(s.replace(/[^0-9]/g, ''), 10))
      .filter((n) => !Number.isNaN(n));
    if (nums.length === 0) return [0, 0];
    if (nums.length === 1) return [nums[0], nums[0]];
    return [Math.min(nums[0], nums[1]), Math.max(nums[0], nums[1])];
  };

  const submit = async () => {
    setError('');
    if (!user) {
      setError(
        tx(
          'Please sign in to place a booking.',
          'বুকিং করতে অনুগ্রহ করে সাইন ইন করুন।',
          'बुकिंग के लिए कृपया साइन इन करें।'
        )
      );
      return;
    }
    if (!preferredDate) {
      setError(
        tx(
          'Please choose a preferred date.',
          'অনুগ্রহ করে পছন্দের তারিখ বেছে নিন।',
          'कृपया पसंदीदा तिथि चुनें।'
        )
      );
      return;
    }
    setSubmitting(true);
    try {
      const ts = Date.now();
      const devoteeName = user.displayName || user.email || 'Devotee';
      const [budgetMin, budgetMax] = parseBudget();

      if (tab === 'purohit' && profile.purohit) {
        const ref = doc(collection(db, 'gigs'));
        await setDoc(ref, {
          id: ref.id,
          ritualType,
          preferredDate,
          city: city.trim(),
          language: language.trim() || (profile.languages[0] || ''),
          budgetMin,
          budgetMax,
          notes: notes.trim(),
          devoteeUid: user.uid,
          devoteeName,
          status: 'OPEN',
          assignedPurohitId: profile.purohit.id,
          assignedPurohitUid: profile.uid,
          assignedPurohitName: profile.purohit.displayName,
          createdAt: ts,
          updatedAt: ts,
        });
      } else if (tab === 'jyotish' && profile.jyotish) {
        const ref = doc(collection(db, 'jyotishConsultations'));
        await setDoc(ref, {
          id: ref.id,
          consultationType: consultType,
          birthDate: birthDate || '',
          birthTime: birthTime || '',
          birthPlace: birthPlace.trim() || '',
          preferredDate,
          mode,
          city: city.trim(),
          language: language.trim() || (profile.languages[0] || ''),
          budgetMin,
          budgetMax,
          notes: notes.trim(),
          devoteeUid: user.uid,
          devoteeName,
          status: 'OPEN',
          assignedJyotishId: profile.jyotish.id,
          assignedJyotishUid: profile.uid,
          assignedJyotishName: profile.jyotish.displayName,
          createdAt: ts,
          updatedAt: ts,
        });
      } else {
        throw new Error('unavailable');
      }
      setDone(true);
    } catch {
      setError(
        tx(
          'The booking could not be placed. Please check your connection and try again.',
          'বুকিং করা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।',
          'बुकिंग नहीं हो पाई। कृपया कनेक्शन जाँचें और पुनः प्रयास करें।'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/60 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={tx('Book seva', 'সেবা বুক করুন', 'सेवा बुक करें')}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-4 py-3.5 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              {tx('Book Seva', 'সেবা বুক করুন', 'सेवा बुक करें')}
            </h2>
            <p className="text-xs text-stone-500">
              {tx('with', 'সঙ্গে', 'के साथ')} {profile.displayName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tx('Close', 'বন্ধ করুন', 'बंद करें')}
            className="w-11 h-11 rounded-full bg-stone-100 text-stone-700 text-xl flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {done ? (
          <div className="px-5 py-10 text-center">
            <div className="text-5xl mb-3" aria-hidden="true">
              🪔
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-2">
              {tx('Request received', 'অনুরোধ গৃহীত', 'अनुरोध प्राप्त')}
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed max-w-sm mx-auto">
              {tab === 'purohit'
                ? tx(
                    `Dhanyavaad! Your ritual request has been sent to ${profile.displayName}. They will accept it in their Purohit desk and coordinate with you.`,
                    `ধন্যবাদ! আপনার আচার-অনুষ্ঠানের অনুরোধ ${profile.displayName}-এর কাছে পাঠানো হয়েছে। তারা তাদের পুরোহিত ডেস্কে এটি গ্রহণ করে আপনার সঙ্গে সমন্বয় করবেন।`,
                    `धन्यवाद! आपका अनुष्ठान अनुरोध ${profile.displayName} को भेज दिया गया है। वे अपने पुरोहित डेस्क में इसे स्वीकार कर आपसे समन्वय करेंगे।`
                  )
                : tx(
                    `Dhanyavaad! Your consultation request has been sent to ${profile.displayName}. They will accept it in their Jyotish desk and coordinate with you.`,
                    `ধন্যবাদ! আপনার পরামর্শের অনুরোধ ${profile.displayName}-এর কাছে পাঠানো হয়েছে। তারা তাদের জ্যোতিষ ডেস্কে এটি গ্রহণ করে আপনার সঙ্গে সমন্বয় করবেন।`,
                    `धन्यवाद! आपका परामर्श अनुरोध ${profile.displayName} को भेज दिया गया है। वे अपने ज्योतिष डेस्क में इसे स्वीकार कर आपसे समन्वय करेंगे।`
                  )}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 px-6 py-3 min-h-[48px] rounded-xl bg-stone-900 text-white font-bold text-sm"
            >
              {tx('Done', 'সম্পন্ন', 'पूर्ण')}
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {/* Tabs */}
            {tabs.length > 1 && (
              <div
                className="grid grid-cols-2 gap-1 bg-stone-100 rounded-xl p-1"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'purohit'}
                  onClick={() => setTab('purohit')}
                  className={`min-h-[48px] rounded-lg text-sm font-bold ${
                    tab === 'purohit'
                      ? 'bg-white shadow text-amber-900'
                      : 'text-stone-600'
                  }`}
                >
                  🛕 {tx('Purohit Seva', 'পুরোহিত সেবা', 'पुरोहित सेवा')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'jyotish'}
                  onClick={() => setTab('jyotish')}
                  className={`min-h-[48px] rounded-lg text-sm font-bold ${
                    tab === 'jyotish'
                      ? 'bg-white shadow text-amber-900'
                      : 'text-stone-600'
                  }`}
                >
                  🪐 {tx('Jyotish', 'জ্যোতিষ', 'ज्योतिष')}
                </button>
              </div>
            )}

            {!user && (
              <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
                {tx(
                  'Sign in to place a booking — your request goes straight to this professional.',
                  'বুকিং করতে সাইন ইন করুন — আপনার অনুরোধ সরাসরি এই পেশাদারের কাছে যাবে।',
                  'बुकिंग के लिए साइन इन करें — आपका अनुरोध सीधे इस पेशेवर के पास जाएगा।'
                )}
              </p>
            )}

            {tab === 'purohit' ? (
              <>
                <label className="block">
                  <span className="text-xs font-semibold text-stone-600">
                    {tx('Ritual type', 'আচারের ধরন', 'अनुष्ठान का प्रकार')}
                  </span>
                  <select
                    value={ritualType}
                    onChange={(e) => setRitualType(e.target.value)}
                    className={`${inputCls} mt-1`}
                  >
                    {RITUAL_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="text-xs font-semibold text-stone-600">
                    {tx('Consultation type', 'পরামর্শের ধরন', 'परामर्श का प्रकार')}
                  </span>
                  <select
                    value={consultType}
                    onChange={(e) =>
                      setConsultType(e.target.value as ConsultationType)
                    }
                    className={`${inputCls} mt-1`}
                  >
                    {CONSULTATION_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="text-xs font-semibold text-stone-600">
                    {tx('Session mode', 'সেশনের মাধ্যম', 'सत्र का माध्यम')}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {(
                      [
                        ['chat', tx('Chat', 'চ্যাট', 'चैट')],
                        ['call', tx('Call', 'কল', 'कॉल')],
                        ['video', tx('Video', 'ভিডিও', 'वीडियो')],
                      ] as Array<['chat' | 'call' | 'video', string]>
                    ).map(([m, label]) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        className={`min-h-[48px] rounded-xl border text-sm font-semibold ${
                          mode === m
                            ? 'border-amber-500 bg-amber-50 text-amber-900'
                            : 'border-stone-300 text-stone-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1.5">
                    {tx(
                      'Call/video sessions are arranged as shared session links — no telephony is built in.',
                      'কল/ভিডিও সেশন শেয়ার করা সেশন লিঙ্ক হিসেবে সাজানো হয় — কোনো টেলিফোনি অন্তর্ভুক্ত নেই।',
                      'कॉल/वीडियो सत्र साझा सत्र लिंक के रूप में व्यवस्थित होते हैं — कोई टेलीफोनी अंतर्निहित नहीं है।'
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-stone-600">
                      {tx('Birth date', 'জন্ম তারিখ', 'जन्म तिथि')}
                    </span>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-stone-600">
                      {tx('Time', 'সময়', 'समय')}
                    </span>
                    <input
                      type="time"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-stone-600">
                      {tx('Place', 'স্থান', 'स्थान')}
                    </span>
                    <input
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      placeholder="—"
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                </div>
              </>
            )}

            {tab === 'jyotish' && profile.jyotish && (
              <JyotishAvailabilityStrip jyotishId={profile.jyotish.id} />
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-stone-600">
                  {tx('Preferred date', 'পছন্দের তারিখ', 'पसंदीदा तिथि')}
                </span>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-stone-600">
                  {tx('City', 'শহর', 'शहर')}
                </span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={tx('e.g. Varanasi', 'যেমন বারাণসী', 'जैसे वाराणसी')}
                  className={`${inputCls} mt-1`}
                />
              </label>
            </div>

            {/* JY-FIX-B (JY-07b): soft availability note — informational
                only, never a block; the jyotishi confirms personally. */}
            {tab === 'jyotish' && profile.jyotish && (
              <JyotishAvailabilityNote
                jyotishId={profile.jyotish.id}
                dateStr={preferredDate}
                jyotishName={profile.jyotish.displayName}
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-stone-600">
                  {tx('Language', 'ভাষা', 'भाषा')}
                </span>
                <input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder={profile.languages[0] || '—'}
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="block" data-guide-anchor="booking-dakshina">
                <span className="text-xs font-semibold text-stone-600">
                  <WhatsThis compact term="dakshina" label={tx('Dakshina', 'দক্ষিণা', 'दक्षिणा')} />{' '}
                  {tx(`budget (${symbol})`, `বাজেট (${symbol})`, `बजट (${symbol})`)}
                </span>
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder={tx('e.g. 1100-2100', 'যেমন ১১০০-২১০০', 'जैसे 1100-2100')}
                  inputMode="numeric"
                  className={`${inputCls} mt-1`}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-stone-600">
                {tx('Notes for the professional', 'পেশাদারের জন্য নোট', 'पेशेवर के लिए नोट')}
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={tx(
                  'Share anything they should prepare — samagri, family details, your questions…',
                  'তাদের যা প্রস্তুত রাখা উচিত তা জানান — সামগ্রী, পারিবারিক বিবরণ, আপনার প্রশ্ন…',
                  'उन्हें जो तैयार रखना चाहिए वह बताएँ — सामग्री, पारिवारिक विवरण, आपके प्रश्न…'
                )}
                className={`${inputCls} mt-1 resize-none`}
              />
            </label>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting || !user}
              data-guide-anchor="booking-confirm"
              className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-base shadow-md disabled:opacity-50 active:scale-[0.99]"
            >
              {submitting
                ? tx('Sending…', 'পাঠানো হচ্ছে…', 'भेजा जा रहा…')
                : tx(
                    '🪔 Send booking request',
                    '🪔 বুকিং অনুরোধ পাঠান',
                    '🪔 बुकिंग अनुरोध भेजें'
                  )}
            </button>
            <p className="text-[11px] text-stone-500 text-center pb-1" data-guide-anchor="booking-escrow">
              {tx(
                'No payment is taken here — dakshina is agreed directly with the professional.',
                'এখানে কোনো অর্থ নেওয়া হয় না — দক্ষিণা সরাসরি পেশাদারের সঙ্গে ঠিক হয়।',
                'यहाँ कोई भुगतान नहीं लिया जाता — दक्षिणा सीधे पेशेवर से तय होती है।'
              )}
            </p>
            <div className="text-center pb-2">
              <TourLink guide={GUIDES.booking} onRestart={bookingGuide.restart} />
            </div>
          </div>
        )}
      </div>
      {/* Quick Guide: booking flow — invitational only. */}
      {bookingGuide.pillVisible && (
        <TourPill guide={GUIDES.booking} uid={user?.uid || 'anon'} onStart={bookingGuide.start} onDismiss={bookingGuide.dismissPill} />
      )}
      {bookingGuide.tourActive && <CoachMark guide={GUIDES.booking} onFinish={bookingGuide.finish} />}
    </div>
  );
};

export default BookingSheet;
