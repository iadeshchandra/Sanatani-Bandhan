/**
 * orgConsoleAccess.ts — ONE judgement for the Personal ⇄ Org door
 * (RT-FIX, route/org-door audit RT-03 + RT-09, 2026-10-31).
 * =====================================================================
 * The audited inconsistency: the DevoteeAccountPortal's Org toggle
 * judged the GLOBAL currentRole, while the landing law
 * (lib/landingSurface.resolveOrgLandingRole) judges the PER-ORG role
 * from the workspaceMembers edge for the ACTIVE workspace. Signpost
 * and gate disagreed for multi-org users — a person staff in THIS org
 * but "Devotee" globally saw a locked toggle the landing law would
 * never have imposed, and a person staff only ELSEWHERE could be
 * shown an open door into an org that never granted them anything.
 *
 * The law this module pins: the Org console door for a workspace is
 * judged by the evidence FOR THAT WORKSPACE, in the landing law's own
 * authority order —
 *
 *   1. SuperAdmin (global platform clearance, every org);
 *   2. the workspaceMembers edge for THIS org, resolved through
 *      membershipEffectiveRole (canonicalised, expiry-aware — an
 *      expired staff edge degrades to the Devotee floor);
 *   3. the recorded creator of THIS workspace (Trustee, H-11);
 *   4. demo sandboxes hold no edges — the persona role speaks.
 *
 * One deliberate divergence from resolveOrgLandingRole step 5: that
 * step lets the GLOBAL fallback speak for landing when no edge
 * exists (legacy users-doc access must land somewhere). The console
 * DOOR may not inherit that fallback: a global role earned in another
 * org is cross-org evidence, and letting it unlock THIS org's door
 * is precisely the bleed RT-03 names. With no edge, no creatorship
 * and no SuperAdmin clearance, the door's verdict is the Devotee
 * floor — locked, with an explanation (RT-01's sheet), never a
 * silent guess. While the edge list is still loading the verdict is
 * `resolved: false` and the door stays locked-but-explaining; the
 * landing law's 'pending' discipline applies here too.
 *
 * Both Personal⇄Org doors consume this module — the portal toggle
 * and MemberAppShell's "Institution ERP" return switch — so the two
 * implementations the audit found (RT-09) now share one verdict.
 */

import { useMemo } from 'react';
import type { UserRole } from '../types';
import {
  membershipEffectiveRole,
  type MembershipAccessEdge,
} from './membershipAccess';
import { normalizeMembershipRole } from './landingSurface';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useMembership } from '../context/MembershipContext';

export interface OrgConsoleAccessInput {
  /** The workspace whose console door is being judged ('' = none). */
  workspaceId: string;
  /** The workspaceMembers edge for THIS workspace, when one exists. */
  membership?: MembershipAccessEdge | null;
  /** True once the first workspaceMembers fetch has settled. */
  membershipsLoaded: boolean;
  /** The account's global/stored role (AuthWorkspaceContext currentRole). */
  globalRole?: string | null;
  /** True when the user is the recorded creator of this workspace. */
  isCreator: boolean;
  /** workspaces/{id}.createdBy — the creator guard for edge expiry. */
  creatorUid?: string | null;
  /** Clock override for tests. */
  now?: number;
}

export interface OrgConsoleAccess {
  /** True when this account holds a staff role in THIS workspace. */
  canOpenConsole: boolean;
  /** The per-org role the verdict rests on (null while resolving). */
  role: UserRole | null;
  /** False while the membership evidence is still loading. */
  resolved: boolean;
}

export function resolveOrgConsoleAccess(
  input: OrgConsoleAccessInput,
): OrgConsoleAccess {
  const {
    workspaceId,
    membership,
    membershipsLoaded,
    globalRole,
    isCreator,
    creatorUid,
  } = input;
  const now = input.now ?? Date.now();

  // 1. SuperAdmin — platform clearance in every org (mirrors
  //    resolveOrgLandingRole step 1 and effectiveRole's short-circuit).
  const globalNormalized = normalizeMembershipRole(globalRole);
  if (globalNormalized === 'SuperAdmin') {
    return { canOpenConsole: true, role: 'SuperAdmin', resolved: true };
  }

  // 2. The edge for THIS org — authoritative the moment it exists,
  //    resolved through the same effective-role helper App.tsx feeds
  //    the landing law (canonicalisation + expiry degradation).
  if (membership) {
    const role = membershipEffectiveRole(membership, now, {
      creatorUid: creatorUid ?? undefined,
    });
    return {
      canOpenConsole: role !== 'Devotee',
      role,
      resolved: true,
    };
  }

  // 3. The recorded creator of THIS workspace is its Trustee (H-11).
  if (isCreator) {
    return { canOpenConsole: true, role: 'Trustee', resolved: true };
  }

  // 4. Demo sandboxes hold no edges — the persona role IS the role.
  if (workspaceId.startsWith('DEMO_')) {
    return globalNormalized
      ? {
          canOpenConsole: globalNormalized !== 'Devotee',
          role: globalNormalized,
          resolved: true,
        }
      : { canOpenConsole: false, role: null, resolved: false };
  }

  // Still loading: no verdict yet — the door holds locked (with its
  // explanation sheet) rather than guessing from the global fallback.
  if (!membershipsLoaded) {
    return { canOpenConsole: false, role: null, resolved: false };
  }

  // 5. Loaded, and no edge for THIS org: the global fallback may land
  //    the user (landing law step 5) but it must NOT unlock this org's
  //    console door — that role belongs to another org (or to no org).
  //    The honest per-org verdict is the Devotee floor.
  return { canOpenConsole: false, role: 'Devotee', resolved: true };
}

/**
 * React binding: reads the active workspace + the caller's membership
 * edge for it and returns the shared verdict. Used by the portal
 * toggle and MemberAppShell's return switch (RT-09 consolidation).
 */
export function useOrgConsoleAccess(): OrgConsoleAccess {
  const { activeWorkspace, currentRole, firebaseUser } = useAuthWorkspace();
  const { myMemberships, membershipsLoaded } = useMembership();

  const workspaceId = activeWorkspace?.id || '';
  const creatorUid =
    (activeWorkspace as { createdBy?: string } | null)?.createdBy ?? null;
  const membership = useMemo(
    () => myMemberships.find((m) => m.workspaceId === workspaceId) ?? null,
    [myMemberships, workspaceId],
  );
  const uid = firebaseUser?.uid;

  return useMemo(
    () =>
      resolveOrgConsoleAccess({
        workspaceId,
        membership,
        membershipsLoaded,
        globalRole: currentRole,
        isCreator: !!uid && !!creatorUid && creatorUid === uid,
        creatorUid,
      }),
    [workspaceId, membership, membershipsLoaded, currentRole, uid, creatorUid],
  );
}
