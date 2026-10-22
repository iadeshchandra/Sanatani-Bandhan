/**
 * Sanatani Bandhan — AI Assistant Phase 0 · task registry
 * =====================================================================
 * One executor per intent. Executors are pure functions of TaskCtx —
 * they never touch UI, and they read only the asker's own data
 * (device-local stores or the user's authenticated SDK reads).
 */
import type { IntentId, TaskExecutor } from '../types';
import { navigateTask } from './navigate';
import { howtoTask } from './howto';
import { tithiTodayTask } from './tithi_today';
import { festivalNextTask } from './festival_next';
import { danaHelpTask } from './dana_help';
import { sadhanaSummaryTask } from './sadhana_summary';
import { bookingHelpTask } from './booking_help';
import { languageHelpTask } from './language_help';
import { sosHelpTask } from './sos_help';
import { voiceUpgradeTask } from './voice_upgrade';
import { dharmaQuestionTask } from './dharma_question';
import { navigationQuestionTask } from './navigation';
import { orgLocatorTask } from './org_locator';
import { nearbyTask } from './nearby';
import { tirthaSummaryTask } from './tirtha_summary';
import { greetingTask } from './greeting';
import { fallbackUnknownTask } from './fallback_unknown';
import { orgGivingTask } from './org_giving';
import { orgExpensesTask } from './org_expenses';
import { orgApprovalsTask } from './org_approvals';
import { priestScheduleTask } from './priest_schedule';
import { recordDonationTask, recordExpenseTask } from './org_record';
import { draftNoticeTask } from './org_notice';
import {
  adminAdviseTask,
  adminBriefingTask,
  adminDraftChangeTask,
  adminHistoryTask,
  adminSimulateTask,
  adminStatsTask,
  adminModerationHelpTask,
  adminAnomalyTask,
  adminDraftTask,
  adminTermsTask,
  adminGrowthTask,
} from '../godmode/copilotTasks';

export const TASKS: Record<IntentId, TaskExecutor> = {
  navigate: navigateTask,
  howto: howtoTask,
  tithi_today: tithiTodayTask,
  festival_next: festivalNextTask,
  dana_help: danaHelpTask,
  sadhana_summary: sadhanaSummaryTask,
  booking_help: bookingHelpTask,
  language_help: languageHelpTask,
  sos_help: sosHelpTask,
  voice_upgrade: voiceUpgradeTask,
  dharma_question: dharmaQuestionTask,
  navigation_question: navigationQuestionTask,
  org_locator: orgLocatorTask,
  nearby_temples: nearbyTask,
  tirtha_summary: tirthaSummaryTask,
  greeting: greetingTask,
  fallback_unknown: fallbackUnknownTask,
  org_giving: orgGivingTask,
  org_expenses: orgExpensesTask,
  org_pending_approvals: orgApprovalsTask,
  priest_schedule: priestScheduleTask,
  record_donation: recordDonationTask,
  record_expense: recordExpenseTask,
  draft_notice: draftNoticeTask,
  admin_briefing: adminBriefingTask,
  admin_stats: adminStatsTask,
  admin_moderation_help: adminModerationHelpTask,
  admin_anomaly: adminAnomalyTask,
  admin_draft: adminDraftTask,
  admin_terms: adminTermsTask,
  admin_history: adminHistoryTask,
  admin_simulate: adminSimulateTask,
  admin_draft_change: adminDraftChangeTask,
  admin_advise: adminAdviseTask,
  admin_growth: adminGrowthTask,
};
