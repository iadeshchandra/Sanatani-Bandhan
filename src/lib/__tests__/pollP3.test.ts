/**
 * pollP3.test.ts — POLLS NEXT-LEVEL P3: ranked choice, the
 * 100-points budget poll, time polls, and "Where we agree".
 * =====================================================================
 * The laws pinned here:
 *  - a ranking/allocation ballot is ONE ballot doc + turnout +1 and
 *    NO option counter — byte-identical from either door, because
 *    both doors call the one function in lib/pollVoting;
 *  - the ranked count is instant-runoff, deterministic, with every
 *    round recorded; ties are recorded as ties, never broken by
 *    key order; a duplicated id in a ranking counts once;
 *  - a points ballot must sum to EXACTLY 100 — validated here, and
 *    proven again by the rules (the spec suite pins that side);
 *  - the points result is preference, never funds: the outcome
 *    carries points and a points total, nothing money-shaped;
 *  - a time poll's winning slot is read from the recorded outcome
 *    only — a tie yields no slot, so no event can be made from it;
 *  - "Where we agree" reads concluded polls' recorded outcomes:
 *    polls are measured, people never are.
 */
const mockCalls: { sets: unknown[]; updates: unknown[] } = { sets: [], updates: [] };

jest.mock('firebase/firestore', () => ({
  doc: (...parts: unknown[]) => ({
    __ref: parts.filter((p): p is string => typeof p === 'string').join('/'),
  }),
  collection: (...parts: unknown[]) => ({
    __ref: parts.filter((p): p is string => typeof p === 'string').join('/'),
  }),
  getDocs: () => Promise.resolve({ docs: [] }),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  increment: (n: number) => ({ __increment: n }),
  writeBatch: () => ({
    set: (ref: unknown, data: unknown) => {
      mockCalls.sets.push({ ref, data });
    },
    update: (ref: unknown, data: unknown) => {
      mockCalls.updates.push({ ref, data });
    },
    commit: () => Promise.resolve(),
  }),
}));

import {
  ballotCast,
  countPointsOutcome,
  countRankedOutcome,
  pollCountedKind,
  pollKind,
  pollWinningSlot,
  validateAllocations,
  validateRanking,
  POINTS_PER_BALLOT,
  type MyBallot,
  type PollLike,
} from '../pollLogic';
import { ballotWritePlan, castPointsBallot, castRankedBallot } from '../pollVoting';
import { pollAgreementRow, summariseAgreement, type AgreementPoll } from '../pollAgreement';
import { readPollTemplates, templateFromPoll, templateToShape } from '../pollTemplates';

const NOW = new Date('2026-11-24T10:00:00').getTime();
const fakeDb = {} as never;

beforeEach(() => {
  mockCalls.sets.length = 0;
  mockCalls.updates.length = 0;
});

const opts3 = {
  opt_0: { text: 'Anna hall', votes: 0 },
  opt_1: { text: 'Vastra store', votes: 0 },
  opt_2: { text: 'Shiksha wing', votes: 0 },
};

const rankedPoll = (over: Partial<PollLike> = {}): PollLike => ({
  status: 'CONCLUDED',
  kind: 'ranked',
  pollClass: 'pulse',
  totalVotes: 0,
  options: { ...opts3 },
  ...over,
});

const pointsPoll = (over: Partial<PollLike> = {}): PollLike => ({
  status: 'CONCLUDED',
  kind: 'points',
  pollClass: 'pulse',
  totalVotes: 0,
  options: { ...opts3 },
  ...over,
});

describe('kinds — the three new shapes resolve, legacy stays choice', () => {
  it('pollKind + pollCountedKind', () => {
    expect(pollKind({ kind: 'ranked' })).toBe('ranked');
    expect(pollKind({ kind: 'points' })).toBe('points');
    expect(pollKind({ kind: 'time' })).toBe('time');
    expect(pollKind({})).toBe('choice');
    expect(pollKind({ kind: 'nonsense' })).toBe('choice');
    expect(pollCountedKind({ kind: 'ranked' })).toBe(true);
    expect(pollCountedKind({ kind: 'points' })).toBe(true);
    expect(pollCountedKind({ kind: 'time' })).toBe(false);
    expect(pollCountedKind({ kind: 'choice' })).toBe(false);
  });
});

