/**
 * ai/voice/__tests__/llmRouterScope.test.ts — QUEUED #32 (H1).
 * tryLlmRoute must hand the model a ROLE-SCOPED catalogue: non-owner
 * sessions never see admin intent ids among the choices. Engine and
 * renderer are mocked; the catalogue handed to mapToIntent is captured.
 */
const mockMapToIntent = jest.fn();
jest.mock('../engine', () => ({ isEngineWarm: () => true }));
jest.mock('../renderer', () => ({
  INTENT_CONFIDENCE_THRESHOLD: 0.7,
  mapToIntent: (...args: unknown[]) => mockMapToIntent(...args),
}));

import { tryLlmRoute } from '../llmRouter';
import type { IntentId } from '../../types';

describe('tryLlmRoute catalogue scoping (H1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMapToIntent.mockResolvedValue({ intent: 'greeting' as IntentId, confidence: 0.95 });
  });

  it('devotee sessions: the catalogue contains no admin intents', async () => {
    await tryLlmRoute('anything', 'en', 'devotee');
    expect(mockMapToIntent).toHaveBeenCalledTimes(1);
    const catalog = mockMapToIntent.mock.calls[0][1] as Array<{ id: string }>;
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.filter((c) => c.id.startsWith('admin_'))).toEqual([]);
  });

  it('no role supplied: still scoped (fail closed)', async () => {
    await tryLlmRoute('anything', 'en');
    const catalog = mockMapToIntent.mock.calls[0][1] as Array<{ id: string }>;
    expect(catalog.filter((c) => c.id.startsWith('admin_'))).toEqual([]);
  });

  it('owner sessions: all ten admin intents are offered', async () => {
    await tryLlmRoute('anything', 'en', 'owner');
    const catalog = mockMapToIntent.mock.calls[0][1] as Array<{ id: string }>;
    const admin = catalog.filter((c) => c.id.startsWith('admin_')).map((c) => c.id);
    expect(admin).toHaveLength(10);
    expect(admin).toContain('admin_terms');
    expect(admin).toContain('admin_advise');
  });
});
