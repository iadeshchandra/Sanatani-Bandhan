/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva — row analysis: defaults (disclosed), derivation,  */
/* dedupe. Pure. Runs when a row is added AND again at review/commit,  */
/* so a batch drafted yesterday is judged against today's records.     */
/*                                                                     */
/* Dedupe philosophy (from the research):                            */
/*  - Exact keys (phone, ear-tag) may mark a hard duplicate.           */
/*  - Soft matches (name+gotra, cow name+age) NEVER auto-merge —      */
/*    they become needs_fix for a human reviewer to decide.            */
/*  - For donors, a phone match is good news: the gift attaches to     */
/*    the existing person instead of creating a twin record.           */
/* ------------------------------------------------------------------ */

import type { BahiTarget, ImportRow, RowState } from './types';
import { isUsablePhoneKey, phoneKey, resolveAgeArrival } from './normalize';

export interface ExistingPerson {
  id: string;
  fullName?: string;
  name?: string;
  phone?: string;
  gotra?: string;
}

export interface ExistingNandiLike {
  id: string;
  name: string;
  tagId: string;
  ageYears: number;
}

export interface AnalyzeContext {
  existingMembers: ExistingPerson[];
  existingHerd: ExistingNandiLike[];
  /** Rows already accepted into this batch before the one being judged. */
  priorRows: ImportRow[];
}

export interface RowAnalysis {
  mapped: Record<string, any>;
  state: RowState;
  issues: string[];
  defaultedFields: string[];
}

const personName = (p: ExistingPerson) => (p.fullName || p.name || '').trim();
const normText = (s: any) => String(s || '').trim().toLowerCase();

/* --------------------------- herd rules ----------------------------- */

/** Next tag in the herd's own sequence: GM-0042 → GM-0043. Looks at
 *  existing herd tags and tags already handed out in this batch. */
export function nextTagId(existingTags: string[]): string {
  let prefix = 'GM';
  let max = 0;
  let width = 4;
  for (const t of existingTags) {
    const m = String(t || '').trim().match(/^([A-Za-z]+)-(\d+)$/);
    if (!m) continue;
    const n = Number(m[2]);
    if (n >= max) { max = n; prefix = m[1].toUpperCase(); width = Math.max(4, m[2].length); }
  }
  return `${prefix}-${String(max + 1).padStart(width, '0')}`;
}

/**
 * Status is DERIVED, never asked — paper registers almost never record
 * it. Adult cow → milking; calf → vatsa; everything else → dry.
 * The reviewer can flip it later in the herd desk; the derivation is
 * disclosed via defaultedFields so nobody mistakes it for a fact.
 */
export function deriveHerdStatus(sex: string, ageYears: number | null): string {
  if (sex === 'vatsa') return 'vatsa';
  if (sex === 'cow') {
    if (ageYears !== null && ageYears < 2) return 'vatsa';
    return 'milking';
  }
  return 'dry';
}

/* ------------------------- shared person logic ---------------------- */

function personIssues(
  mapped: Record<string, any>,
  ctx: AnalyzeContext,
  forDonor: boolean
): { state: RowState; issues: string[] } {
  const issues: string[] = [];
  let state: RowState = 'ok';

  const name = String(mapped.fullName || '').trim();
  if (!name) {
    issues.push('Name is missing — the paper surely has one; please check the page.');
    return { state: 'needs_fix', issues };
  }

  const key = mapped.phone ? phoneKey(mapped.phone) : '';
  if (mapped.phone && !isUsablePhoneKey(key)) {
    issues.push(
      `Phone looks short — ${key.length} numbers after cleaning, a full number has 10. Check the page.`
    );
    state = 'needs_fix';
  }

  if (key && isUsablePhoneKey(key)) {
    const hitExisting = ctx.existingMembers.find((p) => p.phone && phoneKey(p.phone) === key);
    if (hitExisting) {
      if (forDonor) {
        mapped.attachToId = hitExisting.id;
        issues.push(`This is ${personName(hitExisting)} from the directory — the gift will attach to them, no new person created.`);
      } else {
        issues.push(`Phone already in the directory — ${personName(hitExisting)}. Same person? If yes, keep this row out.`);
        state = 'duplicate';
      }
    }
    const hitBatch = ctx.priorRows.find(
      (r) => r.state !== 'excluded' && r.mapped.phone && phoneKey(r.mapped.phone) === key
    );
    if (hitBatch && state !== 'duplicate') {
      issues.push(
        forDonor
          ? 'Same phone as an earlier row in this batch — if this is the same donor, merge the amounts into one row before approving.'
          : 'Same phone as an earlier row in this batch — likely the same person written twice.'
      );
      state = 'duplicate';
    }
  }

  if (!mapped.phone) {
    // No phone: soft-match on name+gotra only, for a human to decide.
    const gotra = normText(mapped.gotra);
    const soft = ctx.existingMembers.find(
      (p) => normText(personName(p)) === normText(name) && gotra && normText(p.gotra) === gotra
    );
    if (soft) {
      issues.push(`Possible match: ${personName(soft)}, same gotra and no phone on paper — same person? You decide.`);
      state = 'needs_fix';
    } else {
      issues.push('No phone on paper — dedupe could only check name + gotra.');
    }
  }

  return { state, issues };
}

