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
  pollClass,
  pollIsBinding,
  pollStoredOutcome,
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
  /** POLLS P1: the class + standing label, e.g. "Decision poll · Binding". */
  badgeLine?: string;
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
  const isDecision = pollClass(poll) === 'decision';
  const badgeLine = isDecision
    ? `Decision poll · ${pollIsBinding(poll) ? 'Binding' : 'Advisory'}`
    : 'Pulse poll · Advisory';
  // POLLS P1 — the recorded outcome, when the poll carries one, IS
  // the card's truth (tallies, verdict, tie — computed once at
  // conclusion). Polls without one keep the derived reading below.
  const stored = pollStoredOutcome(poll);
  const eligible = typeof poll.eligibleCount === 'number' && poll.eligibleCount > 0 ? poll.eligibleCount : 0;
  let outcomeLine: string;
  let detailLine: string;
  if (stored && kind !== 'text') {
    const textOf = (id: string) => poll.options?.[id]?.text || id;
    const winners = stored.winnerOptionIds;
    if (stored.verdict === 'quorum-not-met') {
      outcomeLine = eligible > 0
        ? `Not decided — quorum not met (${stored.totalVotes} of ${eligible} eligible members voted)`
        : 'Not decided — quorum not met';
    } else if (stored.totalVotes === 0 || winners.length === 0) {
      outcomeLine = 'No votes were cast';
    } else if (winners.length > 1) {
      const names = winners.map((id) => `“${textOf(id)}”`).join(' and ');
      const each = stored.tallies[winners[0]] || 0;
      outcomeLine = `Tie — ${names} at ${each} vote${each === 1 ? '' : 's'} each`;
      if (stored.verdict === 'carried') outcomeLine += ' · carried jointly';
    } else {
      const topVotes = stored.tallies[winners[0]] || 0;
      const pct = stored.totalVotes > 0 ? Math.round((topVotes / stored.totalVotes) * 100) : 0;
      outcomeLine = `“${textOf(winners[0])}” — ${pct}% of ${stored.totalVotes} vote${stored.totalVotes === 1 ? '' : 's'}`;
      if (stored.verdict === 'carried') outcomeLine += ' · carried';
      if (stored.verdict === 'not-carried') outcomeLine += ' · not carried';
    }
    const abstainVotes = stored.tallies[ABSTAIN_OPTION_ID] || 0;
    if (abstainVotes > 0 && stored.totalVotes > 0) outcomeLine += ` · ${abstainVotes} abstained`;
    detailLine =
      isDecision && eligible > 0
        ? `${stored.totalVotes} of ${eligible} eligible members voted · quorum ${stored.quorumMet ? 'met' : 'not met'}`
        : `${stored.totalVotes} vote${stored.totalVotes === 1 ? '' : 's'} counted openly`;
  } else if (kind === 'text') {
    outcomeLine = total === 1 ? '1 written response received' : `${total} written responses received`;
    if (stored?.verdict === 'quorum-not-met') outcomeLine += ' · quorum not met';
    detailLine =
      isDecision && eligible > 0
        ? `${total} of ${eligible} eligible members responded · quorum ${stored?.quorumMet ? 'met' : 'not met'}`
        : 'Free-text responses — read by the committee';
  } else if (total === 0) {
    outcomeLine = 'No votes were cast';
    detailLine = '0 votes counted openly';
  } else {
    const options = pollOptionList(poll).filter((o) => o.id !== ABSTAIN_OPTION_ID);
    const top = options.reduce((a, b) => (b.votes > (a?.votes ?? -1) ? b : a), options[0]);
    const abstain = pollOptionList(poll).find((o) => o.id === ABSTAIN_OPTION_ID);
    const pct = top ? Math.round((top.votes / total) * 100) : 0;
    outcomeLine = top ? `“${top.text}” — ${pct}% of ${total} vote${total === 1 ? '' : 's'}` : 'No votes were cast';
    if (abstain && abstain.votes > 0) {
      outcomeLine += ` · ${abstain.votes} abstained`;
    }
    detailLine = `${total} vote${total === 1 ? '' : 's'} counted openly`;
  }
  return {
    kind: 'poll',
    id: poll.id,
    title: poll.title || 'Community poll',
    badgeLine,
    outcomeLine,
    detailLine,
    ...(poll.adminNote ? { note: poll.adminNote } : {}),
    ...(stored
      ? { concludedAt: stored.concludedAt }
      : typeof poll.expiresAt === 'number' && poll.expiresAt > 0
        ? { concludedAt: poll.expiresAt }
        : {}),
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
