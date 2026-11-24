/**
 * pollLifecycleNotify.ts — NOTIFICATION WAVE 1: pure picking for the
 * poll lifecycle trio (DESIGN §2.3).
 * =====================================================================
 * Firestore rules bind every inbox write to its owner, so poll news
 * can only ever arrive through the SELF-LISTEN pattern: my device
 * observes the polls of MY workspaces and emits into MY OWN Suchana
 * inbox. This module is the pure half — given the polls visible to
 * me, my OWN ballots, and the ledger of already-notified dedupe
 * keys, it decides what is news:
 *
 *  - opened    — a poll of my workspace is open and I have not
 *                voted (suppression L4: already voted ⇒ silent);
 *  - closing   — voting ends within 24 h and I have not voted
 *                (own-ballot check only — nobody else's ballot is
 *                ever read, counted, or inferred);
 *  - concluded — the poll has ended (status flipped OR deadline
 *                passed, the desk's own auto-conclusion reading);
 *                the body carries the recorded outcome's verdict
 *                line when one is stored (P1), else a plain line.
 *
 * Per poll per pass at most ONE notice — the most advanced stage
 * (concluded > closing > opened) — so a poll first seen an hour
 * before its deadline rings once, not twice.
 *
 * Audience is the poll's own: ALL_MEMBERS ⇒ every member of the
 * workspace; MANAGERS ⇒ board roles only (lib/memberPolls'
 * pollVisibleToMember — the same gate the member door and the
 * rules' read path apply). Followers who are not members never
 * see a workspace's polls here.
 *
 * No IO, no clock — fully unit-testable.
 */
import {
  ballotCast,
  pollClass,
  pollIsOpen,
  pollKind,
  pollOptionList,
  pollStoredOutcome,
  type MyBallot,
  type PollLike,
  type PollOutcome,
} from './pollLogic';
import { pollVisibleToMember, type MemberPollDoc } from './memberPolls';

export type PollLifecycleStage = 'opened' | 'closing' | 'concluded';

export interface PollLifecycleNotice {
  stage: PollLifecycleStage;
  poll: MemberPollDoc;
  workspaceId: string;
  dedupeKey: string;
  /**
   * True when the notice's premise is already false for this member
   * (they have voted): the service records the dedupe key in its
   * ledger WITHOUT emitting, so the stage never re-fires.
   */
  suppressed: boolean;
  /** Concluded only: the recorded outcome's verdict, when stored. */
  outcome: PollOutcome | null;
}

/** The closing-soon window: 24 h before the deadline (DESIGN §2.3). */
export const POLL_CLOSING_WINDOW_MS = 24 * 60 * 60 * 1000;

export function pollOpenedKey(pollId: string): string {
  return `poll:${pollId}:opened`;
}

export function pollClosingKey(pollId: string): string {
  return `poll:${pollId}:closing`;
}

export function pollConcludedKey(pollId: string): string {
  return `poll:${pollId}:concluded`;
}

/**
 * The verdict fragment key for a concluded poll's stored outcome —
 * the notify helper renders the matching dictionary fragment
 * (surfaces.notify orgPollVerdict*) per language. Decision polls
 * speak in verdicts; pulse polls name their leading option (or the
 * tie). No stored outcome ⇒ null (the helper uses the plain
 * concluded line).
 */
export type PollVerdictFragment =
  | { key: 'pollVerdictCarried' }
  | { key: 'pollVerdictNotCarried' }
  | { key: 'pollVerdictQuorumNotMet' }
  | { key: 'pollVerdictWinner'; winner: string }
  | { key: 'pollVerdictTie' }
  | { key: 'pollVerdictResponses'; count: number };

export function pollVerdictFragment(poll: PollLike): PollVerdictFragment | null {
  const outcome = pollStoredOutcome(poll);
  if (!outcome) return null;
  if (pollClass(poll) === 'decision') {
    if (outcome.verdict === 'carried') {
      // A text Decision poll "carries" by completing its consultation —
      // its honest line is the response count, not a winning side.
      if (pollKind(poll) === 'text') {
        return { key: 'pollVerdictResponses', count: outcome.totalVotes };
      }
      return { key: 'pollVerdictCarried' };
    }
    if (outcome.verdict === 'quorum-not-met') return { key: 'pollVerdictQuorumNotMet' };
    if (outcome.verdict === 'not-carried') {
      // A tie at the top is recorded as not-carried with every tied
      // id — the line says "tie", never a silent first-in-order win.
      if (outcome.winnerOptionIds.length > 1) return { key: 'pollVerdictTie' };
      return { key: 'pollVerdictNotCarried' };
    }
    return null;
  }
  // Pulse: tallies + winner/tie only.
  if (outcome.winnerOptionIds.length > 1) return { key: 'pollVerdictTie' };
  if (outcome.winnerOptionIds.length === 1) {
    const winner = pollOptionList(poll).find((o) => o.id === outcome.winnerOptionIds[0]);
    if (winner && winner.text) return { key: 'pollVerdictWinner', winner: winner.text };
  }
  return null;
}

/**
 * Pick the lifecycle notices for one pass over my workspaces' polls.
 *
 * `notified` is the device ledger of dedupe keys already settled
 * (emitted or suppressed). A stage whose key is settled never
 * re-fires — one bell per stage per poll, ever.
 */
export function pickPollLifecycleNotices(input: {
  polls: readonly MemberPollDoc[];
  /** My role per workspace (membership edge), for the audience gate. */
  roleByWorkspace: Readonly<Record<string, string>>;
  /** My OWN ballot per poll id (null = not voted). No one else's. */
  myBallots: Readonly<Record<string, MyBallot | null>>;
  notified: ReadonlySet<string>;
  now: number;
}): PollLifecycleNotice[] {
  const out: PollLifecycleNotice[] = [];
  for (const poll of input.polls) {
    if (!poll || !poll.id) continue;
    const workspaceId = typeof poll.workspaceId === 'string' ? poll.workspaceId : '';
    if (!workspaceId) continue;
    if (!pollVisibleToMember(poll, input.roleByWorkspace[workspaceId])) continue;

    const hasVoted = ballotCast(input.myBallots[poll.id] ?? null);
    const open = pollIsOpen(poll, input.now);
    const outcome = pollStoredOutcome(poll);

    if (!open) {
      // Concluded (status flipped, or deadline passed — the desk's
      // auto-conclusion reading). Every eligible member hears the
      // result, voted or not: a result is news, not a nag.
      const dedupeKey = pollConcludedKey(poll.id);
      if (!input.notified.has(dedupeKey)) {
        out.push({
          stage: 'concluded',
          poll,
          workspaceId,
          dedupeKey,
          suppressed: false,
          outcome,
        });
      }
      continue;
    }

    const expiresAt =
      typeof poll.expiresAt === 'number' && poll.expiresAt > 0 ? poll.expiresAt : 0;
    const closingSoon =
      expiresAt > 0 && expiresAt - input.now <= POLL_CLOSING_WINDOW_MS;

    if (closingSoon) {
      const dedupeKey = pollClosingKey(poll.id);
      if (!input.notified.has(dedupeKey)) {
        out.push({
          stage: 'closing',
          poll,
          workspaceId,
          dedupeKey,
          suppressed: hasVoted,
          outcome: null,
        });
      }
      continue; // one stage per pass: closing outranks opened
    }

    const dedupeKey = pollOpenedKey(poll.id);
    if (!input.notified.has(dedupeKey)) {
      out.push({
        stage: 'opened',
        poll,
        workspaceId,
        dedupeKey,
        suppressed: hasVoted,
        outcome: null,
      });
    }
  }
  return out;
}
