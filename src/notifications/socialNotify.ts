/**
 * notifications/socialNotify.ts — self-listen watcher for social events.
 * ============================================================================
 * The recipient's own device observes shared source data and emits
 * notifications to itself (the only pattern the self-write-only rules allow).
 *
 * Watches (all GENTLE — never pings, never breaks quiet hours):
 *   - Ashirvads on my posts → batched 90s summaries ("🪔 Meera and 3 others…")
 *   - Comments on my posts → individual ("💬 Meera commented: '…'")
 *   - New followers → generic ("🙏 A new devotee follows you")
 *   - RSVPs to my events → batched 90s summaries
 *
 * Rules honoured:
 *   - NEVER notify for my own actions.
 *   - NEVER notify for blocked/muted actors' actions.
 *   - Initial snapshots are baselines, never notifications.
 *   - A notification failure never breaks the product (fire-and-forget).
 *
 * Mount once per session (see notifications/NotificationWiring).
 */
import { useEffect, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { SocialBatcher, watcherSignature, type SocialArrival } from './socialBatcher';
import {
  notifySocialAshirvad,
  notifySocialComment,
  notifySocialFollow,
  notifySocialRsvp,
} from './notifyHelpers';
import { subscribeSafetyLists } from '../social/safetyService';

/** Max posts/events watched (keeps listener count bounded). */
const MAX_WATCHED = 20;
/** Only posts from the last 30 days get watchers (old posts don't need live buzz). */
const POST_FRESHNESS_MS = 30 * 24 * 60 * 60 * 1000;
/** Reconcile watch lists every 5 minutes (picks up new posts/events). */
const RECONCILE_MS = 5 * 60 * 1000;
/** Flush the batcher every 30s (emits summaries whose window expired). */
const FLUSH_MS = 30 * 1000;

/** In-memory name cache (devoteeProfiles is public-read). 5-min TTL. */
const nameCache = new Map<string, { name: string; at: number }>();
const NAME_TTL_MS = 5 * 60 * 1000;

async function resolveName(uid: string): Promise<string> {
  const cached = nameCache.get(uid);
  if (cached && Date.now() - cached.at < NAME_TTL_MS) return cached.name;
  try {
    const snap = await getDoc(doc(db, 'devoteeProfiles', uid));
    const name = (snap.data() as { displayName?: string } | undefined)?.displayName || 'A devotee';
    nameCache.set(uid, { name, at: Date.now() });
    return name;
  } catch {
    return 'A devotee';
  }
}

/** Subscribe to "added" docs only — the first snapshot is a baseline, never an event. */
function subscribeNewDocs(
  q: ReturnType<typeof query>,
  onAdded: (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => void,
): Unsubscribe {
  let first = true;
  return onSnapshot(
    q,
    (snap) => {
      if (first) {
        first = false;
        return;
      }
      const added = snap
        .docChanges()
        .filter((c) => c.type === 'added')
        .map((c) => ({ id: c.doc.id, data: () => c.doc.data() as Record<string, unknown> }));
      if (added.length > 0) onAdded(added);
    },
    () => {
      /* best-effort — a failed watcher simply means no notifications */
    },
  );
}

export function useSocialNotify(uid: string | null | undefined): void {
  const uidRef = useRef(uid);
  uidRef.current = uid;
  const batcherRef = useRef<SocialBatcher | null>(null);
  if (!batcherRef.current) batcherRef.current = new SocialBatcher();
  const safetyRef = useRef<{ blocked: Set<string>; muted: Set<string> }>({
    blocked: new Set(),
    muted: new Set(),
  });

  useEffect(() => {
    const myUid = uidRef.current;
    if (!myUid || myUid === 'anon') return undefined;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return undefined;

    const batcher = batcherRef.current as SocialBatcher;
    let cancelled = false;
    let unsubs: Unsubscribe[] = [];
    let flushTimer: ReturnType<typeof setInterval> | null = null;
    let reconcileTimer: ReturnType<typeof setInterval> | null = null;
    // QUEUED #38: signature of the watcher set built by the last
    // successful reconcile (day + post ids + event ids). When a later
    // reconcile computes the same signature, the existing listeners are
    // kept instead of being torn down and rebuilt — rebuilding re-bills
    // every watcher's full initial snapshot, which made reconcile the
    // largest per-user Firestore read source in the app.
    let builtSignature: string | null = null;

    const isHiddenActor = (actorUid: string): boolean =>
      actorUid === myUid ||
      safetyRef.current.blocked.has(actorUid) ||
      safetyRef.current.muted.has(actorUid);

    /** Emit any summaries whose batch window has expired. */
    const flush = () => {
      if (cancelled) return;
      const now = Date.now();
      for (const s of batcher.flushReady(now)) {
        if (s.kind === 'ashirvad') {
          void notifySocialAshirvad(myUid, s).catch(() => undefined);
        } else {
          void notifySocialRsvp(myUid, { ...s, eventTitle: s.targetLabel }).catch(() => undefined);
        }
      }
    };

    /** (Re)build all watchers from my current posts + events. */
    const reconcile = async () => {
      if (cancelled) return;

      try {
        const cutoff = Date.now() - POST_FRESHNESS_MS;

        // Fetch BOTH watched sets up-front (QUEUED #38): the rebuild
        // decision needs the full set before any listener is touched.
        // --- My recent posts → Ashirvad + comment watchers ---
        const myPostsQuery = query(
          collection(db, 'sangamPosts'),
          where('authorUid', '==', myUid),
          limit(MAX_WATCHED),
        );
        const postsDocs = await getDocs(myPostsQuery).catch(() => null);
        const fresh = postsDocs
          ? postsDocs.docs
              .map((d) => ({ id: d.id, ...(d.data() as { createdAt?: number; text?: string }) }))
              .filter((p) => (p.createdAt ?? 0) >= cutoff)
              .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
              .slice(0, MAX_WATCHED)
          : null;

        // --- My events → RSVP watchers ---
        const myEventsQuery = query(
          collection(db, 'sangamEvents'),
          where('creatorUid', '==', myUid),
          limit(MAX_WATCHED),
        );
        const eventsDocs = await getDocs(myEventsQuery).catch(() => null);
        const upcoming = eventsDocs
          ? eventsDocs.docs
              .map((d) => ({ id: d.id, ...(d.data() as { startsAt?: number; title?: string }) }))
              .filter((e) => (e.startsAt ?? 0) >= Date.now() - 24 * 60 * 60 * 1000)
              .slice(0, MAX_WATCHED)
          : null;

        if (cancelled) return;

        // QUEUED #38: if both fetches succeeded and the watched set
        // (today + fresh post ids + upcoming event ids) is exactly what
        // the live listeners already cover, keep them — a rebuild would
        // re-bill every watcher's initial snapshot for nothing. The day
        // is part of the signature so the follower watcher's dayKey
        // still rolls over at midnight. On partial fetch failure, fall
        // through to the historical rebuild-what-we-can behaviour and
        // force a fresh signature next cycle.
        let pendingSignature: string | null = null;
        if (fresh && upcoming) {
          pendingSignature = watcherSignature(
            new Date().toISOString().slice(0, 10),
            fresh.map((p) => p.id),
            upcoming.map((e) => e.id),
          );
          if (builtSignature === pendingSignature) return;
        } else {
          builtSignature = null;
        }

        // Tear down old watchers before building new ones.
        unsubs.forEach((u) => {
          try {
            u();
          } catch {
            /* best-effort */
          }
        });
        unsubs = [];

        const myPostIds: string[] = [];
        if (fresh) {
          for (const p of fresh) {
            if (cancelled) return;
            myPostIds.push(p.id);
            const postLabel = (p.text ?? '').slice(0, 60) || 'your post';

            // Ashirvad arrivals → batcher
            unsubs.push(
              subscribeNewDocs(query(collection(db, 'sangamPosts', p.id, 'ashirvad'), limit(100)), (added) => {
                for (const d of added) {
                  const data = d.data();
                  const actorUid = typeof data.uid === 'string' ? data.uid : d.id;
                  if (isHiddenActor(actorUid)) continue;
                  void resolveName(actorUid).then((actorName) => {
                    if (cancelled) return;
                    const arrival: SocialArrival = {
                      kind: 'ashirvad',
                      targetId: p.id,
                      targetLabel: postLabel,
                      actorUid,
                      actorName,
                      at: Date.now(),
                    };
                    batcher.collect(arrival);
                  });
                }
              }),
            );
          }

          // Comment arrivals on my posts → individual gentle notifications.
          // `in` takes max 10 — chunk the post ids.
          for (let i = 0; i < myPostIds.length; i += 10) {
            const chunk = myPostIds.slice(i, i + 10);
            unsubs.push(
              subscribeNewDocs(
                query(collection(db, 'sangamComments'), where('postId', 'in', chunk), limit(50)),
                (added) => {
                  for (const d of added) {
                    const data = d.data();
                    const actorUid = typeof data.authorUid === 'string' ? data.authorUid : '';
                    if (!actorUid || isHiddenActor(actorUid)) continue;
                    const authorName =
                      typeof data.authorName === 'string' ? data.authorName : 'A devotee';
                    const text = typeof data.text === 'string' ? data.text : '';
                    const postId = typeof data.postId === 'string' ? data.postId : '';
                    void notifySocialComment(myUid, {
                      commentId: d.id,
                      postId,
                      authorUid: actorUid,
                      authorName,
                      preview: text,
                    }).catch(() => undefined);
                  }
                },
              ),
            );
          }
        }

        // --- My events → RSVP watchers (fetched up-front, above) ---
        if (upcoming) {
          for (const e of upcoming) {
            if (cancelled) return;
            const eventTitle = e.title || 'your event';
            unsubs.push(
              subscribeNewDocs(query(collection(db, 'sangamEvents', e.id, 'rsvps'), limit(200)), (added) => {
                for (const d of added) {
                  const data = d.data();
                  const actorUid = typeof data.uid === 'string' ? data.uid : d.id;
                  if (isHiddenActor(actorUid)) continue;
                  void resolveName(actorUid).then((actorName) => {
                    if (cancelled) return;
                    batcher.collect({
                      kind: 'rsvp',
                      targetId: e.id,
                      targetLabel: eventTitle,
                      actorUid,
                      actorName,
                      at: Date.now(),
                    });
                  });
                }
              }),
            );
          }
        }

        // --- Follower count → generic follow notification ---
        let baseline: number | null = null;
        const dayKey = new Date().toISOString().slice(0, 10);
        unsubs.push(
          onSnapshot(
            doc(db, 'devoteeProfiles', myUid),
            (snap) => {
              if (cancelled) return;
              const count = (snap.data() as { followerCount?: number } | undefined)?.followerCount ?? 0;
              if (baseline === null) {
                baseline = count; // first snapshot is the baseline
                return;
              }
              if (count > baseline) {
                baseline = count;
                void notifySocialFollow(myUid, count, dayKey).catch(() => undefined);
              } else if (count < baseline) {
                baseline = count; // unfollows just move the baseline
              }
            },
            () => {
              /* no profile doc yet — nothing to watch */
            },
          ),
        );

        // QUEUED #38: only now — after a fully successful build — is
        // the signature committed. A build that throws midway leaves
        // the old signature in place, so the next cycle rebuilds.
        if (pendingSignature) builtSignature = pendingSignature;
      } catch {
        /* reconcile failed — watchers stay as they were; retried next cycle */
      }
    };

    // Safety lists (block/mute) — skip notifications from hidden actors.
    const unsubSafety = subscribeSafetyLists(myUid, (blocked, muted) => {
      safetyRef.current = { blocked, muted };
    });

    void reconcile();
    flushTimer = setInterval(flush, FLUSH_MS);
    reconcileTimer = setInterval(() => {
      void reconcile();
    }, RECONCILE_MS);

    return () => {
      cancelled = true;
      if (flushTimer) clearInterval(flushTimer);
      if (reconcileTimer) clearInterval(reconcileTimer);
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          /* best-effort */
        }
      });
      try {
        unsubSafety();
      } catch {
        /* best-effort */
      }
    };
    // Re-run only when the uid changes — reconcile handles post/event churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);
}
