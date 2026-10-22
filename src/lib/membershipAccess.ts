/**
 * membershipAccess.ts — Blueprint B: desk scope + role expiry law
 * for workspaceMembers edges (pure; no React, no Firebase).
 * =====================================================================
 * A membership edge may carry two ABAC attributes (research §1d —
 * attributes instead of new roles):
 *   deskScope:     string[] | null — the desks this member may open,
 *                  ON TOP OF their canonical role's visibility
 *                  (intersection, never union: scope can only narrow
 *                  what the role already grants). null = unscoped.
 *   roleExpiresAt: epoch ms | null — when the STAFF role lapses.
 *                  Expiry degrades the role to the member floor
 *                  (Devotee) — the person stays a member of the org;
 *                  their staff clearance simply ends. Nothing is
 *                  deleted and no one is locked out of their own
 *                  devotee home.
 *
 * Owner-safety laws (fail-closed, and pinned by tests):
 *  - The workspace CREATOR's edge can never be expired or demoted:
 *    the creator is the workspace's recovery path (H-11), and an
 *    expiry on their edge is refused at write time and ignored at
 *    read time.
 *  - No change (expiry, demotion, removal) may leave a workspace
 *    with ZERO active Trustee edges: the last active Trustee is
 *    continuity-protected. Another Trustee must exist first.
 *
 * Enforcement points (this module is the law, they are the gates):
 *  - OrgSpaceShell publishes membershipEffectiveRole as the org role
 *    override → checkPermission + every mount guard fail closed.
 *  - App.tsx landing feeds resolveOrgLandingRole the same effective
 *    role, and its central desk gate applies isDeskInScope.
 *  - deskVisibility applies the scope for Sidebar + CommandPalette
 *    (the ONE visibility layer, #56).
 */

import type { UserRole } from '../types';
import { resolveEdgeRole } from './landingSurface';

/** The slice of a membership edge this law reads. */
export interface MembershipAccessEdge {
  uid: string;
  role: string;
  deskScope?: string[] | null;
  roleExpiresAt?: number | null;
}

/**
 * Surfaces that are chrome/home, not desks: the Command Center is
 * every staff role's landing (#56 D6) and the devotee surfaces are
 * the member home. A scope can never fence these off — a scoped
 * member who cannot reach home is stranded, not scoped.
 */
export const SCOPE_EXEMPT_DESKS: readonly string[] = [
  'dashboard',
  'devoteePortal',
  'devotee-super-app',
  'devotee-portal',
  'personal-portal',
  'devotee-account',
];

export function isDeskInScope(
  moduleId: string,
  deskScope: string[] | null | undefined
): boolean {
  if (deskScope == null) return true;
  if (SCOPE_EXEMPT_DESKS.includes(moduleId)) return true;
  return deskScope.includes(moduleId);
}

export function isRoleExpired(
  edge: MembershipAccessEdge,
  now: number
): boolean {
  return edge.roleExpiresAt != null && edge.roleExpiresAt <= now;
}

export interface CreatorGuard {
  /** uid of the workspace's recorded creator (workspaces/{id}.createdBy). */
  creatorUid?: string | null;
}

/**
 * The role this edge ACTUALLY grants right now: canonicalised
 * (resolveEdgeRole, down-only), with expiry degrading staff roles
 * to the Devotee floor. The creator's edge never degrades.
 */
export function membershipEffectiveRole(
  edge: MembershipAccessEdge | null | undefined,
  now: number,
  guard: CreatorGuard = {}
): UserRole {
  if (!edge) return 'Devotee';
  const isCreator = !!guard.creatorUid && edge.uid === guard.creatorUid;
  if (!isCreator && isRoleExpired(edge, now)) return 'Devotee';
  return resolveEdgeRole(edge.role);
}

/** The desk scope in force right now (an expired role has no staff
 *  desks at all — the Devotee floor surfaces are scope-exempt). */
