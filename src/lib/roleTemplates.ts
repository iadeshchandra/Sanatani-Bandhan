/**
 * roleTemplates.ts — Blueprint B: the 10 tenant role templates.
 * =====================================================================
 * The research brief (§1b) names the roles an organisation actually
 * staffs; the codebase's canonical role layer (landingSurface's
 * resolveEdgeRole + ROLE_MIGRATION_MAP) is deliberately coarser —
 * 8 canonical roles, because role explosion is the named failure
 * mode of fine-grained RBAC. Templates are the bridge the brief
 * itself prescribes (§1d: attributes instead of new roles): a
 * template is a NAMED bundle = one canonical role + an optional
 * desk scope (the ABAC attribute) + an optional default expiry.
 *
 * Laws:
 *  - A template NEVER invents a role. Resolution always lands on a
 *    canonical UserRole via resolveEdgeRole — unknown resolves DOWN
 *    only (#56 law, untouched).
 *  - A template's deskScope is a CEILING: an assignment may narrow
 *    it (subset), never widen it (resolveAssignment intersects).
 *  - Every template's canonical role is grantable through the
 *    existing invite matrix (TRUSTEE_GRANTABLE_ROLES /
 *    SUPERADMIN_GRANTABLE_ROLES) — templates round-trip through the
 *    invite flow by construction; a template whose role a Trustee
 *    cannot grant is simply not offered to Trustees.
 *  - 'Manager' is a template, not a tier (#56: no canonical Manager
 *    exists; ROLE_MIGRATION_MAP collapses MANAGER → Sevadar). The
 *    Manager template = Sevadar canonical role + a broad operational
 *    desk scope. 'Auditor' IS a new canonical role (Blueprint B) —
 *    read-only oversight; it appears in NO write role-set anywhere
 *    (rules R_FINANCE / R_STAFF are unchanged), so its read-only
 *    nature is enforced server-side, not by hiding buttons.
 *  - The brief's Platform Admin row is vendor-side (the platform
 *    SuperAdmin) and deliberately NOT a tenant template.
 */

import { ROLE_MIGRATION_MAP, type UserRole } from '../types';
import { resolveEdgeRole } from './landingSurface';
import { AUDITOR_READ_DESKS } from './deskVisibility';
import type { DeskVisibilityModule } from './deskVisibility';
import { isDeskVisibleForRole } from './deskVisibility';

export interface RoleTemplate {
  id: string;
  /** i18n keys under org.access.templates.* */
  nameKey: string;
  descKey: string;
  /** The canonical role this template resolves to. */
  role: UserRole;
  /**
   * Desk-scope ceiling (canonical MODULE_CATALOG ids). null = the
   * canonical role's natural visibility (no scoping). An assignment
   * may narrow this to a subset; it may never exceed it.
   */
  deskScope: string[] | null;
  /** Default role expiry in days when the assigner sets none. */
  defaultExpiryDays?: number;
  /** True when the assigner is expected to pick the desk(s) at
   *  assignment time (Desk Lead) — the default scope is home only. */
  scopeRequired?: boolean;
  /** Scope applied when the assigner requests none (Desk Lead:
   *  home only, until they pick the lead's desks). Distinct from
   *  deskScope, which is the CEILING an assignment may not exceed. */
  defaultDeskScope?: string[];
  /** Curated picker universe for scopeRequired templates. */
  pickableDesks?: string[];
}

const T = (id: string, role: UserRole, deskScope: string[] | null, extra?: Partial<RoleTemplate>): RoleTemplate => ({
  id,
  nameKey: `org.access.templates.${id}.name`,
  descKey: `org.access.templates.${id}.desc`,
  role,
  deskScope,
  ...extra,
});

/** Suite desks a Desk Lead might own (org-type taxonomy still gates
 *  mounting — a scope entry for a non-native suite is inert). */
export const DESK_LEAD_PICKABLE_DESKS: string[] = [
  'devotees', 'donorCare', 'guests', 'poojaBooking', 'mandirPuja',
  'utsavPanjika', 'panchang', 'inventory', 'annadanam', 'goshala',
  'gurukulAcademy', 'pathshala', 'vidyalaya', 'yoga-one', 'satsang-one',
  'utsav-one', 'goshala-one', 'ashram-one', 'sabha-one', 'tirth-one',
  'samskara-one', 'matha-one', 'nyas-one', 'annakshetra-one',
];

