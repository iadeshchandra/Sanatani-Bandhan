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
  targetAudience?: string;
  // POLLS P1 (NEXT-LEVEL) — the Decision-grade fields. All optional:
  // polls launched before this batch carry none of them and read as
  // Pulse polls with the legacy derived outcome.
  pollClass?: string;
  binding?: boolean;
  ballot?: string;
  eligibleCount?: number;
  quorumPct?: number;
  passPct?: number;
  createdByUid?: string;
  outcome?: PollOutcome;
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

/* ------------------------------------------------------------------ */
/* POLLS NEXT-LEVEL P1 — classes, electorate, the recorded outcome     */
/* ------------------------------------------------------------------ */

/**
 * Poll classes (P1):
 *  - 'pulse'    — WhatsApp-grade: a quick community opinion. Advisory
 *                 by nature; no electorate, no quorum, no verdict.
 *                 Every poll launched before P1 is a pulse poll.
 *  - 'decision' — governance-grade: a frozen electorate snapshot, a
 *                 quorum and a pass mark set at launch, a secrecy
 *                 choice, and a recorded outcome with a verdict.
 *                 Labelled Binding or Advisory BEFORE the first vote
 *                 (the labelling law — never after).
 */
export type PollClass = 'pulse' | 'decision';

export function pollClass(p: PollLike): PollClass {
  return p.pollClass === 'decision' ? 'decision' : 'pulse';
}

/** Decision polls only: does the house act on the result? */
export function pollIsBinding(p: PollLike): boolean {
  return pollClass(p) === 'decision' && p.binding === true;
}

/**
 * The ballot's secrecy, as a creator's choice (P1) resolved against
 * the postures the rules have always enforced:
 *  - a Decision poll's stored `ballot` choice wins ('secret' | 'named');
 *  - committee (MANAGERS) polls are NAMED votes by design (P0) — the
 *    committee reads the ballots, every opening logged;
 *  - text polls are an announced suggestion box — 'named' in effect;
 *  - everything else (community choice/multi) is secret — nobody,
 *    not even the committee, can read another member's ballot.
 */
export type PollBallotMode = 'secret' | 'named';

export function pollBallotMode(p: PollLike): PollBallotMode {
  if (p.ballot === 'named') return 'named';
  if (p.ballot === 'secret') return 'secret';
  if (p.targetAudience === 'MANAGERS' || pollKind(p) === 'text') return 'named';
  return 'secret';
}

/** Board roles — the rules' R_BOARD set, spelled as the register keeps them. */
export const POLL_BOARD_ROLES = ['SuperAdmin', 'SUPER_ADMIN', 'Trustee', 'TRUSTEE', 'Manager', 'MANAGER'];

/**
 * The electorate snapshot for a new Decision poll: how many distinct
 * registered members of the workspace may vote, counted from the
 * member register (the devotees list the desk already loads) at
 * creation time. Mirrors the Resolutions precedent (addResolution's
 * boardSize): MANAGERS counts distinct board-role members, deduped
 * by account (userId, falling back to the register record id);
 * ALL_MEMBERS counts every distinct register identity the same way.
 * The count is a snapshot of the REGISTER — it is stamped on the poll
 * and never recomputed, so later joins/leaves do not move a launched
 * poll's quorum base.
 */
export function pollElectorateCount(
  members: readonly { id?: string; userId?: string; role?: string }[],
  audience: string
): number {
  const ids = new Set<string>();
  for (const m of members || []) {
    if (!m) continue;
    if (audience === 'MANAGERS' && !POLL_BOARD_ROLES.includes(String(m.role || ''))) continue;
    const key = m.userId || m.id;
    if (key) ids.add(String(key));
  }
  return ids.size;
}

export const POLL_DEFAULT_QUORUM_PCT = 25;
export const POLL_DEFAULT_PASS_PCT = 50;

/** A percentage field read defensively: a finite 0–100 number, else the fallback. */
export function pollPct(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : fallback;
}

