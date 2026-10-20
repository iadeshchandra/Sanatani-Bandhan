/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — OCR engine adapter.                       */
/*                                                                     */
/* The pipeline is engine-agnostic behind this interface (a future     */
/* PaddleOCR.js evaluation swaps in here, nothing else moves). The     */
/* shipped engine is Tesseract.js 7.0.0 with tessdata_FAST packs —      */
/* versions are PINNED as a trio (core/packs/worker) because a        */
/* mismatched pair crashes the WASM worker (measured in research).     */
/*                                                                     */
/* tesseract.js is loaded by dynamic import ONLY when a scan starts:   */
/* it becomes its own lazy chunk; devotees who never scan pay zero     */
/* bytes for it. The worker is created once and reused across pages    */
/* (init ≈ 0.5 s measured) and across bands of a page.                 */
/* ------------------------------------------------------------------ */

import type { OcrBand, OcrLine, OcrWord } from './scanRows';
import { sliceBand } from './preprocess';

export interface OcrEngine {
  /** Read one page (a working-image canvas) band by band. `onBand`
   *  fires as each band lands so the UI streams rows in. Yields all
   *  lines in PAGE pixel coordinates. */
  readPage(
    page: HTMLCanvasElement,
    bands: { y0: number; y1: number }[],
    onBand?: (band: OcrBand) => void
  ): Promise<OcrLine[]>;
  terminate(): Promise<void>;
}

/* FUTURE RUNG — intentionally NOT implemented in #34 (owner addendum
 * 2026-10-20, research §2.5.4): a cloud-vision engine (e.g. Gemini)
 * would implement this same OcrEngine interface and slot in beside
 * TesseractEngine with zero pipeline rework. It stays out because it
 * is online-only, needs a key an org sevadar won't hold, and sends
 * devotee-page photos off-device — it may only ever land as an
 * opt-in, per-batch-consented, owner-key rung. Do not build a cloud
 * call here without a fresh owner decision. */

export const OCR_LANGS = ['ben', 'hin', 'eng'] as const;

/** Same-origin pack root (public/ocr). BASE_URL keeps the GitHub
 *  Pages subpath build correct. */
export function ocrBaseUrl(): string {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/ocr`;
}

type TessWorker = import('tesseract.js').Worker;

let workerPromise: Promise<TessWorker> | null = null;

async function getWorker(): Promise<TessWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const tess = await import('tesseract.js');
      const base = ocrBaseUrl();
      const worker = await tess.createWorker([...OCR_LANGS], tess.OEM.LSTM_ONLY, {
        workerPath: `${base}/worker.min.js`,
        corePath: base,
        langPath: base,
        gzip: true,
        // The service worker CacheFirst on /ocr/* (vite.config) is the
        // offline story; tesseract's own cache would double-store the
        // packs in IndexedDB under a second key.
        cacheMethod: 'none',
        logger: () => { /* progress is band-shaped in our UI, not % */ },
      });
      await worker.setParameters({ tessedit_pageseg_mode: tess.PSM.SINGLE_BLOCK });
      return worker;
    })();
    // A failed init must not poison the session — allow a retry.
    workerPromise.catch(() => { workerPromise = null; });
  }
  return workerPromise;
}

function mapLine(line: import('tesseract.js').Line, yOff: number): OcrLine {
  const words: OcrWord[] = line.words.map((w) => ({
    text: w.text,
    confidence: w.confidence,
    bbox: { x0: w.bbox.x0, y0: w.bbox.y0 + yOff, x1: w.bbox.x1, y1: w.bbox.y1 + yOff },
    symbols: (w.symbols || []).map((s) => ({ text: s.text, confidence: s.confidence })),
  }));
  return {
    words,
    bbox: {
      x0: line.bbox.x0, y0: line.bbox.y0 + yOff,
      x1: line.bbox.x1, y1: line.bbox.y1 + yOff,
    },
  };
}

class TesseractEngine implements OcrEngine {
  async readPage(
    page: HTMLCanvasElement,
    bands: { y0: number; y1: number }[],
    onBand?: (band: OcrBand) => void
  ): Promise<OcrLine[]> {
    const worker = await getWorker();
    const all: OcrLine[] = [];
    const list = bands.length ? bands : [{ y0: 0, y1: page.height }];
    for (let i = 0; i < list.length; i++) {
      const { y0, y1 } = list[i];
      const bandCanvas = y0 === 0 && y1 === page.height ? page : sliceBand(page, y0, y1);
      const { data } = await worker.recognize(bandCanvas, {}, { blocks: true });
      const lines: OcrLine[] = [];
      for (const block of data.blocks || []) {
        for (const para of block.paragraphs) {
          for (const line of para.lines) lines.push(mapLine(line, y0));
        }
      }
      all.push(...lines);
      onBand?.({ bandIndex: i, lines });
    }
    return all;
  }

  async terminate(): Promise<void> {
    if (!workerPromise) return;
    const p = workerPromise;
    workerPromise = null;
    try {
      const w = await p;
      await w.terminate();
    } catch { /* already gone */ }
  }
}

let engine: OcrEngine | null = null;

/** The shared engine instance (lazy — importing this module does NOT
 *  load tesseract.js; only readPage does). */
export function getOcrEngine(): OcrEngine {
  if (!engine) engine = new TesseractEngine();
  return engine;
}
