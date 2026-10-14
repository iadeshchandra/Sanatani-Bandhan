import { Router, Response } from 'express';
import { createHash } from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireRole, requireSuperAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import { requireOwner, OWNER_UID, OWNER_EMAIL } from '../middleware/ownerAuth';
import { auditLog, queryAuditLogs } from '../lib/audit';
import { standardLimiter } from '../middleware/rateLimit';

const router = Router();

// Every /api/admin/* route requires a valid Firebase ID token.
router.use(requireAuth);

/**
 * Slugify string helper for generating URL-safe tenant IDs
 */
const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const KNOWN_ROLES = [
  'SuperAdmin', 'Trustee', 'Accountant', 'Priest', 'Sevadar', 'Devotee', 'Manager', 'CSO',
];

function hashPin(pin: string): string | null {
  const pepper = process.env.PIN_PEPPER;
  if (!pepper) return null;
  return createHash('sha256').update(`${pepper}:${pin}`, 'utf8').digest('hex');
}

/**
 * POST /api/admin/tenants — SuperAdmin only
 * Provision a new Mandir tenant partition in Firestore.
 * Accepts an optional `adminPin` (4–32 chars); only its peppered SHA-256 hash
 * is stored (`adminPinHash`). The plaintext PIN is never persisted.
 */
