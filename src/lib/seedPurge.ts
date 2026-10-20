/**
 * seedPurge.ts — QUEUED #53: purge pre-law seed residue from device stores.
 *
 * Queued #45's seed law stops NEW seeding in real workspaces, but devices
 * that ran a pre-law build already PERSISTED the fictitious seed records
 * into each suite store's localStorage entry (`sb_<suite>_<workspaceId>`).
 * The provider's persist effect faithfully re-saves them forever, so an
 * upgraded device keeps the phantom herd / rooms / meals indefinitely
 * (live retest 2026-10-21: Goshala One still listed 8 seeded cattle incl.
 * "Kapila (GM-0005)" in a real org whose Command Center honestly read 0).
 *
 * This module is the one-time, versioned cleanup. SAFETY CONTRACT — the
 * whole design exists to make deleting a real record impossible:
 *
 *  1. EXACT OWN-ID MATCH ONLY. A record is removed iff its own `id` is a
 *     member of the suite's deterministic buildSeed id set (below). No
 *     name/amount/date heuristics, ever.
 *  2. Real records cannot collide in practice: every record-creation site
 *     in every suite mints ids via `uid(prefix)` =
 *     `prefix_<8-char base36 Date.now()><1–3 rand chars>`, while every seed
 *     id is a fixed literal constant that only `buildSeed()` emits. The
 *     registry test pins this: no registered id has a uid structure whose
 *     8-char segment decodes to a timestamp in the era when residue could
 *     have been created (the one word-like long id, `rc_purisabzi`, decodes
 *     to 2034), and every buildSeed literal in the store sources is
 *     registered — completeness by source scan, not by memory.
 *  3. REAL WORKSPACES ONLY. `allowsSeedData(ws)` (demo / legacy fixture
 *     contexts) returns the state untouched — demo seeds are legitimate.
 *  4. DEVICE-LOCAL ONLY. This touches localStorage state objects at load
 *     time; nothing here reads or writes Firestore/cloud data.
 *  5. Collections whose seed rows were minted with `uid()` (goshala
 *     milk/fodderUse; pathshala upasthiti/staffUpasthiti/marks/skillGrades)
 *     are deliberately ABSENT from the registry: their rows are format-
 *     identical to real rows and cannot be distinguished with certainty,
 *     so they are NOT purged (flagged residual — see QUEUED #53 report).
 *  6. `settings` is never a registry key — user settings are untouchable.
 *
 * The migration runs inside each store's `loadState` — before the first
 * render of the data — and is marker-gated (`sb_seedpurge_v<N>_<suite>_<ws>`)
 * so it executes once per workspace per version. It is idempotent: a
 * second run over purged state removes nothing.
 */
import { allowsSeedData } from './workspaceKind';

export const SEED_PURGE_VERSION = 1;

