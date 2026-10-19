/**
 * social/safetyService.ts — block/mute Firestore operations (Step 5).
 * ============================================================================
 * Collections (NEW — flagged in rules):
 *   blocks/{blockerUid}/blocked/{targetUid} — blocker read/write, own-uid only
 *   mutes/{muterUid}/muted/{targetUid}     — muter read/write, own-uid only
 *
 * Privacy: lists are readable ONLY by the owner (or superadmin). A blocked
 * user can never discover they were blocked — no notifications, no reads.
 */
import {
  doc, setDoc, deleteDoc, onSnapshot, getDoc, collection,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { canTargetSafetyAction } from './safety';

const blocksCol = (uid: string) => `blocks/${uid}/blocked`;
const mutesCol = (uid: string) => `mutes/${uid}/muted`;

/** Block: hides their posts/comments from your feed, prevents DMs both ways. */
export async function blockUser(blockerUid: string, targetUid: string): Promise<void> {
  if (!canTargetSafetyAction(blockerUid, targetUid)) return;
  await setDoc(doc(db, blocksCol(blockerUid), targetUid), {
    blockerUid, targetUid, createdAt: Date.now(),
  });
  // Block subsumes mute — remove from mute list so state stays clean.
  await deleteDoc(doc(db, mutesCol(blockerUid), targetUid)).catch(() => {});
}

export async function unblockUser(blockerUid: string, targetUid: string): Promise<void> {
  if (!blockerUid || !targetUid) return;
  await deleteDoc(doc(db, blocksCol(blockerUid), targetUid));
}

/** Mute: hides their posts from your feed; DMs still allowed (softer than block). */
export async function muteUser(muterUid: string, targetUid: string): Promise<void> {
  if (!canTargetSafetyAction(muterUid, targetUid)) return;
  await setDoc(doc(db, mutesCol(muterUid), targetUid), {
    muterUid, targetUid, createdAt: Date.now(),
  });
}

export async function unmuteUser(muterUid: string, targetUid: string): Promise<void> {
  if (!muterUid || !targetUid) return;
  await deleteDoc(doc(db, mutesCol(muterUid), targetUid));
}

/** Live subscription to both lists. Calls back with (blocked, muted) uid sets. */
export function subscribeSafetyLists(
  uid: string,
  cb: (blocked: Set<string>, muted: Set<string>) => void,
): () => void {
  if (!uid) { cb(new Set(), new Set()); return () => {}; }
  let blocked = new Set<string>();
  let muted = new Set<string>();
  const emit = () => cb(new Set(blocked), new Set(muted));
  const unsubB = onSnapshot(collection(db, blocksCol(uid)), (snap) => {
    blocked = new Set(snap.docs.map((d) => d.id));
    emit();
  }, () => {});
  const unsubM = onSnapshot(collection(db, mutesCol(uid)), (snap) => {
    muted = new Set(snap.docs.map((d) => d.id));
    emit();
  }, () => {});
  return () => { unsubB(); unsubM(); };
}

/** One-shot check: has `aUid` blocked `bUid`? (for chat guards) */
export async function hasBlocked(aUid: string, bUid: string): Promise<boolean> {
  if (!aUid || !bUid) return false;
  try {
    const snap = await getDoc(doc(db, blocksCol(aUid), bUid));
    return snap.exists();
  } catch { return false; }
}
