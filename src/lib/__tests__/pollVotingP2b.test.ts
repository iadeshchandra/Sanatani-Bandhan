/**
 * pollVotingP2b.test.ts — POLLS NEXT-LEVEL P2b: the ONE abstain
 * write path, both poll generations.
 * =====================================================================
 * The law (P2a, carried into P2b): desk votes and Personal-Home
 * votes are byte-identical writes through src/lib/pollVoting.ts.
 * castAbstainVote is the shared abstention door: on a pre-P2b poll
 * (abstain entry inside the options map) the abstention is a
 * choice ballot naming that entry — the write the P0 anchor has
 * always accepted; on a P2b poll it is the dedicated abstain
 * ballot + the abstention counter. This suite pins both batch
 * shapes exactly, with Firestore replaced by a recording stub.
 */
const mockCalls: { sets: unknown[]; updates: unknown[] } = { sets: [], updates: [] };

jest.mock('firebase/firestore', () => ({
  doc: (...parts: unknown[]) => ({
    __ref: parts.filter((p): p is string => typeof p === 'string').join('/'),
  }),
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

import { castAbstainVote } from '../pollVoting';
import { ABSTAIN_OPTION_ID } from '../pollLogic';

const fakeDb = {} as never;

beforeEach(() => {
  mockCalls.sets.length = 0;
  mockCalls.updates.length = 0;
});

describe('castAbstainVote — one door, the right shape per generation', () => {
  it('a legacy poll (abstain inside the map) takes a choice ballot naming the entry', async () => {
    await castAbstainVote(fakeDb, 'poll-1', 'user-1', {
      options: {
        opt_0: { text: 'Yes', votes: 0 },
        [ABSTAIN_OPTION_ID]: { text: 'Abstain', votes: 0 },
      },
    });
    expect(mockCalls.sets).toEqual([
      {
        ref: { __ref: 'polls/poll-1/votes/user-1' },
        data: { optionId: ABSTAIN_OPTION_ID, votedAt: 'SERVER_TIMESTAMP' },
      },
    ]);
    expect(mockCalls.updates).toEqual([
      {
        ref: { __ref: 'polls/poll-1' },
        data: {
          totalVotes: { __increment: 1 },
          [`options.${ABSTAIN_OPTION_ID}.votes`]: { __increment: 1 },
        },
      },
    ]);
  });

  it('a P2b poll takes the abstain ballot + the abstention counter; no option moves', async () => {
    await castAbstainVote(fakeDb, 'poll-2', 'user-9', {
      options: { opt_0: { text: 'Yes', votes: 0 }, opt_1: { text: 'No', votes: 0 } },
    });
    expect(mockCalls.sets).toEqual([
      {
        ref: { __ref: 'polls/poll-2/votes/user-9' },
        data: { abstain: true, votedAt: 'SERVER_TIMESTAMP' },
      },
    ]);
    expect(mockCalls.updates).toEqual([
      {
        ref: { __ref: 'polls/poll-2' },
        data: {
          totalVotes: { __increment: 1 },
          abstainVotes: { __increment: 1 },
        },
      },
    ]);
  });
});
