/**
 * org/broadcastService.ts — Firestore side of org broadcast fan-out.
 * ============================================================================
 * Pure logic lives in broadcast.ts; the self-listen watcher in
 * broadcastListener.ts; the trustee UI in OrgBroadcastManager.tsx.
 *
 * Data model: ONE doc per broadcast in `orgBroadcasts/{id}`.
 * ⚠️ NEW COLLECTION (QUEUED #14) — flagged for the owner per standing law.
 * Proposed rules (NOT yet in firestore.rules — writes fail closed until
 * the owner approves and they land):
 *
 *   match /orgBroadcasts/{broadcastId} {
 *     allow read: if true;                       // announcements are public
 *     allow create: if isOrgTrustee(request.resource.data.get('orgId', ''))
 *       && request.resource.data.keys().hasOnly(
 *         ['orgId', 'orgName', 'title', 'body', 'createdBy', 'createdByName',
 *          'audienceCount', 'createdAt'])
 *       && request.resource.data.get('createdBy', '') == request.auth.uid
 *       && request.resource.data.get('title', '') != ''
 *       && request.resource.data.get('audienceCount', 0) is number
 *       && request.resource.data.get('createdAt', 0) is number;
 *     allow update: if false;                    // a broadcast is a sent letter
 *     allow delete: if isSuperAdmin()
 *       || isOrgTrustee(resource.data.get('orgId', ''));
 *   }
 *
 * `createdAt` is epoch ms (client clock) — the same convention as
 * followers.followedAt — so queries need no composite index: history is
 * a single-field `orgId` query sorted client-side, and the watcher uses
 * chunked `orgId in [...]` + `createdAt > since` with client-side sort.
 */
import {
  addDoc,
  collection,
  collectionGroup,
  getCountFromServer,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  buildBroadcastDoc,
  chunkOrgIds,
  isStaffBroadcastRole,
  broadcastRoleMatches,
  normalizeFollowedOrgs,
  sortBroadcastsNewestFirst,
  toEpochMs,
  BROADCAST_HISTORY_LIMIT,
  type BroadcastAudience,
  type OrgBroadcast,
  type OrgFollow,
} from './broadcast';

const COLLECTION = 'orgBroadcasts';

/** Map a Firestore doc snapshot to an OrgBroadcast (defensive, fail-soft). */
function fromDoc(id: string, data: Record<string, unknown> | undefined): OrgBroadcast | null {
  if (!data || typeof data.orgId !== 'string' || typeof data.title !== 'string') return null;
  return {
    id,
    orgId: data.orgId,
    orgName: typeof data.orgName === 'string' ? data.orgName : '',
    title: data.title,
    body: typeof data.body === 'string' ? data.body : '',
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdByName: typeof data.createdByName === 'string' ? data.createdByName : '',
    audienceCount: typeof data.audienceCount === 'number' ? data.audienceCount : 0,
    createdAt: toEpochMs(data.createdAt),
    // Wave 4 addressing — anything unreadable resolves DOWN to the
    // legacy 'followers' audience (the doc's pre-Wave-4 meaning).
    audience:
      data.audience === 'members' || data.audience === 'staff' ? data.audience : 'followers',
    ...(typeof data.audienceRole === 'string' && data.audienceRole
      ? { audienceRole: data.audienceRole }
      : {}),
  };
}

/** REAL current follower count for an org (server count, never estimated). */
export async function fetchAudienceCount(orgId: string): Promise<number> {
  try {
    const snap = await getCountFromServer(collection(db, 'followers', orgId, 'users'));
    return snap.data().count;
  } catch {
    return 0;
  }
}

/** REAL current member count for an org (workspaceMembers roll). */
export async function fetchMemberCount(orgId: string): Promise<number> {
  try {
    const snap = await getCountFromServer(
      query(collection(db, 'workspaceMembers'), where('workspaceId', '==', orgId)),
    );
    return snap.data().count;
  } catch {
    return 0;
  }
}

/**
 * The org's membership edges as raw roles (trustee-side read — the
 * rules allow a trustee to read their own org's roll). Capped so a
 * very large roll degrades to a partial count rather than a hang.
 */
async function fetchOrgMemberRoles(orgId: string): Promise<string[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'workspaceMembers'), where('workspaceId', '==', orgId), limit(1000)),
    );
    const roles: string[] = [];
    snap.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      roles.push(typeof data.role === 'string' ? data.role : '');
    });
    return roles;
  } catch {
    return [];
  }
}

/**
 * NOTIFICATION WAVE 4 — the REAL size of the ADDRESSED audience,
 * counted with the same predicate receivers resolve with, so the
 * number the composer shows is the number that can actually be
 * reached: followers → the followers store; members → the roll;
 * staff → roll edges carrying a staff role (and the named role
 * when narrowed). Never estimated, never a delivery stat.
 */
