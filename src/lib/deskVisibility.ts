/**
 * deskVisibility.ts — the ONE per-role desk-visibility decision for
 * org-view surfaces (QUEUED #56, audit A2-D2/D4/D6).
 * =====================================================================
 * Before #56 the Sidebar owned this logic inline and the Command
 * Palette filtered by org taxonomy ONLY — so the palette (and its
 * quick actions) offered Treasury / POS / restricted desks to roles
 * whose nav correctly hid them, and every selection landed on
 * RestrictedAccess. The decision now lives here, pure and testable,
 * consumed by BOTH the Sidebar and the CommandPalette (RoleHome's
 * hand-copied third version is a known residual — see #56 NOTES).
 *
 * Semantics are the Sidebar's, verbatim, with three audited
 * corrections baked in:
 *  - D6: 'dashboard' (the Command Center every staff role LANDS on)
 *    is visible to every staff role — Priest/Accountant domain hides
 *    no longer remove the only sidebar path home, and the CSO
 *    allowlist includes it.
 *  - D4: the fallback branch gains an explicit 'membership' case
 *    mirroring its mount guard (Trustee/SuperAdmin) — a Sevadar no
 *    longer sees a Members desk the mount refuses.
 *  - Devotee-only members get NO admin desks (the Sidebar renders no
 *    B2B nav for them at all; the palette must agree).
 *
 * Taxonomy (isModuleAllowed), the federation 2+-branch rule, the
 * domain pill and search stay with the callers — this helper answers
 * exactly one question: "may THIS role see THIS desk?"
 *
 * QUEUED #57 (audit A2-D9 / A1-D10): the allowlists below speak
 * CANONICAL catalog ids only. The dead spellings the #57 catalog
 * cleanup removed have been dropped from these lists — callers only
 * ever pass MODULE_CATALOG rows, so an alias entry here was a promise
 * no caller could redeem, and a trap for the next editor.
 */

import type { UserRole } from '../types';

export interface DeskVisibilityModule {
  id: string;
  domain: number;
}

export type PermissionCheck = (roles: (UserRole | string)[]) => boolean;

export function isDeskVisibleForRole(
  mod: DeskVisibilityModule,
  role: UserRole | string | null | undefined,
  checkPermission: PermissionCheck,
): boolean {
  // Devotee-only members have no B2B surfaces (Sidebar renders null).
  if (role === 'Devotee' || role === 'DEVOTEE') return false;

  if (role === 'Priest') {
    // D6: the Command Center is the Priest's landing — always a way home.
    if (mod.id === 'dashboard') return true;
    // Priest: hide links to Domain 1, 2, and 6
    if (mod.domain === 1 || mod.domain === 2 || mod.domain === 6) {
      return false;
    }
    const priestAllowed = [
      'poojaBooking', 'mandirPuja', 'purohitDesk', 'purohitMarket',
      'pitruShradh', 'panchang', 'yatranet-gis', 'satsang',
      'granthLibrary', 'utsavPanjika', 'dharmicAssistant', 'sadhana-karma',
      'rakthaSeva', 'goshala', 'annadanam', 'annakshetra-one', 'ashramKutir', 'dharamshala',
      'gurukul', 'gurukulAcademy', 'vidyalaya', 'pathshala', 'goshala-one', 'ashram-one',
      'utsav-one', 'tirth-one', 'yoga-one', 'matha-one', 'satsang-one', 'sabha-one', 'samskara-one',
    ];
    return priestAllowed.includes(mod.id) || mod.domain === 3;
  }

  if (role === 'Accountant') {
    // D6: the Command Center is the Accountant's landing — always a way home.
    if (mod.id === 'dashboard') return true;
    // Accountant: hide links to Domain 1, 3, and 6
    if (mod.domain === 1 || mod.domain === 3 || mod.domain === 6) {
      return false;
    }
    const accountantAllowed = [
      'quick-chanda-pos', 'treasury', 'hundi-audit', 'ratna-bhandar',
      'taxReceipts', 'form10bd', 'campaigns', 'karmaLedger', 'assets', 'inventory',
      'bhoomi', 'vahan', 'recurring-seva',
    ];
    return accountantAllowed.includes(mod.id) || mod.domain === 2;
  }

  if (role === 'CSO') {
    // CSO authorized for tactical radar, gate command checkin, crisis
    // command, qr scanner; blocked from treasury & rituals.
    // D6: 'dashboard' added — the CSO lands on the Command Center too.
    const csoAllowed = [
      'dashboard',
      'tactical-radar', 'checkin', 'crisis-command', 'qrScanner', 'yatranet-gis',
      'sevadar-roster',
    ];
    return csoAllowed.includes(mod.id);
  }

  if (role === 'SuperAdmin') {
    return true;
  }

  // Fallback for Trustee / Sevadar / Volunteer
  if (['checkin', 'gate-command', 'darshan-checkin'].includes(mod.id)) {
    return checkPermission(['CSO', 'TRUSTEE', 'SEVADAR', 'VOLUNTEER']);
  }
  if (['bulkImport', 'federation'].includes(mod.id)) {
    return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']);
  }
  if (['treasury', 'taxReceipts', 'form10bd', 'hundi-audit', 'ratna-bhandar'].includes(mod.id)) {
    return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']);
  }
  if (['campaigns', 'assets'].includes(mod.id)) {
    return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE']);
  }
  if (mod.id === 'inventory') {
    return checkPermission(['ACCOUNTANT', 'MANAGER', 'TRUSTEE', 'VOLUNTEER']);
  }
  if (['poojaBooking', 'mandirPuja', 'purohitDesk', 'purohitMarket', 'pitruShradh'].includes(mod.id)) {
    return checkPermission(['PUROHIT', 'PRIEST', 'MANAGER', 'TRUSTEE']);
  }
  if (['sandeshBroadcast'].includes(mod.id)) {
    return checkPermission(['MANAGER', 'TRUSTEE']);
  }
  if (['workspace-hub', 'masterSettings', 'appStore', 'spiritualSettings', 'panchayatPolls'].includes(mod.id)) {
    return checkPermission(['TRUSTEE']);
  }
  if (mod.id === 'membership') {
    // D4: mirror the mount guard (App.tsx: Trustee/SuperAdmin only) —
    // governance desks are not promised to roles the mount refuses.
    return checkPermission(['TRUSTEE', 'SuperAdmin']);
  }
  if (['tactical-radar', 'trusteeGovernance', 'sevadar-roster', 'legalVault', 'crisis-command'].includes(mod.id)) {
    return checkPermission(['CSO', 'TRUSTEE', 'MANAGER', 'SEVADAR', 'VOLUNTEER']);
  }
  return true;
}
