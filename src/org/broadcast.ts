/**
 * org/broadcast.ts — Org broadcast fan-out (pure logic).
 * ============================================================================
 * QUEUED #14. Orgs could compose "broadcasts" before (GodMode messages,
 * WhatsApp desk) but nothing ever reached devotees in-app: GodMode fan-out
 * stopped at a single-user inbox, and the WhatsApp desk simulated dispatch.
 * Meanwhile `notifyOrgAnnouncement()` sat in notifyHelpers waiting for a
 * "(future) trustee broadcast module" to call it. This is that module.
 *
 * Architecture (Spark-honest, $0):
 *  - A trustee publishes ONE doc to `orgBroadcasts/{id}` (see
 *    broadcastService.ts). ⚠️ NEW COLLECTION — rules flagged for the owner;
 *    writes fail closed until the rules block lands.
 *  - Fan-out is SELF-LISTEN (the only pattern the self-write-only
 *    `notifications/{uid}/items` rules allow): each follower's device
 *    observes broadcasts from orgs they follow and emits to its OWN inbox
 *    via notifyOrgAnnouncement (IMPORTANT tier, announcements_enabled
 *    kill-switch + quiet-hours already wired in the helper/center).
 *  - Campaign history = the org's own docs in that collection. The only
 *    count stored is `audienceCount` — the REAL follower count snapshotted
 *    at publish time. No invented delivery/read metrics.
 *
 * This file is firebase-free and jest-safe; Firestore lives in
 * broadcastService.ts, the watcher in broadcastListener.ts.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** One published org broadcast (a doc in `orgBroadcasts`). */
export interface OrgBroadcast {
  id: string;
  orgId: string;
  orgName: string;
  title: string;
  /** Longer message text; '' when the trustee wrote only a headline. */
  body: string;
  createdBy: string;
  createdByName: string;
  /** REAL follower count at publish time (snapshot). Never a delivery stat. */
  audienceCount: number;
  /** Epoch ms (client clock, matching the codebase's now() convention). */
  createdAt: number;
}

/** The exact field set written to Firestore — whitelist, nothing else. */
export type OrgBroadcastDoc = Omit<OrgBroadcast, 'id'>;

/** An org the devotee follows, with when they followed (epoch ms). */
export interface OrgFollow {
  orgId: string;
  followedAt: number;
}

/* ------------------------------------------------------------------ */
/* Limits & windows                                                    */
/* ------------------------------------------------------------------ */

export const BROADCAST_TITLE_MAX = 120;
export const BROADCAST_BODY_MAX = 1000;
/** Broadcast history shown to trustees (most recent first). */
export const BROADCAST_HISTORY_LIMIT = 20;
/** A broadcast older than this never notifies — history is not a blast. */
export const BROADCAST_RECENCY_MS = 48 * 60 * 60 * 1000;
/** Max bells per watcher check — a returning devotee is greeted, not flooded. */
export const MAX_NOTIFY_PER_CHECK = 3;
/** Small clock-skew grace around follow time / future timestamps. */
export const FOLLOW_GRACE_MS = 5 * 60 * 1000;
/** Firestore `in` queries accept at most 10 values (30 on newer SDKs; 10 is safe). */
export const ORG_QUERY_CHUNK = 10;

/* ------------------------------------------------------------------ */
/* Composer validation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Validate trustee composer input. Returns a stable error code or null.
 * Codes (not prose) so the UI can render trilingual copy.
 */
export function validateBroadcastInput(input: { title: string; body?: string }): string | null {
  const title = (input.title ?? '').trim();
  const body = (input.body ?? '').trim();
  if (title.length === 0) return 'title_required';
  if (title.length > BROADCAST_TITLE_MAX) return 'title_too_long';
  if (body.length > BROADCAST_BODY_MAX) return 'body_too_long';
  return null;
}

/**
 * Build the exact Firestore doc for a broadcast. Whitelist-exact: no
 * undefined values, no extra keys (the proposed rules pin this key set).
 * Throws on invalid input — callers validate first for friendly errors.
 */
export function buildBroadcastDoc(args: {
  orgId: string;
  orgName: string;
  title: string;
  body?: string;
  createdBy: string;
  createdByName: string;
  audienceCount: number;
  createdAt: number;
}): OrgBroadcastDoc {
  const err = validateBroadcastInput({ title: args.title, body: args.body });
  if (err) throw new Error(`Invalid broadcast: ${err}`);
  if (!args.orgId) throw new Error('Invalid broadcast: org_required');
  if (!args.createdBy) throw new Error('Invalid broadcast: author_required');
  return {
    orgId: args.orgId,
    orgName: args.orgName ?? '',
    title: args.title.trim(),
    body: (args.body ?? '').trim(),
    createdBy: args.createdBy,
    createdByName: args.createdByName ?? '',
    audienceCount: Math.max(0, Math.floor(args.audienceCount) || 0),
    createdAt: args.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* Followed-org extraction (from followers/{orgId}/users/{uid} docs)  */
/* ------------------------------------------------------------------ */

/** Coerce a Firestore-ish timestamp (number | Timestamp | Date) to epoch ms. */
export function toEpochMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object') {
    const v = value as { toMillis?: () => number; seconds?: number };
    if (typeof v.toMillis === 'function') {
      const ms = v.toMillis();
      if (Number.isFinite(ms)) return ms;
    }
    if (typeof v.seconds === 'number') return v.seconds * 1000;
  }
  return 0;
}

