/**
 * money.ts — Currency-aware money formatting.
 * ============================================================================
 * STANDING LAW: never hardcode a currency symbol (₹/৳/$) in a component.
 * Every money display goes through `formatMoney(amount, currency)`, where
 * currency is the truth carried by the data (order.currency, gig.priceCurrency,
 * due.currency, wallet.currency) — never the viewer's locale.
 *
 * A BD buyer paying in BDT sees ৳ even if the provider is Indian.
 *
 * Formatting:
 * - BDT / INR: lakh-crore grouping (en-IN) — 1,00,000
 * - USD: standard grouping (en-US) — 1,000,000
 * - Unknown/missing currency: falls back to ₹ (INR) — never a bare number.
 */

/** Canonical currency codes used across marketplace + wallet. */
export type MoneyCurrency = 'BDT' | 'INR' | 'USD';

const SYMBOLS: Record<MoneyCurrency, string> = { BDT: '৳', INR: '₹', USD: '$' };

/** Normalize any currency-ish input to a canonical code. Unknown → 'INR'. */
export function normalizeCurrency(raw: unknown): MoneyCurrency {
  const c = String(raw || '').trim().toUpperCase();
  return c === 'BDT' || c === 'INR' || c === 'USD' ? c : 'INR';
}

/**
 * Format an amount in the given currency.
 * `formatMoney(1500, 'BDT')` → `'৳1,500'`
 * `formatMoney(100000, 'INR')` → `'₹1,00,000'` (lakh-crore)
 * `formatMoney(1000000, 'USD')` → `'$1,000,000'`
 */
export function formatMoney(amount: number, currency?: unknown): string {
  const c = normalizeCurrency(currency);
  const sym = SYMBOLS[c];
  const n = Math.round(Number(amount) || 0);
  const locale = c === 'USD' ? 'en-US' : 'en-IN';
  return `${sym}${n.toLocaleString(locale)}`;
}

/** Symbol for a currency, for labels like "Amount (৳)". */
export function currencySymbol(currency?: unknown): string {
  return SYMBOLS[normalizeCurrency(currency)];
}
