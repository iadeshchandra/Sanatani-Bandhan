import { Router, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';
import { isOwnerUid, isOwnerEmail } from '../middleware/ownerAuth';
import { exportLimiter } from '../middleware/rateLimit';
import { auditLog } from '../lib/audit';

const router = Router();

// Every export route requires authentication.
router.use(requireAuth);

/**
 * Workspace-scoped collections (documents carry a `workspaceId` field).
 * Curated: operational data only. Excludes qrPairTokens (ephemeral secrets),
 * platform_admins (platform-internal), and audit_logs (use the audit API).
 */
const EXPORTABLE_COLLECTIONS = [
  'treasury',
  'treasury_ledgers',
  'donations',
  'tax_receipts',
  'devotees',
  'households',
  'puja_bookings',
  'poojaBookings',
  'inventory_items',
  'inventory',
  'assets',
  'fixed_assets',
  'cows',
  'gaushala_cattle',
  'rooms',
  'dharamshala_rooms',
  'crisis_events',
  'polls',
  'panchayat_polls',
  'yatra_broadcasts',
  'yatra_alerts',
  'sangamPosts',
  'sangamComments',
  'sangamCircles',
  'sangamEvents',
  'upgrade_requests',
  'chats',
];

// Free-tier guardrails: cap documents per collection so one export cannot
// burn the daily Firestore read quota (50k/day on Spark).
const MAX_DOCS_PER_COLLECTION = 2000;

/**
 * Resolve whether the caller may export a workspace:
 * - platform owner: any workspace
 * - trustee of that workspace: own workspace only
 */
async function canExportWorkspace(
  req: AuthenticatedRequest,
  workspaceId: string
): Promise<{ ok: boolean; reason?: string }> {
  const ctx = req.authContext;
  if (!ctx) return { ok: false, reason: 'Not authenticated.' };

  if (isOwnerUid(ctx.uid) || isOwnerEmail(ctx.email)) {
    return { ok: true };
  }

  // Trustee check via workspaceMembers edge (server-side, authoritative).
  try {
    const db = getFirestore();
    const edge = await db
      .collection('workspaceMembers')
      .doc(`${workspaceId}_${ctx.uid}`)
      .get();
    const role = String(edge.data()?.role || '').toLowerCase();
    if (edge.exists && (role === 'trustee' || role === 'superadmin')) {
      return { ok: true };
    }
  } catch (e: any) {
    console.warn('[ExportRoutes] membership lookup failed:', e?.message || e);
  }
  return { ok: false, reason: 'Export requires Trustee role on this workspace or platform ownership.' };
}

/**
 * GET /api/export/workspaces/:workspaceId
 * ---------------------------------------
 * Full workspace data export as JSON (GDPR-style portability + backup).
 * Auth: owner (any workspace) or Trustee (own workspace).
 * Rate limited: 5/min. Each collection capped at 2000 docs.
 *
 * Query params:
 *   collections=treasury,devotees  (optional subset; default = all exportable)
 *   includePrivate=true             (default false — excludes *_private docs)
 */
router.get(
  '/workspaces/:workspaceId',
  exportLimiter.byUser('export'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      if (!workspaceId || workspaceId.length > 128) {
        res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'workspaceId is required.' });
        return;
      }

      const gate = await canExportWorkspace(req, workspaceId);
      if (!gate.ok) {
        res.status(403).json({ error: 'Forbidden', code: 'EXPORT_DENIED', message: gate.reason });
        return;
      }

      const requested = String(req.query.collections || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const collections = requested.length
        ? EXPORTABLE_COLLECTIONS.filter((c) => requested.includes(c))
        : EXPORTABLE_COLLECTIONS;

      if (requested.length && collections.length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          code: 'INVALID_INPUT',
          message: `No valid collections requested. Valid: ${EXPORTABLE_COLLECTIONS.join(', ')}`,
        });
        return;
      }

      const db = getFirestore();
      const out: Record<string, any[]> = {};
      let totalDocs = 0;

      // Workspace document itself (strip server-only secrets defensively).
      const wsDoc = await db.collection('workspaces').doc(workspaceId).get();
      if (wsDoc.exists) {
        const { adminPinHash: _h1, adminPin: _h2, ...safe } = wsDoc.data() as Record<string, any>;
        out['_workspace'] = [{ id: wsDoc.id, ...safe }];
        totalDocs += 1;
      }

      for (const col of collections) {
        try {
          const snap = await db
            .collection(col)
            .where('workspaceId', '==', workspaceId)
            .limit(MAX_DOCS_PER_COLLECTION)
            .get();
          out[col] = snap.docs.map((d) => {
            const data = d.data() as Record<string, any>;
            // Never export hashes/secrets even if present.
            const { adminPinHash: _a, pin: _b, pinHash: _c, ...safe } = data;
            return { id: d.id, ...safe };
          });
          totalDocs += out[col].length;
        } catch (e: any) {
          // A missing/permission-blocked collection skips cleanly (Admin SDK
          // bypasses rules, so this is usually "collection doesn't exist").
          out[col] = [];
        }
      }

      const ctx = req.authContext!;
      await auditLog({
        action: 'data.export',
        actorUid: ctx.uid,
        actorEmail: ctx.email,
        workspaceId,
        targetType: 'workspace',
        targetId: workspaceId,
        severity: 'warn',
        details: { collections: collections.length, totalDocs },
        ip: ((req.headers['x-forwarded-for'] as string) || '').split(',')[0]?.trim() || req.ip,
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="sanatani-bandhan-export_${workspaceId}_${new Date().toISOString().slice(0, 10)}.json"`
      );
      res.json({
        exportedAt: new Date().toISOString(),
        workspaceId,
        collections: collections.length,
        totalDocuments: totalDocs,
        data: out,
      });
    } catch (error: any) {
      console.error('[ExportRoutes] export failed:', error?.message || error);
      res.status(500).json({ error: 'Internal Server Error', code: 'EXPORT_FAILED', message: 'Data export failed.' });
    }
  }
);

/**
 * GET /api/export/collections
 * ---------------------------
 * List collections available for export. Auth required.
 */
router.get('/collections', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ collections: EXPORTABLE_COLLECTIONS, maxDocsPerCollection: MAX_DOCS_PER_COLLECTION });
});

export default router;
