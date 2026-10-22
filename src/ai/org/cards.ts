/**
 * ai/org/cards.ts — Blueprint C: per-role copilot task cards.
 * =====================================================================
 * Research §3c: "Buttons first, chat second — offer tappable task
 * cards in the user's language; each opens a guided flow; free text
 * is an accelerator on top."
 *
 * THE CARD LAW: a card exists for a caller only if the executor
 * would serve that caller. Cards are filtered by FOUR gates, all
 * derived from the same scope the executors enforce —
 *   1. the role list on the card definition,
 *   2. the Blueprint B template (Manager cards need 'org-manager'),
 *   3. the caller's desk scope (Blueprint B membershipAccess),
 *   4. canOffer() — the pipeline's own RBAC gate.
 * If any gate fails, the card is absent — never shown disabled,
 * never a teaser for data the caller may not touch. The Auditor's
 * cards are read-only BY THE SAME MATRIX: no write card lists the
 * auditor role, and record_* intents are absent from the auditor's
 * capability list, so gate 4 double-seals it.
 *
 * Tapping a card sends its prompt (in the caller's language) as the
 * message — so a card can never do anything typed words couldn't.
 */

import { canOffer } from '../rbac';
import { isDeskInScope } from '../../lib/membershipAccess';
import type { IntentId, Role } from '../types';
import { DOMAIN_MODULE, type CopilotDomain } from './port';

export type CardLang = 'en' | 'hi' | 'bn';

export interface CopilotTaskCard {
  id: string;
  intent: IntentId;
  icon: string;
  /** Write cards produce drafts (never direct commits). */
  write: boolean;
  roles: Role[];
  /** When set, only callers carrying this B template see the card. */
  templateId?: string;
  /** Desk-scope gate (Blueprint B catalog ids via DOMAIN_MODULE). */
  domain?: CopilotDomain;
  label: Record<CardLang, string>;
  prompt: Record<CardLang, string>;
}

const C = (
  id: string,
  intent: IntentId,
  icon: string,
  write: boolean,
  roles: Role[],
  label: Record<CardLang, string>,
  extra?: Partial<CopilotTaskCard>
): CopilotTaskCard => ({ id, intent, icon, write, roles, label, prompt: label, ...extra });

export const TASK_CARDS: CopilotTaskCard[] = [
  C('giving-week', 'org_giving', '🪔', false, ['trustee', 'accountant', 'auditor'], {
    en: 'Who gave this week?',
    hi: 'इस सप्ताह किसने दान दिया?',
    bn: 'এই সপ্তাহে কে দান দিয়েছে?',
  }, { domain: 'treasury' }),
  C('expenses-month', 'org_expenses', '📒', false, ['trustee', 'accountant', 'auditor'], {
    en: "This month's expenses",
    hi: 'इस महीने के खर्चे',
    bn: 'এই মাসের খরচ',
  }, { domain: 'treasury' }),
  C('pending-approvals', 'org_pending_approvals', '⏳', false, ['trustee', 'accountant', 'auditor'], {
    en: 'Pending approvals',
    hi: 'लंबित अनुमोदन',
    bn: 'মুলতুবি অনুমোদন',
  }, { domain: 'approvals' }),
  C('record-donation', 'record_donation', '✍️', true, ['trustee', 'accountant'], {
    en: 'Record a donation',
    hi: 'दान दर्ज करें',
    bn: 'দান লিখুন',
  }, { domain: 'treasury' }),
  C('record-expense', 'record_expense', '🧾', true, ['trustee', 'accountant'], {
    en: 'Record an expense',
    hi: 'खर्च दर्ज करें',
    bn: 'খরচ লিখুন',
  }, { domain: 'treasury' }),
  C('draft-notice', 'draft_notice', '📣', true, ['trustee'], {
    en: 'Draft a notice',
    hi: 'सूचना का मसौदा बनाएं',
    bn: 'বিজ্ঞপ্তির খসড়া তৈরি করুন',
  }, { domain: 'notices' }),
  // Manager (Blueprint B template 'org-manager' over Sevadar):
  // operations cards — roster/schedule + org notices, no money.
  C('manager-notice', 'draft_notice', '📣', true, ['sevadar'], {
    en: 'Draft a notice',
    hi: 'सूचना का मसौदा बनाएं',
    bn: 'বিজ্ঞপ্তির খসড়া তৈরি করুন',
  }, { domain: 'notices', templateId: 'org-manager' }),
  C('schedule-today', 'priest_schedule', '🌅', false, ['priest', 'trustee', 'sevadar', 'purohit'], {
    en: "Today's pujas",
    hi: 'आज की पूजाएँ',
    bn: 'আজকের পূজা',
  }, { domain: 'bookings' }),
  C('schedule-tomorrow', 'priest_schedule', '🌄', false, ['priest'], {
    en: "Tomorrow's bookings",
    hi: 'कल की बुकिंग',
    bn: 'আগামীকালের বুকিং',
  }, { domain: 'bookings' }),
];

/** The cards THIS caller sees — see the card law in the header. */
export function taskCardsFor(input: {
  role: Role;
  templateId?: string | null;
  deskScope?: string[] | null;
}): CopilotTaskCard[] {
  const seen = new Set<string>();
  const out: CopilotTaskCard[] = [];
  for (const card of TASK_CARDS) {
    if (!card.roles.includes(input.role)) continue;
    if (card.templateId && input.templateId !== card.templateId) continue;
    if (card.domain && !isDeskInScope(DOMAIN_MODULE[card.domain], input.deskScope ?? null)) {
      continue;
    }
    if (!canOffer(card.intent, input.role)) continue;
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    out.push(card);
  }
  return out;
}

export function cardLabel(card: CopilotTaskCard, lang: string): string {
  const l = (lang || 'en').toLowerCase();
  return l === 'hi' || l === 'bn' ? card.label[l] : card.label.en;
}

export function cardPrompt(card: CopilotTaskCard, lang: string): string {
  const l = (lang || 'en').toLowerCase();
  return l === 'hi' || l === 'bn' ? card.prompt[l] : card.prompt.en;
}
