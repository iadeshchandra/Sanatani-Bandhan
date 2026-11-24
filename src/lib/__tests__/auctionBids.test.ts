/**
 * auctionBids.test.ts — AUCTION A2: the sealed-bid law pins.
 * =====================================================================
 * The laws these tests hold:
 *  - One live bid per bidder is a shape, not a habit: the bid
 *    doc id IS the bidder uid, and place/replace/withdraw write
 *    exactly that doc with exactly the rules-pinned fields.
 *  - The window is judged from the record: 'open' only while
 *    the lot stands open, sealed, before its stored close clock
 *    (the notice's auction moment); the clock's passing closes
 *    it — no status flip is needed or trusted.
 *  - The winner judgement is the A1 gate restated: the highest
 *    bid at or above the reserve, from a bidder whose
 *    registration is on the lot — an unregistered account's bid
 *    can never win, and a tie goes to the bid that stood first.
 *  - The opening is one deliberate action: the first stamp
 *    lands (lot stamp + audit-chain event); a second stamp is
 *    refused — the bids were opened once.
 *  - The bidder register is derived, never typed: registrations
 *    carrying an account uid, deduped, in register order.
 */
const mockCalls: { sets: unknown[]; updates: unknown[]; deletes: unknown[] } = {
  sets: [], updates: [], deletes: [],
};
const mockRecord = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: (...parts: unknown[]) => ({
    __ref: parts.filter((p): p is string => typeof p === 'string').join('/'),
  }),
  doc: (...parts: unknown[]) => ({
    __ref: parts.filter((p): p is string => typeof p === 'string').join('/'),
  }),
  setDoc: (ref: unknown, data: unknown) => { mockCalls.sets.push({ ref, data }); return Promise.resolve(); },
  updateDoc: (ref: unknown, data: unknown) => { mockCalls.updates.push({ ref, data }); return Promise.resolve(); },
  deleteDoc: (ref: unknown) => { mockCalls.deletes.push({ ref }); return Promise.resolve(); },
  getDoc: () => Promise.resolve({ exists: () => false, data: () => undefined }),
  getDocs: () => Promise.resolve({ docs: [] }),
}));
jest.mock('../firebase', () => ({ db: {} }));
jest.mock('../../context/data/approvalsStore', () => ({
  approvalService: { request: jest.fn(), apply: jest.fn() },
  firestoreApprovalsBackend: {},
}));
jest.mock('../../context/data/auditStore', () => ({
  auditRecorder: { record: (...args: unknown[]) => mockRecord(...args) },
}));

import {
  bidAmountOk, bidOpeningSummary, highestBid, placeBid, rankBids,
  registrationForBid, replaceBid, stampBidsOpened, winningBid, withdrawBid,
  type SealedBid,
} from '../auctionBids';
import {
  bidderUidsFromRegistrations, sealedCloseMs, sealedWindowState,
  type AuctionLot, type LotRegistration,
} from '../auctionLots';

const bid = (uid: string, amount: number, createdAt = 1): SealedBid =>
  ({ bidderUid: uid, amount, createdAt, updatedAt: createdAt });

const reg = (id: string, bidderUid?: string): LotRegistration => ({
  id, name: `Bidder ${id}`, phone: '9000000000', idReference: 'ID',
  relatedParty: false, emdAmount: 400, emdMode: 'cash', receivedAt: 1,
  ...(bidderUid ? { bidderUid } : {}),
});

const lot = (over: Partial<AuctionLot> = {}): AuctionLot => ({
  id: 'lot-1', workspaceId: 'ws-1',
  source: { kind: 'standalone', label: 'Brass lamps' },
  lotClass: 'movables', lotMode: 'sealed', bidderUids: ['u-1', 'u-2'],
  title: 'Brass lamps', description: '', mediaRefs: [], reservePrice: 4000,
  status: 'open',
  history: { draft: { at: 1, by: 'admin' } },
  notice: { publishedAt: 1, auctionAt: 10_000, auctionPlace: 'Hall', objectionDeadline: 9_000, emdAmount: 400 },
  affixtures: [], objections: [],
  registrations: [reg('reg-1', 'u-1'), reg('reg-2', 'u-2')],
  createdAt: 1, updatedAt: 1,
  ...over,
});

beforeEach(() => {
  mockCalls.sets.length = 0;
  mockCalls.updates.length = 0;
  mockCalls.deletes.length = 0;
  mockRecord.mockClear();
});

describe('the window, judged from the record', () => {
  it('a sealed open lot inside its clock stands open; the clock closes it', () => {
    expect(sealedWindowState(lot(), 5_000)).toBe('open');
    expect(sealedWindowState(lot(), 10_000)).toBe('closed');
    expect(sealedWindowState(lot(), 99_000)).toBe('closed');
  });
  it('a hall lot, an unnoticed lot and an unopened lot have no window', () => {
    expect(sealedWindowState(lot({ lotMode: 'hall' }), 5_000)).toBe('not-open');
    expect(sealedWindowState(lot({ notice: undefined }), 5_000)).toBe('not-open');
    expect(sealedWindowState(lot({ status: 'noticed' }), 5_000)).toBe('not-open');
  });
  it('the close clock is the notice auction moment, 0 without a notice', () => {
    expect(sealedCloseMs(lot())).toBe(10_000);
    expect(sealedCloseMs(lot({ notice: undefined }))).toBe(0);
  });
});

