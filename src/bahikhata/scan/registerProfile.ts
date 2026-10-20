/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — Register Profiles (layout learning).      */
/* Pure.                                                               */
/*                                                                     */
/* Registers are repetitive: page 2 has page 1's columns. Page 1 is    */
/* OCR'd whole; the words' x-positions cluster into column candidates; */
/* the entrant names each column ONCE ("this one is the phone"); the   */
/* profile then assigns every later page's words to fields by          */
/* position, and per-column validators catch mis-assignments loudly.   */
/*                                                                     */
/* Learning is local and explainable: per-field accept rates and       */
/* recurring raw→fixed pairs. No black box — the review screen can     */
/* always say why a cell is amber.                                     */
/* ------------------------------------------------------------------ */

import type { BahiTarget, ColumnRegion, RegisterProfile, ScanScript } from '../types';

export interface WordBoxLike {
  text: string;
  confidence: number;
  /** Pixel bbox in the OCR working image. */
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/**
 * Cluster word x-centres into column candidates.
 * Bins centres into a 100-bin histogram over page width; a column is a
 * run of occupied bins separated from the next run by a genuine gap
 * (≥ 4 empty bins ≈ 4% of page width — narrower gaps are intra-column
 * spacing, e.g. between a name's two words). Region edges are padded
 * half a gap on each side so edge words land inside their column.
 */
export function clusterWordColumns(
  words: WordBoxLike[],
  imgW: number,
  imgH: number,
  headerSkipFrac = 0
): ColumnRegion[] {
  if (!imgW || !words.length) return [];
  const BINS = 100;
  const occupied = new Array<boolean>(BINS).fill(false);
  for (const w of words) {
    if (imgH && w.bbox.y0 / imgH < headerSkipFrac) continue;
    const cx = ((w.bbox.x0 + w.bbox.x1) / 2 / imgW) * BINS;
    const b = Math.min(BINS - 1, Math.max(0, Math.floor(cx)));
    occupied[b] = true;
  }
  const MIN_GAP = 4;
  const regions: ColumnRegion[] = [];
  let runStart: number | null = null;
  let gap = 0;
  const closeRun = (endBin: number) => {
    if (runStart === null) return;
    regions.push({
      field: '',
      x0: Math.max(0, (runStart - MIN_GAP / 2) / BINS),
      x1: Math.min(1, (endBin + MIN_GAP / 2) / BINS),
    });
    runStart = null;
  };
  for (let b = 0; b < BINS; b++) {
    if (occupied[b]) {
      if (runStart === null) runStart = b;
      gap = 0;
    } else if (runStart !== null) {
      gap++;
      if (gap >= MIN_GAP) { closeRun(b - gap); gap = 0; }
    }
  }
  if (runStart !== null) closeRun(BINS - 1);
  return regions;
}

/** Assign a word to a column by its centre-x fraction. -1 = outside
 *  every column (margin notes, page numbers — ignored by design). */
export function columnIndexForX(columns: ColumnRegion[], xFrac: number): number {
  for (let i = 0; i < columns.length; i++) {
    if (xFrac >= columns[i].x0 && xFrac < columns[i].x1) return i;
  }
  // Nearest column when the word straddles a boundary gap.
  let best = -1;
  let bestDist = Infinity;
  columns.forEach((c, i) => {
    const d = xFrac < c.x0 ? c.x0 - xFrac : xFrac - c.x1;
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return bestDist <= 0.03 ? best : -1;
}

export function makeProfile(args: {
  workspaceId: string;
  target: BahiTarget;
  label: string;
  script: ScanScript;
  columns: ColumnRegion[];
  headerRowSkip?: number;
  writerStyle?: RegisterProfile['writerStyle'];
}): RegisterProfile {
  const now = Date.now();
  return {
    id: `bkp_${now.toString(36)}${Math.floor(Math.random() * 1e5).toString(36)}`,
    workspaceId: args.workspaceId,
    target: args.target,
    label: args.label,
    script: args.script,
    columns: args.columns,
    headerRowSkip: args.headerRowSkip ?? 0,
    writerStyle: args.writerStyle ?? 'print',
    createdAt: now,
    updatedAt: now,
    fieldStats: {},
    learnedPairs: {},
  };
}

/** The profile's learned accept rate for a field (0..1), or null when
 *  too little history exists to judge (< 5 outcomes). */
export function acceptRate(profile: RegisterProfile, field: string): number | null {
  const s = profile.fieldStats[field];
  if (!s || s.seen < 5) return null;
  return s.accepted / s.seen;
}

/** Record one reviewer outcome for a field (immutable update). */
export function noteFieldOutcome(
  profile: RegisterProfile,
  field: string,
  accepted: boolean
): RegisterProfile {
  const cur = profile.fieldStats[field] || { seen: 0, accepted: 0 };
  return {
    ...profile,
    fieldStats: {
      ...profile.fieldStats,
      [field]: { seen: cur.seen + 1, accepted: cur.accepted + (accepted ? 1 : 0) },
    },
  };
}

/** Record a recurring correction for a closed vocabulary (immutable). */
export function learnPair(
  profile: RegisterProfile,
  field: string,
  rawText: string,
  fixedText: string
): RegisterProfile {
  const key = rawText.trim().toLowerCase();
  if (!key || key === fixedText.trim().toLowerCase()) return profile;
  return {
    ...profile,
    learnedPairs: {
      ...profile.learnedPairs,
      [field]: { ...(profile.learnedPairs[field] || {}), [key]: fixedText },
    },
  };
}
