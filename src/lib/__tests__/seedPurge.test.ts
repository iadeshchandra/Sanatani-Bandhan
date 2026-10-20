/**
 * seedPurge.test.ts — QUEUED #53 pre-law seed-residue purge.
 *
 * The safety contract being pinned:
 *  1. ONLY exact own-id matches against the deterministic buildSeed id
 *     registry are removed — real records survive byte-identical (same
 *     object references), including records in unregistered collections.
 *  2. The registry can never contain a uid-shaped id (real records are
 *     minted as `prefix_<base36 timestamp><rand>`, suffix ≥ 9 chars), and
 *     it exactly matches the buildSeed literals in the store sources —
 *     completeness is proven by scanning the sources, not by memory.
 *  3. Demo / fixture workspaces are never purged; the migration is
 *     marker-gated and idempotent.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  SUITE_SEED_IDS,
  SEED_PURGE_VERSION,
  purgeSeedState,
  purgePersistedSeedState,
  seedPurgeMarkerKey,
} from '../seedPurge';

const SUITE_STORES: Record<string, string> = {
  goshala: '../../goshala/goshalaStore.tsx',
  ashram: '../../ashram/ashramStore.tsx',
  annakshetra: '../../annakshetra/annakshetraStore.tsx',
  matha: '../../matha/mathaStore.tsx',
  nyas: '../../nyas/nyasStore.tsx',
  utsav: '../../utsav/utsavStore.tsx',
  tirth: '../../tirth/tirthStore.tsx',
  yoga: '../../yoga/yogaStore.tsx',
  satsang: '../../satsang/satsangStore.tsx',
  sabha: '../../sabha/sabhaStore.tsx',
  pathshala: '../../pathshala/pathshalaStore.tsx',
};

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
  };
}

describe('registry hygiene', () => {
  it('covers exactly the 11 suite stores and never touches settings', () => {
    expect(Object.keys(SUITE_SEED_IDS).sort()).toEqual(Object.keys(SUITE_STORES).sort());
    for (const registry of Object.values(SUITE_SEED_IDS)) {
      expect(Object.keys(registry)).not.toContain('settings');
      expect(Object.keys(registry).length).toBeGreaterThan(0);
    }
  });

  it('contains no id a residue-era uid() could have minted', () => {
    // Real ids: uid(prefix) = `${prefix}_${T}${R}` where T is the 8-char
    // base36 of Date.now() and R is 1–3 base36 chars — so a uid has exactly
    // one underscore and a 9–11 char suffix whose first 8 chars decode to
    // the creation millisecond. Residue-era records were minted 2023–2026;
    // an id is only dangerous if its suffix decodes into that window.
    // (The one long word-like seed id, rc_purisabzi, decodes to 2034.)
    const ERA_START = Date.UTC(2023, 0, 1);
    const ERA_END = Date.UTC(2027, 0, 1);
    const couldBeResidueEraUid = (id: string): boolean => {
      const m = /^[a-z]{1,6}_([a-z0-9]+)$/.exec(id);
      if (!m) return false;
      const s = m[1];
      if (s.length < 9 || s.length > 11) return false;
      const t = parseInt(s.slice(0, 8), 36);
      return t >= ERA_START && t < ERA_END;
    };
    for (const [suite, registry] of Object.entries(SUITE_SEED_IDS)) {
      for (const ids of Object.values(registry)) {
        for (const id of ids) {
          expect({ suite, id, dangerous: couldBeResidueEraUid(id) })
            .toEqual({ suite, id, dangerous: false });
        }
      }
    }
  });

  it('exactly matches the deterministic buildSeed literals in every store source', () => {
    for (const [suite, rel] of Object.entries(SUITE_STORES)) {
      const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
      const found = new Set<string>();
      for (const m of src.matchAll(/(?:id:|subj\()\s*'([^']+)'/g)) found.add(m[1]);
      const registered = new Set<string>(
        Object.values(SUITE_SEED_IDS[suite]).flatMap((ids) => [...ids]),
      );
      expect({ suite, onlyInSource: [...found].filter((x) => !registered.has(x)) })
        .toEqual({ suite, onlyInSource: [] });
      expect({ suite, onlyInRegistry: [...registered].filter((x) => !found.has(x)) })
        .toEqual({ suite, onlyInRegistry: [] });
    }
  });
});

describe('purgeSeedState (pure)', () => {
  it("removes exactly the seed ids — the owner's Kapila case — and keeps real records by reference", () => {
    const realCow = { id: 'n_m3k9x2p4abc', name: 'Ganga', tagId: 'GM-0101' };
    const realHealth = { id: 'h_m3k9x2p4xyz', nandiId: realCow.id, title: 'Real vet visit' };
    const seedMilk = { id: 'ml_m3k9x2p4qrs', nandiId: 'n_1', liters: 4.7 }; // uid-shaped seed row: NOT registered, must survive
    const settings = { grantPerDay: 50, estCostPerDay: 125 };
    const state = {
      nandis: [
        { id: 'n_1', name: 'Kamdhenu', tagId: 'GM-0001' },
        { id: 'n_5', name: 'Kapila', tagId: 'GM-0005' },
        realCow,
      ],
      health: [{ id: 'h_4', nandiId: 'n_5', title: 'Mastitis treatment' }, realHealth],
      milk: [seedMilk],
      settings,
    };
    const { state: out, removed } = purgeSeedState('goshala', state);
    expect(removed).toBe(3);
    expect(out.nandis).toEqual([realCow]);
    expect(out.nandis[0]).toBe(realCow);
    expect(out.health).toEqual([realHealth]);
    expect(out.health[0]).toBe(realHealth);
    // Unregistered collection is never looked at — uid-seeded milk rows are
    // a flagged residual (indistinguishable from real rows), not purged.
    expect(out.milk).toBe(state.milk);
    expect(out.settings).toBe(settings);
  });

  it('returns the same reference and removed=0 when there is nothing to purge', () => {
    const state = { nandis: [{ id: 'n_m3k9x2p4abc', name: 'Ganga' }], settings: {} };
    const { state: out, removed } = purgeSeedState('goshala', state);
    expect(out).toBe(state);
    expect(removed).toBe(0);
  });

  it('keeps malformed entries (null, missing id, non-string id) untouched', () => {
    const rows = [null, { name: 'no id' }, { id: 42 }, { id: 'n_1', name: 'Kamdhenu' }];
    const { state: out, removed } = purgeSeedState('goshala', { nandis: rows });
    expect(removed).toBe(1);
    expect(out.nandis).toEqual([null, { name: 'no id' }, { id: 42 }]);
  });

  it('is a no-op for an unknown suite', () => {
    const state = { nandis: [{ id: 'n_1' }] };
    expect(purgeSeedState('nope', state).state).toBe(state);
  });
});

describe('purgePersistedSeedState (migration)', () => {
  const seededState = () => ({
    nandis: [{ id: 'n_5', name: 'Kapila', tagId: 'GM-0005' }, { id: 'n_m3k9x2p4abc', name: 'Ganga' }],
    settings: { grantPerDay: 50 },
  });

  it('purges in a real workspace, writes the version marker, and is idempotent', () => {
    const storage = fakeStorage();
    const out = purgePersistedSeedState('goshala', 'WS-2504', seededState(), storage);
    expect(out.nandis).toEqual([{ id: 'n_m3k9x2p4abc', name: 'Ganga' }]);
    expect(storage.map.get(seedPurgeMarkerKey('goshala', 'WS-2504'))).toBe(String(SEED_PURGE_VERSION));
    // Second run: marker short-circuits — same reference straight back.
    const again = purgePersistedSeedState('goshala', 'WS-2504', out, storage);
    expect(again).toBe(out);
    // And the pure purge over the result removes nothing more.
    expect(purgeSeedState('goshala', out).removed).toBe(0);
  });

  it('never purges demo or fixture workspaces and sets no marker there', () => {
    const storage = fakeStorage();
    const state = seededState();
    expect(purgePersistedSeedState('goshala', 'DEMO_ws-goshala', state, storage)).toBe(state);
    expect(purgePersistedSeedState('goshala', 'ws-goshala', state, storage)).toBe(state);
    expect(storage.map.size).toBe(0);
  });

  it('still purges in memory when storage throws (fail toward honesty, never toward data loss)', () => {
    const throwing = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    const out = purgePersistedSeedState('goshala', 'WS-2504', seededState(), throwing);
    expect(out.nandis).toEqual([{ id: 'n_m3k9x2p4abc', name: 'Ganga' }]);
  });

  it('purges every suite with its own registry (spot-check: pathshala + nyas)', () => {
    const storage = fakeStorage();
    const p = purgePersistedSeedState('pathshala', 'WS-2358', {
      vargas: [{ id: 'v_prathama' }, { id: 'v_m3k9x2p4abc', name: 'Mine' }],
      gurus: [{ id: 'g_1' }, { id: 'g_m3k9x2p4abc', name: 'Real guru' }],
      upasthiti: [{ id: 'att_m3k9x2p4abc', studentId: 'real-student', status: 'present' }],
    }, storage);
    expect(p.vargas).toEqual([{ id: 'v_m3k9x2p4abc', name: 'Mine' }]);
    expect(p.gurus).toEqual([{ id: 'g_m3k9x2p4abc', name: 'Real guru' }]);
    // uid-minted attendance rows are NOT registered — they survive even
    // though the seeder fabricated some (flagged residual, QUEUED #53).
    expect(p.upasthiti).toEqual([{ id: 'att_m3k9x2p4abc', studentId: 'real-student', status: 'present' }]);

    const n = purgePersistedSeedState('nyas', 'WS-6508', {
      compliance: [{ id: 'c_seed_10bd' }, { id: 'cp_m3k9x2p4abc', kind: '10BD' }],
      registrations: [{ id: 'r_seed_pan' }],
    }, storage);
    expect(n.compliance).toEqual([{ id: 'cp_m3k9x2p4abc', kind: '10BD' }]);
    expect(n.registrations).toEqual([]);
  });
});
