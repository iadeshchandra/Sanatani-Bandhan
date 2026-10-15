/**
 * qrCodes.ts — Owner-uploaded payment QR codes stored in Firestore.
 *
 * Spark-native ($0): QR images are stored as base64 PNG data URLs in the
 * `qrCodes` Firestore collection (doc ID = region code, e.g. `qrCodes/IN`).
 * Firebase Storage is NOT used because Storage security rules are not
 * deployed by CI (only Firestore rules + Hosting are) — uploads would be
 * blocked until the owner manually configures Storage in the console.
 *
 * Firestore rules: public read (payers need to scan the QR), owner-only write.
 * Images are resized to max 800px via canvas before upload, keeping documents
 * safely under the 1MB Firestore limit.
 *
 * Never throws — all functions fail closed (return null / no-op on error).
 */

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface QrCodeDoc {
  imageData: string; // data:image/png;base64,...
  region: string;
  uploadedAt: unknown;
  uploadedBy: string;
}

const MAX_DIMENSION = 800;
const MAX_INPUT_BYTES = 5 * 1024 * 1024; // 5MB input limit
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const urlCache = new Map<string, string | null>();

/** Resize an image file to max 800px (longest side), return PNG data URL. */
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        try {
          const { naturalWidth: w, naturalHeight: h } = img;
          const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
          const cw = Math.round(w * scale);
          const ch = Math.round(h * scale);
          const canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas unavailable'));
            return;
          }
          // White background so transparent PNGs scan reliably.
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a QR code image for a region. Resizes to max 800px PNG.
 * Returns the data URL on success, null on any failure. Never throws.
 */
export async function uploadQrCode(region: string, file: File, uid: string): Promise<string | null> {
  try {
    const code = String(region || '').trim().toUpperCase();
    if (!code) return null;
    if (!ACCEPTED_TYPES.includes(file.type)) return null;
    if (file.size > MAX_INPUT_BYTES) return null;
    const dataUrl = await resizeToDataUrl(file);
    const ref = doc(db, 'qrCodes', code);
    await setDoc(ref, {
      imageData: dataUrl,
      region: code,
      uploadedAt: serverTimestamp(),
      uploadedBy: uid,
    } as QrCodeDoc);
    urlCache.set(code, dataUrl);
    return dataUrl;
  } catch (e) {
    console.warn('[qrCodes] upload failed:', e);
    return null;
  }
}

/**
 * Get the QR data URL for a region, or null if none uploaded.
 * Memory-cached per page load. Never throws.
 */
export async function getQrCodeUrl(region: string): Promise<string | null> {
  try {
    const code = String(region || '').trim().toUpperCase();
    if (!code) return null;
    if (urlCache.has(code)) return urlCache.get(code) ?? null;
    const snap = await getDoc(doc(db, 'qrCodes', code));
    if (!snap.exists()) {
      urlCache.set(code, null);
      return null;
    }
    const data = snap.data() as Partial<QrCodeDoc>;
    const url = typeof data.imageData === 'string' && data.imageData.startsWith('data:image/')
      ? data.imageData
      : null;
    urlCache.set(code, url);
    return url;
  } catch (e) {
    console.warn('[qrCodes] read failed:', e);
    return null;
  }
}

/** Delete a region's QR code. Owner-only (enforced by Firestore rules). Never throws. */
export async function deleteQrCode(region: string): Promise<boolean> {
  try {
    const code = String(region || '').trim().toUpperCase();
    if (!code) return false;
    await deleteDoc(doc(db, 'qrCodes', code));
    urlCache.delete(code);
    return true;
  } catch (e) {
    console.warn('[qrCodes] delete failed:', e);
    return false;
  }
}

/** Clear the in-memory URL cache (call after upload/delete from another tab). */
export function clearQrCodeCache(): void {
  urlCache.clear();
}

/**
 * React hook — returns the QR data URL for a region (or null).
 * { url, loading }: url is null while loading OR when no QR exists.
 */
export function useQrCode(region: string): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getQrCodeUrl(region).then((u) => {
      if (alive) {
        setUrl(u);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [region]);
  return { url, loading };
}

/** Validate a file before upload. Returns an error message or null if OK. */
export function validateQrFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Please choose a PNG, JPG or WebP image.';
  }
  if (file.size > MAX_INPUT_BYTES) {
    return 'File is too large — please use an image under 5MB.';
  }
  return null;
}
