/**
 * platformAdminRoles.ts — delegated platform-admin role model (QUEUED #21).
 * ============================================================================
 * Pure module (no Firebase imports) so the whole role matrix stays
 * unit-testable: pinned by src/lib/__tests__/platformAdminRoles.test.ts.
 *
 * WHY THIS EXISTS — bus factor 1. Until now, platform administration hinged
 * on ONE human: the owner UID hardcoded in firestore.rules `isOwner()` and
 * the owner email in src/config/ownerAllowlist.ts. If that account is lost,
 * the platform is unmanageable. This module defines DELEGATED roles a second
 * (or third) trusted human can hold, stored as docs in the `platformAdmins`
 * collection (see src/lib/platformAdmins.ts).
 *
 * THE MODEL — three effective roles:
 *   owner     — implicit, NEVER stored. Derived from the hardcoded owner
 *               UID / allowlisted email. Sees and does everything, including
 *               managing the admins themselves. Owner access NEVER depends
 *               on the platformAdmins collection: if the collection is
 *               empty, unreadable, or deleted, the owner is unaffected.
 *   admin     — delegated operations admin: day-to-day platform care
 *               (insights, users, workspaces, verification, moderation,
 *               messages, content, support, translations, ranking,
 *               marketplace, professionals, growth, audit read).
 *   moderator — delegated trust & safety only: insights, users (lookup),
 *               moderation, support.
 *
 * OWNER-ONLY, ALWAYS (never delegable from this UI): API keys, billing /
 * payment approvals, commission rates, finance, the raw database explorer,
 * platform settings (incl. payment rails), the system tab, and admin
 * management itself. Those tabs are hidden for delegated roles — AND the
 * underlying Firestore rules keep them isOwner()-gated, so hiding is a
 * courtesy, never the boundary.
 *
 * SECURITY NOTE — `platformAdmins` is NOT `platform_admins`:
 *   - `platform_admins/{uid}` (snake_case) is the SERVER-managed registry
 *     whose mere existence confers rules-level isSuperAdmin(). Writes are
 *     Admin-SDK-only (rules: write false). Nothing in this feature touches
 *     it — merging the two registries would turn a UI grant into a silent
 *     full-rules escalation.
 *   - `platformAdmins/{uid}` (camelCase) is the delegation registry below.
 *     Its docs gate ONLY this console's UI. Every action a delegated admin
 *     takes is still independently allowed or denied by firestore.rules.
 *
 * FAIL-SAFE: any doubt resolves to NO access (null role) — except the
 * owner, whose access is resolved before the collection is ever consulted.
 */

/** Effective console role. `owner` is implicit and never stored. */
export type PlatformRole = 'owner' | 'admin' | 'moderator';

/** Roles the owner can grant. `owner` is deliberately NOT grantable. */
export type DelegatedAdminRole = 'admin' | 'moderator';

export const DELEGATED_ADMIN_ROLES: readonly DelegatedAdminRole[] = ['admin', 'moderator'];

/** Every GodMode console tab id (mirrors GodModeConsole2's TabId union). */
export const GODMODE_TAB_IDS = [
  'overview', 'users', 'admins', 'workspaces', 'verification', 'moderation',
  'billing', 'commission', 'finance', 'marketplace', 'professionals',
  'growth', 'apikeys', 'translations', 'ranking', 'messages', 'database',
  'content', 'settings', 'support', 'audit', 'system',
] as const;

export type GodModeTabId = (typeof GODMODE_TAB_IDS)[number];

/**
 * Tabs that stay owner-only forever: secrets (API keys), money (billing,
 * commission rates, finance), raw data (database explorer), platform
 * configuration (settings incl. payment rails), system operations, and
 * admin management itself.
 */
export const OWNER_ONLY_TABS: readonly GodModeTabId[] = [
  'apikeys', 'billing', 'commission', 'finance',
  'database', 'settings', 'system', 'admins',
];

/** Delegated `admin`: everything except the owner-only set. */
export const ADMIN_TABS: readonly GodModeTabId[] = GODMODE_TAB_IDS.filter(
  (t) => !OWNER_ONLY_TABS.includes(t),
);

/** Delegated `moderator`: trust & safety surface only. */
export const MODERATOR_TABS: readonly GodModeTabId[] = [
  'overview', 'users', 'moderation', 'support',
];

