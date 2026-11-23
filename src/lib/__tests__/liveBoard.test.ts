/**
 * liveBoard.test.ts — NEXT-LEVEL A4: the live board's pure laws.
 * =====================================================================
 * The laws these tests pin:
 *  - text is the organiser's own words: trimmed and length-capped,
 *    never scanned or rewritten; a blank note is never an entry;
 *  - the board holds at most LIVE_BOARD_CAP entries — overflow drops
 *    the oldest RESOLVED entries first, then the oldest overall, and
 *    the newest notes always survive;
 *  - resolve and remove touch exactly the named entry;
 *  - display order is the reader's order: open lost & found first,
 *    then gate notes + announcements newest-first, then resolved
 *    lost & found last (the reunions stay visible);
 *  - reads are defensive: malformed stored shapes never survive
 *    sanitiseBoard, so no surface can render one.
 */
import {
  LIVE_BOARD_CAP,
  LIVE_BOARD_TEXT_MAX,
  appendBoardEntry,
  applyBoardCap,
  boardForDisplay,
  boardHasVisible,
  cleanBoardText,
  makeBoardEntry,
  removeBoardEntry,
  resolveBoardEntry,
  sanitiseBoard,
  unresolvedBoardCount,
  type LiveBoardEntry,
} from '../liveBoard';

const entry = (p: Partial<LiveBoardEntry> & { id: string }): LiveBoardEntry => ({
  kind: 'announcement',
  text: `note ${p.id}`,
  at: 1000,
  ...p,
});

/** n entries, ids e0…e(n-1), oldest first, at = index × 1000. */
const series = (n: number, over?: (i: number) => Partial<LiveBoardEntry>): LiveBoardEntry[] =>
  Array.from({ length: n }, (_, i) => entry({ id: `e${i}`, at: i * 1000, ...(over ? over(i) : {}) }));

describe('cleanBoardText + makeBoardEntry', () => {
  it('trims the organiser’s words and caps them at the note length', () => {
    expect(cleanBoardText('  Gate 2 opens at 5 pm  ')).toBe('Gate 2 opens at 5 pm');
    const long = 'x'.repeat(LIVE_BOARD_TEXT_MAX + 50);
    expect(cleanBoardText(long)).toHaveLength(LIVE_BOARD_TEXT_MAX);
  });

  it('never scans or rewrites the words themselves', () => {
    const words = 'Call the desk — bottle found near Gate 2!!';
    expect(cleanBoardText(words)).toBe(words);
  });

  it('a blank note is never an entry', () => {
    expect(makeBoardEntry('lost', '   ', 1000, 'a')).toBeNull();
    expect(makeBoardEntry('lost', '', 1000, 'a')).toBeNull();
    expect(makeBoardEntry('gate', '  Prasad queue moved  ', 1000, 'a')).toEqual({
      id: 'a',
      kind: 'gate',
      text: 'Prasad queue moved',
      at: 1000,
    });
  });
});

describe('applyBoardCap + appendBoardEntry', () => {
  it('leaves a board at or under the cap untouched', () => {
    const b = series(LIVE_BOARD_CAP);
    expect(applyBoardCap(b)).toEqual(b);
    expect(applyBoardCap(series(3))).toHaveLength(3);
  });

  it('drops the oldest entries overall when nothing is resolved', () => {
    const b = applyBoardCap(series(LIVE_BOARD_CAP + 3));
    expect(b).toHaveLength(LIVE_BOARD_CAP);
    expect(b[0].id).toBe('e3');
    expect(b[b.length - 1].id).toBe(`e${LIVE_BOARD_CAP + 2}`);
  });

  it('drops the oldest RESOLVED entries before any open one', () => {
    // 22 entries; the two newest-but-one are resolved, the oldest are open.
    const b = applyBoardCap(
      series(LIVE_BOARD_CAP + 2, (i) => (i >= LIVE_BOARD_CAP ? { resolved: true } : {}))
    );
    expect(b).toHaveLength(LIVE_BOARD_CAP);
    // Both resolved entries left; every open entry — even the oldest — stayed.
    expect(b.some((e) => e.resolved)).toBe(false);
    expect(b[0].id).toBe('e0');
  });

  it('falls back to oldest-overall once resolved entries run out', () => {
    const b = applyBoardCap(
      series(LIVE_BOARD_CAP + 3, (i) => (i === LIVE_BOARD_CAP + 2 ? { resolved: true } : {}))
    );
    expect(b).toHaveLength(LIVE_BOARD_CAP);
    expect(b.some((e) => e.id === `e${LIVE_BOARD_CAP + 2}`)).toBe(false); // the resolved one
    expect(b[0].id).toBe('e2'); // then the two oldest open ones
  });

  it('append keeps the newest note and holds the cap', () => {
    const b = appendBoardEntry(series(LIVE_BOARD_CAP), entry({ id: 'new', at: 999999 }));
    expect(b).toHaveLength(LIVE_BOARD_CAP);
    expect(b[b.length - 1].id).toBe('new');
  });
});

