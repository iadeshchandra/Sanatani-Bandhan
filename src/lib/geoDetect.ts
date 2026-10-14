/**
 * geoDetect.ts — determine the user's payment region for geo-based billing.
 *
 * Resolution order:
 *   1. Phone country code from the user profile (+880 → BD, +91 → IN)
 *   2. IP geolocation via ipapi.co (free, no key, 6s timeout)
 *   3. Manual selector on the billing page (handled by the caller)
 *
 * Result is cached in localStorage for 24h.
 */

export type PayRegion = 'BD' | 'IN' | 'INTL';

const CACHE_KEY = 'sb_pay_region';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function fromPhone(phone?: string | null): PayRegion | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('880')) return 'BD';
  if (digits.startsWith('91') && digits.length >= 12) return 'IN';
  // Any other explicit country code → international.
  if (digits.length >= 7) return 'INTL';
  return null;
}

async function fromIp(): Promise<PayRegion | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = (await res.json()) as { country_code?: string };
    const cc = String(j.country_code || '').toUpperCase();
    if (cc === 'BD') return 'BD';
    if (cc === 'IN') return 'IN';
    if (cc) return 'INTL';
    return null;
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
    return parsed.region === 'BD' || parsed.region === 'IN' || parsed.region === 'INTL'
      ? parsed.region
      : null;
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
 * Resolve the payment region. Phone first, then IP, then INTL default.
 * Never throws — worst case returns 'INTL'.
 */
export async function detectPayRegion(phone?: string | null): Promise<PayRegion> {
  try {
    const cached = getCachedRegion();
    if (cached) return cached;
    const byPhone = fromPhone(phone);
    if (byPhone) {
      setCachedRegion(byPhone);
      return byPhone;
    }
    const byIp = await fromIp();
    const region: PayRegion = byIp || 'INTL';
    setCachedRegion(region);
    return region;
  } catch {
    return 'INTL';
  }
}

/** Human label for a region (used in tab switchers). */
export const REGION_LABEL: Record<PayRegion, string> = {
  BD: 'Bangladesh',
  IN: 'India',
  INTL: 'International',
};
