/**
 * Sanatani Bandhan — AI Assistant Phase 0 · role capabilities
 * =====================================================================
 * Two layers of protection:
 *  1. Executors read ONLY through the user's own authenticated client SDK,
 *     so Firestore rules enforce the real boundary (this module is UX, not
 *     security — the rules file is the hard boundary, per ARCHITECTURE.md).
 *  2. `canOffer()` so the assistant never *offers* what the role cannot do:
 *     a devotee is never shown treasury/devotee-management guidance, and a
 *     dharma question is never answered from outside the verified corpus.
 *
 * Role set mirrors the workspace hierarchy: SuperAdmin → Trustee → Priest →
 * Accountant → Sevadar → Devotee (+ CSO), plus Seva Pro roles
 * (purohit, jyotish) and the owner. `owner` is the GodMode operator.
 */

import type { IntentId, Role } from './types';

export const ROLES: Role[] = [
  'devotee',
  'sevadar',
  'priest',
  'accountant',
  'trustee',
  'purohit',
  'jyotish',
  'owner',
];

export interface RoleCapability {
  /** Intents the assistant may serve for this role. */
  intents: IntentId[];
  /** Module guide ids the assistant may explain for this role. */
  guideIds: string[];
  /** Data scopes the assistant's executors may touch (ceiling, not floor). */
  dataScopes: Array<'self' | 'org' | 'marketplace' | 'platform'>;
}

/** Guide ids a devotee may be guided through (no org-admin modules). */
const DEVOTEE_GUIDES = [
  'wallet',
  'panjika',
  'samskara',
  'sangam',
  'chat',
  'chat-blessings',
  'p2p-requests',
  'p2p-wallet',
  'p2p-lifecycle',
  'p2p-qr',
  'p2p-safety',
  'org-requests',
  'jyotish',
  'purohit',
];

/** Org-staff guides (trustee/accountant/sevakar-facing modules). */
const ORG_STAFF_GUIDES = [
  'treasury',
  'devotees',
  'inventory',
  'hr',
  'events',
  'marketplace',
];

const ALL_INTENTS: IntentId[] = [
  'navigate',
  'howto',
  'tithi_today',
  'festival_next',
  'dana_help',
  'sadhana_summary',
  'booking_help',
  'language_help',
  'sos_help',
  'voice_upgrade',
  'dharma_question',
  'navigation_question',
  'tirtha_summary',
  'nearby_temples',
  'greeting',
  'fallback_unknown',
];

/**
 * GodMode Copilot intents — the owner (GodMode operator) ONLY.
 * Never added to any other role's list; canOffer() is the gate.
 */
const OWNER_ONLY_INTENTS: IntentId[] = [
  'admin_briefing',
  'admin_stats',
  'admin_moderation_help',
  'admin_anomaly',
  'admin_draft',
  'admin_terms',
  'admin_history',
  'admin_simulate',
  'admin_draft_change',
  'admin_advise',
  'admin_growth',
];

export const roleCapabilities: Record<Role, RoleCapability> = {
  devotee: {
    intents: ALL_INTENTS,
    guideIds: DEVOTEE_GUIDES,
    dataScopes: ['self'],
  },
  sevadar: {
    intents: ALL_INTENTS,
    guideIds: [...DEVOTEE_GUIDES, 'events', 'devotees'],
    dataScopes: ['self', 'org'],
  },
  priest: {
    intents: ALL_INTENTS,
    guideIds: [...DEVOTEE_GUIDES, 'events', 'devotees', 'purohit'],
    dataScopes: ['self', 'org'],
  },
  accountant: {
    intents: ALL_INTENTS,
    guideIds: [...DEVOTEE_GUIDES, 'treasury', 'marketplace'],
    dataScopes: ['self', 'org'],
  },
  trustee: {
    intents: ALL_INTENTS,
    guideIds: [...DEVOTEE_GUIDES, ...ORG_STAFF_GUIDES],
    dataScopes: ['self', 'org'],
  },
  purohit: {
    intents: ALL_INTENTS,
    guideIds: [...DEVOTEE_GUIDES, 'purohit', 'marketplace'],
    dataScopes: ['self', 'marketplace'],
  },
  jyotish: {
    intents: ALL_INTENTS,
    guideIds: [...DEVOTEE_GUIDES, 'jyotish', 'marketplace'],
    dataScopes: ['self', 'marketplace'],
  },
  owner: {
    intents: [...ALL_INTENTS, ...OWNER_ONLY_INTENTS],
    guideIds: [...DEVOTEE_GUIDES, ...ORG_STAFF_GUIDES, 'godmode'],
    dataScopes: ['self', 'org', 'marketplace', 'platform'],
  },
};

/**
 * H3 (QUEUED #32): normalise a workspace role string into the AI layer's
 * Role vocabulary. Workspace sessions carry `UserRole` ('SuperAdmin',
 * 'Trustee', … from src/types.ts) while the AI layer speaks lowercase —
 * passing them through raw made canOffer() miss every lookup and deny
 * everything (fail-closed, but broken UX for org-staff sessions).
 *
 * THE critical rule: a workspace 'SuperAdmin' is an ORG-scoped role and
 * must NEVER normalise to the AI 'owner' role — its ceiling is 'trustee'.
 * 'owner' is constructible ONLY by the Copilot panel's hardcoded ctx
 * inside the owner-gated GodMode console. Unknown/empty → 'devotee'
 * (least privilege). AI role names (lowercase, except 'owner') pass
 * through so existing callers keep working.
 */
const WORKSPACE_TO_AI_ROLE: Record<string, Role> = {
  SuperAdmin: 'trustee', // org ceiling — NEVER 'owner'
  Trustee: 'trustee',
  Priest: 'priest',
  Accountant: 'accountant',
  Sevadar: 'sevadar',
  Devotee: 'devotee',
  CSO: 'sevadar',
};

const AI_ROLE_PASSTHROUGH: ReadonlySet<string> = new Set([
  'devotee', 'sevadar', 'priest', 'accountant', 'trustee', 'purohit', 'jyotish',
  // note: 'owner' deliberately absent — see the rule above.
]);

export function toAiRole(workspaceRole: string | null | undefined): Role {
  if (!workspaceRole) return 'devotee';
  const exact = WORKSPACE_TO_AI_ROLE[workspaceRole];
  if (exact) return exact;
  const lower = workspaceRole.toLowerCase();
  if (AI_ROLE_PASSTHROUGH.has(lower)) return lower as Role;
  return 'devotee';
}

/**
 * The single gate the assistant consults before serving an intent.
 * When `guideId` is given (howto intent), the guide must ALSO be in the
 * role's guide list — this is what keeps a devotee from being offered
 * treasury / devotee-management guidance.
 */
export function canOffer(intent: IntentId, role: Role, guideId?: string): boolean {
  const cap = roleCapabilities[role];
  if (!cap) return false;
  if (!cap.intents.includes(intent)) return false;
  if (guideId && !cap.guideIds.includes(guideId)) return false;
  return true;
}

/** Guide ids the assistant may explain to this role. */
export function allowedGuides(role: Role): string[] {
  return roleCapabilities[role]?.guideIds ?? [];
}

/** Data scopes this role's assistant executors may touch. */
export function allowedScopes(role: Role): Array<'self' | 'org' | 'marketplace' | 'platform'> {
  return roleCapabilities[role]?.dataScopes ?? ['self'];
}
