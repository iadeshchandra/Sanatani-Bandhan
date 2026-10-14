import { Router, Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const router = Router();

const STARTED_AT = Date.now();
// Bump on every backend deploy so monitoring can confirm rollout.
const BACKEND_VERSION = '1.4.0';

/**
 * GET /api/health
 * ---------------
 * Public. Load-balancer / uptime-monitor friendly.
 * Returns service status + dependency checks. Never leaks internals.
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const checks: Record<string, 'ok' | 'degraded' | 'down'> = {};
  let overall: 'ok' | 'degraded' | 'down' = 'ok';

  // Firestore connectivity: cheapest possible read (single doc, may not exist).
  try {
    const t0 = Date.now();
    await getFirestore().collection('app_config').doc('__health__').get();
    checks.firestore = 'ok';
    checks.firestoreLatencyMs = Date.now() - t0 as any;
  } catch (e: any) {
    checks.firestore = 'down';
    overall = 'down';
  }

  // Auth service: verify the Admin SDK can reach it (list 1 user, no PII returned).
  try {
    await getAuth().listUsers(1);
    checks.auth = 'ok';
  } catch {
    checks.auth = 'degraded';
    if (overall === 'ok') overall = 'degraded';
  }

  const statusCode = overall === 'ok' ? 200 : overall === 'degraded' ? 200 : 503;
  res.status(statusCode).json({
    status: overall,
    version: BACKEND_VERSION,
    region: process.env.FUNCTION_REGION || 'asia-south1',
    uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
    timestamp: new Date().toISOString(),
    checks,
  });
});

/**
 * GET /api/health/ready
 * ---------------------
 * Kubernetes-style readiness probe. 200 only when Firestore is reachable.
 */
router.get('/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    await getFirestore().collection('app_config').doc('__health__').get();
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

export default router;
