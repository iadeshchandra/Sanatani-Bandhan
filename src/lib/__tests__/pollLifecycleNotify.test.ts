/**
 * pollLifecycleNotify.test.ts — NOTIFICATION WAVE 1 pure-logic pins.
 * =====================================================================
 * The poll lifecycle trio's judgements: the audience gate (members,
 * not followers; MANAGERS ⇒ board only), the own-ballot suppression
 * for opened/closing (a member who voted is never nagged — and the
 * predicate reads ONLY their own ballot), one stage per poll per
 * pass (concluded > closing > opened), and the verdict fragment a
 * concluded poll's body carries from its recorded outcome (P1).
 */
import {
  pickPollLifecycleNotices,
  pollVerdictFragment,
  POLL_CLOSING_WINDOW_MS,
} from '../pollLifecycleNotify';
import type { MemberPollDoc } from '../memberPolls';
import type { MyBallot, PollOutcome } from '../pollLogic';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const FUTURE = NOW + 3 * DAY;
const PAST = NOW - DAY;

function poll(partial: Partial<MemberPollDoc> & { id: string }): MemberPollDoc {
  return {
    status: 'ACTIVE',
    expiresAt: FUTURE,
    totalVotes: 0,
    options: { opt_0: { text: 'Yes', votes: 0 }, opt_1: { text: 'No', votes: 0 } },
    targetAudience: 'ALL_MEMBERS',
    title: `Poll ${partial.id}`,
    workspaceId: 'ws1',
    ...partial,
  };
}

function pick(
  polls: MemberPollDoc[],
  over: {
    role?: string;
    ballots?: Record<string, MyBallot | null>;
    notified?: string[];
    now?: number;
  } = {},
) {
  return pickPollLifecycleNotices({
    polls,
    roleByWorkspace: { ws1: over.role ?? 'Devotee' },
    myBallots: over.ballots ?? {},
    notified: new Set(over.notified ?? []),
    now: over.now ?? NOW,
  });
}

const VOTED: MyBallot = { optionId: 'opt_0' };

describe('poll opened', () => {
  it('fires for an open poll the member has not voted in', () => {
    const out = pick([poll({ id: 'p1' })]);
    expect(out).toHaveLength(1);
    expect(out[0].stage).toBe('opened');
    expect(out[0].dedupeKey).toBe('poll:p1:opened');
    expect(out[0].suppressed).toBe(false);
  });

  it('is suppressed (settled, never emitted) when the member already voted', () => {
    const out = pick([poll({ id: 'p1' })], { ballots: { p1: VOTED } });
    expect(out).toHaveLength(1);
    expect(out[0].suppressed).toBe(true);
  });

  it('never re-fires once its dedupe key is settled', () => {
    expect(pick([poll({ id: 'p1' })], { notified: ['poll:p1:opened'] })).toHaveLength(0);
  });

  it('hides MANAGERS polls from non-board members, shows them to the board', () => {
    const managers = poll({ id: 'p2', targetAudience: 'MANAGERS' });
    expect(pick([managers], { role: 'Devotee' })).toHaveLength(0);
    expect(pick([managers], { role: 'Trustee' })).toHaveLength(1);
    expect(pick([managers], { role: 'Manager' })).toHaveLength(1);
  });

  it('skips polls with no workspace', () => {
    expect(pick([poll({ id: 'p3', workspaceId: undefined })])).toHaveLength(0);
  });
});

describe('poll closing soon', () => {
  it('fires inside the 24h window and outranks opened (one notice per pass)', () => {
    const out = pick([poll({ id: 'p1', expiresAt: NOW + POLL_CLOSING_WINDOW_MS - 1 })]);
    expect(out).toHaveLength(1);
    expect(out[0].stage).toBe('closing');
    expect(out[0].dedupeKey).toBe('poll:p1:closing');
  });

  it('does not fire outside the window', () => {
    const out = pick([poll({ id: 'p1', expiresAt: NOW + POLL_CLOSING_WINDOW_MS + DAY })]);
    expect(out[0].stage).toBe('opened');
  });

  it('is suppressed when the member already voted', () => {
    const out = pick([poll({ id: 'p1', expiresAt: NOW + 60_000 })], { ballots: { p1: VOTED } });
    expect(out).toHaveLength(1);
    expect(out[0].stage).toBe('closing');
    expect(out[0].suppressed).toBe(true);
  });
});

