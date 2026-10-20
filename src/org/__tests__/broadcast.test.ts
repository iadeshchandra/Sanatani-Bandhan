import {
  validateBroadcastInput,
  buildBroadcastDoc,
  normalizeFollowedOrgs,
  toEpochMs,
  pickNotifications,
  buildAnnouncementInput,
  sortBroadcastsNewestFirst,
  chunkOrgIds,
  BROADCAST_TITLE_MAX,
  BROADCAST_BODY_MAX,
  BROADCAST_RECENCY_MS,
  MAX_NOTIFY_PER_CHECK,
  type OrgBroadcast,
} from '../broadcast';

/**
 * broadcast.test.ts — Queued #14 (broadcast fan-out + campaign history).
 * Pure logic: composer validation, the whitelist-exact Firestore doc,
 * followed-org normalization, and the watcher's notify decision
 * (baseline law, recency, follow-time gate, flood cap, seen marking).
 */

const NOW = 1_800_000_000_000; // fixed "now" for deterministic windows
const HOUR = 60 * 60 * 1000;

const broadcast = (over: Partial<OrgBroadcast> = {}): OrgBroadcast => ({
  id: 'b-1',
  orgId: 'org-1',
  orgName: 'Dakshineswar Kali Mandir',
  title: 'Maha Shivaratri abhishek at 6 PM',
  body: '',
  createdBy: 'trustee-1',
  createdByName: 'Trustee',
  audienceCount: 42,
  createdAt: NOW - HOUR,
  ...over,
});

/* ------------------------- validateBroadcastInput ------------------------ */

describe('validateBroadcastInput', () => {
  it('accepts a headline-only broadcast (body optional)', () => {
    expect(validateBroadcastInput({ title: 'Sandhya aarti at 7 PM' })).toBeNull();
    expect(validateBroadcastInput({ title: 'Sandhya aarti at 7 PM', body: 'All are welcome.' })).toBeNull();
  });

  it('rejects empty / whitespace headlines', () => {
    expect(validateBroadcastInput({ title: '' })).toBe('title_required');
    expect(validateBroadcastInput({ title: '   ' })).toBe('title_required');
  });

  it('rejects over-long headline and body', () => {
    expect(validateBroadcastInput({ title: 'x'.repeat(BROADCAST_TITLE_MAX + 1) })).toBe('title_too_long');
    expect(validateBroadcastInput({ title: 'ok', body: 'x'.repeat(BROADCAST_BODY_MAX + 1) })).toBe('body_too_long');
  });
});

/* ---------------------------- buildBroadcastDoc -------------------------- */

describe('buildBroadcastDoc', () => {
  it('builds a whitelist-exact doc — exactly the rules-pinned keys, trimmed', () => {
    const doc = buildBroadcastDoc({
      orgId: 'org-1',
      orgName: 'Dakshineswar Kali Mandir',
      title: '  Abhishek at 6 PM  ',
      body: '  Bring flowers. ',
      createdBy: 'trustee-1',
      createdByName: 'Trustee',
      audienceCount: 42,
      createdAt: NOW,
    });
    expect(Object.keys(doc).sort()).toEqual(
      ['audienceCount', 'body', 'createdAt', 'createdBy', 'createdByName', 'orgId', 'orgName', 'title'].sort(),
    );
    expect(doc.title).toBe('Abhishek at 6 PM');
    expect(doc.body).toBe('Bring flowers.');
    // No undefined values anywhere (Firestore rejects them).
    for (const v of Object.values(doc)) expect(v).not.toBeUndefined();
  });

  it('defaults body to empty string and clamps audienceCount to a non-negative int', () => {
    const doc = buildBroadcastDoc({
      orgId: 'org-1',
      orgName: 'X',
      title: 'Hello',
      createdBy: 't',
      createdByName: '',
      audienceCount: -3.7,
      createdAt: NOW,
    });
    expect(doc.body).toBe('');
    expect(doc.audienceCount).toBe(0);
  });

  it('throws on invalid input', () => {
    expect(() =>
      buildBroadcastDoc({ orgId: 'o', orgName: 'X', title: ' ', createdBy: 't', createdByName: '', audienceCount: 0, createdAt: NOW }),
    ).toThrow(/title_required/);
    expect(() =>
      buildBroadcastDoc({ orgId: '', orgName: 'X', title: 'Hi', createdBy: 't', createdByName: '', audienceCount: 0, createdAt: NOW }),
    ).toThrow(/org_required/);
  });
});

/* ------------------------- normalizeFollowedOrgs ------------------------- */

describe('toEpochMs + normalizeFollowedOrgs', () => {
  it('coerces numbers, Dates, Timestamps and seconds; garbage → 0', () => {
    expect(toEpochMs(1234)).toBe(1234);
    expect(toEpochMs(new Date(5000))).toBe(5000);
    expect(toEpochMs({ toMillis: () => 777 })).toBe(777);
    expect(toEpochMs({ seconds: 9 })).toBe(9000);
    expect(toEpochMs('nope')).toBe(0);
    expect(toEpochMs(null)).toBe(0);
  });

  it('dedupes by org keeping the earliest follow time, drops junk rows', () => {
    const out = normalizeFollowedOrgs([
      { orgId: 'org-1', followedAt: 2000 },
      { orgId: 'org-1', followedAt: 1000 },
      { orgId: 'org-2', followedAt: { toMillis: () => 3000 } },
      { orgId: '', followedAt: 5 },
      { orgId: null, followedAt: 5 },
      {},
    ]);
    expect(out).toEqual([
      { orgId: 'org-1', followedAt: 1000 },
      { orgId: 'org-2', followedAt: 3000 },
    ]);
  });
});

