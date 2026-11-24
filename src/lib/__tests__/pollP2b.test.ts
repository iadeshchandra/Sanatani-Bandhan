/**
 * pollP2b.test.ts — POLLS NEXT-LEVEL P2b: drafts, scheduling,
 * templates + recurrence, and the abstain field.
 * =====================================================================
 * The laws under test:
 *  - the phase is read from the record (status + both clocks) —
 *    honest client-side evaluation, no server clock claimed;
 *  - abstention lives OUTSIDE the option slots on new polls (its
 *    own counter + its own ballot shape) and keeps reading from
 *    the legacy in-map entry on old polls — one truth, both models;
 *  - the ONE ballot write path (pollVoting) writes the abstention
 *    byte-identically from either door, in the shape each poll
 *    generation's rules anchor accepts;
 *  - a template carries a poll's SHAPE only, and recurrence is a
 *    one-step re-run suggestion — nothing ever opens itself;
 *  - drafts never reach the member door, and neither a draft nor
 *    a not-yet-open poll ever rings a lifecycle bell.
 */
import {
  ABSTAIN_OPTION_ID,
  POLL_MAX_MULTI_PICKS,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  ballotCast,
  computePollOutcome,
  pollAbstainVotes,
  pollHasAbstain,
  pollIsEditable,
  pollIsOpen,
  pollOptionCount,
  pollPhase,
  pollRealOptions,
  type PollLike,
} from '../pollLogic';
import { ballotWritePlan } from '../pollVoting';
import { assembleMemberPolls, type MemberPollDoc } from '../memberPolls';
import { pickPollLifecycleNotices } from '../pollLifecycleNotify';
import {
  advanceByRecurrence,
  nextRunWindow,
  readPollTemplates,
  templateFromPoll,
  templateToShape,
} from '../pollTemplates';

/* ------------------------------------------------------------------ */
/* The phase — read from the record                                    */
/* ------------------------------------------------------------------ */

describe('pollPhase — draft / scheduled / open / closed from the record itself', () => {
  const OPEN_POLL: PollLike = { status: 'ACTIVE', expiresAt: 2000 };

  it('a DRAFT is a draft whatever its clocks say', () => {
    expect(pollPhase({ status: 'DRAFT' }, 1000)).toBe('draft');
    expect(pollPhase({ status: 'DRAFT', opensAt: 500, expiresAt: 2000 }, 1000)).toBe('draft');
    expect(pollIsOpen({ status: 'DRAFT', expiresAt: 2000 }, 1000)).toBe(false);
  });

  it('an ACTIVE poll whose opening is still ahead is scheduled, not open', () => {
    const p: PollLike = { ...OPEN_POLL, opensAt: 1500 };
    expect(pollPhase(p, 1000)).toBe('scheduled');
    expect(pollIsOpen(p, 1000)).toBe(false);
    // The moment the opening is reached, the same record reads open.
    expect(pollPhase(p, 1500)).toBe('open');
    expect(pollIsOpen(p, 1500)).toBe(true);
  });

  it('an ACTIVE poll past its deadline reads closed even before anyone flips the status', () => {
    expect(pollPhase(OPEN_POLL, 2000)).toBe('closed');
    expect(pollPhase({ status: 'CONCLUDED', expiresAt: 2000 }, 1000)).toBe('closed');
  });

  it('a poll with no opening time is open from launch (the pre-P2b shape)', () => {
    expect(pollPhase(OPEN_POLL, 1000)).toBe('open');
    expect(pollPhase({ ...OPEN_POLL, opensAt: 0 }, 1000)).toBe('open');
  });
});

