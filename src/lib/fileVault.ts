/**
 * Sanatani Bandhan — Zero-Cost File Vault
 * ============================================================================
 * Replaces Firebase Storage (which requires a Blaze billing account since
 * Feb 2026) with a Firestore + IndexedDB hybrid that costs $0 on Spark.
 *
 * Three visibility tiers:
 *
 *   PUBLIC files   → Firestore `fileVault/{fileId}` as base64
 *                    (single doc ≤700KB raw; chunked subcollection above that,
 *                    up to 10MB total — security rules enforce the cap)
 *                    Readable by any signed-in user.
 *   CRISIS files   → Firestore `fileVault/{fileId}` as base64, exactly like
 *                    public — PLUS a `tenantId` field. Security rules gate
 *                    reads to tenant members of that crisis
 *                    (`visibility == 'crisis' && isTenantMember(tenantId)`).
 *                    Used for SOS voice notes so the response team can hear
 *                    them. Safety-critical audio MUST reach responders.
 *   PRIVATE files  → IndexedDB on this device ONLY. Firestore holds a tiny
 *                    metadata pointer (`localOnly: true`). Bytes never upload.
 *                    For verification documents and other sensitive material
 *                    that must stay under the user's physical control.
 *
 * Every file is content-addressed (SHA-256): uploading the same bytes twice
 * costs one document — re-uploads are a single cached read, not a write.
 * (Private ids are namespaced `p_{ownerUid}_…` and crisis ids `c_{tenantId}_…`,
 * so a re-upload of identical bytes by a different owner/tenant gets its own
 * id — the dedupe early-return can never skip storing YOUR copy, and one
 * tenant's crisis file can never resolve to another tenant's bytes.)
 *
 * URLs use the `vault://{fileId}` scheme. Resolve them with `getFileUrl()`
 * (Blob URL, for <img>/<audio> src) or `resolveVaultUrl()` (pass-through for
 * non-vault URLs). Legacy upload helpers (`compressImageFile`,
 * `uploadOrgLogo`) return data URLs so their consumers need zero changes.
 *
 * --- BLAZE-DAY MIGRATION ----------------------------------------------------
 * When the project upgrades to Blaze and Cloud Storage is provisioned:
 *   1. Reimplement `uploadFile()` internals with
 *      `ref(storage, ...)`, `uploadBytes()`, `getDownloadURL()`.
 *   2. Reimplement `getFileUrl()` to return `getDownloadURL(ref(...))`.
 *   3. Paste the prepared `storage.rules` (~/workspace/sanatani-bandhan/).
 * All 9 consumer components keep working unchanged — they only ever see
 * `uploadFile()`, `getFileUrl()`, and the legacy helpers.
 * ----------------------------------------------------------------------------
 */

import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  putPrivateFile,
  getPrivateFile,
  deletePrivateFile,
} from './fileVaultIdb';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type VaultVisibility = 'public' | 'crisis' | 'private';
export type VaultCategory =
  | 'avatar'
  | 'orgLogo'
  | 'gallery'
  | 'document'
  | 'receipt'
  | 'voice'
  | 'other';

export interface UploadOptions {
  visibility: VaultVisibility;
  category: VaultCategory;
  /** UID of the uploader — bound into Firestore rules (owner-only write). */
  ownerUid: string;
  /**
   * Required when visibility is 'crisis': the crisis event's tenant/
   * workspace id. Security rules gate crisis reads to tenant members of
   * this id (`isTenantMember(tenantId)`). Ignored for other visibilities.
   */
  tenantId?: string | null;
  fileName?: string;
}

export interface UploadResult {
  fileId: string;
  /** Canonical reference: `vault://{fileId}`. Resolve via getFileUrl(). */
  url: string;
}

export interface VaultFile {
  blob: Blob;
  contentType: string;
  size: number;
}

export interface CompressOptions {
  /** Longest edge in px. Default 1280. */
  maxDim?: number;
  /** 0..1. Default 0.72. */
  quality?: number;
}

/* ------------------------------------------------------------------ */
/* Tunables                                                            */
/* ------------------------------------------------------------------ */

const VAULT_COLLECTION = 'fileVault';
/** Raw-byte threshold: above this, public files are chunked. */
export const VAULT_SINGLE_DOC_MAX = 700 * 1024;
/** Base64 characters per chunk document (well under the 1 MiB doc cap). */
export const VAULT_CHUNK_B64 = 500 * 1024;
/** Hard Firestore document cap — mirrored in security rules. */
export const VAULT_DOC_LIMIT = 1048576;
/**
 * Max raw bytes for a Firestore-backed (public/crisis) upload. Single-doc
 * uploads stay ≤ 1 MiB; a chunked meta doc may declare up to this total when
 * `chunkCount` is present (mirrored in security rules: ≤ 10 MiB, ≤ 28 chunks
 * of ≤ 500 KB base64 each). Private files are device-local and exempt.
 */
