/**
 * search/deepLinks.ts — Sangam deep-link contracts (audit #5).
 * ============================================================================
 * Single source of truth for the deep-links Universal Search emits for
 * Sangam content, and for how SangamView parses them back. The two sides
 * must agree: search results used to point at /app/sangam… — a route that
 * does not exist — so the catch-all silently dropped users on My Space.
 *
 *   post / service card → /app/home/sangam?post=<id>   (feed, scroll+highlight)
 *   shared video        → /app/home/sangam?video=<id> (Watch tab, opens video)
 *
 * Pure module — no Firestore, no React — so both sides and the tests share
 * one definition.
 */

/** Path for a feed post (regular posts and Seva Bazar service cards). */
export function sangamPostPath(postId: string): string {
  return `/app/home/sangam?post=${encodeURIComponent(postId)}`;
}

/** Path for a Sangam Watch video (shared videos and seva demos). */
export function sangamVideoPath(videoId: string): string {
  return `/app/home/sangam?video=${encodeURIComponent(videoId)}`;
}

export interface SangamDeepLink {
  postId?: string;
  videoId?: string;
}

/**
 * Parse a Sangam deep-link the same way SangamView consumes it.
 * Returns null for any other location (or a link with neither param) so
 * callers can distinguish "not a Sangam deep-link" from "empty".
 */
export function parseSangamDeepLink(pathname: string, search: string): SangamDeepLink | null {
  if (pathname !== '/app/home/sangam') return null;
  const q = new URLSearchParams(search);
  const postId = q.get('post') || undefined;
  const videoId = q.get('video') || undefined;
  if (!postId && !videoId) return null;
  return { postId, videoId };
}
