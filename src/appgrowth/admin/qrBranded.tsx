/**
 * qrBranded — COMPAT SHIM for the App Growth QR studio.
 * =====================================================
 * The QR builder (sibling program) owns `src/appgrowth/qr/`:
 *   - `BrandedQr` component
 *   - export functions (PNG / SVG / PDF)
 *   - `PosterGenerator`
 * Their work had NOT landed when the admin panel was built, so this module
 * implements the same surface locally on top of the already-installed
 * `qrcode` + `qrcode.react` + `jspdf` packages.
 *
 * SWAP PATH: once `src/appgrowth/qr/*` exists, rewire
 * `src/appgrowth/admin/QrStudio.tsx` to import from `../qr/...` and DELETE
 * this file. It is deliberately named `qrBranded.tsx` (not `BrandedQr.tsx`)
 * so it can never collide with the QR builder's files.
 */
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

const SAFFRON = '#f59e0b';
const INK = '#1c1917';

export interface BrandedQrProps {
  value: string;
  label?: string;
  size?: number;
}

/** On-screen branded QR: saffron frame + caption. */
export const BrandedQrPreview: React.FC<BrandedQrProps> = ({ value, label, size = 200 }) => (
  <div
    className="inline-block rounded-2xl bg-white p-4 shadow-lg"
    style={{ border: `4px solid ${SAFFRON}` }}
  >
    <div className="text-center">
      <p className="text-[11px] font-black tracking-widest uppercase" style={{ color: INK }}>
        Sanatani Bandhan
      </p>
    </div>
    <QRCodeSVG value={value} size={size} level="M" className="mx-auto my-2" />
    {label && (
      <p className="text-center text-xs font-bold" style={{ color: INK }}>
        {label}
      </p>
    )}
  </div>
);

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'app';

async function qrPngDataUrl(value: string, px: number): Promise<string> {
  return QRCode.toDataURL(value, {
    width: px,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

/** PNG export: QR on a branded white card (saffron border, title + caption). */
export async function downloadQrPng(value: string, label: string, opts?: { px?: number }): Promise<void> {
  const px = opts?.px ?? 512;
  const pad = 64;
  const titleH = 56;
  const labelH = 52;
  const size = px + pad * 2;
  const height = size + titleH + labelH + 24;

  const qrImg = new Image();
  qrImg.src = await qrPngDataUrl(value, px);
  await new Promise<void>((res, rej) => {
    qrImg.onload = () => res();
    qrImg.onerror = () => rej(new Error('QR render failed'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, height);
  ctx.strokeStyle = SAFFRON;
  ctx.lineWidth = 10;
  const r = 28;
  ctx.beginPath();
  ctx.roundRect(5, 5, size - 10, height - 10, r);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillText('SANATANI BANDHAN', size / 2, titleH);
  ctx.drawImage(qrImg, pad, titleH + 12, px, px);
  if (label) {
    ctx.font = '700 28px system-ui, sans-serif';
    ctx.fillText(label.slice(0, 42), size / 2, titleH + 24 + px);
  }
  ctx.font = '500 20px system-ui, sans-serif';
  ctx.fillStyle = '#78716c';
  ctx.fillText('Scan to get the app', size / 2, height - 28);

  await new Promise<void>((res) => canvas.toBlob((b) => {
    if (b) downloadBlob(b, `sanatani-bandhan-qr-${slug(label)}.png`);
    res();
  }, 'image/png'));
}

/** SVG export: branded card as a standalone SVG string. */
export async function downloadQrSvg(value: string, label: string): Promise<void> {
  const inner = await QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  const pathMatch = inner.match(/<path[^>]*\/>/);
  const pathEl = pathMatch ? pathMatch[0] : '';
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const W = 340;
  const H = label ? 470 : 440;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="24" fill="#ffffff" stroke="${SAFFRON}" stroke-width="8"/>` +
    `<text x="${W / 2}" y="52" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="22" letter-spacing="3" fill="${INK}">SANATANI BANDHAN</text>` +
    `<g transform="translate(30,70) scale(${(W - 60) / 100})">${pathEl.replace('<path', '<path fill="#000"')}</g>` +
    (label ? `<text x="${W / 2}" y="${H - 52}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="18" fill="${INK}">${esc(label.slice(0, 42))}</text>` : '') +
    `<text x="${W / 2}" y="${H - 24}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#78716c">Scan to get the app</text>` +
    `</svg>`;
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `sanatani-bandhan-qr-${slug(label)}.svg`);
}

export interface PosterOptions {
  value: string;
  title: string;      // e.g. "Get the Sanatani Bandhan app"
  campaignLabel: string;
  templeName?: string;
  filename?: string;
}

/** A4 print poster PDF (mm units): title, temple, big QR, caption, footer. */
export async function downloadPosterPdf(opts: PosterOptions): Promise<void> {
  const { value, title, campaignLabel, templeName } = opts;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(180, 83, 9);
  pdf.text('SANATANI BANDHAN', W / 2, 24, { align: 'center' });

  pdf.setFontSize(24);
  pdf.setTextColor(28, 25, 23);
  const wrapped = pdf.splitTextToSize(title, 170);
  pdf.text(wrapped, W / 2, 40, { align: 'center' });

  let y = 40 + wrapped.length * 10;
  if (templeName) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);
    pdf.setTextColor(120, 113, 108);
    pdf.text(templeName, W / 2, y + 6, { align: 'center' });
    y += 12;
  }

  const qrUrl = await qrPngDataUrl(value, 900);
  const qrSize = 110;
  const qrX = (W - qrSize) / 2;
  const qrY = y + 8;
  pdf.setDrawColor(245, 158, 11);
  pdf.setLineWidth(1.5);
  pdf.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 4, 4);
  pdf.addImage(qrUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  const capY = qrY + qrSize + 20;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(28, 25, 23);
  pdf.text(campaignLabel, W / 2, capY, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(87, 83, 78);
  pdf.text('Point your phone camera at the code — no app needed to scan.', W / 2, capY + 10, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setTextColor(168, 162, 158);
  pdf.text('Free for devotees · Works offline · sanatanibandhan.web.app', W / 2, 280, { align: 'center' });

  pdf.save(opts.filename ?? `sanatani-bandhan-poster-${slug(campaignLabel)}.pdf`);
}