describe('validateRanking — the client half of the ballot law', () => {
  const p = rankedPoll();
  it('accepts a full or partial order of real options', () => {
    expect(validateRanking(p, ['opt_0', 'opt_1', 'opt_2'])).toBeNull();
    expect(validateRanking(p, ['opt_2'])).toBeNull();
  });
  it('refuses empty, duplicated, unknown and oversized rankings', () => {
    expect(validateRanking(p, [])).toBe('empty');
    expect(validateRanking(p, ['opt_0', 'opt_0'])).toBe('duplicate');
    expect(validateRanking(p, ['opt_9'])).toBe('unknown-option');
    expect(validateRanking(p, ['abstain'])).toBe('unknown-option');
    expect(validateRanking(p, ['opt_0', 'opt_1', 'opt_0'])).toBe('duplicate');
    expect(validateRanking(p, ['opt_0', 'opt_1', 'opt_2', 'opt_2'])).toBe('too-many');
  });
});

describe('validateAllocations — exactly 100, no more, no less', () => {
  const p = pointsPoll();
  it('accepts distributions summing to exactly 100', () => {
    expect(POINTS_PER_BALLOT).toBe(100);
    expect(validateAllocations(p, [
      { optionId: 'opt_0', points: 50 },
      { optionId: 'opt_1', points: 30 },
      { optionId: 'opt_2', points: 20 },
    ])).toBeNull();
    expect(validateAllocations(p, [{ optionId: 'opt_1', points: 100 }])).toBeNull();
    expect(validateAllocations(p, [
      { optionId: 'opt_0', points: 100 },
      { optionId: 'opt_1', points: 0 },
    ])).toBeNull();
  });
  it('refuses 99 and 101, bad points, duplicates and strangers', () => {
    expect(validateAllocations(p, [{ optionId: 'opt_0', points: 99 }])).toBe('sum');
    expect(validateAllocations(p, [
      { optionId: 'opt_0', points: 60 },
      { optionId: 'opt_1', points: 41 },
    ])).toBe('sum');
    expect(validateAllocations(p, [{ optionId: 'opt_0', points: 101 }])).toBe('bad-points');
    expect(validateAllocations(p, [{ optionId: 'opt_0', points: -1 }])).toBe('bad-points');
    expect(validateAllocations(p, [{ optionId: 'opt_0', points: 33.5 }])).toBe('bad-points');
    expect(validateAllocations(p, [
      { optionId: 'opt_0', points: 50 },
      { optionId: 'opt_0', points: 50 },
    ])).toBe('duplicate');
    expect(validateAllocations(p, [{ optionId: 'opt_9', points: 100 }])).toBe('unknown-option');
    expect(validateAllocations(p, [])).toBe('empty');
  });
});

describe('the counted ballot write — one doc, turnout +1, no counters', () => {
  it('ballotWritePlan shapes are exact', () => {
    expect(ballotWritePlan({ ranking: ['opt_1', 'opt_0'] })).toEqual({
      ballotDoc: { ranking: ['opt_1', 'opt_0'] },
      optionIncrements: [],
      totalVotesIncrement: 1,
    });
    expect(ballotWritePlan({ allocations: [{ optionId: 'opt_0', points: 100 }] })).toEqual({
      ballotDoc: { allocations: [{ optionId: 'opt_0', points: 100 }] },
      optionIncrements: [],
      totalVotesIncrement: 1,
    });
  });
  it('castRankedBallot commits the shared batch', async () => {
    await castRankedBallot(fakeDb, 'poll-1', 'user-1', ['opt_2', 'opt_0']);
    expect(mockCalls.sets).toEqual([
      { ref: { __ref: 'polls/poll-1/votes/user-1' }, data: { ranking: ['opt_2', 'opt_0'], votedAt: 'SERVER_TIMESTAMP' } },
    ]);
    expect(mockCalls.updates).toEqual([
      { ref: { __ref: 'polls/poll-1' }, data: { totalVotes: { __increment: 1 } } },
    ]);
  });
  it('castPointsBallot commits the shared batch', async () => {
    await castPointsBallot(fakeDb, 'poll-1', 'user-1', [
      { optionId: 'opt_0', points: 70 },
      { optionId: 'opt_2', points: 30 },
    ]);
    expect(mockCalls.sets).toEqual([
      {
        ref: { __ref: 'polls/poll-1/votes/user-1' },
        data: { allocations: [{ optionId: 'opt_0', points: 70 }, { optionId: 'opt_2', points: 30 }], votedAt: 'SERVER_TIMESTAMP' },
      },
    ]);
    expect(mockCalls.updates).toEqual([
      { ref: { __ref: 'polls/poll-1' }, data: { totalVotes: { __increment: 1 } } },
    ]);
  });
  it('ballotCast knows the new shapes', () => {
    expect(ballotCast({ ranking: ['opt_0'] })).toBe(true);
    expect(ballotCast({ allocations: [{ optionId: 'opt_0', points: 100 }] })).toBe(true);
    expect(ballotCast({ ranking: [] })).toBe(false);
    expect(ballotCast({ allocations: [] })).toBe(false);
  });
});

