/**
 * auctionLots.test.ts — AUCTION A1: the Nilam pure-law pins.
 * =====================================================================
 * The laws these tests hold:
 *  - The lifecycle table is the whole law: a lot moves only along
 *    LOT_TRANSITIONS, terminal states never move again, and a
 *    same-status edit is always allowed (records grow in place).
 *  - The notice clock is statute-shaped: >= 15 days for
 *    rights-lease / movables, >= 30 days for an immovable sale,
 *    counted from the moment the notice is published.
 *  - The sanction gate demands a record exactly where the class
 *    demands it: every immovable sale, and any lease over 5 years;
 *    a lease of exactly 5 years is not gated.
 *  - lotGateIssues is the desk's pre-flight mirror of the rules:
 *    no valuation, no leaving draft; open objections block
 *    acceptance; settlement needs both treasury ids on record.
 *  - The approval seal binds the decision to the lot as filed:
 *    any drift in title / class / reserve / valuation figure /
 *    sanction reference after filing refuses the apply.
 *  - Money arithmetic is plain: EMD held vs refunded, and the
 *    balance due is the winning amount minus the deposit, never
 *    below zero.
 */
jest.mock('../firebase', () => ({ db: {} }));
jest.mock('../../context/data/approvalsStore', () => ({
  approvalService: { request: jest.fn(), apply: jest.fn() },
  firestoreApprovalsBackend: {},
}));

import {
  LOT_TRANSITIONS,
  REGISTRATIONS_CAP,
  approveSnapshotMatches,
  balanceDue,
  buildLotApprovalPayload,
  canTransitionLot,
  earliestAuctionAt,
  lotGateIssues,
  noticeClockOk,
  openObjectionsOf,
  registrationTotals,
  sanctionPresent,
  sanctionRequiredFor,
  valuationPresent,
  type AuctionLot,
  type LotRegistration,
} from '../auctionLots';

const DAY = 86400000;
const T0 = 1764000000000; // a fixed "now" — the clock is an input, never read

function lot(over: Partial<AuctionLot> = {}): AuctionLot {
  return {
    id: 'lot-1',
    workspaceId: 'ws-1',
    source: { kind: 'standalone', label: 'Brass lamps (12)' },
    lotClass: 'movables',
    title: 'Brass lamps, set of twelve',
    description: '',
    mediaRefs: [],
    reservePrice: 4000,
    valuationBasis: null,
    sanction: null,
    leaseTermYears: null,
    status: 'draft',
    history: { draft: { at: T0, by: 'admin-1' } },
    notice: null,
    affixtures: [],
    objections: [],
    registrations: [],
    outcome: null,
    settlement: null,
    failReason: null,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  };
}

const VALUATION = { kind: 'committee-estimate' as const, figure: 4500 };
const SANCTION = { authority: 'Commissioner, HR&CE', reference: 'Order 12/2026', date: '2026-11-02' };

function reg(over: Partial<LotRegistration> = {}): LotRegistration {
  return {
    id: 'reg-1',
    name: 'Bidder One',
    phone: '9000000000',
    idReference: 'Aadhaar ****1234',
    relatedParty: false,
    emdAmount: 400,
    emdMode: 'cash',
    receivedAt: T0,
    ...over,
  };
}

describe('lifecycle transitions', () => {
  it('the happy path walks every step in order', () => {
    expect(canTransitionLot('draft', 'approved')).toBe(true);
    expect(canTransitionLot('approved', 'noticed')).toBe(true);
    expect(canTransitionLot('noticed', 'open')).toBe(true);
    expect(canTransitionLot('open', 'accepted')).toBe(true);
    expect(canTransitionLot('accepted', 'settled')).toBe(true);
  });

  it('no step can be skipped', () => {
    expect(canTransitionLot('draft', 'noticed')).toBe(false);
    expect(canTransitionLot('draft', 'settled')).toBe(false);
    expect(canTransitionLot('approved', 'open')).toBe(false);
    expect(canTransitionLot('noticed', 'accepted')).toBe(false);
    expect(canTransitionLot('open', 'settled')).toBe(false);
  });

  it('failure is reachable from the hall, withdrawal from any live state', () => {
    expect(canTransitionLot('open', 'failed')).toBe(true);
    for (const s of ['draft', 'approved', 'noticed', 'open'] as const) {
      expect(canTransitionLot(s, 'withdrawn')).toBe(true);
    }
    // An accepted lot whose winner defaults is recorded failed (the
    // EMD-forfeiture case) — but it is never quietly withdrawn.
    expect(canTransitionLot('accepted', 'failed')).toBe(true);
    expect(canTransitionLot('accepted', 'withdrawn')).toBe(false);
  });

  it('terminal states never move; a same-status write is not a transition', () => {
    for (const s of ['settled', 'failed', 'withdrawn'] as const) {
      expect(LOT_TRANSITIONS[s]).toEqual([]);
      expect(canTransitionLot(s, 'draft')).toBe(false);
    }
    // canTransitionLot guards STATUS CHANGES only — same-status
    // record edits (registrations, affixtures, responses) ride
    // patchLot and never consult it.
    for (const s of Object.keys(LOT_TRANSITIONS) as Array<keyof typeof LOT_TRANSITIONS>) {
      expect(canTransitionLot(s, s)).toBe(false);
    }
  });
});

