/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — OCR output → Phase 1 draft rows. Pure.    */
/*                                                                     */
/* Lines from the engine are assigned to the Register Profile's        */
/* columns by word position; each line becomes one draft row through   */
/* the SAME funnel typed/CSV rows use (buildMappedFromFields →          */
/* analyzeRows), with per-cell OCR provenance attached. Rows enter a    */
/* Phase 1 batch as drafts — scanning changes nothing about the        */
/* two-key law: entry is wide, commit needs the approver.              */
/*                                                                     */
/* Band streaming: a floor phone reads a page in horizontal bands.     */
/* Bands accumulate in a small reducer; the capture screen shows       */
/* lines as they land, and batch rows are materialized ONCE when the   */
/* page completes (stable row ids, correct cross-row dedupe).         */
/* ------------------------------------------------------------------ */

import type {
  BahiTarget, ImportRow, RegisterProfile, ScanCell, ScanCellBox,
} from '../types';
import { TARGET_FIELDS } from '../types';
import { analyzeRows, type AnalyzeContext } from '../dedupe';
import { buildMappedFromFields, coerceEnumWords } from '../mapping';
import { classifyCell, fieldKindOf } from './cellConfidence';
import { acceptRate, columnIndexForX } from './registerProfile';
import { bestProposal, isClosedVocabField } from './corrections';

export interface OcrSymbol { text: string; confidence: number }
export interface OcrWord {
  text: string;
  confidence: number;
  /** Pixel bbox in the working image. */
  bbox: ScanCellBox;
  symbols?: OcrSymbol[];
}
export interface OcrLine { words: OcrWord[]; bbox: ScanCellBox }
export interface OcrBand { bandIndex: number; lines: OcrLine[] }

/* --------------------------- band streaming ------------------------- */

export interface BandStream {
  totalBands: number;
  doneBands: number;
  /** Lines accumulated so far, in PAGE order (bands may land in any
   *  order; the stream re-orders and ignores repeats). */
  lines: OcrLine[];
  complete: boolean;
  /** Band indexes already applied, ascending. */
  seen: number[];
  /** Lines per band, keyed by band index. */
  byBand: Record<number, OcrLine[]>;
}

export function createBandStream(totalBands: number): BandStream {
  return {
    totalBands, doneBands: 0, lines: [],
    complete: totalBands <= 0, seen: [], byBand: {},
  };
}

/** Immutable step: one band's lines land. Idempotent per band index —
 *  a repeated callback can never duplicate rows or inflate progress. */
export function applyBand(stream: BandStream, band: OcrBand): BandStream {
  if (stream.seen.includes(band.bandIndex)) return stream;
  const byBand = { ...stream.byBand, [band.bandIndex]: band.lines };
  const seen = [...stream.seen, band.bandIndex].sort((a, b) => a - b);
  return {
    totalBands: stream.totalBands,
    doneBands: seen.length,
    lines: seen.flatMap((i) => byBand[i]),
    complete: seen.length >= stream.totalBands,
    seen,
    byBand,
  };
}

/* ----------------------------- geometry ----------------------------- */

export function unionBox(boxes: ScanCellBox[]): ScanCellBox | undefined {
  if (!boxes.length) return undefined;
  return {
    x0: Math.min(...boxes.map((b) => b.x0)),
    y0: Math.min(...boxes.map((b) => b.y0)),
    x1: Math.max(...boxes.map((b) => b.x1)),
    y1: Math.max(...boxes.map((b) => b.y1)),
  };
}

/** Pixel box → page-relative fractions (review renders highlights in
 *  % over the photo, independent of which image size it displays). */
export function toFracBox(box: ScanCellBox, imgW: number, imgH: number): ScanCellBox {
  if (!imgW || !imgH) return { x0: 0, y0: 0, x1: 0, y1: 0 };
  const c = (v: number) => Math.min(1, Math.max(0, v));
  return {
    x0: c(box.x0 / imgW), y0: c(box.y0 / imgH),
    x1: c(box.x1 / imgW), y1: c(box.y1 / imgH),
  };
}

/* ------------------------- line → field cells ------------------------ */

export interface LineCell {
  text: string;
  confidence: number;
  minSymbolConfidence?: number;
  bbox?: ScanCellBox; // fractions
  words: OcrWord[];
}

/**
 * Split one OCR line into per-field cells.
 * With a profile: words join the column their centre-x falls in.
 * Without: the whole line lands in the target's name field — the
 * skeleton a human completes against the photo (the handwriting path).
 */