/**
 * The recorded outcome — computed ONCE at conclusion and stored on
 * the poll doc (firestore.rules: writable only in the conclude write
 * or onto an already-concluded poll, and never rewritable). Every
 * consumer (desk card, Transparency Board card, result certificate)
 * reads THIS when present; polls without one keep the legacy
 * derive-at-render path.
 *
 * Verdict law (Decision polls):
 *  - quorum is judged on ALL ballots cast (abstentions included —
 *    an abstaining member did turn up) against the frozen electorate;
 *  - the pass mark is judged on votes cast FOR AN OPTION (abstentions
 *    excluded — standing aside is not a vote against the leader);
 *  - a tie at the top means NO option carried the house: the verdict
 *    is 'not-carried' and every tied id is recorded in
 *    winnerOptionIds — a tie is a tie, never silently first-in-order;
 *  - a text poll has no winner: with quorum met its verdict is
 *    'carried' in the narrow sense that the consultation validly
 *    completed (its outcome line reports the response count).
 * Pulse outcomes store tallies + winner/tie only — no turnout, no
 * quorum, no verdict (a pulse decides nothing).
 */
export interface PollOutcome {
  tallies: Record<string, number>;
  totalVotes: number;
  turnout?: number;
  quorumMet?: boolean;
  verdict?: 'carried' | 'not-carried' | 'quorum-not-met';
  winnerOptionIds: string[];
  concludedAt: number;
}

export function computePollOutcome(p: PollLike, now: number): PollOutcome {
  const tallies: Record<string, number> = {};
  for (const o of pollOptionList(p)) tallies[o.id] = o.votes;
  const totalVotes = pollTotalVotes(p);
  const candidates = pollOptionList(p).filter((o) => o.id !== ABSTAIN_OPTION_ID);
  const topVotes = candidates.reduce((m, o) => Math.max(m, o.votes), 0);
  const winnerOptionIds =
    topVotes > 0 ? candidates.filter((o) => o.votes === topVotes).map((o) => o.id) : [];

  const outcome: PollOutcome = { tallies, totalVotes, winnerOptionIds, concludedAt: now };
  if (pollClass(p) !== 'decision') return outcome;

  const eligible = typeof p.eligibleCount === 'number' && p.eligibleCount > 0 ? p.eligibleCount : 0;
  const quorumPct = pollPct(p.quorumPct, POLL_DEFAULT_QUORUM_PCT);
  const passPct = pollPct(p.passPct, POLL_DEFAULT_PASS_PCT);
  let quorumMet: boolean | undefined;
  if (eligible > 0) {
    outcome.turnout = Math.round((totalVotes / eligible) * 10000) / 10000;
    quorumMet = totalVotes * 100 >= quorumPct * eligible;
    outcome.quorumMet = quorumMet;
  }

  if (quorumMet === false) {
    outcome.verdict = 'quorum-not-met';
  } else if (pollKind(p) === 'text') {
    outcome.verdict = 'carried';
  } else if (winnerOptionIds.length !== 1) {
    // Zero votes, or a tie at the top: no single option carried.
    outcome.verdict = 'not-carried';
  } else {
    const abstainVotes = tallies[ABSTAIN_OPTION_ID] || 0;
    const passBase = totalVotes - abstainVotes;
    outcome.verdict =
      passBase > 0 && topVotes * 100 >= passPct * passBase ? 'carried' : 'not-carried';
  }
  return outcome;
}

/** The stored outcome, shape-checked — or null (legacy/derived path). */
export function pollStoredOutcome(p: PollLike): PollOutcome | null {
  const o = p.outcome;
  if (!o || typeof o !== 'object') return null;
  if (typeof o.totalVotes !== 'number' || typeof o.concludedAt !== 'number') return null;
  if (!o.tallies || typeof o.tallies !== 'object' || !Array.isArray(o.winnerOptionIds)) return null;
  return o;
}
