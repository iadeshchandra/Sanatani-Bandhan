/**
 * Sanatani Bandhan — Org Branding library (Pillar 1)
 *
 * Single source of truth for institution branding:
 *   - fetch + cache org logo URL and letterhead fields
 *   - offline-capable logo data-URL resolution (IndexedDB) for PDF receipts
 *   - client-side square crop + validated upload to
 *     Firebase Storage `orgLogos/{orgId}/logo.{ext}`
 *
 * Caching layers (offline-first):
 *   1. in-memory Map (per session)
 *   2. localStorage `sb_brandingmeta_{orgId}` (logo URL + letterhead meta)
 *   3. IndexedDB `sb_brandlogo_{orgId}` (logo as data URL — survives offline,
 *      used by the PDF engine; legacy key `sb_logo_{orgId}` is read as fallback)
 */
import { get, set } from 'idb-keyval';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export interface OrgBranding {
  orgId: string;
  name: string;
  tagline?: string;
  logoUrl?: string;
  logoUploadedAt?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
  email?: string;
  trustRegNumber?: string;
  trust80GRegistered?: boolean;
  trust80GURN?: string;
}

export interface LetterheadData {
  orgName: string;
  tagline?: string;
  addressLine?: string;
  phone?: string;
  trustRegNumber?: string;
  metaLine?: string;
  logoDataUrl?: string | null;
  monogramLetter: string;
}

/* ------------------------------------------------------------------ */
/* Branding extraction from a workspace doc                            */
/* ------------------------------------------------------------------ */

export function brandingFromWorkspace(ws: any, orgId?: string): OrgBranding {
  const id = orgId || ws?.id || '';
  return {
    orgId: id,
    name: ws?.name || 'Sanatani Institution',
    tagline: ws?.tagline || ws?.description || '',
    logoUrl: ws?.logoUrl || '',
    logoUploadedAt: ws?.logoUploadedAt || '',
    address: ws?.address || '',
    city: ws?.city || '',
    state: ws?.state || '',
    pincode: ws?.pincode || '',
    country: ws?.country || '',
    phone: ws?.phone || '',
    email: ws?.email || '',
    trustRegNumber: ws?.trustRegNumber || ws?.registrationNumber || '',
    trust80GRegistered: !!ws?.trust80GRegistered,
    trust80GURN: ws?.trust80GURN || ws?.taxExemptionNumber || '',
  };
}

export function letterheadAddressLine(b: OrgBranding): string {
  return [b.address, b.city, b.state, b.pincode, b.country].filter(Boolean).join(', ');
}

/**
 * First grapheme of the org name, for the monogram fallback.
 * Uses Intl.Segmenter when available so Devanagari/Bengali conjuncts
 * and emoji stay intact; falls back to code-point slicing.
 */
export function monogramLetter(name: string): string {
  const clean = (name || '').trim();
  if (!clean) return 'ॐ';
  try {
    const seg = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
    const first = seg.segment(clean)[Symbol.iterator]().next().value?.segment;
    if (first) return first.toUpperCase();
  } catch {
    /* fall through */
  }
  return Array.from(clean)[0]?.toUpperCase() || 'ॐ';
}

/* ------------------------------------------------------------------ */
/* Cached branding meta (URL + letterhead fields)                       */
/* ------------------------------------------------------------------ */

const metaCache = new Map<string, OrgBranding>();
const META_KEY = (orgId: string) => `sb_brandingmeta_${orgId}`;

export function cacheBrandingMeta(b: OrgBranding): void {
  if (!b.orgId) return;
  metaCache.set(b.orgId, b);
  try {
    localStorage.setItem(META_KEY(b.orgId), JSON.stringify(b));
  } catch {
    /* storage full / private mode — memory cache still works */
  }
}

