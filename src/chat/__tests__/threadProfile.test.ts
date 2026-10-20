/**
 * threadProfile.test.ts — QUEUED #28 eligibility boundary pins.
 * ======================================================================
 * The critical guarantees:
 * 1. The profile surface exists ONLY for direct 1:1 threads with a
 *    resolved counterpart. Org threads (and anything unresolved) keep
 *    today's static header — `counterpartSurface` returns null.
 * 2. THE BOOK GATE: a personal chat's counterpart (a family member —
 *    a pure devotee whose provider probe is all-empty) can NEVER be a
 *    marketplace provider. `isMarketplaceProvider` is true only on
 *    positive evidence: professional identity, active gigs, or active
 *    seva cards.
 * 3. Order context comes only from receipt messages already in the
 *    thread — the latest one wins; everything else is invisible.
 */
import {
  counterpartSurface,
  isMarketplaceProvider,
  latestOrderContext,
  orderStageLabel,
  providerRoles,
  EMPTY_PROVIDER_PROBE,
  type ProviderProbe,
} from '../threadProfile';
import type { ChatMessage, ChatParticipant, ChatThread } from '../types';

const devotee: ChatParticipant = {
  uid: 'uid-mother',
  displayName: 'Maa',
  sanataniId: 'SAN-MOM001',
};
const purohit: ChatParticipant = {
  uid: 'uid-pandit',
  displayName: 'Pandit Ramesh Shastri',
  sanataniId: 'SAN-PND002',
  verificationTier: 'VERIFIED',
};
const org: ChatParticipant = {
  uid: 'org-temple-1',
  displayName: 'Sri Mandir Trust',
  orgId: 'org-temple-1',
  orgName: 'Sri Mandir Trust',
};