/** Tabs visible for an effective role. Null role → nothing. */
export function tabsForRole(role: PlatformRole | null | undefined): readonly GodModeTabId[] {
  switch (role) {
    case 'owner': return GODMODE_TAB_IDS;
    case 'admin': return ADMIN_TABS;
    case 'moderator': return MODERATOR_TABS;
    default: return [];
  }
}

/** True when `role` may open `tab`. Unknown tabs are denied for everyone. */
export function canAccessTab(role: PlatformRole | null | undefined, tab: string): boolean {
  if (!role) return false;
  return (tabsForRole(role) as readonly string[]).includes(tab);
}

/** Narrow an unknown value (e.g. a Firestore field) to a grantable role. */
export function sanitizeDelegatedRole(value: unknown): DelegatedAdminRole | null {
  return value === 'admin' || value === 'moderator' ? value : null;
}

/** Raw shape of a platformAdmins/{uid} doc, fields unvalidated. */
export interface PlatformAdminGrant {
  role?: unknown;
  /** Missing means active (mirrors the platform_admins `active` convention). */
  active?: unknown;
}

/**
 * Why a role resolution ended where it did (QUEUED #42). Until now every
 * refusal collapsed into one silent `null`, and the GodMode gate showed a
 * single generic line — a revoked admin, a missing grant, and a failed
 * registry read were indistinguishable, and the failure was effectively
 * invisible. Every resolution now carries its reason so the gate can say,
 * in plain words, WHY access was refused.
 */
export type RoleResolutionReason =
  | 'owner' // implicit owner — the registry was never consulted
  | 'grant' // an active delegation grant was found
  | 'signed-out' // no signed-in user to resolve
  | 'no-grant' // signed in, but no platformAdmins doc exists for them
  | 'revoked' // grant doc exists but active === false
  | 'malformed' // grant doc exists but its role field is unusable
  | 'lookup-failed'; // the registry read itself failed (rules / offline)

export interface RoleResolution {
  role: PlatformRole | null;
  reason: RoleResolutionReason;
}

/**
 * Resolve the effective console role AND the reason. The decision order
 * IS the fail-safe:
 *   1. Owner wins immediately — the collection is never consulted, so a
 *      broken/empty registry can never lock the owner out.
 *   2. A failed lookup (rules pending, offline, permission error) →
 *      null / 'lookup-failed' — never a guess.
 *   3. No signed-in user → null / 'signed-out'.
 *   4. No doc → 'no-grant'. Revoked doc (active === false) → 'revoked'.
 *   5. A doc whose role field is anything unexpected → 'malformed'.
 */
export function resolveRoleWithReason(input: {
  isOwner: boolean;
  grant?: PlatformAdminGrant | null;
  lookupFailed?: boolean;
  hasUid?: boolean;
}): RoleResolution {
  if (input.isOwner) return { role: 'owner', reason: 'owner' };
  if (input.lookupFailed) return { role: null, reason: 'lookup-failed' };
  if (input.hasUid === false) return { role: null, reason: 'signed-out' };
  const grant = input.grant;
  if (!grant) return { role: null, reason: 'no-grant' };
  if (grant.active === false) return { role: null, reason: 'revoked' };
  const role = sanitizeDelegatedRole(grant.role);
  if (!role) return { role: null, reason: 'malformed' };
  return { role, reason: 'grant' };
}

/**
 * Resolve the effective console role. Thin wrapper over
 * resolveRoleWithReason so there is exactly ONE decision implementation;
 * callers that need to explain a refusal use the detailed form.
 */
export function resolveEffectiveRole(input: {
  isOwner: boolean;
  grant?: PlatformAdminGrant | null;
  lookupFailed?: boolean;
}): PlatformRole | null {
  return resolveRoleWithReason(input).role;
}

/** Human-readable capability summary for the Admins tab + toasts. */
export const ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
  owner: 'Full platform control, including API keys, payments, settings and admin management. Never delegable.',
  admin: 'Day-to-day operations: insights, users, workspaces, verification, moderation, messages, content, support, translations, ranking, marketplace, professionals, growth and the audit log. Cannot touch API keys, money, settings or admins.',
  moderator: 'Trust & safety only: insights, user lookup, moderation and support. Nothing else.',
};
