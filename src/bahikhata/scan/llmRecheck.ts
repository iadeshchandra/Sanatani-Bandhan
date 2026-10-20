/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — the AI re-check (WebLLM, on-device).      */
/*                                                                     */
/* Owner addendum 2026-10-20: this layer is CORE, not a garnish.       */
/* After OCR + deterministic validators, the on-device model receives  */
/* each row WITH its dictionary context (the org's own village /       */
/* gotra / breed word-lists + which cells the validators flagged) and  */
/* proposes corrections. Proposals render diff-style in the review;    */
/* the reviewer accepts per cell; NOTHING auto-applies — the filter    */
/* below additionally enforces the constraints locally, so a prompt    */
/* failure or a hallucinating model cannot smuggle a value in:         */
/*   - closed-vocabulary fields: suggestion must BE a dictionary       */
/*     member (the canonical spelling is what lands);                  */
/*   - amount fields: suggestion must parse as an amount;              */
/*   - phone fields: suggestion must be a usable phone key;            */
/*   - only cells the validators did NOT pass as green are eligible.   */
/*                                                                     */
/* Gating (capabilities.ts): no WebGPU (iPhones, floor Android) →      */
/* the rung simply does not exist in the UI — no shame, no dead end;   */
/* the validators + human-confirm flow is complete without it. Model   */
/* not downloaded yet → the scan flow STILL completes end-to-end; the  */
/* download is offered separately (Assistant voice settings) and is    */
/* never a precondition for scanning a page.                           */
/*                                                                     */
/* The engine is reached ONLY through dynamic imports of the existing  */
/* voice stack (single WebLLM gateway law, 2026-10-18) so this module  */
/* adds no bytes to any chunk until a re-check actually runs.          */
/* ------------------------------------------------------------------ */

import type { BahiTarget, ImportRow, ScanCell } from '../types';
import { TARGET_FIELDS } from '../types';
import { isUsablePhoneKey, parseAmount, phoneKey } from '../normalize';
import { isClosedVocabField } from './corrections';

/* ------------------------------ gating ------------------------------ */

export type LlmRecheckGate =
  | { state: 'ready' }
  | { state: 'not-downloaded' }
  | { state: 'unavailable'; reason: string };

export async function llmRecheckGate(): Promise<LlmRecheckGate> {
  try {
    const { probeVoiceCapability, isModelCached } = await import('../../ai/voice/capabilities');
    const cap = await probeVoiceCapability();
    if (cap.status === 'unavailable') {
      return { state: 'unavailable', reason: cap.reason || 'unknown' };
    }
    const cached = await isModelCached();
    return cached ? { state: 'ready' } : { state: 'not-downloaded' };
  } catch {
    return { state: 'unavailable', reason: 'unknown' };
  }
}

/* ------------------------- prompt construction ---------------------- */

/** Which of a row's cells the model may propose fixes for: cells the
 *  pipeline did not pass clean. Typed/CSV rows (no cells) get none —
 *  there is no machine reading for the AI to re-check. */
export function eligibleFields(row: ImportRow): string[] {
  if (!row.cells) return [];
  return Object.entries(row.cells)
    .filter(([, c]) => c.cls !== 'green')
    .map(([field]) => field);
}

const CLS_WORD: Record<ScanCell['cls'], string> = {
  green: 'clear',
  amber: 'unsure',
  red: 'must check',
};

export function buildRecheckPrompt(
  rows: ImportRow[],
  target: BahiTarget,
  dictionaries: Record<string, string[]>
): { role: 'system' | 'user'; content: string }[] | null {
  const views: { row: ImportRow; index: number; eligible: string[] }[] = [];
  rows.forEach((row, index) => {
    const eligible = eligibleFields(row);
    if (eligible.length) views.push({ row, index, eligible });
  });
  if (!views.length) return null;

  const lines: string[] = [];
  for (const { row, index, eligible } of views) {
    lines.push(`ROW ${index} (page ${row.pageNo}) — suggestions wanted only for: ${eligible.join(', ')}`);
    for (const def of TARGET_FIELDS[target]) {
      const cell = row.cells?.[def.key];
      const read = cell ? cell.text : String(row.mapped[def.key] ?? '');
      if (!read && !cell) continue;
      const dict = dictionaries[def.key];
      const dictNote = dict && dict.length && eligible.includes(def.key)
        ? ` [word list: ${dict.slice(0, 40).join(', ')}]`
        : '';
      lines.push(`  ${def.key}: "${read}" (${cell ? CLS_WORD[cell.cls] : 'typed'})${dictNote}`);
    }
  }

  return [
    {
      role: 'system',
      content:
        'You are a careful proofreader for a paper-register digitization tool used by temples and goshalas. ' +
        'You receive rows read by OCR from a handwritten or printed register, with the organisation\'s own word lists. ' +
        'Suggest a correction ONLY when a read value looks wrong. For a field with a word list, your suggestion MUST be exactly one entry from that list. ' +
        'For amount and phone fields, reply with digits only. Never invent a value that neither the row nor a word list supports. ' +
        'Reply with ONLY a JSON object of the form {"fixes":[{"row":0,"field":"breed","value":"Gir"}]} — an empty fixes array if nothing should change. No prose, no markdown.',
    },
    {
      role: 'user',
      content:
        'Rows (only the listed fields of each row may be corrected):\n' +
        lines.join('\n') +
        '\n\nReply with ONLY the JSON object.',
    },
  ];
}

