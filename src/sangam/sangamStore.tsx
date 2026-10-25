import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection, collectionGroup, doc, setDoc, getDocs, query, orderBy, limit, where,
  serverTimestamp, deleteDoc, onSnapshot, updateDoc, increment, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  SangamPost, SangamComment, SangamCircle, SangamEvent,
  SangamFollow, SangamReport, PostKind, AuthorKind, VerificationTier, ServiceCardDetails,
  SevaDetails, SangamRsvpState,
} from './types';
import { DEMO_AUTHOR_SUFFIX } from './types';
import { toCloudComment, mergeComments, nextCommentCount } from './comments';
import { toCloudPost, toCloudPostEdit, toCloudCommentEdit, toCloudFollow, toCloudCircle, toCloudEvent, toCloudReport } from './serializers';
import { applyPostEdit, applyCommentEdit, removeComment, removePost } from './edits';
import { applyMyVolunteerships, extractVolunteerPostIds, volunteerPostIdFromRef } from './sevaKarma';

/* Sangam store — the community's shared memory.
 * =====================================================================
 * OFFLINE-FIRST, HONEST: the feed reads from a local cache first and
 * syncs to Firestore best-effort (mirroring SoloContext's pattern).
 * Everything the user creates is kept locally and marked localOnly
 * until a sync succeeds. The UI labels offline state plainly — the
 * feed never pretends to be live when it isn't.
 *
 * Session-kind separation: this provider lives ONLY inside the Solo
 * (personal) shell. Organisation internals can never reach it.
 */

