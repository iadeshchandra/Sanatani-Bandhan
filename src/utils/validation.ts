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
