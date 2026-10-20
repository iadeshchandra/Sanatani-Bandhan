/**
 * taxonomyMap.test.ts — QUEUED #49 regression suite.
 * =====================================================================
 * Pins the live-audit defect (build b91aa94): for Ashram, Gurukul and
 * Sangha workspaces the member noun resolved to `undefined` —
 * "Personal Mode (undefined)", "All Undefined", "Search undefined by
 * name, gotra, phone...", "Register New undefined". The contract:
 *  - all five suite types carry complete matrices in en/hi/bn;
 *  - every field is a non-empty string for every type;
 *  - resolution NEVER returns null for a workspace type, in any
 *    language (unknown types degrade to the Mandir matrix);
 *  - non-workspace strings still resolve to null (verbatim passthrough).
 */
import { TAXONOMY_MAP, WORKSPACE_TYPE_KEYS, resolveTaxonomyMatrix } from '../taxonomyMap';

const SUITE_TYPES = ['MANDIR', 'GOSHALA', 'ASHRAM', 'GURUKUL', 'SANGHA'] as const;
const FIELDS = [
  'workspaceLabel',
  'directoryName',
  'memberTerm',
  'fundsTerm',
  'assetsTerm',
  'inventoryTerm',
] as const;

describe('TAXONOMY_MAP completeness', () => {
  for (const lang of ['en', 'hi', 'bn']) {
    for (const type of SUITE_TYPES) {
      it(`${lang}/${type} has every field as a non-empty string`, () => {
        const matrix = TAXONOMY_MAP[lang]?.[type];
        expect(matrix).toBeDefined();
        for (const field of FIELDS) {
          const value = matrix?.[field];
          expect(typeof value).toBe('string');
          expect((value as string).length).toBeGreaterThan(0);
          expect(value).not.toContain('undefined');
        }
      });
    }
  }
});

describe('the audited nouns (en)', () => {
  it('resolves the suite vocabulary for all five types', () => {
    expect(resolveTaxonomyMatrix('en', 'Mandir')?.memberTerm).toBe('Bhaktas');
    expect(resolveTaxonomyMatrix('en', 'Goshala')?.memberTerm).toBe('Gau Sevaks');
    expect(resolveTaxonomyMatrix('en', 'Ashram')?.memberTerm).toBe('Sadhaks');
    expect(resolveTaxonomyMatrix('en', 'Gurukul')?.memberTerm).toBe('Shishyas');
    expect(resolveTaxonomyMatrix('en', 'Sangha')?.memberTerm).toBe('Sadasyas');
  });

  it('is case-insensitive on the type key', () => {
    expect(resolveTaxonomyMatrix('en', 'ashram')?.memberTerm).toBe('Sadhaks');
    expect(resolveTaxonomyMatrix('en', 'ASHRAM')?.memberTerm).toBe('Sadhaks');
  });

  it('gives each fixed type its own directory name too', () => {
    expect(resolveTaxonomyMatrix('en', 'Ashram')?.directoryName).toBe('Sadhak Directory');
    expect(resolveTaxonomyMatrix('en', 'Gurukul')?.directoryName).toBe('Shishya Directory');
    expect(resolveTaxonomyMatrix('en', 'Sangha')?.directoryName).toBe('Sadasya Directory');
  });
});

describe('resolution can never produce an undefined noun', () => {
  it('every WorkspaceType resolves in every shipped language bucket', () => {
    for (const key of WORKSPACE_TYPE_KEYS) {
      for (const lang of ['en', 'hi', 'bn', 'sa', 'ta', 'te', 'mr', 'gu', 'kn', 'ml']) {
        const matrix = resolveTaxonomyMatrix(lang, key);
        expect(matrix).not.toBeNull();
        expect(matrix?.memberTerm).toBeTruthy();
        expect(matrix?.workspaceLabel).toBeTruthy();
        expect(matrix?.directoryName).toBeTruthy();
        expect(matrix?.fundsTerm).toBeTruthy();
      }
    }
  });

  it('types without their own words degrade to the Mandir matrix, never blank', () => {
    const trust = resolveTaxonomyMatrix('en', 'Trust');
    expect(trust?.memberTerm).toBe('Bhaktas');
    expect(trust).toBe(TAXONOMY_MAP.en.MANDIR);
  });

  it('unknown languages fall back to the English entry for the type', () => {
    expect(resolveTaxonomyMatrix('ta', 'Gurukul')?.memberTerm).toBe('Shishyas');
    expect(resolveTaxonomyMatrix('xx', 'Sangha')?.memberTerm).toBe('Sadasyas');
  });

  it('non-workspace strings still resolve to null (verbatim passthrough)', () => {
    expect(resolveTaxonomyMatrix('en', 'Participant')).toBeNull();
    expect(resolveTaxonomyMatrix('en', 'SpiritualCustodian')).toBeNull();
  });
});
