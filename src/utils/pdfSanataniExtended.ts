/**
 * Sanatani Bandhan — pdfmake Extended Generators (Phase C)
 *
 * Migrates the 8 remaining jsPDF generators from src/utils/pdfGenerator.ts
 * to the pdfmake Sanatani engine. Drop-in replacements: same function
 * signatures, same data in, better documents out.
 *
 * WHAT CHANGED vs jsPDF versions:
 *  - Proper Indic script shaping (Devanagari/Bengali/Tamil render correctly;
 *    the old Pooja Sankalp PDF printed "॥ श्री शुभ संकल्प पत्रम् ॥" in
 *    Helvetica — blank/garbage. Now it uses Tiro Devanagari + Noto.)
 *  - Sanatani design system throughout: triple border with Om corners,
 *    "॥ श्री गणेशाय नमः ॥" invocation, bilingual labels, sacred cream
 *    accents, trust-configurable blessing footer.
 *  - pdfmake native tables replace fragile jspdf-autotable + manual
 *    coordinate layouts.
 *  - Money always in Latin digits with en-IN grouping (₹1,00,000).
 *
 * SIGNATURE NOTES (minor, documented in MANIFEST.md):
 *  - No 'doc' returnType (jsPDF-specific); 'doc' falls back to 'blob'.
 *  - generatePollReportPdf is async (font loading) — callers that don't
 *    await still get the download; the promise resolves void.
 *  - generateAnnualDonationSummaryPDF opens the PDF in a new tab (as the
 *    jsPDF version did); pdfmake has no autoPrint equivalent.
 *
 * $0, offline-first, MIT licensed. No CDN at runtime.
 */

import {
  SANATANI_COLORS,
  SANATANI_FONTS,
  invocationFor,
  blessingFor,
  bilingual,
  lotusDivider,
  tripleBorder,
  sacredHeader,
  sacredFooter,
  amountBox,
  detailGrid,
  sectionTitle,
  OM,
  INVOCATION_DEFAULT,
} from './sanataniTheme';

import {
  ensurePdfFonts,
  generateCryptoDocRef,
  numberToWords,
  generate80GTaxReceipt,
} from './pdfSanatani';

import { get } from 'idb-keyval';
import { generateSecureQRToken } from './qrUtils';
import type {
  DevoteeMember,
  TreasuryTransaction,
  WorkspaceConfig,
  PoojaBooking,
} from '../types';

/* ================================================================== */
/*  Local helpers                                                      */
/* ================================================================== */

type ReturnOpt = {
  download?: boolean;
  returnType?: 'save' | 'blob' | 'bloburl' | 'doc';
};

async function pdfMakeLib(): Promise<any> {
  await ensurePdfFonts();
  return (await import('pdfmake/build/pdfmake')).default;
}

async function qrDataUrl(payload: string, width = 200): Promise<string> {
  try {
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(payload, { margin: 1, width });
  } catch {
    return '';
  }
}

/** Fetch any image URL → data URL (offline-safe, no canvas needed). */
async function fetchImageDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('image read failed'));
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Workspace logo from IndexedDB (parity with pdfGenerator.ts). */
export const getActiveWorkspaceLogo = async (
  workspaceId: string
): Promise<string | null> => {
  try {
    const customLogo = await get(`sb_logo_${workspaceId}`);
    if (customLogo && String(customLogo).startsWith('data:image/')) {
      return String(customLogo);
    }
  } catch (e) {
    console.warn('Could not read custom workspace logo', e);
  }
  return null;
};

async function outputPdf(
  docDef: any,
  fileName: string,
  options?: ReturnOpt
): Promise<Blob | string | void> {
  const pdfMake = await pdfMakeLib();
  return new Promise((resolve, reject) => {
    try {
      const pdf = (pdfMake as any).createPdf(docDef);
      const rt = options?.returnType;
      if (rt === 'blob' || rt === 'doc') {
        // 'doc' is a jsPDF-ism — no document object exists in pdfmake.
        pdf.getBlob((blob: Blob) => resolve(blob));
      } else if (rt === 'bloburl') {
        pdf.getBlob((blob: Blob) => resolve(URL.createObjectURL(blob)));
      } else {
        if (options?.download !== false) pdf.download(fileName);
        pdf.getBlob((blob: Blob) => resolve(blob));
      }
    } catch (e) {
      reject(e);
    }
  });
}

/** Devanagari → Gujarati → Malayalam script ranges (Indic block). */
const INDIC_RE = /[̀-्ॐ-૿-೿-ൿ]/;
function hasIndic(text: string): boolean {
  return INDIC_RE.test(String(text || ''));
}

/**
 * Text node that automatically picks the Devanagari font when the string
 * contains Indic codepoints — Devanagari "just works" without the caller
 * thinking about fonts.
 */
function autoText(text: string, fontSize = 8.5, extra: any = {}): any {
  const t = String(text ?? '');
  return {
    text: t,
    font: hasIndic(t) ? SANATANI_FONTS.devanagari : SANATANI_FONTS.body,
    fontSize,
    color: SANATANI_COLORS.umber,
    ...extra,
  };
}

