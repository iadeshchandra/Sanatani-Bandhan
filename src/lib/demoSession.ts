/**
 * demoSession.ts — the demo persona grant for anonymous sessions (D-01).
 * ==========================================================================
 * UI/UX audit D-01 (2026-10-22): a visitor picks a demo type and the
 * TRUSTEE console; the demo starter sets that role, then calls
 * anonymous sign-in; when the sign-in resolves, the auth listener's
 * anonymous branch (security fix C-2) unconditionally reset the role
 * to 'Devotee' — so the public demo delivered the Devotee app for
 * 100% of visitors, whatever they chose, and the session record
 * itself said "role":"Devotee".
 *
 * The reconciliation of C-2 and D-01:
 *  - C-2 stands: an anonymous (credential-less) session must NEVER
 *    inherit a PERSISTED privileged role (localStorage / idb leftovers
 *    on a shared temple computer). With no explicit grant, anonymous
 *    still means Devotee.
 *  - The demo grant is not persistence: `loginAsRole` — the one
 *    explicit, in-session act by which a visitor chooses a demo
 *    persona — stashes the chosen role in **sessionStorage** (dies
 *    with the tab, never survives a browser restart or a user
 *    switch) immediately BEFORE the anonymous sign-in it triggers.
 *  - The auth listener's anonymous branch resolves its role through
 *    resolveAnonymousSessionRole: the stashed explicit grant when one
 *    exists, 'Devotee' otherwise. Logout, exitDemo and any real
 *    (non-anonymous) sign-in clear the stash, so a later anonymous
 *    session in the same tab can never inherit it either.
 */

import { ROLE_MIGRATION_MAP, type UserRole } from '../types';
import type { DemoView } from '../components/public/DemoSelectionModal';

/** Which app role each demo-picker view boots into. Demo-only: this
 *  never runs outside demo start and never touches production RBAC. */
export const DEMO_ROLE_FOR_VIEW: Record<DemoView, UserRole> = {
  trustee: 'Trustee',
  devotee: 'Devotee',
  priest: 'Priest',
  accountant: 'Accountant',
  sevadar: 'Sevadar',
  superadmin: 'SuperAdmin',
};

/** sessionStorage key for the explicit demo grant. Session-scoped by
 *  design — see the module header for why this is NOT localStorage. */
export const DEMO_SESSION_ROLE_KEY = 'sb_demo_session_role';

const VALID_SESSION_ROLES: readonly string[] = [
  'SuperAdmin',
  'Trustee',
  'Priest',
  'Accountant',
  'Sevadar',
  'Devotee',
  'CSO',
  'Auditor',
];

/**
 * The role an anonymous session boots with. A stashed explicit demo
 * grant (any spelling the migration map knows) wins; anything else —
 * no stash, an unreadable value, an unknown role — is 'Devotee'.
 * An unrecognized stash can never escalate anyone (C-2).
 */
export function resolveAnonymousSessionRole(
  stashed: string | null | undefined,
): UserRole {
  if (stashed) {
    const normalized = (ROLE_MIGRATION_MAP[stashed] || stashed) as string;
    if (VALID_SESSION_ROLES.includes(normalized)) {
      return normalized as UserRole;
    }
  }
  return 'Devotee';
}

/** Record the explicit demo grant (called by loginAsRole only). */
export function stashDemoSessionRole(role: UserRole): void {
  try {
    sessionStorage.setItem(DEMO_SESSION_ROLE_KEY, role);
  } catch {
    /* storage unavailable — the anonymous fallback stays Devotee */
  }
}

/** Read the explicit demo grant, if any. */
export function readDemoSessionRole(): string | null {
  try {
    return sessionStorage.getItem(DEMO_SESSION_ROLE_KEY);
  } catch {
    return null;
  }
}

/** Drop the grant (logout, exitDemo, real sign-in). */
export function clearDemoSessionRole(): void {
  try {
    sessionStorage.removeItem(DEMO_SESSION_ROLE_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
