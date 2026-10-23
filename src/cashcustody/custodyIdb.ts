/**
 * custodyIdb.ts — IndexedDB persistence for Cash Custody state.
 * ============================================================================
 * GAP THIS CLOSES: the custody store persisted ONLY to localStorage.
 * localStorage is a ~5 MB synchronous string store shared with every
 * other desk; a long hash chain + session history can exceed it, and
 * the old write path swallowed quota failures ("keep in memory") —
 * silently losing the ONLY copy of a tamper-evident money log.
 *
 * The app's Zero-Internet protocol persists structured data in
 * IndexedDB (idb-keyval — see src/lib/fileVaultIdb.ts, orgBranding.ts,
 * services/OfflineSyncManager.ts). This module gives custody the same
 * durable on-device home:
 *   - a dedicated idb-keyval store ('sanatani-cashcustody'), so custody
 *     data never collides with the file vault or sync queues;
 *   - every record is stamped with `savedAt` (device clock, ms) so the
 *     store can pick the FRESHER of the IndexedDB copy and the legacy
 *     localStorage copy — localStorage remains the synchronous
 *     first-paint cache and the export/import format is unchanged.
 *
 * HONEST SCOPE: IndexedDB fixes durability and quota ON THIS DEVICE.
 * Cross-device sync rides the same stamped copies through
 * `cashCustodyStates/{workspaceId}` (owner-approved 2026-10-23; see
 * src/context/data/custodySync.ts) — fail-open, so this on-device
 * layer stays canonical whenever the cloud path is unavailable.
 */

import { createStore, get, set } from 'idb-keyval';
import type { CashCustodyState } from './types';

const custodyStore = createStore('sanatani-cashcustody', 'workspace-state');

export interface StampedCustodyState {
  /** Device-clock write time (ms) of this copy. */
  savedAt: number;
  state: CashCustodyState;
}

export function stampCustodyState(
  state: CashCustodyState,
  savedAt: number
): StampedCustodyState {
  return { savedAt, state };
}

/**
 * Pick the fresher of two stamped copies. Ties (and a missing stamp,
 * treated as 0) keep the FIRST argument — callers pass the copy they
 * already trust for first paint first, so an untouched legacy
 * localStorage record is never displaced by an equally-old IDB one.
 */
export function pickFresherState(
  a: StampedCustodyState | null,
  b: StampedCustodyState | null
): StampedCustodyState | null {
  if (!a) return b;
  if (!b) return a;
  return (b.savedAt || 0) > (a.savedAt || 0) ? b : a;
}

/** Validate an unknown persisted value before trusting it as state. */
export function isStampedCustodyState(v: unknown): v is StampedCustodyState {
  if (!v || typeof v !== 'object') return false;
  const rec = v as { savedAt?: unknown; state?: unknown };
  if (typeof rec.savedAt !== 'number' || !rec.state || typeof rec.state !== 'object') {
    return false;
  }
  const s = rec.state as Record<string, unknown>;
  return (
    Array.isArray(s.boxes) &&
    Array.isArray(s.sessions) &&
    Array.isArray(s.events) &&
    Array.isArray(s.deposits)
  );
}

const idbKey = (workspaceId: string) => `state:${workspaceId}`;

export async function loadCustodyStateIdb(
  workspaceId: string
): Promise<StampedCustodyState | null> {
  try {
    const rec = await get<unknown>(idbKey(workspaceId), custodyStore);
    return isStampedCustodyState(rec) ? rec : null;
  } catch {
    return null; // IDB unavailable (private mode etc.) → localStorage copy rules
  }
}

export async function saveCustodyStateIdb(
  workspaceId: string,
  stamped: StampedCustodyState
): Promise<void> {
  try {
    await set(idbKey(workspaceId), stamped, custodyStore);
  } catch {
    /* best-effort: the localStorage write-through still holds the copy */
  }
}
