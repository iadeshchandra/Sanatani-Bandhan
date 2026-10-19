/**
 * sangam/shorts/__tests__/shorts.test.ts — Shorts unit tests.
 * ============================================================================
 * URL validation, ranking math, and document coercion. All pure, deterministic.
 */
import {
  extractShortId,
  isShortsUrl,
  nocookieShortEmbed,
  shortThumbnail,
  validateShortShare,
  shortDoc,
  toShort,
  type Short,
} from '../types';
import {
  ashirvadVelocityScore,
  shortsEngagementScore,
  scoreShort,
  rankShorts,
  explainShortScore,
  DEFAULT_SHORTS_WEIGHTS,
} from '../shortsRanking';
import { emptyUserSignals } from '../../../ranking/feed';

const HOUR = 3_600_000;
const NOW = 1_700_000_000_000;

function makeShort(over: Partial<Short> = {}): Short {
  return {
    id: 's1',
    youtubeId: 'dQw4w9WgXcQ',
    title: 'Morning aarti',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    authorUid: 'u1',
    authorName: 'Devotee',
    createdAt: NOW - HOUR,
    viewCount: 0,
    ashirvadCount: 0,
    commentCount: 0,
    shareCount: 0,
    reportCount: 0,
    ...over,
  };
}

describe('extractShortId', () => {
  it('parses youtube.com/shorts/ URLs', () => {
    expect(extractShortId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses youtu.be short links', () => {
    expect(extractShortId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses watch URLs (regular videos accepted)', () => {
    expect(extractShortId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses embed URLs', () => {
    expect(extractShortId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('rejects non-YouTube URLs', () => {
    expect(extractShortId('https://vimeo.com/12345678901')).toBeNull();
    expect(extractShortId('https://evil.com/shorts/dQw4w9WgXcQ')).toBeNull();
  });
  it('rejects malformed IDs', () => {
    expect(extractShortId('https://www.youtube.com/shorts/tooshort')).toBeNull();
    expect(extractShortId('https://www.youtube.com/shorts/')).toBeNull();
  });
  it('handles empty/garbage input', () => {
    expect(extractShortId('')).toBeNull();
    expect(extractShortId('not a url')).toBeNull();
    expect(extractShortId(null as unknown as string)).toBeNull();
  });
});

describe('isShortsUrl', () => {
  it('detects canonical shorts URLs', () => {
    expect(isShortsUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
  });
  it('returns false for watch URLs and garbage', () => {
    expect(isShortsUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(isShortsUrl('')).toBe(false);
  });
});

describe('embed + thumbnail helpers', () => {
  it('builds a nocookie embed URL', () => {
    const url = nocookieShortEmbed('dQw4w9WgXcQ');
    expect(url).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(url).toContain('rel=0');
  });
  it('builds a thumbnail URL', () => {
    expect(shortThumbnail('dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });
});

describe('validateShortShare', () => {
  it('accepts a valid submission', () => {
    const v = validateShortShare('https://www.youtube.com/shorts/dQw4w9WgXcQ', 'Morning aarti', 'Peace');
    expect(v.ok).toBe(true);
    expect(v.youtubeId).toBe('dQw4w9WgXcQ');
  });
  it('rejects empty URL', () => {
    expect(validateShortShare('', 'Title').error).toBe('empty');
  });
  it('rejects non-YouTube URLs', () => {
    expect(validateShortShare('https://vimeo.com/123', 'Title').error).toBe('not_youtube');
  });
  it('rejects bad titles', () => {
    expect(validateShortShare('https://youtu.be/dQw4w9WgXcQ', '').error).toBe('bad_title');
    expect(validateShortShare('https://youtu.be/dQw4w9WgXcQ', 'x'.repeat(121)).error).toBe('bad_title');
  });
  it('rejects over-long captions', () => {
    const v = validateShortShare('https://youtu.be/dQw4w9WgXcQ', 'Title', 'x'.repeat(201));
    expect(v.error).toBe('bad_caption');
  });
});

describe('shortDoc + toShort', () => {
  it('builds a doc with zeroed counters', () => {
    const d = shortDoc({
      youtubeId: 'dQw4w9WgXcQ',
      title: '  Morning aarti  ',
      authorUid: 'u1',
      authorName: 'Devotee',
      createdAt: NOW,
    });
    expect(d.title).toBe('Morning aarti');
    expect(d.viewCount).toBe(0);
    expect(d.thumbnailUrl).toContain('dQw4w9WgXcQ');
  });
  it('toShort coerces a Firestore doc', () => {
    const s = toShort('s1', {
      youtubeId: 'dQw4w9WgXcQ',
      title: 'T',
      authorUid: 'u1',
      authorName: 'D',
      createdAt: NOW,
    });
    expect(s?.id).toBe('s1');
    expect(s?.viewCount).toBe(0);
  });
  it('toShort rejects bad docs', () => {
    expect(toShort('s1', { youtubeId: 'bad', authorUid: 'u1' })).toBeNull();
    expect(toShort('s1', { youtubeId: 'dQw4w9WgXcQ' })).toBeNull();
  });
});

describe('shorts ranking', () => {
  it('ashirvadVelocityScore scales with per-hour rate', () => {
    const fast = makeShort({ ashirvadCount: 40, createdAt: NOW - HOUR });
    const slow = makeShort({ ashirvadCount: 40, createdAt: NOW - 10 * HOUR });
    expect(ashirvadVelocityScore(fast, NOW)).toBeGreaterThan(ashirvadVelocityScore(slow, NOW));
  });
  it('ashirvadVelocityScore is 0 with no ashirvads', () => {
    expect(ashirvadVelocityScore(makeShort(), NOW)).toBe(0);
  });
  it('shortsEngagementScore weights comments and shares', () => {
    const a = makeShort({ commentCount: 10 });
    const b = makeShort({ ashirvadCount: 10 });
    expect(shortsEngagementScore(a)).toBeGreaterThan(shortsEngagementScore(b));
  });
  it('scoreShort is 0-1 and deterministic', () => {
    const s = makeShort({ ashirvadCount: 5 });
    const a = scoreShort(s, emptyUserSignals(), DEFAULT_SHORTS_WEIGHTS, NOW);
    const b = scoreShort(s, emptyUserSignals(), DEFAULT_SHORTS_WEIGHTS, NOW);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(1);
  });
  it('rankShorts puts engaging fresh shorts first', () => {
    const old = makeShort({ id: 'old', createdAt: NOW - 48 * HOUR });
    const hot = makeShort({ id: 'hot', createdAt: NOW - HOUR, ashirvadCount: 50 });
    const ranked = rankShorts([old, hot], emptyUserSignals(), DEFAULT_SHORTS_WEIGHTS, NOW);
    expect(ranked[0].short.id).toBe('hot');
  });
  it('rankShorts sinks reported shorts', () => {
    const reported = makeShort({ id: 'r', reportCount: 3, ashirvadCount: 100, createdAt: NOW - HOUR });
    const clean = makeShort({ id: 'c', ashirvadCount: 5, createdAt: NOW - HOUR });
    const ranked = rankShorts([reported, clean], emptyUserSignals(), DEFAULT_SHORTS_WEIGHTS, NOW);
    expect(ranked[ranked.length - 1].short.id).toBe('r');
  });
  it('rankShorts enforces author diversity', () => {
    const shorts = Array.from({ length: 5 }, (_, i) =>
      makeShort({ id: `s${i}`, authorUid: 'same', createdAt: NOW - i * 1000, ashirvadCount: 100 - i }),
    );
    const other = makeShort({ id: 'other', authorUid: 'different', createdAt: NOW - 6000, ashirvadCount: 1 });
    const ranked = rankShorts([...shorts, other], emptyUserSignals(), DEFAULT_SHORTS_WEIGHTS, NOW);
    const topIds = ranked.slice(0, 4).map((r) => r.short.id);
    expect(topIds).toContain('other');
  });
  it('explainShortScore returns a human sentence', () => {
    const s = makeShort({ ashirvadCount: 15 });
    const text = explainShortScore({ short: s, score: 0.8 });
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(10);
  });
});