router.post('/tenants', requireRole('SuperAdmin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, location, state, tier, custodian, adminPin } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        error: 'Bad Request',
        code: 'INVALID_INPUT',
        message: 'Tenant name is required',
      });
      return;
    }

    let adminPinHash: string | undefined;
    if (adminPin !== undefined) {
      if (typeof adminPin !== 'string' || adminPin.length < 4 || adminPin.length > 32) {
        res.status(400).json({
          error: 'Bad Request',
          code: 'INVALID_INPUT',
          message: 'adminPin must be 4–32 characters',
        });
        return;
      }
      const hashed = hashPin(adminPin);
      if (!hashed) {
        res.status(503).json({
          error: 'Service Unavailable',
          code: 'PIN_NOT_CONFIGURED',
          message: 'PIN_PEPPER is not configured on the server; cannot store admin PIN securely.',
        });
        return;
      }
      adminPinHash = hashed;
    }

    // Generate unique tenantId and code
    const slug = generateSlug(name) || 'mandir';
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const tenantId = `ws-${slug}-${randomSuffix}`;

    const codePrefix = name
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0].toUpperCase())
      .slice(0, 3)
      .join('') || 'MND';
    const code = `${codePrefix}-${(location || 'IND').slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;

    const newTenant: Record<string, any> = {
      id: tenantId,
      name: name.trim(),
      location: (location || 'India').trim(),
      state: (state || 'Dharmic Kshetra').trim(),
      tier: tier || 'Standard',
      custodian: (custodian || 'Chief Trustee').trim(),
      code,
      status: 'Active',
      createdAt: new Date(),
      createdTimestamp: FieldValue.serverTimestamp(),
      createdBy: req.authContext?.uid || req.user?.uid || 'superadmin',
    };
    if (adminPinHash) {
      newTenant.adminPinHash = adminPinHash;
      newTenant.adminPinUpdatedAt = FieldValue.serverTimestamp();
    }

    const db = getFirestore();
    await db.collection('tenants').doc(tenantId).set(newTenant);
    // Mirror into the client-managed workspaces collection (without the PIN hash —
    // the client must never see it; server reads it via Admin SDK).
    const { adminPinHash: _omit, ...clientWorkspace } = newTenant;
    await db.collection('workspaces').doc(tenantId).set(clientWorkspace, { merge: true });

    console.log(`[AdminRoutes] Provisioned new tenant partition: ${tenantId} (${code})`);

    await auditLog({
      action: 'tenant.provision',
      actorUid: req.authContext?.uid || 'unknown',
      actorEmail: req.authContext?.email,
      workspaceId: tenantId,
      targetType: 'tenant',
      targetId: tenantId,
      severity: 'warn',
      details: { name: name.trim(), code, tier: tier || 'Standard' },
      ip: ((req.headers['x-forwarded-for'] as string) || '').split(',')[0]?.trim() || req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Tenant partition provisioned successfully',
      tenant: clientWorkspace,
    });
  } catch (error: any) {
    console.error('[AdminRoutes] Error provisioning tenant:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      code: 'PROVISION_FAILED',
      message: error?.message || 'Failed to provision tenant in database',
    });
  }
});

/**
 * GET /api/admin/tenants — SuperAdmin only. List tenant partitions.
 */
router.get('/tenants', requireRole('SuperAdmin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snap = await db.collection('tenants').limit(200).get();
    const tenants = snap.docs.map((d) => {
      const { adminPinHash: _omit, ...rest } = d.data() as Record<string, any>;
      return { id: d.id, ...rest };
    });
    res.json({ success: true, tenants });
  } catch (error: any) {
    console.error('[AdminRoutes] Error listing tenants:', error);
    res.status(500).json({ error: 'Internal Server Error', code: 'LIST_FAILED', message: 'Failed to list tenants.' });
  }
});

/**
 * POST /api/admin/users/:uid/claims — SuperAdmin only.
 * The server provisioning engine: mints Firebase custom claims
 * ({ role, tenantId, roles }) AND mirrors them onto users/{uid} so that
 * Firestore rules and the client RBAC stack stay consistent.
 */
router.post('/users/:uid/claims', requireRole('SuperAdmin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { role, tenantId, roles } = req.body || {};

    if (!uid || typeof uid !== 'string') {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'uid is required.' });
      return;
    }
    if (typeof role !== 'string' || !KNOWN_ROLES.map((r) => r.toLowerCase()).includes(role.toLowerCase())) {
      res.status(400).json({
        error: 'Bad Request',
        code: 'INVALID_INPUT',
        message: `role must be one of: ${KNOWN_ROLES.join(', ')}`,
      });
      return;
    }

    const claims: Record<string, any> = { role };
    if (typeof tenantId === 'string' && tenantId) {
      claims.tenantId = tenantId;
      claims.workspaceId = tenantId; // legacy alias
    }
    if (Array.isArray(roles)) {
      claims.roles = roles.filter((r: any) => typeof r === 'string');
    }

    await getAuth().setCustomUserClaims(uid, claims);
    await getFirestore().collection('users').doc(uid).set(
      {
        role,
        ...(typeof tenantId === 'string' && tenantId ? { workspaceId: tenantId, tenantId } : {}),
        claimsUpdatedAt: FieldValue.serverTimestamp(),
        claimsUpdatedBy: req.authContext?.uid,
      },
      { merge: true }
    );

    console.log(`[AdminRoutes] Claims set for ${uid}:`, claims);

    await auditLog({
      action: 'claims.grant',
      actorUid: req.authContext?.uid || 'unknown',
      actorEmail: req.authContext?.email,
      workspaceId: typeof tenantId === 'string' ? tenantId : undefined,
      targetType: 'user',
      targetId: uid,
      severity: 'critical',
      details: { role, tenantId: tenantId || null, roles: claims.roles || [] },
      ip: ((req.headers['x-forwarded-for'] as string) || '').split(',')[0]?.trim() || req.ip,
    });

    res.json({ success: true, uid, claims });
  } catch (error: any) {
    console.error('[AdminRoutes] Error setting claims:', error);
    res.status(500).json({ error: 'Internal Server Error', code: 'CLAIMS_FAILED', message: 'Failed to set custom claims.' });
  }
});

/**
 * POST /api/admin/tenants/:tenantId/pin — SuperAdmin only.
 * Set / rotate the workspace admin PIN. Only the peppered hash is stored.
 */
router.post('/tenants/:tenantId/pin', requireRole('SuperAdmin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { pin } = req.body || {};

    if (typeof pin !== 'string' || pin.length < 4 || pin.length > 32) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'pin must be 4–32 characters.' });
      return;
    }
    const hashed = hashPin(pin);
    if (!hashed) {
      res.status(503).json({
        error: 'Service Unavailable',
        code: 'PIN_NOT_CONFIGURED',
        message: 'PIN_PEPPER is not configured on the server.',
      });
      return;
    }

    await getFirestore().collection('workspaces').doc(tenantId).set(
      { adminPinHash: hashed, adminPinUpdatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    console.log(`[AdminRoutes] Admin PIN hash rotated for workspace ${tenantId}`);

    await auditLog({
      action: 'workspace.pin_rotate',
      actorUid: req.authContext?.uid || 'unknown',
      actorEmail: req.authContext?.email,
      workspaceId: tenantId,
      targetType: 'workspace',
      targetId: tenantId,
      severity: 'critical',
      details: { note: 'Admin PIN hash rotated (plaintext never stored)' },
      ip: ((req.headers['x-forwarded-for'] as string) || '').split(',')[0]?.trim() || req.ip,
    });

    res.json({ success: true, tenantId, message: 'Admin PIN updated (stored as peppered hash only).' });
  } catch (error: any) {
    console.error('[AdminRoutes] Error setting PIN:', error);
    res.status(500).json({ error: 'Internal Server Error', code: 'PIN_SET_FAILED', message: 'Failed to update admin PIN.' });
  }
});

/**
 * POST /api/admin/treasury/export — Accountant and above.
 * Server-side CSV export of a tenant's treasury ledger (Admin SDK bypasses
 * client rules safely; callers are confined to their own tenant unless
 * SuperAdmin).
 */
router.post('/treasury/export', requireRole('Accountant', 'Trustee', 'SuperAdmin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ctx = req.authContext!;
    const requestedTenant = (req.body?.tenantId as string) || (req.query.tenantId as string) || ctx.tenantId;
    const tenantId = ctx.isSuperAdmin ? requestedTenant : ctx.tenantId;

    if (!tenantId) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'tenantId is required.' });
      return;
    }
    if (!ctx.isSuperAdmin && requestedTenant && requestedTenant !== ctx.tenantId) {
      res.status(403).json({
        error: 'Forbidden',
        code: 'CROSS_TENANT_DENIED',
        message: 'You may only export your own tenant ledger.',
      });
      return;
    }

    const db = getFirestore();
    const snap = await db.collection('treasury').where('workspaceId', '==', tenantId).limit(5000).get();

    const esc = (v: any): string => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['id', 'date', 'type', 'category', 'amount', 'paymentMode', 'purpose', 'handledBy', 'referenceNo'];
    const lines = [header.join(',')];
    for (const doc of snap.docs) {
      const d = doc.data() as Record<string, any>;
      lines.push([doc.id, d.date, d.type, d.category, d.amount, d.paymentMode, d.purpose, d.handledBy, d.referenceNo].map(esc).join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="treasury_${tenantId}.csv"`);
    res.send(lines.join('\n'));
  } catch (error: any) {
    console.error('[AdminRoutes] Treasury export failed:', error);
    res.status(500).json({ error: 'Internal Server Error', code: 'EXPORT_FAILED', message: 'Treasury export failed.' });
  }
});

