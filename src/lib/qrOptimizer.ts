/**
 * qrOptimizer.ts — Client-side QR auto-optimization for dashboard uploads.
 * ========================================================================
 * When the owner uploads a new payment QR in GodMode, this:
 *  1. Loads the image into a canvas
 *  2. Auto-detects the QR module bounding box (dark-pixel scan, same
 *     technique as the manual extraction)
 *  3. Crops tightly with a proper quiet zone (8% margin)
 *  4. Resizes to 512×512, exports optimized PNG
 *  5. Validates structurally (3 finder patterns present)
 *
 * Pure client-side — no server, no dependencies.
 */

export interface QrOptimizeResult {
  ok: boolean;
  blob?: Blob;
  dataUrl?: string;
  originalSize: number;
  optimizedSize: number;
  reduction: number; // percent
  width: number;
  height: number;
  error?: string;
}

function loadImage(file: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image.'));
    if (typeof file === 'string') img.src = file;
    else img.src = URL.createObjectURL(file);
  });
}

/** Find the bounding box of dark QR modules via row/column density scan. */
function detectQrBounds(
  data: Uint8ClampedArray, w: number, h: number
): { x0: number; y0: number; x1: number; y1: number } | null {
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    // Dark module: any channel-based darkness (works for red/black/blue QRs)
    dark[i] = (r + g + b) / 3 < 110 ? 1 : 0;
  }
  // Column density
  const colCount = new Array(w).fill(0);
  const rowCount = new Array(h).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (dark[y * w + x]) { colCount[x]++; rowCount[y]++; }
  }
  // A column/row "has QR" if >15% dark (filters text specks)
  const colHas = colCount.map((c) => c > h * 0.15);
  const rowHas = rowCount.map((c) => c > w * 0.15);
  // Largest contiguous run
  const longest = (arr: boolean[]) => {
    let best = [0, 0], s = -1;
    for (let i = 0; i <= arr.length; i++) {
      if (i < arr.length && arr[i]) { if (s < 0) s = i; }
      else { if (s >= 0 && i - s > best[1] - best[0]) best = [s, i]; s = -1; }
    }
    return best;
  };
  const [cx0, cx1] = longest(colHas);
  const [ry0, ry1] = longest(rowHas);
  if (cx1 - cx0 < 40 || ry1 - ry0 < 40) return null;
  return { x0: cx0, y0: ry0, x1: cx1, y1: ry1 };
}

/** Structural check: 3 finder-pattern-like dense regions at corners. */
function validateFinders(
  data: Uint8ClampedArray, w: number, h: number
): boolean {
  const dark = (x: number, y: number) => {
    const i = (Math.floor(y) * w + Math.floor(x)) * 4;
    return (data[i] + data[i + 1] + data[i + 2]) / 3 < 110;
  };
  let found = 0;
  for (const [cy, cx] of [[0.14, 0.14], [0.14, 0.86], [0.86, 0.14]]) {
    const px = cx * w, py = cy * h, r = Math.min(w, h) * 0.07;
    let darkCount = 0, total = 0;
    for (let dy = -r; dy <= r; dy += 2) for (let dx = -r; dx <= r; dx += 2) {
      total++;
      if (dark(px + dx, py + dy)) darkCount++;
    }
    const density = darkCount / total;
    if (density > 0.3 && density < 0.75) found++;
  }
  return found >= 3;
}

export async function optimizeQrImage(file: File): Promise<QrOptimizeResult> {
  const originalSize = file.size;
  try {
    const img = await loadImage(file);
    // Draw at natural size (cap at 2048 for perf)
    const scale = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const src = document.createElement('canvas');
    src.width = w; src.height = h;
    const sctx = src.getContext('2d', { willReadFrequently: true });
    if (!sctx) throw new Error('Canvas not supported.');
    sctx.fillStyle = '#ffffff';
    sctx.fillRect(0, 0, w, h);
    sctx.drawImage(img, 0, 0, w, h);
    const imgData = sctx.getImageData(0, 0, w, h);

    const bounds = detectQrBounds(imgData.data, w, h);
    if (!bounds) {
      return { ok: false, originalSize, optimizedSize: 0, reduction: 0, width: 0, height: 0, error: 'No QR pattern detected. Try a clearer photo of just the QR.' };
    }
    // Quiet zone: 8% margin around detected bounds
    const qw = bounds.x1 - bounds.x0, qh = bounds.y1 - bounds.y0;
    const m = Math.round(Math.max(qw, qh) * 0.08);
    const x0 = Math.max(0, bounds.x0 - m), y0 = Math.max(0, bounds.y0 - m);
    const x1 = Math.min(w, bounds.x1 + m), y1 = Math.min(h, bounds.y1 + m);

    // Validate finders on the cropped region
    const cropW = x1 - x0, cropH = y1 - y0;
    const cropData = sctx.getImageData(x0, y0, cropW, cropH);
    if (!validateFinders(cropData.data, cropW, cropH)) {
      return { ok: false, originalSize, optimizedSize: 0, reduction: 0, width: 0, height: 0, error: 'QR structure check failed — the code may be cut off or blurry.' };
    }

    // Render optimized 512×512
    const out = document.createElement('canvas');
    out.width = 512; out.height = 512;
    const octx = out.getContext('2d');
    if (!octx) throw new Error('Canvas not supported.');
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, 512, 512);
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(src, x0, y0, cropW, cropH, 0, 0, 512, 512);

    const blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/png'));
    if (!blob) throw new Error('PNG export failed.');
    const dataUrl = URL.createObjectURL(blob);
    return {
      ok: true, blob, dataUrl,
      originalSize, optimizedSize: blob.size,
      reduction: Math.round(((originalSize - blob.size) / originalSize) * 100),
      width: 512, height: 512,
    };
  } catch (e: any) {
    return { ok: false, originalSize, optimizedSize: 0, reduction: 0, width: 0, height: 0, error: e?.message || 'Optimization failed.' };
  }
}
