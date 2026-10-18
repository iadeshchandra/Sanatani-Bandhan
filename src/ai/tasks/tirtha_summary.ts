/**
 * TASK: tirtha_summary
 * =====================================================================
 * DATA SOURCE: the devotee's OWN Tirtha Diary — the device-local cache
 * (`sb_tirtha_{uid}` in localStorage, mirrored from their owner-only
 * Firestore). Keyed by uid; never leaves the device in this task;
 * never mixed with another user's data.
 * OFFLINE STORY: fully offline — reads the local cache only.
 * FAIL-OPEN: corrupt/missing storage → the 'empty' variant, never a crash.
 * PRIVACY: this task answers ONLY about the asker's own visits. There
 * is no code path here that reads another devotee's diary.
 *
 * NOTE: reads the cache directly (like sadhana_summary) rather than
 * importing tirthaStore, keeping this task free of the Firestore SDK.
 */
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';

interface CachedVisit {
  id?: string;
  uid?: string;
  templeName?: string;
  visitedAt?: string;
  yatraId?: string;
}

interface CachedYatra {
  id?: string;
  uid?: string;
}

function readCache(uid: string): { visits: CachedVisit[]; yatras: CachedYatra[] } {
  try {
    if (typeof localStorage === 'undefined' || !uid) return { visits: [], yatras: [] };
    const raw = localStorage.getItem(`sb_tirtha_${uid}`);
    if (!raw) return { visits: [], yatras: [] };
    const parsed = JSON.parse(raw) as { visits?: CachedVisit[]; yatras?: CachedYatra[] };
    const visits = Array.isArray(parsed.visits)
      ? parsed.visits.filter((v) => v && v.uid === uid)
      : [];
    const yatras = Array.isArray(parsed.yatras)
      ? parsed.yatras.filter((y) => y && y.uid === uid)
      : [];
    return { visits, yatras };
  } catch {
    return { visits: [], yatras: [] };
  }
}

export function tirthaSummaryTask(ctx: TaskCtx): TaskOutcome {
  const uid = ctx.uid;
  if (!uid || uid === 'anon') {
    return { params: {}, variant: 'empty' };
  }
  const { visits, yatras } = readCache(uid);
  if (visits.length === 0) {
    return { params: {}, variant: 'empty' };
  }
  const temples = new Set(
    visits.map((v) => (v.templeName || '').trim().toLowerCase()).filter(Boolean)
  );
  const latest = visits[0]; // cache is newest-first
  return {
    params: {
      visitCount: visits.length,
      templeCount: temples.size,
      yatraCount: yatras.length,
      latestTemple: latest?.templeName || '',
      latestAt: (latest?.visitedAt || '').slice(0, 10),
    },
    variant: 'summary',
    suggestions: suggestionsFor('tirtha_summary', ctx.lang),
  };
}
