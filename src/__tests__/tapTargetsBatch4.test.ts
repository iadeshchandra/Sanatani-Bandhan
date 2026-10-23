/**
 * tapTargetsBatch4.test.ts — UI/UX audit D-12 pins (Batch 4).
 *
 * D-12: tap targets below the house 44px law on filters, chips and
 * icon buttons. The measured worst offenders (390px DOM sweeps) were
 * dominated by SHARED patterns, so the fixes land on the shared
 * components first — one bump inherited by every desk:
 *
 *   · the UI kit's small Button (36px)               → 44px
 *   · the Sidebar desk-row pin toggle (36 wide)      → 44 wide
 *   · the Sidebar domain filter pills (~23px tall)   → 44px
 *   · the Sidebar domain accordion header (~25px)    → 44px
 *   · the Sidebar search field (~30px)               → 44px
 *   · the toast dismiss button (32×32)               → 44×44
 *   · the persona rig's collapsed tab (~30px)        → 44px
 *
 * …and then on the desks the audit named: Devotees (filter tabs 30px,
 * selects 33px, view toggles 28×28), Tax Certificates (36–40px
 * actions), the Dharmic Assistant (chips at 19–27px), YatraNet (map
 * buttons 24–34px), Pooja Booking (date chips + tabs ~30px),
 * Family Households and the Utsav calendar (text buttons at 16px).
 *
 * These are source-level class contracts, in the established guard
 * style (cf. orgHeaderLayout, goshalaHeroLayout): they pin the exact
 * class strings that produce ≥44px targets so a future restyle
 * cannot silently shrink a target back below the law.
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf-8');
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe('D-12 — shared patterns meet the 44px law', () => {
  it('the UI kit small Button is 44px, not 36px', () => {
    const btn = read('src/components/common/ui/Button.tsx');
    expect(btn).toContain("sm: 'min-h-[44px]");
    expect(btn).not.toContain('min-h-[36px]');
  });

  it('the Sidebar pin toggle is 44 wide (was w-9 = 36)', () => {
    const sb = read('src/components/common/Sidebar.tsx');
    expect(sb).toContain('shrink-0 min-h-[44px] w-11');
    expect(sb).not.toContain('min-h-[44px] w-9');
  });

  it('the Sidebar domain pills, accordion header, preview switch and search all carry 44px', () => {
    const sb = read('src/components/common/Sidebar.tsx');
    // domain filter pills
    expect(sb).toContain('min-h-[44px] inline-flex items-center justify-center');
    // domain accordion header
    expect(sb).toContain('min-h-[44px] w-full flex items-center justify-between');
    // Devotee App Preview switch
    expect(sb).toContain('min-h-[44px] w-full flex items-center justify-between px-3 py-2');
    // collapsed-rail preview switch is a full 44×44
    expect(sb).toContain('w-11 h-11 rounded-xl bg-saffron-500');
    // desk search field
    expect(sb).toContain('min-h-[44px] w-full bg-temple-800/80');
  });

  it('the shared toast dismiss is a 44×44 target', () => {
    const toast = read('src/context/ToastContext.tsx');
    expect(toast).toContain('aria-label="Dismiss notification"');
    expect(toast).toContain('min-w-[44px] min-h-[44px]');
  });

  it('the persona rig collapsed tab is 44px tall', () => {
    const rig = read('src/components/dev/PersonaSwitcher.tsx');
    expect(rig).toContain('min-h-[44px] flex items-center gap-2 px-3 py-1.5 rounded-full');
  });
});

describe('D-12 — the desks the audit named', () => {
  it('Devotees: filter tabs, all three filter selects and both view toggles are 44px', () => {
    const grid = read('src/components/domain1/DevoteeGrid.tsx');
    expect(grid).toContain(
      'rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all min-h-[44px] inline-flex items-center justify-center'
    );
    expect(
      count(grid, 'rounded-xl px-2.5 py-1.5 text-xs text-temple-900 focus:outline-none min-h-[44px]')
    ).toBe(3);
    expect(count(grid, 'min-w-[44px] min-h-[44px] inline-flex items-center justify-center')).toBe(2);
  });

  it('Panchang: the SOP guide, reset, date and location controls are 44px', () => {
    const desk = read('src/components/domain3/PanchangAstrologyEngine.tsx');
    expect(count(desk, 'min-h-[44px]')).toBeGreaterThanOrEqual(4);
  });

  it('Tax Certificates: the settings, audit-pack and bulk actions are 44px', () => {
    const tax = read('src/components/domain2/TaxReceiptDesk.tsx');
    expect(count(tax, 'min-h-[44px]')).toBeGreaterThanOrEqual(3);
  });

  it('Dharmic Assistant: filter chips, action chips, suggestions, presets and the composer are 44px', () => {
    const desk = read('src/components/common/DharmicQueryAssistant.tsx');
    expect(count(desk, 'min-h-[44px]')).toBeGreaterThanOrEqual(10);
  });

  it('YatraNet: visit, scan and map buttons are 44px', () => {
    const desk = read('src/components/domain7/YatraNetDesk.tsx');
    expect(count(desk, 'min-h-[44px]')).toBeGreaterThanOrEqual(4);
  });

  it('Pooja Booking: view tabs, date chips and the scan action are 44px', () => {
    const desk = read('src/components/domain3/PoojaBookingDesk.tsx');
    expect(count(desk, 'min-h-[44px]')).toBeGreaterThanOrEqual(6);
  });

  it('Family Households: the register action is 44px', () => {
    const desk = read('src/components/domain1/FamilyHouseholdDesk.tsx');
    expect(desk).toContain('min-h-[44px]');
  });

  it('Utsav calendar: Export and View Seva Roster are real 44px targets, not 16px text', () => {
    const desk = read('src/components/domain5/VedicCalendarEventsDesk.tsx');
    expect(count(desk, 'min-h-[44px]')).toBeGreaterThanOrEqual(2);
  });

  it('Gate Check-In: Reset Camera is 44px', () => {
    const desk = read('src/components/domain1/DarshanCheckInDesk.tsx');
    expect(desk).toContain('min-h-[44px]');
  });
});
