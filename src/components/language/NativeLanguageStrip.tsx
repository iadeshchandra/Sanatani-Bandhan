/**
 * language/NativeLanguageStrip.tsx — the hero-first language offer.
 * ============================================================
 * Design Audit 2 #3: NativeWelcomeSheet used to AUTO-OPEN as a modal
 * over the landing hero (and over public/shared pages) before any
 * content was seen. The offer is good; the ambush was not.
 *
 * This slim inline strip now carries the offer, rendered under the
 * header on the public surfaces where the sheet used to ambush
 * (landing, Margdarshan, public org pages) and inside the Solo
 * first-run sequence's language step. Content renders immediately;
 * the strip only SUGGESTS (the geo law: suggest warmly, never switch
 * silently). Tapping it opens the SAME NativeWelcomeSheet, unchanged
 * inside, via openNativeLanguageSheet().
 *
 * Lifecycle mirrors the sheet's own persistence exactly:
 *  - a language has been chosen (languageChosen) → never renders;
 *  - the sheet was dismissed (sb-native-sheet-dismissed) → never
 *    renders, and hides live when a dismissal lands elsewhere;
 *  - the strip's own × sets the same dismissed flag — one promise,
 *    kept by both surfaces: dismiss once, never nagged again.
 */

import React, { useEffect, useState } from 'react';
import { Globe, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { useNativeLanguage } from './nativeBridge';
import { openNativeLanguageSheet } from './NativeWelcomeSheet';
import { FIRST_RUN_DIALOGS_CHANGED } from '../../lib/firstRunDialogs';
import { OVERLAY_CHANGED } from '../../lib/overlaySignal';

const DISMISSED_KEY = 'sb-native-sheet-dismissed';

function sheetDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export const NativeLanguageStrip: React.FC = () => {
  const { t } = useLanguage();
  const { currentLang, languageChosen } = useNativeLanguage();
  const [dismissed, setDismissed] = useState<boolean>(() => sheetDismissed());

  // The sheet can be dismissed while this strip is mounted (strip tap
  // → sheet → "keep current language"): re-read the flag whenever the
  // first-run queue or the overlay set changes, so the strip steps
  // aside the moment the promise is made.
  useEffect(() => {
    const recheck = () => setDismissed(sheetDismissed());
    window.addEventListener(FIRST_RUN_DIALOGS_CHANGED, recheck);
    window.addEventListener(OVERLAY_CHANGED, recheck);
    return () => {
      window.removeEventListener(FIRST_RUN_DIALOGS_CHANGED, recheck);
      window.removeEventListener(OVERLAY_CHANGED, recheck);
    };
  }, []);

  if (languageChosen || dismissed) return null;

  const nativeName =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.nativeName ??
    currentLang;
  const sentence = t('surfaces.chrome.languageStrip').replace(
    '{lang}',
    nativeName
  );

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* ignore — local state still hides it for this session */
    }
    setDismissed(true);
  };

  return (
    <div className="border-b border-amber-100 bg-amber-50">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-3 sm:px-6">
        <button
          type="button"
          onClick={openNativeLanguageSheet}
          className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2 py-1.5 text-left text-[13px] font-semibold text-temple-800"
        >
          <Globe className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
          <span className="min-w-0">
            {sentence}
            <span aria-hidden className="text-orange-300">
              {'  ·  '}
            </span>
            <span className="font-extrabold text-orange-700 underline underline-offset-2">
              {t('surfaces.chrome.languageStripChange')}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('guide.close')}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-temple-500 transition-colors hover:bg-amber-100 hover:text-temple-700"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
};

export default NativeLanguageStrip;