export const VAULT_MAX_CHUNKED_BYTES = 10 * 1048576;

export const VAULT_SCHEME = 'vault://';

export function vaultUrl(fileId: string): string {
  return `${VAULT_SCHEME}${fileId}`;
}

export function isVaultUrl(url: string | null | undefined): boolean {
  return !!url && url.startsWith(VAULT_SCHEME);
}

export function fileIdFromVaultUrl(url: string): string {
  return url.slice(VAULT_SCHEME.length);
}

/* ------------------------------------------------------------------ */
/* Pure helpers (unit-tested)                                          */
/* ------------------------------------------------------------------ */

/** SHA-256 hex digest — the content address. */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Deterministic, collision-proof file id.
 *
 * Namespacing prevents cross-visibility dedupe collisions:
 * - `p_` prefix + ownerUid scope: a private file can never dedupe against
 *   another user's private copy (or a public copy) — each owner's bytes are
 *   independent, so the early-return dedupe can never skip *your* IndexedDB
 *   write because *someone else* uploaded identical bytes.
 * - `c_` prefix + tenantId scope: a crisis file in tenant A can never
 *   resolve to tenant B's identical bytes (which B couldn't read anyway).
 * - public ids stay unscoped: global dedupe is the point (one doc for all).
 */
export function fileIdFor(
  visibility: VaultVisibility,
  hashHex: string,
  scope?: string
): string {
  const cleanScope =
    (scope || 'anon').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'anon';
  if (visibility === 'private')
    return `fv_p_${cleanScope}_${hashHex.slice(0, 32)}`;
  if (visibility === 'crisis')
    return `fv_c_${cleanScope}_${hashHex.slice(0, 32)}`;
  return `fv_${hashHex.slice(0, 48)}`;
}

/** Base64 encode without blowing the call stack on large buffers. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK) as unknown as number[]
    );
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Split a base64 string into chunk-sized pieces; join reverses it. */
export function splitIntoChunks(b64: string, chunkSize: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < b64.length; i += chunkSize) out.push(b64.slice(i, i + chunkSize));
  return out;
}

/** Longest-edge-downscale math (pure — canvas only in compressImageBlob). */
export function computeTargetSize(
  width: number,
  height: number,
  maxDim: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxDim) return { width, height };
  const scale = maxDim / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('filevault/read'));
    reader.onerror = () => reject(new Error('filevault/read'));
    reader.readAsDataURL(blob);
  });
}

/* ------------------------------------------------------------------ */
/* Image compression (WebP, EXIF-stripped by canvas redraw)             */
/* ------------------------------------------------------------------ */

const COMPRESSIBLE_RASTER = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
]);
// GIF (animation) and SVG (vector) are passed through untouched —
// rasterizing them would destroy animation / scalability.
function isCompressibleImage(mime: string): boolean {
  return COMPRESSIBLE_RASTER.has(mime);
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // document.createElement (not `new Image()`): avoids WebView crashes.
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('filevault/decode'));
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), type, quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Compress a raster image to WebP (max 1280px longest edge, q0.72).
 * Redrawing on canvas strips EXIF (incl. GPS) — privacy by construction.
 * Non-images, GIFs, SVGs, and anything that can't use canvas pass through.
 * If compression ever inflates the file, the original is kept.
 */
export async function compressImageBlob(
  blob: Blob,
  opts: CompressOptions = {}
): Promise<Blob> {
  const { maxDim = 1280, quality = 0.72 } = opts;
  const mime = (blob.type || '').toLowerCase();
  if (!mime.startsWith('image/') || !isCompressibleImage(mime)) return blob;
  if (typeof document === 'undefined') return blob;

  try {
    const src = URL.createObjectURL(blob);
    try {
      const img = await loadImageElement(src);
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      if (!naturalW || !naturalH) return blob;
      const { width, height } = computeTargetSize(naturalW, naturalH, maxDim);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return blob;
      // WebP has no alpha issues; JPEG fallback gets a white base.
      ctx.drawImage(img, 0, 0, width, height);

      let out = await canvasToBlob(canvas, 'image/webp', quality);
      if (!out || out.size === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        out = await canvasToBlob(canvas, 'image/jpeg', quality);
      }
      if (!out || out.size === 0 || out.size >= blob.size) return blob;
      return out;
    } finally {
      URL.revokeObjectURL(src);
    }
  } catch {
    return blob;
  }
}

/* ------------------------------------------------------------------ */
/* Core API                                                            */
/* ------------------------------------------------------------------ */

const blobCache = new Map<string, VaultFile>();
const objectUrlCache = new Map<string, string>();

function chunkDocId(index: number): string {
  return String(index).padStart(4, '0');
}