/* ---------------------------- pickNotifications -------------------------- */

describe('pickNotifications', () => {
  const follows = [{ orgId: 'org-1', followedAt: NOW - 24 * HOUR }];

  it('baseline: first check notifies nothing but marks everything seen', () => {
    const b = broadcast();
    const r = pickNotifications({ broadcasts: [b], seen: {}, follows, now: NOW, baseline: true });
    expect(r.notify).toEqual([]);
    expect(r.markSeen).toEqual({ 'b-1': b.createdAt });
  });

  it('notifies a fresh, unseen broadcast from a followed org', () => {
    const r = pickNotifications({ broadcasts: [broadcast()], seen: {}, follows, now: NOW, baseline: false });
    expect(r.notify.map((b) => b.id)).toEqual(['b-1']);
  });

  it('never re-notifies a seen broadcast', () => {
    const b = broadcast();
    const r = pickNotifications({ broadcasts: [b], seen: { 'b-1': b.createdAt }, follows, now: NOW, baseline: false });
    expect(r.notify).toEqual([]);
    expect(r.markSeen['b-1']).toBe(b.createdAt);
  });

  it('skips broadcasts published before the devotee followed the org', () => {
    const old = broadcast({ id: 'b-old', createdAt: NOW - 30 * HOUR }); // followedAt = NOW-24h
    const r = pickNotifications({ broadcasts: [old], seen: {}, follows, now: NOW, baseline: false });
    expect(r.notify).toEqual([]);
  });

  it('skips broadcasts older than the recency window', () => {
    const stale = broadcast({ id: 'b-stale', createdAt: NOW - BROADCAST_RECENCY_MS - HOUR });
    const longFollows = [{ orgId: 'org-1', followedAt: NOW - 90 * 24 * HOUR }];
    const r = pickNotifications({ broadcasts: [stale], seen: {}, follows: longFollows, now: NOW, baseline: false });
    expect(r.notify).toEqual([]);
  });

  it('ignores broadcasts from orgs the devotee does not follow — not even marked seen', () => {
    const other = broadcast({ id: 'b-x', orgId: 'org-9' });
    const r = pickNotifications({ broadcasts: [other], seen: {}, follows, now: NOW, baseline: false });
    expect(r.notify).toEqual([]);
    expect(r.markSeen).toEqual({});
  });

  it('caps bells per check at MAX_NOTIFY_PER_CHECK, oldest first, rest marked seen', () => {
    const many = Array.from({ length: MAX_NOTIFY_PER_CHECK + 3 }, (_, i) =>
      broadcast({ id: `b-${i}`, createdAt: NOW - (MAX_NOTIFY_PER_CHECK + 3 - i) * HOUR }),
    );
    const r = pickNotifications({ broadcasts: many, seen: {}, follows, now: NOW, baseline: false });
    expect(r.notify.length).toBe(MAX_NOTIFY_PER_CHECK);
    expect(r.notify.map((b) => b.id)).toEqual(['b-0', 'b-1', 'b-2']);
    expect(Object.keys(r.markSeen).length).toBe(many.length);
  });
});

/* --------------------------- buildAnnouncementInput ---------------------- */

describe('buildAnnouncementInput', () => {
  it('maps the broadcast; message present only when a body was written', () => {
    expect(buildAnnouncementInput(broadcast({ body: 'Bring flowers.' }))).toEqual({
      orgId: 'org-1',
      orgName: 'Dakshineswar Kali Mandir',
      title: 'Maha Shivaratri abhishek at 6 PM',
      announcementId: 'b-1',
      message: 'Bring flowers.',
    });
    const noBody = buildAnnouncementInput(broadcast({ body: '' }));
    expect('message' in noBody).toBe(false);
    expect(noBody.announcementId).toBe('b-1');
  });
});

/* ------------------------------ history utils ---------------------------- */

describe('history helpers', () => {
  it('sorts newest first without mutating the input', () => {
    const a = broadcast({ id: 'a', createdAt: 100 });
    const b = broadcast({ id: 'b', createdAt: 300 });
    const c = broadcast({ id: 'c', createdAt: 200 });
    const input = [a, b, c];
    expect(sortBroadcastsNewestFirst(input).map((x) => x.id)).toEqual(['b', 'c', 'a']);
    expect(input.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('chunks org ids for `in` queries, deduped, empties dropped', () => {
    const ids = Array.from({ length: 23 }, (_, i) => `org-${i}`);
    const chunks = chunkOrgIds([...ids, 'org-0', '']);
    expect(chunks.map((c) => c.length)).toEqual([10, 10, 3]);
    expect(chunks.flat()).toEqual(ids);
    expect(chunkOrgIds([])).toEqual([]);
  });
});
