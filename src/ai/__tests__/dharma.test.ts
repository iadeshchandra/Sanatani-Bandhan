/**
 * Sanatani Bandhan — AI Assistant Phase 2 · Dharma Q&A tests
 * =====================================================================
 * Covers: corpus integrity, matcher (EN/HI/BN), confidence thresholds,
 * purohit escalation, router integration, end-to-end ask() flow, and
 * the crisis-bypass invariant.
 */
import { ask } from '../assistant';
import { routeIntent } from '../intents';
import { matchDharma, isAnswerable, getDharmaEntry } from '../dharma';
import { DHARMA_CORPUS, DHARMA_BY_ID, corpusStats } from '../corpus/index';
import { dharmaQuestionTask } from '../tasks/dharma_question';
import { renderTemplate, suggestionsFor } from '../templates';
import type { AssistantCtx, TaskCtx } from '../types';

/* In-memory localStorage for executors that may touch it (node env). */
const memStore: Record<string, string> = {};
(global as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (k in memStore ? memStore[k] : null),
  setItem: (k: string, v: string) => { memStore[k] = v; },
  removeItem: (k: string) => { delete memStore[k]; },
};

const devotee: AssistantCtx = { uid: 'test-devotee', lang: 'en', role: 'devotee' };
const hiDevotee: AssistantCtx = { uid: 'test-devotee', lang: 'hi', role: 'devotee' };
const bnDevotee: AssistantCtx = { uid: 'test-devotee', lang: 'bn', role: 'devotee' };