const rankings = (spec: [string[], number][]): MyBallot[] =>
  spec.flatMap(([ranking, n]) => Array.from({ length: n }, () => ({ ranking })));

describe('countRankedOutcome — instant-runoff, rounds recorded', () => {
  it('a first-round majority ends the count in one round', () => {
    const ballots = rankings([[['opt_0'], 5], [['opt_1'], 3]]);
    const out = countRankedOutcome(rankedPoll({ totalVotes: 8 }), ballots, NOW);
    expect(out.countMethod).toBe('irv');
    expect(out.winnerOptionIds).toEqual(['opt_0']);
    expect(out.rounds).toHaveLength(1);
    expect(out.tallies).toEqual({ opt_0: 5, opt_1: 3, opt_2: 0 });
    expect(out.totalVotes).toBe(8);
  });

  it('the lowest drops out and its ballots transfer', () => {
    // First preferences 4/3/2 — no majority of 9; opt_2's voters
    // ranked opt_1 second, so opt_1 wins the second round 5–4.
    const ballots = rankings([
      [['opt_0'], 4],
      [['opt_1'], 3],
      [['opt_2', 'opt_1'], 2],
    ]);
    const out = countRankedOutcome(rankedPoll({ totalVotes: 9 }), ballots, NOW);
    expect(out.winnerOptionIds).toEqual(['opt_1']);
    expect(out.rounds).toHaveLength(2);
    expect(out.rounds![0].tallies).toEqual({ opt_0: 4, opt_1: 3, opt_2: 2 });
    expect(out.rounds![0].eliminated).toEqual(['opt_2']);
    expect(out.rounds![1].tallies).toEqual({ opt_0: 4, opt_1: 5 });
    // The headline tallies stay the FIRST preferences.
    expect(out.tallies).toEqual({ opt_0: 4, opt_1: 3, opt_2: 2 });
  });

  it('a ballot with no standing choice left is exhausted, honestly', () => {
    const ballots = rankings([
      [['opt_0'], 3],
      [['opt_1'], 2],
      [['opt_2'], 1],
    ]);
    const out = countRankedOutcome(rankedPoll({ totalVotes: 6 }), ballots, NOW);
    expect(out.rounds).toHaveLength(2);
    expect(out.rounds![1].exhausted).toBe(1);
    expect(out.rounds![1].continuing).toBe(5);
    expect(out.winnerOptionIds).toEqual(['opt_0']);
  });

  it('a dead heat is a tie — every tied id, never key order', () => {
    const ballots = rankings([[['opt_0'], 2], [['opt_1'], 2]]);
    const out = countRankedOutcome(rankedPoll({ totalVotes: 4 }), ballots, NOW);
    expect(out.winnerOptionIds).toEqual(['opt_0', 'opt_1']);
  });

  it('a tie for lowest is broken by the earliest differing round', () => {
    // R1: 6/5/2/3 → opt_2 out, its 2 ballots go to opt_3.
    // R2: 6/5/5 — opt_1 and opt_3 tie for lowest; in round 1
    // opt_3 (3) was already weaker than opt_1 (5), so opt_3 drops.
    // R3: opt_3's 5 ballots ranked opt_1 next → opt_1 wins 10–6.
    const poll = rankedPoll({
      totalVotes: 16,
      options: {
        opt_0: { text: 'A', votes: 0 },
        opt_1: { text: 'B', votes: 0 },
        opt_2: { text: 'C', votes: 0 },
        opt_3: { text: 'D', votes: 0 },
      },
    });
    const exact: MyBallot[] = [
      ...rankings([[['opt_0'], 6]]),
      ...rankings([[['opt_1'], 5]]),
      ...rankings([[['opt_2', 'opt_3', 'opt_1'], 2]]),
      ...rankings([[['opt_3', 'opt_1'], 3]]),
    ];
    const out = countRankedOutcome(poll, exact, NOW);
    expect(out.rounds).toHaveLength(3);
    expect(out.rounds![0].eliminated).toEqual(['opt_2']);
    expect(out.rounds![1].tallies).toEqual({ opt_0: 6, opt_1: 5, opt_3: 5 });
    expect(out.rounds![1].eliminated).toEqual(['opt_3']);
    expect(out.winnerOptionIds).toEqual(['opt_1']);
  });

  it('options tied through every round are eliminated together', () => {
    // 5/3/3 — opt_1 and opt_2 tie for lowest in the only round
    // there is; no history can separate them, so both drop and
    // opt_0 stands alone with its 5 of the 5 continuing.
    const ballots = rankings([
      [['opt_0'], 5],
      [['opt_1'], 3],
      [['opt_2'], 3],
    ]);
    const out = countRankedOutcome(rankedPoll({ totalVotes: 11 }), ballots, NOW);
    expect(out.rounds![0].eliminated).toEqual(['opt_1', 'opt_2']);
    expect(out.winnerOptionIds).toEqual(['opt_0']);
  });

  it('a duplicated id in one ranking counts once (first wins)', () => {
    const ballots: MyBallot[] = [
      { ranking: ['opt_0', 'opt_0', 'opt_1'] },
      { ranking: ['opt_1'] },
      { ranking: ['opt_1'] },
    ];
    const out = countRankedOutcome(rankedPoll({ totalVotes: 3 }), ballots, NOW);
    expect(out.tallies.opt_0).toBe(1);
    expect(out.tallies.opt_1).toBe(2);
  });

  it('abstentions count in turnout and nowhere in the count', () => {
    const ballots: MyBallot[] = [
      ...rankings([[['opt_0'], 3], [['opt_1'], 1]]),
      { abstain: true },
      { abstain: true },
    ];
    const poll = rankedPoll({ totalVotes: 6, allowAbstain: true, abstainVotes: 2 });
    const out = countRankedOutcome(poll, ballots, NOW);
    expect(out.totalVotes).toBe(6);
    expect(out.tallies['abstain']).toBe(2);
    expect(out.winnerOptionIds).toEqual(['opt_0']);
  });

  it('decision verdicts: quorum on all ballots, pass on the final round', () => {
    const decisionPoll = rankedPoll({
      pollClass: 'decision',
      eligibleCount: 20,
      quorumPct: 25,
      passPct: 50,
    });
    const ballots = rankings([[['opt_0'], 4], [['opt_1'], 3], [['opt_2', 'opt_1'], 2]]);
    const carried = countRankedOutcome({ ...decisionPoll, totalVotes: 9 }, ballots, NOW);
    expect(carried.quorumMet).toBe(true);
    expect(carried.verdict).toBe('carried'); // final round 5 of 9 ≥ 50%
    const noQuorum = countRankedOutcome({ ...decisionPoll, totalVotes: 4 }, rankings([[['opt_0'], 4]]), NOW);
    expect(noQuorum.verdict).toBe('quorum-not-met'); // 4 of 20 < 25%
    const tied = countRankedOutcome(
      { ...decisionPoll, totalVotes: 10 },
      rankings([[['opt_0'], 5], [['opt_1'], 5]]),
      NOW
    );
    expect(tied.verdict).toBe('not-carried');
  });
});