/** suite -> collection key -> deterministic buildSeed record ids. */
export const SUITE_SEED_IDS: Record<string, Record<string, readonly string[]>> = {
  goshala: {
    nandis: ['n_1', 'n_2', 'n_3', 'n_4', 'n_5', 'n_6', 'n_7', 'n_8'],
    health: ['h_1', 'h_2', 'h_3', 'h_4', 'h_5'],
    disposals: ['d_1', 'd_2', 'd_3'],
    fodderItems: ['f_1', 'f_2', 'f_3', 'f_4'],
    sponsorships: ['sp_1', 'sp_2', 'sp_3'],
    duties: ['du_1', 'du_2', 'du_3', 'du_4', 'du_5', 'du_6'],
    grants: ['g_1', 'g_2'],
    expenses: ['e_1', 'e_2', 'e_3'],
    // milk + fodderUse: seed rows carry uid() ids — NOT registered (law 5).
  },
  ashram: {
    rooms: ['r_101', 'r_102', 'r_103', 'r_104', 'r_201', 'r_202', 'r_d1', 'r_d2', 'r_105'],
    stays: ['s_1', 's_2', 's_3'],
    bookings: ['b_1', 'b_2'],
    meals: ['m_1', 'm_2'],
  },
  annakshetra: {
    items: ['it_rice', 'it_dal', 'it_atta', 'it_oil', 'it_ghee', 'it_sugar', 'it_milk', 'it_potato', 'it_onion', 'it_salt'],
    recipes: ['rc_khichdi', 'rc_purisabzi', 'rc_kheer'],
    bhandaras: ['bh_seed1'],
    meals: ['ml_1', 'ml_2'],
  },
  matha: {
    sannyasis: ['sn_1', 'sn_2'],
    dinacharya: ['d_1', 'd_2', 'd_3', 'd_4', 'd_5'],
    observances: ['o_1'],
  },
  nyas: {
    compliance: ['c_seed_10bd', 'c_seed_10be', 'c_seed_audit', 'c_seed_itr7', 'c_seed_fcra', 'c_seed_bm1', 'c_seed_bm2', 'c_seed_bm3', 'c_seed_bm4'],
    registrations: ['r_seed_pan'],
  },
  utsav: {
    festivals: ['f_seed'],
    budget: ['b_s1', 'b_s2', 'b_s3', 'b_s4', 'b_s5'],
    members: ['m_s1', 'm_s2', 'm_s3'],
    tasks: ['t_s1', 't_s2'],
    vendors: ['v_s1'],
    program: ['p_s1', 'p_s2'],
    safety: ['s_s1', 's_s2', 's_s3', 's_s4', 's_s5'],
  },
  tirth: {
    slots: ['sl_morn', 'sl_senior', 'sl_eve', 'sl_aarti'],
    tokens: ['tk_s1', 'tk_s2', 'tk_s3', 'tk_s4'],
  },
  yoga: {
    instructors: ['i_1'],
    batches: ['b_morn', 'b_eve'],
    students: ['s_1', 's_2'],
    attendance: ['a_1', 'a_2'],
  },
  satsang: {
    members: ['m_1', 'm_2', 'm_3'],
    gatherings: ['g_1'],
    bhajans: ['b_1', 'b_2', 'b_3'],
    fund: ['f_1'],
  },
  sabha: {
    members: ['m_1', 'm_2', 'm_3'],
    trainings: ['t_1'],
    notices: ['n_1'],
  },
  pathshala: {
    vargas: ['v_prathama', 'v_madhyama', 'v_shastri', 'v_acharya'],
    gurus: ['g_1', 'g_2', 'g_3', 'g_4', 'g_5'],
    staff: ['s_1', 's_2'],
    subjects: [
      'sub_p1', 'sub_p2', 'sub_p3', 'sub_p4', 'sub_p5',
      'sub_m1', 'sub_m2', 'sub_m3', 'sub_m4', 'sub_m5',
      'sub_s1', 'sub_s2', 'sub_s3', 'sub_a1', 'sub_a2',
    ],
    feeHeads: ['fh_1', 'fh_2', 'fh_3', 'fh_4'],
    parikshas: ['par_1'],
    classRoutines: ['cr_prathama'],
    suchanas: ['n_1', 'n_2'],
    homework: ['hw_1', 'hw_2'],
    skills: ['sk_1', 'sk_2', 'sk_3'],
    // upasthiti + staffUpasthiti + marks + skillGrades: uid() ids — law 5.
  },
};

type AnyRecord = Record<string, unknown>;

/** True iff a value is a record object carrying a string id in `ids`. */
function isSeedRecord(value: unknown, ids: ReadonlySet<string>): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AnyRecord).id === 'string' &&
    ids.has((value as AnyRecord).id as string)
  );
}

/**
 * Pure purge over one suite state object. Returns the SAME reference when
 * nothing was removed (callers can rely on reference equality as "clean"),
 * otherwise a shallow copy with only the registered collections filtered.
 * Records that survive keep their object identity — byte-identical, and
 * provably untouched. Unregistered collections and non-array values are
 * never looked at.
 */
export function purgeSeedState<S extends AnyRecord>(
  suite: string,
  state: S,
): { state: S; removed: number } {
  const registry = SUITE_SEED_IDS[suite];
  if (!registry || !state || typeof state !== 'object') return { state, removed: 0 };
  let removed = 0;
  let next: S | null = null;
  for (const [collection, ids] of Object.entries(registry)) {
    const rows = state[collection];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const idSet = new Set(ids);
    const kept = rows.filter((row) => !isSeedRecord(row, idSet));
    if (kept.length !== rows.length) {
      removed += rows.length - kept.length;
      if (!next) next = { ...state };
      (next as AnyRecord)[collection] = kept;
    }
  }
  return { state: next ?? state, removed };
}

export const seedPurgeMarkerKey = (suite: string, ws: string): string =>
  `sb_seedpurge_v${SEED_PURGE_VERSION}_${suite}_${ws}`;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

/**
 * The loadState-facing migration. Real workspaces only; demo/fixture
 * contexts keep their seeds (law 3). Marker-gated to run once per
 * workspace per version; if storage is unavailable the purge still
 * applies in memory for this load (it simply re-applies next load —
 * idempotent, and failing toward removing provable seeds only).
 */
export function purgePersistedSeedState<S extends AnyRecord>(
  suite: string,
  workspaceId: string,
  state: S,
  storage: StorageLike | null = defaultStorage(),
): S {
  if (allowsSeedData(workspaceId)) return state;
  if (!SUITE_SEED_IDS[suite]) return state;
  const marker = seedPurgeMarkerKey(suite, workspaceId);
  try {
    if (storage && storage.getItem(marker) === String(SEED_PURGE_VERSION)) return state;
  } catch { /* unreadable marker → run the (idempotent) purge */ }
  const { state: purged } = purgeSeedState(suite, state);
  try {
    storage?.setItem(marker, String(SEED_PURGE_VERSION));
  } catch { /* marker is an optimisation; the purge itself already applied */ }
  return purged;
}
