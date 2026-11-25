/**
 * auctionLive.test.ts — AUCTION A3: the live-bidding law pins.
 * =====================================================================
 * The laws these tests hold:
 *  - The window is judged from the record: 'open' only while a
 *    live lot stands open before its stored closeAt; the
 *    clock's passing closes it — no status flip is trusted.
 *  - The first bid stands at or above the reserve (the A1
 *    opening rule); every later bid clears the standing
 *    highest + the lot's frozen increment.
 *  - The extension is exact: a bid inside the close's last
 *    5 minutes moves the close to the bid's moment + 5
 *    minutes and the lot counts it; a bid outside the window
 *    moves nothing. It is the only way the close moves.
 *  - The EMD gate is A1's own record: EMD amount at or above
 *    the notice's figure, received, not refunded — derived
 *    from the registrations, never typed separately.
 *  - A barred uid is refused by the gate before any write;
 *    an unregistered uid and a registered-but-no-EMD uid are
 *    different refusals, said differently.
 *  - Hall entry is labelled, never disguised: the bid doc
 *    carries entryMode 'hall' and the conductor's uid; a self
 *    bid carries no enteredByUid at all.
 *  - The one writer moves three docs in one transaction: the
 *    append-only bid (the rules-pinned shape), the lot's
 *    stamps + updatedAt, and the arena's stamps alone.
 */
const mockCalls: {
  sets: { ref: unknown; data: unknown }[];
  updates: { ref: unknown; data: unknown }[];
  txSets: { ref: unknown; data: unknown }[];
  txUpdates: { ref: unknown; data: unknown }[];
} = { sets: [], updates: [], txSets: [], txUpdates: [] };
let mockLotData: Record<string, unknown> | null = null;
let mockArenaData: Record<string, unknown> | null = null;

jest.mock('firebase/firestore', () => ({
  collection: (...parts: unknown[]) => ({
    __ref: parts.filter((p): p is string => typeof p === 'string').join('/'),
  }),
  doc: (...parts: unknown[]) => ({
    __ref: parts.filter((p): p is string => typeof p === 'string').join('/'),
  }),
  query: (c: unknown) => c,
  where: () => ({}),
  serverTimestamp: () => ({ __serverTs: true }),
  arrayUnion: (v: unknown) => ({ __union: v }),
  arrayRemove: (v: unknown) => ({ __remove: v }),
  setDoc: (ref: unknown, data: unknown) => { mockCalls.sets.push({ ref, data }); return Promise.resolve(); },
  updateDoc: (ref: unknown, data: unknown) => { mockCalls.updates.push({ ref, data }); return Promise.resolve(); },
  getDoc: () => Promise.resolve({ exists: () => false, data: () => undefined }),
  getDocs: () => Promise.resolve({ docs: [] }),
  runTransaction: (_db: unknown, fn: (tx: unknown) => Promise<void>) =>
    fn({
      get: (ref: { __ref: string }) =>
        Promise.resolve(
          ref.__ref.endsWith('/_arena')
            ? { exists: () => mockArenaData != null, data: () => mockArenaData }
            : { exists: () => mockLotData != null, data: () => mockLotData }
        ),
      set: (ref: unknown, data: unknown) => { mockCalls.txSets.push({ ref, data }); },
      update: (ref: unknown, data: unknown) => { mockCalls.txUpdates.push({ ref, data }); },
    }),
}));
jest.mock('../firebase', () => ({ db: {} }));
jest.mock('../../context/data/approvalsStore', () => ({
  approvalService: { request: jest.fn(), apply: jest.fn() },
  firestoreApprovalsBackend: {},
}));

import {
  arenaSeedFor, barBidder, emdRecordedOk, emdUidsFromRegistrations,
  extendedCloseAt, liveBidGateIssues, liveLeaderBid, liveStampsAfter,
  liveWindowState, minNextBid, openLiveLot, placeLiveBid, sortLiveLog,
  unbarBidder, type LiveBid, type LiveBidFacts,
} from '../auctionLive';
import type { AuctionLot, LotRegistration } from '../auctionLots';