const inr = (n: number): string =>
  `₹${Number(n || 0).toLocaleString('en-IN')}`;

const fmtDate = (d: any): string => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
};

/**
 * Cream page wash (replaces the jsPDF full-page cream rect fills).
 * Pass the page size in points: A5 = [419.53, 595.28].
 */
function creamWash(w: number, h: number): any {
  return {
    canvas: [
      { type: 'rect', x: 0, y: 0, w, h, color: SANATANI_COLORS.cream },
    ],
  };
}

/**
 * Professional data table — saffron header, alternating cream/white rows,
 * sandalwood rules. Replaces jspdf-autotable.
 */
function dataTable(
  headers: string[],
  rows: Array<Array<string | any>>,
  opts?: { widths?: any[]; fontSize?: number }
): any {
  const fs = opts?.fontSize ?? 7.5;
  return {
    table: {
      headerRows: 1,
      widths: opts?.widths || headers.map(() => '*'),
      body: [
        headers.map((h) => ({
          text: h,
          font: SANATANI_FONTS.body,
          fontSize: fs,
          bold: true,
          color: SANATANI_COLORS.white,
        })),
        ...rows.map((r, i) =>
          r.map((c) => {
            const base: any =
              typeof c === 'object' && c !== null && 'text' in c ? c : { text: String(c ?? '') };
            return {
              font: SANATANI_FONTS.body,
              fontSize: fs,
              color: SANATANI_COLORS.umber,
              ...base,
            };
          })
        ),
      ],
    },
    layout: {
      fillColor: (rowIndex: number) =>
        rowIndex === 0
          ? SANATANI_COLORS.saffron
          : rowIndex % 2 === 0
            ? SANATANI_COLORS.white
            : SANATANI_COLORS.cream,
      hLineWidth: () => 0.4,
      vLineWidth: () => 0.4,
      hLineColor: () => SANATANI_COLORS.sandalwood,
      vLineColor: () => SANATANI_COLORS.sandalwood,
      paddingLeft: () => 5,
      paddingRight: () => 5,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 6, 0, 6],
  };
}

/** Compact key-value rows for the CR80 identity card. */
function idCardRows(rows: Array<[string, string]>): any {
  return {
    table: {
      widths: ['42%', '58%'],
      body: rows.map(([k, v]) => [
        { text: k, font: SANATANI_FONTS.body, fontSize: 4.5, bold: true, color: SANATANI_COLORS.stone },
        autoText(v, 5.5, { bold: true }),
      ]),
    },
    layout: {
      hLineWidth: () => 0.25,
      vLineWidth: () => 0,
      hLineColor: () => '#E5E7EB',
      fillColor: () => '#F9FAFB',
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 2.5,
      paddingBottom: () => 2.5,
    },
    margin: [4, 4, 4, 2],
  };
}

/* ================================================================== */
/*  1. DEVOTEE / MEMBER IDENTITY CARD — CR80 (54 × 86 mm)              */
/* ================================================================== *
 *
 * Same signature as the jsPDF version:
 *   generateDevoteeCardPDF(member, workspace, mode = 'save')
 *
 * Design: saffron banner with trust name + bilingual "Official Identity
 * Card / आधिकारिक पहचान पत्र", photo (or initial), name + spiritual
 * name in Devanagari-capable font, compact ID/phone/blood grid, QR for
 * identity verification + authorised signature line, saffron foot strip.
 */

const CR80_W_PT = 153.07; // 54 mm
const CR80_H_PT = 243.78; // 86 mm