export { requireSuperAdmin };

/* ============================================================================
 * PLATFORM OWNER OVERSIGHT — requireOwner (strongest gate)
 * ----------------------------------------------------------------------------
 * These endpoints let the platform owner "handle the full app ecosystem":
 * usage overview, user lookup/support, plan management, account safety,
 * and audit-trail queries. Every mutating action writes an audit entry.
 * ========================================================================== */

function actorIp(req: AuthenticatedRequest): string {
  return ((req.headers['x-forwarded-for'] as string) || '').split(',')[0]?.trim() || req.ip || 'unknown';
}

/**
 * GET /api/admin/overview — Owner only.
 * Platform pulse: workspace/user counts, recent signups, plan distribution.
 * Lightweight: uses count() aggregations, not full scans.
 */
router.get('/overview', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const [wsCount, userCount, tenantCount] = await Promise.all([
      db.collection('workspaces').count().get().then((s) => s.data().count).catch(() => -1),
      db.collection('users').count().get().then((s) => s.data().count).catch(() => -1),
      db.collection('tenants').count().get().then((s) => s.data().count).catch(() => -1),
    ]);

    // Recent workspaces (last 10) for a live feel.
    let recentWorkspaces: any[] = [];
    try {
      const snap = await db.collection('workspaces').orderBy('createdAt', 'desc').limit(10).get();
      recentWorkspaces = snap.docs.map((d) => {
        const data = d.data() as Record<string, any>;
        return { id: d.id, name: data.name, type: data.type, planId: data.planId, createdAt: data.createdAt };
      });
    } catch { /* collection may use different timestamp field */ }

    res.json({
      success: true,
      overview: {
        workspaces: wsCount,
        users: userCount,
        tenants: tenantCount,
        recentWorkspaces,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[AdminRoutes] overview failed:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'OVERVIEW_FAILED', message: 'Could not load platform overview.' });
  }
});