/* ---------------------------- per target ---------------------------- */

function analyzeHerd(mappedIn: Record<string, any>, ctx: AnalyzeContext): RowAnalysis {
  const mapped = { ...mappedIn };
  const issues: string[] = [];
  const defaultedFields: string[] = [];
  let state: RowState = 'ok';

  const name = String(mapped.name || '').trim();
  mapped.name = name;
  if (!name) {
    issues.push('Name is missing — every gai on the page has one.');
    state = 'needs_fix';
  }

  if (!String(mapped.breed || '').trim()) {
    mapped.breed = 'Desi';
    defaultedFields.push('breed');
  }

  // Age / arrival-year honesty: an arrival year never becomes an age.
  const { ageYears, arrivalYear, ageUnknown } = resolveAgeArrival(
    mapped.ageYears !== undefined && mapped.ageYears !== '' ? String(mapped.ageYears) : undefined,
    mapped.arrivalYear !== undefined && mapped.arrivalYear !== '' ? String(mapped.arrivalYear) : undefined
  );
  mapped.ageYears = ageYears; // number | null
  mapped.arrivalYear = arrivalYear;
  mapped.ageUnknown = ageUnknown;
  if (ageUnknown) defaultedFields.push('ageYears');

  const sex = String(mapped.sex || '');
  if (!sex) {
    issues.push('Gai, shar or bachhda? The paper usually implies it — please pick.');
    state = 'needs_fix';
  }

  // Status derived, never asked.
  if (!mapped.status) {
    mapped.status = deriveHerdStatus(sex, ageYears);
    defaultedFields.push('status');
  }

  // Tag: exact key. Absent → auto-assign next in sequence + flag.
  const tag = String(mapped.tagId || '').trim();
  if (tag) {
    mapped.tagId = tag;
    const hitExisting = ctx.existingHerd.find((n) => normText(n.tagId) === normText(tag));
    if (hitExisting) {
      issues.push(`Tag ${tag} is already in the herd — ${hitExisting.name}. Same gai? If yes, keep this row out.`);
      state = 'duplicate';
    }
    const hitBatch = ctx.priorRows.find(
      (r) => r.state !== 'excluded' && normText(r.mapped.tagId) === normText(tag)
    );
    if (hitBatch && state !== 'duplicate') {
      issues.push(`Tag ${tag} was already used in this batch — two gai cannot share one ear-tag.`);
      state = 'duplicate';
    }
  } else {
    const used = [
      ...ctx.existingHerd.map((n) => n.tagId),
      ...ctx.priorRows.map((r) => String(r.mapped.tagId || '')).filter(Boolean),
    ];
    mapped.tagId = nextTagId(used);
    mapped.tagAutoAssigned = true;
    defaultedFields.push('tagId');
    issues.push(`No tag on paper — ${mapped.tagId} assigned. Please paint/attach this tag to the gai.`);
  }

  // Soft match: same name and near age — a human decides (cow names
  // repeat across generations; never auto-merge cattle on name alone).
  if (state === 'ok' && name) {
    const soft = ctx.existingHerd.find(
      (n) =>
        normText(n.name) === normText(name) &&
        (ageYears === null || Math.abs((n.ageYears ?? -99) - ageYears) <= 1)
    );
    if (soft) {
      issues.push(`A “${soft.name}”${ageYears !== null ? `, ~${ageYears}` : ''} is already in the herd — same gai? You decide.`);
      state = 'needs_fix';
    }
  }

  return { mapped, state, issues, defaultedFields };
}