export const generateDevoteeCardPDF = async (
  member: DevoteeMember,
  workspace: WorkspaceConfig,
  mode: 'save' | 'bloburl' = 'save'
): Promise<string | void> => {
  const name = member.fullName || (member as any).name || 'Sanatani Devotee';
  const spiritual = member.spiritualName || '';
  const qrPayload = generateSecureQRToken(member);
  const qrUrl = await qrDataUrl(qrPayload, 140);
  const photoUrl = (member as any).avatarUrl
    ? await fetchImageDataUrl((member as any).avatarUrl)
    : null;
  const initial = (name.charAt(0) || 'ॐ').toUpperCase();

  const photoNode: any = photoUrl
    ? { image: photoUrl, fit: [56, 56], alignment: 'center' as const }
    : {
        table: {
          widths: [56],
          body: [[{
            text: initial,
            font: hasIndic(initial) ? SANATANI_FONTS.devanagari : SANATANI_FONTS.body,
            fontSize: 20,
            bold: true,
            color: '#9CA3AF',
            alignment: 'center' as const,
            margin: [0, 14, 0, 14],
          }]],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#D1D5DB',
          vLineColor: () => '#D1D5DB',
          fillColor: () => '#F3F4F6',
        },
        alignment: 'center' as const,
      };

  const content: any[] = [
    // Saffron banner
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            {
              text: (workspace.name || 'Sanatani Bandhan').toUpperCase().substring(0, 30),
              font: SANATANI_FONTS.body, fontSize: 7.5, bold: true,
              color: SANATANI_COLORS.white, alignment: 'center' as const,
            },
            { text: 'OFFICIAL IDENTITY CARD', font: SANATANI_FONTS.body, fontSize: 4.5, color: SANATANI_COLORS.white, alignment: 'center' as const, margin: [0, 1, 0, 0] },
            { text: 'आधिकारिक पहचान पत्र', font: SANATANI_FONTS.devanagari, fontSize: 5, color: '#FFF7ED', alignment: 'center' as const },
          ],
          margin: [0, 4, 0, 4],
        }]],
      },
      layout: {
        hLineWidth: () => 0, vLineWidth: () => 0,
        fillColor: () => SANATANI_COLORS.saffron,
      },
    },
    // Gold divider
    {
      table: { widths: ['*'], body: [[{ text: '', margin: [0, 0.75, 0, 0.75] }]] },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => SANATANI_COLORS.gold },
    },
    // Photo
    { stack: [photoNode], alignment: 'center' as const, margin: [0, 5, 0, 2] },
    // Name
    autoText(name.substring(0, 28), 9, { bold: true, alignment: 'center' as const }),
    ...(spiritual
      ? [autoText(`"${spiritual}"`, 6, { italics: true, color: SANATANI_COLORS.saffron, alignment: 'center' as const })]
      : []),
    // Details
    idCardRows([
      ['ID NUMBER', String(member.id || '').substring(0, 16).toUpperCase()],
      ['PHONE', member.phone || 'N/A'],
      ['BLOOD GROUP', (member as any).bloodGroup || 'N/A'],
    ]),
    // QR + signature
    {
      columns: [
        {
          stack: [
            ...(qrUrl ? [{ image: qrUrl, width: 34, alignment: 'center' as const }] : []),
            { text: 'Identity verification only', fontSize: 3.5, color: '#6B7280', alignment: 'center' as const },
            { text: 'Login requires your PIN', fontSize: 3.5, color: '#6B7280', alignment: 'center' as const },
          ],
          width: 44,
        },
        {
          stack: [
            { text: '', margin: [0, 22, 0, 0] },
            {
              table: { widths: ['*'], body: [[{ text: '', margin: [0, 0.25, 0, 0.25] }]] },
              layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => '#9CA3AF' },
            },
            { text: 'Authorised Signature', fontSize: 4, color: '#6B7280', alignment: 'center' as const },
          ],
          width: '*',
        },
      ],
      margin: [4, 2, 4, 0],
    },
    // Saffron foot strip
    {
      table: { widths: ['*'], body: [[{ text: '', margin: [0, 1.5, 0, 1.5] }]] },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => SANATANI_COLORS.saffron },
      margin: [0, 4, 0, 0],
    },
  ];

  const docDef = {
    pageSize: [CR80_W_PT, CR80_H_PT],
    pageMargins: [4, 4, 4, 4],
    background: creamWash(CR80_W_PT, CR80_H_PT),
    content,
    defaultStyle: { font: SANATANI_FONTS.body, color: SANATANI_COLORS.umber },
  };

  const fileName = `${name.replace(/\s+/g, '_')}_ID_Card.pdf`;
  if (mode === 'bloburl') {
    return String(await outputPdf(docDef, fileName, { returnType: 'bloburl' }));
  }
  await outputPdf(docDef, fileName, { download: true });
};

/* ================================================================== */
/*  2. MANDIR COUNTER SLIP — A5 seva / darshan token                  */
/* ================================================================== *
 *
 * Same signature as the jsPDF version:
 *   generateCounterSlip(transaction, workspace, options?)
 *
 * Design: saffron banner (trust + "॥ श्री शुभ सेवा रसीद एवं दर्शन
 * टोकन ॥" — now in a real Devanagari font), cream token meta band,
 * bilingual detail grid, saffron amount highlight, centred QR, footer
 * with "॥ धर्मो रक्षति रक्षितः ॥" + the 80G-office disclaimer.
 */

