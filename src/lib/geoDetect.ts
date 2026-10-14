/**
 * geoDetect.ts — determine the user's payment region for geo-based billing.
 *
 * Resolution order:
 *   1. Phone country code from the user profile (configurable mappings)
 *   2. IP geolocation via ipapi.co (free, no key, 6s timeout)
 *   3. Manual selector on the billing page (handled by the caller)
 *
 * Result is cached in localStorage for 24h.
 *
 * Regions are EXTENSIBLE: the default set is BD / IN / INTL, but the owner
 * can add new regions (e.g. UK, USA, AE) from GodMode → Settings → Geo
 * Payments. Custom config lives in Firestore `geoPaymentConfig/config`;
 * when unreachable, the hardcoded DEFAULT_REGIONS apply.
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/** A payment region. Extensible — defaults are 'BD' | 'IN' | 'INTL'. */
export type PayRegion = string;

export interface RegionConfig {
  /** Region id, e.g. 'BD', 'IN', 'INTL', 'UK'. Uppercase, no spaces. */
  id: string;
  /** Display name, e.g. 'Bangladesh'. */
  name: string;
  /** ISO currency code, e.g. 'BDT'. */
  currency: string;
  /** Currency symbol, e.g. '৳'. */
  currencySymbol: string;
  /** Phone digit prefixes that map to this region, e.g. ['880']. */
  countryCodes: string[];
  /** ISO country codes for IP geolocation, e.g. ['BD']. */
  ipCountries: string[];
  /** Region visible to users. */
  enabled: boolean;
  /** Flag emoji for UI, e.g. '🇧🇩'. */
  flag?: string;
}

export interface GeoPaymentConfig {
  regions: RegionConfig[];
  defaultRegion: string;
}

/** Hardcoded fallback — mirrors the GodMode seed. Edit via GodMode, not here. */
export const DEFAULT_REGIONS: RegionConfig[] = [
  {
    id: 'BD',
    name: 'Bangladesh',
    currency: 'BDT',
    currencySymbol: '৳',
    countryCodes: ['880'],
    ipCountries: ['BD'],
    enabled: true,
    flag: '🇧🇩',
  },
  {
    id: 'IN',
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    countryCodes: ['91'],
    ipCountries: ['IN'],
    enabled: true,
    flag: '🇮🇳',
  },
  {
    id: 'INTL',
    name: 'International',
    currency: 'USD',
    currencySymbol: '$',
    countryCodes: [],
    ipCountries: [],
    enabled: true,
    flag: '🌍',
  },
];

export const DEFAULT_GEO_CONFIG: GeoPaymentConfig = {
  regions: DEFAULT_REGIONS,
  defaultRegion: 'INTL',
};

const CACHE_KEY = 'sb_pay_region';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/* ------------------------- Firestore config ------------------------- */

let configCache: { at: number; config: GeoPaymentConfig } | null = null;
const CONFIG_TTL_MS = 5 * 60 * 1000;

/** Owner-configured regions, or the hardcoded defaults when unreachable. Never throws. */
export async function getGeoPaymentConfig(): Promise<GeoPaymentConfig> {
  if (configCache && Date.now() - configCache.at < CONFIG_TTL_MS) return configCache.config;
  try {
    const snap = await getDoc(doc(db, 'geoPaymentConfig', 'config'));
    if (snap.exists()) {
      const d = snap.data() as Partial<GeoPaymentConfig>;
      const regions = Array.isArray(d.regions) && d.regions.length > 0
        ? (d.regions as RegionConfig[]).filter((r) => r && typeof r.id === 'string')
        : DEFAULT_REGIONS;
      const config: GeoPaymentConfig = {
        regions,
        defaultRegion: typeof d.defaultRegion === 'string' && d.defaultRegion ? d.defaultRegion : 'INTL',
      };
      configCache = { at: Date.now(), config };
      return config;
    }
  } catch (e) {
    console.warn('[geoDetect] Firestore config read failed, using defaults:', e);
  }
  return DEFAULT_GEO_CONFIG;
}

export function clearGeoConfigCache(): void {
  configCache = null;
}

/* ------------------------- Detection ------------------------- */

function fromPhone(phone: string | null | undefined, regions: RegionConfig[]): PayRegion | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  // Longest-prefix match so '8801' doesn't collide with a shorter code.
  const sorted = [...regions]
    .filter((r) => r.enabled && r.countryCodes.length > 0)
    .sort((a, b) => Math.max(...b.countryCodes.map((c) => c.length)) - Math.max(...a.countryCodes.map((c) => c.length)));
  for (const r of sorted) {
    for (const code of r.countryCodes) {
      if (code && digits.startsWith(code)) return r.id;
    }
  }
  // Any other explicit country code → default region (usually INTL).
  return null;
}

async function fromIp(regions: RegionConfig[]): Promise<PayRegion | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = (await res.json()) as { country_code?: string };
    const cc = String(j.country_code || '').toUpperCase();
    if (!cc) return null;
    const match = regions.find((r) => r.enabled && r.ipCountries.includes(cc));
    return match ? match.id : null;
  } catch {
    return null;
  }
}

export function getCachedRegion(): PayRegion | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { region?: string; at?: number };
    if (!parsed.at || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return typeof parsed.region === 'string' && parsed.region ? parsed.region : null;
  } catch {
    return null;
  }
}

export function setCachedRegion(region: PayRegion): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ region, at: Date.now() }));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function clearCachedRegion(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Resolve the payment region. Phone first, then IP, then the configured
 * default (INTL). Never throws — worst case returns the default region.
 */
export async function detectPayRegion(phone?: string | null): Promise<PayRegion> {
  try {
    const cached = getCachedRegion();
    if (cached) return cached;
    const config = await getGeoPaymentConfig();
    const byPhone = fromPhone(phone, config.regions);
    if (byPhone) {
      setCachedRegion(byPhone);
      return byPhone;
    }
    const byIp = await fromIp(config.regions);
    const region: PayRegion = byIp || config.defaultRegion;
    setCachedRegion(region);
    return region;
  } catch {
    return 'INTL';
  }
}

/** Human label for a region (used in tab switchers). */
export function regionLabel(regionId: string, regions?: RegionConfig[]): string {
  const list = regions || DEFAULT_REGIONS;
  const r = list.find((x) => x.id === regionId);
  return r ? `${r.flag ? r.flag + ' ' : ''}${r.name}` : regionId;
}

/** Back-compat label map for the three default regions. */
export const REGION_LABEL: Record<string, string> = {
  BD: '🇧🇩 Bangladesh',
  IN: '🇮🇳 India',
  INTL: '🌍 International',
};
