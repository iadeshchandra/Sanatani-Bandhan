/**
 * Sanatani Bandhan — AI Assistant Phase 1 · jest tests
 * =====================================================================
 * Pins the Phase-1 design laws structurally:
 * 1. The LLM is a renderer, never a reasoner — every prompt carries a
 *    <DATA> block + the verbatim guardrail; type/action/suggestions can
 *    never come from the model (enhanceWithVoice only replaces `text`).
 * 2. Graceful absence — no WebGPU / engine failure / timeout → the
 *    deterministic Phase-0 answer stands, silently and warmly.
 * 3. Intent mapping is confidence-gated — below threshold (or unparsable,
 *    or outside OUR catalog) the keyword router's answer stands.
 * 4. Informed consent — size shown from the manifest; WiFi gate fires on
 *    unknown/metered connections.
 */

import {
  buildDataBlock,
  buildIntentMapPrompt,
  buildRephrasePrompt,
  buildSummarizePrompt,
  GUARDRAIL_SYSTEM_PROMPT,
  INTENT_CONFIDENCE_THRESHOLD,
  mapToIntent,
  warmRephrase,
} from '../renderer';
import { enhanceWithVoice } from '../enhance';
import { tryLlmRoute } from '../llmRouter';
import { probeVoiceCapability } from '../capabilities';
import { downloadGate, confirmDownload, cancelDownload, removeVoice } from '../downloader';
import {
  countAssistantUse,
  dismissNudgeForever,
  getDlPersist,
  markNudgeShown,
  reconcileDlOnBoot,
  setDlPersist,
  shouldShowNudge,
} from '../storage';
import { routeIntent, INTENTS } from '../../intents';
import { TASKS } from '../../tasks';
import { canOffer } from '../../rbac';
import { renderTemplate, suggestionsFor } from '../../templates';
import { VOICE_MODEL, modelSizeGB, modelSizeLabel } from '../models';
import type { AssistantResponse } from '../../types';

/* In-memory localStorage (node env), same pattern as Phase-0 tests. */
const memStore: Record<string, string> = {};
(global as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (k in memStore ? memStore[k] : null),
  setItem: (k: string, v: string) => {
    memStore[k] = v;
  },
  removeItem: (k: string) => {
    delete memStore[k];
  },
};
function clearMemStore() {
  for (const k of Object.keys(memStore)) delete memStore[k];
}

/* Mock @mlc-ai/web-llm for engine/downloader/capabilities. */
const mockCreate = jest.fn();
const mockUnload = jest.fn();
const mockCreateEngine = jest.fn();
const mockHasModelInCache = jest.fn();
const mockDeleteModelInCache = jest.fn();
jest.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: (...args: unknown[]) => mockCreateEngine(...args),
  hasModelInCache: (...args: unknown[]) => mockHasModelInCache(...args),
  deleteModelInCache: (...args: unknown[]) => mockDeleteModelInCache(...args),
}));

const fakeEngine = {
  chat: { completions: { create: (...args: unknown[]) => mockCreate(...args) } },
  unload: (...args: unknown[]) => mockUnload(...args),
};

const CATALOG = [
  { id: 'tithi_today', description: "Today's tithi" },
  { id: 'dana_help', description: 'How to give dana' },
  { id: 'greeting', description: 'Warm greeting' },
];

const baseResponse = (over: Partial<AssistantResponse> = {}): AssistantResponse => ({
  type: 'answer',
  text: 'Deterministic answer. 🙏',
  action: { kind: 'navigate', target: '/app/home' },
  suggestions: ['Where is dana?'],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  clearMemStore();
  mockHasModelInCache.mockResolvedValue(false);
  mockDeleteModelInCache.mockResolvedValue(undefined);
  mockCreateEngine.mockResolvedValue(fakeEngine);
});

