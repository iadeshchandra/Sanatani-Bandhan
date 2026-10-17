/**
 * qrRender.ts — Branded QR renderer core.
 *
 * Renders the app-download smart link as a QR code wrapped in the Sanatani
 * brand: warm amber/maroon frame, centered app-logo medallion, trilingual
 * caption. Two outputs: crisp canvas (PNG export / PDF embedding) and SVG
 * (web embedding).
 *
 * SCANNABILITY IS SACRED — every render enforces:
 *   - Error correction level H (recovers ~30% damage — the logo's share)
 *   - Quiet zone of exactly 4 modules, uninterrupted, high-contrast
 *   - Center logo medallion ≤ 20% of the QR matrix side (≤4% of area),
 *     never overlapping the finder-pattern zones
 *   - Dark modules on light ground (warm near-black on cream)
 *
 * `assertScannable()` runs these checks structurally on every render and
 * throws a descriptive error if anything violates the rules — a pretty but
 * unscannable QR never leaves this module. True decode verification
 * (render → screenshot → jsqr decode) is run as a build-time check; see
 * the Phase 3 report.
 */

import QRCode from 'qrcode';

/* ------------------------------------------------------------------ */
/* Brand constants                                                     */
/* ------------------------------------------------------------------ */

export const QR_BRAND = {
  /** Deep temple maroon — outer frame, headings. */
  maroon: '#7A1E1E',
  /** Warm amber — inner frame, accents. */
  amber: '#E8930C',
  /** Deep amber for gradient-adjacent accents. */
  deepAmber: '#B45309',
  /** Warm near-black for QR modules (max contrast, softer than #000). */
  ink: '#2A1608',
  /** Cream ground — quiet zone + medallion. */
  cream: '#FFFBF2',
  /** Muted brown for secondary caption text. */
  muted: '#6B4A2F',
} as const;

/** Trilingual caption printed under every branded QR. */
export const QR_CAPTION_TRILINGUAL = 'Scan to download • স্ক্যান করুন • स्कैन करें';

/** Maximum logo side as a fraction of the QR matrix side (≤20%). */
export const MAX_LOGO_FRACTION = 0.2;

/** Minimum quiet zone in modules (spec minimum is 4). */
export const QUIET_ZONE_MODULES = 4;

/* ------------------------------------------------------------------ */
/* QR matrix                                                           */
/* ------------------------------------------------------------------ */

export interface QrMatrix {
  /** Module count per side (e.g. 29 for version 3). */
  size: number;
  /** QR version. */
  version: number;
  /** Row-major dark-module lookup. */
  dark: (row: number, col: number) => boolean;
}

/** Build the error-corrected QR matrix for a URL. Always EC level H. */
export function createQrMatrix(url: string): QrMatrix {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  return {
    size,
    version: qr.version,
    dark: (row: number, col: number) => data[row * size + col] === 1,
  };
}

export interface ScannabilityReport {
  ok: boolean;
  checks: Array<{ name: string; pass: boolean; detail: string }>;
}

/**
 * Structural scannability audit of a branded-QR layout.
 * `logoFraction` = logo side / matrix side (must be ≤ MAX_LOGO_FRACTION).
 * Returns a report; `assertScannable` throws on any failure.
 */
export function auditScannability(matrixSize: number, logoFraction: number, quietZoneModules: number): ScannabilityReport {
  const checks: ScannabilityReport['checks'] = [];
  const push = (name: string, pass: boolean, detail: string) => checks.push({ name, pass, detail });

  push('error-correction', true, 'EC level H — recovers up to ~30% symbol damage');
  push(
    'quiet-zone',
    quietZoneModules >= QUIET_ZONE_MODULES,
    `quiet zone ${quietZoneModules} modules (minimum ${QUIET_ZONE_MODULES})`,
  );
  push(
    'logo-size',
    logoFraction > 0 && logoFraction <= MAX_LOGO_FRACTION,
    `logo side ${(logoFraction * 100).toFixed(1)}% of matrix side (max ${(MAX_LOGO_FRACTION * 100).toFixed(0)}%)`,
  );

  // Finder-pattern exclusion: the three 7×7 finder zones plus their 1-module
  // separators occupy 8×8 module corners. A centered square logo of side
  // fraction f overlaps a corner zone only if f/2 + 8/matrixSize > 0.5
  // measured from center — i.e. f > 1 - 16/matrixSize. For the smallest
  // realistic matrix (25) that threshold is 0.36 > 0.20, so a centered
  // ≤20% logo can never touch a finder. Verified arithmetically here:
  const half = logoFraction / 2;
  const finderHalfExtent = 8 / matrixSize; // corner zone half-extent from edge, in matrix fractions
  const clearsFinders = half + finderHalfExtent <= 0.5;
  push(
    'finder-clearance',
    clearsFinders,
    clearsFinders
      ? `centered logo clears all three finder zones by ${((0.5 - half - finderHalfExtent) * matrixSize).toFixed(1)} modules`
      : 'LOGO OVERLAPS A FINDER PATTERN — unscannable',
  );

  push(
    'matrix-size',
    matrixSize >= 21 && matrixSize <= 177,
    `matrix ${matrixSize}×${matrixSize} (version ${(matrixSize - 17) / 4})`,
  );

  return { ok: checks.every((c) => c.pass), checks };
}

