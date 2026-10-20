/**
 * windowing.test.ts — F2 threshold / fallback behaviour proofs.
 *
 * The laws under test:
 *  - At or below FULL_SYNC_THRESHOLD → full sync (today's behaviour).
 *  - Above → windowed.
 *  - A failed/absent probe → full sync (fail-open, never a blocked desk).
 */
import {
  COLLECTION_WINDOW_ORDER,
  CORE_COLLECTIONS,
  FULL_SYNC_THRESHOLD,
  WINDOW_PAGE_SIZE,
  decideWindowMode,
  hasMoreToLoad,
  nextWindowLimit,
  windowStateForCount,
} from '../windowing';

describe('decideWindowMode', () => {
  it('keeps full sync at and below the threshold', () => {
    expect(decideWindowMode(0)).toBe('full');
    expect(decideWindowMode(1)).toBe('full');
    expect(decideWindowMode(FULL_SYNC_THRESHOLD - 1)).toBe('full');
    expect(decideWindowMode(FULL_SYNC_THRESHOLD)).toBe('full');
  });

  it('windows above the threshold', () => {
    expect(decideWindowMode(FULL_SYNC_THRESHOLD + 1)).toBe('windowed');
    expect(decideWindowMode(40000)).toBe('windowed');
    expect(decideWindowMode(100000)).toBe('windowed');
  });

  it('fails open to full sync when the probe could not measure', () => {
    expect(decideWindowMode(null)).toBe('full');
    expect(decideWindowMode(undefined)).toBe('full');
    expect(decideWindowMode(NaN)).toBe('full');
  });
});

describe('windowStateForCount / nextWindowLimit / hasMoreToLoad', () => {
  it('builds the windowed state for a big workspace', () => {
    const s = windowStateForCount(40000);
    expect(s).toEqual({ total: 40000, windowed: true, limit: WINDOW_PAGE_SIZE });
  });

  it('builds the full state for a small workspace and for a failed probe', () => {
    expect(windowStateForCount(120).windowed).toBe(false);
    expect(windowStateForCount(null)).toEqual({
      total: null,
      windowed: false,
      limit: WINDOW_PAGE_SIZE,
    });
  });

  it('grows the limit by a page and caps at the known total', () => {
    const s = { total: 1200, windowed: true, limit: 500 };
    expect(nextWindowLimit(s)).toBe(1000);
    expect(nextWindowLimit({ ...s, limit: 1000 })).toBe(1200);
    expect(nextWindowLimit({ total: null, windowed: true, limit: 500 })).toBe(1000);
  });

  it('reports more-to-load only while windowed and short of the total', () => {
    const s = { total: 1200, windowed: true, limit: 500 };
    expect(hasMoreToLoad(s, 500)).toBe(true);
    expect(hasMoreToLoad(s, 1200)).toBe(false);
    expect(hasMoreToLoad({ ...s, windowed: false }, 10)).toBe(false);
  });
});

describe('window order config', () => {
  it('covers exactly the four core collections with sane orders', () => {
    expect(Object.keys(COLLECTION_WINDOW_ORDER).sort()).toEqual([...CORE_COLLECTIONS].sort());
    expect(COLLECTION_WINDOW_ORDER.treasury).toEqual({ field: 'date', direction: 'desc' });
    expect(COLLECTION_WINDOW_ORDER.devotees).toEqual({ field: 'fullName', direction: 'asc' });
    expect(COLLECTION_WINDOW_ORDER.puja_bookings).toEqual({ field: 'bookingDate', direction: 'desc' });
    expect(COLLECTION_WINDOW_ORDER.inventory_items).toEqual({ field: 'itemName', direction: 'asc' });
  });
});
