/**
 * sangam/stories/storyService.ts — Firestore CRUD for Sangam Stories.
 * ============================================================================
 * Collection: sangamStories/{storyId}
 *   read:   any authenticated user (stories are community moments)
 *   create: author only, schema-pinned, expiresAt = now + 24h
 *   delete: author or superadmin (no edits — delete + re-share)
 *   update: reportCount increment only
 *
 * View tracking: sangamStories/{storyId}/viewers/{uid}
 *   write: own uid only. read: story author only (view COUNT is public
 *   to the author; viewer IDENTITIES are not).
 *
 * Expiry is lazy: queries filter expiresAt > now. Old docs stay invisible
 * until the GodMode "Clean expired stories" sweep deletes them.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  increment,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  storyDoc,
  toStory,
  validateStory,
  type NewStoryInput,
  type Story,
} from './types';

const COL = 'sangamStories';

/** Create a story. Returns the new document id. Throws on validation failure. */
export async function createStory(input: NewStoryInput): Promise<string> {
  const err = validateStory(input);
  if (err) throw new Error(`invalid-story:${err}`);
  const id = `story_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, COL, id), storyDoc(input));
  return id;
}

/** Delete a story (author or admin — enforced by rules). */
export async function deleteStory(storyId: string): Promise<void> {
  await deleteDoc(doc(db, COL, storyId));
}

/** Report a story (increments counter; moderators review). */
export async function reportStory(storyId: string): Promise<void> {
  await updateDoc(doc(db, COL, storyId), { reportCount: increment(1) });
}

/** List live stories, newest first. Lazy expiry: filters expiresAt > now. */
export async function listStories(max = 50): Promise<Story[]> {
  const q = query(
    collection(db, COL),
    where('expiresAt', '>', Date.now()),
    orderBy('expiresAt', 'desc'),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toStory(d.id, d.data() as Record<string, unknown>));
}

/** Realtime subscription to live stories. */
export function subscribeStories(cb: (stories: Story[]) => void, max = 50): Unsubscribe {
  const q = query(
    collection(db, COL),
    where('expiresAt', '>', Date.now()),
    orderBy('expiresAt', 'desc'),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toStory(d.id, d.data() as Record<string, unknown>))),
    () => cb([])
  );
}

/** Record a view. Viewers subcollection: {storyId}/viewers/{uid} = { at }. */
export async function markViewed(storyId: string, uid: string): Promise<void> {
  if (!storyId || !uid || uid === 'anon') return;
  try {
    await setDoc(doc(db, COL, storyId, 'viewers', uid), { at: Date.now() }, { merge: true });
  } catch {
    /* view tracking is best-effort — never break the viewer */
  }
}

/** View count for the author's own story. */
export async function getViewCount(storyId: string): Promise<number> {
  try {
    const snap = await getDocs(query(collection(db, COL, storyId, 'viewers'), limit(500)));
    return snap.size;
  } catch {
    return 0;
  }
}

/**
 * GodMode sweep: delete stories expired more than `graceMs` ago.
 * Manual trigger — no Cloud Functions, $0.
 */
export async function cleanExpiredStories(graceMs: number = 60 * 60 * 1000): Promise<number> {
  const cutoff = Date.now() - graceMs;
  const q = query(collection(db, COL), where('expiresAt', '<', cutoff), limit(200));
  const snap = await getDocs(q);
  let n = 0;
  for (const d of snap.docs) {
    try {
      await deleteDoc(d.ref);
      n++;
    } catch {
      /* keep sweeping */
    }
  }
  return n;
}