export const generateCounterSlip = async (
  transaction: any,
  workspace: any,
  options?: ReturnOpt
): Promise<Blob | string | void> => {
  const trustName = workspace?.name || 'Sanatani Bandhan Mandir Trust';
  const tokenNo =
    transaction?.tokenNumber ||
    transaction?.receiptNo ||
    `TOK-${String(transaction?.id || Date.now()).slice(-6).toUpperCase()}`;
  const devoteeName = transaction?.devoteeName || transaction?.donorName || 'Sanatani Devotee';
  const sevaName =
    transaction?.sevaName || transaction?.poojaType || transaction?.purpose || transaction?.category || 'Darshan & Puja Seva';
  const amount = Number(transaction?.amount || transaction?.dakshinaAmount || 0);
  const dateStr = transaction?.date || transaction?.tithiDate || new Date().toISOString().split('T')[0];
  const timeSlot = transaction?.timeSlot || 'During Temple Darshan Hours';
  const paymentMode = transaction?.paymentMode || 'Cash / Counter';
  const handledBy = transaction?.handledBy || transaction?.assignedPurohit || 'Counter Sevadar';
  const currency = workspace?.currencySymbol || '₹';

  const qrUrl = await qrDataUrl(
    JSON.stringify({ tokenNo, devotee: devoteeName, seva: sevaName, amount, date: dateStr }),
    160
  );

  const content: any[] = [
    // Saffron banner
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            {
              text: trustName.toUpperCase().substring(0, 36),
              font: SANATANI_FONTS.body, fontSize: 13, bold: true,
              color: SANATANI_COLORS.white, alignment: 'center' as const,
            },
            {
              text: '॥ श्री शुभ सेवा रसीद एवं दर्शन टोकन ॥',
              font: SANATANI_FONTS.sacred, fontSize: 9,
              color: SANATANI_COLORS.white, alignment: 'center' as const, margin: [0, 3, 0, 0],
            },
          ],
          margin: [0, 8, 0, 8],
        }]],
      },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => SANATANI_COLORS.saffron },
    },
    // Token meta band
    {
      table: {
        widths: ['60%', '40%'],
        body: [[
          { text: `TOKEN NO: ${tokenNo}`, font: SANATANI_FONTS.body, fontSize: 9, bold: true, color: SANATANI_COLORS.saffron },
          { text: `Date: ${dateStr}`, font: SANATANI_FONTS.body, fontSize: 8.5, color: SANATANI_COLORS.umber, alignment: 'right' as const },
        ]],
      },
      layout: {
        hLineWidth: () => 0.5, vLineWidth: () => 0.5,
        hLineColor: () => SANATANI_COLORS.gold, vLineColor: () => SANATANI_COLORS.gold,
        fillColor: () => '#FEF3C7',
        paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6,
      },
      margin: [0, 8, 0, 4],
    },
    detailGrid([
      [bilingual('Yajamana / Devotee', 'यजमान / भक्त'), autoText(devoteeName, 9, { bold: true })],
      [bilingual('Seva / Puja Booked', 'सेवा / पूजा'), autoText(sevaName, 9, { bold: true, color: SANATANI_COLORS.saffron })],
      [bilingual('Timing Slot', 'समय'), timeSlot],
      [bilingual('Payment Mode', 'भुगतान माध्यम'), paymentMode],
      [bilingual('Counter Sevadar', 'काउंटर सेवादार'), handledBy],
    ]),
    // Amount highlight
    {
      table: {
        widths: ['*'],
        body: [[{
          text: `Amount Paid: ${currency} ${amount.toLocaleString('en-IN')}/-`,
          font: SANATANI_FONTS.body, fontSize: 13, bold: true,
          color: SANATANI_COLORS.saffron, alignment: 'center' as const, margin: [0, 6, 0, 6],
        }]],
      },
      layout: {
        hLineWidth: () => 0.5, vLineWidth: () => 0.5,
        hLineColor: () => SANATANI_COLORS.gold, vLineColor: () => SANATANI_COLORS.gold,
        fillColor: () => '#FEF3C7',
      },
      margin: [0, 4, 0, 4],
    },
    ...(qrUrl ? [{ image: qrUrl, width: 72, alignment: 'center' as const, margin: [0, 6, 0, 4] }] : []),
    {
      text: 'Present this slip at Sanctum Counter for Pushpanjali & Prasadam.',
      font: SANATANI_FONTS.body, fontSize: 7.5, color: SANATANI_COLORS.stone,
      alignment: 'center' as const,
    },
    {
      text: '॥ धर्मो रक्षति रक्षितः ॥',
      font: SANATANI_FONTS.devanagari, fontSize: 9, color: SANATANI_COLORS.kumkum,
      alignment: 'center' as const, margin: [0, 4, 0, 4],
    },
    {
      text: 'This is a counter slip. For statutory 80G tax receipt, please consult the Temple Office.',
      font: SANATANI_FONTS.body, fontSize: 6.5, color: '#9CA3AF',
      alignment: 'center' as const,
    },
  ];

  const docDef = {
    pageSize: 'A5',
    pageMargins: [20, 20, 20, 20],
    background: creamWash(419.53, 595.28),
    content: [tripleBorder(content)],
    defaultStyle: { font: SANATANI_FONTS.body, color: SANATANI_COLORS.umber },
  };

  return outputPdf(docDef, `CounterSlip_${tokenNo}.pdf`, options);
};

/* ================================================================== */
/*  3. STANDARD TAX RECEIPT — thin wrapper over the 80G engine         */
/* ================================================================== *
 *
 * Identical signature to the jsPDF version (which itself delegated to
 * generate80GTaxReceipt):
 *   generateTaxReceiptPDF(tx, workspace, returnType = 'save', isCopy = false, devoteePan = '')
 */

export const generateTaxReceiptPDF = async (
  tx: TreasuryTransaction,
  workspace: WorkspaceConfig,
  returnType: 'save' | 'blob' | 'bloburl' = 'save',
  isCopy: boolean = false,
  devoteePan: string = ''
): Promise<void | Blob | string> => {
  const enhancedTx = {
    ...tx,
    devoteePan: devoteePan || (tx as any).devoteePan || (tx as any).donorPan || '',
  };
  const result = await generate80GTaxReceipt(enhancedTx, workspace, {
    download: returnType === 'save',
    returnType,
    isCopy,
  });
  if (returnType === 'blob') return result as Blob;
  if (returnType === 'bloburl') return String(result);
};

