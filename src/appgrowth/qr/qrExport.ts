/**
 * qrExport.ts — Export the branded QR in three formats.
 *
 *   exportQrPng  — 1024px PNG download (WhatsApp-forwardable)
 *   exportQrSvg  — SVG download (web embedding)
 *   exportQrPdf  — print-PDF download via the app's pdfmake engine
 *                  (src/utils/pdfSanatani.ts — no new PDF library)
 *
 * All three go through qrRender's scannability gate first.
 */

import {
  renderBrandedQrCanvas,
  renderBrandedQrSvg,
  loadQrLogo,
  loadQrLogoDataUrl,
  canvasToPngDataUrl,
  QR_CAPTION_TRILINGUAL,
  QR_BRAND,
} from './qrRender';
import { buildAppLink, qrFileStem, variantOf, type QrVariant } from './qrLinks';
import { pdfEngineHandles } from '../../utils/pdfSanatani';
import { SUPPORT_EMAIL, WHATSAPP_NUMBER_INTL } from '../../config/contact';

export interface QrExportOptions {
  /** Campaign id, or null/undefined for the generic QR. */
  campaignId?: string | null;
  campaignLabel?: string;
  variant?: QrVariant;
  /** PNG width in px (default 1024). */
  px?: number;
  /** Caption override. `undefined` = default trilingual; `''` = no caption line. */
  caption?: string;
}

function resolveOpts(opts: QrExportOptions): Required<Pick<QrExportOptions, 'variant' | 'px'>> & QrExportOptions {
  const variant = opts.variant ?? variantOf(opts.campaignId);
  return { ...opts, variant, px: opts.px ?? 1024 };
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Render the branded QR canvas at export resolution. */
export async function renderExportCanvas(opts: QrExportOptions): Promise<HTMLCanvasElement> {
  const o = resolveOpts(opts);
  const logoImage = await loadQrLogo();
  return renderBrandedQrCanvas({
    url: buildAppLink(o.campaignId),
    px: o.px,
    logoImage,
    caption: o.caption ?? QR_CAPTION_TRILINGUAL,
    campaignLabel: o.variant === 'campaign' ? o.campaignLabel : undefined,
  });
}

/**
 * PNG export — 1024px default, WhatsApp-forwardable.
 * Returns the data URL as well (for chaining into the poster PDF).
 */
export async function exportQrPng(opts: QrExportOptions): Promise<string> {
  const o = resolveOpts(opts);
  const canvas = await renderExportCanvas(o);
  const dataUrl = canvasToPngDataUrl(canvas);
  downloadDataUrl(dataUrl, `${qrFileStem(o.variant, o.campaignId)}-${o.px}px.png`);
  return dataUrl;
}

/** SVG export — vector, for web embedding. */
export async function exportQrSvg(opts: QrExportOptions): Promise<string> {
  const o = resolveOpts(opts);
  const logoDataUrl = await loadQrLogoDataUrl();
  const svg = renderBrandedQrSvg({
    url: buildAppLink(o.campaignId),
    px: o.px,
    logoDataUrl,
    caption: o.caption ?? QR_CAPTION_TRILINGUAL,
    campaignLabel: o.variant === 'campaign' ? o.campaignLabel : undefined,
  });
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`], { type: 'image/svg+xml' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    downloadDataUrl(blobUrl, `${qrFileStem(o.variant, o.campaignId)}.svg`);
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
  }
  return svg;
}

/**
 * Print-PDF export — one dignified A4 sheet: headline, large branded QR,
 * trilingual caption, campaign label, support footer. Uses the app's
 * pdfmake engine (pdfEngineHandles) so Indic scripts shape correctly.
 */
export async function exportQrPdf(opts: QrExportOptions): Promise<void> {
  const o = resolveOpts(opts);
  const canvas = await renderExportCanvas(o);
  const qrPng = canvasToPngDataUrl(canvas);
  const { createPdf } = await pdfEngineHandles();

  const campaignLabel = (o.campaignLabel || '').trim();
  const docDef = {
    pageSize: 'A4' as const,
    pageMargins: [48, 56, 48, 56] as [number, number, number, number],
    defaultStyle: { font: 'NotoSans', color: '#2A1608' },
    content: [
      { text: '॥ शुभम् ॥', alignment: 'center' as const, fontSize: 13, color: QR_BRAND.deepAmber, margin: [0, 0, 0, 6] },
      {
        text: 'Sanatani Bandhan',
        alignment: 'center' as const,
        fontSize: 30,
        bold: true,
        color: QR_BRAND.maroon,
        margin: [0, 0, 0, 4],
      },
      {
        text: 'Get the app — scan the QR code below',
        alignment: 'center' as const,
        fontSize: 13,
        color: QR_BRAND.muted,
        margin: [0, 0, 0, 2],
      },
      {
        text: 'অ্যাপটি ডাউনলোড করুন — নিচের QR কোডটি স্ক্যান করুন  •  ऐप डाउनलोड करें — नीचे दिया QR कोड स्कैन करें',
        alignment: 'center' as const,
        fontSize: 11,
        color: QR_BRAND.muted,
        margin: [0, 0, 0, 18],
      },
      { image: 'qr', width: 340, alignment: 'center' as const, margin: [0, 0, 0, 10] },
      ...(campaignLabel
        ? [{ text: campaignLabel, alignment: 'center' as const, fontSize: 14, bold: true, color: QR_BRAND.maroon, margin: [0, 0, 0, 8] as [number, number, number, number] }]
        : []),
      {
        text: [
          { text: 'Scan to download  •  ', fontSize: 12 },
          { text: 'স্ক্যান করুন', fontSize: 12 },
          { text: '  •  ', fontSize: 12 },
          { text: 'स्कैन करें', fontSize: 12 },
        ],
        alignment: 'center' as const,
        color: QR_BRAND.muted,
        margin: [0, 0, 0, 26] as [number, number, number, number],
      },
      {
        canvas: [
          { type: 'line' as const, x1: 60, y1: 0, x2: 475, y2: 0, lineWidth: 1.5, lineColor: QR_BRAND.amber },
        ],
        margin: [0, 0, 0, 14] as [number, number, number, number],
      },
      {
        text: [
          { text: 'Need help?  ', fontSize: 10, color: QR_BRAND.muted },
          ...(WHATSAPP_NUMBER_INTL
            ? [{ text: `WhatsApp +${WHATSAPP_NUMBER_INTL}  •  `, fontSize: 10, color: QR_BRAND.muted }]
            : []),
          { text: SUPPORT_EMAIL, fontSize: 10, color: QR_BRAND.muted },
        ],
        alignment: 'center' as const,
      },
    ],
    images: { qr: qrPng },
  };

  await new Promise<void>((resolve, reject) => {
    try {
      const pdf = createPdf(docDef);
      pdf.download(`${qrFileStem(o.variant, o.campaignId)}-print.pdf`);
      resolve();
    } catch (e) {
      reject(e instanceof Error ? e : new Error('PDF export failed'));
    }
  });
}
