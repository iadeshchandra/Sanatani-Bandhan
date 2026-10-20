/**
 * Bahi-Khata Seva Phase 2 — copy the OCR "Reading Pack" into public/ocr/.
 *
 * The pack is served same-origin and runtime-cached by the service
 * worker (vite.config.ts runtimeCaching, CacheFirst on /ocr/*), so a
 * sevadar downloads it ONCE (Wi-Fi recommended) and then scans fully
 * offline. Users who never scan never fetch a byte of it.
 *
 * Pinned trio (version pairing is load-bearing — a mismatched
 * core/traineddata pair crashes the WASM worker; tessdata_best crashed
 * it in our sandbox runs, so we ship FAST packs only):
 *   - tesseract.js            7.0.0   (npm dependency, lazy chunk)
 *   - tesseract.js-core       (bundled with tesseract.js 7.0.0)
 *   - tessdata_fast ben/hin/eng (the exact packs whose accuracy was
 *     MEASURED in research: CER 0.000 clean ben/hin print, 0.026
 *     degraded Hindi print — see research PHASE2-SCAN.md §2)
 *
 * Usage:
 *   OCR_DATA_DIR=/path/to/raw-fast-traineddata node scripts/copy-ocr-assets.mjs
 * where OCR_DATA_DIR holds ben.traineddata / hin.traineddata /
 * eng.traineddata (raw, uncompressed tessdata_fast files). The script
 * gzips them into public/ocr/ (tesseract.js fetches *.traineddata.gz).
 * Core + worker come from node_modules, so run `npm install` first.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'ocr');
fs.mkdirSync(outDir, { recursive: true });

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
const copied = [];

function copy(src, destName) {
  if (!fs.existsSync(src)) throw new Error(`missing source: ${src}`);
  const buf = fs.readFileSync(src);
  fs.writeFileSync(path.join(outDir, destName), buf);
  copied.push(`${destName}  ${(buf.length / 1024).toFixed(0)} KiB  sha256:${sha(buf)}`);
}

/* Worker script (tesseract.js dist). */
copy(path.join(root, 'node_modules/tesseract.js/dist/worker.min.js'), 'worker.min.js');

/* LSTM core variants — with OEM LSTM_ONLY the worker importScripts
 * exactly one of these (plain / simd / relaxedsimd by CPU probe). */
const coreDir = path.join(root, 'node_modules/tesseract.js-core');
for (const variant of ['lstm', 'simd-lstm', 'relaxedsimd-lstm']) {
  copy(path.join(coreDir, `tesseract-core-${variant}.wasm.js`), `tesseract-core-${variant}.wasm.js`);
  copy(path.join(coreDir, `tesseract-core-${variant}.wasm`), `tesseract-core-${variant}.wasm`);
}

/* Language packs: raw tessdata_fast → .traineddata.gz. Source order:
   1. OCR_DATA_DIR (local regeneration with hand-verified files);
   2. CI fallback — download the pinned tessdata_fast files directly.
      A download failure WARNS and continues (exit 0): a missing pack
      degrades the scan door honestly at runtime, but must never take
      the whole production build down with it. */
const dataDir = process.env.OCR_DATA_DIR;
async function fetchRaw(lang) {
  const url = `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/${lang}.traineddata`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
const raws = {};
let packSource = dataDir ? `OCR_DATA_DIR (${dataDir})` : 'tessdata_fast download';
for (const lang of ['ben', 'hin', 'eng']) {
  try {
    raws[lang] = dataDir
      ? fs.readFileSync(path.join(dataDir, `${lang}.traineddata`))
      : await fetchRaw(lang);
  } catch (e) {
    console.warn(`[ocr-pack] WARNING: could not obtain ${lang}.traineddata (${e.message}). Scan for this language will be unavailable until the pack is provided.`);
  }
}
for (const lang of ['ben', 'hin', 'eng']) {
  const raw = raws[lang];
  if (!raw) continue;
  const gz = zlib.gzipSync(raw, { level: 9 });
  fs.writeFileSync(path.join(outDir, `${lang}.traineddata.gz`), gz);
  copied.push(`${lang}.traineddata.gz  ${(gz.length / 1024).toFixed(0)} KiB (raw ${(raw.length / 1024).toFixed(0)} KiB)  sha256:${sha(raw)}`);
}

console.log(`Reading Pack → public/ocr/ (language source: ${packSource})`);
for (const line of copied) console.log('  ' + line);
