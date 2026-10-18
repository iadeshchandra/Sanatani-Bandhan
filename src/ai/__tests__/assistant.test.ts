/**
 * Sanatani Bandhan — AI Assistant Phase 0 · jest tests
 * =====================================================================
 * Covers: router phrasings (EN/HI/BN), crisis → sos, dharma fallback,
 * role gate, and the template fallback chain (never blank, 10 langs).
 */
import { ask } from '../assistant';
import { routeIntent, detectDharmaQuery, INTENTS } from '../intents';
import { detectCrisis, crisisKeywordCount } from '../crisisKeywords';
import { canOffer, allowedGuides } from '../rbac';
import { renderTemplate, suggestionsFor, ASSISTANT_TEMPLATE_KEYS } from '../templates';
import type { AssistantCtx, IntentId } from '../types';

/* In-memory localStorage for the sadhana_summary executor (node env). */
const memStore: Record<string, string> = {};
(global as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (k in memStore ? memStore[k] : null),
  setItem: (k: string, v: string) => { memStore[k] = v; },
  removeItem: (k: string) => { delete memStore[k]; },
};

const devotee: AssistantCtx = { uid: 'test-devotee', lang: 'en', role: 'devotee' };
const bnDevotee: AssistantCtx = { uid: 'test-devotee', lang: 'bn', role: 'devotee' };
const hiDevotee: AssistantCtx = { uid: 'test-devotee', lang: 'hi', role: 'devotee' };

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
function yesterdayISO(): string {
  const d = new Date(Date.now() - 86400000);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

describe('intent router — sample phrasings', () => {
  const cases: Array<[string, IntentId]> = [
    ['What tithi is today?', 'tithi_today'],
    ['আজ তিথি কি?', 'tithi_today'],
    ['आज तिथि क्या है?', 'tithi_today'],
    ['namaste, what is today\'s tithi?', 'tithi_today'],
    ['when is the next festival', 'festival_next'],
    ['আগামী উৎসব কবে?', 'festival_next'],
    ['when is ekadashi', 'festival_next'],
    ['how to donate', 'dana_help'],
    ['আমি দান করতে চাই', 'dana_help'],
    ['मुझे दान करना है', 'dana_help'],
    ['my japa summary', 'sadhana_summary'],
    ['how is my sadhana?', 'sadhana_summary'],
    ['book a purohit for the wedding', 'booking_help'],
    ['I need a pandit appointment', 'booking_help'],
    ['change language to hindi', 'language_help'],
    ['ভাষা বদলাতে চাই', 'language_help'],
    ['what is sos', 'sos_help'],
    ['how does the panic button work', 'sos_help'],
    ['namaste', 'greeting'],
    ['নমস্কার', 'greeting'],
    ['jai shri ram', 'greeting'],
    ['open my profile', 'navigate'],
    ['take me to suchana', 'navigate'],
    ['হোম খোলো', 'navigate'],
    ['how do I use the panjika', 'howto'],
    ['guide to wallet', 'howto'],
    ['পঞ্জিকা কীভাবে ব্যবহার করব', 'howto'],
    ['asdfghjkl random words', 'fallback_unknown'],
  ];
  for (const [input, intent] of cases) {
    it(`routes "${input}" → ${intent}`, () => {
      expect(routeIntent(input, 'en').intent).toBe(intent);
    });
  }

  it('captures navigate destination slot', () => {
    const r = routeIntent('open my profile', 'en');
    expect(r.intent).toBe('navigate');
    expect(r.slots['destination']).toBe('/app/profile');
  });

  it('captures howto guide slot', () => {
    const r = routeIntent('how do I use the panjika?', 'en');
    expect(r.intent).toBe('howto');
    expect(r.slots['guideId']).toBe('panjika');
  });

  it('captures ekadashi slot on festival_next', () => {
    const r = routeIntent('when is the next ekadashi?', 'en');
    expect(r.intent).toBe('festival_next');
    expect(r.slots['festivalQuery']).toBe('ekadashi');
  });
});

describe('crisis keywords → sos', () => {
  it('detects EN crisis phrasings', () => {
    expect(detectCrisis('I want to kill myself')).toBeTruthy();
    expect(detectCrisis('this is an emergency, help me')).toBeTruthy();
  });
  it('detects HI crisis phrasings', () => {
    expect(detectCrisis('मुझे बचाओ, खतरे में हूँ')).toBeTruthy();
  });
  it('detects BN crisis phrasings', () => {
    expect(detectCrisis('বাঁচান আমাকে')).toBeTruthy();
  });
  it('does not treat "what is sos" as a crisis', () => {
    expect(detectCrisis('what is sos')).toBeNull();
  });
  it('does not fire on ordinary questions', () => {
    expect(detectCrisis("what tithi is today?")).toBeNull();
    expect(detectCrisis('how do I give dana?')).toBeNull();
  });
  it('crisis keyword lists are non-empty per language', () => {
    const c = crisisKeywordCount();
    expect(c.en).toBeGreaterThan(5);
    expect(c.hi).toBeGreaterThan(5);
    expect(c.bn).toBeGreaterThan(5);
  });

  it('ask(): crisis beats the router ("help me with dana" → sos)', async () => {
    const res = await ask('help me with dana', devotee);
    expect(res.type).toBe('sos');
    expect(res.text.length).toBeGreaterThan(20);
  });
  it('ask(): BN crisis → sos with BN text', async () => {
    const res = await ask('বাঁচান আমাকে', bnDevotee);
    expect(res.type).toBe('sos');
    expect(res.text).toContain('SOS');
  });
});

describe('dharma law — never improvise', () => {
  it('detects dharma questions', () => {
    expect(detectDharmaQuery('What does the Gita say about karma?')).toBe(true);
    expect(detectDharmaQuery('Is it a sin to eat meat on Tuesday?')).toBe(true);
    expect(detectDharmaQuery('shubh muhurat for griha pravesh')).toBe(true);
  });
  it('does not misfire on app questions', () => {
    expect(detectDharmaQuery("what tithi is today?")).toBe(false);
    expect(detectDharmaQuery('how do I give dana?')).toBe(false);
  });
  it('ask(): dharma question → escalate with Purohitji path', async () => {
    const res = await ask('What does the Gita say about karma?', devotee);
    expect(res.type).toBe('escalate');
    expect(res.text).toContain('Purohitji');
    expect(res.action?.kind).toBe('navigate');
  });
  it('ask(): unknown question → clarify with capability menu', async () => {
    const res = await ask('what is the weather in Dhaka', devotee);
    expect(res.type).toBe('clarify');
    expect(res.text.length).toBeGreaterThan(20);
    expect(res.suggestions && res.suggestions.length).toBeGreaterThan(0);
  });
});

describe('RBAC gate', () => {
  it('devotee is offered howto, but never treasury guidance', () => {
    expect(canOffer('howto', 'devotee')).toBe(true);
    expect(canOffer('howto', 'devotee', 'treasury')).toBe(false);
    expect(allowedGuides('devotee')).not.toContain('treasury');
  });
  it('trustee may be offered treasury guidance', () => {
    expect(canOffer('howto', 'trustee', 'treasury')).toBe(true);
  });
  it('ask(): devotee asking about treasury → warm role-denied clarify', async () => {
    const res = await ask('how do I use the treasury module', devotee);
    expect(res.type).toBe('clarify');
    expect(res.text.length).toBeGreaterThan(20);
    expect(res.action).toBeUndefined();
  });
  it('ask(): devotee asking about panjika → openGuide action', async () => {
    const res = await ask('how do I use the panjika', devotee);
    expect(res.type).toBe('action');
    expect(res.action).toEqual({ kind: 'openGuide', target: 'panjika' });
  });
});

describe('executors answer from app data', () => {
  it('tithi_today renders a real tithi', async () => {
    const res = await ask("what's today's tithi?", devotee);
    expect(res.type).toBe('answer');
    expect(res.text.toLowerCase()).toContain('tithi');
  });
  it('festival_next lists upcoming festivals', async () => {
    const res = await ask('when is the next festival?', devotee);
    expect(res.type).toBe('answer');
    expect(res.text.length).toBeGreaterThan(20);
  });
  it('festival_next answers ekadashi from Drik computation', async () => {
    const res = await ask('when is ekadashi?', devotee);
    expect(res.type).toBe('answer');
    expect(res.text.toLowerCase()).toContain('ekadashi');
  });
  it('dana_help offers the express dana sheet', async () => {
    const res = await ask('how do I donate?', devotee);
    expect(res.type).toBe('action');
    expect(res.action).toEqual({ kind: 'openSheet', target: 'express-dana' });
  });
  it('booking_help navigates to Seva Journeys', async () => {
    const res = await ask('book a purohit', devotee);
    expect(res.type).toBe('action');
    expect(res.action).toEqual({ kind: 'navigate', target: '/seva/journeys' });
  });
  it('sadhana_summary reads the devotee\'s own journal', async () => {
    memStore['sb_solo_personal_test-devotee'] = JSON.stringify({
      japa: [
        { id: 'j1', date: todayISO(), count: 108 },
        { id: 'j2', date: yesterdayISO(), count: 108 },
      ],
      vrata: [{ id: 'v1' }],
      sankalpa: [],
    });
    const res = await ask('how is my sadhana?', devotee);
    expect(res.type).toBe('answer');
    expect(res.text).toContain('108');
    expect(res.text).toContain('2');
  });
  it('sadhana_summary is warm when the journal is blank', async () => {
    delete memStore['sb_solo_personal_test-devotee'];
    const res = await ask('my sadhana summary', devotee);
    expect(res.type).toBe('answer');
    expect(res.text.length).toBeGreaterThan(20);
  });
  it('greeting introduces capabilities', async () => {
    const res = await ask('namaste', hiDevotee);
    expect(res.type).toBe('answer');
    expect(res.text.length).toBeGreaterThan(20);
    expect(res.suggestions && res.suggestions.length).toBeGreaterThan(0);
  });
  it('empty input → gentle clarify', async () => {
    const res = await ask('   ', devotee);
    expect(res.type).toBe('clarify');
    expect(res.text.length).toBeGreaterThan(0);
  });
});

describe('template fallback chain — never blank', () => {
  const langs = ['en', 'hi', 'bn', 'sa', 'ta', 'te', 'mr', 'gu', 'kn', 'ml'];
  const keys: Array<{ key: Parameters<typeof renderTemplate>[0]; variant?: string; params?: Record<string, string | number> }> = [
    { key: 'navigate', variant: 'destination', params: { destLabel: 'Profile' } },
    { key: 'navigate', variant: 'clarify', params: { places: '• Home' } },
    { key: 'howto', variant: 'guide', params: { guideName: 'Panjika', whatItIs: 'x', steps: '1. y', tips: '• z' } },
    { key: 'howto', variant: 'clarify', params: { guides: '• Panjika' } },
    { key: 'tithi_today', params: { tithiName: 'Ekadashi', paksha: 'Shukla', tithiNumber: 11, ordinal: 'th' } },
    { key: 'festival_next', variant: 'list', params: { list: '• 2026-10-20 — Test' } },
    { key: 'festival_next', variant: 'ekadashi', params: { date: '2026-10-25', name: 'Test Ekadashi' } },
    { key: 'festival_next', variant: 'none' },
    { key: 'dana_help' },
    { key: 'sadhana_summary', variant: 'summary', params: { japaToday: 108, streak: 2, vrataCount: 1, sankalpaCount: 0 } },
    { key: 'sadhana_summary', variant: 'empty' },
    { key: 'booking_help' },
    { key: 'language_help' },
    { key: 'sos_help' },
    { key: 'greeting' },
    { key: 'fallback_unknown', variant: 'unknown', params: { capabilities: '• tithi' } },
    { key: 'fallback_unknown', variant: 'dharma' },
    { key: 'crisis' },
    { key: 'role_denied', params: { area: 'treasury' } },
    { key: 'empty_input' },
  ];
  for (const { key, variant, params } of keys) {
    for (const lang of langs) {
      it(`${key}${variant ? '/' + variant : ''} renders non-blank in ${lang}`, () => {
        const out = renderTemplate(key, lang, params || {}, variant);
        expect(out.trim().length).toBeGreaterThan(0);
        expect(out).not.toContain('undefined');
      });
    }
  }
  it('suggestions exist for every intent in en/hi/bn', () => {
    for (const def of INTENTS) {
      for (const lang of ['en', 'hi', 'bn']) {
        const s = suggestionsFor(def.id, lang);
        expect(s.length).toBeGreaterThan(0);
      }
    }
  });
  it('translation pipeline key registry is documented', () => {
    expect(ASSISTANT_TEMPLATE_KEYS.length).toBeGreaterThan(10);
    expect(ASSISTANT_TEMPLATE_KEYS).toContain('assistant.tithi_today');
  });
});
