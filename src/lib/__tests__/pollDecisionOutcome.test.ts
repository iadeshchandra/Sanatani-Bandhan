/**
 * pollDecisionOutcome.test.ts — POLLS NEXT-LEVEL P1: classes, the
 * electorate snapshot, secrecy resolution, and the recorded outcome.
 * =====================================================================
 * The outcome is computed ONCE at conclusion and stored; these tests
 * pin the verdict law so the stored record can never drift from the
 * words the house was shown:
 *  - quorum counts every ballot (abstentions included) against the
 *    frozen electorate;
 *  - the pass mark counts only votes cast for an option;
 *  - a tie at the top is recorded as a tie — all tied ids, verdict
 *    'not-carried', never a silent first-in-key-order winner;
 *  - pulse polls store tallies + winner/tie and NO verdict fields.
 */
import {
  pollClass,
  pollIsBinding,
  pollBallotMode,
  pollElectorateCount,
  computePollOutcome,
  pollStoredOutcome,
  ABSTAIN_OPTION_ID,
  type PollLike,
} from '../pollLogic';

const NOW = new Date('2026-11-23T10:00:00').getTime();

const decision = (over: Partial<PollLike>): PollLike => ({
  status: 'CONCLUDED',
  kind: 'choice',
  pollClass: 'decision',
  eligibleCount: 100,
  quorumPct: 25,
  passPct: 50,
  totalVotes: 0,
  options: { opt_0: { text: 'Yes', votes: 0 }, opt_1: { text: 'No', votes: 0 } },
  ...over,
});

describe('pollClass / pollIsBinding — absent class is a pulse poll', () => {
  it('legacy polls are pulse; decision must be explicit', () => {
    expect(pollClass({})).toBe('pulse');
    expect(pollClass({ pollClass: 'pulse' })).toBe('pulse');
    expect(pollClass({ pollClass: 'decision' })).toBe('decision');
    expect(pollClass({ pollClass: 'nonsense' })).toBe('pulse');
  });
  it('binding is a Decision-only truth', () => {
    expect(pollIsBinding({ pollClass: 'decision', binding: true })).toBe(true);
    expect(pollIsBinding({ pollClass: 'decision', binding: false })).toBe(false);
    expect(pollIsBinding({ pollClass: 'decision' })).toBe(false);
    expect(pollIsBinding({ binding: true })).toBe(false);
  });
});

describe('pollBallotMode — the secrecy matrix, resolved', () => {
  it('a stored Decision choice wins', () => {
    expect(pollBallotMode({ pollClass: 'decision', ballot: 'named' })).toBe('named');
    expect(pollBallotMode({ pollClass: 'decision', ballot: 'secret', targetAudience: 'ALL_MEMBERS' })).toBe('secret');
  });
  it('committee polls are named by design (P0 posture)', () => {
    expect(pollBallotMode({ targetAudience: 'MANAGERS' })).toBe('named');
  });
  it('text polls are an announced box — named in effect', () => {
    expect(pollBallotMode({ kind: 'text', targetAudience: 'ALL_MEMBERS' })).toBe('named');
  });
  it('community choice/multi polls are secret', () => {
    expect(pollBallotMode({ kind: 'choice', targetAudience: 'ALL_MEMBERS' })).toBe('secret');
    expect(pollBallotMode({ kind: 'multi', targetAudience: 'ALL_MEMBERS' })).toBe('secret');
    expect(pollBallotMode({})).toBe('secret');
  });
});

describe('pollElectorateCount — the frozen snapshot source', () => {
  const members = [
    { id: 'd1', userId: 'u1', role: 'DEVOTEE' },
    { id: 'd2', userId: 'u2', role: 'Trustee' },
    { id: 'd3', userId: 'u2', role: 'TRUSTEE' }, // same account, second register row
    { id: 'd4', role: 'MANAGER' },               // no account id — the row itself counts
    { id: 'd5', userId: 'u5', role: 'DEVOTEE' },
  ];
  it('ALL_MEMBERS counts distinct register identities', () => {
    expect(pollElectorateCount(members, 'ALL_MEMBERS')).toBe(4); // u1, u2, d4, u5
  });
  it('MANAGERS counts distinct board-role members only', () => {
    expect(pollElectorateCount(members, 'MANAGERS')).toBe(2); // u2, d4
  });
  it('an empty register is an honest zero', () => {
    expect(pollElectorateCount([], 'ALL_MEMBERS')).toBe(0);
  });
});