const NOW = 1_900_000_000_000;
const reg = (over: Partial<LotRegistration> = {}): LotRegistration => ({
  id: 'reg_1', name: 'Bidder One', phone: '9000000000', idReference: 'ID-1',
  bidderUid: 'u1', relatedParty: false, emdAmount: 500, emdMode: 'cash',
  receivedAt: NOW - 86_400_000, ...over,
});
const liveLot = (over: Partial<AuctionLot> = {}): AuctionLot => ({
  id: 'lot_1', workspaceId: 'ws_1',
  source: { kind: 'standalone', label: 'Test lot' },
  lotClass: 'movables', lotMode: 'live', title: 'Test lot', description: '',
  mediaRefs: [], reservePrice: 1000, status: 'open',
  history: { draft: { at: NOW - 1000, by: 'staff' } },
  notice: {
    publishedAt: NOW - 86_400_000, auctionAt: NOW + 3_600_000,
    auctionPlace: 'Hall', objectionDeadline: NOW, emdAmount: 500,
  },
  affixtures: [], objections: [], registrations: [reg()],
  bidderUids: ['u1'], bidIncrement: 100, closeAt: NOW + 3_600_000,
  highestBid: 0, highestBidderUid: '', highestBidderName: '', highestBidId: '',
  bidCount: 0, extensions: 0, liveEmdUids: ['u1'],
  createdAt: NOW - 1000, updatedAt: NOW - 1000,
  ...over,
});
const facts = (over: Partial<LiveBidFacts> = {}): LiveBidFacts => ({
  lotMode: 'live', status: 'open', closeAt: NOW + 3_600_000,
  reservePrice: 1000, bidIncrement: 100, highestBid: 0, bidCount: 0,
  registeredUids: ['u1', 'u2'], liveEmdUids: ['u1'], barredUids: [],
  ...over,
});
const bid = (id: string, uid: string, amount: number, ms = 0): LiveBid => ({
  id, bidderUid: uid, bidderName: `B-${uid}`, registrationId: 'reg_1',
  amount, createdAt: { toMillis: () => ms } as LiveBid['createdAt'], entryMode: 'self',
});

beforeEach(() => {
  mockCalls.sets = []; mockCalls.updates = [];
  mockCalls.txSets = []; mockCalls.txUpdates = [];
  mockLotData = null; mockArenaData = null;
});

describe('the window, judged from the record', () => {
  it('a live open lot inside its clock stands open; the clock closes it', () => {
    expect(liveWindowState(liveLot(), NOW)).toBe('open');
    expect(liveWindowState(liveLot(), NOW + 3_600_000)).toBe('closed');
    expect(liveWindowState(liveLot(), NOW + 3_600_001)).toBe('closed');
  });
  it('hall and sealed lots, and live lots not yet open, have no window', () => {
    expect(liveWindowState(liveLot({ lotMode: 'hall' }), NOW)).toBe('not-open');
    expect(liveWindowState(liveLot({ lotMode: 'sealed' }), NOW)).toBe('not-open');
    expect(liveWindowState(liveLot({ status: 'noticed' }), NOW)).toBe('not-open');
    expect(liveWindowState(liveLot({ status: 'draft' }), NOW)).toBe('not-open');
    expect(liveWindowState(liveLot({ closeAt: 0 }), NOW)).toBe('not-open');
  });
  it('after close the state is closed even before any status flip', () => {
    expect(liveWindowState(liveLot({ status: 'open' }), NOW + 7_200_000)).toBe('closed');
  });
});

