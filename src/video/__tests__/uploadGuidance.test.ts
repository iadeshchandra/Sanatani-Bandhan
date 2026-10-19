/**
 * video/__tests__/uploadGuidance.test.ts — gentle video upload guidance tests.
 * ============================================================================
 * Covers: video file detection (MIME + extension), share-target routing,
 * channel URL validation, and local channel preference round-trips.
 */
import {
  isVideoFile,
  resolveShareTarget,
  isPlausibleChannelUrl,
  getRememberedChannelUrl,
  setRememberedChannelUrl,
  clearRememberedChannelUrl,
} from '../uploadGuidance';
import { vg } from '../i18n';

// Minimal localStorage stub for the node test env.
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

describe('isVideoFile', () => {
  it('detects common video MIME types', () => {
    expect(isVideoFile({ type: 'video/mp4', name: 'clip' })).toBe(true);
    expect(isVideoFile({ type: 'video/quicktime', name: 'clip' })).toBe(true);
    expect(isVideoFile({ type: 'video/webm', name: 'clip' })).toBe(true);
    expect(isVideoFile({ type: 'video/x-matroska', name: 'clip' })).toBe(true);
    expect(isVideoFile({ type: 'video/3gpp', name: 'clip' })).toBe(true);
  });

  it('detects video by extension when MIME is missing or generic', () => {
    expect(isVideoFile({ type: '', name: 'aarti.mp4' })).toBe(true);
    expect(isVideoFile({ type: 'application/octet-stream', name: 'kirtan.MOV' })).toBe(true);
    expect(isVideoFile({ name: 'discourse.mkv' })).toBe(true);
    expect(isVideoFile({ name: 'bhajan.avi' })).toBe(true);
    expect(isVideoFile({ name: 'temple.m4v' })).toBe(true);
    expect(isVideoFile({ name: 'yatra.3gp' })).toBe(true);
  });

  it('is case-insensitive for both MIME and extension', () => {
    expect(isVideoFile({ type: 'VIDEO/MP4', name: 'x' })).toBe(true);
    expect(isVideoFile({ name: 'CLIP.MP4' })).toBe(true);
  });

  it('rejects images, documents, and other non-video files', () => {
    expect(isVideoFile({ type: 'image/jpeg', name: 'photo.jpg' })).toBe(false);
    expect(isVideoFile({ type: 'image/png', name: 'photo.png' })).toBe(false);
    expect(isVideoFile({ type: 'image/webp', name: 'photo.webp' })).toBe(false);
    expect(isVideoFile({ type: 'application/pdf', name: 'doc.pdf' })).toBe(false);
    expect(isVideoFile({ type: 'application/json', name: 'backup.json' })).toBe(false);
  });

  it('handles null, undefined, and empty inputs safely', () => {
    expect(isVideoFile(null)).toBe(false);
    expect(isVideoFile(undefined)).toBe(false);
    expect(isVideoFile({})).toBe(false);
    expect(isVideoFile({ type: '', name: '' })).toBe(false);
    expect(isVideoFile({ name: 'noextension' })).toBe(false);
  });

  it('does not confuse image extensions with video', () => {
    // e.g. "mp4" appearing mid-filename must not match
    expect(isVideoFile({ name: 'my-mp4-photo.jpg' })).toBe(false);
  });
});

describe('resolveShareTarget', () => {
  it('routes feed, stories, and watch to Watch', () => {
    expect(resolveShareTarget('feed')).toBe('watch');
    expect(resolveShareTarget('stories')).toBe('watch');
    expect(resolveShareTarget('watch')).toBe('watch');
  });

  it('routes service_card and chat to the caller callback', () => {
    expect(resolveShareTarget('service_card')).toBe('callback');
    expect(resolveShareTarget('chat')).toBe('callback');
  });
});

describe('isPlausibleChannelUrl', () => {
  it('accepts @handle, /c/, /channel/, and /user/ forms', () => {
    expect(isPlausibleChannelUrl('https://www.youtube.com/@mytemple')).toBe(true);
    expect(isPlausibleChannelUrl('youtube.com/@mytemple')).toBe(true);
    expect(isPlausibleChannelUrl('https://youtube.com/c/MyTemple')).toBe(true);
    expect(isPlausibleChannelUrl('https://www.youtube.com/channel/UCabcd1234')).toBe(true);
    expect(isPlausibleChannelUrl('https://www.youtube.com/user/MyTemple')).toBe(true);
  });

  it('rejects video watch URLs, playlists, and non-YouTube hosts', () => {
    expect(isPlausibleChannelUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(isPlausibleChannelUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(false);
    expect(isPlausibleChannelUrl('https://www.youtube.com/')).toBe(false);
    expect(isPlausibleChannelUrl('https://vimeo.com/12345')).toBe(false);
    expect(isPlausibleChannelUrl('not a url at all')).toBe(false);
    expect(isPlausibleChannelUrl('')).toBe(false);
  });
});

describe('remembered channel preference (local only)', () => {
  it('round-trips a valid channel URL', () => {
    setRememberedChannelUrl('https://www.youtube.com/@mytemple');
    expect(getRememberedChannelUrl()).toBe('https://www.youtube.com/@mytemple');
  });

  it('refuses to store invalid URLs', () => {
    setRememberedChannelUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(getRememberedChannelUrl()).toBeNull();
  });

  it('clears the stored URL', () => {
    setRememberedChannelUrl('https://www.youtube.com/@mytemple');
    clearRememberedChannelUrl();
    expect(getRememberedChannelUrl()).toBeNull();
  });

  it('getRememberedChannelUrl ignores corrupt stored values', () => {
    store['sb_video_channel_url'] = 'garbage';
    expect(getRememberedChannelUrl()).toBeNull();
  });
});

describe('vg i18n helper', () => {
  it('returns EN/HI/BN strings and falls back to English', () => {
    expect(vg('vg.title', 'en')).toContain('belongs here');
    expect(vg('vg.title', 'hi')).toBeTruthy();
    expect(vg('vg.title', 'bn')).toBeTruthy();
    expect(vg('vg.title', 'xx' as any)).toContain('belongs here');
  });

  it('returns the key for unknown strings (never crashes UI)', () => {
    expect(vg('vg.does_not_exist', 'en')).toBe('vg.does_not_exist');
  });

  it('never uses blaming language in EN copy', () => {
    const keys = ['vg.title', 'vg.why', 'vg.errInvalidUrl', 'vg.share'];
    for (const k of keys) {
      const s = vg(k, 'en').toLowerCase();
      expect(s).not.toContain("you can't");
      expect(s).not.toContain('not supported');
      expect(s).not.toContain('not allowed');
    }
  });
});
