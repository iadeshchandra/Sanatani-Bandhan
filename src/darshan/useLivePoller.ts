/**
 * darshan/useLivePoller.ts — the live-detection loop, mounted per org page.
 * ============================================================================
 * One hook instance per org page view. It polls getLiveStatus() on mount
 * and every `intervalMs`; the leader-election inside getLiveStatus()
 * guarantees a single YouTube API call per POLL_GAP_MS no matter how many
 * devotees are watching (1,000 viewers = 1 API call, not 1,000).
 *
 * On an offline→live transition it fires notifyTempleLive() (GENTLE tier —
 * respects quiet hours, one notification per stream via dedupe key).
 *
 * Mount: <OrgLivePoller orgId channelId templeName /> renders nothing.
 * No-ops when channelId is absent. Never throws into UI.
 */
import { useEffect, useRef, useState } from 'react';
import { getLiveStatus, CACHE_TTL_MS } from './liveStatus';
import { notifyTempleLive } from './notify';
import { hasLinkedChannel } from './channel';
import type { OrgLiveStatus } from './types';

interface PollerOpts {
  orgId: string;
  /** 24-char YouTube channel ID (validated). Empty → no-op. */
  channelId?: string | null;
  /** Temple/org display name for the notification. */
  templeName: string;
  /** Re-poll cadence. Defaults to CACHE_TTL_MS (5 min). */
  intervalMs?: number;
  /** Language for the notification copy. */
  lang?: 'en' | 'hi' | 'bn';
}

/** Runs the live-detection loop. Returns the latest known status (or null). */
export function useLivePoller({
  orgId,
  channelId,
  templeName,
  intervalMs = CACHE_TTL_MS,
  lang = 'en',
}: PollerOpts): OrgLiveStatus | null {
  const [status, setStatus] = useState<OrgLiveStatus | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!orgId || !hasLinkedChannel({ youtubeChannelId: channelId ?? undefined })) return;
    let timer: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const outcome = await getLiveStatus(orgId, channelId as string);
        if (!alive.current || !outcome) return;
        setStatus(outcome.status);
        if (outcome.wentLive && outcome.status.videoId) {
          await notifyTempleLive({
            orgId,
            templeName,
            videoId: outcome.status.videoId,
            startedAt: outcome.status.startedAt,
            lang,
            deepLink: `/org/${orgId}/darshan`,
          });
        }
      } catch {
        /* the loop never breaks the page */
      }
    };

    void poll();
    timer = setInterval(() => void poll(), Math.max(intervalMs, 60_000));
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [orgId, channelId, templeName, intervalMs, lang]);

  return status;
}

/** Null-render mount point for the poller (keeps hooks unconditional). */
export function OrgLivePoller(props: PollerOpts): null {
  useLivePoller(props);
  return null;
}
