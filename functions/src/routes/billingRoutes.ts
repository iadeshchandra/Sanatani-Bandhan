import { Router, Response } from 'express';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';
import { requireOwner } from '../middleware/ownerAuth';
import { auditLog } from '../lib/audit';
import { createRateLimiter } from '../middleware/rateLimit';

const router = Router();

const claimLimiter = createRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 }); // 5 claims/hour per user
const methodsLimiter = createRateLimiter({ max: 10, windowMs: 60 * 1000 });

const VALID_PLANS = ['STANDARD', 'ENTERPRISE'] as const;
const VALID_PERIODS = ['monthly', 'yearly'] as const;
const VALID_CLAIM_STATUS = ['pending', 'approved', 'rejected'] as const;

function clientIp(req: AuthenticatedRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.ip || 'unknown';
}

function err(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: status >= 500 ? 'Server Error' : 'Request Failed', code, message });
}

/**
 * Compute plan end date from a billing period. Server clock is authoritative —
 * the client never decides when a paid plan expires.
 */
function planEndFor(period: 'monthly' | 'yearly', start: Date): Date {
  const end = new Date(start);
  if (period === 'yearly') end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

// ---------------------------------------------------------------------------
// Payment methods config (owner sets up once; public read so users know where
// to send money: bKash / Nagad / UPI / PhonePe / bank transfer / cash).
// ---------------------------------------------------------------------------

/**
 * GET /api/billing/methods
 * Public. Lists active payment methods with owner-provided instructions,
 * e.g. { id: 'bkash', name: 'bKash', account: '01XXXXXXXXX', accountType:
 * 'personal'|'merchant', instructions: { en, bn }, active: true }.
 * Inactive methods are never exposed.
 */
router.get('/methods', methodsLimiter.byIp('billing-methods'), async (_req, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const snap = await db.collection('paymentMethods').where('active', '==', true).get();
    const methods = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ methods });
  } catch (e: any) {
    console.error('[Billing] methods list failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not load payment methods.');
  }
});

/**
 * POST /api/billing/methods  (owner)
 * Create or update a payment method.
 * Body: { id: 'bkash'|'nagad'|'upi'|'phonepe'|'bank'|..., name, account,
 *         accountType?: 'personal'|'merchant'|'upi-id',
 *         instructions?: { en?: string, bn?: string, hi?: string },
 *         active?: boolean }
 */
router.post('/methods', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, name, account, accountType, instructions, active } = req.body;
    const uid = req.authContext?.uid || 'unknown';
    if (typeof id !== 'string' || !id.trim() || typeof name !== 'string' || !name.trim()) {
      err(res, 400, 'INVALID_INPUT', 'id and name are required.');
      return;
    }
    const db = getFirestore();
    const ref = db.collection('paymentMethods').doc(id.trim().toLowerCase());
    await ref.set(
      {
        name: name.trim(),
        account: typeof account === 'string' ? account.trim() : '',
        accountType: typeof accountType === 'string' ? accountType : 'personal',
        instructions: instructions && typeof instructions === 'object' ? instructions : {},
        active: active !== false,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      },
      { merge: true }
    );
    await auditLog({
      action: 'billing.method.upsert', actorUid: uid, actorEmail: req.authContext?.email,
      targetType: 'paymentMethods', targetId: ref.id, ip: clientIp(req), severity: 'info',
      details: { name },
    });
    res.json({ ok: true, id: ref.id });
  } catch (e: any) {
    console.error('[Billing] method upsert failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not save payment method.');
  }
});

// ---------------------------------------------------------------------------
// Payment claims — the manual-verification pattern.
// The user pays via bKash/Nagad/UPI *outside* the app (zero gateway fees,
// zero paperwork), then submits the transaction ID here. The owner verifies
// the payment in their own mobile-banking app and approves. Only approval
// flips the plan — submitting a claim grants nothing.
// ---------------------------------------------------------------------------

