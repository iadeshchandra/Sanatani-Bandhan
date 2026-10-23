/**
 * deskDirectory.ts — the All-Desks Directory model.
 * =====================================================================
 * Module-system redesign (2026-10-23): the directory replaces the App
 * Store as the way users discover desks. Its universe is NOT "what is
 * installed" (nothing is installed any more — isModuleAllowed no
 * longer gates on enabledModules) and NOT "everything in the
 * catalog": it is exactly the desks THIS caller could actually open
 * right now, so the directory can never promise a desk the mount
 * guards would refuse. A desk is in iff ALL of these hold:
 *
 *   1. Role visibility — the canonical isDeskVisibleForRole (the same
 *      decision the Sidebar and Command Palette consume), including
 *      the caller's desk-scope narrowing (Blueprint B).
 *   2. Mount truth for the shared-component family — the shiksha
 *      family guard (isShikshaFamilyMountAllowed). A cross-family
 *      desk (e.g. 'sanghaDrills' inside a Gurukul) would mount the
 *      WRONG family's desk, so it is out; the designed restricted
 *      screen still answers deep links to it.
 *   3. The federation rule — the Multi-Branch HQ desk exists only
 *      for workspaces with 2+ branches (the Sidebar's rule, verbatim).
 *
 * Plan-locked desks are NOT filtered out: they stay visible with
 * their plan tag and open the same upgrade upsell as the Sidebar
 * (the C-6 machinery — lockedIds below, computed exactly as the
 * Sidebar computes it; MODULE_PLAN_TIER is empty by design today,
 * so in practice nothing is locked and every plan includes every
 * desk, with usage caps as the only difference).
 *
 * Desk Doors (lib/deskDoors — Bahi-Khata) follow the Sidebar law:
 * a door is in iff its target desk is in.
 *
 * The catalog arrives as a parameter (the component passes
 * MODULE_CATALOG) so this model stays importable without the
 * component tree — the same reason the guard tests can pin it.
 */

import {
  isDeskVisibleForRole,
  type PermissionCheck,
} from './deskVisibility';
import { LOCATOR_MAP } from '../ai/locator';
import {
  isModuleAllowedForPlan,
  workspaceRegistry,
} from './workspaceRegistry';
import { isShikshaFamilyMountAllowed } from './deskSurfaceGuard';
import { doorsForVisibleDesks, type DeskDoor } from './deskDoors';

/** The structural minimum of a catalog row this model reasons about. */
export interface DirectoryDeskLike {
  id: string;
  domain: number;
  name?: string;
  domainTitle?: string;
  keywords?: string;
}

export interface DirectoryAccess {
  /** The per-org effective role (AuthWorkspaceContext.effectiveRole). */
  role: string | null | undefined;
  checkPermission: PermissionCheck;
  /** The caller's desk scope (effectiveDeskScope) — null = unscoped. */
  deskScope?: string[] | null;
}

export interface DirectoryModel<T extends DirectoryDeskLike = DirectoryDeskLike> {
  /** Visible, openable desks, in catalog order. */
  desks: T[];
  /** Plan-locked subset of `desks` (visible, tagged, opens upsell). */
  lockedIds: Set<string>;
  /** Doors whose target desk is visible (the Sidebar law). */
  doors: DeskDoor[];
  /** Registry natives for the workspace type — the "Core" set. */
  nativeIds: Set<string>;
}

/**
 * The one openability predicate, shared by the directory and by
 * RoleHome's Discover grid (whose hand-copied role filter it
 * replaces — the #56 residual). Answers: "may this caller open this
 * catalog desk in this workspace?" — role ∧ scope ∧ family ∧ branches.
 */
export function isDeskOpenableFor(
  workspace: any,
  mod: DirectoryDeskLike,
  access: DirectoryAccess
): boolean {
  if (
    mod.id === 'federation' &&
    ((workspace?.branches?.length || 0) < 2)
  ) {
    return false;
  }
  if (
    !isDeskVisibleForRole(mod, access.role, access.checkPermission, {
      deskScope: access.deskScope,
    })
  ) {
    return false;
  }
  const workspaceType =
    typeof workspace === 'string' ? workspace : workspace?.type;
  if (!isShikshaFamilyMountAllowed(workspaceType, mod.id)) {
    return false;
  }
  return true;
}

/** Build the directory model for a caller in a workspace. */
export function buildDirectoryModel<T extends DirectoryDeskLike>(
  workspace: any,
  access: DirectoryAccess,
  catalog: readonly T[]
): DirectoryModel<T> {
  const desks = catalog.filter((m) => isDeskOpenableFor(workspace, m, access));

  // C-6 plan locks, computed exactly as the Sidebar computes them:
  // locked desks STAY in the list (the lock is the upgrade affordance);
  // DEMO workspaces are never plan-locked (the demo quota governs).
  const lockedIds = new Set<string>();
  const planId = workspace?.planId;
  if (planId && String(planId).toUpperCase() !== 'DEMO') {
    for (const m of desks) {
      if (!isModuleAllowedForPlan(m.id, planId)) lockedIds.add(m.id);
    }
  }

  const workspaceType =
    typeof workspace === 'string' ? workspace : workspace?.type;
  const nativeIds = new Set<string>(
    (workspaceType && workspaceRegistry[workspaceType as keyof typeof workspaceRegistry]) || []
  );

  return {
    desks,
    lockedIds,
    doors: doorsForVisibleDesks(desks.map((d) => d.id)),
    nativeIds,
  };
}

/**
 * The Copilot locator's alias corpus, indexed by desk id. The
 * locator (ai/locator) curates how people actually ASK for a desk —
 * "khajana", "তহবিল", "ledger", transliterations and concept words —
 * in en/hi/bn. Directory search speaks the same language (UX-proof
 * residual, 2026-10-23): before this wiring, typing a well-known
 * alias into "Search desks…" found nothing, even though the Copilot
 * would have routed the same word instantly. Nested features
 * (Bahi-Khata, Practice Mode…) contribute their aliases to their
 * PARENT desk — searching "bahi-khata" surfaces Treasury, which is
 * where the door lives.
 */
const locatorAliasHaystack: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const entry of LOCATOR_MAP) {
    if (!entry.deskId) continue;
    const parts = [
      ...entry.aliases,
      ...entry.primary,
      entry.name.en,
      entry.name.hi,
      entry.name.bn,
    ];
    const prev = map.get(entry.deskId) || '';
    map.set(entry.deskId, `${prev} ${parts.join(' ')}`.toLowerCase());
  }
  return map;
})();

/** The locator alias haystack for a desk ('' when the desk has none). */
export function locatorAliasesForDesk(deskId: string): string {
  return locatorAliasHaystack.get(deskId) || '';
}

/**
 * Directory search: does a desk match the term? Matches the catalog
 * name, the caller's display label, the localised dictionary name,
 * the id, the domain title, and the catalog keywords — the same
 * corpora the Sidebar and palette search, plus the dictionary names
 * the old App Store searched — AND the Copilot locator's curated
 * alias corpus for the desk (see above).
 */
export function directoryDeskMatchesSearch(
  mod: DirectoryDeskLike,
  term: string,
  displayLabel: string,
  localizedName: string
): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return (
    (mod.name || '').toLowerCase().includes(q) ||
    displayLabel.toLowerCase().includes(q) ||
    localizedName.toLowerCase().includes(q) ||
    mod.id.toLowerCase().includes(q) ||
    (mod.domainTitle || '').toLowerCase().includes(q) ||
    (mod.keywords || '').toLowerCase().includes(q) ||
    locatorAliasesForDesk(mod.id).includes(q)
  );
}
