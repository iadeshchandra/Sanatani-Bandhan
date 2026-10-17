/**
 * growthService — Firestore access for the App Growth program.
 * ============================================================
 * All functions are fail-open: the landing page must NEVER break because
 * Firestore is unreachable, the doc is missing, or rules deny the read.
 * Errors are swallowed (console.warn in dev) and sensible defaults are
 * returned so the page always renders a complete, warm experience.
 *
 * Write payloads contain NO PII — only campaignId, platform and timestamps.
 *
 * Phase 5: this module is the SCAN/INSTALL/WAITLIST logging contract only.
 * Config reads converged on `useAppGrowthConfig.ts`; getGrowthConfig and
 * DEFAULT_CONFIG below are deprecated and kept for compatibility only.
 */

import { collection, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  AppGrowthConfig,
  AppGrowthCampaign,
  GrowthPlatform,
} from './types';

/**
 * Fail-open defaults: PWA prominent, store badges hidden without a URL.
 * @deprecated Use DEFAULT_CONFIG from './useAppGrowthConfig' instead.
 */
export const DEFAULT_CONFIG: AppGrowthConfig = {
  playStoreUrl: '',
  playStoreLive: false,
  iosMode: 'pwa',
  appStoreUrl: '',
  pwaFallbackEnabled: true,
  updatedAt: null,
};

const CONFIG_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Fetch appGrowth/config. Resolves to DEFAULT_CONFIG on any failure
 * (network, missing doc, denied read, timeout).
 *
 * @deprecated Phase 5: config reads converged on the `useAppGrowthConfig`
 * hook (which also carries the landing-content override). Kept working for
 * compatibility — prefer the hook in all new code.
 */
export async function getGrowthConfig(): Promise<AppGrowthConfig> {
  try {
    const snap = await withTimeout(
      getDoc(doc(db, 'appGrowth', 'config')),
      CONFIG_TIMEOUT_MS,
      'appGrowth/config'
    );
    if (!snap.exists()) return { ...DEFAULT_CONFIG };
    const data = snap.data() as Partial<AppGrowthConfig>;
    return {
      playStoreUrl: typeof data.playStoreUrl === 'string' ? data.playStoreUrl : '',
      playStoreLive: data.playStoreLive === true,
      iosMode: 'pwa',
      appStoreUrl: typeof data.appStoreUrl === 'string' ? data.appStoreUrl : '',
      pwaFallbackEnabled: data.pwaFallbackEnabled !== false,
      updatedAt:
        typeof data.updatedAt === 'number'
          ? data.updatedAt
          : (data.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? null,
    };
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[appgrowth] config fetch failed, using defaults:', err);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Validate a ?c= campaign id against appGrowthCampaigns.
 * Fail-open: unknown / inactive / unreachable → null (generic page).
 */
export async function getCampaign(campaignId: string | null): Promise<AppGrowthCampaign | null> {
  if (!campaignId || !/^[a-zA-Z0-9_-]{1,64}$/.test(campaignId)) return null;
  try {
    const snap = await withTimeout(
      getDoc(doc(db, 'appGrowthCampaigns', campaignId)),
      CONFIG_TIMEOUT_MS,
      `appGrowthCampaigns/${campaignId}`
    );
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<AppGrowthCampaign>;
    if (data.active === false) return null;
    return {
      id: campaignId,
      label: typeof data.label === 'string' ? data.label : campaignId,
      templeName: typeof data.templeName === 'string' ? data.templeName : undefined,
      // Deferred deep link (Phase 5): optional '/path' the app routes to after
      // onboarding on first open. Strictly validated — junk never navigates.
      deepLink:
        typeof data.deepLink === 'string' && /^\/[a-zA-Z0-9/_.\-]{1,120}$/.test(data.deepLink)
          ? data.deepLink
          : undefined,
      active: true,
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    };
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[appgrowth] campaign fetch failed:', err);
    return null;
  }
}

/**
 * Log one anonymous scan to appGrowthScans. Fire-and-forget: resolves
 * immediately, writes in the background, never throws.
 * Only campaignId, platform and a timestamp — never any PII.
 */
export function logScan(args: { campaignId: string | null; platform: GrowthPlatform }): Promise<void> {
  try {
    // Don't await — the page must not wait for analytics.
    void addDoc(collection(db, 'appGrowthScans'), {
      campaignId: args.campaignId,
      platform: args.platform,
      ts: serverTimestamp(),
    }).catch((err) => {
      if (import.meta.env.DEV) console.warn('[appgrowth] scan log failed:', err);
    });
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[appgrowth] scan log failed:', err);
  }
  return Promise.resolve();
}

/**
 * Log one install on first app open. Called by the app's boot code
 * (native wrapper / PWA entry), NOT by the landing page. Kept here so
 * every appGrowth writer shares one contract and one validation shape.
 * The caller must dedupe (e.g. localStorage 'sb_appgrowth_installed').
 */
export function logInstall(args: { campaignId?: string; platform: GrowthPlatform }): Promise<void> {
  try {
    void addDoc(collection(db, 'appGrowthInstalls'), {
      campaignId: args.campaignId ?? null,
      platform: args.platform,
      ts: serverTimestamp(),
    }).catch((err) => {
      if (import.meta.env.DEV) console.warn('[appgrowth] install log failed:', err);
    });
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[appgrowth] install log failed:', err);
  }
  return Promise.resolve();
}

/**
 * "Notify me" capture for the pre-launch state. Returns true on success.
 */
export async function addToWaitlist(platform: GrowthPlatform): Promise<boolean> {
  try {
    await withTimeout(
      addDoc(collection(db, 'appGrowthWaitlist'), {
        platform,
        ts: serverTimestamp(),
      }),
      CONFIG_TIMEOUT_MS,
      'appGrowthWaitlist'
    );
    return true;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[appgrowth] waitlist write failed:', err);
    return false;
  }
}
