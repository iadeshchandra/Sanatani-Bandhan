import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * First-run language picker — full-screen, offline-safe, big touch targets.
 * Shown once per device before landing/auth (see FirstRunLanguageGate).
 * Persists the choice to `sb-lang` (+ legacy `sanatani_lang`).
 */
export const LanguagePicker: React.FC = () => {
  const { supportedLanguages, changeLanguage, markLanguageChosen } = useLanguage();

  const pick = (code: string) => {
    changeLanguage(code);
    markLanguageChosen();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0620] px-6 py-10">
      <div className="w-full max-w-md">
        {/* Sacred header — Tier A term, identical in every language */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 font-sacred" aria-hidden="true">
            ॐ
          </div>
          <h1 className="text-2xl font-bold text-white">Sanatani Bandhan</h1>
          <p className="text-white/60 text-sm mt-2">
            Choose your language
            <span className="text-white/30"> · </span>
            अपनी भाषा चुनें
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3" role="listbox" aria-label="Language">
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              role="option"
              aria-selected="false"
              onClick={() => pick(lang.code)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5
                         text-center transition-all duration-150
                         hover:bg-white/10 hover:border-[#FF8E00]/60
                         active:scale-[0.97] focus-visible:outline-2
                         focus-visible:outline-[#FF8E00]"
            >
              <div className="text-xl font-bold text-white leading-snug">{lang.nativeName}</div>
              <div className="text-xs text-white/50 mt-1">{lang.englishName}</div>
            </button>
          ))}
        </div>

        <p className="text-center text-white/30 text-xs mt-8">
          You can change this anytime from Settings.
        </p>
      </div>
    </div>
  );
};

/**
 * Gate wrapper: renders the picker on fresh installs (no language chosen
 * yet), otherwise renders children. Place INSIDE <LanguageProvider> but
 * OUTSIDE <BrowserRouter> so it shows before landing/auth routes.
 *
 * Usage in App.tsx:
 *   <LanguageProvider>
 *     <FirstRunLanguageGate>
 *       <BrowserRouter>…</BrowserRouter>
 *     </FirstRunLanguageGate>
 *   </LanguageProvider>
 */
export const FirstRunLanguageGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { languageChosen } = useLanguage();
  if (!languageChosen) {
    return <LanguagePicker />;
  }
  return <>{children}</>;
};

export default LanguagePicker;