export function lineToCells(
  line: OcrLine,
  profile: RegisterProfile | null,
  target: BahiTarget,
  imgW: number,
  imgH: number
): Record<string, LineCell> {
  const cells: Record<string, LineCell> = {};
  const push = (field: string, w: OcrWord) => {
    const cur = cells[field] || { text: '', confidence: 0, words: [] };
    cur.words.push(w);
    cells[field] = cur;
  };

  if (profile && profile.columns.some((c) => c.field)) {
    for (const w of line.words) {
      if (!w.text.trim()) continue;
      const cx = imgW ? (w.bbox.x0 + w.bbox.x1) / 2 / imgW : 0;
      const idx = columnIndexForX(profile.columns, cx);
      if (idx < 0) continue;
      const field = profile.columns[idx].field;
      if (!field) continue;
      push(field, w);
    }
  } else {
    const nameField = target === 'herd' ? 'name' : 'fullName';
    for (const w of line.words) if (w.text.trim()) push(nameField, w);
  }

  for (const [field, cell] of Object.entries(cells)) {
    cell.text = cell.words.map((w) => w.text).join(' ').trim();
    cell.confidence = cell.words.length
      ? Math.round(cell.words.reduce((s, w) => s + w.confidence, 0) / cell.words.length)
      : 0;
    const symConf: number[] = [];
    for (const w of cell.words) for (const s of w.symbols || []) symConf.push(s.confidence);
    if (symConf.length) cell.minSymbolConfidence = Math.min(...symConf);
    const u = unionBox(cell.words.map((w) => w.bbox));
    if (u) cell.bbox = toFracBox(u, imgW, imgH);
    cells[field] = cell;
  }
  return cells;
}

/* --------------------------- lines → rows ---------------------------- */

export interface RowsFromLinesArgs {
  target: BahiTarget;
  lines: OcrLine[];
  profile: RegisterProfile | null;
  imgW: number;
  imgH: number;
  pageNo: number;
  /** Closed-vocabulary dictionaries per field (org's own words). */
  dictionaries: Record<string, string[]>;
  base: Omit<AnalyzeContext, 'priorRows'>;
  idPrefix: string;
}

/**
 * Materialize a completed page's lines into analyzed draft rows with
 * scan cells attached. Empty lines (rulers, page furniture) are
 * dropped: a line whose every cell is empty never becomes a row.
 */
export function rowsForPage(args: RowsFromLinesArgs): ImportRow[] {
  const { target, lines, profile, imgW, imgH, pageNo, dictionaries, base, idPrefix } = args;
  const enumValuesFor = (field: string): string[] | undefined =>
    TARGET_FIELDS[target].find((f) => f.key === field)?.options?.map((o) => o.value);

  const perLine: { raw: Record<string, string>; mapped: Record<string, any>; cells: Record<string, LineCell> }[] = [];
  for (const line of lines) {
    const cells = lineToCells(line, profile, target, imgW, imgH);
    const fields: Record<string, string> = {};
    for (const [field, cell] of Object.entries(cells)) fields[field] = cell.text;
    if (!Object.values(fields).some((v) => v.trim())) continue;
    const mapped = coerceEnumWords(target, buildMappedFromFields(target, fields));
    perLine.push({ raw: fields, mapped, cells });
  }

  const rows = analyzeRows(
    target,
    perLine.map((p) => ({ raw: p.raw, mapped: p.mapped, pageNo })),
    base,
    idPrefix
  );

  // Attach confidence cells (analysis may have rewritten values; the
  // cells describe what the MACHINE read, which is what review judges).
  rows.forEach((row, i) => {
    const src = perLine[i];
    if (!src) return;
    const scanCells: Record<string, ScanCell> = {};
    for (const [field, cell] of Object.entries(src.cells)) {
      const kind = fieldKindOf(target, field);
      const verdict = classifyCell({
        field,
        kind,
        ocrConfidence: cell.confidence,
        minSymbolConfidence: cell.minSymbolConfidence,
        text: cell.text,
        enumValues: kind === 'enum' ? enumValuesFor(field) : undefined,
        dictionary: dictionaries[field],
        profileAcceptRate: profile ? acceptRate(profile, field) : null,
      });
      const proposal = isClosedVocabField(target, field)
        ? bestProposal(cell.text, dictionaries[field] || [], profile?.learnedPairs[field])
        : null;
      scanCells[field] = {
        text: cell.text,
        confidence: verdict.score,
        cls: verdict.cls,
        reasons: verdict.reasons,
        bbox: cell.bbox,
        ...(proposal ? { proposal } : {}),
      };
    }
    row.cells = scanCells;
  });

  return rows;
}
