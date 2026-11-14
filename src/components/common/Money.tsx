import React from 'react';
import { formatMoney } from '../../lib/money';

export interface MoneyProps {
  /** Numeric amount to format through the canonical money formatter. */
  amount?: number | null;
  /**
   * A preformatted display string (or a number). Workspace desks pass
   * their existing `formatWorkspaceAmount` / `useInr()` output here so
   * the displayed digits, symbol and decimals stay byte-identical.
   */
  value?: string | number;
  /** Currency for the numeric path (canonical codes: BDT / INR / USD). */
  currency?: unknown;
  className?: string;
}

/**
 * Money — the shared money figure (Design Elevation Wave 2, Audit 2 #5).
 *
 * The numeric path reuses the app's canonical formatter, `formatMoney`
 * in `lib/money.ts` (the standing "every money display goes through
 * formatMoney" law: symbol from the data's currency, lakh/crore
 * grouping for BDT/INR, standard grouping for USD). The string path
 * renders an already-formatted figure untouched — it exists so desks
 * whose canonical formatter is workspace-scoped (`fmtAmount` /
 * `useInr()`, built on `formatWorkspaceAmount`) adopt the component
 * without a single displayed digit changing.
 *
 * Presentation only: tabular sanctum figures (`.tnum`), colour and
 * size inherited from the surrounding context via `className`.
 */
export const Money: React.FC<MoneyProps> = ({ amount, value, currency, className = '' }) => {
  const display =
    value !== undefined
      ? typeof value === 'number'
        ? formatMoney(value, currency)
        : value
      : formatMoney(Number(amount) || 0, currency);
  return <span className={`tnum ${className}`.trim()}>{display}</span>;
};
