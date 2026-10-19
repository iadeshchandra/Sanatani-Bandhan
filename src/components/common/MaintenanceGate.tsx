/**
 * MaintenanceScreen + MaintenanceGate — AUDIT FIX #8.
 * =====================================================
 * When the owner flips maintenance mode in GodMode → Settings → Maintenance,
 * every non-owner user sees this warm screen instead of the app. The owner
 * (signed in with an owner email) bypasses it, so GodMode stays reachable
 * to turn maintenance back OFF.
 *
 * Mounted inside AuthWorkspaceProvider (children are wrapped) — no App.tsx
 * change needed. Fail-open: while the config is loading, the app renders
 * normally; only a confirmed `maintenanceMode: true` swaps the screen.
 */
import React from 'react';
import { shouldShowMaintenance, usePlatformStatus } from '../../hooks/usePlatformStatus';
import { isOwnerEmail } from '../../config/ownerAllowlist';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';

export const MaintenanceScreen: React.FC<{ message?: string }> = ({ message }) => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-amber-50 via-orange-50/60 to-stone-100">
    <div className="max-w-md w-full rounded-3xl border border-amber-200/60 bg-white/90 p-8 text-center shadow-xl">
      <p className="text-5xl mb-4">🪔</p>
      <h1 className="text-xl font-black text-amber-900">A short pause for care</h1>
      <p className="text-sm text-stone-600 mt-3 leading-relaxed">
        {message?.trim()
          ? message
          : 'We are tending to Sanatani Bandhan with a little maintenance. We will be back with you very soon.'}
      </p>
      <div className="flex items-center justify-center gap-2 mt-6 text-sm text-stone-500">
        <span className="w-3 h-3 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
        <span>We&rsquo;ll be back soon 🙏</span>
      </div>
      <p className="text-[11px] text-stone-400 mt-6">
        Your data is safe. Nothing is lost — please check back in a little while.
      </p>
    </div>
  </div>
);

export const MaintenanceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const status = usePlatformStatus();
  // Always rendered inside AuthWorkspaceProvider, so the context is available.
  const { firebaseUser } = useAuthWorkspace();
  if (status.loaded && shouldShowMaintenance(status, isOwnerEmail(firebaseUser?.email))) {
    return <MaintenanceScreen message={status.maintenanceMessage} />;
  }
  return <>{children}</>;
};