describe('notice clock', () => {
  it('rights-lease and movables need fifteen clear days', () => {
    expect(noticeClockOk('movables', T0, T0 + 15 * DAY)).toBe(true);
    expect(noticeClockOk('movables', T0, T0 + 15 * DAY - 1)).toBe(false);
    expect(noticeClockOk('rights-lease', T0, T0 + 14 * DAY)).toBe(false);
    expect(earliestAuctionAt('movables', T0)).toBe(T0 + 15 * DAY);
  });

  it('an immovable sale needs thirty clear days', () => {
    expect(noticeClockOk('immovable-sale', T0, T0 + 29 * DAY)).toBe(false);
    expect(noticeClockOk('immovable-sale', T0, T0 + 30 * DAY)).toBe(true);
    expect(earliestAuctionAt('immovable-sale', T0)).toBe(T0 + 30 * DAY);
  });
});

describe('sanction gate', () => {
  it('every immovable sale is gated; movables never are', () => {
    expect(sanctionRequiredFor(lot({ lotClass: 'immovable-sale' }))).toBe(true);
    expect(sanctionRequiredFor(lot({ lotClass: 'movables' }))).toBe(false);
  });

  it('a lease is gated only past five years — five exactly is not', () => {
    expect(sanctionRequiredFor(lot({ lotClass: 'rights-lease', leaseTermYears: 5 }))).toBe(false);
    expect(sanctionRequiredFor(lot({ lotClass: 'rights-lease', leaseTermYears: 6 }))).toBe(true);
    expect(sanctionRequiredFor(lot({ lotClass: 'rights-lease', leaseTermYears: null }))).toBe(false);
  });

  it('a sanction record needs both an authority and an order reference', () => {
    expect(sanctionPresent(lot())).toBe(false);
    expect(sanctionPresent(lot({ sanction: { authority: 'X', reference: '', date: '' } }))).toBe(false);
    expect(sanctionPresent(lot({ sanction: SANCTION }))).toBe(true);
  });
});

describe('valuation gate', () => {
  it('a basis needs a figure; a valuer name is not a figure', () => {
    expect(valuationPresent(lot())).toBe(false);
    expect(valuationPresent(lot({ valuationBasis: { kind: 'independent-valuer', valuerName: 'R. Sen', figure: undefined as unknown as number } }))).toBe(false);
    expect(valuationPresent(lot({ valuationBasis: VALUATION }))).toBe(true);
    expect(valuationPresent(lot({ valuationBasis: { kind: 'committee-estimate', figure: 0 } }))).toBe(true);
  });
});

describe('lotGateIssues — the pre-flight mirror', () => {
  it('a draft with no valuation cannot be approved, and says why', () => {
    expect(lotGateIssues(lot(), 'approved', T0)).toContain('valuation');
    expect(lotGateIssues(lot({ valuationBasis: VALUATION }), 'approved', T0)).toEqual([]);
  });

  it('an immovable sale cannot be noticed without sanction, even with valuation', () => {
    const notice = { auctionAt: T0 + 30 * DAY, auctionPlace: 'Hall', emdAmount: 400, objectionDeadline: T0 + 25 * DAY, publishedAt: T0 };
    const l = lot({ lotClass: 'immovable-sale', status: 'approved', valuationBasis: VALUATION, notice });
    expect(lotGateIssues(l, 'noticed', T0)).toContain('sanction');
    expect(lotGateIssues({ ...l, sanction: SANCTION }, 'noticed', T0)).toEqual([]);
  });

  it('the notice step enforces the clock against the stamped publish moment', () => {
    const l = lot({
      status: 'approved',
      valuationBasis: VALUATION,
      notice: { auctionAt: T0 + 10 * DAY, auctionPlace: 'Hall', emdAmount: 400, objectionDeadline: T0 + 10 * DAY, publishedAt: T0 },
    });
    expect(lotGateIssues(l, 'noticed', T0)).toContain('notice-clock');
    const lawful = { ...l, notice: { ...l.notice!, auctionAt: T0 + 15 * DAY } };
    expect(lotGateIssues(lawful, 'noticed', T0)).toEqual([]);
  });

  it('an open objection blocks acceptance until answered on record', () => {
    const objection = { id: 'o1', objectorName: 'Neighbour', text: 'Boundary disputed', receivedOn: '2026-11-21' };
    const l = lot({ status: 'open', valuationBasis: VALUATION, objections: [objection] });
    expect(openObjectionsOf(l)).toHaveLength(1);
    expect(lotGateIssues(l, 'accepted', T0)).toContain('objections-open');
    const answered = {
      ...l,
      objections: [{ ...objection, response: 'Survey attached.', respondedOn: '2026-11-22' }],
      registrations: [reg()],
      outcome: { winnerRegistrationId: 'reg-1', winnerName: 'Bidder One', winningAmount: 5200, auctionDate: '2026-12-05', conductorName: 'Manager', publishWinnerName: true },
    };
    expect(lotGateIssues(answered, 'accepted', T0)).toEqual([]);
  });

  it('acceptance needs a recorded winner; settlement needs both treasury ids', () => {
    const open = lot({ status: 'open', valuationBasis: VALUATION });
    expect(lotGateIssues(open, 'accepted', T0)).toContain('winner');
    const accepted = lot({
      status: 'accepted',
      valuationBasis: VALUATION,
      outcome: { winnerRegistrationId: 'reg-1', winnerName: 'Bidder One', winningAmount: 5200, auctionDate: '2026-12-05', conductorName: 'Manager', publishWinnerName: true },
      settlement: { depositAmount: 2000, depositTxId: 'tx-1', balanceTxId: null },
    });
    expect(lotGateIssues(accepted, 'settled', T0)).toContain('settlement-incomplete');
    const complete = { ...accepted, settlement: { ...accepted.settlement!, balanceTxId: 'tx-2' } };
    expect(lotGateIssues(complete, 'settled', T0)).toEqual([]);
  });

  it('the registrations cap constant is the one the rules pin (100)', () => {
    // Enforced at the desk's add path (NilamDesk throws
    // 'registrations-cap') and again in firestore.rules — the
    // constant is the shared truth both sides mirror.
    expect(REGISTRATIONS_CAP).toBe(100);
  });

  it('an illegal jump reports the status itself', () => {
    expect(lotGateIssues(lot({ valuationBasis: VALUATION }), 'settled', T0)).toContain('status');
  });
});

