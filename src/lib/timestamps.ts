/**
 * timestamps.ts — one coercion point for Firestore timestamp fields.
 * ==========================================================================
 * UI/UX audit U1 (2026-10-22): membership edges written at workspace
 * creation store `joinedAt: serverTimestamp()` (PortalLogin) — a
 * Firestore Timestamp object at read time, NOT the epoch-millis number
 * the `WorkspaceMembership` type declares. The membership reader copied
 * docs with a raw spread, so the runtime value disagreed with the type,
 * and the directory card's `new Date(ts)` produced the literal string
 * "Invalid Date" (new Date never throws on bad input, so the card's
 * try/catch could not save it).
 *
 * The law: every reader of a timestamp-bearing doc normalizes through
 * here, so the declared types stop lying. Unresolvable values (null,
 * a still-pending server timestamp, garbage) coerce to 0 — the
 * "no known date" sentinel — and formatters MUST treat 0/non-finite
 * as "omit the date", never as a date to print.
 */

import type { WorkspaceMembership } from '../types/membership';

/**
 * Coerce any Firestore-ish timestamp representation to epoch millis:
 *  - finite number            → itself
 *  - Date                     → getTime()
 *  - Timestamp-like (toMillis)→ toMillis()
 *  - { seconds, nanoseconds } → seconds*1000 + floor(nanos/1e6)
 *  - numeric / ISO string     → parsed value
 *  - anything else (null, undefined, pending serverTimestamp reading
 *    as null, plain garbage)  → 0 ("no known date")
 */
export function toMillisSafe(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return 0;
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) return asNumber;
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object') {
    const v = value as {
      toMillis?: unknown;
      seconds?: unknown;
      nanoseconds?: unknown;
    };
    if (typeof v.toMillis === 'function') {
      try {
        const t = (v.toMillis as () => number).call(value);
        return typeof t === 'number' && Number.isFinite(t) ? t : 0;
      } catch {
        return 0;
      }
    }
    if (typeof v.seconds === 'number' && Number.isFinite(v.seconds)) {
      const nanos =
        typeof v.nanoseconds === 'number' && Number.isFinite(v.nanoseconds)
          ? v.nanoseconds
          : 0;
      return v.seconds * 1000 + Math.floor(nanos / 1e6);
    }
  }
  return 0;
}

/**
 * Normalize a raw `workspaceMembers` doc into the declared
 * WorkspaceMembership shape: every timestamp field passes through
 * toMillisSafe, so `joinedAt` is ALWAYS a finite number (0 when the
 * server timestamp has not resolved yet) and `roleExpiresAt` keeps
 * its null/absent semantics while Timestamp objects become millis.
 */
export function normalizeMembershipDoc(data: unknown): WorkspaceMembership {
  const raw: Record<string, unknown> =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const expires = raw.roleExpiresAt;
  return {
    ...raw,
    joinedAt: toMillisSafe(raw.joinedAt),
    roleExpiresAt:
      expires === null || expires === undefined
        ? null
        : toMillisSafe(expires),
  } as WorkspaceMembership;
}
