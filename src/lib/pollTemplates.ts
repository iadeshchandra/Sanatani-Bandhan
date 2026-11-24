/**
 * pollTemplates.ts — POLLS NEXT-LEVEL P2b: poll templates + recurrence.
 * =====================================================================
 * A template is a poll's SHAPE — the question pattern, the options,
 * the audience, the class and its marks — saved per workspace and
 * reused in one step. It carries NO votes, NO results, NO outcome:
 * nothing about any person or any past decision rides in it.
 *
 * Where templates live: on the workspace doc itself, in a
 * `pollTemplates` array field — the workspace doc is where workspace
 * configuration already lives (plan, limits, profile), so no new
 * collection exists for this. Writes are field-pinned in
 * firestore.rules to that one field, for the poll committee
 * (R_BOARD — the same set that may create polls).
 *
 * RECURRENCE IS HONEST: a template (or a poll launched from one)
 * may be marked recurring — monthly, quarterly, yearly. Recurrence
 * here is a one-step RE-RUN: the desk offers "Run again", pre-fills
 * the next round from the last with suggested dates, and a person
 * checks and opens it. There is NO server scheduler on this plan
 * and nothing in this module pretends otherwise — no poll ever
 * opens itself.
 */
import {
  pollHasAbstain,
  pollKind,
  pollRealOptions,
  type PollLike,
} from './pollLogic';

export type PollRecurrence = 'none' | 'monthly' | 'quarterly' | 'yearly';

export const POLL_RECURRENCES: readonly PollRecurrence[] = ['none', 'monthly', 'quarterly', 'yearly'];

export function pollRecurrence(value: unknown): PollRecurrence {
  return value === 'monthly' || value === 'quarterly' || value === 'yearly' ? value : 'none';
}

/** The reusable shape of a poll — everything a template carries. */
export interface PollShape {
  title: string;
  description: string;
  targetAudience: string;
  kind: 'choice' | 'multi' | 'text';
  /** Abstaining enabled (a field on the poll now, never an option). */
  abstain: boolean;
  resultVisibility: string;
  pollClass: 'pulse' | 'decision';
  binding: boolean;
  ballot: 'secret' | 'named';
  quorumPct: number;
  passPct: number;
  /** Real option texts only — abstain is never one of the slots. */
  options: string[];
}

export interface PollTemplate extends PollShape {
  id: string;
  name: string;
  recurrence: PollRecurrence;
  createdAt: number;
  createdByUid: string;
}

