/**
 * herdCount.ts — QUEUED #59 (audit A4-1): ONE herd resolver for every
 * surface that shows a goshala's headcount.
 *
 * The defect: the Command Center hero counted DataContext `cows` (a
 * Firestore/legacy register) while Goshala One keeps its herd ONLY in
 * its device-local suite store (`sb_goshala_<ws>`, `state.nandis`) and
 * never writes the DataContext register. A goshala that registered its
 * animals in Goshala One watched the Nandi Registry grow while "Gau
 * Mata Under Care" on the Command Center kept showing the other
 * register's number (0 for a suite-only org) — two truths, one screen
 * apart.
 *
 * The law after #59: the Goshala One suite store is the register of
 * record for the herd. Every surface reads through `resolveHerdCount`:
 *   1. a live suite count (the desk itself, inside GoshalaProvider)
 *      wins — it is the register, mid-session edits included;
 *   2. else the persisted suite store on this device (the Command
 *      Center renders outside the provider, but the store it must
 *      agree with is the same localStorage blob the desk maintains);
 *   3. else the legacy DataContext cow count — orgs that recorded
 *      cattle through the older desks before Goshala One existed
 *      still have real animals there, and no suite blob exists yet.
 * A persisted blob with an empty `nandis` array is a REAL zero (the
 * desk was used and the herd is empty), never a fallback trigger.
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

/** The Goshala One persistence key (mirrors goshalaStore.storageKey). */
export const goshalaStoreKey = (workspaceId: string): string =>
  `sb_goshala_${workspaceId}`;

/**
 * Headcount from the persisted Goshala One store, or null when this
 * device holds no readable suite store for the workspace (desk never
 * opened here, or the blob is corrupt — both mean "no suite register
 * on this device", not "zero cattle").
 */
export function readPersistedHerdCount(
  workspaceId: string,
  storage: StorageLike | null = defaultStorage(),
): number | null {
  if (!storage || !workspaceId) return null;
  try {
    const raw = storage.getItem(goshalaStoreKey(workspaceId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const nandis = (parsed as { nandis?: unknown }).nandis;
    if (!Array.isArray(nandis)) return null;
    return nandis.length;
  } catch {
    return null;
  }
}

/**
 * The single herd number every surface renders. See the header for the
 * precedence law; `legacyCowCount` is the caller's DataContext count.
 */
export function resolveHerdCount(
  workspaceId: string,
  opts: {
    legacyCowCount: number;
    liveSuiteCount?: number;
    storage?: StorageLike | null;
  },
): number {
  if (typeof opts.liveSuiteCount === 'number') return opts.liveSuiteCount;
  const persisted = readPersistedHerdCount(
    workspaceId,
    opts.storage === undefined ? defaultStorage() : opts.storage,
  );
  if (persisted !== null) return persisted;
  return opts.legacyCowCount;
}
