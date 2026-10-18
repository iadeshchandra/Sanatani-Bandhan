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
    intents: ALL_INTENTS,
    guideIds: [...DEVOTEE_GUIDES, ...ORG_STAFF_GUIDES, 'godmode'],
    dataScopes: ['self', 'org', 'marketplace', 'platform'],
  },
};

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