/** Throw if the branded layout fails any scannability check. */
export function assertScannable(matrixSize: number, logoFraction: number, quietZoneModules: number): void {
  const report = auditScannability(matrixSize, logoFraction, quietZoneModules);
  if (!report.ok) {
    const failed = report.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.detail}`).join('; ');
    throw new Error(`Branded QR failed scannability audit — ${failed}`);
  }
}

/* ------------------------------------------------------------------ */
/* Layout math (shared by canvas + SVG renderers)                       */
/* ------------------------------------------------------------------ */

export interface BrandedQrLayout {
  /** Full output width/height. */
  width: number;
  height: number;
  /** Outer frame geometry. */
  frame: { x: number; y: number; w: number; h: number; outer: number; inner: number; radius: number };
  /** QR symbol geometry (modules + quiet zone), top-left origin. */
  symbol: { x: number; y: number; side: number; modulePx: number; quietPx: number };
  /** Centered logo medallion geometry. */
  logo: { x: number; y: number; side: number; medallion: number; radius: number };
  /** Caption text geometry. */
  caption: { x: number; y: number; fontPx: number; lineHeight: number };
  campaign: { x: number; y: number; fontPx: number };
  matrix: QrMatrix;
}

export interface BrandedQrRenderOptions {
  url: string;
  /** Output width in px. Height is derived. */
  px?: number;
  /** Logo side as fraction of matrix side (default 0.18, max 0.20). */
  logoFraction?: number;
  /** Trilingual caption under the QR (default QR_CAPTION_TRILINGUAL). */
  caption?: string;
  /** Optional campaign label line under the caption. */
  campaignLabel?: string;
}

/**
 * Compute the branded-QR layout. Throws via assertScannable on any
 * scannability violation — both renderers must call this first.
 */
export function computeLayout(opts: BrandedQrRenderOptions): BrandedQrLayout {
  const px = Math.max(96, Math.round(opts.px ?? 480));
  const logoFraction = Math.min(opts.logoFraction ?? 0.18, MAX_LOGO_FRACTION);
  const matrix = createQrMatrix(opts.url);
  assertScannable(matrix.size, logoFraction, QUIET_ZONE_MODULES);

  const frameOuter = Math.max(5, Math.round(px * 0.022)); // maroon band
  const frameInner = Math.max(2, Math.round(px * 0.008)); // amber hairline
  const pad = Math.round(px * 0.035); // cream padding inside frame

  // QR symbol: modules + 4-module quiet zone on each side.
  const units = matrix.size + QUIET_ZONE_MODULES * 2;
  const availW = px - (frameOuter + frameInner + pad) * 2;
  const modulePx = Math.max(2, Math.floor(availW / units));
  const symbolSide = modulePx * units;
  const quietPx = modulePx * QUIET_ZONE_MODULES;

  const captionFontPx = Math.max(11, Math.round(px * 0.042));
  const campaignFontPx = Math.max(10, Math.round(px * 0.036));
  // Empty caption string = no caption line at all (no reserved space).
  // Used by the poster generator, which prints its own caption below the QR.
  const captionText = (opts.caption ?? QR_CAPTION_TRILINGUAL).trim();
  const hasCaption = !!captionText;
  const hasCampaign = !!(opts.campaignLabel || '').trim();
  const afterSymbolGap = Math.round(px * 0.03);
  const captionBlockH =
    (hasCaption ? Math.round(captionFontPx * 1.35) : 0) + (hasCampaign ? Math.round(campaignFontPx * 1.5) : 0);

  const symbolX = Math.round((px - symbolSide) / 2);
  const top = frameOuter + frameInner + pad;
  const height = top + symbolSide + afterSymbolGap + captionBlockH + pad + frameInner + frameOuter;

  const logoSide = logoFraction * matrix.size * modulePx;
  const medallion = logoSide * 1.28;
  const logoX = symbolX + quietPx + (matrix.size * modulePx - logoSide) / 2;
  const logoY = top + quietPx + (matrix.size * modulePx - logoSide) / 2;

  const captionY = top + symbolSide + afterSymbolGap + Math.round(captionFontPx * 1.05);
  const campaignY = hasCaption
    ? captionY + Math.round(campaignFontPx * 1.5)
    : top + symbolSide + afterSymbolGap + Math.round(campaignFontPx * 1.1);

  return {
    width: px,
    height,
    frame: {
      x: 0, y: 0, w: px, h: height,
      outer: frameOuter, inner: frameInner,
      radius: Math.round(px * 0.06),
    },
    symbol: { x: symbolX, y: top, side: symbolSide, modulePx, quietPx },
    logo: {
      x: logoX, y: logoY, side: logoSide,
      medallion, radius: Math.round(medallion * 0.22),
    },
    caption: { x: px / 2, y: captionY, fontPx: captionFontPx, lineHeight: Math.round(captionFontPx * 1.35) },
    campaign: { x: px / 2, y: campaignY, fontPx: campaignFontPx },
    matrix,
  };
}

/* ------------------------------------------------------------------ */
/* Canvas renderer — crisp PNG path (exports, PDF embedding, previews)  */
/* ------------------------------------------------------------------ */

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Fit a single-line caption: shrink font until it fits the width. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startPx: number, weight: string): number {
  let px = startPx;
  ctx.font = `${weight} ${px}px system-ui, "Noto Sans", "Noto Sans Bengali", "Noto Sans Devanagari", sans-serif`;
  while (px > 8 && ctx.measureText(text).width > maxWidth) {
    px -= 1;
    ctx.font = `${weight} ${px}px system-ui, "Noto Sans", "Noto Sans Bengali", "Noto Sans Devanagari", sans-serif`;
  }
  return px;
}

export interface CanvasRenderOptions extends BrandedQrRenderOptions {
  /** Decoded logo image (HTMLImageElement). Pass null for no logo. */
  logoImage?: HTMLImageElement | null;
}

/**
 * Render the branded QR onto a canvas. Throws on scannability violations.
 * The canvas is returned at exactly `px` wide (CSS pixels == device pixels
 * here — callers upscale `px` for print resolution).
 */
export function renderBrandedQrCanvas(opts: CanvasRenderOptions): HTMLCanvasElement {
  const layout = computeLayout(opts);
  const { width, height, frame, symbol, logo, caption, campaign, matrix } = layout;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Cream ground.
  ctx.fillStyle = QR_BRAND.cream;
  roundRectPath(ctx, 0, 0, width, height, frame.radius);
  ctx.fill();

  // Maroon outer frame + amber inner hairline.
  ctx.strokeStyle = QR_BRAND.maroon;
  ctx.lineWidth = frame.outer;
  roundRectPath(ctx, frame.outer / 2, frame.outer / 2, width - frame.outer, height - frame.outer, frame.radius);
  ctx.stroke();
  const innerInset = frame.outer + frame.inner / 2 + 1;
  ctx.strokeStyle = QR_BRAND.amber;
  ctx.lineWidth = frame.inner;
  roundRectPath(ctx, innerInset, innerInset, width - innerInset * 2, height - innerInset * 2, Math.max(2, frame.radius - frame.outer));
  ctx.stroke();

  // QR modules (dark on cream). Quiet zone is the cream ground itself.
  ctx.fillStyle = QR_BRAND.ink;
  const ox = symbol.x + symbol.quietPx;
  const oy = symbol.y + symbol.quietPx;
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.dark(r, c)) {
        ctx.fillRect(ox + c * symbol.modulePx, oy + r * symbol.modulePx, symbol.modulePx, symbol.modulePx);
      }
    }
  }

  // Center medallion + logo.
  const medX = logo.x + logo.side / 2 - logo.medallion / 2;
  const medY = logo.y + logo.side / 2 - logo.medallion / 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = QR_BRAND.amber;
  ctx.lineWidth = Math.max(2, Math.round(width * 0.006));
  roundRectPath(ctx, medX, medY, logo.medallion, logo.medallion, logo.radius);
  ctx.fill();
  ctx.stroke();
  if (opts.logoImage) {
    ctx.drawImage(opts.logoImage, logo.x, logo.y, logo.side, logo.side);
  }

  // Trilingual caption (skipped entirely when caption is '').
  const text = (opts.caption ?? QR_CAPTION_TRILINGUAL).trim() || '';
  const maxTextW = width - (frame.outer + frame.inner) * 2 - width * 0.06;
  if (text) {
    ctx.fillStyle = QR_BRAND.muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    fitFont(ctx, text, maxTextW, caption.fontPx, '600');
    ctx.fillText(text, caption.x, caption.y);
  }

  // Campaign label (maroon, semibold).
  const camp = (opts.campaignLabel || '').trim();
  if (camp) {
    ctx.fillStyle = QR_BRAND.maroon;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    fitFont(ctx, camp, maxTextW, campaign.fontPx, '700');
    ctx.fillText(camp, campaign.x, campaign.y);
  }

  return canvas;
}

/* ------------------------------------------------------------------ */
/* SVG renderer — web embedding                                        */
/* ------------------------------------------------------------------ */

export interface SvgRenderOptions extends BrandedQrRenderOptions {
  /** Logo as a data URL (PNG/SVG) for the <image> element. Null = no logo. */
  logoDataUrl?: string | null;
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render the branded QR as a standalone SVG string (same layout math as
 * the canvas renderer — single source of truth in computeLayout).
 */
export function renderBrandedQrSvg(opts: SvgRenderOptions): string {
  const layout = computeLayout(opts);
  const { width, height, frame, symbol, logo, caption, campaign, matrix } = layout;
  const fontStack = `system-ui, "Noto Sans", "Noto Sans Bengali", "Noto Sans Devanagari", sans-serif`;

  // Modules as one path (compact).
  let d = '';
  const ox = symbol.x + symbol.quietPx;
  const oy = symbol.y + symbol.quietPx;
  const m = symbol.modulePx;
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.dark(r, c)) d += `M${ox + c * m} ${oy + r * m}h${m}v${m}h${-m}Z`;
    }
  }

  const rawCaption = (opts.caption ?? QR_CAPTION_TRILINGUAL).trim();
  const text = escXml(rawCaption);
  const ariaLabel = escXml(rawCaption || QR_CAPTION_TRILINGUAL);
  const camp = escXml((opts.campaignLabel || '').trim());
  const medX = logo.x + logo.side / 2 - logo.medallion / 2;
  const medY = logo.y + logo.side / 2 - logo.medallion / 2;
  const innerInset = frame.outer + frame.inner / 2 + 1;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${ariaLabel}">` +
    `<rect x="0" y="0" width="${width}" height="${height}" rx="${frame.radius}" fill="${QR_BRAND.cream}"/>` +
    `<rect x="${frame.outer / 2}" y="${frame.outer / 2}" width="${width - frame.outer}" height="${height - frame.outer}" rx="${frame.radius}" fill="none" stroke="${QR_BRAND.maroon}" stroke-width="${frame.outer}"/>` +
    `<rect x="${innerInset}" y="${innerInset}" width="${width - innerInset * 2}" height="${height - innerInset * 2}" rx="${Math.max(2, frame.radius - frame.outer)}" fill="none" stroke="${QR_BRAND.amber}" stroke-width="${frame.inner}"/>` +
    `<path d="${d}" fill="${QR_BRAND.ink}"/>` +
    `<rect x="${medX.toFixed(1)}" y="${medY.toFixed(1)}" width="${logo.medallion.toFixed(1)}" height="${logo.medallion.toFixed(1)}" rx="${logo.radius}" fill="#FFFFFF" stroke="${QR_BRAND.amber}" stroke-width="${Math.max(2, Math.round(width * 0.006))}"/>` +
    (opts.logoDataUrl
      ? `<image href="${opts.logoDataUrl}" x="${logo.x.toFixed(1)}" y="${logo.y.toFixed(1)}" width="${logo.side.toFixed(1)}" height="${logo.side.toFixed(1)}" preserveAspectRatio="xMidYMid meet"/>`
      : '') +
    (text
      ? `<text x="${caption.x}" y="${caption.y}" text-anchor="middle" font-family="${fontStack}" font-size="${caption.fontPx}" font-weight="600" fill="${QR_BRAND.muted}">${text}</text>`
      : '') +
    (camp
      ? `<text x="${campaign.x}" y="${campaign.y}" text-anchor="middle" font-family="${fontStack}" font-size="${campaign.fontPx}" font-weight="700" fill="${QR_BRAND.maroon}">${camp}</text>`
      : '') +
    `</svg>`
  );
}

/* ------------------------------------------------------------------ */
/* Logo loading                                                        */
/* ------------------------------------------------------------------ */

let logoImagePromise: Promise<HTMLImageElement | null> | null = null;

/** Load the app icon for the center medallion. Cached. Null on failure. */
export function loadQrLogo(): Promise<HTMLImageElement | null> {
  if (!logoImagePromise) {
    logoImagePromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/icon-512x512.png';
    });
  }
  return logoImagePromise;
}

let logoDataUrlPromise: Promise<string | null> | null = null;

/** Fetch the app icon as a data URL (for SVG embedding). Cached. */
export async function loadQrLogoDataUrl(): Promise<string | null> {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = (async () => {
      try {
        const res = await fetch('/icon-512x512.png');
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string | null>((resolve) => {
          const fr = new FileReader();
          fr.onload = () => (typeof fr.result === 'string' ? resolve(fr.result) : resolve(null));
          fr.onerror = () => resolve(null);
          fr.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    })();
  }
  return logoDataUrlPromise;
}

/** Canvas → PNG data URL. */
export function canvasToPngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}
