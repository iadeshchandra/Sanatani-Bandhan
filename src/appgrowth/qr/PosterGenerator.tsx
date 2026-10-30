/**
 * PosterGenerator.tsx — A4 print-ready poster for temple notice boards.
 *
 * Design brief: something a trustee is PROUD to pin up. Warm maroon header
 * with a diya motif, trilingual headline, large branded QR centered, the
 * temple's name, a 3-step mini guide (Scan → Install → Begin), and a
 * support footer. Dignified, warm, Sanatani — never corporate-cold.
 *
 * Outputs: print-PDF (A4, via the app's pdfmake engine) + PNG preview.
 * Campaign data is read-only from `appGrowthCampaigns` (Admin owns CRUD).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileImage, Loader2, Printer, QrCode } from 'lucide-react';
import { QR_BRAND, QR_CAPTION_TRILINGUAL, canvasToPngDataUrl } from './qrRender';
import { buildAppLink, fetchAppGrowthCampaigns, qrFileStem, type AppGrowthCampaign } from './qrLinks';
import { renderExportCanvas } from './qrExport';
import { pdfEngineHandles } from '../../utils/pdfSanatani';
import { SUPPORT_EMAIL, WHATSAPP_NUMBER_INTL } from '../../config/contact';
import { useLanguage } from '../../context/LanguageContext';
import { friendlyError } from '../../lib/friendlyError';

/* ------------------------------------------------------------------ */
/* Poster content (trilingual)                                          */
/* ------------------------------------------------------------------ */

const HEADLINE = {
  en: 'Get the Sanatani Bandhan app',
  bn: 'সনাতনী বন্ধন অ্যাপ ডাউনলোড করুন',
  hi: 'सनातनी बंधन ऐप डाउनलोड करें',
};

const STEPS: Array<{ en: string; bn: string; hi: string; desc: string }> = [
  { en: 'Scan', bn: 'স্ক্যান করুন', hi: 'स्कैन करें', desc: 'Point your phone camera at the QR code' },
  { en: 'Install', bn: 'ইনস্টল করুন', hi: 'इंस्टॉल करें', desc: 'Download the app from your app store' },
  { en: 'Begin', bn: 'শুরু করুন', hi: 'शुरू करें', desc: 'Get your Sanatani ID and explore' },
];

export interface PosterOptions {
  templeName?: string;
  campaignId?: string | null;
  campaignLabel?: string;
}

/* ------------------------------------------------------------------ */
/* pdfmake document (A4 print)                                          */
/* ------------------------------------------------------------------ */

/** Small diya motif drawn with pdfmake vector primitives (amber on maroon).
 *  The header table is full-bleed (595pt wide), so cx=297 centers the diya. */
function diyaMotif(cx: number, cy: number, s: number): Array<Record<string, unknown>> {
  return [
    // glow
    { type: 'ellipse', x: cx, y: cy - 16 * s, r1: 10 * s, r2: 12 * s, color: QR_BRAND.amber, fillOpacity: 0.25 },
    // flame
    { type: 'ellipse', x: cx, y: cy - 15 * s, r1: 4.5 * s, r2: 7 * s, color: '#FFD98A' },
    // wick
    { type: 'line', x1: cx, y1: cy - 8 * s, x2: cx, y2: cy - 2 * s, lineWidth: 2 * s, lineColor: '#3A2410' },
    // bowl
    { type: 'ellipse', x: cx, y: cy + 4 * s, r1: 16 * s, r2: 6 * s, color: QR_BRAND.amber },
    // bowl rim highlight
    { type: 'ellipse', x: cx, y: cy + 2.5 * s, r1: 12 * s, r2: 3.5 * s, color: QR_BRAND.deepAmber },
  ];
}

