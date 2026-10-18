/**
 * sangam/watch/__tests__/watch.test.ts — Sangam Watch pure-logic tests.
 * ============================================================================
 * Covers: YouTube URL parsing, share validation, sanitization, thumbnail/
 * embed URL derivation. Firestore service functions are integration-tested
 * against the emulator elsewhere; these assert the pure contract.
 */
import {
  extractYoutubeId,
  isShareableYoutubeUrl,
  nocookieWatchEmbed,
  youtubeThumbnail,
  validateShare,
  sanitizeVideo,
  type WatchVideoCategory,
} from '../types';

describe('extractYoutubeId', () => {
  it('parses youtube.com/watch URLs', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses watch URLs with extra params', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=abc')).toBe('dQw4w9WgXcQ');
  });
  it('parses youtu.be short links', () => {
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses /shorts/ URLs', () => {
    expect(extractYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses /embed/ URLs', () => {
    expect(extractYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses /live/ URLs', () => {
    expect(extractYoutubeId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('rejects channel URLs', () => {
    expect(extractYoutubeId('https://www.youtube.com/channel/UCabcd')).toBeNull();
  });
  it('rejects playlist URLs without a video', () => {
    expect(extractYoutubeId('https://www.youtube.com/playlist?list=PLabc')).toBeNull();
  });
  it('rejects non-YouTube hosts', () => {
    expect(extractYoutubeId('https://vimeo.com/12345')).toBeNull();
  });
  it('rejects empty/garbage input', () => {
    expect(extractYoutubeId('')).toBeNull();
    expect(extractYoutubeId('not a url')).toBeNull();
    expect(extractYoutubeId(null as unknown as string)).toBeNull();
  });
  it('rejects malformed video ids', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=short')).toBeNull();
  });
});

describe('isShareableYoutubeUrl', () => {
  it('accepts valid video URLs', () => {
    expect(isShareableYoutubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });
  it('rejects non-video URLs', () => {
    expect(isShareableYoutubeUrl('https://www.youtube.com/@SomeChannel')).toBe(false);
  });
});

describe('nocookieWatchEmbed', () => {
  it('builds a privacy-hardened embed URL', () => {
    const url = nocookieWatchEmbed('dQw4w9WgXcQ');
    expect(url).toContain('youtube-nocookie.com');
    expect(url).toContain('dQw4w9WgXcQ');
    expect(url).not.toContain('youtube.com/watch');
  });
});

describe('youtubeThumbnail', () => {
  it('derives the thumbnail without an API call', () => {
    expect(youtubeThumbnail('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});

describe('validateShare', () => {
  it('rejects a missing video id', () => {
    expect(validateShare({ youtubeId: null, title: 'Bhajan' })).toBe('invalid_url');
  });
  it('rejects an empty title', () => {
    expect(validateShare({ youtubeId: 'dQw4w9WgXcQ', title: '   ' })).toBe('title_required');
  });
  it('rejects an over-long title', () => {
    expect(validateShare({ youtubeId: 'dQw4w9WgXcQ', title: 'x'.repeat(121) })).toBe('title_too_long');
  });
  it('rejects an over-long caption', () => {
    expect(validateShare({ youtubeId: 'dQw4w9WgXcQ', title: 'Ok', caption: 'x'.repeat(501) })).toBe('caption_too_long');
  });
  it('accepts a valid share', () => {
    expect(validateShare({ youtubeId: 'dQw4w9WgXcQ', title: 'Morning bhajan' })).toBeNull();
  });
  it('accepts a share with caption at the limit', () => {
    expect(validateShare({ youtubeId: 'dQw4w9WgXcQ', title: 'Ok', caption: 'x'.repeat(500) })).toBeNull();
  });
});

describe('sanitizeVideo', () => {
  const base = {
    youtubeId: 'dQw4w9WgXcQ',
    title: '  Morning Aarti  ',
    caption: '  Beautiful  ',
    sharedBy: 'uid123',
    sharedByName: '  Adesh  ',
    category: 'shared' as WatchVideoCategory,
  };
  it('trims and bounds fields', () => {
    const s = sanitizeVideo(base);
    expect(s.title).toBe('Morning Aarti');
    expect(s.caption).toBe('Beautiful');
    expect(s.sharedByName).toBe('Adesh');
  });
  it('drops empty captions', () => {
    const s = sanitizeVideo({ ...base, caption: '   ' });
    expect(s.caption).toBeUndefined();
  });
  it('carries seva_demo provider fields', () => {
    const s = sanitizeVideo({ ...base, category: 'seva_demo', providerUid: 'p1', providerTier: 'VERIFIED' });
    expect(s.providerUid).toBe('p1');
    expect(s.providerTier).toBe('VERIFIED');
  });
  it('clamps over-long titles', () => {
    const s = sanitizeVideo({ ...base, title: 'x'.repeat(500) });
    expect(s.title.length).toBeLessThanOrEqual(120);
  });
});