function thread(
  overrides: Partial<ChatThread> & Pick<ChatThread, 'type' | 'participants' | 'participantInfo'>,
): ChatThread {
  return {
    id: 'chat-1',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

const directWithPurohit = thread({
  type: 'direct',
  participants: ['uid-mother', 'uid-pandit'],
  participantInfo: { 'uid-mother': devotee, 'uid-pandit': purohit },
});

describe('counterpartSurface — profile surface eligibility', () => {
  it('direct thread: viewer listed first gets the other participant', () => {
    const s = counterpartSurface(directWithPurohit, 'uid-mother');
    expect(s?.counterpartUid).toBe('uid-pandit');
    expect(s?.person.displayName).toBe('Pandit Ramesh Shastri');
  });

  it('direct thread: viewer listed second still gets the other participant', () => {
    const s = counterpartSurface(directWithPurohit, 'uid-pandit');
    expect(s?.counterpartUid).toBe('uid-mother');
    expect(s?.person.displayName).toBe('Maa');
  });

  it('org thread: NO profile surface (counterpart is an organisation)', () => {
    const orgThread = thread({
      type: 'org',
      participants: ['uid-mother', 'org-temple-1'],
      participantInfo: { 'uid-mother': devotee, 'org-temple-1': org },
    });
    expect(counterpartSurface(orgThread, 'uid-mother')).toBeNull();
  });

  it('null / unresolved thread: no surface', () => {
    expect(counterpartSurface(null, 'uid-mother')).toBeNull();
    expect(counterpartSurface(undefined, 'uid-mother')).toBeNull();
  });

  it('counterpart missing from participantInfo: no surface', () => {
    const broken = thread({
      type: 'direct',
      participants: ['uid-mother', 'uid-ghost'],
      participantInfo: { 'uid-mother': devotee },
    });
    expect(counterpartSurface(broken, 'uid-mother')).toBeNull();
  });

  it('degenerate thread with only the viewer: no surface (never self)', () => {
    const alone = thread({
      type: 'direct',
      participants: ['uid-mother'],
      participantInfo: { 'uid-mother': devotee },
    });
    expect(counterpartSurface(alone, 'uid-mother')).toBeNull();
  });

  it('empty viewer uid: no surface', () => {
    expect(counterpartSurface(directWithPurohit, '')).toBeNull();
  });
});

describe('isMarketplaceProvider — THE BOOK GATE', () => {
  it('a family member (pure devotee, empty probe) is NEVER a provider', () => {
    expect(isMarketplaceProvider(EMPTY_PROVIDER_PROBE)).toBe(false);
    expect(
      isMarketplaceProvider({
        hasPurohit: false,
        hasJyotish: false,
        activeGigs: 0,
        activeCards: 0,
      }),
    ).toBe(false);
  });

  it('unresolved probes are never providers', () => {
    expect(isMarketplaceProvider(null)).toBe(false);
    expect(isMarketplaceProvider(undefined)).toBe(false);
  });

  it('professional identity qualifies (purohit)', () => {
    const probe: ProviderProbe = { ...EMPTY_PROVIDER_PROBE, hasPurohit: true };
    expect(isMarketplaceProvider(probe)).toBe(true);
  });

  it('professional identity qualifies (jyotish)', () => {
    const probe: ProviderProbe = { ...EMPTY_PROVIDER_PROBE, hasJyotish: true };
    expect(isMarketplaceProvider(probe)).toBe(true);
  });

  it('one active gig qualifies even without a professional identity', () => {
    const probe: ProviderProbe = { ...EMPTY_PROVIDER_PROBE, activeGigs: 1 };
    expect(isMarketplaceProvider(probe)).toBe(true);
  });

  it('one active seva card qualifies even without a professional identity', () => {
    const probe: ProviderProbe = { ...EMPTY_PROVIDER_PROBE, activeCards: 1 };
    expect(isMarketplaceProvider(probe)).toBe(true);
  });

  it('zero listings with an identity-less probe stays closed', () => {
    const probe: ProviderProbe = {
      hasPurohit: false,
      hasJyotish: false,
      activeGigs: 0,
      activeCards: 0,
    };
    expect(isMarketplaceProvider(probe)).toBe(false);
  });
});

describe('providerRoles', () => {
  it('both identities → both roles, purohit first', () => {
    expect(
      providerRoles({ hasPurohit: true, hasJyotish: true, activeGigs: 0, activeCards: 0 }),
    ).toEqual(['purohit', 'jyotish']);
  });

  it('gig-only sevak has no declared professional role', () => {
    expect(providerRoles({ ...EMPTY_PROVIDER_PROBE, activeGigs: 3 })).toEqual([]);
  });

  it('null probe → no roles', () => {
    expect(providerRoles(null)).toEqual([]);
  });
});

function msg(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'm-1',
    chatId: 'chat-1',
    senderId: 'uid-mother',
    kind: 'text',
    text: 'Namaskar',
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

const receipt = (orderId: string, amount: number) =>
  msg({
    kind: 'receipt',
    text: '',
    receiptMeta: {
      orderId,
      amount,
      currency: 'BDT',
      trxId: 'TRX123',
      rail: 'bkash',
      providerUid: 'uid-pandit',
      providerName: 'Pandit Ramesh Shastri',
    },
  });

describe('latestOrderContext — order anchor from receipts only', () => {
  it('no messages / no receipts → null (personal chats stay bare)', () => {
    expect(latestOrderContext([])).toBeNull();
    expect(latestOrderContext(null)).toBeNull();
    expect(latestOrderContext([msg({}), msg({ kind: 'blessing' })])).toBeNull();
  });

  it('money request cards are NOT order context', () => {
    expect(
      latestOrderContext([msg({ kind: 'request_card', requestId: 'req-1' })]),
    ).toBeNull();
  });

  it('a receipt yields its order context', () => {
    const ctx = latestOrderContext([msg({}), receipt('order-1', 500)]);
    expect(ctx).toEqual({
      orderId: 'order-1',
      providerUid: 'uid-pandit',
      providerName: 'Pandit Ramesh Shastri',
      amount: 500,
      currency: 'BDT',
    });
  });

  it('the LATEST receipt wins when a thread carries two orders', () => {
    const ctx = latestOrderContext([
      receipt('order-old', 300),
      msg({}),
      receipt('order-new', 700),
    ]);
    expect(ctx?.orderId).toBe('order-new');
    expect(ctx?.amount).toBe(700);
  });

  it('a receipt-kind message without receiptMeta is skipped, not fatal', () => {
    const bare = msg({ kind: 'receipt', receiptMeta: undefined });
    expect(latestOrderContext([bare])).toBeNull();
    expect(latestOrderContext([bare, receipt('order-2', 100)])?.orderId).toBe(
      'order-2',
    );
  });
});

describe('orderStageLabel', () => {
  it('renders warm labels per language', () => {
    expect(orderStageLabel('complete', 'en')).toBe('Seva complete 🙏');
    expect(orderStageLabel('accepted', 'bn')).toBe('মুহূর্ত সংরক্ষিত 🪔');
    expect(orderStageLabel('in_seva', 'hi')).toBe('सेवा जारी है');
    expect(orderStageLabel('awaiting_advance', 'fr')).toBe('Advance awaited');
  });

  it('unknown stage hides the strip (null)', () => {
    expect(orderStageLabel('unknown', 'en')).toBeNull();
  });
});
