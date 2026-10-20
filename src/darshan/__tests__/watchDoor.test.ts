/**
 * darshan/__tests__/watchDoor.test.ts — the org page's live watch door.
 * =====================================================================
 * Audit 2026-10-20, offense #7: OrgPublicPage ran the live-detection
 * poller (devotees even received "temple is live" notifications) but the
 * page had NO watch door. These tests pin both halves of the repair:
 *  1. watchDoorTarget() — pure: a door exists only for a definitively
 *     live org WITH a playable videoId; never guess, never open an
 *     empty viewer.
 *  2. Wiring (fs-scan, house pattern): the org page mounts
 *     OrgLiveWatchDoor INSTEAD of the null-render poller (one loop,
 *     never two — quota + duplicate notifications), and the feed's
 *     LiveAartiCard opens DarshanViewer in-app instead of ejecting the
 *     devotee to a new browser tab.
 */
import * as fs from 'fs';
import * as path from 'path';
import { watchDoorTarget } from '../pure';
import type { OrgLiveStatus } from '../types';

const SRC = path.resolve(__dirname, '..', '..');
const src = (rel: string): string => fs.readFileSync(path.join(SRC, rel), 'utf8');

const NOW = 1_700_000_000_000;
const live = (over: Partial<OrgLiveStatus> = {}): OrgLiveStatus => ({
  orgId: 'org_abc',
  isLive: true,
  videoId: 'dQw4w9WgXcQ',
  title: 'Evening Aarti',
  updatedAt: NOW,
  nextPollAfter: NOW + 900_000,
  ...over,
});

describe('watchDoorTarget — a door only for a playable live stream', () => {
  it('returns null when there is no status yet', () => {
    expect(watchDoorTarget(null)).toBeNull();
    expect(watchDoorTarget(undefined)).toBeNull();
  });

  it('returns null when the org is not live', () => {
    expect(watchDoorTarget(live({ isLive: false }))).toBeNull();
  });

  it('returns null when live but the videoId is missing', () => {
    expect(watchDoorTarget(live({ videoId: undefined }))).toBeNull();
  });

  it('returns null when the videoId is blank whitespace', () => {
    expect(watchDoorTarget(live({ videoId: '   ' }))).toBeNull();
  });

  it('returns the videoId and stream title when definitively live', () => {
    expect(watchDoorTarget(live())).toEqual({ videoId: 'dQw4w9WgXcQ', title: 'Evening Aarti' });
  });

  it('title is optional — a live stream without one still gets a door', () => {
    expect(watchDoorTarget(live({ title: undefined }))).toEqual({
      videoId: 'dQw4w9WgXcQ',
      title: undefined,
    });
  });
});

describe('org page wiring — one poller, with a visible door', () => {
  const page = () => src('pages/OrgPublicPage.tsx');

  it('mounts OrgLiveWatchDoor', () => {
    expect(page()).toContain('<OrgLiveWatchDoor');
    expect(page()).toContain("import { OrgLiveWatchDoor } from '../darshan';");
  });

  it('no longer mounts the null-render OrgLivePoller (never two loops)', () => {
    expect(page()).not.toContain('<OrgLivePoller');
  });

  it('the watch door runs the same poller hook and opens DarshanViewer', () => {
    const door = src('darshan/OrgLiveWatchDoor.tsx');
    expect(door).toContain('useLivePoller');
    expect(door).toContain('<DarshanViewer');
  });

  it('the darshan barrel exports the watch door', () => {
    expect(src('darshan/index.ts')).toContain("export { OrgLiveWatchDoor } from './OrgLiveWatchDoor';");
  });
});

describe('feed live-aarti card — in-app, never a tab ejection', () => {
  const feed = () => src('sangam/FeedTab.tsx');

  it('no longer window.opens a YouTube embed', () => {
    expect(feed()).not.toMatch(/window\.open\(`https:\/\/www\.youtube-nocookie\.com\/embed/);
  });

  it('opens DarshanViewer in-app for the tapped aarti', () => {
    expect(feed()).toContain("import { DarshanViewer } from '../darshan/DarshanViewer';");
    expect(feed()).toContain('onWatch={() => setWatchAarti(');
    expect(feed()).toContain('<DarshanViewer');
  });
});
