/**
 * Feature locator (micro-batch, 2026-10-22) — the Copilot learns
 * where features live.
 * =====================================================================
 * Origin: the live production walk of 2026-10-22 — in the 🧪 Audit
 * Mandir org, "Where is the Bahi-Khata desk for paper-register
 * digitisation?" answered "beyond what I've been taught". These
 * tests pin the fix: the exact failing question (verbatim), the
 * locator map's integrity against the catalog, en/hi/bn routing,
 * the RBAC honesty law (scope decides the deep-link, never the
 * words), ambiguity → ONE clarifying question, and the isolation
 * law (no GodMode/platform location can ever be spoken).
 *
 * Everything runs against the REAL pipeline (ask()) with in-memory
 * ports, the Blueprint C construction — no pipeline mocking.
 */

import { ask } from '../assistant';
import { routeIntent } from '../intents';
import { canOffer } from '../rbac';
import { scanSurface } from '../surfaceGuard';
import { renderTemplate, suggestionsFor } from '../templates';
import {
  LOCATOR_MAP,
  canOpenEntry,
  getLocatorEntry,
  isLocatable,
  isLocatorQuestion,
  locatorMapSize,
  matchLocator,
} from '../locator';
import { orgLocatorTask } from '../tasks/org_locator';
import {
  createMemoryPort,
  type CallerScope,
  type OrgAssistantContext,
} from '../org/port';
import type { AssistantCtx, Role, TaskCtx } from '../types';

/* ------------------------------------------------------------------ */
/* Scope fixtures — the Blueprint C construction                       */
/* ------------------------------------------------------------------ */

function scopeFor(
  role: Role,
  workspaceRole: string,
  extra?: Partial<CallerScope>
): CallerScope {
  return {
    uid: 'u1',
    workspaceId: 'WS-TEST-1',
    workspaceName: 'Test Mandir',
    role,
    workspaceRole,
    templateId: null,
    deskScope: null,
    actorName: 'Test User',
    ...extra,
  };
}

function ctxFor(scope: CallerScope, lang = 'en'): AssistantCtx {
  const org: OrgAssistantContext = { scope, port: createMemoryPort(scope, {}) };
  return { uid: scope.uid, lang, role: scope.role, org };
}

const trustee = scopeFor('trustee', 'Trustee');
const accountant = scopeFor('accountant', 'Accountant');
const auditor = scopeFor('auditor', 'Auditor');
const priest = scopeFor('priest', 'Priest');
const sevadar = scopeFor('sevadar', 'Sevadar');
/** Blueprint B desk-scoped sevadar: roster + bookings only. */
const scopedSevadar = scopeFor('sevadar', 'Sevadar', {
  deskScope: ['sevadar-roster', 'poojaBooking'],
});
const devoteeMember = scopeFor('devotee', 'Devotee');
const soloDevotee: AssistantCtx = { uid: 'solo1', lang: 'en', role: 'devotee' };

/** The verbatim question from the 2026-10-22 live walk. */
const FAILING_QUESTION =
  'Where is the Bahi-Khata desk for paper-register digitisation?';

/* ------------------------------------------------------------------ */
/* 1 — Map integrity (traced to MODULE_CATALOG + the nested features)  */
/* ------------------------------------------------------------------ */

