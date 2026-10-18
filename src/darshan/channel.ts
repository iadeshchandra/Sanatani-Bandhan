/**
 * darshan/channel.ts — YouTube channel linking for organisations.
 * ============================================================================
 * Orgs paste a channel ID or URL in settings. We validate, normalize to the
 * 24-char channel ID, and store it on the org doc as `youtubeChannelId`.
 *
 * Accepted inputs:
 *   UCxxxxxxxxxxxxxxxxxxxxxx            (raw 24-char ID)
 *   https://www.youtube.com/channel/UC…  (channel URL)
 *   https://youtube.com/@handle          (handle — NOT resolvable offline,
 *                                          caller must resolve via API)
 *   @handle
 */

/** A YouTube channel ID is always 24 chars starting with "UC". */
const CHANNEL_ID_RE = /^UC[a-zA-Z0-9_-]{22}$/;

export interface ChannelParseResult {
  ok: boolean;
  /** Normalized 24-char channel ID when ok. */
  channelId?: string;
  /** 'id' | 'url' | 'handle' — how it was provided. */
  kind?: 'id' | 'url' | 'handle';
  /** Machine-readable reason when !ok. */
  reason?: 'empty' | 'handle_needs_api' | 'unrecognized';
}

export function parseChannelInput(raw: string): ChannelParseResult {
  const input = (raw || '').trim();
  if (!input) return { ok: false, reason: 'empty' };

  // Raw channel ID.
  if (CHANNEL_ID_RE.test(input)) {
    return { ok: true, channelId: input, kind: 'id' };
  }

  // Channel URL — extract the ID after /channel/.
  const urlMatch = input.match(/youtube\.com\/(?:.*\/)?channel\/([a-zA-Z0-9_-]{22,24})/i);
  if (urlMatch) {
    const id = urlMatch[1].startsWith('UC') ? urlMatch[1] : `UC${urlMatch[1]}`;
    if (CHANNEL_ID_RE.test(id)) {
      return { ok: true, channelId: id, kind: 'url' };
    }
  }

  // youtu.be links never carry a channel ID.
  // @handle or /@handle or /c/name or /user/name — needs API resolution.
  if (/^@[\w.-]+$/.test(input) || /youtube\.com\/(@|c\/|user\/)/i.test(input)) {
    return { ok: false, reason: 'handle_needs_api' };
  }

  return { ok: false, reason: 'unrecognized' };
}

/** True when the org doc has a usable channel ID for live detection. */
export function hasLinkedChannel(org: { youtubeChannelId?: string } | null | undefined): boolean {
  return !!org?.youtubeChannelId && CHANNEL_ID_RE.test(org.youtubeChannelId);
}

/** youtube-nocookie embed URL — no tracking cookies for devotees. */
export function nocookieEmbedUrl(videoId: string, autoplay = true): string {
  const safe = encodeURIComponent(videoId);
  return `https://www.youtube-nocookie.com/embed/${safe}?autoplay=${autoplay ? 1 : 0}&rel=0`;
}