describe('countPointsOutcome — preference summed, never funds', () => {
  it('sums every ballot per head and names the leader', () => {
    const ballots: MyBallot[] = [
      { allocations: [{ optionId: 'opt_0', points: 60 }, { optionId: 'opt_1', points: 40 }] },
      { allocations: [{ optionId: 'opt_0', points: 10 }, { optionId: 'opt_2', points: 90 }] },
    ];
    const out = countPointsOutcome(pointsPoll({ totalVotes: 2 }), ballots, NOW);
    expect(out.countMethod).toBe('points');
    expect(out.tallies).toEqual({ opt_0: 70, opt_1: 40, opt_2: 90 });
    expect(out.pointsTotal).toBe(200);
    expect(out.winnerOptionIds).toEqual(['opt_2']);
  });

  it('a tie at the top names every tied head', () => {
    const ballots: MyBallot[] = [
      { allocations: [{ optionId: 'opt_0', points: 50 }, { optionId: 'opt_1', points: 50 }] },
    ];
    const out = countPointsOutcome(pointsPoll({ totalVotes: 1 }), ballots, NOW);
    expect(out.winnerOptionIds).toEqual(['opt_0', 'opt_1']);
  });

  it('malformed entries are dropped, and the total says so', () => {
    const ballots: MyBallot[] = [
      { allocations: [{ optionId: 'opt_0', points: 100 }] },
      // Written some other way (the rules refuse these at the
      // door): an over-100 entry and a stranger head never count.
      { allocations: [{ optionId: 'opt_1', points: 150 }, { optionId: 'opt_9', points: 100 }] },
      { abstain: true },
    ];
    const out = countPointsOutcome(pointsPoll({ totalVotes: 3 }), ballots, NOW);
    expect(out.tallies).toEqual({ opt_0: 100, opt_1: 0, opt_2: 0 });
    expect(out.pointsTotal).toBe(100);
  });

  it('decision verdict: the pass mark is a share of points placed', () => {
    const decisionPoll = pointsPoll({
      pollClass: 'decision',
      eligibleCount: 10,
      quorumPct: 25,
      passPct: 50,
    });
    const ballots: MyBallot[] = [
      { allocations: [{ optionId: 'opt_0', points: 80 }, { optionId: 'opt_1', points: 20 }] },
      { allocations: [{ optionId: 'opt_0', points: 70 }, { optionId: 'opt_1', points: 30 }] },
      { allocations: [{ optionId: 'opt_0', points: 60 }, { optionId: 'opt_1', points: 40 }] },
    ];
    const out = countPointsOutcome({ ...decisionPoll, totalVotes: 3 }, ballots, NOW);
    expect(out.quorumMet).toBe(true); // 3 of 10 ≥ 25%
    expect(out.verdict).toBe('carried'); // 210 of 300 points ≥ 50%
  });
});

