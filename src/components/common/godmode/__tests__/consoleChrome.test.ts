/**
 * consoleChrome.test.ts — QUEUED #39 shell-chrome pure logic.
 *
 * The two properties that matter most are pinned here:
 *  1. Honesty — unknown facts never aggregate into green/zero/all-clear.
 *  2. Role scoping — owner-only counts (claims, due subscriptions, API
 *     state) can never appear for delegated roles, in ANY output shape.
 */
import {
  buildHandItems,
  filterJumpEntries,
  handCompleteness,
  identityFor,
  summarizeApiHealth,
  type ConsoleFacts,
  type JumpEntry,
} from '../consoleChrome';
import {
  API_DESCRIPTORS,
  type ProbeOutcomeKind,
  type ProbeResult,
} from '../../../../apikeys/apiHealth';

const probe = (apiId: string, outcome: ProbeOutcomeKind, checkedAt = 1000): ProbeResult => ({
  apiId,
  outcome,
  httpStatus: 200,
  latencyMs: 12,
  detail: '',
  checkedAt,
  probeCostUnits: 0,
});

const allConfigured: Record<string, boolean> = Object.fromEntries(
  API_DESCRIPTORS.map((d) => [d.id, true]),
);

/* ------------------------------------------------------- summarizeApiHealth */

describe('summarizeApiHealth', () => {
  it('unknown when nothing was read', () => {
    expect(summarizeApiHealth(null, allConfigured).rollup).toBe('unknown');
    expect(summarizeApiHealth({}, null).rollup).toBe('unknown');
    expect(summarizeApiHealth(null, allConfigured).light).toBe('');
  });

  it('unknown when configured APIs were simply never probed', () => {
    const s = summarizeApiHealth({}, allConfigured);
    expect(s.rollup).toBe('unknown');
    expect(s.okCount).toBe(0);
  });

  it('ok when probed APIs are working; unprobed ones are not counted', () => {
    const s = summarizeApiHealth({ youtube: probe('youtube', 'ok', 5000) }, allConfigured);
    expect(s.rollup).toBe('ok');
    expect(s.light).toBe('🟢');
    expect(s.okCount).toBe(1);
    expect(s.freshestAt).toBe(5000);
  });

  it('fail wins over ok, and names the failing API', () => {
    const s = summarizeApiHealth(
      { youtube: probe('youtube', 'ok'), carto: probe('carto', 'invalid_key') },
      allConfigured,
    );
    expect(s.rollup).toBe('fail');
    expect(s.light).toBe('🔴');
    expect(s.problemCount).toBe(1);
    expect(s.problemNames).toEqual(['CARTO Basemaps']);
  });

  it('quota_exceeded outcome counts as a problem (quota full)', () => {
    const s = summarizeApiHealth({ youtube: probe('youtube', 'quota_exceeded') }, allConfigured);
    expect(s.rollup).toBe('fail');
    expect(s.problemCount).toBe(1);
  });

  it('rate_limited outcome is a warning, not a failure', () => {
    const s = summarizeApiHealth(
      { youtube: probe('youtube', 'ok'), gemini: probe('gemini', 'rate_limited') },
      allConfigured,
    );
    expect(s.rollup).toBe('warn');
    expect(s.light).toBe('🟡');
    expect(s.warnCount).toBe(1);
    expect(s.warnNames).toEqual(['Gemini AI']);
  });

  it('an unconfigured API with no probe is neutral, never "ok"', () => {
    const configured = { ...allConfigured, youtube: false, gemini: false, carto: false, gmaps: false };
    const s = summarizeApiHealth({ nominatim: probe('nominatim', 'ok') }, configured);
    expect(s.rollup).toBe('ok');
    expect(s.okCount).toBe(1);
  });

  it('all unconfigured + unprobed → unknown, not green', () => {
    const configured = { ...allConfigured, youtube: false, gemini: false, carto: false, gmaps: false };
    const keylessOnly = { ...configured, nominatim: true, ipapi: true, esri: true, osm: true };
    expect(summarizeApiHealth({}, keylessOnly).rollup).toBe('unknown');
  });
});

/* ---------------------------------------------------------- buildHandItems */

const fullFacts: ConsoleFacts = {
  pendingClaims: 3,
  dueSubscriptions: 2,
  newSupport: 5,
  apis: {
    rollup: 'fail',
    light: '🔴',
    okCount: 5,
    problemCount: 1,
    warnCount: 0,
    problemNames: ['YouTube Data API'],
    warnNames: [],
    freshestAt: 123,
  },
};