describe('ranking and the winner judgement', () => {
  it('ranks highest first; a tie goes to the bid that stood first', () => {
    const ranked = rankBids([bid('u-2', 5000, 7), bid('u-1', 5000, 3), bid('u-3', 7000, 9)]);
    expect(ranked.map((b) => b.bidderUid)).toEqual(['u-3', 'u-1', 'u-2']);
    expect(highestBid([])).toBeNull();
  });
  it('the winner is the highest bid at or above reserve from a registered bidder', () => {
    const w = winningBid(lot(), [bid('u-1', 4500), bid('u-2', 6000)]);
    expect(w?.bid.bidderUid).toBe('u-2');
    expect(w?.registration.id).toBe('reg-2');
  });
  it('an unregistered account’s higher bid never wins; the next registered bid does', () => {
    const w = winningBid(lot(), [bid('u-9', 9000), bid('u-1', 4500)]);
    expect(w?.bid.bidderUid).toBe('u-1');
  });
  it('below the reserve there is no winner — a failed lot, recorded', () => {
    expect(winningBid(lot(), [bid('u-1', 3999)])).toBeNull();
    expect(winningBid(lot(), [])).toBeNull();
  });
  it('the opening summary counts honestly', () => {
    const s = bidOpeningSummary(lot(), [bid('u-1', 4500), bid('u-2', 3000), bid('u-9', 8000)]);
    expect(s.count).toBe(3);
    expect(s.highest).toBe(8000);
    expect(s.aboveReserve).toBe(2);
    expect(s.winner?.bid.bidderUid).toBe('u-1');
    expect(registrationForBid(lot(), bid('u-9', 1))).toBeNull();
  });
});

describe('the bidder register is derived from the registrations', () => {
  it('dedupes, trims and keeps register order', () => {
    expect(bidderUidsFromRegistrations([
      reg('a', ' u-2 '), reg('b'), reg('c', 'u-1'), reg('d', 'u-2'),
    ])).toEqual(['u-2', 'u-1']);
    expect(bidderUidsFromRegistrations([])).toEqual([]);
  });
});

describe('the bid writes — one doc, the pinned shape', () => {
  it('place writes bids/{uid} with exactly the four fields', async () => {
    await placeBid('lot-1', 'u-1', 5000, 42);
    expect(mockCalls.sets).toEqual([
      { ref: { __ref: 'auction_lots/lot-1/bids/u-1' }, data: { bidderUid: 'u-1', amount: 5000, createdAt: 42, updatedAt: 42 } },
    ]);
  });
  it('replace touches only amount + updatedAt on the same doc', async () => {
    await replaceBid('lot-1', 'u-1', 6500, 43);
    expect(mockCalls.updates).toEqual([
      { ref: { __ref: 'auction_lots/lot-1/bids/u-1' }, data: { amount: 6500, updatedAt: 43 } },
    ]);
  });
  it('withdraw deletes the bidder’s own doc', async () => {
    await withdrawBid('lot-1', 'u-1');
    expect(mockCalls.deletes).toEqual([{ ref: { __ref: 'auction_lots/lot-1/bids/u-1' } }]);
  });
  it('a non-positive or non-finite amount never reaches Firestore', async () => {
    await expect(placeBid('lot-1', 'u-1', 0, 42)).rejects.toThrow('amount');
    await expect(replaceBid('lot-1', 'u-1', Number.NaN, 42)).rejects.toThrow('amount');
    expect(bidAmountOk(-1)).toBe(false);
    expect(mockCalls.sets).toEqual([]);
  });
});

describe('the opening is one deliberate, audit-logged action', () => {
  it('the first stamp lands on the lot and in the audit chain', async () => {
    const stamped = await stampBidsOpened(lot(), { uid: 'admin-1', name: 'Admin', role: 'Trustee' }, 20_000);
    expect(stamped).toBe(true);
    expect(mockCalls.updates).toEqual([
      {
        ref: { __ref: 'auction_lots/lot-1' },
        data: { bidsOpenedAt: 20_000, bidsOpenedBy: 'admin-1', bidsOpenedByName: 'Admin', updatedAt: 20_000 },
      },
    ]);
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord.mock.calls[0][0]).toMatchObject({
      workspaceId: 'ws-1', actorUid: 'admin-1', action: 'auction.bidsOpened',
      entityType: 'auction_lot', entityId: 'lot-1',
      summaryKey: 'org.audit.history.auctionBidsOpened',
    });
  });
  it('a second stamp is refused — the bids were opened once', async () => {
    const stamped = await stampBidsOpened(lot({ bidsOpenedAt: 15_000 }), { uid: 'admin-1' }, 20_000);
    expect(stamped).toBe(false);
    expect(mockCalls.updates).toEqual([]);
    expect(mockRecord).not.toHaveBeenCalled();
  });
});