/* ================================================================== */
/*  4. SACRED SANKALP & POOJA BOOKING RECEIPT — A5                    */
/* ================================================================== *
 *
 * Same signature as the jsPDF version:
 *   generatePoojaSankalpPDF(booking, workspace)
 *
 * ★ THE DEVANAGARI FIX: the old version rendered "॥ श्री शुभ संकल्प
 * पत्रम् ॥" and every Hindi name/prayer in Helvetica — blank or
 * garbage. Every sacred + Indic string here uses Tiro Devanagari /
 * Noto Sans Devanagari, and devotee names, gotra, and the sankalp
 * prayer auto-select the Indic font when they contain Indic script.
 */

export const generatePoojaSankalpPDF = async (
  booking: PoojaBooking,
  workspace: WorkspaceConfig
): Promise<void> => {
  const docRef = generateCryptoDocRef('SANKALP');
  const qrUrl = await qrDataUrl(
    JSON.stringify({
      bookingId: booking.id,
      pooja: booking.poojaName,
      devotee: booking.devoteeName,
      gotra: booking.gotra,
      tithi: booking.tithiDate,
    }),
    160
  );
  const currency = workspace.currencySymbol || '₹';

  const content: any[] = [
    // Saffron header — invocation now in a REAL Devanagari sacred font
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            {
              text: '॥ श्री शुभ संकल्प पत्रम् ॥',
              font: SANATANI_FONTS.sacred, fontSize: 13,
              color: SANATANI_COLORS.white, alignment: 'center' as const,
            },
            {
              text: workspace.name || 'Sanatani Bandhan',
              font: SANATANI_FONTS.body, fontSize: 8,
              color: SANATANI_COLORS.white, alignment: 'center' as const, margin: [0, 3, 0, 0],
            },
          ],
          margin: [0, 8, 0, 8],
        }]],
      },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => SANATANI_COLORS.saffron },
    },
    // Pooja name + tithi
    autoText(booking.poojaName, 13, { bold: true, alignment: 'center' as const, margin: [0, 8, 0, 2] }),
    {
      text: `Tithi / Date: ${booking.tithiDate || ''} (${booking.timeSlot || ''})`,
      font: SANATANI_FONTS.body, fontSize: 9, color: SANATANI_COLORS.stone,
      alignment: 'center' as const, margin: [0, 0, 0, 6],
    },
    // Details card (white on cream)
    {
      table: {
        widths: ['38%', '62%'],
        body: [
          [
            { text: 'Yajamana / Devotee', font: SANATANI_FONTS.body, fontSize: 8, bold: true, color: SANATANI_COLORS.stone },
            autoText(booking.devoteeName, 9, { bold: true }),
          ],
          [
            { text: 'Gotra & Nakshatra', font: SANATANI_FONTS.body, fontSize: 8, bold: true, color: SANATANI_COLORS.stone },
            autoText(`${booking.gotra || ''}${booking.nakshatra ? ` | ${booking.nakshatra}` : ''}`, 9),
          ],
          [
            { text: 'Assigned Purohit', font: SANATANI_FONTS.body, fontSize: 8, bold: true, color: SANATANI_COLORS.stone },
            autoText(booking.purohitAssigned || (booking as any).assignedPurohit || 'Mandir Chief Priest', 9),
          ],
          [
            { text: 'Dakshina Seva', font: SANATANI_FONTS.body, fontSize: 8, bold: true, color: SANATANI_COLORS.stone },
            {
              text: `${currency} ${Number(booking.dakshinaAmount || 0).toLocaleString('en-IN')} (${booking.paymentStatus || 'Pending'})`,
              font: SANATANI_FONTS.body, fontSize: 9, bold: true, color: SANATANI_COLORS.saffron,
            },
          ],
          [
            { text: 'Sankalp Prayer', font: SANATANI_FONTS.body, fontSize: 8, bold: true, color: SANATANI_COLORS.stone },
            autoText(
              booking.sankalpDescription || (booking as any).sankalpText || (booking as any).sankalpaIntention || '—',
              8.5
            ),
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.4, vLineWidth: () => 0.4,
        hLineColor: () => SANATANI_COLORS.sandalwood, vLineColor: () => SANATANI_COLORS.sandalwood,
        fillColor: () => SANATANI_COLORS.white,
        paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6,
      },
      margin: [0, 2, 0, 6],
    },
    ...(qrUrl ? [{ image: qrUrl, width: 80, alignment: 'center' as const, margin: [0, 4, 0, 4] }] : []),
    {
      text: 'Present this slip at Mandir sanctum sanctorum for Pushpanjali',
      font: SANATANI_FONTS.body, fontSize: 7, color: SANATANI_COLORS.stone,
      alignment: 'center' as const,
    },
    {
      text: 'पुष्पांजलि हेतु मंदिर गर्भगृह में यह पर्ची प्रस्तुत करें',
      font: SANATANI_FONTS.devanagari, fontSize: 7, color: SANATANI_COLORS.stone,
      alignment: 'center' as const, margin: [0, 2, 0, 8],
    },
    lotusDivider(),
    {
      text: docRef,
      font: SANATANI_FONTS.body, fontSize: 6.5, color: SANATANI_COLORS.stone,
      alignment: 'center' as const,
    },
    {
      text: blessingFor(workspace),
      font: SANATANI_FONTS.sacred, fontSize: 9, color: SANATANI_COLORS.kumkum,
      alignment: 'center' as const, margin: [0, 4, 0, 0],
    },
  ];

  const docDef = {
    pageSize: 'A5',
    pageMargins: [20, 20, 20, 20],
    background: creamWash(419.53, 595.28),
    content: [tripleBorder(content)],
    defaultStyle: { font: SANATANI_FONTS.body, color: SANATANI_COLORS.umber },
  };

  await outputPdf(docDef, `Sankalp_${booking.id}.pdf`, { download: true });
};

