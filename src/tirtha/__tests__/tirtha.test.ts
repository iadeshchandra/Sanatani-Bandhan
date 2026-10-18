/**
 * tirtha/__tests__/tirtha.test.ts — Tirtha Diary (Map Phase 2) tests.
 * =====================================================================
 * Covers: id generation, sanitization, privacy invariants (ownership),
 * the local store's CRUD/forget flows, yatra grouping, stats, and the
 * AI tirtha_summary task. Firestore is faked in-memory — the store's
 * network calls fail closed to the local cache in this environment.
 */

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: any, ...parts: string[]) => ({ __path: parts.join('/') })),
  doc: jest.fn((col: any, id: string) => ({ __path: `${col.__path}/${id}` })),
  getDocs: jest.fn(async () => ({ docs: [] })),
  setDoc: jest.fn(async () => {}),
  deleteDoc: jest.fn(async () => {}),
  orderBy: jest.fn((f: string, d: string) => ({ __orderBy: [f, d] })),
  query: jest.fn((c: any) => c),
}));

jest.mock('../../services/firebaseClient', () => ({
  db: {},
}));

// Node test env has no localStorage — minimal in-memory polyfill.
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

import {
  isOwnedBy,
  newVisitId,
  newYatraId,
  sanitizeVisit,
  sanitizeYatra,
} from '../types';
import {
  assignVisitsToYatra,
  computeStats,
  createYatra,
  forgetAll,
  forgetVisit,
  forgetYatra,
  getLocalVisits,
  getLocalYatras,
  getVisitsForYatra,
  recordVisit,
} from '../tirthaStore';
import { tirthaSummaryTask } from '../../ai/tasks/tirtha_summary';

const UID = 'test-uid-1';
const OTHER = 'test-uid-2';

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe('ids', () => {
  test('visit and yatra ids are unique and prefixed', () => {
    const a = newVisitId();
    const b = newVisitId();
    expect(a).not.toBe(b);
    expect(a.startsWith('v_')).toBe(true);
    expect(newYatraId().startsWith('y_')).toBe(true);
  });
});

describe('sanitizeVisit / sanitizeYatra', () => {
  test('trims and bounds temple name', () => {
    const v = sanitizeVisit({ templeName: '  Kashi  ' }, UID);
    expect(v.templeName).toBe('Kashi');
    expect(v.uid).toBe(UID);
    const long = sanitizeVisit({ templeName: 'x'.repeat(500) }, UID);
    expect(long.templeName.length).toBeLessThanOrEqual(120);
  });
  test('drops empty optional fields', () => {
    const v = sanitizeVisit({ templeName: 'T', note: '   ' }, UID);
    expect(v.note).toBeUndefined();
  });
  test('yatra name is required and bounded', () => {
    const y = sanitizeYatra({ name: ' Char Dham 2026 ' }, UID);
    expect(y.name).toBe('Char Dham 2026');
    expect(y.uid).toBe(UID);
  });
});

describe('privacy invariants', () => {
  test('isOwnedBy rejects foreign uids', () => {
    expect(isOwnedBy({ uid: UID }, UID)).toBe(true);
    expect(isOwnedBy({ uid: UID }, OTHER)).toBe(false);
    expect(isOwnedBy({ uid: UID }, '')).toBe(false);
  });
  test('cache never leaks across uids', async () => {
    await recordVisit(UID, { templeName: 'Temple A' });
    expect(getLocalVisits(OTHER)).toHaveLength(0);
    expect(getLocalVisits(UID)).toHaveLength(1);
  });
});

describe('visit CRUD (local-first)', () => {
  test('recordVisit stores newest-first', async () => {
    const v1 = await recordVisit(UID, { templeName: 'First' });
    const v2 = await recordVisit(UID, { templeName: 'Second' });
    const visits = getLocalVisits(UID);
    expect(visits).toHaveLength(2);
    expect(visits[0].id).toBe(v2.id);
    expect(visits[1].id).toBe(v1.id);
  });
  test('recordVisit requires a temple name', async () => {
    await expect(recordVisit(UID, { templeName: '   ' })).rejects.toThrow('tirtha/temple-required');
  });
  test('recordVisit requires auth', async () => {
    await expect(recordVisit('', { templeName: 'T' })).rejects.toThrow('tirtha/auth-required');
  });
  test('forgetVisit removes instantly', async () => {
    const v = await recordVisit(UID, { templeName: 'Gone' });
    await forgetVisit(UID, v.id);
    expect(getLocalVisits(UID)).toHaveLength(0);
  });
  test('forgetVisit is a no-op for unknown ids', async () => {
    await recordVisit(UID, { templeName: 'Stays' });
    await forgetVisit(UID, 'nope');
    expect(getLocalVisits(UID)).toHaveLength(1);
  });
});

