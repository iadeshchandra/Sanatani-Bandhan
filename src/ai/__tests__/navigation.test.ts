/**
 * Sanatani Bandhan — AI Assistant Phase 3 · Navigation brain tests
 * =====================================================================
 * Covers: corpus integrity (30+ entries, valid routes, EN/HI/BN),
 * matcher (EN/HI/BN queries, confidence thresholds), isWhereQuestion,
 * router integration (where-interrogatives beat procedural intents),
 * executor (deep-link actions, SOS has no action), and end-to-end ask().
 */
import { ask } from '../assistant';
import { routeIntent } from '../intents';
import {
  matchNavigation,
  isNavigable,
  isWhereQuestion,
  getNavigationEntry,
  navigationCorpusSize,
} from '../navigation';
import { NAVIGATION_CORPUS } from '../corpus/navigation';
import { navigationQuestionTask } from '../tasks/navigation';
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

/* Routes that exist in App.tsx / SoloWorkspaceShell.tsx. */
const KNOWN_ROUTES = new Set([
  '/app/home',
  '/app/home/panjika',
  '/app/orgs',
  '/app/suchana',
  '/app/profile',
  '/seva/journeys',
  '/contact',
  '/get-app',
]);

describe('corpus integrity', () => {
  test('has 30+ entries', () => {
    expect(navigationCorpusSize()).toBeGreaterThanOrEqual(30);
    expect(NAVIGATION_CORPUS.length).toBeGreaterThanOrEqual(30);
  });

  test('every entry has en/hi/bn answers and non-empty patterns', () => {
    for (const e of NAVIGATION_CORPUS) {
      expect(e.id).toBeTruthy();
      expect(e.patterns.length).toBeGreaterThan(0);
      expect(e.answer.en).toBeTruthy();
      expect(e.answer.hi).toBeTruthy();
      expect(e.answer.bn).toBeTruthy();
      expect(e.target.route).toBeTruthy();
    }
  });

  test('every route exists in the app router', () => {
    for (const e of NAVIGATION_CORPUS) {
      expect(KNOWN_ROUTES.has(e.target.route)).toBe(true);
    }
  });

  test('entry ids are unique', () => {
    const ids = NAVIGATION_CORPUS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('getNavigationEntry resolves by id', () => {
    expect(getNavigationEntry('nav.giving')?.target.route).toBe('/app/profile');
    expect(getNavigationEntry('nav.sos')?.target.section).toBe('SOS button');
    expect(getNavigationEntry('nope')).toBeUndefined();
  });
});

describe('isWhereQuestion', () => {
  test('detects EN interrogatives', () => {
    expect(isWhereQuestion('where is my wallet?')).toBe(true);
    expect(isWhereQuestion("where's the donation section")).toBe(true);
    expect(isWhereQuestion('how do i find group chats')).toBe(true);
    expect(isWhereQuestion('where can i find the tirtha diary')).toBe(true);
  });

  test('detects BN interrogatives', () => {
    expect(isWhereQuestion('দান বিভাগ কোথায়?')).toBe(true);
    expect(isWhereQuestion('আমার ওয়ালেট কোথায়?')).toBe(true);
  });

  test('detects HI interrogatives', () => {
    expect(isWhereQuestion('मेरा वॉलेट कहाँ है?')).toBe(true);
    expect(isWhereQuestion('दान विभाग कहां है?')).toBe(true);
  });

  test('rejects non-interrogatives', () => {
    expect(isWhereQuestion('how do i donate?')).toBe(false);
    expect(isWhereQuestion('tell me about karma')).toBe(false);
    expect(isWhereQuestion('')).toBe(false);
  });
});

describe('matchNavigation', () => {
  test('matches EN "where is the donation section"', () => {
    const m = matchNavigation('where is the donation section?');
    expect(m?.entry.id).toBe('nav.giving');
    expect(isNavigable(m)).toBe(true);
  });

  test('matches BN "দান বিভাগ কোথায়?"', () => {
    const m = matchNavigation('দান বিভাগ কোথায়?');
    expect(m?.entry.id).toBe('nav.giving');
    expect(isNavigable(m)).toBe(true);
  });

  test('matches HI "मेरा वॉलेट कहाँ है?"', () => {
    const m = matchNavigation('मेरा वॉलेट कहाँ है?');
    expect(m?.entry.id).toBe('nav.wallet.seva');
  });

  test('matches group chats query', () => {
    const m = matchNavigation('where are group chats?');
    expect(m?.entry.id).toBe('nav.groups');
  });

  test('matches tirtha diary query', () => {
    const m = matchNavigation('where is my tirtha diary?');
    expect(m?.entry.id).toBe('nav.tirtha');
  });

  test('returns null for dharma topics (no app location)', () => {
    expect(matchNavigation('where is Ekadashi celebrated?')).toBeNull();
  });

  test('returns null for empty input', () => {
    expect(matchNavigation('')).toBeNull();
  });
});

describe('router integration', () => {
  test('"দান বিভাগ কোথায়?" routes to navigation_question, not dana_help', () => {
    const r = routeIntent('দান বিভাগ কোথায়?', 'bn');
    expect(r.intent).toBe('navigation_question');
    expect(r.slots['entryId']).toBe('nav.giving');
  });

  test('"where is my wallet?" routes to navigation_question', () => {
    const r = routeIntent('where is my wallet?', 'en');
    expect(r.intent).toBe('navigation_question');
    expect(r.slots['entryId']).toBe('nav.wallet.seva');
  });

  test('"how do i donate?" still routes to dana_help (procedural)', () => {
    const r = routeIntent('how do i donate?', 'en');
    expect(r.intent).toBe('dana_help');
  });

  test('"where is Ekadashi celebrated?" falls through to dharma', () => {
    const r = routeIntent('where is Ekadashi celebrated?', 'en');
    // Not navigation (no app location for Ekadashi) → dharma corpus
    expect(r.intent).not.toBe('navigation_question');
  });
});

describe('navigationQuestionTask', () => {
  function taskCtx(input: string, lang: 'en' | 'hi' | 'bn', slots: Record<string, string> = {}): TaskCtx {
    return { uid: 't', lang, role: 'devotee', input, slots };
  }

  test('returns answer + navigate action for giving', () => {
    const out = navigationQuestionTask(taskCtx('দান বিভাগ কোথায়?', 'bn', { entryId: 'nav.giving' }));
    expect(out.variant).toBe('answer');
    expect(out.action?.kind).toBe('navigate');
    expect(out.action?.target).toBe('/app/profile');
  });

  test('SOS entry has no navigate action (button is always visible)', () => {
    const out = navigationQuestionTask(taskCtx('where is sos?', 'en', { entryId: 'nav.sos' }));
    expect(out.variant).toBe('answer');
    expect(out.action).toBeUndefined();
  });

  test('weak match returns clarify, never a guessed destination', () => {
    const out = navigationQuestionTask(taskCtx('where is the thing?', 'en', {}));
    expect(out.variant).toBe('clarify');
    expect(out.action).toBeUndefined();
  });
});

describe('templates', () => {
  test('navigation_question answer renders the corpus answer', () => {
    const text = renderTemplate('navigation_question', 'bn', { answer: 'পরীক্ষা' }, 'answer', 'other');
    expect(text).toContain('পরীক্ষা');
  });

  test('navigation_question clarify is warm in all langs', () => {
    for (const lang of ['en', 'hi', 'bn'] as const) {
      const text = renderTemplate('navigation_question', lang, {}, 'clarify', 'other');
      expect(text).toContain('🙏');
    }
  });

  test('suggestionsFor returns navigation chips', () => {
    const s = suggestionsFor('navigation_question', 'en');
    expect(s.length).toBeGreaterThan(0);
  });
});

describe('end-to-end ask()', () => {
  test('ask("দান বিভাগ কোথায়?") answers with location + deep-link', async () => {
    const res = await ask('দান বিভাগ কোথায়?', bnDevotee);
    expect(res.action?.kind).toBe('navigate');
    expect(res.action?.target).toBe('/app/profile');
    expect(res.text).toContain('প্রোফাইল');
  });

  test('ask("where is my wallet?") navigates to profile', async () => {
    const res = await ask('where is my wallet?', devotee);
    expect(res.action?.kind).toBe('navigate');
    expect(res.action?.target).toBe('/app/profile');
  });

  test('ask("how do i donate?") still opens dana guidance, not navigation', async () => {
    const res = await ask('how do i donate?', devotee);
    // dana_help opens the express dana sheet, not a profile deep-link
    expect(res.action?.kind).not.toBe('navigate');
  });
});
