/**
 * festivalFairness.test.ts — NEXT-LEVEL B1a: fairness transparency pins.
 * =====================================================================
 * The laws these tests hold:
 *  - the live quota reads the SAME counters the purchase path
 *    trusts (tierCaps first — the map the rules bound tierSold by —
 *    then the tier's stamped capacity; sold from anchored tierSold),
 *    so the public count and the checkout count can never disagree;
 *  - remaining never goes negative and never claims a precision the
 *    counters do not hold (fractional stamps floor; absent counters
 *    mean "no quota line", never a dressed-up guess);
 *  - an unmetered tier is a fact, not a number: capacity/remaining
 *    are null and it can never read as sold out;
 *  - the published results are aggregates BY SHAPE — the summary's
 *    key set (and each tier row's) is pinned exactly, so no name or
 *    per-person field can slip in later unnoticed;
 *  - the waitlist count is present only when the register could
 *    honestly count it (null in → field omitted; 0 in → 0 shown,
 *    because "nobody was left waiting" is itself a fact);
 *  - the release moment is stamped only when a release calendar
 *    was actually used (0/absent = no gate = no field);
 *  - totals: booked always sums; offered sums only a fully-metered
 *    offer — a partial sum would misstate what was offered;
 *  - the public block shows only when published AND concluded.
 */
import {
  buildFairnessSummary,
  fairnessResultsVisible,
  quotasForEvent,
  tierQuota,
} from '../festivalFairness';
import type { DebriefTierRow } from '../festivalDebrief';
import type { FestivalEventDoc, TicketTier } from '../festival';

const tier = (over: Partial<TicketTier>): TicketTier =>
  ({
    id: 't1',
    name: { en: 'General Pass', bn: '', hi: '' },
    kind: 'paid',
    price: 100,
    ...over,
  }) as TicketTier;

describe('tierQuota — the live remaining places', () => {
  it('computes remaining from capacity and the anchored sold counter', () => {
    const q = tierQuota(tier({ capacity: 100 }), { t1: 77 }, undefined);
    expect(q).toEqual({ tierId: 't1', capacity: 100, sold: 77, remaining: 23, soldOut: false });
  });

  it('prefers the tierCaps map over the tier’s stamped capacity (the rules’ bound)', () => {
    const q = tierQuota(tier({ capacity: 50 }), { t1: 10 }, { t1: 80 });
    expect(q.capacity).toBe(80);
    expect(q.remaining).toBe(70);
  });

  it('falls back to the tier capacity when the caps map lacks the tier', () => {
    const q = tierQuota(tier({ capacity: 50 }), { t1: 10 }, { other: 5 });
    expect(q.capacity).toBe(50);
    expect(q.remaining).toBe(40);
  });

  it('reads sold out at exactly capacity, and clamps an over-sold counter at zero', () => {
    expect(tierQuota(tier({ capacity: 30 }), { t1: 30 }, undefined).soldOut).toBe(true);
    const over = tierQuota(tier({ capacity: 30 }), { t1: 45 }, undefined);
    expect(over.remaining).toBe(0);
    expect(over.soldOut).toBe(true);
  });

  it('an unmetered tier has no quota numbers and is never sold out', () => {
    const q = tierQuota(tier({}), { t1: 999 }, undefined);
    expect(q.capacity).toBeNull();
    expect(q.remaining).toBeNull();
    expect(q.soldOut).toBe(false);
    expect(q.sold).toBe(999);
  });

  it('missing counters read as nothing sold yet — never an error, never a guess', () => {
    const q = tierQuota(tier({ capacity: 40 }), undefined, undefined);
    expect(q.sold).toBe(0);
    expect(q.remaining).toBe(40);
  });

  it('fractional stamps floor and negative stamps clamp — no false precision', () => {
    const q = tierQuota(tier({ capacity: 10.9 }), { t1: -3 }, undefined);
    expect(q.capacity).toBe(10);
    expect(q.sold).toBe(0);
    expect(q.remaining).toBe(10);
  });

  it('quotasForEvent shapes every tier of the doc in order', () => {
    const ev = {
      ticketTiers: [tier({ id: 'a', capacity: 10 }), tier({ id: 'b' })],
      tierSold: { a: 4, b: 2 },
      tierCaps: undefined,
    } as Pick<FestivalEventDoc, 'ticketTiers' | 'tierSold' | 'tierCaps'>;
    const qs = quotasForEvent(ev);
    expect(qs.map((q) => q.tierId)).toEqual(['a', 'b']);
    expect(qs[0].remaining).toBe(6);
    expect(qs[1].remaining).toBeNull();
  });
});

