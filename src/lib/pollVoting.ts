/**
 * pollVoting.ts — POLLS NEXT-LEVEL P2a: the ONE ballot write path.
 * =====================================================================
 * Before P2a the ballot batches lived inside the committee desk
 * (CommunityPollsTab). P2a opens a second door — the member's own
 * Polls home in Personal mode — and the law is: one ballot box, two
 * doors, IDENTICAL writes. The three cast functions below are the
 * desk's original batches, moved verbatim:
 *
 *  - choice: ballot doc {optionId, votedAt} + the poll's
 *    `options.{id}.votes` +1 and `totalVotes` +1, in ONE batch. The
 *    rules anchor the +1 to the NEW ballot doc under the caller's
 *    own uid — a second vote from any device is impossible, and the
 *    poll doc never learns who chose what.
 *  - multi: ballot doc {optionIds, votedAt} + each picked counter
 *    +1, turnout +1 (pollMultiVoteAnchorOk).
 *  - text: ballot doc {text, votedAt} + turnout +1 only — the
 *    options map never moves (pollTextVoteAnchorOk).
 *
 * The pure plan builder (ballotWritePlan) names exactly which
 * ballot fields and which counters a ballot moves, so the shape is
 * unit-testable without Firestore; the cast functions translate a
 * plan into the batch, adding only the serverTimestamp + increment
 * sentinels. Guards (poll open? already voted? valid picks?) stay
 * with the callers — both doors run the same pollLogic checks
 * before casting.
 */
import { doc, serverTimestamp, increment, writeBatch, type Firestore } from 'firebase/firestore';
import { ABSTAIN_OPTION_ID, type MyBallot, type PollLike } from './pollLogic';

export interface BallotWritePlan {
  /** The ballot doc's fields, minus the votedAt server timestamp. */
  ballotDoc: Record<string, unknown>;
  /** Option counters to move by +1 (empty for a text ballot). */
  optionIncrements: string[];
  /** Turnout always moves by exactly 1. */
  totalVotesIncrement: 1;
  /** P2b: an abstention also moves the poll's abstention counter by 1. */
  abstainIncrement?: boolean;
}

/** The pure shape of a ballot write — what the batch below commits. */
export function ballotWritePlan(ballot: MyBallot): BallotWritePlan {
  if (Array.isArray(ballot.ranking)) {
    // POLLS NEXT-LEVEL P3 — the ranked ballot: the ordered list on
    // the ballot doc, NO option counter moves (no counter can
    // carry a ranking); turnout +1 only, anchored by
    // pollCountedVoteAnchorOk. Counted at conclusion from the
    // ballot papers by the poll's own committee.
    return { ballotDoc: { ranking: [...ballot.ranking] }, optionIncrements: [], totalVotesIncrement: 1 };
  }
  if (Array.isArray(ballot.allocations)) {
    // POLLS NEXT-LEVEL P3 — the points ballot: the allocations
    // list (proven to sum to exactly 100 by pollBallotOk in the
    // rules, and by validateAllocations before this write);
    // turnout +1 only, the same counted anchor.
    return {
      ballotDoc: { allocations: ballot.allocations.map((a) => ({ optionId: a.optionId, points: a.points })) },
      optionIncrements: [],
      totalVotesIncrement: 1,
    };
  }
  if (ballot.abstain === true) {
    // POLLS P2b — the abstention: its own ballot doc, no option
    // counter moves, turnout +1 and the abstention counter +1
    // (pollAbstainVoteAnchorOk in firestore.rules).
    return { ballotDoc: { abstain: true }, optionIncrements: [], totalVotesIncrement: 1, abstainIncrement: true };
  }
  if (typeof ballot.text === 'string') {
    return { ballotDoc: { text: ballot.text }, optionIncrements: [], totalVotesIncrement: 1 };
  }
  if (Array.isArray(ballot.optionIds)) {
    return {
      ballotDoc: { optionIds: [...ballot.optionIds] },
      optionIncrements: [...ballot.optionIds],
      totalVotesIncrement: 1,
    };
  }
  return {
    ballotDoc: { optionId: ballot.optionId },
    optionIncrements: ballot.optionId ? [ballot.optionId] : [],
    totalVotesIncrement: 1,
  };
}

function commitPlan(db: Firestore, pollId: string, uid: string, plan: BallotWritePlan): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'polls', pollId, 'votes', uid), {
    ...plan.ballotDoc,
    votedAt: serverTimestamp(),
  });
  const updates: Record<string, unknown> = { totalVotes: increment(plan.totalVotesIncrement) };
  for (const id of plan.optionIncrements) {
    updates[`options.${id}.votes`] = increment(1);
  }
  if (plan.abstainIncrement) {
    updates['abstainVotes'] = increment(1);
  }
  batch.update(doc(db, 'polls', pollId), updates);
  return batch.commit();
}

/** Single-choice ballot (the desk's original handleVote batch). */
export function castChoiceBallot(db: Firestore, pollId: string, uid: string, optionId: string): Promise<void> {
  return commitPlan(db, pollId, uid, ballotWritePlan({ optionId }));
}

/** Multi-select ballot (the desk's original handleVoteMulti batch). */
export function castMultiBallot(db: Firestore, pollId: string, uid: string, optionIds: string[]): Promise<void> {
  return commitPlan(db, pollId, uid, ballotWritePlan({ optionIds }));
}

/** Free-text ballot (the desk's original handleVoteText batch). */
export function castTextBallot(db: Firestore, pollId: string, uid: string, text: string): Promise<void> {
  return commitPlan(db, pollId, uid, ballotWritePlan({ text }));
}

/** Ranked ballot (P3): the voter's order, most wanted first. */
export function castRankedBallot(db: Firestore, pollId: string, uid: string, ranking: string[]): Promise<void> {
  return commitPlan(db, pollId, uid, ballotWritePlan({ ranking }));
}

/** Points ballot (P3): the voter's 100 points across the heads. */
export function castPointsBallot(
  db: Firestore,
  pollId: string,
  uid: string,
  allocations: { optionId: string; points: number }[]
): Promise<void> {
  return commitPlan(db, pollId, uid, ballotWritePlan({ allocations }));
}

/** The P2b abstention ballot: {abstain: true} + turnout/abstention counters. */
export function castAbstainBallot(db: Firestore, pollId: string, uid: string): Promise<void> {
  return commitPlan(db, pollId, uid, ballotWritePlan({ abstain: true }));
}

/**
 * Cast an abstention on a poll of EITHER generation, through the
 * one shared path: a pre-P2b poll carries its abstain entry inside
 * the options map, so the abstention is a choice ballot naming it
 * (the P0 anchor carries it); a P2b poll takes the dedicated
 * abstain ballot. Both doors call this — the write is identical
 * from the desk and from the member's Polls home.
 */
export function castAbstainVote(
  db: Firestore,
  pollId: string,
  uid: string,
  poll: Pick<PollLike, 'options'>
): Promise<void> {
  if (poll.options && poll.options[ABSTAIN_OPTION_ID]) {
    return castChoiceBallot(db, pollId, uid, ABSTAIN_OPTION_ID);
  }
  return castAbstainBallot(db, pollId, uid);
}
