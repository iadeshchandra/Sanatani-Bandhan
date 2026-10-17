/**
 * attribution — campaign stash + first-open install tracking + deferred deep links.
 * ================================================================================
 * The App Growth funnel: a QR/poster link (/get-app?c={campaignId}) leads to a
 * store or PWA install. On the visitor's FIRST app open we attribute that
 * install back to the campaign and log it anonymously. A campaign doc may
 * also carry a `deepLink` (e.g. '/festival/dhakeshwari/diwali-2026') — when it
 * does, the app routes there after onboarding (deferred deep linking).
 *
 * Storage keys (all fail-open; nothing here may ever break boot):
 * - sb_appgrowth_campaign   localStorage — stashed by /get-app before the
 *                           visitor leaves for the store, or when the PWA is
 *                           installed from the landing page itself.
 * - sb_appgrowth_installed  localStorage — one-time dedupe for logInstall.
 * - sb_appgrowth_deeplink   sessionStorage — resolved deep-link target that
 *                           AppContentRouter consumes after the setup wizard.
 *
 * Everything swallows errors: analytics must never crash the app.
 */

import { detectPlatform } from './deviceDetect';
import { getCampaign, logInstall } from './growthService';
import type { GrowthPlatform } from './types';

export const CAMPAIGN_KEY = 'sb_appgrowth_campaign';
export const INSTALLED_KEY = 'sb_appgrowth_installed';
export const DEEPLINK_KEY = 'sb_appgrowth_deeplink';

/** Stash the campaign id so the install (possibly in another context) can attribute back. */
export function stashCampaign(campaignId: string | null | undefined): void {
  if (!campaignId) return;
  try {
    localStorage.setItem(CAMPAIGN_KEY, campaignId);
  } catch {
    /* storage unavailable — attribution is best-effort */
  }
}

/**
 * Attribution for the current app open, best-effort:
 * 1. stashed campaign id from /get-app (survives PWA install — same origin),
 * 2. the landing URL inside document.referrer (e.g. a web-view that kept the ?c=),
 * 3. nothing (generic install).
 */
export function readAttributionCampaign(): string | null {
  try {
    const stashed = localStorage.getItem(CAMPAIGN_KEY);
    if (stashed) return stashed;
    const ref = document.referrer;
    if (ref) {
      const m = /[?&]c=([a-zA-Z0-9_-]{1,64})/.exec(ref);
      if (m) return m[1];
    }
  } catch {
    /* fail-open */
  }
  return null;
}

/** The platform bucket for the install log. */
export function currentPlatform(): GrowthPlatform {
  try {
    return detectPlatform(navigator as unknown as Parameters<typeof detectPlatform>[0]);
  } catch {
    return 'unknown';
  }
}

/**
 * One-time install logging for the app boot path (called from main.tsx).
 * Dedupe is by localStorage key, so StrictMode / HMR re-runs are harmless.
 * Never throws, never blocks: logInstall is fire-and-forget by design.
 */
export function trackAppGrowthInstall(): void {
  try {
    let already = false;
    try {
      already = localStorage.getItem(INSTALLED_KEY) === '1';
    } catch {
      /* storage unavailable — still log once; dedupe is best-effort */
    }
    if (already) return;

    const campaignId = readAttributionCampaign();
    void logInstall({
      campaignId: campaignId ?? undefined,
      platform: currentPlatform(),
    });

    try {
      localStorage.setItem(INSTALLED_KEY, '1');
    } catch {
      /* ignore */
    }

    // Deferred deep link: if the attributed campaign names a route,
    // stash it for AppContentRouter to consume after the setup wizard.
    // Fail-open — an unknown/inactive campaign simply yields no target.
    if (campaignId) {
      void getCampaign(campaignId)
        .then((campaign) => {
          const target = campaign?.deepLink;
          if (
            typeof target === 'string' &&
            /^\/[a-zA-Z0-9/_.\-]*$/.test(target) &&
            target.length > 1
          ) {
            try {
              sessionStorage.setItem(DEEPLINK_KEY, target);
            } catch {
              /* ignore */
            }
          }
        })
        .catch(() => {
          /* fail-open */
        });
    }
  } catch {
    /* analytics must never break boot */
  }
}

/**
 * Append the Google Play `referrer` install-referrer param so the campaign
 * survives the store install (best-effort; harmless if the listing ignores
 * it). Never throws; returns the original URL when anything is off.
 */
export function appendPlayReferrer(playStoreUrl: string, campaignId: string | null): string {
  try {
    if (!playStoreUrl || !campaignId) return playStoreUrl;
    const url = new URL(playStoreUrl);
    if (url.searchParams.has('referrer')) return playStoreUrl;
    url.searchParams.set(
      'referrer',
      `utm_source=sanatani_appgrowth&utm_campaign=${encodeURIComponent(campaignId)}`,
    );
    return url.toString();
  } catch {
    return playStoreUrl;
  }
}
