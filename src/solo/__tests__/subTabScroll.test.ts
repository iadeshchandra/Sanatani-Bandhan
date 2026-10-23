/**
 * solo/__tests__/subTabScroll.test.ts — U8c active-pill reveal math.
 * =============================================================
 * The sub-tab strip is a deliberate horizontal scroller; the defect
 * was only that the SELECTED pill could rest clipped at the edge.
 * pillRevealScrollLeft computes the smallest horizontal move that
 * leaves the active pill fully visible, and no move at all when it
 * already fits.
 */
import { pillRevealScrollLeft } from '../subTabScroll';

describe('pillRevealScrollLeft', () => {
  it('leaves scroll untouched when the pill is already fully visible', () => {
    expect(pillRevealScrollLeft(40, { left: 0, right: 360 }, { left: 60, right: 200 })).toBe(40);
  });

  it('treats a pill flush with the row edges as fully visible', () => {
    expect(pillRevealScrollLeft(0, { left: 0, right: 360 }, { left: 0, right: 360 })).toBe(0);
  });

  it('scrolls right by the overflow plus pad when the pill clips the right edge', () => {
    // Pill runs 300→420 in a 360-wide row: 60 hidden, plus 8px breathing pad.
    expect(pillRevealScrollLeft(0, { left: 0, right: 360 }, { left: 300, right: 420 })).toBe(68);
  });

  it('scrolls left when the pill clips the left edge (the U8c shot: strip pre-scrolled)', () => {
    // Row has been scrolled 120px; the active pill sits 40px off the left.
    expect(pillRevealScrollLeft(120, { left: 0, right: 360 }, { left: -40, right: 90 })).toBe(72);
  });

  it('never scrolls to a negative position', () => {
    expect(pillRevealScrollLeft(10, { left: 0, right: 360 }, { left: -30, right: 80 })).toBe(0);
  });

  it('honours a custom pad', () => {
    expect(pillRevealScrollLeft(0, { left: 0, right: 360 }, { left: 300, right: 420 }, 0)).toBe(60);
  });
});