/**
 * POST /api/billing/payment-claims  (authenticated)
 * Submit a manual payment claim for a workspace plan upgrade.
 * Body: { workspaceId, plan: 'STANDARD'|'ENTERPRISE',
 *         billingPeriod: 'monthly'|'yearly', paymentMethodId: 'bkash'|...,
 *         transactionId, amount, currency?, proofUrl?, notes? }
 * Guards: one pending claim per workspace; claimant must be a workspace
 * member (trustee or staff); transactionId is required.
 */
router.post(
  '/payment-claims',
  requireAuth,
  claimLimiter.byUser('billing-claim'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const uid = req.authContext?.uid || 'unknown';
      const {
        workspaceId, plan, billingPeriod, paymentMethodId,
        transactionId, amount, currency, proofUrl, notes,
      } = req.body;

      if (typeof workspaceId !== 'string' || !workspaceId.trim()) {
        err(res, 400, 'INVALID_INPUT', 'workspaceId is required.'); return;
      }
      if (!(VALID_PLANS as readonly string[]).includes(plan)) {
        err(res, 400, 'INVALID_INPUT', `plan must be one of: ${VALID_PLANS.join(', ')}`); return;
      }
      if (!(VALID_PERIODS as readonly string[]).includes(billingPeriod)) {
        err(res, 400, 'INVALID_INPUT', `billingPeriod must be one of: ${VALID_PERIODS.join(', ')}`); return;
      }
      if (typeof paymentMethodId !== 'string' || !paymentMethodId.trim()) {
        err(res, 400, 'INVALID_INPUT', 'paymentMethodId is required.'); return;
      }
      if (typeof transactionId !== 'string' || !transactionId.trim()) {
        err(res, 400, 'INVALID_INPUT', 'transactionId is required — the reference from your bKash/Nagad/UPI app.'); return;
      }
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        err(res, 400, 'INVALID_INPUT', 'amount must be a positive number.'); return;
      }

      const db = getFirestore();

      // Claimant must belong to the workspace (any role — devotees can pay
      // on behalf of their organisation; trustees approve the claim later).
      const memberSnap = await db.collection('workspaceMembers')
        .where('workspaceId', '==', workspaceId.trim())
        .where('uid', '==', uid).limit(1).get();
      if (memberSnap.empty) {
        err(res, 403, 'NOT_A_MEMBER', 'Only members of this workspace can submit payment claims for it.'); return;
      }

      // One pending claim per workspace — prevents duplicate submissions and
      // double-approval races.
      const pendingSnap = await db.collection('paymentClaims')
        .where('workspaceId', '==', workspaceId.trim())
        .where('status', '==', 'pending').limit(1).get();
      if (!pendingSnap.empty) {
        err(res, 409, 'CLAIM_PENDING', 'This workspace already has a pending payment claim. Wait for review before submitting another.'); return;
      }

      // Same transaction ID can't be claimed twice (anti-replay).
      const dupSnap = await db.collection('paymentClaims')
        .where('transactionId', '==', transactionId.trim()).limit(1).get();
      if (!dupSnap.empty) {
        err(res, 409, 'TXID_REUSED', 'This transaction ID has already been submitted.'); return;
      }

      const docRef = await db.collection('paymentClaims').add({
        workspaceId: workspaceId.trim(),
        applicantUid: uid,
        applicantEmail: req.authContext?.email || null,
        plan,
        billingPeriod,
        paymentMethodId: paymentMethodId.trim().toLowerCase(),
        transactionId: transactionId.trim(),
        amount: numAmount,
        currency: typeof currency === 'string' && currency ? currency.toUpperCase() : 'BDT',
        proofUrl: typeof proofUrl === 'string' ? proofUrl.slice(0, 2000) : null,
        notes: typeof notes === 'string' ? notes.slice(0, 1000) : null,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        reviewedBy: null,
        reviewedAt: null,
        reviewReason: null,
      });

      await auditLog({
        action: 'billing.claim.submit', actorUid: uid, actorEmail: req.authContext?.email,
        workspaceId: workspaceId.trim(), targetType: 'paymentClaims', targetId: docRef.id,
        ip: clientIp(req), severity: 'info', details: { plan, billingPeriod, amount: numAmount },
      });

      res.status(201).json({ ok: true, claimId: docRef.id, status: 'pending' });
    } catch (e: any) {
      console.error('[Billing] claim submit failed:', e?.message);
      err(res, 500, 'INTERNAL', 'Could not submit payment claim.');
    }
  }
);

