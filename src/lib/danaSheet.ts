/**
 * lib/danaSheet.ts — Phase-1 coordination contract for the express dana sheet.
 * ==========================================================================
 * The express dana sheet is built by Phase 1 (the "express dana sheet" item
 * from the competitor synthesis). Seva cards (Phase 2) must NOT duplicate it —
 * they open it prefilled via this bridge.
 *
 * Contract (two supported integration styles; either is fine):
 *
 *   1. Opener registration (preferred): Phase 1 calls
 *      `registerDanaSheetOpener((prefill) => openMySheet(prefill))` when its
 *      sheet provider mounts, and `unregisterDanaSheetOpener()` on unmount.
 *
 *   2. Window event (fallback): `openDanaSheet` also dispatches
 *      `CustomEvent('sb:open-dana-sheet', { detail: prefill })` so a sheet
 *      mounted anywhere in the tree can listen for it.
 *
 * The prefill props mirror the sheet's own props:
 *   initialAmount  — the fixed card amount, in the card's currency
 *   initialOrg     — { id, name } of the receiving organisation
 *   initialPurpose — human purpose line, e.g. "Annadanam — one day's bhog"
 *   cardId         — the seva card id, so the sheet can attribute the gift
 *
 * `hasDanaSheetHandler()` lets callers show an honest fallback ("the express
 * sheet is arriving shortly — please use Donate for now") when Phase 1's
 * sheet is not yet mounted.
 */
export interface DanaSheetOrg {
  id: string;
  name: string;
}

export interface DanaSheetPrefill {
  initialAmount?: number;
  initialOrg?: DanaSheetOrg;
  initialPurpose?: string;
  /** The seva card this gift fulfils (goal-tracker attribution). */
  cardId?: string;
  /** Currency of initialAmount. */
  currency?: 'INR' | 'BDT' | 'USD';
}

export const DANA_SHEET_EVENT = 'sb:open-dana-sheet';

type DanaSheetOpener = (prefill: DanaSheetPrefill) => void;

let registeredOpener: DanaSheetOpener | null = null;

export function registerDanaSheetOpener(opener: DanaSheetOpener): void {
  registeredOpener = opener;
}

export function unregisterDanaSheetOpener(opener: DanaSheetOpener): void {
  if (registeredOpener === opener) registeredOpener = null;
}

/** True when Phase 1's sheet is live and will handle `openDanaSheet`. */
export function hasDanaSheetHandler(): boolean {
  return registeredOpener !== null;
}

export function openDanaSheet(prefill: DanaSheetPrefill): void {
  if (registeredOpener) {
    registeredOpener(prefill);
    return;
  }
  window.dispatchEvent(new CustomEvent<DanaSheetPrefill>(DANA_SHEET_EVENT, { detail: prefill }));
}

/**
 * The sheet's own prefill shape (mirrors ExpressDanaSheet's DanaPrefill —
 * kept structural here so this module stays firebase-free and jest-safe).
 */
export interface SheetPrefill {
  amount?: number;
  orgName?: string;
  purpose?: string;
}

/**
 * Maps the external contract prefill to the sheet's own prefill shape.
 * Pure and firebase-free (jest-safe). QUEUED FIX #2: single source of truth —
 * DanaSheetHost uses this; the old per-tab copy in GivingTab is gone.
 */
export function toSheetPrefill(p: DanaSheetPrefill): SheetPrefill {
  return {
    amount: p.initialAmount,
    orgName: p.initialOrg?.name,
    purpose: p.initialPurpose,
  };
}