export const ROLE_TEMPLATES: RoleTemplate[] = [
  // Brief: Org Owner / Trustee Chair — everything in org, grants
  // roles, full audit. (Approving OWN money movements is still
  // denied by the maker–checker dynamic law.)
  T('trustee-chair', 'Trustee', null),
  // Brief: Org Admin / Secretary — members, events, notices,
  // settings-lite. Canonical Sevadar + records/communications scope.
  T('org-secretary', 'Sevadar', [
    'dashboard', 'devotees', 'donorCare', 'guests', 'family',
    'vanshavali', 'sandeshBroadcast', 'utsavPanjika', 'panchang',
    'poojaBooking', 'bulkImport',
  ]),
  // Programme: Manager — operations coordination (roster, check-in,
  // bookings ops, inventory) without treasury or governance.
  T('org-manager', 'Sevadar', [
    'dashboard', 'checkin', 'devotees', 'donorCare', 'guests',
    'family', 'vanshavali', 'sevadar-roster', 'poojaBooking',
    'mandirPuja', 'panchang', 'utsavPanjika', 'sandeshBroadcast',
    'inventory', 'bulkImport', 'satsang',
  ]),
  // Brief: Treasurer (Checker) — approves expenses/payouts, views
  // the ledger, reconciles. No POS (creating is the maker's side;
  // the dynamic law also bars approving own entries).
  T('treasurer-checker', 'Accountant', [
    'dashboard', 'treasury', 'hundi-audit', 'cash-custody',
    'ratna-bhandar', 'taxReceipts', 'form10bd', 'tally-export',
    'campaigns', 'karmaLedger',
  ]),
  // Brief: Accountant / Cashier (Maker) — creates donations,
  // receipts, expenses (pending above threshold), views ledger.
  T('accountant-maker', 'Accountant', [
    'dashboard', 'quick-chanda-pos', 'treasury', 'hundi-audit',
    'cash-custody', 'ratna-bhandar', 'taxReceipts', 'form10bd',
    'tally-export', 'campaigns', 'karmaLedger', 'assets',
    'inventory', 'bhoomi', 'vahan', 'recurring-seva',
  ]),
  // Brief: Desk Lead — own desk's tasks/members/budget view only.
  // No ceiling: the trustee picks the desk(s) at assignment from
  // the curated list; until they do, the scope is home only.
  T('desk-lead', 'Sevadar', null, {
    scopeRequired: true,
    defaultDeskScope: ['dashboard'],
    pickableDesks: DESK_LEAD_PICKABLE_DESKS,
  }),
  // Brief: Priest / Religious Lead — calendar, rituals, pastoral
  // lists. Priest visibility is already domain-fenced canonically.
  T('religious-lead', 'Priest', null),
  // Brief: Volunteer — assigned tasks only, time-boxed by default
  // (festival week): 30-day default expiry, renewable by a Trustee.
  T('festival-volunteer', 'Sevadar', [
    'dashboard', 'checkin', 'sevadar-roster', 'qrScanner',
    'utsavPanjika', 'annadanam',
  ], { defaultExpiryDays: 30 }),
  // Brief: Auditor (read-only, time-boxed) — ledger + audit log +
  // exports for a period; any write: never. Scope == the canonical
  // Auditor visibility set (deskVisibility owns it).
  T('auditor-readonly', 'Auditor', [...AUDITOR_READ_DESKS], { defaultExpiryDays: 90 }),
  // Brief: Member / Donor — own profile, own receipts, public feed,
  // published accounts. The devotee surfaces; no staff desks.
  T('member-donor', 'Devotee', null),
];

export const ROLE_TEMPLATE_BY_ID: ReadonlyMap<string, RoleTemplate> = new Map(
  ROLE_TEMPLATES.map((t) => [t.id, t])
);

export function templateById(id: string | null | undefined): RoleTemplate | null {
  if (!id) return null;
  return ROLE_TEMPLATE_BY_ID.get(id) ?? null;
}

/**
 * Roles whose GRANT is a sensitive action routed through
 * maker–checker (Blueprint B deliverable 3c): anything above the
 * Sevadar line — ritual authority, money, security, oversight, and
 * governance itself. Sevadar and Devotee grants stay direct: they
 * are the everyday staffing actions, and friction there would push
 * trustees back to shared accounts (the failure mode the brief
 * warns collapses dual control in practice).
 */
export const GATED_GRANT_ROLES: readonly UserRole[] = [
  'Priest',
  'Accountant',
  'CSO',
  'Auditor',
  'Trustee',
  'SuperAdmin',
];

