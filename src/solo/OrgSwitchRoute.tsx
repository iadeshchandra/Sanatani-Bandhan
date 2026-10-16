import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useToast } from '../context/ToastContext';

/* OrgSwitchRoute — /app/org/:orgId.
 * =====================================================================
 * Runs the exitSoloSession() + switchWorkspace() flow so the org opens
 * in the normal org session. Phase 2 renders the full org space chrome
 * (OrgSpaceShell: back button, "Viewing as [Role]" pill, breadcrumb,
 * per-org RBAC) around AppContent via AppContentRouter — no placeholder
 * "coming soon" here.
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