describe('locator map integrity', () => {
  test('covers all 72 catalog desks + 7 nested + 2 solo + 1 public', () => {
    const byKind = (k: string) => LOCATOR_MAP.filter((e) => e.kind === k);
    expect(byKind('desk').length).toBe(72);
    expect(byKind('nested').length).toBe(7);
    expect(byKind('solo').length).toBe(2);
    expect(byKind('public').length).toBe(1);
    expect(locatorMapSize()).toBe(82);
  });

  test('entry ids are unique and every entry is fully authored', () => {
    const ids = LOCATOR_MAP.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of LOCATOR_MAP) {
      expect(e.name.en).toBeTruthy();
      expect(e.name.hi).toBeTruthy();
      expect(e.name.bn).toBeTruthy();
      expect(e.place.en).toBeTruthy();
      expect(e.place.hi).toBeTruthy();
      expect(e.place.bn).toBeTruthy();
      expect(e.usedBy.en).toBeTruthy();
      expect(e.aliases.length).toBeGreaterThan(0);
      if (e.kind === 'desk' || e.kind === 'nested') {
        expect(e.deskId).toBeTruthy();
        expect(e.domain ?? 0).toBeGreaterThanOrEqual(1);
        expect(e.domain ?? 99).toBeLessThanOrEqual(7);
      }
      if (e.kind === 'solo' || e.kind === 'public') {
        expect(e.route?.startsWith('/')).toBe(true);
      }
    }
  });

  test('openDesk targets are real desk entries in the map', () => {
    const deskIds = new Set(
      LOCATOR_MAP.filter((e) => e.kind === 'desk').map((e) => e.deskId)
    );
    for (const e of LOCATOR_MAP) {
      if (e.deskId) expect(deskIds.has(e.deskId)).toBe(true);
    }
    expect(getLocatorEntry('loc.bahi-khata')?.deskId).toBe('treasury');
    expect(getLocatorEntry('loc.practice-mode')?.deskId).toBe('masterSettings');
    expect(getLocatorEntry('loc.festival-journey')?.deskId).toBe('dashboard');
  });

  test('isolation: the map contains no GodMode / platform-internal location', () => {
    const blob = JSON.stringify(LOCATOR_MAP).toLowerCase();
    expect(blob).not.toContain('godmode');
    expect(blob).not.toContain('mysecretlogin');
    expect(blob).not.toContain('platformconfig');
    expect(blob).not.toContain('god mode');
  });
});

/* ------------------------------------------------------------------ */
/* 2 — Matcher: en/hi/bn + transliterations                            */
/* ------------------------------------------------------------------ */

describe('matchLocator', () => {
  const cases: Array<[string, string]> = [
    [FAILING_QUESTION, 'loc.bahi-khata'],
    ['বহিখাতা কোথায়?', 'loc.bahi-khata'],
    ['বহি খাতা কোথায় আছে?', 'loc.bahi-khata'],
    ['बही खाता कहाँ है?', 'loc.bahi-khata'],
    ['where is voice entry?', 'loc.voice-entry'],
    ['where is the treasury?', 'loc.treasury'],
    ['তহবিল কোথায়?', 'loc.treasury'],
    ['कोष कहाँ है?', 'loc.treasury'],
    ['where is practice mode?', 'loc.practice-mode'],
    ['প্র্যাক্টিস মোড কোথায়?', 'loc.practice-mode'],
    ['प्रैक्टिस मोड कहाँ है?', 'loc.practice-mode'],
    ['where are pending approvals?', 'loc.pending-approvals'],
    ['where are suchana controls?', 'loc.suchana-controls'],
    ['সূচনা নিয়ন্ত্রণ কোথায়?', 'loc.suchana-controls'],
    ['सूचना नियंत्रण कहाँ हैं?', 'loc.suchana-controls'],
    ['where is the privacy notice?', 'loc.privacy-notice'],
    ['where is the festival journey?', 'loc.festival-journey'],
    ['উৎসব যাত্রা কোথায়?', 'loc.festival-journey'],
    ['where is the ask ai page?', 'loc.ask-ai'],
    ['how do i reach the panchang?', 'loc.panchang'],
    ['where is the audit log?', 'loc.legalVault'],
    ['where are published accounts?', 'loc.published-accounts'],
    ['where is access review?', 'loc.access-review'],
  ];
  test.each(cases)('"%s" → %s', (input, id) => {
    const m = matchLocator(input);
    expect(m.best?.id).toBe(id);
    expect(isLocatable(m)).toBe(true);
    expect(m.ambiguous.length).toBe(0);
  });

  test('godmode questions match nothing (isolation)', () => {
    expect(matchLocator('where is the godmode console?').best).toBeNull();
    expect(matchLocator('where is mysecretlogin?').best).toBeNull();
  });

  test('wallet/diary stay with the solo corpus (not in the locator map)', () => {
    expect(isLocatable(matchLocator('where is my wallet?'))).toBe(false);
    expect(isLocatable(matchLocator('where is the tirtha diary?'))).toBe(false);
  });

  test('exactly tied weak evidence reports ambiguity, never a guess', () => {
    const m = matchLocator('students kothay?');
    expect(m.ambiguous.map((e) => e.id).sort()).toEqual(
      ['loc.gurukul', 'loc.pathshala'].sort()
    );
  });
});

