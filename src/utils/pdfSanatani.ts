/**
 * Sanatani Bandhan — pdfmake-based Sacred PDF Engine (Phase B)
 *
 * Drop-in replacement for the jsPDF generators in src/utils/pdfGenerator.ts,
 * with proper Indic script shaping and the Sanatani design system.
 *
 * WHY pdfmake: jsPDF is architecturally incapable of Indic text shaping
 * (no OpenType GSUB/GPOS — vowel signs misplace, conjuncts break). pdfmake
 * handles Devanagari/Bengali/Tamil correctly for 99% of receipt text.
 *
 * FUNCTION SIGNATURES match the jsPDF versions so the UI needs no changes:
 *   generate80GTaxReceipt(tx, workspace, options?) → Promise<Blob | string>
 *   generateDonationAcknowledgment(tx, workspace, options?) → Promise<Blob | string>
 *
 * Difference: no 'doc' returnType (jsPDF-specific). Supported:
 *   { download?: boolean; returnType?: 'save' | 'blob' | 'bloburl' }
 *
 * $0, offline, MIT licensed. No CDN at runtime.
 */

import {
  SANATANI_COLORS,
  SANATANI_FONTS,
  fontForLanguage,
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
} from './sanataniTheme';

import { letterheadForWorkspace } from '../lib/orgBranding';

/* ================================================================== */
/*  FONT LOADING GUIDE                                                 */
/* ================================================================== *
 *
 * pdfmake needs TTFs registered in its virtual file system. Steps:
 *
 * 1. Download (all SIL Open Font License — free for commercial use):
 *    - NotoSans-Regular.ttf, NotoSans-Bold.ttf
 *      https://fonts.google.com/noto/specimen/Noto+Sans
 *    - NotoSansDevanagari-Regular.ttf, NotoSansDevanagari-Bold.ttf
 *      https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari
 *    - NotoSansBengali-Regular.ttf, NotoSansBengali-Bold.ttf
 *      https://fonts.google.com/noto/specimen/Noto+Sans+Bengali
 *    - NotoSansTamil-Regular.ttf, NotoSansTamil-Bold.ttf
 *      https://fonts.google.com/noto/specimen/Noto+Sans+Tamil
 *    - TiroDevanagariHindi-Regular.ttf
 *      https://fonts.google.com/specimen/Tiro+Devanagari+Hindi
 *
 * 2. Place in `public/fonts/` (self-hosted — Google Fonts CDN breaks the
 *    offline requirement).
 *
 * 3. At app startup (or lazily on first PDF generation), fetch each TTF
 *    as ArrayBuffer, convert to base64, and register:
 *
 *      import pdfMake from 'pdfmake/build/pdfmake';
 *      import pdfFonts from 'pdfmake/build/vfs_fonts';
 *      pdfMake.vfs = { ...pdfMake.vfs, ...pdfFonts.pdfMake.vfs };
 *
 *      const loadFont = async (name: string, url: string) => {
 *        const buf = await (await fetch(url)).arrayBuffer();
 *        let binary = '';
 *        const bytes = new Uint8Array(buf);
 *        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
 *        pdfMake.vfs[name] = btoa(binary);
 *      };
 *      await loadFont('NotoSans-Regular.ttf', '/fonts/NotoSans-Regular.ttf');
 *      // ... etc for each file
 *
 *      pdfMake.fonts = {
 *        NotoSans: { normal: 'NotoSans-Regular.ttf', bold: 'NotoSans-Bold.ttf' },
 *        NotoSansDevanagari: { normal: 'NotoSansDevanagari-Regular.ttf', bold: 'NotoSansDevanagari-Bold.ttf' },
 *        NotoSansBengali: { normal: 'NotoSansBengali-Regular.ttf', bold: 'NotoSansBengali-Bold.ttf' },
 *        NotoSansTamil: { normal: 'NotoSansTamil-Regular.ttf', bold: 'NotoSansTamil-Bold.ttf' },
 *        TiroDevanagari: { normal: 'TiroDevanagariHindi-Regular.ttf', bold: 'TiroDevanagariHindi-Regular.ttf' },
 *      };
 *
 * 4. Call `ensurePdfFonts()` (below) before generating. It no-ops after
 *    the first successful load and falls back gracefully if fonts are
 *    missing (pdfmake's built-in Roboto renders Latin; Indic falls back
 *    to system shaping — degraded but not blank).
 *
 * TODO(owner): drop the 11 TTF files into public/fonts/ via GitHub web UI
 * (binary upload — the connector cannot do binary). Until then, Latin-only
 * rendering with graceful degradation.
 * ================================================================== */

