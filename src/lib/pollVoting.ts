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
import type { MyBallot } from './pollLogic';

export interface BallotWritePlan {
  /** The ballot doc's fields, minus the votedAt server timestamp. */
  ballotDoc: Record<string, unknown>;
  /** Option counters to move by +1 (empty for a text ballot). */
  optionIncrements: string[];
  /** Turnout always moves by exactly 1. */
  totalVotesIncrement: 1;
}

/** The pure shape of a ballot write — what the batch below commits. */
export function ballotWritePlan(ballot: MyBallot): BallotWritePlan {
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
