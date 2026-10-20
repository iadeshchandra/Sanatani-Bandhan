/**
 * headerBadges.ts — pure badge helpers for the solo header doors.
 * =====================================================================
 * Proposal A (unified notifications): the solo header carries the only
 * unread badges — 💬 Messages (chat unread) and 🔔 Suchana (notification
 * unread). One count, one place: numeric badges, never bare dots.
 *
 * Fire-and-forget safe: counts arriving as 0 / negative / NaN render as
 * NO badge rather than a confusing "0".
 */

/**
 * Format a count for a badge. Returns null when no badge should render.
 * Caps at 99+ so the badge never overflows the header button.
 */
export function formatBadgeCount(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  const n = Math.floor(count);
  if (n <= 0) return null;
  return n > 99 ? '99+' : String(n);
}

/**
 * Whether the 🔔 Suchana bell should pulse red — reserved for unread
 * CRITICAL items (SOS) only. Never dilute it.
 */
export function shouldPulseCritical(criticalCount: number): boolean {
  return Number.isFinite(criticalCount) && criticalCount > 0;
}
