import React, { useState } from 'react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { AssistantSheet } from './AssistantSheet';

/**
 * ai/components/AskButton.tsx — the devotee's "🙏 Ask" floating entry.
 * =====================================================================
 * PLACEMENT (verified 2026-10-18, Worker C — do not move without re-verifying):
 *
 * - SOS PanicButton: `fixed right-5 bottom-[calc(92px+env(safe-area-inset-bottom))]
 *   md:bottom-5 z-[9990]` (src/crisis/PanicButton.tsx:178-181).
 * - Solo mobile tab bar: `fixed bottom-0 inset-x-0 z-40` (AppShell.tsx:100).
 * - Solo desktop sidebar: `fixed left w-60` (240px), `z-40`, full height (AppShell.tsx:41).
 * - Org-workspace view mounts TawkToWidget at `fixed bottom-6 left-6` — a direct
 *   clash with a bottom-left FAB on desktop.
 *
 * Hence: this button renders for SOLO sessions only (devotee UI — Phase 0
 * scope), mirrored to the SOS thumb zone on the left:
 * - mobile: `left-5` at the SAME `bottom-[calc(92px+env(safe-area-inset-bottom))]`
 *   offset as SOS — clear of the tab bar, clear of SOS (opposite side).
 * - desktop: `md:left-[260px] md:bottom-5` — bottom-left of the content column,
 *   just right of the verified 240px sidebar.
 * - `z-[9980]` sits below SOS (9990) so the panic button always wins.
 *
 * ≥56px touch target; warm halo + "Ask" pill in the SOS FAB's visual language.
 */
export const AskButton: React.FC = () => {
  const { isAuthenticated, sessionKind } = useAuthWorkspace();
  const [open, setOpen] = useState(false);

  // Solo-only: the assistant is a devotee aid, and the solo shell is the only
  // layout whose bottom-left zone has been verified clash-free.
  if (!isAuthenticated || sessionKind !== 'solo') return null;

  return (
    <>
      {!open && (
        <div className="fixed left-5 z-[9980] select-none bottom-[calc(92px+env(safe-area-inset-bottom))] md:left-[260px] md:bottom-5 flex flex-col items-center gap-1.5">
          <button
            type="button"
            aria-label="Ask the assistant"
            data-guide-anchor="ask-button"
            onClick={() => setOpen(true)}
            className="relative rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70"
            style={{ width: 56, height: 56 }}
          >
            {/* Soft warm halo — visible, never alarming */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full animate-pulse"
              style={{ boxShadow: '0 0 0 6px rgba(251,191,36,0.16), 0 8px 24px rgba(124,45,18,0.40)' }}
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-full flex items-center justify-center shadow-2xl text-[26px]"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, #f59e0b 0%, #d97706 45%, #92400e 100%)',
              }}
            >
              🙏
            </span>
          </button>
          <span className="text-[11px] font-bold text-amber-950 bg-amber-100/95 px-2.5 py-0.5 rounded-full shadow">
            Ask
          </span>
        </div>
      )}
      <AssistantSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
};
