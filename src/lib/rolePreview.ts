/**
 * rolePreview.ts — session-scoped "see the console as a role" state
 * (F3, Test #3 RBAC coverage gap).
 * =====================================================================
 * The store holds ONLY the intent — { orgId, role } — for the preview
 * a Trustee/owner started from UserRolesDesk. It grants nothing by
 * itself: OrgSpaceShell (the one legitimate publisher of the per-org
 * role override) reads this store and publishes the preview role
 * through the SAME setOrgRoleOverrideSafe channel the membership edge
 * uses, so desk visibility, the AppContent scope gate and every
 * checkPermission() call resolve exactly as they do for a real member
 * holding that role. No parallel mock RBAC exists anywhere in the
 * preview path.
 *
 * Session-scoped and in-memory on purpose: a reload ends the preview,
 * switching organisation ends it (the shell only honours a preview
 * whose orgId matches the org on screen, and exits a stale one), and
 * exiting restores the member's real published role.
 */

export interface RolePreviewState {
  orgId: string;
  role: string;
}

let current: RolePreviewState | null = null;

const listeners = new Set<(state: RolePreviewState | null) => void>();

export const ROLE_PREVIEW_CHANGED = 'sanatani:role-preview-changed';

function emit(): void {
  for (const fn of listeners) fn(current);
  try {
    window.dispatchEvent(new CustomEvent(ROLE_PREVIEW_CHANGED));
  } catch {
    /* non-DOM environment — listeners still fired */
  }
}

export function getRolePreview(): RolePreviewState | null {
  return current;
}

export function startRolePreview(orgId: string, role: string): void {
  if (!orgId || !role) return;
  current = { orgId, role };
  emit();
}

export function exitRolePreview(): void {
  if (!current) return;
  current = null;
  emit();
}

export function subscribeRolePreview(
  fn: (state: RolePreviewState | null) => void,
): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
