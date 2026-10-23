/**
 * guide/__tests__/coachMarkMedia.contract.test.ts — U8a media contract.
 * =============================================================
 * Owner screenshot (2026-10-23) seemed to show a broken image inside
 * the Seva Wallet tour card. Source truth at the exact live commit
 * (verified blob-for-blob against HEAD): the Quick Guide system has
 * NO image anywhere — GuideStepDef carries text keys and a DOM anchor
 * only, and CoachMark renders native UI (step label, title, body,
 * dots, buttons). There is no tour asset that could fail to load, so
 * a tour can never show the browser's broken-image glyph. (The donut
 * ring in the owner's shot is not produced by any component in the
 * tour's render tree — see the U8 batch notes.)
 *
 * These pins keep it that way: if a future change adds step media,
 * it must arrive WITH a fallback treatment in the same change and
 * update this contract deliberately — never by silently breaking it.
 */
import * as fs from 'fs';
import * as path from 'path';

const GUIDE_DIR = path.join(__dirname, '..');

function read(name: string): string {
  return fs.readFileSync(path.join(GUIDE_DIR, name), 'utf-8');
}

describe('U8a: the tour renders no loadable image — nothing can break', () => {
  it('CoachMark contains no <img> element', () => {
    expect(read('CoachMark.tsx')).not.toMatch(/<img[\s>]/);
  });

  it('TourPill contains no <img> element', () => {
    expect(read('TourPill.tsx')).not.toMatch(/<img[\s>]/);
  });

  it('CoachMark references no image asset (no raster/vector file paths)', () => {
    const src = read('CoachMark.tsx');
    expect(src).not.toMatch(/\.(png|jpe?g|webp|gif|svg)['")\s]/);
  });

  it('GuideStepDef stays text-only: anchor + title/body keys, no media field', () => {
    const src = read('guides.ts');
    const start = src.indexOf('export interface GuideStepDef');
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, src.indexOf('}', start));
    expect(block).toContain('titleKey');
    expect(block).toContain('bodyKey');
    expect(block).not.toMatch(/image|media|photo|icon|src/i);
  });
});
