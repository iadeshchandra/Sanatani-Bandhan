/**
 * public/PublicLanguageButton.tsx — the language switcher for PUBLIC
 * surfaces (landing, institutions, ask-ai, contact, org public pages).
 * =====================================================================
 * WORLD-READY (Exhibit 6 / Axis B): the landing header carried NO
 * switcher at all — it had been removed in a 2026-10-15 audit because
 * the then-selector was decorative (the landing copy stayed English).
 * This button is the honest version: it drives the SAME LanguageContext
 * as the rest of the app (canonical SUPPORTED_LANGUAGES registry,
 * persisted choice via markLanguageChosen, works pre-login), opens the
 * canonical LanguagePickerSheet, and the surfaces that mount it wire
 * their header/hero copy through safeTranslate so the choice visibly
 * takes effect.
 *
 * Form: a ≥44px pill — globe + the current language's own name — that
 * fits the warm public headers. `tone` adapts it to dark hero bands
 * (org public page) vs the light sticky headers.
 */
import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguagePickerSheet } from '../language/LanguagePickerSheet';

export const PublicLanguageButton: React.FC<{
  tone?: 'light' | 'dark';
  className?: string;
}> = ({ tone = 'light', className = '' }) => {
  const { currentLang, changeLanguage, markLanguageChosen, supportedLanguages } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = supportedLanguages.find((l) => l.code === currentLang);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Language — ${current?.englishName ?? 'English'}`}
        className={
          tone === 'dark'
            ? `inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-bold transition-colors cursor-pointer ${className}`
            : `inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-stone-700 text-sm font-bold transition-colors cursor-pointer ${className}`
        }
      >
        <Globe className="w-5 h-5 shrink-0" aria-hidden />
        <span>{current?.nativeName ?? 'English'}</span>
      </button>
      <LanguagePickerSheet
        open={open}
        currentLang={currentLang}
        chromeLang={currentLang}
        onSelect={(l) => {
          changeLanguage(l);
          markLanguageChosen();
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
};
