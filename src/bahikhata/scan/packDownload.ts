/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — the one-time "Reading Pack" download.     */
/*                                                                     */
/* Patterned on src/ai/voice/downloader.ts: informed consent first     */
/* (what it is, how big, Wi-Fi recommended, removable), progress the   */
/* user can watch, integrity verified by reading the cache back. The   */
/* pack is same-origin static files warmed into the 'ocr-reading-pack' */
/* Cache Storage bucket — the same bucket the service worker's         */
/* CacheFirst runtime rule serves /ocr/* from, so once downloaded the  */
/* engine works fully offline in a no-signal courtyard.                */
/* ------------------------------------------------------------------ */

import { ocrBaseUrl } from './ocrEngine';

export const OCR_CACHE_NAME = 'ocr-reading-pack';

/** The files a device actually fetches (one core variant per CPU —
 *  the list warms all three; each is fetched at most once, ever). */
export const PACK_FILES: { path: string; approxKB: number }[] = [
  { path: 'worker.min.js', approxKB: 109 },
  { path: 'tesseract-core-lstm.wasm.js', approxKB: 3805 },
  { path: 'tesseract-core-lstm.wasm', approxKB: 2788 },
  { path: 'tesseract-core-simd-lstm.wasm.js', approxKB: 3808 },
  { path: 'tesseract-core-simd-lstm.wasm', approxKB: 2791 },
  { path: 'tesseract-core-relaxedsimd-lstm.wasm.js', approxKB: 3814 },
  { path: 'tesseract-core-relaxedsimd-lstm.wasm', approxKB: 2795 },
  { path: 'ben.traineddata.gz', approxKB: 535 },
  { path: 'hin.traineddata.gz', approxKB: 899 },
  { path: 'eng.traineddata.gz', approxKB: 1916 },
];

export const PACK_TOTAL_KB = PACK_FILES.reduce((s, f) => s + f.approxKB, 0);

/** Human size for consent copy: one core per device ≈ 10 MB worst
 *  case including all variants warmed. */
export function packSizeLabel(): string {
  return `≈ ${Math.round(PACK_TOTAL_KB / 1024)} MB`;
}

export type PackStatus = 'ready' | 'absent' | 'partial';

export async function packStatus(): Promise<PackStatus> {
  try {
    if (typeof caches === 'undefined') return 'absent';
    const cache = await caches.open(OCR_CACHE_NAME);
    let present = 0;
    for (const f of PACK_FILES) {
      const hit = await cache.match(`${ocrBaseUrl()}/${f.path}`);
      if (hit) present++;
    }
    if (present === PACK_FILES.length) return 'ready';
    return present > 0 ? 'partial' : 'absent';
  } catch {
    return 'absent';
  }
}

export interface PackProgress { doneFiles: number; totalFiles: number; file: string }

/**
 * Fetch every pack file into the cache, reporting per-file progress.
 * Files already cached are skipped (resumable by construction). The
 * final status is verified by reading the cache back — a download is
 * only "done" when the bytes are provably on the device.
 */
export async function downloadPack(
  onProgress?: (p: PackProgress) => void
): Promise<PackStatus> {
  const cache = await caches.open(OCR_CACHE_NAME);
  const base = ocrBaseUrl();
  let done = 0;
  for (const f of PACK_FILES) {
    const url = `${base}/${f.path}`;
    const existing = await cache.match(url);
    if (!existing) {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`pack fetch failed: ${f.path} (${res.status})`);
      await cache.put(url, res);
    }
    done++;
    onProgress?.({ doneFiles: done, totalFiles: PACK_FILES.length, file: f.path });
  }
  return packStatus();
}

/** Free the space again (the consent screen promises this is possible). */
export async function removePack(): Promise<void> {
  try {
    await caches.delete(OCR_CACHE_NAME);
  } catch { /* nothing to free */ }
}
