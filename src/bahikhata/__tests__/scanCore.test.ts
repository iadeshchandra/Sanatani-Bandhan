import { classifyCell, confirmCell, unconfirmedRedCells } from '../scan/cellConfidence';
import { proposeCorrection, bestProposal, isClosedVocabField } from '../scan/corrections';
import {
  acceptRate, clusterWordColumns, columnIndexForX, learnPair, makeProfile, noteFieldOutcome,
} from '../scan/registerProfile';
import type { ImportRow } from '../types';

/* Phase 2 core laws: money/phone are ALWAYS human-confirmed; the
 * weakest symbol tempers the score; closed vocabularies propose only
 * unique near-matches; columns are learned from word positions. */

describe('classifyCell — the always-red law', () => {
  it('amount is red even at perfect confidence (the 1100→86 lesson)', () => {
    const v = classifyCell({
      field: 'donationAmount', kind: 'amount', text: '1100',
      ocrConfidence: 100, minSymbolConfidence: 100,
    });
    expect(v.cls).toBe('red');
    expect(v.reasons.join(' ')).toMatch(/1100 as 86/);
  });

  it('phone is red even at perfect confidence', () => {
    const v = classifyCell({
      field: 'phone', kind: 'phone', text: '01712345678',
      ocrConfidence: 100, minSymbolConfidence: 100,
    });
    expect(v.cls).toBe('red');
  });

  it('an unparsable amount says so plainly', () => {
    const v = classifyCell({
      field: 'donationAmount', kind: 'amount', text: 'abc', ocrConfidence: 40,
    });
    expect(v.cls).toBe('red');
    expect(v.reasons.join(' ')).toMatch(/could not be read as a number/);
  });
});

describe('classifyCell — confidence blending and validators', () => {
  it('a clean high-confidence name is green', () => {
    const v = classifyCell({
      field: 'fullName', kind: 'text', text: 'Ramesh Chandra',
      ocrConfidence: 96, minSymbolConfidence: 92,
    });
    expect(v.cls).toBe('green');
  });

  it('one weak symbol drags a confident word to amber', () => {
    const v = classifyCell({
      field: 'fullName', kind: 'text', text: 'Ramesh',
      ocrConfidence: 96, minSymbolConfidence: 15,
    });
    // 0.7*96 + 0.3*15 = 71.7 → amber band
    expect(v.cls).toBe('amber');
  });

  it('a non-year in a year column is downgraded', () => {
    const v = classifyCell({
      field: 'arrivalYear', kind: 'year', text: 'abc', ocrConfidence: 96,
    });
    expect(v.cls).toBe('amber');
  });

  it('an impossible count is downgraded', () => {
    const v = classifyCell({
      field: 'ageYears', kind: 'number', text: '450', ocrConfidence: 96,
    });
    expect(v.cls).toBe('amber');
  });

  it('a bad date is red', () => {
    const v = classifyCell({
      field: 'donationDate', kind: 'date', text: 'not a date', ocrConfidence: 96,
    });
    expect(v.cls).toBe('red');
  });

  it('a near-dictionary picklist word is amber with the near flag', () => {
    const v = classifyCell({
      field: 'breed', kind: 'picklist', text: 'Gr', ocrConfidence: 94,
      dictionary: ['Gir', 'Sahiwal'],
    });
    expect(v.cls).toBe('amber');
    expect(v.nearDictionary).toBe(true);
  });

  it('a learned-bad column is capped at amber despite clean OCR', () => {
    const v = classifyCell({
      field: 'fullName', kind: 'text', text: 'Ramesh', ocrConfidence: 98,
      profileAcceptRate: 0.3,
    });
    expect(v.cls).toBe('amber');
  });

  it('empty text is amber, not an error (the paper may be blank)', () => {
    const v = classifyCell({ field: 'notes', kind: 'text', text: '', ocrConfidence: 0 });
    expect(v.cls).toBe('amber');
  });
});

