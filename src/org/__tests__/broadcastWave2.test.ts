/**
 * broadcastWave2.test.ts — NOTIFICATION WAVE 2: broadcast discipline.
 *
 *  - Composer side: the daily soft cap (count today's, warn at the
 *    DESIGN's 2/day order, name the next ordinal — never block).
 *  - Receiver side: the per-org daily info line in pickNotifications
 *    (over-cap orgs are marked seen, never rung; other orgs and the
 *    per-check cap are unaffected; omitting dayCounts = old pick).
 *  - REGRESSION — the Polls P2a reminder contract: a title built by
 *    pollReminderBroadcastTitle round-trips through
 *    parsePollReminderBroadcast, and a reminder the fanout has
 *    resolved (its id merged into `seen`) is NEVER generic-picked —
 *    with or without the day cap in play.
 */
import {
  broadcastDayKey,
  composerCapNotice,
  countBroadcastsToday,
  pickNotifications,
  startOfLocalDay,
  BROADCAST_DAILY_SOFT_CAP,
  ORG_DAILY_INFO_CAP,
  type OrgBroadcast,
  type OrgFollow,
} from '../broadcast';
import {
  POLL_REMINDER_TITLE_PREFIX,
  parsePollReminderBroadcast,
  pollReminderBroadcastTitle,
} from '../../lib/memberPolls';

const NOW = new Date(2026, 10, 24, 12, 0, 0).getTime();
const HOUR = 60 * 60 * 1000;

const broadcast = (over: Partial<OrgBroadcast> = {}): OrgBroadcast => ({
  id: 'b-1',
  orgId: 'org-1',
  orgName: 'Dakshineswar Kali Mandir',
  title: 'Maha Shivaratri abhishek at 6 PM',
  body: '',
  createdBy: 'trustee-1',
  createdByName: 'Trustee',
  audienceCount: 42,
  createdAt: NOW - HOUR,
  ...over,
});

const follows: OrgFollow[] = [
  { orgId: 'org-1', followedAt: NOW - 30 * 24 * HOUR },
  { orgId: 'org-2', followedAt: NOW - 30 * 24 * HOUR },
];

/* ------------------------- composer soft cap ------------------------- */

