/**
 * guide/index.ts — public surface of the app-wide Quick Guide system.
 */
export { GUIDES, getGuide, type GuideDef, type GuideStepDef, type GuideId } from './guides';
export { getGuideStatus, setGuideStatus, resetGuide, type GuideStatus } from './guideProgress';
export { useGuide, markPillOffered, type UseGuide } from './useGuide';
export { CoachMark, type CoachMarkProps } from './CoachMark';
export { TourPill, TourLink, type TourPillProps, type TourLinkProps } from './TourPill';
export { WhatsThis, SANATANI_TERMS, type SanataniTerm, type WhatsThisProps } from './WhatsThis';
