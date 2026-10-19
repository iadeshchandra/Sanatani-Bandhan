/**
 * darshan/liveStatus.ts — live detection with Firestore caching.
 * ============================================================================
 * Quota math ($0 forever — honest version):
 *   YouTube Data API free tier = 10,000 units/day.
 *   One live check (search.list with eventType=live) = 100 units.
 *   10,000 ÷ 100 = 100 checks/day TOTAL across all orgs.
 *   At a 15-minute poll interval: 96 checks/day = ONE org, continuously.
 *   At a 30-minute interval: 48 checks/day per org = TWO orgs.
 *
 *   Results are CACHED in Firestore (`orgLiveStatus/{orgId}`) with leader
 *   election (`nextPollAfter`): 1,000 viewers = 1 API call per interval,
 *   not 1,000. The cache TTL (5 min) serves viewers; the poll gap (15 min
 *   default) protects the quota.
 *
 *   Honest limits: the free tier supports ~2 orgs with live detection at
 *   30-min intervals. More orgs → the owner enables live detection only
 *   for flagship temples, or adds a second API key. When quota is
 *   exhausted, isChannelLive() returns null → no badge, no crash —
 *   devotees simply don't see live status until quota resets.
 *
 * Rules compliance (orgLiveStatus — verified against firestore.rules):
 *   - `isLive` must ALWAYS be a bool (never missing).
 *   - `updatedAt` must ALWAYS be a JS number (never serverTimestamp()).
 *   - keys ⊆ { orgId, isLive, videoId, title, startedAt, updatedAt, nextPollAfter }.
 *   buildStatusDoc() in pure.ts guarantees all three; every write here
 *   goes through it.
 *
 * This module never throws into UI. All failures → null.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { isChannelLive } from '../apikeys/youtubeLive';
import type { OrgLiveStatus } from './types';
import { buildStatusDoc, detectWentLive, CACHE_TTL_MS, POLL_GAP_MS } from './pure';

export {
  shouldShowLiveBadge,
  nextAartiText,
  buildStatusDoc,
  detectWentLive,
  checksPerDay,
  maxOrgsForQuota,
  ORG_LIVE_STATUS_KEYS,
  CACHE_TTL_MS,
  POLL_GAP_MS,
  YT_QUOTA_UNITS_PER_DAY,
  YT_UNITS_PER_CHECK,
} from './pure';

export interface PollOutcome {
  status: OrgLiveStatus;
  /** True on an offline→live transition (or a new live videoId). */
  wentLive: boolean;
}

/**
 * Get the live status for an org. Returns the cached Firestore doc when
 * fresh; polls YouTube (once per POLL_GAP_MS across ALL clients, via
 * leader election) when stale.
 *
 * Returns the status plus whether this poll observed an offline→live
 * transition (the caller fires notifyTempleLive on wentLive).
 */
export async function getLiveStatus(
  orgId: string,
  channelId: string,
): Promise<PollOutcome | null> {
  if (!orgId || !channelId) return null;
  try {
    const ref = doc(db, 'orgLiveStatus', orgId);
    const snap = await getDoc(ref);
    const now = Date.now();
    const cached = (snap.exists() ? (snap.data() as OrgLiveStatus) : null) as OrgLiveStatus | null;

    if (cached) {
      // Fresh cache → return it, no API call.
      if (cached.updatedAt && now - cached.updatedAt < CACHE_TTL_MS) {
        return { status: cached, wentLive: false };
      }
      // Another client is already polling → return stale, don't double-call.
      if (cached.nextPollAfter && now < cached.nextPollAfter) {
        return { status: cached, wentLive: false };
      }
    }

    // We are the leader for this round: claim the slot (rules-compliant:
    // isLive bool present, updatedAt numeric), then poll.
    await setDoc(
      ref,
      {
        orgId,
        isLive: !!cached?.isLive,
        updatedAt: now,
        nextPollAfter: now + POLL_GAP_MS,
      } as OrgLiveStatus,
      { merge: true },
    );

    const check = await isChannelLive(channelId);
    const result = buildStatusDoc(orgId, check, cached, Date.now());
    const wentLive = detectWentLive(
      cached ? { isLive: !!cached.isLive, videoId: cached.videoId } : null,
      { isLive: result.isLive, videoId: result.videoId },
    );
    await setDoc(ref, { ...result }, { merge: true });
    return { status: result, wentLive };
  } catch {
    return null;
  }
}

export type { LiveCheckResult } from './types';
