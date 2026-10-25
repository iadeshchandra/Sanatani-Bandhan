/**
 * festivalWaitlistDays.test.ts — EVENTS P1: waitlist order + per-day
 * counters (the pure halves of the anchored write paths).
 * =====================================================================
 * The queue is strictly first-come-first-served (joinedAt, uid as the
 * deterministic tie-break) — promotion in claimFestivalWaitlist walks
 * exactly this order. Per-day counts derive from the RSVP list:
 * confirmed records only; a record without chosen days attends every
 * day; waitlisted parties never inflate a day's expectation.
 */
import { waitlistOrder, waitlistPosition, deriveDayCounts } from '../festivalRsvp';
import type { FestivalEventDoc, RsvpEntry } from '../festival';

const evWithQueue = {
  slotWaitlist: {
    morning: { uidB: 200, uidA: 100, uidC: 100 },
  },
} as unknown as Pick<FestivalEventDoc, 'slotWaitlist'>;

describe('waitlistOrder / waitlistPosition', () => {
  it('orders by join time, uid breaking ties deterministically', () => {
    expect(waitlistOrder(evWithQueue, 'morning').map((e) => e.uid)).toEqual(['uidA', 'uidC', 'uidB']);
  });
  it('positions are 1-based; strangers are 0', () => {
    expect(waitlistPosition(evWithQueue, 'morning', 'uidA')).toBe(1);
    expect(waitlistPosition(evWithQueue, 'morning', 'uidC')).toBe(2);
    expect(waitlistPosition(evWithQueue, 'morning', 'uidB')).toBe(3);
    expect(waitlistPosition(evWithQueue, 'morning', 'nobody')).toBe(0);
    expect(waitlistPosition(evWithQueue, 'evening', 'uidA')).toBe(0);
  });
  it('a missing queue is an empty queue', () => {
    expect(waitlistOrder({} as Pick<FestivalEventDoc, 'slotWaitlist'>, 'morning')).toEqual([]);
  });
});

const DAYS = ['2026-11-06', '2026-11-07', '2026-11-08'];
const rsvp = (over: Partial<RsvpEntry>): RsvpEntry => ({
  id: 'x',
  eventId: 'ev',
  workspaceId: 'ws',
  uid: 'u',
  name: 'Devotee',
  headcount: 2,
  createdAt: '2026-10-25T00:00:00.000Z',
  ...over,
});

describe('deriveDayCounts', () => {
  it('counts chosen days only for day-wise parties', () => {
    const counts = deriveDayCounts(
      [rsvp({ uid: 'a', headcount: 4, days: ['2026-11-07'] }), rsvp({ uid: 'b', headcount: 2 })],
      DAYS
    );
    expect(counts).toEqual([
      { date: '2026-11-06', heads: 2, parties: 1 },
      { date: '2026-11-07', heads: 6, parties: 2 },
      { date: '2026-11-08', heads: 2, parties: 1 },
    ]);
  });
  it('waitlisted parties never count toward a day', () => {
    const counts = deriveDayCounts([rsvp({ status: 'waitlisted', headcount: 9 })], DAYS);
    expect(counts.every((c) => c.heads === 0 && c.parties === 0)).toBe(true);
  });
  it('legacy records without a status count as confirmed', () => {
    const counts = deriveDayCounts([rsvp({ headcount: 3 })], DAYS);
    expect(counts.map((c) => c.heads)).toEqual([3, 3, 3]);
  });
  it('days outside the festival span are ignored, not invented', () => {
    const counts = deriveDayCounts([rsvp({ days: ['2026-12-25'] })], DAYS);
    expect(counts.every((c) => c.heads === 0)).toBe(true);
  });
});
