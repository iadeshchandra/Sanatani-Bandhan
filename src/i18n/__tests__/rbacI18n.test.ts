/**
 * rbacI18n.test.ts — Blueprint B i18n guard.
 * ================================================================
 * Every `org.access.*` key (role templates, assignment editor,
 * member chips, approvals panel, payment-details card) plus the
 * Blueprint B `org.audit.history.*` templates must:
 *   1. exist in en / hi / bn with IDENTICAL key sets (parity);
 *   2. resolve through the real merged dictionaries to the authored
 *      string in each language — never the raw key;
 *   3. keep {placeholders} identical across languages, so the
 *      audit renderer can fill them in any language.
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

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const NEW_HISTORY_KEYS = [
  'membershipInvited', 'membershipJoined', 'membershipApproved',
  'membershipRoleChanged', 'membershipAccessUpdated', 'membershipRemoved',
  'approvalRequested', 'approvalApproved', 'approvalRejected',
  'approvalCancelled', 'approvalApplied', 'approvalApplyFailed',
];

describe('org.access parity (en/hi/bn)', () => {
  const accessOf = (org: unknown) => ((org as Dict).org as Dict).access;
  const enAccess = leaves(accessOf(enOrg), 'access');
  const hiAccess = leaves(accessOf(hiOrg), 'access');
  const bnAccess = leaves(accessOf(bnOrg), 'access');

  it('authored access sections exist and are complete (72 keys)', () => {
    expect(enAccess.length).toBe(72);
  });

  it('hi and bn key sets are identical to en', () => {
    expect(hiAccess.map(([k]) => k).sort()).toEqual(enAccess.map(([k]) => k).sort());
    expect(bnAccess.map(([k]) => k).sort()).toEqual(enAccess.map(([k]) => k).sort());
  });

  it('every access key resolves through the merged dictionaries', async () => {
    for (const lang of ['en', 'hi', 'bn'] as const) {
      await loadLanguageDict(lang);
      const dict = getDict(lang);
      const authored = lang === 'en' ? enAccess : lang === 'hi' ? hiAccess : bnAccess;
      for (const [k, v] of authored) {
        expect(resolveKey(dict, `org.${k}`)).toBe(v);
      }
    }
  });
});

describe('blueprint B history templates', () => {
  const hist = (org: unknown) =>
    (((org as Dict).org as Dict).audit as Dict).history as Record<string, string>;

  it('exist in all three languages', () => {
    for (const org of [enOrg, hiOrg, bnOrg]) {
      for (const k of NEW_HISTORY_KEYS) {
        expect(typeof hist(org)[k]).toBe('string');
        expect(hist(org)[k].length).toBeGreaterThan(0);
      }
    }
  });

  it('placeholders survive translation identically', () => {
    for (const k of NEW_HISTORY_KEYS) {
      const en = placeholders(hist(enOrg)[k]);
      expect(placeholders(hist(hiOrg)[k])).toEqual(en);
      expect(placeholders(hist(bnOrg)[k])).toEqual(en);
    }
  });

  it('resolve through the merged dictionaries', async () => {
    for (const lang of ['en', 'hi', 'bn'] as const) {
      await loadLanguageDict(lang);
      const dict = getDict(lang);
      const authored = lang === 'en' ? enOrg : lang === 'hi' ? hiOrg : bnOrg;
      for (const k of NEW_HISTORY_KEYS) {
        expect(resolveKey(dict, `org.audit.history.${k}`)).toBe(hist(authored)[k]);
      }
    }
  });
});
