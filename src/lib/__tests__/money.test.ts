import { formatMoney, normalizeCurrency, currencySymbol } from '../money';

describe('formatMoney', () => {
  test('BDT uses ৳ symbol', () => {
    expect(formatMoney(1500, 'BDT')).toBe('৳1,500');
  });
  test('INR uses ₹ symbol', () => {
    expect(formatMoney(1500, 'INR')).toBe('₹1,500');
  });
  test('USD uses $ symbol', () => {
    expect(formatMoney(1500, 'USD')).toBe('$1,500');
  });
  test('INR/BDT use lakh-crore grouping', () => {
    expect(formatMoney(100000, 'INR')).toBe('₹1,00,000');
    expect(formatMoney(100000, 'BDT')).toBe('৳1,00,000');
    expect(formatMoney(10000000, 'INR')).toBe('₹1,00,00,000');
  });
  test('USD uses standard grouping', () => {
    expect(formatMoney(1000000, 'USD')).toBe('$1,000,000');
  });
  test('rounds fractional amounts', () => {
    expect(formatMoney(1500.7, 'BDT')).toBe('৳1,501');
    expect(formatMoney(1500.2, 'INR')).toBe('₹1,500');
  });
  test('lowercase currency codes are normalized', () => {
    expect(formatMoney(500, 'bdt')).toBe('৳500');
    expect(formatMoney(500, 'inr')).toBe('₹500');
  });
  test('unknown currency falls back to ₹ (never a bare number)', () => {
    expect(formatMoney(500, 'EUR')).toBe('₹500');
    expect(formatMoney(500, '')).toBe('₹500');
    expect(formatMoney(500, undefined)).toBe('₹500');
    expect(formatMoney(500, null)).toBe('₹500');
  });
  test('NaN / non-numeric amounts become zero', () => {
    expect(formatMoney(NaN, 'BDT')).toBe('৳0');
    expect(formatMoney(Number('abc'), 'INR')).toBe('₹0');
  });
  test('zero and negative amounts', () => {
    expect(formatMoney(0, 'USD')).toBe('$0');
  });
});

describe('normalizeCurrency', () => {
  test('passes through canonical codes', () => {
    expect(normalizeCurrency('BDT')).toBe('BDT');
    expect(normalizeCurrency('INR')).toBe('INR');
    expect(normalizeCurrency('USD')).toBe('USD');
  });
  test('case-insensitive', () => {
    expect(normalizeCurrency('bdt')).toBe('BDT');
  });
  test('unknown → INR', () => {
    expect(normalizeCurrency('XYZ')).toBe('INR');
    expect(normalizeCurrency(undefined)).toBe('INR');
  });
});

describe('currencySymbol', () => {
  test('returns the right symbol per currency', () => {
    expect(currencySymbol('BDT')).toBe('৳');
    expect(currencySymbol('INR')).toBe('₹');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('nope')).toBe('₹');
  });
});
