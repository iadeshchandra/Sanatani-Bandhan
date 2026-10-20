/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — page preprocessing.                       */
/*                                                                     */
/* The pure core (projection profile + band boundaries + row darkness) */
/* is unit-tested; the canvas shell around it only runs in a browser.  */
/* Bands are load-bearing UX, not polish: naive full-page OCR on a     */
/* 2 GB phone is estimated at 25–60 s — bands stream rows into the     */
/* review list in seconds while later bands still read.                */
/* ------------------------------------------------------------------ */

/** Darkness per pixel row (0 = blank paper, higher = more ink). */
export function rowDarkness(gray: ArrayLike<number>, width: number, height: number): number[] {
  const out = new Array<number>(height).fill(0);
  for (let y = 0; y < height; y++) {
    let dark = 0;
    const rowOff = y * width;
    for (let x = 0; x < width; x++) {
      // Ink = pixels notably darker than paper.
      if (gray[rowOff + x] < 160) dark++;
    }
    out[y] = dark;
  }
  return out;
}

/**
 * Cut a page into horizontal bands. Aim for ~targetBandPx per band,
 * but always cut at a local darkness minimum (the blank gap between
 * register rows) inside [minBandPx, 1.6 × targetBandPx] — never slice
 * through a line of writing. Returns y-offsets including 0 and the
 * page height, so bands are [cuts[i], cuts[i+1]).
 */
export function bandBoundaries(
  darkness: number[],
  targetBandPx: number,
  minBandPx: number
): number[] {
  const h = darkness.length;
  if (h <= targetBandPx * 1.4) return [0, h];
  const cuts: number[] = [0];
  let y = 0;
  while (h - y > targetBandPx * 1.4) {
    const lo = y + Math.max(1, minBandPx);
    const hi = Math.min(h - 1, Math.floor(y + targetBandPx * 1.6));
    let best = lo;
    let bestVal = Infinity;
    for (let i = lo; i <= hi; i++) {
      if (darkness[i] < bestVal) { bestVal = darkness[i]; best = i; }
    }
    cuts.push(best);
    y = best;
  }
  cuts.push(h);
  return cuts;
}

/* ------------------------- canvas shell ----------------------------- */
/* Browser-only below. All functions tolerate being handed blobs from  */
/* the file-input capture path (no live camera APIs needed).          */

export async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // Object URL revoked on next tick by callers that keep the image;
    // decode() has already materialized the pixels for canvas use.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function imageToCanvas(
  img: HTMLImageElement,
  maxWidth = 2000
): HTMLCanvasElement {
  const scale = Math.min(1, maxWidth / (img.naturalWidth || img.width));
  const w = Math.round((img.naturalWidth || img.width) * scale);
  const h = Math.round((img.naturalHeight || img.height) * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/** Grayscale + contrast stretch — the working image OCR reads, and
 *  the "what the machine saw" preview in review. */
export function toWorkingCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, out.width, out.height);
  const px = data.data;
  let min = 255;
  let max = 0;
  const gray = new Uint8ClampedArray(out.width * out.height);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const g = Math.round(px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114);
    gray[j] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const v = Math.round(((gray[j] - min) / range) * 255);
    px[i] = v;
    px[i + 1] = v;
    px[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return out;
}

export function canvasGray(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const ctx = canvas.getContext('2d')!;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const gray = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) gray[j] = data[i];
  return gray;
}

export function sliceBand(src: HTMLCanvasElement, y0: number, y1: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = Math.max(1, y1 - y0);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(src, 0, y0, src.width, out.height, 0, 0, src.width, out.height);
  return out;
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas-to-blob-failed'))),
      'image/jpeg',
      quality
    );
  });
}

/** Evidence copy: ≤1600 px long edge JPEG — legible for verification,
 *  small enough for the vault's single-doc path (≤ 700 KB typical). */
export async function evidenceBlob(src: HTMLCanvasElement): Promise<Blob> {
  const scale = Math.min(1, 1600 / Math.max(src.width, src.height));
  if (scale >= 1) return canvasToBlob(src, 0.72);
  const out = document.createElement('canvas');
  out.width = Math.round(src.width * scale);
  out.height = Math.round(src.height * scale);
  out.getContext('2d')!.drawImage(src, 0, 0, out.width, out.height);
  return canvasToBlob(out, 0.72);
}