/* ================================================================== */
/*  5. DEVOTEE DONATION HISTORY STATEMENT — A4                        */
/* ================================================================== *
 *
 * Same signature as the jsPDF version:
 *   generateDonationHistoryPDF(devotee, donations, workspace)
 *
 * Design: sacred header, bilingual devotee grid, saffron lifetime-total
 * amount box, native pdfmake table (replaces jspdf-autotable's dark
 * corporate header with a saffron one), sacred footer.
 */

export const generateDonationHistoryPDF = async (
  devotee: DevoteeMember,
  donations: TreasuryTransaction[],
  workspace: WorkspaceConfig
): Promise<void> => {
  const name = devotee.fullName || (devotee as any).name || 'Sanatani Devotee';
  const logo = await getActiveWorkspaceLogo(workspace.id);
  const total = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const headerStack: any[] = [];
  if (logo) {
    headerStack.push({ image: logo, width: 44, alignment: 'center' as const, margin: [0, 0, 0, 4] });
  }
  headerStack.push(
    sacredHeader({
      trustName: workspace.name || 'Sanatani Bandhan',
      invocation: invocationFor(workspace),
    })
  );

  const content: any[] = [
    ...headerStack,
    sectionTitle('DONATION HISTORY STATEMENT', 'दान इतिहास विवरण'),
    detailGrid([
      [bilingual('Devotee Name', 'भक्त का नाम'), autoText(name, 10, { bold: true })],
      [bilingual('Devotee ID', 'भक्त आईडी'), String(devotee.id || '')],
      ...(devotee.phone ? [[bilingual('Phone', 'फ़ोन'), devotee.phone] as [any, any]] : []),
      ...(devotee.gotra ? [[bilingual('Gotra', 'गोत्र'), autoText(devotee.gotra, 8.5)] as [any, any]] : []),
    ]),
    amountBox(total, numberToWords(total)),
    dataTable(
      ['Date', 'Receipt No.', 'Category', 'Mode', 'Amount'],
      donations.map((d) => [
        fmtDate(d.date),
        String(d.id || '').substring(0, 18),
        d.category || 'General',
        d.paymentMode || 'Cash',
        { text: inr(d.amount), bold: true, alignment: 'right' },
      ]),
      { widths: ['18%', '22%', '22%', '18%', '20%'] }
    ),
    sacredFooter({ blessing: blessingFor(workspace), docRef: generateCryptoDocRef('HIST') }),
  ];

  const docDef = {
    pageSize: 'A4',
    pageMargins: [28, 28, 28, 28],
    content: [tripleBorder(content)],
    defaultStyle: { font: SANATANI_FONTS.body, color: SANATANI_COLORS.umber },
  };

  await outputPdf(docDef, `${name.replace(/\s+/g, '_')}_Donation_History.pdf`, { download: true });
};

/* ================================================================== */
/*  6. ANNUAL DONATION SUMMARY — A4                                    */
/* ================================================================== *
 *
 * Same signature as the jsPDF version:
 *   generateAnnualDonationSummaryPDF(devotee, donations, workspace)
 *
 * Behaviour parity: the jsPDF version called doc.autoPrint() and opened
 * the PDF in a new tab. pdfmake has no autoPrint equivalent, so this
 * version opens the PDF in a new tab (print dialog is one Ctrl/Cmd+P
 * away). Year rows newest-first, lifetime contribution highlighted.
 */

