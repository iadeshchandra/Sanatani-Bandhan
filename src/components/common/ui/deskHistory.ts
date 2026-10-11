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

async function read(key: string): Promise<string[]> {
  try {
    const v = await get<string[]>(key);
    if (Array.isArray(v)) return v;
  } catch {
    /* idb unavailable — use memory */
  }
  return mem[key] || [];
}

async function write(key: string, value: string[]): Promise<void> {
  mem[key] = value;
  try {
    await set(key, value);
  } catch {
    /* ignore */
  }
}

export async function getPinnedDesks(): Promise<string[]> {
  return read(PINNED_KEY);
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
