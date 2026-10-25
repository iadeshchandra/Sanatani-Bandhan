/**
 * eventReminders.test.ts — EVENTS P1: reminder scheduling truth.
 * =====================================================================
 * Clock fixtures only — shipped code never fakes a date. The laws:
 * exactly one quiet nudge per stage (T-3, T-1, morning-of), never a
 * catch-up burst after a missed stage, and change/cancel detection
 * that treats a first sighting as a baseline, never news.
 */
import {
  localDayDiff,
  reminderStageFor,
  dueReminders,
  eventChangeKind,
  reminderLedgerKey,
  type ReminderEventLike,
} from '../eventReminders';

// Fixed "now": Sunday 2026-10-25, 08:00 local.
const NOW = new Date('2026-10-25T08:00:00').getTime();
const DAY = 24 * 60 * 60 * 1000;

const ev = (over: Partial<ReminderEventLike>): ReminderEventLike => ({
  eventId: 'ev1',
  title: 'Satsang',
  startsAt: NOW + 3 * DAY,
  source: 'festival',
  ...over,
});

describe('reminderStageFor', () => {
  it('T-3 at three days out, T-1 at one, morning on the day', () => {
    expect(reminderStageFor(NOW + 3 * DAY, NOW)).toBe('t3');
    expect(reminderStageFor(NOW + 1 * DAY, NOW)).toBe('t1');
    expect(reminderStageFor(NOW + 2 * 60 * 60 * 1000, NOW)).toBe('morning');
  });
  it('no stage at other distances, in the past, or before 5am on the day', () => {
    expect(reminderStageFor(NOW + 2 * DAY, NOW)).toBeNull();
    expect(reminderStageFor(NOW + 5 * DAY, NOW)).toBeNull();
    expect(reminderStageFor(NOW - DAY, NOW)).toBeNull();
    const early = new Date('2026-10-25T03:00:00').getTime();
    expect(reminderStageFor(early + 5 * 60 * 60 * 1000, early)).toBeNull();
  });
  it('localDayDiff counts calendar days, not 24h spans', () => {
    const lateEvening = new Date('2026-10-25T23:30:00').getTime();
    const nextMorning = new Date('2026-10-26T00:30:00').getTime();
    expect(localDayDiff(nextMorning, lateEvening)).toBe(1);
  });
});

describe('dueReminders', () => {
  it('fires the stage once and never again (ledger)', () => {
    const sent = new Set<string>();
    const due = dueReminders([ev({})], NOW, sent);
    expect(due).toHaveLength(1);
    expect(due[0].stage).toBe('t3');
    expect(due[0].key).toBe(reminderLedgerKey(ev({}), 't3'));
    expect(due[0].key).toBe(`evrem:festival:ev1:${NOW + 3 * DAY}:t3`);
    sent.add(due[0].key);
    expect(dueReminders([ev({})], NOW, sent)).toHaveLength(0);
  });
  it('a missed stage is skipped forever — no catch-up burst', () => {
    // Two days out: the T-3 stage was never sent, and must NOT fire now.
    expect(dueReminders([ev({ startsAt: NOW + 2 * DAY })], NOW, new Set())).toHaveLength(0);
    // One day out: only T-1 fires.
    expect(dueReminders([ev({ startsAt: NOW + 1 * DAY })], NOW, new Set()).map((d) => d.stage)).toEqual([
      't1',
    ]);
  });
  it('past events never remind', () => {
    expect(dueReminders([ev({ startsAt: NOW - DAY })], NOW, new Set())).toHaveLength(0);
  });
});

describe('eventChangeKind — (seenUpdatedAt, current, now)', () => {
  const cur = { updatedAt: 100, startsAt: NOW + 3 * DAY, live: true };
  it('a first sighting is a baseline, never a "change"', () => {
    expect(eventChangeKind(null, cur, NOW)).toBeNull();
  });
  it('a vanished or unpublished event reads as cancelled', () => {
    expect(eventChangeKind(100, null, NOW)).toBe('cancelled');
    expect(eventChangeKind(100, { ...cur, live: false }, NOW)).toBe('cancelled');
  });
  it('an advanced updatedAt on a future event reads as changed', () => {
    expect(eventChangeKind(100, { ...cur, updatedAt: 200 }, NOW)).toBe('changed');
    expect(eventChangeKind(100, cur, NOW)).toBeNull();
  });
  it('past events never announce', () => {
    expect(eventChangeKind(100, { ...cur, updatedAt: 200, startsAt: NOW - DAY }, NOW)).toBeNull();
  });
});
