/**
 * wave2KitAndMoneyGuard.test.ts — Design Elevation Wave 2 pins
 * (Audit 2 findings #1 and #5).
 *
 * #1 — the house kit (src/components/common/ui) was built in E2 but
 * almost nobody used it: desks hand-rolled private button dialects
 * (the marketplace's local `btnP`/`btnG` constants were the named
 * specimen). Wave 2 adopted the kit on Treasury, BahiKhata and the
 * marketplace. This guard keeps the three surfaces on the kit: no
 * local `const btn*` class constants may return, and each surface
 * must import from the kit.
 *
 * #5 — money spoke in a terminal's voice: `font-mono` carried money
 * figures across the counting/asset/procurement desks. Wave 2 moved
 * every monetary figure to the shared <Money> component (or `.tnum`
 * for non-money figures) and pinned what remains: `font-mono` may
 * survive ONLY on true identifiers — registration/seal/PIN codes,
 * asset tags, PO/GRN/challan numbers, treasury references, receipt /
 * voucher IDs and vocabulary code chips. The counts below are the
 * measured identifier-only remainders; raising one requires the new
 * occurrence to be a genuine identifier, named in the batch notes.
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf-8');
const monoCount = (src: string) => (src.match(/font-mono/g) || []).length;

const TREASURY = 'src/components/domain2/TreasuryLedgerDesk.tsx';
const BAHI = 'src/bahikhata/BahiKhataDesk.tsx';
const MARKET = 'src/marketplace/ClientMarketplace.tsx';

describe('Wave 2 #1 — kit adoption stays adopted', () => {
  it.each([
    ['TreasuryLedgerDesk', TREASURY],
    ['BahiKhataDesk', BAHI],
    ['ClientMarketplace', MARKET],
  ])('%s imports the house kit and defines no local btn* constants', (_name, rel) => {
    const src = read(rel);
    expect(src).toMatch(/from '[^']*common\/ui'/);
    expect(src).not.toMatch(/const btn\w*\s*=/);
    expect(src).not.toContain('btnP');
    expect(src).not.toContain('btnG');
  });
});

describe('Wave 2 #5 — font-mono is identifier-only on the adopted desks', () => {
  it.each([
    // [surface, path, identifier-only remainder]
    ['HundiCountingAuditDesk', 'src/components/domain2/HundiCountingAuditDesk.tsx', 7],
    ['RatnaBhandarAssetDesk', 'src/components/domain2/RatnaBhandarAssetDesk.tsx', 6],
    ['SmartBhandarProcurementDesk', 'src/components/domain4/SmartBhandarProcurementDesk.tsx', 9],
    ['TreasuryLedgerDesk', TREASURY, 2],
  ])('%s keeps font-mono at or below its identifier-only remainder (%i)', (_name, rel, pin) => {
    const src = read(rel);
    expect(monoCount(src)).toBeLessThanOrEqual(pin as number);
    // …and its money figures ride the shared component.
    expect(src).toContain("from '../common/Money'");
    expect(src).toContain('<Money');
  });

  it('the shared Money component exists, formats via lib/money, and renders .tnum', () => {
    const money = read('src/components/common/Money.tsx');
    expect(money).toContain("from '../../lib/money'");
    expect(money).toContain('formatMoney');
    expect(money).toContain('tnum');
  });
});
