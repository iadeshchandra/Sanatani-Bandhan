/**
 * useWorkspaceInr — React binding for the workspace-currency law (QUEUED #60).
 * ============================================================================
 * Every money display in a suite or ERP desk must render in the workspace's
 * OWN operating currency (a Bangladeshi goshala sees ৳, not ₹). The one
 * resolver is `lib/treasuryDisplay` (#51); this hook is only its binding:
 *
 *   const inr = useInr();            // (n) => formatWorkspaceAmount(n, wsCurrency)
 *   const wsCurrency = useWorkspaceCurrency();  // { code, symbol } for labels
 *
 * Components that used the old module-level `inr` helpers (which hard-coded
 * ₹) bind this instead — call sites stay `inr(amount)` byte-identical.
 *
 * Outside an AuthWorkspaceProvider (isolated renders, print previews) the
 * resolver receives no workspace and falls back to the platform default —
 * the same behaviour as `resolveWorkspaceCurrency(undefined)`.
 */

import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import {
  resolveWorkspaceCurrency,
  formatWorkspaceAmount,
  type WorkspaceCurrency,
} from '../lib/treasuryDisplay';

/** The active workspace's currency ({ code, symbol }), resolved per #51. */
export function useWorkspaceCurrency(): WorkspaceCurrency {
  let activeWorkspace: unknown;
  try {
    activeWorkspace = useAuthWorkspace().activeWorkspace;
  } catch {
    activeWorkspace = undefined;
  }
  return resolveWorkspaceCurrency(activeWorkspace as never);
}

/** Workspace-bound amount formatter: symbol + per-currency grouping. */
export function useInr(): (n: number) => string {
  const currency = useWorkspaceCurrency();
  return (n: number) => formatWorkspaceAmount(n, currency);
}
