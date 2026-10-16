import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';

/* OrgSwitchRoute — /app/org/:orgId.
 * =====================================================================
 * Phase 1: no placeholder "coming soon" — this route runs the EXISTING
 * exitSoloSession() + switchWorkspace() flow so the org space opens in
 * the normal org session (AppContent). Phase 2 will render the full
 * org space inline in the shell instead.
 */
export const OrgSwitchRoute: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { switchWorkspace, exitSoloSession } = useAuthWorkspace();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const ran = useRef(false);

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
        showToast('🙏', 'success');
      } else {
        showToast('Could not open this organisation right now.', 'error');
        navigate('/app/orgs', { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center text-center">
      <div className="text-4xl animate-pulse" aria-hidden>
        🏛️
      </div>
      <p className="text-sm font-bold text-stone-500 mt-4">Opening organisation…</p>
    </div>
  );
};