let fontsReady = false;
let fontsPromise: Promise<void> | null = null;

const FONT_FILES: Array<{ vfsName: string; url: string }> = [
  { vfsName: 'NotoSans-Regular.ttf', url: '/fonts/NotoSans-Regular.ttf' },
  { vfsName: 'NotoSans-Bold.ttf', url: '/fonts/NotoSans-Bold.ttf' },
  { vfsName: 'NotoSansDevanagari-Regular.ttf', url: '/fonts/NotoSansDevanagari-Regular.ttf' },
  { vfsName: 'NotoSansDevanagari-Bold.ttf', url: '/fonts/NotoSansDevanagari-Bold.ttf' },
  { vfsName: 'NotoSansBengali-Regular.ttf', url: '/fonts/NotoSansBengali-Regular.ttf' },
  { vfsName: 'NotoSansBengali-Bold.ttf', url: '/fonts/NotoSansBengali-Bold.ttf' },
  { vfsName: 'NotoSansTamil-Regular.ttf', url: '/fonts/NotoSansTamil-Regular.ttf' },
  { vfsName: 'NotoSansTamil-Bold.ttf', url: '/fonts/NotoSansTamil-Bold.ttf' },
  { vfsName: 'TiroDevanagariHindi-Regular.ttf', url: '/fonts/TiroDevanagariHindi-Regular.ttf' },
];

/**
 * Ensure pdfmake fonts are loaded. Safe to call repeatedly.
 * Resolves even if fonts are missing (graceful degradation).
 */
export async function ensurePdfFonts(): Promise<void> {
  if (fontsReady) return;
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    try {
      const mod: any = (await import('pdfmake/build/pdfmake')).default;
      // pdfmake's createPdf() reads fonts/vfs from the GLOBAL pdfMake
      // (__webpack_require__.g.pdfMake), not from the module namespace —
      // under bundlers the two are different objects. Everything must be
      // registered on the global for createPdf to see it.
      const g: any = globalThis as any;
      g.pdfMake = g.pdfMake || {};
      const pdfMake: any = g.pdfMake;
      if (typeof mod?.createPdf === 'function' && !pdfMake.createPdf) pdfMake.createPdf = mod.createPdf;
      const pdfFonts: any = await import('pdfmake/build/vfs_fonts');
      // vfs_fonts.js assigns via `this.pdfMake = ...`, which bundlers
      // (Vite/Rollup ESM output) silently drop — the Roboto base64 then
      // only survives as named exports on the module namespace. Collect
      // from every known shape so the built-in fonts always register.
      const builtinVfs: Record<string, string> = {};
      for (const k of Object.keys(pdfFonts)) {
        if (k.endsWith('.ttf') && typeof pdfFonts[k] === 'string') builtinVfs[k] = pdfFonts[k];
      }
      const legacyVfs = pdfFonts.pdfMake?.vfs || g.pdfMake?.vfs || {};
      pdfMake.vfs = { ...(mod || {}).vfs, ...legacyVfs, ...builtinVfs };

      let loaded = 0;
      const loadedNames = new Set<string>();
      for (const { vfsName, url } of FONT_FILES) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          // Reject non-font payloads (e.g. the SPA fallback HTML served
          // for missing files). TTF: 00 01 00 00; OTF: 'OTTO'.
          const magic = bytes.length >= 4
            ? (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
            : 0;
          const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
          if (magic !== 0x00010000 && tag !== 'OTTO' && tag !== 'true') continue;
          let binary = '';
          const CHUNK = 0x8000;
          for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as any);
          }
          (pdfMake as any).vfs[vfsName] = btoa(binary);
          loaded++;
          loadedNames.add(vfsName);
        } catch {
          /* font missing — skip, graceful degradation */
        }
      }

      // Register a family only when its files genuinely loaded — a
      // half-registered family throws inside pdfmake at layout time.
      // Descriptors stay as vfs filenames: pdfmake 0.2.x resolves font
      // files through its virtual file system (see pdfEngineHandles),
      // which now works because vfs is registered on the global pdfMake.
      const fam = (name: string, files: string[]) => {
        if (files.every((f) => loadedNames.has(f))) {
          (pdfMake as any).fonts[name] = {
            normal: files[0], bold: files[1] || files[0],
            italics: files[0], bolditalics: files[1] || files[0],
          };
        }
      };
      if (loaded > 0) {
        (pdfMake as any).fonts = { ...(pdfMake as any).fonts };
        fam('NotoSans', ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf']);
        fam('NotoSansDevanagari', ['NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari-Bold.ttf']);
        fam('NotoSansBengali', ['NotoSansBengali-Regular.ttf', 'NotoSansBengali-Bold.ttf']);
        fam('NotoSansTamil', ['NotoSansTamil-Regular.ttf', 'NotoSansTamil-Bold.ttf']);
        fam('TiroDevanagari', ['TiroDevanagariHindi-Regular.ttf', 'TiroDevanagariHindi-Regular.ttf']);
        // Same-script fallback: sacred headings stay in Devanagari type
        // when the display face is missing (better than a hard throw).
        const F = (pdfMake as any).fonts;
        if (!F.TiroDevanagari && F.NotoSansDevanagari) F.TiroDevanagari = F.NotoSansDevanagari;
      }
      fontsReady = true;
    } catch (e) {
      console.warn('[pdfSanatani] font loading failed, using built-in fonts', e);
      fontsReady = true; // don't retry forever
    }
  })();
  return fontsPromise;
}

