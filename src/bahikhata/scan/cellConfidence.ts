/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — cell confidence. Pure.                    */
/*                                                                     */
/* A cell's colour = OCR confidence × deterministic validation. The    */
/* OCR alone is never trusted with fiduciary values: in the research   */
/* runs a smudged page's ११०० (1100) was read as "86," — confidently    */
/* wrong. So amounts and phone numbers are RED-CLASS BY LAW: a human   */
/* must touch them before the row can commit, whatever the engine      */
/* claims. Names are never auto-changed (a near-name may be another    */
/* person); only closed vocabularies earn correction proposals.        */
/* ------------------------------------------------------------------ */

import type { FieldKind, ImportRow, ScanCell } from '../types';
import { TARGET_FIELDS } from '../types';
import { isUsablePhoneKey, parseAmount, parseCount, parseRegisterDate, parseYear, phoneKey } from '../normalize';

export type CellClass = 'green' | 'amber' | 'red';

export interface CellInput {
  field: string;
  kind: FieldKind;
  /** Mean word confidence 0..100 from the engine. */
  ocrConfidence: number;
  /** Lowest per-symbol confidence in the cell, when the engine gives it. */
  minSymbolConfidence?: number;
  /** The raw text read. */
  text: string;
  /** Enum option values (kind 'enum') after word coercion. */
  enumValues?: string[];
  /** Closed-vocabulary dictionary for this field, if one exists. */
  dictionary?: string[];
  /** The profile's learned accept rate for this field (0..1 | null). */
  profileAcceptRate?: number | null;
}

export interface CellVerdict {
  cls: CellClass;
  /** Blended score 0..100 (display + threshold audit). */
  score: number;
  reasons: string[];
  /** True when a closed-vocabulary near-match exists (proposal lives
   *  in corrections.ts — this flag only drives the colour). */
  nearDictionary?: boolean;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Small Levenshtein, shared with corrections.ts. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

function dictionaryState(
  text: string,
  dictionary: string[]
): 'hit' | 'near' | 'miss' {
  const t = norm(text);
  if (!t) return 'miss';
  let near = false;
  for (const entry of dictionary) {
    const e = norm(entry);
    if (e === t) return 'hit';
    const maxD = Math.max(1, Math.floor(Math.max(t.length, e.length) / 4));
    if (editDistance(t, e) <= maxD) near = true;
  }
  return near ? 'near' : 'miss';
}

export function classifyCell(input: CellInput): CellVerdict {
  const reasons: string[] = [];
  const text = (input.text || '').trim();

  // Blend: mean word confidence tempered by the weakest symbol — one
  // bad digit in an amount is exactly the failure we defend against.
  let score = input.minSymbolConfidence !== undefined
    ? Math.round(input.ocrConfidence * 0.7 + input.minSymbolConfidence * 0.3)
    : Math.round(input.ocrConfidence);

  // LAW: money and phone cells are always human-confirmed.
  if (input.kind === 'amount' || input.kind === 'phone') {
    if (input.kind === 'phone' && text) {
      const key = phoneKey(text);
      if (!isUsablePhoneKey(key)) {
        reasons.push(`Phone looks short — ${key.length} numbers read, a full number has 10. Please check the page.`);
      } else {
        reasons.push('Phone numbers are always checked by a person — one wrong digit reaches the wrong family.');
      }
    }
    if (input.kind === 'amount' && text) {
      if (parseAmount(text) === null) {
        reasons.push('This amount could not be read as a number at all — please type it from the page.');
      } else {
        reasons.push('Amounts are always checked by a person — the machine once read 1100 as 86.');
      }
    }
    if (!text) reasons.push('Nothing was read here — type it from the page if the register has it.');
    return { cls: 'red', score, reasons };
  }

  if (!text) {
    return { cls: 'amber', score, reasons: ['Nothing was read in this column — fine if the paper is blank there.'] };
  }

  let cls: CellClass = score >= 85 ? 'green' : score >= 60 ? 'amber' : 'red';
  if (cls !== 'green') {
    reasons.push(score < 60
      ? 'The reading is unsure of this word — please compare with the photo.'
      : 'The reading is fairly sure, but a quick look is wise.');
  }

  const downgrade = (to: CellClass, why: string) => {
    if (to === 'red' || (to === 'amber' && cls === 'green')) cls = to;
    reasons.push(why);
  };

  switch (input.kind) {
    // 'amount' and 'phone' returned above (the always-red law).
    case 'number': {
      const n = parseCount(text);
      if (n === null) downgrade('red', 'This should be a plain number but does not read as one.');
      else if (n > 110) downgrade('amber', `The number ${n} looks too large for this column — check the page.`);
      break;
    }
    case 'year': {
      if (parseYear(text) === null) downgrade('amber', 'This does not look like a year — check the page.');
      break;
    }
    case 'date': {
      if (parseRegisterDate(text) === null) downgrade('red', 'This date could not be understood — please type it as day/month/year.');
      break;
    }
    case 'enum': {
      const values = input.enumValues || [];
      if (values.length && !values.includes(text)) {
        downgrade('red', 'This word is not one of the choices for this column — the column may be mis-mapped or misread.');
      }
      break;
    }
    case 'picklist': {
      if (input.dictionary && input.dictionary.length) {
        const st = dictionaryState(text, input.dictionary);
        if (st === 'near') {
          downgrade('amber', 'Close to a word in your own lists — a correction is suggested below.');
          return { cls, score, reasons, nearDictionary: true };
        }
        if (st === 'miss') downgrade('amber', 'Not in your lists yet — fine for a new entry, worth one look.');
      }
      break;
    }
    default:
      break; // text: confidence only — names are never second-guessed
  }

  // Correction learning: a column this writer's hand makes hard gets
  // capped at amber until its record improves.
  if (input.profileAcceptRate !== null && input.profileAcceptRate !== undefined
      && input.profileAcceptRate < 0.5 && cls === 'green') {
    cls = 'amber';
    reasons.push('This column has needed many fixes in this book — one look, please.');
  }

  return { cls, score, reasons };
}

/** The field kind for a target field key (defaults to 'text'). */
export function fieldKindOf(target: keyof typeof TARGET_FIELDS, field: string): FieldKind {
  const def = TARGET_FIELDS[target].find((f) => f.key === field);
  return def ? def.kind : 'text';
}

/* --------------------- review-time cell helpers --------------------- */

/** Red cells a human has not yet vouched for. Commit is forbidden
 *  while any approved row carries one. */
export function unconfirmedRedCells(row: ImportRow): string[] {
  if (!row.cells) return [];
  return Object.entries(row.cells)
    .filter(([, c]) => c.cls === 'red' && !c.confirmed)
    .map(([field]) => field);
}

export function rowHasUnconfirmedRed(row: ImportRow): boolean {
  return unconfirmedRedCells(row).length > 0;
}

/** The reviewer has compared this cell with the paper and vouches
 *  for the current value (immutable row update). */
export function confirmCell(row: ImportRow, field: string): ImportRow {
  if (!row.cells || !row.cells[field]) return row;
  return {
    ...row,
    cells: {
      ...row.cells,
      [field]: { ...row.cells[field], confirmed: true, touched: true },
    },
  };
}

/** Attach/replace one cell record (immutable row update). */
export function withCell(row: ImportRow, field: string, cell: ScanCell): ImportRow {
  return { ...row, cells: { ...(row.cells || {}), [field]: cell } };
}
