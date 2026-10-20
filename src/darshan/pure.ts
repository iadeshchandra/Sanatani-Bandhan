/**
 * darshan/pure.ts — pure helpers with zero Firebase imports.
 * Jest-safe. liveStatus.ts re-exports these.
 */
import type { OrgLiveStatus } from './types';

/** Show the LIVE badge only when definitively live. Never guess. */
export function shouldShowLiveBadge(status: OrgLiveStatus | null | undefined): boolean {
  return status?.isLive === true;
}

/**
 * The watch-door target for an org page: what DarshanViewer needs when
 * the org is definitively live WITH a playable video. Returns null in
 * every other case — a live flag without a videoId must never open an
 * empty viewer (audit 2026-10-20: the org page ran the poller but had
 * no watch door at all).
 */
export function watchDoorTarget(
  status: OrgLiveStatus | null | undefined,
): { videoId: string; title?: string } | null {
  if (!shouldShowLiveBadge(status)) return null;
  const videoId = status?.videoId?.trim();
  if (!videoId) return null;
  return { videoId, title: status?.title };
}

/** Human "next aarti" text from a schedule. */
export function nextAartiText(
  schedules: Array<{ name: string; time: string; days?: number[] }>,
  now: Date = new Date(),
): { name: string; text: string } | null {
  if (!schedules?.length) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();

  let best: { name: string; mins: number; daysAhead: number } | null = null;
  for (const s of schedules) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s.time);
    if (!m) continue;
    const tMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    for (let d = 0; d < 8; d++) {
      const day = (today + d) % 7;
      if (s.days?.length && !s.days.includes(day)) continue;
      const mins = d * 1440 + tMin - nowMin;
      if (mins <= 0) continue;
      if (!best || mins < best.mins) best = { name: s.name, mins, daysAhead: d };
      break;
    }
  }
  if (!best) return null;
  const { name, mins, daysAhead } = best;
  const time = schedules.find((s) => s.name === name)?.time ?? '';
  let text: string;
  if (daysAhead === 0 && mins < 60) text = `in ${mins}m`;
  else if (daysAhead === 0) text = `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  else if (daysAhead === 1) text = `tomorrow at ${time}`;
  else text = `in ${daysAhead} days at ${time}`;
  return { name, text };
}

/* ------------------------------------------------------------------ */
/* Live-detection loop — pure, jest-safe, zero Firebase imports.       */
/* liveStatus.ts re-exports these; the writer is the only impure part. */
/* ------------------------------------------------------------------ */

import type { LiveCheckResult } from './types';

/** How long a cached status is trusted before re-polling (5 min). */
export const CACHE_TTL_MS = 5 * 60 * 1000;
/** Minimum gap between API polls for one org (15 min) — quota guard. */
export const POLL_GAP_MS = 15 * 60 * 1000;
/** YouTube Data API free quota: units per day. */
export const YT_QUOTA_UNITS_PER_DAY = 10_000;
/** Cost of one live check (search.list, eventType=live). */
export const YT_UNITS_PER_CHECK = 100;

/** API checks per day for one org at the given poll gap. */
export function checksPerDay(pollGapMs: number): number {
  if (pollGapMs <= 0) return 0;
  return Math.floor((24 * 60 * 60 * 1000) / pollGapMs);
}

/** Max orgs supportable on the free tier at the given poll gap. */
export function maxOrgsForQuota(pollGapMs: number): number {
  const perOrg = checksPerDay(pollGapMs);
  if (perOrg <= 0) return 0;
  return Math.floor(YT_QUOTA_UNITS_PER_DAY / YT_UNITS_PER_CHECK / perOrg);
}

/** The exact key whitelist from firestore.rules for orgLiveStatus. */
export const ORG_LIVE_STATUS_KEYS = [
  'orgId',
  'isLive',
  'videoId',
  'title',
  'startedAt',
  'updatedAt',
  'nextPollAfter',
] as const;

/** Raw shape of a YouTube search.list response (live check). */
export interface YtSearchResponse {
  items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string } }>;
}

/**
 * Parse a YouTube search.list response into a live-check result.
 * Returns the videoId + title — readers need both for the embed.
 */
export function parseLiveSearchResponse(data: YtSearchResponse | null | undefined): LiveCheckResult {
  const first = Array.isArray(data?.items) ? data!.items![0] : undefined;
  const videoId = first?.id?.videoId;
  if (!videoId) return { isLive: false };
  return {
    isLive: true,
    videoId,
    title: first!.snippet?.title || undefined,
  };
}

/**
 * True when the poll flipped the org from not-live to live, or the live
 * videoId changed (a new stream started).
 */
export function detectWentLive(
  prev: { isLive: boolean; videoId?: string } | null | undefined,
  next: { isLive: boolean; videoId?: string },
): boolean {
  if (!next.isLive) return false;
  if (!prev || !prev.isLive) return true;
  return !!next.videoId && next.videoId !== prev.videoId;
}

/**
 * Build the exact document to write for orgLiveStatus.
 * Every output satisfies the Firestore rules: isLive always a bool,
 * updatedAt always a JS number (never serverTimestamp()), keys ⊆ the
 * whitelist, no undefined values.
 */
export function buildStatusDoc(
  orgId: string,
  check: LiveCheckResult | null,
  prev: OrgLiveStatus | null | undefined,
  now: number,
): OrgLiveStatus {
  const prevIsLive = !!prev?.isLive;
  // Unknown API result → preserve the last known state (never flap the badge).
  const isLive = check === null ? prevIsLive : check.isLive;
  const videoId = isLive ? check?.videoId ?? prev?.videoId : undefined;
  const title = isLive ? check?.title ?? prev?.title : undefined;
  // startedAt: a fresh transition (or new video) starts the clock now;
  // a continuing stream keeps its original startedAt.
  const transitioned = detectWentLive(
    prev ? { isLive: prevIsLive, videoId: prev.videoId } : null,
    { isLive, videoId },
  );
  const startedAt = isLive ? (transitioned ? now : prev?.startedAt ?? now) : undefined;

  const docOut: OrgLiveStatus = {
    orgId,
    isLive,
    updatedAt: now,
    nextPollAfter: now + POLL_GAP_MS,
  };
  if (videoId !== undefined) docOut.videoId = videoId;
  if (title !== undefined) docOut.title = title;
  if (startedAt !== undefined) docOut.startedAt = startedAt;
  return docOut;
}
