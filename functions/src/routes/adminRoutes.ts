import { Router, Response } from 'express';
import { createHash } from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth, requireRole, requireSuperAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';

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
export default router;
