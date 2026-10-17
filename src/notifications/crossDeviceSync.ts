/**
 * notifications/crossDeviceSync.ts — read-state sync across the devotee's devices.
 * ============================================================================
 * PHASE 4 — Notification intelligence layer.
 *
 * THE APPROACH (documented, since this is the contract Phase 1 wires up):
 *
 *   1. Read state lives ON the Firestore notification item, not per-device:
 *        notifications/{uid}/items/{itemId}  →  { readAt: number|null,
 *                                                readByDevice: string|null }
 *      `readAt` is epoch ms (server-timestamp resolved client-side on write;
 *      see `buildReadMark`). `readByDevice` is a stable per-device UUID so
 *      the devotee can see *which* device marked it read ("Read on phone").
 *
 *   2. Every device's Firestore listener merges incoming snapshots with the
 *      monotonic rule: LATEST readAt WINS. A mark is only ever set forward
 *      (null → timestamp); it is never cleared. So no device can resurrect
 *      a notification another device already read — no phantom unread.
 *
 *   3. Conflicts (two devices mark read "at once"): compare readAt; the
 *      larger timestamp wins. Exact ties are broken deterministically by
 *      comparing device ids lexicographically — same result on every
 *      device, no flapping.
 *
 *   4. Marking read is idempotent: writing the same (or an earlier) readAt
 *      is a no-op after merge. Unread is derived, never stored:
 *          unread  ⟺  readAt == null
 *
 *   5. Ordering guarantee is intentionally WEAK: clocks may skew across
 *      devices. The worst case is a slightly stale read attribution, never
 *      a lost mark — a mark can only move forward in time.
 *
 * This file is pure logic (merge + marks + device id). Phase 1's Firestore
 * listener calls `mergeReadMarks(local, remote)` on every snapshot and
 * `buildReadMark(deviceId)` when the devotee taps "mark read".
 */

/** What Firestore stores on each notification item. */
export interface ReadMark {
  /** Epoch ms when marked read; null = unread. */
  readAt: number | null;
  /** Device UUID that marked it read; null when unread. */
  readByDevice: string | null;
}

const DEVICE_ID_KEY = 'sb.notifications.deviceId.v1';

function newUuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to the Math.random fallback */
  }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Stable per-device UUID, persisted in localStorage. Returns the existing
 * id on repeat calls. Falls back to an in-memory id when storage is
 * unavailable (SSR / denied) — uniqueness then holds only for the session.
 */
export function getOrCreateDeviceId(storage?: {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
} | null): string {
  const store =
    storage !== undefined
      ? storage
      : (() => {
          try {
            return typeof localStorage !== 'undefined' ? localStorage : null;
          } catch {
            return null;
          }
        })();
  if (store) {
    try {
      const existing = store.getItem(DEVICE_ID_KEY);
      if (existing) return existing;
      const id = newUuid();
      store.setItem(DEVICE_ID_KEY, id);
      return id;
    } catch {
      /* denied storage — fall through to ephemeral id */
    }
  }
  return newUuid();
}

/** Build the mark to write when the devotee marks an item read. */
export function buildReadMark(deviceId: string, atMs: number = Date.now()): Required<ReadMark> {
  return { readAt: atMs, readByDevice: deviceId };
}

/**
 * Merge two read marks with the latest-readAt-wins rule.
 *   - null readAt always loses to a real timestamp.
 *   - larger readAt wins; exact ties → lexicographically larger
 *     deviceId wins (deterministic on every device).
 */
export function mergeReadMarks(a: ReadMark, b: ReadMark): ReadMark {
  const ta = a.readAt ?? Number.NEGATIVE_INFINITY;
  const tb = b.readAt ?? Number.NEGATIVE_INFINITY;
  if (ta > tb) return { ...a };
  if (tb > ta) return { ...b };
  const da = a.readByDevice ?? '';
  const db = b.readByDevice ?? '';
  return db >= da ? { ...b } : { ...a };
}

/** Unread is derived, never stored: unread ⟺ readAt == null. */
export function isUnread(mark: ReadMark): boolean {
  return mark.readAt == null;
}

/**
 * Apply a remote snapshot's read mark to the local item's mark.
 * Convenience wrapper: returns the merged mark for the local item.
 */
export function applyRemoteReadMark(local: ReadMark, remote: ReadMark): ReadMark {
  return mergeReadMarks(local, remote);
}
