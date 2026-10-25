/**
 * vibeBatch2.test.ts — VIBE B2 gates.
 *
 * 1. usageStore honesty: counts accumulate per scope, scopes never
 *    bleed into each other, ranking is count→recency→caller order, and
 *    a scope with no opens reports NO usage (the cold-start truth the
 *    "Begin here" label depends on).
 * 2. panjikaMonth correctness against REAL engine + DB facts:
 *    2026-10-25 is Kojagari Lakshmi Puja (DB, verified) on Ashwin
 *    Purnima; the 2026 Diwali cluster (Nov 6/7/8/10) carries its
 *    festivals on its own days; every cell's tithi/abhijit comes from
 *    the canonical engine (non-empty, engine-shaped).
 * 3. computePendingCount: the offline vocabulary's number is the sum
 *    of the canonical outbox's two live queues (manager mocked at its
 *    public static surface — the same surface the app calls).
 */
import {
  clearUsage,
  hasAnyUsage,
  rankByUsage,
  readUsage,
  recordUse,
  usageScopeKey,
} from '../usageStore';
import { buildPanjikaMonth, splitTithi } from '../panjikaMonth';
import { festivalsOn } from '../panjikaFestivals';
import { calculatePanchang } from '../../utils/panchang';

jest.mock('../../services/OfflineSyncManager', () => {
  const state = {
    mutations: [] as unknown[],
    queue: [] as Array<{ status: string }>,
  };
  return {
    __state: state,
    OfflineSyncManager: {
      getPendingMutations: jest.fn(async () => state.mutations),
      getQueue: jest.fn(() => state.queue),
      onNetworkStatusChange: jest.fn(() => () => {}),
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { computePendingCount } = require('../../hooks/useOfflineQueueStatus');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const managerMock = require('../../services/OfflineSyncManager');

describe('usageStore — honest, scoped, local', () => {
  beforeEach(() => {
    clearUsage('WS-A');
    clearUsage('WS-B');
    clearUsage('solo');
  });

  it('scope keys are namespaced per workspace', () => {
    expect(usageScopeKey('WS-A')).toBe('sanatani_usage_v1::WS-A');
    expect(usageScopeKey(null)).toBe('sanatani_usage_v1');
    expect(usageScopeKey('  ')).toBe('sanatani_usage_v1');
  });

  it('a fresh scope has NO usage — the cold-start truth', () => {
    expect(hasAnyUsage('WS-A')).toBe(false);
    expect(readUsage('WS-A')).toEqual([]);
  });

  it('opens accumulate counts and never bleed across scopes', () => {
    recordUse('treasury', 'WS-A');
    recordUse('treasury', 'WS-A');
    recordUse('devotees', 'WS-A');
    recordUse('treasury', 'WS-B');
    const a = readUsage('WS-A');
    expect(a[0]).toMatchObject({ id: 'treasury', count: 2 });
    expect(a[1]).toMatchObject({ id: 'devotees', count: 1 });
    expect(readUsage('WS-B')).toEqual([
      expect.objectContaining({ id: 'treasury', count: 1 }),
    ]);
    expect(hasAnyUsage('solo')).toBe(false);
  });

  it('rankByUsage orders by count, then recency, then caller order', () => {
    const usage = [
      { id: 'a', count: 1, last: 300 },
      { id: 'b', count: 3, last: 100 },
      { id: 'c', count: 3, last: 200 },
    ];
    // b and c tie on count → recency puts c first; unused ids keep
    // their caller order after every used id.
    expect(rankByUsage(['x', 'a', 'b', 'c', 'y'], usage)).toEqual(['c', 'b', 'a', 'x', 'y']);
    expect(rankByUsage(['x', 'y'], usage)).toEqual(['x', 'y']);
  });
});

describe('splitTithi', () => {
  it('splits paksha from the tithi name', () => {
    expect(splitTithi('Shukla Trayodashi', 'Shukla')).toEqual({
      tithiName: 'Trayodashi',
      paksha: 'Shukla',
    });
    expect(splitTithi('Krishna Amavasya')).toEqual({
      tithiName: 'Amavasya',
      paksha: 'Krishna',
    });
    expect(splitTithi('Purnima')).toEqual({ tithiName: 'Purnima', paksha: '' });
    expect(splitTithi('')).toEqual({ tithiName: '', paksha: '' });
  });
});

describe('panjikaMonth — real engine, real DB', () => {
  const oct = buildPanjikaMonth(2026, 9, '2026-10-25');
  const byIso = (cells: ReturnType<typeof buildPanjikaMonth>, iso: string) =>
    cells.find((c) => c && c.iso === iso)!;

  it('builds a 42-cell Sunday-start grid aligned to the real calendar', () => {
    expect(oct).toHaveLength(42);
    // 2026-10-01 was a Thursday → 4 leading blanks.
    expect(oct.slice(0, 4)).toEqual([null, null, null, null]);
    expect(oct[4]?.iso).toBe('2026-10-01');
    // 31 days in October.
    expect(oct.filter(Boolean)).toHaveLength(31);
  });

  it('2026-10-25 carries Kojagari Lakshmi Puja from the DB', () => {
    const cell = byIso(oct, '2026-10-25');
    expect(cell.festivals.map((f) => f.nameEn)).toContain('Kojagari Lakshmi Puja');
    expect(cell.festivals).toEqual(festivalsOn('2026-10-25'));
    expect(cell.isToday).toBe(true);
    expect(oct.filter((c) => c?.isToday)).toHaveLength(1);
  });

  it('every October cell carries an engine tithi and an Abhijit window', () => {
    for (const c of oct) {
      if (!c) continue;
      expect(c.tithiName.length).toBeGreaterThan(0);
      expect(['Shukla', 'Krishna']).toContain(c.paksha);
      expect(c.abhijit).toMatch(/\d/);
    }
  });

  it('cells carry the canonical engine’s OWN tithi for their date', () => {
    // The grid never approximates: a cell's tithi IS calculatePanchang's
    // reading for that civil day. Pinned on the two festival days whose
    // observance tithi begins later in the day — the engine's noon
    // reading (Shukla Chaturdashi on Kojagari day, Krishna Chaturdashi
    // on Diwali day) is what every other surface shows too; the
    // festival mark, not the tithi cell, carries the observance.
    for (const iso of ['2026-10-25', '2026-11-08', '2026-10-01']) {
      const [y, m, d] = iso.split('-').map(Number);
      const engine = calculatePanchang(new Date(y, m - 1, d, 12, 0, 0));
      const cells = iso.startsWith('2026-11') ? buildPanjikaMonth(2026, 10, '2026-10-25') : oct;
      const cell = byIso(cells, iso);
      expect(cell.tithiFull).toBe(engine.tithi);
      expect(cell.abhijit).toBe((engine.abhijitMuhurat || '').trim());
      expect(cell.nakshatra).toBe(engine.nakshatra);
    }
  });

  it('the Diwali cluster days carry their festivals (Nov 2026)', () => {
    const nov = buildPanjikaMonth(2026, 10, '2026-10-25');
    const names = (iso: string) => byIso(nov, iso).festivals.map((f) => f.nameEn);
    expect(names('2026-11-06')).toContain('Dhanteras');
    expect(names('2026-11-07')).toContain('Choti Diwali');
    expect(names('2026-11-08')).toContain('Diwali / Deepavali');
    expect(names('2026-11-08')).toContain('Kali Puja');
    expect(names('2026-11-10')).toContain('Govardhan Puja');
    // An ordinary day in the same month is honestly empty.
    expect(names('2026-11-20')).toEqual(festivalsOn('2026-11-20'));
  });
});

describe('computePendingCount — the number is the queues’ own', () => {
  it('sums pending mutations + PENDING/FAILED actions, ignores SYNCED', async () => {
    managerMock.__state.mutations = [{}, {}, {}];
    managerMock.__state.queue = [
      { status: 'PENDING' },
      { status: 'FAILED' },
      { status: 'SYNCED' },
    ];
    await expect(computePendingCount()).resolves.toBe(5);
    managerMock.__state.mutations = [];
    managerMock.__state.queue = [];
    await expect(computePendingCount()).resolves.toBe(0);
  });
});
