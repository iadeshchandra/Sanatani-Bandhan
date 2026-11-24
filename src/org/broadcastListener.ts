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
 *  - POLLS P2a: before the generic pick, committee POLL REMINDERS are
 *    resolved by org/pollReminderFanout against the member's OWN
 *    ballot — a member who already voted never hears the reminder
 *    (neither as a poll item nor as this generic announcement), and
 *    an unvoted member hears the personal poll item instead.
 *
 * NOTE: notifyHelpers is imported LAZILY inside the checker — the emit
 * chain pulls in firebase ESM, which breaks jest at import time. Pure
 * decisions live in broadcast.ts and are unit-tested there.
 */
import {
  buildAnnouncementInput,
  broadcastDayKey,
  pickNotifications,
  BROADCAST_RECENCY_MS,
} from './broadcast';
import { fetchFollowedOrgs, fetchMyMemberships, fetchRecentBroadcasts } from './broadcastService';
import { startPollLoop } from '../lib/pollCadence';

const SEEN_KEY_PREFIX = 'sb.orgBroadcasts.seen.v1.';
const DAYCOUNT_KEY_PREFIX = 'sb.orgBroadcasts.dayCounts.v1.';
/** Ledger entries older than this are pruned (beyond the recency window). */
const LEDGER_PRUNE_MS = 8 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* NOTIFICATION WAVE 2 — per-org day-count ledger (receiver cap)       */
/* ------------------------------------------------------------------ */

/** Bells rung TODAY per org, for the ORG_DAILY_INFO_CAP pick. */
function loadDayCounts(uid: string, now: number): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${DAYCOUNT_KEY_PREFIX}${uid}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { day?: unknown; count?: unknown }>;
    const today = broadcastDayKey(now);
    const out: Record<string, number> = {};
    for (const [orgId, rec] of Object.entries(parsed ?? {})) {
      if (rec && rec.day === today && typeof rec.count === 'number' && rec.count > 0) {
        out[orgId] = rec.count;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function saveDayCounts(uid: string, counts: Record<string, number>, now: number): void {
  try {
    const today = broadcastDayKey(now);
    const rec: Record<string, { day: string; count: number }> = {};
    for (const [orgId, count] of Object.entries(counts)) {
      if (count > 0) rec[orgId] = { day: today, count };
    }
    localStorage.setItem(`${DAYCOUNT_KEY_PREFIX}${uid}`, JSON.stringify(rec));
  } catch {
    /* storage unavailable — the per-check cap still applies within a session */
  }
}

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
    const seen = loadSeen(uid);
    const baseline = seen === null;

    // POLLS NEXT-LEVEL P2a — the poll-reminder phase runs FIRST.
    // A committee poll reminder is a broadcast like any other, but
    // for a member of the org it must be resolved against the
    // member's OWN ballot before it may ring: voted → suppressed
    // (and marked handled, so the generic pick below never rings
    // it either); unvoted → a personal Suchana item instead of the
    // generic announcement. Lazy import + fail-soft, like the emit
    // chain below: a reminder failure never breaks announcements.
    let pollHandled: Record<string, number> = {};
    try {
      const fanout = await import('./pollReminderFanout');
      pollHandled = await fanout.checkPollReminders(uid, {
        now,
        baseline,
        seen: seen ?? {},
      });
    } catch {
      pollHandled = {};
    }

    const follows = await fetchFollowedOrgs(uid);
    // NOTIFICATION WAVE 4: my own membership edges join the fetch
    // set — a members/staff broadcast from an org I belong to (but
    // do not follow) must still reach me. The pick resolves the
    // audience against these edges, on my device only (law L4).
    const memberships = await fetchMyMemberships(uid);
    const fetchOrgIds = Array.from(
      new Set([...follows.map((f) => f.orgId), ...Object.keys(memberships)]),
    );
    const broadcasts =
      fetchOrgIds.length === 0
        ? []
        : await fetchRecentBroadcasts(fetchOrgIds, now - BROADCAST_RECENCY_MS);

    // NOTIFICATION WAVE 2: the per-org daily line. Poll reminders
    // never reach this pick (resolved above, their ids merged into
    // `seen`), so the cap can never mute a reminder — info only.
    const dayCounts = loadDayCounts(uid, now);
    const { notify, markSeen } = pickNotifications({
      broadcasts,
      seen: { ...(seen ?? {}), ...pollHandled },
      follows,
      now,
      baseline,
      dayCounts,
      memberships,
    });

    // Persist the seen marks FIRST — if an emit crashes midway, the
    // devotee is never re-blasted on the next check.
    saveSeen(uid, { ...(seen ?? {}), ...pollHandled, ...markSeen });
    if (notify.length === 0) return 0;

    // Lazy: the emit chain pulls in firebase — only needed when we publish.
    const { notifyOrgAnnouncement } = await import('../notifications/notifyHelpers');
    let sent = 0;
    for (const b of notify) {
      // Count the surfacing against the org's day whether or not the
      // emit lands — the broadcast is marked seen either way.
      dayCounts[b.orgId] = (dayCounts[b.orgId] ?? 0) + 1;
      try {
        await notifyOrgAnnouncement(uid, buildAnnouncementInput(b));
        sent++;
      } catch {
        /* one failed bell must not stop the others */
      }
    }
    saveDayCounts(uid, dayCounts, now);
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
 * and ticks on a jittered ~60s cadence while visible (QUEUED #38 poll
 * loop). Returns a stop function.
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
  const stopPoll = startPollLoop(() => checkOrgBroadcasts(uid), { baseMs: 60000 });

  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onForeground);
    window.removeEventListener('focus', onForeground);
    stopPoll();
  };
}
