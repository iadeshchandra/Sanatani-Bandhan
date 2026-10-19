/**
 * solo/SoloSetupWizard.tsx — 3-step Solo first-run setup (Step 9).
 * ============================================================================
 * Runs inside FirstRunSequence AFTER the language sheet and BEFORE the tour.
 * Warm, never blocking, every step skippable.
 *
 * Step 1 — Language & region: confirm what the welcome sheet set (or open
 *          the pickers to change). A safety net, not a repeat.
 * Step 2 — Intent: "What brings you here?" → saved to intentProfile,
 *          steers Suchana prioritization. (Replaces OnboardingFlow's
 *          single question; its promised Q2/Q3 were dead copy.)
 * Step 3 — Activation: "Light your first diya" — the minute-one aha
 *          moment. A real action, not just reading.
 */
import React, { useState } from 'react';
import { T } from './ui';
import { useLanguage } from '../context/LanguageContext';
import { LanguagePickerSheet } from '../components/language/LanguagePickerSheet';
import { RegionPickerSheet } from '../components/language/RegionPickerSheet';
import { saveIntentProfile, type IntentKey } from '../lib/intentProfile';
import { markSetupWizardDone } from './firstRun';

const INTENTS: Array<{
  id: Exclude<IntentKey, 'unknown'>;
  icon: string;
  en: string;
  bn: string;
  hi: string;
}> = [
  { id: 'practice', icon: '🧘', en: 'My daily practice', bn: 'আমার দৈনন্দিন সাধনা', hi: 'मेरी दैनिक साधना' },
  { id: 'join', icon: '🛕', en: 'Temples & community', bn: 'মন্দির ও সম্প্রদায়', hi: 'मंदिर व समुदाय' },
  { id: 'purohit', icon: '🪔', en: "I'm a purohit / jyotishi", bn: 'আমি পুরোহিত / জ্যোতিষী', hi: 'मैं पुरोहित / ज्योतिषी हूँ' },
  { id: 'manage', icon: '📊', en: 'I manage an institution', bn: 'আমি প্রতিষ্ঠান পরিচালনা করি', hi: 'मैं संस्थान प्रबंधित करता हूँ' },
];

const DIYA_LIT_KEY = 'sb-first-diya-lit';

