/**
 * pollLogic.test.ts — EVENTS + POLLS P0: poll read truth.
 * =====================================================================
 * The ballot-box model (totalVotes on the doc + private ballot docs)
 * and the legacy model (a votedUsers map on the doc) must read as one
 * truth: totals resolve explicit-count → legacy map → option sum,
 * and openness is read from the deadline itself.
 */
import { pollTotalVotes, pollOptionList, pollIsOpen, type PollLike } from '../pollLogic';

describe('pollTotalVotes — one total across both data models', () => {
  it('prefers the explicit ballot-box total', () => {
    const p: PollLike = { totalVotes: 7, votedUsers: { a: 'opt_0' }, options: { opt_0: { votes: 3 } } };
    expect(pollTotalVotes(p)).toBe(7);
  });
  it('falls back to the legacy votedUsers map size', () => {
    const p: PollLike = { votedUsers: { a: 'opt_0', b: 'opt_1' }, options: { opt_0: { votes: 9 } } };
    expect(pollTotalVotes(p)).toBe(2);
  });
  it('falls back to the option-count sum for very old docs', () => {
    const p: PollLike = { options: { opt_0: { votes: 4 }, opt_1: { votes: 5 } } };
    expect(pollTotalVotes(p)).toBe(9);
    expect(pollTotalVotes({})).toBe(0);
  });
});

describe('pollOptionList', () => {
  it('keeps the doc key order and defaults missing fields', () => {
    const p: PollLike = { options: { opt_1: { text: 'Later', votes: 2 }, opt_0: { text: 'First' } } };
    expect(pollOptionList(p)).toEqual([
      { id: 'opt_1', text: 'Later', votes: 2 },
      { id: 'opt_0', text: 'First', votes: 0 },
    ]);
  });
});

describe('pollIsOpen — the deadline is read from the record', () => {
  it('open only while ACTIVE and before the deadline', () => {
    expect(pollIsOpen({ status: 'ACTIVE', expiresAt: 1000 }, 999)).toBe(true);
    expect(pollIsOpen({ status: 'ACTIVE', expiresAt: 1000 }, 1000)).toBe(false);
    expect(pollIsOpen({ status: 'CONCLUDED', expiresAt: 9999 }, 10)).toBe(false);
    expect(pollIsOpen({ status: 'ACTIVE' }, Number.MAX_SAFE_INTEGER)).toBe(true);
  });
});