describe('buildHandItems — role scoping (no leaks to delegated roles)', () => {
  it('owner sees all four items, money first', () => {
    const items = buildHandItems('owner', fullFacts);
    expect(items.map((i) => i.id)).toEqual(['claims', 'dueSubscriptions', 'apis', 'support']);
  });

  it('delegated admin sees ONLY support — never claims, dues or API counts', () => {
    const items = buildHandItems('admin', fullFacts);
    expect(items.map((i) => i.id)).toEqual(['support']);
  });

  it('moderator sees ONLY support', () => {
    const items = buildHandItems('moderator', fullFacts);
    expect(items.map((i) => i.id)).toEqual(['support']);
  });

  it('no role → no items', () => {
    expect(buildHandItems(null, fullFacts)).toEqual([]);
    expect(buildHandItems(undefined, fullFacts)).toEqual([]);
  });

  it('zero or unread facts produce no items (unknown is not zero)', () => {
    expect(buildHandItems('owner', {})).toEqual([]);
    expect(
      buildHandItems('owner', { pendingClaims: 0, dueSubscriptions: 0, newSupport: 0 }),
    ).toEqual([]);
  });

  it('labels singularize and the API item names the APIs', () => {
    const items = buildHandItems('owner', {
      pendingClaims: 1,
      apis: { ...fullFacts.apis!, warnCount: 0, problemCount: 1 },
    });
    expect(items[0].label).toBe('1 payment claim awaiting approval');
    const apiItem = items.find((i) => i.id === 'apis');
    expect(apiItem?.label).toContain('YouTube Data API');
    expect(apiItem?.tone).toBe('red');
  });

  it('warn-only APIs are amber, counted, and still listed', () => {
    const items = buildHandItems('owner', {
      apis: {
        rollup: 'warn',
        light: '🟡',
        okCount: 6,
        problemCount: 0,
        warnCount: 2,
        problemNames: [],
        warnNames: ['Gemini AI', 'ipapi.co'],
        freshestAt: 5,
      },
    });
    expect(items).toHaveLength(1);
    expect(items[0].tone).toBe('amber');
    expect(items[0].count).toBe(2);
  });
});

/* -------------------------------------------------------- handCompleteness */

describe('handCompleteness — all-clear is earned, never assumed', () => {
  it('owner complete only when every fact arrived', () => {
    const done = handCompleteness('owner', {
      pendingClaims: 0,
      dueSubscriptions: 0,
      newSupport: 0,
      apis: summarizeApiHealth({ youtube: probe('youtube', 'ok') }, allConfigured),
    });
    expect(done.complete).toBe(true);
    expect(done.applicable).toHaveLength(4);

    const partial = handCompleteness('owner', { pendingClaims: 0 });
    expect(partial.complete).toBe(false);
    expect(partial.loaded).toEqual(['claims']);
  });

  it("an 'unknown' API rollup does not count as loaded", () => {
    const c = handCompleteness('owner', {
      pendingClaims: 0,
      dueSubscriptions: 0,
      newSupport: 0,
      apis: summarizeApiHealth(null, null),
    });
    expect(c.complete).toBe(false);
    expect(c.loaded).not.toContain('apis');
  });

  it('moderator is responsible for support only', () => {
    const c = handCompleteness('moderator', { newSupport: 0 });
    expect(c.applicable).toEqual(['support']);
    expect(c.complete).toBe(true);
  });

  it('no role → nothing applicable, never complete', () => {
    expect(handCompleteness(null, {}).complete).toBe(false);
  });
});

/* -------------------------------------------------------------- identityFor */

describe('identityFor', () => {
  it('prefers the display name and upper-cases the initial', () => {
    const id = identityFor({ displayName: 'adesh chandra', email: 'a@b.c' }, 'owner');
    expect(id.name).toBe('adesh chandra');
    expect(id.initial).toBe('A');
    expect(id.roleLabel).toBe('Owner');
  });

  it('falls back to email, then to a neutral label', () => {
    expect(identityFor({ displayName: '  ', email: 'mod@x.y' }, 'moderator').name).toBe('mod@x.y');
    expect(identityFor(null, 'admin').name).toBe('Administrator');
    expect(identityFor(undefined, null).roleLabel).toBe('');
  });
});

/* --------------------------------------------------------- filterJumpEntries */

describe('filterJumpEntries', () => {
  const entries: JumpEntry[] = [
    { id: 'hand-claims', kind: 'hand', label: '3 payment claims awaiting approval', hint: 'Billing', keywords: 'billing' },
    { id: 'tab-overview', kind: 'tab', label: 'Insights', hint: 'Desk', keywords: 'overview' },
    { id: 'tab-billing', kind: 'tab', label: 'Billing', hint: 'Desk', keywords: 'billing' },
    { id: 'tab-apikeys', kind: 'tab', label: 'API Keys', hint: 'Desk', keywords: 'apikeys' },
  ];

  it('empty query returns entries in order, capped', () => {
    expect(filterJumpEntries('', entries)).toHaveLength(4);
    expect(filterJumpEntries('  ', entries, 2).map((e) => e.id)).toEqual(['hand-claims', 'tab-overview']);
  });

  it('matches label case-insensitively and keywords (tab ids)', () => {
    expect(filterJumpEntries('BILL', entries).map((e) => e.id)).toEqual(['hand-claims', 'tab-billing']);
    expect(filterJumpEntries('apikeys', entries).map((e) => e.id)).toEqual(['tab-apikeys']);
  });

  it('no match → empty list', () => {
    expect(filterJumpEntries('zzz', entries)).toEqual([]);
  });
});
