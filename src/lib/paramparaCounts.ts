/**
 * paramparaCounts.ts — QUEUED #59 (audit A4-3): the GurukulHome
 * "Parampara" card's numbers, read from the register that actually
 * holds them.
 *
 * The defect: the card derived its Acharya count from
 * `localStorage sb_gurukul_exams_<ws>` — a legacy key the current
 * Pathshala suite never writes (everything persists inside
 * `sb_pathshala_<ws>`) — and then floored the result with
 * `Math.max(acharyas.length, 3)`, so the card invented at least three
 * acharyas for every gurukul, forever. A fabricated number on a live
 * home surface.
 *
 * The truth: Pathshala One's store is the register of record — its
 * `gurus` are the acharyas of the pathshala and its `parikshas` are
 * the examinations held. GurukulHome renders on the Command Center,
 * outside PathshalaProvider, so it reads the same persisted blob the
 * desk maintains (device-local by design, exactly like the desk).
 * No blob / corrupt blob / missing arrays → honest zeros.
 */

interface StorageLike {
  getItem(key: string): string | null;
}

function defaultStorage(): StorageLike | null {
  try {
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

/** The Pathshala One persistence key (mirrors pathshalaStore.storageKey). */
export const pathshalaStoreKey = (workspaceId: string): string =>
  `sb_pathshala_${workspaceId}`;

export interface ParamparaCounts {
  /** Registered gurus (the pathshala's acharyas) in the suite store. */
  acharyaCount: number;
  /** Examinations recorded in the suite store. */
  parikshaCount: number;
}

export function readParamparaCounts(
  workspaceId: string,
  storage: StorageLike | null = defaultStorage(),
): ParamparaCounts {
  const zeros: ParamparaCounts = { acharyaCount: 0, parikshaCount: 0 };
  if (!storage || !workspaceId) return zeros;
  try {
    const raw = storage.getItem(pathshalaStoreKey(workspaceId));
    if (!raw) return zeros;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return zeros;
    const state = parsed as { gurus?: unknown; parikshas?: unknown };
    return {
      acharyaCount: Array.isArray(state.gurus) ? state.gurus.length : 0,
      parikshaCount: Array.isArray(state.parikshas) ? state.parikshas.length : 0,
    };
  } catch {
    return zeros;
  }
}
