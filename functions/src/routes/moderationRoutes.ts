import { Router, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';
import { requireOwner } from '../middleware/ownerAuth';
import { auditLog } from '../lib/audit';
import { standardLimiter, strictLimiter } from '../middleware/rateLimit';

const router = Router();

// All moderation routes require a valid Firebase ID token.
router.use(requireAuth);

const REPORT_REASONS = [
  'spam',
  'harassment',
  'misinformation',
  'impersonation',
  'inappropriate_content',
  'fraud',
  'other',
] as const;

const REPORT_ACTIONS = ['dismiss', 'hide_content', 'warn_user', 'suspend_user'] as const;

function clientIp(req: AuthenticatedRequest): string | undefined {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.ip;
}

/**
 * POST /api/moderation/report
 * Any authenticated user can report a Sangam post or comment. Rate-limited
 * to prevent report spam. Reports are private — only the owner sees them.
 *
 * Body: { targetType: 'post' | 'comment', targetId: string,
 *         reason: one of REPORT_REASONS, details?: string (max 1000 chars) }
 */
router.post('/report', standardLimiter.byUser('moderation-report'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    const uid = req.authContext?.uid || 'unknown';

    if (targetType !== 'post' && targetType !== 'comment') {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: "targetType must be 'post' or 'comment'" });
      return;
    }
    if (typeof targetId !== 'string' || !targetId.trim()) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'targetId is required' });
      return;
    }
    if (!(REPORT_REASONS as readonly string[]).includes(reason)) {
      res.status(400).json({
        error: 'Bad Request', code: 'INVALID_REASON',
        message: `reason must be one of: ${REPORT_REASONS.join(', ')}`,
      });
      return;
    }

    const db = getFirestore();

    // Prevent duplicate open reports from the same user on the same target.
    const dup = await db.collection('moderationReports')
      .where('reporterUid', '==', uid)
      .where('targetId', '==', targetId)
      .where('status', '==', 'open')
      .limit(1)
      .get();
    if (!dup.empty) {
      res.status(409).json({
        error: 'Conflict', code: 'ALREADY_REPORTED',
        message: 'You have already reported this content. It is under review.',
      });
      return;
    }

    const reportRef = db.collection('moderationReports').doc();
    await reportRef.set({
      targetType,
      targetId: targetId.trim(),
      reason,
      details: typeof details === 'string' ? details.slice(0, 1000) : null,
      reporterUid: uid,
      reporterEmail: req.authContext?.email || null,
      status: 'open',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Reports themselves are not audit-logged per-report (noise); the audit
    // trail records owner actions taken on them.

    res.status(201).json({
      ok: true,
      reportId: reportRef.id,
      message: 'Thank you. Your report has been received and will be reviewed.',
    });
  } catch (e: any) {
    console.error('[ModerationRoutes] report failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'REPORT_FAILED' });
  }
});

/**
 * GET /api/moderation/reports — Owner only
 * List moderation reports. ?status=open|actioned|dismissed (default open),
 * ?limit= (max 100).
 */