/**
 * GET /api/admin/users/lookup?email= — Owner only.
 * Support tool: find a user by email (Admin SDK, no PII in logs beyond email).
 */
router.get('/users/lookup', requireOwner, standardLimiter.byUser('lookup'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'A valid ?email= query param is required.' });
      return;
    }
    const user = await getAuth().getUserByEmail(email).catch(() => null);
    if (!user) {
      res.status(404).json({ error: 'Not Found', code: 'USER_NOT_FOUND', message: 'No user with that email.' });
      return;
    }
    const userDoc = await getFirestore().collection('users').doc(user.uid).get().catch(() => null);
    res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        disabled: user.disabled,
        emailVerified: user.emailVerified,
        createdAt: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime,
        customClaims: user.customClaims || {},
        profile: userDoc?.exists ? userDoc.data() : null,
      },
    });
  } catch (error: any) {
    console.error('[AdminRoutes] user lookup failed:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'LOOKUP_FAILED', message: 'User lookup failed.' });
  }
});

/**
 * POST /api/admin/users/:uid/disable — Owner only.
 * Safety tool: disable an abusive/compromised account. Audited (critical).
 */
router.post('/users/:uid/disable', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { reason } = req.body || {};
    if (uid === OWNER_UID) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'The platform owner account cannot be disabled.' });
      return;
    }
    await getAuth().updateUser(uid, { disabled: true });
    const ctx = req.authContext!;
    await auditLog({
      action: 'user.disable',
      actorUid: ctx.uid,
      actorEmail: ctx.email,
      targetType: 'user',
      targetId: uid,
      severity: 'critical',
      details: { reason: typeof reason === 'string' ? reason.slice(0, 500) : 'not specified' },
      ip: actorIp(req),
    });
    res.json({ success: true, uid, disabled: true });
  } catch (error: any) {
    console.error('[AdminRoutes] disable failed:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'DISABLE_FAILED', message: 'Could not disable user.' });
  }
});

/**
 * POST /api/admin/users/:uid/enable — Owner only. Re-enable a disabled account. Audited.
 */
router.post('/users/:uid/enable', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    await getAuth().updateUser(uid, { disabled: false });
    const ctx = req.authContext!;
    await auditLog({
      action: 'user.enable',
      actorUid: ctx.uid,
      actorEmail: ctx.email,
      targetType: 'user',
      targetId: uid,
      severity: 'warn',
      ip: actorIp(req),
    });
    res.json({ success: true, uid, disabled: false });
  } catch (error: any) {
    console.error('[AdminRoutes] enable failed:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'ENABLE_FAILED', message: 'Could not enable user.' });
  }
});

/**
 * GET /api/admin/workspaces — Owner only.
 * Paginated workspace list for oversight. ?limit= (max 100), ?cursor= (doc id).
 */
router.get('/workspaces', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '25'), 10) || 25, 1), 100);
    const db = getFirestore();
    let q: FirebaseFirestore.Query = db.collection('workspaces').orderBy('name').limit(limit);
    const cursor = String(req.query.cursor || '');
    if (cursor) {
      const cur = await db.collection('workspaces').doc(cursor).get();
      if (cur.exists) q = q.startAfter(cur);
    }
    const snap = await q.get();
    const workspaces = snap.docs.map((d) => {
      const { adminPinHash: _h, ...rest } = d.data() as Record<string, any>;
      return { id: d.id, ...rest };
    });
    res.json({
      success: true,
      workspaces,
      nextCursor: snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null,
    });
  } catch (error: any) {
    console.error('[AdminRoutes] workspaces list failed:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'LIST_FAILED', message: 'Could not list workspaces.' });
  }
});

