/**
 * Margdarshan J3 — Your Voice pins.
 * =====================================================================
 * What is pinned here, and why:
 *
 *  - THE RULES CONTRACT: the pure model's vocabulary (kinds,
 *    statuses, the create field set, the triage + anchor key sets)
 *    is compared against firestore.rules PARSED AS TEXT — the same
 *    contract style as the events/polls P0 tests — so the client
 *    model and the security boundary can never silently drift.
 *  - THE CREATE PAYLOAD: buildSuggestionCreate emits EXACTLY the
 *    rules' hasOnly field set, with the rules' pinned initial
 *    values (status 'received', supporterCount 0, hidden false).
 *  - VALIDATION mirrors the rules' limits (a draft the rules would
 *    refuse is refused here first, in friendly words).
 *  - BOARD ORDER: supporters desc, newest breaks ties; the "new"
 *    sort is purely chronological; filters keep only their stage.
 *  - THE SEEDS are real roadmap items only: fixed unique ids,
 *    trilingual-complete, kinds/statuses inside the rules' lists,
 *    and the five honest statuses the launch copy claims.
 *  - THE WING is live with its target; the public route, the
 *    GodMode tab and the Suchana watcher are all registered
 *    (structural source pins — the sandbox cannot run live writes).
 *  - THE LOOP-CLOSURE PICKER: baseline silence, one bell per status
 *    transition, a reply-only bell when no status moved, no bell
 *    for no change.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  PIPELINE_STATUSES,
  SUGGESTION_ANCHOR_KEYS,
  SUGGESTION_CREATE_KEYS,
  SUGGESTION_KINDS,
  SUGGESTION_STATUSES,
  SUGGESTION_TRIAGE_KEYS,
  WINGS,
  buildSuggestionCreate,
  filterBoard,
  sortBoard,
  validateSuggestionDraft,
  type Suggestion,
} from '..';
import { SUGGESTION_SEEDS, seedDisplayItems } from '../suggestionSeeds';
import {
  pickSuggestionNotifyEvents,
  suggestionDedupeKey,
  type SuggestionLedger,
} from '../../suggestionNotify';

const root = resolve(__dirname, '..', '..', '..', '..');
const rules = readFileSync(resolve(root, 'firestore.rules'), 'utf8');

/** Extract a rules string-list literal: NAME() { return ['a', 'b']; } */
function rulesList(fnName: string): string[] {
  const start = rules.indexOf(`function ${fnName}()`);
  if (start < 0) throw new Error(`rules function ${fnName} not found`);
  const open = rules.indexOf('return [', start);
  const close = rules.indexOf('];', open);
  if (open < 0 || close < 0) throw new Error(`rules list ${fnName} not found`);
  const body = rules.slice(open + 'return ['.length, close);
  return [...body.matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/** Extract the create clause's hasOnly([...]) field list. */
function rulesCreateKeys(): string[] {
  const start = rules.indexOf('match /suggestions/{suggId}');
  if (start < 0) throw new Error('suggestions match not found in rules');
  const block = rules.slice(start, rules.indexOf('match /supporters/', start));
  const m = block.match(/keys\(\)\.hasOnly\(\s*\[([\s\S]*?)\]\)/);
  if (!m) throw new Error('create hasOnly not found');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

describe('the rules contract — model mirrors firestore.rules', () => {
  it('the suggestions match and its ballot box exist in the rules', () => {
    expect(rules).toContain('match /suggestions/{suggId}');
    expect(rules).toContain('match /supporters/{supporterUid}');
    expect(rules).toContain('function suggAnchorOk');
  });

  it('kinds: SUGGESTION_KINDS == SUGG_KINDS() in the rules', () => {
    expect([...SUGGESTION_KINDS].sort()).toEqual(rulesList('SUGG_KINDS').sort());
  });

  it('statuses: SUGGESTION_STATUSES == SUGG_STATUSES() in the rules', () => {
    expect([...SUGGESTION_STATUSES].sort()).toEqual(
      rulesList('SUGG_STATUSES').sort()
    );
  });

  it('create keys: the model list == the rules hasOnly list, in order', () => {
    expect([...SUGGESTION_CREATE_KEYS]).toEqual(rulesCreateKeys());
  });

  it('the pipeline chips are a subset of the rules statuses', () => {
    for (const s of PIPELINE_STATUSES) {
      expect(SUGGESTION_STATUSES).toContain(s);
    }
  });
});

describe('the create payload — exactly the rules field set', () => {
  const payload = buildSuggestionCreate(
    {
      authorId: 'uid-1',
      authorName: '  Adesh Chandra  ',
      kind: 'feature',
      deskId: null,
      title: '  A calmer treasury  ',
      body: '  Please…  ',
      language: 'en',
    },
    { nowMs: 1234567890, stamp: 'STAMP' }
  );

  it('emits precisely the create keys — no more, no fewer', () => {
    expect(Object.keys(payload).sort()).toEqual(
      [...SUGGESTION_CREATE_KEYS].sort()
    );
  });

  it("carries the rules' pinned initial values", () => {
    expect(payload.status).toBe('received');
    expect(payload.supporterCount).toBe(0);
    expect(payload.hidden).toBe(false);
    expect(payload.officialReplies).toEqual([]);
    expect(payload.shippedVersion).toBeNull();
    expect(payload.duplicateOf).toBeNull();
    expect(payload.createdAt).toBe('STAMP');
    expect(payload.updatedAt).toBe('STAMP');
  });

  it('trims title/body/name and seeds a one-entry history', () => {
    expect(payload.title).toBe('A calmer treasury');
    expect(payload.body).toBe('Please…');
    expect(payload.authorName).toBe('Adesh Chandra');
    expect(payload.statusHistory).toEqual([
      { status: 'received', at: 1234567890, byRole: 'author' },
    ]);
  });

  it('triage + anchor key sets match the rules diffKeysOnly lists', () => {
    expect(rules).toContain(
      "['status', 'statusHistory', 'officialReplies', 'hidden',"
    );
    for (const k of SUGGESTION_TRIAGE_KEYS) expect(k).toBeTruthy();
    expect([...SUGGESTION_ANCHOR_KEYS]).toEqual(['supporterCount', 'updatedAt']);
    expect(rules).toContain("['supporterCount', 'updatedAt']");
  });
});

describe('validation — the rules limits, checked before the write', () => {
  const good = {
    authorId: 'u',
    authorName: 'Name',
    kind: 'feature' as const,
    deskId: null,
    title: 'T',
    body: 'B',
    language: 'en',
  };
  it('a well-formed draft passes', () => {
    expect(validateSuggestionDraft(good)).toEqual([]);
  });
  it('empty and oversized titles/bodies fail', () => {
    expect(validateSuggestionDraft({ ...good, title: '  ' })).toContain('title-length');
    expect(validateSuggestionDraft({ ...good, title: 'x'.repeat(141) })).toContain('title-length');
    expect(validateSuggestionDraft({ ...good, body: '' })).toContain('body-length');
    expect(validateSuggestionDraft({ ...good, body: 'x'.repeat(2001) })).toContain('body-length');
  });
  it('an unknown kind fails; a long deskId fails', () => {
    expect(
      validateSuggestionDraft({ ...good, kind: 'nonsense' as never })
    ).toContain('kind');
    expect(
      validateSuggestionDraft({ ...good, deskId: 'x'.repeat(65) })
    ).toContain('deskId');
  });
});

describe('board ordering + filtering', () => {
  const mk = (id: string, supporterCount: number, createdAtMs: number, status: Suggestion['status']): Suggestion => ({
    id,
    authorId: 'a',
    authorName: 'A',
    kind: 'feature',
    deskId: null,
    title: id,
    body: 'b',
    language: 'en',
    status,
    statusHistory: [],
    officialReplies: [],
    supporterCount,
    hidden: false,
    createdAtMs,
    updatedAtMs: createdAtMs,
    shippedVersion: null,
    duplicateOf: null,
  });
  const items = [
    mk('old-loved', 9, 100, 'planned'),
    mk('new-loved', 9, 300, 'received'),
    mk('mid', 4, 200, 'received'),
    mk('fresh', 0, 400, 'shipped'),
  ];
  it('top: supporters desc, newest breaks the tie', () => {
    expect(sortBoard(items, 'top').map((i) => i.id)).toEqual([
      'new-loved',
      'old-loved',
      'mid',
      'fresh',
    ]);
  });
  it('new: purely chronological', () => {
    expect(sortBoard(items, 'new').map((i) => i.id)).toEqual([
      'fresh',
      'new-loved',
      'mid',
      'old-loved',
    ]);
  });
  it('filter keeps only its stage; all keeps everything', () => {
    expect(filterBoard(items, 'received').map((i) => i.id).sort()).toEqual(['mid', 'new-loved']);
    expect(filterBoard(items, 'all')).toHaveLength(4);
  });
});

describe('the launch seeds — real roadmap items, honestly labelled', () => {
  it('five items, fixed unique ids', () => {
    expect(SUGGESTION_SEEDS).toHaveLength(5);
    expect(new Set(SUGGESTION_SEEDS.map((s) => s.id)).size).toBe(5);
    for (const s of SUGGESTION_SEEDS) expect(s.id.startsWith('seed-')).toBe(true);
  });
  it('every seed is trilingual-complete and inside the rules vocabulary', () => {
    for (const s of SUGGESTION_SEEDS) {
      for (const lang of ['en', 'hi', 'bn'] as const) {
        expect(s.title[lang].length).toBeGreaterThan(0);
        expect(s.body[lang].length).toBeGreaterThan(0);
      }
      expect(SUGGESTION_KINDS).toContain(s.kind);
      expect(SUGGESTION_STATUSES).toContain(s.status);
    }
  });
  it("the statuses match the launch story: 2 planned, 1 under review, 2 received", () => {
    const byStatus = SUGGESTION_SEEDS.map((s) => s.status).sort();
    expect(byStatus).toEqual([
      'planned',
      'planned',
      'received',
      'received',
      'under-review',
    ]);
  });
  it('fallback display items carry the team name and no fake support', () => {
    const display = seedDisplayItems('en');
    expect(display).toHaveLength(5);
    for (const d of display) {
      expect(d.authorName).toBe('Sanatani Bandhan team');
      expect(d.supporterCount).toBe(0);
      expect(d.hidden).toBe(false);
    }
    expect(seedDisplayItems('hi')[0].title).toBe(SUGGESTION_SEEDS[0].title.hi);
    expect(seedDisplayItems('fr')[0].title).toBe(SUGGESTION_SEEDS[0].title.en);
  });
});

describe('registration — wing, route, desk, watcher', () => {
  it('the voice wing is live with its target; satsang still waits', () => {
    const byId = Object.fromEntries(WINGS.map((w) => [w.id, w]));
    expect(byId.voice.state).toBe('live');
    expect(byId.voice.target).toBe('voice');
    expect(byId.satsang.state).toBe('works');
    expect(byId.satsang.target).toBeUndefined();
  });

  it('App.tsx registers the public suggestions route', () => {
    const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
    expect(app).toContain('path="/margdarshan/suggestions"');
    expect(app).toContain('PublicSuggestions');
  });

  it('the public board asks for sign-in at the act, with a return', () => {
    const pub = readFileSync(
      resolve(root, 'src/components/margdarshan/PublicMargdarshan.tsx'),
      'utf8'
    );
    expect(pub).toContain('/login?next=/margdarshan/suggestions');
    expect(pub).toContain('engagement={null}');
    // The J1 law still holds: no auth context in the public mirror.
    expect(pub).not.toContain('useAuthWorkspace');
  });

  it('GodMode carries the Triage Desk tab', () => {
    const console2 = readFileSync(
      resolve(root, 'src/components/common/GodModeConsole2.tsx'),
      'utf8'
    );
    expect(console2).toContain("'suggestions'");
    expect(console2).toContain('SuggestionTriageTab');
  });

  it('the loop-closure watcher is mounted in NotificationWiring', () => {
    const wiring = readFileSync(
      resolve(root, 'src/notifications/NotificationWiring.tsx'),
      'utf8'
    );
    expect(wiring).toContain('startSuggestionNotify');
  });

  it('the filing form states the public warning above its submit', () => {
    const board = readFileSync(
      resolve(root, 'src/components/margdarshan/VoiceBoard.tsx'),
      'utf8'
    );
    const warn = board.indexOf('voicePublicWarning');
    const submit = board.indexOf('voiceSubmit');
    expect(warn).toBeGreaterThan(0);
    expect(submit).toBeGreaterThan(warn);
  });
});

describe('the loop-closure picker — one bell per transition', () => {
  const lite = (status: string, replyCount = 0, historyLength = 1) => [
    { id: 's1', title: 'T', status, replyCount, historyLength },
  ];
  it('baseline rings nothing but records everything', () => {
    const { events, nextLedger } = pickSuggestionNotifyEvents({
      suggestions: lite('planned'),
      ledger: {},
      baseline: true,
    });
    expect(events).toHaveLength(0);
    expect(nextLedger.s1).toEqual({ s: 'planned', r: 0, h: 1 });
  });
  it('a status move rings once, for the new status', () => {
    const ledger: SuggestionLedger = { s1: { s: 'received', r: 0, h: 1 } };
    const { events } = pickSuggestionNotifyEvents({
      suggestions: lite('planned', 0, 2),
      ledger,
      baseline: false,
    });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('status');
    expect(events[0].status).toBe('planned');
    expect(suggestionDedupeKey(events[0], 2, 0)).toBe(
      'suggestion:status:s1:planned:2'
    );
  });
  it('a reply without a status move rings the reply bell', () => {
    const ledger: SuggestionLedger = { s1: { s: 'planned', r: 0, h: 2 } };
    const { events } = pickSuggestionNotifyEvents({
      suggestions: lite('planned', 1, 2),
      ledger,
      baseline: false,
    });
    expect(events.map((e) => e.kind)).toEqual(['reply']);
  });
  it('no change rings nothing', () => {
    const ledger: SuggestionLedger = { s1: { s: 'planned', r: 1, h: 2 } };
    const { events } = pickSuggestionNotifyEvents({
      suggestions: lite('planned', 1, 2),
      ledger,
      baseline: false,
    });
    expect(events).toHaveLength(0);
  });
});
