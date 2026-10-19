/**
 * sangam/shorts/shortsService.ts — Firestore CRUD for Sangam Shorts.
 * ============================================================================
 * Collection: sangamShorts/{shortId}
 *   read:   public (authenticated — a shared moment is community content)
 *   create: any logged-in user, schema-pinned
 *   update: viewCount/ashirvadCount/commentCount/shareCount/reportCount
 *           increments only
 *   delete: author or superadmin (no edits — delete + re-share)
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
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { shortDoc, toShort, type Short } from './types';

const COL = 'sangamShorts';

/** Share a short. Returns the new document id. */
export async function shareShort(input: {
  youtubeId: string;
  title: string;
  caption?: string;
  authorUid: string;
  authorName: string;
  authorAvatar?: string;
  authorSanId?: string;
}): Promise<string> {
  const id = `short_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, COL, id), {
    ...shortDoc({
      youtubeId: input.youtubeId,
      title: input.title,
      caption: input.caption,
      authorUid: input.authorUid,
      authorName: input.authorName,
      authorAvatar: input.authorAvatar,
      authorSanId: input.authorSanId,
      createdAt: Date.now(),
    }),
    serverCreatedAt: serverTimestamp(),
  });
  return id;
}

/** List shorts, newest first. */
export async function listShorts(max = 50): Promise<Short[]> {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  const out: Short[] = [];
  for (const d of snap.docs) {
    const s = toShort(d.id, d.data() as Record<string, unknown>);
    if (s) out.push(s);
  }
  return out;
}

/** Realtime subscription to the shorts feed. */
export function subscribeShorts(cb: (shorts: Short[]) => void, max = 50): Unsubscribe {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => {
      const out: Short[] = [];
      for (const d of snap.docs) {
        const s = toShort(d.id, d.data() as Record<string, unknown>);
        if (s) out.push(s);
      }
      cb(out);
    },
    () => cb([]),
  );
}

/** Increment the view counter (fire-and-forget from the viewer). */
export async function countShortView(shortId: string): Promise<void> {
  try {
    await updateDoc(doc(db, COL, shortId), { viewCount: increment(1) });
  } catch {
    // Best-effort — a failed view count is not worth surfacing.
  }
}

/** Toggle an ashirvad. Returns the new count direction (+1 or -1). Caller tracks local state. */
export async function ashirvadShort(shortId: string, add: boolean): Promise<void> {
  await updateDoc(doc(db, COL, shortId), { ashirvadCount: increment(add ? 1 : -1) });
}

/** Report a short for sevadar review. Soft moderation — increments a counter. */
export async function reportShort(shortId: string): Promise<void> {
  await updateDoc(doc(db, COL, shortId), { reportCount: increment(1) });
}

/** Delete a short (author or admin — enforced by rules). */
export async function deleteShort(shortId: string): Promise<void> {
  await deleteDoc(doc(db, COL, shortId));
}
