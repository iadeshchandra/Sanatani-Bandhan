/**
 * followedFestivalNotifyService — NOTIFICATION WAVE 1: the
 * self-listen watcher for followed-org festival alerts (DESIGN
 * §2.2, closes G3).
 * ==========================================================================
 * Following a temple must mean hearing when it publishes a festival.
 * My follows are the A1 union — `user_follows/{uid}` (orgIds +
 * festivalIds) ∪ the org-side followers store (the same resolution
 * broadcastService.fetchFollowedOrgs performs). The published
 * festival_events docs of those orgs are public reads; my device
 * diffs them against its seen ledger (pure half:
 * lib/followedFestivalNotify) and emits the new ones into my own
 * inbox. One bell per festival, ever — a member who also follows
 * the org still hears it exactly once (single watcher, one dedupe
 * key).
 *
 * Baseline law: the FIRST run records the current shelf of
 * published festivals and rings nothing.
 */
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyFestivalPublished } from '../notifications/notifyHelpers';
import { readFollows } from './follows';
import { fetchFollowedOrgs } from '../org/broadcastService';
import {
  pickNewFestivals,
  type FollowedFestivalLike,
} from './followedFestivalNotify';

const SEEN_KEY = 'sb.followedFestivalNotify.seen.v1';
const BASELINE_KEY = 'sb.followedFestivalNotify.baselined.v1';
const POLL_MS = 60_000;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — bells may repeat, never crash */
  }
}

interface FestivalDoc extends FollowedFestivalLike {
  orgName: string;
  nameEn: string;
}

function toFestivalDoc(id: string, data: Record<string, unknown>): FestivalDoc {
  return {
    id,
    workspaceId: typeof data.workspaceId === 'string' ? data.workspaceId : '',
    published: data.published === true,
    festivalCancelled: data.festivalCancelled === true,
    orgName: typeof data.orgName === 'string' ? data.orgName : '',
    nameEn: (data.name as { en?: string } | undefined)?.en || '',
  };
}

async function runCheck(uid: string): Promise<void> {
  const [mine, orgSide] = await Promise.all([
    readFollows(uid),
    fetchFollowedOrgs(uid).catch(() => []),
  ]);
  const orgIds = new Set<string>(mine.orgIds);
  for (const f of orgSide) if (f.orgId) orgIds.add(f.orgId);
  if (orgIds.size === 0 && mine.festivalIds.length === 0) return;

  const byId = new Map<string, FestivalDoc>();
  for (const orgId of orgIds) {
    try {
      const snap = await getDocs(
        query(collection(db, 'festival_events'), where('workspaceId', '==', orgId)),
      );
      snap.forEach((d) => {
        const doc = toFestivalDoc(d.id, d.data() as Record<string, unknown>);
        if (doc.workspaceId) byId.set(doc.id, doc);
      });
    } catch {
      /* fail-soft per org: one bad read never silences the rest */
    }
  }
  for (const festivalId of mine.festivalIds) {
    if (byId.has(festivalId)) continue;
    try {
      const snap = await getDoc(doc(db, 'festival_events', festivalId));
      if (snap.exists()) {
        const doc = toFestivalDoc(snap.id, snap.data() as Record<string, unknown>);
        if (doc.workspaceId) byId.set(doc.id, doc);
      }
    } catch {
      /* fail-soft per series */
    }
  }
  if (byId.size === 0) return;

  const seen = new Set(readJson<string[]>(SEEN_KEY, []));
  const { notices, settled } = pickNewFestivals([...byId.values()], seen);
  for (const id of settled) seen.add(id);
  writeJson(SEEN_KEY, [...seen].slice(-800));

  const baselined = readJson<boolean>(BASELINE_KEY, false);
  if (!baselined) {
    writeJson(BASELINE_KEY, true);
    return; // baseline law: the current shelf never bursts
  }

  for (const n of notices) {
    const f = byId.get(n.festival.id);
    if (!f) continue;
    try {
      await notifyFestivalPublished(uid, {
        orgId: f.workspaceId,
        orgName: f.orgName || 'Your temple',
        festivalId: f.id,
        festivalName: f.nameEn || 'Festival',
        dedupeKey: n.dedupeKey,
      });
    } catch {
      /* one failed bell must not stop the others */
    }
  }
}

/** Start the watcher for a signed-in user. Returns a stop fn. */
export function startFollowedFestivalNotify(uid: string): () => void {
  let stopped = false;
  let timer: number | undefined;

  const tick = () => {
    if (stopped) return;
    runCheck(uid).catch(() => undefined);
  };
  const schedule = () => {
    timer = window.setTimeout(
      () => {
        tick();
        schedule();
      },
      POLL_MS + Math.floor(Math.random() * 15_000),
    );
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') tick();
  };

  tick();
  schedule();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
