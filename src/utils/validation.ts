/**
 * validation.ts — Shared input validators for desk forms.
 * Every validator is pure, null-safe, and returns a boolean.
 * Pair with inline error messages + toast; never fail silently.
 */

/** Positive, finite monetary amount. Rejects 0, negatives, NaN, Infinity, non-numbers. */
export const isValidAmount = (n: unknown): n is number => {
  const num = typeof n === 'string' ? Number(n) : (n as number);
  return typeof num === 'number' && Number.isFinite(num) && num > 0;
};

/** Same as isValidAmount but permits zero (e.g. optional deposits, discounts). */
export const isValidAmountOrZero = (n: unknown): boolean => {
  const num = typeof n === 'string' ? Number(n) : (n as number);
  return typeof num === 'number' && Number.isFinite(num) && num >= 0;
};

/** Indian 10-digit mobile number. Accepts +91 / 91 prefixes and spaces/dashes. */
export const isValidPhoneIN = (phone: unknown): boolean => {
  if (typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '').replace(/^(91|0)/, '');
  return /^[6-9]\d{9}$/.test(digits);
};

/** Normalize an Indian phone to 10 digits (strips +91/91/0 prefix). Returns '' if invalid. */
export const normalizePhoneIN = (phone: unknown): string => {
  if (typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '').replace(/^(91|0)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
};

/* ------------------------------------------------------------------ */
/* Geo-aware phone validation — QUEUED #49.                            */
/* The platform serves Bangladesh and India alike: a BD org's own      */
/* number (01608533529) must never be rejected as "not a 10-digit       */
/* Indian mobile". Accepted shapes, in every form, regardless of the    */
/* org's country (cross-border devotees are normal):                   */
/*   BD mobile   01[3-9] + 8 digits (11) · 880… · +880…                */
/*   IN mobile   [6-9] + 9 digits (10) · 91… / 0-trunk · +91…          */
/*   Any other   full international E.164: '+' + 7–15 digits           */
/* The org/user country only shapes the error message (which example   */
/* is shown first), never which numbers are welcome. Payment-rail      */
/* formats (UPI etc.) keep their own stricter rules elsewhere.         */
/* ------------------------------------------------------------------ */

export type PhoneGeo = 'BD' | 'IN' | 'INTL';

export interface ParsedPhone {
  valid: boolean;
  /** Numbering plan the number itself belongs to (null when invalid). */
  geo: PhoneGeo | null;
  /** E.164 form, e.g. '+8801608533529' / '+919876501234'. '' when invalid. */
  e164: string;
  /**
   * Country-code-insensitive comparison key (national significant number):
   * BD 01608533529 / +8801608533529 → '1608533529'; IN 9876501234 /
   * +919876501234 → '9876501234'. '' for valid numbers outside BD/IN.
   */
  nationalKey: string;
}

const BD_MOBILE_NATIONAL = /^1[3-9]\d{8}$/; // BD mobile without trunk 0 / country code
const IN_MOBILE_NATIONAL = /^[6-9]\d{9}$/; // IN mobile (also its national form)

const INVALID_PHONE: ParsedPhone = { valid: false, geo: null, e164: '', nationalKey: '' };

/** Parse any accepted phone shape into geo + E.164 + comparison key. Pure, null-safe. */
export const parsePhone = (phone: unknown): ParsedPhone => {
  if (typeof phone !== 'string') return INVALID_PHONE;
  const raw = phone.trim();
  if (!raw) return INVALID_PHONE;
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return INVALID_PHONE;

  if (hasPlus) {
    // Explicit international form: E.164 allows 7–15 digits, never a leading 0.
    if (digits.length < 7 || digits.length > 15 || digits.startsWith('0')) return INVALID_PHONE;
    let geo: PhoneGeo = 'INTL';
    let nationalKey = '';
    let e164 = `+${digits}`;
    if (digits.startsWith('880')) {
      geo = 'BD';
      let national = digits.slice(3);
      if (national.startsWith('0')) national = national.slice(1); // +880 01608… typed with trunk 0
      if (BD_MOBILE_NATIONAL.test(national)) {
        nationalKey = national;
        e164 = `+880${national}`; // canonical: trunk 0 never survives into E.164
      }
    } else if (digits.startsWith('91')) {
      geo = 'IN';
      let national = digits.slice(2);
      if (national.startsWith('0')) national = national.slice(1);
      if (IN_MOBILE_NATIONAL.test(national)) {
        nationalKey = national;
        e164 = `+91${national}`;
      }
    }
    return { valid: true, geo, e164, nationalKey };
  }

  // Local / country-code forms without '+'.
  if (digits.length === 11 && digits.startsWith('01') && BD_MOBILE_NATIONAL.test(digits.slice(1))) {
    const national = digits.slice(1);
    return { valid: true, geo: 'BD', e164: `+880${national}`, nationalKey: national };
  }
  if (digits.length === 13 && digits.startsWith('880') && BD_MOBILE_NATIONAL.test(digits.slice(3))) {
    const national = digits.slice(3);
    return { valid: true, geo: 'BD', e164: `+880${national}`, nationalKey: national };
  }
  if (digits.length === 10 && IN_MOBILE_NATIONAL.test(digits)) {
    return { valid: true, geo: 'IN', e164: `+91${digits}`, nationalKey: digits };
  }
  if (digits.length === 12 && digits.startsWith('91') && IN_MOBILE_NATIONAL.test(digits.slice(2))) {
    const national = digits.slice(2);
    return { valid: true, geo: 'IN', e164: `+91${national}`, nationalKey: national };
  }
  if (digits.length === 11 && digits.startsWith('0') && IN_MOBILE_NATIONAL.test(digits.slice(1))) {
    const national = digits.slice(1);
    return { valid: true, geo: 'IN', e164: `+91${national}`, nationalKey: national };
  }
  return INVALID_PHONE;
};

/** Geo-aware validity: BD mobile, IN mobile, or full E.164 — all welcome everywhere. */
export const isValidPhone = (phone: unknown): boolean => parsePhone(phone).valid;

/**
 * Comparison key for duplicate detection across formats and borders:
 * '01608533529', '+880 1608-533529' and '8801608533529' all key to
 * '1608533529'; IN formats key to the 10-digit national number.
 * Returns '' when the number is invalid or outside BD/IN.
 */
export const phoneNationalKey = (phone: unknown): string => parsePhone(phone).nationalKey;

/** Map a free-form country value ('Bangladesh', 'BD', 'India', 'Bharat', …) to a geo. */
export const phoneGeoForCountry = (country?: string | null): PhoneGeo | null => {
  if (!country) return null;
  const c = country.trim().toUpperCase();
  if (c === 'BD' || c === 'BANGLADESH') return 'BD';
  if (c === 'IN' || c === 'INDIA' || c === 'BHARAT') return 'IN';
  return null;
};

/**
 * Error copy for an invalid phone. The FIRST example follows the org's /
 * user's country (a Bangladeshi org is never told to enter an "Indian
 * mobile"); the accepted formats are always named in full.
 */
export const phoneErrorMessage = (country?: string | null): string => {
  switch (phoneGeoForCountry(country)) {
    case 'BD':
      return 'Please enter a valid mobile number — e.g. 01608533529 (Bangladesh), 9876501234 (India), or full +880 / +91 format.';
    case 'IN':
      return 'Please enter a valid mobile number — e.g. 9876501234 (India), 01608533529 (Bangladesh), or full +91 / +880 format.';
    default:
      return 'Please enter a valid mobile number — e.g. 01608533529 (Bangladesh), 9876501234 (India), or full international +country format.';
  }
};

/** Indian PAN format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F). */
export const isValidPAN = (pan: unknown): boolean => {
  if (typeof pan !== 'string') return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim().toUpperCase());
};

