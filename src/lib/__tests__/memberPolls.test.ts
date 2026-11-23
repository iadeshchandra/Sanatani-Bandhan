/**
 * memberPolls.test.ts — POLLS NEXT-LEVEL P2a pure-logic pins.
 * =====================================================================
 * The member door's judgements: cross-workspace list assembly with
 * the per-workspace audience gate, the ordering a member's home
 * shows (awaiting my vote first), the reminder broadcast's compose /
 * parse contract, and — the heart of the batch — the suppression
 * predicate: a reminder may show only while the poll is open AND
 * the member's OWN ballot does not exist. Plus the shared ballot
 * write plan (lib/pollVoting) whose batches both doors cast.
 */
import {
  assembleMemberPolls,
  isPollBoardRole,
  matchReminderPolls,
  memberPollsAwaitingCount,
  parsePollReminderBroadcast,
  pollReminderBroadcastBody,
  pollReminderBroadcastTitle,
  pollVisibleToMember,
  shouldShowPollReminder,
  type MemberPollDoc,
} from '../memberPolls';
import { ballotWritePlan } from '../pollVoting';

const NOW = 1_800_000_000_000;
const FUTURE = NOW + 3 * 24 * 60 * 60 * 1000;
const PAST = NOW - 24 * 60 * 60 * 1000;

function poll(partial: Partial<MemberPollDoc> & { id: string }): MemberPollDoc {
  return {
    status: 'ACTIVE',
    expiresAt: FUTURE,
    totalVotes: 0,
    options: { opt_0: { text: 'Yes', votes: 0 }, opt_1: { text: 'No', votes: 0 } },
    targetAudience: 'ALL_MEMBERS',
    title: `Poll ${partial.id}`,
    ...partial,
  };
}

describe('pollVisibleToMember — the per-workspace audience gate', () => {
  it('ALL_MEMBERS polls are visible to every member', () => {
    expect(pollVisibleToMember(poll({ id: 'a' }), 'Devotee')).toBe(true);
    expect(pollVisibleToMember(poll({ id: 'a' }), '')).toBe(true);
  });

  it('MANAGERS polls surface only to board roles of that workspace', () => {
    const p = poll({ id: 'b', targetAudience: 'MANAGERS' });
    expect(pollVisibleToMember(p, 'Trustee')).toBe(true);
    expect(pollVisibleToMember(p, 'MANAGER')).toBe(true);
    expect(pollVisibleToMember(p, 'SuperAdmin')).toBe(true);
    expect(pollVisibleToMember(p, 'Devotee')).toBe(false);
    expect(pollVisibleToMember(p, 'Accountant')).toBe(false);
    expect(pollVisibleToMember(p, null)).toBe(false);
  });

  it('isPollBoardRole matches the electorate board set', () => {
    expect(isPollBoardRole('TRUSTEE')).toBe(true);
    expect(isPollBoardRole('Priest')).toBe(false);
    expect(isPollBoardRole(undefined)).toBe(false);
  });
});

describe('assembleMemberPolls — the cross-workspace list', () => {
  const memberships = [
    { workspaceId: 'ws1', role: 'Devotee' },
    { workspaceId: 'ws2', role: 'Trustee' },
  ];
  const workspaceNames = { ws1: 'Mayapur Samaj', ws2: 'Village Mandir' };
  const pollsByWorkspace = {
    ws1: [
      poll({ id: 'p-open-late', workspaceId: 'ws1', expiresAt: FUTURE + 1000 }),
      poll({ id: 'p-open-soon', workspaceId: 'ws1', expiresAt: FUTURE }),
      poll({ id: 'p-committee', workspaceId: 'ws1', targetAudience: 'MANAGERS' }),
      poll({ id: 'p-done', workspaceId: 'ws1', status: 'CONCLUDED', createdAt: 500 }),
    ],
    ws2: [
      poll({ id: 'p-board', workspaceId: 'ws2', targetAudience: 'MANAGERS' }),
      poll({ id: 'p-voted', workspaceId: 'ws2', expiresAt: FUTURE }),
    ],
  };
  const myBallots = {
    'p-voted': { optionId: 'opt_0' },
    'p-done': { optionId: 'opt_1' },
  };

  const entries = assembleMemberPolls({ memberships, workspaceNames, pollsByWorkspace, myBallots, now: NOW });

  it('gathers polls from every workspace the member belongs to', () => {
    const ids = entries.map((e) => e.poll.id).sort();
    expect(ids).toEqual(['p-board', 'p-done', 'p-open-late', 'p-open-soon', 'p-voted']);
  });

  it('hides a committee poll from a non-board member of that workspace, shows it to a board member of another', () => {
    expect(entries.some((e) => e.poll.id === 'p-committee')).toBe(false); // Devotee in ws1
    const board = entries.find((e) => e.poll.id === 'p-board'); // Trustee in ws2
    expect(board?.isBoard).toBe(true);
    expect(board?.workspaceName).toBe('Village Mandir');
  });

  it('orders: awaiting my vote (soonest deadline first), then voted, then concluded', () => {
    // p-open-soon and p-board share the FUTURE deadline; the sort is
    // stable, so ws1's poll (iterated first) stays ahead of ws2's.
    expect(entries.map((e) => e.poll.id)).toEqual([
      'p-open-soon', 'p-board', 'p-open-late',
      'p-voted',
      'p-done',
    ]);
    expect(entries.find((e) => e.poll.id === 'p-voted')?.hasVoted).toBe(true);
  });

  it('counts only open, unvoted polls as awaiting', () => {
    expect(memberPollsAwaitingCount(entries)).toBe(3); // p-open-soon, p-open-late, p-board
  });

  it('a workspace with no membership edge contributes nothing', () => {
    const none = assembleMemberPolls({
      memberships: [],
      workspaceNames,
      pollsByWorkspace,
      myBallots,
      now: NOW,
    });
    expect(none).toEqual([]);
  });
});