describe('pollWinningSlot — the recorded outcome names the moment', () => {
  const timePoll = (over: Partial<PollLike> = {}): PollLike => ({
    status: 'CONCLUDED',
    kind: 'time',
    totalVotes: 5,
    options: {
      opt_0: { text: 'Saturday', votes: 3, slotAt: 1765000000000 },
      opt_1: { text: 'Sunday', votes: 2, slotAt: 1765100000000 },
    },
    outcome: {
      tallies: { opt_0: 3, opt_1: 2 },
      totalVotes: 5,
      winnerOptionIds: ['opt_0'],
      concludedAt: NOW,
    },
    ...over,
  });
  it('returns the winning slot', () => {
    expect(pollWinningSlot(timePoll())).toEqual({
      optionId: 'opt_0',
      text: 'Saturday',
      slotAt: 1765000000000,
    });
  });
  it('a tie yields no slot — no event from a tied poll', () => {
    const tied = timePoll({
      outcome: { tallies: { opt_0: 2, opt_1: 2 }, totalVotes: 4, winnerOptionIds: ['opt_0', 'opt_1'], concludedAt: NOW },
    });
    expect(pollWinningSlot(tied)).toBeNull();
  });
  it('no outcome, no slot; a non-time poll never has one', () => {
    expect(pollWinningSlot(timePoll({ outcome: undefined }))).toBeNull();
    expect(pollWinningSlot(rankedPoll({
      outcome: { tallies: {}, totalVotes: 0, winnerOptionIds: ['opt_0'], concludedAt: NOW },
    }))).toBeNull();
  });
});

