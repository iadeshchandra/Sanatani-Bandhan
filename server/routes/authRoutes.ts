import { Router, Request, Response } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/auth/verify-pin
 * --------------------------
 * Server-side admin PIN verification. The client NEVER compares PINs locally —
 * the expected value is stored only as a peppered SHA-256 hash, either on the
 * workspace document (`workspaces/{workspaceId}.adminPinHash`, written by the
 * server provisioning flow) or, for DEMO_* sandboxes, derived from the
 * server-only DEMO_ADMIN_PIN env var.
 *
 * On success the server provisions a PIN-bound admin identity
 * (`users/pinadmin-{workspaceId}` with role SuperAdmin) and mints a Firebase
 * custom token carrying { role, tenantId, roles } claims, so Firestore rules
 * and the client RBAC stack enforce the session without any client-side secret.
 *
 * Mount in server/index.ts:  app.use('/api/auth', authRoutes);
 */
const router = Router();

// --- Simple in-memory rate limiter: 5 attempts / 15 min per (ip, workspace) ---
interface Attempt { count: number; resetAt: number }
const attempts = new Map<string, Attempt>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function rateLimitKey(req: Request, workspaceId: string): string {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  return `${ip}::${workspaceId}`;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

// Periodic cleanup to bound memory.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of attempts) {
    if (v.resetAt <= now) attempts.delete(k);
  }
}, WINDOW_MS).unref?.();

function hashPin(pin: string, pepper: string): Buffer {
  return createHash('sha256').update(`${pepper}:${pin}`, 'utf8').digest();
}

function safeEqualHex(a: Buffer, hexB: string): boolean {
  if (!/^[0-9a-fA-F]{64}$/.test(hexB)) return false;
  const b = Buffer.from(hexB, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

router.post('/verify-pin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin, workspaceId } = req.body || {};

    if (typeof pin !== 'string' || pin.length < 4 || pin.length > 32) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'PIN must be 4–32 characters.' });
      return;
    }
    if (typeof workspaceId !== 'string' || !workspaceId.trim() || workspaceId.length > 128) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'workspaceId is required.' });
      return;
    }
    const wsId = workspaceId.trim();

    const pepper = process.env.PIN_PEPPER;
    if (!pepper) {
      // Fail closed: PIN login is disabled until the server is configured.
      console.error('[AuthRoutes] PIN_PEPPER is not configured — refusing PIN verification.');
      res.status(503).json({
        error: 'Service Unavailable',
        code: 'PIN_NOT_CONFIGURED',
        message: 'Administrator PIN login is not configured on this server.',
      });
      return;
    }

    if (isRateLimited(rateLimitKey(req, wsId))) {
      res.status(429).json({
        error: 'Too Many Requests',
        code: 'RATE_LIMITED',
        message: 'Too many PIN attempts. Please wait 15 minutes.',
      });
      return;
    }

    // Resolve the expected hash: workspace doc first, DEMO env fallback second.
    let expectedHex: string | null = null;
    try {
      const db = getFirestore();
      const wsDoc = await db.collection('workspaces').doc(wsId).get();
      const stored = wsDoc.data()?.adminPinHash;
      if (typeof stored === 'string' && stored) expectedHex = stored;
    } catch (e: any) {
      console.warn('[AuthRoutes] workspace lookup failed:', e?.message || e);
    }

    if (!expectedHex && wsId.startsWith('DEMO_')) {
      const demoPin = process.env.DEMO_ADMIN_PIN;
      if (demoPin) expectedHex = hashPin(demoPin, pepper).toString('hex');
    }

    const candidate = hashPin(pin, pepper);
    const ok = expectedHex !== null && safeEqualHex(candidate, expectedHex);

    if (!ok) {
      // Generic response — never reveal whether the workspace or the PIN was wrong.
      res.status(401).json({ error: 'Unauthorized', code: 'INVALID_PIN', message: 'Invalid PIN.' });
      return;
    }

    // Success: provision the PIN-bound admin identity and mint a claims-bearing token.
    const uid = `pinadmin-${wsId}`;
    const db = getFirestore();
    await db.collection('users').doc(uid).set(
      {
        uid,
        role: 'SuperAdmin',
        workspaceId: wsId,
        tenantId: wsId,
        pinAuth: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const customToken = await getAuth().createCustomToken(uid, {
      role: 'SuperAdmin',
      tenantId: wsId,
      roles: ['SuperAdmin'],
    });

    console.log(`[AuthRoutes] PIN verified for workspace ${wsId} (identity ${uid})`);
    res.json({ ok: true, role: 'SuperAdmin', customToken });
  } catch (error: any) {
    console.error('[AuthRoutes] verify-pin error:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'VERIFY_FAILED', message: 'PIN verification failed.' });
  }
});

export default router;