/** A fresh template id (client-minted; uniqueness within one workspace's array is all it needs). */
export function newPollTemplateId(now: number): string {
  return `tpl_${now.toString(36)}_${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
}

/** Build a template from a shape (the create form's, or another template's). */
export function templateFromShape(
  shape: PollShape,
  meta: { id: string; name: string; recurrence: PollRecurrence; now: number; uid: string }
): PollTemplate {
  return {
    id: meta.id,
    name: meta.name.trim(),
    title: shape.title.trim(),
    description: shape.description.trim(),
    targetAudience: shape.targetAudience === 'MANAGERS' ? 'MANAGERS' : 'ALL_MEMBERS',
    kind: shape.kind,
    abstain: shape.kind !== 'text' && shape.abstain === true,
    resultVisibility: shape.resultVisibility,
    pollClass: shape.pollClass === 'decision' ? 'decision' : 'pulse',
    binding: shape.pollClass === 'decision' && shape.binding === true,
    ballot: shape.ballot === 'named' ? 'named' : 'secret',
    quorumPct: shape.quorumPct,
    passPct: shape.passPct,
    options: shape.kind === 'text' ? [] : shape.options.map((o) => o.trim()).filter((o) => o.length > 0),
    recurrence: meta.recurrence,
    createdAt: meta.now,
    createdByUid: meta.uid,
  };
}

/** Build a template from a live poll doc (any phase — draft, open, concluded). */
export function templateFromPoll(
  poll: PollLike & { title?: string; description?: string; resultVisibility?: string; binding?: boolean; ballot?: string },
  meta: { id: string; name: string; recurrence: PollRecurrence; now: number; uid: string }
): PollTemplate {
  return templateFromShape(
    {
      title: poll.title || '',
      description: poll.description || '',
      targetAudience: poll.targetAudience || 'ALL_MEMBERS',
      kind: pollKind(poll),
      abstain: pollHasAbstain(poll),
      resultVisibility: poll.resultVisibility || 'afterVote',
      pollClass: poll.pollClass === 'decision' ? 'decision' : 'pulse',
      binding: poll.binding === true,
      ballot: poll.ballot === 'named' ? 'named' : 'secret',
      quorumPct: typeof poll.quorumPct === 'number' ? poll.quorumPct : 25,
      passPct: typeof poll.passPct === 'number' ? poll.passPct : 50,
      options: pollRealOptions(poll).map((o) => o.text),
    },
    meta
  );
}

/** A template back into a shape, ready to pre-fill the create form. */
export function templateToShape(t: PollTemplate): PollShape {
  return {
    title: t.title,
    description: t.description,
    targetAudience: t.targetAudience,
    kind: t.kind,
    abstain: t.abstain,
    resultVisibility: t.resultVisibility,
    pollClass: t.pollClass,
    binding: t.binding,
    ballot: t.ballot,
    quorumPct: t.quorumPct,
    passPct: t.passPct,
    options: [...t.options],
  };
}

const RESULT_VISIBILITIES = ['live', 'afterVote', 'afterClose', 'committee'];

/**
 * Read the workspace doc's `pollTemplates` field defensively — the
 * doc is committee-writable configuration, so every entry is
 * shape-checked before it may pre-fill a form. Malformed entries
 * are dropped, never trusted.
 */
export function readPollTemplates(raw: unknown): PollTemplate[] {
  if (!Array.isArray(raw)) return [];
  const out: PollTemplate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;
    if (typeof t.id !== 'string' || t.id.length === 0) continue;
    if (typeof t.title !== 'string' || t.title.trim().length === 0) continue;
    const kind = t.kind === 'multi' || t.kind === 'text' ? t.kind : 'choice';
    const options = Array.isArray(t.options)
      ? t.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
      : [];
    if (kind !== 'text' && options.length < 2) continue;
    out.push({
      id: t.id,
      name: typeof t.name === 'string' && t.name.trim() ? t.name.trim() : t.title.trim(),
      title: t.title,
      description: typeof t.description === 'string' ? t.description : '',
      targetAudience: t.targetAudience === 'MANAGERS' ? 'MANAGERS' : 'ALL_MEMBERS',
      kind,
      abstain: kind !== 'text' && t.abstain === true,
      resultVisibility:
        typeof t.resultVisibility === 'string' && RESULT_VISIBILITIES.includes(t.resultVisibility)
          ? t.resultVisibility
          : 'afterVote',
      pollClass: t.pollClass === 'decision' ? 'decision' : 'pulse',
      binding: t.pollClass === 'decision' && t.binding === true,
      ballot: t.ballot === 'named' ? 'named' : 'secret',
      quorumPct: typeof t.quorumPct === 'number' && Number.isFinite(t.quorumPct) ? t.quorumPct : 25,
      passPct: typeof t.passPct === 'number' && Number.isFinite(t.passPct) ? t.passPct : 50,
      options,
      recurrence: pollRecurrence(t.recurrence),
      createdAt: typeof t.createdAt === 'number' ? t.createdAt : 0,
      createdByUid: typeof t.createdByUid === 'string' ? t.createdByUid : '',
    });
  }
  return out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/** Advance a moment by one recurrence step (calendar months/years, local clock). */
export function advanceByRecurrence(ms: number, recurrence: PollRecurrence): number {
  if (recurrence === 'none') return ms;
  const d = new Date(ms);
  if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (recurrence === 'quarterly') d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return d.getTime();
}

/**
 * The suggested window for the NEXT run of a recurring poll: both
 * clocks advanced by the recurrence step until the opening lies in
 * the future, the voting duration preserved exactly. A suggestion
 * for the re-run form — a person still checks it and opens the
 * poll themselves.
 */
export function nextRunWindow(
  recurrence: PollRecurrence,
  opensAt: number | null,
  expiresAt: number,
  now: number
): { opensAt: number | null; expiresAt: number } {
  if (recurrence === 'none' || !(expiresAt > 0)) return { opensAt, expiresAt };
  const duration = opensAt && opensAt > 0 ? expiresAt - opensAt : 0;
  let nextExpires = advanceByRecurrence(expiresAt, recurrence);
  let guard = 0;
  while (nextExpires <= now && guard < 240) {
    nextExpires = advanceByRecurrence(nextExpires, recurrence);
    guard += 1;
  }
  return {
    opensAt: opensAt && opensAt > 0 ? nextExpires - duration : null,
    expiresAt: nextExpires,
  };
}
