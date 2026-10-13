import type { BranchMemberAccess } from '../types';

/**
 * resolveBranchIds — pure per-branch RBAC resolver (deny-by-default).
 *
 * Returns the branch ids the current identity may access, or `null` for
 * unrestricted, or `[]` for no access.
 *
 * SECURITY (deny-by-default, 2026-10-13): when the workspace HAS per-branch
 * restrictions configured (a non-empty `branchAccess` list) but the current
 * identity matches NO entry — unknown member, or a typoed email/uid — this
 * returns `[]` (ZERO branches), never `null`. The previous code fell through
 * to `null` (unrestricted) in that case: a fail-open that silently granted a
 * mistyped or unlisted identity full multi-branch access the Trustee never
 * intended.
 *
 * Allowlist semantics (see BranchManager):
 * - SuperAdmin (platform owner) always bypasses → null.
 * - No `branchAccess` configured at all → null (backward compatible:
 *   workspaces that never opted into branch restrictions behave as before).
 * - Matched entry with an explicit branch list → that list.
 * - Matched entry with empty/undefined branchIds → [] (an explicit entry
 *   grants only the branches it lists).
 * - No matching entry while restrictions exist → [] (deny-by-default).
 *
 * Downstream (`matchesActiveBranch`, `recordsForBranch`, `selectBranch`,
 * `BranchSwitcher`) all treat `[]` as "sees nothing": the switcher hides
 * itself when ≤1 branch is visible, record queries filter to empty, and
 * branch selection to an inaccessible branch is ignored.
 */
export function resolveBranchIds(
  branchAccess: BranchMemberAccess[] | undefined,
  uid: string | undefined,
  email: string,
  isSuperAdmin: boolean
): string[] | null {
  if (isSuperAdmin) return null;
  if (!Array.isArray(branchAccess) || branchAccess.length === 0) return null;
  const normalizedEmail = (email || '').toLowerCase();
  const entry = branchAccess.find(
    (a) =>
      (uid && a.memberId === uid) ||
      (normalizedEmail && a.memberId.toLowerCase() === normalizedEmail)
  );
  // No entry for this identity while restrictions exist → deny (fail-closed).
  if (!entry) return [];
  // Explicit entry lists only what it grants; empty list grants nothing.
  if (!entry.branchIds || entry.branchIds.length === 0) return [];
  return entry.branchIds;
}
