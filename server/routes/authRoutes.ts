import { Router, Request, Response } from 'express';
import { createHash, timingSafeEqual, randomBytes } from 'crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';

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

/* ============================================================================
 * Secure QR Pairing (WhatsApp-Web style)
 * ----------------------------------------------------------------------------
 * The QR contains a ONE-TIME, SHORT-LIVED claim token — never credentials.
 * Flow:
 *   1. Authenticated staff (or the member) calls POST /qr-pair -> gets token.
 *   2. Temple office renders the token as a QR (client-side).
 *   3. Devotee scans it at the login screen -> client POSTs /qr-claim.
 *   4. Server validates (exists, unexpired, unclaimed), deletes it
 *      (single-use), and mints a Firebase custom token for the member.
 * Plaintext-PIN-in-QR designs were removed: anyone photographing such a QR
 * could impersonate the devotee indefinitely.
 * ========================================================================== */

const PAIRING_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PAIRING_TOKEN_BYTES = 32;

interface PairingEntry {
  token: Buffer;
  memberId: string;
  memberName: string;
  workspaceId: string;
  role: string;
  expiresAt: number;
  createdBy: string;
}

// Keyed by SHA-256(token) hex so token existence can't be probed by timing.
const pairingTokens = new Map<string, PairingEntry>();

function pairingKey(tokenHex: string): string {
  return createHash('sha256').update(tokenHex, 'utf8').digest('hex');
}

// Periodic sweep of expired pairing tokens to bound memory.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pairingTokens) {
    if (v.expiresAt <= now) pairingTokens.delete(k);
  }
}, 60 * 1000).unref?.();

// --- Tiny generic rate limiter (per-key sliding window) ---
interface RLAttempt { count: number; resetAt: number }
function makeRateLimiter(max: number, windowMs: number) {
  const map = new Map<string, RLAttempt>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of map) {
      if (v.resetAt <= now) map.delete(k);
    }
  }, windowMs).unref?.();
  return {
    check(key: string): boolean {
      const now = Date.now();
      const entry = map.get(key);
      if (!entry || entry.resetAt <= now) {
        map.set(key, { count: 1, resetAt: now + windowMs });
        return false;
      }
      entry.count += 1;
      return entry.count > max;
    },
  };
}
const qrPairLimiter = makeRateLimiter(10, 60 * 1000); // 10/min per session
const qrClaimLimiter = makeRateLimiter(5, 60 * 1000); // 5/min per IP

function clientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown'
  );
}

const STAFF_ROLES = new Set(['superadmin', 'trustee', 'accountant', 'priest', 'sevadar', 'cso']);

function sanitizeUidPart(s: string): string {
  return s.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60);
}

/**
 * POST /api/auth/qr-pair
 * Authenticated staff (or the member themselves) mint a one-time pairing
 * token for a devotee. Body: { memberId, workspaceId, memberName?, role? }
 */
