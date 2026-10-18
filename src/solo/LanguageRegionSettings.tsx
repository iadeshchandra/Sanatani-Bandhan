/**
 * solo/LanguageRegionSettings.tsx — devotee Profile settings section.
 * ===================================================================
 * Warm "Language & region" card:
 *  - Language row → bottom-sheet picker (own-script names, checkmark).
 *    On switch: warm toast rendered in EN/HI/BN by the language the
 *    devotee is LEAVING (currentLang BEFORE the switch).
 *  - Region row → 15-region picker ("your community's words").
 *  - "Suggest better" link → TranslationSuggestionSheet prefilled for
 *    the featured regional term 'temple', keyed
 *    `regional.{region}.temple` per the Track 3 contract.
 *
 * Language choice is NEVER overridden by geo afterwards — no
 * re-detection on change here, ever.
 */

import React, { useState } from 'react';
import { Card, T, Btn, useLocaleText } from './ui';
import { useToast } from '../context/ToastContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';
import { REGIONS, type RegionId } from '../i18n/regionalTerms';
import {
  useNativeLanguage,
  effectiveRegion,
} from '../components/language/nativeBridge';
import { LanguagePickerSheet } from '../components/language/LanguagePickerSheet';
import { RegionPickerSheet } from '../components/language/RegionPickerSheet';
import { TranslationSuggestionSheet } from '../components/guide/TranslationSuggestionSheet';

function toastForLangSwitch(fromLang: string, nativeName: string): string {
  if (fromLang === 'hi') return `🙏 अब हम आपके साथ ${nativeName} में हैं।`;
  if (fromLang === 'bn') return `🙏 এখন আমরা আপনার সাথে ${nativeName}-এ আছি।`;
  return `🙏 Now speaking ${nativeName} with you.`;
}

function toastForRegionSwitch(fromLang: string, label: string): string {
  if (fromLang === 'hi') return `🙏 ठीक है — अब आपके साथ ${label} के शब्द।`;
  if (fromLang === 'bn') return `🙏 ঠিক আছে — এখন আপনার সাথে ${label}-এর শব্দ।`;
  return `🙏 Noted — now using ${label}'s words with you.`;
}

export const LanguageRegionSettings: React.FC = () => {
  const {
    currentLang,
    changeLanguage,
    markLanguageChosen,
    setRegion,
    markRegionChosen,
    region,
    rt,
  } = useNativeLanguage();
  const { showToast } = useToast();
  const { tr } = useLocaleText();

  const [langOpen, setLangOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const effRegion = effectiveRegion(region, currentLang);
  const curLang = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang);
  const curRegionInfo = REGIONS[effRegion];

  const switchLanguage = (code: string) => {
    if (code === currentLang) {
      setLangOpen(false);
      return;
    }
    const nativeName =
      SUPPORTED_LANGUAGES.find((l) => l.code === code)?.nativeName || code;
    // Render the toast in the language being LEFT — before the switch.
    const msg = toastForLangSwitch(currentLang, nativeName);
    setLangOpen(false);
    changeLanguage(code);
    markLanguageChosen();
    showToast(msg, 'success');
  };

  const switchRegion = (r: RegionId) => {
    setRegionOpen(false);
    if (r === effRegion) return;
    setRegion(r);
    markRegionChosen();
    showToast(toastForRegionSwitch(currentLang, REGIONS[r].label), 'success');
  };

  return (
    <>
      <Card>
        <h3 className="font-extrabold text-stone-900 mb-3">
          🗣️{' '}
          <T en="Language & region" bn="ভাষা ও অঞ্চল" hi="भाषा और क्षेत्र" />
        </h3>

        {/* Language row */}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-sm font-bold text-stone-800">
              <T en="Language" bn="ভাষা" hi="भाषा" />
              <span className="ml-2 font-normal text-stone-500">
                {curLang?.nativeName || currentLang}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              <T
                en="The app speaks to you in this language."
                bn="অ্যাপ আপনার সাথে এই ভাষায় কথা বলে।"
                hi="ऐप आपसे इसी भाषा में बात करता है।"
              />
            </p>
          </div>
          <Btn
            variant="ghost"
            onClick={() => setLangOpen(true)}
            className="min-h-[44px]"
          >
            <T en="Change" bn="বদলান" hi="बदलें" />
          </Btn>
        </div>

        {/* Region row */}
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-sm font-bold text-stone-800">
              <T en="Your region" bn="আপনার অঞ্চল" hi="आपका क्षेत्र" />
              <span className="ml-2 font-normal text-stone-500">
                {curRegionInfo.label}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              <T
                en="So we can use the words your community uses."
                bn="যাতে আমরা আপনার সম্প্রদায়ের শব্দ ব্যবহার করতে পারি।"
                hi="ताकि हम आपके समुदाय के शब्द उपयोग कर सकें।"
              />
            </p>
          </div>
          <Btn
            variant="ghost"
            onClick={() => setRegionOpen(true)}
            className="min-h-[44px]"
          >
            <T en="Change" bn="বদলান" hi="बदलें" />
          </Btn>
        </div>

        {/* Suggest-better link — the quality loop for regional words */}
        <button
          type="button"
          onClick={() => setSuggestOpen(true)}
          className="mt-3 min-h-[44px] w-full text-left text-[13px] font-semibold text-amber-700 hover:text-amber-800 underline decoration-amber-300 underline-offset-4 px-1"
        >
          {tr(
            'solo.prefs.suggestRegional',
            "Not quite your community's word? 🙏 Suggest better",
            'আপনার সম্প্রদায়ের শব্দটি কি অন্যরকম? 🙏 আরও ভালো প্রস্তাব দিন',
            'आपके समुदाय का शब्द कुछ और है? 🙏 बेहतर सुझाव दें'
          )}
        </button>
      </Card>

      <LanguagePickerSheet
        open={langOpen}
        currentLang={currentLang}
        chromeLang={currentLang}
        onSelect={switchLanguage}
        onClose={() => setLangOpen(false)}
      />
      <RegionPickerSheet
        open={regionOpen}
        currentRegion={region}
        chromeLang={currentLang}
        onSelect={switchRegion}
        onClose={() => setRegionOpen(false)}
      />
      {suggestOpen && (
        <TranslationSuggestionSheet
          lang={currentLang}
          lines={[
            {
              key: `regional.${effRegion}.temple`,
              kind: 'title',
              currentText: rt('temple'),
            },
          ]}
          onClose={() => setSuggestOpen(false)}
        />
      )}
    </>
  );
};
