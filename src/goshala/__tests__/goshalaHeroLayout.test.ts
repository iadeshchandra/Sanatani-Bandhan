/**
 * goshalaHeroLayout.test.ts — UI/UX audit D-07 pins.
 *
 * The Goshala One hero crushed its title into a ~90px one-word-per-line
 * column on phones: a single flex row held the icon, the title block
 * and a shrink-0 Bahi-Khata button, and the button + icon took their
 * width first, leaving the title almost none. The fix follows the
 * Batch-2 header pattern: the hero stacks on small screens (title row
 * full width, button on its own line) and becomes a row again at sm+.
 *
 * The component's import chain is not jest-loadable in the node env,
 * so the pins are class contracts read from the source — the same
 * approach as orgHeaderLayout.test.ts (Batch 2).
 */
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.join(__dirname, '../GoshalaDesk.tsx'), 'utf-8');

/** The hero block: from the "Sanatani header" comment to the button close. */
function heroBlock(s: string): string {
  const start = s.indexOf('{/* Sanatani header */}');
  expect(start).toBeGreaterThan(-1);
  const end = s.indexOf('</button>', start);
  expect(end).toBeGreaterThan(start);
  return s.slice(start, end);
}

describe('goshala hero layout (D-07)', () => {
  it('the hero stacks vertically on phones and rows at sm+', () => {
    const block = heroBlock(src);
    expect(block).toContain('flex flex-col gap-3 sm:flex-row sm:items-center');
  });

  it('the title block can shrink and wrap — min-w-0, never a fixed column', () => {
    const block = heroBlock(src);
    expect(block).toContain('flex items-center gap-3 min-w-0');
    expect(block).toContain('<div className="min-w-0">');
  });

  it('the Bahi-Khata button keeps its size but yields the row on phones', () => {
    const block = heroBlock(src);
    expect(block).toContain('self-start sm:self-auto sm:ml-auto shrink-0');
    expect(block).toContain('min-h-[48px]');
  });
});
