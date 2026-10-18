/**
 * tirtha/tirthaStore.ts — Tirtha Diary persistence.
 * =====================================================================
 * LOCAL-FIRST: every write lands in the device cache immediately
 * (`sb_tirtha_{uid}` in localStorage), then syncs to Firestore when
 * online. Reads serve from cache — the diary and the AI assistant work
 * fully offline.
 *
 * FIRESTORE: `tirthaVisits/{uid}/visits/{visitId}` and
 * `tirthaYatras/{uid}/yatras/{yatraId}`, owner-only rules. Writes that
 * fail (offline) stay queued in `sb_tirtha_queue_{uid}` and flush on
 * the next successful sync. Deletes are tombstoned in the queue so a
 * "forget" issued offline still deletes on the server.
 *
 * PRIVACY: the cache key includes the uid; data is never read for any
 * uid but the caller's. There is no cross-user query path in this
 * module — by construction, not just by convention.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db } from '../services/firebaseClient';
import {
  isOwnedBy,
  newVisitId,
  newYatraId,
  sanitizeVisit,
  sanitizeYatra,
  type NewVisitInput,
  type NewYatraInput,
  type TirthaStats,
  type VisitEntry,
  type Yatra,
} from './types';

interface CacheShape {
  visits: VisitEntry[];
  yatras: Yatra[];
  updatedAt: string;
}

interface QueueOp {
  op: 'upsert-visit' | 'delete-visit' | 'upsert-yatra' | 'delete-yatra';
  uid: string;
  id: string;
  payload?: VisitEntry | Yatra;
  queuedAt: string;
}

const cacheKey = (uid: string) => `sb_tirtha_${uid}`;
const queueKey = (uid: string) => `sb_tirtha_queue_${uid}`;

function emptyCache(): CacheShape {
  return { visits: [], yatras: [], updatedAt: new Date().toISOString() };
}

function readCache(uid: string): CacheShape {
  try {
    if (typeof localStorage === 'undefined' || !uid) return emptyCache();
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return emptyCache();
    const parsed = JSON.parse(raw) as Partial<CacheShape>;
    return {
      visits: Array.isArray(parsed.visits) ? parsed.visits.filter((v) => isOwnedBy(v, uid)) : [],
      yatras: Array.isArray(parsed.yatras) ? parsed.yatras.filter((y) => isOwnedBy(y, uid)) : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return emptyCache();
  }
}

function writeCache(uid: string, cache: CacheShape): void {
  try {
    if (typeof localStorage === 'undefined' || !uid) return;
    localStorage.setItem(cacheKey(uid), JSON.stringify({ ...cache, updatedAt: new Date().toISOString() }));
  } catch {
    /* storage full — the diary keeps working in memory; sync still runs */
  }
}

