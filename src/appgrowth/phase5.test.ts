/**
 * Phase 5 unit tests — App Growth integration polish.
 * ==================================================
 * Pure-logic coverage for the pieces Phase 5 added or changed:
 * - attribution: campaign stash/read, Play referrer param
 * - deviceDetect: in-app-browser edge case (iOS PWA guide)
 * - tr.resolveTri: field-wise fallback for admin content overrides
 *
 * No Firestore, no network, no DOM — hermetic by design.
 */

jest.mock('./growthService', () => ({
  getCampaign: jest.fn(),
  logInstall: jest.fn(() => Promise.resolve()),
}));

import {
  appendPlayReferrer,
  stashCampaign,
  readAttributionCampaign,
  CAMPAIGN_KEY,
} from './attribution';
import { detectPlatform, isInAppBrowser } from './deviceDetect';
import { resolveTri } from './tr';
import type { Tri } from './useAppGrowthConfig';

/* Minimal browser-environment shims for the attribution helpers. */
function mockBrowser() {
  const store = new Map<string, string>();
  (global as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  (global as any).document = { referrer: '' };
  return store;
}

describe('attribution — campaign stash', () => {
  beforeEach(() => mockBrowser());

  test('stashCampaign stores the id under sb_appgrowth_campaign', () => {
    stashCampaign('diwali2026');
    expect((global as any).localStorage.getItem(CAMPAIGN_KEY)).toBe('diwali2026');
  });

  test('stashCampaign ignores null/undefined', () => {
    stashCampaign(null);
    stashCampaign(undefined);
    expect((global as any).localStorage.getItem(CAMPAIGN_KEY)).toBeNull();
  });

  test('readAttributionCampaign prefers the stashed id', () => {
    (global as any).localStorage.setItem(CAMPAIGN_KEY, 'stashed-one');
    (global as any).document.referrer = 'https://x/get-app?c=referrer-one';
    expect(readAttributionCampaign()).toBe('stashed-one');
  });

  test('readAttributionCampaign falls back to ?c= in the referrer', () => {
    (global as any).document.referrer = 'https://x/get-app?c=referrer-one';
    expect(readAttributionCampaign()).toBe('referrer-one');
  });

  test('readAttributionCampaign returns null when nothing is present', () => {
    expect(readAttributionCampaign()).toBeNull();
  });

  test('never throws when storage is unavailable', () => {
    delete (global as any).localStorage;
    delete (global as any).document;
    expect(() => stashCampaign('x')).not.toThrow();
    expect(() => readAttributionCampaign()).not.toThrow();
  });
});

describe('attribution — Play install referrer', () => {
  const PLAY = 'https://play.google.com/store/apps/details?id=com.sanatani.bandhan';

  test('appends the referrer param with the campaign', () => {
    const url = appendPlayReferrer(PLAY, 'diwali2026');
    expect(url).toContain('referrer=');
    expect(url).toContain('diwali2026');
    expect(url.startsWith(PLAY)).toBe(true);
  });

  test('does not duplicate an existing referrer param', () => {
    const withRef = `${PLAY}&referrer=utm_source%3Dother`;
    expect(appendPlayReferrer(withRef, 'diwali2026')).toBe(withRef);
  });

  test('null campaign or bad URL returns the input unchanged', () => {
    expect(appendPlayReferrer(PLAY, null)).toBe(PLAY);
    expect(appendPlayReferrer('not a url', 'c1')).toBe('not a url');
  });
});

describe('deviceDetect — iOS edge cases (PWA guide)', () => {
  const nav = (userAgent: string, maxTouchPoints = 0) => ({ userAgent, maxTouchPoints });

  test('iOS Chrome (CriOS) is ios, not in-app', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1';
    expect(detectPlatform(nav(ua))).toBe('ios');
    expect(isInAppBrowser(ua)).toBe(false);
  });

  test('Safari is ios, not in-app', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(detectPlatform(nav(ua))).toBe('ios');
    expect(isInAppBrowser(ua)).toBe(false);
  });

  test('Instagram webview is in-app', () => {
    expect(
      isInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 312.0.0.0.80',
      ),
    ).toBe(true);
  });

  test('Facebook webviews (FBAN/FBAV) are in-app', () => {
    expect(isInAppBrowser('Mozilla/5.0 [FBAN/FBIOS;FBAV/458.0.0.0.109]')).toBe(true);
    expect(isInAppBrowser('fban-something')).toBe(true);
    expect(isInAppBrowser('fbav-something')).toBe(true);
  });

  test('empty/garbage UA is not in-app', () => {
    expect(isInAppBrowser('')).toBe(false);
    expect(isInAppBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
  });
});

describe('tr.resolveTri — admin override fallback', () => {
  const hardcoded: Tri = { en: 'Hard EN', bn: 'Hard BN', hi: 'Hard HI' };

  test('complete override wins on every field', () => {
    const over: Tri = { en: 'New EN', bn: 'New BN', hi: 'New HI' };
    expect(resolveTri(over, hardcoded)).toEqual(over);
  });

  test('partial override falls back field-wise, never blanks', () => {
    const over: Tri = { en: 'New EN', bn: '', hi: '' };
    expect(resolveTri(over, hardcoded)).toEqual({ en: 'New EN', bn: 'Hard BN', hi: 'Hard HI' });
  });

  test('empty override returns the hardcoded copy', () => {
    expect(resolveTri({ en: '', bn: '', hi: '' }, hardcoded)).toEqual(hardcoded);
  });
});
