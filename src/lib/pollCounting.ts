/**
 * pollCounting.ts — POLLS NEXT-LEVEL P3: the committee count.
 * =====================================================================
 * Counter kinds (choice / multi / text / time, and every abstain
 * generation) keep their counts on the poll doc itself, and their
 * outcome is computed from the doc alone (computePollOutcome).
 * The two COUNTED kinds — ranked and points — cannot: no counter
 * can carry a ranking or an allocation. Their ballots are counted
 * at conclusion from the ballot papers by the poll's own
 * committee, the scrutineer model the plan adopts:
 *
 *  - the rules let the poll's own committee read those ballots
 *    (the announced posture text polls have always taken);
 *  - this module fetches the papers and runs the deterministic
 *    counters in lib/pollLogic (instant-runoff with every round
 *    recorded; points summed per head);
 *  - the result is stored ONCE on the poll doc through the same
 *    write-once outcome path every other kind uses.
 *
 * Both doors share this module — the desk's conclude + stamp and
 * the member door's board-member stamp — so a poll is counted the
 * same way whoever's device performs the count. The counters are
 * pure and deterministic: two devices counting the same papers
 * produce the same outcome, and the rules refuse a second stamp.
 */
import { collection, getDocs, type Firestore } from 'firebase/firestore';
import {
  computePollOutcome,
  countPointsOutcome,
  countRankedOutcome,
  pollCountedKind,
  pollKind,
  type MyBallot,
  type PollLike,
  type PollOutcome,
} from './pollLogic';

/** A poll doc as the counters read it (the logic shape + its id). */
export interface CountablePoll extends PollLike {
  id: string;
}

/** Every ballot paper of a poll, shaped as the voter's own ballot. */
export async function fetchPollBallots(db: Firestore, pollId: string): Promise<MyBallot[]> {
  const snap = await getDocs(collection(db, 'polls', pollId, 'votes'));
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      ...(typeof data.optionId === 'string' ? { optionId: data.optionId } : {}),
      ...(Array.isArray(data.optionIds) ? { optionIds: data.optionIds as string[] } : {}),
      ...(typeof data.text === 'string' ? { text: data.text } : {}),
      ...(data.abstain === true ? { abstain: true } : {}),
      ...(Array.isArray(data.ranking) ? { ranking: data.ranking as string[] } : {}),
      ...(Array.isArray(data.allocations)
        ? { allocations: data.allocations as { optionId: string; points: number }[] }
        : {}),
    };
  });
}

/**
 * The outcome of a concluded poll, from wherever its count lives:
 * the poll doc's own counters for counter kinds (no fetch), the
 * ballot papers for counted kinds (one fetch, committee-read).
 */
export async function countPollOutcome(db: Firestore, poll: CountablePoll): Promise<PollOutcome> {
  if (!pollCountedKind(poll)) return computePollOutcome(poll, Date.now());
  const ballots = await fetchPollBallots(db, poll.id);
  return pollKind(poll) === 'ranked'
    ? countRankedOutcome(poll, ballots, Date.now())
    : countPointsOutcome(poll, ballots, Date.now());
}
