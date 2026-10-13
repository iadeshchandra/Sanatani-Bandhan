import { get, set } from 'idb-keyval';

const PINNED_KEY = 'sanatani_pinned_desks';
const RECENT_KEY = 'sanatani_recent_desks';
const MAX_RECENTS = 5;

/**
 * Shared persistence for sidebar favorites + command-palette recents.
 * Stored in IndexedDB (survives the offline-first lifecycle); falls back
 * to in-memory when storage is unavailable.
 */
const mem: Record<string, string[]> = {};

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

export async function getPinnedDesks(): Promise<string[]> {
  return read(PINNED_KEY);
}

/**
 * Replace the whole pinned set (used by the first-run Setup Wizard to pin
 * the user's essential desks). Extends the existing favorites system —
 * no parallel storage.
 */
export async function setPinnedDesks(ids: string[]): Promise<string[]> {
  const clean = sanitizeIds(ids);
  await write(PINNED_KEY, clean);
  return clean;
}

export async function togglePinnedDesk(id: string): Promise<string[]> {
  const pinned = await read(PINNED_KEY);
  const next = pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id];
  await write(PINNED_KEY, next);
  return next;
}

export async function getRecentDesks(): Promise<string[]> {
  return read(RECENT_KEY);
}

export async function recordDeskVisit(id: string): Promise<string[]> {
  const recents = (await read(RECENT_KEY)).filter((r) => r !== id);
  const next = [id, ...recents].slice(0, MAX_RECENTS);
  await write(RECENT_KEY, next);
  return next;
}
