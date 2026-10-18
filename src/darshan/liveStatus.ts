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
 * This module never throws into UI. All failures → null.
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { isChannelLive } from '../apikeys/youtubeLive';
import type { LiveCheckResult, OrgLiveStatus } from './types';

export { shouldShowLiveBadge, nextAartiText } from './pure';

/** How long a cached status is trusted before re-polling (5 min). */
export const CACHE_TTL_MS = 5 * 60 * 1000;
/** Minimum gap between API polls for one org (15 min) — quota guard. */
export const POLL_GAP_MS = 15 * 60 * 1000;

/**
 * Get the live status for an org. Returns the cached Firestore doc when
 * fresh; polls YouTube (once per POLL_GAP_MS across ALL clients) when stale.
 */
export async function getLiveStatus(
  orgId: string,
  channelId: string,
): Promise<OrgLiveStatus | null> {
  if (!orgId || !channelId) return null;
  try {
    const ref = doc(db, 'orgLiveStatus', orgId);
    const snap = await getDoc(ref);
    const now = Date.now();

    if (snap.exists()) {
      const cached = snap.data() as OrgLiveStatus;
      // Fresh cache → return it, no API call.
      if (cached.updatedAt && now - cached.updatedAt < CACHE_TTL_MS) {
        return cached;
      }
      // Another client is already polling → return stale, don't double-call.
      if (cached.nextPollAfter && now < cached.nextPollAfter) {
        return cached;
      }
    }

    // We are the leader for this round: claim the slot, then poll.
    await setDoc(
      ref,
      { orgId, nextPollAfter: now + POLL_GAP_MS, updatedAt: now } as Partial<OrgLiveStatus>,
      { merge: true },
    );

    const live = await isChannelLive(channelId);
    const result: OrgLiveStatus = {
      orgId,
      isLive: live === true,
      updatedAt: now,
      nextPollAfter: now + POLL_GAP_MS,
    };
    // When live, we keep the previous videoId/title if the API gave none
    // (isChannelLive is boolean-only); the viewer resolves the embed lazily.
    await setDoc(ref, { ...result, updatedAt: serverTimestamp() }, { merge: true });
    return { ...result };
  } catch {
    return null;
  }
}

export type { LiveCheckResult };