const KNOWN_PLANS = ['DEMO', 'LITE', 'STANDARD', 'ENTERPRISE'];

/**
 * POST /api/admin/workspaces/:id/plan — Owner only.
 * Set a workspace's subscription plan. Audited (critical — billing impact).
 */
router.post('/workspaces/:id/plan', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { planId, note } = req.body || {};
    if (typeof planId !== 'string' || !KNOWN_PLANS.includes(planId.toUpperCase())) {
      res.status(400).json({
        error: 'Bad Request',
        code: 'INVALID_INPUT',
        message: `planId must be one of: ${KNOWN_PLANS.join(', ')}`,
      });
      return;
    }
    const db = getFirestore();
    const ref = db.collection('workspaces').doc(id);
    const before = await ref.get();
    if (!before.exists) {
      res.status(404).json({ error: 'Not Found', code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found.' });
      return;
    }
    const prevPlan = (before.data() as any)?.planId || 'LITE';
    await ref.set(
      {
        planId: planId.toUpperCase(),
        planUpdatedAt: FieldValue.serverTimestamp(),
        planUpdatedBy: req.authContext!.uid,
      },
      { merge: true }
    );
    await auditLog({
      action: 'workspace.plan_change',
      actorUid: req.authContext!.uid,
      actorEmail: req.authContext!.email,
      workspaceId: id,
      targetType: 'workspace',
      targetId: id,
      severity: 'critical',
      details: { from: prevPlan, to: planId.toUpperCase(), note: typeof note === 'string' ? note.slice(0, 500) : undefined },
      ip: actorIp(req),
    });
    res.json({ success: true, workspaceId: id, previousPlan: prevPlan, planId: planId.toUpperCase() });
  } catch (error: any) {
    console.error('[AdminRoutes] plan change failed:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'PLAN_FAILED', message: 'Could not update plan.' });
  }
});

/**
 * GET /api/admin/audit-logs — Owner only.
 * Query the platform audit trail. ?action=&actorUid=&workspaceId=&severity=&limit=&cursor=
 */
router.get('/audit-logs', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { entries, nextCursor } = await queryAuditLogs({
      action: (req.query.action as string) || undefined,
      actorUid: (req.query.actorUid as string) || undefined,
      workspaceId: (req.query.workspaceId as string) || undefined,
      severity: (req.query.severity as string) || undefined,
      limit: parseInt(String(req.query.limit || '50'), 10) || 50,
      startAfterId: (req.query.cursor as string) || undefined,
    });
    res.json({ success: true, entries, nextCursor });
  } catch (error: any) {
    console.error('[AdminRoutes] audit query failed:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'AUDIT_FAILED', message: 'Could not query audit logs.' });
  }
});

/**
 * POST /api/admin/bootstrap-owner — Owner identity only (self-bootstrap).
 * One-time setup: registers the hardcoded owner UID in platform_admins and
 * stamps isSuperAdmin custom claims, so GodMode + owner API work end to end.
 * Only the owner UID/email can call it, and it can only target the owner —
 * there is no privilege-escalation vector here by construction.
 */
router.post('/bootstrap-owner', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    await db.collection('platform_admins').doc(OWNER_UID).set(
      {
        email: OWNER_EMAIL,
        active: true,
        bootstrappedAt: FieldValue.serverTimestamp(),
        bootstrappedBy: 'self',
      },
      { merge: true }
    );
    await getAuth().setCustomUserClaims(OWNER_UID, { role: 'SuperAdmin', isSuperAdmin: true });
    await auditLog({
      action: 'owner.bootstrap',
      actorUid: OWNER_UID,
      actorEmail: OWNER_EMAIL,
      severity: 'critical',
      details: { note: 'Owner self-bootstrap: platform_admins + SuperAdmin claims' },
      ip: actorIp(req),
    });
    res.json({ success: true, message: 'Owner registered in platform_admins with SuperAdmin claims.' });
  } catch (error: any) {
    console.error('[AdminRoutes] bootstrap failed:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'BOOTSTRAP_FAILED', message: 'Owner bootstrap failed.' });
  }
});

export default router;
