/**
 * sangam/sevaBazarVideo.ts — Seva demo video posts (Phase 3).
 * ============================================================================
 * Providers attach a YouTube intro to their service card. The demo is
 * written to sangamVideos (category 'seva_demo') so it automatically
 * appears in Sangam Watch's 🪔 Seva Demos section.
 *
 * YouTube is the only host ($0). Embeds use youtube-nocookie.
 */
import { extractYoutubeId } from './watch/types';

/** Validate a pasted YouTube URL for the demo field. Returns the video ID or an error. */
export function validateDemoVideoUrl(url: string): { videoId?: string; error?: string } {
  const clean = (url || '').trim();
  if (!clean) return { error: '' }; // empty = no video, not an error
  const id = extractYoutubeId(clean);
  if (!id) {
    return {
      error: 'That does not look like a YouTube link — paste a youtube.com or youtu.be URL.',
    };
  }
  return { videoId: id };
}

/** Build the sangamVideos document for a service-card demo. */
export function demoVideoDoc(input: {
  videoId: string;
  providerUid: string;
  providerName: string;
  providerTier?: string;
  sharedBy: string;
  sharedByName: string;
  sharedBySanId: string;
  serviceLine: string;
  postId: string;
}): Record<string, unknown> {
  return {
    youtubeId: input.videoId,
    title: input.serviceLine.slice(0, 120),
    thumbnailUrl: `https://i.ytimg.com/vi/${input.videoId}/hqdefault.jpg`,
    sharedBy: input.sharedBy,
    sharedByName: input.sharedByName,
    sharedBySanId: input.sharedBySanId,
    caption: `🪔 Seva demo — from service card ${input.postId}`,
    category: 'seva_demo',
    providerUid: input.providerUid,
    providerTier: input.providerTier || 'REGISTERED',
    createdAt: Date.now(),
    reportCount: 0,
  };
}

/** youtube-nocookie embed URL for inline playback (no autoplay with sound). */
export function demoEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}
