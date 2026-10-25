/**
 * pollShapesVisibility.test.ts — EVENTS P1: poll shapes + the
 * launch-time result rule.
 * =====================================================================
 * Shapes: single-choice (legacy default), multi-select (abstain
 * exclusive), free-text (bounded). Visibility: chosen at launch —
 * live / after-vote (default, the legacy truth) / after-close /
 * committee-only — and the SAME function drives the voting UI and
 * the Transparency Board decision cards, so a hidden result is
 * hidden everywhere. Edit discipline: open + zero ballots only.
 */
import {
  pollKind,
  pollHasAbstain,
  pollResultVisibility,
  pollResultsVisible,
  pollIsEditable,
  validateMultiChoice,
  validateTextResponse,
  ballotCast,
  ABSTAIN_OPTION_ID,
  type PollLike,
} from '../pollLogic';

const NOW = new Date('2026-10-25T08:00:00').getTime();
const FUTURE = NOW + 7 * 24 * 60 * 60 * 1000;
const PAST = NOW - 24 * 60 * 60 * 1000;

const poll = (over: Partial<PollLike>): PollLike => ({
  status: 'ACTIVE',
  expiresAt: FUTURE,
  totalVotes: 0,
  options: { o1: { text: 'Yes', votes: 0 }, o2: { text: 'No', votes: 0 } },
  ...over,
});

describe('shapes', () => {
  it('legacy polls (no kind) are single-choice; kinds round-trip', () => {
    expect(pollKind(poll({}))).toBe('choice');
    expect(pollKind(poll({ kind: 'multi' }))).toBe('multi');
    expect(pollKind(poll({ kind: 'text' }))).toBe('text');
    expect(pollKind(poll({ kind: 'nonsense' }))).toBe('choice');
  });
  it('abstain is detected by the reserved option id (the one canonical marker)', () => {
    expect(pollHasAbstain(poll({}))).toBe(false);
    expect(pollHasAbstain(poll({ options: { [ABSTAIN_OPTION_ID]: { text: 'Abstain', votes: 0 } } }))).toBe(true);
    expect(
      pollHasAbstain(poll({ options: { [ABSTAIN_OPTION_ID]: { text: 'Abstain', votes: 0, isAbstain: true } } }))
    ).toBe(true);
    // A flag on any other id is not an abstain entry — the id is the marker.
    expect(pollHasAbstain(poll({ options: { o9: { text: 'Skip', votes: 0, isAbstain: true } } }))).toBe(false);
  });
  it('multi validation: bounds, duplicates, unknown options, abstain exclusivity', () => {
    const multi = poll({
      kind: 'multi',
      options: {
        o1: { text: 'Sat', votes: 0 },
        o2: { text: 'Sun', votes: 0 },
        [ABSTAIN_OPTION_ID]: { text: 'Abstain', votes: 0, isAbstain: true },
      },
    });
    expect(validateMultiChoice(multi, ['o1', 'o2'])).toBeNull();
    expect(validateMultiChoice(multi, [])).toBe('empty');
    expect(validateMultiChoice(multi, ['o1', 'o1'])).toBe('duplicate');
    expect(validateMultiChoice(multi, ['oX'])).toBe('unknown-option');
    expect(validateMultiChoice(multi, [ABSTAIN_OPTION_ID, 'o1'])).toBe('abstain-exclusive');
    expect(validateMultiChoice(multi, [ABSTAIN_OPTION_ID])).toBeNull();
    expect(validateMultiChoice(multi, ['o1', 'o2', 'o1', 'o2', 'o1', 'o2'])).toBe('too-many');
  });
  it('text validation: non-empty and ≤ 280 chars', () => {
    expect(validateTextResponse('  A quiet morning slot, please ')).toBeNull();
    expect(validateTextResponse('   ')).toBe('empty');
    expect(validateTextResponse('x'.repeat(281))).toBe('too-long');
    expect(validateTextResponse('x'.repeat(280))).toBeNull();
  });
  it('ballotCast recognises every shape', () => {
    expect(ballotCast(null)).toBe(false);
    expect(ballotCast({})).toBe(false);
    expect(ballotCast({ optionId: 'o1' })).toBe(true);
    expect(ballotCast({ optionIds: ['o1'] })).toBe(true);
    expect(ballotCast({ text: ' yes ' })).toBe(true);
    expect(ballotCast({ text: '   ' })).toBe(false);
  });
});

describe('launch-time result visibility', () => {
  it('defaults to afterVote (the legacy truth)', () => {
    expect(pollResultVisibility(poll({}))).toBe('afterVote');
    expect(pollResultVisibility(poll({ resultVisibility: 'bogus' }))).toBe('afterVote');
  });
  it('live: everyone sees results, voted or not', () => {
    const p = poll({ resultVisibility: 'live' });
    expect(pollResultsVisible(p, { hasVoted: false, isCommittee: false }, NOW)).toBe(true);
  });
  it('afterVote: hidden until the viewer votes (or the poll closes)', () => {
    const p = poll({ resultVisibility: 'afterVote' });
    expect(pollResultsVisible(p, { hasVoted: false, isCommittee: false }, NOW)).toBe(false);
    expect(pollResultsVisible(p, { hasVoted: true, isCommittee: false }, NOW)).toBe(true);
    expect(pollResultsVisible(poll({ resultVisibility: 'afterVote', expiresAt: PAST }), { hasVoted: false, isCommittee: false }, NOW)).toBe(true);
  });
  it('afterClose: hidden from members until the deadline passes', () => {
    const p = poll({ resultVisibility: 'afterClose' });
    expect(pollResultsVisible(p, { hasVoted: true, isCommittee: false }, NOW)).toBe(false);
    expect(pollResultsVisible(poll({ resultVisibility: 'afterClose', expiresAt: PAST }), { hasVoted: false, isCommittee: false }, NOW)).toBe(true);
  });
  it('committee: members never see counts; committee always does', () => {
    const p = poll({ resultVisibility: 'committee', expiresAt: PAST });
    expect(pollResultsVisible(p, { hasVoted: true, isCommittee: false }, NOW)).toBe(false);
    expect(pollResultsVisible(p, { hasVoted: false, isCommittee: true }, NOW)).toBe(true);
  });
});

describe('edit-before-first-vote', () => {
  it('editable while open with zero ballots; locked forever after', () => {
    expect(pollIsEditable(poll({}), NOW)).toBe(true);
    expect(pollIsEditable(poll({ totalVotes: 1 }), NOW)).toBe(false);
    expect(pollIsEditable(poll({ expiresAt: PAST }), NOW)).toBe(false);
    expect(pollIsEditable(poll({ status: 'CONCLUDED' }), NOW)).toBe(false);
  });
});
