/**
 * providerCards.test.ts — QUEUED #22: the cards-side read path.
 * =================================================================
 * The unified provider profile lists a sevak's Sangam seva notices
 * next to their marketplace gigs. serviceCardPostFromCloud is the
 * gatekeeper: only ACTIVE service cards whose effective provider is
 * the profile's provider may pass. Pure mapping — Firestore mocked
 * away (the module imports db at load; the mapper never touches it).
 */
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));
jest.mock('../../firebase', () => ({ db: {} }));

import { serviceCardPostFromCloud, cardProviderUid } from '../providerCards';

const PROVIDER = 'uid_provider_1';

function cardDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    authorUid: PROVIDER,
    authorName: 'Pandit Ramesh Shastri',
    authorSanId: 'SAN-ABC123',
    authorKind: 'purohit',
    isOfficialPagePost: false,
    kind: 'service_card',
    text: 'Griha Pravesh puja at your home',
    serviceCard: {
      devotionalText: 'With Vedic mantras and full samagri, we bless your new home.',
      serviceLine: 'Griha Pravesh Puja',
      dakshina: 2100,
      currency: 'INR',
      modes: ['home'],
      providerName: 'Pandit Ramesh Shastri',
      providerTier: 'VERIFIED',
      providerUid: PROVIDER,
    },
    createdAt: 1_730_000_000_000,
    ashirvadCount: 3,
    commentCount: 1,
    shareCount: 0,
    visibility: 'public',
    status: 'active',
    ...overrides,
  };
}

describe('serviceCardPostFromCloud', () => {
  it('maps a valid active service card for the provider', () => {
    const post = serviceCardPostFromCloud('post_1', cardDoc(), PROVIDER);
    expect(post).not.toBeNull();
    expect(post!.id).toBe('post_1');
    expect(post!.kind).toBe('service_card');
    expect(post!.serviceCard?.serviceLine).toBe('Griha Pravesh Puja');
    expect(post!.serviceCard?.dakshina).toBe(2100);
    expect(post!.createdAt).toBe(1_730_000_000_000);
    expect(post!.status).toBe('active');
  });

  it('rejects non-card posts', () => {
    expect(serviceCardPostFromCloud('p', cardDoc({ kind: 'text' }), PROVIDER)).toBeNull();
    expect(serviceCardPostFromCloud('p', cardDoc({ kind: 'gratitude' }), PROVIDER)).toBeNull();
  });

  it('rejects removed / reported cards', () => {
    expect(serviceCardPostFromCloud('p', cardDoc({ status: 'removed' }), PROVIDER)).toBeNull();
    expect(serviceCardPostFromCloud('p', cardDoc({ status: 'reported' }), PROVIDER)).toBeNull();
  });

  it('rejects docs without a serviceCard payload', () => {
    expect(serviceCardPostFromCloud('p', cardDoc({ serviceCard: undefined }), PROVIDER)).toBeNull();
    expect(serviceCardPostFromCloud('p', cardDoc({ serviceCard: 'nope' }), PROVIDER)).toBeNull();
  });

  it("rejects another provider's card", () => {
    expect(serviceCardPostFromCloud('p', cardDoc(), 'uid_someone_else')).toBeNull();
  });

  it('falls back to authorUid when the card omits providerUid', () => {
    const doc = cardDoc();
    (doc.serviceCard as Record<string, unknown>).providerUid = undefined;
    const post = serviceCardPostFromCloud('p', doc, PROVIDER);
    expect(post).not.toBeNull();
  });

  it('a card-level providerUid mismatch loses even when authorUid matches', () => {
    const doc = cardDoc();
    (doc.serviceCard as Record<string, unknown>).providerUid = 'uid_other';
    expect(serviceCardPostFromCloud('p', doc, PROVIDER)).toBeNull();
  });

  it('reads Firestore Timestamp createdAt via toMillis', () => {
    const post = serviceCardPostFromCloud(
      'p',
      cardDoc({ createdAt: { toMillis: () => 1_700_000_000_000 } }),
      PROVIDER
    );
    expect(post!.createdAt).toBe(1_700_000_000_000);
  });

  it('null / empty inputs are null, never a throw', () => {
    expect(serviceCardPostFromCloud('p', null, PROVIDER)).toBeNull();
    expect(serviceCardPostFromCloud('p', undefined, PROVIDER)).toBeNull();
    expect(serviceCardPostFromCloud('p', cardDoc(), '')).toBeNull();
  });
});

describe('cardProviderUid — the feed’s effective-provider rule', () => {
  it('prefers the card providerUid', () => {
    expect(
      cardProviderUid({ authorUid: 'a', serviceCard: { providerUid: 'p' } as any })
    ).toBe('p');
  });

  it('falls back to authorUid', () => {
    expect(cardProviderUid({ authorUid: 'a', serviceCard: undefined })).toBe('a');
    expect(cardProviderUid({ authorUid: 'a', serviceCard: {} as any })).toBe('a');
  });
});
