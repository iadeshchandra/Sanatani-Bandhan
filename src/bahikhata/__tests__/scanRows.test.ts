import {
  applyBand, createBandStream, lineToCells, rowsForPage,
  type OcrLine, type OcrWord,
} from '../scan/scanRows';
import { makeProfile } from '../scan/registerProfile';

/* Phase 2 pipeline: bands stream in any order without duplicating;
 * lines split into the profile's columns; money/phone cells land red;
 * a dialect-near breed earns a dictionary proposal. */

const W = 1000;
const H = 1400;

const word = (text: string, cx: number, conf = 95, symConf?: number): OcrWord => ({
  text,
  confidence: conf,
  bbox: { x0: cx * W - 40, y0: 100, x1: cx * W + 40, y1: 140 },
  ...(symConf !== undefined
    ? { symbols: [{ text, confidence: symConf }] }
    : {}),
});

const line = (words: OcrWord[]): OcrLine => ({
  words,
  bbox: { x0: 0, y0: 100, x1: W, y1: 140 },
});

describe('band streaming state', () => {
  it('orders bands as they land and never double-counts', () => {
    let s = createBandStream(3);
    s = applyBand(s, { bandIndex: 2, lines: [line([word('c', 0.2)])] });
    s = applyBand(s, { bandIndex: 0, lines: [line([word('a', 0.2)])] });
    expect(s.doneBands).toBe(2);
    expect(s.lines.map((l) => l.words[0].text)).toEqual(['a', 'c']);
    s = applyBand(s, { bandIndex: 0, lines: [line([word('a', 0.2)])] });
    expect(s.doneBands).toBe(2);
    expect(s.lines.length).toBe(2);
  });
});

describe('lineToCells', () => {
  const profile = makeProfile({
    workspaceId: 'ws', target: 'donors', label: 'Dan khata', script: 'ben',
    columns: [
      { field: 'fullName', x0: 0, x1: 0.4 },
      { field: 'donationAmount', x0: 0.4, x1: 0.7 },
      { field: 'phone', x0: 0.7, x1: 1 },
    ],
  });

  it('assigns words to the column their centre falls in', () => {
    const cells = lineToCells(
      line([word('Ramesh', 0.2), word('1100', 0.55), word('01712345678', 0.85)]),
      profile, 'donors', W, H
    );
    expect(cells.fullName.text).toBe('Ramesh');
    expect(cells.donationAmount.text).toBe('1100');
    expect(cells.phone.text).toBe('01712345678');
    // cells carry page-relative boxes for the review highlight
    expect(cells.fullName.bbox!.x0).toBeGreaterThanOrEqual(0);
    expect(cells.fullName.bbox!.x1).toBeLessThanOrEqual(1);
  });

  it('without a profile the whole line becomes a name skeleton', () => {
    const cells = lineToCells(line([word('Kamala', 0.2), word('Devi', 0.3)]), null, 'members', W, H);
    expect(Object.keys(cells)).toEqual(['fullName']);
    expect(cells.fullName.text).toBe('Kamala Devi');
  });
});

describe('rowsForPage — the full page funnel', () => {
  const profile = makeProfile({
    workspaceId: 'ws', target: 'donors', label: 'Dan khata', script: 'ben',
    columns: [
      { field: 'fullName', x0: 0, x1: 0.4 },
      { field: 'donationAmount', x0: 0.4, x1: 0.7 },
      { field: 'phone', x0: 0.7, x1: 1 },
    ],
  });

  it('money and phone cells are red; a clean name is green', () => {
    const rows = rowsForPage({
      target: 'donors',
      lines: [line([word('Ramesh Chandra', 0.2, 96, 94), word('1100', 0.55, 88, 80), word('01712345678', 0.85, 90, 88)])],
      profile, imgW: W, imgH: H, pageNo: 7,
      dictionaries: {},
      base: { existingMembers: [], existingHerd: [] },
      idPrefix: 'scan_test',
    });
    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(row.pageNo).toBe(7);
    expect(row.cells!.donationAmount.cls).toBe('red');
    expect(row.cells!.phone.cls).toBe('red');
    expect(row.cells!.fullName.cls).toBe('green');
    expect(row.mapped.donationAmount).toBe(1100);
  });

  it('empty lines never become rows', () => {
    const rows = rowsForPage({
      target: 'donors',
      lines: [line([word('   ', 0.2)])],
      profile, imgW: W, imgH: H, pageNo: 1,
      dictionaries: {},
      base: { existingMembers: [], existingHerd: [] },
      idPrefix: 'scan_test',
    });
    expect(rows.length).toBe(0);
  });

  it('a dialect-near breed earns a dictionary proposal', () => {
    const herdProfile = makeProfile({
      workspaceId: 'ws', target: 'herd', label: 'Gai khata', script: 'ben',
      columns: [
        { field: 'name', x0: 0, x1: 0.4 },
        { field: 'breed', x0: 0.4, x1: 0.7 },
        { field: 'sex', x0: 0.7, x1: 1 },
      ],
    });
    const rows = rowsForPage({
      target: 'herd',
      lines: [line([word('Kamdhenu', 0.2, 96, 94), word('Gr', 0.55, 90, 85), word('cow', 0.85, 96, 94)])],
      profile: herdProfile, imgW: W, imgH: H, pageNo: 1,
      dictionaries: { breed: ['Gir', 'Sahiwal'] },
      base: { existingMembers: [], existingHerd: [] },
      idPrefix: 'scan_herd',
    });
    expect(rows.length).toBe(1);
    expect(rows[0].cells!.breed.proposal).toBe('Gir');
    expect(rows[0].cells!.breed.cls).toBe('amber');
  });
});
