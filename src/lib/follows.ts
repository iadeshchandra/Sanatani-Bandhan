/**
 * follows.ts — NEXT-LEVEL WAVE A1: the subscribable temple calendar.
 * =====================================================================
 * A devotee follows a temple (an organisation's workspace) and/or a
 * festival series (a War Room plan), and the calendar brings them
 * back: the /events "From your temples" rail, the Solo home strip.
 * This is the user-side source of truth for follows — ONE document
 * per user in the `user_follows` collection, id = the user's uid:
 *
 *   { orgIds: string[], festivalIds: string[], updatedAt: number }
 *
 * orgIds are workspace ids (the orgPages doc id IS the workspace
 * id); festivalIds are festival PLAN ids — which are also the
 * published festival_events doc ids (`${workspaceId}__${festivalKey}`,
 * stamped by the publish path), so a followed series matches its
 * public event doc directly.
 *
 * RELATION TO THE OLDER ORG FOLLOW: OrgPublicPage has long had an
 * org-side follow — `followers/{orgId}/users/{uid}` docs that power
 * the temple's follower COUNT and its announcements feed. That
 * mechanism stays exactly as it is. Its weakness was state: the
 * MembershipContext cache resets on every sign-in and is never
 * rehydrated, so the button forgot you between sessions. This doc
 * fixes the state problem and adds festival-series follows (which
 * never existed); the org page's toggle now writes BOTH stores —
 * the org-side doc for the temple's count/feed, this doc for the
 * devotee's own calendar.
 *
 * READS FAIL SOFT: a devotee whose follows cannot be read (offline,
 * sandbox) simply sees the plain discovery page — never an error,
 * never a fake follow state.
 */
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

/** The rules-pinned per-list cap (firestore.rules followsShapeOk). */
export const FOLLOWS_LIST_CAP = 200;

export interface FollowState {
  /** Workspace ids of followed temples/organisations. */
  orgIds: string[];
  /** Festival plan ids (= published festival_events doc ids). */
  festivalIds: string[];
}

export const EMPTY_FOLLOWS: FollowState = { orgIds: [], festivalIds: [] };

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

/** A raw stored value → a clean id list: strings only, trimmed,
 *  de-duplicated, order preserved, capped. Anything else → []. */
export function cleanIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const s = v.trim();
    if (s === '' || out.includes(s)) continue;
    out.push(s);
    if (out.length >= FOLLOWS_LIST_CAP) break;
  }
  return out;
}

/** Any stored/unknown value → a FollowState (never throws). */
export function mergeFollowState(raw: unknown): FollowState {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_FOLLOWS };
  const r = raw as Record<string, unknown>;
  return {
    orgIds: cleanIdList(r.orgIds),
    festivalIds: cleanIdList(r.festivalIds),
  };
}

export function isFollowingOrg(state: FollowState, orgId: string): boolean {
  return !!orgId && state.orgIds.includes(orgId);
}

export function isFollowingFestival(state: FollowState, festivalId: string): boolean {
  return !!festivalId && state.festivalIds.includes(festivalId);
}

/** state with `id` added to `field` (no-op when already present). */
export function withFollow(
  state: FollowState,
  field: keyof FollowState,
  id: string
): FollowState {
  if (!id || state[field].includes(id)) return state;
  return { ...state, [field]: [...state[field], id].slice(0, FOLLOWS_LIST_CAP) };
}

/** state with `id` removed from `field` (no-op when absent). */
export function withoutFollow(
  state: FollowState,
  field: keyof FollowState,
  id: string
): FollowState {
  if (!state[field].includes(id)) return state;
  return { ...state, [field]: state[field].filter((x) => x !== id) };
}

/* ------------------------------------------------------------------ */
/* Firestore access                                                    */
/* ------------------------------------------------------------------ */

/** The user's follows. Fail-soft: any failure reads as no follows. */
export async function readFollows(uid: string): Promise<FollowState> {
  if (!uid) return { ...EMPTY_FOLLOWS };
  try {
    const snap = await getDoc(doc(db, 'user_follows', uid));
    return snap.exists() ? mergeFollowState(snap.data()) : { ...EMPTY_FOLLOWS };
  } catch {
    return { ...EMPTY_FOLLOWS };
  }
}

/**
 * One toggle, written honestly: when the doc does not exist yet the
 * FULL shape is created (the rules' create clause pins all three
 * keys); once it exists, array-union/remove touches only the one
 * list. Returns the resulting state so callers can update their UI
 * without a second read.
 */
async function toggleFollow(
  uid: string,
  field: keyof FollowState,
  id: string,
  on: boolean
): Promise<FollowState> {
  const ref = doc(db, 'user_follows', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const base: FollowState & { updatedAt: number } = {
      orgIds: [],
      festivalIds: [],
      updatedAt: Date.now(),
    };
    if (on) base[field] = [id];
    await setDoc(ref, base);
    return { orgIds: base.orgIds, festivalIds: base.festivalIds };
  }
  const current = mergeFollowState(snap.data());
  await updateDoc(ref, {
    [field]: on ? arrayUnion(id) : arrayRemove(id),
    updatedAt: Date.now(),
  });
  return on ? withFollow(current, field, id) : withoutFollow(current, field, id);
}

export function followOrg(uid: string, orgId: string): Promise<FollowState> {
  return toggleFollow(uid, 'orgIds', orgId, true);
}

export function unfollowOrg(uid: string, orgId: string): Promise<FollowState> {
  return toggleFollow(uid, 'orgIds', orgId, false);
}

export function followFestival(uid: string, festivalId: string): Promise<FollowState> {
  return toggleFollow(uid, 'festivalIds', festivalId, true);
}

export function unfollowFestival(uid: string, festivalId: string): Promise<FollowState> {
  return toggleFollow(uid, 'festivalIds', festivalId, false);
}