/**
 * GET /api/billing/payment-claims  (owner)
 * List claims with filters. ?status=pending|approved|rejected&limit=&cursor=
 */
router.get('/payment-claims', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getFirestore();
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1), 200);
    let q: FirebaseFirestore.Query = db.collection('paymentClaims').orderBy('createdAt', 'desc').limit(limit);
    if ((VALID_CLAIM_STATUS as readonly string[]).includes(status)) {
      q = db.collection('paymentClaims').where('status', '==', status).orderBy('createdAt', 'desc').limit(limit);
    }
    const snap = await q.get();
    res.json({ claims: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (e: any) {
    console.error('[Billing] claims list failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not list payment claims.');
  }
});

/**
 * POST /api/billing/payment-claims/:id/approve  (owner)
 * The owner has verified the money arrived in their bKash/Nagad/UPI account.
 * Approving ACTIVATES the plan: writes subscriptions/{workspaceId} with
 * server-computed start/end dates and mirrors planId onto the workspace.
 * Idempotent — re-approving an approved claim is a no-op.
 */
router.post('/payment-claims/:id/approve', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.authContext?.uid || 'unknown';
    const claimId = String(req.params.id);
    const db = getFirestore();
    const claimRef = db.collection('paymentClaims').doc(claimId);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(claimRef);
      if (!snap.exists) return { code: 404 as const };
      const claim = snap.data() as any;
      if (claim.status === 'approved') return { code: 200 as const, already: true, claim };
      if (claim.status !== 'pending') return { code: 409 as const, status: claim.status };

      const start = new Date();
      const end = planEndFor(claim.billingPeriod === 'yearly' ? 'yearly' : 'monthly', start);
      const subRef = db.collection('subscriptions').doc(claim.workspaceId);

      tx.set(subRef, {
        workspaceId: claim.workspaceId,
        plan: claim.plan,
        billingPeriod: claim.billingPeriod,
        status: 'active',
        planStartAt: Timestamp.fromDate(start),
        planEndAt: Timestamp.fromDate(end),
        lastClaimId: claimId,
        lastPaymentMethod: claim.paymentMethodId,
        lastAmount: claim.amount,
        lastCurrency: claim.currency || 'BDT',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // Mirror the plan onto the workspace doc so client plan gates pick it up.
      tx.set(db.collection('workspaces').doc(claim.workspaceId),
        { planId: claim.plan, planUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });

      tx.update(claimRef, {
        status: 'approved',
        reviewedBy: uid,
        reviewedAt: FieldValue.serverTimestamp(),
        activatedAt: Timestamp.fromDate(start),
        expiresAt: Timestamp.fromDate(end),
      });
      return { code: 200 as const, claim, start, end };
    });

    if (result.code === 404) { err(res, 404, 'NOT_FOUND', 'Payment claim not found.'); return; }
    if (result.code === 409) { err(res, 409, 'INVALID_STATE', `Claim is already ${result.status}.`); return; }

    await auditLog({
      action: 'billing.claim.approve', actorUid: uid, actorEmail: req.authContext?.email,
      workspaceId: (result as any).claim?.workspaceId, targetType: 'paymentClaims', targetId: claimId,
      ip: clientIp(req), severity: 'critical',
      details: { plan: (result as any).claim?.plan, already: (result as any).already === true },
    });

    res.json({
      ok: true, claimId, status: 'approved', already: (result as any).already === true,
      planStartAt: (result as any).start?.toISOString() || null,
      planEndAt: (result as any).end?.toISOString() || null,
    });
  } catch (e: any) {
    console.error('[Billing] claim approve failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not approve payment claim.');
  }
});

