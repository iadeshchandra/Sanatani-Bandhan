/**
 * truth59.test.ts — QUEUED #59 pure-logic pins (audit A4-1 / A4-3 / A4-4).
 *
 * 1. Herd agreement: ONE resolver — live suite count > persisted suite
 *    store > legacy DataContext count; a persisted EMPTY herd is a
 *    real zero and beats a stale legacy register.
 * 2. Parampara truth: counts come from the Pathshala suite store
 *    (gurus / parikshas); the dead `sb_gurukul_exams_` key is never
 *    read; absence is an honest zero (no floor of 3, ever).
 * 3. Sample machinery: `isSampleRecord` is exactly the seeder's tag;
 *    counts add up; sample-ERA identification is by dangling seed
 *    reference only (seed entity gone), never by a row's own uid id,
 *    and never when the referenced seed entity is still alive (demo).
 */
import {
  readPersistedHerdCount,
  resolveHerdCount,
  goshalaStoreKey,
} from '../herdCount';
import { readParamparaCounts, pathshalaStoreKey } from '../paramparaCounts';
import {
  isSampleRecord,
  countSampleRecords,
  isSampleEraMilkRow,
  isSampleEraFodderUseRow,
  isSampleEraMarksRow,
  partitionSampleEra,
  planSuiteSampleEraSweep,
  countSuiteSampleEraRows,
  sweepSuiteSampleEraRows,
} from '../sampleData';

