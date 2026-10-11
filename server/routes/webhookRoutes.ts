import { Router, Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const router = Router();

/**
 * Universal IPN Webhook listener for global payment gateways (Stripe, Razorpay, bKash, etc.)
 * POST /api/webhooks/payments
 */
router.post('/payments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, transactionId, amount, currency, gateway, devoteeName } = req.body;

    // 1. Validate required fields
    if (!tenantId || !transactionId || amount === undefined || amount === null || !currency) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required webhook fields: tenantId, transactionId, amount, and currency are required',
      });
      return;
    }

    const db = getFirestore();

    // 2. Verify tenant exists in the root 'tenants' partition
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      res.status(404).json({
        error: 'Not Found',
        message: `Tenant '${tenantId}' does not exist`,
      });
      return;
    }

    // 3. Construct universal treasury ledger entry
    const ledgerEntry = {
      id: transactionId,
      type: 'Income',
      category: 'Digital Donation',
      amount: Number(amount),
      currency: String(currency).toUpperCase(),
      paymentMode: gateway || 'Online Gateway',
      devoteeName: devoteeName || 'Anonymous Devotee',
      date: new Date().toISOString(),
      status: 'Verified',
      source: 'Webhook',
      createdAt: FieldValue.serverTimestamp(),
    };

    // 4. Save to Firestore under the tenant's isolated treasury collection
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('treasury')
      .doc(transactionId)
      .set(ledgerEntry);

    console.log(`[Webhook] Recorded digital donation ${transactionId} (${currency} ${amount}) for tenant ${tenantId}`);

    // 5. Respond 200 OK with success acknowledgment
    res.status(200).json({
      success: true,
      transactionId,
    });
  } catch (error: any) {
    console.error('[Webhook] Error processing payment webhook:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error?.message || 'Failed to process payment webhook',
    });
  }
});

export default router;
