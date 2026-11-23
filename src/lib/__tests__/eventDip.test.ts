/**
 * eventDip.test.ts — NEXT-LEVEL B1b: the e-dip pure-logic pins.
 * =====================================================================
 * The laws these tests hold:
 *  - DETERMINISM: the same frozen pool + the same public seed
 *    always produce the same draw order, on any run — that
 *    reproducibility (not a server's word) is what makes the
 *    draw checkable, so it is pinned hard.
 *  - The fingerprint is stable for a pool and changes when the
 *    pool changes (a freeze can be re-checked against the
 *    register at any later moment).
 *  - Positions are the shuffle order, 1-based, complete and
 *    unique; winners are exactly the first N of that order.
 *  - Places are counted in PARTIES and clamped to the pool —
 *    never negative, never more than entered.
 *  - The window states follow the stamped maps exactly, with
 *    the inclusive close the rules use (opens <= t <= closes).
 *  - Aggregates count standings honestly: a claimed place is a
 *    selected place that completed; a lapsed place counts for
 *    nobody.
 */
import {
  dipAggregates,
  dipClaimOpen,
  dipEntryId,
  dipSeedInt,
  dipWindowState,
  isDipTier,
  mulberry32,
  nextWaitlisted,
  poolFingerprint,
  runDipDraw,
  sortDipPoolIds,
  type DipEntry,
} from '../eventDip';

const POOL = ['ev__t1__u3', 'ev__t1__u1', 'ev__t1__u2', 'ev__t1__u5', 'ev__t1__u4'];
const SORTED = sortDipPoolIds(POOL);
const HASH = poolFingerprint(SORTED);
const SEED = 'chit-42-drawn-at-the-meeting';

describe('pool order + fingerprint', () => {
  it('sorts doc ids lexicographically without mutating the input', () => {
    const input = [...POOL];
    expect(SORTED).toEqual(['ev__t1__u1', 'ev__t1__u2', 'ev__t1__u3', 'ev__t1__u4', 'ev__t1__u5']);
    expect(input).toEqual(POOL);
  });

  it('the fingerprint is stable for the same pool, whatever the arrival order', () => {
    expect(poolFingerprint(sortDipPoolIds([...POOL].reverse()))).toBe(HASH);
    expect(poolFingerprint(SORTED)).toBe(HASH);
    expect(HASH).toMatch(/^[0-9a-f]{64}$/);
  });

  it('the fingerprint changes when the pool changes', () => {
    expect(poolFingerprint(sortDipPoolIds([...POOL, 'ev__t1__u6']))).not.toBe(HASH);
    expect(poolFingerprint(sortDipPoolIds(POOL.slice(1)))).not.toBe(HASH);
    expect(poolFingerprint([])).not.toBe(HASH);
  });

  it('entry ids are the derived {festivalId}__{tierId}__{uid} shape', () => {
    expect(dipEntryId('ws-1__fest1', 'pass1', 'user-9')).toBe('ws-1__fest1__pass1__user-9');
  });
});

describe('mulberry32 + the seed', () => {
  it('is deterministic and stays inside [0, 1)', () => {
    const a = mulberry32(123456789);
    const b = mulberry32(123456789);
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds give different streams', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it('the draw seed int is a stable function of fingerprint + public seed', () => {
    expect(dipSeedInt(HASH, SEED)).toBe(dipSeedInt(HASH, SEED));
    expect(dipSeedInt(HASH, SEED)).not.toBe(dipSeedInt(HASH, 'another-seed'));
    expect(dipSeedInt(HASH, SEED)).not.toBe(dipSeedInt(poolFingerprint(['x']), SEED));
  });
});