/** True when both dates parse and start <= end. Empty end is treated as open-ended (valid). */
export const isValidDateRange = (
  start: string | null | undefined,
  end: string | null | undefined
): boolean => {
  if (!start) return false;
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return false;
  if (!end) return true;
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return false;
  return s.getTime() <= e.getTime();
};

/** True when two closed date ranges overlap (inclusive). Null-safe. */
export const rangesOverlap = (
  aStart: string | null | undefined,
  aEnd: string | null | undefined,
  bStart: string | null | undefined,
  bEnd: string | null | undefined
): boolean => {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  if ([as, ae, bs, be].some(Number.isNaN)) return false;
  return as <= be && bs <= ae;
};

/** Trim + collapse internal whitespace + cap length. Never returns undefined. */
export const sanitizeName = (name: unknown, maxLen = 80): string => {
  if (typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ').slice(0, maxLen);
};

/** Non-empty after sanitize. */
export const isNonEmptyName = (name: unknown): boolean => sanitizeName(name).length > 0;

/** Quantity must be a positive integer within a sane cap (default 999). */
export const isValidQuantity = (q: unknown, max = 999): boolean => {
  const num = typeof q === 'string' ? Number(q) : (q as number);
  return Number.isInteger(num) && num > 0 && num <= max;
};

/** Percentage in 0–100. */
export const isValidPercent = (p: unknown): boolean => {
  const num = typeof p === 'string' ? Number(p) : (p as number);
  return typeof num === 'number' && Number.isFinite(num) && num >= 0 && num <= 100;
};