describe('computePollOutcome — pulse polls', () => {
  it('stores tallies + winner and NO quorum/verdict fields', () => {
    const o = computePollOutcome(
      { status: 'CONCLUDED', totalVotes: 9, options: { a: { text: 'A', votes: 6 }, b: { text: 'B', votes: 3 } } },
      NOW
    );
    expect(o.tallies).toEqual({ a: 6, b: 3 });
    expect(o.totalVotes).toBe(9);
    expect(o.winnerOptionIds).toEqual(['a']);
    expect(o.concludedAt).toBe(NOW);
    expect(o.turnout).toBeUndefined();
    expect(o.quorumMet).toBeUndefined();
    expect(o.verdict).toBeUndefined();
  });
  it('records a tie as a tie — every tied id', () => {
    const o = computePollOutcome(
      { status: 'CONCLUDED', totalVotes: 10, options: { a: { text: 'A', votes: 5 }, b: { text: 'B', votes: 5 } } },
      NOW
    );
    expect(o.winnerOptionIds).toEqual(['a', 'b']);
  });
  it('no votes — no winner', () => {
    const o = computePollOutcome({ status: 'CONCLUDED', totalVotes: 0, options: { a: { text: 'A', votes: 0 } } }, NOW);
    expect(o.winnerOptionIds).toEqual([]);
  });
  it('abstain is never a winner, however many chose it', () => {
    const o = computePollOutcome(
      {
        status: 'CONCLUDED', totalVotes: 12,
        options: { a: { text: 'A', votes: 2 }, [ABSTAIN_OPTION_ID]: { text: 'Abstain', votes: 10, isAbstain: true } },
      },
      NOW
    );
    expect(o.winnerOptionIds).toEqual(['a']);
    expect(o.tallies[ABSTAIN_OPTION_ID]).toBe(10);
  });
});

