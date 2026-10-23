/**
 * orgHeaderLayout.test.ts — UIUX Batch 2 pins for D-03 + U3.
 *
 * The org phone header overlapped itself: the breadcrumb root was a
 * shrink-0 button whose label could never truncate, so at 390px the
 * Ask pill covered ~76px of it and the role chip was pushed half off
 * the right edge (owner's Bangla-UI screenshots, audit U3). The shell
 * component's import chain is not jest-loadable in the node env (same
 * constraint as orgChrome61), so the pins are class contracts read
 * from the source — exactly the layout facts the audit measured:
 *
 *  - the crumb root can shrink (no shrink-0) and its label truncates;
 *  - the nav itself is a flex-1 min-w-0 row, so the centre yields;
 *  - the role chip can shrink and truncates instead of clipping;
 *  - Ask keeps its full ≥44px tappable box (the fix must not shrink
 *    the pill that caused the overlap by covering others);
 *  - the root label comes from the language dictionaries
 *    (getModuleName over suites.seva.catalog), never the hard-coded
 *    English catalog string, and the hover title uses it too.
 */
import * as fs from 'fs';
import * as path from 'path';

const shell = fs.readFileSync(path.join(__dirname, '../OrgSpaceShell.tsx'), 'utf-8');

/** The breadcrumb root <button>…</button> block. */
function rootButtonBlock(src: string): string {
  const start = src.indexOf('onClick={goCommandCenter}');
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('</button>', start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('org header layout (D-03/U3)', () => {
  it('the breadcrumb root button can shrink — no shrink-0 on it', () => {
    const block = rootButtonBlock(shell);
    expect(block).not.toContain('shrink-0');
    expect(block).toContain('min-w-0');
    expect(block).toContain('min-h-[44px]');
  });

  it('the root label truncates with an ellipsis instead of sliding under Ask', () => {
    const block = rootButtonBlock(shell);
    expect(block).toContain('<span className="truncate">{commandCenterLabel}</span>');
  });

  it('the breadcrumb nav is a flexible min-w-0 row', () => {
    expect(shell).toContain('className="flex items-center flex-1 min-w-0 text-xs font-medium"');
  });

  it('the role chip can shrink and truncates — it can never be pushed off the edge', () => {
    const chipStart = shell.indexOf('title={`Your role in ${orgName}: ${displayRole}`}');
    expect(chipStart).toBeGreaterThan(-1);
    const chipClass = shell.slice(Math.max(0, chipStart - 220), chipStart);
    expect(chipClass).toContain('max-w-[26vw]');
    expect(chipClass).toContain('truncate');
    expect(chipClass).toContain('min-w-0');
    expect(chipClass).not.toContain('shrink-0 inline-flex');
  });

  it('Ask keeps its full ≥44px tappable box', () => {
    expect(shell).toContain('min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-amber-500/90');
  });

  it('the root label resolves through the language dictionaries', () => {
    expect(shell).toContain("getModuleName('dashboard', currentLang)");
    expect(shell).toContain('title={`${orgName} — ${commandCenterLabel}`}');
    expect(shell).not.toContain('title={`${orgName} — Command Center`}');
  });

  it('the desk segment resolves through the same dictionary catalog', () => {
    expect(shell).toContain('getModuleName(deskId, currentLang)');
  });
});
