/**
 * uniqueAmount.ts — Unique payable amounts for Rail-2 (provider-direct) orders.
 * ===========================================================================
 * Layer 3 of the Rail-2 tracking stack.
 *
 * Problem: when a client pays a provider directly via bKash/Nagad/UPI, the
 * platform needs to match that off-platform payment to the on-platform order.
 * Solution: assign each order a UNIQUE payable amount (base price + small
 * suffix). When the owner sees "৳1,007" arrive in bKash, they know exactly
 * which order it belongs to — no two pending orders share the same amount.
 *
 * BDT: whole taka (bKash/Nagad don't do paisa well) → suffix 1–99.
 * INR: paisa supported (UPI) → suffix 0.01–0.99.
 */
export interface PayableAmount {
  /** Exact amount the client must pay (e.g. 1007 for BDT, 501.07 for INR). */
  payableAmount: number;
  /** The unique suffix code (e.g. 7 for ৳1,007, or 0.07 for ₹501.07). */
  amountCode: number;
  /** Currency of the amount. */
  currency: string;
  /** Human display, e.g. "৳1,007" or "₹501.07". */
  display: string;
}

const CURRENCY_SYMBOL: Record<string, string> = { BDT: '৳', INR: '₹', USD: '$' };

/**
 * Assign a unique payable amount for an order.
 * @param basePrice The gig price (integer).
 * @param orderSeq  A per-provider monotonically increasing sequence number
 *                  (e.g. provider's total order count + 1). Deterministic so
 *                  retries / re-renders produce the same amount.
 * @param currency  BDT | INR | USD.
 */
export function assignPayableAmount(basePrice: number, orderSeq: number, currency: string): PayableAmount {
  const cur = (currency || 'INR').toUpperCase();
  const base = Math.round(Number(basePrice));
  let payableAmount: number;
  let amountCode: number;
  if (cur === 'BDT') {
    // Whole taka: suffix 1–99 (never 0, so it never equals the base price).
    amountCode = (orderSeq % 99) + 1;
    payableAmount = base + amountCode;
  } else if (cur === 'INR') {
    // Paisa suffix: 0.01–0.99
    amountCode = ((orderSeq % 99) + 1) / 100;
    payableAmount = Math.round((base + amountCode) * 100) / 100;
  } else {
    // USD / other: cent suffix
    amountCode = ((orderSeq % 99) + 1) / 100;
    payableAmount = Math.round((base + amountCode) * 100) / 100;
  }
  const sym = CURRENCY_SYMBOL[cur] || cur + ' ';
  return {
    payableAmount,
    amountCode,
    currency: cur,
    display: `${sym}${payableAmount.toLocaleString(cur === 'BDT' ? 'bn-BD' : 'en-IN', {
      minimumFractionDigits: cur === 'BDT' ? 0 : 2,
      maximumFractionDigits: cur === 'BDT' ? 0 : 2,
    })}`,
  };
}

/**
 * Generate a short human-friendly order code: SB-XXXXXX.
 * Used as the payment reference/note the client enters in bKash/Nagad/UPI.
 */
export function generateOrderCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing 0/O, 1/I
  let s = '';
  const rnd = new Uint8Array(6);
  (globalThis.crypto?.getRandomValues ? globalThis.crypto.getRandomValues(rnd) : rnd.map(() => Math.floor(Math.random() * 256)));
  for (let i = 0; i < 6; i++) s += chars[rnd[i] % chars.length];
  return `SB-${s}`;
}

/**
 * Reconciliation helper: given a received amount and a list of pending
 * Rail-2 orders, find the order whose payableAmount matches exactly.
 */
export function matchOrderByAmount<T extends { payableAmount?: number }>(receivedAmount: number, orders: T[]): T | null {
  return orders.find((o) => Number(o.payableAmount) === Number(receivedAmount)) || null;
}