/* ------------------------------------------------------------------ */
/* 3 — Trigger + router integration                                    */
/* ------------------------------------------------------------------ */

describe('router integration', () => {
  test('isLocatorQuestion hears where + reach phrasings in 3 languages', () => {
    expect(isLocatorQuestion('where is the treasury?')).toBe(true);
    expect(isLocatorQuestion('how do i reach the treasury?')).toBe(true);
    expect(isLocatorQuestion('তহবিল কোথায়?')).toBe(true);
    expect(isLocatorQuestion('कोष कहाँ है?')).toBe(true);
    expect(isLocatorQuestion('record a donation of 500')).toBe(false);
  });

  test('the failing question routes to org_locator', () => {
    const r = routeIntent(FAILING_QUESTION, 'en');
    expect(r.intent).toBe('org_locator');
    expect(r.slots['entryId']).toBe('loc.bahi-khata');
  });

  test.each([
    ['বহিখাতা কোথায়?', 'bn'],
    ['बही खाता कहाँ है?', 'hi'],
    ['where is the treasury?', 'en'],
    ['তহবিল কোথায়?', 'bn'],
    ['where is practice mode?', 'en'],
    ['how do i reach the goshala desk?', 'en'],
    ['where are suchana controls?', 'en'],
    ['students kothay?', 'bn'],
  ])('"%s" routes to org_locator', (input, lang) => {
    expect(routeIntent(input, lang as 'en' | 'hi' | 'bn').intent).toBe('org_locator');
  });

  test('corpus destinations still route to navigation_question', () => {
    expect(routeIntent('where is my wallet?', 'en').intent).toBe('navigation_question');
    expect(routeIntent('দান বিভাগ কোথায়?', 'bn').intent).toBe('navigation_question');
    expect(routeIntent('where is the tirtha diary?', 'en').intent).toBe('navigation_question');
  });

  test('org data intents keep priority over the locator', () => {
    // "where are pending approvals?" asks for the queue itself —
    // routeOrgIntent claims it before the locator chance.
    expect(routeIntent('where are pending approvals?', 'en').intent).toBe(
      'org_pending_approvals'
    );
    expect(routeIntent('record a donation of 500 taka', 'en').intent).toBe(
      'record_donation'
    );
  });

  test('dharma where-questions are not claimed', () => {
    expect(routeIntent('where is Ekadashi celebrated?', 'en').intent).not.toBe(
      'org_locator'
    );
  });
});

/* ------------------------------------------------------------------ */
/* 4 — RBAC honesty via the real pipeline                              */
/* ------------------------------------------------------------------ */

