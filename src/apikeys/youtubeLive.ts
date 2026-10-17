/**
 * youtubeLive.ts — first consumer of the owner-managed API key system.
 * ============================================================================
 * Detects whether a YouTube channel is currently live, using the
 * owner-configured `youtubeDataApi` client-safe key (GodMode → API Keys).
 *
 * Honest behaviour:
 *  - No key configured  → returns null ("unknown", caller shows no live badge).
 *  - Key invalid/quota  → returns null, never throws into UI.
 *  - Only the read-only `search` endpoint is used; nothing is written.
 *
 * This module is deliberately isolated: it is only called by features that
 * opt into live detection, so a missing key can never break the app.
 */
import { getPublicApiKey } from './apiKeys';

export const YOUTUBE_KEY_NAME = 'youtubeDataApi';

interface YtSearchResponse {
  items?: Array<{ id?: { videoId?: string } }>;
}

/**
 * Is this YouTube channel live right now?
 * @returns true (live) | false (not live) | null (unknown — no key or API error)
 */
export async function isChannelLive(channelId: string): Promise<boolean | null> {
  const key = await getPublicApiKey(YOUTUBE_KEY_NAME);
  if (!key || !channelId) return null;
  try {
    const url =
      'https://www.googleapis.com/youtube/v3/search' +
      `?part=snippet&channelId=${encodeURIComponent(channelId)}` +
      '&eventType=live&type=video&maxResults=1' +
      `&key=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as YtSearchResponse;
    return Array.isArray(data.items) && data.items.length > 0;
  } catch {
    return null;
  }
}
