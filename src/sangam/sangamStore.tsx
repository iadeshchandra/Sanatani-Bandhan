import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection, doc, setDoc, getDocs, query, orderBy, limit,
  serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  SangamPost, SangamComment, SangamCircle, SangamEvent,
  SangamFollow, SangamReport, PostKind, AuthorKind, VerificationTier, ServiceCardDetails,
  SevaDetails,
} from './types';
import { DEMO_AUTHOR_SUFFIX } from './types';

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
  toggleAshirvad: (postId: string, uid: string) => Promise<void>;
  addComment: (postId: string, author: AuthorInfo, text: string) => Promise<void>;
  sharePost: (post: SangamPost, author: AuthorInfo, note: string) => Promise<void>;
  followTarget: (followerUid: string, targetType: 'org' | 'purohit' | 'jyotish', targetId: string, targetName: string) => Promise<void>;
  unfollowTarget: (followId: string) => Promise<void>;
  isFollowing: (targetType: string, targetId: string) => boolean;
  joinCircle: (circleId: string, uid: string) => Promise<void>;
  createCircle: (uid: string, name: string, circleName: string, topic: string, description: string) => Promise<SangamCircle>;
  rsvpEvent: (eventId: string, uid: string) => Promise<void>;
  createEvent: (author: AuthorInfo, e: Omit<SangamEvent, 'id' | 'creatorUid' | 'creatorName' | 'rsvpCount' | 'createdAt'>) => Promise<SangamEvent>;
  volunteerSeva: (postId: string, uid: string) => Promise<void>;
  reportContent: (reporterUid: string, reporterName: string, targetType: SangamReport['targetType'], targetId: string, reason: SangamReport['reason'], details?: string) => Promise<void>;
  myReports: (uid: string) => SangamReport[];
  refresh: () => Promise<void>;
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
        const cloud = snap.docs.map((d) => ({ ...(d.data() as SangamPost), id: d.id, localOnly: false }));
        setPosts((prev) => {
          const localOnlyOnes = prev.filter((p) => p.localOnly);
          const merged = [...localOnlyOnes, ...cloud].sort((a, b) => b.createdAt - a.createdAt);
          return merged.slice(0, 120);
        });
        setLastSyncedAt(now());
      }
    } catch { /* offline or unreachable — local cache is authoritative */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /** Best-effort Firestore push — failures stay local, honestly labeled. */
  const pushDoc = useCallback(async (coll: string, id: string, data: object) => {
    if (!navigator.onLine) return false;
    try {
      await setDoc(doc(db, coll, id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
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
    const ok = await pushDoc('sangamPosts', post.id, { ...post, ashirvadBy: [], volunteers: [] });
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
    if (navigator.onLine) {
      try {
        if (gave) await setDoc(doc(db, 'sangamPosts', postId, 'ashirvad', uid), { uid, at: serverTimestamp() });
        else await deleteDoc(doc(db, 'sangamPosts', postId, 'ashirvad', uid));
      } catch { /* stays local */ }
    }
  }, []);

  const addComment = useCallback(async (postId: string, author: AuthorInfo, text: string) => {
    const c: SangamComment = {
      id: rid('cmt'), postId, authorUid: author.uid, authorName: author.name,
      authorSanId: author.sanId, authorKind: author.kind, authorTier: author.tier,
      text: text.trim(), createdAt: now(), localOnly: true,
    };
    setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), c] }));
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)));
    await pushDoc('sangamComments', c.id, c);
  }, [pushDoc]);

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
    await pushDoc('sangamPosts', shared.id, shared);
  }, [pushDoc]);

  const followTarget = useCallback(async (followerUid: string, targetType: 'org' | 'purohit' | 'jyotish', targetId: string, targetName: string) => {
    const f: SangamFollow = {
      id: `${followerUid}_${targetType}_${targetId}`, followerUid, targetType, targetId, targetName, createdAt: now(),
    };
    setFollows((prev) => (prev.some((x) => x.id === f.id) ? prev : [...prev, f]));
    await pushDoc('sangamFollows', f.id, f);
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
    setCircles((prev) => prev.map((c) => {
      if (c.id !== circleId || (c.members || []).includes(uid)) return c;
      return { ...c, members: [...(c.members || []), uid], memberCount: c.memberCount + 1 };
    }));
    if (navigator.onLine) {
      try { await setDoc(doc(db, 'sangamCircles', circleId, 'members', uid), { uid, at: serverTimestamp() }); } catch { /* local */ }
    }
  }, []);

  const createCircle = useCallback(async (uid: string, name: string, circleName: string, topic: string, description: string) => {
    const c: SangamCircle = {
      id: rid('circle'), name: circleName.trim(), topic, description: description.trim(),
      creatorUid: uid, creatorName: name, memberCount: 1, members: [uid], createdAt: now(), localOnly: true,
    };
    setCircles((prev) => [c, ...prev]);
    const ok = await pushDoc('sangamCircles', c.id, { ...c, members: [] });
    if (ok) setCircles((prev) => prev.map((x) => (x.id === c.id ? { ...x, localOnly: false } : x)));
    return c;
  }, [pushDoc]);

  const rsvpEvent = useCallback(async (eventId: string, uid: string) => {
    let added = false;
    setEvents((prev) => prev.map((e) => {
      if (e.id !== eventId) return e;
      const r = e.rsvps || [];
      added = !r.includes(uid);
      return { ...e, rsvps: added ? [...r, uid] : r.filter((x) => x !== uid), rsvpCount: Math.max(0, e.rsvpCount + (added ? 1 : -1)) };
    }));
    if (navigator.onLine) {
      try {
        if (added) await setDoc(doc(db, 'sangamEvents', eventId, 'rsvps', uid), { uid, at: serverTimestamp() });
        else await deleteDoc(doc(db, 'sangamEvents', eventId, 'rsvps', uid));
      } catch { /* local */ }
    }
  }, []);

  const createEvent = useCallback(async (author: AuthorInfo, e: Omit<SangamEvent, 'id' | 'creatorUid' | 'creatorName' | 'rsvpCount' | 'createdAt'>) => {
    const ev: SangamEvent = { ...e, id: rid('event'), creatorUid: author.uid, creatorName: author.name, rsvpCount: 0, rsvps: [], createdAt: now(), localOnly: true };
    setEvents((prev) => [...prev, ev].sort((a, b) => a.startsAt - b.startsAt));
    const ok = await pushDoc('sangamEvents', ev.id, { ...ev, rsvps: [] });
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
    await pushDoc('sangamReports', r.id, r);
  }, [pushDoc]);

  const myReports = useCallback((uid: string) => reports.filter((r) => r.reporterUid === uid), [reports]);

  const value = useMemo<SangamContextType>(() => ({
    posts, comments, circles, events, follows, online, lastSyncedAt,
    createPost, toggleAshirvad, addComment, sharePost,
    followTarget, unfollowTarget, isFollowing,
    joinCircle, createCircle, rsvpEvent, createEvent, volunteerSeva,
    reportContent, myReports, refresh,
  }), [posts, comments, circles, events, follows, online, lastSyncedAt,
    createPost, toggleAshirvad, addComment, sharePost, followTarget, unfollowTarget,
    isFollowing, joinCircle, createCircle, rsvpEvent, createEvent, volunteerSeva,
    reportContent, myReports, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSangam = (): SangamContextType => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSangam must be used inside SangamProvider');
  return ctx;
};
