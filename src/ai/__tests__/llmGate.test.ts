/**
 * ai/__tests__/llmGate.test.ts — QUEUED #32, isolation layer 2.
 * =====================================================================
 * Even if the on-device LLM (somehow warm in a devotee session) maps a
 * question onto an admin intent with high confidence, the canOffer gate
 * still ends the request at role_denied — the executor never runs and
 * no terms data is read. H1 shrinks the catalogue; this pins the gate
 * behind it. The llmRouter module is mocked to play a stubborn model.
 */
jest.mock('../voice/llmRouter', () => ({
  tryLlmRoute: jest.fn(async () => ({
    intent: 'admin_terms',
    confidence: 'high',
    slots: {},
    evidence: ['llm:0.99'],
  })),
}));

import { ask } from '../assistant';
import {
  __setTermsCacheForTest,
  DEFAULT_TERMS,
  type PlatformTerms,
} from '../../lib/termsConfig';

function plantFixtures() {
  const t: PlatformTerms = JSON.parse(JSON.stringify(DEFAULT_TERMS));
  t.plans.standard.priceMonthlyBDT = 777;
  t.commission.freeRate = 17.5;
  t.loadedAt = 1760000000000;
  __setTermsCacheForTest(t);
}

describe('stubborn-LLM gate', () => {
  beforeAll(plantFixtures);
  afterAll(() => __setTermsCacheForTest(null));

  it('a devotee mapped to admin_terms still ends at role_denied', async () => {
    const res = await ask('hello, tell me something', { uid: 'd1', lang: 'en', role: 'devotee' });
    expect(res.type).toBe('clarify');
    expect(res.text).toMatch(/tended by/);
    expect(res.text).not.toMatch(/777|17\.5/);
    expect(res.data).toBeUndefined();
  });

  it('the same mapping serves the owner — the gate is role, not intent', async () => {
    const res = await ask('hello, tell me something', { uid: 'o1', lang: 'en', role: 'owner' });
    expect(res.text).toMatch(/৳777/);
    expect(res.text).toMatch(/17\.5/);
  });
});