/** Build the A4 pdfmake doc definition. `qrPng` = branded-QR PNG data URL. */
export function buildPosterDocDef(qrPng: string, opts: PosterOptions): Record<string, unknown> {
  const templeName = (opts.templeName || '').trim();
  const campaignLabel = (opts.campaignLabel || '').trim();
  const link = buildAppLink(opts.campaignId);

  const badge = (n: number) => ({
    table: {
      widths: [30],
      body: [[{ text: String(n), alignment: 'center', fontSize: 14, bold: true, color: '#FFFFFF' }]],
    },
    layout: {
      fillColor: () => QR_BRAND.maroon,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 5, paddingBottom: () => 5,
    } as Record<string, unknown>,
    margin: [0, 0, 0, 8] as [number, number, number, number],
  });

  return {
    pageSize: 'A4',
    pageMargins: [48, 0, 48, 0],
    defaultStyle: { font: 'NotoSans', color: '#2A1608' },
    content: [
      // ——— Full-bleed maroon header ———
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  { canvas: diyaMotif(297, 34, 1.15), margin: [0, 6, 0, 0] as [number, number, number, number] },
                  { text: '॥ शुभम् ॥', alignment: 'center', fontSize: 12, color: QR_BRAND.amber, margin: [0, 46, 0, 4] as [number, number, number, number] },
                  { text: 'Sanatani Bandhan', alignment: 'center', fontSize: 34, bold: true, color: '#FFFBF2', margin: [0, 0, 0, 2] as [number, number, number, number] },
                  {
                    text: 'সনাতনী বন্ধন  •  सनातनी बंधन',
                    alignment: 'center',
                    fontSize: 12,
                    color: '#F5D9A8',
                    margin: [0, 0, 0, 10] as [number, number, number, number],
                  },
                ],
              },
            ],
          ],
        },
        layout: {
          fillColor: () => QR_BRAND.maroon,
          paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 14, paddingBottom: () => 14,
        } as Record<string, unknown>,
        margin: [-48, 0, -48, 0] as [number, number, number, number],
      },
      // ——— Amber rule ———
      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 5, color: QR_BRAND.amber }],
        margin: [-48, 0, -48, 26] as [number, number, number, number],
      },
      // ——— Trilingual headline ———
      { text: HEADLINE.en, alignment: 'center', fontSize: 25, bold: true, color: QR_BRAND.maroon, margin: [0, 0, 0, 6] as [number, number, number, number] },
      { text: HEADLINE.bn, alignment: 'center', fontSize: 17, color: '#6B4A2F', margin: [0, 0, 0, 2] as [number, number, number, number] },
      { text: HEADLINE.hi, alignment: 'center', fontSize: 17, color: '#6B4A2F', margin: [0, 0, 0, 10] as [number, number, number, number] },
      ...(templeName
        ? [{ text: templeName, alignment: 'center', fontSize: 15, bold: true, color: QR_BRAND.deepAmber, margin: [0, 0, 0, 4] as [number, number, number, number] }]
        : []),
      ...(campaignLabel
        ? [{ text: campaignLabel, alignment: 'center', fontSize: 12, color: '#6B4A2F', margin: [0, 0, 0, 4] as [number, number, number, number] }]
        : []),
      // ——— The QR ———
      { image: 'posterQr', width: 290, alignment: 'center', margin: [0, 8, 0, 8] as [number, number, number, number] },
      { text: QR_CAPTION_TRILINGUAL, alignment: 'center', fontSize: 11.5, color: '#6B4A2F', margin: [0, 0, 0, 2] as [number, number, number, number] },
      { text: link.replace('https://', ''), alignment: 'center', fontSize: 9.5, color: '#9A7B5A', margin: [0, 0, 0, 18] as [number, number, number, number] },
      // ——— 3-step guide ———
      {
        columns: STEPS.map((s, i) => ({
          width: '*',
          alignment: 'center',
          stack: [
            badge(i + 1),
            { text: `${s.en} • ${s.bn} • ${s.hi}`, fontSize: 11.5, bold: true, color: QR_BRAND.maroon, margin: [0, 0, 0, 4] as [number, number, number, number] },
            { text: s.desc, fontSize: 9.5, color: '#6B4A2F' },
          ],
        })),
        columnGap: 18,
        margin: [0, 0, 0, 26] as [number, number, number, number],
      },
      // ——— Full-bleed footer ———
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: [
                  { text: 'Need help?  ', fontSize: 10, color: '#F5D9A8' },
                  ...(WHATSAPP_NUMBER_INTL ? [{ text: `WhatsApp +${WHATSAPP_NUMBER_INTL}   `, fontSize: 10, color: '#FFFBF2' }] : []),
                  { text: SUPPORT_EMAIL, fontSize: 10, color: '#FFFBF2' },
                ],
                alignment: 'center',
              },
            ],
          ],
        },
        layout: {
          fillColor: () => QR_BRAND.maroon,
          paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 10, paddingBottom: () => 12,
        } as Record<string, unknown>,
        margin: [-48, 0, -48, 0] as [number, number, number, number],
      },
    ],
    images: { posterQr: qrPng },
  };
}

