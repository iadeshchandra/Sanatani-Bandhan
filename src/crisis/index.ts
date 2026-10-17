/**
 * Crisis Command — Phase 2 (command dashboard) public surface.
 *
 * Entry point: <CrisisDashboard /> — wire into the org shell for
 * Trustee / Crisis Coordinator roles (e.g. a desk tab or route).
 *
 * Phase 1 note: this module defines its own contract-compatible types in
 * crisisCommandTypes.ts so it builds standalone. If Phase 1 ships
 * src/crisis/types.ts + sosService.ts, swap the import source of
 * CrisisEvent/CrisisResponse (fields are identical by contract).
 */
export { CrisisDashboard } from './CrisisDashboard';
export { CrisisMap } from './CrisisMap';
export { TriageView } from './TriageView';
export { HistoryView } from './HistoryView';
export { CrisisDetailDrawer } from './CrisisDetailDrawer';
export { CoordinatorManage } from './CoordinatorManage';
export { useCrisisAccess, coordinatorDocId } from './crisisAccess';
export { useCrisisT } from './crisisI18n';
export {
  triageScore,
  minutesWaiting,
  severityWeight,
  distanceM,
  checkCrowdDensity,
} from './crisisIntelligence';
export {
  acknowledgeEvent,
  assignSevadars,
  broadcastAlert,
  buildEscalateLinks,
  resolveEvent,
  setResponseStatus,
  addCoordinator,
  removeCoordinator,
} from './crisisActions';
export type {
  CrisisEvent,
  CrisisResponse,
  CrisisCoordinator,
  CrisisSituation,
  CrisisStatus,
  CrisisSeverity,
  CrisisAccess,
  CrisisAccessLevel,
} from './crisisCommandTypes';
export { tsToMs, isActiveEvent } from './crisisCommandTypes';
export type { Actor } from './crisisActions';

/* Phase 4 — polish, guides, calm Suchana (warm, safety-not-scary). */
export { CrisisGuide, hasSeenCrisisGuide, markCrisisGuideSeen, resetCrisisGuide } from './CrisisGuide';
export { CrisisStatusPill } from './CrisisStatusPill';
export { CrisisSkeletonCard, CrisisSkeletonList, CrisisSkeletonStats } from './CrisisSkeleton';
export { CrisisEmptyState } from './CrisisEmptyState';
export {
  CRISIS_GUIDES,
  CRISIS_GUIDE_ICONS,
  crisisGuideIds,
  ensureCrisisGuidesRegistered,
} from './crisisGuides';
export { buildCrisisSuchana, safetyCircleReadyCard, safetyCircleNudgeCard, coordinatorReadyCard } from './crisisSuchana';
export type { CrisisSuchanaInput } from './crisisSuchana';
export { CRISIS_COLORS, CRISIS_STATUS_META, CRISIS_CARD_CLASS, CRISIS_TOUCH_MIN, normalizeCrisisStatus } from './crisisTheme';

/* ------------------------------------------------------------------ */
/* Phase 3 — history & management                                      */
/* ------------------------------------------------------------------ */
export { PersonalHistory } from './PersonalHistory';
export { OrgHistory } from './OrgHistory';
export { FamilySafety } from './FamilySafety';
export { EventHistoryCard } from './EventHistoryCard';
export {
  getMySentSOS,
  getMySentSOSWithResponses,
  getEventResponses,
  getMyResponses,
  getOrgEvents,
  firstAckSec,
  resolveSec,
  responseAnalytics,
  exportIncident,
  printIncidentReport,
  getFamilyLinks,
  lookupProfileBySanIdOrPhone,
  sendFamilyInvite,
  acceptFamilyInvite,
  declineFamilyInvite,
  revokeFamilyLink,
  getConsentedMemberEvents,
} from './historyService';
export type {
  OrgEventFilters,
  ResponseAnalytics,
  IncidentReport,
  FamilyLinkRecord,
  LinkedProfile,
} from './historyService';
export {
  situationLabel,
  statusLabel,
  statusPillClass,
  formatWhen,
  formatDuration,
} from './crisisFormat';
