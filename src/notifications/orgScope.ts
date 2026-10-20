/**
 * orgScope.ts — pure org-scoping for the notification stream (QUEUED #50,
 * audit D8).
 * =====================================================================
 * The stream itself is per-USER (`notifications/{uid}/items`) — one
 * devotee, one ledger, on purpose. Org-bound items carry their org in
 * `payload.orgId` (the broadcast emitter, notifyOrgAnnouncement, writes
 * exactly that, with a `/org/{orgId}` deep link alongside).
 *
 * The audited failure was presentational, not structural: inside an
 * organisation workspace the center showed the WHOLE personal stream —
 * identical in every org, "Org" tab included — and the header badge
 * counted all of it. The law now:
 *
 *  - Inside an org workspace, the bell + center show ONLY that org's
 *    items; the badge counts that same scoped, duplicate-collapsed
 *    list (badge == list, the #43 law, applied per scope).
 *  - In personal space, nothing is scoped away: org items appear under
 *    the center's Org tab exactly as before.
 */

import type { NotificationItem } from './types';

/** The org an item belongs to, or null when it is personal. */
export function itemOrgId(item: NotificationItem): string | null {
  const payload = (item as NotificationItem).payload as
    | Record<string, unknown>
    | undefined;
  const fromPayload = payload?.orgId;
  if (typeof fromPayload === 'string' && fromPayload.length > 0) return fromPayload;
  // Fallback: the deep link the org emitters stamp (`/org/{orgId}`).
  const link = (item as NotificationItem).deepLink;
  if (typeof link === 'string') {
    const m = link.match(/^\/org\/([^/?#]+)/);
    if (m) return m[1];
  }
  return null;
}

/** Only the items that belong to THIS org (empty orgId → empty list). */
export function scopeItemsForOrg(
  items: NotificationItem[],
  orgId: string | null | undefined,
): NotificationItem[] {
  if (!orgId) return [];
  return items.filter((i) => itemOrgId(i) === orgId);
}

/** Items with no org owner — the personal stream within the stream. */
export function personalItems(items: NotificationItem[]): NotificationItem[] {
  return items.filter((i) => itemOrgId(i) === null);
}

/** Unread count over an already-scoped, already-collapsed list. */
export function unreadInScope(items: NotificationItem[]): number {
  return items.filter((i) => !i.read).length;
}

/** Unread CRITICAL count over a scoped list (the red-badge gate). */
export function criticalUnreadInScope(items: NotificationItem[]): number {
  return items.filter(
    (i) => i.priority === 'critical' && !i.read && !i.acknowledged,
  ).length;
}
