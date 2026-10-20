/**
 * deskSurfaceGuard.ts — org-surface guard for shared desk components.
 * =====================================================================
 * QUEUED #48 (live-audit fix, 2026-10-20).
 *
 * Root problem: App.tsx's desk switch groups several module ids onto ONE
 * component (`VedicSevaShikshaDesk`):
 *
 *   'gurukul', 'gurukul-education', 'gurukulAcademy', 'vidyalaya',
 *   'satsang', 'sanghaDrills', 'sevaTrust'  →  <VedicSevaShikshaDesk />
 *
 * That component is the GURUKUL desk (shishya registry, brahmachari
 * census). But 'sanghaDrills' is native to Sangha / Samaj /
 * MahotsavSamiti, 'satsang' is native to Satsang / Ashram / Yoga /
 * KashiKshetra, and 'sevaTrust' is native to Trust / AkshayaPatra — so
 * those organisations were served a wrong-product desk under their own
 * breadcrumb (a Sangha opening "Sangha & Shakha Mobilization" got the
 * Vedic Gurukul desk). The mount guard in workspaceRegistry could not
 * catch it: it validates the module id against the org registry, and
 * 'sanghaDrills' IS allowed for Sangha — the id was fine, the COMPONENT
 * was wrong.
 *
 * This module is the component-family half of the org guard: given the
 * workspace type, which surface may the shared shiksha-family component
 * render? The component consumes `resolveShikshaDeskSurface` at its top
 * and renders only the surface that matches the org family (or an honest
 * restricted notice). `isModuleAllowedForOrgMount` in workspaceRegistry
 * additionally denies the mount outright when the surface resolves to
 * 'restricted', so the platform's designed OrgTypeRestrictedDesk (with
 * guidance + App Store path) shows instead of any wrong content.
 *
 * A dedicated Sangha shakha-mobilisation desk component does not exist
 * anywhere in the codebase (verified by search) — Sangha-family orgs get
 * `SanghaMobilizationSurface`, an honest surface built on the org's live
 * member directory + sevadar roster, labelled as such.
 */

/** Surfaces the shared shiksha-family component may render. */
export type ShikshaDeskSurface =
  | 'gurukul'
  | 'sangha-mobilization'
  | 'satsang'
  | 'restricted';

/**
 * Canonical module ids that App.tsx's switch mounts onto
 * VedicSevaShikshaDesk (aliases resolve to these via ORG_MODULE_ALIASES,
 * e.g. 'gurukul-education' → 'gurukul').
 */
export const SHIKSHA_CASE_GROUP_IDS: ReadonlySet<string> = new Set([
  'gurukul',
  'gurukulAcademy',
  'vidyalaya',
  'satsang',
  'sanghaDrills',
  'sevaTrust',
]);

/**
 * Org type → the only surface the shared component may render for it.
 * Derived from workspaceRegistry natives (which types mount which
 * case-group id) — keep in sync with the matrix test in
 * src/lib/__tests__/deskSurfaceGuard.test.ts, which recomputes the
 * natives from workspaceRegistry and fails if this map would serve a
 * wrong-family surface to any org type that can mount the component.
 */
export const SHIKSHA_DESK_SURFACE_BY_ORG_TYPE: Record<string, ShikshaDeskSurface> = {
  // Mount 'gurukul' / 'gurukulAcademy' / 'vidyalaya' — the desk IS theirs.
  Gurukul: 'gurukul',
  Vidyalaya: 'gurukul',
  // Mount 'sanghaDrills' ("Sangha & Shakha Mobilization").
  Sangha: 'sangha-mobilization',
  Samaj: 'sangha-mobilization',
  MahotsavSamiti: 'sangha-mobilization',
  // Mount 'satsang' ("Satsang, Kirtan & Discourse") — the Satsang One
  // mandali suite is the correct existing surface for these orgs.
  Satsang: 'satsang',
  Ashram: 'satsang',
  Yoga: 'satsang',
  KashiKshetra: 'satsang',
  // Mount only 'sevaTrust' — no humanitarian-seva desk component exists;
  // the mount guard denies and shows honest guidance instead.
  Trust: 'restricted',
  AkshayaPatra: 'restricted',
};

/**
 * Resolve the surface for a workspace type. Unknown / missing types
 * resolve to 'restricted' — the component must never guess a family.
 */
export function resolveShikshaDeskSurface(
  workspaceType?: string | null,
): ShikshaDeskSurface {
  if (!workspaceType) return 'restricted';
  return SHIKSHA_DESK_SURFACE_BY_ORG_TYPE[workspaceType] ?? 'restricted';
}

/**
 * May the shared shiksha-family component mount at all for this
 * workspace + module id? Used by isModuleAllowedForOrgMount: when the
 * module belongs to the shared case group but the org's surface is
 * 'restricted', the correct behaviour is the platform's restricted
 * screen — not the wrong family's desk.
 */
export function isShikshaFamilyMountAllowed(
  workspaceType: string | null | undefined,
  canonicalModuleId: string,
  rawModuleId?: string,
): boolean {
  const inGroup =
    SHIKSHA_CASE_GROUP_IDS.has(canonicalModuleId) ||
    (rawModuleId != null && SHIKSHA_CASE_GROUP_IDS.has(rawModuleId));
  if (!inGroup) return true;
  if (!workspaceType) return true; // no type known — fail open (legacy behaviour)
  return resolveShikshaDeskSurface(workspaceType) !== 'restricted';
}
