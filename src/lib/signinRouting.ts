import type { UserRole } from '../types';

/* signinRouting — sign-in landing destination by RBAC priority.
 * =====================================================================
 * Pure function (no Firestore, no React) so the priority table is unit
 * testable. PortalLogin.finalizeLogin gathers the inputs (role doc,
 * workspace-member edges, purohit/jyotish profiles) and this module
 * decides where the user lands:
 *
 *   1. SuperAdmin            → admin view
 *   2. Trustee of an org     → that org's dashboard (MRU org if several)
 *   3. Any other org member  → that org's dashboard with their edge role
 *   4. Purohit with profile  → purohit dashboard
 *   5. Jyotishi with profile → jyotishi dashboard
 *   6. Default               → Solo personal dashboard (mint-or-fetch)
 *
 * The session switcher keeps "Personal (Sanatani)" one tap away from any
 * role view, so no destination is a dead end.
 */

export type SigninDestination =
  | { kind: 'admin' }
  | { kind: 'org'; workspaceId: string; role: UserRole }
  | { kind: 'purohit' }
  | { kind: 'jyotish' }
  | { kind: 'solo' };

export interface SigninRoutingInput {
  /** Authoritative role from users/{uid} (never self-granted). */
  role: UserRole;
  /** MRU workspace where the user holds a Trustee edge ('' when none). */
  trusteeOrgId: string;
  /** MRU workspace where the user holds any member edge ('' when none). */
  memberOrgId: string;
  /** Role carried by the member edge (used when it isn't Trustee). */
  memberRole: UserRole;
  /**
   * Fallback workspace when the users-doc role is Trustee but no member
   * edge was found (legacy creator records) — preserves the old landing.
   */
  fallbackWorkspaceId: string;
  hasPurohitProfile: boolean;
  hasJyotishProfile: boolean;
}

export function resolveSigninDestination(input: SigninRoutingInput): SigninDestination {
  const {
    role,
    trusteeOrgId,
    memberOrgId,
    memberRole,
    fallbackWorkspaceId,
    hasPurohitProfile,
    hasJyotishProfile,
  } = input;

  // 1. SuperAdmin → admin view.
  if (role === 'SuperAdmin') return { kind: 'admin' };

  // 2/3. Org membership — Trustee preferred, else the edge's own role;
  // legacy Trustee-role users without an edge keep their current workspace.
  const orgId = trusteeOrgId || memberOrgId || (role === 'Trustee' ? fallbackWorkspaceId : '');
  if (orgId) {
    return {
      kind: 'org',
      workspaceId: orgId,
      role: trusteeOrgId ? 'Trustee' : memberOrgId ? memberRole : 'Trustee',
    };
  }

  // 4. Purohit with profile → purohit dashboard.
  if (hasPurohitProfile) return { kind: 'purohit' };

  // 5. Jyotishi with profile → jyotishi dashboard.
  if (hasJyotishProfile) return { kind: 'jyotish' };

  // 6. Default → Solo personal dashboard.
  return { kind: 'solo' };
}
