import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';

/* OrgSwitchRoute — /app/org/:orgId.
 * =====================================================================
 * Track 0 architecture: "Solo is home, organisations are destinations."
 * Entering an org is an ARRIVAL — a clear context switch with the org's
 * identity, visually distinct from solo home. Leaving returns to HOME
 * (the org shell's ← Home breadcrumb re-enters the solo session).
 *
 * Runs the exitSoloSession() + switchWorkspace() flow so the org opens
 * in the normal org session. Phase 2 renders the full org space chrome
 * (OrgSpaceShell: back button, role chip, breadcrumb, per-org RBAC)
 * around AppContent via AppContentRouter.
 */
export const OrgSwitchRoute: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { switchWorkspace, exitSoloSession, workspaces } = useAuthWorkspace();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const ran = useRef(false);
  const [failed, setFailed] = useState(false);

  const orgName = workspaces.find((w) => w.id === orgId)?.name || 'this organisation';

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      if (!orgId) {
        navigate('/app/orgs', { replace: true });
        return;
      }
      const ok = await switchWorkspace(orgId);
      if (ok) {
        exitSoloSession();
        // Arrival is announced by this transition screen + the org shell's
        // own welcome hint — no toast needed here.
      } else {
        setFailed(true);
        showToast('Could not open this organisation right now.', 'error');
        navigate('/app/orgs', { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (failed) return null;

  // The arrival moment: org identity front and center, warm and unhurried.
  // A real user never wonders "am I in a demo?" — this screen names exactly
  // where they are going.
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <div
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-4xl shadow-lg shadow-orange-500/25"
        aria-hidden
      >
        🏛️
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600 mt-6">
        Entering
      </p>
      <h1 className="font-display text-2xl font-extrabold text-stone-900 mt-1 max-w-md">
        {orgName}
      </h1>
      <p className="text-sm text-stone-500 mt-2 max-w-sm">
        Your organisation workspace is opening — desks, treasury and members, all in one place.
      </p>
      <div className="flex items-center gap-2 mt-6" aria-hidden>
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};
