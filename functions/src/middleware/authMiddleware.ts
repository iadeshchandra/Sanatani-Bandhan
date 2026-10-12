import { Request, Response, NextFunction } from 'express';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Resolved authorization context attached to every authenticated request.
 * Role/tenant prefer Firebase custom claims (minted by the server provisioning
 * engine); fall back to the `users/{uid}` Firestore document during migration.
 */
export interface AuthContext {
  uid: string;
  role: string;
  roles: string[];
  tenantId: string | null;
  isSuperAdmin: boolean;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken | any;
  authContext?: AuthContext;
}

const norm = (r: string | null | undefined): string => (r || '').trim().toLowerCase();

async function resolveAuthContext(decoded: DecodedIdToken): Promise<AuthContext> {
  const db = getFirestore();
  const token: any = decoded;

  let role: string | null = typeof token.role === 'string' ? token.role : null;
  let tenantId: string | null = typeof token.tenantId === 'string' ? token.tenantId : null;
  const roles: string[] = Array.isArray(token.roles)
    ? token.roles.filter((r: any) => typeof r === 'string')
    : [];
  let isSuperAdmin = token.isSuperAdmin === true;

  // platform_admins registry (server-managed)
  try {
    const adminDoc = await db.collection('platform_admins').doc(decoded.uid).get();
    if (adminDoc.exists && adminDoc.data()?.active !== false) {
      isSuperAdmin = true;
    }
  } catch (e) {
    console.warn('[AuthMiddleware] platform_admins lookup failed:', (e as any)?.message || e);
  }

  // users/{uid} document fallback for role + tenant
  if (!role || !tenantId) {
    try {
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      const data = userDoc.data();
      if (data) {
        if (!role && typeof data.role === 'string') role = data.role;
        if (!tenantId && typeof data.workspaceId === 'string') tenantId = data.workspaceId;
        if (!tenantId && typeof data.defaultWorkspaceId === 'string') tenantId = data.defaultWorkspaceId;
        if (!tenantId && typeof data.tenantId === 'string') tenantId = data.tenantId;
      }
    } catch (e) {
      console.warn('[AuthMiddleware] users doc lookup failed:', (e as any)?.message || e);
    }
  }

  if (isSuperAdmin && !role) role = 'SuperAdmin';

  return {
    uid: decoded.uid,
    role: role || 'Devotee',
    roles,
    tenantId,
    isSuperAdmin,
    email: decoded.email,
  };
}

/**
 * requireAuth — rejects requests without a valid Firebase ID token (401 JSON).
 * Attaches req.authContext for downstream role checks.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'MISSING_TOKEN',
      message: 'Missing or malformed Authorization header. Expected: Bearer <Firebase ID token>',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'MISSING_TOKEN',
      message: 'Empty bearer token',
    });
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.user = decoded;
    req.authContext = await resolveAuthContext(decoded);
    next();
  } catch (error: any) {
    console.error('[AuthMiddleware] Token verification failed:', error?.message || error);
    res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_TOKEN',
      message: 'Invalid, expired, or revoked authentication token',
    });
  }
};

/**
 * requireRole(...roles) — per-route RBAC gate. Assumes requireAuth ran first
 * (runs it implicitly if not). SuperAdmin bypasses all role checks.
 * Denials return 403 JSON with a machine-readable code.
 */
export const requireRole = (...roles: string[]) => {
  const allowed = roles.map(norm);
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.authContext) {
      // Implicitly authenticate if the route didn't chain requireAuth first.
      await requireAuth(req, res, () => {});
      if (!req.authContext) return; // requireAuth already responded 401
    }

    const ctx = req.authContext!;
    if (ctx.isSuperAdmin) {
      next();
      return;
    }

    const held = [ctx.role, ...ctx.roles].map(norm);
    const granted = held.some((h) => h && allowed.includes(h));

    if (!granted) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_ROLE',
        message: `Access requires one of the following roles: ${roles.join(', ')}`,
        requiredRoles: roles,
      });
      return;
    }
    next();
  };
};

/**
 * requireSuperAdmin — legacy entry point, now composed on the hardened stack.
 * Kept signature-compatible: (req, res, next).
 */
export const requireSuperAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  await requireAuth(req, res, async () => {
    await requireRole('SuperAdmin')(req, res, next);
  });
};
