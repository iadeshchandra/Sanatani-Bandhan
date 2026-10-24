/**
 * resolutionLogic.test.ts — EVENTS + POLLS P0: resolution truth.
 * =====================================================================
 * Pins the conclusion math that firestore.rules mirrors
 * (resQuorumOk / resOutcomeOk): quorum from the ACTUAL board size,
 * outcomes derived from the record, voting frozen at the deadline,
 * and counts that are always a tally of the recorded voters.
 */
import {
  tallyFromVoters, resolutionQuorumMet, resolutionOutcome,
  resolutionIsExpired, resolutionIsOpen, resolutionEffectiveStatus,
  hasUserVoted, concludeResolution, type ResolutionLike,
} from '../resolutionLogic';

const res = (over: Partial<ResolutionLike>): ResolutionLike => ({
  status: 'Pending Review',
  votesInFavor: 0,
  votesAgainst: 0,
  ...over,
});

describe('tallyFromVoters — counts are a tally of the map, nothing else', () => {
  it('counts favor/against and ignores junk values', () => {
    expect(tallyFromVoters({ a: 'favor', b: 'against', c: 'favor' })).toEqual({ favor: 2, against: 1, cast: 3 });
    expect(tallyFromVoters(undefined)).toEqual({ favor: 0, against: 0, cast: 0 });
    expect(tallyFromVoters({})).toEqual({ favor: 0, against: 0, cast: 0 });
  });
});

describe('quorum — from the actual board size', () => {
  it('needs strictly more than half the board to have voted', () => {
    expect(resolutionQuorumMet(res({ boardSize: 7, votesInFavor: 3, votesAgainst: 0 }))).toBe(false); // 3 of 7
    expect(resolutionQuorumMet(res({ boardSize: 7, votesInFavor: 4, votesAgainst: 0 }))).toBe(true); // 4 of 7
    expect(resolutionQuorumMet(res({ boardSize: 5, votesInFavor: 2, votesAgainst: 1 }))).toBe(true); // 3 of 5
    expect(resolutionQuorumMet(res({ boardSize: 4, votesInFavor: 2, votesAgainst: 0 }))).toBe(false); // exactly half is not quorum
  });

  it('falls back to two distinct voters when no roster was kept', () => {
    expect(resolutionQuorumMet(res({ boardSize: 0, votesInFavor: 1, votesAgainst: 0 }))).toBe(false);
    expect(resolutionQuorumMet(res({ boardSize: 0, votesInFavor: 1, votesAgainst: 1 }))).toBe(true);
    expect(resolutionQuorumMet(res({ votesInFavor: 2, votesAgainst: 0 }))).toBe(true); // boardSize absent
  });
});

describe('outcome — Passed / Rejected / Deferred, never asserted', () => {
  it('passes only with quorum and a favor majority', () => {
    expect(resolutionOutcome(res({ boardSize: 5, votesInFavor: 3, votesAgainst: 1 }))).toBe('Passed');
  });
  it('rejects on a tie or against-majority when quorum is met', () => {
    expect(resolutionOutcome(res({ boardSize: 5, votesInFavor: 2, votesAgainst: 2 }))).toBe('Rejected');
    expect(resolutionOutcome(res({ boardSize: 3, votesInFavor: 1, votesAgainst: 2 }))).toBe('Rejected');
  });
  it('defers (does not decide) when quorum is not met — even if favor leads', () => {
    expect(resolutionOutcome(res({ boardSize: 9, votesInFavor: 3, votesAgainst: 0 }))).toBe('Deferred');
  });
});

describe('deadline — status is derived, not visit-dependent', () => {
  const r = res({ boardSize: 3, votesInFavor: 2, votesAgainst: 0, expiresAt: 1000 });
  it('is open before the deadline and frozen at it', () => {
    expect(resolutionIsOpen(r, 999)).toBe(true);
    expect(resolutionIsOpen(r, 1000)).toBe(false);
    expect(resolutionIsExpired(r, 1000)).toBe(true);
  });
  it('an expired open resolution already reads as its outcome', () => {
    expect(resolutionEffectiveStatus(r, 500)).toBe('Pending Review');
    expect(resolutionEffectiveStatus(r, 1500)).toBe('Passed');
  });
  it('a stored outcome always wins over derivation', () => {
    expect(resolutionEffectiveStatus(res({ status: 'Rejected', expiresAt: 1000 }), 500)).toBe('Rejected');
  });
  it('no deadline recorded → never expires', () => {
    expect(resolutionIsExpired(res({}), Number.MAX_SAFE_INTEGER)).toBe(false);
    expect(resolutionIsOpen(res({}), Number.MAX_SAFE_INTEGER)).toBe(true);
  });
});

describe('hasUserVoted — from the recorded map only', () => {
  it('reads the voters map, keyed by real uid', () => {
    const r = res({ voters: { uidA: 'favor' } });
    expect(hasUserVoted(r, 'uidA')).toBe(true);
    expect(hasUserVoted(r, 'uidB')).toBe(false);
    expect(hasUserVoted(r, '')).toBe(false);
    expect(hasUserVoted(r, null)).toBe(false);
    expect(hasUserVoted(res({}), 'uidA')).toBe(false);
  });
});

describe('concludeResolution — the persisted conclusion', () => {
  it('writes outcome, quorum and timestamp consistently', () => {
    const c = concludeResolution(res({ boardSize: 5, votesInFavor: 3, votesAgainst: 1, expiresAt: 10 }), 2000);
    expect(c.status).toBe('Passed');
    expect(c.quorumMet).toBe(true);
    expect(c.concludedAt).toBe(2000);
    expect(c.details).toContain('4 of 5 board members voted');
    expect(c.details).toContain('quorum met');
  });
  it('a quorum-less expiry concludes as Deferred with honest wording', () => {
    const c = concludeResolution(res({ boardSize: 9, votesInFavor: 1, votesAgainst: 0 }), 2000);
    expect(c.status).toBe('Deferred');
    expect(c.quorumMet).toBe(false);
    expect(c.details).toContain('quorum not met');
  });
});
