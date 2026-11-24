/**
 * staffGovernanceNotify.test.ts — NOTIFICATION WAVE 2, governance +
 * people pickers. Pure logic: resolutions awaiting MY vote (my own
 * voters entry suppresses — L4), lot terminal outcomes (state
 * ledger), member joins (one card per workspace per day), and role
 * changes (a first-seen edge is a join, never a change).
 */
import {
  dayKeyOf,
  lotDedupeKey,
  memberJoinedDedupeKey,
  memberKey,
  memberNamesSummary,
  pickLotOutcomes,
  pickMemberJoined,
  pickResolutionNotices,
  pickRoleChanges,
  resolutionDedupeKey,
  roleChangeDedupeKey,
  settledRoleMap,
  type LotLike,
  type MemberEdgeLike,
  type ResolutionDocLike,
} from '../staffGovernanceNotify';

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

/* ----------------------------- resolutions --------------------------- */

const resolution = (over: Partial<ResolutionDocLike> = {}): ResolutionDocLike => ({
  id: 'res-1',
  workspaceId: 'ws-1',
  title: 'Repair the ghat steps',
  status: 'Pending Review',
  voters: {},
  votesInFavor: 0,
  votesAgainst: 0,
  boardSize: 5,
  ...over,
});

describe('pickResolutionNotices', () => {
  it('an open resolution I have not voted on is news, keyed + expiring at its deadline', () => {
    const out = pickResolutionNotices(
      [resolution({ expiresAt: NOW + 3 * DAY })],
      'me',
      new Set(),
      NOW,
    );
    expect(out).toHaveLength(1);
    expect(out[0].dedupeKey).toBe(resolutionDedupeKey('res-1'));
    expect(out[0].dedupeKey).toBe('resolution:res-1:pending');
    expect(out[0].expiresAt).toBe(NOW + 3 * DAY);
  });

  it('my own vote suppresses it — the premise died by my hand (L4)', () => {
    const out = pickResolutionNotices(
      [resolution({ voters: { me: 'favor' } })],
      'me',
      new Set(),
      NOW,
    );
    expect(out).toHaveLength(0);
  });

  it('concluded, expired, and already-notified resolutions are silent', () => {
    expect(
      pickResolutionNotices([resolution({ status: 'Passed' })], 'me', new Set(), NOW),
    ).toHaveLength(0);
    expect(
      pickResolutionNotices([resolution({ expiresAt: NOW - DAY })], 'me', new Set(), NOW),
    ).toHaveLength(0);
    expect(
      pickResolutionNotices(
        [resolution()],
        'me',
        new Set([resolutionDedupeKey('res-1')]),
        NOW,
      ),
    ).toHaveLength(0);
  });

  it("another member's vote does not suppress MY news", () => {
    const out = pickResolutionNotices(
      [resolution({ voters: { someoneElse: 'against' } })],
      'me',
      new Set(),
      NOW,
    );
    expect(out).toHaveLength(1);
  });
});

/* -------------------------------- lots ------------------------------- */

const lot = (over: Partial<LotLike> = {}): LotLike => ({
  id: 'lot-1',
  workspaceId: 'ws-1',
  title: 'Brass deepam set',
  status: 'open',
  ...over,
});

describe('pickLotOutcomes', () => {
  it('a lot first seen settled is news (the record may predate the app opening)', () => {
    const { notices, settled } = pickLotOutcomes([lot({ status: 'settled' })], {});
    expect(notices).toHaveLength(1);
    expect(notices[0].status).toBe('settled');
    expect(notices[0].dedupeKey).toBe(lotDedupeKey('lot-1', 'settled'));
    expect(settled).toEqual({ 'lot-1': 'settled' });
  });

  it('a transition into failed rings; the same outcome settled is silence', () => {
    const into = pickLotOutcomes([lot({ status: 'failed' })], { 'lot-1': 'open' });
    expect(into.notices).toHaveLength(1);
    expect(into.notices[0].dedupeKey).toBe('lot:lot-1:failed');
    const again = pickLotOutcomes([lot({ status: 'failed' })], { 'lot-1': 'failed' });
    expect(again.notices).toHaveLength(0);
  });

  it('non-terminal states settle silently', () => {
    const { notices, settled } = pickLotOutcomes(
      [lot({ status: 'open' }), lot({ id: 'lot-2', status: 'draft' })],
      {},
    );
    expect(notices).toHaveLength(0);
    expect(settled).toEqual({ 'lot-1': 'open', 'lot-2': 'draft' });
  });
});