describe('the reminder broadcast contract', () => {
  it('title compose/parse round-trips the poll title', () => {
    const title = pollReminderBroadcastTitle('Which day for the festival?');
    expect(title).toBe('Voting reminder: Which day for the festival?');
    expect(parsePollReminderBroadcast({ title })).toBe('Which day for the festival?');
  });

  it('non-reminder broadcasts do not parse', () => {
    expect(parsePollReminderBroadcast({ title: 'Voting reminder:' })).toBeNull();
    expect(parsePollReminderBroadcast({ title: 'Festival announcement' })).toBeNull();
    expect(parsePollReminderBroadcast({})).toBeNull();
    expect(parsePollReminderBroadcast(null)).toBeNull();
  });

  it('body interpolates the closes sentence and degrades without one', () => {
    const tpl = 'Voting is open{closes}. Cast your vote from Polls.';
    expect(pollReminderBroadcastBody(tpl, ' until 28 Nov')).toBe('Voting is open until 28 Nov. Cast your vote from Polls.');
    expect(pollReminderBroadcastBody(tpl, '')).toBe('Voting is open. Cast your vote from Polls.');
  });

  it('matchReminderPolls matches the exact title under the audience gate', () => {
    const polls = [
      poll({ id: 'x', title: 'Festival date?' }),
      poll({ id: 'y', title: 'Festival date?', targetAudience: 'MANAGERS' }),
      poll({ id: 'z', title: 'Other question' }),
    ];
    expect(matchReminderPolls(polls, 'Festival date?', 'Devotee').map((p) => p.id)).toEqual(['x']);
    expect(matchReminderPolls(polls, 'Festival date?', 'Trustee').map((p) => p.id)).toEqual(['x', 'y']);
    expect(matchReminderPolls(polls, 'Missing', 'Trustee')).toEqual([]);
  });
});

describe('shouldShowPollReminder — the secrecy-safe suppression predicate', () => {
  const open = poll({ id: 'r' });

  it('shows for an open poll the member has not voted in', () => {
    expect(shouldShowPollReminder({ poll: open, myBallot: null, now: NOW })).toBe(true);
    expect(shouldShowPollReminder({ poll: open, myBallot: undefined, now: NOW })).toBe(true);
  });

  it('NEVER shows once the member has voted — any ballot shape', () => {
    expect(shouldShowPollReminder({ poll: open, myBallot: { optionId: 'opt_0' }, now: NOW })).toBe(false);
    expect(shouldShowPollReminder({ poll: open, myBallot: { optionIds: ['opt_0', 'opt_1'] }, now: NOW })).toBe(false);
    expect(shouldShowPollReminder({ poll: open, myBallot: { text: 'my suggestion' }, now: NOW })).toBe(false);
  });

  it('never shows for a concluded or expired poll', () => {
    expect(shouldShowPollReminder({ poll: poll({ id: 'c', status: 'CONCLUDED' }), myBallot: null, now: NOW })).toBe(false);
    expect(shouldShowPollReminder({ poll: poll({ id: 'e', expiresAt: PAST }), myBallot: null, now: NOW })).toBe(false);
  });
});

describe('ballotWritePlan — the one write shape both doors cast', () => {
  it('choice: the ballot names one option; that counter and turnout move', () => {
    const plan = ballotWritePlan({ optionId: 'opt_1' });
    expect(plan.ballotDoc).toEqual({ optionId: 'opt_1' });
    expect(plan.optionIncrements).toEqual(['opt_1']);
    expect(plan.totalVotesIncrement).toBe(1);
  });

  it('multi: every picked counter moves, turnout moves once', () => {
    const plan = ballotWritePlan({ optionIds: ['opt_0', 'opt_2'] });
    expect(plan.ballotDoc).toEqual({ optionIds: ['opt_0', 'opt_2'] });
    expect(plan.optionIncrements).toEqual(['opt_0', 'opt_2']);
    expect(plan.totalVotesIncrement).toBe(1);
  });

  it('text: no option counter moves, turnout moves once', () => {
    const plan = ballotWritePlan({ text: 'Hold it on Sunday' });
    expect(plan.ballotDoc).toEqual({ text: 'Hold it on Sunday' });
    expect(plan.optionIncrements).toEqual([]);
    expect(plan.totalVotesIncrement).toBe(1);
  });
});
