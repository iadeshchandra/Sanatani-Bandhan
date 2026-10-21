/**
 * workspaceCurrency.test.ts — QUEUED #60: ONE currency law for all
 * org money surfaces.
 *
 * Pins:
 *  1. The same amount renders with the workspace's own symbol —
 *     ৳ for a BDT workspace, ₹ for INR, $ for USD — through the single
 *     resolver every suite `inr()` and ERP desk now binds (useInr →
 *     formatAmountForWorkspace → formatWorkspaceAmount).
 *  2. Digit grouping follows the currency: en-IN lakh grouping for
 *     BDT/INR/NPR, en-US grouping otherwise.
 *  3. Amounts are NEVER converted — 100000 stays 100000 in every
 *     currency; only symbol + grouping change.
 *  4. The QuickChandaPOS receipt path formats through the same
 *     resolver, so a printed receipt follows the workspace currency.
 *  5. Receipt amount-in-words follows the currency's English unit
 *     (pathshala receiptWords currencyCode parameter).
 *  6. auditTrail formatters keep their ₹ default byte-identical
 *     (statutory callers + existing pins) while accepting a symbol.
 */
import {
  resolveWorkspaceCurrency,
  formatWorkspaceAmount,
  formatAmountForWorkspace,
} from '../lib/treasuryDisplay';
import { receiptWords } from '../pathshala/bn';
import { formatLakhCrore, formatINRFull } from '../lib/auditTrail';

const bdt = { currency: 'BDT' };
const inrWs = { currency: 'INR' };
const usd = { currency: 'USD' };

describe('workspace currency law (#60)', () => {
  it('resolves symbol + code from the workspace currency', () => {
    expect(resolveWorkspaceCurrency(bdt)).toEqual({ code: 'BDT', symbol: '৳' });
    expect(resolveWorkspaceCurrency(inrWs)).toEqual({ code: 'INR', symbol: '₹' });
    expect(resolveWorkspaceCurrency(usd)).toEqual({ code: 'USD', symbol: '$' });
  });

  it('falls back to the workspace currencySymbol, then INR', () => {
    expect(resolveWorkspaceCurrency({ currencySymbol: '€' }).symbol).toBe('€');
    expect(resolveWorkspaceCurrency(null)).toEqual({ code: 'INR', symbol: '₹' });
    expect(resolveWorkspaceCurrency(undefined)).toEqual({ code: 'INR', symbol: '₹' });
  });

  it('renders the SAME amount in each workspace currency — symbol only', () => {
    expect(formatAmountForWorkspace(2500, bdt)).toBe('৳2,500');
    expect(formatAmountForWorkspace(2500, inrWs)).toBe('₹2,500');
    expect(formatAmountForWorkspace(2500, usd)).toBe('$2,500');
  });

  it('groups per currency: lakh grouping for BDT/INR, US grouping for USD', () => {
    expect(formatAmountForWorkspace(100000, bdt)).toBe('৳1,00,000');
    expect(formatAmountForWorkspace(100000, inrWs)).toBe('₹1,00,000');
    expect(formatAmountForWorkspace(100000, usd)).toBe('$100,000');
    expect(formatAmountForWorkspace(1234567, usd)).toBe('$1,234,567');
  });

  it('never converts: the numeric value is identical across currencies', () => {
    const strip = (s: string) => s.replace(/[^0-9]/g, '');
    expect(strip(formatAmountForWorkspace(1234567, bdt))).toBe('1234567');
    expect(strip(formatAmountForWorkspace(1234567, usd))).toBe('1234567');
  });

  it('formatWorkspaceAmount takes a resolved currency (POS receipt path)', () => {
    // QuickChandaPOS binds resolveWorkspaceCurrency(activeWorkspace)
    // once and formats receipt lines + totals through it.
    const cur = resolveWorkspaceCurrency(bdt);
    expect(formatWorkspaceAmount(5100, cur)).toBe('৳5,100');
    expect(formatWorkspaceAmount(5100, resolveWorkspaceCurrency(inrWs))).toBe('₹5,100');
  });

  it('guards NaN / empty amounts to a zero in the workspace currency', () => {
    expect(formatAmountForWorkspace(NaN, bdt)).toBe('৳0');
    expect(formatAmountForWorkspace(undefined as any, usd)).toBe('$0');
  });
});

describe('receiptWords follows the workspace currency (#60)', () => {
  it('English unit word follows the currency code', () => {
    expect(receiptWords(500, 'en', 'BDT')).toContain('Taka');
    expect(receiptWords(500, 'en', 'INR')).toContain('Rupees');
    expect(receiptWords(500, 'en', 'USD')).toContain('Dollars');
  });

  it('defaults to Rupees when no currency is passed (legacy callers)', () => {
    expect(receiptWords(500, 'en')).toContain('Rupees');
  });
});

describe('auditTrail formatters: ₹ default pinned, symbol accepted (#60)', () => {
  it('default output is byte-identical to the pre-#60 pins', () => {
    expect(formatLakhCrore(240000)).toBe('₹2.4L');
    expect(formatLakhCrore(18000000)).toBe('₹1.8Cr');
    expect(formatLakhCrore(850)).toBe('₹850');
    expect(formatINRFull(1234567)).toBe('₹12,34,567');
    expect(formatINRFull(0)).toBe('₹0');
  });

  it('accepts a workspace symbol for desk surfaces', () => {
    expect(formatLakhCrore(240000, '৳')).toBe('৳2.4L');
    expect(formatINRFull(1234567, '৳')).toBe('৳12,34,567');
    expect(formatINRFull(500, '$')).toBe('$500');
  });
});
