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
