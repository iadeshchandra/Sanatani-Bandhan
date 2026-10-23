/**
 * solo/subTabScroll.ts — keep the active sub-tab pill fully visible.
 * =============================================================
 * The Solo sub-tab strip (HomeSubTabBar) is a deliberate horizontal
 * scroller: thirteen sections can never fit a 360px phone, so pills
 * scroll sideways and a pill straddling the edge is the scroll
 * affordance. U8c (owner screenshot, 2026-10-23): the strip keeps its
 * scroll position across sub-tab navigation (it lives in the sticky
 * header), so the SELECTED pill — "🪔 Seva Wallet" in the shot — could
 * come to rest clipped mid-label at the edge ("Seva V…"). A clipped
 * neighbour is fine; the pill for the page you are standing on must
 * always be whole.
 *
 * This pure helper computes the row's target scrollLeft so the active
 * pill sits fully inside the row's viewport (with a small breathing
 * pad). It only ever moves the strip horizontally — never the page.
 */

export interface HorizontalRect {
  left: number;
  right: number;
}

/**
 * Target scrollLeft for `row` so `pill` is fully visible.
 * Returns `currentScrollLeft` unchanged when the pill already fits.
 * Never returns a negative scroll position.
 */
export function pillRevealScrollLeft(
  currentScrollLeft: number,
  rowRect: HorizontalRect,
  pillRect: HorizontalRect,
  pad = 8
): number {
  if (pillRect.left >= rowRect.left && pillRect.right <= rowRect.right) {
    return currentScrollLeft;
  }
  if (pillRect.left < rowRect.left) {
    return Math.max(0, currentScrollLeft - (rowRect.left - pillRect.left) - pad);
  }
  return currentScrollLeft + (pillRect.right - rowRect.right) + pad;
}
