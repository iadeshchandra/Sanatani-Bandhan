import {
  buildPlatformNoticeDoc,
  isNoticeLive,
  pickNewPlatformNotices,
  platformNoticeKey,
  validatePlatformNoticeInput,
  PLATFORM_NOTICE_BODY_MAX,
  PLATFORM_NOTICE_TITLE_MAX,
  type PlatformNoticeLike,
} from '../platformNotices';

/**
 * platformNotices.test.ts — NOTIFICATION WAVE 4 proofs (pure picker).
 * The brief's real-world test, at unit level: an admin posts
 * "Maintenance on Sunday, 6–8 am" and every user who opens the app
 * that week sees it once — never again, and never after it expires.
 */

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const notice = (over: Partial<PlatformNoticeLike> = {}): PlatformNoticeLike => ({
  id: 'n-1',
  title: 'Maintenance on Sunday, 6–8 am',
  body: 'Sanatani Bandhan will be briefly unavailable while we tend the servers.',
  kind: 'info',
  createdAt: NOW - HOUR,
  expiresAt: 0,
  active: true,
  ...over,
});

describe('isNoticeLive', () => {
  it('an active notice with no expiry is live', () => {
    expect(isNoticeLive(notice(), NOW)).toBe(true);
  });

  it('a switched-off notice is not live', () => {
    expect(isNoticeLive(notice({ active: false }), NOW)).toBe(false);
  });

  it('a non-true active value is inert (the rules carry no is-bool check — receivers gate exactly)', () => {
    expect(isNoticeLive(notice({ active: 'yes' as unknown as boolean }), NOW)).toBe(false);
  });

  it('expiry is exclusive: live before, dead at and after expiresAt', () => {
    const n = notice({ expiresAt: NOW + DAY });
    expect(isNoticeLive(n, NOW)).toBe(true);
    expect(isNoticeLive(n, NOW + DAY - 1)).toBe(true);
    expect(isNoticeLive(n, NOW + DAY)).toBe(false);
    expect(isNoticeLive(n, NOW + 2 * DAY)).toBe(false);
  });
});

describe('pickNewPlatformNotices', () => {
  it('a fresh live notice rings once, under the platform:<id> dedupe key', () => {
    const r = pickNewPlatformNotices([notice()], new Set(), NOW);
    expect(r.notices.map((p) => p.dedupeKey)).toEqual(['platform:n-1']);
    expect(platformNoticeKey('n-1')).toBe('platform:n-1');
    expect(r.settled).toEqual(['n-1']);
  });

  it('a seen notice never rings again — but stays settled', () => {
    const r = pickNewPlatformNotices([notice()], new Set(['n-1']), NOW);
    expect(r.notices).toEqual([]);
    expect(r.settled).toEqual(['n-1']);
  });

  it('an expired maintenance notice never rings late', () => {
    const stale = notice({ id: 'n-old', createdAt: NOW - 3 * DAY, expiresAt: NOW - DAY });
    const r = pickNewPlatformNotices([stale], new Set(), NOW);
    expect(r.notices).toEqual([]);
    expect(r.settled).toEqual([]); // not live — nothing to settle
  });

  it('a deactivated notice does not ring', () => {
    const r = pickNewPlatformNotices([notice({ active: false })], new Set(), NOW);
    expect(r.notices).toEqual([]);
  });

  it('several notices ring oldest first (the platform news in published order)', () => {
    const a = notice({ id: 'n-a', createdAt: NOW - 2 * HOUR });
    const b = notice({ id: 'n-b', createdAt: NOW - HOUR });
    const r = pickNewPlatformNotices([b, a], new Set(), NOW);
    expect(r.notices.map((p) => p.notice.id)).toEqual(['n-a', 'n-b']);
  });

  it('the week-long maintenance story: seen on first open, silent all week after', () => {
    const maintenance = notice({ expiresAt: NOW + 7 * DAY });
    const seen = new Set<string>();
    const first = pickNewPlatformNotices([maintenance], seen, NOW);
    expect(first.notices.length).toBe(1);
    for (const id of first.settled) seen.add(id);
    for (let d = 1; d <= 6; d++) {
      const again = pickNewPlatformNotices([maintenance], seen, NOW + d * DAY);
      expect(again.notices).toEqual([]);
    }
    // …and after the window closes it could not ring even for a new device pass.
    const late = pickNewPlatformNotices([maintenance], new Set(), NOW + 8 * DAY);
    expect(late.notices).toEqual([]);
  });
});

describe('validatePlatformNoticeInput + buildPlatformNoticeDoc', () => {
  it('accepts a headline-only notice and both kinds', () => {
    expect(validatePlatformNoticeInput({ title: 'New version is here', kind: 'info' })).toBeNull();
    expect(validatePlatformNoticeInput({ title: 'Policy update', body: 'Details…', kind: 'important' })).toBeNull();
  });

  it('rejects empty / over-long fields and a bad kind with stable codes', () => {
    expect(validatePlatformNoticeInput({ title: '  ', kind: 'info' })).toBe('title_required');
    expect(validatePlatformNoticeInput({ title: 'x'.repeat(PLATFORM_NOTICE_TITLE_MAX + 1), kind: 'info' })).toBe(
      'title_too_long',
    );
    expect(validatePlatformNoticeInput({ title: 'ok', body: 'x'.repeat(PLATFORM_NOTICE_BODY_MAX + 1), kind: 'info' })).toBe(
      'body_too_long',
    );
    expect(validatePlatformNoticeInput({ title: 'ok', kind: 'urgent' })).toBe('kind_invalid');
  });

  it('builds the exact rules-pinned doc — six keys, trimmed, active true', () => {
    const doc = buildPlatformNoticeDoc({
      title: '  Maintenance on Sunday, 6–8 am  ',
      body: '  Brief downtime. ',
      kind: 'important',
      createdAt: NOW,
      expiresAt: NOW + 7 * DAY,
    });
    expect(Object.keys(doc).sort()).toEqual(
      ['active', 'body', 'createdAt', 'expiresAt', 'kind', 'title'].sort(),
    );
    expect(doc.title).toBe('Maintenance on Sunday, 6–8 am');
    expect(doc.body).toBe('Brief downtime.');
    expect(doc.active).toBe(true);
    expect(() =>
      buildPlatformNoticeDoc({ title: '', kind: 'info', createdAt: NOW, expiresAt: 0 }),
    ).toThrow(/title_required/);
  });
});
