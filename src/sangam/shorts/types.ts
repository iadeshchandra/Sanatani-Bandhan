/**
 * sangam/shorts/types.ts — Sangam Shorts data models + pure YouTube helpers.
 * ============================================================================
 * "⚡ Sacred moments" — vertical, swipeable short videos. YouTube Shorts is
 * the only source ($0, no native upload — video upload needs Blaze).
 * All embeds use youtube-nocookie. Starts muted, tap for sound.
 */

export interface Short {
  id: string;
  youtubeId: string;
  title: string;
  /** Derived from youtubeId — stored for fast rendering, no API call. */
  thumbnailUrl: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorSanId?: string;
  caption?: string;
  /** ISO-8601 duration when known, e.g. "PT45S". Best-effort. */
  duration?: string;
  createdAt: number;
  viewCount: number;
  ashirvadCount: number;
  commentCount: number;
  shareCount: number;
  reportCount: number;
}

/* ------------------------------------------------------------------ */
/* YouTube Shorts URL parsing — pure, fully tested.                     */
/* ------------------------------------------------------------------ */

/**
 * Extract the 11-char YouTube video ID from a Shorts URL.
 * Accepts: youtube.com/shorts/{id}, youtu.be/{id} (short links),
 * youtube.com/watch?v={id} (regular videos — caller checks duration).
 * Returns null when invalid or not a YouTube URL.
 */
export function extractShortId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  if (!clean) return null;

  const validId = (s: string | null): string | null =>
    s && /^[A-Za-z0-9_-]{11}$/.test(s) ? s : null;

  try {
    const u = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      // /shorts/{id} — the canonical Shorts URL.
      const shortsMatch = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1];
      // /watch?v={id} — regular video, accepted if short enough (checked elsewhere).
      const v = validId(u.searchParams.get('v'));
      if (v) return v;
      // /embed/{id}
      const embedMatch = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
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
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?.*[?&]v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = clean.match(p);
    if (m) return m[1];
  }
  return null;
}

/** True when the URL is a canonical youtube.com/shorts/ link. */
export function isShortsUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  return clean.includes('youtube.com/shorts/') || clean.includes('youtu.be/');
}

/** youtube-nocookie embed URL tuned for Shorts: vertical, modest branding, no related. */
export function nocookieShortEmbed(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`;
}

/** Max-res thumbnail; falls back gracefully via the <img> onError in the UI. */
export function shortThumbnail(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/* ------------------------------------------------------------------ */
/* Validation — pure, fully tested.                                     */
/* ------------------------------------------------------------------ */

export interface ShortValidation {
  ok: boolean;
  youtubeId: string | null;
  error?: 'empty' | 'not_youtube' | 'bad_title' | 'bad_caption';
}

const MAX_TITLE = 120;
const MAX_CAPTION = 200;

/**
 * Validate a share-short submission. Pure — no I/O.
 * Duration is best-effort (YouTube doesn't expose it without API);
 * over-long videos are the sharer's responsibility, labelled honestly.
 */
export function validateShortShare(url: string, title: string, caption?: string): ShortValidation {
  if (!url || !url.trim()) return { ok: false, youtubeId: null, error: 'empty' };
  const youtubeId = extractShortId(url);
  if (!youtubeId) return { ok: false, youtubeId: null, error: 'not_youtube' };
  const t = (title || '').trim();
  if (t.length < 1 || t.length > MAX_TITLE) return { ok: false, youtubeId, error: 'bad_title' };
  const c = (caption || '').trim();
  if (c.length > MAX_CAPTION) return { ok: false, youtubeId, error: 'bad_caption' };
  return { ok: true, youtubeId };
}

/** Build the Firestore doc for a new short. Server timestamps filled by caller. */
export function shortDoc(input: {
  youtubeId: string;
  title: string;
  caption?: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorSanId?: string;
  createdAt: number;
}): Omit<Short, 'id'> {
  return {
    youtubeId: input.youtubeId,
    title: input.title.trim(),
    thumbnailUrl: shortThumbnail(input.youtubeId),
    authorUid: input.authorUid,
    authorName: input.authorName,
    authorAvatar: input.authorAvatar,
    authorSanId: input.authorSanId,
    caption: (input.caption || '').trim() || undefined,
    createdAt: input.createdAt,
    viewCount: 0,
    ashirvadCount: 0,
    commentCount: 0,
    shareCount: 0,
    reportCount: 0,
  };
}

/** Coerce a Firestore doc into a Short. Never throws. */
export function toShort(id: string, data: Record<string, unknown>): Short | null {
  try {
    const youtubeId = data.youtubeId;
    if (typeof youtubeId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) return null;
    const authorUid = data.authorUid;
    if (typeof authorUid !== 'string' || !authorUid) return null;
    return {
      id,
      youtubeId,
      title: typeof data.title === 'string' ? data.title : '',
      thumbnailUrl:
        typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : shortThumbnail(youtubeId),
      authorUid,
      authorName: typeof data.authorName === 'string' ? data.authorName : '',
      authorAvatar: typeof data.authorAvatar === 'string' ? data.authorAvatar : undefined,
      authorSanId: typeof data.authorSanId === 'string' ? data.authorSanId : undefined,
      caption: typeof data.caption === 'string' ? data.caption : undefined,
      duration: typeof data.duration === 'string' ? data.duration : undefined,
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
      viewCount: typeof data.viewCount === 'number' ? data.viewCount : 0,
      ashirvadCount: typeof data.ashirvadCount === 'number' ? data.ashirvadCount : 0,
      commentCount: typeof data.commentCount === 'number' ? data.commentCount : 0,
      shareCount: typeof data.shareCount === 'number' ? data.shareCount : 0,
      reportCount: typeof data.reportCount === 'number' ? data.reportCount : 0,
    };
  } catch {
    return null;
  }
}
