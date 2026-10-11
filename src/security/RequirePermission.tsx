import React from 'react';
import { ShieldAlert, Lock, AlertTriangle } from 'lucide-react';
import { hasPermission, Permission, Role } from './rbac';

export interface RequirePermissionProps {
  requiredPermission: Permission;
  userRole: Role;
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  requiredPermission,
  userRole,
  children,
  fallbackTitle = 'Restricted Security Access',
  fallbackDescription,
}) => {
  const isAuthorized = hasPermission(userRole, requiredPermission);

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto my-6 text-center shadow-xs">
      <div className="w-12 h-12 bg-rose-100 rounded-2xl text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-2xs">
        <ShieldAlert className="w-6 h-6" />
      </div>

      <h3 className="text-base sm:text-lg font-black text-rose-900 tracking-tight">
        {fallbackTitle}
      </h3>

      <p className="text-xs sm:text-sm text-rose-700 mt-2 leading-relaxed max-w-md mx-auto">
        {fallbackDescription ||
          `Your role (${userRole}) lacks the required security clearance [${requiredPermission}] to view or execute actions on this operational desk.`}
      </p>

      <div className="mt-4 pt-4 border-t border-rose-200/60 flex items-center justify-center gap-2 text-[11px] font-bold text-rose-800">
        <Lock className="w-3.5 h-3.5" />
        <span>Granular RBAC 2.0 Policy Enforced &bull; Contact Temple Super Admin</span>
      </div>
    </div>
  );
};

export default RequirePermission;