/**
 * Normalize raw followed-org candidates (orgId resolved from the doc path
 * by the service, followedAt from the doc body) into a deduped list.
 * Junk rows (no orgId) are dropped; duplicate orgs keep the EARLIEST
 * followedAt (the devotee's true follow start).
 */
export function normalizeFollowedOrgs(
  raw: Array<{ orgId?: string | null; followedAt?: unknown }>,
): OrgFollow[] {
  const byOrg = new Map<string, number>();
  for (const row of raw ?? []) {
    const orgId = typeof row?.orgId === 'string' ? row.orgId.trim() : '';
    if (!orgId) continue;
    const at = toEpochMs(row?.followedAt);
    const prev = byOrg.get(orgId);
    if (prev === undefined || at < prev) byOrg.set(orgId, at);
  }
  return [...byOrg.entries()].map(([orgId, followedAt]) => ({ orgId, followedAt }));
}

/* ------------------------------------------------------------------ */
/* Watcher decision — which broadcasts become bells                    */
/* ------------------------------------------------------------------ */

export interface PickResult {
  /** Broadcasts to emit now, oldest first, capped at MAX_NOTIFY_PER_CHECK. */
  notify: OrgBroadcast[];
  /** id → createdAt for EVERY candidate, so nothing ever re-fires. */
  markSeen: Record<string, number>;
}

/**
 * Decide what a watcher check should do.
 *
 * Laws:
 *  - Only broadcasts from followed orgs are candidates at all.
 *  - EVERY candidate is marked seen (even ones that don't notify) so
 *    history can never re-blast on the next check.
 *  - On the very first check (`baseline`), nothing notifies — the
 *    devotee's existing world is a baseline, not a backlog (same law as
 *    socialNotify's initial snapshots).
 *  - A broadcast notifies only when it is fresh (within RECENCY), was
 *    published after the devotee followed the org (small grace), and was
 *    not seen before.
 *  - At most MAX_NOTIFY_PER_CHECK bells, oldest first; overflow is
 *    marked seen without a bell (better silent than a flood).
 */
export function pickNotifications(args: {
  broadcasts: OrgBroadcast[];
  seen: Record<string, number>;
  follows: OrgFollow[];
  now: number;
  baseline: boolean;
}): PickResult {
  const followByOrg = new Map(args.follows.map((f) => [f.orgId, f.followedAt]));
  const markSeen: Record<string, number> = {};
  const eligible: OrgBroadcast[] = [];

  for (const b of args.broadcasts ?? []) {
    if (!b || typeof b.id !== 'string' || typeof b.orgId !== 'string') continue;
    const followedAt = followByOrg.get(b.orgId);
    if (followedAt === undefined) continue; // not my org — not a candidate
    markSeen[b.id] = b.createdAt;
    if (args.baseline) continue;
    if (args.seen && args.seen[b.id] !== undefined) continue;
    if (typeof b.createdAt !== 'number' || !Number.isFinite(b.createdAt)) continue;
    if (b.createdAt < args.now - BROADCAST_RECENCY_MS) continue; // too old
    if (b.createdAt > args.now + FOLLOW_GRACE_MS) continue; // future/clock skew
    if (b.createdAt < followedAt - FOLLOW_GRACE_MS) continue; // before I followed
    eligible.push(b);
  }

  eligible.sort((a, b) => a.createdAt - b.createdAt); // oldest first
  return { notify: eligible.slice(0, MAX_NOTIFY_PER_CHECK), markSeen };
}

/* ------------------------------------------------------------------ */
/* Notification input (feeds notifyOrgAnnouncement)                    */
/* ------------------------------------------------------------------ */

/** Shape consumed by notifyHelpers.notifyOrgAnnouncement. */
export interface AnnouncementInput {
  orgId: string;
  orgName: string;
  title: string;
  announcementId: string;
  message?: string;
}

/**
 * Map a broadcast to the announcement emitter's input. The headline
 * rides the warmCopy `{title}` body; the full message (when written)
 * overrides the notification body so followers read the whole sandesh
 * without opening the app page.
 */
export function buildAnnouncementInput(b: OrgBroadcast): AnnouncementInput {
  return {
    orgId: b.orgId,
    orgName: b.orgName,
    title: b.title,
    announcementId: b.id,
    ...(b.body ? { message: b.body } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* History helpers                                                     */
/* ------------------------------------------------------------------ */

/** Most recent first; stable for equal timestamps. */
export function sortBroadcastsNewestFirst(list: OrgBroadcast[]): OrgBroadcast[] {
  return [...(list ?? [])].sort((a, b) => b.createdAt - a.createdAt);
}

/** Split org ids into Firestore-`in`-sized chunks. */
export function chunkOrgIds(ids: string[], size: number = ORG_QUERY_CHUNK): string[][] {
  const out: string[][] = [];
  const clean = [...new Set((ids ?? []).filter((s) => typeof s === 'string' && s.length > 0))];
  const step = Math.max(1, Math.floor(size) || ORG_QUERY_CHUNK);
  for (let i = 0; i < clean.length; i += step) out.push(clean.slice(i, i + step));
  return out;
}