const now = () => Date.now();
const rid = (p: string) => `${p}_${now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export interface ComposeInput {
  kind: PostKind;
  text: string;
  imageUrl?: string;
  shlokaRef?: string;
  seva?: SevaDetails;
  serviceCard?: ServiceCardDetails;
  eventRef?: string;
}

export interface AuthorInfo {
  uid: string;
  name: string;
  sanId: string;
  kind: AuthorKind;
  roleId?: string;
  tier?: VerificationTier;
}

interface SangamState {
  posts: SangamPost[];
  comments: Record<string, SangamComment[]>; // postId -> comments
  circles: SangamCircle[];
  events: SangamEvent[];
  follows: SangamFollow[];
  online: boolean;
  lastSyncedAt: number | null;
}

interface SangamContextType extends SangamState {
  createPost: (author: AuthorInfo, input: ComposeInput, asOrg?: { orgId: string; orgName: string }) => Promise<SangamPost>;
  /** Author edit of own post — rules allow text/imageUrl/updatedAt only. */
  editPost: (postId: string, edits: { text: string; imageUrl?: string }) => Promise<void>;
  /** Author delete of own post (rules: author may delete own posts; SuperAdmin any). */
  deletePost: (postId: string) => Promise<void>;
  toggleAshirvad: (postId: string, uid: string) => Promise<void>;
  addComment: (postId: string, author: AuthorInfo, text: string) => Promise<void>;
  /** Author edit of own comment (rules: author may update own comments). */
  editComment: (postId: string, commentId: string, text: string) => Promise<void>;
  /** Author delete of own comment (rules: author may delete own comments). */
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  sharePost: (post: SangamPost, author: AuthorInfo, note: string) => Promise<void>;
  followTarget: (followerUid: string, targetType: 'org' | 'purohit' | 'jyotish', targetId: string, targetName: string) => Promise<void>;
  unfollowTarget: (followId: string) => Promise<void>;
  isFollowing: (targetType: string, targetId: string) => boolean;
  joinCircle: (circleId: string, uid: string) => Promise<void>;
  createCircle: (uid: string, name: string, circleName: string, topic: string, description: string) => Promise<SangamCircle>;
  rsvpEvent: (eventId: string, uid: string) => Promise<void>;
  /**
   * EVENTS P1 — set (or clear, with null) my RSVP state on an event.
   * 'going' is the only counted state; asking for 'going' on a full
   * event honestly lands as 'waitlisted'. Returns the state that
   * actually landed.
   */
  setRsvpState: (eventId: string, uid: string, state: SangamRsvpState | null) => Promise<SangamRsvpState | null>;
  /** EVENTS P1 — my current state on an event (null = no RSVP). */
  myEventState: (eventId: string) => SangamRsvpState | null;
  /**
   * EVENTS P1 — the organiser's RSVP rows for one event, read from
   * the real subcollection. Callers gate this to the event's creator
   * / committee — the UI never offers the list to ordinary members.
   */
  loadEventRsvps: (eventId: string) => Promise<{ uid: string; state: SangamRsvpState; at: number | null }[]>;
  createEvent: (author: AuthorInfo, e: Omit<SangamEvent, 'id' | 'creatorUid' | 'creatorName' | 'rsvpCount' | 'createdAt'>) => Promise<SangamEvent>;
  volunteerSeva: (postId: string, uid: string) => Promise<void>;
  reportContent: (reporterUid: string, reporterName: string, targetType: SangamReport['targetType'], targetId: string, reason: SangamReport['reason'], details?: string) => Promise<void>;
  myReports: (uid: string) => SangamReport[];
  refresh: () => Promise<void>;
  /** Live comment subscription for a post's thread. Returns unsubscribe. */
  subscribeComments: (postId: string) => () => void;
}

const Ctx = createContext<SangamContextType | null>(null);

const FEED_KEY = 'sb_sangam_feed_v1';
const CIRCLES_KEY = 'sb_sangam_circles_v1';
const EVENTS_KEY = 'sb_sangam_events_v1';

const readLS = <T,>(k: string, fb: T): T => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch { return fb; }
};
const writeLS = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full — session continues */ }
};

/** Warm, clearly-labeled community preview — never impersonating real people. */
function seedPosts(): SangamPost[] {
  const t = now();
  return [
    {
      id: 'seed_post_1', authorUid: 'seed', authorName: `Kashi Vishwanath Mandir ${DEMO_AUTHOR_SUFFIX}`,
      authorSanId: 'ORG-SEED', authorKind: 'org', orgId: 'seed-org-1', orgName: 'Kashi Vishwanath Mandir',
      isOfficialPagePost: true, kind: 'event',
      text: 'Maha Shivaratri — special abhishek slots open. Darshan tokens from the Tirth desk; all are welcome. Har Har Mahadev! 🪔',
      createdAt: t - 1000 * 60 * 42, ashirvadCount: 214, commentCount: 18, shareCount: 31,
      ashirvadBy: [], visibility: 'public', status: 'active', localOnly: true,
    },
    {
      id: 'seed_post_2', authorUid: 'seed', authorName: `Pt. Ramesh Shastri ${DEMO_AUTHOR_SUFFIX}`,
      authorSanId: 'PUR-SEED', authorKind: 'purohit', authorRoleId: 'PUR-SEED', authorTier: 'PLATFORM_VERIFIED',
      isOfficialPagePost: false, kind: 'shloka',
      text: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nYou have a right to your actions, but never to their fruits. — Bhagavad Gita 2.47',
      shlokaRef: 'Bhagavad Gita 2.47',
      createdAt: t - 1000 * 60 * 60 * 3, ashirvadCount: 96, commentCount: 7, shareCount: 12,
      ashirvadBy: [], visibility: 'public', status: 'active', localOnly: true,
    },
    {
      id: 'seed_post_3', authorUid: 'seed', authorName: `Meera Devi ${DEMO_AUTHOR_SUFFIX}`,
      authorSanId: 'SAN-SEED', authorKind: 'devotee',
      isOfficialPagePost: false, kind: 'seva',
      text: 'Sunday annadanam at the riverside ghat — we need 6 volunteers for serving and cleanup. Every hand counts. 🙏',
      seva: { slots: 12, slotsTaken: 6, hoursEach: 3, venue: 'Riverside ghat', date: new Date(t + 4 * 86400000).toISOString().slice(0, 10) },
      createdAt: t - 1000 * 60 * 60 * 7, ashirvadCount: 58, commentCount: 11, shareCount: 9,
      ashirvadBy: [], volunteers: [], visibility: 'public', status: 'active', localOnly: true,
    },
    {
      id: 'seed_post_4', authorUid: 'seed', authorName: `Ananda Ashram ${DEMO_AUTHOR_SUFFIX}`,
      authorSanId: 'ORG-SEED', authorKind: 'org', orgId: 'seed-org-2', orgName: 'Ananda Ashram',
      isOfficialPagePost: true, kind: 'text',
      text: 'Guru Purnima satsang this Sunday — bhajan sandhya from 5 PM, followed by prasad. All sadhaks welcome. 🪔',
      createdAt: t - 1000 * 60 * 60 * 26, ashirvadCount: 143, commentCount: 22, shareCount: 17,
      ashirvadBy: [], visibility: 'public', status: 'active', localOnly: true,
    },
  ];
}

function seedCircles(): SangamCircle[] {
  const t = now();
  return [
    { id: 'seed_circle_1', name: 'Morning Bhajan Circle', topic: 'bhajan', description: 'Daily morning bhajans and kirtan — all voices welcome.', creatorUid: 'seed', creatorName: `Meera Devi ${DEMO_AUTHOR_SUFFIX}`, memberCount: 128, members: [], createdAt: t - 86400000 * 30, localOnly: true },
    { id: 'seed_circle_2', name: 'Gita Study Group', topic: 'shastra', description: 'One shloka a day, discussed with humility and curiosity.', creatorUid: 'seed', creatorName: `Pt. Ramesh Shastri ${DEMO_AUTHOR_SUFFIX}`, memberCount: 86, members: [], createdAt: t - 86400000 * 21, localOnly: true },
    { id: 'seed_circle_3', name: 'Seva Hands', topic: 'seva', description: 'Coordinating annadanam, cleanups, and festival volunteering.', creatorUid: 'seed', creatorName: `Ananda Ashram ${DEMO_AUTHOR_SUFFIX}`, memberCount: 203, members: [], createdAt: t - 86400000 * 12, localOnly: true },
  ];
}

function seedEvents(): SangamEvent[] {
  const t = now();
  return [
    { id: 'seed_event_1', title: 'Guru Purnima Satsang', kind: 'satsang', description: 'Bhajan sandhya from 5 PM, followed by prasad.', venue: 'Ananda Ashram hall', startsAt: t + 86400000 * 5, orgId: 'seed-org-2', orgName: 'Ananda Ashram', isOfficial: true, creatorUid: 'seed', creatorName: `Ananda Ashram ${DEMO_AUTHOR_SUFFIX}`, rsvpCount: 74, rsvps: [], createdAt: t - 86400000 * 2, localOnly: true },
    { id: 'seed_event_2', title: 'Sunday Annadanam', kind: 'seva', description: 'Community meal service — volunteers and diners welcome.', venue: 'Riverside ghat', startsAt: t + 86400000 * 4, isOfficial: false, creatorUid: 'seed', creatorName: `Meera Devi ${DEMO_AUTHOR_SUFFIX}`, rsvpCount: 31, rsvps: [], createdAt: t - 86400000, localOnly: true },
  ];
}

export const SangamProvider: React.FC<{ uid: string; children: React.ReactNode }> = ({ uid, children }) => {
  const [posts, setPosts] = useState<SangamPost[]>(() => {
    const cached = readLS<SangamPost[]>(FEED_KEY, []);
    return cached.length ? cached : seedPosts();
  });
  const [comments, setComments] = useState<Record<string, SangamComment[]>>({});
  const [circles, setCircles] = useState<SangamCircle[]>(() => {
    const cached = readLS<SangamCircle[]>(CIRCLES_KEY, []);
    return cached.length ? cached : seedCircles();
  });
  const [events, setEvents] = useState<SangamEvent[]>(() => {
    const cached = readLS<SangamEvent[]>(EVENTS_KEY, []);
    return cached.length ? cached : seedEvents();
  });
  // EVENTS P1 — my RSVP states per event (device cache of the
  // rsvps/{uid} records; 'going' also mirrors into each event's
  // rsvps[] list, exactly as the pre-P1 toggle maintained it).
  const [myEventStates, setMyEventStates] = useState<Record<string, SangamRsvpState>>(
    () => readLS<Record<string, SangamRsvpState>>(`sb_sangam_myrsvps_${uid}`, {})
  );
  const [follows, setFollows] = useState<SangamFollow[]>(() => readLS<SangamFollow[]>(`sb_sangam_follows_${uid}`, []));
  const [reports, setReports] = useState<SangamReport[]>(() => readLS<SangamReport[]>(`sb_sangam_reports_${uid}`, []));
  const [online, setOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => { writeLS(FEED_KEY, posts.slice(0, 120)); }, [posts]);
  useEffect(() => { writeLS(CIRCLES_KEY, circles); }, [circles]);
  useEffect(() => { writeLS(EVENTS_KEY, events); }, [events]);
  useEffect(() => { writeLS(`sb_sangam_follows_${uid}`, follows); }, [follows, uid]);
  useEffect(() => { writeLS(`sb_sangam_reports_${uid}`, reports); }, [reports, uid]);

  /** Best-effort Firestore pull — never blocks the local feed. */
  const refresh = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const snap = await getDocs(query(collection(db, 'sangamPosts'), orderBy('createdAt', 'desc'), limit(60)));
      if (!snap.empty) {
        let cloud = snap.docs.map((d) => ({ ...(d.data() as SangamPost), id: d.id, localOnly: false }));
        // QUEUED #13 — seva-karma hydration. Cloud post docs carry no
        // `volunteers` field (not in the create whitelist), but every
        // volunteering writes sangamPosts/{postId}/volunteers/{uid}.
        // Pull just MY membership docs (one collectionGroup query,
        // rules allow read) and re-union them into the posts — so
        // "recorded to your Sanatani ID" survives restarts and follows
        // the volunteer across devices. Fail-open: on any error the
        // local cache's volunteer arrays stand.
        try {
          const mine = await getDocs(query(collectionGroup(db, 'volunteers'), where('uid', '==', uid)));
          const postIds = extractVolunteerPostIds(
            mine.docs.map((d) => ({ postId: volunteerPostIdFromRef(d.ref) ?? '' }))
          );
          if (postIds.length > 0) cloud = applyMyVolunteerships(cloud, postIds, uid);
        } catch { /* local volunteers stand */ }
        setPosts((prev) => {
          const prevById = new Map(prev.map((p) => [p.id, p]));
          const merged: SangamPost[] = [];
          for (const cp of cloud) {
            const local = prevById.get(cp.id);
            // Union local volunteer memberships into the cloud copy.
            // volunteerSeva only ever appends, and there is no
            // un-volunteer path — so union is monotonic and safe: a
            // volunteering made on this device is never clobbered by
            // the (volunteers-less) cloud copy of the same post.
            if (local?.volunteers && local.volunteers.length > 0) {
              const union = [...(cp.volunteers || [])];
              for (const v of local.volunteers) if (!union.includes(v)) union.push(v);
              merged.push({ ...cp, volunteers: union });
            } else {
              merged.push(cp);
            }
          }
          for (const p of prev) {
            if (p.localOnly && !merged.some((x) => x.id === p.id)) merged.push(p);
          }
          merged.sort((a, b) => b.createdAt - a.createdAt);
          return merged.slice(0, 120);
        });
        setLastSyncedAt(now());
      }
    } catch { /* offline or unreachable — local cache is authoritative */ }
  }, [uid]);

  useEffect(() => { refresh(); }, [refresh]);

  /**
   * Best-effort Firestore push — failures stay local, honestly labeled.
   *
   * AUDIT FIX #1: this MUST NOT inject fields. Previously it spread
   * `{ ...data, updatedAt: serverTimestamp() }`, but NO create whitelist
   * allows `updatedAt` — so every pushDoc write was silently rejected and
   * content stayed `localOnly` forever. Writers must pass exactly the
   * whitelisted fields (see ./serializers.ts); updates that need `updatedAt`
   * include it explicitly where the rules allow it.
   */
  const pushDoc = useCallback(async (coll: string, id: string, data: object) => {
    if (!navigator.onLine) return false;
    try {
      await setDoc(doc(db, coll, id), data, { merge: true });
      return true;
    } catch { return false; }
  }, []);

  const createPost = useCallback(async (author: AuthorInfo, input: ComposeInput, asOrg?: { orgId: string; orgName: string }) => {
    const post: SangamPost = {
      id: rid('post'), authorUid: author.uid,
      authorName: asOrg ? asOrg.orgName : author.name,
      authorSanId: asOrg ? asOrg.orgId : author.sanId,
      authorKind: asOrg ? 'org' : author.kind,
      authorRoleId: asOrg ? undefined : author.roleId,
      authorTier: asOrg ? undefined : author.tier,
      orgId: asOrg?.orgId, orgName: asOrg?.orgName, isOfficialPagePost: !!asOrg,
      kind: input.kind, text: input.text.trim(), imageUrl: input.imageUrl, shlokaRef: input.shlokaRef,
      seva: input.seva, serviceCard: input.serviceCard, eventRef: input.eventRef,
      createdAt: now(), ashirvadCount: 0, commentCount: 0, shareCount: 0,
      ashirvadBy: [], volunteers: [], visibility: 'public', status: 'active', localOnly: true,
    };
    setPosts((prev) => [post, ...prev].slice(0, 120));
    const ok = await pushDoc('sangamPosts', post.id, toCloudPost(post as unknown as Record<string, unknown>));
    if (ok) setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, localOnly: false } : p)));
    return post;
  }, [pushDoc]);

  const toggleAshirvad = useCallback(async (postId: string, uid: string) => {
    let gave = false;
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const by = p.ashirvadBy || [];
      gave = !by.includes(uid);
      const nextBy = gave ? [...by, uid] : by.filter((x) => x !== uid);
      return { ...p, ashirvadBy: nextBy, ashirvadCount: Math.max(0, p.ashirvadCount + (gave ? 1 : -1)) };
    }));
    // Cloud: deterministic per-user doc = one Ashirvad each, toggle by create/delete.
    // AUDIT FIX #1: also sync ashirvadCount via ±1 (rules permit exactly ±1 on that field alone).
    if (navigator.onLine) {
      try {
        if (gave) await setDoc(doc(db, 'sangamPosts', postId, 'ashirvad', uid), { uid, at: serverTimestamp() });
        else await deleteDoc(doc(db, 'sangamPosts', postId, 'ashirvad', uid));
        await updateDoc(doc(db, 'sangamPosts', postId), { ashirvadCount: increment(gave ? 1 : -1) });
      } catch { /* stays local */ }
    }
  }, []);

  const addComment = useCallback(async (postId: string, author: AuthorInfo, text: string) => {
    const c: SangamComment = {
      id: rid('cmt'), postId, authorUid: author.uid, authorName: author.name,
      authorSanId: author.sanId, authorKind: author.kind, authorTier: author.tier,
      text: text.trim(), createdAt: now(), localOnly: true,
    };
    // Optimistic: show immediately, bump the local count.
    setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), c] }));
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)));
    if (!navigator.onLine) return;
    try {
      // Cloud write uses ONLY the rules-whitelisted fields — the raw object
      // (id, localOnly) was rejected, which is why comments never synced.
      await setDoc(doc(db, 'sangamComments', c.id), toCloudComment(c));
      // Mark synced; the live subscription will reconcile by id.
      setComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((x) => (x.id === c.id ? { ...x, localOnly: false } : x)),
      }));
      // Best-effort cloud count bump (rules permit any logged-in user ±1).
      // Local-only posts have no cloud doc — the write fails silently there.
      try {
        await updateDoc(doc(db, 'sangamPosts', postId), { commentCount: increment(1) });
      } catch { /* local-only post or offline — local count stands */ }
    } catch { /* stays local, honestly labeled */ }
  }, []);

  /**
   * Author edit of own post (QUEUED #12).
   * Optimistic: applies locally with an `updatedAt` stamp, then best-effort
   * `updateDoc` with ONLY the rules-approved keys (text/imageUrl/updatedAt)
   * via `toCloudPostEdit`. A localOnly post has no cloud copy — the local
   * edit IS the truth there. Authors may also delete their own posts
   * (see `deletePost` below) since the owner-approved rules fix
   * (2026-10-20); before that, delete was SuperAdmin-only and the UI
   * offered Edit + a report-for-removal path instead of a fake delete.
   */
  const editPost = useCallback(async (postId: string, edits: { text: string; imageUrl?: string }) => {
    const at = now();
    let cloud: SangamPost | undefined;
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      const next = applyPostEdit(p, edits, at);
      cloud = p;
      return next;
    }));
    if (!navigator.onLine || cloud?.localOnly) return; // nothing to sync to
    try {
      await updateDoc(doc(db, 'sangamPosts', postId), toCloudPostEdit({ ...edits, updatedAt: at }));
    } catch { /* stays local, honestly labeled */ }
  }, []);

  /**
   * Author delete of own post (follow-up to QUEUED #12; owner-approved
   * rules fix, 2026-10-20 — sangamPosts delete now allows the author,
   * and still allows SuperAdmin for moderation).
   * Optimistic local removal (mirrors deleteComment), then best-effort
   * cloud `deleteDoc`. A localOnly post has no cloud copy — the local
   * removal IS the truth there. The post's local comment thread is
   * dropped with it; cloud comments are not cascaded (same stance as
   * the moderator delete path — they simply become unreachable).
   */
  const deletePost = useCallback(async (postId: string) => {
    let cloud: SangamPost | undefined;
    setPosts((prev) => {
      cloud = prev.find((p) => p.id === postId);
      return removePost(prev, postId);
    });
    setComments((prev) => {
      if (!(postId in prev)) return prev;
      const next = { ...prev };
      delete next[postId];
      return next;
    });
    if (!navigator.onLine || cloud?.localOnly) return;
    try {
      await deleteDoc(doc(db, 'sangamPosts', postId));
    } catch { /* stays removed locally, honestly labeled */ }
  }, []);

  /**
   * Author edit of own comment (QUEUED #12).
   * Optimistic local edit with `updatedAt`; best-effort cloud `updateDoc`
   * with the minimum payload (rules allow the author to update own comments).
   */
  const editComment = useCallback(async (postId: string, commentId: string, text: string) => {
    const at = now();
    let cloud: SangamComment | undefined;
    setComments((prev) => {
      const list = prev[postId] || [];
      cloud = list.find((c) => c.id === commentId);
      return { ...prev, [postId]: applyCommentEdit(list, commentId, text, at) };
    });
    if (!navigator.onLine || cloud?.localOnly) return;
    try {
      await updateDoc(doc(db, 'sangamComments', commentId), toCloudCommentEdit({ text, updatedAt: at }));
    } catch { /* stays local, honestly labeled */ }
  }, []);

  /**
   * Author delete of own comment (QUEUED #12).
   * Optimistic remove + bounded count decrement; best-effort cloud
   * `deleteDoc` and the ±1 `commentCount` bump (mirrors addComment).
   */
  const deleteComment = useCallback(async (postId: string, commentId: string) => {
    let cloud: SangamComment | undefined;
    setComments((prev) => {
      const list = prev[postId] || [];
      cloud = list.find((c) => c.id === commentId);
      return { ...prev, [postId]: removeComment(list, commentId) };
    });
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: nextCommentCount(p.commentCount, -1) } : p)));
    if (!navigator.onLine || cloud?.localOnly) return;
    try {
      await deleteDoc(doc(db, 'sangamComments', commentId));
      await updateDoc(doc(db, 'sangamPosts', postId), { commentCount: increment(-1) });
    } catch { /* stays local, honestly labeled */ }
  }, []);

  /**
   * Live comment thread subscription (Step 4: multi-device sync).
   * Call when a post's comment drawer opens; call the returned function on
   * close/unmount. Merges cloud comments with unsynced local ones by id.
   * No composite index needed: filters by postId only, sorts client-side.
   */
  const subscribeComments = useCallback((postId: string) => {
    if (!navigator.onLine) return () => {};
    try {
      const q = query(
        collection(db, 'sangamComments'),
        where('postId', '==', postId),
        limit(100),
      );
      return onSnapshot(q,
        (snap) => {
          const cloud = snap.docs.map((d) => ({ ...(d.data() as SangamComment), id: d.id }));
          setComments((prev) => ({ ...prev, [postId]: mergeComments(prev[postId] || [], cloud) }));
        },
        () => { /* snapshot failed — local comments remain visible */ },
      );
    } catch {
      return () => {};
    }
  }, []);

  const sharePost = useCallback(async (post: SangamPost, author: AuthorInfo, note: string) => {
    const shared: SangamPost = {
      id: rid('post'), authorUid: author.uid, authorName: author.name, authorSanId: author.sanId,
      authorKind: author.kind, authorRoleId: author.roleId, authorTier: author.tier,
      isOfficialPagePost: false, kind: post.kind, text: note.trim() || 'Shared with reverence 🙏',
      imageUrl: post.imageUrl, shlokaRef: post.shlokaRef,
      sharedFrom: { postId: post.id, authorName: post.authorName, authorSanId: post.authorSanId },
      createdAt: now(), ashirvadCount: 0, commentCount: 0, shareCount: 0,
      ashirvadBy: [], visibility: 'public', status: 'active', localOnly: true,
    };
    setPosts((prev) => {
      const bumped = prev.map((p) => (p.id === post.id ? { ...p, shareCount: p.shareCount + 1 } : p));
      return [shared, ...bumped].slice(0, 120);
    });
    // AUDIT FIX #1: route through the whitelist-exact serializer (raw `shared`
    // carries id/localOnly/ashirvadBy which the rules reject).
    await pushDoc('sangamPosts', shared.id, toCloudPost(shared as unknown as Record<string, unknown>));
    // Sync the shareCount bump to the cloud (best-effort; rules permit exactly ±1).
    if (navigator.onLine) {
      try {
        await updateDoc(doc(db, 'sangamPosts', post.id), { shareCount: increment(1) });
      } catch { /* stays local */ }
    }
  }, [pushDoc]);

  const followTarget = useCallback(async (followerUid: string, targetType: 'org' | 'purohit' | 'jyotish', targetId: string, targetName: string) => {
    const f: SangamFollow = {
      id: `${followerUid}_${targetType}_${targetId}`, followerUid, targetType, targetId, targetName, createdAt: now(),
    };
    setFollows((prev) => (prev.some((x) => x.id === f.id) ? prev : [...prev, f]));
    // AUDIT FIX #1: raw `f` carries `id` which the sangamFollows whitelist rejects.
    await pushDoc('sangamFollows', f.id, toCloudFollow(f));
  }, [pushDoc]);

  const unfollowTarget = useCallback(async (followId: string) => {
    setFollows((prev) => prev.filter((x) => x.id !== followId));
    if (navigator.onLine) {
      try { await deleteDoc(doc(db, 'sangamFollows', followId)); } catch { /* stays local */ }
    }
  }, []);

  const isFollowing = useCallback((targetType: string, targetId: string) =>
    follows.some((f) => f.targetType === targetType && f.targetId === targetId), [follows]);

  const joinCircle = useCallback(async (circleId: string, uid: string) => {
    let added = false;
    setCircles((prev) => prev.map((c) => {
      if (c.id !== circleId || (c.members || []).includes(uid)) return c;
      added = true;
      return { ...c, members: [...(c.members || []), uid], memberCount: c.memberCount + 1 };
    }));
    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'sangamCircles', circleId, 'members', uid), { uid, at: serverTimestamp() });
        // Make memberCount true in the cloud too — only when this join
        // actually added the member (rules permit exactly +1).
        if (added) {
          try {
            await updateDoc(doc(db, 'sangamCircles', circleId), { memberCount: increment(1) });
          } catch { /* local-only circle or offline — local count stands */ }
        }
      } catch { /* local */ }
    }
  }, []);

  const createCircle = useCallback(async (uid: string, name: string, circleName: string, topic: string, description: string) => {
    const c: SangamCircle = {
      id: rid('circle'), name: circleName.trim(), topic, description: description.trim(),
      creatorUid: uid, creatorName: name, memberCount: 1, members: [uid], createdAt: now(), localOnly: true,
    };
    setCircles((prev) => [c, ...prev]);
    // AUDIT FIX #1: raw circle carries id/members/localOnly which the whitelist rejects.
    const ok = await pushDoc('sangamCircles', c.id, toCloudCircle(c));
    if (ok) setCircles((prev) => prev.map((x) => (x.id === c.id ? { ...x, localOnly: false } : x)));
    return c;
  }, [pushDoc]);

  const myEventState = useCallback(
    (eventId: string): SangamRsvpState | null => {
      const cached = myEventStates[eventId];
      if (cached) return cached;
      const ev = events.find((e) => e.id === eventId);
      return ev && (ev.rsvps || []).includes(uid) ? 'going' : null;
    },
    [myEventStates, events, uid]
  );

  const setRsvpState = useCallback(
    async (eventId: string, whoUid: string, state: SangamRsvpState | null): Promise<SangamRsvpState | null> => {
      const ev = events.find((e) => e.id === eventId);
      if (!ev) return null;
      const prevState: SangamRsvpState | null =
        myEventStates[eventId] || ((ev.rsvps || []).includes(whoUid) ? 'going' : null);
      let next: SangamRsvpState | null = state;
      // Honest capacity: a full event cannot take another 'going' —
      // the member joins the waitlist instead (rules enforce the same).
      if (next === 'going' && prevState !== 'going' && ev.capacity && ev.capacity > 0 && ev.rsvpCount >= ev.capacity) {
        next = 'waitlisted';
      }
      if (next === prevState) return next;
      const wasGoing = prevState === 'going';
      const isGoing = next === 'going';
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          const r = e.rsvps || [];
          const has = r.includes(whoUid);
          const nrsvps =
            isGoing && !has ? [...r, whoUid] : !isGoing && has ? r.filter((x) => x !== whoUid) : r;
          return {
            ...e,
            rsvps: nrsvps,
            rsvpCount: Math.max(0, e.rsvpCount + (isGoing ? 1 : 0) - (wasGoing ? 1 : 0)),
          };
        })
      );
      setMyEventStates((prev) => {
        const copy = { ...prev };
        if (next) copy[eventId] = next;
        else delete copy[eventId];
        writeLS(`sb_sangam_myrsvps_${uid}`, copy);
        return copy;
      });
      if (navigator.onLine) {
        try {
          // ONE batch: the count moves only together with this member's
          // own rsvps/{uid} record — the rules anchor every transition
          // (create / delete AND state flips), so the count can never
          // drift from the real RSVP list.
          const batch = writeBatch(db);
          const rsvpRef = doc(db, 'sangamEvents', eventId, 'rsvps', whoUid);
          if (next === null) batch.delete(rsvpRef);
          else if (prevState === null) batch.set(rsvpRef, { uid: whoUid, state: next, at: serverTimestamp() });
          else batch.update(rsvpRef, { state: next, at: serverTimestamp() });
          if (isGoing !== wasGoing) {
            batch.update(doc(db, 'sangamEvents', eventId), { rsvpCount: increment(isGoing ? 1 : -1) });
          }
          await batch.commit();
        } catch {
          /* local-only event or offline — local state stands */
        }
      }
      return next;
    },
    [events, myEventStates, uid]
  );

  // The pre-P1 toggle, kept as the 'going' on/off the feed cards use.
  const rsvpEvent = useCallback(
    async (eventId: string, whoUid: string) => {
      const ev = events.find((e) => e.id === eventId);
      const cur: SangamRsvpState | null =
        myEventStates[eventId] || (ev && (ev.rsvps || []).includes(whoUid) ? 'going' : null);
      await setRsvpState(eventId, whoUid, cur === 'going' ? null : 'going');
    },
    [events, myEventStates, setRsvpState]
  );

  const loadEventRsvps = useCallback(
    async (eventId: string): Promise<{ uid: string; state: SangamRsvpState; at: number | null }[]> => {
      try {
        const snap = await getDocs(collection(db, 'sangamEvents', eventId, 'rsvps'));
        return snap.docs
          .map((d) => {
            const data = d.data() as { state?: string; at?: { toMillis?: () => number } | number };
            const atMs =
              typeof data.at === 'number' ? data.at : data.at?.toMillis ? data.at.toMillis() : null;
            return {
              uid: d.id,
              state: (data.state === 'interested' || data.state === 'waitlisted'
                ? data.state
                : 'going') as SangamRsvpState,
              at: atMs,
            };
          })
          .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
      } catch {
        return [];
      }
    },
    []
  );

  const createEvent = useCallback(async (author: AuthorInfo, e: Omit<SangamEvent, 'id' | 'creatorUid' | 'creatorName' | 'rsvpCount' | 'createdAt'>) => {
    const ev: SangamEvent = { ...e, id: rid('event'), creatorUid: author.uid, creatorName: author.name, rsvpCount: 0, rsvps: [], createdAt: now(), localOnly: true };
    setEvents((prev) => [...prev, ev].sort((a, b) => a.startsAt - b.startsAt));
    // AUDIT FIX #1: raw event carries id/rsvps/localOnly which the whitelist rejects.
    const ok = await pushDoc('sangamEvents', ev.id, toCloudEvent(ev));
    if (ok) setEvents((prev) => prev.map((x) => (x.id === ev.id ? { ...x, localOnly: false } : x)));
    return ev;
  }, [pushDoc]);

  const volunteerSeva = useCallback(async (postId: string, uid: string) => {
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId || p.kind !== 'seva' || !p.seva) return p;
      const v = p.volunteers || [];
      if (v.includes(uid)) return p;
      if (v.length >= p.seva.slots) return p; // slots full — honest cap
      return { ...p, volunteers: [...v, uid], seva: { ...p.seva, slotsTaken: p.seva.slotsTaken + 1 } };
    }));
    if (navigator.onLine) {
      try { await setDoc(doc(db, 'sangamPosts', postId, 'volunteers', uid), { uid, at: serverTimestamp() }); } catch { /* local */ }
    }
  }, []);

  const reportContent = useCallback(async (reporterUid: string, reporterName: string, targetType: SangamReport['targetType'], targetId: string, reason: SangamReport['reason'], details?: string) => {
    const r: SangamReport = {
      id: rid('report'), reporterUid, reporterName, targetType, targetId, reason,
      details: details?.trim(), status: 'open', createdAt: now(),
    };
    setReports((prev) => [r, ...prev]);
    setPosts((prev) => prev.map((p) => (targetType === 'post' && p.id === targetId ? { ...p, status: 'reported' } : p)));
    // AUDIT FIX #1: raw `r` carries `id` (+ possibly undefined `details`) which the whitelist rejects.
    await pushDoc('sangamReports', r.id, toCloudReport(r));
  }, [pushDoc]);

  const myReports = useCallback((uid: string) => reports.filter((r) => r.reporterUid === uid), [reports]);

  const value = useMemo<SangamContextType>(() => ({
    posts, comments, circles, events, follows, online, lastSyncedAt,
    createPost, editPost, deletePost, toggleAshirvad, addComment, editComment, deleteComment, sharePost,
    followTarget, unfollowTarget, isFollowing,
    joinCircle, createCircle, rsvpEvent, setRsvpState, myEventState, loadEventRsvps, createEvent, volunteerSeva,
    reportContent, myReports, refresh, subscribeComments,
  }), [posts, comments, circles, events, follows, online, lastSyncedAt,
    createPost, editPost, deletePost, toggleAshirvad, addComment, editComment, deleteComment, sharePost, followTarget, unfollowTarget,
    isFollowing, joinCircle, createCircle, rsvpEvent, setRsvpState, myEventState, loadEventRsvps, createEvent, volunteerSeva,
    reportContent, myReports, refresh, subscribeComments]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSangam = (): SangamContextType => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSangam must be used inside SangamProvider');
  return ctx;
};
