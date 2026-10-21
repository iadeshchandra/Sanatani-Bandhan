/**
 * treasuryDisplay.ts — pure currency + 80G gating for treasury surfaces (QUEUED #51).
 * ============================================================================
 * The audit (D10) found the Treasury hard-coding ₹ throughout — column
 * headers, KPI cards, chart axes — inside Bangladeshi orgs whose Settings
 * say Operating Currency BDT ৳, and an "80G" download button on EVERY
 * voucher row: even when eligibility was never marked, and even when the
 * organisation is not 80G-registered at all (Settings itself honestly warns
 * such receipts are SAMPLE with no URN).
 *
 * Two pure resolvers fix both at the root:
 *   1. `resolveWorkspaceCurrency` / `formatWorkspaceAmount` — every amount
 *      and label derives from the workspace's OWN operating currency,
 *      built on `lib/money.ts` (the app's "never hardcode a symbol" law)
 *      with lakh/crore grouping for BDT/INR/NPR.
 *   2. `org80GStatus` / `eightyGReceiptGate` — an official 80G certificate
 *      exists ONLY when the voucher is Income AND was marked 80G-eligible
 *      AND the organisation is 80G-registered AND a real registration
 *      identifier (URN / 80G Reg. No / exemption number) is on file.
 *      Anything else is a SAMPLE: clearly labelled, and the generators
 *      must never print a fabricated serial or identifier for it.
 *
 * Display/labelling/gating only — no amount, total, or ledger behaviour
 * is changed by anything in this module.
 */

import { currencySymbol } from './money';

/* ------------------------------------------------------------------ */
/* Workspace currency                                                  */
/* ------------------------------------------------------------------ */

export interface WorkspaceCurrency {
  /** ISO-ish code as stored on the workspace ('BDT', 'INR', 'USD', …). */
  code: string;
  symbol: string;
}

/** Symbols for Settings-selectable currencies beyond money.ts's core set. */
const EXTRA_SYMBOLS: Record<string, string> = {
  NPR: 'रु',
  GBP: '£',
  EUR: '€',
  AED: 'د.إ',
};

type CurrencyLike = {
  currency?: unknown;
  currencySymbol?: unknown;
} | null | undefined;

/**
 * Resolve the workspace's operating currency. Prefers the stored code,
 * then a stored symbol (older docs), and only as a last resort the
 * platform default from money.ts (INR). A BDT workspace can never resolve
 * to ₹ through this function.
 */
export function resolveWorkspaceCurrency(ws: CurrencyLike): WorkspaceCurrency {
  const rawCode = String(ws?.currency || '').trim().toUpperCase();
  const rawSymbol = String(ws?.currencySymbol || '').trim();

  if (rawCode === 'BDT' || rawCode === 'INR' || rawCode === 'USD') {
    return { code: rawCode, symbol: currencySymbol(rawCode) };
  }
  if (rawCode && EXTRA_SYMBOLS[rawCode]) {
    return { code: rawCode, symbol: EXTRA_SYMBOLS[rawCode] };
  }
  if (rawCode) {
    // Unmapped code (e.g. a future Settings currency): keep the stored
    // symbol if present, else show the code itself — never a foreign symbol.
    return { code: rawCode, symbol: rawSymbol || rawCode };
  }
  if (rawSymbol === '৳') return { code: 'BDT', symbol: rawSymbol };
  if (rawSymbol === '₹') return { code: 'INR', symbol: rawSymbol };
  if (rawSymbol === '$') return { code: 'USD', symbol: rawSymbol };
  if (rawSymbol) return { code: '', symbol: rawSymbol };
  return { code: 'INR', symbol: currencySymbol('INR') };
}

/**
 * Format an amount in a resolved workspace currency: symbol + grouped
 * digits, up to 2 decimals preserved (treasury vouchers carry paise/
 * poisha). BDT/INR/NPR group en-IN (lakh/crore convention); others en-US.
 */
