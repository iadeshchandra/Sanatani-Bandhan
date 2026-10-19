/**
 * darshan/__tests__/liveLoop.test.ts — live-detection loop unit tests.
 * Pure logic only: API response parsing, transition detection, the
 * rules-compliant doc builder, and quota math. No Firebase, no network.
 */
import { parseLiveSearchResponse } from '../pure';
import {
  buildStatusDoc,
  detectWentLive,
  checksPerDay,
  maxOrgsForQuota,
  ORG_LIVE_STATUS_KEYS,
  POLL_GAP_MS,
} from '../pure';
import type { LiveCheckResult, OrgLiveStatus } from '../types';

interface PollOutcome {
  status: OrgLiveStatus;
  wentLive: boolean;
}

const NOW = 1_700_000_000_000;
const ORG = 'org_abc';
const VID = 'dQw4w9WgXcQ';

const liveCheck = (over: Partial<LiveCheckResult> = {}): LiveCheckResult => ({
  isLive: true,
  videoId: VID,
  title: 'Morning Aarti',
  ...over,
});

const prevLive = (over: Partial<OrgLiveStatus> = {}): OrgLiveStatus => ({
  orgId: ORG,
  isLive: true,
  videoId: VID,
  title: 'Morning Aarti',
  startedAt: NOW - 3_600_000,
  updatedAt: NOW - 400_000,
  nextPollAfter: NOW - 1,
  ...over,
});

/** Every doc the writer produces must satisfy the Firestore rules. */
function expectRulesCompliant(docOut: OrgLiveStatus) {
  const keys = Object.keys(docOut);
  for (const k of keys) {
    expect(ORG_LIVE_STATUS_KEYS as readonly string[]).toContain(k);
    expect((docOut as unknown as Record<string, unknown>)[k]).not.toBeUndefined();
  }
  expect(typeof docOut.isLive).toBe('boolean');
  expect(typeof docOut.updatedAt).toBe('number');
  expect(docOut.orgId).toBe(ORG);
}

describe('parseLiveSearchResponse', () => {
  it('returns videoId and title when live', () => {
    const r = parseLiveSearchResponse({
      items: [{ id: { videoId: VID }, snippet: { title: 'Sandhya Aarti' } }],
    });
    expect(r).toEqual({ isLive: true, videoId: VID, title: 'Sandhya Aarti' });
  });

  it('is live even without a title', () => {
    const r = parseLiveSearchResponse({ items: [{ id: { videoId: VID } }] });
    expect(r.isLive).toBe(true);
    expect(r.videoId).toBe(VID);
    expect(r.title).toBeUndefined();
  });

  it('is not live on empty items', () => {
    expect(parseLiveSearchResponse({ items: [] })).toEqual({ isLive: false });
  });

  it('is not live on null/undefined input', () => {
    expect(parseLiveSearchResponse(null)).toEqual({ isLive: false });
    expect(parseLiveSearchResponse(undefined)).toEqual({ isLive: false });
  });

  it('is not live when the item has no videoId', () => {
    expect(parseLiveSearchResponse({ items: [{ id: {} }] })).toEqual({ isLive: false });
  });
});

describe('detectWentLive', () => {
  it('true on offline → live', () => {
    expect(detectWentLive({ isLive: false }, { isLive: true, videoId: VID })).toBe(true);
  });

  it('true when there was no previous status', () => {
    expect(detectWentLive(null, { isLive: true, videoId: VID })).toBe(true);
  });

  it('false when the same stream continues', () => {
    expect(detectWentLive({ isLive: true, videoId: VID }, { isLive: true, videoId: VID })).toBe(false);
  });

  it('true when the videoId changes (new stream)', () => {
    expect(
      detectWentLive({ isLive: true, videoId: 'old123' }, { isLive: true, videoId: 'new456' }),
    ).toBe(true);
  });

  it('false when going offline', () => {
    expect(detectWentLive({ isLive: true, videoId: VID }, { isLive: false })).toBe(false);
  });

  it('false when staying offline', () => {
    expect(detectWentLive({ isLive: false }, { isLive: false })).toBe(false);
  });
});

