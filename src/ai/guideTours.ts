/**
 * ai/guideTours.ts — the ONE join between the assistant's module guides
 * and the interactive tour registry.
 * =====================================================================
 * Two different "guide" systems exist in this app, with DISJOINT id
 * spaces:
 *
 *   · Module guides (src/lib/moduleGuides.ts) — human-authored TEXT
 *     guides for desks (treasury, panjika, wallet…). The assistant's
 *     howto executor renders one inline as an answer.
 *   · Tours (src/components/guide/guides.ts) — interactive CoachMark
 *     step tours over the Solo shell (sos, wallet, p2p…). The sheet's
 *     "Open guide →" button launches one.
 *
 * WORLD-READY FIX (Exhibit 2, 2026-10-24): the howto executor used to
 * emit an `openGuide` action carrying the MODULE-guide id for every
 * guide. The sheet resolved it against the TOUR registry, where almost
 * no module id exists — so nearly every "Open guide →" tap landed on
 * the "that guide is still being written" dead end. A text guide is a
 * complete answer on its own; a tour button may be offered ONLY where
 * a tour genuinely covers the same topic.
 *
 * This module is the single explicit mapping. It is deliberately
 * conservative: a stretched mapping that opens the WRONG tour is worse
 * than no button. Every mapping is verified against the live tour
 * registry at runtime (getGuide), so registry drift can never
 * resurrect the dead end — an unresolvable mapping yields null and the
 * executor simply offers no action.
 */
import { getGuide } from '../components/guide/guides';

/** Module-guide id (or id prefix) → tour id, where a real twin exists. */
const MODULE_GUIDE_TOURS: ReadonlyArray<readonly [string, string]> = [
  // The Seva Wallet text guide and the wallet tour cover the same ground.
  ['wallet', 'wallet'],
  // The five P2P text guides (p2p-wallet, p2p-requests, p2p-lifecycle,
  // p2p-qr, p2p-safety) all walk the same P2P surface the 'p2p' tour
  // steps through.
  ['p2p-', 'p2p'],
];

/**
 * The tour id a module guide may offer as its "Open guide →" action,
 * or null when no tour genuinely covers it (the common case — the
 * inline text guide is then the whole answer).
 */
export function tourIdForModuleGuide(moduleGuideId: string): string | null {
  if (!moduleGuideId) return null;
  for (const [key, tourId] of MODULE_GUIDE_TOURS) {
    const matches = key.endsWith('-')
      ? moduleGuideId.startsWith(key)
      : moduleGuideId === key;
    if (matches && getGuide(tourId)) return tourId;
  }
  return null;
}