describe('pollIsEditable — zero ballots, in a living phase', () => {
  it('drafts and scheduled polls edit; a voted-on poll never does', () => {
    expect(pollIsEditable({ status: 'DRAFT', totalVotes: 0 }, 1000)).toBe(true);
    expect(pollIsEditable({ status: 'ACTIVE', opensAt: 1500, expiresAt: 2000, totalVotes: 0 }, 1000)).toBe(true);
    expect(pollIsEditable({ status: 'ACTIVE', expiresAt: 2000, totalVotes: 0 }, 1000)).toBe(true);
    expect(pollIsEditable({ status: 'ACTIVE', expiresAt: 2000, totalVotes: 1 }, 1000)).toBe(false);
    expect(pollIsEditable({ status: 'CONCLUDED', totalVotes: 0 }, 1000)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Abstention — one truth across both data models                      */
/* ------------------------------------------------------------------ */

describe('the abstain field — out of the option slots, both models read', () => {
  const legacy: PollLike = {
    options: {
      opt_0: { text: 'Yes', votes: 3 },
      opt_1: { text: 'No', votes: 1 },
      [ABSTAIN_OPTION_ID]: { text: 'Abstain', votes: 2 },
    },
    totalVotes: 6,
  };
  const p2b: PollLike = {
    options: { opt_0: { text: 'Yes', votes: 3 }, opt_1: { text: 'No', votes: 1 } },
    allowAbstain: true,
    abstainVotes: 2,
    totalVotes: 6,
  };

  it('the ceiling counts real options only — the abstain entry is never a slot', () => {
    expect(POLL_MIN_OPTIONS).toBe(2);
    expect(POLL_MAX_OPTIONS).toBe(8);
    expect(POLL_MAX_MULTI_PICKS).toBe(5);
    expect(pollOptionCount(legacy)).toBe(2);
    expect(pollOptionCount(p2b)).toBe(2);
    expect(pollRealOptions(legacy).map((o) => o.id)).toEqual(['opt_0', 'opt_1']);
  });

  it('pollHasAbstain reads either model', () => {
    expect(pollHasAbstain(legacy)).toBe(true);
    expect(pollHasAbstain(p2b)).toBe(true);
    expect(pollHasAbstain({ options: { opt_0: { text: 'Yes', votes: 0 } } })).toBe(false);
    expect(pollHasAbstain({ allowAbstain: false, options: {} })).toBe(false);
  });

  it('pollAbstainVotes reads the counter on new polls and the entry on legacy polls', () => {
    expect(pollAbstainVotes(p2b)).toBe(2);
    expect(pollAbstainVotes(legacy)).toBe(2);
    // A P2b poll whose counter is still 0 reads 0 — the field is the record.
    expect(pollAbstainVotes({ ...p2b, abstainVotes: 0 })).toBe(0);
    expect(pollAbstainVotes({ options: { opt_0: { text: 'Yes', votes: 1 } } })).toBe(0);
  });

  it('an abstention ballot counts as a cast ballot', () => {
    expect(ballotCast({ abstain: true })).toBe(true);
    expect(ballotCast({})).toBe(false);
    expect(ballotCast(null)).toBe(false);
  });

  it('the recorded outcome tallies abstentions under the reserved key in BOTH models', () => {
    for (const p of [legacy, p2b]) {
      const outcome = computePollOutcome(
        { ...p, pollClass: 'decision', eligibleCount: 10, quorumPct: 25, passPct: 50 },
        5000
      );
      expect(outcome.tallies[ABSTAIN_OPTION_ID]).toBe(2);
      expect(outcome.tallies.opt_0).toBe(3);
      // The winner is a real option — abstention is never a candidate.
      expect(outcome.winnerOptionIds).toEqual(['opt_0']);
      // Pass mark is judged on the non-abstaining base: 3 of 4 >= 50%.
      expect(outcome.verdict).toBe('carried');
    }
  });
});

describe('ballotWritePlan — the abstention plan, and the plans it must not disturb', () => {
  it('an abstention moves turnout + the abstention counter, and no option', () => {
    expect(ballotWritePlan({ abstain: true })).toEqual({
      ballotDoc: { abstain: true },
      optionIncrements: [],
      totalVotesIncrement: 1,
      abstainIncrement: true,
    });
  });

  it('the pre-P2b plans are byte-identical to before', () => {
    expect(ballotWritePlan({ optionId: 'opt_0' })).toEqual({
      ballotDoc: { optionId: 'opt_0' },
      optionIncrements: ['opt_0'],
      totalVotesIncrement: 1,
    });
    expect(ballotWritePlan({ optionIds: ['opt_0', 'opt_2'] })).toEqual({
      ballotDoc: { optionIds: ['opt_0', 'opt_2'] },
      optionIncrements: ['opt_0', 'opt_2'],
      totalVotesIncrement: 1,
    });
    expect(ballotWritePlan({ text: 'On Saturdays' })).toEqual({
      ballotDoc: { text: 'On Saturdays' },
      optionIncrements: [],
      totalVotesIncrement: 1,
    });
  });
});

/* ------------------------------------------------------------------ */
/* Templates + recurrence                                              */
/* ------------------------------------------------------------------ */

describe('pollTemplates — the shape only, defensively read', () => {
  const poll: PollLike & { title?: string } = {
    title: 'Monthly seva roster?',
    status: 'CONCLUDED',
    targetAudience: 'ALL_MEMBERS',
    kind: 'choice',
    options: {
      opt_0: { text: 'Week 1', votes: 4 },
      opt_1: { text: 'Week 2', votes: 2 },
      [ABSTAIN_OPTION_ID]: { text: 'Abstain', votes: 1 },
    },
    totalVotes: 7,
  };

  it('templateFromPoll carries the shape — real options only, abstain as a flag, no votes anywhere', () => {
    const t = templateFromPoll(poll, { id: 'tpl_1', name: 'Roster', recurrence: 'monthly', now: 100, uid: 'admin-1' });
    expect(t.options).toEqual(['Week 1', 'Week 2']);
    expect(t.abstain).toBe(true);
    expect(t.recurrence).toBe('monthly');
    expect(JSON.stringify(t)).not.toContain('votes');
    // Round-trip: the shape that pre-fills the next round's form.
    const shape = templateToShape(t);
    expect(shape.options).toEqual(['Week 1', 'Week 2']);
    expect(shape.abstain).toBe(true);
    expect(shape.title).toBe('Monthly seva roster?');
  });

  it('readPollTemplates drops malformed entries and fills honest defaults', () => {
    expect(readPollTemplates(null)).toEqual([]);
    expect(readPollTemplates('nope')).toEqual([]);
    const out = readPollTemplates([
      { id: 'tpl_b', title: 'B poll', options: ['One', 'Two'], createdAt: 50 },
      { id: 'tpl_a', title: 'A poll', options: ['One', 'Two'], createdAt: 90, recurrence: 'yearly' },
      { id: '', title: 'No id', options: ['One', 'Two'] },
      { id: 'tpl_x', title: 'Too few options', options: ['Only'] },
      { id: 'tpl_t', title: 'Text box', kind: 'text', options: [], createdAt: 10 },
      'garbage',
    ]);
    // Newest first; the text template (no options needed) survives;
    // the broken ones are gone.
    expect(out.map((t) => t.id)).toEqual(['tpl_a', 'tpl_b', 'tpl_t']);
    expect(out[0].recurrence).toBe('yearly');
    expect(out[1].recurrence).toBe('none');
    expect(out[1].quorumPct).toBe(25);
    expect(out[1].name).toBe('B poll');
  });

  it('advanceByRecurrence steps calendar months and years', () => {
    const jan15 = new Date(2026, 0, 15, 10, 0).getTime();
    expect(advanceByRecurrence(jan15, 'monthly')).toBe(new Date(2026, 1, 15, 10, 0).getTime());
    expect(advanceByRecurrence(jan15, 'quarterly')).toBe(new Date(2026, 3, 15, 10, 0).getTime());
    expect(advanceByRecurrence(jan15, 'yearly')).toBe(new Date(2027, 0, 15, 10, 0).getTime());
    expect(advanceByRecurrence(jan15, 'none')).toBe(jan15);
  });

  it('nextRunWindow rolls the window forward until the opening is ahead, duration preserved', () => {
    const opens = new Date(2026, 0, 15, 10, 0).getTime();
    const closes = new Date(2026, 0, 20, 10, 0).getTime();
    const now = new Date(2026, 2, 1, 10, 0).getTime();
    const next = nextRunWindow('monthly', opens, closes, now);
    expect(next.expiresAt).toBe(new Date(2026, 2, 20, 10, 0).getTime());
    expect(next.opensAt).toBe(new Date(2026, 2, 15, 10, 0).getTime());
    // A non-recurring poll's window is returned untouched.
    expect(nextRunWindow('none', opens, closes, now)).toEqual({ opensAt: opens, expiresAt: closes });
  });
});

/* ------------------------------------------------------------------ */
/* The member door + the lifecycle bells                               */
/* ------------------------------------------------------------------ */

describe('the member door — drafts never arrive, scheduled polls are announced honestly', () => {
  const NOW = 100000;
  const base = {
    memberships: [{ workspaceId: 'ws-1', role: 'DEVOTEE' }],
    workspaceNames: { 'ws-1': 'Test Mandir' },
    myBallots: {},
    now: NOW,
  };
  const doc = (over: Partial<MemberPollDoc>): MemberPollDoc => ({
    id: 'p',
    workspaceId: 'ws-1',
    status: 'ACTIVE',
    expiresAt: NOW + 100000,
    ...over,
  });

  it('a draft is excluded even when it sits in the workspace list', () => {
    const entries = assembleMemberPolls({
      ...base,
      pollsByWorkspace: {
        'ws-1': [doc({ id: 'd1', status: 'DRAFT' }), doc({ id: 'o1' })],
      },
    });
    expect(entries.map((e) => e.poll.id)).toEqual(['o1']);
  });

  it('a scheduled poll is flagged, not open, and ranks behind open polls', () => {
    const entries = assembleMemberPolls({
      ...base,
      pollsByWorkspace: {
        'ws-1': [
          doc({ id: 's1', opensAt: NOW + 50000 }),
          doc({ id: 'o1' }),
          doc({ id: 'c1', status: 'CONCLUDED' }),
        ],
      },
    });
    expect(entries.map((e) => e.poll.id)).toEqual(['o1', 's1', 'c1']);
    const scheduled = entries.find((e) => e.poll.id === 's1');
    expect(scheduled?.scheduled).toBe(true);
    expect(scheduled?.open).toBe(false);
  });
});

describe('the lifecycle bells — a draft or a not-yet-open poll is never news', () => {
  const NOW = 100000;
  const doc = (over: Partial<MemberPollDoc>): MemberPollDoc => ({
    id: 'p',
    workspaceId: 'ws-1',
    status: 'ACTIVE',
    expiresAt: NOW + 100000000,
    ...over,
  });
  const pick = (polls: MemberPollDoc[]) =>
    pickPollLifecycleNotices({
      polls,
      roleByWorkspace: { 'ws-1': 'DEVOTEE' },
      myBallots: {},
      notified: new Set<string>(),
      now: NOW,
    });

  it('draft and scheduled polls produce no notices at all', () => {
    expect(pick([doc({ id: 'd1', status: 'DRAFT' })])).toEqual([]);
    expect(pick([doc({ id: 's1', opensAt: NOW + 50000 })])).toEqual([]);
  });

  it('CONTROL: an open poll still rings its opened bell', () => {
    const notices = pick([doc({ id: 'o1' })]);
    expect(notices).toHaveLength(1);
    expect(notices[0].stage).toBe('opened');
  });
});
