/**
 * sangam/stories/__tests__/stories.test.ts
 */
import {
  isStoryLive,
  msUntilExpiry,
  groupStoriesByAuthor,
  validateStory,
  storyDoc,
  toStory,
  backgroundCss,
  storyAge,
  sortStoriesNewest,
  STORY_TTL_MS,
  STORY_TEXT_MAX,
  type Story,
} from '../types';

const NOW = 1_700_000_000_000;

function mkStory(over: Partial<Story> = {}): Story {
  return {
    id: 's1',
    authorUid: 'u1',
    authorName: 'Aarav',
    mediaType: 'text',
    text: 'Shubh prabhat',
    backgroundId: 'saffron',
    createdAt: NOW - 3600_000,
    expiresAt: NOW + 20 * 3600_000,
    reportCount: 0,
    ...over,
  };
}

describe('isStoryLive', () => {
  it('live when expiresAt in future', () => {
    expect(isStoryLive(mkStory(), NOW)).toBe(true);
  });
  it('expired when expiresAt passed', () => {
    expect(isStoryLive(mkStory({ expiresAt: NOW - 1 }), NOW)).toBe(false);
  });
  it('expired at exact boundary', () => {
    expect(isStoryLive(mkStory({ expiresAt: NOW }), NOW)).toBe(false);
  });
});

describe('msUntilExpiry', () => {
  it('positive for live stories', () => {
    expect(msUntilExpiry(mkStory({ expiresAt: NOW + 5000 }), NOW)).toBe(5000);
  });
  it('negative for expired', () => {
    expect(msUntilExpiry(mkStory({ expiresAt: NOW - 5000 }), NOW)).toBe(-5000);
  });
});

describe('groupStoriesByAuthor', () => {
  it('groups by author, excludes expired', () => {
    const stories = [
      mkStory({ id: 'a', authorUid: 'u1', createdAt: NOW - 100 }),
      mkStory({ id: 'b', authorUid: 'u2', authorName: 'Mira', createdAt: NOW - 50 }),
      mkStory({ id: 'c', authorUid: 'u1', createdAt: NOW - 200 }),
      mkStory({ id: 'd', authorUid: 'u3', authorName: 'Old', expiresAt: NOW - 1, createdAt: NOW - 300 }),
    ];
    const groups = groupStoriesByAuthor(stories, NOW);
    expect(groups).toHaveLength(2);
    // Newest group first (u2's story is newest).
    expect(groups[0].authorUid).toBe('u2');
    expect(groups[1].authorUid).toBe('u1');
    expect(groups[1].stories).toHaveLength(2);
    // Newest story first within group.
    expect(groups[1].stories[0].id).toBe('a');
  });
  it('empty input → empty groups', () => {
    expect(groupStoriesByAuthor([], NOW)).toEqual([]);
  });
});

describe('validateStory', () => {
  const base = { authorUid: 'u1', authorName: 'Aarav' };
  it('valid photo story', () => {
    expect(validateStory({ ...base, mediaType: 'photo', mediaUrl: 'vault://abc' })).toBeNull();
  });
  it('photo story without url fails', () => {
    expect(validateStory({ ...base, mediaType: 'photo' })).toBe('photo');
  });
  it('caption too long fails', () => {
    expect(validateStory({ ...base, mediaType: 'photo', mediaUrl: 'vault://a', caption: 'x'.repeat(81) })).toBe('caption');
  });
  it('valid text story', () => {
    expect(validateStory({ ...base, mediaType: 'text', text: 'Jai Shri Ram', backgroundId: 'maroon' })).toBeNull();
  });
  it('empty text fails', () => {
    expect(validateStory({ ...base, mediaType: 'text', text: '  ', backgroundId: 'saffron' })).toBe('text');
  });
  it('text too long fails', () => {
    expect(validateStory({ ...base, mediaType: 'text', text: 'x'.repeat(STORY_TEXT_MAX + 1), backgroundId: 'saffron' })).toBe('text');
  });
  it('bad background fails', () => {
    expect(validateStory({ ...base, mediaType: 'text', text: 'hi', backgroundId: 'nope' as never })).toBe('background');
  });
  it('missing author fails', () => {
    expect(validateStory({ authorUid: '', authorName: '', mediaType: 'text', text: 'hi', backgroundId: 'saffron' })).toBe('author');
  });
});

describe('storyDoc', () => {
  it('sets 24h expiry', () => {
    const d = storyDoc({ authorUid: 'u1', authorName: 'Aarav', mediaType: 'text', text: 'hi', backgroundId: 'saffron' }, NOW);
    expect(d.expiresAt).toBe(NOW + STORY_TTL_MS);
    expect(d.createdAt).toBe(NOW);
    expect(d.reportCount).toBe(0);
  });
  it('trims and bounds fields', () => {
    const d = storyDoc({ authorUid: 'u1', authorName: '  Aarav Kumar Sharma With A Very Long Name That Gets Cut  ', mediaType: 'text', text: '  hi  ', backgroundId: 'saffron' }, NOW);
    expect((d.authorName as string).length).toBeLessThanOrEqual(60);
    expect(d.text).toBe('hi');
  });
  it('photo doc carries mediaUrl + caption', () => {
    const d = storyDoc({ authorUid: 'u1', authorName: 'A', mediaType: 'photo', mediaUrl: 'vault://x', caption: 'morning aarti' }, NOW);
    expect(d.mediaUrl).toBe('vault://x');
    expect(d.caption).toBe('morning aarti');
  });
});

describe('toStory', () => {
  it('sanitizes unknown background to saffron', () => {
    const s = toStory('id1', { authorUid: 'u', authorName: 'A', mediaType: 'text', backgroundId: 'hacker', createdAt: 1, expiresAt: 2 });
    expect(s.backgroundId).toBe('saffron');
  });
  it('defaults mediaType to photo', () => {
    const s = toStory('id1', { authorUid: 'u', authorName: 'A', createdAt: 1, expiresAt: 2 });
    expect(s.mediaType).toBe('photo');
  });
});

describe('backgroundCss', () => {
  it('returns css for known id', () => {
    expect(backgroundCss('maroon')).toContain('linear-gradient');
  });
  it('falls back for unknown', () => {
    expect(backgroundCss(undefined)).toContain('linear-gradient');
  });
});

describe('storyAge', () => {
  it('now for < 1 min', () => { expect(storyAge(NOW - 30_000, NOW)).toBe('now'); });
  it('minutes', () => { expect(storyAge(NOW - 25 * 60_000, NOW)).toBe('25m'); });
  it('hours', () => { expect(storyAge(NOW - 5 * 3600_000, NOW)).toBe('5h'); });
});

describe('sortStoriesNewest (Domain 3 audit fix)', () => {
  it('orders by expiresAt desc, then createdAt desc', () => {
    const a = mkStory({ id: 'a', expiresAt: NOW + 10, createdAt: NOW - 300 });
    const b = mkStory({ id: 'b', expiresAt: NOW + 30, createdAt: NOW - 100 });
    const c = mkStory({ id: 'c', expiresAt: NOW + 30, createdAt: NOW - 50 });
    const sorted = sortStoriesNewest([a, b, c]);
    expect(sorted.map((s) => s.id)).toEqual(['c', 'b', 'a']);
  });
  it('does not mutate the input', () => {
    const list = [mkStory({ id: 'a', expiresAt: NOW + 1 }), mkStory({ id: 'b', expiresAt: NOW + 2 })];
    sortStoriesNewest(list);
    expect(list[0].id).toBe('a');
  });
});