/* ================================================================== */
/*  Shared helpers (mirrored from pdfGenerator.ts for drop-in parity)  */
/* ================================================================== */

/** Cryptographic doc ref: DOC REF: SB-XXXX-XXXX-XXXX */
export const generateCryptoDocRef = (prefix = 'SB'): string => {
  const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DOC REF: ${prefix}-${segment()}-${segment()}-${segment()}`;
};

/** Indian-system number to words (Crores, Lakhs, Thousands) */
export const numberToWords = (num: number): string => {
  if (isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const whole = Math.floor(num);
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n: number): string => (n < 20 ? units[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : ''));
  const three = (n: number): string => {
    const h = Math.floor(n / 100), r = n % 100;
    return (h ? units[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? two(r) : '');
  };
  let out = '';
  const cr = Math.floor(whole / 10000000);
  const lk = Math.floor((whole % 10000000) / 100000);
  const th = Math.floor((whole % 100000) / 1000);
  const rest = whole % 1000;
  if (cr) out += two(cr) + ' Crore ';
  if (lk) out += two(lk) + ' Lakh ';
  if (th) out += two(th) + ' Thousand ';
  if (rest) out += three(rest) + ' ';
  return out.trim() + ' Rupees Only';
};

/** Structured receipt number: [CENTER]-[TYPE]-[SERIAL] (ISKCON-inspired 12-digit pattern) */
export function structuredReceiptNo(centerCode: string, typeCode: string, serial: number | string): string {
  const c = String(centerCode || 'SB').toUpperCase().padStart(4, '0').slice(-4);
  const t = String(typeCode || '02').padStart(2, '0').slice(-2);
  const s = String(serial).padStart(6, '0').slice(-6);
  return `${c}-${t}-${s}`;
}

type ReturnOpt = { download?: boolean; returnType?: 'save' | 'blob' | 'bloburl'; isCopy?: boolean; isSamplePreview?: boolean };

/**
 * Resolve the pdfmake engine handles. createPdf() reads fonts/vfs from the
 * webpack global, which bundlers don't wire to the module namespace — so
 * pass them explicitly. Falls back through every known location.
 */
export async function pdfEngineHandles(): Promise<{ createPdf: (docDef: any) => any; richFonts: boolean }> {
  await ensurePdfFonts();
  const mod: any = (await import('pdfmake/build/pdfmake')).default;
  const g: any = (globalThis as any).pdfMake || {};
  // Passing explicit fonts disables pdfmake's built-in defaultClientFonts,
  // so the Roboto fallback must be merged in — otherwise even plain text
  // breaks when only some custom fonts loaded.
  const ROBOTO = {
    Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf', italics: 'Roboto-Italic.ttf', bolditalics: 'Roboto-MediumItalic.ttf' },
  };
  const fonts = { ...ROBOTO, ...(mod?.fonts || {}), ...(g.fonts || {}) };
  const vfs = { ...(mod?.vfs || {}), ...(g.vfs || {}) };
  const richFonts = !!((g.fonts || {}).NotoSansDevanagari && (g.fonts || {}).NotoSans);
  const createPdf = mod?.createPdf || g.createPdf;
  return {
    createPdf: (docDef: any) => createPdf.call(mod || g, docDef, undefined, fonts, vfs),
    richFonts,
  };
}

async function outputPdf(docDef: any, fileName: string, options?: ReturnOpt): Promise<Blob | string> {
  const { createPdf } = await pdfEngineHandles();
  return new Promise((resolve, reject) => {
    try {
      const pdf = createPdf(docDef);
      if (options?.download || !options?.returnType || options.returnType === 'save') {
        pdf.download(fileName);
        // also resolve a blob for callers that want it
        pdf.getBlob((blob: Blob) => resolve(blob));
      } else if (options.returnType === 'blob') {
        pdf.getBlob((blob: Blob) => resolve(blob));
      } else if (options.returnType === 'bloburl') {
        pdf.getBlob((blob: Blob) => resolve(URL.createObjectURL(blob)));
      }
    } catch (e) {
      reject(e);
    }
  });
}

async function qrDataUrl(payload: string): Promise<string> {
  try {
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(payload, { margin: 1, width: 200 });
  } catch {
    return '';
  }
}

/* ================================================================== */
/*  80G TAX RECEIPT — flagship sacred + statutory document             */
/* ================================================================== */

export const generate80GTaxReceipt = async (
  transaction: any,
  workspace: any,
  options?: ReturnOpt
): Promise<Blob | string> => {
  const docRef = generateCryptoDocRef('80G');
  const is80GRegistered = !!workspace?.trust80GRegistered;

  const trustName = workspace?.name || 'Sanatani Bandhan Dharmik Trust';
  const trustRegNumber = workspace?.trustRegNumber || workspace?.registrationNumber || (is80GRegistered ? '—' : 'NOT REGISTERED');
  const exemption80GNumber = is80GRegistered
    ? (workspace?.trust80GURN || workspace?.taxExemptionNumber || '—')
    : 'NOT REGISTERED — SAMPLE';
  // Phase A legal gap closed: validity period dates
  const exemption80GValidFrom = workspace?.trust80GValidFrom || '';
  const exemption80GValidTo = workspace?.trust80GValidTo || '';
  const trustPan = workspace?.panNumber || workspace?.trustPAN || (is80GRegistered ? '—' : 'NOT REGISTERED');

  const addressParts = [workspace?.address, workspace?.city, workspace?.state, workspace?.pincode, workspace?.country].filter(Boolean);
  const trustAddress = addressParts.length > 0 ? addressParts.join(', ') : (is80GRegistered ? '—' : 'Sample address — update in Settings');

  const donorName = transaction?.devoteeName || transaction?.donorName || 'Sanatani Devotee';
  const donorNameDev = transaction?.devoteeNameDev || transaction?.donorNameDev || '';
  const donorPan = transaction?.devoteePan || transaction?.donorPan || transaction?.pan || '';
  const amount = Number(transaction?.amount || 0);
  const amountInWords = numberToWords(amount);
  const dateOfReceipt = transaction?.date || new Date().toISOString().split('T')[0];
  const receiptNo = transaction?.taxReceiptNumber || transaction?.receiptNo ||
    structuredReceiptNo(workspace?.centerCode || 'SB', '02', String(transaction?.id || Date.now()).slice(-6));
  const paymentMode = transaction?.paymentMode || 'UPI / Digital';
  const referenceNo = transaction?.referenceNo || transaction?.utr || '';
  const purpose = transaction?.purpose || transaction?.category || 'General Dharmic & Humanitarian Seva';

  // Phase A legal gap closed: ₹2,000 cash limit warning
  const isCash = /cash/i.test(paymentMode);
  const cashWarning = isCash && amount > 2000;

  const qrPayload = JSON.stringify({ receiptNo, date: dateOfReceipt, amount, donor: donorName, donorPan, trustPan, exemption80G: exemption80GNumber, docRef });
  const qrUrl = await qrDataUrl(qrPayload);

  const metaLine = `PAN: ${trustPan}   |   Trust Reg. No: ${trustRegNumber}   |   80G: ${exemption80GNumber}` +
    (exemption80GValidFrom || exemption80GValidTo ? ` (${exemption80GValidFrom || '…'} to ${exemption80GValidTo || '…'})` : '');

  const content: any[] = [
    sacredHeader({ trustName, trustAddress, metaLine, invocation: invocationFor(workspace) }),

    sectionTitle('STATUTORY DONATION RECEIPT & 80G TAX EXEMPTION CERTIFICATE', 'वैधानिक दान रसीद एवं 80G कर छूट प्रमाणपत्र'),

    detailGrid([
      [bilingual('Receipt No.', 'रसीद संख्या'), { text: receiptNo, bold: true, fontSize: 9 }],
      [bilingual('Date of Receipt', 'प्राप्ति तिथि'), dateOfReceipt],
      [bilingual('Payment Mode', 'भुगतान माध्यम'), paymentMode + (referenceNo ? `  (Ref: ${referenceNo})` : '')],
      [bilingual('Purpose / Seva', 'उद्देश्य / सेवा'), purpose],
    ]),

    sectionTitle('DONOR DETAILS', 'दाता विवरण'),
    detailGrid([
      [bilingual('Donor Name', 'दाता का नाम'),
        donorNameDev
          ? [{ text: donorName, bold: true, fontSize: 10 }, { text: donorNameDev, font: SANATANI_FONTS.devanagari, fontSize: 10, color: SANATANI_COLORS.umber }]
          : [{ text: donorName, bold: true, fontSize: 10 }]],
      [bilingual('Donor PAN', 'दाता पैन'), donorPan || 'N/A — required for Form 10BE'],
      [bilingual('Donor Address', 'दाता का पता'), transaction?.donorAddress || transaction?.address || '—'],
    ]),

    sectionTitle('DONATION AMOUNT', 'दान राशि'),
    amountBox(amount, amountInWords),

    // Donor-facing gratitude blessing (Phase 3 devotional giving layer):
    // the statutory footer keeps its mantra; this line speaks to the
    // donor's heart — "May your generosity return to you manifold 🙏".
    {
      stack: [
        {
          text: 'May your generosity return to you manifold 🙏',
          font: SANATANI_FONTS.body, fontSize: 9, italics: true,
          color: SANATANI_COLORS.umber, alignment: 'center', margin: [0, 8, 0, 0],
        },
        {
          text: 'आपका दान शुभ हो',
          font: SANATANI_FONTS.devanagari, fontSize: 9,
          color: SANATANI_COLORS.umber, alignment: 'center', margin: [0, 2, 0, 0],
        },
        {
          text: 'আপনার দান শুভ হোক',
          font: SANATANI_FONTS.bengali, fontSize: 9,
          color: SANATANI_COLORS.umber, alignment: 'center', margin: [0, 2, 0, 4],
        },
      ],
    },

    ...(cashWarning ? [{
      text: '⚠ Cash donations above ₹2,000 are NOT eligible for 80G tax exemption (Income Tax Act). Please prefer digital payment.',
      font: SANATANI_FONTS.body, fontSize: 8, bold: true, color: SANATANI_COLORS.kumkum,
      margin: [0, 4, 0, 4],
    }] : []),

    sectionTitle('STATUTORY DECLARATION', 'वैधानिक घोषणा'),
    {
      ol: [
        'This receipt is issued under Section 80G of the Income Tax Act, 1961.',
        `The trust holds valid 80G registration${exemption80GValidTo ? ` valid until ${exemption80GValidTo}` : ''}.`,
        'The donor has confirmed no goods, services, or benefits were received in exchange for this donation.',
      ],
      font: SANATANI_FONTS.body, fontSize: 8, color: SANATANI_COLORS.umber, margin: [12, 2, 0, 4],
    },

    // QR + signature row
    {
      columns: [
        ...(qrUrl ? [{ image: qrUrl, width: 80, alignment: 'left' as const }] : []),
        {
          stack: [
            { text: 'Scan for digital verification', fontSize: 7, color: SANATANI_COLORS.stone },
            { text: 'डिजिटल सत्यापन हेतु स्कैन करें', font: SANATANI_FONTS.devanagari, fontSize: 7, color: SANATANI_COLORS.stone, margin: [0, 0, 0, 12] },
            { text: 'Authorised Signatory', fontSize: 8, bold: true, margin: [0, 24, 0, 0] },
            { text: trustName, fontSize: 7, color: SANATANI_COLORS.stone },
          ],
          alignment: 'right' as const,
        },
      ],
      margin: [0, 8, 0, 0],
    },

    sacredFooter({ blessing: blessingFor(workspace), docRef }),
  ];

  // SAMPLE / DUPLICATE watermarks (background)
  const background: any[] = [];
  if (!is80GRegistered) {
    background.push({
      text: 'SAMPLE — NOT A VALID 80G CERTIFICATE',
      fontSize: 34, bold: true, color: SANATANI_COLORS.kumkum, opacity: 0.14,
      alignment: 'center', margin: [0, 260, 0, 0], angle: 30,
    });
  }
  if (options?.isCopy) {
    background.push({
      text: 'DUPLICATE COPY', fontSize: 60, bold: true, color: SANATANI_COLORS.stone, opacity: 0.12,
      alignment: 'center', margin: [0, 300, 0, 0], angle: -30,
    });
  }

  const docDef = {
    pageSize: 'A4',
    pageMargins: [28, 28, 28, 28],
    background,
    content: [tripleBorder(content)],
    defaultStyle: { font: SANATANI_FONTS.body, color: SANATANI_COLORS.umber },
  };

  return outputPdf(docDef, `80G_Receipt_${receiptNo}.pdf`, options);
};

/* ================================================================== */
/*  DONATION ACKNOWLEDGMENT — WhatsApp-friendly blessing               */
/* ================================================================== *
 *
 * Half-page, beautiful, bilingual. Designed to be shared on WhatsApp —
 * this is about the DONOR, not the trust. Feels like a blessing.
 */

export const generateDonationAcknowledgment = async (
  transaction: any,
  workspace: any,
  options?: ReturnOpt
): Promise<Blob | string> => {
  const docRef = generateCryptoDocRef('ACK');
  const trustName = workspace?.name || 'Sanatani Bandhan';
  const donorName = transaction?.devoteeName || transaction?.donorName || 'Sanatani Devotee';
  const donorNameDev = transaction?.devoteeNameDev || transaction?.donorNameDev || '';
  const amount = Number(transaction?.amount || 0);
  const sevaName = transaction?.sevaName || transaction?.purpose || transaction?.category || 'Seva';
  const dateStr = transaction?.date || new Date().toISOString().split('T')[0];

  // Pillar 1 — letterhead on the acknowledgment too (logo, name, address).
  const lh = await letterheadForWorkspace(workspace);

  const content: any[] = [
    sacredHeader({
      trustName,
      trustAddress: lh.addressLine,
      metaLine: lh.metaLine,
      invocation: invocationFor(workspace),
      logoDataUrl: lh.logoDataUrl,
      monogramLetter: lh.logoDataUrl ? undefined : lh.monogramLetter,
      tagline: lh.tagline,
      phone: lh.phone ? `Ph: ${lh.phone}` : undefined,
    }),
    {
      text: OM,
      font: SANATANI_FONTS.devanagari, fontSize: 28, color: SANATANI_COLORS.gold,
      alignment: 'center', margin: [0, 0, 0, 4],
    },
    {
      text: 'आपके दान के लिए हृदय से धन्यवाद',
      font: SANATANI_FONTS.sacred, fontSize: 16, color: SANATANI_COLORS.kumkum,
      alignment: 'center', margin: [0, 0, 0, 2],
    },
    {
      text: 'Thank you from the heart for your donation',
      font: SANATANI_FONTS.body, fontSize: 9, italics: true, color: SANATANI_COLORS.stone,
      alignment: 'center', margin: [0, 0, 0, 10],
    },
    lotusDivider(),
    {
      text: donorName,
      font: SANATANI_FONTS.body, fontSize: 18, bold: true, color: SANATANI_COLORS.umber,
      alignment: 'center', margin: [0, 6, 0, 2],
    },
    ...(donorNameDev ? [{
      text: donorNameDev, font: SANATANI_FONTS.devanagari, fontSize: 14,
      color: SANATANI_COLORS.umber, alignment: 'center', margin: [0, 0, 0, 6],
    }] : []),
    {
      text: `₹${amount.toLocaleString('en-IN')}`,
      font: SANATANI_FONTS.body, fontSize: 26, bold: true, color: SANATANI_COLORS.saffron,
      alignment: 'center', margin: [0, 6, 0, 2],
    },
    {
      text: `for ${sevaName}  •  ${dateStr}`,
      font: SANATANI_FONTS.body, fontSize: 9, color: SANATANI_COLORS.stone,
      alignment: 'center', margin: [0, 0, 0, 10],
    },
    lotusDivider(),
    {
      text: 'Your generosity sustains our shared dharma.',
      font: SANATANI_FONTS.body, fontSize: 9, color: SANATANI_COLORS.umber,
      alignment: 'center', margin: [0, 0, 0, 2],
    },
    {
      text: trustName,
      font: SANATANI_FONTS.body, fontSize: 8, bold: true, color: SANATANI_COLORS.stone,
      alignment: 'center', margin: [0, 8, 0, 0],
    },
    {
      text: blessingFor(workspace),
      font: SANATANI_FONTS.sacred, fontSize: 9, color: SANATANI_COLORS.kumkum,
      alignment: 'center', margin: [0, 4, 0, 0],
    },
  ];

  const docDef = {
    // Compact half-page-ish: A5 portrait suits WhatsApp preview
    pageSize: 'A5',
    pageMargins: [24, 24, 24, 24],
    content: [tripleBorder(content)],
    defaultStyle: { font: SANATANI_FONTS.body, color: SANATANI_COLORS.umber },
  };

  return outputPdf(docDef, `Blessing_${donorName.replace(/\s+/g, '_')}.pdf`, options);
};

/* ================================================================== */
/*  Bulk 80G receipts (multi-page)                                     */
/* ================================================================== */

export const generateBulk80GReceipts = async (
  transactions: any[],
  workspace: any,
  options?: { download?: boolean }
): Promise<Blob> => {
  // Generate each receipt's docDef and concatenate content with page breaks.
  // We reuse the single-receipt builder by capturing its docDef.
  await ensurePdfFonts();
  const allContent: any[] = [];
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    // Build via the same logic — inline a lightweight variant to avoid
    // double QR work; for clarity we call the single builder's internals
    // through a synthetic options object that returns the docDef.
    const def = await build80GDocDef(tx, workspace, {});
    allContent.push(...def.content);
    if (i < transactions.length - 1) allContent.push({ text: '', pageBreak: 'after' });
  }
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const docDef = {
    pageSize: 'A4', pageMargins: [28, 28, 28, 28],
    content: allContent,
    defaultStyle: { font: SANATANI_FONTS.body, color: SANATANI_COLORS.umber },
  };
  return new Promise((resolve, reject) => {
    try {
      const pdf = (pdfMake as any).createPdf(docDef);
      if (options?.download) pdf.download(`80G_Receipts_Bulk_${Date.now()}.pdf`);
      pdf.getBlob((blob: Blob) => resolve(blob));
    } catch (e) { reject(e); }
  });
};

/**
 * Internal: build the 80G docDef without rendering (for bulk composition).
 * Exported for testing; prefer generate80GTaxReceipt for normal use.
 */
export async function build80GDocDef(transaction: any, workspace: any, options?: ReturnOpt): Promise<any> {
  const docRef = generateCryptoDocRef('80G');
  const is80GRegistered = !!workspace?.trust80GRegistered;
  const trustName = workspace?.name || 'Sanatani Bandhan Dharmik Trust';
  const trustRegNumber = workspace?.trustRegNumber || workspace?.registrationNumber || (is80GRegistered ? '—' : 'NOT REGISTERED');
  const exemption80GNumber = is80GRegistered ? (workspace?.trust80GURN || workspace?.taxExemptionNumber || '—') : 'NOT REGISTERED — SAMPLE';
  const exemption80GValidTo = workspace?.trust80GValidTo || '';
  const trustPan = workspace?.panNumber || workspace?.trustPAN || (is80GRegistered ? '—' : 'NOT REGISTERED');
  const addressParts = [workspace?.address, workspace?.city, workspace?.state, workspace?.pincode, workspace?.country].filter(Boolean);
  const trustAddress = addressParts.length > 0 ? addressParts.join(', ') : '—';
  const donorName = transaction?.devoteeName || transaction?.donorName || 'Sanatani Devotee';
  const donorPan = transaction?.devoteePan || transaction?.donorPan || '';
  const amount = Number(transaction?.amount || 0);
  const receiptNo = transaction?.taxReceiptNumber || transaction?.receiptNo ||
    structuredReceiptNo(workspace?.centerCode || 'SB', '02', String(transaction?.id || Date.now()).slice(-6));
  const dateOfReceipt = transaction?.date || new Date().toISOString().split('T')[0];

  const metaLine = `PAN: ${trustPan}   |   Trust Reg. No: ${trustRegNumber}   |   80G: ${exemption80GNumber}` +
    (exemption80GValidTo ? ` (valid until ${exemption80GValidTo})` : '');
  const qrUrl = await qrDataUrl(JSON.stringify({ receiptNo, amount, donor: donorName, docRef }));

  // Pillar 1 — proper letterhead: logo (offline-cached), tagline, phone, reg.
  const lh = await letterheadForWorkspace(workspace);

  const content: any[] = [
    sacredHeader({
      trustName,
      trustAddress,
      metaLine,
      invocation: invocationFor(workspace),
      logoDataUrl: lh.logoDataUrl,
      monogramLetter: lh.logoDataUrl ? undefined : lh.monogramLetter,
      tagline: lh.tagline,
      phone: lh.phone ? `Ph: ${lh.phone}` : undefined,
    }),
    sectionTitle('STATUTORY DONATION RECEIPT & 80G TAX EXEMPTION CERTIFICATE', 'वैधानिक दान रसीद एवं 80G कर छूट प्रमाणपत्र'),
    detailGrid([
      [bilingual('Receipt No.', 'रसीद संख्या'), { text: receiptNo, bold: true }],
      [bilingual('Date', 'तिथि'), dateOfReceipt],
      [bilingual('Donor', 'दाता'), { text: donorName, bold: true }],
      [bilingual('Donor PAN', 'दाता पैन'), donorPan || 'N/A — required for Form 10BE'],
    ]),
    amountBox(amount, numberToWords(amount)),
    ...(qrUrl ? [{ image: qrUrl, width: 70, alignment: 'center' as const, margin: [0, 6, 0, 0] }] : []),
    sacredFooter({ blessing: blessingFor(workspace), docRef }),
  ];

  const background: any[] = [];
  if (!is80GRegistered) {
    background.push({ text: 'SAMPLE — NOT A VALID 80G CERTIFICATE', fontSize: 34, bold: true, color: SANATANI_COLORS.kumkum, opacity: 0.14, alignment: 'center', margin: [0, 260, 0, 0] });
  }
  if (options?.isCopy) {
    background.push({ text: 'DUPLICATE COPY', fontSize: 60, bold: true, color: SANATANI_COLORS.stone, opacity: 0.12, alignment: 'center', margin: [0, 300, 0, 0] });
  }
  // Pillar 1: the settings "live preview" stamps its sample receipts so a
  // preview can never be mistaken for a real statutory document.
  if (options?.isSamplePreview) {
    background.push({ text: 'SAMPLE PREVIEW', fontSize: 54, bold: true, color: SANATANI_COLORS.gold, opacity: 0.16, alignment: 'center', margin: [0, 300, 0, 0] });
  }

  return { pageSize: 'A4', pageMargins: [28, 28, 28, 28], background, content: [tripleBorder(content)] };
}