export async function fetchBroadcastAudienceCount(
  orgId: string,
  audience: BroadcastAudience,
  audienceRole?: string,
): Promise<number> {
  if (audience === 'followers') return fetchAudienceCount(orgId);
  if (audience === 'members') return fetchMemberCount(orgId);
  const roles = await fetchOrgMemberRoles(orgId);
  return roles.filter((r) =>
    audienceRole ? broadcastRoleMatches(r, audienceRole) : isStaffBroadcastRole(r),
  ).length;
}

/**
 * MY OWN membership edges (orgId → my role), for the watcher's
 * receiver-side audience resolution. Each user reads only their
 * own edges (the rules allow exactly that); fail-soft to {} —
 * with no edges, members/staff broadcasts simply never candidate.
 */
export async function fetchMyMemberships(uid: string): Promise<Record<string, string>> {
  if (!uid) return {};
  try {
    const snap = await getDocs(
      query(collection(db, 'workspaceMembers'), where('uid', '==', uid)),
    );
    const out: Record<string, string> = {};
    snap.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      if (typeof data.workspaceId === 'string' && data.workspaceId) {
        out[data.workspaceId] = typeof data.role === 'string' ? data.role : '';
      }
    });
    return out;
  } catch {
    return {};
  }
}

/**
 * Publish a broadcast. Snapshots the REAL count of the ADDRESSED
 * audience at send time (the campaign's only count — delivery/read
 * stats are never invented). Returns the new broadcast (with its
 * id). Throws on failure so the composer can show an honest error.
 */
export async function publishBroadcast(args: {
  orgId: string;
  orgName: string;
  title: string;
  body?: string;
  createdBy: string;
  createdByName: string;
  audience?: BroadcastAudience;
  audienceRole?: string;
}): Promise<OrgBroadcast> {
  const audienceCount = await fetchBroadcastAudienceCount(
    args.orgId,
    args.audience ?? 'followers',
    args.audienceRole,
  );
  const docData = buildBroadcastDoc({ ...args, audienceCount, createdAt: Date.now() });
  const ref = await addDoc(collection(db, COLLECTION), docData);
  return { id: ref.id, ...docData };
}

/**
 * Campaign history for one org — most recent first. Single-field query +
 * client sort, so no composite index is needed on Spark.
 */
export async function listBroadcastHistory(
  orgId: string,
  max: number = BROADCAST_HISTORY_LIMIT,
): Promise<OrgBroadcast[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where('orgId', '==', orgId), limit(100)),
  );
  const all: OrgBroadcast[] = [];
  snap.forEach((d) => {
    const b = fromDoc(d.id, d.data() as Record<string, unknown>);
    if (b) all.push(b);
  });
  return sortBroadcastsNewestFirst(all).slice(0, max);
}

/**
 * The orgs this devotee follows, resolved from the followers subcollection
 * (orgId lives in the doc path: followers/{orgId}/users/{uid}). The
 * `followedAt` field guard keeps stray `users` docs from other
 * subcollections out of the result.
 */
export async function fetchFollowedOrgs(uid: string): Promise<OrgFollow[]> {
  if (!uid) return [];
  const snap = await getDocs(query(collectionGroup(db, 'users'), where('uid', '==', uid)));
  const raw: Array<{ orgId?: string | null; followedAt?: unknown }> = [];
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    if (data.followedAt === undefined) return; // not a follow doc
    raw.push({ orgId: d.ref.parent.parent?.id ?? null, followedAt: data.followedAt });
  });
  return normalizeFollowedOrgs(raw);
}

/**
 * NOTIFICATION WAVE 2 — one org's broadcasts since an epoch ms
 * (the composer's "announcements today" count). Same single-org
 * query shape as the history fetch; fail-soft to an empty list.
 */
export async function fetchBroadcastsSince(orgId: string, sinceMs: number): Promise<OrgBroadcast[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTION),
        where('orgId', '==', orgId),
        where('createdAt', '>', sinceMs),
        limit(100),
      ),
    );
    const out: OrgBroadcast[] = [];
    snap.forEach((d) => {
      const b = fromDoc(d.id, d.data() as Record<string, unknown>);
      if (b) out.push(b);
    });
    return out;
  } catch {
    return [];
  }
}

/**
 * Recent broadcasts across followed orgs (watcher fetch). Chunked `in`
 * queries; recency window applied server-side via createdAt, ordering
 * client-side. Fail-soft per chunk: one bad chunk never silences the rest.
 */
export async function fetchRecentBroadcasts(orgIds: string[], sinceMs: number): Promise<OrgBroadcast[]> {
  const out: OrgBroadcast[] = [];
  for (const chunk of chunkOrgIds(orgIds)) {
    try {
      const snap = await getDocs(
        query(
          collection(db, COLLECTION),
          where('orgId', 'in', chunk),
          where('createdAt', '>', sinceMs),
          limit(50),
        ),
      );
      snap.forEach((d) => {
        const b = fromDoc(d.id, d.data() as Record<string, unknown>);
        if (b) out.push(b);
      });
    } catch {
      /* best-effort — a failed chunk simply means no bells for those orgs */
    }
  }
  return out;
}
