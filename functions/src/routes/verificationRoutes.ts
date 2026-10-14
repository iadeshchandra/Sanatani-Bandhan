import { Router, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';
import { requireOwner } from '../middleware/ownerAuth';
import { auditLog } from '../lib/audit';
import { standardLimiter } from '../middleware/rateLimit';

const router = Router();

// All verification routes require a valid Firebase ID token.
router.use(requireAuth);

/**
 * Verification tiers — mirrors the client tier model (src/types/purohit.ts).
 * Ordered; upgrades never skip. New profiles are always REGISTERED
 * (enforced by Firestore rules); only the owner can move tiers via this API.
 */
export const VERIFICATION_TIERS = [
  'REGISTERED',
  'CREDENTIAL_VERIFIED',
  'ORG_ENDORSED',
  'PLATFORM_VERIFIED',
] as const;
export type VerificationTier = (typeof VERIFICATION_TIERS)[number];

const PROFILE_COLLECTIONS: Record<string, string> = {
  purohit: 'purohits',
  jyotish: 'jyotishProfiles',
};

function tierIndex(tier: string): number {
  return VERIFICATION_TIERS.indexOf(tier as VerificationTier);
}

function clientIp(req: AuthenticatedRequest): string | undefined {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.ip;
}

/**
 * POST /api/verification/apply
 * Authenticated purohit/jyotishi submits a verification application for the
 * next tier. Documents/credentials are references (URLs or descriptions) —
 * file uploads live in Firebase Storage under user-scoped paths.
 *
 * Body: { kind: 'purohit' | 'jyotish', profileId: string, notes?: string,
 *         documents?: Array<{ label: string, url?: string, description?: string }> }
 *
 * One pending application per profile at a time. The applicant can never
 * approve their own application (enforced on approve).
 */
router.post('/apply', standardLimiter.byUser('verification-apply'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { kind, profileId, notes, documents } = req.body;
    const uid = req.authContext?.uid || 'unknown';

    if (kind !== 'purohit' && kind !== 'jyotish') {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_KIND', message: "kind must be 'purohit' or 'jyotish'" });
      return;
    }
    if (typeof profileId !== 'string' || !profileId.trim()) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'profileId is required' });
      return;
    }

    const db = getFirestore();
    const collection = PROFILE_COLLECTIONS[kind];

    // The profile must exist and belong to the applicant.
    const profileSnap = await db.collection(collection).doc(profileId).get();
    if (!profileSnap.exists) {
      res.status(404).json({ error: 'Not Found', code: 'PROFILE_NOT_FOUND', message: 'Profile not found' });
      return;
    }
    const profile = profileSnap.data()!;
    if (profile.uid !== uid) {
      res.status(403).json({
        error: 'Forbidden', code: 'NOT_PROFILE_OWNER',
        message: 'You can only apply for verification of your own profile.',
      });
      return;
    }

    // One pending application per profile.
    const existing = await db.collection('verificationApplications')
      .where('profileId', '==', profileId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (!existing.empty) {
      res.status(409).json({
        error: 'Conflict', code: 'ALREADY_PENDING',
        message: 'A verification application for this profile is already pending review.',
        applicationId: existing.docs[0].id,
      });
      return;
    }

    const currentTier = typeof profile.verificationTier === 'string' ? profile.verificationTier : 'REGISTERED';
    const nextIdx = tierIndex(currentTier) + 1;
    if (nextIdx >= VERIFICATION_TIERS.length) {
      res.status(400).json({
        error: 'Bad Request', code: 'ALREADY_MAX_TIER',
        message: 'This profile already holds the highest verification tier.',
      });
      return;
    }
    const requestedTier = VERIFICATION_TIERS[nextIdx];

    const appRef = db.collection('verificationApplications').doc();
    await appRef.set({
      kind,
      profileId,
      applicantUid: uid,
      applicantEmail: req.authContext?.email || null,
      currentTier,
      requestedTier,
      notes: typeof notes === 'string' ? notes.slice(0, 2000) : null,
      documents: Array.isArray(documents) ? documents.slice(0, 20) : [],
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await auditLog({
      action: 'verification.apply',
      actorUid: uid,
      actorEmail: req.authContext?.email,
      targetType: collection,
      targetId: profileId,
      details: { applicationId: appRef.id, kind, currentTier, requestedTier },
      ip: clientIp(req),
    });

    res.status(201).json({
      ok: true,
      applicationId: appRef.id,
      requestedTier,
      message: `Application submitted for ${requestedTier}. It will be reviewed by the platform team.`,
    });
  } catch (e: any) {
    console.error('[VerificationRoutes] apply failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'APPLY_FAILED' });
  }
});

/**
 * GET /api/verification/pending — Owner only
 * List pending verification applications, newest first. Supports
 * ?kind=purohit|jyotish and ?limit= (max 100).
 */
router.get('/pending', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 100);

    let q: FirebaseFirestore.Query = db.collection('verificationApplications')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(limit);
    if (kind === 'purohit' || kind === 'jyotish') q = q.where('kind', '==', kind);

    const snap = await q.get();
    res.json({
      ok: true,
      applications: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (e: any) {
    console.error('[VerificationRoutes] pending list failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'LIST_FAILED' });
  }
});

/**
 * POST /api/verification/:id/approve — Owner only
 * Approve an application: sets the canonical profile's verificationTier via
 * Admin SDK (bypasses client rules — this is the ONLY legitimate path for
 * tier changes). Never allows self-approval.
 *
 * Body: { tier?: string } — defaults to the application's requestedTier.
 */
router.post('/:id/approve', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const appId = req.params.id;
    const ownerUid = req.authContext?.uid || 'unknown';

    const appSnap = await db.collection('verificationApplications').doc(appId).get();
    if (!appSnap.exists) {
      res.status(404).json({ error: 'Not Found', code: 'APPLICATION_NOT_FOUND' });
      return;
    }
    const app = appSnap.data()!;

    if (app.status !== 'pending') {
      res.status(409).json({
        error: 'Conflict', code: 'NOT_PENDING',
        message: `Application is already ${app.status}.`,
      });
      return;
    }

    // Never allow self-approval — even the owner cannot approve their own
    // professional profile through this path (separation of concerns).
    if (app.applicantUid === ownerUid) {
      res.status(403).json({
        error: 'Forbidden', code: 'SELF_APPROVAL_DENIED',
        message: 'You cannot approve your own verification application.',
      });
      return;
    }

    const tier = typeof req.body?.tier === 'string' ? req.body.tier : app.requestedTier;
    if (tierIndex(tier) < 0) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_TIER', message: 'Unknown verification tier.' });
      return;
    }
    // Never downgrade or skip: approved tier must be exactly the next step.
    if (tier !== app.requestedTier) {
      res.status(400).json({
        error: 'Bad Request', code: 'TIER_MISMATCH',
        message: `Approved tier must be the requested tier (${app.requestedTier}); tiers advance one step at a time.`,
      });
      return;
    }

    const collection = PROFILE_COLLECTIONS[app.kind];
    const batch = db.batch();
    batch.update(db.collection(collection).doc(app.profileId), {
      verificationTier: tier,
      verificationTierUpdatedAt: FieldValue.serverTimestamp(),
      verifiedBy: ownerUid,
    });
    batch.update(appSnap.ref, {
      status: 'approved',
      decidedBy: ownerUid,
      decidedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    await auditLog({
      action: 'verification.approve',
      actorUid: ownerUid,
      actorEmail: req.authContext?.email,
      targetType: collection,
      targetId: app.profileId,
      details: { applicationId: appId, kind: app.kind, fromTier: app.currentTier, toTier: tier },
      ip: clientIp(req),
      severity: 'warn',
    });

    res.json({ ok: true, profileId: app.profileId, tier });
  } catch (e: any) {
    console.error('[VerificationRoutes] approve failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'APPROVE_FAILED' });
  }
});

/**
 * POST /api/verification/:id/reject — Owner only
 * Reject an application with a reason. The applicant keeps their current
 * tier and may re-apply after addressing the reason.
 *
 * Body: { reason: string } (required, max 1000 chars)
 */
router.post('/:id/reject', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const appId = req.params.id;
    const ownerUid = req.authContext?.uid || 'unknown';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 1000) : '';

    if (!reason) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'A rejection reason is required.' });
      return;
    }

    const appSnap = await db.collection('verificationApplications').doc(appId).get();
    if (!appSnap.exists) {
      res.status(404).json({ error: 'Not Found', code: 'APPLICATION_NOT_FOUND' });
      return;
    }
    const app = appSnap.data()!;
    if (app.status !== 'pending') {
      res.status(409).json({ error: 'Conflict', code: 'NOT_PENDING', message: `Application is already ${app.status}.` });
      return;
    }

    await appSnap.ref.update({
      status: 'rejected',
      rejectionReason: reason,
      decidedBy: ownerUid,
      decidedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await auditLog({
      action: 'verification.reject',
      actorUid: ownerUid,
      actorEmail: req.authContext?.email,
      targetType: PROFILE_COLLECTIONS[app.kind] || 'profiles',
      targetId: app.profileId,
      details: { applicationId: appId, kind: app.kind, reason: reason.slice(0, 200) },
      ip: clientIp(req),
      severity: 'warn',
    });

    res.json({ ok: true, applicationId: appId, status: 'rejected' });
  } catch (e: any) {
    console.error('[VerificationRoutes] reject failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'REJECT_FAILED' });
  }
});

/**
 * GET /api/verification/applications/:id — Owner only
 * Fetch a single application with its full detail (for the review UI).
 */
router.get('/applications/:id', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snap = await db.collection('verificationApplications').doc(req.params.id).get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Not Found', code: 'APPLICATION_NOT_FOUND' });
      return;
    }
    res.json({ ok: true, application: { id: snap.id, ...snap.data() } });
  } catch (e: any) {
    console.error('[VerificationRoutes] get application failed:', e?.message || e);
    res.status(500).json({ error: 'Internal Server Error', code: 'GET_FAILED' });
  }
});

export default router;
