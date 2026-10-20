/**
 * sangam/watch/types.ts — Sangam Watch data models + pure YouTube helpers.
 * ============================================================================
 * YouTube is the only video host ($0, no native upload — video upload
 * needs Blaze). All embeds use youtube-nocookie. No auto-play with sound.
 */

export type WatchVideoCategory = 'shared' | 'seva_demo' | 'live_event';

export interface WatchVideo {
  id: string;
  youtubeId: string;
  title: string;
  /** Derived from youtubeId — stored for fast card rendering, no API call. */
  thumbnailUrl: string;
  /** Optional ISO-8601 duration string, e.g. "PT12M34S" (best-effort). */
  duration?: string;
  sharedBy: string;
  sharedByName: string;
  sharedBySanId?: string;
  caption?: string;
  category: WatchVideoCategory;
  /** For seva_demo: the provider's uid, so the card can link to booking. */
  providerUid?: string;
  providerTier?: string;
  createdAt: number;
  reportCount: number;
}

/** A live stream aggregated for the "Live Now" rail. */
export interface LiveStreamItem {
  kind: 'temple' | 'event';
  orgId?: string;
  templeName: string;
  videoId: string | null;
  title?: string;
  startedAt?: number;
}

/* ------------------------------------------------------------------ */
/* YouTube URL parsing — pure, fully tested.                           */
/* ------------------------------------------------------------------ */

/**
 * Extract the 11-char YouTube video ID from a URL.
 * Accepts: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/,
 * youtube.com/embed/, youtube.com/live/. Returns null when invalid.
 */
export function extractYoutubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  if (!clean) return null;

  const validId = (s: string | null): string | null =>
    s && /^[A-Za-z0-9_-]{11}$/.test(s) ? s : null;

  // Robust path: parse as a URL and read the v param / path segments.
  try {
    const u = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = validId(u.searchParams.get('v'));
      if (v) return v;
      const pathMatch = u.pathname.match(/^\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
      if (pathMatch) return pathMatch[2];
      return null;
    }
    if (host === 'youtu.be') {
      const seg = u.pathname.split('/').filter(Boolean)[0];
      return validId(seg || null);
    }
    return null;
  } catch {
    // Fall through to regex for odd inputs.
  }

  const patterns = [
    /(?:youtube\.com\/watch\?.*[?&]v=)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = clean.match(p);
    if (m) return m[1];
  }
  return null;
}

/** True when the string is a shareable YouTube video URL (not a channel/playlist). */
export function isShareableYoutubeUrl(url: string): boolean {
  return extractYoutubeId(url) !== null;
}

/** Privacy-hardened embed URL — no tracking cookies. */
export function nocookieWatchEmbed(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`;
}

/** High-quality thumbnail derived from the video ID — no API call needed. */
export function youtubeThumbnail(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/** Validate a share payload before writing. Returns an error key or null. */
export function validateShare(input: {
  youtubeId: string | null;
  title: string;
  caption?: string;
}): 'invalid_url' | 'title_required' | 'title_too_long' | 'caption_too_long' | null {
  if (!input.youtubeId) return 'invalid_url';
  const title = (input.title || '').trim();
  if (!title) return 'title_required';
  if (title.length > 120) return 'title_too_long';
  if ((input.caption || '').length > 500) return 'caption_too_long';
  return null;
}

/** Field bounds for the Firestore document. */
export function sanitizeVideo(input: {
  youtubeId: string;
  title: string;
  caption?: string;
  sharedBy: string;
  sharedByName: string;
  sharedBySanId?: string;
  category: WatchVideoCategory;
  providerUid?: string;
  providerTier?: string;
}): Omit<WatchVideo, 'id' | 'createdAt' | 'reportCount' | 'thumbnailUrl'> {
  // AUDIT FIX (Domain 3): Firestore `setDoc` REJECTS `undefined` field values
  // ("Unsupported field value: undefined"). The old builder spread undefined
  // optionals (sharedBySanId for devotees without a SAN id, caption when
  // empty, providerUid/providerTier for non-seva_demo), so sharing a video
  // threw for most users. Optionals are only set when present.
  const clean: Omit<WatchVideo, 'id' | 'createdAt' | 'reportCount' | 'thumbnailUrl'> = {
    youtubeId: input.youtubeId,
    title: input.title.trim().slice(0, 120),
    sharedBy: input.sharedBy,
    sharedByName: input.sharedByName.trim().slice(0, 80),
    category: input.category,
  };
  const caption = (input.caption || '').trim().slice(0, 500);
  if (caption) clean.caption = caption;
  if (input.sharedBySanId) clean.sharedBySanId = input.sharedBySanId;
  if (input.providerUid) clean.providerUid = input.providerUid;
  if (input.providerTier) clean.providerTier = input.providerTier;
  return clean;
}

/**
 * Newest-first ordering for Watch videos. Pure.
 * The category query deliberately avoids `orderBy` (a where(category ==)
 * + orderBy(createdAt) needs a composite index that may not exist on a
 * fresh project — the failure is silent, so the feed would render empty).
 * We fetch the bounded window and sort client-side instead.
 */
export function sortVideosNewest(videos: WatchVideo[]): WatchVideo[] {
  return [...videos].sort((a, b) => b.createdAt - a.createdAt);
}
