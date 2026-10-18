/**
 * darshan/types.ts — Live Darshan data models.
 * ============================================================
 * YouTube is the free backbone. We never build streaming infra.
 * `orgLiveStatus/{orgId}` is a cache: many viewers, one API call.
 */
export interface OrgLiveStatus {
  orgId: string;
  /** true when the channel has an active live video right now. */
  isLive: boolean;
  /** YouTube video ID of the live stream (when live). */
  videoId?: string;
  /** Stream title from YouTube (when live). */
  title?: string;
  /** Epoch ms when the live stream started (when live). */
  startedAt?: number;
  /** Epoch ms of the last poll that updated this doc. */
  updatedAt: number;
  /** Epoch ms when the next poll is allowed (rate-limit guard). */
  nextPollAfter?: number;
}

/** Regular aarti/prayer schedule an org publishes for devotees. Display only. */
export interface AartiSchedule {
  /** e.g. "Morning Aarti" */
  name: string;
  /** "HH:MM" 24h local time, e.g. "06:00" */
  time: string;
  /** 0=Sunday..6=Saturday; empty = daily */
  days?: number[];
}

/** What the poller returns after checking a channel. */
export interface LiveCheckResult {
  isLive: boolean;
  videoId?: string;
  title?: string;
}

/** Sacred ceremony types that trigger the private-by-default warning. */
export const PRIVATE_CEREMONY_TYPES = ['shraddha', 'funeral', 'antyesti', 'antyeshti'] as const;
export type PrivateCeremonyType = (typeof PRIVATE_CEREMONY_TYPES)[number];

/** Returns true when a booking/ceremony type needs the privacy warning. */
export function isPrivateCeremony(bookingType: string | undefined | null): boolean {
  if (!bookingType) return false;
  const t = bookingType.toLowerCase().replace(/[\s_-]+/g, '');
  return (PRIVATE_CEREMONY_TYPES as readonly string[]).some((p) => t.includes(p));
}