describe('cell confirmation', () => {
  const row: ImportRow = {
    rowId: 'r1', pageNo: 1, raw: {}, mapped: {}, state: 'ok',
    issues: [], defaultedFields: [], approved: true,
    cells: {
      donationAmount: { text: '500', confidence: 70, cls: 'red', reasons: [], bbox: { x0: 0, y0: 0, x1: 1, y1: 1 } },
      fullName: { text: 'Asha', confidence: 95, cls: 'green', reasons: [], bbox: { x0: 0, y0: 0, x1: 1, y1: 1 } },
    },
  };

  it('unconfirmedRedCells lists only red + unvouched', () => {
    expect(unconfirmedRedCells(row)).toEqual(['donationAmount']);
  });

  it('confirmCell vouches and marks touched, immutably', () => {
    const next = confirmCell(row, 'donationAmount');
    expect(next.cells!.donationAmount.confirmed).toBe(true);
    expect(next.cells!.donationAmount.touched).toBe(true);
    expect(unconfirmedRedCells(next)).toEqual([]);
    expect(row.cells!.donationAmount.confirmed).toBeUndefined();
  });
});

describe('corrections — closed vocabularies', () => {
  it('proposes the unique near match', () => {
    expect(proposeCorrection('Gr', ['Gir', 'Sahiwal'])?.to).toBe('Gir');
  });

  it('refuses an ambiguous tie', () => {
    // 'Gr' is one edit from both 'Gir' (insert i) and 'Gar' (insert a).
    expect(proposeCorrection('Gr', ['Gir', 'Gar'])).toBeNull();
  });

  it('refuses a distant word and an exact word', () => {
    expect(proposeCorrection('Holstein', ['Gir', 'Sahiwal'])).toBeNull();
    expect(proposeCorrection('Gir', ['Gir', 'Sahiwal'])).toBeNull();
  });

  it('learned pairs outrank dictionary guesses', () => {
    expect(bestProposal('Gr', ['Gir'], { gr: 'Giri' })).toBe('Giri');
    expect(bestProposal('Gr', ['Gir'])).toBe('Gir');
  });

  it('closed vocab fields are target-scoped (names never included)', () => {
    expect(isClosedVocabField('herd', 'breed')).toBe(true);
    expect(isClosedVocabField('donors', 'gotra')).toBe(true);
    expect(isClosedVocabField('donors', 'fullName')).toBe(false);
  });
});

describe('register profiles — column learning', () => {
  const word = (x0: number, x1: number) => ({
    text: 'w', confidence: 90, bbox: { x0, y0: 500, x1, y1: 540 },
  });

  it('clusters words into columns by x position', () => {
    const words = [
      word(90, 140), word(95, 150),
      word(430, 490), word(440, 480),
      word(800, 860), word(810, 850),
    ];
    const cols = clusterWordColumns(words, 1000, 1400);
    expect(cols.length).toBe(3);
    expect(cols[0].x0).toBeLessThan(cols[1].x0);
    expect(columnIndexForX(cols, 0.12)).toBe(0);
    expect(columnIndexForX(cols, 0.46)).toBe(1);
    expect(columnIndexForX(cols, 0.83)).toBe(2);
    expect(columnIndexForX(cols, 0.995)).toBe(-1);
  });

  it('makeProfile starts with empty learning state', () => {
    const p = makeProfile({
      workspaceId: 'ws', target: 'herd', label: 'Gai khata', script: 'ben',
      columns: [{ field: 'name', x0: 0, x1: 0.5 }],
    });
    expect(p.fieldStats).toEqual({});
    expect(p.learnedPairs).toEqual({});
    expect(p.headerRowSkip).toBe(0);
  });

  it('accept rate needs five outcomes before it judges', () => {
    let p = makeProfile({
      workspaceId: 'ws', target: 'herd', label: 'x', script: 'ben', columns: [],
    });
    for (let i = 0; i < 4; i++) p = noteFieldOutcome(p, 'breed', true);
    expect(acceptRate(p, 'breed')).toBeNull();
    p = noteFieldOutcome(p, 'breed', false);
    expect(acceptRate(p, 'breed')).toBe(0.8);
  });

  it('learnPair records raw→fixed and ignores no-ops', () => {
    const p0 = makeProfile({
      workspaceId: 'ws', target: 'herd', label: 'x', script: 'ben', columns: [],
    });
    const p1 = learnPair(p0, 'breed', 'Gr', 'Gir');
    expect(p1.learnedPairs.breed.gr).toBe('Gir');
    expect(learnPair(p1, 'breed', 'Gir', 'Gir')).toBe(p1);
  });
});