interface VaultMeta {
  visibility: VaultVisibility;
  category: VaultCategory;
  ownerUid: string;
  contentType: string;
  size: number;
  hash: string;
  fileName: string;
  chunkCount: number;
  /** Set for 'crisis' visibility — the tenant allowed to read this file. */
  tenantId?: string | null;
  localOnly?: boolean;
  data?: string;
  createdAt: unknown;
}

/**
 * Store a file in the vault. Content-addressed: identical bytes uploaded
 * twice (by anyone) resolve to one document — the second call is a single
 * cached read, not a write.
 */
export async function uploadFile(
  file: File | Blob,
  opts: UploadOptions
): Promise<UploadResult> {
  const { visibility, category, ownerUid } = opts;
  if (!ownerUid) throw new Error('filevault/auth-required');
  if (visibility === 'crisis' && !opts.tenantId) {
    throw new Error('filevault/tenant-required');
  }

  let blob: Blob = file instanceof Blob ? file : new Blob([file as BlobPart]);
  if (blob.type.startsWith('image/')) {
    blob = await compressImageBlob(blob);
  }
  const contentType = blob.type || 'application/octet-stream';
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length === 0) throw new Error('filevault/empty');
  // Fail fast before any hashing/encoding work: bytes bound for Firestore
  // can never exceed what the chunked rules allow (private files are
  // device-local and exempt).
  if (visibility !== 'private' && bytes.length > VAULT_MAX_CHUNKED_BYTES) {
    throw new Error('filevault/too-large');
  }

  const hash = await sha256Hex(bytes);
  // Scope the id: private → owner, crisis → tenant. Without this, the
  // content-addressed dedupe below could return *someone else's* fileId for
  // identical bytes — and the early return would skip storing YOUR copy.
  const fileId = fileIdFor(
    visibility,
    hash,
    visibility === 'private'
      ? ownerUid
      : visibility === 'crisis'
        ? (opts.tenantId as string)
        : undefined
  );
  const metaRef = doc(db, VAULT_COLLECTION, fileId);

  // Dedupe: content already vaulted → return the reference, no write.
  // Works offline (persistence cache) and never throws.
  const existing = await getDoc(metaRef).catch(() => null);
  if (existing && existing.exists()) {
    return { fileId, url: vaultUrl(fileId) };
  }

  const fileName =
    (opts.fileName || (file instanceof File ? file.name : '') || '').slice(0, 120);
  const baseMeta: VaultMeta = {
    visibility,
    category,
    ownerUid,
    contentType,
    size: bytes.length,
    hash,
    fileName,
    chunkCount: 0,
    // Crisis files carry the tenant id so rules can gate reads to the
    // response team. Public/private omit it.
    ...(visibility === 'crisis' ? { tenantId: opts.tenantId } : {}),
    createdAt: serverTimestamp() as unknown as number,
  };

  if (visibility === 'private') {
    // Bytes stay on this device. Firestore gets metadata only.
    await putPrivateFile({
      fileId,
      bytes,
      contentType,
      size: bytes.length,
      category,
      createdAt: Date.now(),
    });
    await setDoc(metaRef, { ...baseMeta, localOnly: true });
    return { fileId, url: vaultUrl(fileId) };
  }

  // 'public' and 'crisis' both upload bytes to Firestore (single doc or
  // chunked). Crisis reads are gated by tenantId in the security rules.
  if (bytes.length <= VAULT_SINGLE_DOC_MAX) {
    await setDoc(metaRef, { ...baseMeta, data: bytesToBase64(bytes) });
    return { fileId, url: vaultUrl(fileId) };
  }

  // Chunked: metadata + ordered chunk docs (each ≤500KB base64).
  const b64 = bytesToBase64(bytes);
  const chunks = splitIntoChunks(b64, VAULT_CHUNK_B64);
  const batch = writeBatch(db);
  batch.set(metaRef, { ...baseMeta, chunkCount: chunks.length });
  chunks.forEach((data, i) => {
    batch.set(doc(db, VAULT_COLLECTION, fileId, 'chunks', chunkDocId(i)), {
      i,
      data,
      ownerUid,
      // Denormalized gating fields: chunk reads are authorized from the
      // chunk doc alone (no parent get()), so a leaked fileId can never
      // bypass the parent's visibility via direct chunk reads.
      visibility,
      ...(visibility === 'crisis' ? { tenantId: opts.tenantId } : {}),
    });
  });
  await batch.commit();
  return { fileId, url: vaultUrl(fileId) };
}

