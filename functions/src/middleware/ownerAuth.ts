import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from './authMiddleware';

/**
 * Platform owner identity — the single human who owns the SaaS.
 * Hardcoded (not env-configurable) so a compromised env cannot mint owners.
 * Matches the client-side GodMode gate (verified owner email).
 */
export const OWNER_EMAIL = 'iadeshchandra@gmail.com';
export const OWNER_UID = 'ZBGzBZXdGgSJVkB9ZUixGPY1T353';

/**
 * isOwner(ctx) — true when the caller IS the platform owner, by UID or by
 * verified email. UID is the primary signal (immutable); email is the
 * fallback for the owner's Google sign-in before claims propagate.
 */
export function isOwnerUid(uid: string | undefined | null): boolean {
  return uid === OWNER_UID;
}

export function isOwnerEmail(email: string | undefined | null): boolean {
  return typeof email === 'string' && email.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

/**
 * requireOwner — the strongest gate in the API. Only the platform owner
 * passes. Use for platform-wide oversight endpoints (user disable, plan
 * changes, audit-log queries, data export of any workspace).
 *
 * Denials return 403 JSON. Every denial is logged server-side.
 */
export const requireOwner = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  await requireAuth(req, res, async () => {
    const ctx = req.authContext;
    if (!ctx) return; // requireAuth already responded 401

    // Firebase verifies email for Google sign-in; for password accounts the
    // UID check is authoritative. Either signal grants owner access.
    const ok = isOwnerUid(ctx.uid) || isOwnerEmail(ctx.email);

    if (!ok) {
      console.warn(
        `[OwnerAuth] DENIED owner endpoint ${req.method} ${req.path} for uid=${ctx.uid} email=${ctx.email || 'n/a'}`
      );
      res.status(403).json({
        error: 'Forbidden',
        code: 'OWNER_ONLY',
        message: 'This endpoint is restricted to the platform owner.',
      });
      return;
    }
    next();
  });
};
