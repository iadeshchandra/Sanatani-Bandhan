/**
 * deskCountGuard.test.ts — UI/UX audit D-08 pins.
 *
 * One build told three stories about its own size: the social-share
 * description said "49 desks", the landing page said 66 (four times),
 * and the canonical MODULE_CATALOG holds 72. Counts are the kind of
 * detail a buyer notices.
 *
 * The canonical truth is the catalog in Sidebar.tsx. This guard parses
 * the catalog rows from source (the Sidebar import chain is not
 * jest-loadable in the node env — the orgHeaderLayout constraint) and
 * asserts every user-facing number agrees with it:
 *
 *  - index.html (the og:description everyone shares),
 *  - LandingPage.tsx (JSON-LD line, the stat pair, the prose line,
 *    the footer link),
 *  - README.md (the GitHub face of the product).
 *
 * The AI-discoverability fact set (public/ai-facts.json, llms.txt,
 * llms-full.txt) states no desk count today; the last test keeps it
 * that way unless the count there is added THROUGH this guard.
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..');
const sidebar = fs.readFileSync(path.join(root, 'src/components/common/Sidebar.tsx'), 'utf-8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
const landing = fs.readFileSync(path.join(root, 'src/pages/LandingPage.tsx'), 'utf-8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf-8');

/** Catalog rows: one per `{ id: '…', …, domain: N, …}` line in MODULE_CATALOG. */
function catalogRows(src: string): { id: string; domain: number }[] {
  const start = src.indexOf('export const MODULE_CATALOG');
  const end = src.indexOf('\n];', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const rows: { id: string; domain: number }[] = [];
  for (const line of src.slice(start, end).split('\n')) {
    const m = line.match(/\{\s*id:\s*'([^']+)'.*domain:\s*(\d+)/);
    if (m) rows.push({ id: m[1], domain: parseInt(m[2], 10) });
  }
  return rows;
}

const rows = catalogRows(sidebar);
const DESK_COUNT = rows.length;
const DOMAIN_COUNT = new Set(rows.map((r) => r.domain)).size;

/** Every "<n> desks" number in a text. */
function deskNumbers(text: string): number[] {
  return [...text.matchAll(/(\d+)\s*desks/gi)].map((m) => parseInt(m[1], 10));
}

describe('D-08 — one desk count, from the catalog', () => {
  it('the catalog itself is the pinned truth (72 desks, 7 domains)', () => {
    // If the catalog legitimately grows/shrinks, update this pin AND
    // every surface below in the same commit — that is the discipline
    // this guard exists to enforce.
    expect(DESK_COUNT).toBe(72);
    expect(DOMAIN_COUNT).toBe(7);
    expect(new Set(rows.map((r) => r.id)).size).toBe(DESK_COUNT); // no duplicate ids
  });

  it('index.html states the catalog count (and no other)', () => {
    expect(indexHtml).toContain(`${DESK_COUNT} desks`);
    expect(deskNumbers(indexHtml).every((n) => n === DESK_COUNT)).toBe(true);
  });

  it('LandingPage states the catalog count everywhere it counts desks', () => {
    expect(landing).toContain(`, ${DESK_COUNT} desks,`);
    expect(landing).toContain(`All ${DESK_COUNT} desks`);
    expect(deskNumbers(landing).every((n) => n === DESK_COUNT)).toBe(true);
    // The stat pair: ['72', 'Desks across 7 domains'] — number + domain count.
    expect(landing).toContain(`'${DESK_COUNT}', 'Desks across ${DOMAIN_COUNT} domains'`);
    // The spelled-out prose line follows the same truth.
    expect(landing).toContain('Seventy-two desks');
    expect(landing).not.toContain('Sixty-six');
  });

  it('README states the catalog count', () => {
    expect(deskNumbers(readme).every((n) => n === DESK_COUNT)).toBe(true);
    expect(readme).toContain(`${DESK_COUNT} desks`);
  });

  it('the AI fact set states no desk count (add one only through this guard)', () => {
    for (const f of ['public/ai-facts.json', 'public/llms.txt', 'public/llms-full.txt']) {
      const text = fs.readFileSync(path.join(root, f), 'utf-8');
      expect(deskNumbers(text)).toEqual([]);
    }
  });
});
