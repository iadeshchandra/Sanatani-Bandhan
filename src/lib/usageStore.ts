/**
 * usageStore.ts — VIBE B2: device-local tap counts behind "Your usual".
 * =====================================================================
 * The homes' "Your usual" row must be honest: it may only surface what
 * THIS user, on THIS device, actually opens. This store is the whole
 * of its evidence — a per-scope count of opens, kept in localStorage.
 *
 * Laws:
 *  · LOCAL ONLY. Counts never leave the device: no Firestore write, no
 *    analytics event, no sync. Clearing site data clears the row.
 *  · SCOPED. Org counts are keyed by workspace id (a desk loved in the
 *    Ashram must not follow the user into the Mandir — the same law
 *    deskHistory.ts keeps for recents/pins). Solo uses the 'solo' scope.
 *  · NO SCORES OUTWARD. Counts exist only to ORDER the row. They are
 *    never rendered (no points, no streaks, no badges — Blueprint D).
 *  · FAIL-SILENT. Storage full/blocked → in-memory fallback; the row
 *    degrades to recents/pins/starters, never to an error.
 */

export interface UsageEntry {
  id: string;
  count: number;
  /** Epoch ms of the most recent open. */
  last: number;
}

const STORAGE_PREFIX = 'sanatani_usage_v1';

interface UsageStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memoryFallback = new Map<string, string>();

function resolveStorage(): UsageStorage {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (ls) {
      const probe = '__sanatani_usage_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    /* storage blocked (private mode, quota) — memory keeps the row alive */
  }
  return {
    getItem: (k) => memoryFallback.get(k) ?? null,
    setItem: (k, v) => {
      memoryFallback.set(k, v);
    },
    removeItem: (k) => {
      memoryFallback.delete(k);
    },
  };
}

/** Storage key for a scope. Pure — pinned by tests. */
export function usageScopeKey(scope?: string | null): string {
  const clean = typeof scope === 'string' ? scope.trim() : '';
  return clean ? `${STORAGE_PREFIX}::${clean}` : STORAGE_PREFIX;
}

type UsageMap = Record<string, { c: number; t: number }>;

function readMap(scope?: string | null): UsageMap {
  try {
    const raw = resolveStorage().getItem(usageScopeKey(scope));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: UsageMap = {};
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      const rec = v as { c?: unknown; t?: unknown };
      if (typeof rec?.c === 'number' && rec.c > 0) {
        out[id] = { c: Math.floor(rec.c), t: typeof rec.t === 'number' ? rec.t : 0 };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(scope: string | null | undefined, map: UsageMap): void {
  try {
    resolveStorage().setItem(usageScopeKey(scope), JSON.stringify(map));
  } catch {
    /* fail-silent by law */
  }
}

/** Record one real open of `id` within `scope`. Never throws. */
export function recordUse(id: string, scope?: string | null): void {
  if (!id || typeof id !== 'string') return;
  const map = readMap(scope);
  const prev = map[id];
  map[id] = { c: (prev?.c ?? 0) + 1, t: Date.now() };
  writeMap(scope, map);
}

/** All recorded usage for a scope, most-used first (count, then recency). */
export function readUsage(scope?: string | null): UsageEntry[] {
  const map = readMap(scope);
  return Object.entries(map)
    .map(([id, v]) => ({ id, count: v.c, last: v.t }))
    .sort((a, b) => b.count - a.count || b.last - a.last);
}

/** True when the scope carries ANY recorded open (the cold-start test). */
export function hasAnyUsage(scope?: string | null): boolean {
  return Object.keys(readMap(scope)).length > 0;
}

/** Forget a scope's counts (also used by tests). Never throws. */
export function clearUsage(scope?: string | null): void {
  try {
    resolveStorage().removeItem(usageScopeKey(scope));
  } catch {
    /* fail-silent by law */
  }
}

/**
 * Rank candidate ids for the row. Pure — pinned by tests.
 *
 * Order: tap count desc → most recently used → the caller's own order
 * (recents arrive MRU-first, pins in the user's chosen order, starters
 * in canonical order). Ids with no usage sink below every used id but
 * keep their caller order among themselves.
 */
export function rankByUsage(
  candidateIds: string[],
  usage: UsageEntry[],
): string[] {
  const byId = new Map(usage.map((u) => [u.id, u]));
  return candidateIds
    .map((id, idx) => ({ id, idx, u: byId.get(id) }))
    .sort((a, b) => {
      const ca = a.u?.count ?? 0;
      const cb = b.u?.count ?? 0;
      if (cb !== ca) return cb - ca;
      const la = a.u?.last ?? 0;
      const lb = b.u?.last ?? 0;
      if (lb !== la) return lb - la;
      return a.idx - b.idx;
    })
    .map((x) => x.id);
}
