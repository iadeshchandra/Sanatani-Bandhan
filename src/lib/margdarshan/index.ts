/**
 * margdarshan — the Margdarshan knowledge layer (J0 foundations).
 * DeskPage model + builder + resolver over the existing locator map
 * and module guide library. No UI, no routes in J0 (see types.ts).
 */
export type { DeskPage, DeskPageKind, ResolvedDeskPage } from './types';
export {
  buildDeskPages,
  deriveDomainTitles,
  DESK_PAGES,
  getDeskPage,
  pagesByDomain,
  resolveDeskPage,
} from './deskPages';
/* J1 — the manual layer: authored entries, the guide↔desk join
 * table, the full desk-page resolver, the atlas model, the wings. */
export type { ManualEntry, ResolvedManualPage } from './manualTypes';
export { GUIDE_JOINS, JOINED_TOPIC_ALIASES, JOINED_GUIDE_BY_DESK_SLUG } from './joins';
export {
  MANUAL_ENTRIES,
  MANUAL_PAGES,
  getManualEntry,
  getManualPage,
  effectiveGuideId,
  resolveManualPage,
  buildAtlas,
  WINGS,
  searchManual,
  STARTER_SLUGS,
  type AtlasDomain,
  type AtlasEntry,
  type Wing,
  type WingState,
} from './manual';
