/**
 * festivalAwareness.spec.ts — Panjika-aware behaviour around major festivals.
 *
 * Anchored on the verified festival database: Diwali / Deepavali is
 * 2026-11-08 and Maha Ashtami (Durga Puja) is 2026-10-19.
 */
import {
  BATCHING_WINDOW_FESTIVAL_MIN,
  BATCHING_WINDOW_NORMAL_MIN,
  blessingDigestBoost,
  festivalAwareness,
  getBatchingWindow,
  isFestivalPeriod,
  localISO,
  type FestivalPeriod,
} from '../festivalAwareness';
import type { PanjikaFestival } from '../../lib/panjikaFestivals';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 12, 0, 0);

describe('festivalAwareness — date windows', () => {
  test('active 2 days before Diwali (2026-11-06)', () => {
    const p: FestivalPeriod = isFestivalPeriod(d(2026, 11, 6));
    expect(p.active).toBe(true);
    expect(p.festival).toBe('Diwali / Deepavali');
    expect(p.daysUntil).toBe(2);
  });

  test('active 2 days after Diwali (2026-11-10)', () => {
    const p = isFestivalPeriod(d(2026, 11, 10));
    expect(p.active).toBe(true);
    expect(p.daysUntil).toBe(-2);
  });

  test('inactive 4 days before Diwali (2026-11-04) — outside the ±3-day window', () => {
    expect(isFestivalPeriod(d(2026, 11, 4)).active).toBe(false);
  });

  test('inactive on an ordinary day (2026-06-01)', () => {
    const p = isFestivalPeriod(d(2026, 6, 1));
    expect(p.active).toBe(false);
    expect(p.festival).toBeUndefined();
  });

  test('active on Maha Ashtami — the Durga Puja family (2026-10-19)', () => {
    const p = isFestivalPeriod(d(2026, 10, 19));
    expect(p.active).toBe(true);
    expect(p.festival).toBe('Durga Puja');
    expect(p.daysUntil).toBe(0);
  });

  test('non-major festivals (Christmas) do not trigger festive mode', () => {
    expect(isFestivalPeriod(d(2026, 12, 25)).active).toBe(false);
  });
});

describe('festivalAwareness — matching is injectable and deterministic', () => {
  const custom: PanjikaFestival[] = [
    {
      date: '2030-01-15',
      nameEn: 'Test Holi Mela',
      nameBn: 'পরীক্ষা হোলি',
      significanceEn: 'synthetic',
      significanceBn: 'কৃত্রিম',
      category: 'festival',
      variant: 'both',
      regions: ['vikram'],
      confidence: 'verified',
    },
  ];

  test('matches a custom list one day before the festival', () => {
    const p = isFestivalPeriod(d(2030, 1, 14), custom);
    expect(p.active).toBe(true);
    expect(p.festival).toBe('Holi');
  });

  test('empty list is never festive', () => {
    expect(isFestivalPeriod(d(2026, 11, 8), []).active).toBe(false);
  });
});

describe('festivalAwareness — batching windows', () => {
  test('tightens to 30 minutes during a festival', () => {
    expect(getBatchingWindow(d(2026, 11, 8))).toBe(BATCHING_WINDOW_FESTIVAL_MIN);
    expect(getBatchingWindow(d(2026, 11, 8))).toBe(30);
  });

  test('stays at 2 hours normally', () => {
    expect(getBatchingWindow(d(2026, 6, 1))).toBe(BATCHING_WINDOW_NORMAL_MIN);
    expect(getBatchingWindow(d(2026, 6, 1))).toBe(120);
  });
});

describe('festivalAwareness — blessing boost & one-call summary', () => {
  test('blessings surface first during festivals, not otherwise', () => {
    expect(blessingDigestBoost(d(2026, 11, 8))).toBe(true);
    expect(blessingDigestBoost(d(2026, 6, 1))).toBe(false);
  });

  test('festivalAwareness() bundles period + window + boost', () => {
    const f = festivalAwareness(d(2026, 10, 19));
    expect(f.active).toBe(true);
    expect(f.festival).toBe('Durga Puja');
    expect(f.batchingWindowMinutes).toBe(30);
    expect(f.blessingBoost).toBe(true);
  });
});

describe('festivalAwareness — localISO', () => {
  test('produces a local YYYY-MM-DD (no UTC midnight drift)', () => {
    expect(localISO(new Date(2026, 10, 8, 0, 5, 0))).toBe('2026-11-08');
  });
});
