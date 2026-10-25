/**
 * decisionCards.ts — concluded decisions for the Transparency Board
 * (EVENTS P2).
 * =====================================================================
 * A concluded poll or board resolution becomes a plain-language
 * "decision card" on the organisation's Transparency Board: the
 * question, the outcome, the turnout, the quorum, the committee's
 * note. Decisions devotees can SEE are how a committee earns the
 * next vote's turnout (audit P2-11).
 *
 * The card respects the poll's launch-time result rule: a poll whose
 * creator chose 'committee' visibility never appears here for a
 * non-committee viewer. Resolutions are board records — named votes
 * by design — and appear once they have truly concluded (stored
 * outcome, or the derived outcome of an expired open resolution,
 * the same derivation the desk and the rules use).
 *
 * Every line is computed from the record — no invented margins, no
 * "85%" theatre (that hard-coded line died in the P0 batch).
 */
import {
  pollKind,
  pollOptionList,
  pollResultsVisible,
  pollTotalVotes,
  ABSTAIN_OPTION_ID,
  type PollLike,
} from './pollLogic';
import {
  resolutionEffectiveStatus,
  resolutionQuorumMet,
  type ResolutionLike,
} from './resolutionLogic';

export interface DecisionCard {
  kind: 'poll' | 'resolution';
  id: string;
  title: string;
  /** The outcome in one plain line, e.g. "“Blue gates” — 61% of 214 votes". */
  outcomeLine: string;
  /** Turnout / quorum line. */
  detailLine: string;
  /** The committee's official note, when one was recorded. */
  note?: string;
  concludedAt?: number;
}

interface PollCardDoc extends PollLike {
  id: string;
  title?: string;
  adminNote?: string;
  createdAt?: number;
  expiresAt?: number;
}

/** A concluded poll → its board card, or null when it must not show. */
export function pollDecisionCard(
  poll: PollCardDoc,
  viewer: { isCommittee: boolean },
  now: number
): DecisionCard | null {
  const concluded = poll.status === 'CONCLUDED' || (poll.status === 'ACTIVE' && typeof poll.expiresAt === 'number' && poll.expiresAt > 0 && now >= poll.expiresAt);
  if (!concluded) return null;
  if (!pollResultsVisible(poll, { hasVoted: false, isCommittee: viewer.isCommittee }, now)) return null;

  const total = pollTotalVotes(poll);
  const kind = pollKind(poll);
  let outcomeLine: string;
  if (kind === 'text') {
    outcomeLine = total === 1 ? '1 written response received' : `${total} written responses received`;
  } else if (total === 0) {
    outcomeLine = 'No votes were cast';
  } else {
    const options = pollOptionList(poll).filter((o) => o.id !== ABSTAIN_OPTION_ID);
    const top = options.reduce((a, b) => (b.votes > (a?.votes ?? -1) ? b : a), options[0]);
    const abstain = pollOptionList(poll).find((o) => o.id === ABSTAIN_OPTION_ID);
    const pct = top ? Math.round((top.votes / total) * 100) : 0;
    outcomeLine = top ? `“${top.text}” — ${pct}% of ${total} vote${total === 1 ? '' : 's'}` : 'No votes were cast';
    if (abstain && abstain.votes > 0) {
      outcomeLine += ` · ${abstain.votes} abstained`;
    }
  }
  return {
    kind: 'poll',
    id: poll.id,
    title: poll.title || 'Community poll',
    outcomeLine,
    detailLine: kind === 'text' ? 'Free-text responses — read by the committee' : `${total} vote${total === 1 ? '' : 's'} counted openly`,
    ...(poll.adminNote ? { note: poll.adminNote } : {}),
    ...(typeof poll.expiresAt === 'number' && poll.expiresAt > 0 ? { concludedAt: poll.expiresAt } : {}),
  };
}

interface ResolutionCardDoc extends ResolutionLike {
  id: string;
  title?: string;
  details?: string;
}

/** A concluded resolution → its board card, or null while still open. */
export function resolutionDecisionCard(res: ResolutionCardDoc, now: number): DecisionCard | null {
  const status = resolutionEffectiveStatus(res, now);
  if (status === 'Pending Review') return null;
  const cast = (res.votesInFavor || 0) + (res.votesAgainst || 0);
  const board = res.boardSize || 0;
  const quorum = resolutionQuorumMet(res);
  const outcomeLine =
    status === 'Deferred'
      ? `Not decided — quorum not met (${cast} of ${board > 0 ? board : '—'} board votes)`
      : `${status} — ${res.votesInFavor || 0} in favour, ${res.votesAgainst || 0} against`;
  const detailLine =
    board > 0
      ? `${cast} of ${board} board members voted · quorum ${quorum ? 'met' : 'not met'}`
      : `${cast} votes cast · quorum ${quorum ? 'met' : 'not met'}`;
  return {
    kind: 'resolution',
    id: res.id,
    title: res.title || 'Board resolution',
    outcomeLine,
    detailLine,
    ...(res.details ? { note: res.details } : {}),
    ...(typeof res.concludedAt === 'number' ? { concludedAt: res.concludedAt } : {}),
  };
}

/** Board order: most recently concluded first. */
export function sortDecisionCards(cards: DecisionCard[]): DecisionCard[] {
  return [...cards].sort((a, b) => (b.concludedAt || 0) - (a.concludedAt || 0));
}
