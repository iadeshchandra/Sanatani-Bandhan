/**
 * p2pLedger.spec.ts — unit tests for the personal P2P wallet ledger.
 * Pure logic: runs under jest without the Firestore emulator.
 * (Server-side rule enforcement for p2pRequests is covered by
 *  tests/firestore.rules.spec.ts conventions — the rules file already
 *  denies non-party reads; these tests cover the client-side half.)
 */

// The spec exercises pure ledger logic only; Firebase modules are ESM and
// are stubbed so the suite runs in this repo's CommonJS jest setup.
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  updateDoc: jest.fn(),
  writeBatch: jest.fn(),
}));
jest.mock('../firebase', () => ({ db: {} }));

import {
  deriveWalletEntries,
  summarizeWallet,
  suggestNetting,
  filterEntries,
  isActiveStatus,
  timeAgo,
  LedgerEntry,
} from '../p2pLedger';
import { MoneyRequest, RequestStatus } from '../../chat/types';

const A = 'user-a';
const B = 'user-b';
const C = 'user-c';
const ORG = 'org-1';

function req(partial: Partial<MoneyRequest> & { id: string }): MoneyRequest {
  return {
    direction: 'user_to_user',
    senderId: A,
    senderName: 'Asha',
    receiverId: B,
    receiverName: 'Bikash',
    amount: 500,
    currency: 'BDT',
    note: 'lunch',
    status: 'accepted',
    chatId: 'chat-1',
    expiresAt: Date.now() + 86400000,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
    ...partial,
  } as MoneyRequest;
}

describe('deriveWalletEntries', () => {
  it('splits direction by sender/receiver: sender owes, receiver is owed', () => {
    const entries = deriveWalletEntries(
      [
        req({ id: 'r1', senderId: A, receiverId: B }), // A pays B → A owes
        req({ id: 'r2', senderId: B, receiverId: A, senderName: 'Bikash', receiverName: 'Asha' }), // A is owed
      ],
      A,
    );
    expect(entries).toHaveLength(2);
    const r1 = entries.find((e) => e.requestId === 'r1')!;
    const r2 = entries.find((e) => e.requestId === 'r2')!;
    expect(r1.direction).toBe('i_owe');
    expect(r1.counterpartyName).toBe('Bikash');
    expect(r2.direction).toBe('owed_to_me');
    expect(r2.counterpartyName).toBe('Bikash');
  });

  it('PRIVACY: user A never sees user B-only entries even if passed in', () => {
    const foreign = req({
      id: 'rX',
      senderId: B,
      senderName: 'Bikash',
      receiverId: C,
      receiverName: 'Chandra',
    });
    const entries = deriveWalletEntries([foreign], A);
    expect(entries).toHaveLength(0);
  });

  it('PRIVACY: anon uid yields nothing', () => {
    expect(deriveWalletEntries([req({ id: 'r1' })], 'anon')).toHaveLength(0);
    expect(deriveWalletEntries([req({ id: 'r1' })], '')).toHaveLength(0);
  });

  it('labels org counterparties with the org name', () => {
    const entries = deriveWalletEntries(
      [
        req({
          id: 'rO',
          direction: 'org_to_user',
          senderId: ORG,
          senderName: 'Shanti Mandir',
          receiverId: A,
          receiverName: 'Asha',
          orgId: ORG,
          orgName: 'Shanti Mandir',
          senderTrusteeName: 'Trustee Tapan',
        }),
      ],
      A,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].direction).toBe('owed_to_me');
    expect(entries[0].orgCounterparty).toBe(true);
    expect(entries[0].counterpartyName).toBe('Shanti Mandir');
    expect(entries[0].trusteeName).toBe('Trustee Tapan');
  });
});

describe('summarizeWallet', () => {
  it('totals active obligations and pending counts', () => {
    const entries = deriveWalletEntries(
      [
        req({ id: 'r1', senderId: B, receiverId: A, status: 'accepted', amount: 500 }), // owed to A
        req({ id: 'r2', senderId: A, receiverId: B, status: 'pending', amount: 200 }), // A owes, pending sent
        req({ id: 'r3', senderId: B, receiverId: A, status: 'pending', amount: 100 }), // pending for A to respond
        req({ id: 'r4', senderId: A, receiverId: B, status: 'settled', amount: 999 }), // history — not counted
      ],
      A,
    );
    const s = summarizeWallet(A, entries);
    expect(s.totalOwedToMe).toBe(600);
    expect(s.totalIOwe).toBe(200);
    expect(s.pendingSent).toBe(1);
    expect(s.pendingReceived).toBe(1);
    expect(s.activeCount).toBe(3);
    expect(s.historyCount).toBe(1);
    expect(s.currency).toBe('BDT');
  });

  it('picks the primary currency by volume', () => {
    const entries = deriveWalletEntries(
      [
        req({ id: 'r1', senderId: B, receiverId: A, currency: 'BDT', amount: 100 }),
        req({ id: 'r2', senderId: B, receiverId: A, currency: 'INR', amount: 5000 }),
      ],
      A,
    );
    const s = summarizeWallet(A, entries);
    expect(s.currency).toBe('INR');
    expect(s.totalOwedToMe).toBe(5000);
    expect(s.totalsByCurrency.BDT.owedToMe).toBe(100);
  });
});

