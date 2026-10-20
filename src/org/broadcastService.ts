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
  normalizeFollowedOrgs,
  sortBroadcastsNewestFirst,
  toEpochMs,
  BROADCAST_HISTORY_LIMIT,
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

/**
 * Publish a broadcast. Snapshots the REAL follower count at send time
 * (the campaign's only count — delivery/read stats are never invented).
 * Returns the new broadcast (with its id). Throws on failure so the
 * composer can show an honest error.
 */
export async function publishBroadcast(args: {
  orgId: string;
  orgName: string;
  title: string;
  body?: string;
  createdBy: string;
  createdByName: string;
}): Promise<OrgBroadcast> {
  const audienceCount = await fetchAudienceCount(args.orgId);
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