export const generateAnnualDonationSummaryPDF = async (
  devotee: DevoteeMember,
  donations: TreasuryTransaction[],
  workspace: WorkspaceConfig
): Promise<void> => {
  const name = devotee.fullName || (devotee as any).name || 'Sanatani Devotee';
  const logo = await getActiveWorkspaceLogo(workspace.id);

  const byYear: Record<string, { count: number; total: number }> = {};
  donations.forEach((d) => {
    const y = new Date(d.date).getFullYear().toString();
    if (!byYear[y]) byYear[y] = { count: 0, total: 0 };
    byYear[y].count += 1;
    byYear[y].total += Number(d.amount || 0);
  });
  const years = Object.keys(byYear).sort((a, b) => parseInt(b) - parseInt(a));
  const lifetime = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const content: any[] = [
    ...(logo ? [{ image: logo, width: 44, alignment: 'center' as const, margin: [0, 0, 0, 4] }] : []),
    sacredHeader({
      trustName: workspace.name || 'Sanatani Bandhan',
      invocation: invocationFor(workspace),
    }),
    sectionTitle('ANNUAL DONATION SUMMARY', 'वार्षिक दान सारांश'),
    {
      text: 'Printable overview of your dharmic giving, year by year.',
      font: SANATANI_FONTS.body, fontSize: 8, italics: true, color: SANATANI_COLORS.stone,
      alignment: 'center' as const, margin: [0, 0, 0, 4],
    },
    detailGrid([
      [bilingual('Devotee Name', 'भक्त का नाम'), autoText(name, 10, { bold: true })],
      [bilingual('Devotee ID', 'भक्त आईडी'), String(devotee.id || '')],
      ...(devotee.phone ? [[bilingual('Phone', 'फ़ोन'), devotee.phone] as [any, any]] : []),
      ...(devotee.gotra ? [[bilingual('Gotra', 'गोत्र'), autoText(devotee.gotra, 8.5)] as [any, any]] : []),
    ]),
    amountBox(lifetime, numberToWords(lifetime)),
    dataTable(
      ['Financial Year', 'Total Receipts', 'Annual Contribution'],
      years.length > 0
        ? years.map((y) => [
            { text: y, bold: true },
            { text: String(byYear[y].count), alignment: 'center' },
            { text: inr(byYear[y].total), bold: true, alignment: 'right' },
          ])
        : [['—', 'No donations recorded', '—']],
      { widths: ['30%', '30%', '40%'], fontSize: 9 }
    ),
    sacredFooter({ blessing: blessingFor(workspace), docRef: generateCryptoDocRef('ANN') }),
  ];

  const docDef = {
    pageSize: 'A4',
    pageMargins: [28, 28, 28, 28],
    content: [tripleBorder(content)],
    defaultStyle: { font: SANATANI_FONTS.body, color: SANATANI_COLORS.umber },
  };

  // Parity with the jsPDF version: open in a new tab for printing.
  const url = String(await outputPdf(docDef, `${name.replace(/\s+/g, '_')}_Annual_Summary.pdf`, { returnType: 'bloburl' }));
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
};

/* ================================================================== */
/*  7. TREASURY & EXPENSE LEDGER STATEMENT — A4 landscape              */
/* ================================================================== *
 *
 * Same signature as the jsPDF version:
 *   generateTreasuryLedgerPDF(transactions, workspace, reportTitle?)
 *
 * Improvements over the jsPDF version:
 *  - Landscape orientation (was portrait with 7 cramped columns).
 *  - Income / Expense / Net Balance as three colour-coded summary boxes
 *    (was four plain text lines).
 *  - Income rows tinted green, expense rows tinted kumkum in the Type
 *    column (was monochrome).
 *  - Saffron table header (was dark corporate navy #2C3E50).
 */

export const generateTreasuryLedgerPDF = async (
  transactions: TreasuryTransaction[],
  workspace: WorkspaceConfig,
  reportTitle: string = 'Treasury & Expense Ledger Statement'
): Promise<void> => {
  const logo = await getActiveWorkspaceLogo(workspace.id);
  const totalIncome = transactions
    .filter((t: any) => t.type === 'Income')
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const totalExpense = transactions
    .filter((t: any) => t.type === 'Expense')
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const net = totalIncome - totalExpense;

  const summaryBox = (label: string, dev: string, value: number, color: string): any => ({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: label, font: SANATANI_FONTS.body, fontSize: 7, bold: true, color: SANATANI_COLORS.stone, alignment: 'center' as const },
          { text: dev, font: SANATANI_FONTS.devanagari, fontSize: 7, color: SANATANI_COLORS.stone, alignment: 'center' as const },
          { text: inr(value), font: SANATANI_FONTS.body, fontSize: 13, bold: true, color, alignment: 'center' as const, margin: [0, 3, 0, 0] },
        ],
        margin: [0, 6, 0, 6],
      }]],
    },
    layout: {
      hLineWidth: () => 0.75, vLineWidth: () => 0.75,
      hLineColor: () => color, vLineColor: () => color,
      fillColor: () => SANATANI_COLORS.white,
    },
  });

  const content: any[] = [
    ...(logo ? [{ image: logo, width: 40, alignment: 'center' as const, margin: [0, 0, 0, 4] }] : []),
    sacredHeader({
      trustName: workspace.name || 'Sanatani Bandhan',
      invocation: invocationFor(workspace),
    }),
    sectionTitle(reportTitle.toUpperCase(), 'कोष एवं व्यय बही'),
    {
      text: `Report Date: ${fmtDate(new Date())}   •   ${transactions.length} transactions`,
      font: SANATANI_FONTS.body, fontSize: 8, color: SANATANI_COLORS.stone,
      alignment: 'center' as const, margin: [0, 0, 0, 6],
    },
    {
      columns: [
        summaryBox('TOTAL INCOME', 'कुल आय', totalIncome, '#2F9E44'),
        summaryBox('TOTAL EXPENSE', 'कुल व्यय', totalExpense, SANATANI_COLORS.kumkum),
        summaryBox('NET BALANCE', 'शुद्ध शेष', net, SANATANI_COLORS.saffron),
      ],
      columnGap: 10,
      margin: [0, 0, 0, 6],
    },
    dataTable(
      ['Date', 'Ref ID', 'Type', 'Category', 'Mode', 'Entity / Payee', 'Amount'],
      transactions.map((t: any) => {
        const isInc = t.type === 'Income';
        return [
          fmtDate(t.date),
          String(t.id || '').substring(0, 14),
          {
            text: t.type || '',
            bold: true,
            color: isInc ? '#2F9E44' : SANATANI_COLORS.kumkum,
          },
          t.category || '',
          t.paymentMode || '',
          t.devoteeName || t.vendorName || '',
          { text: inr(t.amount), bold: true, alignment: 'right' },
        ];
      }),
      { widths: ['11%', '13%', '10%', '16%', '13%', '20%', '17%'], fontSize: 7 }
    ),
    sacredFooter({ blessing: blessingFor(workspace), docRef: generateCryptoDocRef('LEDG') }),
  ];

  const docDef = {
    pageSize: 'A4',
    pageOrientation: 'landscape' as const,
    pageMargins: [24, 24, 24, 24],
    content: [tripleBorder(content)],
    defaultStyle: { font: SANATANI_FONTS.body, color: SANATANI_COLORS.umber },
  };

  await outputPdf(docDef, `Treasury_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`, { download: true });
};