describe('corpus integrity', () => {
  test('has 40+ entries across all required topics', () => {
    expect(DHARMA_CORPUS.length).toBeGreaterThanOrEqual(40);
  });

  test('covers all six topics', () => {
    const stats = corpusStats();
    for (const topic of ['tithi', 'festival', 'practice', 'samskara', 'concept', 'etiquette']) {
      expect(stats[topic]).toBeGreaterThanOrEqual(4);
    }
  });

  test('every entry has en/hi/bn answers, patterns, and valid related ids', () => {
    for (const e of DHARMA_CORPUS) {
      expect(e.id).toBeTruthy();
      expect(e.question_patterns.length).toBeGreaterThan(0);
      expect(e.answer.en.trim().length).toBeGreaterThan(20);
      expect(e.answer.hi.trim().length).toBeGreaterThan(20);
      expect(e.answer.bn.trim().length).toBeGreaterThan(20);
      for (const rid of e.related) {
        expect(DHARMA_BY_ID.has(rid)).toBe(true);
      }
    }
  });

  test('entry ids are unique', () => {
    const ids = DHARMA_CORPUS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('escalation-flagged entries exist (sensitive topics)', () => {
    const flagged = DHARMA_CORPUS.filter((e) => e.purohit_escalation);
    expect(flagged.length).toBeGreaterThan(0);
    // Personal ritual guidance must escalate.
    expect(getDharmaEntry('practice.sandhya')?.purohit_escalation).toBe(true);
    expect(getDharmaEntry('samskara.vivaha')?.purohit_escalation).toBe(true);
  });
});

describe('dharma matcher — English', () => {
  test('matches "What is Ekadashi?" with high confidence', () => {
    const m = matchDharma('What is Ekadashi?');
    expect(m).not.toBeNull();
    expect(m!.entry.id).toBe('tithi.ekadashi');
    expect(m!.confidence).toBe('high');
  });

  test('matches "When is Diwali?" to the Diwali entry', () => {
    const m = matchDharma('When is Diwali?');
    expect(m).not.toBeNull();
    expect(m!.entry.id).toBe('festival.diwali');
  });

  test('matches "How to do morning puja?" to basic puja', () => {
    const m = matchDharma('How to do morning puja?');
    expect(m).not.toBeNull();
    expect(m!.entry.id).toBe('practice.basic_puja');
  });

  test('matches "what is karma" to the karma concept', () => {
    const m = matchDharma('what is karma');
    expect(m).not.toBeNull();
    expect(m!.entry.id).toBe('concept.karma');
  });

  test('matches transliterated "ekadashi vrat"', () => {
    const m = matchDharma('ekadashi vrat kaise kare');
    expect(m).not.toBeNull();
    expect(m!.entry.id).toBe('tithi.ekadashi');
  });
});

describe('dharma matcher — Hindi & Bengali', () => {
  test('matches "एकादशी क्या है?" (HI)', () => {
    const m = matchDharma('एकादशी क्या है?');
    expect(m).not.toBeNull();
    expect(m!.entry.id).toBe('tithi.ekadashi');
  });

  test('matches "একাদশী কী?" (BN)', () => {
    const m = matchDharma('একাদশী কী?');
    expect(m).not.toBeNull();
    expect(m!.entry.id).toBe('tithi.ekadashi');
  });

  test('matches "দীপাবলি কবে?" (BN) to Diwali', () => {
    const m = matchDharma('দীপাবলি কবে?');
    expect(m).not.toBeNull();
    expect(m!.entry.id).toBe('festival.diwali');
  });

  test('matches "धर्म क्या है" (HI) to dharma concept', () => {
    const m = matchDharma('धर्म क्या है');
    expect(m).not.toBeNull();
    expect(m!.entry.id).toBe('concept.dharma');
  });
});

describe('dharma matcher — confidence & escalation', () => {
  test('returns null for gibberish (never invents)', () => {
    expect(matchDharma('xyzzy plugh frobnicator')).toBeNull();
    expect(matchDharma('')).toBeNull();
  });

  test('returns null for a single weak keyword below the bar', () => {
    // "moon" alone is too weak to answer on.
    expect(matchDharma('moon')).toBeNull();
  });

  test('isAnswerable is false for escalation-flagged entries', () => {
    const m = matchDharma('what is sandhya vandanam');
    expect(m).not.toBeNull();
    expect(m!.entry.id).toBe('practice.sandhya');
    expect(isAnswerable(m)).toBe(false);
  });

  test('isAnswerable is true for confident, non-flagged entries', () => {
    const m = matchDharma('what is Ekadashi?');
    expect(isAnswerable(m)).toBe(true);
  });

  test('low-confidence matches are not answerable', () => {
    const m = matchDharma('tell me about fasting days');
    // Either null or low confidence — never answerable on a guess.
    if (m) expect(isAnswerable(m)).toBe(false);
  });
});

describe('router integration', () => {
  test('routes "What is Ekadashi?" to dharma_question', () => {
    const r = routeIntent('What is Ekadashi?', 'en');
    expect(r.intent).toBe('dharma_question');
    expect(r.slots['entryId']).toBe('tithi.ekadashi');
  });

  test('routes "একাদশী কী?" (BN) to dharma_question', () => {
    const r = routeIntent('একাদশী কী?', 'bn');
    expect(r.intent).toBe('dharma_question');
  });

  test('specific intents keep priority over dharma (tithi_today wins)', () => {
    const r = routeIntent("what is today's tithi?", 'en');
    expect(r.intent).toBe('tithi_today');
  });

  test('unmatched input still falls to fallback_unknown', () => {
    const r = routeIntent('xyzzy plugh frobnicator', 'en');
    expect(r.intent).toBe('fallback_unknown');
  });
});

describe('dharma task', () => {
  const taskCtx = (input: string, lang = 'en'): TaskCtx => ({
    uid: 'test-devotee',
    lang,
    role: 'devotee',
    input,
    slots: {},
  });

  test('answers confidently in English', () => {
    const out = dharmaQuestionTask(taskCtx('What is Ekadashi?'));
    expect(out.variant).toBe('answer');
    expect(out.params['answer']).toContain('Ekadashi');
  });

  test('answers in Bengali when asked in Bengali', () => {
    const out = dharmaQuestionTask(taskCtx('একাদশী কী?', 'bn'));
    expect(out.variant).toBe('answer');
    // Bengali answer text (not the English one).
    expect(out.params['answer']).not.toContain('Ekadashi is the 11th');
  });

  test('escalates sensitive topics to Purohitji with a deep link', () => {
    const out = dharmaQuestionTask(taskCtx('teach me sandhya vandanam step by step'));
    expect(out.variant).toBe('escalate');
    expect(out.action?.target).toBe('/seva/pro');
  });

  test('escalates unknown questions instead of inventing', () => {
    const out = dharmaQuestionTask(taskCtx('xyzzy plugh frobnicator'));
    expect(out.variant).toBe('escalate');
  });
});

describe('end-to-end ask() — dharma flow', () => {
  test('ask("What is karma?") returns a corpus answer', async () => {
    const res = await ask('What is karma?', devotee);
    expect(res.type).toBe('answer');
    expect(res.text).toContain('Karma');
  });

  test('ask in Bengali returns the Bengali answer', async () => {
    const res = await ask('একাদশী কী?', bnDevotee);
    expect(res.type).toBe('answer');
    // Bengali script present, English fallback absent.
    expect(/[\u0980-\u09FF]/.test(res.text)).toBe(true);
  });

  test('ask in Hindi returns the Hindi answer', async () => {
    const res = await ask('एकादशी क्या है?', hiDevotee);
    expect(res.type).toBe('answer');
    expect(/[\u0900-\u097F]/.test(res.text)).toBe(true);
  });

  test('sensitive question escalates with type "escalate"', async () => {
    const res = await ask('how do I perform my wedding ceremony step by step', devotee);
    expect(res.type).toBe('escalate');
    expect(res.action?.target).toBe('/seva/pro');
  });

  test('crisis keywords still bypass everything (invariant)', async () => {
    const res = await ask('I want to hurt myself, what is karma?', devotee);
    expect(res.type).toBe('sos');
  });

  test('dharma templates never render blank (fallback chain)', () => {
    const t1 = renderTemplate('dharma_question', 'en', { answer: 'test' }, 'answer');
    expect(t1.trim().length).toBeGreaterThan(0);
    const t2 = renderTemplate('dharma_question', 'ta', {}, 'escalate');
    expect(t2.trim().length).toBeGreaterThan(0);
    const sug = suggestionsFor('dharma_question', 'bn');
    expect(sug.length).toBeGreaterThan(0);
  });
});