/**
 * POST /api/billing/payment-claims/:id/reject  (owner)
 * Body: { reason: string } — required, shown to the claimant.
 */
router.post('/payment-claims/:id/reject', requireOwner, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.authContext?.uid || 'unknown';
    const claimId = String(req.params.id);
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500).trim() : '';
    if (!reason) { err(res, 400, 'INVALID_INPUT', 'A rejection reason is required.'); return; }

    const db = getFirestore();
    const claimRef = db.collection('paymentClaims').doc(claimId);
    const snap = await claimRef.get();
    if (!snap.exists) { err(res, 404, 'NOT_FOUND', 'Payment claim not found.'); return; }
    const claim = snap.data() as any;
    if (claim.status !== 'pending') { err(res, 409, 'INVALID_STATE', `Claim is already ${claim.status}.`); return; }

    await claimRef.update({
      status: 'rejected', reviewedBy: uid,
      reviewedAt: FieldValue.serverTimestamp(), reviewReason: reason,
    });

    await auditLog({
      action: 'billing.claim.reject', actorUid: uid, actorEmail: req.authContext?.email,
      workspaceId: claim.workspaceId, targetType: 'paymentClaims', targetId: claimId,
      ip: clientIp(req), severity: 'warn', details: { reason },
    });

    res.json({ ok: true, claimId, status: 'rejected' });
  } catch (e: any) {
    console.error('[Billing] claim reject failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not reject payment claim.');
  }
});

// ---------------------------------------------------------------------------
// Plan lifecycle
// ---------------------------------------------------------------------------

/**
 * GET /api/billing/subscription/:workspaceId  (authenticated)
 * Current plan status for a workspace. Callers must be workspace members or
 * the owner. Returns plan, dates, days remaining, and active/expired/none.
 */
router.get('/subscription/:workspaceId', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const uid = req.authContext?.uid || 'unknown';
    const workspaceId = String(req.params.workspaceId);
    const db = getFirestore();

    const isOwner = req.authContext && (uid === 'sxIGHmvpYUTqPnpI1bLFT1O1cA62'
      || (req.authContext.email || '').toLowerCase() === 'iadeshchandra@gmail.com');
    if (!isOwner) {
      const memberSnap = await db.collection('workspaceMembers')
        .where('workspaceId', '==', workspaceId).where('uid', '==', uid).limit(1).get();
      if (memberSnap.empty) { err(res, 403, 'NOT_A_MEMBER', 'Not a member of this workspace.'); return; }
    }

    const subSnap = await db.collection('subscriptions').doc(workspaceId).get();
    if (!subSnap.exists) {
      res.json({ workspaceId, plan: 'LITE', status: 'none', daysRemaining: null });
      return;
    }
    const sub = subSnap.data() as any;
    const endAt: Date | null = sub.planEndAt?.toDate ? sub.planEndAt.toDate() : null;
    const now = new Date();
    const active = !!endAt && endAt.getTime() > now.getTime() && sub.status === 'active';
    const daysRemaining = endAt ? Math.max(0, Math.ceil((endAt.getTime() - now.getTime()) / 86400000)) : null;
    res.json({
      workspaceId,
      plan: active ? sub.plan : 'LITE',
      billingPeriod: sub.billingPeriod || null,
      status: active ? 'active' : 'expired',
      planStartAt: sub.planStartAt?.toDate ? sub.planStartAt.toDate().toISOString() : null,
      planEndAt: endAt ? endAt.toISOString() : null,
      daysRemaining,
    });
  } catch (e: any) {
    console.error('[Billing] subscription lookup failed:', e?.message);
    err(res, 500, 'INTERNAL', 'Could not load subscription.');
  }
});

export default router;