describe('yatra grouping', () => {
  test('create + assign + list', async () => {
    const y = await createYatra(UID, { name: 'Char Dham' });
    const v1 = await recordVisit(UID, { templeName: 'Badrinath' });
    const v2 = await recordVisit(UID, { templeName: 'Kedarnath' });
    await assignVisitsToYatra(UID, [v1.id, v2.id], y.id);
    const inYatra = getVisitsForYatra(UID, y.id);
    expect(inYatra).toHaveLength(2);
    expect(getLocalYatras(UID)).toHaveLength(1);
  });
  test('unassign removes yatra link but keeps the visit', async () => {
    const y = await createYatra(UID, { name: 'Y' });
    const v = await recordVisit(UID, { templeName: 'T' });
    await assignVisitsToYatra(UID, [v.id], y.id);
    await assignVisitsToYatra(UID, [v.id], undefined);
    expect(getVisitsForYatra(UID, y.id)).toHaveLength(0);
    expect(getLocalVisits(UID)).toHaveLength(1);
  });
  test('forgetYatra keeps visits by default', async () => {
    const y = await createYatra(UID, { name: 'Y' });
    const v = await recordVisit(UID, { templeName: 'T' });
    await assignVisitsToYatra(UID, [v.id], y.id);
    await forgetYatra(UID, y.id, false);
    expect(getLocalYatras(UID)).toHaveLength(0);
    expect(getLocalVisits(UID)).toHaveLength(1);
    expect(getLocalVisits(UID)[0].yatraId).toBeUndefined();
  });
  test('forgetYatra can take its visits with it', async () => {
    const y = await createYatra(UID, { name: 'Y' });
    const v = await recordVisit(UID, { templeName: 'T' });
    await assignVisitsToYatra(UID, [v.id], y.id);
    await forgetYatra(UID, y.id, true);
    expect(getLocalYatras(UID)).toHaveLength(0);
    expect(getLocalVisits(UID)).toHaveLength(0);
  });
  test('createYatra requires a name', async () => {
    await expect(createYatra(UID, { name: '  ' })).rejects.toThrow('tirtha/name-required');
  });
});

describe('forgetAll', () => {
  test('wipes visits and yatras', async () => {
    await recordVisit(UID, { templeName: 'A' });
    await recordVisit(UID, { templeName: 'B' });
    await createYatra(UID, { name: 'Y' });
    await forgetAll(UID);
    expect(getLocalVisits(UID)).toHaveLength(0);
    expect(getLocalYatras(UID)).toHaveLength(0);
  });
  test('forgetAll does not touch other users', async () => {
    await recordVisit(UID, { templeName: 'Mine' });
    await recordVisit(OTHER, { templeName: 'Theirs' });
    await forgetAll(UID);
    expect(getLocalVisits(OTHER)).toHaveLength(1);
  });
});

describe('computeStats', () => {
  test('counts distinct temples, visits, yatras', async () => {
    await recordVisit(UID, { templeName: 'Kashi Vishwanath' });
    await recordVisit(UID, { templeName: 'kashi vishwanath' }); // same temple, revisit
    await recordVisit(UID, { templeName: 'Meenakshi' });
    await createYatra(UID, { name: 'South' });
    const s = computeStats(UID);
    expect(s.visitCount).toBe(3);
    expect(s.templeCount).toBe(2);
    expect(s.yatraCount).toBe(1);
    expect(s.latestVisitAt).toBeDefined();
  });
  test('empty diary → zeros', () => {
    const s = computeStats(UID);
    expect(s.visitCount).toBe(0);
    expect(s.latestVisitAt).toBeUndefined();
  });
});

describe('ai tirtha_summary task', () => {
  const baseCtx = (uid: string) => ({
    uid,
    input: 'how many temples have I visited?',
    lang: 'en',
    slots: {},
  }) as any;

  test('empty diary → empty variant', () => {
    const out = tirthaSummaryTask(baseCtx(UID));
    expect(out.variant).toBe('empty');
  });
  test('anon → empty variant (never leaks)', () => {
    const out = tirthaSummaryTask(baseCtx('anon'));
    expect(out.variant).toBe('empty');
  });
  test('summary reports own counts only', async () => {
    await recordVisit(UID, { templeName: 'A' });
    await recordVisit(UID, { templeName: 'B' });
    await recordVisit(OTHER, { templeName: 'C' });
    const out = tirthaSummaryTask(baseCtx(UID));
    expect(out.variant).toBe('summary');
    expect(out.params.visitCount).toBe(2);
    expect(out.params.templeCount).toBe(2);
    expect(out.params.latestTemple).toBe('B');
  });
});