describe('locator answers via ask()', () => {
  test('Trustee + the failing question → Treasury place + openDesk action', async () => {
    const res = await ask(FAILING_QUESTION, ctxFor(trustee));
    expect(res.type).toBe('action');
    expect(res.action).toEqual({
      kind: 'openDesk',
      target: 'treasury',
      label: 'Take me there 🙏',
    });
    expect(res.text).toContain('Bahi-Khata Seva');
    expect(res.text).toContain('Treasury & Expense Ledger');
    expect(scanSurface(res.text)).toEqual([]);
  });

  test('Trustee + Bengali question → Bengali answer, same action', async () => {
    const res = await ask('বহিখাতা কোথায়?', ctxFor(trustee, 'bn'));
    expect(res.action?.kind).toBe('openDesk');
    expect(res.action?.target).toBe('treasury');
    expect(res.text).toContain('ট্রাস্টির অনুমোদন');
  });

  test('Accountant reaches the Treasury desk too', async () => {
    const res = await ask('where is the treasury?', ctxFor(accountant));
    expect(res.action).toMatchObject({ kind: 'openDesk', target: 'treasury' });
  });

  test('desk-scoped Sevadar → Treasury answered honestly, NO deep-link', async () => {
    const res = await ask('where is the treasury ledger?', ctxFor(scopedSevadar));
    expect(res.type).toBe('answer');
    expect(res.action).toBeUndefined();
    expect(res.text).toContain('Treasury & Expense Ledger');
    expect(res.text).toContain('Trustees and the Accountant');
    expect(res.text).toContain("isn't in your desk list");
  });

  test('the same Sevadar CAN be taken to a desk inside their scope', async () => {
    const res = await ask('where is the sevadar roster?', ctxFor(scopedSevadar));
    expect(res.action).toMatchObject({
      kind: 'openDesk',
      target: 'sevadar-roster',
    });
  });

  test('Auditor: audit log opens, membership desk is named-not-linked', async () => {
    const log = await ask('where is the audit log?', ctxFor(auditor));
    expect(log.action).toMatchObject({ kind: 'openDesk', target: 'legalVault' });
    const mem = await ask('where is the membership desk?', ctxFor(auditor));
    expect(mem.action).toBeUndefined();
    expect(mem.text).toContain('Trustees');
  });

  test('Priest reaches the Panchang, not the Treasury', async () => {
    const pan = await ask('where is the panchang?', ctxFor(priest));
    expect(pan.action).toMatchObject({ kind: 'openDesk', target: 'panchang' });
    const tre = await ask('where is the treasury?', ctxFor(priest));
    expect(tre.action).toBeUndefined();
    expect(tre.text).toContain('Trustees and the Accountant');
  });

  test('org Devotee member gets the honest whose-desk answer', async () => {
    const res = await ask(FAILING_QUESTION, ctxFor(devoteeMember));
    expect(res.action).toBeUndefined();
    expect(res.text).toContain('Bahi-Khata Seva');
    expect(res.text).toContain('Trustees and the Accountant');
  });

  test('solo session: org feature answers with the Orgs path + route', async () => {
    const res = await ask(FAILING_QUESTION, soloDevotee);
    expect(res.action).toMatchObject({ kind: 'navigate', target: '/app/orgs' });
    expect(res.text).toContain('Open Orgs');
    expect(res.text).toContain('Bahi-Khata Seva');
  });

  test('solo-shell controls answer in BOTH shells with their real route', async () => {
    const solo = await ask('where are suchana controls?', soloDevotee);
    expect(solo.action).toMatchObject({ kind: 'navigate', target: '/app/suchana' });
    const org = await ask('where are suchana controls?', ctxFor(trustee));
    expect(org.action).toMatchObject({ kind: 'navigate', target: '/app/suchana' });
    expect(org.text).toContain('SOS always stays on');
  });

  test('ambiguity via ask(): ONE clarifying question, candidates listed, no action', async () => {
    const res = await ask('students kothay?', {
      uid: 't1',
      lang: 'bn',
      role: 'trustee',
      org: { scope: trustee, port: createMemoryPort(trustee, {}) },
    });
    expect(res.type).toBe('clarify');
    expect(res.action).toBeUndefined();
    expect(res.text).toContain('Gurukul');
    expect(res.text).toContain('Pathshala');
  });

  test('isolation: a GodMode probe never reaches a platform location', async () => {
    const res = await ask('where is the godmode console?', ctxFor(trustee));
    expect(res.action?.kind).not.toBe('openDesk');
    expect(res.text.toLowerCase()).not.toContain('mysecretlogin');
    expect(scanSurface(res.text)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* 5 — Scope law, directly (canOpenEntry over the ONE visibility layer) */
/* ------------------------------------------------------------------ */

describe('canOpenEntry', () => {
  const entry = (id: string) => {
    const e = getLocatorEntry(id);
    if (!e) throw new Error(`missing ${id}`);
    return e;
  };

  test('role matrix follows deskVisibility', () => {
    expect(canOpenEntry(entry('loc.treasury'), trustee)).toBe(true);
    expect(canOpenEntry(entry('loc.treasury'), accountant)).toBe(true);
    expect(canOpenEntry(entry('loc.treasury'), priest)).toBe(false);
    expect(canOpenEntry(entry('loc.treasury'), devoteeMember)).toBe(false);
    expect(canOpenEntry(entry('loc.legalVault'), auditor)).toBe(true);
    expect(canOpenEntry(entry('loc.membership'), auditor)).toBe(false);
    expect(canOpenEntry(entry('loc.panchang'), priest)).toBe(true);
    expect(canOpenEntry(entry('loc.practice-mode'), trustee)).toBe(true);
    expect(canOpenEntry(entry('loc.practice-mode'), accountant)).toBe(false);
  });

  test('desk scope narrows, never widens', () => {
    expect(canOpenEntry(entry('loc.treasury'), scopedSevadar)).toBe(false);
    expect(canOpenEntry(entry('loc.sevadar-roster'), scopedSevadar)).toBe(true);
    expect(canOpenEntry(entry('loc.bahi-khata'), scopedSevadar)).toBe(false);
    // The Command Center is scope-exempt in the app law (nobody is
    // stranded from home), so the Festival Journey stays reachable.
    expect(canOpenEntry(entry('loc.festival-journey'), scopedSevadar)).toBe(true);
  });

  test('nested entries inherit the parent desk decision', () => {
    expect(canOpenEntry(entry('loc.voice-entry'), accountant)).toBe(true);
    expect(canOpenEntry(entry('loc.voice-entry'), priest)).toBe(false);
    expect(canOpenEntry(entry('loc.published-accounts'), auditor)).toBe(true);
  });

  test('solo/public entries are the caller’s own — always openable', () => {
    expect(canOpenEntry(entry('loc.suchana-controls'), devoteeMember)).toBe(true);
    expect(canOpenEntry(entry('loc.privacy-notice'), devoteeMember)).toBe(true);
    expect(canOpenEntry(entry('loc.ask-ai'), devoteeMember)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 6 — Executor + templates + gate wiring                              */
/* ------------------------------------------------------------------ */

describe('executor, templates, gates', () => {
  const taskCtx = (
    input: string,
    lang: 'en' | 'hi' | 'bn',
    scope?: CallerScope
  ): TaskCtx => ({
    uid: 't',
    lang,
    role: scope?.role ?? 'devotee',
    input,
    slots: {},
    ...(scope
      ? { org: { scope, port: createMemoryPort(scope, {}) } }
      : {}),
  });

  test('orgLocatorTask: unknown name → clarify with the honest dontKnow', () => {
    const out = orgLocatorTask(taskCtx('where is the moon base?', 'en', trustee));
    expect(out.variant).toBe('clarify');
    expect(out.action).toBeUndefined();
    expect(String(out.params['answer'])).toContain('not been taught');
  });

  test('org_locator is offerable to every role (scope does the guarding)', () => {
    const roles: Role[] = [
      'devotee', 'sevadar', 'priest', 'accountant',
      'trustee', 'auditor', 'purohit', 'jyotish', 'owner',
    ];
    for (const r of roles) expect(canOffer('org_locator', r)).toBe(true);
  });

  test('templates render the composed answer verbatim in all languages', () => {
    for (const lang of ['en', 'hi', 'bn'] as const) {
      const text = renderTemplate(
        'org_locator', lang, { answer: 'LOCATOR-ANSWER' }, 'answer', 'other'
      );
      expect(text).toContain('LOCATOR-ANSWER');
      const dflt = renderTemplate('org_locator', lang, {}, 'default', 'other');
      expect(dflt).toContain('🙏');
    }
  });

  test('every suggestion chip routes back to org_locator', () => {
    for (const lang of ['en', 'hi', 'bn'] as const) {
      const chips = suggestionsFor('org_locator', lang);
      expect(chips.length).toBe(3);
      for (const chip of chips) {
        expect(routeIntent(chip, lang).intent).toBe('org_locator');
      }
    }
  });
});