/** Fetch a vault file's bytes (memory-cached per session). */
export async function getFile(fileId: string): Promise<VaultFile | null> {
  const cached = blobCache.get(fileId);
  if (cached) return cached;

  const load = async (): Promise<VaultFile | null> => {
    const snap = await getDoc(doc(db, VAULT_COLLECTION, fileId)).catch(() => null);
    if (snap && snap.exists()) {
      const meta = snap.data() as VaultMeta;
      if (meta.localOnly) {
        const rec = await getPrivateFile(fileId).catch(() => null);
        if (!rec) return null;
        return {
          blob: new Blob([rec.bytes as BlobPart], { type: rec.contentType }),
          contentType: rec.contentType,
          size: rec.bytes.length,
        };
      }
      let bytes: Uint8Array | null = null;
      if (typeof meta.data === 'string' && meta.data.length > 0) {
        bytes = base64ToBytes(meta.data);
      } else if (meta.chunkCount > 0) {
        const parts: string[] = [];
        for (let i = 0; i < meta.chunkCount; i++) {
          const csnap = await getDoc(
            doc(db, VAULT_COLLECTION, fileId, 'chunks', chunkDocId(i))
          ).catch(() => null);
          if (!csnap || !csnap.exists()) return null;
          parts.push((csnap.data() as { data?: string }).data || '');
        }
        bytes = base64ToBytes(parts.join(''));
      }
      if (!bytes) return null;
      return {
        blob: new Blob([bytes as BlobPart], {
          type: meta.contentType || 'application/octet-stream',
        }),
        contentType: meta.contentType || 'application/octet-stream',
        size: bytes.length,
      };
    }
    // No metadata (e.g. not yet synced) — try the device store directly.
    const rec = await getPrivateFile(fileId).catch(() => null);
    if (!rec) return null;
    return {
      blob: new Blob([rec.bytes as BlobPart], { type: rec.contentType }),
      contentType: rec.contentType,
      size: rec.bytes.length,
    };
  };

  const file = await load();
  if (file) blobCache.set(fileId, file);
  return file;
}

/** Resolve a fileId to a Blob URL usable in <img>/<audio> src. */
export async function getFileUrl(fileId: string): Promise<string | null> {
  const cached = objectUrlCache.get(fileId);
  if (cached) return cached;
  const file = await getFile(fileId);
  if (!file) return null;
  const url = URL.createObjectURL(file.blob);
  objectUrlCache.set(fileId, url);
  return url;
}

/**
 * Resolve any URL: vault:// → Blob URL; anything else passes through
 * unchanged (https:, data:, blob:). Null when the vault file is missing —
 * callers must render a fallback (monogram, placeholder, notice).
 */
export async function resolveVaultUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (!isVaultUrl(url)) return url;
  return getFileUrl(fileIdFromVaultUrl(url));
}

/** Resolve a vault fileId to a data URL (legacy-compatible persistence). */
export async function getFileDataUrl(fileId: string): Promise<string | null> {
  const file = await getFile(fileId);
  if (!file) return null;
  return blobToDataUrl(file.blob);
}

/** Owner-only delete: doc + chunks, or the device record. */
export async function deleteFile(fileId: string, requesterUid: string): Promise<void> {
  const metaRef = doc(db, VAULT_COLLECTION, fileId);
  const snap = await getDoc(metaRef).catch(() => null);
  if (snap && snap.exists()) {
    const meta = snap.data() as VaultMeta;
    if (meta.ownerUid !== requesterUid) throw new Error('filevault/forbidden');
    const batch = writeBatch(db);
    for (let i = 0; i < (meta.chunkCount || 0); i++) {
      batch.delete(doc(db, VAULT_COLLECTION, fileId, 'chunks', chunkDocId(i)));
    }
    batch.delete(metaRef);
    await batch.commit().catch(() => {
      /* offline: queued; fall through to local cleanup */
    });
    if (meta.localOnly) await deletePrivateFile(fileId);
  } else {
    await deletePrivateFile(fileId);
  }
  const objUrl = objectUrlCache.get(fileId);
  if (objUrl) {
    try {
      URL.revokeObjectURL(objUrl);
    } catch {
      /* ignore */
    }
    objectUrlCache.delete(fileId);
  }
  blobCache.delete(fileId);
}

/** Native share sheet for a private file (export without cloud). */
export async function shareFile(
  fileId: string,
  title = 'Sanatani Bandhan file'
): Promise<boolean> {
  const file = await getFile(fileId);
  if (!file) return false;
  try {
    const name = `${fileId}.${(file.contentType.split('/')[1] || 'bin').split(';')[0]}`;
    const f = new File([file.blob], name, { type: file.contentType });
    if (navigator.share && navigator.canShare?.({ files: [f] })) {
      await navigator.share({ files: [f], title });
      return true;
    }
  } catch {
    /* user cancelled or unsupported */
  }
  return false;
}

/** Test seam: clear in-memory caches. */
export function __clearVaultCaches(): void {
  blobCache.clear();
  for (const url of objectUrlCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
  objectUrlCache.clear();
}
