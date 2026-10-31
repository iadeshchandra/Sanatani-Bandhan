/**
 * earningsTruth.test.ts — JY-FIX-B pins for JY-06 (earnings truth) and
 * JY-15 (commission fallback).
 * =====================================================================
 * JY-06: the Earnings/Overview tabs summed `consultation.dakshinaAgreed`
 * — a field NO jyotish code path writes — so "Dakshina released" was
 * permanently ₹0 while real dakshina moved through the bridge's
 * marketplace orders. The orders are now the single source of truth.
 * JY-15: resolveCommissionRate's read-failure fallback stamped an
 * unattached 12% onto real orders; the settled community default is 15%.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  summariseDakshinaOrders,
  defaultDakshinaAmount,
  type DakshinaOrderLite,
} from '../dakshinaBridge';
import type { Consultation } from '../../types/jyotish';

const ORDERS: DakshinaOrderLite[] = [
  // Released, INR, explicit providerNet.
  { id: 'o1', consultationId: 'c1', status: 'paid', amountGross: 1000, providerNet: 850, commissionAmount: 150, currency: 'INR' },
  // Released via 'completed', INR, providerNet absent → gross − commission.
  { id: 'o2', consultationId: 'c2', status: 'completed', amountGross: 500, commissionAmount: 75, currency: 'INR' },
  // Released, BDT — must never merge into the INR total.
  { id: 'o3', consultationId: 'c3', status: 'paid', amountGross: 2000, providerNet: 1700, commissionAmount: 300, currency: 'BDT' },
  // Still pending — not earnings yet.
  { id: 'o4', consultationId: 'c4', status: 'pending_payment', amountGross: 700, providerNet: 595, commissionAmount: 105, currency: 'INR' },
  // Cancelled — invisible to earnings.
  { id: 'o5', consultationId: 'c5', status: 'cancelled', amountGross: 900, providerNet: 765, currency: 'INR' },
];

describe('JY-06 — summariseDakshinaOrders reads the money that exists', () => {
  const types = { c1: 'Kundli Vishleshan', c2: 'Kundli Vishleshan', c3: 'Muhurat Nirnaya', c4: 'Prashna Shastra' };
  const s = summariseDakshinaOrders(ORDERS, types);

  test('released totals are providerNet, per currency, released statuses only', () => {
    expect(s.releasedByCurrency).toEqual([
      { currency: 'BDT', total: 1700, count: 1 },
      { currency: 'INR', total: 850 + 425, count: 2 },
    ]);
    expect(s.releasedCount).toBe(3);
  });

  test('pending orders are reported separately, never as earnings', () => {
    expect(s.pendingByCurrency).toEqual([{ currency: 'INR', total: 595, count: 1 }]);
  });

  test('by-type breakdown follows the consultation link', () => {
    expect(s.byType).toEqual([
      { type: 'Kundli Vishleshan', totals: [{ currency: 'INR', total: 1275, count: 2 }] },
      { type: 'Muhurat Nirnaya', totals: [{ currency: 'BDT', total: 1700, count: 1 }] },
    ]);
  });

  test('empty order set → honest zeros', () => {
    const z = summariseDakshinaOrders([]);
    expect(z.releasedByCurrency).toEqual([]);
    expect(z.releasedCount).toBe(0);
  });
});

describe('JY-06 — the dead field is gone from the jyotish workspace', () => {
  test('defaultDakshinaAmount ignores a legacy dakshinaAgreed value', () => {
    const c = {
      budgetMax: 1500,
      dakshinaAgreed: 9999,
    } as unknown as Consultation;
    expect(defaultDakshinaAmount(c)).toBe('1500');
  });

  test('SOURCE PIN: no property read of the dead field remains in src/jyotish or the context', () => {
    const roots = [
      path.join(__dirname, '..'),
      path.join(__dirname, '..', '..', 'context', 'JyotishContext.tsx'),
    ];
    const files: string[] = [];
    const walk = (p: string) => {
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        for (const e of fs.readdirSync(p)) {
          if (e === '__tests__') continue;
          walk(path.join(p, e));
        }
      } else if (/\.(ts|tsx)$/.test(p)) files.push(p);
    };
    roots.forEach(walk);
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      expect({ file: f, hasDeadRead: /\.dakshinaAgreed\b/.test(src) }).toEqual({ file: f, hasDeadRead: false });
    }
    const types = fs.readFileSync(path.join(__dirname, '..', '..', 'types', 'jyotish.ts'), 'utf8');
    expect(types).not.toMatch(/dakshinaAgreed\?:/);
  });
});

describe('JY-15 — commission fallback is the settled community default', () => {
  test('SOURCE PIN: firestoreAdmin fallback is 15% and logs the failure', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'lib', 'firestoreAdmin.ts'),
      'utf8'
    );
    expect(src).not.toContain("ratePercent: 12, source: 'platform default (fallback)'");
    expect(src).toContain('ratePercent: 15');
    expect(src).toContain('[resolveCommissionRate] config reads failed');
  });
});
