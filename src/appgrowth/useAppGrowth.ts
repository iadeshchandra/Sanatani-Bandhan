/**
 * useAppGrowth — state for the /get-app smart link + landing page.
 * ================================================================
 * - Detects the platform once.
 * - Loads appGrowth/config through the shared `useAppGrowthConfig` hook
 *   (Phase 5: the duplicate growthService.getGrowthConfig reader is
 *   deprecated — landing + admin now share one config + content contract).
 * - Validates the ?c= campaign param (fail-open to generic).
 * - Logs exactly one anonymous scan per page load. The StrictMode double
 *   effect in dev is guarded by a ref; production mounts run effects once.
 * - Stashes the campaign id (sb_appgrowth_campaign) so the store/PWA
 *   install can attribute back on first app open (deferred attribution).
 * - Captures the Android beforeinstallprompt event so the primary CTA can
 *   trigger the native install sheet when the browser offers it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppGrowthCampaign, GrowthPlatform } from './types';
import { detectPlatform } from './deviceDetect';
import {
  useAppGrowthConfig,
  DEFAULT_CONTENT,
  type AppGrowthConfig,
  type AppGrowthContent,
} from './useAppGrowthConfig';
import { getCampaign, logScan } from './growthService';
import { stashCampaign } from './attribution';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface AppGrowthState {
  platform: GrowthPlatform;
  config: AppGrowthConfig;
  /** Landing copy override from appGrowth/config.content (hardcoded copy is the fallback). */
  content: AppGrowthContent;
  campaign: AppGrowthCampaign | null;
  /** True while config/campaign are still resolving (page shows skeleton hero). */
  loading: boolean;
  /** Android install sheet captured from the browser, or null. */
  deferredPrompt: BeforeInstallPromptEvent | null;
  /** Trigger the captured Android install sheet. No-op when none captured. */
  installPwa: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** Clear the captured prompt (e.g. after the user chose the store link). */
  clearPrompt: () => void;
}

export function useAppGrowth(): AppGrowthState {
  const [platform] = useState<GrowthPlatform>(() =>
    typeof navigator !== 'undefined'
      ? detectPlatform(navigator as unknown as Parameters<typeof detectPlatform>[0])
      : 'unknown'
  );
  // Phase 5: single shared config reader (60s module cache, fail-open).
  const { config, loading: configLoading } = useAppGrowthConfig();
  const [campaign, setCampaign] = useState<AppGrowthCampaign | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // StrictMode guard: one scan per page load, even if effects re-run in dev.
  const scanLoggedRef = useRef(false);
  const campaignIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    try {
      const params = new URLSearchParams(window.location.search);
      campaignIdRef.current = params.get('c');
    } catch {
      campaignIdRef.current = null;
    }

    // Stash the campaign for deferred attribution: /get-app runs on the same
    // origin as the PWA, so a PWA install keeps localStorage — and the
    // store-badge tap re-stashes right before leaving for the Play listing.
    stashCampaign(campaignIdRef.current);

    // Log the scan immediately — attribution must not wait for config.
    if (!scanLoggedRef.current) {
      scanLoggedRef.current = true;
      logScan({ campaignId: campaignIdRef.current, platform });
    }

    (async () => {
      const camp = await getCampaign(campaignIdRef.current);
      if (cancelled) return;
      setCampaign(camp);
      setCampaignLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [platform]);

  // Capture the Android install sheet (Chrome/Edge) for a one-tap CTA.
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPwa = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable' as const;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return outcome;
    } catch {
      return 'unavailable' as const;
    }
  }, [deferredPrompt]);

  const clearPrompt = useCallback(() => setDeferredPrompt(null), []);

  return {
    platform,
    config,
    content: config.content ?? DEFAULT_CONTENT,
    campaign,
    loading: configLoading || campaignLoading,
    deferredPrompt,
    installPwa,
    clearPrompt,
  };
}
