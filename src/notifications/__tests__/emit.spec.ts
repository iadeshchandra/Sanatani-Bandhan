/**
 * emit.spec.ts — Phase 3 emit adapter correctness proofs.
 * ========================================================
 * Mocks the Firebase surface before any notification module loads it
 * (same pattern as NotificationCenter.test.ts). Covers:
 *   - validation: missing dedupeKey / non-trilingual copy → dropped
 *   - expired events → dropped
 *   - offline → queued in the outbox (with queuedAt)
 *   - online explicit-uid → delivered through the pipeline
 *   - notifyHelpers: every builder resolves (never throws) and every
 *     copy key the builders use exists in warmCopy
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((...args: unknown[]) => ({ __col: args })),
  doc: jest.fn((...args: unknown[]) => ({ __doc: args })),
  getDoc: jest.fn(),
  getDocs: jest.fn(async () => ({ docs: [] })),
  setDoc: jest.fn(async () => undefined),
  updateDoc: jest.fn(async () => undefined),
  addDoc: jest.fn(async () => ({ id: 'x' })),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  increment: jest.fn(),
  deleteField: jest.fn(),
  serverTimestamp: jest.fn(() => ({ __serverTimestamp: true })),
}));

jest.mock('../../firebase', () => ({ db: {} }));

import { emitNotify } from '../emit';
import {
  notifyChatMessage,
  notifyMoneyRequestReceived,
  notifyMoneyRequestAccepted,
  notifyMoneyRequestDeclined,
  notifyMoneyRequestCountered,
  notifyMoneyMarkedPaid,
  notifyMoneySettled,
  notifySOSAlert,
  notifySOSAcknowledged,
  notifySOSResolved,
  notifyTopupApproved,
  notifyTopupRejected,
  notifyPayoutReceived,
  notifyCommissionDue,
  notifyLowBalance,
  notifyOrgAnnouncement,
} from '../notifyHelpers';
import { copyFor, warmCopyKeys } from '../warmCopy';
import type { NotifyEvent } from '../types';

function validEvent(over: Partial<NotifyEvent> = {}): NotifyEvent {
  return {
    kind: 'chat',
    priority: 'important',
    title: { en: 't', bn: 't', hi: 't' },
    body: { en: 'b', bn: 'b', hi: 'b' },
    dedupeKey: 'test:key:1',
    ...over,
  };
}

describe('emitNotify', () => {
  it('drops events without a dedupeKey', async () => {
    const r = await emitNotify('uid1', validEvent({ dedupeKey: '' as unknown as string }));
    expect(r.status).toBe('dropped');
  });

  it('drops events without trilingual title', async () => {
    const r = await emitNotify(
      'uid1',
      validEvent({ title: { en: 't', bn: '', hi: '' } as unknown as NotifyEvent['title'] }),
    );
    expect(r.status).toBe('dropped');
  });

  it('drops expired events', async () => {
    const r = await emitNotify('uid1', validEvent({ expiresAt: Date.now() - 1000 }));
    expect(r.status).toBe('dropped');
  });

  it('queues when offline, with a decision attached', async () => {
    const g = globalThis as unknown as { navigator?: unknown };
    const orig = g.navigator;
    g.navigator = { onLine: false };
    try {
      const r = await emitNotify('uid-offline', validEvent({ dedupeKey: 'test:offline:1' }));
      expect(r.status).toBe('queued');
      expect(typeof r.queuedAt).toBe('number');
      expect(r.itemId).toBeTruthy();
    } finally {
      g.navigator = orig;
    }
  });

  it('delivers online to an explicit uid', async () => {
    const r = await emitNotify('uid-online', validEvent({ dedupeKey: 'test:online:1' }));
    expect(['delivered', 'held', 'grouped']).toContain(r.status);
    expect(r.itemId).toBeTruthy();
    expect(r.decision).toBeDefined();
  });

  it('never throws on garbage input', async () => {
    const r = await emitNotify('uid1', undefined as unknown as NotifyEvent);
    expect(r.status).toBe('dropped');
  });
});

describe('notifyHelpers — contract per module', () => {
  const chatBase = { senderUid: 's', senderName: 'Rahim', messageId: 'm1', chatId: 'c1' };
  const moneyBase = { name: 'Rahim', otherUid: 's', amount: '৳500', requestId: 'r1' };
  const sosBase = { senderUid: 's', senderName: 'Mina', eventId: 'e1', situation: 'medical' as string };

  const cases: Array<[string, () => Promise<{ status: string }>]> = [
    ['chat message → important', () => notifyChatMessage('u', { ...chatBase, kind: 'text', preview: 'hello' })],
    ['blessing → gentle', () => notifyChatMessage('u', { ...chatBase, messageId: 'm2', kind: 'blessing', preview: '' })],
    ['money request → important', () => notifyMoneyRequestReceived('u', moneyBase)],
    ['accepted → important', () => notifyMoneyRequestAccepted('u', moneyBase)],
    ['declined → important', () => notifyMoneyRequestDeclined('u', moneyBase)],
    ['countered → important', () => notifyMoneyRequestCountered('u', { ...moneyBase, amount: '৳400' })],
    ['mark-paid → important', () => notifyMoneyMarkedPaid('u', { ...moneyBase, via: 'bKash' })],
    ['settled → gentle', () => notifyMoneySettled('u', moneyBase)],
    ['SOS alert → critical', () => notifySOSAlert('u', sosBase)],
    [
      'SOS ack → critical',
      () => notifySOSAcknowledged('u', { ...sosBase, situation: '', responderName: 'Karim', responderUid: 'k1' }),
    ],
    ['SOS resolved → important', () => notifySOSResolved('u', { ...sosBase, situation: '' })],
    ['top-up approved → important', () => notifyTopupApproved('u', '৳1,000', 'c1')],
    ['top-up rejected → important', () => notifyTopupRejected('u', '৳1,000', 'c1')],
    ['payout received → gentle', () => notifyPayoutReceived('u', '৳2,000', 'o1')],
    ['commission due → important', () => notifyCommissionDue('u', '৳240', 'o1', '2026-10-17')],
    ['low balance → important', () => notifyLowBalance('u', '৳150')],
    [
      'org announcement → important',
      () => notifyOrgAnnouncement('u', { orgId: 'org1', orgName: 'Mandir', title: 'Diwali prep', announcementId: 'a1' }),
    ],
  ];

  it.each(cases)('%s', async (_label, call) => {
    const r = await call();
    // Helpers never throw; the mocked pipeline delivers.
    expect(['delivered', 'held', 'grouped']).toContain(r.status);
  });

  it('priorities route correctly through the engine', async () => {
    // critical → persistent banner, breaks through everything
    const sos = await notifySOSAlert('u', { senderUid: 's', senderName: 'Mina', eventId: 'e9', situation: 'medical' });
    expect(sos.decision.persistent).toBe(true);
    expect(sos.decision.ping).toBe(true);

    // important chat → prompt ping under default prefs
    const msg = await notifyChatMessage('u', { senderUid: 's', senderName: 'Rahim', kind: 'text', preview: 'hi', messageId: 'mx', chatId: 'c1' });
    expect(msg.decision.ping).toBe(true);

    // gentle blessing → no ping, digest candidate
    const bless = await notifyChatMessage('u', { senderUid: 's', senderName: 'Rahim', kind: 'blessing', preview: '', messageId: 'my', chatId: 'c1' });
    expect(bless.decision.ping).toBe(false);
    expect(bless.decision.digestCandidate).toBe(true);

    // gentle settled → no ping
    const settled = await notifyMoneySettled('u', { name: 'Rahim', otherUid: 's', amount: '৳500', requestId: 'rz' });
    expect(settled.decision.ping).toBe(false);

    // important money request → prompt ping
    const req = await notifyMoneyRequestReceived('u', { name: 'Rahim', otherUid: 's', amount: '৳500', requestId: 'rq' });
    expect(req.decision.ping).toBe(true);
  });

  it('every copy key the builders use exists in warmCopy', () => {
    const expected: Array<[string, string]> = [
      ['chat', 'message'],
      ['chat', 'blessingCard'],
      ['money_request', 'received'],
      ['money_request', 'accepted'],
      ['money_request', 'declined'],
      ['money_request', 'countered'],
      ['money_request', 'paid'],
      ['money_request', 'settled'],
      ['sos', 'responderAlert'],
      ['sos', 'ackReceived'],
      ['sos', 'resolved'],
      ['sos', 'alertSent'],
      ['wallet', 'topupCredited'],
      ['wallet', 'topupRejected'],
      ['wallet', 'payoutReceived'],
      ['wallet', 'commissionDue'],
      ['wallet', 'lowBalance'],
      ['org', 'announcement'],
      ['suchana', 'morningDigest'],
    ];
    for (const [kind, key] of expected) {
      expect(warmCopyKeys(kind as 'chat')).toContain(key);
      expect(copyFor(kind as 'chat', key).title.en).toBeTruthy();
    }
  });
});
