/**
 * usePlatformStatus.ts — the safety switches, actually wired (AUDIT FIX #8).
 * =========================================================================
 * Before this fix, `platformConfig/main.maintenanceMode` had ZERO readers and
 * the feature flags were write-only — toggles that didn't toggle. Now:
 *
 * - `usePlatformStatus()` reads `platformConfig/main` (public read by rules)
 *   and the `featureFlags` collection (logged-in read) once, cached 5 minutes.
 * - `useFeatureFlag(key)` returns false only when a flag doc exists AND is
 *   explicitly disabled. Fail-open: loading, logged-out, or error → enabled.
 *   (A kill-switch must never kill the app because a read failed.)
 * - `useMaintenanceGate()` is the boot-level check consumed by
 *   <MaintenanceGate/>: active maintenance + non-owner → warm screen.
 */
import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { type PlatformStatus, setCachedFlags } from '../lib/platformGating';

export type { PlatformStatus };

const EMPTY: PlatformStatus = { maintenanceMode: false, maintenanceMessage: '', flags: {}, loaded: false };

let cache: PlatformStatus | null = null;
let cacheAt = 0;
const CACHE_MS = 5 * 60 * 1000;
let inflight: Promise<PlatformStatus> | null = null;

async function fetchStatus(): Promise<PlatformStatus> {
  try {
    const [cfgSnap, flagsSnap] = await Promise.all([
      getDoc(doc(db, 'platformConfig', 'main')),
      // Feature flags need login; anonymous read fails closed → catch below.
      getDocs(collection(db, 'featureFlags')).catch(() => null),
    ]);
    const cfg = cfgSnap.exists() ? (cfgSnap.data() as any) : {};
    const flags: Record<string, boolean> = {};
    if (flagsSnap) {
      flagsSnap.docs.forEach((d) => {
        const v = d.data() as any;
        const key = v.key || d.id;
        if (typeof key === 'string' && key) flags[key] = v.enabled !== false;
      });
    }
    return {
      maintenanceMode: cfg.maintenanceMode === true,
      maintenanceMessage: typeof cfg.maintenanceMessage === 'string' ? cfg.maintenanceMessage : '',
      flags,
      loaded: true,
    };
  } catch {
    // Fail-open: a failed status read must never take the app down.
    return { ...EMPTY, loaded: true };
  }
}

function getStatus(): Promise<PlatformStatus> {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_MS) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetchStatus().then((s) => {
      cache = s;
      cacheAt = Date.now();
      inflight = null;
      // Keep the sync non-React reader warm for emitters / nudge engine.
      setCachedFlags(s.flags);
      return s;
    });
  }
  return inflight;
}

/** Clear the cache (e.g. after the owner toggles maintenance in GodMode). */
export function invalidatePlatformStatus(): void {
  cache = null;
  cacheAt = 0;
  setCachedFlags({});
}

export function usePlatformStatus(): PlatformStatus {
  const [status, setStatus] = useState<PlatformStatus>(cache ?? EMPTY);
  useEffect(() => {
    let live = true;
    getStatus().then((s) => {
      if (live) setStatus(s);
    });
    return () => {
      live = false;
    };
  }, []);
  return status;
}

/**
 * True when the named kill-switch is ON. A flag that does not exist, or any
 * read failure, returns true (fail-open — flags kill features, never the app).
 */
export function useFeatureFlag(key: string): boolean {
  const { flags, loaded } = usePlatformStatus();
  const check = useCallback(
    () => (loaded && key in flags ? flags[key] : true),
    [flags, loaded, key],
  );
  return check();
}

// isFlagEnabled (sync, for non-React emitters) lives in
// ../lib/platformGating — import it from there to avoid the firebase chain.
export { isFlagEnabled } from '../lib/platformGating';

// shouldShowMaintenance lives in ../lib/platformGating (pure, testable);
// re-exported here for consumers of this hook.
export { shouldShowMaintenance } from '../lib/platformGating';
