/**
 * treasuryDisplay.test.ts — QUEUED #51 (audit D10).
 * Pure tests: workspace currency resolution/formatting + the 80G gate
 * matrix. The honesty law under test: a BDT workspace never renders ₹,
 * and an official 80G action exists ONLY for an eligible income voucher
 * in a registered org with a real identifier on file.
 */
import {
  resolveWorkspaceCurrency,
  formatWorkspaceAmount,
  formatAmountForWorkspace,
  org80GStatus,
  eightyGReceiptGate,
} from '../treasuryDisplay';

describe('resolveWorkspaceCurrency', () => {
  it('resolves BDT from the stored code (the audit case)', () => {
    expect(resolveWorkspaceCurrency({ currency: 'BDT', currencySymbol: '৳' })).toEqual({
      code: 'BDT',
      symbol: '৳',
    });
  });

  it('resolves INR and USD from stored codes', () => {
    expect(resolveWorkspaceCurrency({ currency: 'INR' })).toEqual({ code: 'INR', symbol: '₹' });
    expect(resolveWorkspaceCurrency({ currency: 'USD' })).toEqual({ code: 'USD', symbol: '$' });
  });

  it('never lets a stored ₹ symbol override a BDT code', () => {
    const c = resolveWorkspaceCurrency({ currency: 'BDT', currencySymbol: '₹' });
    expect(c.code).toBe('BDT');
    expect(c.symbol).toBe('৳');
  });

  it('infers the code from a lone stored symbol (older docs)', () => {
    expect(resolveWorkspaceCurrency({ currencySymbol: '৳' }).code).toBe('BDT');
    expect(resolveWorkspaceCurrency({ currencySymbol: '₹' }).code).toBe('INR');
  });

  it('supports the other Settings currencies', () => {
    expect(resolveWorkspaceCurrency({ currency: 'NPR' }).symbol).toBe('रु');
    expect(resolveWorkspaceCurrency({ currency: 'GBP' }).symbol).toBe('£');
  });

  it('falls back to the platform default only when nothing is stored', () => {
    expect(resolveWorkspaceCurrency(null)).toEqual({ code: 'INR', symbol: '₹' });
    expect(resolveWorkspaceCurrency({})).toEqual({ code: 'INR', symbol: '₹' });
  });
});

describe('formatWorkspaceAmount', () => {
  it('formats BDT with the taka symbol and lakh grouping (en-IN)', () => {
    const bdt = resolveWorkspaceCurrency({ currency: 'BDT' });
    expect(formatWorkspaceAmount(125000, bdt)).toBe('৳1,25,000');
  });

  it('preserves up to 2 decimals (poisha/paise are real money)', () => {
    const bdt = resolveWorkspaceCurrency({ currency: 'BDT' });
    expect(formatWorkspaceAmount(1500.5, bdt)).toBe('৳1,500.5');
    expect(formatWorkspaceAmount(1500.75, bdt)).toBe('৳1,500.75');
  });

  it('formats USD with en-US grouping', () => {
    const usd = resolveWorkspaceCurrency({ currency: 'USD' });
    expect(formatWorkspaceAmount(125000, usd)).toBe('$125,000');
  });

  it('treats non-finite amounts as 0 instead of printing NaN', () => {
    const inr = resolveWorkspaceCurrency({ currency: 'INR' });
    expect(formatWorkspaceAmount(Number.NaN, inr)).toBe('₹0');
  });

  it('formatAmountForWorkspace composes resolve + format', () => {
    expect(formatAmountForWorkspace(97600, { currency: 'BDT' })).toBe('৳97,600');
  });
});

describe('org80GStatus', () => {
  it('is not capable when the org is not registered', () => {
    const s = org80GStatus({ trust80GRegistered: false, trust80GURN: 'AAAA1234' });
    expect(s.registered).toBe(false);
    expect(s.officialCapable).toBe(false);
    expect(s.reason).toBe('not-registered');
  });

  it('is not capable when registered but no identifier is on file', () => {
    const s = org80GStatus({ trust80GRegistered: true, trust80GURN: '  ' });
    expect(s.officialCapable).toBe(false);
    expect(s.reason).toBe('missing-identifier');
    expect(s.identifier).toBeNull();
  });

  it('accepts any real identifier field (URN, Reg. No, exemption number)', () => {
    expect(org80GStatus({ trust80GRegistered: true, trust80GURN: 'AAATS1234B' }).officialCapable).toBe(true);
    expect(org80GStatus({ trust80GRegistered: true, trust80GRegNo: '80G/2024/117' }).officialCapable).toBe(true);
    expect(org80GStatus({ trust80GRegistered: true, taxExemptionNumber: 'CIT(E)/80G/9' }).officialCapable).toBe(true);
  });
});

describe('eightyGReceiptGate — the full matrix', () => {
  const registeredOrg = { trust80GRegistered: true, trust80GURN: 'AAATS1234B' };
  const unregisteredOrg = { trust80GRegistered: false };
  const eligibleIncome = { type: 'Income', is80GEligible: true };

  it('official ONLY when eligible income + registered org + identifier', () => {
    const g = eightyGReceiptGate(eligibleIncome, registeredOrg);
    expect(g.mode).toBe('official');
    expect(g.reason).toBe('official');
    expect(g.actionLabel).toBe('80G');
  });

  it('sample when eligibility was never marked (the audit case)', () => {
    const g = eightyGReceiptGate({ type: 'Income', is80GEligible: false }, registeredOrg);
    expect(g.mode).toBe('sample');
    expect(g.reason).toBe('not-eligible');
    expect(g.actionLabel).toBe('SAMPLE');
  });

  it('sample when eligibility is undefined (never touched)', () => {
    const g = eightyGReceiptGate({ type: 'Income' }, registeredOrg);
    expect(g.mode).toBe('sample');
    expect(g.reason).toBe('not-eligible');
  });

  it('sample when the org is not 80G-registered (the audit case)', () => {
    const g = eightyGReceiptGate(eligibleIncome, unregisteredOrg);
    expect(g.mode).toBe('sample');
    expect(g.reason).toBe('org-not-registered');
  });

  it('sample when the org is registered without any identifier', () => {
    const g = eightyGReceiptGate(eligibleIncome, { trust80GRegistered: true });
    expect(g.mode).toBe('sample');
    expect(g.reason).toBe('missing-identifier');
  });

  it('never official for expenses, even in a registered org', () => {
    const g = eightyGReceiptGate({ type: 'Expense', is80GEligible: true }, registeredOrg);
    expect(g.mode).toBe('sample');
    expect(g.reason).toBe('not-income');
  });

  it('never official for a missing transaction', () => {
    expect(eightyGReceiptGate(null, registeredOrg).mode).toBe('sample');
    expect(eightyGReceiptGate(undefined, registeredOrg).mode).toBe('sample');
  });
});
