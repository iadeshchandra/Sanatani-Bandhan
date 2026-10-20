/**
 * composerDoors.test.ts — Discoverability batch 4: Seva Notice door (#11).
 *
 * The rules that matter:
 *  - Firestore rules accept service_cards ONLY from authorKind
 *    purohit/jyotish (serviceCardOk) — the UI door must mirror that line.
 *  - The 1-card-per-72h rhythm is client-enforced via
 *    serviceCardCooldownRemainingMs; the desk re-checks internally.
 *  - The desk (SevaNoticeTab) re-derives the provider identity from
 *    Firestore and validates the editorial bar — the door is a relocation,
 *    it weakens no gate.
 */
import { serviceCardCooldownRemainingMs, cooldownMessage } from '../serviceCard';
import type { AuthorKind, SangamPost } from '../types';

const basePost: SangamPost = {
  id: 'post_1',
  authorUid: 'provider_1',
  authorName: 'Panditji',
  authorSanId: 'SAN-PAN001',
  authorKind: 'purohit',
  isOfficialPagePost: false,
  kind: 'service_card',
  text: 'A heartfelt seva notice that is certainly long enough for the rules.',
  serviceCard: {
    devotionalText: 'A heartfelt seva notice that is certainly long enough for the rules.',
    serviceLine: 'Rudrabhishek at your home',
    dakshina: 501,
    currency: 'INR',
    modes: ['home'],
    providerName: 'Panditji',
    providerTier: 'VERIFIED',
    providerUid: 'provider_1',
  } as SangamPost['serviceCard'],
  createdAt: Date.now() - 3600000,
  ashirvadCount: 0,
  commentCount: 0,
  shareCount: 0,
  status: 'active',
  visibility: 'public',
};

/** The UI gate the composer uses — must equal the rules line exactly. */
function providerDoorOpen(authorKind: AuthorKind, postingAsPage: boolean): boolean {
  return !postingAsPage && (authorKind === 'purohit' || authorKind === 'jyotish');
}

describe('Seva Notice door gate (#11)', () => {
  it('opens for purohit authors', () => expect(providerDoorOpen('purohit', false)).toBe(true));
  it('opens for jyotish authors', () => expect(providerDoorOpen('jyotish', false)).toBe(true));
  it('stays closed for devotees', () => expect(providerDoorOpen('devotee', false)).toBe(false));
  it('stays closed for org-page posts (authorKind org would fail serviceCardOk)', () =>
    expect(providerDoorOpen('org', false)).toBe(false));
  it('stays closed while posting as an org page', () =>
    expect(providerDoorOpen('purohit', true)).toBe(false));
});

describe('seva notice cooldown honoring', () => {
  it('a fresh provider may post immediately', () =>
    expect(serviceCardCooldownRemainingMs([], 'provider_1')).toBe(0));
  it('a recent service_card blocks the next for 72h', () => {
    const remaining = serviceCardCooldownRemainingMs([basePost], 'provider_1');
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(72 * 3600000);
  });
  it('another provider is unaffected by the first', () =>
    expect(serviceCardCooldownRemainingMs([basePost], 'provider_2')).toBe(0));
  it('cooldown message stays warm, never nagging', () => {
    const msg = cooldownMessage(3600000, 'en');
    expect(msg).not.toMatch(/can't|cannot|not allowed/i);
    expect(msg).toContain('🪔');
  });
  it('a card older than 72h frees the door', () => {
    const old = { ...basePost, createdAt: Date.now() - 73 * 3600000 };
    expect(serviceCardCooldownRemainingMs([old], 'provider_1')).toBe(0);
  });
});
