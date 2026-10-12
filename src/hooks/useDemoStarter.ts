import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { WorkspaceConfig, WorkspaceType } from '../types';

/**
 * useDemoStarter — self-sufficient demo workspace bootstrap.
 *
 * Creates a real, org-typed demo workspace (DEMO_<TYPE>_<ts>), seeds it with
 * sample records, logs in as Trustee, and routes into the app shell.
 * Used by the public landing + contact pages, which are rendered by the
 * router WITHOUT the MainAppView demo props — so they cannot rely on a
 * parent-provided onDemoStart.
 */
export const useDemoStarter = () => {
  const navigate = useNavigate();
  const { addWorkspace, switchWorkspace, loginAsRole } = useAuthWorkspace();
  const { seedDemoData } = useData();
  const { showToast } = useToast();

  return useCallback(
    (type: WorkspaceType = 'Mandir') => {
      const demoId = `DEMO_${type.toUpperCase()}_${Date.now()}`;
      const demoWorkspace: WorkspaceConfig = {
        id: demoId,
        name: `${type} Demo Sandbox`,
        type,
        tagline: 'Interactive Test Environment',
        address: 'Virtual Demo Environment',
        city: 'Kashi',
        state: 'Uttar Pradesh',
        country: 'Bharat (India)',
        currency: 'INR',
        currencySymbol: '₹',
        phone: '+91 99999 00000',
        email: `demo@${type.toLowerCase()}.org`,
        sampradaya: 'Demo Mode',
        kuladevata: 'Demo',
        pinRequired: false,
        // SECURITY: demo workspaces never carry a real admin PIN. This field is inert.
        adminPin: '',
      };

      addWorkspace(demoWorkspace);
      // switchWorkspace is async; the login below does not depend on its result.
      void switchWorkspace(demoId);
      loginAsRole('Trustee', 'Demo User');
      seedDemoData(demoId, type);
      showToast(
        `${type} sandbox ready — explore freely, sample records loaded.`,
        'success',
        'Demo Sandbox'
      );
      // '/app' matches no explicit route → MainAppView → AppContent (app shell).
      navigate('/app');
    },
    [navigate, addWorkspace, switchWorkspace, loginAsRole, seedDemoData, showToast]
  );
};
