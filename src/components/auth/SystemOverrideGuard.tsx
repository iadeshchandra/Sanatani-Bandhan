import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { isOwnerEmail } from '../../config/ownerAllowlist';

interface SystemOverrideGuardProps {
  children: React.ReactNode;
}

export const SystemOverrideGuard: React.FC<SystemOverrideGuardProps> = ({ children }) => {
  const { firebaseUser, isLoading } = useAuthWorkspace();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs">
        Verifying authorization...
      </div>
    );
  }

  // SECURITY (C-1): admin routes are gated on a server-verified signal only —
  // a signed-in Firebase user whose VERIFIED email is on the owner allowlist
  // (see src/config/ownerAllowlist.ts). Client React role state is never
  // trusted here. No Firebase user = denied.
  const isAuthorizedOwner =
    !!firebaseUser &&
    firebaseUser.emailVerified === true &&
    isOwnerEmail(firebaseUser.email);

  // If unauthorized (or if they are a regular Temple Admin, CSO, Priest, Devotee, etc.),
  // immediately bounce them to '/' with silent failure to preserve complete obscurity.
  if (!isAuthorizedOwner) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default SystemOverrideGuard;
