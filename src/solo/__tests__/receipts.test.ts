/**
 * solo/__tests__/receipts.test.ts — QUEUED #30: solo giving & receipts.
 * =====================================================================
 * Pins the honesty contract of the receipts view: only well-formed
 * personal-ledger records count ("mine"), Indian FY bucketing is exact
 * at the Apr 1 / Mar 31 seam, totals never include invalid rows, and a
 * receipt number is 'recorded' only when one was actually recorded —
 * never inferred. Plus fs-scan pins so the Home door + sub-tab wiring
 * can never silently regress (discoverability #12's solo answer).
 */
import * as fs from 'fs';
import * as path from 'path';
import type { GivingRecord } from '../types';
import {
  isOwnGivingRecord,
  ownGiving,
  indianFYStartYear,
  fyLabel,
  receiptStatus,
  groupGivingByPeriod,
  chronologicalGiving,
  sumOwnGiving,
  currentPeriod,
} from '../receipts';

const rec = (partial: Partial<GivingRecord>): GivingRecord => ({
  id: 'g_1',
  date: '2025-06-15',
  orgName: 'Kashi Vishwanath Mandir',
  amount: 501,
  createdAt: 1000,
  ...partial,
});

describe('mine-filtering — only well-formed personal records count', () => {
  it('accepts a normal record (with and without a receipt number)', () => {
    expect(isOwnGivingRecord(rec({}))).toBe(true);
    expect(isOwnGivingRecord(rec({ receiptNo: 'SB-80G-1042' }))).toBe(true);
  });

  it('rejects non-positive, NaN and infinite amounts', () => {
    expect(isOwnGivingRecord(rec({ amount: 0 }))).toBe(false);
    expect(isOwnGivingRecord(rec({ amount: -100 }))).toBe(false);
    expect(isOwnGivingRecord(rec({ amount: NaN }))).toBe(false);
    expect(isOwnGivingRecord(rec({ amount: Infinity }))).toBe(false);
  });

  it('rejects missing org name, missing id and impossible dates', () => {
    expect(isOwnGivingRecord(rec({ orgName: '   ' }))).toBe(false);
    expect(isOwnGivingRecord(rec({ id: '' }))).toBe(false);
    expect(isOwnGivingRecord(rec({ date: '2025-02-30' }))).toBe(false);
    expect(isOwnGivingRecord(rec({ date: '15-06-2025' }))).toBe(false);
    expect(isOwnGivingRecord(rec({ date: 'not-a-date' }))).toBe(false);
    expect(isOwnGivingRecord(null)).toBe(false);
    expect(isOwnGivingRecord('a string')).toBe(false);
  });

  it('totals exclude invalid rows — the headline number is truthful', () => {
    const rows = [rec({ amount: 500 }), rec({ id: 'g_2', amount: -50 }), rec({ id: 'g_3', amount: 250, date: 'bad' })];
    expect(ownGiving(rows)).toHaveLength(1);
    expect(sumOwnGiving(rows)).toBe(500);
  });
});

describe('Indian FY bucketing (Apr 1 – Mar 31)', () => {
  it('assigns dates on both sides of the seam correctly', () => {
    expect(indianFYStartYear('2025-04-01')).toBe(2025);
    expect(indianFYStartYear('2026-03-31')).toBe(2025);
    expect(indianFYStartYear('2025-03-31')).toBe(2024);
    expect(indianFYStartYear('2025-12-25')).toBe(2025);
    expect(indianFYStartYear('2026-01-15')).toBe(2025);
  });

  it('labels FYs the way donors write them', () => {
    expect(fyLabel(2025)).toBe('FY 2025-26');
    expect(fyLabel(1999)).toBe('FY 1999-00');
  });

  it('groups a cross-seam pair into ONE financial year with the right total', () => {
    const rows = [
      rec({ id: 'a', date: '2025-11-02', amount: 1000 }),
      rec({ id: 'b', date: '2026-02-10', amount: 2000 }),
      rec({ id: 'c', date: '2025-03-31', amount: 500 }),
    ];
    const periods = groupGivingByPeriod(rows, 'fy');
    expect(periods.map((p) => p.label)).toEqual(['FY 2025-26', 'FY 2024-25']);
    expect(periods[0].total).toBe(3000);
    expect(periods[0].count).toBe(2);
    expect(periods[1].total).toBe(500);
  });

  it('calendar mode groups by plain year instead', () => {
    const rows = [
      rec({ id: 'a', date: '2025-11-02', amount: 1000 }),
      rec({ id: 'b', date: '2026-02-10', amount: 2000 }),
    ];
    const periods = groupGivingByPeriod(rows, 'cy');
    expect(periods.map((p) => p.label)).toEqual(['2026', '2025']);
    expect(periods[0].total).toBe(2000);
  });
});