/* ------------------------------------------------------------------ */
/* PNG preview (1240 × 1754 ≈ A4 @150dpi)                               */
/* ------------------------------------------------------------------ */

const PREVIEW_W = 1240;
const PREVIEW_H = 1754;

function fitPreviewFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startPx: number, weight: string): number {
  let px = startPx;
  const stack = `system-ui, "Noto Sans", "Noto Sans Bengali", "Noto Sans Devanagari", sans-serif`;
  ctx.font = `${weight} ${px}px ${stack}`;
  while (px > 12 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${stack}`;
  }
  return px;
}

/** Draw a simple diya on a 2D canvas (amber on maroon). */
function drawDiya(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.save();
  // glow
  const glow = ctx.createRadialGradient(cx, cy - 34 * s, 4, cx, cy - 34 * s, 46 * s);
  glow.addColorStop(0, 'rgba(232,147,12,0.55)');
  glow.addColorStop(1, 'rgba(232,147,12,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy - 34 * s, 46 * s, 0, Math.PI * 2);
  ctx.fill();
  // flame
  ctx.fillStyle = '#FFD98A';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 32 * s, 11 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // wick
  ctx.strokeStyle = '#3A2410';
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 14 * s);
  ctx.lineTo(cx, cy - 4 * s);
  ctx.stroke();
  // bowl
  ctx.fillStyle = QR_BRAND.amber;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10 * s, 38 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = QR_BRAND.deepAmber;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 7 * s, 28 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Render the poster preview at 1240×1754. Returns the canvas. */
export async function renderPosterPreview(opts: PosterOptions): Promise<HTMLCanvasElement> {
  // Poster prints its own caption + URL below the QR, so the QR itself
  // renders bare (no internal caption line).
  const qrCanvas = await renderExportCanvas({
    campaignId: opts.campaignId,
    campaignLabel: opts.campaignLabel,
    variant: opts.campaignId ? 'campaign' : 'generic',
    px: 880,
    caption: '',
  });

  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_W;
  canvas.height = PREVIEW_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Ground
  ctx.fillStyle = QR_BRAND.cream;
  ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
  ctx.textAlign = 'center';

  // Header band
  const headerH = 340;
  ctx.fillStyle = QR_BRAND.maroon;
  ctx.fillRect(0, 0, PREVIEW_W, headerH);
  drawDiya(ctx, PREVIEW_W / 2, 108, 1.5);
  ctx.fillStyle = QR_BRAND.amber;
  fitPreviewFont(ctx, '॥ शुभम् ॥', PREVIEW_W - 160, 34, '600');
  ctx.fillText('॥ शुभम् ॥', PREVIEW_W / 2, 218);
  ctx.fillStyle = '#FFFBF2';
  fitPreviewFont(ctx, 'Sanatani Bandhan', PREVIEW_W - 120, 84, '800');
  ctx.fillText('Sanatani Bandhan', PREVIEW_W / 2, 300);
  // Amber rule
  ctx.fillStyle = QR_BRAND.amber;
  ctx.fillRect(0, headerH, PREVIEW_W, 10);

  let y = headerH + 80;
  // Headline
  ctx.fillStyle = QR_BRAND.maroon;
  fitPreviewFont(ctx, HEADLINE.en, PREVIEW_W - 140, 62, '800');
  ctx.fillText(HEADLINE.en, PREVIEW_W / 2, y);
  y += 60;
  ctx.fillStyle = QR_BRAND.muted;
  fitPreviewFont(ctx, HEADLINE.bn, PREVIEW_W - 140, 42, '600');
  ctx.fillText(HEADLINE.bn, PREVIEW_W / 2, y);
  y += 52;
  fitPreviewFont(ctx, HEADLINE.hi, PREVIEW_W - 140, 42, '600');
  ctx.fillText(HEADLINE.hi, PREVIEW_W / 2, y);
  y += 56;

  const templeName = (opts.templeName || '').trim();
  if (templeName) {
    ctx.fillStyle = QR_BRAND.deepAmber;
    fitPreviewFont(ctx, templeName, PREVIEW_W - 140, 40, '700');
    ctx.fillText(templeName, PREVIEW_W / 2, y);
    y += 50;
  }
  const campaignLabel = (opts.campaignLabel || '').trim();
  if (campaignLabel) {
    ctx.fillStyle = QR_BRAND.muted;
    fitPreviewFont(ctx, campaignLabel, PREVIEW_W - 140, 30, '600');
    ctx.fillText(campaignLabel, PREVIEW_W / 2, y);
    y += 44;
  }

  // QR
  const qrSide = 520;
  ctx.drawImage(qrCanvas, (PREVIEW_W - qrSide) / 2, y, qrSide, qrSide * (qrCanvas.height / qrCanvas.width));
  y += qrSide * (qrCanvas.height / qrCanvas.width) + 32;

  ctx.fillStyle = QR_BRAND.muted;
  fitPreviewFont(ctx, QR_CAPTION_TRILINGUAL, PREVIEW_W - 140, 28, '600');
  ctx.fillText(QR_CAPTION_TRILINGUAL, PREVIEW_W / 2, y);
  y += 40;
  ctx.fillStyle = '#9A7B5A';
  fitPreviewFont(ctx, buildAppLink(opts.campaignId).replace('https://', ''), PREVIEW_W - 140, 24, '400');
  ctx.fillText(buildAppLink(opts.campaignId).replace('https://', ''), PREVIEW_W / 2, y);
  y += 60;

  // 3 steps
  const colW = PREVIEW_W / 3;
  STEPS.forEach((s, i) => {
    const cx = colW * (i + 0.5);
    // badge
    ctx.fillStyle = QR_BRAND.maroon;
    ctx.beginPath();
    ctx.arc(cx, y + 22, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText(String(i + 1), cx, y + 33);
    // titles
    ctx.fillStyle = QR_BRAND.maroon;
    fitPreviewFont(ctx, s.en, colW - 60, 30, '700');
    ctx.fillText(s.en, cx, y + 84);
    ctx.fillStyle = QR_BRAND.muted;
    fitPreviewFont(ctx, `${s.bn} • ${s.hi}`, colW - 40, 24, '600');
    ctx.fillText(`${s.bn} • ${s.hi}`, cx, y + 118);
    fitPreviewFont(ctx, s.desc, colW - 40, 20, '400');
    ctx.fillText(s.desc, cx, y + 148);
  });
  y += 190;

  // Footer band
  const footerH = 110;
  ctx.fillStyle = QR_BRAND.maroon;
  ctx.fillRect(0, PREVIEW_H - footerH, PREVIEW_W, footerH);
  ctx.fillStyle = '#FFFBF2';
  const contact = `Need help?   ${WHATSAPP_NUMBER_INTL ? `WhatsApp +${WHATSAPP_NUMBER_INTL}   •   ` : ''}${SUPPORT_EMAIL}`;
  fitPreviewFont(ctx, contact, PREVIEW_W - 120, 26, '600');
  ctx.fillText(contact, PREVIEW_W / 2, PREVIEW_H - footerH / 2 + 9);

  return canvas;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const PosterGenerator: React.FC = () => {
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState<AppGrowthCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignId, setCampaignId] = useState<string>('');
  const [templeName, setTempleName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState<'pdf' | 'png' | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchAppGrowthCampaigns();
      if (!cancelled) {
        setCampaigns(list);
        setCampaignsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = campaigns.find((c) => c.id === campaignId) || null;

  const handleCampaignChange = (id: string) => {
    setCampaignId(id);
    const c = campaigns.find((x) => x.id === id);
    setTempleName(c?.templeName ?? '');
  };

  const posterOpts = useCallback(
    (): PosterOptions => ({
      templeName: templeName.trim(),
      campaignId: campaignId || null,
      campaignLabel: selected?.label,
    }),
    [templeName, campaignId, selected],
  );

  // Live preview (debounced).
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setPreviewLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const canvas = await renderPosterPreview(posterOpts());
        setPreviewUrl(canvasToPngDataUrl(canvas));
        setStatus(null);
      } catch (e) {
        console.error(e);
        setStatus({ kind: 'err', text: friendlyError(e, t, 'generic') });
      } finally {
        setPreviewLoading(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [posterOpts]);

  const handlePdf = async () => {
    setBusy('pdf');
    setStatus(null);
    try {
      const opts = posterOpts();
      const qrPng = canvasToPngDataUrl(
        await renderExportCanvas({
          campaignId: opts.campaignId,
          campaignLabel: opts.campaignLabel,
          variant: opts.campaignId ? 'campaign' : 'generic',
          px: 1024,
        }),
      );
      const { createPdf } = await pdfEngineHandles();
      const docDef = buildPosterDocDef(qrPng, opts);
      await new Promise<void>((resolve, reject) => {
        try {
          createPdf(docDef).download(`${qrFileStem(opts.campaignId ? 'campaign' : 'generic', opts.campaignId)}-poster-a4.pdf`);
          resolve();
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Poster PDF failed'));
        }
      });
      setStatus({ kind: 'ok', text: 'Print PDF downloaded — A4, ready for the notice board. 🪔' });
    } catch (e) {
      console.error(e);
      setStatus({ kind: 'err', text: friendlyError(e, t, 'generic') });
    } finally {
      setBusy(null);
    }
  };

  const handlePng = async () => {
    setBusy('png');
    setStatus(null);
    try {
      const opts = posterOpts();
      const canvas = await renderPosterPreview(opts);
      const a = document.createElement('a');
      a.href = canvasToPngDataUrl(canvas);
      a.download = `${qrFileStem(opts.campaignId ? 'campaign' : 'generic', opts.campaignId)}-poster-preview.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatus({ kind: 'ok', text: 'PNG preview downloaded — share it on WhatsApp for approval. 🙏' });
    } catch (e) {
      console.error(e);
      setStatus({ kind: 'err', text: friendlyError(e, t, 'generic') });
    } finally {
      setBusy(null);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]';
  const btnBase =
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 min-h-[44px] text-sm font-bold transition active:scale-[0.98] disabled:opacity-50';

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <QrCode size={20} className="text-amber-700" />
        <div>
          <h3 className="text-lg font-black text-stone-800">Temple Poster Generator</h3>
          <p className="text-xs text-stone-500">A4 print-ready poster with your branded app QR — pin it with pride 🪔</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-stone-600">Campaign (optional)</span>
          <select
            value={campaignId}
            onChange={(e) => handleCampaignChange(e.target.value)}
            className={inputCls}
            disabled={campaignsLoading}
          >
            <option value="">Generic — no campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-stone-600">Temple / organisation name</span>
          <input
            value={templeName}
            onChange={(e) => setTempleName(e.target.value)}
            placeholder="e.g. Sri Sri Radha Krishna Mandir"
            className={inputCls}
            maxLength={80}
          />
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/50">
        <div className="flex items-center justify-between border-b border-amber-100 px-4 py-2">
          <span className="text-xs font-bold text-amber-800">Live preview</span>
          {previewLoading && <Loader2 size={14} className="animate-spin text-amber-700" />}
        </div>
        {previewUrl ? (
          <img src={previewUrl} alt="A4 temple poster preview" className="mx-auto block w-full max-w-md" />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-amber-800">
            {previewLoading ? 'Composing your poster…' : 'Preview will appear here'}
          </div>
        )}
      </div>

      {status && (
        <div
          className={`mt-3 rounded-xl border p-3 text-sm ${
            status.kind === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {status.text}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          onClick={handlePdf}
          disabled={busy !== null}
          className={`${btnBase} bg-[#7A1E1E] text-amber-50 hover:bg-[#5f1616]`}
        >
          {busy === 'pdf' ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
          Download print PDF (A4)
        </button>
        <button
          onClick={handlePng}
          disabled={busy !== null}
          className={`${btnBase} border-2 border-amber-600 bg-white text-amber-800 hover:bg-amber-50`}
        >
          {busy === 'png' ? <Loader2 size={18} className="animate-spin" /> : <FileImage size={18} />}
          Download PNG preview
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-stone-500">
        <Download size={12} className="mr-1 inline" />
        Print the PDF at any press or cyber-café — A4, full colour. The QR inside is verified scannable.
      </p>
    </div>
  );
};

export default PosterGenerator;