export const SoloSetupWizard: React.FC<{
  uid: string;
  onDone: () => void;
}> = ({ uid, onDone }) => {
  const { currentLang, region, changeLanguage, setRegion } = useLanguage();
  const [step, setStep] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [diyaLit, setDiyaLit] = useState(false);
  const [saving, setSaving] = useState(false);

  const finish = () => {
    markSetupWizardDone();
    onDone();
  };

  const pickIntent = async (id: IntentKey) => {
    setSaving(true);
    try {
      await saveIntentProfile(uid, id, false);
    } finally {
      setSaving(false);
      setStep(2);
    }
  };

  const lightDiya = () => {
    setDiyaLit(true);
    try {
      localStorage.setItem(DIYA_LIT_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-temple-950/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome setup"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Progress */}
        <div className="h-1 bg-stone-100">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {step === 0 && (
            <div>
              <div className="text-4xl mb-3" aria-hidden>🌐</div>
              <h2 className="text-lg font-black text-stone-900">
                <T en="Your language, your region" bn="আপনার ভাষা, আপনার অঞ্চল" hi="आपकी भाषा, आपका क्षेत्र" />
              </h2>
              <p className="text-xs text-stone-500 mt-1 mb-4">
                <T
                  en="Everything — festivals, guidance, community — speaks in your words."
                  bn="সবকিছু — উৎসব, পথনির্দেশ, সম্প্রদায় — আপনার ভাষায় কথা বলবে।"
                  hi="सब कुछ — त्योहार, मार्गदर्शन, समुदाय — आपकी भाषा में बोलेगा।"
                />
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setLangOpen(true)}
                  className="w-full flex items-center justify-between p-3.5 min-h-[56px] rounded-2xl border border-stone-200 hover:border-amber-400 text-left transition-colors"
                >
                  <span className="text-sm font-extrabold text-stone-900">
                    <T en="Language" bn="ভাষা" hi="भाषा" />
                  </span>
                  <span className="text-sm font-bold text-amber-700">{currentLang.toUpperCase()} · <T en="Change" bn="বদলান" hi="बदलें" /></span>
                </button>
                <button
                  type="button"
                  onClick={() => setRegionOpen(true)}
                  className="w-full flex items-center justify-between p-3.5 min-h-[56px] rounded-2xl border border-stone-200 hover:border-amber-400 text-left transition-colors"
                >
                  <span className="text-sm font-extrabold text-stone-900">
                    <T en="Region" bn="অঞ্চল" hi="क्षेत्र" />
                  </span>
                  <span className="text-sm font-bold text-amber-700">{region} · <T en="Change" bn="বদলান" hi="बदलें" /></span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-5 w-full px-4 py-3 min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-temple-950 text-sm font-black transition-colors"
              >
                <T en="Continue" bn="এগিয়ে যান" hi="आगे बढ़ें" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="text-4xl mb-3" aria-hidden>🙏</div>
              <h2 className="text-lg font-black text-stone-900">
                <T en="What brings you here?" bn="আপনাকে এখানে কী এনেছে?" hi="आप यहाँ क्यों आए हैं?" />
              </h2>
              <p className="text-xs text-stone-500 mt-1 mb-4">
                <T
                  en="Suchana will gently guide you toward what matters most to you."
                  bn="সূচনা আপনাকে সবচেয়ে গুরুত্বপূর্ণ বিষয়ের দিকে মৃদুভাবে পথ দেখাবে।"
                  hi="सूचना आपको सबसे महत्वपूर्ण बातों की ओर सौम्य मार्गदर्शन देगी।"
                />
              </p>
              <div className="space-y-2">
                {INTENTS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    disabled={saving}
                    onClick={() => pickIntent(o.id)}
                    className="w-full flex items-center gap-3 p-3.5 min-h-[56px] rounded-2xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-colors disabled:opacity-60"
                  >
                    <span className="text-2xl shrink-0" aria-hidden>{o.icon}</span>
                    <span className="text-sm font-extrabold text-stone-900">
                      <T en={o.en} bn={o.bn} hi={o.hi} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-2">
              <button
                type="button"
                onClick={lightDiya}
                aria-label="Light your first diya"
                className="text-7xl mb-4 transition-transform active:scale-95 cursor-pointer"
                style={{ filter: diyaLit ? 'drop-shadow(0 0 24px rgba(251,191,36,0.9))' : 'grayscale(0.7) opacity(0.7)' }}
              >
                <span aria-hidden>{diyaLit ? '🪔' : '🕯️'}</span>
              </button>
              <h2 className="text-lg font-black text-stone-900">
                {diyaLit ? (
                  <T en="Shubharambha! 🪔" bn="শুভারম্ভ! 🪔" hi="शुभारंभ! 🪔" />
                ) : (
                  <T en="Light your first diya" bn="আপনার প্রথম প্রদীপ জ্বালান" hi="अपना पहला दीया जलाएँ" />
                )}
              </h2>
              <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                {diyaLit ? (
                  <T
                    en="Your sacred space is ready. Suchana will guide you gently — festivals, observances and timely reminders, all in one calm stream."
                    bn="আপনার পবিত্র স্থান প্রস্তুত। সূচনা আপনাকে মৃদুভাবে পথ দেখাবে — উৎসব, ব্রত ও সময়োপযোগী স্মরণ, এক শান্ত ধারায়।"
                    hi="आपका पवित्र स्थान तैयार है। सूचना आपको सौम्य मार्गदर्शन देगी — उत्सव, व्रत व समयोचित स्मरण, एक शांत धारा में।"
                  />
                ) : (
                  <T
                    en="Tap the diya to begin your journey with light."
                    bn="আলো নিয়ে যাত্রা শুরু করতে প্রদীপটি স্পর্শ করুন।"
                    hi="प्रकाश के साथ अपनी यात्रा आरंभ करने के लिए दीया स्पर्श करें।"
                  />
                )}
              </p>
              {diyaLit && (
                <button
                  type="button"
                  onClick={finish}
                  className="mt-5 w-full px-4 py-3 min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-temple-950 text-sm font-black transition-colors"
                >
                  <T en="Begin my journey" bn="আমার যাত্রা শুরু" hi="मेरी यात्रा आरंभ करें" />
                </button>
              )}
            </div>
          )}

          {/* Skip — always available, non-blocking */}
          <button
            type="button"
            onClick={finish}
            className="mt-4 w-full text-center text-xs font-bold text-stone-400 hover:text-stone-600 py-2 min-h-[44px] transition-colors"
          >
            <T en="Skip for now" bn="এখন এড়িয়ে যান" hi="अभी छोड़ें" />
          </button>
        </div>
      </div>

      {/* Language / region pickers (render above the wizard) */}
      <LanguagePickerSheet
        open={langOpen}
        currentLang={currentLang}
        chromeLang={currentLang}
        onSelect={(l) => { changeLanguage(l); setLangOpen(false); }}
        onClose={() => setLangOpen(false)}
      />
      <RegionPickerSheet
        open={regionOpen}
        currentRegion={region}
        chromeLang={currentLang}
        onSelect={(r) => { setRegion(r); setRegionOpen(false); }}
        onClose={() => setRegionOpen(false)}
      />
    </div>
  );
};
