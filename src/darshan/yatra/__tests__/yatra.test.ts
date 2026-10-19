/**
 * darshan/yatra/__tests__/yatra.test.ts
 */
import {
  clampStopIndex,
  matchTirtha,
  nextStopIndex,
  normalizeTempleName,
  prevStopIndex,
  shouldSuggestYatra,
} from '../types';
import {
  CHARDHAM_ORDER,
  JYOTIRLINGA_ORDER,
  SHAKTI_PEETHA_ORDER,
  TIRTHA_MATCH_TOKENS,
  YATRA_COLLECTIONS,
  collectionsForTirtha,
  stopDisplayName,
  tirthaNames,
} from '../collections';
import { buildYatra, liveCollections, stopCounterText } from '../yatra';
import { activeYatraFestivals, festivalYatraHeader } from '../festival';
import type { LiveStreamItem } from '../../../sangam/watch/types';

const live = (templeName: string, extra: Partial<LiveStreamItem> = {}): LiveStreamItem => ({
  kind: 'temple',
  orgId: `org-${templeName}`,
  templeName,
  videoId: 'vid123',
  ...extra,
});

describe('swipe navigation', () => {
  test('next/prev wrap around', () => {
    expect(nextStopIndex(0, 3)).toBe(1);
    expect(nextStopIndex(2, 3)).toBe(0);
    expect(prevStopIndex(0, 3)).toBe(2);
    expect(prevStopIndex(1, 3)).toBe(0);
  });
  test('empty yatra is safe', () => {
    expect(nextStopIndex(0, 0)).toBe(0);
    expect(prevStopIndex(5, 0)).toBe(0);
    expect(clampStopIndex(9, 3)).toBe(2);
    expect(clampStopIndex(-2, 3)).toBe(0);
    expect(clampStopIndex(1, 3)).toBe(1);
  });
});

describe('yatra suggestion threshold', () => {
  test('needs at least 2 live temples', () => {
    expect(shouldSuggestYatra(0)).toBe(false);
    expect(shouldSuggestYatra(1)).toBe(false);
    expect(shouldSuggestYatra(2)).toBe(true);
    expect(shouldSuggestYatra(12)).toBe(true);
  });
});

describe('temple name matching', () => {
  test('matches English names', () => {
    expect(matchTirtha('Somnath Temple Live', TIRTHA_MATCH_TOKENS)).toBe('somnath');
    expect(matchTirtha('Kashi Vishwanath Aarti', TIRTHA_MATCH_TOKENS)).toBe('vishwanath');
  });
  test('matches Hindi/Bengali names', () => {
    expect(matchTirtha('महाकालेश्वर उज्जैन लाइव', TIRTHA_MATCH_TOKENS)).toBe('mahakaleshwar');
    expect(matchTirtha('কামাখ্যা মন্দির', TIRTHA_MATCH_TOKENS)).toBe('kamakhya');
  });
  test('longest token wins', () => {
    // "kashi" alone is shorter than a full match; vishwanath tokens win on length
    expect(matchTirtha('Shri Kashi Vishwanath', TIRTHA_MATCH_TOKENS)).toBe('vishwanath');
  });
  test('no match returns null', () => {
    expect(matchTirtha('Local Community Hall', TIRTHA_MATCH_TOKENS)).toBeNull();
    expect(matchTirtha('', TIRTHA_MATCH_TOKENS)).toBeNull();
  });
  test('normalize strips noise', () => {
    expect(normalizeTempleName('Shri Somnath!')).toBe('shrisomnath');
  });
});

describe('collections', () => {
  test('12 jyotirlingas in canonical order', () => {
    expect(JYOTIRLINGA_ORDER).toHaveLength(12);
    expect(JYOTIRLINGA_ORDER[0]).toBe('somnath');
    expect(new Set(JYOTIRLINGA_ORDER).size).toBe(12);
  });
  test('char dham has 4', () => {
    expect(CHARDHAM_ORDER).toHaveLength(4);
  });
  test('shakti peethas defined', () => {
    expect(SHAKTI_PEETHA_ORDER.length).toBeGreaterThanOrEqual(8);
  });
  test('kedarnath is in both jyotirlinga and chardham', () => {
    expect(collectionsForTirtha('kedarnath')).toEqual(
      expect.arrayContaining(['jyotirlinga', 'chardham']),
    );
  });
  test('tirthaNames falls back to id', () => {
    expect(tirthaNames('somnath').en).toBe('Somnath');
    expect(tirthaNames('unknown-xyz').en).toBe('unknown-xyz');
  });
  test('stopDisplayName uses curated names when matched', () => {
    expect(stopDisplayName('whatever', 'somnath').en).toBe('Somnath');
    expect(stopDisplayName('My Local Mandir', undefined).en).toBe('My Local Mandir');
  });
  test('YATRA_COLLECTIONS has 3 circuits', () => {
    expect(YATRA_COLLECTIONS.map((c) => c.id)).toEqual(['jyotirlinga', 'chardham', 'shaktipeetha']);
  });
});

