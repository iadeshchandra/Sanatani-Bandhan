/**
 * org/broadcastListener.ts — self-listen fan-out for org broadcasts.
 * ============================================================================
 * QUEUED #14. The recipient-side half of the broadcast system: a trustee
 * publishes ONE doc (broadcastService.ts); every follower's OWN device
 * observes it here and emits to its OWN notification inbox via
 * notifyOrgAnnouncement — the only fan-out pattern the self-write-only
 * `notifications/{uid}/items` rules allow (see notifications/emit.ts).
 *
 * Laws honoured:
 *  - IMPORTANT tier via the existing helper — but the helper's
 *    announcements_enabled kill-switch and the center's quiet-hours
 *    engine both apply, so a 4am broadcast never wakes anyone.
 *  - Baseline law: the FIRST check on a device marks everything seen and
 *    notifies nothing (mirrors socialNotify's initial snapshots). A new
 *    follower is never blasted with an org's back-catalogue.
 *  - One bell per broadcast, ever: a per-user seen ledger (localStorage)
 *    + the center's dedupeKey `organn:{announcementId}` backstop.
 *  - Honest PWA limit: checks run on boot, on foreground, and on a 60s
 *    tick while the app is open (same pattern as aartiReminders).
 *    Broadcasts arrive when the devotee next opens the app — the trustee
 *    composer says exactly that.
 *
 * NOTE: notifyHelpers is imported LAZILY inside the checker — the emit
 * chain pulls in firebase ESM, which breaks jest at import time. Pure
 * decisions live in broadcast.ts and are unit-tested there.
 */
import {
  buildAnnouncementInput,
  pickNotifications,
  BROADCAST_RECENCY_MS,
} from './broadcast';
import { fetchFollowedOrgs, fetchRecentBroadcasts } from './broadcastService';

const SEEN_KEY_PREFIX = 'sb.orgBroadcasts.seen.v1.';
/** Ledger entries older than this are pruned (beyond the recency window). */
const LEDGER_PRUNE_MS = 8 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Seen ledger (fail-open: storage problems never break the app)       */
/* ------------------------------------------------------------------ */

function seenKey(uid: string): string {
  return `${SEEN_KEY_PREFIX}${uid}`;
}

function loadSeen(uid: string): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(seenKey(uid));
    if (!raw) return null; // null = never checked → baseline run
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {}; // corrupt storage → treat as checked, never re-blast
  }
}

function saveSeen(uid: string, seen: Record<string, number>): void {
  try {
    const cutoff = Date.now() - LEDGER_PRUNE_MS;
    const pruned: Record<string, number> = {};
    for (const [k, v] of Object.entries(seen)) if (v > cutoff) pruned[k] = v;
    localStorage.setItem(seenKey(uid), JSON.stringify(pruned));
  } catch {
    /* storage unavailable — the center's dedupeKey still prevents doubles */
  }
}

/* ------------------------------------------------------------------ */
/* Checker                                                             */
/* ------------------------------------------------------------------ */

/**
 * One fan-out check for a devotee. Returns how many bells were emitted.
 * Fire-and-forget safe: never throws.
 */
export async function checkOrgBroadcasts(uid: string, opts: { now?: number } = {}): Promise<number> {
  if (!uid || uid === 'anon') return 0;
  const now = opts.now ?? Date.now();
  try {
    const follows = await fetchFollowedOrgs(uid);
    if (follows.length === 0) return 0;

    const broadcasts = await fetchRecentBroadcasts(
      follows.map((f) => f.orgId),
      now - BROADCAST_RECENCY_MS,
    );
    if (broadcasts.length === 0) return 0;

    const seen = loadSeen(uid);
    const baseline = seen === null;
    const { notify, markSeen } = pickNotifications({
      broadcasts,
      seen: seen ?? {},
      follows,
      now,
      baseline,
    });

    // Persist the seen marks FIRST — if an emit crashes midway, the
    // devotee is never re-blasted on the next check.
    saveSeen(uid, { ...(seen ?? {}), ...markSeen });
    if (notify.length === 0) return 0;

    // Lazy: the emit chain pulls in firebase — only needed when we publish.
    const { notifyOrgAnnouncement } = await import('../notifications/notifyHelpers');
    let sent = 0;
    for (const b of notify) {
      try {
        await notifyOrgAnnouncement(uid, buildAnnouncementInput(b));
        sent++;
      } catch {
        /* one failed bell must not stop the others */
      }
    }
    return sent;
  } catch {
    return 0; // a notification failure never breaks the product
  }
}

/* ------------------------------------------------------------------ */
/* Self-listen watcher — boot + foreground + gentle tick               */
/* ------------------------------------------------------------------ */

/**
 * Start the broadcast watcher (mirrors startAartiReminderNotify):
 * runs once on start, again whenever the app returns to the foreground,
 * and ticks every 60s while visible. Returns a stop function.
 */
export function startOrgBroadcastNotify(uid: string | null): () => void {
  if (!uid || uid === 'anon') return () => undefined;

  let stopped = false;
  const run = () => {
    if (stopped) return;
    void checkOrgBroadcasts(uid);
  };

  run();
  const onForeground = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    run();
  };
  document.addEventListener('visibilitychange', onForeground);
  window.addEventListener('focus', onForeground);
  const tick =
    typeof window !== 'undefined'
      ? window.setInterval(() => {
          if (typeof document === 'undefined' || document.visibilityState !== 'hidden') run();
        }, 60000)
      : null;

  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onForeground);
    window.removeEventListener('focus', onForeground);
    if (tick !== null) window.clearInterval(tick);
  };
}