const row = (over: Partial<DebriefTierRow>): DebriefTierRow => ({
  tierId: 't1',
  tierName: 'General Pass',
  kind: 'paid',
  capacity: 100,
  soldQty: 77,
  remaining: 23,
  ...over,
});

describe('buildFairnessSummary — aggregates only, by shape', () => {
  it('maps tier rows to offered/booked and sums a fully-metered offer', () => {
    const s = buildFairnessSummary({
      tierRows: [row({}), row({ tierId: 't2', tierName: 'Seva Pass', capacity: 50, soldQty: 50, remaining: 0 })],
      waitlistParties: 12,
      ticketReleaseAtMs: 1735689600000,
      nowIso: '2026-01-05T10:00:00.000Z',
    });
    expect(s.publishedAt).toBe('2026-01-05T10:00:00.000Z');
    expect(s.tiers).toEqual([
      { tierId: 't1', tierName: 'General Pass', kind: 'paid', offered: 100, booked: 77 },
      { tierId: 't2', tierName: 'Seva Pass', kind: 'paid', offered: 50, booked: 50 },
    ]);
    expect(s.totalOffered).toBe(150);
    expect(s.totalBooked).toBe(127);
    expect(s.waitlistParties).toBe(12);
    expect(s.releaseAtMs).toBe(1735689600000);
  });

  it('omits the waitlist field when the register cannot count it (null in)', () => {
    const s = buildFairnessSummary({
      tierRows: [row({})],
      waitlistParties: null,
      ticketReleaseAtMs: undefined,
      nowIso: '2026-01-05T10:00:00.000Z',
    });
    expect('waitlistParties' in s).toBe(false);
  });

  it('keeps a counted zero — nobody left waiting is a fact, not a gap', () => {
    const s = buildFairnessSummary({
      tierRows: [row({})],
      waitlistParties: 0,
      ticketReleaseAtMs: undefined,
      nowIso: '2026-01-05T10:00:00.000Z',
    });
    expect(s.waitlistParties).toBe(0);
  });

  it('omits the release moment when no release calendar was used (0 or absent)', () => {
    for (const ms of [0, undefined]) {
      const s = buildFairnessSummary({
        tierRows: [row({})],
        waitlistParties: null,
        ticketReleaseAtMs: ms,
        nowIso: '2026-01-05T10:00:00.000Z',
      });
      expect('releaseAtMs' in s).toBe(false);
    }
  });

  it('totalOffered is null when any tier is unmetered — a partial sum would misstate the offer', () => {
    const s = buildFairnessSummary({
      tierRows: [row({}), row({ tierId: 't2', capacity: null, soldQty: 300, remaining: null })],
      waitlistParties: null,
      ticketReleaseAtMs: undefined,
      nowIso: '2026-01-05T10:00:00.000Z',
    });
    expect(s.totalOffered).toBeNull();
    expect(s.totalBooked).toBe(377);
    expect(s.tiers[1].offered).toBeNull();
  });

  it('an empty tier list sums booked to 0 and offers no total', () => {
    const s = buildFairnessSummary({
      tierRows: [],
      waitlistParties: null,
      ticketReleaseAtMs: undefined,
      nowIso: '2026-01-05T10:00:00.000Z',
    });
    expect(s.tiers).toEqual([]);
    expect(s.totalBooked).toBe(0);
    expect(s.totalOffered).toBeNull();
  });

  it('the shape can carry no identity — key sets pinned exactly', () => {
    const s = buildFairnessSummary({
      tierRows: [row({})],
      waitlistParties: 3,
      ticketReleaseAtMs: 1735689600000,
      nowIso: '2026-01-05T10:00:00.000Z',
    });
    expect(Object.keys(s).sort()).toEqual(
      ['publishedAt', 'releaseAtMs', 'tiers', 'totalBooked', 'totalOffered', 'waitlistParties'].sort()
    );
    expect(Object.keys(s.tiers[0]).sort()).toEqual(
      ['booked', 'kind', 'offered', 'tierId', 'tierName'].sort()
    );
    const bare = buildFairnessSummary({
      tierRows: [row({})],
      waitlistParties: null,
      ticketReleaseAtMs: undefined,
      nowIso: '2026-01-05T10:00:00.000Z',
    });
    expect(Object.keys(bare).sort()).toEqual(
      ['publishedAt', 'tiers', 'totalBooked', 'totalOffered'].sort()
    );
  });

  // NEXT-LEVEL B1b — the e-dip aggregates ride the summary only
  // when a dip actually ran: present with entries > 0, omitted
  // for null (register unread) and for an empty register (an
  // unread register is never dressed as a held draw). The dip
  // shape itself is pinned: three counts, nothing else.
  it('carries the dip aggregates when a dip ran — and only then', () => {
    const withDip = buildFairnessSummary({
      tierRows: [row({})],
      waitlistParties: null,
      ticketReleaseAtMs: undefined,
      nowIso: '2026-01-05T10:00:00.000Z',
      dipAggregates: { entries: 41, selected: 12, claimed: 9 },
    });
    expect(withDip.dip).toEqual({ entries: 41, selected: 12, claimed: 9 });
    expect(Object.keys(withDip).sort()).toEqual(
      ['dip', 'publishedAt', 'tiers', 'totalBooked', 'totalOffered'].sort()
    );
    expect(Object.keys(withDip.dip!).sort()).toEqual(['claimed', 'entries', 'selected'].sort());

    const unread = buildFairnessSummary({
      tierRows: [row({})],
      waitlistParties: null,
      ticketReleaseAtMs: undefined,
      nowIso: '2026-01-05T10:00:00.000Z',
      dipAggregates: null,
    });
    expect('dip' in unread).toBe(false);

    const empty = buildFairnessSummary({
      tierRows: [row({})],
      waitlistParties: null,
      ticketReleaseAtMs: undefined,
      nowIso: '2026-01-05T10:00:00.000Z',
      dipAggregates: { entries: 0, selected: 0, claimed: 0 },
    });
    expect('dip' in empty).toBe(false);
  });
});

describe('fairnessResultsVisible — published AND concluded', () => {
  const base = { dateISO: '2026-01-10', endDateISO: '2026-01-10' };
  const summary = buildFairnessSummary({
    tierRows: [row({})],
    waitlistParties: null,
    ticketReleaseAtMs: undefined,
    nowIso: '2026-01-05T10:00:00.000Z',
  });
  const during = new Date(2026, 0, 10, 12, 0, 0).getTime();
  const after = new Date(2026, 0, 11, 0, 0, 1).getTime();

  it('never renders when unpublished — no empty shelf', () => {
    expect(fairnessResultsVisible({ ...base }, after)).toBe(false);
  });

  it('a summary published early still waits for the festival to end', () => {
    expect(fairnessResultsVisible({ ...base, fairnessSummary: summary }, during)).toBe(false);
  });

  it('renders once the festival has concluded', () => {
    expect(fairnessResultsVisible({ ...base, fairnessSummary: summary }, after)).toBe(true);
  });
});