describe('suggestNetting', () => {
  const mk = (id: string, dir: 'owed_to_me' | 'i_owe', cp: string, amount: number): LedgerEntry => ({
    requestId: id,
    direction: dir,
    counterpartyId: `uid-${cp}`,
    counterpartyName: cp,
    amount,
    currency: 'BDT',
    note: '',
    status: 'accepted',
    chatId: 'c',
    updatedAt: Date.now(),
    orgCounterparty: false,
    expiresAt: 0,
    createdAt: 0,
    iAmPayer: dir === 'i_owe',
  });

  it('suggests a pass-through when amounts match', () => {
    const sugs = suggestNetting([
      mk('r1', 'owed_to_me', 'Rahim', 500),
      mk('r2', 'i_owe', 'Karim', 500),
    ]);
    expect(sugs).toHaveLength(1);
    expect(sugs[0].kind).toBe('pass_through');
    expect(sugs[0].text.en).toContain('Rahim');
    expect(sugs[0].text.en).toContain('Karim');
    expect(sugs[0].text.bn).toContain('দেবে');
    expect(sugs[0].text.hi).toContain('देगा');
  });

  it('suggests an offset for the same counterparty in both directions', () => {
    const sugs = suggestNetting([
      mk('r1', 'owed_to_me', 'Rahim', 500),
      mk('r2', 'i_owe', 'Rahim', 500),
    ]);
    expect(sugs.some((s) => s.kind === 'offset')).toBe(true);
  });

  it('stays silent when nothing matches', () => {
    expect(suggestNetting([mk('r1', 'owed_to_me', 'Rahim', 500), mk('r2', 'i_owe', 'Karim', 700)]))
      .toHaveLength(0);
  });

  it('ignores closed entries', () => {
    const closed = mk('r1', 'owed_to_me', 'Rahim', 500);
    closed.status = 'settled';
    expect(suggestNetting([closed, mk('r2', 'i_owe', 'Karim', 500)])).toHaveLength(0);
  });
});

describe('filterEntries', () => {
  const entries = deriveWalletEntries(
    [
      req({ id: 'r1', senderId: B, receiverId: A, status: 'accepted', amount: 500, updatedAt: 1000 }),
      req({ id: 'r2', senderId: A, receiverId: B, status: 'settled', amount: 200, updatedAt: 2000 }),
      req({ id: 'r3', senderId: C, senderName: 'Chandra', receiverId: A, status: 'pending', amount: 1500, updatedAt: 3000 }),
    ],
    A,
  );

  it('filters by person, status group, amount and date', () => {
    expect(filterEntries(entries, { person: B }).map((e) => e.requestId).sort()).toEqual(['r1', 'r2']);
    expect(filterEntries(entries, { status: 'active' })).toHaveLength(2);
    expect(filterEntries(entries, { status: 'history' }).map((e) => e.requestId)).toEqual(['r2']);
    expect(filterEntries(entries, { status: 'pending' as RequestStatus }).map((e) => e.requestId)).toEqual(['r3']);
    expect(filterEntries(entries, { minAmount: 400 }).map((e) => e.requestId).sort()).toEqual(['r1', 'r3']);
    expect(filterEntries(entries, { dateRange: { from: 1500 } }).map((e) => e.requestId).sort()).toEqual(['r2', 'r3']);
  });
});

describe('isActiveStatus / timeAgo', () => {
  it('classifies statuses', () => {
    expect(isActiveStatus('pending')).toBe(true);
    expect(isActiveStatus('accepted')).toBe(true);
    expect(isActiveStatus('paid')).toBe(true);
    expect(isActiveStatus('settled')).toBe(false);
    expect(isActiveStatus('countered')).toBe(false);
  });

  it('renders trilingual ages', () => {
    const now = Date.now();
    expect(timeAgo(now - 3 * 86400000, 'en', now)).toBe('3 days ago');
    expect(timeAgo(now - 3 * 86400000, 'bn', now)).toContain('দিন আগে');
    expect(timeAgo(now - 3 * 86400000, 'hi', now)).toContain('दिन पहले');
  });
});
