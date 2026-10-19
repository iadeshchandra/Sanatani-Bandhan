/**
 * notifications/__tests__/socialNotify.test.ts — Step 6: social notifications.
 * ============================================================================
 * Tests the pure, testable core:
 *   - SocialBatcher: window expiry, duplicate suppression, per-target split
 *   - summarizeActors: trilingual name formatting
 *   - Routing: social events are GENTLE (never ping, never break quiet hours)
 */
import {
  SocialBatcher,
  summarizeActors,
  SOCIAL_BATCH_WINDOW_MS,
  type SocialArrival,
} from '../socialBatcher';
import { decideRouting } from '../engine';
import { DEFAULT_PREFS } from '../preferences';
import type { NotifyEvent } from '../types';

const arrival = (over: Partial<SocialArrival> = {}): SocialArrival => ({
  kind: 'ashirvad',
  targetId: 'post_1',
  targetLabel: 'your post',
  actorUid: 'uid_a',
  actorName: 'Meera',
  at: 1_000_000,
  ...over,
});

describe('summarizeActors', () => {
  it('single name passes through', () => {
    expect(summarizeActors(['Meera'], 'en')).toBe('Meera');
    expect(summarizeActors(['মীরা'], 'bn')).toBe('মীরা');
  });
  it('2-3 names join with commas', () => {
    expect(summarizeActors(['Meera', 'Arjun'], 'en')).toBe('Meera, Arjun');
    expect(summarizeActors(['Meera', 'Arjun', 'Priya'], 'en')).toBe('Meera, Arjun, Priya');
  });
  it('4+ names collapse to first + count (localized)', () => {
    expect(summarizeActors(['Meera', 'Arjun', 'Priya', 'Ravi'], 'en')).toBe(
      'Meera and 3 other devotees',
    );
    expect(summarizeActors(['মীরা', 'অর্জুন', 'প্রিয়া', 'রবি'], 'bn')).toBe(
      'মীরা এবং আরও 3 জন ভক্ত',
    );
    expect(summarizeActors(['मीरा', 'अर्जुन', 'प्रिया', 'रवि'], 'hi')).toBe(
      'मीरा और 3 अन्य भक्त',
    );
  });
  it('dedupes repeated names', () => {
    expect(summarizeActors(['Meera', 'Meera'], 'en')).toBe('Meera');
  });
  it('empty list falls back gracefully', () => {
    expect(summarizeActors([], 'en')).toBe('A devotee');
    expect(summarizeActors([], 'bn')).toBe('একজন ভক্ত');
    expect(summarizeActors([], 'hi')).toBe('एक भक्त');
  });
});

describe('SocialBatcher', () => {
  it('emits nothing before the window expires', () => {
    const b = new SocialBatcher();
    b.collect(arrival());
    expect(b.flushReady(1_000_000 + SOCIAL_BATCH_WINDOW_MS - 1)).toHaveLength(0);
    expect(b.pendingBatches).toBe(1);
  });
  it('emits one summary per target after the window', () => {
    const b = new SocialBatcher();
    b.collect(arrival({ actorUid: 'uid_a', actorName: 'Meera' }));
    b.collect(arrival({ actorUid: 'uid_b', actorName: 'Arjun', at: 1_000_001 }));
    const out = b.flushReady(1_000_000 + SOCIAL_BATCH_WINDOW_MS);
    expect(out).toHaveLength(1);
    expect(out[0].actors).toHaveLength(2);
    expect(out[0].dedupeKey).toBe('social:ashirvad:post_1:1000000');
    // Flushed batches are removed — no double emit.
    expect(b.flushReady(1_000_000 + SOCIAL_BATCH_WINDOW_MS + 1)).toHaveLength(0);
  });
  it('same actor twice in one window counts once', () => {
    const b = new SocialBatcher();
    b.collect(arrival({ actorUid: 'uid_a' }));
    b.collect(arrival({ actorUid: 'uid_a', at: 1_000_005 }));
    const out = b.flushReady(1_000_000 + SOCIAL_BATCH_WINDOW_MS);
    expect(out[0].actors).toHaveLength(1);
  });
  it('different targets batch separately', () => {
    const b = new SocialBatcher();
    b.collect(arrival({ targetId: 'post_1' }));
    b.collect(arrival({ targetId: 'post_2' }));
    b.collect(arrival({ kind: 'rsvp', targetId: 'event_9', targetLabel: 'Diwali Katha' }));
    const out = b.flushReady(1_000_000 + SOCIAL_BATCH_WINDOW_MS);
    expect(out).toHaveLength(3);
    const rsvp = out.find((s) => s.kind === 'rsvp');
    expect(rsvp?.targetLabel).toBe('Diwali Katha');
    expect(rsvp?.dedupeKey).toBe('social:rsvp:event_9:1000000');
  });
  it('dedupeKey is stable per batch window', () => {
    const b = new SocialBatcher();
    b.collect(arrival({ at: 5_000_000 }));
    const out = b.flushReady(5_000_000 + SOCIAL_BATCH_WINDOW_MS);
    expect(out[0].dedupeKey).toContain('5000000');
  });
});

describe('social routing (quiet-hours safety)', () => {
  const socialEvent = (kind: NotifyEvent['kind'] = 'social'): NotifyEvent => ({
    kind,
    priority: 'gentle',
    title: { en: 't', bn: 't', hi: 't' },
    body: { en: 'b', bn: 'b', hi: 'b' },
    dedupeKey: 'social:test:1',
  });

  it('gentle social never pings (daytime)', () => {
    const noon = new Date('2026-10-19T12:00:00+06:00').getTime();
    const d = decideRouting(socialEvent(), DEFAULT_PREFS, noon);
    expect(d.ping).toBe(false);
    expect(d.persistent).toBe(false);
    expect(d.inApp).toBe(true);
  });
  it('gentle social never pings (deep quiet hours)', () => {
    // 3 AM — inside the default 22:00–06:00 quiet window.
    const night = new Date('2026-10-19T03:00:00+06:00').getTime();
    const d = decideRouting(socialEvent(), DEFAULT_PREFS, night);
    expect(d.ping).toBe(false);
    expect(d.holdUntil).toBeNull();
    expect(d.inApp).toBe(true);
  });
  it('gentle social is a digest candidate (batched, calm)', () => {
    const noon = new Date('2026-10-19T12:00:00+06:00').getTime();
    const d = decideRouting(socialEvent(), DEFAULT_PREFS, noon);
    expect(d.digestCandidate).toBe(true);
  });
});
