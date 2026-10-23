/**
 * deskDoors.ts — sidebar DOORS to panels inside desks (UI/UX audit D-06).
 *
 * A door is NOT a desk. The #57 catalog cleanup removed alias/shadow
 * rows from MODULE_CATALOG ("one desk, one canonical row") because an
 * alias row becomes a trap on a store shelf: install succeeds, the
 * mount guard blocks. Doors therefore live in their own list and are
 * rendered ONLY by the two navigation surfaces that compute the
 * caller's visible-desk set — the Sidebar nav and, since the
 * 2026-10-23 module-system redesign, the All-Desks Directory
 * (components/dashboard/DeskDirectory, fed by lib/deskDirectory) —
 * never by the Plan & Add-ons desk, the Command Palette, or any
 * mount logic.
 *
 * Visibility law (the audit's requirement): a door is visible exactly
 * when its TARGET desk survives the surface's own filtered list — the
 * same taxonomy + role-visibility (isDeskVisibleForRole) + search
 * pipeline the desk itself passed. The door adds no second
 * permission decision of its own; `doorsForVisibleDesks` simply asks
 * "did the target desk make it into the visible list?".
 *
 * Activation law: a door never selects itself as a module. It calls
 * deskPanel.openDeskPanel(targetDesk, panel), which navigates to the
 * target desk via 'sanatani:navigate' and asks the desk to open the
 * panel. A plan-locked target keeps the lock: the Sidebar checks the
 * target's lock state before firing the door (same upsell as the desk).
 */

export interface DeskDoor {
  /** Door id (NOT a catalog desk id, never a module selection). */
  id: string;
  /** Row label. */
  name: string;
  /** Canonical MODULE_CATALOG id the door leads into. */
  targetDesk: string;
  /** Panel key the target desk understands. */
  panel: string;
  /** Extra search terms (the Sidebar search matches name/id/keywords). */
  keywords?: string;
}

export const DESK_DOORS: DeskDoor[] = [
  {
    id: 'bahikhata',
    name: 'Bahi-Khata Seva',
    targetDesk: 'treasury',
    panel: 'bahikhata',
    keywords:
      'bahi khata bahikhata paper register digitisation digitization scan ' +
      'বহি খাতা বহিখাতা बही खाता बहीखाता dan khata দান খাতা दान खाता',
  },
];

/** Find a door by its id. */
export function doorById(id: string): DeskDoor | undefined {
  return DESK_DOORS.find((d) => d.id === id);
}

/**
 * The doors visible for a given set of visible desk ids (the Sidebar's
 * filteredModules). A door appears iff its target desk is in the set —
 * the target's own taxonomy/role/domain/search verdict IS the door's.
 * (Search and domain-pill are already baked into the Sidebar's filtered
 * list for desks; the Sidebar additionally matches the search term
 * against the door itself when a term is present.)
 */
export function doorsForVisibleDesks(visibleDeskIds: Iterable<string>): DeskDoor[] {
  const visible = new Set(visibleDeskIds);
  return DESK_DOORS.filter((d) => visible.has(d.targetDesk));
}

/** Does the door itself match a sidebar search term? */
export function doorMatchesSearch(door: DeskDoor, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return (
    door.name.toLowerCase().includes(q) ||
    door.id.toLowerCase().includes(q) ||
    door.targetDesk.toLowerCase().includes(q) ||
    (door.keywords || '').toLowerCase().includes(q)
  );
}
