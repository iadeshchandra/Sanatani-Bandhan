/**
 * firestoreDoc.test.ts — QUEUED #45.
 *
 * Pins the write-hygiene funnel that core-collection Firestore writes pass
 * through. The regression it guards: form payloads carry optional fields as
 * `undefined` (e.g. `email: x || undefined`); Firestore (initialized without
 * ignoreUndefinedProperties) rejects any document containing an undefined
 * value, which is exactly how member adds and vouchers silently died.
 */
import { stripUndefinedDeep } from '../firestoreDoc';

describe('stripUndefinedDeep', () => {
  it('drops top-level undefined fields (the DevoteeGrid add payload shape)', () => {
    const payload = {
      fullName: 'Audit Person',
      phone: '01700000000',
      email: undefined,
      pravara: undefined,
      address: undefined,
      totalDonated: 0,
    };
    expect(stripUndefinedDeep(payload)).toEqual({
      fullName: 'Audit Person',
      phone: '01700000000',
      totalDonated: 0,
    });
  });

  it('drops undefined fields in the TreasuryLedgerDesk voucher shape', () => {
    const voucher = {
      id: 'tx_1',
      workspaceId: 'WS-6508',
      type: 'Expense',
      amount: 10,
      devoteeName: undefined, // Income-only field, undefined on expenses
      vendorName: 'Rice Supplier',
      referenceNo: undefined,
      taxReceiptNumber: undefined,
      is80GEligible: false,
    };
    const cleaned = stripUndefinedDeep(voucher);
    expect(cleaned).toEqual({
      id: 'tx_1',
      workspaceId: 'WS-6508',
      type: 'Expense',
      amount: 10,
      vendorName: 'Rice Supplier',
      is80GEligible: false,
    });
    expect('devoteeName' in cleaned).toBe(false);
  });

  it('recurses into nested plain objects and arrays', () => {
    const input = {
      a: { b: undefined, c: 1 },
      list: [{ x: undefined, y: 2 }, { z: 3 }],
    };
    expect(stripUndefinedDeep(input)).toEqual({
      a: { c: 1 },
      list: [{ y: 2 }, { z: 3 }],
    });
  });

  it('keeps real falsy values — 0, false, empty string and null are data', () => {
    const input = { amount: 0, flag: false, note: '', pan: null };
    expect(stripUndefinedDeep(input)).toEqual({ amount: 0, flag: false, note: '', pan: null });
  });

  it('passes class instances through by reference (FieldValue/Date sentinels stay intact)', () => {
    class FakeFieldValue {
      constructor(public readonly kind = 'serverTimestamp') {}
    }
    const sentinel = new FakeFieldValue();
    const when = new Date(0);
    const out = stripUndefinedDeep({ timestamp: sentinel, when, gone: undefined });
    expect(out.timestamp).toBe(sentinel);
    expect(out.when).toBe(when);
    expect('gone' in out).toBe(false);
  });

  it('does not mutate the input object', () => {
    const input = { a: 1, b: undefined, nested: { c: undefined, d: 2 } };
    const snapshot = JSON.stringify(input, Object.keys(input).sort());
    stripUndefinedDeep(input);
    expect(JSON.stringify(input, Object.keys(input).sort())).toBe(snapshot);
    expect('b' in input).toBe(true);
  });

  it('passes primitives through unchanged', () => {
    expect(stripUndefinedDeep(42)).toBe(42);
    expect(stripUndefinedDeep('x')).toBe('x');
    expect(stripUndefinedDeep(null)).toBe(null);
    expect(stripUndefinedDeep(undefined)).toBe(undefined);
  });
});
