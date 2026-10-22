/**
 * auditI18n.test.ts — Blueprint A i18n guard.
 * ================================================================
 * Every `org.audit.*` key the Blueprint A surfaces request (audit
 * desk, record history + its plain-language templates, publish
 * panel, transparency board, receipt-coverage labels) must:
 *   1. exist in the authored en / hi / bn org fragments with
 *      IDENTICAL key sets (parity — no locale silently thinner);
 *   2. resolve through the real merged dictionaries (the t()
 *      fallback chain) to exactly the authored string in each of
 *      en / hi / bn — never to the raw key, never to English in
 *      hi / bn clothing;
 *   3. keep its {placeholders} intact across all three languages,
 *      so renderAuditSummary can fill them in any language.
 */
import { getDict, loadLanguageDict } from '../translations';
import { orgNs as enOrg } from '../lang/en/org';
import { orgNs as hiOrg } from '../lang/hi/org';
import { orgNs as bnOrg } from '../lang/bn/org';

type Dict = Record<string, unknown>;

function leaves(obj: unknown, prefix: string, out: Array<[string, string]> = []): Array<[string, string]> {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Dict)) {
      leaves(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else if (typeof obj === 'string') {
    out.push([prefix, obj]);
  }
  return out;
}

function resolveKey(dict: unknown, key: string): string | undefined {
  let cur: unknown = dict;
  for (const seg of key.split('.')) {
    if (cur && typeof cur === 'object' && seg in (cur as Dict)) {
      cur = (cur as Dict)[seg];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

const enLeaves = leaves((enOrg as Dict).org ? { org: (enOrg as Dict).org } : {}, '')
  .filter(([k]) => k.startsWith('org.audit.'));
const hiLeaves = leaves((hiOrg as Dict).org ? { org: (hiOrg as Dict).org } : {}, '')
  .filter(([k]) => k.startsWith('org.audit.'));
const bnLeaves = leaves((bnOrg as Dict).org ? { org: (bnOrg as Dict).org } : {}, '')
  .filter(([k]) => k.startsWith('org.audit.'));

const placeholders = (s: string): string[] =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

beforeAll(async () => {
  await loadLanguageDict('hi');
  await loadLanguageDict('bn');
});

describe('org.audit fragments', () => {
  it('author a substantial key set (desk + history + publish + board + receipts)', () => {
    expect(enLeaves.length).toBeGreaterThanOrEqual(80);
  });

  it('hi and bn carry exactly the en key set (parity)', () => {
    const enKeys = enLeaves.map(([k]) => k).sort();
    expect(hiLeaves.map(([k]) => k).sort()).toEqual(enKeys);
    expect(bnLeaves.map(([k]) => k).sort()).toEqual(enKeys);
  });

  it('no leaf is empty or a raw key', () => {
    for (const [k, v] of [...enLeaves, ...hiLeaves, ...bnLeaves]) {
      expect(v.trim().length).toBeGreaterThan(0);
      expect(v).not.toBe(k);
    }
  });

  it('placeholders survive translation intact', () => {
    const hiByKey = new Map(hiLeaves);
    const bnByKey = new Map(bnLeaves);
    for (const [k, en] of enLeaves) {
      expect(placeholders(hiByKey.get(k) ?? '')).toEqual(placeholders(en));
      expect(placeholders(bnByKey.get(k) ?? '')).toEqual(placeholders(en));
    }
  });
});

describe('org.audit resolution through the merged dictionaries', () => {
  it('every key resolves in en to its authored string', () => {
    const dict = getDict('en');
    for (const [k, authored] of enLeaves) {
      expect(resolveKey(dict, k)).toBe(authored);
    }
  });

  it('every key resolves in hi / bn to the AUTHORED hi / bn string (not English)', () => {
    const hiDict = getDict('hi');
    const bnDict = getDict('bn');
    for (const [k, authored] of hiLeaves) {
      expect(resolveKey(hiDict, k)).toBe(authored);
    }
    for (const [k, authored] of bnLeaves) {
      expect(resolveKey(bnDict, k)).toBe(authored);
    }
  });

  it('the history templates exist for every action the writers emit', () => {
    const dict = getDict('en');
    const templates = [
      'treasuryIncome', 'treasuryExpense', 'treasuryReversed',
      'treasuryUpdated', 'treasuryReverted',
      'devoteeCreated', 'devoteeUpdated', 'devoteeDeleted', 'devoteeReverted',
      'bookingCreated', 'bookingStatus', 'bookingUpdated', 'bookingReverted',
      'inventoryCreated', 'inventoryStock',
      'samplePurged', 'settingsUpdated',
      'accountsPublished', 'accountsUnpublished',
    ];
    for (const name of templates) {
      const v = resolveKey(dict, `org.audit.history.${name}`);
      expect(typeof v).toBe('string');
      expect(v).toContain('{actor}');
    }
  });
});