/* ---------------------------- member joins --------------------------- */

const edge = (over: Partial<MemberEdgeLike> = {}): MemberEdgeLike => ({
  workspaceId: 'ws-1',
  uid: 'u-1',
  role: 'Devotee',
  displayName: 'Asha Verma',
  ...over,
});

describe('pickMemberJoined', () => {
  it('new members group into ONE notice per workspace, keyed by day', () => {
    const out = pickMemberJoined(
      [edge(), edge({ uid: 'u-2', displayName: 'Ravi Das' })],
      new Set(),
      'trustee-me',
      NOW,
    );
    expect(out).toHaveLength(1);
    expect(out[0].workspaceId).toBe('ws-1');
    expect(out[0].members).toHaveLength(2);
    expect(out[0].dedupeKey).toBe(memberJoinedDedupeKey('ws-1', dayKeyOf(NOW)));
    expect(out[0].dedupeKey).toMatch(/^member:ws-1:\d{4}-\d{2}-\d{2}$/);
  });

  it('known uids and my own arrival are not news; two workspaces group separately', () => {
    const known = new Set([memberKey('ws-1', 'u-1')]);
    const out = pickMemberJoined(
      [
        edge(), // known
        edge({ uid: 'trustee-me' }), // myself
        edge({ uid: 'u-3', workspaceId: 'ws-2', displayName: 'New In Two' }),
      ],
      known,
      'trustee-me',
      NOW,
    );
    expect(out).toHaveLength(1);
    expect(out[0].workspaceId).toBe('ws-2');
  });

  it('memberNamesSummary: one, two, then "+N more"; nameless falls back honestly', () => {
    expect(memberNamesSummary([edge()])).toBe('Asha Verma');
    expect(
      memberNamesSummary([edge(), edge({ uid: 'u-2', displayName: 'Ravi Das' })]),
    ).toBe('Asha Verma, Ravi Das');
    expect(
      memberNamesSummary([
        edge(),
        edge({ uid: 'u-2', displayName: 'Ravi Das' }),
        edge({ uid: 'u-3', displayName: 'Third' }),
        edge({ uid: 'u-4', displayName: 'Fourth' }),
      ]),
    ).toBe('Asha Verma, Ravi Das +2 more');
    expect(memberNamesSummary([edge({ displayName: '' })])).toBe('A new member');
    expect(
      memberNamesSummary([edge({ displayName: '' }), edge({ uid: 'u-2', displayName: '' })]),
    ).toBe('2 new members');
  });
});

/* ---------------------------- role changes --------------------------- */

describe('pickRoleChanges + settledRoleMap', () => {
  it('an edge whose role differs from the settled map is a change, house-keyed', () => {
    const prev = { [memberKey('ws-1', 'u-1')]: 'Devotee' };
    const out = pickRoleChanges([edge({ role: 'Accountant' })], prev);
    expect(out).toHaveLength(1);
    expect(out[0].fromRole).toBe('Devotee');
    expect(out[0].toRole).toBe('Accountant');
    expect(out[0].dedupeKey).toBe(roleChangeDedupeKey('ws-1', 'u-1', 'Accountant'));
    expect(out[0].dedupeKey).toBe('role:ws-1:u-1:Accountant');
  });

  it('a first-seen edge is a JOIN, not a change; an unchanged role is silence', () => {
    expect(pickRoleChanges([edge()], {})).toHaveLength(0);
    const prev = { [memberKey('ws-1', 'u-1')]: 'Devotee' };
    expect(pickRoleChanges([edge()], prev)).toHaveLength(0);
  });

  it('settledRoleMap records every edge role under its member key', () => {
    const map = settledRoleMap([
      edge(),
      edge({ uid: 'u-2', role: 'Trustee', workspaceId: 'ws-2' }),
    ]);
    expect(map).toEqual({
      [memberKey('ws-1', 'u-1')]: 'Devotee',
      [memberKey('ws-2', 'u-2')]: 'Trustee',
    });
  });
});