describe('poll concluded', () => {
  const outcome: PollOutcome = {
    tallies: { opt_0: 7, opt_1: 3 },
    totalVotes: 10,
    winnerOptionIds: ['opt_0'],
    concludedAt: PAST,
  };

  it('fires for a CONCLUDED poll and carries the stored outcome', () => {
    const out = pick([poll({ id: 'p1', status: 'CONCLUDED', outcome })]);
    expect(out).toHaveLength(1);
    expect(out[0].stage).toBe('concluded');
    expect(out[0].dedupeKey).toBe('poll:p1:concluded');
    expect(out[0].outcome).toEqual(outcome);
    expect(out[0].suppressed).toBe(false);
  });

  it('fires for an ACTIVE poll past its deadline (auto-conclusion)', () => {
    const out = pick([poll({ id: 'p1', expiresAt: PAST })]);
    expect(out).toHaveLength(1);
    expect(out[0].stage).toBe('concluded');
    expect(out[0].outcome).toBeNull();
  });

  it('reaches members who voted too — a result is news, not a nag', () => {
    const out = pick([poll({ id: 'p1', status: 'CONCLUDED' })], { ballots: { p1: VOTED } });
    expect(out).toHaveLength(1);
    expect(out[0].suppressed).toBe(false);
  });
});

describe('pollVerdictFragment', () => {
  const decision = (o: Partial<PollOutcome>): MemberPollDoc =>
    poll({
      id: 'd1',
      status: 'CONCLUDED',
      pollClass: 'decision',
      outcome: {
        tallies: { opt_0: 7, opt_1: 3 },
        totalVotes: 10,
        winnerOptionIds: ['opt_0'],
        concludedAt: PAST,
        ...o,
      },
    });

  it('decision carried → carried fragment', () => {
    expect(pollVerdictFragment(decision({ verdict: 'carried' }))).toEqual({ key: 'pollVerdictCarried' });
  });

  it('decision not-carried → not-carried fragment', () => {
    expect(pollVerdictFragment(decision({ verdict: 'not-carried' }))).toEqual({ key: 'pollVerdictNotCarried' });
  });

  it('quorum not met → quorum fragment', () => {
    expect(pollVerdictFragment(decision({ verdict: 'quorum-not-met', quorumMet: false }))).toEqual({
      key: 'pollVerdictQuorumNotMet',
    });
  });

  it('a recorded tie speaks as a tie, never a silent win', () => {
    expect(
      pollVerdictFragment(decision({ verdict: 'not-carried', winnerOptionIds: ['opt_0', 'opt_1'] })),
    ).toEqual({ key: 'pollVerdictTie' });
  });

  it('a carried text consultation reports its response count', () => {
    const p = decision({ verdict: 'carried', totalVotes: 42 });
    p.kind = 'text';
    p.options = {};
    expect(pollVerdictFragment(p)).toEqual({ key: 'pollVerdictResponses', count: 42 });
  });

  it('pulse winner names the leading option', () => {
    const p = poll({
      id: 'pl1',
      status: 'CONCLUDED',
      outcome: { tallies: { opt_0: 9, opt_1: 2 }, totalVotes: 11, winnerOptionIds: ['opt_0'], concludedAt: PAST },
    });
    expect(pollVerdictFragment(p)).toEqual({ key: 'pollVerdictWinner', winner: 'Yes' });
  });

  it('pulse tie → tie fragment; no stored outcome → null (plain line)', () => {
    const tie = poll({
      id: 'pl2',
      status: 'CONCLUDED',
      outcome: { tallies: { opt_0: 5, opt_1: 5 }, totalVotes: 10, winnerOptionIds: ['opt_0', 'opt_1'], concludedAt: PAST },
    });
    expect(pollVerdictFragment(tie)).toEqual({ key: 'pollVerdictTie' });
    expect(pollVerdictFragment(poll({ id: 'pl3', status: 'CONCLUDED' }))).toBeNull();
  });
});