describe('amount law: the reserve floor, then highest + increment', () => {
  it('minNextBid is the reserve before any bid, highest + increment after', () => {
    expect(minNextBid(liveLot())).toBe(1000);
    expect(minNextBid(liveLot({ highestBid: 1400 }))).toBe(1500);
  });
  it('the gate refuses a first bid below the reserve and accepts one at it', () => {
    const base = { bidderUid: 'u1', entryMode: 'self' as const, actorUid: 'u1', conductorOk: false };
    expect(liveBidGateIssues(facts(), { ...base, amount: 999 }, NOW)).toContain('amount');
    expect(liveBidGateIssues(facts(), { ...base, amount: 1000 }, NOW)).toEqual([]);
  });
  it('the gate refuses a later bid below highest + increment', () => {
    const f = facts({ highestBid: 1400, bidCount: 3 });
    const base = { bidderUid: 'u1', entryMode: 'self' as const, actorUid: 'u1', conductorOk: false };
    expect(liveBidGateIssues(f, { ...base, amount: 1499 }, NOW)).toContain('amount');
    expect(liveBidGateIssues(f, { ...base, amount: 1500 }, NOW)).toEqual([]);
    expect(liveBidGateIssues(f, { ...base, amount: 0 }, NOW)).toContain('amount');
  });
});

describe('the extension: inside the last 5 minutes, and only there', () => {
  const close = NOW + 3_600_000;
  it('a bid 4 minutes before the close extends it to bid time + 5 minutes', () => {
    const at = close - 240_000;
    expect(extendedCloseAt(close, at)).toBe(at + 300_000);
  });
  it('a bid exactly 5 minutes before the close extends it', () => {
    const at = close - 300_000;
    expect(extendedCloseAt(close, at)).toBe(at + 300_000);
  });
  it('a bid 6 minutes before the close moves nothing', () => {
    expect(extendedCloseAt(close, close - 360_000)).toBe(close);
  });
  it('a bid at or after the close moves nothing', () => {
    expect(extendedCloseAt(close, close)).toBe(close);
    expect(extendedCloseAt(close, close + 1)).toBe(close);
    expect(extendedCloseAt(0, NOW)).toBe(0);
  });
  it('the stamps count an extension only when the close moved', () => {
    const lot = liveLot({ highestBid: 1400, bidCount: 3, extensions: 1 });
    const inBid = { id: 'lb_x', bidderUid: 'u1', bidderName: 'One', amount: 1500 };
    const extended = liveStampsAfter(lot, inBid, close - 60_000);
    expect(extended.closeAt).toBe(close - 60_000 + 300_000);
    expect(extended.extensions).toBe(2);
    expect(extended.bidCount).toBe(4);
    const steady = liveStampsAfter(lot, inBid, NOW);
    expect(steady.closeAt).toBe(close);
    expect(steady.extensions).toBe(1);
  });
});

describe('the EMD gate is A1’s own record', () => {
  it('recorded at the notice figure and unrefunded passes; every weakness fails', () => {
    expect(emdRecordedOk(reg(), 500)).toBe(true);
    expect(emdRecordedOk(reg({ emdAmount: 499 }), 500)).toBe(false);
    expect(emdRecordedOk(reg({ refundedAt: NOW }), 500)).toBe(false);
    expect(emdRecordedOk(reg({ receivedAt: 0 }), 500)).toBe(false);
    expect(emdRecordedOk(reg({ emdAmount: 0 }), 0)).toBe(true);
  });
  it('the register derives from the registrations: deduped, EMD-true only', () => {
    const lot = liveLot({
      registrations: [
        reg(),
        reg({ id: 'reg_2', bidderUid: 'u2', emdAmount: 100 }),
        reg({ id: 'reg_3', bidderUid: 'u3', emdAmount: 500, refundedAt: NOW }),
        reg({ id: 'reg_4', bidderUid: undefined }),
        reg({ id: 'reg_5', bidderUid: 'u1', emdAmount: 700 }),
      ],
    });
    expect(emdUidsFromRegistrations(lot)).toEqual(['u1']);
  });
  it('the gate separates unregistered, no-EMD, and barred refusals', () => {
    const attempt = { amount: 1000, entryMode: 'self' as const, conductorOk: false };
    expect(liveBidGateIssues(facts(), { ...attempt, bidderUid: 'u9', actorUid: 'u9' }, NOW))
      .toContain('not-registered');
    expect(liveBidGateIssues(facts(), { ...attempt, bidderUid: 'u2', actorUid: 'u2' }, NOW))
      .toContain('emd');
    expect(liveBidGateIssues(facts({ barredUids: ['u1'] }), { ...attempt, bidderUid: 'u1', actorUid: 'u1' }, NOW))
      .toContain('barred');
  });
});