router.get('/reports', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const status = typeof req.query.status === 'string' ? req.query.status : 'open';
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 100);

    let q: FirebaseFirestore.Query = db.collection('moderationReports')
      .orderBy('createdAt', 'desc')
      .limit(limit);
    if (['open', 'actioned', 'dismissed'].includes(status)) {
      q = db.collection('moderationReports')
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .limit(limit);
    }

    const snap = await q.get();
    res.json({ ok: true, reports: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (e: any) {
    console.error('[ModerationRoutes] list reports failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'LIST_FAILED' });
  }
});

/**
 * POST /api/moderation/reports/:id/action — Owner only (strict rate limit)
 * Take action on a report. Audited. Actions:
 *   - dismiss: report was unfounded; no content change.
 *   - hide_content: hide the reported post/comment (sets hiddenByModeration).
 *   - warn_user: record a warning against the content author.
 *   - suspend_user: disable the author's Firebase account (reversible).
 *
 * Body: { action: one of REPORT_ACTIONS, note?: string }
 */
router.post('/reports/:id/action', requireOwner, strictLimiter.byUser('moderation'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const reportId = req.params.id;
    const ownerUid = req.authContext?.uid || 'unknown';
    const action = req.body?.action;
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 1000) : null;

    if (!(REPORT_ACTIONS as readonly string[]).includes(action)) {
      res.status(400).json({
        error: 'Bad Request', code: 'INVALID_ACTION',
        message: `action must be one of: ${REPORT_ACTIONS.join(', ')}`,
      });
      return;
    }

    const reportSnap = await db.collection('moderationReports').doc(reportId).get();
    if (!reportSnap.exists) {
      res.status(404).json({ error: 'Not Found', code: 'REPORT_NOT_FOUND' });
      return;
    }
    const report = reportSnap.data()!;
    if (report.status !== 'open') {
      res.status(409).json({ error: 'Conflict', code: 'NOT_OPEN', message: `Report is already ${report.status}.` });
      return;
    }

    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    if (action === 'hide_content') {
      // Sangam posts live in per-user subcollections or the shared feed;
      // the client checks `hiddenByModeration` before rendering. We mark the
      // report's target; the canonical content collections are addressed by
      // the client-known document path stored at report time when available.
      batch.update(reportSnap.ref, {
        status: 'actioned', actionTaken: 'hide_content', actionNote: note,
        decidedBy: ownerUid, decidedAt: now, updatedAt: now,
      });
      // Record the hide directive so the client enforcement layer can apply
      // it regardless of which collection holds the document.
      const directiveRef = db.collection('moderationHides').doc();
      batch.set(directiveRef, {
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        reportId,
        hiddenBy: ownerUid,
        createdAt: now,
      });
    } else if (action === 'warn_user') {
      // Warnings accumulate on the author's user record; the client surfaces
      // the count. Three warnings → owner reviews for suspension.
      const warnRef = db.collection('moderationWarnings').doc();
      batch.set(warnRef, {
        targetUid: report.targetUid || null,
        targetId: report.targetId,
        reason: report.reason,
        reportId,
        warnedBy: ownerUid,
        note,
        createdAt: now,
      });
      batch.update(reportSnap.ref, {
        status: 'actioned', actionTaken: 'warn_user', actionNote: note,
        decidedBy: ownerUid, decidedAt: now, updatedAt: now,
      });
    } else if (action === 'suspend_user') {
      const targetUid: string | undefined = report.targetUid || report.authorUid;
      if (targetUid) {
        const { getAuth } = await import('firebase-admin/auth');
        await getAuth().updateUser(targetUid, { disabled: true });
      }
      batch.update(reportSnap.ref, {
        status: 'actioned', actionTaken: 'suspend_user', actionNote: note,
        decidedBy: ownerUid, decidedAt: now, updatedAt: now,
      });
    } else {
      // dismiss
      batch.update(reportSnap.ref, {
        status: 'dismissed', actionTaken: 'dismiss', actionNote: note,
        decidedBy: ownerUid, decidedAt: now, updatedAt: now,
      });
    }

    await batch.commit();

    await auditLog({
      action: `moderation.${action}`,
      actorUid: ownerUid,
      actorEmail: req.authContext?.email,
      targetType: 'moderationReports',
      targetId: reportId,
      details: {
        reportReason: report.reason,
        contentTarget: `${report.targetType}:${report.targetId}`,
        note: note?.slice(0, 200) || null,
      },
      ip: clientIp(req),
      severity: action === 'dismiss' ? 'info' : 'warn',
    });

    res.json({ ok: true, reportId, action });
  } catch (e: any) {
    console.error('[ModerationRoutes] action failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'ACTION_FAILED' });
  }
});

/**
 * POST /api/moderation/content/:id/hide — Owner only
 * Immediate hide without a report (e.g. owner spots violating content while
 * browsing). Writes a hide directive; audited.
 *
 * Body: { targetType: 'post' | 'comment', reason: string }
 */
router.post('/content/:id/hide', requireOwner, strictLimiter.byUser('moderation'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const ownerUid = req.authContext?.uid || 'unknown';
    const { targetType, reason } = req.body;

    if (targetType !== 'post' && targetType !== 'comment') {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: "targetType must be 'post' or 'comment'" });
      return;
    }

    const directiveRef = db.collection('moderationHides').doc();
    await directiveRef.set({
      targetType,
      targetId: req.params.id,
      reason: typeof reason === 'string' ? reason.slice(0, 500) : 'owner-hide',
      reportId: null,
      hiddenBy: ownerUid,
      createdAt: FieldValue.serverTimestamp(),
    });

    await auditLog({
      action: 'moderation.hide_content',
      actorUid: ownerUid,
      actorEmail: req.authContext?.email,
      targetType: 'moderationHides',
      targetId: directiveRef.id,
      details: { contentTarget: `${targetType}:${req.params.id}`, direct: true },
      ip: clientIp(req),
      severity: 'warn',
    });

    res.json({ ok: true, hideId: directiveRef.id });
  } catch (e: any) {
    console.error('[ModerationRoutes] hide failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'HIDE_FAILED' });
  }
});

/**
 * POST /api/moderation/users/:uid/unsuspend — Owner only
 * Reverse a suspension (e.g. appeal upheld). Audited.
 */
router.post('/users/:uid/unsuspend', requireOwner, strictLimiter.byUser('moderation'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { getAuth } = await import('firebase-admin/auth');
    await getAuth().updateUser(req.params.uid, { disabled: false });

    await auditLog({
      action: 'moderation.unsuspend_user',
      actorUid: req.authContext?.uid || 'unknown',
      actorEmail: req.authContext?.email,
      targetType: 'users',
      targetId: req.params.uid,
      ip: clientIp(req),
      severity: 'warn',
    });

    res.json({ ok: true, uid: req.params.uid, suspended: false });
  } catch (e: any) {
    console.error('[ModerationRoutes] unsuspend failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'UNSUSPEND_FAILED' });
  }
});

export default router;
