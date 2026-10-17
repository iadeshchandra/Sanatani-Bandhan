/**
 * deviceDetect — platform detection for the /get-app smart link.
 * ==============================================================
 * Pure functions over navigator values so they stay unit-testable and
 * never touch the DOM. iPadOS 13+ reports itself as "Macintosh" in the
 * user agent, so we disambiguate with touch support.
 */

import type { GrowthPlatform } from './types';

export interface NavigatorLike {
  userAgent: string;
  maxTouchPoints?: number;
  platform?: string;
}

const ANDROID_RE = /android/i;
const IOS_RE = /iphone|ipad|ipod/i;
const MACINTOSH_RE = /macintosh/i;

/**
 * Detect the visitor's platform bucket.
 * Returns 'unknown' rather than guessing when nothing matches.
 */
export function detectPlatform(nav: NavigatorLike): GrowthPlatform {
  const ua = nav.userAgent || '';

  if (ANDROID_RE.test(ua)) return 'android';

  if (IOS_RE.test(ua)) return 'ios';

  // iPadOS 13+: UA says "Macintosh" but the device has a touch screen.
  // A real Mac with a touchscreen is essentially non-existent, and even
  // then the PWA path is the correct bucket.
  if (MACINTOSH_RE.test(ua) && (nav.maxTouchPoints ?? 0) > 1) return 'ios';

  // Desktop OS markers.
  if (/windows|macintosh|linux|x11|chromeos/i.test(ua)) return 'desktop';

  return 'unknown';
}

/** True when the PWA runs in standalone / fullscreen display mode. */
export function isStandaloneDisplay(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    // iOS Safari legacy standalone flag.
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/** iOS Safari fires no beforeinstallprompt — it always needs manual steps. */
export function needsManualPwaInstall(platform: GrowthPlatform): boolean {
  return platform === 'ios' || platform === 'unknown';
}

/**
 * True when the visitor is inside an iOS in-app browser (Instagram, Facebook).
 * These webviews hide Safari's Share button, so the PWA guide must first say
 * "Open in Safari". iOS Chrome also runs on the Safari engine — its share
 * flow matches Safari's, so it is deliberately NOT treated as in-app here.
 */
export function isInAppBrowser(userAgent: string): boolean {
  return /instagram|fban|fbav/i.test(userAgent || '');
}

/**
 * Shareable smart-link URL for the current page, preserving the campaign
 * param so printed QR codes and forwards keep their attribution.
 */
export function buildSmartLinkUrl(campaignId: string | null): string {
  try {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/get-app.*$/, '') + '/get-app';
    if (campaignId) url.searchParams.set('c', campaignId);
    return url.toString();
  } catch {
    return window.location.origin + '/get-app' + (campaignId ? `?c=${campaignId}` : '');
  }
}
