/**
 * platformNoticeService.ts — NOTIFICATION WAVE 4: the platform
 * notice shelf (IO + watcher) and the GodMode desk's write path.
 * =====================================================================
 * READS — the watcher fetches the small `platformNotices` shelf on
 * the house cadence (60s poll + visibility re-check). The rules make
 * the shelf readable by any signed-in user; the shelf is tiny by
 * nature (the platform speaks rarely), so a plain collection read,
 * sorted on-device, needs no index and no server.
 *
 * WRITES — publish / setActive / delete are called only from the
 * GodMode Notices desk. The RULES are the boundary (SuperAdmin-only,
 * schema-pinned); this module just shapes the writes.
 *
 * RINGING — baseline law (L5): the first pass settles everything
 * live and rings nothing, so the wave landing never bursts a bell
 * on every phone. After that, a notice rings exactly once per
 * device (the seen ledger), in the user's own language (the
 * dictionary frame; the notice's own words are the admin's).
 * Expiry is honoured by the picker — an expired maintenance notice
 * never rings late.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { startPollLoop } from './pollCadence';
import {
  buildPlatformNoticeDoc,
  pickNewPlatformNotices,
  type PlatformNoticeKind,
  type PlatformNoticeLike,
} from './platformNotices';

const SEEN_KEY = 'sb.platformNotice.seen.v1';
const BASELINE_KEY = 'sb.platformNotice.baseline.v1';

/** Defensive doc → runtime shape. Junk docs are dropped, never crash. */
export function platformNoticeFromDoc(
  id: string,
  data: Record<string, unknown> | null | undefined,
): PlatformNoticeLike | null {
  if (!data || typeof data.title !== 'string' || !data.title) return null;
  return {
    id,
    title: data.title,
    body: typeof data.body === 'string' ? data.body : '',
    kind: data.kind === 'important' ? 'important' : 'info',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : 0,
    active: data.active === true,
  };
}

/** The whole shelf, newest first (GodMode list + watcher source). */
export async function fetchPlatformNotices(): Promise<PlatformNoticeLike[]> {
  const snap = await getDocs(collection(db, 'platformNotices'));
  const out: PlatformNoticeLike[] = [];
  snap.forEach((d) => {
    const n = platformNoticeFromDoc(d.id, d.data() as Record<string, unknown>);
    if (n) out.push(n);
  });
  out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return out;
}

/* ------------------------- GodMode write path ------------------------- */

/** Publish a notice. Rules refuse anyone but a SuperAdmin. */
export async function publishPlatformNotice(args: {
  title: string;
  body?: string;
  kind: PlatformNoticeKind;
  /** Epoch ms; 0 = the notice does not expire. */
  expiresAt: number;
}): Promise<string> {
  const notice = buildPlatformNoticeDoc({
    title: args.title,
    body: args.body,
    kind: args.kind,
    createdAt: Date.now(),
    expiresAt: args.expiresAt,
  });
  const ref = await addDoc(collection(db, 'platformNotices'), { ...notice });
  return ref.id;
}

/** The desk's only edit: switch a notice on/off (rules pin the flip). */
export async function setPlatformNoticeActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'platformNotices', id), { active });
}

/** Remove a notice entirely (SuperAdmin-only in rules). */
export async function deletePlatformNotice(id: string): Promise<void> {
  await deleteDoc(doc(db, 'platformNotices', id));
}

/* ------------------------------ watcher ------------------------------ */

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen).slice(-400)));
  } catch {
    /* storage full/blocked — ringing stays best-effort */
  }
}

function loadBaseline(): boolean {
  try {
    return localStorage.getItem(BASELINE_KEY) === '1';
  } catch {
    return true; // if storage is unreadable, settle silently
  }
}

function saveBaseline(): void {
  try {
    localStorage.setItem(BASELINE_KEY, '1');
  } catch {
    /* ignore */
  }
}

async function check(uid: string): Promise<void> {
  const baseline = !loadBaseline();
  const seen = loadSeen();
  let shelf: PlatformNoticeLike[];
  try {
    shelf = await fetchPlatformNotices();
  } catch {
    return; // offline / denied: stay silent, retry next cadence
  }
  const { notices, settled } = pickNewPlatformNotices(shelf, seen, Date.now());
  for (const id of settled) seen.add(id);
  saveSeen(seen);
  if (baseline) {
    saveBaseline();
    return; // baseline law: first pass rings nothing
  }
  if (notices.length === 0) return;
  try {
    const helpers = await import('../notifications/notifyHelpers');
    for (const pick of notices) {
      helpers.notifyPlatformNotice(uid, {
        noticeId: pick.notice.id,
        title: pick.notice.title,
        body: pick.notice.body,
        kind: pick.notice.kind,
        dedupeKey: pick.dedupeKey,
      });
    }
  } catch {
    /* ringing is best-effort; the centre keeps its own ledger */
  }
}

/**
 * Start watching the platform notice shelf for this signed-in user.
 * Returns the stop function. Safe to call once per session.
 */
export function startPlatformNoticeNotify(uid: string): () => void {
  if (!uid) return () => undefined;
  return startPollLoop(() => check(uid), { baseMs: 60000 });
}