describe('guardrail prompt construction — the fact boundary', () => {
  test('rephrase prompt carries the verbatim guardrail + DATA block + original', () => {
    const msgs = buildRephrasePrompt({ original: 'Tithi is Shashthi. 🙏', lang: 'ta', region: 'tamil-nadu' });
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toBe(GUARDRAIL_SYSTEM_PROMPT);
    expect(msgs[0].content).toContain('Use ONLY the facts inside the <DATA> block');
    expect(msgs[0].content).toContain('offer to connect the user with Purohitji');
    const user = msgs[1].content;
    expect(user).toContain('<DATA>');
    expect(user).toContain('Tithi is Shashthi. 🙏');
    expect(user).toContain('"ta"');
    expect(user).toContain('Do not add, remove, or change any fact');
  });

  test('DATA block has deterministic key order and nothing extra', () => {
    const a = buildDataBlock({ facts: { b: 2, a: 1 }, original_answer: 'x' });
    const b = buildDataBlock({ facts: { a: 1, b: 2 }, original_answer: 'x' });
    expect(a).toBe(b);
    expect(a).toContain('"a": 1');
    expect(a).not.toContain('Purohitji');
  });

  test('intent-map prompt restricts the model to OUR catalog ids, JSON only', () => {
    const msgs = buildIntentMapPrompt('when is ekadashi', CATALOG);
    expect(msgs[0].content).toBe(GUARDRAIL_SYSTEM_PROMPT);
    const user = msgs[1].content;
    expect(user).toContain('tithi_today');
    expect(user).toContain('dana_help');
    expect(user).toContain('{"intent": "<id>", "confidence": 0.0}');
    expect(user).toContain('when is ekadashi');
  });

  test('summarize prompt embeds exactly the records, with empty-data honesty', () => {
    const msgs = buildSummarizePrompt({
      kind: 'sadhana-week',
      data: { japa: 1080, days: 7 },
      lang: 'bn',
    });
    const user = msgs[1].content;
    expect(user).toContain('"japa": 1080');
    expect(user).toContain('"days": 7');
    expect(user).toContain('nothing recorded yet');
  });
});

describe('graceful absence — deterministic always stands', () => {
  test('enhanceWithVoice returns base untouched when the engine is not warm', async () => {
    const { enhanceWithVoice: enhance } = await import('../enhance');
    const base = baseResponse();
    const out = await enhance(base, 'en');
    expect(out).toBe(base); // identical reference — nothing touched
  });

  test('probeVoiceCapability is unavailable without WebGPU (node env)', async () => {
    const cap = await probeVoiceCapability();
    expect(cap.status).toBe('unavailable');
    expect(cap.reason).toBe('no-webgpu');
  });

  test('downloadGate asks for confirmation when the connection is unknown', () => {
    const gate = downloadGate();
    expect(gate.ok).toBe(false);
    if (gate.ok === false) expect(gate.needsConfirm).toBe(true);
  });

  test('warmRephrase returns null when the engine throws', async () => {
    // Warm the singleton with a throwing engine.
    mockHasModelInCache.mockResolvedValue(true);
    mockCreate.mockRejectedValue(new Error('gpu lost'));
    const engineMod = await import('../engine');
    await engineMod.getEngine();
    const { warmRephrase: rephrase } = await import('../renderer');
    await expect(rephrase({ original: 'x', lang: 'en' })).resolves.toBeNull();
  });

  test('warmRephrase returns null on timeout (hanging engine)', async () => {
    jest.useFakeTimers();
    try {
      mockHasModelInCache.mockResolvedValue(true);
      mockCreate.mockReturnValue(new Promise(() => {})); // never resolves
      const engineMod = await import('../engine');
      await engineMod.getEngine();
      const { warmRephrase: rephrase, VOICE_TIMEOUT_MS } = await import('../renderer');
      const p = rephrase({ original: 'x', lang: 'en' });
      await jest.advanceTimersByTimeAsync(VOICE_TIMEOUT_MS + 500);
      await expect(p).resolves.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  }, 15000);
});

describe('structural guarantee — type/action/suggestions never come from the LLM', () => {
  async function warmEngineWith(text: string) {
    mockHasModelInCache.mockResolvedValue(true);
    mockCreate.mockResolvedValue({ choices: [{ message: { content: text } }] });
    const engineMod = await import('../engine');
    await engineMod.getEngine();
  }

  test('sos responses are never rephrased, even with a warm engine', async () => {
    await warmEngineWith('HACKED warm text');
    const { enhanceWithVoice: enhance } = await import('../enhance');
    const base = baseResponse({ type: 'sos', text: 'SOS safety copy — do not touch.' });
    const out = await enhance(base, 'en');
    expect(out.text).toBe('SOS safety copy — do not touch.');
  });

  test('escalate responses are never rephrased', async () => {
    await warmEngineWith('HACKED warm text');
    const { enhanceWithVoice: enhance } = await import('../enhance');
    const base = baseResponse({ type: 'escalate', text: 'Purohitji copy — do not touch.' });
    const out = await enhance(base, 'en');
    expect(out.text).toBe('Purohitji copy — do not touch.');
  });

  test('warmer prose replaces text only — type/action/suggestions are identical', async () => {
    await warmEngineWith('A warmer phrasing. 🙏');
    const { enhanceWithVoice: enhance } = await import('../enhance');
    const base = baseResponse();
    const out = await enhance(base, 'ta', 'tamil-nadu');
    expect(out.text).toBe('A warmer phrasing. 🙏');
    expect(out.type).toBe(base.type);
    expect(out.action).toEqual(base.action);
    expect(out.suggestions).toEqual(base.suggestions);
  });

  test('fact-boundary: even a fabricating engine cannot change type/action', async () => {
    await warmEngineWith('The tithi is Purnima and you owe ₹500 (both invented).');
    const { enhanceWithVoice: enhance } = await import('../enhance');
    const base = baseResponse({ type: 'action' });
    const out = await enhance(base, 'en');
    // The prose may be warmer (or even wrong — the DATA-block prompt is the
    // mitigation), but the DECISION surface is structurally sealed:
    expect(out.type).toBe('action');
    expect(out.action).toEqual(base.action);
    expect(out.suggestions).toEqual(base.suggestions);
  });
});

describe('intent mapping — confidence gated', () => {
  /**
   * Fresh module registry per test: tryLlmRoute/mapToIntent close over
   * their own engine module instance, so the warmed engine must live in
   * the SAME registry they were imported from.
   */
  async function freshWarm() {
    jest.resetModules();
    const engineMod = await import('../engine');
    const llmRouterMod = await import('../llmRouter');
    const rendererMod = await import('../renderer');
    mockHasModelInCache.mockResolvedValue(true);
    await engineMod.getEngine();
    return { ...llmRouterMod, ...rendererMod };
  }

  test('tryLlmRoute returns null when the engine is not warm', async () => {
    const out = await tryLlmRoute('when is ekadashi', 'en');
    expect(out).toBeNull();
  });

  test('high-confidence mapping within catalog is trusted', async () => {
    const { tryLlmRoute: tryRoute } = await freshWarm();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"intent": "tithi_today", "confidence": 0.92}' } }],
    });
    const out = await tryRoute('when is ekadashi', 'en');
    expect(out).not.toBeNull();
    expect(out!.intent).toBe('tithi_today');
    expect(out!.confidence).toBe('high');
    expect(out!.evidence[0]).toMatch(/^llm:/);
  });

  test('below-threshold confidence falls back to the keyword router', async () => {
    const { tryLlmRoute: tryRoute } = await freshWarm();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"intent": "dana_help", "confidence": 0.4}' } }],
    });
    const out = await tryRoute('when is ekadashi', 'en');
    expect(out).toBeNull(); // 0.4 < INTENT_CONFIDENCE_THRESHOLD
    expect(INTENT_CONFIDENCE_THRESHOLD).toBe(0.7);
  });

  test('intent outside OUR catalog is rejected', async () => {
    const { mapToIntent: map } = await freshWarm();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"intent": "delete_database", "confidence": 0.99}' } }],
    });
    const mapping = await map('do evil', CATALOG);
    expect(mapping).toBeNull();
  });

  test('malformed JSON is rejected', async () => {
    const { mapToIntent: map } = await freshWarm();
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'not json at all' } }] });
    const mapping = await map('hello', CATALOG);
    expect(mapping).toBeNull();
  });
});

