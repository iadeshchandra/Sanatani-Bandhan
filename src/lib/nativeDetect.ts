/**
 * lib/nativeDetect.ts — one-time native profile detection.
 * =========================================================
 * Detects the devotee's { language, region } ONCE (first launch / signup)
 * so the app can greet them in their mother tongue with their community's
 * words. The caller's saved-choice check ALWAYS outranks this — detection
 * is a suggestion, never a cage. Travel never re-triggers it (the caller
 * owns the "you're in Bengal — switch?" gentle nudge, if any).
 *
 * Signal priority inside detection: device locale → phone → IP geo → en.
 * Pure mapping lives in i18n/regionalTerms (detectNativeProfile) and is
 * unit-tested; this module only gathers the async signals.
 */

import { detectNativeProfile, type RegionId } from '../i18n/regionalTerms';
import type { SupportedLang } from '../i18n/translationQuality';

export interface NativeProfile {
  lang: SupportedLang;
  region: RegionId;
}

const GEO_CACHE_KEY = 'sb_geo_detail';
const GEO_TTL_MS = 24 * 60 * 60 * 1000;

interface GeoDetail {
  country: string | null;
  state: string | null;
}

/** IP geolocation detail (country + state). Cached 24h. Never throws. */
export async function getGeoDetail(): Promise<GeoDetail> {
  const fallback: GeoDetail = { country: null, state: null };
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { at?: number; country?: string; state?: string };
      if (parsed.at && Date.now() - parsed.at < GEO_TTL_MS) {
        return { country: parsed.country || null, state: parsed.state || null };
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return fallback;
    const j = (await res.json()) as { country_code?: string; region?: string };
    const detail: GeoDetail = {
      country: (j.country_code || '').toUpperCase() || null,
      state: j.region || null,
    };
    try {
      localStorage.setItem(
        GEO_CACHE_KEY,
        JSON.stringify({ at: Date.now(), country: detail.country, state: detail.state })
      );
    } catch {
      /* ignore */
    }
    return detail;
  } catch {
    return fallback;
  }
}

export function clearGeoDetailCache(): void {
  try {
    localStorage.removeItem(GEO_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Run detection once. Returns the suggested { lang, region }.
 * Never throws — worst case { lang: 'en', region: 'other' }.
 *
 * The caller MUST check the saved choice first:
 *   const savedLang = localStorage.getItem('sb-lang');
 *   if (savedLang) → respect it; optionally detect region only.
 */
export async function detectNativeProfileOnce(phoneDigits?: string | null): Promise<NativeProfile> {
  try {
    const bcp47 = typeof navigator !== 'undefined' ? navigator.language || null : null;
    const geo = await getGeoDetail();
    return detectNativeProfile({
      bcp47,
      country: geo.country,
      state: geo.state,
      phoneDigits: phoneDigits || null,
    });
  } catch {
    return { lang: 'en', region: 'other' };
  }
}

/**
 * Region-only detection (for when the language is already chosen —
 * e.g. the user picked Tamil manually, we still want tamil-nadu vs
 * global-diaspora for vocabulary). Never throws.
 */
export async function detectRegionOnly(
  lang: SupportedLang,
  phoneDigits?: string | null
): Promise<RegionId> {
  const profile = await detectNativeProfileOnce(phoneDigits);
  // If geo found a real region, prefer it; otherwise fall back to the
  // language's home region (a Tamil speaker is tamil-nadu by vocabulary).
  if (profile.region !== 'other' && profile.region !== 'global-diaspora') return profile.region;
  const { regionForLang } = await import('../i18n/regionalTerms');
  return regionForLang(lang);
}
