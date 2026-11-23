/**
 * panicButtonSurfaced.test.ts — SOS IS SURFACED (owner decision
 * 2026-11-24, closing Test #2 finding F5).
 * =====================================================================
 * The law: the SOS button is ALWAYS VISIBLE in Personal — the full
 * 72px panic button is its only face. There is no collapsed mini, no
 * "Show SOS button" reveal, no auto-collapse. The accident
 * protection is the flow's own guards, which this pin also holds in
 * place: the 1.5s press-and-hold (release cancels) and SOSFlow's
 * SituationPicker + Confirm steps.
 *
 * Source-contract pins (the codebase's pattern — the component's
 * import chain is not jest-loadable in the node env).
 */
import * as fs from 'fs';
import * as path from 'path';

const CRISIS = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(CRISIS, rel), 'utf-8');

describe('PanicButton — always surfaced', () => {
  const src = read('PanicButton.tsx');

  it('has no collapse machinery left', () => {
    for (const dead of [
      'setCollapsed',
      'MINI_SIZE',
      'COLLAPSE_IDLE_MS',
      'panicExpand',
      'panicCollapse',
      'aria-expanded',
      'onScroll',
      'pokeIdle',
    ]) {
      expect(src).not.toContain(dead);
    }
  });

  it('renders the full 72px button with the SOS guide anchor', () => {
    expect(src).toContain('const SIZE = 72');
    expect(src).toContain('width: SIZE, height: SIZE');
    expect(src).toContain('data-guide-anchor="sos-button"');
    expect(src).toContain('crisisCopy.panicLabel');
  });

  it('publishes the expanded clearance for its whole mounted life', () => {
    expect(src).toContain('document.body.classList.add(SOS_OPEN_CLASS)');
    expect(src).not.toContain('classList.toggle(SOS_OPEN_CLASS');
  });

  it('keeps the hold guard exactly: 1.5s, release cancels', () => {
    expect(src).toContain('const HOLD_MS = 1500');
    expect(src).toContain('onPointerDown={startHold}');
    expect(src).toContain('onPointerUp={clear}');
    expect(src).toContain('onPointerLeave={clear}');
    expect(src).toContain('onPointerCancel={clear}');
  });

  it('keeps a 44px hit area on the one small control (hint dismiss)', () => {
    expect(src).toContain('min-w-[44px] min-h-[44px]');
    expect(src).not.toContain('min-w-[28px]');
    expect(src).not.toContain('min-w-[32px]');
  });
});

describe('crisisStrings — the reveal labels are retired', () => {
  it('carries no "Show/Hide SOS button" strings', () => {
    const src = read('crisisStrings.ts');
    expect(src).not.toContain('panicExpand');
    expect(src).not.toContain('panicCollapse');
    expect(src).not.toContain('Show SOS button');
  });
});

describe('SOSFlow — the doors behind the button are untouched', () => {
  it('still mounts PanicButton at idle and the tour pill beside it', () => {
    const src = read('SOSFlow.tsx');
    expect(src).toContain("{step === 'idle' && <PanicButton");
    expect(src).toContain('<TourPill');
    expect(src).toContain('<SituationPicker');
    expect(src).toContain('<SOSConfirm');
  });
});
