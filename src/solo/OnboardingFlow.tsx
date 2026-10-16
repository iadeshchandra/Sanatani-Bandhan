/**
 * OnboardingFlow.tsx — 3-question conversational onboarding.
 * =====================================================================
 * Shown once after signup (until the user answers or skips). One
 * question per screen, skippable, non-blocking — the app stays fully
 * usable underneath. Answers become the intentProfile that steers
 * Suchana prioritization.
 *
 * Q1: "What brings you here?" → intent
 * Q2: "Where is home?" → home region (for Panjika accuracy)
 * Q3: "How shall we guide you?" → guidance depth (gentle/regular)
 */
import React, { useState } from 'react';
import { T } from './ui';
import { saveIntentProfile, type IntentKey } from '../lib/intentProfile';

const INTENTS: Array<{
  id: Exclude<IntentKey, 'unknown'>;
  icon: string;
  en: string;
  bn: string;
  hi: string;
  sub: { en: string; bn: string; hi: string };
}> = [
  {
    id: 'practice',
    icon: '🧘',
    en: 'My personal practice',
    bn: 'আমার ব্যক্তিগত সাধনা',
    hi: 'मेरी व्यक्तिगत साधना',
    sub: { en: 'Japa, vratas, Panjika for daily life', bn: 'জপ, ব্রত, দৈনন্দিন পঞ্জিকা', hi: 'जप, व्रत, दैनिक पंजिका' },
  },
  {
    id: 'join',
    icon: '🏛️',
    en: 'Join my temple / organisation',
    bn: 'আমার মন্দির / সংগঠনে যোগ দিন',
    hi: 'मेरे मंदिर / संगठन से जुड़ें',
    sub: { en: 'Follow your institution, join events', bn: 'প্রতিষ্ঠান অনুসরণ, অনুষ্ঠানে যোগ', hi: 'संस्थान से जुड़ें, आयोजनों में भाग लें' },
  },
  {
    id: 'purohit',
    icon: '🪔',
    en: "I'm a purohit / jyotishi",
    bn: 'আমি পুরোহিত / জ্যোতিষী',
    hi: 'मैं पुरोहित / ज्योतिषी हूँ',
    sub: { en: 'Offer sevas, manage bookings', bn: 'সেবা দিন, বুকিং পরিচালনা', hi: 'सेवाएँ दें, बुकिंग प्रबंधित करें' },
  },
  {
    id: 'manage',
    icon: '📊',
    en: 'I manage an institution',
    bn: 'আমি প্রতিষ্ঠান পরিচালনা করি',
    hi: 'मैं संस्थान प्रबंधित करता हूँ',
    sub: { en: 'Treasury, devotees, operations', bn: 'কোষাগার, ভক্ত, পরিচালনা', hi: 'कोषागार, भक्त, संचालन' },
  },
];

export const OnboardingFlow: React.FC<{
  uid: string;
  onDone: () => void;
}> = ({ uid, onDone }) => {
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<IntentKey>('unknown');
  const [saving, setSaving] = useState(false);

  const finish = async (finalIntent: IntentKey, skipped: boolean) => {
    setSaving(true);
    try {
      await saveIntentProfile(uid, finalIntent, skipped);
    } finally {
      setSaving(false);
      onDone();
    }
  };

  const pickIntent = (id: IntentKey) => {
    setIntent(id);
    setStep(1);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-temple-950/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Progress */}
        <div className="h-1 bg-stone-100">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${((step + 1) / 2) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {step === 0 && (
            <div>
              <div className="text-4xl mb-3" aria-hidden>
                🙏
              </div>
              <h2 className="text-lg font-black text-stone-900">
                <T en="What brings you here?" bn="আপনাকে এখানে কী এনেছে?" hi="आप यहाँ क्यों आए हैं?" />
              </h2>
              <p className="text-xs text-stone-500 mt-1 mb-4">
                <T
                  en="This helps Suchana guide you to what matters most."
                  bn="এটি সূচনাকে আপনার জন্য সবচেয়ে গুরুত্বপূর্ণ বিষয়ে পথ দেখাতে সাহায্য করে।"
                  hi="इससे सूचना आपको सबसे महत्वपूर्ण बातों तक पहुँचाने में मदद मिलती है।"
                />
              </p>
              <div className="space-y-2">
                {INTENTS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => pickIntent(o.id)}
                    className="w-full flex items-center gap-3 p-3.5 min-h-[60px] rounded-2xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-colors"
                  >
                    <span className="text-2xl shrink-0" aria-hidden>
                      {o.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-extrabold text-stone-900 text-sm">
                        <T en={o.en} bn={o.bn} hi={o.hi} />
                      </span>
                      <span className="block text-[11px] text-stone-500 mt-0.5">
                        <T en={o.sub.en} bn={o.sub.bn} hi={o.sub.hi} />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="text-center py-2">
              <div className="text-5xl mb-4" aria-hidden>
                🪔
              </div>
              <h2 className="text-lg font-black text-stone-900">
                <T en="Shubharambha!" bn="শুভারম্ভ!" hi="शुभारंभ!" />
              </h2>
              <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                <T
                  en="Your space is ready. Suchana will now guide you gently — festivals, observances and timely reminders, all in one calm stream."
                  bn="আপনার স্থান প্রস্তুত। সূচনা এখন আপনাকে মৃদুভাবে পথ দেখাবে — উৎসব, ব্রত ও সময়োপযোগী স্মরণ, এক শান্ত ধারায়।"
                  hi="आपका स्थान तैयार है। सूचना अब आपको सौम्य मार्गदर्शन देगी — उत्सव, व्रत व समयोचित स्मरण, एक शांत धारा में।"
                />
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={() => finish(intent === 'unknown' ? 'practice' : intent, false)}
                className="mt-5 w-full px-4 py-3 min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-temple-950 text-sm font-black transition-colors"
              >
                <T en="Begin my journey" bn="আমার যাত্রা শুরু" hi="मेरी यात्रा आरंभ करें" />
              </button>
              <p className="text-[11px] text-stone-400 mt-3">
                <T
                  en="You can change this anytime from Profile."
                  bn="প্রোফাইল থেকে যেকোনো সময় বদলাতে পারবেন।"
                  hi="आप प्रोफ़ाइल से कभी भी बदल सकते हैं।"
                />
              </p>
            </div>
          )}

          {/* Skip — always available, non-blocking */}
          <button
            type="button"
            disabled={saving}
            onClick={() => finish('unknown', true)}
            className="mt-4 w-full text-center text-xs font-bold text-stone-400 hover:text-stone-600 py-2 min-h-[44px] transition-colors"
          >
            <T en="Skip for now" bn="এখন এড়িয়ে যান" hi="अभी छोड़ें" />
          </button>
        </div>
      </div>
    </div>
  );
};
