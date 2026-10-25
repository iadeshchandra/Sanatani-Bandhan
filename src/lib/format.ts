/**
 * Sanatani Bandhan — Locale-aware formatting (Phase 1)
 *
 * Central home for number / currency / date formatting. Never hand-roll
 * commas or currency symbols elsewhere — call these helpers so Indian
 * lakh/crore grouping, compact notation, and Latin-digit money display
 * stay consistent across all 10 languages.
 *
 * Money rule: ALWAYS Latin digits for amounts (₹1,00,000), even in
 * vernacular UI — bank/QR interoperability and fraud-safe readability.
 */

import { bcp47For } from '../i18n/schema';

/* ── App-locale resolution (Language Sweep B3) ──────────────────────
 * The user's CHOSEN app language — never the device locale — drives
 * date/time and plain-number formatting. React surfaces should prefer
 * bcp47For(currentLang) from useLanguage(); non-React modules (PDF
 * generators, stores, contexts) read the same persisted choice
 * LanguageContext writes ('sb-lang', legacy 'sanatani_lang').
 * Money is exempt by standing law: amounts keep Latin digits with
 * lakh/crore grouping (see formatCurrency / the 'en-IN' convention). */
export function appLangCode(): string {
  try {
    return (
      window.localStorage.getItem('sb-lang') ||
      window.localStorage.getItem('sanatani_lang') ||
      'en'
    );
  } catch {
    return 'en';
  }
}

/** BCP-47 tag of the user's chosen app language, e.g. 'bn' → 'bn'. */
export function appLocale(): string {
  return bcp47For(appLangCode());
}

/* ── Currency ────────────────────────────────────────────────────── */

export type CurrencyCode = 'INR' | 'BDT' | 'USD';

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  INR: '₹',
  BDT: '৳',
  USD: '$',
};

/**
 * Format a money amount with Indian digit grouping (lakh/crore):
 * 100000 → "₹1,00,000". Latin digits always, regardless of UI language.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'INR',
  opts: { decimals?: number } = {}
): string {
  const decimals = opts.decimals ?? (Number.isInteger(amount) ? 0 : 2);
  const grouped = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `${CURRENCY_SYMBOL[currency]}${grouped}`;
}

/**
 * Compact money for dashboards: 150000 → "₹1.5L", 23000000 → "₹2.3Cr".
 * Uses Indian compact units (L = lakh, Cr = crore), not K/M.
 */
export function formatCompact(amount: number, currency: CurrencyCode = 'INR'): string {
  const symbol = CURRENCY_SYMBOL[currency];
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `${symbol}${trim1(amount / 1e7)}Cr`;
  if (abs >= 1e5) return `${symbol}${trim1(amount / 1e5)}L`;
  if (abs >= 1e3) return `${symbol}${trim1(amount / 1e3)}K`;
  return `${symbol}${amount}`;
}

function trim1(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Plain grouped number, locale-aware (for counts, quantities). */
export function formatNumber(n: number, langCode = 'en'): string {
  return new Intl.NumberFormat(bcp47For(langCode)).format(n);
}

/* ── Date / time ─────────────────────────────────────────────────── */

export function formatDate(d: Date | string | number, langCode = 'en'): string {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat(bcp47For(langCode), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTime(d: Date | string | number, langCode = 'en'): string {
  const date = d instanceof Date ? d : new Date(d);
  return new Intl.DateTimeFormat(bcp47For(langCode), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatDateTime(d: Date | string | number, langCode = 'en'): string {
  return `${formatDate(d, langCode)} · ${formatTime(d, langCode)}`;
}

/* ── Vikram Samvat ─────────────────────────────────────────────────
 * The Vikram Samvat year begins with Chaitra (roughly mid-March).
 * This is a civil-calendar approximation (Phase 1, ~30 lines) — good
 * for headers and puja context. Precise tithi/panchang math belongs
 * in the dedicated panchang engine, not here.
 */

export function getVikramSamvatYear(d: Date = new Date()): number {
  const gregorianYear = d.getFullYear();
  // VS new year ≈ 22 March (Chaitra Shukla Pratipada). Approximate with
  // 1 April for the civil boundary — off by ~10 days at most.
  const vsNewYearPassed = d.getMonth() > 2 || (d.getMonth() === 2 && d.getDate() >= 22);
  return gregorianYear + 57 + (vsNewYearPassed ? 0 : -1);
}

/**
 * Dual-calendar label for headers: "15 Oct 2026 · वि.सं. 2083".
 * Pass a language code to localise the era abbreviation.
 */
export function vikramSamvatLabel(d: Date = new Date(), langCode = 'en'): string {
  const vs = getVikramSamvatYear(d);
  const eraAbbr: Record<string, string> = {
    en: 'V.S.',
    hi: 'वि.सं.',
    mr: 'वि.सं.',
    bn: 'বি.সং.',
    ta: 'வி.ச.',
    te: 'వి.సం.',
    gu: 'વિ.સં.',
    kn: 'ವಿ.ಸಂ.',
    ml: 'വി.സം.',
    sa: 'वि.सं.',
  };
  const abbr = eraAbbr[langCode] ?? eraAbbr.en;
  return `${formatDate(d, langCode)} · ${abbr} ${vs}`;
}
