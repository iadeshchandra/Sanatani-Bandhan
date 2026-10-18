/**
 * language/TravelNudge.tsx — gentle, rare travel nudge.
 * =====================================================
 * On app boot, compares the cached geo country with the stored
 * region's implied country. If they differ — the devotee has likely
 * travelled — offers ONE warm, dismissible nudge to switch language.
 *
 * Hard rules:
 *  - Never auto-switches. The devotee's choice is sacred.
 *  - Never shows for global-diaspora / other regions.
 *  - Never shows before the devotee has chosen a language once
 *    (the welcome sheet owns that moment).
 *  - "Not now" sets the dismissed flag FOREVER — never nags.
 *  - Never re-detects or overrides the language choice; it only
 *    offers, once, with a clear way to say no.
 */

import { useEffect, useRef } from 'react';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { getGeoDetail } from '../../lib/nativeDetect';
import type { RegionId } from '../../i18n/regionalTerms';
import { useToast } from '../../context/ToastContext';
import { useNativeLanguage } from './nativeBridge';

const DISMISSED_KEY = 'sb-travel-nudge-dismissed';

/** Region → implied country. global-diaspora / other → null (skip). */
function impliedCountry(region: RegionId): 'BD' | 'IN' | null {
  if (region === 'bangladesh') return 'BD';
  if (region === 'global-diaspora' || region === 'other') return null;
  return 'IN';
}

const INDIAN_LANGS = ['hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'sa'];

/** Does the current language already fit the new country? */
function langMatchesCountry(lang: string, country: string): boolean {
  if (country === 'BD') return lang === 'bn';
  if (country === 'IN') return INDIAN_LANGS.includes(lang);
  return lang === 'en';
}

/** Warm place name + suggested language for a country code. */
function suggestionForCountry(country: string): { lang: string; place: string } {
  switch (country) {
    case 'BD':
      return { lang: 'bn', place: 'Bengal' };
    case 'IN':
      return { lang: 'hi', place: 'India' };
    case 'US':
      return { lang: 'en', place: 'the US' };
    case 'GB':
      return { lang: 'en', place: 'the UK' };
    case 'AE':
      return { lang: 'en', place: 'the UAE' };
    case 'SA':
      return { lang: 'en', place: 'Saudi Arabia' };
    case 'CA':
      return { lang: 'en', place: 'Canada' };
    case 'AU':
      return { lang: 'en', place: 'Australia' };
    default:
      return { lang: 'en', place: country };
  }
}

function nativeNameOf(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.nativeName || code;
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return true; // storage broken — safest is to never nudge
  }
}

function dismissForever(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function useTravelNudge(): void {
  const { currentLang, languageChosen, changeLanguage, region } =
    useNativeLanguage();
  const { confirm, showToast } = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    // The welcome sheet owns first launch — never nudge before a choice.
    if (!languageChosen) return;
    if (isDismissed()) return;
    ranRef.current = true;

    let cancelled = false;
    // Let boot settle; this is a whisper, not an announcement.
    const timer = setTimeout(() => {
      (async () => {
        try {
          const home = region ? impliedCountry(region) : null;
          if (!home) return; // global-diaspora / other / unknown → skip
          const geo = await getGeoDetail();
          const here = (geo.country || '').toUpperCase();
          if (cancelled || !here || here === home) return;
          if (langMatchesCountry(currentLang, here)) return;

          const { lang, place } = suggestionForCountry(here);
          if (currentLang === lang) return;
          const native = nativeNameOf(lang);

          confirm({
            title: '🙏 A gentle nudge',
            message: `You're in ${place} — switch to ${native}? Your words stay yours; you can change back anytime.`,
            confirmText: '🙏 Switch',
            cancelText: 'Not now',
            variant: 'amber',
            onConfirm: () => {
              // The devotee's tap is the only thing that ever switches.
              changeLanguage(lang);
              showToast(`🙏 Now speaking ${native} with you.`, 'success');
            },
            onCancel: () => {
              dismissForever();
            },
          });
        } catch {
          /* fail silent — a nudge must never crash boot */
        }
      })();
    }, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Mount near the app root alongside other first-run UI. Renders nothing. */
export const TravelNudge: React.FC = () => {
  useTravelNudge();
  return null;
};
