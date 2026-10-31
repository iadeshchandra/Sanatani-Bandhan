/**
 * jyotish/useGeoCurrency.ts — the viewer's own currency (JY-14).
 * =====================================================================
 * Budget and fee labels in the jyotish surfaces were hard-labelled ₹
 * even for a devotee in Dhaka (৳) or abroad ($). The dakshina sheet
 * already resolved the user's currency from their region; this hook
 * gives every jyotish label the same truth: resolve once via
 * defaultDakshinaCurrency() (phone region → IP → INR default), and
 * format through lib/money — the standing law is that currency symbols
 * are never hardcoded in components.
 */
import { useEffect, useState } from 'react';
import { defaultDakshinaCurrency } from './dakshinaOrders';
import { currencySymbol } from '../lib/money';

export function useGeoCurrency(): { currency: string; symbol: string } {
  const [currency, setCurrency] = useState<string>('INR');
  useEffect(() => {
    let live = true;
    defaultDakshinaCurrency()
      .then((c) => {
        if (live && c) setCurrency(c);
      })
      .catch(() => {
        /* INR default stands — detection is best-effort */
      });
    return () => {
      live = false;
    };
  }, []);
  return { currency, symbol: currencySymbol(currency) };
}
