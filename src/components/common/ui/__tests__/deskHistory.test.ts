/**
 * deskHistory.test.ts — QUEUED #50 (audit D11b) pins.
 * =====================================================================
 * Recent/pinned desk lists are scoped PER WORKSPACE: a desk visited in
 * one org must never appear in another org's RECENT list. Unscoped
 * calls keep the legacy key for back-compat.
 */

const store = new Map<string, unknown>();

jest.mock('idb-keyval', () => ({
  get: jest.fn(async (k: string) => store.get(k)),
  set: jest.fn(async (k: string, v: unknown) => {
    store.set(k, v);
  }),
}));

import {
  deskHistoryKey,
  getRecentDesks,
  recordDeskVisit,
  getPinnedDesks,
  setPinnedDesks,
  togglePinnedDesk,
} from '../deskHistory';

describe('deskHistoryKey', () => {
  it('scopes keys per workspace', () => {
    expect(deskHistoryKey('recent', 'WS-6508')).toBe('sanatani_recent_desks::WS-6508');
    expect(deskHistoryKey('pinned', 'WS-2504')).toBe('sanatani_pinned_desks::WS-2504');
  });

  it('unscoped / blank scope keeps the legacy key', () => {
    expect(deskHistoryKey('recent')).toBe('sanatani_recent_desks');
    expect(deskHistoryKey('recent', null)).toBe('sanatani_recent_desks');
    expect(deskHistoryKey('recent', '  ')).toBe('sanatani_recent_desks');
  });
});

describe('per-workspace scoping', () => {
  it('recents recorded in the Ashram never appear in the Mandir or Gurukul', async () => {
    await recordDeskVisit('annakshetra-one', 'WS-5098');
    await recordDeskVisit('treasury', 'WS-5098');

    expect(await getRecentDesks('WS-5098')).toEqual(['treasury', 'annakshetra-one']);
    expect(await getRecentDesks('WS-6508')).toEqual([]);
    expect(await getRecentDesks('WS-2358')).toEqual([]);
  });

  it('each workspace keeps its own ordered, capped list', async () => {
    await recordDeskVisit('devotees', 'WS-6508');
    await recordDeskVisit('treasury', 'WS-6508');
    await recordDeskVisit('devotees', 'WS-6508'); // re-visit moves to front, no dup
    expect(await getRecentDesks('WS-6508')).toEqual(['devotees', 'treasury']);
    // The Ashram list is untouched by Mandir activity.
    expect(await getRecentDesks('WS-5098')).toEqual(['treasury', 'annakshetra-one']);
  });

  it('pinned desks are scoped too (Setup Wizard pins per workspace)', async () => {
    await setPinnedDesks(['dashboard', 'treasury'], 'WS-2504');
    expect(await getPinnedDesks('WS-2504')).toEqual(['dashboard', 'treasury']);
    expect(await getPinnedDesks('WS-6508')).toEqual([]);

    const next = await togglePinnedDesk('goshala-one', 'WS-2504');
    expect(next).toEqual(['dashboard', 'treasury', 'goshala-one']);
    expect(await getPinnedDesks('WS-6508')).toEqual([]);
  });

  it('unscoped calls still work against the legacy list', async () => {
    await recordDeskVisit('dashboard');
    expect(await getRecentDesks()).toEqual(['dashboard']);
    expect(store.has('sanatani_recent_desks')).toBe(true);
  });
});
