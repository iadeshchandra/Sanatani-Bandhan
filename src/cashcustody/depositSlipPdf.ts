/**
 * depositSlipPdf.ts — bank deposit slip as a real PDF.
 * ============================================================================
 * GAP THIS CLOSES: DepositTab could only CSS-print the slip card
 * (window.print of an on-screen card — browser-dependent layout, no
 * file to hand the bank or archive). The app already has a full PDF
 * stack (src/utils/pdfGenerator.ts — jsPDF + autotable, QR, number-to-
 * words); this generator follows its conventions and produces the
 * document a trustee actually carries to the bank: denomination mix
 * (what the bank counts), amount in words, both custodians' names,
 * and the slip's chain reference (session id) for later provenance
 * checks against the custody log (lib/auditTrail.ts).
 *
 * Anonymous hundi cash is never 80G-eligible — the slip says so, in
 * line with the suite's honesty law.
 */

import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';
import { numberToWords } from '../utils/pdfGenerator';
import { DENOMINATIONS, DENOM_LABEL, type DepositSlip, type HundiBox } from './types';

export async function generateDepositSlipPDF(
  slip: DepositSlip,
  box: HundiBox | undefined,
  workspaceName: string
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const inrFmt = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-IN')}`;

  // Border + saffron header (pdfGenerator house style)
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.6);
  doc.rect(7, 7, 134, 196);
  doc.setFillColor(180, 83, 9);
  doc.rect(8, 8, 132, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text((workspaceName || 'Sanatani Bandhan Trust').toUpperCase().substring(0, 38), 74, 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('BANK DEPOSIT SLIP — HUNDI COLLECTION (CASH CUSTODY)', 74, 21.5, { align: 'center' });

  doc.setTextColor(30, 27, 25);
  let y = 36;
  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, 12, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '—', 52, y);
    y += 5.5;
  };
  row('Slip No.', slip.slipNo);
  row('Deposit date', slip.depositDate);
  row('Bank', slip.bankName || '—');
  row('Branch', slip.bankBranch || '—');
  row('Hundi box', box ? `${box.boxCode} — ${box.name}` : slip.boxId);
  row('Session ref', slip.sessionId);
  if (slip.treasuryTxId) row('Treasury', 'Posted to treasury ledger');

  // Denomination mix — what the bank teller counts.
  const body = DENOMINATIONS.filter((k) => (slip.denominationMix[k] || 0) > 0).map((k) => {
    const pieces = slip.denominationMix[k] || 0;
    const value = k === 'coins' ? pieces : pieces * Number(k);
    return [DENOM_LABEL[k], String(pieces), inrFmt(value)];
  });
  autoTable(doc, {
    startY: y + 2,
    margin: { left: 12, right: 12 },
    head: [['Denomination', 'Pieces', 'Value']],
    body: body.length ? body : [['—', '0', inrFmt(0)]],
    foot: [['Total', '', inrFmt(slip.amount)]],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.6 },
    headStyles: { fillColor: [180, 83, 9] },
    footStyles: { fillColor: [41, 37, 36], textColor: 255 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Amount in words:', 12, y);
  doc.setFont('helvetica', 'normal');
  const words = doc.splitTextToSize(numberToWords(Math.round(slip.amount)), 122);
  doc.text(words, 12, y + 5);
  y += 5 + words.length * 4.5 + 3;

  row('Counted by (maker)', slip.countedBy);
  row('Verified by (checker)', slip.verifiedBy);
  y += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(87, 83, 78);
  doc.text(
    doc.splitTextToSize(
      'Anonymous hundi cash — no 80G receipt is issued for this collection. ' +
        'This slip was generated from the tamper-evident custody log; verify the chain in the Cash Custody desk before relying on it.',
      122
    ),
    12,
    y
  );
  y += 14;
  doc.setTextColor(30, 27, 25);
  doc.line(12, y + 10, 62, y + 10);
  doc.line(86, y + 10, 136, y + 10);
  doc.setFontSize(8);
  doc.text('Counted by', 37, y + 14, { align: 'center' });
  doc.text('Verified by', 111, y + 14, { align: 'center' });

  doc.save(`deposit-slip-${slip.slipNo}.pdf`);
  return doc;
}