describe('pollAgreementRow — where we agree, from the record', () => {
  const agreePoll = (over: Partial<AgreementPoll> = {}): AgreementPoll => ({
    id: 'p1',
    title: 'Festival date',
    status: 'CONCLUDED',
    kind: 'choice',
    totalVotes: 10,
    options: {
      opt_0: { text: 'October', votes: 8 },
      opt_1: { text: 'November', votes: 2 },
    },
    outcome: {
      tallies: { opt_0: 8, opt_1: 2 },
      totalVotes: 10,
      winnerOptionIds: ['opt_0'],
      concludedAt: NOW,
    },
    ...over,
  });
  it('a united house reads united, with the winner share', () => {
    const row = pollAgreementRow(agreePoll(), NOW);
    expect(row?.band).toBe('united');
    expect(row?.share).toBeCloseTo(0.8);
    expect(row?.leaderText).toBe('October');
  });
  it('a split field reads divided; an exact top tie reads tied', () => {
    const divided = pollAgreementRow(agreePoll({
      outcome: { tallies: { opt_0: 3, opt_1: 2, opt_2: 2 }, totalVotes: 7, winnerOptionIds: ['opt_0'], concludedAt: NOW },
      options: { opt_0: { text: 'A', votes: 3 }, opt_1: { text: 'B', votes: 2 }, opt_2: { text: 'C', votes: 2 } },
    }), NOW);
    expect(divided?.band).toBe('divided');
    const tied = pollAgreementRow(agreePoll({
      outcome: { tallies: { opt_0: 5, opt_1: 5 }, totalVotes: 10, winnerOptionIds: ['opt_0', 'opt_1'], concludedAt: NOW },
    }), NOW);
    expect(tied?.band).toBe('tied');
  });
  it('ranked agreement is the FINAL round share, not first preferences', () => {
    const row = pollAgreementRow(agreePoll({
      kind: 'ranked',
      outcome: {
        tallies: { opt_0: 4, opt_1: 3 },
        totalVotes: 9,
        winnerOptionIds: ['opt_1'],
        concludedAt: NOW,
        countMethod: 'irv',
        rounds: [
          { tallies: { opt_0: 4, opt_1: 3, opt_2: 2 }, eliminated: ['opt_2'], continuing: 9, exhausted: 0 },
          { tallies: { opt_0: 4, opt_1: 5 }, eliminated: [], continuing: 9, exhausted: 0 },
        ],
      },
    }), NOW);
    expect(row?.band).toBe('leaning');
    expect(row?.share).toBeCloseTo(5 / 9);
    expect(row?.leaderText).toBe('November');
  });
  it('points agreement is the leading head share of points', () => {
    const row = pollAgreementRow(agreePoll({
      kind: 'points',
      outcome: {
        tallies: { opt_0: 150, opt_1: 50 },
        totalVotes: 2,
        winnerOptionIds: ['opt_0'],
        concludedAt: NOW,
        countMethod: 'points',
        pointsTotal: 200,
      },
    }), NOW);
    expect(row?.band).toBe('united');
    expect(row?.share).toBeCloseTo(0.75);
  });
  it('text polls and uncounted ranked polls carry no margin', () => {
    expect(pollAgreementRow(agreePoll({ kind: 'text', options: {} }), NOW)?.band).toBe('unmeasured');
    expect(pollAgreementRow(agreePoll({ kind: 'ranked', outcome: undefined }), NOW)?.band).toBe('unmeasured');
  });
  it('a running poll is not in the view at all', () => {
    expect(pollAgreementRow(agreePoll({ status: 'ACTIVE', outcome: undefined }), NOW)).toBeNull();
    const { census } = summariseAgreement([agreePoll(), agreePoll({ id: 'p2', kind: 'text', options: {} })], NOW);
    expect(census.united).toBe(1);
    expect(census.unmeasured).toBe(1);
  });
});

describe('templates — the new kinds ride the shape, moments never do', () => {
  it('a ranked poll templates and re-reads as ranked', () => {
    const poll: any = {
      id: 'p9',
      title: 'Hall design',
      description: '',
      targetAudience: 'ALL_MEMBERS',
      kind: 'ranked',
      pollClass: 'pulse',
      resultVisibility: 'afterVote',
      options: { opt_0: { text: 'Design A', votes: 4 }, opt_1: { text: 'Design B', votes: 2 } },
    };
    const tpl = templateFromPoll(poll, { id: 'tpl_9', name: 'Design vote', recurrence: 'none', now: NOW, uid: 'admin-1' });
    expect(tpl.kind).toBe('ranked');
    expect(templateToShape(tpl).options).toEqual(['Design A', 'Design B']);
    const reread = readPollTemplates([tpl]);
    expect(reread).toHaveLength(1);
    expect(reread[0].kind).toBe('ranked');
  });
  it('a time template keeps slot labels only — slotAt never rides', () => {
    const poll: any = {
      id: 'p10',
      title: 'Satsang time',
      targetAudience: 'ALL_MEMBERS',
      kind: 'time',
      pollClass: 'pulse',
      resultVisibility: 'afterVote',
      options: {
        opt_0: { text: 'Saturday morning', votes: 1, slotAt: 1765000000000 },
        opt_1: { text: 'Sunday evening', votes: 1, slotAt: 1765100000000 },
      },
    };
    const tpl = templateFromPoll(poll, { id: 'tpl_10', name: 'Satsang', recurrence: 'monthly', now: NOW, uid: 'admin-1' });
    expect(tpl.kind).toBe('time');
    expect(templateToShape(tpl).options).toEqual(['Saturday morning', 'Sunday evening']);
    expect(JSON.stringify(tpl)).not.toContain('slotAt');
  });
});
