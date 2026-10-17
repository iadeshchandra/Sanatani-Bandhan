/**
 * src/appgrowth/qr — Phase 3: Branded QR generation + poster generator.
 *
 * Public API for the Admin builder (and any other consumer):
 *
 *   import { BrandedQr, PosterGenerator } from '../appgrowth/qr';
 *   import { buildAppLink, APP_DOWNLOAD_BASE } from '../appgrowth/qr';
 *   import { exportQrPng, exportQrSvg, exportQrPdf } from '../appgrowth/qr';
 */

export { BrandedQr, type BrandedQrProps } from './BrandedQr';
export { PosterGenerator, buildPosterDocDef, renderPosterPreview, type PosterOptions } from './PosterGenerator';
export {
  exportQrPng,
  exportQrSvg,
  exportQrPdf,
  renderExportCanvas,
  type QrExportOptions,
} from './qrExport';
export {
  buildAppLink,
  variantOf,
  qrFileStem,
  fetchAppGrowthCampaigns,
  APP_DOWNLOAD_BASE,
  type QrVariant,
  type AppGrowthCampaign,
} from './qrLinks';
export {
  QR_BRAND,
  QR_CAPTION_TRILINGUAL,
  MAX_LOGO_FRACTION,
  QUIET_ZONE_MODULES,
  createQrMatrix,
  auditScannability,
  assertScannable,
  computeLayout,
  renderBrandedQrCanvas,
  renderBrandedQrSvg,
  loadQrLogo,
  loadQrLogoDataUrl,
  canvasToPngDataUrl,
  type QrMatrix,
  type ScannabilityReport,
  type BrandedQrLayout,
  type BrandedQrRenderOptions,
} from './qrRender';