describe('computePollOutcome — Decision verdicts', () => {
  it('carried: quorum met and the leader reaches the pass mark', () => {
    const o = computePollOutcome(
      decision({ totalVotes: 60, options: { opt_0: { text: 'Yes', votes: 40 }, opt_1: { text: 'No', votes: 20 } } }),
      NOW
    );
    expect(o.turnout).toBe(0.6);
    expect(o.quorumMet).toBe(true);
    expect(o.verdict).toBe('carried');
    expect(o.winnerOptionIds).toEqual(['opt_0']);
  });
  it('quorum-not-met: too few of the electorate voted, however one-sided', () => {
    const o = computePollOutcome(
      decision({ totalVotes: 20, options: { opt_0: { text: 'Yes', votes: 20 }, opt_1: { text: 'No', votes: 0 } } }),
      NOW
    );
    expect(o.turnout).toBe(0.2);
    expect(o.quorumMet).toBe(false);
    expect(o.verdict).toBe('quorum-not-met');
    // The leader is still recorded — the verdict, not the tally, carries the failure.
    expect(o.winnerOptionIds).toEqual(['opt_0']);
  });
  it('quorum is exact at the mark: 25 of 100 meets a 25% quorum', () => {
    const o = computePollOutcome(
      decision({ totalVotes: 25, options: { opt_0: { text: 'Yes', votes: 25 }, opt_1: { text: 'No', votes: 0 } } }),
      NOW
    );
    expect(o.quorumMet).toBe(true);
    expect(o.verdict).toBe('carried');
  });
  it('not-carried: quorum met but the leader falls below the pass mark', () => {
    const o = computePollOutcome(
      decision({
        totalVotes: 60,
        options: { opt_0: { text: 'A', votes: 24 }, opt_1: { text: 'B', votes: 20 }, opt_2: { text: 'C', votes: 16 } },
      }),
      NOW
    );
    expect(o.quorumMet).toBe(true);
    expect(o.verdict).toBe('not-carried'); // 24/60 = 40% < 50%
    expect(o.winnerOptionIds).toEqual(['opt_0']);
  });
  it('the pass mark is reached exactly: 30 of 60 at 50% carries', () => {
    const o = computePollOutcome(
      decision({ totalVotes: 60, options: { opt_0: { text: 'Yes', votes: 30 }, opt_1: { text: 'No', votes: 30 } } }),
      NOW
    );
    // 30–30 is a TIE first: no single option carried the house.
    expect(o.winnerOptionIds).toEqual(['opt_0', 'opt_1']);
    expect(o.verdict).toBe('not-carried');
    const o2 = computePollOutcome(
      decision({ totalVotes: 60, options: { opt_0: { text: 'Yes', votes: 30 }, opt_1: { text: 'No', votes: 20 }, opt_2: { text: 'C', votes: 10 } } }),
      NOW
    );
    expect(o2.verdict).toBe('carried'); // exactly 50% of votes for an option
  });
  it('abstentions count toward quorum but not toward the pass base', () => {
    const o = computePollOutcome(
      decision({
        totalVotes: 30, // 30 ≥ 25% of 100 → quorum met, abstentions included
        options: {
          opt_0: { text: 'Yes', votes: 12 },
          opt_1: { text: 'No', votes: 8 },
          [ABSTAIN_OPTION_ID]: { text: 'Abstain', votes: 10, isAbstain: true },
        },
      }),
      NOW
    );
    expect(o.quorumMet).toBe(true);
    expect(o.verdict).toBe('carried'); // 12 / (30 − 10) = 60% ≥ 50%
  });
  it('no electorate recorded: quorum cannot be judged, the vote still decides', () => {
    const o = computePollOutcome(
      decision({ eligibleCount: 0, totalVotes: 10, options: { opt_0: { text: 'Yes', votes: 9 }, opt_1: { text: 'No', votes: 1 } } }),
      NOW
    );
    expect(o.turnout).toBeUndefined();
    expect(o.quorumMet).toBeUndefined();
    expect(o.verdict).toBe('carried');
  });
  it('zero ballots on a Decision poll: quorum not met when an electorate exists', () => {
    const o = computePollOutcome(decision({ totalVotes: 0 }), NOW);
    expect(o.verdict).toBe('quorum-not-met');
    expect(o.winnerOptionIds).toEqual([]);
  });
  it('text Decision poll: quorum met completes the consultation', () => {
    const o = computePollOutcome(
      decision({ kind: 'text', options: {}, totalVotes: 40 }),
      NOW
    );
    expect(o.verdict).toBe('carried');
    expect(o.winnerOptionIds).toEqual([]);
    const o2 = computePollOutcome(decision({ kind: 'text', options: {}, totalVotes: 3 }), NOW);
    expect(o2.verdict).toBe('quorum-not-met');
  });
  it('corrupt percentage fields fall back to the defaults', () => {
    const o = computePollOutcome(
      decision({ quorumPct: 250 as never, passPct: -1 as never, totalVotes: 30, options: { opt_0: { text: 'Yes', votes: 30 }, opt_1: { text: 'No', votes: 0 } } }),
      NOW
    );
    expect(o.quorumMet).toBe(true); // default 25% of 100 = 25 ≤ 30
    expect(o.verdict).toBe('carried'); // default pass 50%
  });
});

describe('pollStoredOutcome — the reader', () => {
  it('round-trips a computed outcome', () => {
    const stored = computePollOutcome(
      decision({ totalVotes: 60, options: { opt_0: { text: 'Yes', votes: 40 }, opt_1: { text: 'No', votes: 20 } } }),
      NOW
    );
    expect(pollStoredOutcome({ outcome: stored })).toEqual(stored);
  });
  it('rejects absent and malformed outcomes (legacy polls derive instead)', () => {
    expect(pollStoredOutcome({})).toBeNull();
    expect(pollStoredOutcome({ outcome: { totalVotes: 'many' } as never })).toBeNull();
    expect(pollStoredOutcome({ outcome: { totalVotes: 3, concludedAt: 1, tallies: {}, winnerOptionIds: 'x' } as never })).toBeNull();
  });
});
