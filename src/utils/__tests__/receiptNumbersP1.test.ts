/**
 * receiptNumbersP1.test.ts — SECURITY P1 (Finding 5): provisional
 * numbers + counter doc ids. The core law: a provisional number is
 * NEVER parseable as an official series number, so gap/duplicate
 * analysis of the official series stays truthful, and a provisional
 * number is always recognisable as offline-issued.
 */
import {
  formatProvisionalReceiptNumber,
  parseProvisionalReceiptNumber,
  isProvisionalReceiptNumber,
  parseReceiptNumber,
  receiptCounterDocId,
  findReceiptGaps,
  findDuplicateReceipts,
} from '../receiptNumbers';

describe('provisional receipt numbers', () => {
  it('formats with the P marker and a cleaned suffix', () => {
    // 'POS-2026-123456' → alphanumerics 'POS2026123456' → last 8 '26123456'
    expect(formatProvisionalReceiptNumber('SB-80G', 2026, 'POS-2026-123456')).toBe(
      'SB-80G-2026-P-26123456'
    );
    expect(formatProvisionalReceiptNumber('SB-CHANDA', 2026, 'abc-def')).toBe('SB-CHANDA-2026-P-ABCDEF');
  });
  it('round-trips through the provisional parser', () => {
    const n = formatProvisionalReceiptNumber('SB-80G', 2026, 'tx98765');
    expect(parseProvisionalReceiptNumber(n)).toEqual({ prefix: 'SB-80G', year: 2026, suffix: 'TX98765' });
    expect(isProvisionalReceiptNumber(n)).toBe(true);
  });
  it('is NEVER parseable as an official number', () => {
    const n = formatProvisionalReceiptNumber('SB-80G', 2026, 'tx98765');
    expect(parseReceiptNumber(n)).toBeNull();
    expect(isProvisionalReceiptNumber('SB-80G-2026-0042')).toBe(false);
  });
  it('stays out of gap + duplicate analysis of the official series', () => {
    const official = ['SB-80G-2026-0001', 'SB-80G-2026-0003'];
    const prov = formatProvisionalReceiptNumber('SB-80G', 2026, 'dev1');
    expect(findReceiptGaps([...official, prov], 'SB-80G', 2026)).toEqual([2]);
    expect(findDuplicateReceipts([...official, prov])).toEqual([]);
  });
  it('falls back to a LOCAL suffix when given nothing usable', () => {
    expect(formatProvisionalReceiptNumber('SB-80G', 2026, '')).toBe('SB-80G-2026-P-LOCAL');
    expect(formatProvisionalReceiptNumber('SB-80G', 2026, '---')).toBe('SB-80G-2026-P-LOCAL');
  });
});

describe('receiptCounterDocId', () => {
  it('keys one counter per workspace + series + year', () => {
    expect(receiptCounterDocId('WS-6508', 'SB-80G', 2026)).toBe('WS-6508_SB-80G_2026');
    expect(receiptCounterDocId('WS-6508', 'SB-CHANDA', 2027)).toBe('WS-6508_SB-CHANDA_2027');
  });
});
