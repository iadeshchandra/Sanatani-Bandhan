/**
 * accessReview.test.ts — Blueprint D, deliverable 2: the trustee
 * access review's pure logic. Pinned:
 *   - a sensitive role with no expiry is flagged (the standing risk);
 *   - the workspace CREATOR is never flagged for no-expiry
 *     (ownership is not a grant);
 *   - dormancy needs BOTH an old membership and 90 quiet days —
 *     a member who joined last week is never "dormant";
 *   - an expiry inside 30 days flags 'expiring-soon'; a past expiry
 *     flags 'expired' and the EFFECTIVE role already reads as the
 *     post-expiry fallback (Blueprint B's law), never the grant;
 *   - a sevadar with no expiry is NOT a sensitive-no-expiry flag;
 *   - flagged rows sort first; the quarterly cadence is due only
 *     when the clock is unset or a full interval has passed;
 *   - lastActivityByActor keeps the LATEST event per actor.
 */
import {
  accessReviewClockMark,
  accessReviewClockRead,
  accessReviewDue,
  buildAccessReview,
  lastActivityByActor,
  type AccessReviewMember,
} from '../accessReview';

const NOW = Date.UTC(2026, 9, 22); // 2026-10-22
const DAY = 24 * 60 * 60 * 1000;

const member = (over: Partial<AccessReviewMember>): AccessReviewMember => ({
  id: `WS-1_${over.uid ?? 'u'}`,
  uid: 'u',
  role: 'Sevadar',
  ...over,
});

describe('buildAccessReview highlights', () => {
  it('flags a sensitive role with no expiry', () => {
    const review = buildAccessReview(
      [member({ uid: 'acc', role: 'Accountant', joinedAt: NOW - 200 * DAY })],
      new Map([['acc', NOW - DAY]]),
      NOW,
      'creator'
    );
    expect(review.rows[0].highlights).toContain('sensitive-no-expiry');
    expect(review.counts.sensitiveNoExpiry).toBe(1);
    expect(review.flagged).toHaveLength(1);
  });

  it('never flags the creator for no-expiry', () => {
    const review = buildAccessReview(
      [member({ uid: 'creator', role: 'SuperAdmin', joinedAt: NOW - 400 * DAY })],
      new Map([['creator', NOW - DAY]]),
      NOW,
      'creator'
    );
    expect(review.rows[0].highlights).not.toContain('sensitive-no-expiry');
  });

  it('does not flag a non-sensitive role for no expiry', () => {
    const review = buildAccessReview(
      [member({ uid: 'sev', role: 'Sevadar', joinedAt: NOW - 10 * DAY })],
      new Map([['sev', NOW - DAY]]),
      NOW
    );
    expect(review.rows[0].highlights).toEqual([]);
  });

  it('flags dormancy only for old memberships quiet for 90+ days', () => {
    const old = member({ uid: 'old', role: 'Sevadar', joinedAt: NOW - 300 * DAY });
    const fresh = member({ uid: 'new', role: 'Sevadar', joinedAt: NOW - 5 * DAY });
    const review = buildAccessReview([old, fresh], new Map(), NOW);
    const byUid = new Map(review.rows.map((r) => [r.member.uid, r]));
    expect(byUid.get('old')!.highlights).toContain('dormant');
    expect(byUid.get('new')!.highlights).not.toContain('dormant');
    // recent activity clears dormancy
    const active = buildAccessReview([old], new Map([['old', NOW - 2 * DAY]]), NOW);
    expect(active.rows[0].highlights).not.toContain('dormant');
  });

  it('flags expiring-soon inside 30 days and expired after, with the effective role already fallen back', () => {
    const soon = member({
      uid: 'soon',
      role: 'Accountant',
      roleExpiresAt: NOW + 10 * DAY,
      joinedAt: NOW - 100 * DAY,
    });
    const gone = member({
      uid: 'gone',
      role: 'Accountant',
      roleExpiresAt: NOW - DAY,
      joinedAt: NOW - 100 * DAY,
    });
    const review = buildAccessReview([soon, gone], new Map(), NOW);
    const byUid = new Map(review.rows.map((r) => [r.member.uid, r]));
    expect(byUid.get('soon')!.highlights).toContain('expiring-soon');
    expect(byUid.get('soon')!.daysToExpiry).toBe(10);
    expect(byUid.get('gone')!.highlights).toContain('expired');
    expect(byUid.get('gone')!.effectiveRole).not.toBe('Accountant');
    expect(byUid.get('gone')!.grantedRole).toBe('Accountant');
  });

  it('sorts flagged rows before quiet rows', () => {
    const review = buildAccessReview(
      [
        member({ uid: 'quiet', role: 'Sevadar', joinedAt: NOW - DAY }),
        member({ uid: 'risk', role: 'Trustee', joinedAt: NOW - 300 * DAY }),
      ],
      new Map([
        ['quiet', NOW],
        ['risk', NOW],
      ]),
      NOW
    );
    expect(review.rows[0].member.uid).toBe('risk');
  });
});

describe('activity + cadence', () => {
  it('lastActivityByActor keeps the latest event per actor', () => {
    const map = lastActivityByActor([
      { actorUid: 'a', createdAt: 100 },
      { actorUid: 'a', createdAt: 300 },
      { actorUid: 'a', createdAt: 200 },
      { actorUid: 'b', createdAt: 50 },
      { actorUid: '', createdAt: 999 },
    ]);
    expect(map.get('a')).toBe(300);
    expect(map.get('b')).toBe(50);
    expect(map.has('')).toBe(false);
  });

  it('the quarterly clock: unset is due, fresh is not, a quarter later is due again', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    expect(accessReviewDue('WS-1', NOW, storage)).toBe(true);
    accessReviewClockMark('WS-1', NOW, storage);
    expect(accessReviewClockRead('WS-1', storage)).toBe(NOW);
    expect(accessReviewDue('WS-1', NOW + 30 * DAY, storage)).toBe(false);
    expect(accessReviewDue('WS-1', NOW + 91 * DAY, storage)).toBe(true);
    // another workspace's clock is independent
    expect(accessReviewDue('WS-2', NOW + 30 * DAY, storage)).toBe(true);
  });
});
