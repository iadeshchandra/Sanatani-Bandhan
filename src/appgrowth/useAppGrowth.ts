/**
 * useAppGrowth — state for the /get-app smart link + landing page.
 * ================================================================
 * - Detects the platform once.
 * - Loads appGrowth/config (3s timeout, fail-open defaults).
 * - Validates the ?c= campaign param (fail-open to generic).
 * - Logs exactly one anonymous scan per page load. The StrictMode double
 *   effect in dev is guarded by a ref; production mounts run effects once.
 * - Captures the Android beforeinstallprompt event so the primary CTA can
 *   trigger the native install sheet when the browser offers it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppGrowthCampaign, AppGrowthConfig, GrowthPlatform } from './types';
import { detectPlatform } from './deviceDetect';
import { DEFAULT_CONFIG, getCampaign, getGrowthConfig, logScan } from './growthService';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface AppGrowthState {
  platform: GrowthPlatform;
  config: AppGrowthConfig;
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
  const [config, setConfig] = useState<AppGrowthConfig>({ ...DEFAULT_CONFIG });
  const [campaign, setCampaign] = useState<AppGrowthCampaign | null>(null);
  const [loading, setLoading] = useState(true);
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

    // Log the scan immediately — attribution must not wait for config.
    if (!scanLoggedRef.current) {
      scanLoggedRef.current = true;
      logScan({ campaignId: campaignIdRef.current, platform });
    }

    (async () => {
      const [cfg, camp] = await Promise.all([
        getGrowthConfig(),
        getCampaign(campaignIdRef.current),
      ]);
      if (cancelled) return;
      setConfig(cfg);
      setCampaign(camp);
      setLoading(false);
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

  return { platform, config, campaign, loading, deferredPrompt, installPwa, clearPrompt };
}
