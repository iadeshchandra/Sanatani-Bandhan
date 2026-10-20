/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva — normalization. Pure, no imports.                  */
/*                                                                     */
/* THE highest-probability corruption source in paper digitization    */
/* is numerals: a phone typed as ০১৭… (Bengali digits) or an amount    */
/* written ৫০০ will silently poison dedupe and money if stored raw.   */
/* Every input path (typed, CSV, later OCR/voice) funnels through      */
/* here BEFORE validation, dedupe, or storage.                         */
/* ------------------------------------------------------------------ */

const BN_DIGITS = '০১২৩৪৫৬৭৮৯'; // U+09E6–U+09EF
const DEV_DIGITS = '०१२३४५६७८९'; // U+0966–U+096F

/** Convert Bengali and Devanagari digits to ASCII 0-9. All other
 *  characters pass through untouched. */
export function normalizeDigits(input: string): string {
  if (!input) return '';
  let out = '';
  for (const ch of String(input)) {
    const bn = BN_DIGITS.indexOf(ch);
    if (bn >= 0) { out += String(bn); continue; }
    const dev = DEV_DIGITS.indexOf(ch);
    if (dev >= 0) { out += String(dev); continue; }
    out += ch;
  }
  return out;
}

/** Display digits in the reader's numeral system (entry stores ASCII;
 *  display gives the digits back in the user's own script). */
export function displayDigits(value: number | string, lang: string): string {
  const s = String(value);
  if (lang === 'bn') return s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
  if (lang === 'hi' || lang === 'sa' || lang === 'mr') {
    return s.replace(/[0-9]/g, (d) => DEV_DIGITS[Number(d)]);
  }
  return s;
}

/** Digits-only form of any typed number/phone text. */
export function digitsOnly(input: string): string {
  return normalizeDigits(String(input || '')).replace(/\D/g, '');
}

/**
 * Phone comparison key: national number, country-code-insensitive.
 *  +880 1712-345678 → 1712345678 · 01712345678 → 1712345678
 *  +91 98765 43210  → 9876543210 · 9876543210  → 9876543210
 * Matches the spirit of validation.normalizePhoneIN while also
 * covering Bangladeshi numbers (the app's home market).
 */
export function phoneKey(raw: string | null | undefined): string {
  let d = digitsOnly(String(raw || ''));
  if (d.length === 13 && d.startsWith('880')) d = d.slice(3);
  else if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

/** A phone is usable for dedupe when its key is a full national number. */
export function isUsablePhoneKey(key: string): boolean {
  return key.length === 10;
}

/**
 * Parse a register amount: digits in any of the three scripts, thousand
 * commas (Indian or western grouping), ৳ / ₹ / Rs / Tk decorations.
 * Returns null when the text carries no number at all.
 */
export function parseAmount(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const cleaned = normalizeDigits(String(raw))
    .replace(/[৳₹]/g, '')
    .replace(/\b(rs|tk|taka|inr|bdt)\b/gi, '')
    .replace(/,/g, '')
    .trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Parse a plain integer field (age, count). Null when not numeric. */
export function parseCount(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const cleaned = normalizeDigits(String(raw)).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/** Parse a 4-digit year from register text ("came in ২০১৯"). */
export function parseYear(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const m = normalizeDigits(String(raw)).match(/(1[89]\d{2}|20\d{2}|21\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1950 && y <= 2100 ? y : null;
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function validDate(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1) return null;
  const dim = mo === 2 && isLeap(y) ? 29 : DAYS_IN_MONTH[mo - 1];
  if (d > dim) return null;
  const p = (n: number, w: number) => String(n).padStart(w, '0');
  return `${p(y, 4)}-${p(mo, 2)}-${p(d, 2)}`;
}

/**
 * Parse a register date into ISO yyyy-mm-dd. Accepts dd/mm/yyyy,
 * dd-mm-yyyy, dd.mm.yyyy (the paper forms) and yyyy-mm-dd. Digits may
 * be Bengali/Devanagari. Returns null for anything else or impossible
 * dates — never guesses.
 */
export function parseRegisterDate(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const s = normalizeDigits(String(raw)).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return validDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return validDate(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}

export interface AgeArrival {
  /** Stated age in years, or null when the paper gives none. */
  ageYears: number | null;
  /** Year the animal arrived/was born, when the paper gives one. */
  arrivalYear: number | null;
  /** True when age is genuinely unknown — the register gave only an
   *  arrival year (or nothing). NEVER replaced by a fabricated age. */
  ageUnknown: boolean;
}

/**
 * Resolve the herd age/arrival pair honestly:
 *  - age typed            → that age (arrival year kept if also given)
 *  - only arrival year    → age stays UNKNOWN (null), arrival recorded
 *  - neither              → both unknown
 * Estimating an age from an arrival year would fabricate a fact the
 * paper never stated — vet and milk logic downstream would trust it.
 */
export function resolveAgeArrival(ageRaw?: string, arrivalYearRaw?: string): AgeArrival {
  const age = parseCount(ageRaw);
  const year = parseYear(arrivalYearRaw);
  if (age !== null) return { ageYears: age, arrivalYear: year, ageUnknown: false };
  if (year !== null) return { ageYears: null, arrivalYear: year, ageUnknown: true };
  return { ageYears: null, arrivalYear: null, ageUnknown: true };
}