describe('runDipDraw — the named draw', () => {
  it('DETERMINISM: same pool + seed → the same winners, order and positions', () => {
    const r1 = runDipDraw(SORTED, HASH, SEED, 2);
    const r2 = runDipDraw(SORTED, HASH, SEED, 2);
    expect(r1).toEqual(r2);
    // And from an unsorted arrival order, once sorted — the
    // freeze sorts, so the draw never depends on load order.
    const r3 = runDipDraw(sortDipPoolIds(POOL), HASH, SEED, 2);
    expect(r3).toEqual(r1);
  });

  it('winners are exactly the first N of the order; positions are 1-based and complete', () => {
    const r = runDipDraw(SORTED, HASH, SEED, 2);
    expect(r.winners).toEqual(r.order.slice(0, 2));
    expect(r.order).toHaveLength(5);
    expect(new Set(r.order)).toEqual(new Set(SORTED));
    expect(Object.values(r.positions).sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5]);
    for (const id of r.order) {
      expect(r.positions[id]).toBe(r.order.indexOf(id) + 1);
    }
    // The waitlist order IS the shuffle order after the winners.
    expect(r.order.slice(2).map((id) => r.positions[id])).toEqual([3, 4, 5]);
  });

  it('a different seed (almost surely) draws a different order', () => {
    const big = sortDipPoolIds(Array.from({ length: 40 }, (_, i) => `ev__t__u${i}`));
    const h = poolFingerprint(big);
    const a = runDipDraw(big, h, 'seed-a', 10);
    const b = runDipDraw(big, h, 'seed-b', 10);
    expect(a.order).not.toEqual(b.order);
  });

  it('places are clamped to the pool and never negative', () => {
    expect(runDipDraw(SORTED, HASH, SEED, 99).winners).toHaveLength(5);
    expect(runDipDraw(SORTED, HASH, SEED, 0).winners).toEqual([]);
    expect(runDipDraw(SORTED, HASH, SEED, -3).winners).toEqual([]);
    expect(runDipDraw([], HASH, SEED, 3)).toEqual({ order: [], winners: [], positions: {} });
  });

  it('does not mutate the pool it is given', () => {
    const pool = [...SORTED];
    runDipDraw(pool, HASH, SEED, 2);
    expect(pool).toEqual(SORTED);
  });
});

describe('window states — the stamped maps, the rules clock', () => {
  const ev = { dipOpensAtMs: { t1: 1000 }, dipClosesAtMs: { t1: 2000 } };
  it('a tier with no stamp is not a dip tier', () => {
    expect(isDipTier(ev, 't1')).toBe(true);
    expect(isDipTier(ev, 'other')).toBe(false);
    expect(isDipTier({}, 't1')).toBe(false);
    expect(dipWindowState(ev, 'other', 1500)).toBe('none');
  });
  it('upcoming → open → closed, with an inclusive close', () => {
    expect(dipWindowState(ev, 't1', 999)).toBe('upcoming');
    expect(dipWindowState(ev, 't1', 1000)).toBe('open');
    expect(dipWindowState(ev, 't1', 2000)).toBe('open');
    expect(dipWindowState(ev, 't1', 2001)).toBe('closed');
  });
  it('the claim window follows the draw record', () => {
    const drawn = { dipDraws: { t1: { seed: 's', poolHash: 'h', poolCount: 3, frozenAtMs: 1, drawnAtMs: 3000, winnersCount: 2, claimByMs: 5000 } } };
    expect(dipClaimOpen(drawn, 't1', 5000)).toBe(true);
    expect(dipClaimOpen(drawn, 't1', 5001)).toBe(false);
    expect(dipClaimOpen({ dipDraws: { t1: { seed: 's', poolHash: 'h', poolCount: 3, frozenAtMs: 1 } } }, 't1', 4000)).toBe(false);
    expect(dipClaimOpen({}, 't1', 4000)).toBe(false);
  });
});

describe('aggregates + the waitlist head', () => {
  const entry = (status: DipEntry['status'], dipPosition?: number): DipEntry => ({
    id: `e-${status}-${dipPosition ?? 0}`,
    festivalId: 'f', tierId: 't', workspaceId: 'w', uid: 'u',
    buyerName: 'Party', attendees: [{ name: 'Party' }], heads: 1,
    createdAt: 1, status, ...(dipPosition ? { dipPosition } : {}),
  });

  it('counts entered / selected (held or claimed) / claimed honestly', () => {
    const agg = dipAggregates([
      entry('entered'), entry('selected'), entry('selected'),
      entry('claimed'), entry('waitlisted'), entry('lapsed'),
    ]);
    expect(agg).toEqual({ entries: 6, selected: 3, claimed: 1 });
    expect(dipAggregates([])).toEqual({ entries: 0, selected: 0, claimed: 0 });
  });

  it('the next in line is the lowest published position', () => {
    const list = [entry('waitlisted', 7), entry('selected', 1), entry('waitlisted', 4), entry('waitlisted', 9)];
    expect(nextWaitlisted(list)?.dipPosition).toBe(4);
    expect(nextWaitlisted([entry('selected', 1)])).toBeNull();
    expect(nextWaitlisted([])).toBeNull();
  });
});