export function formatWorkspaceAmount(
  amount: number,
  currency: WorkspaceCurrency
): string {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  const locale = ['BDT', 'INR', 'NPR'].includes(currency.code) ? 'en-IN' : 'en-US';
  return `${currency.symbol}${safe.toLocaleString(locale, {
    maximumFractionDigits: 2,
  })}`;
}

/** Convenience: resolve + format in one call from a workspace-ish object. */
export function formatAmountForWorkspace(amount: number, ws: CurrencyLike): string {
  return formatWorkspaceAmount(amount, resolveWorkspaceCurrency(ws));
}

/* ------------------------------------------------------------------ */
/* 80G gating                                                          */
/* ------------------------------------------------------------------ */

export interface Org80GStatus {
  /** The org declares itself 80G-registered (Settings → Legal). */
  registered: boolean;
  /** A REAL registration identifier on file — never a fabricated one. */
  identifier: string | null;
  /** True only when an official certificate may be produced at all. */
  officialCapable: boolean;
  reason: 'ok' | 'not-registered' | 'missing-identifier';
}

const firstNonEmpty = (ws: any, keys: string[]): string | null => {
  for (const k of keys) {
    const v = String(ws?.[k] ?? '').trim();
    if (v) return v;
  }
  return null;
};

/**
 * The organisation half of the 80G gate. Registration alone is not enough:
 * Settings' own compliance checklist only treats 80G as complete when the
 * flag AND a URN are saved, because a certificate without a real
 * identifier is an official-looking document the org cannot stand behind.
 */
export function org80GStatus(ws: any): Org80GStatus {
  const registered = !!ws?.trust80GRegistered;
  const identifier = firstNonEmpty(ws, [
    'trust80GURN',
    'trust80GRegNo',
    'taxExemptionNumber',
    'pan80GNumber',
  ]);
  if (!registered) return { registered, identifier, officialCapable: false, reason: 'not-registered' };
  if (!identifier) return { registered, identifier, officialCapable: false, reason: 'missing-identifier' };
  return { registered, identifier, officialCapable: true, reason: 'ok' };
}

export type EightyGReceiptReason =
  | 'official'
  | 'not-income'
  | 'not-eligible'
  | 'org-not-registered'
  | 'missing-identifier';

export interface EightyGReceiptGate {
  mode: 'official' | 'sample';
  reason: EightyGReceiptReason;
  /** Short action label: '80G' (official) or 'SAMPLE' (preview only). */
  actionLabel: string;
  /** Honest one-line explanation for titles/tooltips/toasts. */
  explanation: string;
}

/**
 * The full gate for one voucher + workspace. Official requires ALL of:
 * Income type, voucher marked 80G-eligible, org registered, and a real
 * identifier on file. Every other combination resolves to SAMPLE with the
 * specific reason, so the UI never has to guess — and never mints an
 * official-looking tax document the facts don't support.
 */
export function eightyGReceiptGate(tx: any, ws: any): EightyGReceiptGate {
  if (!tx || tx.type !== 'Income') {
    return {
      mode: 'sample',
      reason: 'not-income',
      actionLabel: 'SAMPLE',
      explanation: 'Only income vouchers can carry an 80G receipt.',
    };
  }
  if (tx.is80GEligible !== true) {
    return {
      mode: 'sample',
      reason: 'not-eligible',
      actionLabel: 'SAMPLE',
      explanation: 'This voucher was not marked 80G-eligible — no official 80G certificate exists for it.',
    };
  }
  const org = org80GStatus(ws);
  if (!org.registered) {
    return {
      mode: 'sample',
      reason: 'org-not-registered',
      actionLabel: 'SAMPLE',
      explanation: 'This organisation is not 80G-registered — the receipt is a SAMPLE with no URN.',
    };
  }
  if (!org.identifier) {
    return {
      mode: 'sample',
      reason: 'missing-identifier',
      actionLabel: 'SAMPLE',
      explanation: '80G registration is saved without a URN / registration number — add it in Settings before issuing official receipts.',
    };
  }
  return {
    mode: 'official',
    reason: 'official',
    actionLabel: '80G',
    explanation: 'Official 80G certificate — eligible voucher, registered organisation.',
  };
}