export function getCachedBrandingMeta(orgId: string): OrgBranding | null {
  const mem = metaCache.get(orgId);
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(META_KEY(orgId));
    if (raw) {
      const parsed = JSON.parse(raw) as OrgBranding;
      metaCache.set(orgId, parsed);
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearBrandingCache(orgId: string): void {
  metaCache.delete(orgId);
  try {
    localStorage.removeItem(META_KEY(orgId));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Logo data-URL resolution (offline-capable, for PDF embedding)        */
/* ------------------------------------------------------------------ */

const dataUrlCache = new Map<string, string | null>();
/** The remote URL that produced the cached data URL (staleness guard). */
const dataUrlSource = new Map<string, string>();
const LOGO_KEY = (orgId: string) => `sb_brandlogo_${orgId}`;
const LEGACY_LOGO_KEY = (orgId: string) => `sb_logo_${orgId}`;

async function fetchAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Resolve the org logo as a data URL, usable inside pdfmake `image:` nodes.
 * Works offline after the first successful load (IndexedDB cache).
 * Returns null when the org has no logo — callers must render the monogram.
 */
export async function resolveOrgLogoDataUrl(orgId: string, logoUrl?: string): Promise<string | null> {
  if (!orgId) return null;
  // A data-URL argument is authoritative (e.g. fresh crop from an upload) —
  // never let a stale cache entry shadow it.
  if (logoUrl && logoUrl.startsWith('data:image/')) {
    dataUrlCache.set(orgId, logoUrl);
    dataUrlSource.set(orgId, logoUrl);
    try {
      await set(LOGO_KEY(orgId), logoUrl);
    } catch {
      /* ignore */
    }
    return logoUrl;
  }
  if (dataUrlCache.has(orgId)) {
    const cachedUrl = logoUrl || getCachedBrandingMeta(orgId)?.logoUrl || '';
    // Re-resolve if the remote URL changed since we cached (e.g. new upload
    // from another session); otherwise the cached data URL is authoritative.
    if (dataUrlSource.get(orgId) === cachedUrl) return dataUrlCache.get(orgId) ?? null;
  }
  try {
    const cached = (await get(LOGO_KEY(orgId))) || (await get(LEGACY_LOGO_KEY(orgId)));
    if (typeof cached === 'string' && cached.startsWith('data:image/')) {
      dataUrlCache.set(orgId, cached);
      return cached;
    }
  } catch {
    /* idb unavailable */
  }
  const url = logoUrl || getCachedBrandingMeta(orgId)?.logoUrl || '';
  const dataUrl = await fetchAsDataUrl(url);
  dataUrlCache.set(orgId, dataUrl);
  dataUrlSource.set(orgId, url);
  if (dataUrl) {
    try {
      await set(LOGO_KEY(orgId), dataUrl);
    } catch {
      /* quota — memory cache still works */
    }
  }
  return dataUrl;
}

/** Prefetch + cache the logo data URL (call after upload, or on app boot). */
export async function primeLogoCache(orgId: string, logoUrl: string): Promise<void> {
  if (!orgId || !logoUrl) return;
  const dataUrl = await fetchAsDataUrl(logoUrl);
  if (dataUrl) {
    dataUrlCache.set(orgId, dataUrl);
    dataUrlSource.set(orgId, logoUrl);
    try {
      await set(LOGO_KEY(orgId), dataUrl);
    } catch {
      /* ignore */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Upload: validation + client-side square crop + Storage               */
/* ------------------------------------------------------------------ */

export const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const LOGO_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const LOGO_CROP_PX = 512;

export type LogoValidationError = 'type' | 'size' | 'decode';

export function validateLogoFile(file: File): LogoValidationError | null {
  if (!LOGO_ACCEPTED_TYPES.includes(file.type as any)) return 'type';
  if (file.size > LOGO_MAX_BYTES) return 'size';
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode'));
    img.src = src;
  });
}

/**
 * Center-crop any image to a square and downscale to LOGO_CROP_PX.
 * Trustees aren't designers — this makes every upload look intentional.
 * Returns the cropped data URL (for instant preview) and a Blob (for upload).
 */
export async function cropImageToSquare(
  file: File,
  size: number = LOGO_CROP_PX
): Promise<{ dataUrl: string; blob: Blob; ext: string }> {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('decode'));
    reader.readAsDataURL(file);
  });
  const img = await loadImage(src);
  const side = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
  if (!side) throw new Error('decode');
  const sx = ((img.naturalWidth || img.width) - side) / 2;
  const sy = ((img.naturalHeight || img.height) - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('decode');

  // JPEG has no alpha — paint a white base so transparent PNGs don't go black.
  const isJpeg = file.type === 'image/jpeg';
  const mime = isJpeg ? 'image/jpeg' : 'image/png';
  if (isJpeg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
  }
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, 0.9)
  );
  if (!blob) throw new Error('decode');
  return { dataUrl: canvas.toDataURL(mime, 0.9), blob, ext: isJpeg ? 'jpg' : 'png' };
}

export interface UploadedLogo {
  downloadUrl: string;
  ext: string;
  dataUrl: string;
  uploadedAt: string;
}

/**
 * Full pipeline: validate → square-crop → upload to
 * `orgLogos/{orgId}/logo.{ext}` → prime offline cache.
 */
export async function uploadOrgLogo(orgId: string, file: File): Promise<UploadedLogo> {
  if (!orgId) throw new Error('org');
  const invalid = validateLogoFile(file);
  if (invalid) throw new Error(invalid);
  const { dataUrl, blob, ext } = await cropImageToSquare(file);
  const logoRef = ref(storage, `orgLogos/${orgId}/logo.${ext}`);
  await uploadBytes(logoRef, blob, { contentType: blob.type });
  const downloadUrl = await getDownloadURL(logoRef);
  const uploadedAt = new Date().toISOString();
  // Prime caches immediately so the preview + receipts work offline at once.
  dataUrlCache.set(orgId, dataUrl);
  dataUrlSource.set(orgId, downloadUrl);
  try {
    await set(LOGO_KEY(orgId), dataUrl);
  } catch {
    /* ignore */
  }
  return { downloadUrl, ext, dataUrl, uploadedAt };
}

/* ------------------------------------------------------------------ */
/* Letterhead assembly for the PDF engine                              */
/* ------------------------------------------------------------------ */

/**
 * Assemble everything sacredHeader() needs for a proper letterhead.
 * Logo resolves from the offline cache (no network stall on receipt tap).
 */
export async function letterheadForWorkspace(ws: any): Promise<LetterheadData> {
  const b = brandingFromWorkspace(ws);
  if (b.orgId) {
    const cached = getCachedBrandingMeta(b.orgId);
    if (cached?.logoUrl && !b.logoUrl) b.logoUrl = cached.logoUrl;
    cacheBrandingMeta(b);
  }
  const addressLine = letterheadAddressLine(b);
  const regBits = [
    b.trustRegNumber ? `Reg. No: ${b.trustRegNumber}` : '',
    b.trust80GRegistered && b.trust80GURN ? `80G: ${b.trust80GURN}` : '',
  ].filter(Boolean);
  return {
    orgName: b.name,
    tagline: b.tagline || undefined,
    addressLine: addressLine || undefined,
    phone: b.phone || undefined,
    trustRegNumber: b.trustRegNumber || undefined,
    metaLine: regBits.join('   |   ') || undefined,
    logoDataUrl: await resolveOrgLogoDataUrl(b.orgId, b.logoUrl),
    monogramLetter: monogramLetter(b.name),
  };
}