function analyzeMembers(mappedIn: Record<string, any>, ctx: AnalyzeContext): RowAnalysis {
  const mapped = { ...mappedIn };
  const defaultedFields: string[] = [];
  if (!String(mapped.gotra || '').trim()) {
    // csvEngine's long-standing default — kept, but DISCLOSED in review.
    mapped.gotra = 'Kashyapa';
    defaultedFields.push('gotra');
  }
  if (!String(mapped.sevaTier || '').trim()) mapped.sevaTier = 'Sadharan';
  const { state, issues } = personIssues(mapped, ctx, false);
  return { mapped, state, issues, defaultedFields };
}

function analyzeDonors(mappedIn: Record<string, any>, ctx: AnalyzeContext): RowAnalysis {
  const mapped = { ...mappedIn };
  const defaultedFields: string[] = [];
  if (!String(mapped.gotra || '').trim()) {
    mapped.gotra = 'Kashyapa';
    defaultedFields.push('gotra');
  }
  const { state, issues } = personIssues(mapped, ctx, true);
  let finalState = state;

  const lifetime = typeof mapped.lifetimeDonated === 'number' ? mapped.lifetimeDonated : 0;
  const lineAmount = typeof mapped.donationAmount === 'number' ? mapped.donationAmount : 0;
  if (finalState === 'ok' && lifetime <= 0 && lineAmount <= 0) {
    issues.push('No amount on this row — neither a lifetime total nor a gift. Check the page.');
    finalState = 'needs_fix';
  }

  // Same date + amount + name repeated inside one batch: registers
  // genuinely repeat amounts, so this is a warning, not a block.
  if (lineAmount > 0 && mapped.donationDate) {
    const twin = ctx.priorRows.find(
      (r) =>
        r.state !== 'excluded' &&
        r.mapped.donationAmount === lineAmount &&
        r.mapped.donationDate === mapped.donationDate &&
        normText(r.mapped.fullName) === normText(mapped.fullName)
    );
    if (twin) {
      issues.push('Same date + amount as an earlier row — registers do repeat; please confirm this is a separate gift.');
    }
  }

  return { mapped, state: finalState, issues, defaultedFields };
}

/* ------------------------------ public ------------------------------ */

export function analyzeRow(
  target: BahiTarget,
  mappedIn: Record<string, any>,
  ctx: AnalyzeContext
): RowAnalysis {
  switch (target) {
    case 'herd': return analyzeHerd(mappedIn, ctx);
    case 'donors': return analyzeDonors(mappedIn, ctx);
    default: return analyzeMembers(mappedIn, ctx);
  }
}

/** Analyze a whole list of mapped row-values in order (each row is
 *  judged against the rows before it). Returns fresh ImportRows. */
export function analyzeRows(
  target: BahiTarget,
  items: { raw: Record<string, string>; mapped: Record<string, any>; pageNo: number }[],
  base: Omit<AnalyzeContext, 'priorRows'>,
  idPrefix: string
): ImportRow[] {
  const rows: ImportRow[] = [];
  items.forEach((item, i) => {
    const a = analyzeRow(target, item.mapped, { ...base, priorRows: rows });
    rows.push({
      rowId: `${idPrefix}_${i}_${Math.random().toString(36).slice(2, 8)}`,
      pageNo: item.pageNo,
      raw: item.raw,
      mapped: a.mapped,
      state: a.state,
      issues: a.issues,
      defaultedFields: a.defaultedFields,
      approved: a.state === 'ok',
    });
  });
  return rows;
}

/** Re-judge ONE row against a context (used after a reviewer edit). */
export function reanalyzeRow(
  target: BahiTarget,
  row: ImportRow,
  ctx: AnalyzeContext
): ImportRow {
  const a = analyzeRow(target, row.mapped, ctx);
  return {
    ...row,
    mapped: a.mapped,
    state: row.state === 'excluded' ? 'excluded' : a.state,
    issues: a.issues,
    defaultedFields: a.defaultedFields,
    approved:
      row.state === 'excluded'
        ? false
        : a.state === 'ok'
          ? row.state === 'ok'
            ? row.approved
            : true // freshly fixed → include by default
          : false,
  };
}

/** "gotra assumed Kashyapa — 6 rows": per-field counts + the value the
 *  first affected row carries, for the review disclosure line. */
export function defaultedSummary(
  rows: ImportRow[]
): { field: string; count: number; value: string }[] {
  const byField = new Map<string, { count: number; value: string }>();
  for (const r of rows) {
    if (r.state === 'excluded') continue;
    for (const f of r.defaultedFields) {
      const cur = byField.get(f);
      if (cur) cur.count++;
      else byField.set(f, { count: 1, value: String(r.mapped[f] ?? '') });
    }
  }
  return Array.from(byField.entries()).map(([field, v]) => ({ field, ...v }));
}