describe('the one writer: one transaction, three documents', () => {
  const lotNow = () => {
    const lot = liveLot({ closeAt: Date.now() + 3_600_000 });
    lot.notice = { ...lot.notice!, auctionAt: lot.closeAt! };
    return lot;
  };
  it('a self bid writes the pinned bid shape, the lot stamps + updatedAt, the arena stamps', async () => {
    mockLotData = lotNow() as unknown as Record<string, unknown>;
    mockArenaData = arenaSeedFor(lotNow()) as unknown as Record<string, unknown>;
    const written = await placeLiveBid({
      lotId: 'lot_1', bidderUid: 'u1', bidderName: 'Bidder One',
      registrationId: 'reg_1', amount: 1200, entryMode: 'self', actorUid: 'u1',
    });
    expect(mockCalls.txSets).toHaveLength(1);
    const bidWrite = mockCalls.txSets[0];
    expect((bidWrite.ref as { __ref: string }).__ref).toBe(`auction_lots/lot_1/liveBids/${written.id}`);
    expect(Object.keys(bidWrite.data as object).sort()).toEqual(
      ['amount', 'bidderName', 'bidderUid', 'createdAt', 'entryMode', 'registrationId']
    );
    expect((bidWrite.data as { entryMode: string }).entryMode).toBe('self');
    const lotUpdate = mockCalls.txUpdates.find(
      (u) => (u.ref as { __ref: string }).__ref === 'auction_lots/lot_1'
    )!;
    const lotData = lotUpdate.data as Record<string, unknown>;
    expect(lotData.highestBid).toBe(1200);
    expect(lotData.highestBidderUid).toBe('u1');
    expect(lotData.highestBidId).toBe(written.id);
    expect(lotData.bidCount).toBe(1);
    expect(lotData.extensions).toBe(0);
    expect(typeof lotData.updatedAt).toBe('number');
    const arenaUpdate = mockCalls.txUpdates.find(
      (u) => (u.ref as { __ref: string }).__ref === 'auction_lots/lot_1/liveBids/_arena'
    )!;
    const arenaData = arenaUpdate.data as Record<string, unknown>;
    expect(Object.keys(arenaData).sort()).toEqual(
      ['bidCount', 'closeAt', 'extensions', 'highestBid', 'highestBidId', 'highestBidderName', 'highestBidderUid']
    );
    expect(arenaData.highestBid).toBe(1200);
  });
  it('a hall bid is labelled: entryMode hall + the conductor’s uid, never disguised', async () => {
    mockLotData = lotNow() as unknown as Record<string, unknown>;
    mockArenaData = arenaSeedFor(lotNow()) as unknown as Record<string, unknown>;
    await placeLiveBid({
      lotId: 'lot_1', bidderUid: 'u1', bidderName: 'Bidder One',
      registrationId: 'reg_1', amount: 1200, entryMode: 'hall',
      actorUid: 'conductor_9', conductorOk: true,
    });
    const data = mockCalls.txSets[0].data as Record<string, unknown>;
    expect(data.entryMode).toBe('hall');
    expect(data.enteredByUid).toBe('conductor_9');
    expect(data.bidderUid).toBe('u1');
  });
  it('a hall entry without the desk permission is refused before any write', async () => {
    mockLotData = lotNow() as unknown as Record<string, unknown>;
    mockArenaData = arenaSeedFor(lotNow()) as unknown as Record<string, unknown>;
    await expect(placeLiveBid({
      lotId: 'lot_1', bidderUid: 'u1', bidderName: 'Bidder One',
      registrationId: 'reg_1', amount: 1200, entryMode: 'hall',
      actorUid: 'conductor_9', conductorOk: false,
    })).rejects.toThrow('entry');
    expect(mockCalls.txSets).toHaveLength(0);
  });
  it('a below-floor amount against the fresh state is an outbid, and nothing writes', async () => {
    mockLotData = lotNow() as unknown as Record<string, unknown>;
    mockArenaData = arenaSeedFor(lotNow()) as unknown as Record<string, unknown>;
    await expect(placeLiveBid({
      lotId: 'lot_1', bidderUid: 'u1', bidderName: 'Bidder One',
      registrationId: 'reg_1', amount: 500, entryMode: 'self', actorUid: 'u1',
    })).rejects.toThrow('outbid');
    expect(mockCalls.txSets).toHaveLength(0);
    expect(mockCalls.txUpdates).toHaveLength(0);
  });
  it('an unseeded arena refuses the bid — the desk seeds it at the open', async () => {
    mockLotData = lotNow() as unknown as Record<string, unknown>;
    mockArenaData = null;
    await expect(placeLiveBid({
      lotId: 'lot_1', bidderUid: 'u1', bidderName: 'Bidder One',
      registrationId: 'reg_1', amount: 1200, entryMode: 'self', actorUid: 'u1',
    })).rejects.toThrow('arena');
  });
  it('opening a live lot stamps the derived EMD register and seeds the arena', async () => {
    const noticed = liveLot({ status: 'noticed' });
    await openLiveLot(noticed, { uid: 'staff', name: 'Staff' }, NOW);
    const lotUpdate = mockCalls.updates.find(
      (u) => (u.data as Record<string, unknown>).status === 'open'
    )!;
    expect((lotUpdate.data as Record<string, unknown>).liveEmdUids).toEqual(['u1']);
    const seed = mockCalls.sets.find(
      (s) => (s.ref as { __ref: string }).__ref === 'auction_lots/lot_1/liveBids/_arena'
    )!;
    const seedData = seed.data as Record<string, unknown>;
    expect(seedData.bidCount).toBe(0);
    expect(seedData.highestBid).toBe(0);
    expect(seedData.closeAt).toBe(noticed.closeAt);
    expect(seedData.bidIncrement).toBe(100);
    expect(seedData.reservePrice).toBe(1000);
  });
});

