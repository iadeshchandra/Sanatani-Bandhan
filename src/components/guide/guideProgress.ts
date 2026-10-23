/**
 * guide/guideProgress.ts — "has this devotee seen this guide?"
 * =============================================================
 * Per-user, per-guide progress in localStorage. The key carries the uid
 * so a completed or dismissed guide never re-shows for that devotee —
 * while a "Take a tour" restart always works on demand.
 *
 * Never throws: storage failures degrade to "unseen" (the gentle pill
 * may show again, but nothing ever breaks).
 *
 * U8d law — 'active' is a live-session state, never a resting one.
 * start()/restart() persist 'active', and the only exits are finish()
 * (→ done/dismissed). A session that ends mid-tour — app killed, tab
 * closed, or the devotee simply taps another tab (the coach mark is
 * non-blocking, so WalletTab unmounts with the tour still open) —
 * leaves 'active' behind in storage. Reading it back verbatim on the
 * next mount resurrected the tour over and over for returning users
 * who never asked for it in that session. So getGuideStatus decays a
 * persisted 'active' to 'offered': the tour opens ONLY on a tap in
 * the current session; an interrupted tour stays quietly offered
 * (no pill re-nag — the pill shows only for 'unseen' — and the
 * "🪔 Take a tour" link remains as the on-demand door).
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

/**
 * Last persisted status for this devotee + guide. Defaults to 'unseen'.
 *
 * A persisted 'active' is NEVER returned as 'active' (see the U8d law
 * in the header): it belongs to a previous, interrupted session and
 * decays to 'offered'. The in-session state machine (useGuide) holds
 * its own live 'active' in React state after an explicit tap — this
 * read path is only consulted when a surface (re)mounts, which is
 * exactly when a tour must not resurrect itself.
 */
export function getGuideStatus(guideId: string, uid: string): GuideStatus {
  const v = read(keyFor(guideId, uid));
  if (v === 'active') return 'offered';
  if (v === 'offered' || v === 'done' || v === 'dismissed') return v;
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
