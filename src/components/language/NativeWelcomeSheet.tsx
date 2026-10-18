/**
 * language/NativeWelcomeSheet.tsx — detect-once warm welcome.
 * ============================================================
 * First launch only: runs detectNativeProfileOnce() and greets the
 * devotee in their likely mother tongue. Detection is a suggestion,
 * never a cage — the devotee always confirms with one tap, or picks
 * another language from the full list (names in their OWN script).
 *
 * Rules:
 *  - languageChosen already true  → render nothing (no work at all).
 *  - dismissed before             → render nothing, never nag again.
 *  - dismissing now               → keep current language, set the
 *    sb-native-sheet-dismissed flag, never show again.
 *  - low-confidence (no Indian signal at all) → offer the top-2 side
 *    by side, NEITHER preselected — the devotee actively chooses.
 *  - Never a silent switch: nothing changes until "🙏 Sounds good".
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { regionForLang, type RegionId } from '../../i18n/regionalTerms';
import type { SupportedLang } from '../../i18n/translationQuality';
import { detectNativeProfileOnce } from '../../lib/nativeDetect';
import { useNativeLanguage } from './nativeBridge';

const DISMISSED_KEY = 'sb-native-sheet-dismissed';

type CopyKey =
  | 'title'
  | 'guessed'
  | 'unsureTitle'
  | 'unsureSub'
  | 'confirm'
  | 'changeHint'
  | 'allLangs'
  | 'reassure'
  | 'close';

const COPY: Record<string, Record<CopyKey, string>> = {
  hi: {
    title: '🙏 आपके दिल की भाषा कौन-सी है?',
    guessed: 'आपके स्थान से हमने {n} का अनुमान लगाया — क्या यह सही है?',
    unsureTitle: '🙏 हम ठीक से जान नहीं पाए',
    unsureSub: 'आपके लिए कौन-सी भाषा घर जैसी लगती है? चुन लीजिए।',
    confirm: '🙏 बहुत बढ़िया',
    changeHint: 'कोई और भाषा चाहिए? नीचे चुनें',
    allLangs: 'सभी भाषाएँ',
    reassure: 'इसे आप बाद में कभी भी प्रोफ़ाइल से बदल सकते हैं।',
    close: 'बंद करें',
  },
  bn: {
    title: '🙏 আপনার হৃদয়ের ভাষা কোনটি?',
    guessed: 'আপনার অবস্থান থেকে আমরা {n} অনুমান করেছি — ঠিক আছে কি?',
    unsureTitle: '🙏 আমরা ঠিক বুঝতে পারিনি',
    unsureSub: 'কোন ভাষাটি আপনার কাছে ঘরের মতো মনে হয়? বেছে নিন।',
    confirm: '🙏 খুব ভালো',
    changeHint: 'অন্য ভাষা চান? নিচে বেছে নিন',
    allLangs: 'সব ভাষা',
    reassure: 'পরে যেকোনো সময় প্রোফাইল থেকে বদলে নিতে পারবেন।',
    close: 'বন্ধ করুন',
  },
  en: {
    title: '🙏 Which language does your heart speak?',
    guessed: 'We guessed {n} from your location — is that right?',
    unsureTitle: "🙏 We couldn't quite tell",
    unsureSub: 'Which language feels like home to you? You choose.',
    confirm: '🙏 Sounds good',
    changeHint: 'Want another language? Pick below',
    allLangs: 'All languages',
    reassure: 'You can change this anytime from your Profile.',
    close: 'Close',
  },
};

function copyFor(lang: string): Record<CopyKey, string> {
  return COPY[(lang || 'en').toLowerCase()] || COPY.en;
}

function nativeNameOf(code: string): string {
  return (
    SUPPORTED_LANGUAGES.find((l) => l.code === code)?.nativeName || code
  );
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export const NativeWelcomeSheet: React.FC = () => {
  const {
    currentLang,
    changeLanguage,
    markLanguageChosen,
    languageChosen,
    setRegion,
    markRegionChosen,
  } = useNativeLanguage();

  const [visible, setVisible] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [detectedRegion, setDetectedRegion] = useState<RegionId>('other');
  const [lowConfidence, setLowConfidence] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const ranRef = useRef(false);

  const copy = copyFor(currentLang);

  useEffect(() => {
    if (ranRef.current) return;
    if (languageChosen || isDismissed()) return;
    ranRef.current = true;

    let cancelled = false;
    // Let the app paint first — this is a welcome, not a wall.
    const timer = setTimeout(() => {
      detectNativeProfileOnce()
        .then((profile) => {
          if (cancelled) return;
          const lang = profile.lang as string;
          // Low confidence: no Indian signal at all — don't presume.
          const low =
            lang === 'en' &&
            (profile.region === 'other' ||
              profile.region === 'global-diaspora');
          setDetectedLang(lang);
          setDetectedRegion(profile.region);
          setLowConfidence(low);
          setSelected(low ? null : lang);
          setVisible(true);
        })
        .catch(() => {
          if (cancelled) return;
          // Fail warm: still offer the choice, top-2 English + Hindi.
          setDetectedLang('en');
          setDetectedRegion('other');
          setLowConfidence(true);
          setSelected(null);
          setVisible(true);
        });
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible || !detectedLang) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const confirm = () => {
    if (!selected) return;
    changeLanguage(selected);
    markLanguageChosen();
    // Region follows the confirmed language's home when detection was vague.
    const region: RegionId =
      detectedRegion !== 'other' && detectedRegion !== 'global-diaspora'
        ? detectedRegion
        : regionForLang(selected as SupportedLang);
    setRegion(region);
    markRegionChosen();
    setVisible(false);
  };

  // Low-confidence: top-2 side by side, neither preselected.
  const top2: string[] = (() => {
    const opts = [detectedLang, 'en'].filter(
      (c, i, a) => a.indexOf(c) === i
    );
    if (opts.length === 1) opts.push('hi');
    return opts;
  })();

  return (
    <div
      className="fixed inset-0 z-[210]"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={dismiss}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 sm:mx-auto sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-[#faf7f2] rounded-t-3xl shadow-2xl border-t border-amber-200/60">
        {/* Grabber + close */}
        <div className="sticky top-0 bg-[#faf7f2]/95 backdrop-blur rounded-t-3xl z-10 px-5 pt-3 pb-2">
          <div className="mx-auto w-10 h-1.5 rounded-full bg-stone-300/70" />
          <div className="flex items-start justify-between mt-2">
            <h2 className="font-serif text-[20px] font-bold text-stone-900 leading-snug pr-8">
              {lowConfidence ? copy.unsureTitle : copy.title}
            </h2>
            <button
              type="button"
              onClick={dismiss}
              aria-label={copy.close}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 shrink-0"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="px-5 pb-6">
          {/* Detected-language banner (high confidence) */}
          {!lowConfidence && (
            <div className="mt-1 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
              <Sparkles
                className="w-5 h-5 text-amber-600 shrink-0"
                aria-hidden
              />
              <p className="text-[14px] text-stone-700 leading-relaxed">
                {copy.guessed.replace('{n}', nativeNameOf(detectedLang))}
              </p>
            </div>
          )}
          {lowConfidence && (
            <p className="mt-1 text-[14px] text-stone-600 leading-relaxed">
              {copy.unsureSub}
            </p>
          )}

          {/* Top-2, side by side, in low-confidence mode */}
          {lowConfidence && (
            <div className="mt-4 grid grid-cols-2 gap-3" role="group" aria-label={copy.allLangs}>
              {top2.map((code) => {
                const active = selected === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelected(code)}
                    aria-pressed={active}
                    className={`min-h-[88px] rounded-2xl border-2 px-3 py-3 flex flex-col items-center justify-center gap-1 transition-colors ${
                      active
                        ? 'border-amber-500 bg-amber-50 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <span className="text-[20px] font-bold text-stone-900">
                      {nativeNameOf(code)}
                    </span>
                    <span className="text-[12px] text-stone-500">
                      {SUPPORTED_LANGUAGES.find((l) => l.code === code)
                        ?.englishName || code}
                    </span>
                    {active && (
                      <Check
                        className="w-5 h-5 text-amber-600 mt-0.5"
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Full language list — names in their OWN script */}
          <p className="mt-5 text-[12px] font-bold tracking-widest text-stone-400">
            {lowConfidence ? copy.changeHint : copy.allLangs}
          </p>
          <ul className="mt-2 space-y-2">
            {SUPPORTED_LANGUAGES.map((l) => {
              const active = selected === l.code;
              const isDetected = l.code === detectedLang && !lowConfidence;
              return (
                <li key={l.code}>
                  <button
                    type="button"
                    onClick={() => setSelected(l.code)}
                    aria-pressed={active}
                    className={`w-full min-h-[56px] rounded-2xl border px-4 py-2.5 flex items-center justify-between gap-3 transition-colors text-left ${
                      active
                        ? 'border-amber-500 bg-amber-50 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[17px] font-bold text-stone-900 leading-snug">
                        {l.nativeName}
                        {isDetected && (
                          <span className="ml-2 text-[11px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 align-middle">
                            ✦
                          </span>
                        )}
                      </span>
                      <span className="block text-[12px] text-stone-500">
                        {l.englishName}
                      </span>
                    </span>
                    {active && (
                      <Check
                        className="w-5 h-5 text-amber-600 shrink-0"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={confirm}
            disabled={!selected}
            className="mt-5 w-full min-h-[52px] rounded-2xl bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:hover:bg-amber-700 text-amber-50 text-[16px] font-bold shadow-sm"
          >
            {copy.confirm}
          </button>
          <p className="mt-3 text-center text-[12px] text-stone-400">
            {copy.reassure}
          </p>
        </div>
      </div>
    </div>
  );
};
