/**
 * video/uploadGuidance.ts — gentle video upload guidance, pure logic.
 * ============================================================================
 * Standing law: we NEVER host video. YouTube is the backbone. When a user
 * picks a video file anywhere in the app, we don't cold-error — we honor
 * the intent and warmly redirect it to the 30-second YouTube path.
 *
 * This file is pure (no React, no Firestore) so it is fully unit-testable.
 */

/** Where the user was trying to upload when we intercepted a video file. */
export type VideoUploadContext = 'stories' | 'watch' | 'service_card' | 'chat' | 'feed';

/** Video MIME types we recognise (checked via startsWith for the prefix). */
const VIDEO_MIME_PREFIXES = ['video/'];

/** Video extensions as a fallback when MIME type is missing/generic. */
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp', '3g2', 'mts', 'm2ts'];

export interface PickedFileLike {
  type?: string;
  name?: string;
}

/**
 * True when the picked file is a video. Checks MIME type first, then falls
 * back to the file extension (some Android pickers report generic types).
 */
export function isVideoFile(file: PickedFileLike | null | undefined): boolean {
  if (!file) return false;
  const mime = (file.type || '').toLowerCase().trim();
  if (VIDEO_MIME_PREFIXES.some((p) => mime.startsWith(p))) return true;
  const name = (file.name || '').toLowerCase().trim();
  const dot = name.lastIndexOf('.');
  if (dot >= 0) {
    const ext = name.slice(dot + 1);
    if (VIDEO_EXTENSIONS.includes(ext)) return true;
  }
  return false;
}

/**
 * Where should a pasted YouTube link go for this context?
 * - 'watch' target: the sheet shares directly to Sangam Watch (the home for videos).
 * - 'callback' target: the caller handles the URL itself (service card demo field, chat message).
 */
export type ShareTarget = 'watch' | 'callback';

export function resolveShareTarget(context: VideoUploadContext): ShareTarget {
  switch (context) {
    case 'feed':
    case 'stories':
    case 'watch':
      return 'watch';
    case 'service_card':
    case 'chat':
      return 'callback';
  }
}

/** Loose validation for a YouTube channel URL (for "remember my channel"). */
export function isPlausibleChannelUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean) return false;
  try {
    const u = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (host !== 'youtube.com' && host !== 'youtu.be') return false;
    // Channel URLs: /@handle, /c/name, /channel/ID, /user/name
    return /^\/(@|c\/|channel\/|user\/)[^/]+/.test(u.pathname);
  } catch {
    return false;
  }
}

const CHANNEL_PREF_KEY = 'sb_video_channel_url';

/** Remember the user's YouTube channel (local only, never leaves the device). */
export function getRememberedChannelUrl(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const v = localStorage.getItem(CHANNEL_PREF_KEY);
    return v && isPlausibleChannelUrl(v) ? v : null;
  } catch {
    return null;
  }
}

export function setRememberedChannelUrl(url: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (isPlausibleChannelUrl(url)) localStorage.setItem(CHANNEL_PREF_KEY, url.trim());
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function clearRememberedChannelUrl(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(CHANNEL_PREF_KEY);
  } catch {
    /* ignore */
  }
}
