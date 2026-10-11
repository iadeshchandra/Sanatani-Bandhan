import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';

interface SystemOverrideGuardProps {
  children: React.ReactNode;
}

/**
 * Designated Platform Owner Email
 * Phase 10a: App Owner Route Obfuscation & Security Guarding
 */
const PLATFORM_OWNER_EMAIL = 'poranray7744@gmail.com';

export const SystemOverrideGuard: React.FC<SystemOverrideGuardProps> = ({ children }) => {
  const { currentRole, role, currentUser, firebaseUser, isLoading } = useAuthWorkspace();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-xs">
        Verifying authorization...
      </div>
    );
  }

  const effectiveRole = role || currentRole;
  const userEmail = (firebaseUser?.email || currentUser?.email || '').toLowerCase().trim();
  const isAuthorizedOwner =
    effectiveRole === 'SuperAdmin' ||
    userEmail === PLATFORM_OWNER_EMAIL.toLowerCase();

  // If unauthorized (or if they are a regular Temple Admin, CSO, Priest, Devotee, etc.),
  // immediately bounce them to '/' with silent failure to preserve complete obscurity.
  if (!isAuthorizedOwner) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default SystemOverrideGuard;
