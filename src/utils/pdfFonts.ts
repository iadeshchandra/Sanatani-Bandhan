/**
 * Sanatani Bandhan — PDF Font Infrastructure (Phase A)
 *
 * Embeds Indic fonts in jsPDF so Devanagari/Bengali/Tamil text stops
 * rendering as blank/garbage. This is the "stop the bleeding" fix.
 *
 * IMPORTANT LIMITATION: jsPDF cannot do proper Indic *shaping* (vowel-sign
 * reordering, conjunct formation) even with correct fonts — it paints
 * glyphs by cmap lookup with no OpenType GSUB/GPOS engine. This module
 * fixes *missing glyphs*; the full fix is the pdfmake migration
 * (src/utils/pdfSanatani.ts, Phase B).
 *
 * HOW TO USE:
 *  1. Owner drops the TTF files into `public/fonts/` via GitHub web UI
 *     (binary upload — the connector cannot do binary). Required files:
 *       - NotoSansDevanagari-Regular.ttf
 *       - NotoSansDevanagari-Bold.ttf
 *       - NotoSansBengali-Regular.ttf        (optional, Phase B+)
 *       - NotoSansTamil-Regular.ttf          (optional, Phase B+)
 *     All SIL Open Font License — free for commercial use.
 *     Download: https://fonts.google.com/noto
 *
 *  2. In pdfGenerator.ts, at the top of each generator (or once globally):
 *       import { ensureIndicFonts } from './pdfFonts';
 *       await ensureIndicFonts(doc);
 *
 *  3. Replace `doc.setFont('helvetica', ...)` with
 *     `doc.setFont('NotoSansDevanagari', ...)` for any text that may
 *     contain Devanagari (donor names, titles, addresses).
 *
 * Until the TTFs are present, ensureIndicFonts() is a safe no-op and
 * everything renders exactly as before (Helvetica, Latin-only).
 */

import jsPDF from 'jspdf';

const FONT_MANIFEST: Array<{
  family: string;
  style: 'normal' | 'bold';
  url: string;
  vfsName: string;
}> = [
  {
    family: 'NotoSansDevanagari',
    style: 'normal',
    url: '/fonts/NotoSansDevanagari-Regular.ttf',
    vfsName: 'NotoSansDevanagari-Regular.ttf',
  },
  {
    family: 'NotoSansDevanagari',
    style: 'bold',
    url: '/fonts/NotoSansDevanagari-Bold.ttf',
    vfsName: 'NotoSansDevanagari-Bold.ttf',
  },
  {
    family: 'NotoSansBengali',
    style: 'normal',
    url: '/fonts/NotoSansBengali-Regular.ttf',
    vfsName: 'NotoSansBengali-Regular.ttf',
  },
  {
    family: 'NotoSansTamil',
    style: 'normal',
    url: '/fonts/NotoSansTamil-Regular.ttf',
    vfsName: 'NotoSansTamil-Regular.ttf',
  },
];

const loadedFamilies = new Set<string>();

/**
 * Embed Indic TTFs into a jsPDF document instance.
 * Safe no-op when font files are absent (offline-first: never throws).
 * Call once per document before adding Indic text.
 */
export async function ensureIndicFonts(doc: jsPDF): Promise<void> {
  for (const { family, style, url, vfsName } of FONT_MANIFEST) {
    const key = `${family}-${style}`;
    if (loadedFamilies.has(key)) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue; // font not uploaded yet — skip silently
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as any);
      }
      (doc as any).addFileToVFS(vfsName, btoa(binary));
      doc.addFont(vfsName, family, style);
      loadedFamilies.add(key);
    } catch {
      /* offline or missing — leave Helvetica in place */
    }
  }
}

/**
 * Pick the right jsPDF font for a string: Devanagari-aware when the text
 * contains Indic codepoints, Helvetica otherwise.
 *
 * Usage: doc.setFont(...fontForText(donorName));
 */
export function fontForText(text: string): [string, 'normal' | 'bold'] {
  // Devanagari: U+0900–U+097F, Bengali: U+0980–U+09FF, Tamil: U+0B80–U+0BFF
  if (/[\u0900-\u097F]/.test(text)) return ['NotoSansDevanagari', 'normal'];
  if (/[\u0980-\u09FF]/.test(text)) return ['NotoSansBengali', 'normal'];
  if (/[\u0B80-\u0BFF]/.test(text)) return ['NotoSansTamil', 'normal'];
  return ['helvetica', 'normal'];
}

/* ================================================================== */
/*  Phase A legal-compliance patch guide for pdfGenerator.ts           */
/* ================================================================== *
 *
 * Two gaps from the research audit — add these to generate80GTaxReceipt:
 *
 * 1. 80G VALIDITY DATES (currently only the registration number is shown):
 *
 *    const exemption80GValidFrom = workspace?.trust80GValidFrom || '';
 *    const exemption80GValidTo = workspace?.trust80GValidTo || '';
 *    // ... append to the trustMetadataLine:
 *    const validitySuffix = exemption80GValidTo
 *      ? ` (Valid: ${exemption80GValidFrom || '…'} to ${exemption80GValidTo})`
 *      : '';
 *
 *    Also add workspace fields in Settings → Legal:
 *      trust80GValidFrom: string (date), trust80GValidTo: string (date)
 *
 * 2. ₹2,000 CASH LIMIT WARNING (Income Tax Act: cash donations above
 *    ₹2,000/person/PAN/year are NOT 80G-eligible):
 *
 *    const isCash = /cash/i.test(paymentMode);
 *    if (isCash && amount > 2000) {
 *      doc.setTextColor(201, 42, 42); // kumkum red
 *      doc.setFont('helvetica', 'bold');
 *      doc.setFontSize(8);
 *      doc.text(
 *        'Note: Cash donations above Rs. 2,000 are not eligible for 80G exemption. Prefer digital payment.',
 *        105, <y-below-amount-box>, { align: 'center' }
 *      );
 *    }
 *
 * Both are implemented in the pdfmake version (pdfSanatani.ts) already.
 * ================================================================== */
