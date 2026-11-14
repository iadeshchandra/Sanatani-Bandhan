/**
 * lib/overlaySignal.ts — Design Audit 2 #2: floating chrome never stacks.
 * ============================================================================
 * The chrome budget is ONE floating element per screen. Invitational
 * chrome (the SOS tour pill) must yield while a real overlay — a guided
 * tour card, a sheet, a modal — is on screen, and its slot must never
 * sit on top of the FABs.
 *
 * This is the smallest honest shared signal for that discipline: a
 * module-level set of overlay tokens. A surface ACQUIRES a token while
 * its overlay is actually rendered and RELEASES it on close/unmount.
 * Consumers read the aggregate through useAnyOverlayOpen().
 *
 * Wired mount points (the shared primitives, so one wiring covers every
 * surface that uses them):
 *   · components/guide/CoachMark.tsx        — every guided-tour card
 *   · components/common/ui/Modal.tsx        — the kit modal
 *   · components/language/NativeWelcomeSheet.tsx — the language sheet
 *   · components/public/DemoTour.tsx        — the first-run demo tour card
 *   · components/account/PrivacyNotice.tsx  — the first-run privacy dialog
 *
 * Hand-rolled private modals do not acquire yet (kit adoption is audit
 * item #1's separate programme); a surface joins the discipline by
 * acquiring a token while its overlay renders — nothing else is needed.
 *
 * The change event follows the codebase's window CustomEvent pattern
 * (cf. firstRunDialogs' FIRST_RUN_DIALOGS_CHANGED). In non-DOM
 * environments the notify is a no-op and the pure reads still behave.
 */

import { useEffect, useState } from 'react';

export const OVERLAY_CHANGED = 'sanatani:overlay-changed';

const openTokens = new Set<string>();

function notifyChange(): void {
  try {
    window.dispatchEvent(new CustomEvent(OVERLAY_CHANGED));
  } catch {
    /* non-DOM environment — pure callers are unaffected */
  }
}

/** Register that an overlay (tour card / sheet / modal) is on screen. */
export function acquireOverlay(token: string): void {
  if (!openTokens.has(token)) {
    openTokens.add(token);
    notifyChange();
  }
}

/** Release a previously acquired overlay token. */
export function releaseOverlay(token: string): void {
  if (openTokens.delete(token)) {
    notifyChange();
  }
}

/** True while at least one wired overlay is on screen. */
export function anyOverlayOpen(): boolean {
  return openTokens.size > 0;
}

/** React binding: re-renders the consumer whenever the aggregate flips. */
export function useAnyOverlayOpen(): boolean {
  const [open, setOpen] = useState<boolean>(() => anyOverlayOpen());
  useEffect(() => {
    const onChange = () => setOpen(anyOverlayOpen());
    window.addEventListener(OVERLAY_CHANGED, onChange);
    // Re-sync on mount in case a change landed between render and effect.
    onChange();
    return () => window.removeEventListener(OVERLAY_CHANGED, onChange);
  }, []);
  return open;
}
