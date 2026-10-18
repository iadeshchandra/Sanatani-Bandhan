/**
 * language/LanguagePickerSheet.tsx — devotee-facing language picker.
 * ==================================================================
 * Warm bottom sheet (NOT the raw admin <select>): every language in
 * its OWN script, a checkmark on the current one, ≥44px rows.
 * The caller owns the side effects (changeLanguage + warm toast).
 */

import React from 'react';
import { X, Check, Languages } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';

type CopyKey = 'title' | 'sub' | 'close';

const COPY: Record<string, Record<CopyKey, string>> = {
  hi: {
    title: '🙏 अपनी भाषा चुनें',
    sub: 'ऐप अब से आपसे इसी भाषा में बात करेगा।',
    close: 'बंद करें',
  },
  bn: {
    title: '🙏 আপনার ভাষা বেছে নিন',
    sub: 'অ্যাপ এখন থেকে আপনার সাথে এই ভাষায় কথা বলবে।',
    close: 'বন্ধ করুন',
  },
  en: {
    title: '🙏 Choose your language',
    sub: 'The app will speak to you in this language from now on.',
    close: 'Close',
  },
};

function copyFor(lang: string): Record<CopyKey, string> {
  return COPY[(lang || 'en').toLowerCase()] || COPY.en;
}

interface Props {
  open: boolean;
  currentLang: string;
  /** Language for the sheet's own chrome (EN/HI/BN). */
  chromeLang: string;
  onSelect: (lang: string) => void;
  onClose: () => void;
}

export const LanguagePickerSheet: React.FC<Props> = ({
  open,
  currentLang,
  chromeLang,
  onSelect,
  onClose,
}) => {
  if (!open) return null;
  const copy = copyFor(chromeLang);

  return (
    <div
      className="fixed inset-0 z-[210]"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 sm:mx-auto sm:max-w-lg max-h-[88dvh] overflow-y-auto bg-[#faf7f2] rounded-t-3xl shadow-2xl border-t border-amber-200/60">
        <div className="sticky top-0 bg-[#faf7f2]/95 backdrop-blur rounded-t-3xl z-10 px-5 pt-3 pb-3 border-b border-amber-100">
          <div className="mx-auto w-10 h-1.5 rounded-full bg-stone-300/70" />
          <div className="flex items-center gap-2.5 mt-2">
            <span className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
              <Languages className="w-5 h-5 text-amber-700" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-[18px] font-bold text-stone-900 leading-snug">
                {copy.title}
              </h2>
              <p className="text-[12px] text-stone-500">{copy.sub}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.close}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 shrink-0"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>
        </div>

        <ul className="px-5 py-4 space-y-2">
          {SUPPORTED_LANGUAGES.map((l) => {
            const active = currentLang === l.code;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => onSelect(l.code)}
                  aria-pressed={active}
                  className={`w-full min-h-[60px] rounded-2xl border px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors ${
                    active
                      ? 'border-amber-500 bg-amber-50 shadow-sm'
                      : 'border-stone-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[18px] font-bold text-stone-900 leading-snug">
                      {l.nativeName}
                    </span>
                    <span className="block text-[12px] text-stone-500">
                      {l.englishName}
                    </span>
                  </span>
                  {active && (
                    <span
                      className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0"
                      aria-hidden
                    >
                      <Check className="w-4 h-4 text-white" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
