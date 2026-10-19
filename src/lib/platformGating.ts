/**
 * platformGating.ts — pure safety-switch logic (AUDIT FIX #8).
 * =============================================================
 * Kept firebase-free so it is unit-testable. The React hook in
 * ../hooks/usePlatformStatus.ts fetches the data; this decides.
 */

export interface PlatformStatus {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  flags: Record<string, boolean>;
  loaded: boolean;
}

/** Pure helper: should the maintenance screen show for this user? */
export function shouldShowMaintenance(status: PlatformStatus, isOwner: boolean): boolean {
  return status.loaded === true && status.maintenanceMode === true && !isOwner;
}

/* ------------------------------------------------------------------ */
/* Sync flag cache for non-React code (notification emitters, nudge     */
/* engine). The React hook populates it after each fetch; until then   */
/* reads fail open. Kept here (firebase-free) so emitters stay         */
/* importable in jest without the firebase ESM chain.                  */
/* ------------------------------------------------------------------ */
let flagCache: Record<string, boolean> | null = null;

/** Called by the platform-status hook after every fetch. */
export function setCachedFlags(flags: Record<string, boolean>): void {
  flagCache = { ...flags };
}

/**
 * Synchronous kill-switch read. True unless a flag doc exists AND is
 * explicitly disabled. Fail-open: no cache yet → true.
 */
export function isFlagEnabled(key: string): boolean {
  if (flagCache && key in flagCache) return flagCache[key];
  return true;
}
