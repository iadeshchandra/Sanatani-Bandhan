import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { AssistantSheet } from './AssistantSheet';

/** Event that opens the assistant sheet from anywhere (e.g. the Profile
 *  "🙏 Ask" row). The FAB stays the primary entry; this is the named door. */
export const ASSISTANT_OPEN_EVENT = 'sb:open-assistant';

/**
 * Focused form routes (QUEUED #41): on the auth / org-registration forms
 * the FAB floated over form content (it covered field labels inside the
 * scrolling form card). The assistant is a shell aid — on these routes
 * it steps aside entirely; the Profile "🙏 Ask" row remains the door
 * inside the app.
 */
const FORM_ROUTES = ['/register-org', '/login', '/signup'];

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
 * - QUEUED #52 (audit D12): auto-hides while the page scrolls and returns
 *   ~700ms after it settles — a primary action passing through its corner
 *   mid-scroll (the audit's Seva Wallet "Top up") is never covered while
 *   the devotee is moving; the sb-has-sos bottom clearance covers rest.
 *
 * ≥56px touch target; warm halo + "Ask" pill in the SOS FAB's visual language.
 */
export const AskButton: React.FC = () => {
  const { isAuthenticated, sessionKind } = useAuthWorkspace();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  // QUEUED #52 (audit D12): while the devotee is scrolling, the FAB
  // steps aside — the audit caught it sitting on real controls mid-page
  // (the Seva Wallet "Top up" button rendered as "🙏op up"). The
  // bottom-clearance CSS only guarantees the END of a page rests clear;
  // mid-scroll, whatever passes through the FAB's corner is covered.
  // So: scroll → the FAB fades/slides out (pointer-events off); it
  // returns ~700ms after the scroll settles, when the devotee is
  // reading again. Same transient-FAB pattern the SOS button uses
  // (it auto-collapses on scroll). Capture phase catches inner
  // scrollers too; rAF-throttled so it stays free on 2GB devices.
  const [scrolling, setScrolling] = useState(false);

  // Named door: Profile's "🙏 Ask" row (and the assistant's own
  // upgrade intent) can open the sheet without the FAB.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(ASSISTANT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ASSISTANT_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    let raf = 0;
    let timer: number | undefined;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        setScrolling(true);
        if (timer !== undefined) window.clearTimeout(timer);
        timer = window.setTimeout(() => setScrolling(false), 700);
      });
    };
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      if (raf) window.cancelAnimationFrame(raf);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  // The FAB stays SOLO-only: the solo shell is the only layout whose
  // bottom-left zone has been verified clash-free (the org view's
  // bottom-left belongs to TawkTo on desktop).
  // Blueprint C: the SHEET (and its named-door listener) now also
  // mounts for ORG sessions — the org entry is the "🙏 Ask" header
  // button in OrgSpaceShell, which dispatches ASSISTANT_OPEN_EVENT.
  // No floating element is added to the org layout.
  // Form routes: never float over a focused form (QUEUED #41).
  if (!isAuthenticated || FORM_ROUTES.includes(pathname)) return null;
  const showFab = sessionKind === 'solo';
  if (!showFab && sessionKind !== 'org') return null;

  return (
    <>
      {showFab && !open && (
        <div
          aria-hidden={scrolling}
          className={`fixed left-5 z-[9980] select-none bottom-[calc(92px+env(safe-area-inset-bottom))] md:left-[260px] md:bottom-5 flex flex-col items-center gap-1.5 transition-all duration-200 ${
            scrolling ? '-translate-x-4 opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
          }`}
        >
          <button
            type="button"
            aria-label="Ask the assistant"
            data-guide-anchor="ask-button"
            tabIndex={scrolling ? -1 : 0}
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
