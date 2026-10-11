/**
 * format.ts — Lightweight display formatters shared across desks.
 * INR currency with Indian digit grouping, IST date rendering,
 * day-distance helpers, and a classNames joiner.
 */

/** Format a number as Indian Rupees with en-IN digit grouping. Guards NaN/null/Infinity → "₹0". */
export const formatINR = (n: number | null | undefined): string => {
  const num = Number(n);
  if (n === null || n === undefined || !Number.isFinite(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

/** Render an ISO date string as "DD MMM YYYY" in Asia/Kolkata. Falls back to "-" for bad input. */
export const formatDateIST = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};

/**
 * Whole calendar days from today (local) to the given date string.
 * Negative when the date is in the past, 0 for today. Null-safe.
 */
export const daysUntil = (dateStr: string | null | undefined): number | null => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);
};

/** Join conditional class names, skipping falsy entries. */
export const cx = (...parts: Array<string | false | null | undefined | 0>): string =>
  parts.filter(Boolean).join(' ');
