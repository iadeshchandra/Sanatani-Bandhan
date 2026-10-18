import {
  validateServiceCard,
  lastServiceCardAt,
  serviceCardCooldownRemainingMs,
  SERVICE_CARD_COOLDOWN_MS,
  buildServiceCardDetails,
  serviceCardAskOpener,
  type ServiceCardDraft,
} from '../serviceCard';
import type { SangamPost } from '../types';

const goodDraft = (): ServiceCardDraft => ({
  devotionalText: 'For twelve years I have risen before dawn to offer water to Surya. Now I offer this sadhana to your family.',
  serviceLine: 'Rudrabhishek at your home, with full samagri',
  dakshina: '2100',
  currency: 'INR',
  includes: 'includes samagri and prasad for four',
  modes: ['home'],
  availability: 'Available on Ekadashi and weekends',
  lineage: 'Kashi Shaiva parampara',
  photoUrl: '',
});

const post = (uid: string, createdAt: number): SangamPost => ({
  id: `post_${createdAt}`, authorUid: uid, authorName: 'P', authorSanId: 'SAN-X',
  authorKind: 'purohit', isOfficialPagePost: false, kind: 'service_card',
  text: '', serviceCard: { ...buildServiceCardDetails(goodDraft(), { uid, name: 'P', tier: 'VERIFIED' }) },
  createdAt, ashirvadCount: 0, commentCount: 0, shareCount: 0, visibility: 'public', status: 'active',
});

describe('service_card validation — the editorial bar', () => {
  test('a dignified draft passes', () => {
    expect(validateServiceCard(goodDraft())).toEqual([]);
  });

  test('devotional text <30 chars is rejected', () => {
    const v = validateServiceCard({ ...goodDraft(), devotionalText: 'Too short.' });
    expect(v.some((x) => x.field === 'devotionalText')).toBe(true);
  });

  test('missing service line is rejected', () => {
    const v = validateServiceCard({ ...goodDraft(), serviceLine: '  ' });
    expect(v.some((x) => x.field === 'serviceLine')).toBe(true);
  });

  test('zero/negative dakshina is rejected', () => {
    expect(validateServiceCard({ ...goodDraft(), dakshina: '0' }).some((x) => x.field === 'dakshina')).toBe(true);
    expect(validateServiceCard({ ...goodDraft(), dakshina: '-5' }).some((x) => x.field === 'dakshina')).toBe(true);
  });

  test('cheap signals are banned: discount, scarcity, urgency, countdowns, shouting', () => {
    const cases = [
      { ...goodDraft(), serviceLine: 'Rudrabhishek FLAT 20% OFF today' },
      { ...goodDraft(), availability: 'Only 2 slots left, hurry!' },
      { ...goodDraft(), includes: 'deal ends in 3 hours, act now' },
      { ...goodDraft(), serviceLine: 'RUDRABHISHEK AT YOUR HOME TODAY' },
    ];
    for (const d of cases) {
      const v = validateServiceCard(d);
      expect(v.length).toBeGreaterThan(0);
    }
  });

  test('no modes selected is rejected', () => {
    const v = validateServiceCard({ ...goodDraft(), modes: [] });
    expect(v.some((x) => x.field === 'modes')).toBe(true);
  });
});

describe('spam line — 1 card / 72h / provider', () => {
  test('no prior card → no cooldown', () => {
    expect(serviceCardCooldownRemainingMs([], 'u1')).toBe(0);
  });

  test('recent card → cooldown remaining', () => {
    const now = Date.now();
    const posts = [post('u1', now - 1000)];
    const remaining = serviceCardCooldownRemainingMs(posts, 'u1', now);
    expect(remaining).toBeGreaterThan(SERVICE_CARD_COOLDOWN_MS - 5000);
  });

  test('card older than 72h → no cooldown', () => {
    const now = Date.now();
    const posts = [post('u1', now - SERVICE_CARD_COOLDOWN_MS - 1000)];
    expect(serviceCardCooldownRemainingMs(posts, 'u1', now)).toBe(0);
  });

  test('cooldown is per-provider', () => {
    const now = Date.now();
    const posts = [post('u1', now - 1000)];
    expect(serviceCardCooldownRemainingMs(posts, 'u2', now)).toBe(0);
  });

  test('removed posts do not count', () => {
    const now = Date.now();
    const p = post('u1', now - 1000);
    p.status = 'removed';
    expect(lastServiceCardAt([p], 'u1')).toBeNull();
  });
});

describe('buildServiceCardDetails + Ask opener', () => {
  test('builds a complete card, trims, drops empties', () => {
    const d = buildServiceCardDetails(
      { ...goodDraft(), includes: '  ', availability: '' },
      { uid: 'u1', name: 'Pandit Ramesh', tier: 'TRUSTED', roleId: 'PUR-AB12CD' }
    );
    expect(d.providerName).toBe('Pandit Ramesh');
    expect(d.providerTier).toBe('TRUSTED');
    expect(d.includes).toBeUndefined();
    expect(d.availability).toBeUndefined();
    expect(d.dakshina).toBe(2100);
  });

  test('Ask opener is warm and trilingual', () => {
    const d = buildServiceCardDetails(goodDraft(), { uid: 'u1', name: 'Ramesh', tier: 'VERIFIED' });
    for (const lang of ['en', 'hi', 'bn'] as const) {
      const opener = serviceCardAskOpener(d, lang);
      expect(opener).toContain('Ramesh');
      expect(opener).toContain('🙏');
    }
  });
});

describe('feed density — service cards are guests (≤15%)', () => {
  const { applyServiceCardDensity } = require('../serviceCard');
  const mk = (id: string, kind: string, createdAt: number) => ({ id, kind, createdAt });

  test('under the cap → untouched', () => {
    const posts = [mk('1', 'text', 3), mk('2', 'service_card', 2), mk('3', 'text', 1)];
    expect(applyServiceCardDensity(posts)).toHaveLength(3);
  });

  test('over the cap → oldest cards thinned, order preserved', () => {
    // 20 posts, 10 cards (50%) → cap is max(1, floor(20*0.15)) = 3
    const posts = Array.from({ length: 20 }, (_, i) =>
      mk(`p${i}`, i % 2 === 0 ? 'service_card' : 'text', 100 - i)
    );
    const out = applyServiceCardDensity(posts);
    const cards = out.filter((p: { kind: string }) => p.kind === 'service_card');
    expect(cards.length).toBe(3);
    // Kept cards are the most recent ones, still chronological
    expect(cards.map((c: { id: string }) => c.id)).toEqual(['p0', 'p2', 'p4']);
    // Non-cards untouched
    expect(out.filter((p: { kind: string }) => p.kind !== 'service_card')).toHaveLength(10);
  });

  test('empty list → empty', () => {
    expect(applyServiceCardDensity([])).toEqual([]);
  });
});
