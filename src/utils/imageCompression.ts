import { storage } from '../lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
/**
 * Crash-Proof Client-Side Canvas Compression
 * Strictly uses document.createElement('img') to prevent mobile WebView crashes.
 */

export const compressImageFile = (
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { maxWidth = 400, maxHeight = 400, quality = 0.8 } = options;

    if (!file.type.startsWith('image/')) {
      return reject(new Error('File provided is not an image'));
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const srcDataUrl = readerEvent.target?.result as string;
      if (!srcDataUrl) {
        return reject(new Error('Could not read image file'));
      }

      // Hardening: Strictly use document.createElement('img')
      const img = document.createElement('img');
      img.crossOrigin = 'ANONYMOUS';

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(srcDataUrl); // fallback if canvas 2d context fails
        }

        // Draw and compress to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const fileName = file.name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
        const fileRef = ref(storage, `uploads/${fileName}.jpg`);
        uploadString(fileRef, compressedDataUrl, 'data_url')
          .then(() => getDownloadURL(fileRef))
          .then(downloadUrl => resolve(downloadUrl))
          .catch(err => reject(new Error('Firebase Storage upload failed: ' + err.message)));
      };

      img.onerror = () => {
        reject(new Error('Failed to load image into canvas element'));
      };

      img.src = srcDataUrl;
    };

    reader.onerror = () => {
      reject(new Error('File reader error'));
    };

    reader.readAsDataURL(file);
  });
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