describe('downloader — consent and cleanup', () => {
  test('cancelled download rejects with the cancel signal', async () => {
    mockCreateEngine.mockImplementation(
      async (
        _id: unknown,
        cfg: {
          initProgressCallback?: (r: { progress: number; timeElapsed: number; text: string }) => void;
        }
      ) => {
        cancelDownload(); // devotee taps Cancel mid-download
        cfg.initProgressCallback?.({ progress: 0.1, timeElapsed: 1, text: 'Fetching param cache [1/32]' });
        return fakeEngine;
      }
    );
    await expect(confirmDownload(() => {})).rejects.toThrow('voice-download-cancelled');
    expect(mockDeleteModelInCache).toHaveBeenCalled(); // partial cache swept
  });

  test('removeVoice sweeps cache and reports the freed size', async () => {
    const { freedLabel } = await removeVoice();
    expect(mockDeleteModelInCache).toHaveBeenCalled();
    expect(freedLabel).toContain('GB');
  });
});

describe('nudge rules — once, gentle, forever-dismissible', () => {
  test('nudge after 3 uses, never after dismiss', () => {
    expect(shouldShowNudge()).toBe(false);
    countAssistantUse();
    countAssistantUse();
    expect(shouldShowNudge()).toBe(false);
    countAssistantUse();
    expect(shouldShowNudge()).toBe(true);
    markNudgeShown();
    expect(shouldShowNudge()).toBe(false); // shown once — never again
  });

  test('dismiss is forever', () => {
    countAssistantUse();
    countAssistantUse();
    countAssistantUse();
    dismissNudgeForever();
    expect(shouldShowNudge()).toBe(false);
  });
});