describe('approval seal', () => {
  it('the approve payload snapshots the lot as filed', () => {
    const l = lot({ valuationBasis: VALUATION, sanction: SANCTION, lotClass: 'immovable-sale' });
    const payload = buildLotApprovalPayload(l, 'approve');
    expect(payload).toMatchObject({
      lotId: 'lot-1', step: 'approve', lotClass: 'immovable-sale',
      reservePrice: 4000, valuationFigure: 4500, sanctionReference: 'Order 12/2026',
    });
  });

  it('the accept payload carries the outcome verbatim', () => {
    const outcome = { winnerRegistrationId: 'reg-2', winnerName: 'Bidder Two', winningAmount: 6100, auctionDate: '2026-12-05', conductorName: 'Manager', publishWinnerName: false };
    const payload = buildLotApprovalPayload(lot({ outcome }), 'accept');
    expect(payload.outcome).toEqual(outcome);
  });

  it('the snapshot matches only while nothing material drifted', () => {
    const l = lot({ valuationBasis: VALUATION });
    const payload = buildLotApprovalPayload(l, 'approve');
    expect(approveSnapshotMatches(l, payload)).toBe(true);
    expect(approveSnapshotMatches({ ...l, reservePrice: 1 }, payload)).toBe(false);
    expect(approveSnapshotMatches({ ...l, title: 'Renamed quietly' }, payload)).toBe(false);
    expect(approveSnapshotMatches({ ...l, valuationBasis: { kind: 'committee-estimate', figure: 9 } }, payload)).toBe(false);
    expect(approveSnapshotMatches({ ...l, lotClass: 'rights-lease' }, payload)).toBe(false);
  });
});

describe('money arithmetic', () => {
  it('registration totals split held from refunded EMD', () => {
    const regs = [reg(), reg({ id: 'reg-2', refundedAt: T0 + DAY }), reg({ id: 'reg-3', emdAmount: 1000, relatedParty: true })];
    expect(registrationTotals(lot({ registrations: regs }))).toEqual({
      count: 3, emdHeld: 1400, emdRefunded: 400, refundedCount: 1, relatedCount: 1, barredCount: 0,
    });
    expect(registrationTotals(lot())).toEqual({
      count: 0, emdHeld: 0, emdRefunded: 0, refundedCount: 0, relatedCount: 0, barredCount: 0,
    });
  });

  it('the balance due is the winning amount minus the deposit, floored at zero', () => {
    const l = lot({
      outcome: { winnerRegistrationId: 'reg-1', winnerName: 'Bidder One', winningAmount: 5200, auctionDate: '2026-12-05', conductorName: 'Manager', publishWinnerName: true },
      settlement: { depositAmount: 2000, depositTxId: 'tx-1', balanceTxId: null },
    });
    expect(balanceDue(l)).toBe(3200);
    expect(balanceDue({ ...l, settlement: { ...l.settlement!, depositAmount: 9000 } })).toBe(0);
    expect(balanceDue(lot())).toBe(0);
  });
});
