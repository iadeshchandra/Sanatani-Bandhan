/**
 * RBAC 2.0 Security Architecture - Permission Matrix
 */

export type Permission =
  | 'admin:full'
  | 'treasury:view'
  | 'treasury:write'
  | 'inventory:manage'
  | 'devotee:manage'
  | 'puja:manage'
  | 'audit:view';

export type Role = 'SuperAdmin' | 'Trustee' | 'Accountant' | 'Priest' | 'Sevadar';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SuperAdmin: [
    'admin:full',
    'treasury:view',
    'treasury:write',
    'inventory:manage',
    'devotee:manage',
    'puja:manage',
    'audit:view',
  ],
  Trustee: [
    'treasury:view',
    'treasury:write',
    'inventory:manage',
    'devotee:manage',
    'audit:view',
  ],
  Accountant: [
    'treasury:view',
    'treasury:write',
    'audit:view',
  ],
  Priest: [
    'puja:manage',
    'devotee:manage',
    'inventory:manage',
  ],
  Sevadar: [
    'devotee:manage',
    'inventory:manage',
  ],
};

/**
 * Checks whether a given role has the required permission.
 * Roles holding 'admin:full' always bypass permission checks.
 */
export const hasPermission = (
  userRole: Role | string,
  requiredPermission: Permission
): boolean => {
  if (!userRole) return false;
  const roleKey = userRole as Role;
  const permissions = ROLE_PERMISSIONS[roleKey];
  if (!permissions) return false;

  if (permissions.includes('admin:full')) {
    return true;
  }

  return permissions.includes(requiredPermission);
};

export default hasPermission;