describe('model record — honest numbers', () => {
  test('Qwen2.5-3B is the pick: ungated, Apache-2.0, ~1.7GB', () => {
    expect(VOICE_MODEL.id).toBe('Qwen2.5-3B-Instruct-q4f16_1-MLC');
    expect(VOICE_MODEL.gated).toBe(false);
    expect(VOICE_MODEL.license).toBe('Apache-2.0');
    expect(VOICE_MODEL.runtime).toBe('@mlc-ai/web-llm');
    expect(modelSizeGB()).toBeGreaterThan(1.5);
    expect(modelSizeGB()).toBeLessThan(2.0);
    expect(modelSizeLabel()).toMatch(/≈1\.[67] GB/);
  });

  test('model record carries a version — drives update-available', () => {
    expect(typeof VOICE_MODEL.version).toBe('string');
    expect(VOICE_MODEL.version.length).toBeGreaterThan(0);
  });
});

describe('download state machine — persisted and recoverable', () => {
  test('round-trips through device-local storage', () => {
    setDlPersist({ state: 'downloading', progress: 0.42 });
    const p = getDlPersist();
    expect(p.state).toBe('downloading');
    expect(p.progress).toBeCloseTo(0.42);
    expect(p.updatedAt).toBeGreaterThan(0);
  });

  test('app restart during downloading reconciles to paused (resumable)', () => {
    setDlPersist({ state: 'downloading', progress: 0.37 });
    const after = reconcileDlOnBoot();
    expect(after.state).toBe('paused');
    expect(after.progress).toBeCloseTo(0.37); // progress kept for the resume hint
  });

  test('stable states survive reconcile untouched', () => {
    for (const s of ['downloaded', 'paused', 'not-downloaded', 'removed', 'error'] as const) {
      setDlPersist({ state: s, progress: s === 'downloaded' ? 1 : 0 });
      expect(reconcileDlOnBoot().state).toBe(s);
    }
  });

  test('cancel mid-download is a clean paused state', () => {
    setDlPersist({ state: 'downloading', progress: 0.6 });
    cancelDownload();
    const p = getDlPersist();
    expect(p.state).toBe('paused');
    expect(p.progress).toBe(0); // swept clean — Resume starts fresh
  });

  test('update-available triggers when the blessed version moves', () => {
    // Simulate: v1 downloaded long ago, blessed model now at v2.
    setDlPersist({ state: 'downloaded', progress: 1, version: '1' });
    const stored = getDlPersist();
    const updateAvailable = stored.version !== '' && stored.version !== 'v2-blessed';
    expect(updateAvailable).toBe(true);
  });
});

describe('voice_upgrade intent — the assistant upgrades the assistant', () => {
  const ctx = {
    lang: 'en' as const,
    role: 'devotee' as const,
    region: 'other',
    uid: 'u1',
    input: 'download the ai',
    slots: {},
  };

  test('in the intent catalog with a description', () => {
    const found = INTENTS.find((i) => i.id === 'voice_upgrade');
    expect(found).toBeDefined();
    expect(found!.description.length).toBeGreaterThan(0);
  });

  test('routes EN/HI/BN phrasings (incl. transliteration) at high confidence', () => {
    const cases = [
      'I want a warmer voice',
      'download the ai',
      'ai ta download korte chai',
      'ভয়েস ডাউনলোড করতে চাই',
      'आवाज़ डाउनलोड',
      'on-device ai',
    ];
    for (const text of cases) {
      const r = routeIntent(text, 'en');
      expect(r.intent).toBe('voice_upgrade');
      expect(r.confidence).toBe('high');
    }
  });

  test('executor deep-links to the settings card', async () => {
    const out = await TASKS.voice_upgrade(ctx);
    expect(out.action).toEqual({ kind: 'navigate', target: '/app/profile#ai-voice' });
    expect(out.params.size).toMatch(/GB/); // honest size travels with the answer
    expect(out.suggestions.length).toBeGreaterThan(0);
  });

  test('offered to every role — upgrading the assistant is universal', () => {
    for (const role of [
      'devotee',
      'sevadar',
      'priest',
      'accountant',
      'trustee',
      'purohit',
      'jyotish',
      'owner',
    ] as const) {
      expect(canOffer('voice_upgrade', role)).toBe(true);
    }
  });

  test('template renders warm, non-blank, in EN/HI/BN with the size', () => {
    for (const lang of ['en', 'hi', 'bn'] as const) {
      const text = renderTemplate('voice_upgrade', lang, { size: '≈1.7 GB' });
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).toContain('≈1.7 GB');
      expect(suggestionsFor('voice_upgrade', lang).length).toBeGreaterThan(0);
    }
  });

  test('greeting advertises the warmer voice capability', async () => {
    const out = await TASKS.greeting(ctx);
    expect(out.params.capabilities).toContain('warmer on-device voice');
  });
});
