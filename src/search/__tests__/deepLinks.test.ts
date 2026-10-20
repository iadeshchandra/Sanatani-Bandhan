/**
 * search/__tests__/deepLinks.test.ts — Sangam deep-link contract (audit #5).
 * ============================================================================
 * Universal Search used to emit /app/sangam?post=… and /app/sangam/watch?… —
 * routes that never existed, so taps silently landed on My Space. These
 * tests pin BOTH sides of the contract: the paths searchService emits
 * (builders in ../deepLinks) and the params SangamView parses back
 * (parseSangamDeepLink), plus the route the shell actually serves.
 */
import {
  sangamPostPath,
  sangamVideoPath,
  parseSangamDeepLink,
} from '../deepLinks';
import { isValidDeepLink } from '../../notifications/__tests__/deepLinks.test';

/** Split a built path the way the router would. */
const split = (path: string): { pathname: string; search: string } => {
  const i = path.indexOf('?');
  return i < 0
    ? { pathname: path, search: '' }
    : { pathname: path.slice(0, i), search: path.slice(i) };
};

describe('sangam deep-link builders', () => {
  test('post path lands on the Sangam sub-tab with ?post=', () => {
    expect(sangamPostPath('post_abc123')).toBe('/app/home/sangam?post=post_abc123');
  });

  test('video path lands on the Sangam sub-tab with ?video=', () => {
    expect(sangamVideoPath('vid_xyz789')).toBe('/app/home/sangam?video=vid_xyz789');
  });

  test('ids are URI-encoded', () => {
    expect(sangamPostPath('a b/c')).toBe('/app/home/sangam?post=a%20b%2Fc');
    expect(sangamVideoPath('v?id=1')).toBe('/app/home/sangam?video=v%3Fid%3D1');
  });

  test('built paths resolve to real routes (notification route contract)', () => {
    expect(isValidDeepLink(sangamPostPath('post_abc123'))).toBe(true);
    expect(isValidDeepLink(sangamVideoPath('vid_abc123'))).toBe(true);
  });

  test('built paths never use the old dead formats', () => {
    expect(sangamPostPath('x')).not.toMatch(/^\/app\/sangam/);
    expect(sangamVideoPath('x')).not.toMatch(/^\/app\/sangam/);
  });
});

describe('parseSangamDeepLink — the consumer side', () => {
  test('round-trips a post link', () => {
    const { pathname, search } = split(sangamPostPath('post_abc123'));
    expect(parseSangamDeepLink(pathname, search)).toEqual({ postId: 'post_abc123', videoId: undefined });
  });

  test('round-trips a video link', () => {
    const { pathname, search } = split(sangamVideoPath('vid_xyz789'));
    expect(parseSangamDeepLink(pathname, search)).toEqual({ postId: undefined, videoId: 'vid_xyz789' });
  });

  test('decodes URI-encoded ids', () => {
    expect(parseSangamDeepLink('/app/home/sangam', '?post=a%20b%2Fc')).toEqual({ postId: 'a b/c', videoId: undefined });
  });

  test('returns null for the old dead post path', () => {
    expect(parseSangamDeepLink('/app/sangam', '?post=post_abc123')).toBeNull();
  });

  test('returns null for other solo locations', () => {
    expect(parseSangamDeepLink('/app/home', '?post=post_abc123')).toBeNull();
    expect(parseSangamDeepLink('/app/home/wallet', '?post=post_abc123')).toBeNull();
    expect(parseSangamDeepLink('/app/suchana', '')).toBeNull();
  });

  test('returns null when neither param is present', () => {
    expect(parseSangamDeepLink('/app/home/sangam', '')).toBeNull();
    expect(parseSangamDeepLink('/app/home/sangam', '?other=1')).toBeNull();
    expect(parseSangamDeepLink('/app/home/sangam', '?post=')).toBeNull();
  });

  test('ignores unrelated extra params', () => {
    expect(parseSangamDeepLink('/app/home/sangam', '?ref=share&post=p1')).toEqual({ postId: 'p1', videoId: undefined });
  });
});