/* ================================================================== */
/*  8. COMMUNITY POLL / PANCHAYAT RESOLUTION REPORT — A4               */
/* ================================================================== *
 *
 * Signature: generatePollReportPdf(workspaceName, poll, devotees = [])
 * One deliberate change: the jsPDF version was synchronous, but pdfmake
 * font loading is async, so this version returns Promise<void>. Callers
 * that don't await still get the download — fire-and-forget works.
 *
 * Design: sacred header with the workspace name, bilingual "Community
 * Panchayat Resolution / सामुदायिक पंचायत संकल्प" title, poll meta,
 * saffron voter table (was dark navy #B45309 header — now on-brand),
 * sacred footer with the resolution doc ref.
 */

export const generatePollReportPdf = async (
  workspaceName: string,
  poll: any,
  devotees: DevoteeMember[] = []
): Promise<void> => {
  const voters = (poll?.votes || []).map((v: any) => {
    const devotee = devotees.find((d) => d.id === v.devoteeId);
    return [
      autoText(devotee?.fullName || v.devoteeName || v.devoteeId || '', 7.5),
      v.choice || (v.inFavor ? 'In Favor' : 'Against'),
      fmtDate(v.timestamp) || 'N/A',
    ];
  });

  const choiceCounts: Record<string, number> = {};
  (poll?.votes || []).forEach((v: any) => {
    const c = v.choice || (v.inFavor ? 'In Favor' : 'Against');
    choiceCounts[c] = (choiceCounts[c] || 0) + 1;
  });
  const tally = Object.entries(choiceCounts)
    .map(([c, n]) => `${c}: ${n}`)
    .join('   •   ');

  const content: any[] = [
    sacredHeader({
      trustName: workspaceName || 'Sanatani Bandhan',
      invocation: INVOCATION_DEFAULT,
    }),
    sectionTitle('COMMUNITY PANCHAYAT RESOLUTION', 'सामुदायिक पंचायत संकल्प'),
    {
      text: poll?.title || 'Poll Report',
      font: SANATANI_FONTS.body, fontSize: 13, bold: true, color: SANATANI_COLORS.umber,
      alignment: 'center' as const, margin: [0, 0, 0, 4],
    },
    {
      text: `Category: ${poll?.category || 'Governance'}   |   Status: ${poll?.status || 'Active'}   |   Total Votes: ${(poll?.votes || []).length}`,
      font: SANATANI_FONTS.body, fontSize: 8.5, color: SANATANI_COLORS.stone,
      alignment: 'center' as const, margin: [0, 0, 0, 2],
    },
    ...(tally
      ? [{
          text: tally,
          font: SANATANI_FONTS.body, fontSize: 9, bold: true, color: SANATANI_COLORS.saffron,
          alignment: 'center' as const, margin: [0, 2, 0, 4],
        }]
      : []),
    ...(poll?.description
      ? [{
          text: poll.description,
          font: SANATANI_FONTS.body, fontSize: 8.5, italics: true, color: SANATANI_COLORS.umber,
          alignment: 'center' as const, margin: [0, 0, 0, 4],
        }]
      : []),
    dataTable(
      ['Devotee Member', 'Vote Cast', 'Timestamp'],
      voters.length > 0 ? voters : [[{ text: 'No recorded votes', italics: true }, '—', '—']],
      { widths: ['50%', '25%', '25%'] }
    ),
    sacredFooter({
      blessing: '॥ यतो धर्मस्ततो जयः ॥',
      docRef: generateCryptoDocRef('POLL'),
    }),
  ];

  const docDef = {
    pageSize: 'A4',
    pageMargins: [28, 28, 28, 28],
    content: [tripleBorder(content)],
    defaultStyle: { font: SANATANI_FONTS.body, color: SANATANI_COLORS.umber },
  };

  await outputPdf(docDef, `Resolution_${poll?.id || 'Report'}.pdf`, { download: true });
};