describe('buildYatra', () => {
  const streams = [
    live('Rameshwaram Temple'),
    live('Somnath Temple'),
    live('My Local Mandir'),
    live('Kedarnath Dham'),
  ];
  test('orders by canonical order within a collection', () => {
    const stops = buildYatra(streams, 'jyotirlinga');
    const ids = stops.map((s) => s.tirthaId);
    // somnath (idx 0) before kedarnath (idx 4) before rameshwaram (idx 10)
    expect(ids.indexOf('somnath')).toBeLessThan(ids.indexOf('kedarnath'));
    expect(ids.indexOf('kedarnath')).toBeLessThan(ids.indexOf('rameshwaram'));
    // unmatched temple goes last
    expect(ids[ids.length - 1]).toBeUndefined();
  });
  test('no collection: newest stream first', () => {
    const s = buildYatra([
      live('Old Temple', { startedAt: 100 }),
      live('New Temple', { startedAt: 500 }),
    ]);
    expect(s[0].templeName).toBe('New Temple');
  });
  test('displayName falls back gracefully', () => {
    const stops = buildYatra([live('My Local Mandir')]);
    expect(stops[0].displayName.en).toBe('My Local Mandir');
    expect(stops[0].collectionIds).toEqual([]);
  });
  test('empty input is safe', () => {
    expect(buildYatra([])).toEqual([]);
  });
});

describe('liveCollections', () => {
  test('counts live stops per collection', () => {
    const stops = buildYatra([live('Somnath'), live('Kedarnath'), live('Badrinath')]);
    const cols = liveCollections(stops);
    expect(cols).toEqual(expect.arrayContaining(['jyotirlinga', 'chardham']));
    // Distinct counts order deterministically
    const stops2 = buildYatra([live('Somnath'), live('Rameshwaram'), live('Badrinath')]);
    expect(liveCollections(stops2)[0]).toBe('jyotirlinga'); // 2 vs 1
  });
  test('empty when nothing matched', () => {
    expect(liveCollections(buildYatra([live('Random Hall')]))).toEqual([]);
  });
});

describe('stopCounterText', () => {
  test('formats in 3 languages', () => {
    expect(stopCounterText(0, 7, 'en')).toBe('Stop 1 of 7');
    expect(stopCounterText(2, 7, 'hi')).toBe('पड़ाव 3 / 7');
    expect(stopCounterText(2, 7, 'bn')).toBe('থামা 3 / 7');
  });
});

describe('festival mode', () => {
  const fake = (nameEn: string, date: string) => ({
    date,
    nameEn,
    nameBn: nameEn,
    significanceEn: '',
    significanceBn: '',
    category: 'festival' as const,
    variant: 'both' as const,
    regions: [],
    confidence: 'verified' as const,
  });
  test('detects festival in window', () => {
    const diwali = fake('Diwali', '2026-11-08');
    const now = new Date('2026-11-07T12:00:00').getTime();
    expect(activeYatraFestivals(now, [diwali])).toHaveLength(1);
  });
  test('outside window: none', () => {
    const diwali = fake('Diwali', '2026-11-08');
    const now = new Date('2026-11-20T12:00:00').getTime();
    expect(activeYatraFestivals(now, [diwali])).toHaveLength(0);
  });
  test('non-yatra festivals ignored', () => {
    const pongal = fake('Pongal', '2026-11-07');
    const now = new Date('2026-11-07T12:00:00').getTime();
    expect(activeYatraFestivals(now, [pongal])).toHaveLength(0);
  });
  test('festival header copy', () => {
    const diwali = fake('Diwali', '2026-11-08');
    expect(festivalYatraHeader(diwali, 8, 'en')).toBe('🪔 Diwali Darshan Yatra — 8 temples live 🙏');
    expect(festivalYatraHeader(diwali, 1, 'en')).toBe('🪔 Diwali Darshan Yatra — 1 temple live 🙏');
    expect(festivalYatraHeader(diwali, 8, 'hi')).toContain('दर्शन यात्रा');
    expect(festivalYatraHeader(diwali, 8, 'bn')).toContain('দর্শন যাত্রা');
  });
});
