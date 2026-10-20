/**
 * paletteDiscoverability.test.ts — QUEUED #48 palette pins.
 *
 * The command palette scores catalog name/id/domainTitle + keywords.
 * The live audit found: "shishya" and "attendance" found NOTHING for a
 * Gurukul, and "resident" found no Ashram residents surface. These pins
 * keep the catalog entries discoverable under the words users type.
 *
 * The catalog lives in Sidebar.tsx, whose component import chain is not
 * jest-loadable (ESM context imports) — so the pins read the catalog
 * entries from source. What is pinned is the user-visible contract:
 * entry id → display name + search keywords.
 */
import * as fs from 'fs';
import * as path from 'path';

const sidebarSource = fs.readFileSync(
  path.join(__dirname, '../../components/common/Sidebar.tsx'),
  'utf-8',
);

function entryLine(id: string): string {
  const line = sidebarSource
    .split('\n')
    .find((l) => l.includes(`{ id: '${id}',`));
  if (!line) throw new Error(`catalog entry missing: ${id}`);
  return line;
}

describe('palette discoverability (QUEUED #48)', () => {
  it('"shishya" finds the Gurukul desk — named Shishya Registry, keyworded', () => {
    const line = entryLine('gurukul');
    expect(line).toMatch(/Shishya Registry/);
    expect(line).toMatch(/keywords: '[^']*shishya/);
  });

  it('"attendance" / "upasthiti" find Pathshala One (home of the attendance tab)', () => {
    const line = entryLine('pathshala');
    expect(line).toMatch(/keywords: '[^']*attendance/);
    expect(line).toMatch(/keywords: '[^']*upasthiti/);
  });

  it('"resident" finds the Ashram residents surfaces', () => {
    expect(entryLine('ashramKutir')).toMatch(/Residents/);
    expect(entryLine('ashramKutir')).toMatch(/keywords: '[^']*residents/);
    expect(entryLine('ashram-one')).toMatch(/keywords: '[^']*residents/);
  });

  it('"shakha" / "mobilization" find the Sangha desk', () => {
    const line = entryLine('sanghaDrills');
    expect(line).toMatch(/keywords: '[^']*shakha/);
    expect(line).toMatch(/keywords: '[^']*mobilization/);
  });
});