describe('composer daily counting + soft cap', () => {
  it('counts only today’s broadcasts (local day), not yesterday’s or future ones', () => {
    const list = [
      broadcast({ id: 'a', createdAt: startOfLocalDay(NOW) + HOUR }),
      broadcast({ id: 'b', createdAt: NOW - HOUR }),
      broadcast({ id: 'c', createdAt: startOfLocalDay(NOW) - HOUR }), // yesterday
      broadcast({ id: 'd', createdAt: NOW + HOUR }), // future / clock skew
    ];
    expect(countBroadcastsToday(list, NOW)).toBe(2);
    expect(broadcastDayKey(NOW)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('the soft cap sits at the DESIGN order: the THIRD announcement of a day needs confirming', () => {
    expect(BROADCAST_DAILY_SOFT_CAP).toBe(2);
    expect(composerCapNotice(0)).toEqual({ needsConfirm: false, nextNumber: 1 });
    expect(composerCapNotice(1)).toEqual({ needsConfirm: false, nextNumber: 2 });
    expect(composerCapNotice(2)).toEqual({ needsConfirm: true, nextNumber: 3 });
    expect(composerCapNotice(5)).toEqual({ needsConfirm: true, nextNumber: 6 });
  });
});

/* ------------------------ receiver daily line ------------------------ */

describe('pickNotifications — per-org daily info cap', () => {
  const many = (orgId: string, n: number, startMin: number): OrgBroadcast[] =>
    Array.from({ length: n }, (_, i) =>
      broadcast({
        id: `${orgId}-${i}`,
        orgId,
        createdAt: NOW - (startMin - i) * 60_000,
      }),
    );

  it('an org at the cap contributes no bells, but its broadcasts are still marked seen', () => {
    const { notify, markSeen } = pickNotifications({
      broadcasts: many('org-1', 2, 50),
      seen: {},
      follows,
      now: NOW,
      baseline: false,
      dayCounts: { 'org-1': ORG_DAILY_INFO_CAP },
    });
    expect(notify).toHaveLength(0);
    expect(Object.keys(markSeen)).toHaveLength(2);
  });

  it('the cap is per org: org-2 still rings while org-1 is over its line', () => {
    const { notify } = pickNotifications({
      broadcasts: [...many('org-1', 1, 50), ...many('org-2', 1, 40)],
      seen: {},
      follows,
      now: NOW,
      baseline: false,
      dayCounts: { 'org-1': ORG_DAILY_INFO_CAP, 'org-2': 0 },
    });
    expect(notify.map((b) => b.id)).toEqual(['org-2-0']);
  });

  it('partial room is honoured: cap 3 with 2 already rung admits exactly one more', () => {
    const { notify } = pickNotifications({
      broadcasts: many('org-1', 3, 50),
      seen: {},
      follows,
      now: NOW,
      baseline: false,
      dayCounts: { 'org-1': ORG_DAILY_INFO_CAP - 1 },
    });
    expect(notify).toHaveLength(1);
  });

  it('omitting dayCounts reproduces the pre-Wave-2 pick exactly', () => {
    const args = {
      broadcasts: many('org-1', 2, 50),
      seen: {},
      follows,
      now: NOW,
      baseline: false,
    };
    const withCap = pickNotifications({ ...args, dayCounts: undefined });
    const without = pickNotifications(args);
    expect(withCap.notify.map((b) => b.id)).toEqual(without.notify.map((b) => b.id));
    expect(withCap.notify).toHaveLength(2);
  });
});

/* ----------------- REGRESSION: poll-reminder contract ---------------- */

describe('poll-reminder title contract (P2a regression)', () => {
  it('a title built by the Remind button round-trips through the parser', () => {
    const title = pollReminderBroadcastTitle('Repair the ghat steps?');
    expect(title.startsWith(POLL_REMINDER_TITLE_PREFIX)).toBe(true);
    expect(parsePollReminderBroadcast({ title })).toBe('Repair the ghat steps?');
  });

  it('ordinary announcements are not reminders, and an empty poll title parses to null', () => {
    expect(parsePollReminderBroadcast({ title: 'Maha Shivaratri abhishek at 6 PM' })).toBeNull();
    expect(parsePollReminderBroadcast({ title: pollReminderBroadcastTitle('') })).toBeNull();
    expect(parsePollReminderBroadcast(null)).toBeNull();
    expect(parsePollReminderBroadcast({})).toBeNull();
  });

  it('a reminder the fanout resolved (id merged into seen) is never generic-picked — cap or no cap', () => {
    const reminder = broadcast({
      id: 'rem-1',
      title: pollReminderBroadcastTitle('Repair the ghat steps?'),
    });
    const seen = { 'rem-1': reminder.createdAt }; // the fanout's handled-merge
    for (const dayCounts of [undefined, {}, { 'org-1': 0 }]) {
      const { notify, markSeen } = pickNotifications({
        broadcasts: [reminder],
        seen,
        follows,
        now: NOW,
        baseline: false,
        ...(dayCounts ? { dayCounts } : {}),
      });
      expect(notify).toHaveLength(0);
      expect(markSeen['rem-1']).toBe(reminder.createdAt);
    }
  });

  it('the generic pick alone never treats a reminder title specially — resolution is the fanout’s job', () => {
    // Pins the architecture: the listener resolves reminders BEFORE
    // the pick and merges their ids into seen. If that merge ever
    // regresses, the reminder would ring as a generic announcement —
    // this test documents exactly which mechanism prevents it.
    const reminder = broadcast({
      id: 'rem-2',
      title: pollReminderBroadcastTitle('Repair the ghat steps?'),
    });
    const { notify } = pickNotifications({
      broadcasts: [reminder],
      seen: {},
      follows,
      now: NOW,
      baseline: false,
    });
    expect(notify.map((b) => b.id)).toEqual(['rem-2']);
  });
});
