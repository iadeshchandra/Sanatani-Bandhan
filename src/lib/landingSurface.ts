/**
 * landingSurface.ts — pure landing law for org entry (QUEUED #55).
 * =====================================================================
 * The audited failure: a Trustee opening their own organisation landed
 * on the "👁 Devotee view" — the member-facing preview — and the only
 * way out was the preview's back button. The chain, proven in code:
 *
 *  1. A Solo-first account's GLOBAL role is 'Devotee'; the Trustee
 *     status for a given org lives ONLY in the workspaceMembers edge
 *     (published asynchronously by OrgSpaceShell as orgRoleOverride).
 *  2. On org entry, AppContent's devotee guard evaluated the global
 *     fallback BEFORE the edge landed and forced
 *     activeModule='devoteePortal'.
 *  3. When the edge arrived and the role resolved to Trustee, nothing
 *     released the forced desk — and the render-level strict guard
 *     rendered the Devotee surface for as long as effectiveRole read
 *     'Devotee', even with the Command Center desk selected.
 *
 * The law this module pins: landing follows the user's ACTUAL role in
 * THIS org. Staff (SuperAdmin, Trustee, Priest, Accountant, Sevadar,
 * CSO) land on the staff workspace (Command Center); a devotee-only
 * member lands on the Devotee view, which is their org home. While the
 * role is still resolving, the surface is 'pending' — a neutral hold —
 * never a guessed Devotee view flashed at staff. The Devotee view
 * remains available to staff as a deliberate preview (Header), never
 * as the front door.
 */

import { ROLE_MIGRATION_MAP, type UserRole } from '../types';

export type LandingSurface = 'workspace' | 'devotee' | 'pending';

const CANONICAL_ROLES: readonly string[] = [
  'SuperAdmin',
  'Trustee',
  'Priest',
  'Accountant',
  'Sevadar',
  'Devotee',
  'CSO',
];

/**
 * Normalize any stored role spelling (legacy SUPER_ADMIN / PUROHIT /
 * MANAGER / VOLUNTEER included) to the canonical UserRole, or null
 * when the value carries no role evidence.
 */
export function normalizeMembershipRole(
  role: string | null | undefined,
): UserRole | null {
  if (!role) return null;
  const normalized = ROLE_MIGRATION_MAP[role] || role;
  return (CANONICAL_ROLES as string[]).includes(normalized)
    ? (normalized as UserRole)
    : null;
}

/**
 * The landing surface for a membership role. `resolved` is false while
 * the per-org role is still loading — an unresolved role can only ever
 * produce 'pending', whatever the (possibly fallback) role value says.
 * A resolved-but-unreadable role also holds at 'pending' rather than
 * guessing: a wrong guess is the bug this module exists to kill.
 */
export function landingSurfaceForMembership(
  role: UserRole | string | null | undefined,
  resolved: boolean,
): LandingSurface {
  if (!resolved) return 'pending';
  const normalized = normalizeMembershipRole(role);
  if (!normalized) return 'pending';
  return normalized === 'Devotee' ? 'devotee' : 'workspace';
}

export interface OrgLandingRoleInput {
  /** The workspace being entered ('' while no workspace is active). */
  workspaceId: string;
  /** Role from the workspaceMembers edge for THIS org, when present. */
  membershipRole?: string | null;
  /** True once the first workspaceMembers fetch has settled. */
  membershipsLoaded: boolean;
  /** The account's global/stored role (AuthWorkspaceContext currentRole). */
  globalRole?: string | null;
  /** True when the user is the recorded creator of this workspace. */
  isCreator: boolean;
}

export interface OrgLandingRole {
  role: UserRole | null;
  resolved: boolean;
}

/**
 * Resolve the role that decides landing for one org, from the evidence
 * available, in authority order:
 *
 *  1. SuperAdmin global role — platform clearance in every org (mirrors
 *     effectiveRole, which short-circuits before the per-org override).
 *  2. The workspaceMembers edge — the rules-enforced truth for this
 *     org; authoritative the moment it exists, even mid-load.
 *  3. Demo sandboxes hold no edges — the persona role IS the role.
 *  4. H-11: the recorded creator of the workspace is its Trustee.
 *  5. No edge: the global fallback may speak ONLY once the edge list
 *     has actually loaded (legacy access granted via users-doc lists
 *     carries no edge). Before that, the role is still resolving.
 */
export function resolveOrgLandingRole(
  input: OrgLandingRoleInput,
): OrgLandingRole {
  const { workspaceId, membershipRole, membershipsLoaded, globalRole, isCreator } =
    input;

  const globalNormalized = normalizeMembershipRole(globalRole);
  if (globalNormalized === 'SuperAdmin') {
    return { role: 'SuperAdmin', resolved: true };
  }

  const edgeRole = normalizeMembershipRole(membershipRole);
  if (edgeRole) {
    return { role: edgeRole, resolved: true };
  }

  if (workspaceId.startsWith('DEMO_')) {
    return globalNormalized
      ? { role: globalNormalized, resolved: true }
      : { role: null, resolved: false };
  }

  if (isCreator) {
    return { role: 'Trustee', resolved: true };
  }

  if (!membershipsLoaded) {
    return { role: null, resolved: false };
  }

  return globalNormalized
    ? { role: globalNormalized, resolved: true }
    : { role: null, resolved: false };
}
