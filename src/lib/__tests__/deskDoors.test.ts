/**
 * deskDoors.test.ts — UI/UX audit D-06 pins.
 *
 * Bahi-Khata Seva is a headline feature that lived ONLY as a panel
 * inside the Treasury desk: no catalog row, no sidebar door — users
 * (and the audit) could not find it as a destination. The fix gives it
 * a real door in the Sidebar directory WITHOUT resurrecting the #57
 * trap: alias rows in MODULE_CATALOG become App Store shelf cards
 * whose install succeeds and whose mount blocks ("one desk, one
 * canonical row"). So:
 *
 *  - the door lives in DESK_DOORS (deskDoors.ts), never in the catalog;
 *  - its visibility IS its target desk's visibility (the Sidebar's
 *    filtered list decides — taxonomy + isDeskVisibleForRole + pill +
 *    search — with no second permission decision);
 *  - activation rides 'sanatani:navigate' (detail { module: target })
 *    with a consume-once panel request the desk picks up on mount,
 *    plus a live event for the already-mounted case;
 *  - the Treasury desk honours its own Auditor exclusion for the
 *    panel (the hero door hides for Auditor; the auto-open does too).
 *
 * Component import chains are not jest-loadable in the node env (the
 * orgHeaderLayout constraint), so Sidebar/Treasury pins are source
 * contracts; the door data + panel store are pure and tested directly.
 */
import * as fs from 'fs';
import * as path from 'path';
import { DESK_DOORS, doorById, doorsForVisibleDesks, doorMatchesSearch } from '../deskDoors';
import {
  requestDeskPanel,
  consumeDeskPanel,
  peekDeskPanel,
  clearDeskPanel,
  openDeskPanel,
} from '../deskPanel';

const root = path.resolve(__dirname, '..', '..', '..');
const sidebarSrc = fs.readFileSync(path.join(root, 'src/components/common/Sidebar.tsx'), 'utf-8');
const treasurySrc = fs.readFileSync(
  path.join(root, 'src/components/domain2/TreasuryLedgerDesk.tsx'),
  'utf-8',
);

/** The MODULE_CATALOG array block in Sidebar.tsx. */
function catalogBlock(src: string): string {
  const start = src.indexOf('export const MODULE_CATALOG');
  const end = src.indexOf('\n];', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('D-06 — the Bahi-Khata door (deskDoors)', () => {
  it('defines exactly the Bahi-Khata door → Treasury desk, bahikhata panel', () => {
    expect(DESK_DOORS).toHaveLength(1);
    const door = doorById('bahikhata');
    expect(door).toBeDefined();
    expect(door!.name).toBe('Bahi-Khata Seva');
    expect(door!.targetDesk).toBe('treasury');
    expect(door!.panel).toBe('bahikhata');
  });

  it('the door id is NOT a MODULE_CATALOG row (the #57 one-desk-one-row law)', () => {
    const block = catalogBlock(sidebarSrc);
    expect(block).not.toMatch(/\{\s*id:\s*'bahikhata'/);
    // …while the target desk IS a canonical catalog row.
    expect(block).toMatch(/\{\s*id:\s*'treasury',\s*name:\s*'Treasury & Expense Ledger',\s*domain:\s*2/);
  });

  it('visibility: the door appears iff the Treasury desk is in the visible set', () => {
    expect(doorsForVisibleDesks(['dashboard', 'treasury', 'devotees']).map((d) => d.id)).toEqual([
      'bahikhata',
    ]);
    expect(doorsForVisibleDesks(['dashboard', 'devotees'])).toEqual([]);
    expect(doorsForVisibleDesks([])).toEqual([]);
  });

  it('search: the door matches its own name, id, target and register aliases', () => {
    const door = DESK_DOORS[0];
    expect(doorMatchesSearch(door, '')).toBe(true);
    expect(doorMatchesSearch(door, 'bahi')).toBe(true);
    expect(doorMatchesSearch(door, 'register')).toBe(true);
    expect(doorMatchesSearch(door, 'বহিখাতা')).toBe(true);
    expect(doorMatchesSearch(door, 'treasury')).toBe(true);
    expect(doorMatchesSearch(door, 'jyotish')).toBe(false);
  });
});

describe('D-06 — the panel request store (deskPanel)', () => {
  beforeEach(() => clearDeskPanel());

  it('a request is consumed exactly once, by its own desk only', () => {
    requestDeskPanel('treasury', 'bahikhata');
    expect(peekDeskPanel()).toEqual({ desk: 'treasury', panel: 'bahikhata' });
    expect(consumeDeskPanel('devotees')).toBeNull();
    expect(peekDeskPanel()).not.toBeNull(); // a wrong desk must not eat it
    expect(consumeDeskPanel('treasury')).toBe('bahikhata');
    expect(consumeDeskPanel('treasury')).toBeNull(); // consume-once
  });

  it('openDeskPanel records the request for the navigate target', () => {
    openDeskPanel('treasury', 'bahikhata');
    expect(consumeDeskPanel('treasury')).toBe('bahikhata');
  });

  it('openDeskPanel rides the sanatani:navigate contract (source pin)', () => {
    const src = fs.readFileSync(path.join(root, 'src/lib/deskPanel.ts'), 'utf-8');
    expect(src).toContain("export const NAVIGATE_EVENT = 'sanatani:navigate'");
    expect(src).toContain('dispatch(NAVIGATE_EVENT, { module: desk })');
    expect(src).toContain("export const DESK_PANEL_EVENT = 'sanatani:desk-panel'");
  });
});

describe('D-06 — Sidebar wiring (source contracts)', () => {
  it('renders doors from the door list, spliced after their target desk', () => {
    expect(sidebarSrc).toContain("from '../../lib/deskDoors'");
    expect(sidebarSrc).toContain('doorsForVisibleDesks');
    expect(sidebarSrc).toContain('withDoors');
  });

  it('selecting a door never selects the door id as a module', () => {
    expect(sidebarSrc).toContain("from '../../lib/deskPanel'");
    expect(sidebarSrc).toContain('openDeskPanel(door.targetDesk, door.panel)');
    // The door branch sits in the select handler before the generic path.
    const handler = sidebarSrc.slice(sidebarSrc.indexOf('const handleSelectModule'));
    expect(handler.indexOf('doorById(id)')).toBeGreaterThan(-1);
    expect(handler.indexOf('doorById(id)')).toBeLessThan(handler.indexOf('onSelectModule(id)'));
  });

  it('a plan-locked target keeps its lock for the door (same upsell)', () => {
    const handler = sidebarSrc.slice(sidebarSrc.indexOf('const handleSelectModule'));
    expect(handler).toContain('lockedModuleIds.has(door.targetDesk)');
  });

  it('door rows render without a pin toggle (a door is not a pinnable desk)', () => {
    expect(sidebarSrc).toContain('onTogglePin={doorById(item.id) ? undefined : handleTogglePin}');
  });
});

describe('D-06 — Treasury panel wiring (source contracts)', () => {
  it('consumes the pending panel request on mount and listens while mounted', () => {
    expect(treasurySrc).toContain("from '../../lib/deskPanel'");
    expect(treasurySrc).toContain("consumeDeskPanel('treasury')");
    expect(treasurySrc).toContain('DESK_PANEL_EVENT');
  });

  it('auto-open honours the desk’s own Auditor exclusion for the panel', () => {
    const fn = treasurySrc.slice(treasurySrc.indexOf('openBahiKhataFromDoor'));
    expect(fn).toContain("effectiveRole !== 'Auditor'");
    expect(fn).toContain('setShowBahiKhata(true)');
  });
});
