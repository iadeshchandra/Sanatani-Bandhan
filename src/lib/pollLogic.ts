/**
 * pollLogic.ts — Community poll read truth (EVENTS + POLLS P0).
 * =====================================================================
 * Pure helpers for reading polls under the ballot-box model:
 *
 *  - NEW polls carry `totalVotes` on the doc and one private ballot
 *    per voter in `polls/{id}/votes/{uid}`; the poll doc itself holds
 *    ONLY counts.
 *  - LEGACY polls (created before the ballot box) carry a `votedUsers`
 *    map instead. They stay fully readable: the total falls back to
 *    the map size, and a member's own legacy vote stays visible to
 *    them. The map is frozen — no new write path touches it.
 *  - If neither exists (very old docs), the option counts themselves
 *    are the total.
 */

export interface PollOptionLike {
  text?: string;
  votes?: number;
  /** P1: marks the reserved abstain entry (see ABSTAIN_OPTION_ID). */
  isAbstain?: boolean;
}

export interface PollLike {
  status?: string;
  expiresAt?: number;
  totalVotes?: number;
  votedUsers?: Record<string, string>;
  options?: Record<string, PollOptionLike>;
  kind?: string;
  resultVisibility?: string;
}

/** Total ballots counted on a poll, across both data models. */
export function pollTotalVotes(p: PollLike): number {
  if (typeof p.totalVotes === 'number' && Number.isFinite(p.totalVotes)) return p.totalVotes;
  if (p.votedUsers && typeof p.votedUsers === 'object') return Object.keys(p.votedUsers).length;
  return Object.values(p.options || {}).reduce((s, o) => s + (o?.votes || 0), 0);
}

/** Options as a stable list, in the doc's own key order. */
export function pollOptionList(p: PollLike): { id: string; text: string; votes: number }[] {
  return Object.keys(p.options || {}).map((id) => ({
    id,
    text: p.options?.[id]?.text || '',
    votes: p.options?.[id]?.votes || 0,
  }));
}

/**
 * Voting is open only while the poll is ACTIVE and its deadline is in
 * the future — the deadline is read from the record itself, never
 * from whether someone has visited to flip the status.
 */
export function pollIsOpen(p: PollLike, now: number): boolean {
  if (p.status !== 'ACTIVE') return false;
  return !(typeof p.expiresAt === 'number' && p.expiresAt > 0 && now >= p.expiresAt);
}

/* ------------------------------------------------------------------ */
/* EVENTS P1 — question shapes + launch-time result rules              */
/* ------------------------------------------------------------------ */

/**
 * Question shapes (P1):
 *  - 'choice' — the original single-choice ballot;
 *  - 'multi'  — pick any number of options ("which days suit you?");
 *  - 'text'   — free-text responses; there are no options, every
 *               ballot carries a short written answer. Text polls are
 *               ANNOUNCED suggestion boxes: the committee can read
 *               the responses (the rules say so too), never a secret
 *               ballot — the create form says this in plain words.
 * Polls created before P1 carry no `kind` and are 'choice'.
 */
export type PollKind = 'choice' | 'multi' | 'text';

export function pollKind(p: PollLike): PollKind {
  return p.kind === 'multi' || p.kind === 'text' ? p.kind : 'choice';
}

/**
 * The reserved option id of the abstain choice. An abstention is a
 * real position in committee life ("I have no view / I stand aside"),
 * counted in turnout but never a candidate answer. It lives in the
 * options map like any option (flagged `isAbstain` on its entry), so
 * the P0 anchored counters carry it without special cases.
 */
export const ABSTAIN_OPTION_ID = 'abstain';

export function pollHasAbstain(p: PollLike): boolean {
  return Boolean(p.options && p.options[ABSTAIN_OPTION_ID]);
}

/**
 * Result-visibility rule, chosen by the creator AT LAUNCH and frozen
 * afterwards (firestore.rules: no write path may touch the field):
 *  - 'live'      — counts visible to everyone, always;
 *  - 'afterVote' — counts visible once you have voted (the P0 default
 *                  and the behaviour legacy polls always had);
 *  - 'afterClose'— counts hidden until the poll concludes;
 *  - 'committee' — counts visible only to the committee (the creator's
 *                  own committee, who manage the poll).
 * Enforcement note (honest): the counts live on the poll document
 * itself, which members must be able to read in order to vote — so
 * this rule governs what the app DISPLAYS, exactly as the P0
 * "hidden until you vote" behaviour did. What the rules DO enforce
 * is the freeze: the choice made at launch can never be rewritten.
 */
export type PollResultVisibility = 'live' | 'afterVote' | 'afterClose' | 'committee';

export function pollResultVisibility(p: PollLike): PollResultVisibility {
  switch (p.resultVisibility) {
    case 'live':
    case 'afterClose':
    case 'committee':
      return p.resultVisibility;
    default:
      return 'afterVote';
  }
}

export function pollResultsVisible(
  p: PollLike,
  viewer: { hasVoted: boolean; isCommittee: boolean },
  now: number
): boolean {
  if (viewer.isCommittee) return true;
  const vis = pollResultVisibility(p);
  if (vis === 'live') return true;
  if (vis === 'committee') return false;
  if (vis === 'afterClose') return !pollIsOpen(p, now);
  // afterVote
  return viewer.hasVoted || !pollIsOpen(p, now);
}

/**
 * Edit discipline (P1): a poll may be edited by its committee ONLY
 * before the first ballot is cast — a typo must not cost a relaunch,
 * and a voted-on question must never silently change. Mirrored in
 * firestore.rules (`pollEditOk`).
 */
export function pollIsEditable(p: PollLike, now: number): boolean {
  return pollIsOpen(p, now) && pollTotalVotes(p) === 0;
}

/** A voter's own ballot under the P1 shapes. */
export interface MyBallot {
  optionId?: string;
  optionIds?: string[];
  text?: string;
}

/** Has this ballot actually cast anything? (Drives "you voted" state across shapes.) */
export function ballotCast(b: MyBallot | null | undefined): boolean {
  if (!b) return false;
  if (typeof b.text === 'string' && b.text.trim().length > 0) return true;
  if (Array.isArray(b.optionIds) && b.optionIds.length > 0) return true;
  return typeof b.optionId === 'string' && b.optionId.length > 0;
}

/**
 * Validate a multi-select choice against a poll's options: 1–5 real
 * options, no duplicates, and abstain is exclusive (choosing abstain
 * means choosing ONLY abstain).
 */
export function validateMultiChoice(p: PollLike, optionIds: string[]): string | null {
  if (!Array.isArray(optionIds) || optionIds.length === 0) return 'empty';
  if (optionIds.length > 5) return 'too-many';
  const seen = new Set<string>();
  for (const id of optionIds) {
    if (seen.has(id)) return 'duplicate';
    seen.add(id);
    if (!p.options || !(id in p.options)) return 'unknown-option';
  }
  if (optionIds.includes(ABSTAIN_OPTION_ID) && optionIds.length > 1) return 'abstain-exclusive';
  return null;
}

/** Free-text response bounds (mirrored in firestore.rules pollBallotOk). */
export const POLL_TEXT_MAX = 280;

export function validateTextResponse(text: string): string | null {
  const t = (text || '').trim();
  if (t.length === 0) return 'empty';
  if (t.length > POLL_TEXT_MAX) return 'too-long';
  return null;
}
