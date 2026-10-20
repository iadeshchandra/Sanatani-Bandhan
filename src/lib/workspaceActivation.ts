/**
 * workspaceActivation.ts — pure activation contract for a workspace the
 * signed-in user has JUST created (QUEUED #50, audit D7).
 * =====================================================================
 * The audited failure: after registering a new organisation the app
 * landed on the FIRST org's (the Mandir's) Devotee view instead of the
 * new org. The chain, proven in code:
 *
 *  1. PortalLogin's registration called `switchWorkspace(id)` WITHOUT
 *     awaiting it — its tenant verification ran against the pre-create
 *     auth closure and could silently deny.
 *  2. It then called `loginAsRole('Trustee', …)` — the DEMO persona
 *     helper. With a stale closure whose active id was a real org (not
 *     DEMO), loginAsRole RESET the active workspace to DEMO_ws-mandir
 *     and called signInAnonymously(), REPLACING the real Firebase
 *     session. The auth listener's anonymous branch then demoted the
 *     role to 'Devotee' — so the user "landed" in the demo Mandir as a
 *     Devotee, and the new org was never the active one.
 *
 * The law this module pins: activating a just-created workspace is a
 * pure state transition — the created workspace becomes THE active
 * workspace, the creator's role is Trustee (proven by the
 * workspaceMembers creator edge + workspaces.createdBy, re-derived at
 * every later sign-in by the H-11 check), the view is the staff
 * console. No auth calls, no demo ids, no other workspace can win.
 */

import type { UserRole, WorkspaceConfig } from '../types';

export interface CreatedWorkspaceActivation {
  /** The ONLY workspace that may be active after creation: the new one. */
  activeWorkspaceId: string;
  /** The creator is the workspace's first Trustee (creator edge). */
  role: UserRole;
  /** Staff land in the manager console, never the member view. */
  viewMode: 'MANAGER';
}

export function activationForCreatedWorkspace(
  workspace: Pick<WorkspaceConfig, 'id'>,
): CreatedWorkspaceActivation {
  return {
    activeWorkspaceId: workspace.id,
    role: 'Trustee',
    viewMode: 'MANAGER',
  };
}

/**
 * The Orgs-list "Current" badge truth: a workspace is current iff its id
 * IS the active workspace id — compared against the id pointer itself,
 * never against a fallback-resolved workspace object (whose
 * first-in-list fallback marked the wrong org "Current" in the audit).
 */
export function isCurrentWorkspace(
  workspaceId: string | null | undefined,
  activeWorkspaceId: string | null | undefined,
): boolean {
  return !!workspaceId && !!activeWorkspaceId && workspaceId === activeWorkspaceId;
}
