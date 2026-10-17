/**
 * Crash-Proof Client-Side Canvas Compression → Zero-Cost File Vault
 *
 * Same exports, same signatures as before — the 9 consumer components need
 * zero changes. The only difference: uploads now go through the File Vault
 * (Firestore + IndexedDB hybrid, $0 on Spark) instead of Firebase Storage
 * (which requires a Blaze billing account since Feb 2026).
 *
 * The resolved string is a data URL: it renders instantly in <img src>,
 * persists across reloads when saved to Firestore, and works offline.
 * The vault keeps the deduped canonical copy (see src/lib/fileVault.ts).
 */
import { auth } from '../lib/firebase';
import {
  compressImageBlob,
  blobToDataUrl,
  uploadFile,
} from '../lib/fileVault';

function currentUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in required to upload images.');
  return uid;
}

export const compressImageFile = async (
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<string> => {
  const { maxWidth = 400, maxHeight = 400, quality = 0.8 } = options;

  if (!file.type.startsWith('image/')) {
    throw new Error('File provided is not an image');
  }

  // Honor the caller's dimensions (crash-proof canvas path lives in the vault).
  const compressed = await compressImageBlob(file, {
    maxDim: Math.max(maxWidth, maxHeight),
    quality,
  });

  // Vault the canonical bytes (content-addressed; re-uploads are free).
  // A vault failure must never break the caller's UX — the data URL below
  // is self-sufficient, so we degrade gracefully and keep the local copy.
  try {
    await uploadFile(compressed, {
      visibility: 'public',
      category: 'gallery',
      ownerUid: currentUid(),
      fileName: file.name,
    });
  } catch (err) {
    console.warn('[imageCompression] vault upload deferred:', err);
  }

  return blobToDataUrl(compressed);
};

/**
 * Specifically compress profile avatars to max 400px @ 80%
 */
export const compressDevoteeAvatar = (file: File): Promise<string> => {
  return compressImageFile(file, { maxWidth: 400, maxHeight: 400, quality: 0.8 });
};

export const compressAvatarImage = compressDevoteeAvatar;

/**
 * Specifically compress treasury receipts and expense memos to max 600px @ 80%
 */
export const compressExpenseMemo = (file: File): Promise<string> => {
  return compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.8 });
};