/* --------------------------- output filtering ------------------------ */

export interface LlmFix { row: number; field: string; value: string }

/** Defensive JSON extraction: the model is told to reply with bare
 *  JSON; if it wraps it in prose or code fences, salvage the object. */
export function parseLlmFixes(raw: string): LlmFix[] {
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return [];
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { fixes?: unknown };
    if (!Array.isArray(parsed.fixes)) return [];
    const out: LlmFix[] = [];
    for (const f of parsed.fixes) {
      const fix = f as Partial<LlmFix>;
      if (
        typeof fix.row === 'number' && Number.isInteger(fix.row) &&
        typeof fix.field === 'string' && typeof fix.value === 'string' && fix.value.trim()
      ) {
        out.push({ row: fix.row, field: fix.field, value: fix.value.trim() });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * The constraint enforcement — local, deterministic, total. A
 * suggestion survives only if: the row + field exist, the field was
 * eligible (non-green), the value differs from the read text, and the
 * field's own law accepts it (dictionary membership for closed
 * vocabularies — canonical spelling lands; amount parses; phone is a
 * usable key). Returns rowId → field → suggested value.
 */
export function filterLlmFixes(
  rows: ImportRow[],
  fixes: LlmFix[],
  target: BahiTarget,
  dictionaries: Record<string, string[]>
): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  const kindOf = (field: string) =>
    TARGET_FIELDS[target].find((f) => f.key === field)?.kind;

  for (const fix of fixes) {
    const row = rows[fix.row];
    if (!row || !row.cells) continue;
    const cell = row.cells[fix.field];
    if (!cell || cell.cls === 'green') continue;
    if (fix.value === cell.text) continue;

    let value = fix.value;
    if (isClosedVocabField(target, fix.field)) {
      const dict = dictionaries[fix.field] || [];
      const canonical = dict.find((d) => d.trim().toLowerCase() === fix.value.trim().toLowerCase());
      if (!canonical) continue; // not the org's word → not admissible
      value = canonical;
    } else if (kindOf(fix.field) === 'amount') {
      if (parseAmount(fix.value) === null) continue;
    } else if (kindOf(fix.field) === 'phone') {
      if (!isUsablePhoneKey(phoneKey(fix.value))) continue;
    }
    const cur = out.get(row.rowId) || {};
    cur[fix.field] = value;
    out.set(row.rowId, cur);
  }
  return out;
}

/** Attach filtered suggestions to rows as `llmProposal` (immutable). */
export function attachLlmProposals(
  rows: ImportRow[],
  proposals: Map<string, Record<string, string>>
): ImportRow[] {
  return rows.map((row) => {
    const fields = proposals.get(row.rowId);
    if (!fields || !row.cells) return row;
    const cells = { ...row.cells };
    for (const [field, value] of Object.entries(fields)) {
      if (cells[field]) cells[field] = { ...cells[field], llmProposal: value };
    }
    return { ...row, cells };
  });
}

/* ------------------------------ engine ------------------------------- */

const RECHECK_TIMEOUT_MS = 90_000;
const ROWS_PER_CALL = 8;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('llm-recheck-timeout')), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

/**
 * Run the re-check over a batch's rows. Chunks of rows per call;
 * every failure is swallowed into "no proposals" — the deterministic
 * flow never depends on this layer. Returns NEW row objects with
 * `llmProposal` attached where the model earned a hearing.
 */
export async function applyLlmRecheck(
  rows: ImportRow[],
  target: BahiTarget,
  dictionaries: Record<string, string[]>
): Promise<ImportRow[]> {
  try {
    const gate = await llmRecheckGate();
    if (gate.state !== 'ready') return rows;
    const { getEngine } = await import('../../ai/voice/engine');
    const engine = await getEngine();
    if (!engine) return rows;

    let working = rows;
    for (let start = 0; start < rows.length; start += ROWS_PER_CALL) {
      const chunk = rows.slice(start, start + ROWS_PER_CALL);
      const messages = buildRecheckPrompt(chunk, target, dictionaries);
      if (!messages) continue;
      const res = await withTimeout(
        engine.chat.completions.create({
          messages: messages as { role: 'system' | 'user' | 'assistant'; content: string }[],
          temperature: 0.1,
          max_tokens: 512,
          stream: false,
        }),
        RECHECK_TIMEOUT_MS
      );
      const text = res?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) continue;
      const fixes = parseLlmFixes(text).map((f) => ({ ...f, row: f.row + start }));
      const proposals = filterLlmFixes(rows, fixes, target, dictionaries);
      working = attachLlmProposals(working, proposals);
    }
    return working;
  } catch {
    return rows; // the re-check is an advisor; its failure changes nothing
  }
}
