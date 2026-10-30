/**
 * BrandedQr.tsx — <BrandedQr> component.
 *
 * Renders the app-download smart link as a Sanatani-branded QR code:
 * amber/maroon frame, centered app-logo medallion, trilingual caption,
 * optional campaign label. Scannability is enforced inside qrRender.ts
 * (EC level H, 4-module quiet zone, logo ≤20%, finder clearance).
 *
 * API for the Admin builder:
 *   <BrandedQr url={buildAppLink(campaignId)} campaignLabel="Diwali 2026" size={240} />
 *   <BrandedQr url={APP_DOWNLOAD_BASE} variant="generic" size={240} />
 *
 * Props:
 *   url            — the smart link to encode (use buildAppLink from qrLinks)
 *   size           — rendered width in px (default 240); height derives
 *   variant        — 'generic' | 'campaign' (default 'generic')
 *   campaignLabel  — printed under the QR for campaign QRs
 *   showCaption    — trilingual caption line (default true)
 *   className      — extra classes on the wrapper
 *   onReady        — called with the PNG data URL once rendered (for previews/exports)
 */

import React, { useEffect, useRef, useState } from 'react';
import { renderBrandedQrCanvas, loadQrLogo, QR_CAPTION_TRILINGUAL, canvasToPngDataUrl } from './qrRender';
import type { QrVariant } from './qrLinks';
import { useLanguage } from '../../context/LanguageContext';
import { friendlyError } from '../../lib/friendlyError';

export interface BrandedQrProps {
  url: string;
  size?: number;
  variant?: QrVariant;
  campaignLabel?: string;
  showCaption?: boolean;
  className?: string;
  onReady?: (pngDataUrl: string) => void;
}

export const BrandedQr: React.FC<BrandedQrProps> = ({
  url,
  size = 240,
  variant = 'generic',
  campaignLabel,
  showCaption = true,
  className = '',
  onReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const { t } = useLanguage();
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setRendered(false);
    (async () => {
      try {
        const logoImage = await loadQrLogo();
        if (cancelled) return;
        const canvas = renderBrandedQrCanvas({
          url,
          px: Math.max(96, Math.round(size * 2)), // 2x for crisp display
          logoImage,
          caption: showCaption ? QR_CAPTION_TRILINGUAL : '',
          campaignLabel: variant === 'campaign' ? campaignLabel : undefined,
        });
        if (cancelled) return;
        const host = canvasRef.current;
        if (host) {
          host.width = canvas.width;
          host.height = canvas.height;
          const ctx = host.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, host.width, host.height);
            ctx.drawImage(canvas, 0, 0);
          }
        }
        setRendered(true);
        onReadyRef.current?.(canvasToPngDataUrl(canvas));
      } catch (e) {
        if (!cancelled) { console.error(e); setError(friendlyError(e, t, 'generic')); }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, size, variant, campaignLabel, showCaption]);

  const label = variant === 'campaign' && campaignLabel ? `${campaignLabel} — ` : '';

  return (
    <div className={`inline-block ${className}`} role="img" aria-label={`${label}${QR_CAPTION_TRILINGUAL}`}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: 'auto', display: 'block', borderRadius: 12 }}
        aria-hidden="true"
      />
      {!rendered && !error && (
        <div
          className="flex items-center justify-center rounded-xl bg-amber-50"
          style={{ width: size, height: size }}
          aria-label="Loading QR code"
        >
          <span className="text-xs text-amber-800">তৈরি হচ্ছে…</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700" style={{ width: size }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default BrandedQr;
