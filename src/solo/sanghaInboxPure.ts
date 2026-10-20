/**
 * sanghaInboxPure.ts — jest-safe pure logic for the sangha inbox.
 * =====================================================================
 * Proposal A: "🪔 From your sangha" orders unread-first, then caps.
 * Firebase ESM breaks jest, so the ordering logic lives here in a
 * firebase-free module (same pattern as moderationPure.ts / qrIntel.ts);
 * src/solo/SanghaInbox.tsx imports it for rendering.
 */

/** Pure: unread-first ordering + cap. */
export function orderSanghaItems<T extends { isRead: boolean }>(items: T[], limit: number): T[] {
  const unread = items.filter((n) => !n.isRead);
  const read = items.filter((n) => n.isRead);
  return [...unread, ...read].slice(0, Math.max(0, limit));
}