export function effectiveDeskScope(
  edge: MembershipAccessEdge | null | undefined,
  now: number,
  guard: CreatorGuard = {}
): string[] | null {
  if (!edge) return null;
  const isCreator = !!guard.creatorUid && edge.uid === guard.creatorUid;
  if (!isCreator && isRoleExpired(edge, now)) return [];
  return edge.deskScope ?? null;
}

export type ExpiryState = 'none' | 'active' | 'expiringSoon' | 'expired';

const EXPIRING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

export function expiryState(
  edge: MembershipAccessEdge,
  now: number
): ExpiryState {
  if (edge.roleExpiresAt == null) return 'none';
  if (edge.roleExpiresAt <= now) return 'expired';
  if (edge.roleExpiresAt - now <= EXPIRING_SOON_MS) return 'expiringSoon';
  return 'active';
}

/** Active (non-expired) Trustee edges, with the creator's edge
 *  counting as Trustee whenever its stored role resolves there —
 *  the creator never expires (see membershipEffectiveRole). */
export function activeTrustees(
  edges: readonly MembershipAccessEdge[],
  now: number,
  guard: CreatorGuard = {}
): MembershipAccessEdge[] {
  return edges.filter(
    (e) => membershipEffectiveRole(e, now, guard) === 'Trustee'
  );
}

export type AccessGuardResult =
  | { ok: true; reason: null }
  | { ok: false; reason: 'CREATOR_PROTECTED' | 'LAST_TRUSTEE' };

/**
 * May this access change be applied to the target edge? `change`
 * carries the PROPOSED role / expiry (undefined = unchanged).
 * Refuses: expiring or demoting the creator; any change that would
 * leave the workspace with zero active Trustee edges.
 */
export function guardAccessChange(
  edges: readonly MembershipAccessEdge[],
  targetUid: string,
  change: { role?: UserRole | string | null; roleExpiresAt?: number | null },
  now: number,
  guard: CreatorGuard = {}
): AccessGuardResult {
  const target = edges.find((e) => e.uid === targetUid);
  if (!target) return { ok: true, reason: null }; // no edge — nothing to protect here

  const isCreator = !!guard.creatorUid && targetUid === guard.creatorUid;
  if (isCreator) {
    const demotes =
      change.role != null && resolveEdgeRole(change.role) !== 'Trustee';
    const expires = change.roleExpiresAt != null;
    if (demotes || expires) return { ok: false, reason: 'CREATOR_PROTECTED' };
    return { ok: true, reason: null };
  }

  const simulated = edges.map((e) =>
    e.uid === targetUid
      ? {
          ...e,
          role: change.role != null ? String(change.role) : e.role,
          roleExpiresAt:
            change.roleExpiresAt !== undefined
              ? change.roleExpiresAt
              : e.roleExpiresAt,
        }
      : e
  );
  // Refuse only when THIS change drains the last active Trustee —
  // a workspace already at zero (all lapsed) is not made worse by
  // an unrelated member's edit, and blocking it would trap the desk.
  const before = activeTrustees(edges, now, guard).length;
  const after = activeTrustees(simulated, now, guard).length;
  if (before > 0 && after === 0) {
    return { ok: false, reason: 'LAST_TRUSTEE' };
  }
  return { ok: true, reason: null };
}

/** May this member be removed outright? Same continuity law: the
 *  creator's edge is the provisioning record (never removable via
 *  the desk), and the last active Trustee cannot be removed. */
export function guardMemberRemoval(
  edges: readonly MembershipAccessEdge[],
  targetUid: string,
  now: number,
  guard: CreatorGuard = {}
): AccessGuardResult {
  if (!!guard.creatorUid && targetUid === guard.creatorUid) {
    return { ok: false, reason: 'CREATOR_PROTECTED' };
  }
  const remaining = edges.filter((e) => e.uid !== targetUid);
  if (
    edges.some((e) => e.uid === targetUid) &&
    activeTrustees(edges, now, guard).length > 0 &&
    activeTrustees(remaining, now, guard).length === 0
  ) {
    return { ok: false, reason: 'LAST_TRUSTEE' };
  }
  return { ok: true, reason: null };
}
