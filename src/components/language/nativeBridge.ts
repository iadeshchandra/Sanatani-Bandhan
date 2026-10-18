/**
 * language/nativeBridge.ts — TRACK 2 ⇄ TRACK 1 contract adapter.
 * ==============================================================
 * Track 1 (parallel) is adding to `useLanguage()`:
 *   region: RegionId; setRegion: (r: RegionId) => void;
 *   rt: (key: string) => string;
 *   regionChosen: boolean; markRegionChosen: () => void.
 *
 * This module codes against that contract. If Track 1 has not landed
 * yet, every addition degrades gracefully — region reads return null
 * (callers fall back to regionForLang), setters no-op, and rt() falls
 * back to regionalTerm() — so Track 2 never crashes and never
 * misbehaves. When Track 1 lands with the same shapes, this becomes a
 * transparent pass-through (verify with tsc, no code change needed).
 */

import { useLanguage } from '../../context/LanguageContext';
import {
  regionForLang,
  regionalTerm,
  type RegionId,
} from '../../i18n/regionalTerms';
import type { SupportedLang } from '../../i18n/translationQuality';

/** The Track 1 additions we code against (all optional until it lands). */
export interface Track1Additions {
  region: RegionId;
  setRegion: (r: RegionId) => void;
  rt: (key: string) => string;
  regionChosen: boolean;
  markRegionChosen: () => void;
}

export interface NativeLanguage {
  currentLang: string;
  language: string;
  changeLanguage: (lang: string) => void;
  markLanguageChosen: () => void;
  languageChosen: boolean;
  /** Track 1 region when landed; null before Track 1 lands. */
  region: RegionId | null;
  setRegion: (r: RegionId) => void;
  regionChosen: boolean;
  markRegionChosen: () => void;
  /** Track 1 rt() when landed; warm fallback to regionalTerm() before. */
  rt: (key: string) => string;
  /** True when the Track 1 additions are actually present. */
  track1Landed: boolean;
}

export function useNativeLanguage(): NativeLanguage {
  const base = useLanguage();
  const t1 = base as unknown as Partial<Track1Additions>;

  const landed =
    typeof t1.region === 'string' && typeof t1.setRegion === 'function';

  const region: RegionId | null = landed ? (t1.region as RegionId) : null;
  const setRegion: (r: RegionId) => void =
    typeof t1.setRegion === 'function' ? t1.setRegion : () => {};
  const regionChosen: boolean =
    typeof t1.regionChosen === 'boolean' ? t1.regionChosen : false;
  const markRegionChosen: () => void =
    typeof t1.markRegionChosen === 'function' ? t1.markRegionChosen : () => {};

  const rt: (key: string) => string =
    typeof t1.rt === 'function'
      ? t1.rt
      : (key: string) =>
          regionalTerm(
            key,
            base.currentLang,
            region ?? regionForLang(base.currentLang as SupportedLang)
          );

  return {
    currentLang: base.currentLang,
    language: base.language,
    changeLanguage: base.changeLanguage,
    markLanguageChosen: base.markLanguageChosen,
    languageChosen: base.languageChosen,
    region,
    setRegion,
    regionChosen,
    markRegionChosen,
    rt,
    track1Landed: landed,
  };
}

/** Display region that is never null: stored region, else the language's home. */
export function effectiveRegion(
  region: RegionId | null,
  lang: string
): RegionId {
  return region ?? regionForLang(lang as SupportedLang);
}
