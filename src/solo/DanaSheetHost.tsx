import React, { useEffect, useState } from 'react';
import { ExpressDanaSheet } from './ExpressDanaSheet';
import {
  registerDanaSheetOpener,
  unregisterDanaSheetOpener,
  DANA_SHEET_EVENT,
  toSheetPrefill,
  type DanaSheetPrefill,
  type SheetPrefill,
} from '../lib/danaSheet';

/**
 * DanaSheetHost — the SINGLE owner of the ExpressDanaSheet instance in the
 * solo shell.
 * ==========================================================================
 * QUEUED FIX #2 (2026-10-19): the Home wallet card's "🪔 Give" quick-action
 * called `openDanaSheet({})` but the only handler lived in GivingTab, which
 * mounts only on the `giving` sub-tab — a silent no-op everywhere else
 * (Home, Wallet tab, AI assistant, Seva cards). This host mounts once in
 * SoloWorkspaceShell (always alive during a solo session), so
 * `openDanaSheet()` works from ANYWHERE in the solo shell.
 *
 * It honours both halves of the lib/danaSheet.ts contract: opener
 * registration (preferred) and the `sb:open-dana-sheet` window event
 * (fallback). StrictMode-safe — cleanup unregisters the exact closure.
 */
export const DanaSheetHost: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<SheetPrefill | undefined>(undefined);

  useEffect(() => {
    const apply = (p: DanaSheetPrefill) => {
      // Fresh mapping on every open — a previous card's amount never leaks
      // into a fresh sheet.
      setPrefill(toSheetPrefill(p));
      setOpen(true);
    };
    const onEvent = (e: Event) => apply((e as CustomEvent<DanaSheetPrefill>).detail || {});
    registerDanaSheetOpener(apply);
    window.addEventListener(DANA_SHEET_EVENT, onEvent);
    return () => {
      unregisterDanaSheetOpener(apply);
      window.removeEventListener(DANA_SHEET_EVENT, onEvent);
    };
  }, []);

  return <ExpressDanaSheet open={open} onClose={() => setOpen(false)} prefill={prefill} />;
};