describe('receipt availability — recorded means recorded', () => {
  it('is recorded only for a non-blank receipt number', () => {
    expect(receiptStatus(rec({ receiptNo: 'SB-80G-1042' }))).toBe('recorded');
    expect(receiptStatus(rec({}))).toBe('none');
    expect(receiptStatus(rec({ receiptNo: '   ' }))).toBe('none');
  });

  it('period counts split honestly between recorded and unrecorded', () => {
    const rows = [
      rec({ id: 'a', receiptNo: 'R-1' }),
      rec({ id: 'b', date: '2025-07-01' }),
      rec({ id: 'c', date: '2025-08-01', receiptNo: '' }),
    ];
    const [p] = groupGivingByPeriod(rows, 'fy');
    expect(p.withReceiptNo).toBe(1);
    expect(p.withoutReceiptNo).toBe(2);
  });
});

describe('ordering and current period', () => {
  it('lists records newest first, createdAt breaking same-date ties', () => {
    const rows = [
      rec({ id: 'old', date: '2025-05-01', createdAt: 1 }),
      rec({ id: 'tieA', date: '2025-06-01', createdAt: 5 }),
      rec({ id: 'tieB', date: '2025-06-01', createdAt: 9 }),
    ];
    expect(chronologicalGiving(rows).map((g) => g.id)).toEqual(['tieB', 'tieA', 'old']);
    const [p] = groupGivingByPeriod(rows, 'fy');
    expect(p.records.map((g) => g.id)).toEqual(['tieB', 'tieA', 'old']);
  });

  it('currentPeriod returns the containing FY even when it is empty', () => {
    const p = currentPeriod([], 'fy', new Date(2026, 0, 15)); // Jan 2026 → FY 2025-26
    expect(p.label).toBe('FY 2025-26');
    expect(p.total).toBe(0);
    expect(p.count).toBe(0);
  });

  it('currentPeriod sums only records inside the current FY', () => {
    const rows = [
      rec({ id: 'in', date: '2025-09-09', amount: 700 }),
      rec({ id: 'out', date: '2025-02-09', amount: 300 }), // FY 2024-25
    ];
    const p = currentPeriod(rows, 'fy', new Date(2025, 9, 1)); // Oct 2025
    expect(p.label).toBe('FY 2025-26');
    expect(p.total).toBe(700);
  });

  it('empty input groups to nothing — no phantom periods', () => {
    expect(groupGivingByPeriod([], 'fy')).toEqual([]);
    expect(chronologicalGiving([])).toEqual([]);
    expect(sumOwnGiving([])).toBe(0);
  });
});

describe('wiring pins — the Home door and the receipts sub-tab exist', () => {
  const SRC = path.resolve(__dirname, '..', '..');
  const src = (rel: string): string => fs.readFileSync(path.join(SRC, rel), 'utf8');

  it('SoloHome carries the 🧾 door to the receipts view with the FY headline', () => {
    const home = src('solo/SoloHome.tsx');
    expect(home).toContain("goTab('receipts')");
    expect(home).toContain('My giving & receipts');
    expect(home).toContain('givingThisFY');
  });

  it('HomeTab registers the receipts sub-tab and renders ReceiptsView', () => {
    const tabs = src('solo/HomeTab.tsx');
    expect(tabs).toContain("'receipts'");
    expect(tabs).toContain("effectiveTab === 'receipts'");
    expect(tabs).toContain('<ReceiptsView />');
  });

  it('ReceiptsView never fabricates a document — no PDF generator import', () => {
    const view = src('solo/ReceiptsView.tsx');
    expect(view).not.toContain('pdfGenerator');
    expect(view).not.toContain('generateTaxReceiptPDF');
    expect(view).toContain('ReceiptModal');
  });
});
