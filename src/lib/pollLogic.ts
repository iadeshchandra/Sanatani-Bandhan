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
  /** P3 (time polls): the proposed moment this slot stands for,
   *  epoch ms. The label is the option's text; this is the machine
   *  truth the winning slot's event is built from. */
  slotAt?: number;
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
  // POLLS NEXT-LEVEL P2b — the schedule, the abstain field pair and
  // the template provenance. All optional: pre-P2b polls carry none
  // of them (their abstain, if any, lives in the options map).
  opensAt?: number;
  allowAbstain?: boolean;
  abstainVotes?: number;
  templateId?: string;
  recurrence?: string;
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
 * POLLS NEXT-LEVEL P2b — the poll's phase, judged from the record
 * itself (status + the two clocks), never from whether someone has
 * visited to flip a status:
 *  - 'draft'     — status DRAFT: the committee's working paper,
 *                  invisible to voters (the rules gate the read);
 *  - 'scheduled' — ACTIVE with an opening time still ahead: the
 *                  poll exists and is announced, but no ballot can
 *                  land (the rules gate that too);
 *  - 'open'      — ACTIVE, opening reached, deadline ahead;
 *  - 'closed'    — CONCLUDED, or ACTIVE past its deadline (the
 *                  desk's auto-conclusion reading).
 * Scheduling is honest client-side clock evaluation: there is no
 * server cron on this plan, and nothing here claims one — the
 * phase is recomputed from the stored clocks on every read.
 */
export type PollPhase = 'draft' | 'scheduled' | 'open' | 'closed';

export function pollPhase(p: PollLike, now: number): PollPhase {
  if (p.status === 'DRAFT') return 'draft';
  if (p.status !== 'ACTIVE') return 'closed';
  if (typeof p.opensAt === 'number' && p.opensAt > 0 && now < p.opensAt) return 'scheduled';
  if (typeof p.expiresAt === 'number' && p.expiresAt > 0 && now >= p.expiresAt) return 'closed';
  return 'open';
}

/**
 * Voting is open only while the poll is ACTIVE, its opening time
 * (when set) has been reached, and its deadline is in the future —
 * the clocks are read from the record itself, never from whether
 * someone has visited to flip the status.
 */
export function pollIsOpen(p: PollLike, now: number): boolean {
  return pollPhase(p, now) === 'open';
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
 *
 * POLLS NEXT-LEVEL P3 — three richer shapes:
 *  - 'ranked' — the voter orders the options (1st, 2nd, 3rd…); the
 *               ballot carries the ordered list. No counter can
 *               carry a ranking, so the count happens at conclusion
 *               from the ballot papers (see countRankedOutcome);
 *  - 'points' — the voter distributes EXACTLY 100 points across
 *               the options (treasury heads); the ballot carries
 *               the allocations list, the rules prove the sum
 *               server-side, and the committee counts the papers
 *               at conclusion (see countPointsOutcome). The result
 *               allocates PREFERENCE, never funds;
 *  - 'time'   — the options are proposed date/time slots (each
 *               carries a `slotAt` moment); the ballot is an
 *               ordinary choice ballot, counters and all — only
 *               the winning slot's second life (an Event) is new.
 * Ranked and points are COUNTED kinds: their ballots are read by
 * the poll's own committee for the count, exactly the announced
 * posture text polls have always taken (the rules say so, the
 * create form says so, and the desk logs the count-view opening).
 */
export type PollKind = 'choice' | 'multi' | 'text' | 'ranked' | 'points' | 'time';

export function pollKind(p: PollLike): PollKind {
  return p.kind === 'multi' || p.kind === 'text' || p.kind === 'ranked' || p.kind === 'points' || p.kind === 'time'
    ? p.kind
    : 'choice';
}

/** The kinds whose ballots are counted from the papers at conclusion. */
export function pollCountedKind(p: PollLike): boolean {
  const k = pollKind(p);
  return k === 'ranked' || k === 'points';
}

/**
 * The reserved option id of the abstain choice. An abstention is a
 * real position in committee life ("I have no view / I stand aside"),
 * counted in turnout but never a candidate answer.
 *
 * POLLS NEXT-LEVEL P2b — abstain is now a first-class ballot choice
 * OUTSIDE the option list: a poll launched with abstaining enabled
 * carries `allowAbstain: true` and counts abstentions on their own
 * counter (`abstainVotes`); the ballot is its own doc shape
 * ({abstain: true}) with its own rules anchor. Polls launched
 * before P2b carry the abstain entry inside the options map
 * (flagged `isAbstain`) — that shape stays fully readable and
 * votable forever; the helpers below read both.
 */
export const ABSTAIN_OPTION_ID = 'abstain';

/** Option-count law (mirrored in firestore.rules, create + edit). */
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 8;
/** A multi ballot may name at most this many picks (the rules anchor's bounded checks). */
export const POLL_MAX_MULTI_PICKS = 5;

export function pollHasAbstain(p: PollLike): boolean {
  return p.allowAbstain === true || Boolean(p.options && p.options[ABSTAIN_OPTION_ID]);
}

/** The poll's REAL options — the candidate answers, abstain never among them. */
export function pollRealOptions(p: PollLike): { id: string; text: string; votes: number }[] {
  return pollOptionList(p).filter((o) => o.id !== ABSTAIN_OPTION_ID);
}

/** How many real options the poll carries (the ceiling counts these). */
export function pollOptionCount(p: PollLike): number {
  return pollRealOptions(p).length;
}

/**
 * Abstentions counted on a poll, from either model: the P2b
 * counter field, or the legacy in-map entry's votes.
 */
export function pollAbstainVotes(p: PollLike): number {
  if (typeof p.abstainVotes === 'number' && Number.isFinite(p.abstainVotes)) return p.abstainVotes;
  return p.options?.[ABSTAIN_OPTION_ID]?.votes || 0;
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
 * firestore.rules (`pollEditOk`). P2b: a draft is editable by the
 * same law (it has no ballots by construction), as is a scheduled
 * poll whose opening is still ahead.
 */
export function pollIsEditable(p: PollLike, now: number): boolean {
  if (pollTotalVotes(p) !== 0) return false;
  const phase = pollPhase(p, now);
  return phase === 'draft' || phase === 'scheduled' || phase === 'open';
}

/** One line of a points ballot: points given to one head. */
export interface PollAllocation {
  optionId: string;
  points: number;
}

/** A voter's own ballot under the P1 shapes (+ the P2b abstention). */
export interface MyBallot {
  optionId?: string;
  optionIds?: string[];
  text?: string;
  /** P2b: the abstention ballot — its own shape, outside the option list. */
  abstain?: boolean;
  /** P3 (ranked): the voter's order — option ids, most wanted first. */
  ranking?: string[];
  /** P3 (points): the voter's distribution of their 100 points. */
  allocations?: PollAllocation[];
}

/** Has this ballot actually cast anything? (Drives "you voted" state across shapes.) */
export function ballotCast(b: MyBallot | null | undefined): boolean {
  if (!b) return false;
  if (b.abstain === true) return true;
  if (typeof b.text === 'string' && b.text.trim().length > 0) return true;
  if (Array.isArray(b.optionIds) && b.optionIds.length > 0) return true;
  if (Array.isArray(b.ranking) && b.ranking.length > 0) return true;
  if (Array.isArray(b.allocations) && b.allocations.length > 0) return true;
  return typeof b.optionId === 'string' && b.optionId.length > 0;
}

/**
 * Validate a multi-select choice against a poll's options: 1–5 real
 * options, no duplicates, and abstain is exclusive (choosing abstain
 * means choosing ONLY abstain).
 */
export function validateMultiChoice(p: PollLike, optionIds: string[]): string | null {
  if (!Array.isArray(optionIds) || optionIds.length === 0) return 'empty';
  if (optionIds.length > POLL_MAX_MULTI_PICKS) return 'too-many';
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
  /** P3: how this outcome was counted — absent on counter-kind
   *  outcomes (the P0–P2b shapes), 'irv' on a ranked count,
   *  'points' on a points count. */
  countMethod?: 'irv' | 'points';
  /** P3 (ranked): every counting round, in order — the published
   *  work of the count, so the certificate can show it. */
  rounds?: PollCountRound[];
  /** P3 (points): the total points summed across all ballots
   *  (= 100 × counted ballots) — shares are read against this. */
  pointsTotal?: number;
}

/** One round of a ranked (instant-runoff) count. */
export interface PollCountRound {
  /** Each still-standing option's tally this round. */
  tallies: Record<string, number>;
  /** Options eliminated at the END of this round (empty on the last). */
  eliminated: string[];
  /** Ballots still expressing a preference this round. */
  continuing: number;
  /** Ballots whose every ranked option had been eliminated. */
  exhausted: number;
}

export function computePollOutcome(p: PollLike, now: number): PollOutcome {
  const tallies: Record<string, number> = {};
  for (const o of pollOptionList(p)) tallies[o.id] = o.votes;
  // P2b: abstentions live on their own counter now — the recorded
  // tally keeps them under the reserved key either way, so every
  // consumer (desk, certificate, Transparency Board) reads one
  // shape for both generations of poll.
  const abstainCount = pollAbstainVotes(p);
  if (abstainCount > 0 || p.allowAbstain === true) tallies[ABSTAIN_OPTION_ID] = abstainCount;
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

/* ------------------------------------------------------------------ */
/* POLLS NEXT-LEVEL P3 — ranked choice, points, time slots            */
/* ------------------------------------------------------------------ */

/** The points every points-ballot must distribute — exactly. */
export const POINTS_PER_BALLOT = 100;

/**
 * Validate a ranking against a poll's REAL options: 1..N entries,
 * every entry a real option (the abstain id is not one — abstaining
 * is its own ballot), no duplicates. Mirrors the rules branch
 * (which cannot see duplicates; the counter dedupes regardless).
 */
export function validateRanking(p: PollLike, ranking: string[]): string | null {
  if (!Array.isArray(ranking) || ranking.length === 0) return 'empty';
  const real = new Set(pollRealOptions(p).map((o) => o.id));
  if (ranking.length > real.size) return 'too-many';
  const seen = new Set<string>();
  for (const id of ranking) {
    if (seen.has(id)) return 'duplicate';
    seen.add(id);
    if (!real.has(id)) return 'unknown-option';
  }
  return null;
}

/** A ranking cleaned for the count: known real options only, first
 *  occurrence wins (the defensive read of a ballot the client
 *  already validated — a duplicated id can never count twice). */
export function cleanRanking(p: PollLike, ranking: readonly string[] | undefined): string[] {
  const real = new Set(pollRealOptions(p).map((o) => o.id));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ranking || []) {
    if (typeof id !== 'string' || seen.has(id) || !real.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Validate a points allocation: 1..8 entries naming distinct real
 * options, each an integer 0–100, summing to EXACTLY 100. Mirrors
 * the rules branch (pollBallotOk proves the same sum server-side).
 */
export function validateAllocations(p: PollLike, allocations: PollAllocation[]): string | null {
  if (!Array.isArray(allocations) || allocations.length === 0) return 'empty';
  const real = new Set(pollRealOptions(p).map((o) => o.id));
  if (allocations.length > real.size || allocations.length > POLL_MAX_OPTIONS) return 'too-many';
  const seen = new Set<string>();
  let sum = 0;
  for (const a of allocations) {
    if (!a || typeof a.optionId !== 'string') return 'unknown-option';
    if (seen.has(a.optionId)) return 'duplicate';
    seen.add(a.optionId);
    if (!real.has(a.optionId)) return 'unknown-option';
    if (typeof a.points !== 'number' || !Number.isInteger(a.points) || a.points < 0 || a.points > POINTS_PER_BALLOT) {
      return 'bad-points';
    }
    sum += a.points;
  }
  if (sum !== POINTS_PER_BALLOT) return 'sum';
  return null;
}

/**
 * The Decision verdict tail, shared by the two counted kinds (the
 * choice/multi/text law in computePollOutcome, applied to a count
 * whose leader is judged on `passBase`): quorum is judged on ALL
 * ballots cast (abstentions included) against the frozen
 * electorate; a tie at the top is never carried; the pass mark is
 * judged on the leader's share of the count's own base (a ranked
 * winner's final-round continuing ballots; a points leader's
 * share of all points placed).
 */
function countedVerdict(
  p: PollLike,
  outcome: PollOutcome,
  passBase: number,
  leaderVotes: number
): void {
  if (pollClass(p) !== 'decision') return;
  const eligible = typeof p.eligibleCount === 'number' && p.eligibleCount > 0 ? p.eligibleCount : 0;
  const quorumPct = pollPct(p.quorumPct, POLL_DEFAULT_QUORUM_PCT);
  const passPct = pollPct(p.passPct, POLL_DEFAULT_PASS_PCT);
  let quorumMet: boolean | undefined;
  if (eligible > 0) {
    outcome.turnout = Math.round((outcome.totalVotes / eligible) * 10000) / 10000;
    quorumMet = outcome.totalVotes * 100 >= quorumPct * eligible;
    outcome.quorumMet = quorumMet;
  }
  if (quorumMet === false) {
    outcome.verdict = 'quorum-not-met';
  } else if (outcome.winnerOptionIds.length !== 1) {
    outcome.verdict = 'not-carried';
  } else {
    outcome.verdict =
      passBase > 0 && leaderVotes * 100 >= passPct * passBase ? 'carried' : 'not-carried';
  }
}

/**
 * The ranked count — instant-runoff, fully deterministic, every
 * round recorded so the certificate can show its work:
 *  - each round, every ballot counts for its highest-ranked
 *    still-standing option; a ballot with none left is exhausted;
 *  - an option holding MORE THAN HALF the continuing ballots wins;
 *  - otherwise the lowest option is eliminated and its ballots
 *    transfer. A tie for lowest is broken by the tied options'
 *    tallies in the EARLIEST round where they differ (fewer loses);
 *    options tied through every round are eliminated TOGETHER
 *    (batch elimination) — unless they are all that remain, which
 *    is a tie, recorded as one (every tied id a winner, verdict
 *    law above: never carried, never silently first-in-order).
 * The outcome's `tallies` are the FIRST-preference tallies (round
 * 1) — labelled as such wherever they are shown; `rounds` is the
 * whole count. Abstention ballots are not rankings: they count in
 * turnout (the poll doc's totalVotes) and nowhere here.
 */
export function countRankedOutcome(
  p: PollLike,
  ballots: readonly MyBallot[],
  now: number
): PollOutcome {
  const candidates = pollRealOptions(p).map((o) => o.id);
  const rankings = ballots
    .map((b) => cleanRanking(p, b?.ranking))
    .filter((r) => r.length > 0);
  const totalVotes = pollTotalVotes(p);

  const rounds: PollCountRound[] = [];
  let active = [...candidates];
  let winnerIds: string[] = [];
  let finalTallies: Record<string, number> = {};
  let finalContinuing = 0;

  // At most one elimination round per candidate — the loop is
  // bounded by the option count by construction.
  for (let step = 0; step <= candidates.length; step++) {
    const tallies: Record<string, number> = {};
    for (const id of active) tallies[id] = 0;
    let continuing = 0;
    for (const r of rankings) {
      const pick = r.find((id) => active.includes(id));
      if (pick) {
        tallies[pick] += 1;
        continuing += 1;
      }
    }
    const exhausted = rankings.length - continuing;
    finalTallies = tallies;
    finalContinuing = continuing;

    const leader = active.reduce((a, b) => (tallies[b] > tallies[a] ? b : a), active[0]);
    if (continuing > 0 && leader !== undefined && tallies[leader] * 2 > continuing) {
      rounds.push({ tallies, eliminated: [], continuing, exhausted });
      winnerIds = [leader];
      break;
    }
    if (active.length <= 1 || continuing === 0) {
      // One option standing with no majority possible, or every
      // ballot exhausted: a lone standing option wins by survival
      // only when it holds votes; a voteless finish is no result.
      rounds.push({ tallies, eliminated: [], continuing, exhausted });
      winnerIds = active.length === 1 && tallies[active[0]] > 0 ? [active[0]] : [];
      break;
    }
    const min = Math.min(...active.map((id) => tallies[id]));
    const lowest = active.filter((id) => tallies[id] === min);
    if (lowest.length === active.length) {
      // Dead heat across the whole remaining field: a tie.
      rounds.push({ tallies, eliminated: [], continuing, exhausted });
      winnerIds = [...active];
      break;
    }
    // Tie-break among the lowest by earliest differing round:
    // walk the recorded rounds from the first, narrowing the
    // elimination set to those who were already weakest then.
    let elim = lowest;
    if (lowest.length > 1) {
      for (const past of rounds) {
        if (elim.length === 1) break;
        const pastMin = Math.min(...elim.map((id) => past.tallies[id] ?? 0));
        const still = elim.filter((id) => (past.tallies[id] ?? 0) === pastMin);
        if (still.length < elim.length) elim = still;
      }
    }
    rounds.push({ tallies, eliminated: elim, continuing, exhausted });
    active = active.filter((id) => !elim.includes(id));
  }

  const firstTallies: Record<string, number> = {};
  for (const id of candidates) firstTallies[id] = rounds[0]?.tallies[id] ?? 0;
  const abstainCount = pollAbstainVotes(p);
  if (abstainCount > 0 || p.allowAbstain === true) firstTallies[ABSTAIN_OPTION_ID] = abstainCount;

  const outcome: PollOutcome = {
    tallies: firstTallies,
    totalVotes,
    winnerOptionIds: winnerIds,
    concludedAt: now,
    countMethod: 'irv',
    rounds,
  };
  const leaderFinal = winnerIds.length === 1 ? finalTallies[winnerIds[0]] ?? 0 : 0;
  countedVerdict(p, outcome, finalContinuing, leaderFinal);
  return outcome;
}

/**
 * The points count: every ballot's allocations summed per head.
 * `tallies` are POINTS (not ballots) and `pointsTotal` their sum —
 * shares are points of preference, never percentages of money:
 * this poll allocates the house's preference; the trustees still
 * decide the budget, informed by it. Ballots are read defensively
 * (unknown heads dropped, non-integer or out-of-range entries
 * dropped — the rules already refused such ballots at the door,
 * so a dropped entry here means the record was written some other
 * way and the honest count says so by its total).
 */
export function countPointsOutcome(
  p: PollLike,
  ballots: readonly MyBallot[],
  now: number
): PollOutcome {
  const heads = pollRealOptions(p).map((o) => o.id);
  const tallies: Record<string, number> = {};
  for (const id of heads) tallies[id] = 0;
  let pointsTotal = 0;
  for (const b of ballots) {
    if (!Array.isArray(b?.allocations)) continue;
    const seen = new Set<string>();
    for (const a of b.allocations) {
      if (!a || typeof a.optionId !== 'string' || seen.has(a.optionId)) continue;
      if (!heads.includes(a.optionId)) continue;
      if (typeof a.points !== 'number' || !Number.isInteger(a.points) || a.points < 0 || a.points > POINTS_PER_BALLOT) continue;
      seen.add(a.optionId);
      tallies[a.optionId] += a.points;
      pointsTotal += a.points;
    }
  }
  const abstainCount = pollAbstainVotes(p);
  if (abstainCount > 0 || p.allowAbstain === true) tallies[ABSTAIN_OPTION_ID] = abstainCount;
  const top = heads.reduce((m, id) => Math.max(m, tallies[id]), 0);
  const winnerIds = top > 0 ? heads.filter((id) => tallies[id] === top) : [];
  const outcome: PollOutcome = {
    tallies,
    totalVotes: pollTotalVotes(p),
    winnerOptionIds: winnerIds,
    concludedAt: now,
    countMethod: 'points',
    pointsTotal,
  };
  countedVerdict(p, outcome, pointsTotal, top);
  return outcome;
}

/**
 * A concluded time poll's winning slot, when the recorded outcome
 * names exactly one winner and that option carries its moment —
 * the input to the one-step "create the event" (the desk writes it
 * through the org page's existing event path). Null otherwise:
 * a tie between slots creates no event until the house decides.
 */
export function pollWinningSlot(
  p: PollLike
): { optionId: string; text: string; slotAt: number } | null {
  if (pollKind(p) !== 'time') return null;
  const outcome = pollStoredOutcome(p);
  if (!outcome || outcome.winnerOptionIds.length !== 1) return null;
  const id = outcome.winnerOptionIds[0];
  const opt = p.options?.[id];
  if (!opt || typeof opt.slotAt !== 'number' || !Number.isFinite(opt.slotAt)) return null;
  return { optionId: id, text: opt.text || '', slotAt: opt.slotAt };
}