describe('buildStatusDoc', () => {
  it('produces a rules-compliant doc on go-live', () => {
    const docOut = buildStatusDoc(ORG, liveCheck(), null, NOW);
    expectRulesCompliant(docOut);
    expect(docOut.isLive).toBe(true);
    expect(docOut.videoId).toBe(VID);
    expect(docOut.title).toBe('Morning Aarti');
    expect(docOut.startedAt).toBe(NOW);
    expect(docOut.nextPollAfter).toBe(NOW + POLL_GAP_MS);
  });

  it('keeps the original startedAt for a continuing stream', () => {
    const prev = prevLive();
    const docOut = buildStatusDoc(ORG, liveCheck(), prev, NOW);
    expectRulesCompliant(docOut);
    expect(docOut.startedAt).toBe(prev.startedAt);
  });

  it('resets startedAt when the videoId changes', () => {
    const docOut = buildStatusDoc(ORG, liveCheck({ videoId: 'new456' }), prevLive(), NOW);
    expect(docOut.startedAt).toBe(NOW);
    expect(docOut.videoId).toBe('new456');
  });

  it('clears video fields when going offline', () => {
    const docOut = buildStatusDoc(ORG, { isLive: false }, prevLive(), NOW);
    expectRulesCompliant(docOut);
    expect(docOut.isLive).toBe(false);
    expect(docOut.videoId).toBeUndefined();
    expect(docOut.startedAt).toBeUndefined();
  });

  it('preserves last-known state when the API result is unknown (no badge flap)', () => {
    const prev = prevLive();
    const docOut = buildStatusDoc(ORG, null, prev, NOW);
    expectRulesCompliant(docOut);
    expect(docOut.isLive).toBe(true);
    expect(docOut.videoId).toBe(VID);
    expect(docOut.startedAt).toBe(prev.startedAt);
  });

  it('unknown API result with no cache stays offline', () => {
    const docOut = buildStatusDoc(ORG, null, null, NOW);
    expectRulesCompliant(docOut);
    expect(docOut.isLive).toBe(false);
  });

  it('never emits serverTimestamp or undefined values', () => {
    const docOut = buildStatusDoc(ORG, liveCheck({ title: undefined }), null, NOW);
    expectRulesCompliant(docOut);
    // JSON round-trip: sentinels/undefined would not survive
    expect(() => JSON.stringify(docOut)).not.toThrow();
    const revived = JSON.parse(JSON.stringify(docOut)) as OrgLiveStatus;
    expect(revived.updatedAt).toBe(NOW);
  });
});

describe('quota math', () => {
  it('15-min gap = 96 checks/day per org', () => {
    expect(checksPerDay(15 * 60 * 1000)).toBe(96);
  });

  it('30-min gap = 48 checks/day per org', () => {
    expect(checksPerDay(30 * 60 * 1000)).toBe(48);
  });

  it('free tier supports 1 org at 15-min intervals', () => {
    expect(maxOrgsForQuota(15 * 60 * 1000)).toBe(1);
  });

  it('free tier supports 2 orgs at 30-min intervals', () => {
    expect(maxOrgsForQuota(30 * 60 * 1000)).toBe(2);
  });

  it('guards against zero/negative gaps', () => {
    expect(checksPerDay(0)).toBe(0);
    expect(maxOrgsForQuota(-1)).toBe(0);
  });
});

describe('PollOutcome contract', () => {
  it('wentLive mirrors detectWentLive on a fresh go-live', () => {
    const docOut = buildStatusDoc(ORG, liveCheck(), null, NOW);
    const wentLive = detectWentLive(null, { isLive: docOut.isLive, videoId: docOut.videoId });
    const outcome: PollOutcome = { status: docOut, wentLive };
    expect(outcome.wentLive).toBe(true);
    expect(outcome.status.videoId).toBe(VID);
  });
});
