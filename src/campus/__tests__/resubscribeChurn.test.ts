/**
 * campus/__tests__/resubscribeChurn.test.ts — QUEUED #17 regression guard.
 * =====================================================================
 * The bug (audit 2026-10-19 F-L3): CampusView unsubscribed and
 * re-subscribed its zoneReports listener on a setTimeout loop —
 * every 60s for every viewer (festivalMode is never passed, so the
 * 60s branch of reportRefreshMs always ran). But the subscription is
 * onSnapshot — already realtime — so each re-attach re-billed the
 * ENTIRE result set: 60 × (live reports) wasted Firestore reads per
 * hour per viewer, plus listener churn on low-end phones.
 *
 * The fix: subscribe ONCE per org; expiry freshness (the only thing
 * the timer actually provided, as a side effect) now comes from a
 * render-only local sweep — sweepExpiredReports + reportRefreshMs.
 *
 * These tests pin both halves:
 *  1. Behaviour: one subscription stays one subscription while the
 *     sweep clears expired reports as time advances (mocked firebase,
 *     same CommonJS jest pattern as zoneLoops.test.ts).
 *  2. Wiring: CampusView's source can never regrow the timer loop
 *     (fs source-scan, same pattern as safetyMount.test.ts).
 */

import * as fs from 'fs';
import * as path from 'path';

const mockUnsub = jest.fn();
let snapshotNext: ((snap: unknown) => void) | null = null;
let snapshotError: ((err: unknown) => void) | null = null;

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  onSnapshot: jest.fn((_q: unknown, next: (s: unknown) => void, err: (e: unknown) => void) => {
    snapshotNext = next;
    snapshotError = err;
    return mockUnsub;
  }),
  orderBy: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => ({})),
  setDoc: jest.fn(),
  where: jest.fn(() => ({})),
}));
jest.mock('../../firebase', () => ({ db: {} }));
jest.mock('../../lib/firebase', () => ({ db: {} }));

import { onSnapshot } from 'firebase/firestore';
import {
  subscribeToZoneReports,
  sweepExpiredReports,
  reportRefreshMs,
  type ZoneReport,
} from '../reporting';

const onSnapshotMock = onSnapshot as unknown as jest.Mock;

function report(id: string, expiresAt: number): ZoneReport {
  return {
    id,
    orgId: 'org1',
    zoneId: 'z1',
    zoneName: 'Main Gate',
    type: 'queue_long',
    reportedBy: 'sevadar1',
    reporterName: 'Sevadar',
    createdAt: expiresAt - 60_000,
    expiresAt,
  };
}

function pushSnapshot(reports: ZoneReport[]) {
  snapshotNext?.({ docs: reports.map((r) => ({ data: () => r })) });
}

beforeEach(() => {
  jest.clearAllMocks();
  snapshotNext = null;
  snapshotError = null;
});

describe('stable subscription (the churn fix)', () => {
  it('subscribes exactly once and returns the listener unsubscribe', () => {
    const unsub = subscribeToZoneReports('org1', jest.fn());
    expect(onSnapshotMock).toHaveBeenCalledTimes(1);
    expect(unsub).toBe(mockUnsub);
  });

  it('delivers snapshot reports with already-expired ones filtered out', () => {
    const onReports = jest.fn();
    subscribeToZoneReports('org1', onReports);
    const now = Date.now();
    pushSnapshot([report('live', now + 60_000), report('stale', now - 1_000)]);
    expect(onReports).toHaveBeenCalledTimes(1);
    const delivered = onReports.mock.calls[0][0] as ZoneReport[];
    expect(delivered.map((r) => r.id)).toEqual(['live']);
  });

  it('reports an empty list when the listener errors (never throws)', () => {
    const onReports = jest.fn();
    subscribeToZoneReports('org1', onReports);
    snapshotError?.(new Error('permission-denied'));
    expect(onReports).toHaveBeenCalledWith([]);
  });

  it('a minute of sweep ticks clears expiry while the subscription count stays 1', () => {
    // Simulates CampusView after the fix: one subscription + render-only
    // sweeps on the reportRefreshMs cadence. Before the fix each tick
    // was a teardown + re-subscribe (a fresh full read); now the
    // listener count must remain exactly 1.
    const onReports = jest.fn();
    subscribeToZoneReports('org1', onReports);
    const t0 = Date.now();
    pushSnapshot([report('short', t0 + 30_000), report('long', t0 + 2 * 60 * 60 * 1000)]);
    let current = onReports.mock.calls[0][0] as ZoneReport[];
    expect(current.map((r) => r.id)).toEqual(['short', 'long']);
    // 60 sweep ticks at 60s cadence (an hour of an idle, open map):
    for (let tick = 1; tick <= 60; tick++) {
      current = sweepExpiredReports(current, t0 + tick * reportRefreshMs(false));
    }
    expect(current.map((r) => r.id)).toEqual(['long']);
    expect(onSnapshotMock).toHaveBeenCalledTimes(1);
  });
});

describe('sweepExpiredReports (render-only expiry sweep)', () => {
  const now = 1_000_000;

  it('keeps live reports and drops expired ones', () => {
    const out = sweepExpiredReports(
      [report('a', now + 1), report('b', now - 1), report('c', now + 999_999)],
      now,
    );
    expect(out.map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('treats expiresAt == now as expired (matches isReportLive)', () => {
    expect(sweepExpiredReports([report('edge', now)], now)).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [report('a', now - 5), report('b', now + 5)];
    const out = sweepExpiredReports(input, now);
    expect(input).toHaveLength(2);
    expect(out).not.toBe(input);
  });

  it('handles an empty list', () => {
    expect(sweepExpiredReports([], now)).toEqual([]);
  });
});

describe('reportRefreshMs cadence contract (freshness unchanged)', () => {
  it('normal mode sweeps every 60s, festival mode every 5min', () => {
    expect(reportRefreshMs(false)).toBe(60_000);
    expect(reportRefreshMs(true)).toBe(5 * 60_000);
  });
});

describe('CampusView wiring pins (source scan)', () => {
  const SRC = path.resolve(__dirname, '..', '..');
  const view = fs.readFileSync(path.join(SRC, 'campus/CampusView.tsx'), 'utf8');
  const reporting = fs.readFileSync(path.join(SRC, 'campus/reporting.ts'), 'utf8');

  it('subscribes exactly once, in an effect keyed only by orgId', () => {
    expect(view).toContain('useEffect(() => subscribeToZoneReports(orgId, setReports), [orgId])');
    expect(view.match(/subscribeToZoneReports\(orgId/g)).toHaveLength(1);
  });

  it('never re-subscribes on a timer (the churn loop cannot regrow)', () => {
    expect(view).not.toContain('setTimeout(subscribe');
    expect(view).not.toMatch(/setInterval\([^)]*subscribe/);
  });

  it('keeps the tick for rendering only — a local sweep decoupled from the subscription', () => {
    expect(view).toContain('setInterval(() => setNowMs(Date.now()), reportRefreshMs(festivalMode))');
    expect(view).toContain('sweepExpiredReports(reports, nowMs)');
  });

  it('reporting.ts documents subscribe-once and no longer advises re-subscription throttling', () => {
    expect(reporting).toContain('SUBSCRIBE ONCE per org');
    expect(reporting).not.toContain('throttle re-subscription');
  });
});