describe('resolveBoardEntry + removeBoardEntry', () => {
  it('resolves exactly the named entry', () => {
    const b = resolveBoardEntry(series(3), 'e1');
    expect(b.map((e) => !!e.resolved)).toEqual([false, true, false]);
    expect(b[1].text).toBe('note e1');
  });

  it('removes exactly the named entry', () => {
    expect(removeBoardEntry(series(3), 'e1').map((e) => e.id)).toEqual(['e0', 'e2']);
    expect(removeBoardEntry(series(3), 'nope')).toHaveLength(3);
  });
});

describe('boardForDisplay — the reader’s order', () => {
  const board: LiveBoardEntry[] = [
    entry({ id: 'gate-old', kind: 'gate', at: 1000 }),
    entry({ id: 'lost-open', kind: 'lost', at: 2000 }),
    entry({ id: 'ann-new', kind: 'announcement', at: 5000 }),
    entry({ id: 'found-done', kind: 'found', at: 6000, resolved: true }),
    entry({ id: 'found-open', kind: 'found', at: 3000 }),
    entry({ id: 'lost-done', kind: 'lost', at: 4000, resolved: true }),
    entry({ id: 'gate-new', kind: 'gate', at: 7000 }),
  ];

  it('open lost & found first, then notes newest-first, then the reunions', () => {
    expect(boardForDisplay(board).map((e) => e.id)).toEqual([
      'found-open', // open lost & found, newest first
      'lost-open',
      'gate-new', // gate notes + announcements, newest first
      'ann-new',
      'gate-old',
      'found-done', // resolved lost & found stay visible, last
      'lost-done',
    ]);
  });

  it('an empty board displays empty', () => {
    expect(boardForDisplay([])).toEqual([]);
  });
});

describe('sanitiseBoard + counts — defensive reads', () => {
  it('drops malformed stored shapes', () => {
    const raw = [
      entry({ id: 'ok' }),
      { id: 'bad-kind', kind: 'notice', text: 'x', at: 1 },
      { id: 'no-text', kind: 'gate', text: '   ', at: 1 },
      { id: 'no-at', kind: 'gate', text: 'x', at: 'soon' },
      { kind: 'gate', text: 'x', at: 1 },
      'not an object',
      null,
    ];
    expect(sanitiseBoard(raw).map((e) => e.id)).toEqual(['ok']);
    expect(sanitiseBoard(undefined)).toEqual([]);
    expect(sanitiseBoard('nope')).toEqual([]);
  });

  it('keeps resolved only when it is truly set', () => {
    const [a, b] = sanitiseBoard([
      entry({ id: 'a', resolved: true }),
      { ...entry({ id: 'b' }), resolved: 'yes' },
    ]);
    expect(a.resolved).toBe(true);
    expect(b.resolved).toBeUndefined();
  });

  it('counts only unresolved entries, and knows an empty board', () => {
    const board = [
      entry({ id: 'a' }),
      entry({ id: 'b', resolved: true }),
      entry({ id: 'c', kind: 'gate' }),
    ];
    expect(unresolvedBoardCount(board)).toBe(2);
    expect(unresolvedBoardCount(undefined)).toBe(0);
    expect(boardHasVisible(board)).toBe(true);
    expect(boardHasVisible([])).toBe(false);
    expect(boardHasVisible(undefined)).toBe(false);
  });
});