export function grantNeedsApproval(role: UserRole | string): boolean {
  return (GATED_GRANT_ROLES as readonly string[]).includes(resolveEdgeRole(role));
}

/**
 * checkPermission's semantics, answered for an ARBITRARY canonical
 * role (checkPermission itself answers only for the signed-in
 * session). Mirrors AuthWorkspaceContext.checkPermission exactly:
 * SuperAdmin always; migration-map normalisation; the Trustee
 * hierarchy implication over operational roles.
 */
export function roleCanAccess(
  role: UserRole,
  allowed: readonly (UserRole | string)[]
): boolean {
  if (role === 'SuperAdmin') return true;
  return allowed.some((a) => {
    const normalized = ROLE_MIGRATION_MAP[a] || a;
    if (normalized === role) return true;
    if (
      role === 'Trustee' &&
      ['Priest', 'Accountant', 'Sevadar', 'Devotee', 'CSO'].includes(normalized)
    ) {
      return true;
    }
    return false;
  });
}

/** The catalog desks a canonical role may see (the ONE visibility
 *  layer, answered for that role) — the assignment UI's pick list
 *  and the subset law's universe. */
export function desksVisibleForRole(
  role: UserRole,
  catalog: readonly DeskVisibilityModule[]
): string[] {
  return catalog
    .filter((m) => isDeskVisibleForRole(m, role, (allowed) => roleCanAccess(role, allowed)))
    .map((m) => m.id);
}

export interface RoleAssignment {
  role: UserRole;
  templateId: string | null;
  deskScope: string[] | null;
  roleExpiresAt: number | null;
}

export interface AssignmentInput {
  templateId?: string | null;
  /** Raw role when no template is chosen (canonicalised here). */
  role?: string | null;
  /** Requested narrowing; null/undefined = the template default. */
  deskScope?: string[] | null;
  /** Explicit expiry (epoch ms); undefined = template default. */
  roleExpiresAt?: number | null;
}

/**
 * Resolve an assignment request to the exact fields stored on the
 * invite / membership edge. Pure; `now` injected for testability.
 * Laws enforced here (and pinned by tests):
 *  - template wins for role; without a template the raw role is
 *    canonicalised by resolveEdgeRole (down-only).
 *  - scope: template scope is the ceiling — a requested scope is
 *    intersected with it; no template + no request = unscoped.
 *    'dashboard' is always kept in a non-null scope (home is not a
 *    desk a member can be scoped out of — the landing law sends
 *    every staff role there; scoping it away strands the user).
 *  - expiry: explicit value wins (null explicitly clears); else
 *    the template default (now + defaultExpiryDays); else none.
 */
export function resolveAssignment(input: AssignmentInput, now: number): RoleAssignment {
  const template = templateById(input.templateId);
  const role = template ? template.role : resolveEdgeRole(input.role);

  let deskScope: string[] | null;
  if (input.deskScope != null) {
    const requested = [...new Set(input.deskScope)];
    deskScope =
      template && template.deskScope
        ? requested.filter((d) => template.deskScope!.includes(d))
        : requested;
    if (!deskScope.includes('dashboard')) deskScope = ['dashboard', ...deskScope];
  } else if (template?.defaultDeskScope) {
    deskScope = [...template.defaultDeskScope];
  } else {
    deskScope = template ? (template.deskScope ? [...template.deskScope] : null) : null;
  }

  let roleExpiresAt: number | null;
  if (input.roleExpiresAt !== undefined) {
    roleExpiresAt = input.roleExpiresAt;
  } else if (template?.defaultExpiryDays) {
    roleExpiresAt = now + template.defaultExpiryDays * 24 * 60 * 60 * 1000;
  } else {
    roleExpiresAt = null;
  }

  return {
    role,
    templateId: template ? template.id : null,
    deskScope,
    roleExpiresAt,
  };
}

/** Validation codes for a resolved assignment (UI + context share). */
export function validateAssignment(a: RoleAssignment, now: number): string[] {
  const errors: string[] = [];
  if (a.roleExpiresAt != null && a.roleExpiresAt <= now) {
    errors.push('EXPIRY_IN_PAST');
  }
  const template = templateById(a.templateId);
  if (template && template.scopeRequired && (a.deskScope == null || a.deskScope.length <= 1)) {
    errors.push('SCOPE_REQUIRED');
  }
  return errors;
}
