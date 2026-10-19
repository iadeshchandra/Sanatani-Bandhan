/**
 * social/devoteeService.ts — Firestore ops for devotee public profiles + follows.
 * ====================================================================
 * Privacy: reads `devoteeProfiles/{uid}` (public read) and public
 * `sangamPosts` by authorUid. NEVER touches `users/{uid}` (self-read-only).
 */
import {
  doc, getDoc, setDoc, deleteDoc, collection,
  query, where, orderBy, limit, getDocs, onSnapshot,
  increment, runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toDevoteeProfile, profileDoc, type DevoteeProfile } from './types';

const profilesCol = 'devoteeProfiles';

export async function getDevoteeProfile(uid: string): Promise<DevoteeProfile | null> {
  const snap = await getDoc(doc(db, profilesCol, uid));
  if (!snap.exists()) return null;
  return toDevoteeProfile(uid, snap.data() as Record<string, unknown>);
}

/** Create or update one's OWN profile doc. */
export async function saveDevoteeProfile(
  uid: string,
  input: { displayName: string; sanId: string; avatarUrl?: string; bio?: string; isPublic: boolean },
): Promise<void> {
  await setDoc(doc(db, profilesCol, uid), profileDoc({ uid, ...input }), { merge: true });
}

/** Ensure a minimal public profile exists (called lazily on first profile view of own posts). Best-effort. */
export async function ensureDevoteeProfile(
  uid: string, displayName: string, sanId: string,
): Promise<void> {
  try {
    const existing = await getDoc(doc(db, profilesCol, uid));
    if (existing.exists()) return;
    await setDoc(doc(db, profilesCol, uid), {
      ...profileDoc({ uid, displayName, sanId, isPublic: true }),
      followerCount: 0, followingCount: 0,
    });
  } catch { /* best-effort */ }
}

// --- Follows (asymmetric) ---

const followingCol = (followerUid: string) => `follows/${followerUid}/following`;

export async function isFollowing(followerUid: string, targetUid: string): Promise<boolean> {
  if (!followerUid || followerUid === targetUid) return false;
  const snap = await getDoc(doc(db, followingCol(followerUid), targetUid));
  return snap.exists();
}

export function subscribeIsFollowing(
  followerUid: string, targetUid: string, cb: (v: boolean) => void,
): () => void {
  if (!followerUid || followerUid === targetUid) { cb(false); return () => {}; }
  return onSnapshot(doc(db, followingCol(followerUid), targetUid), (s) => cb(s.exists()));
}

/** Follow / unfollow with counter updates (transactional, no self-follow). */
export async function setFollowing(
  followerUid: string, targetUid: string, follow: boolean,
): Promise<void> {
  if (!followerUid || !targetUid || followerUid === targetUid) return;
  const followRef = doc(db, followingCol(followerUid), targetUid);
  const targetRef = doc(db, profilesCol, targetUid);
  const meRef = doc(db, profilesCol, followerUid);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(followRef);
    if (follow && !existing.exists()) {
      tx.set(followRef, { followerUid, targetUid, createdAt: Date.now() });
      tx.set(targetRef, { followerCount: increment(1) }, { merge: true });
      tx.set(meRef, { followingCount: increment(1) }, { merge: true });
    } else if (!follow && existing.exists()) {
      tx.delete(followRef);
      tx.set(targetRef, { followerCount: increment(-1) }, { merge: true });
      tx.set(meRef, { followingCount: increment(-1) }, { merge: true });
    }
  });
}

// --- Public posts by author ---

export interface AuthorPostSummary {
  id: string;
  text: string;
  createdAt: number;
  ashirvadCount: number;
  commentCount: number;
}

export async function getAuthorPosts(uid: string, max = 20): Promise<AuthorPostSummary[]> {
  const q = query(
    collection(db, 'sangamPosts'),
    where('authorUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      text: typeof data.text === 'string' ? data.text.slice(0, 280) : '',
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
      ashirvadCount: typeof data.ashirvadCount === 'number' ? data.ashirvadCount : 0,
      commentCount: typeof data.commentCount === 'number' ? data.commentCount : 0,
    };
  });
}