function readQueue(uid: string): QueueOp[] {
  try {
    if (typeof localStorage === 'undefined' || !uid) return [];
    const raw = localStorage.getItem(queueKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(uid: string, ops: QueueOp[]): void {
  try {
    if (typeof localStorage === 'undefined' || !uid) return;
    localStorage.setItem(queueKey(uid), JSON.stringify(ops));
  } catch {
    /* best effort */
  }
}

function enqueue(uid: string, op: QueueOp): void {
  const q = readQueue(uid);
  // Collapse: a delete supersedes earlier upserts for the same id.
  const filtered = op.op === 'delete-visit' || op.op === 'delete-yatra'
    ? q.filter((o) => o.id !== op.id)
    : q;
  writeQueue(uid, [...filtered, op]);
}

const visitsCol = (uid: string) => collection(db, 'tirthaVisits', uid, 'visits');
const yatrasCol = (uid: string) => collection(db, 'tirthaYatras', uid, 'yatras');

async function flushQueue(uid: string): Promise<void> {
  const ops = readQueue(uid);
  if (ops.length === 0) return;
  const remaining: QueueOp[] = [];
  for (const op of ops) {
    try {
      if (op.op === 'upsert-visit' && op.payload) {
        await setDoc(doc(visitsCol(uid), op.id), op.payload, { merge: true });
      } else if (op.op === 'delete-visit') {
        await deleteDoc(doc(visitsCol(uid), op.id));
      } else if (op.op === 'upsert-yatra' && op.payload) {
        await setDoc(doc(yatrasCol(uid), op.id), op.payload, { merge: true });
      } else if (op.op === 'delete-yatra') {
        await deleteDoc(doc(yatrasCol(uid), op.id));
      }
    } catch {
      remaining.push(op); // still offline — keep for next time
    }
  }
  writeQueue(uid, remaining);
}

/** Pull the server's truth into the local cache (newest first). */
export async function syncTirtha(uid: string): Promise<CacheShape> {
  if (!uid) return emptyCache();
  await flushQueue(uid);
  try {
    const [vSnap, ySnap] = await Promise.all([
      getDocs(query(visitsCol(uid), orderBy('visitedAt', 'desc'))),
      getDocs(query(yatrasCol(uid), orderBy('createdAt', 'desc'))),
    ]);
    const visits = vSnap.docs
      .map((d) => d.data() as VisitEntry)
      .filter((v) => isOwnedBy(v, uid));
    const yatras = ySnap.docs
      .map((d) => d.data() as Yatra)
      .filter((y) => isOwnedBy(y, uid));
    const cache: CacheShape = { visits, yatras, updatedAt: new Date().toISOString() };
    writeCache(uid, cache);
    return cache;
  } catch {
    return readCache(uid); // offline — serve what we have
  }
}

/** Record a visit. Explicit user action only — no caller may automate this. */
export async function recordVisit(uid: string, input: NewVisitInput): Promise<VisitEntry> {
  if (!uid) throw new Error('tirtha/auth-required');
  const entry = sanitizeVisit(input, uid);
  if (!entry.templeName) throw new Error('tirtha/temple-required');
  entry.id = newVisitId();

  const cache = readCache(uid);
  cache.visits = [entry, ...cache.visits.filter((v) => v.id !== entry.id)];
  writeCache(uid, cache);

  const op: QueueOp = { op: 'upsert-visit', uid, id: entry.id, payload: entry, queuedAt: new Date().toISOString() };
  try {
    await setDoc(doc(visitsCol(uid), entry.id), entry);
  } catch {
    enqueue(uid, op);
  }
  return entry;
}

/** Forget a single visit — instant, complete, no confirmation friction. */
export async function forgetVisit(uid: string, visitId: string): Promise<void> {
  if (!uid || !visitId) return;
  const cache = readCache(uid);
  cache.visits = cache.visits.filter((v) => v.id !== visitId);
  writeCache(uid, cache);
  const op: QueueOp = { op: 'delete-visit', uid, id: visitId, queuedAt: new Date().toISOString() };
  try {
    await deleteDoc(doc(visitsCol(uid), visitId));
  } catch {
    enqueue(uid, op);
  }
}

export async function createYatra(uid: string, input: NewYatraInput): Promise<Yatra> {
  if (!uid) throw new Error('tirtha/auth-required');
  const yatra: Yatra = { ...sanitizeYatra(input, uid), id: newYatraId() };
  if (!yatra.name) throw new Error('tirtha/name-required');

  const cache = readCache(uid);
  cache.yatras = [yatra, ...cache.yatras.filter((y) => y.id !== yatra.id)];
  writeCache(uid, cache);

  const op: QueueOp = { op: 'upsert-yatra', uid, id: yatra.id, payload: yatra, queuedAt: new Date().toISOString() };
  try {
    await setDoc(doc(yatrasCol(uid), yatra.id), yatra);
  } catch {
    enqueue(uid, op);
  }
  return yatra;
}

/** Assign visits to a yatra (or unassign with undefined). */
export async function assignVisitsToYatra(uid: string, visitIds: string[], yatraId?: string): Promise<void> {
  if (!uid) return;
  const cache = readCache(uid);
  const idSet = new Set(visitIds);
  cache.visits = cache.visits.map((v) =>
    idSet.has(v.id) ? { ...v, yatraId } : v
  );
  writeCache(uid, cache);
  for (const v of cache.visits.filter((v) => idSet.has(v.id))) {
    const op: QueueOp = { op: 'upsert-visit', uid, id: v.id, payload: v, queuedAt: new Date().toISOString() };
    try {
      await setDoc(doc(visitsCol(uid), v.id), v, { merge: true });
    } catch {
      enqueue(uid, op);
    }
  }
}

export async function forgetYatra(uid: string, yatraId: string, deleteVisits = false): Promise<void> {
  if (!uid || !yatraId) return;
  const cache = readCache(uid);
  const doomedVisitIds = deleteVisits
    ? cache.visits.filter((v) => v.yatraId === yatraId).map((v) => v.id)
    : [];
  cache.yatras = cache.yatras.filter((y) => y.id !== yatraId);
  if (deleteVisits) {
    cache.visits = cache.visits.filter((v) => v.yatraId !== yatraId);
  } else {
    cache.visits = cache.visits.map((v) => (v.yatraId === yatraId ? { ...v, yatraId: undefined } : v));
  }
  writeCache(uid, cache);
  const ops: QueueOp[] = [
    { op: 'delete-yatra', uid, id: yatraId, queuedAt: new Date().toISOString() },
    ...doomedVisitIds.map((id): QueueOp => ({ op: 'delete-visit', uid, id, queuedAt: new Date().toISOString() })),
  ];
  for (const op of ops) {
    try {
      const col = op.op === 'delete-yatra' ? yatrasCol(uid) : visitsCol(uid);
      await deleteDoc(doc(col, op.id));
    } catch {
      enqueue(uid, op);
    }
  }
}

/** Forget everything — the nuclear option, in settings. */
export async function forgetAll(uid: string): Promise<void> {
  if (!uid) return;
  const cache = readCache(uid);
  const visitIds = cache.visits.map((v) => v.id);
  const yatraIds = cache.yatras.map((y) => y.id);
  writeCache(uid, emptyCache());
  for (const id of visitIds) {
    try {
      await deleteDoc(doc(visitsCol(uid), id));
    } catch {
      enqueue(uid, { op: 'delete-visit', uid, id, queuedAt: new Date().toISOString() });
    }
  }
  for (const id of yatraIds) {
    try {
      await deleteDoc(doc(yatrasCol(uid), id));
    } catch {
      enqueue(uid, { op: 'delete-yatra', uid, id, queuedAt: new Date().toISOString() });
    }
  }
}

/** Local reads — used by the diary UI and the AI assistant. Never hits network. */
export function getLocalVisits(uid: string): VisitEntry[] {
  return readCache(uid).visits;
}

export function getLocalYatras(uid: string): Yatra[] {
  return readCache(uid).yatras;
}

export function getVisitsForYatra(uid: string, yatraId: string): VisitEntry[] {
  return readCache(uid).visits.filter((v) => v.yatraId === yatraId);
}

/** Warm, non-gamified lifetime stats. Private — computed locally. */
export function computeStats(uid: string): TirthaStats {
  const { visits, yatras } = readCache(uid);
  const temples = new Set(visits.map((v) => v.templeName.trim().toLowerCase()).filter(Boolean));
  const latest = visits.length > 0
    ? visits.reduce((a, b) => (a.visitedAt > b.visitedAt ? a : b)).visitedAt
    : undefined;
  return {
    visitCount: visits.length,
    yatraCount: yatras.length,
    templeCount: temples.size,
    latestVisitAt: latest,
  };
}

/** Pending offline operations — surfaced subtly in the UI ("will sync"). */
export function pendingSyncCount(uid: string): number {
  return readQueue(uid).length;
}
