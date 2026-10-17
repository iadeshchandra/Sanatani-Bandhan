/**
 * guide/guideProgress.ts — "has this devotee seen this guide?"
 * =============================================================
 * Per-user, per-guide progress in localStorage. The key carries the uid
 * so a completed or dismissed guide never re-shows for that devotee —
 * while a "Take a tour" restart always works on demand.
 *
 * Never throws: storage failures degrade to "unseen" (the gentle pill
 * may show again, but nothing ever breaks).
 */

const KEY_PREFIX = 'sb-guide-v1:';

export type GuideStatus = 'unseen' | 'offered' | 'active' | 'done' | 'dismissed';

function keyFor(guideId: string, uid: string): string {
  const safeUid = (uid || 'anon').slice(0, 64);
  const safeId = (guideId || 'unknown').slice(0, 64);
  return `${KEY_PREFIX}${safeUid}:${safeId}`;
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* calm: never crash on storage */
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* calm */
  }
}

/** Last persisted status for this devotee + guide. Defaults to 'unseen'. */
export function getGuideStatus(guideId: string, uid: string): GuideStatus {
  const v = read(keyFor(guideId, uid));
  if (v === 'offered' || v === 'active' || v === 'done' || v === 'dismissed') return v;
  return 'unseen';
}

/** Persist a status transition. */
export function setGuideStatus(guideId: string, uid: string, status: GuideStatus): void {
  write(keyFor(guideId, uid), status);
}

/** Forget this guide for this devotee (used by "Take a tour" restart flows in tests). */
export function resetGuide(guideId: string, uid: string): void {
  remove(keyFor(guideId, uid));
}
