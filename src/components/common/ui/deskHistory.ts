import { get, set } from 'idb-keyval';

const PINNED_KEY = 'sanatani_pinned_desks';
const RECENT_KEY = 'sanatani_recent_desks';
const MAX_RECENTS = 5;

/**
 * Shared persistence for sidebar favorites + command-palette recents.
 * Stored in IndexedDB (survives the offline-first lifecycle); falls back
 * to in-memory when storage is unavailable.
 *
 * QUEUED #50 (audit D11b): lists are scoped PER WORKSPACE. The original
 * single global list leaked across org contexts — a desk visited in the
 * Ashram (Annakshetra One) appeared in the Mandir's and Gurukul's RECENT
 * lists. Callers pass the active workspace id as `scope`; the storage
 * key becomes `sanatani_recent_desks::<scope>`. Unscoped calls keep the
 * legacy key (back-compat for any caller without a workspace context).
 */
const mem: Record<string, string[]> = {};

/** Storage key for a list kind + workspace scope. Pure — pinned by tests. */
export function deskHistoryKey(
  kind: 'pinned' | 'recent',
  scope?: string | null,
): string {
  const base = kind === 'pinned' ? PINNED_KEY : RECENT_KEY;
  const clean = typeof scope === 'string' ? scope.trim() : '';
  return clean ? `${base}::${clean}` : base;
}

/**
 * Guards against corrupt/stale stored ids (e.g. desk ids renamed between
 * releases, or the literal string "undefined" leaking in from a bad call).
 */
function sanitizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.filter(
    (id): id is string =>
      typeof id === 'string' && id.trim() !== '' && id !== 'undefined' && id !== 'null'
  );
}

async function read(key: string): Promise<string[]> {
  try {
    const v = await get<string[]>(key);
    const clean = sanitizeIds(v);
    // Self-heal: persist the cleaned list so one bad write can't haunt the UI.
    if (Array.isArray(v) && clean.length !== v.length) {
      try { await set(key, clean); } catch { /* ignore */ }
      mem[key] = clean;
    }
    return clean;
  } catch {
    /* idb unavailable — use memory */
  }
  return sanitizeIds(mem[key]);
}

async function write(key: string, value: string[]): Promise<void> {
  const clean = sanitizeIds(value);
  mem[key] = clean;
  try {
    await set(key, clean);
  } catch {
    /* ignore */
  }
}

export async function getPinnedDesks(scope?: string | null): Promise<string[]> {
  return read(deskHistoryKey('pinned', scope));
}

/**
 * Replace the whole pinned set (used by the first-run Setup Wizard to pin
 * the user's essential desks). Extends the existing favorites system —
 * no parallel storage.
 */
export async function setPinnedDesks(ids: string[], scope?: string | null): Promise<string[]> {
  const clean = sanitizeIds(ids);
  await write(deskHistoryKey('pinned', scope), clean);
  return clean;
}

export async function togglePinnedDesk(id: string, scope?: string | null): Promise<string[]> {
  const key = deskHistoryKey('pinned', scope);
  const pinned = await read(key);
  const next = pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id];
  await write(key, next);
  return next;
}

export async function getRecentDesks(scope?: string | null): Promise<string[]> {
  return read(deskHistoryKey('recent', scope));
}

export async function recordDeskVisit(id: string, scope?: string | null): Promise<string[]> {
  const key = deskHistoryKey('recent', scope);
  const recents = (await read(key)).filter((r) => r !== id);
  const next = [id, ...recents].slice(0, MAX_RECENTS);
  await write(key, next);
  return next;
}