describe('the leader and the log', () => {
  it('the leader is the bid the stamps point at, verified against them', () => {
    const bids = [bid('lb_a', 'u1', 1200, 10), bid('lb_b', 'u2', 1500, 20)];
    const lot = liveLot({ highestBidId: 'lb_b', highestBid: 1500, bidCount: 2 });
    expect(liveLeaderBid(lot, bids)?.id).toBe('lb_b');
    expect(liveLeaderBid(liveLot({ highestBidId: 'lb_b', highestBid: 1400, bidCount: 2 }), bids)).toBeNull();
    expect(liveLeaderBid(liveLot(), bids)).toBeNull();
  });
  it('the log reads in the order bids landed', () => {
    const bids = [bid('lb_b', 'u2', 1500, 20), bid('lb_a', 'u1', 1200, 10)];
    expect(sortLiveLog(bids).map((b) => b.id)).toEqual(['lb_a', 'lb_b']);
  });
});

describe('the bar rides the workspace doc', () => {
  it('bar and unbar write only the auctionBarredUids field', async () => {
    await barBidder('ws_1', 'u7');
    await unbarBidder('ws_1', 'u7');
    expect(mockCalls.updates).toHaveLength(2);
    expect((mockCalls.updates[0].ref as { __ref: string }).__ref).toBe('workspaces/ws_1');
    expect(mockCalls.updates[0].data).toEqual({ auctionBarredUids: { __union: 'u7' } });
    expect(mockCalls.updates[1].data).toEqual({ auctionBarredUids: { __remove: 'u7' } });
  });
});
