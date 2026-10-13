/**
 * auditPack.ts — P2: one-click "Audit Pack" export.
 *
 * Bundles REAL workspace data only:
 *   1. treasury-ledger.csv      — full double-entry ledger
 *   2. 80g-receipts.csv         — 80G-eligible receipt register
 *   3. form-10bd-donors.csv     — donor-wise FY aggregate (Form 10BD-ready)
 *   4. asset-inventory.csv       — asset register with valuations
 *   5. cover-summary.txt         — workspace, FY, generated-at, record counts,
 *                                  receipt-number integrity status (M-18)
 *
 * Downloaded as a single ZIP via jszip (already a dependency).
 */
import JSZip from 'jszip';
import type { TreasuryTransaction, AssetRecord, WorkspaceConfig } from '../types';
import { findReceiptGaps, findDuplicateReceipts } from './receiptNumbers';

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(headers: string[], rows: unknown[][]): string {
  return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
}

/** Indian financial year for a date: FY 2026-27 runs Apr 2026 – Mar 2027. */
export function fyOf(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based; Apr (3) starts the FY
  const start = m >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

export interface AuditPackInput {
  treasury: TreasuryTransaction[];
  assets: AssetRecord[];
  workspace: WorkspaceConfig;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Build and download the audit pack ZIP. Returns a summary for the UI toast.
 * Throws on empty data so the caller can show an honest "nothing to export".
 */
export async function downloadAuditPack(input: AuditPackInput): Promise<string> {
  const { treasury, assets, workspace } = input;
  const txs = (treasury || []).filter(Boolean);
  if (txs.length === 0 && (assets || []).length === 0) {
    throw new Error('No ledger or asset records to export yet.');
  }

  const now = new Date();
  const generatedAt = now.toISOString();
  const fy = fyOf(generatedAt);
  const wsName = (workspace?.name || 'workspace').replace(/[^\w\-]+/g, '_');
  const stamp = generatedAt.slice(0, 10);

  // 1. Treasury ledger
  const ledgerCSV = toCSV(
    ['Date', 'Receipt No', 'Type', 'Category', 'Description', 'Amount (INR)', 'Payment Mode', 'Handled By', 'Donor', 'Donor PAN', '80G Eligible', 'Audit Verified'],
    txs.map((t) => [
      t.date, t.taxReceiptNumber || '', t.type, t.category,
      t.purpose || (t as any).description || '',
      t.amount, t.paymentMode || (t as any).paymentMethod || '',
      t.handledBy, t.devoteeName || (t as any).donorName || '',
      t.devoteePan || (t as any).donorPan || '',
      t.is80GEligible ? 'YES' : 'NO', t.auditVerified ? 'YES' : 'NO',
    ])
  );

  // 2. 80G receipts register (same eligibility rule as TaxReceiptDesk)
  const eligible = txs.filter((t) => t.type === 'Income' && t.is80GEligible);
  const urn = (workspace as any)?.trust80GRegistered ? ((workspace as any)?.trust80GURN || '') : 'NOT-REGISTERED';
  const receiptsCSV = toCSV(
    ['Receipt No', 'Date', 'Donor Name', 'Donor PAN', 'Amount (INR)', 'Payment Mode', '80G URN', 'FY'],
    eligible.map((t) => [
      t.taxReceiptNumber || '', t.date,
      t.devoteeName || (t as any).donorName || '',
      t.devoteePan || (t as any).donorPan || '',
      t.amount, t.paymentMode || (t as any).paymentMethod || '',
      urn, fyOf(t.date),
    ])
  );

  // 3. Form 10BD donor summary — donor-wise FY aggregates
  const fyTx = txs.filter((t) => t.type === 'Income' && fyOf(t.date) === fy);
  const donorMap = new Map<string, { name: string; pan: string; address: string; total: number; count: number }>();
  for (const t of fyTx) {
    const name = t.devoteeName || (t as any).donorName || 'Anonymous';
    const key = `${name}||${t.devoteePan || (t as any).donorPan || ''}`;
    const cur = donorMap.get(key) || {
      name,
      pan: t.devoteePan || (t as any).donorPan || '',
      address: (t as any).donorAddress || '',
      total: 0, count: 0,
    };
    cur.total += Number(t.amount) || 0;
    cur.count += 1;
    donorMap.set(key, cur);
  }
  const donorCSV = toCSV(
    ['Donor Name', 'PAN', 'Address', `Total Donations FY ${fy} (INR)`, 'Receipt Count'],
    [...donorMap.values()].map((d) => [d.name, d.pan, d.address, d.total, d.count])
  );

  // 4. Asset inventory
  const assetCSV = toCSV(
    ['Asset Name', 'Category', 'Valuation (INR)', 'Acquisition Date', 'Condition', 'Location / Notes'],
    (assets || []).map((a: any) => [
      a.name, a.category, a.valuation, a.acquisitionDate,
      a.condition || '', a.location || a.notes || '',
    ])
  );

  // 5. Cover summary + M-18 integrity status
  const year = now.getFullYear();
  const numbers = txs.map((t) => t.taxReceiptNumber);
  const gaps80G = findReceiptGaps(numbers, 'SB-80G', year);
  const gapsChanda = findReceiptGaps(numbers, 'SB-CHANDA', year);
  const duplicates = findDuplicateReceipts(numbers);
  const incomeTotal = txs.filter((t) => t.type === 'Income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expenseTotal = txs.filter((t) => t.type === 'Expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const cover = [
    'SANATANI BANDHAN — AUDIT PACK',
    '================================',
    `Organisation : ${workspace?.name || '—'} (${(workspace as any)?.type || '—'})`,
    `Financial Year: ${fy}`,
    `Generated     : ${generatedAt}`,
    '',
    'RECORD COUNTS',
    `  Treasury transactions : ${txs.length}`,
    `  80G-eligible receipts : ${eligible.length}`,
    `  Unique donors (FY)    : ${donorMap.size}`,
    `  Assets                : ${(assets || []).length}`,
    '',
    'FINANCIAL TOTALS (all time)',
    `  Total income   : INR ${incomeTotal.toLocaleString('en-IN')}`,
    `  Total expenses : INR ${expenseTotal.toLocaleString('en-IN')}`,
    `  Net            : INR ${(incomeTotal - expenseTotal).toLocaleString('en-IN')}`,
    '',
    `RECEIPT-NUMBER INTEGRITY (${year})`,
    `  SB-80G gaps    : ${gaps80G.length === 0 ? 'none' : gaps80G.join(', ')}`,
    `  SB-CHANDA gaps : ${gapsChanda.length === 0 ? 'none' : gapsChanda.join(', ')}`,
    `  Duplicates     : ${duplicates.length === 0 ? 'none' : duplicates.join(', ')}`,
    '',
    '80G REGISTRATION',
    `  Registered : ${(workspace as any)?.trust80GRegistered ? 'YES' : 'NO'}`,
    `  URN        : ${(workspace as any)?.trust80GRegistered ? ((workspace as any)?.trust80GURN || '—') : 'NOT-REGISTERED (receipts in this pack are SAMPLE-marked in-app)'}`,
    '',
    'Files in this pack:',
    '  1. treasury-ledger.csv',
    '  2. 80g-receipts.csv',
    '  3. form-10bd-donors.csv',
    '  4. asset-inventory.csv',
    '  5. cover-summary.txt (this file)',
    '',
    'Generated by Sanatani Bandhan. Verify totals against the in-app Treasury Ledger before filing.',
  ].join('\n');

  const zip = new JSZip();
  zip.file('treasury-ledger.csv', ledgerCSV);
  zip.file('80g-receipts.csv', receiptsCSV);
  zip.file('form-10bd-donors.csv', donorCSV);
  zip.file('asset-inventory.csv', assetCSV);
  zip.file('cover-summary.txt', cover);

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `AuditPack_${wsName}_FY${fy}_${stamp}.zip`);
  return `${txs.length} transactions, ${eligible.length} 80G receipts, ${donorMap.size} donors, ${(assets || []).length} assets`;
}

export default downloadAuditPack;
