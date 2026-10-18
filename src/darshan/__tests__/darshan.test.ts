/**
 * darshan/__tests__/darshan.test.ts — Live Darshan unit tests.
 * Pure logic only: channel parsing, badge rules, ceremony gates,
 * schedule math, embed URLs. No Firebase, no network.
 */
import { parseChannelInput, hasLinkedChannel, nocookieEmbedUrl } from '../channel';
import { shouldShowLiveBadge, nextAartiText } from '../pure';
import { isPrivateCeremony } from '../types';
import { dt, fill } from '../i18n';

describe('parseChannelInput', () => {
  it('accepts a raw 24-char channel ID', () => {
    const r = parseChannelInput('UCxxxxxxxxxxxxxxxxxxxxxx');
    expect(r.ok).toBe(true);
    expect(r.channelId).toBe('UCxxxxxxxxxxxxxxxxxxxxxx');
    expect(r.kind).toBe('id');
  });

  it('extracts ID from a channel URL', () => {
    const r = parseChannelInput('https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx');
    expect(r.ok).toBe(true);
    expect(r.channelId).toBe('UCxxxxxxxxxxxxxxxxxxxxxx');
    expect(r.kind).toBe('url');
  });

  it('rejects empty input', () => {
    expect(parseChannelInput('').reason).toBe('empty');
    expect(parseChannelInput('   ').ok).toBe(false);
  });

  it('flags @handles as needing API resolution', () => {
    const r = parseChannelInput('@sometemple');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('handle_needs_api');
  });

  it('rejects garbage', () => {
    expect(parseChannelInput('hello world').reason).toBe('unrecognized');
    expect(parseChannelInput('UCshort').ok).toBe(false);
  });

  it('trims whitespace', () => {
    const r = parseChannelInput('  UCxxxxxxxxxxxxxxxxxxxxxx  ');
    expect(r.ok).toBe(true);
  });
});

describe('hasLinkedChannel', () => {
  it('true for valid channel ID', () => {
    expect(hasLinkedChannel({ youtubeChannelId: 'UCxxxxxxxxxxxxxxxxxxxxxx' })).toBe(true);
  });
  it('false for missing/invalid', () => {
    expect(hasLinkedChannel({})).toBe(false);
    expect(hasLinkedChannel(null)).toBe(false);
    expect(hasLinkedChannel({ youtubeChannelId: 'nope' })).toBe(false);
  });
});

describe('nocookieEmbedUrl', () => {
  it('builds a nocookie URL with autoplay', () => {
    const url = nocookieEmbedUrl('abc123');
    expect(url).toContain('youtube-nocookie.com/embed/abc123');
    expect(url).toContain('autoplay=1');
    expect(url).toContain('rel=0');
  });
  it('encodes the video ID', () => {
    expect(nocookieEmbedUrl('a/b')).not.toContain('a/b');
  });
});

describe('shouldShowLiveBadge', () => {
  it('shows only when definitively live', () => {
    expect(shouldShowLiveBadge({ orgId: 'x', isLive: true, updatedAt: 1 })).toBe(true);
    expect(shouldShowLiveBadge({ orgId: 'x', isLive: false, updatedAt: 1 })).toBe(false);
    expect(shouldShowLiveBadge(null)).toBe(false);
    expect(shouldShowLiveBadge(undefined)).toBe(false);
  });
});

describe('isPrivateCeremony', () => {
  it('detects shraddha variants', () => {
    expect(isPrivateCeremony('shraddha')).toBe(true);
    expect(isPrivateCeremony('Shraddha Ceremony')).toBe(true);
    expect(isPrivateCeremony('funeral')).toBe(true);
    expect(isPrivateCeremony('antyesti')).toBe(true);
    expect(isPrivateCeremony('antyeshti-rite')).toBe(true);
  });
  it('passes normal ceremonies', () => {
    expect(isPrivateCeremony('vivah')).toBe(false);
    expect(isPrivateCeremony('puja')).toBe(false);
    expect(isPrivateCeremony(undefined)).toBe(false);
    expect(isPrivateCeremony(null)).toBe(false);
    expect(isPrivateCeremony('')).toBe(false);
  });
});

describe('nextAartiText', () => {
  it('returns null for empty schedule', () => {
    expect(nextAartiText([])).toBe(null);
  });
  it('finds the next aarti today', () => {
    // 10:00 now, aarti at 12:30 → "in 2h 30m"
    const now = new Date(2026, 5, 15, 10, 0, 0);
    const r = nextAartiText([{ name: 'Noon Aarti', time: '12:30' }], now);
    expect(r?.name).toBe('Noon Aarti');
    expect(r?.text).toBe('in 2h 30m');
  });
  it('shows minutes when under an hour', () => {
    const now = new Date(2026, 5, 15, 10, 0, 0);
    const r = nextAartiText([{ name: 'Quick', time: '10:40' }], now);
    expect(r?.text).toBe('in 40m');
  });
  it('skips past times and finds tomorrow', () => {
    const now = new Date(2026, 5, 15, 23, 0, 0); // 11pm
    const r = nextAartiText([{ name: 'Morning Aarti', time: '06:00' }], now);
    expect(r?.text).toContain('tomorrow');
  });
  it('respects day filters', () => {
    // Monday (day 1), schedule only on Sunday (day 0) → 6 days away
    const monday = new Date(2026, 5, 15, 10, 0, 0); // 2026-06-15 is a Monday
    const r = nextAartiText([{ name: 'Sunday Special', time: '09:00', days: [0] }], monday);
    expect(r?.text).toBe('in 6 days at 09:00');
    expect(r).not.toBe(null);
  });
  it('ignores malformed times', () => {
    const now = new Date(2026, 5, 15, 10, 0, 0);
    expect(nextAartiText([{ name: 'Bad', time: 'nope' }], now)).toBe(null);
  });
});

describe('i18n', () => {
  it('returns Bangla strings', () => {
    expect(dt('darshan.live', 'bn')).toContain('লাইভ');
  });
  it('falls back to English', () => {
    expect(dt('darshan.live', 'en')).toContain('Live');
  });
  it('fills placeholders', () => {
    expect(fill('Hello {name}', { name: 'World' })).toBe('Hello World');
  });
  it('keeps missing placeholders visible', () => {
    expect(fill('Hello {name}', {})).toBe('Hello {name}');
  });
});