const memStorage = (init: Record<string, string> = {}) => {
  const map = new Map(Object.entries(init));
  return {
    map,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
};

describe('Q59 A4-1 — herd resolver (single source)', () => {
  it('reads the persisted suite store headcount', () => {
    const st = memStorage({
      [goshalaStoreKey('WS-1')]: JSON.stringify({ nandis: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }),
    });
    expect(readPersistedHerdCount('WS-1', st)).toBe(3);
  });

  it('a persisted EMPTY herd is a real zero, not a fallback trigger', () => {
    const st = memStorage({ [goshalaStoreKey('WS-1')]: JSON.stringify({ nandis: [] }) });
    expect(readPersistedHerdCount('WS-1', st)).toBe(0);
    expect(resolveHerdCount('WS-1', { legacyCowCount: 8, storage: st })).toBe(0);
  });

  it('no suite blob on this device → legacy register count', () => {
    const st = memStorage();
    expect(readPersistedHerdCount('WS-1', st)).toBeNull();
    expect(resolveHerdCount('WS-1', { legacyCowCount: 8, storage: st })).toBe(8);
  });

  it('corrupt blob → treated as no suite register', () => {
    const st = memStorage({ [goshalaStoreKey('WS-1')]: '{not json' });
    expect(readPersistedHerdCount('WS-1', st)).toBeNull();
    expect(resolveHerdCount('WS-1', { legacyCowCount: 5, storage: st })).toBe(5);
  });

  it('live suite count beats both persisted and legacy', () => {
    const st = memStorage({
      [goshalaStoreKey('WS-1')]: JSON.stringify({ nandis: [{ id: 'a' }] }),
    });
    expect(
      resolveHerdCount('WS-1', { legacyCowCount: 9, liveSuiteCount: 4, storage: st }),
    ).toBe(4);
  });

  it('Command Center and desk agree: same store, same number', () => {
    const st = memStorage({
      [goshalaStoreKey('WS-9')]: JSON.stringify({ nandis: [{ id: 'x' }, { id: 'y' }] }),
    });
    const fromDesk = resolveHerdCount('WS-9', { legacyCowCount: 0, liveSuiteCount: 2, storage: st });
    const fromCommandCenter = resolveHerdCount('WS-9', { legacyCowCount: 0, storage: st });
    expect(fromDesk).toBe(2);
    expect(fromCommandCenter).toBe(fromDesk);
  });
});

describe('Q59 A4-3 — Parampara counts (no fabrication)', () => {
  it('reads gurus + parikshas from the Pathshala suite store', () => {
    const st = memStorage({
      [pathshalaStoreKey('WS-2')]: JSON.stringify({
        gurus: [{ id: 'g1' }, { id: 'g2' }],
        parikshas: [{ id: 'p1' }],
      }),
    });
    expect(readParamparaCounts('WS-2', st)).toEqual({ acharyaCount: 2, parikshaCount: 1 });
  });

  it('honest zero when the store is absent — never the old floor of 3', () => {
    const st = memStorage();
    const counts = readParamparaCounts('WS-2', st);
    expect(counts.acharyaCount).toBe(0);
    expect(counts.parikshaCount).toBe(0);
  });

  it('the dead sb_gurukul_exams_ key is never consulted', () => {
    const st = memStorage({
      [`sb_gurukul_exams_WS-2`]: JSON.stringify([
        { examinerAcharya: 'Ghost One' },
        { examinerAcharya: 'Ghost Two' },
        { examinerAcharya: 'Ghost Three' },
        { examinerAcharya: 'Ghost Four' },
      ]),
      [pathshalaStoreKey('WS-2')]: JSON.stringify({ gurus: [{ id: 'g1' }], parikshas: [] }),
    });
    expect(readParamparaCounts('WS-2', st)).toEqual({ acharyaCount: 1, parikshaCount: 0 });
  });

  it('missing arrays read as zero, corrupt blob reads as zero', () => {
    const st = memStorage({
      [pathshalaStoreKey('WS-3')]: JSON.stringify({ gurus: [{ id: 'g1' }] }),
      [pathshalaStoreKey('WS-4')]: '###',
    });
    expect(readParamparaCounts('WS-3', st)).toEqual({ acharyaCount: 1, parikshaCount: 0 });
    expect(readParamparaCounts('WS-4', st)).toEqual({ acharyaCount: 0, parikshaCount: 0 });
  });
});

describe('Q59 A4-4 — sample record machinery', () => {
  it('isSampleRecord is exactly the seeder tag', () => {
    expect(isSampleRecord({ isDemoSeed: true })).toBe(true);
    expect(isSampleRecord({ isDemoSeed: false })).toBe(false);
    expect(isSampleRecord({})).toBe(false);
    expect(isSampleRecord(null)).toBe(false);
    expect(isSampleRecord('isDemoSeed')).toBe(false);
    expect(isSampleRecord({ isDemoSeed: 'true' })).toBe(false);
  });

  it('countSampleRecords counts only tagged records, per set + total', () => {
    const counts = countSampleRecords({
      devotees: [{ isDemoSeed: true }, { isDemoSeed: true }, { name: 'Real' }],
      treasury: [{ isDemoSeed: true }],
      gurukulStudents: [],
      cows: [{ isDemoSeed: true }, {}],
      guests: [],
      campaigns: [{ isDemoSeed: true }],
    });
    expect(counts).toEqual({
      devotees: 2,
      treasury: 1,
      gurukulStudents: 0,
      cows: 1,
      guests: 0,
      campaigns: 1,
      total: 5,
    });
  });
});

describe('Q59 — sample-era identification (dangling seed reference only)', () => {
  it('milk: seed nandi gone → era; seed nandi alive (demo) → not era; real nandi → not era', () => {
    const live = new Set(['n_1', 'real-uid-1']);
    expect(isSampleEraMilkRow({ nandiId: 'n_2' }, live)).toBe(true);
    expect(isSampleEraMilkRow({ nandiId: 'n_1' }, live)).toBe(false);
    expect(isSampleEraMilkRow({ nandiId: 'real-uid-1' }, live)).toBe(false);
    expect(isSampleEraMilkRow({ nandiId: 'ml_lmn3xyz9' }, live)).toBe(false);
    expect(isSampleEraMilkRow({}, live)).toBe(false);
  });

  it('fodderUse: seed item gone → era; alive → not era', () => {
    const live = new Set(['f_2']);
    expect(isSampleEraFodderUseRow({ itemId: 'f_1' }, live)).toBe(true);
    expect(isSampleEraFodderUseRow({ itemId: 'f_2' }, live)).toBe(false);
    expect(isSampleEraFodderUseRow({ itemId: 'fu_abc12345' }, live)).toBe(false);
  });

  it('marks: seed pariksha gone → era; alive → not era; real pariksha → not era', () => {
    const live = new Set(['par_lkjh1234']);
    expect(isSampleEraMarksRow({ parikshaId: 'par_1' }, live)).toBe(true);
    expect(isSampleEraMarksRow({ parikshaId: 'par_1' }, new Set(['par_1']))).toBe(false);
    expect(isSampleEraMarksRow({ parikshaId: 'par_lkjh1234' }, live)).toBe(false);
  });

  it('partitionSampleEra preserves order + identity of kept rows', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };
    const c = { id: 'c' };
    const { kept, removed } = partitionSampleEra([a, b, c], (r) => r.id === 'b');
    expect(kept).toEqual([a, c]);
    expect(kept[0]).toBe(a);
    expect(removed).toEqual([b]);
  });

  it('plan + sweep over persisted blobs removes only the identifiable rows', () => {
    const goshala = {
      nandis: [{ id: 'real-1' }],
      fodderItems: [{ id: 'real-item' }],
      milk: [
        { id: 'ml_uid1', nandiId: 'n_3' }, // seed-era: n_3 purged with the seed herd
        { id: 'ml_uid2', nandiId: 'real-1' }, // real
      ],
      fodderUse: [
        { id: 'fu_uid1', itemId: 'f_4' }, // seed-era
        { id: 'fu_uid2', itemId: 'real-item' }, // real
      ],
      settings: { grantPerDay: 50 },
    };
    const pathshala = {
      parikshas: [{ id: 'par_real' }],
      marks: [
        { id: 'mk_uid1', parikshaId: 'par_1' }, // seed-era
        { id: 'mk_uid2', parikshaId: 'par_real' }, // real
      ],
      upasthiti: [{ id: 'att_uid1', studentId: 'stu-real' }], // never identified — untouched
    };
    const plan = planSuiteSampleEraSweep(goshala, pathshala);
    expect(plan.counts).toEqual({ goshalaMilk: 1, goshalaFodderUse: 1, pathshalaMarks: 1, total: 3 });
    expect(plan.goshalaKept?.milk).toEqual([{ id: 'ml_uid2', nandiId: 'real-1' }]);
    expect(plan.pathshalaKeptMarks).toEqual([{ id: 'mk_uid2', parikshaId: 'par_real' }]);

    const st = memStorage({
      sb_goshala_WS_5: JSON.stringify(goshala),
      sb_pathshala_WS_5: JSON.stringify(pathshala),
    });
    expect(countSuiteSampleEraRows('WS_5', st).total).toBe(3);
    const swept = sweepSuiteSampleEraRows('WS_5', st);
    expect(swept.total).toBe(3);
    const gAfter = JSON.parse(st.map.get('sb_goshala_WS_5') as string);
    const pAfter = JSON.parse(st.map.get('sb_pathshala_WS_5') as string);
    expect(gAfter.milk).toHaveLength(1);
    expect(gAfter.fodderUse).toHaveLength(1);
    expect(gAfter.settings).toEqual({ grantPerDay: 50 }); // settings untouched
    expect(pAfter.marks).toHaveLength(1);
    expect(pAfter.upasthiti).toHaveLength(1); // attendance NEVER swept
    expect(countSuiteSampleEraRows('WS_5', st).total).toBe(0); // idempotent
  });

  it('demo-shaped blobs (seed entities alive) sweep nothing and write nothing', () => {
    const goshala = {
      nandis: [{ id: 'n_1' }, { id: 'n_2' }],
      fodderItems: [{ id: 'f_1' }],
      milk: [{ id: 'ml_x', nandiId: 'n_1' }],
      fodderUse: [{ id: 'fu_x', itemId: 'f_1' }],
    };
    const before = JSON.stringify(goshala);
    const st = memStorage({ sb_goshala_DEMO_1: before });
    expect(sweepSuiteSampleEraRows('DEMO_1', st).total).toBe(0);
    expect(st.map.get('sb_goshala_DEMO_1')).toBe(before);
  });
});