router.post('/qr-pair', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ctx = req.authContext;
    if (!ctx) {
      res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN', message: 'Authentication required.' });
      return;
    }

    if (qrPairLimiter.check(`qr-pair::${ctx.uid}`)) {
      res.status(429).json({ error: 'Too Many Requests', code: 'RATE_LIMITED', message: 'Too many pairing requests. Please wait a minute.' });
      return;
    }

    const { memberId, workspaceId, memberName, role } = req.body || {};
    if (typeof memberId !== 'string' || !memberId.trim() || memberId.length > 128) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'memberId is required.' });
      return;
    }
    if (typeof workspaceId !== 'string' || !workspaceId.trim() || workspaceId.length > 128) {
      res.status(400).json({ error: 'Bad Request', code: 'INVALID_INPUT', message: 'workspaceId is required.' });
      return;
    }
    const wsId = workspaceId.trim();
    const mId = memberId.trim();

    // Authorization: tenant-scoped staff, superadmin, or the member themselves.
    const heldRoles = [ctx.role, ...(ctx.roles || [])].map((r) => String(r).toLowerCase());
    const isStaff = heldRoles.some((r) => STAFF_ROLES.has(r));
    const sameTenant = ctx.tenantId === wsId;
    const isSelf = ctx.uid === mId;
    if (!(ctx.isSuperAdmin || ((isStaff || isSelf) && sameTenant))) {
      res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE', message: 'Not authorized to issue pairing codes for this workspace.' });
      return;
    }

    const token = randomBytes(PAIRING_TOKEN_BYTES);
    const tokenHex = token.toString('hex');
    const expiresAt = Date.now() + PAIRING_TTL_MS;
    const memberRole = typeof role === 'string' && role.trim() ? role.trim().slice(0, 32) : 'Devotee';

    pairingTokens.set(pairingKey(tokenHex), {
      token,
      memberId: mId,
      memberName: typeof memberName === 'string' ? memberName.slice(0, 128) : 'Devotee',
      workspaceId: wsId,
      role: memberRole,
      expiresAt,
      createdBy: ctx.uid,
    });

    console.log(`[AuthRoutes] QR pairing token issued for member ${mId} in ${wsId} by ${ctx.uid}`);
    res.json({ ok: true, token: tokenHex, expiresAt });
  } catch (error: any) {
    console.error('[AuthRoutes] qr-pair error:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'PAIR_FAILED', message: 'Could not issue pairing code.' });
  }
});

// Non-enumerating failure message for claim attempts.
const CLAIM_FAILED = { error: 'Unauthorized', code: 'INVALID_CODE', message: 'Invalid or expired code.' };

/**
 * POST /api/auth/qr-claim
 * Public (rate-limited). Body: { token, deviceLabel? }. Validates the
 * one-time token, deletes it (single-use), and mints a Firebase custom
 * token for the member — the same issuance path as /verify-pin.
 */
router.post('/qr-claim', async (req: Request, res: Response): Promise<void> => {
  try {
    if (qrClaimLimiter.check(`qr-claim::${clientIp(req)}`)) {
      res.status(429).json({ error: 'Too Many Requests', code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a minute.' });
      return;
    }

    const { token } = req.body || {};
    if (typeof token !== 'string' || !/^[0-9a-fA-F]{64}$/.test(token)) {
      res.status(401).json(CLAIM_FAILED);
      return;
    }

    const entry = pairingTokens.get(pairingKey(token.toLowerCase()));
    if (!entry) {
      res.status(401).json(CLAIM_FAILED);
      return;
    }

    // Timing-safe comparison of the presented token against the stored one.
    let matches = false;
    try {
      const presented = Buffer.from(token.toLowerCase(), 'hex');
      matches = presented.length === entry.token.length && timingSafeEqual(presented, entry.token);
    } catch {
      matches = false;
    }

    // Single-use: delete BEFORE issuing, so a concurrent replay can't win.
    pairingTokens.delete(pairingKey(token.toLowerCase()));

    if (!matches || entry.expiresAt <= Date.now()) {
      res.status(401).json(CLAIM_FAILED);
      return;
    }

    // Success: provision the member identity and mint a claims-bearing token.
    const uid = `qr-${sanitizeUidPart(entry.workspaceId)}-${sanitizeUidPart(entry.memberId)}`.slice(0, 120);
    const db = getFirestore();
    await db.collection('users').doc(uid).set(
      {
        uid,
        role: entry.role,
        workspaceId: entry.workspaceId,
        tenantId: entry.workspaceId,
        qrPairAuth: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const customToken = await getAuth().createCustomToken(uid, {
      role: entry.role,
      tenantId: entry.workspaceId,
      roles: [entry.role],
    });

    console.log(`[AuthRoutes] QR pairing claimed for member ${entry.memberId} in ${entry.workspaceId}`);
    res.json({
      ok: true,
      token: customToken,
      member: {
        id: entry.memberId,
        name: entry.memberName,
        role: entry.role,
        workspaceId: entry.workspaceId,
      },
    });
  } catch (error: any) {
    console.error('[AuthRoutes] qr-claim error:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'CLAIM_FAILED', message: 'Could not complete QR login.' });
  }
});
