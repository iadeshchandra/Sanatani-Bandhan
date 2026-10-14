import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

/**
 * Shared sliding-window rate limiter for Cloud Functions.
 *
 * Design notes (Spark-plan aware):
 * - In-memory per function INSTANCE. Cloud Functions scales to N instances,
 *   so this is abuse mitigation, not a hard global quota. Documented as such.
 * - O(1) amortized: entries expire and are swept on a timer.
 * - Keyed by IP, UID, or any composite string the route chooses.
 *
 * Usage:
 *   const loginLimiter = createRateLimiter({ max: 10, windowMs: 60_000 });
 *   router.post('/login', loginLimiter.byIp(), handler);
 *   router.post('/export', requireAuth, loginLimiter.byUser(), handler);
 */

interface RLAttempt {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Max requests per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Message returned on 429. */
  message?: string;
}

function clientIp(req: Request): string {
  return (
    ((req.headers['x-forwarded-for'] as string) || '').split(',')[0]?.trim() ||
    req.ip ||
    'unknown'
  );
}

export function createRateLimiter(opts: RateLimitOptions) {
  const { max, windowMs } = opts;
  const message = opts.message || 'Too many requests. Please slow down and try again shortly.';
  const buckets = new Map<string, RLAttempt>();

  // Bounded memory: sweep expired buckets on the window cadence.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }, windowMs);
  // Don't hold the event loop open in local dev / tests.
  (sweeper as any)?.unref?.();

  function check(key: string): boolean {
    const now = Date.now();
    const entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return false; // not limited
    }
    entry.count += 1;
    return entry.count > max; // true = over the limit
  }

  function deny(res: Response): void {
    res.status(429).json({
      error: 'Too Many Requests',
      code: 'RATE_LIMITED',
      message,
      retryAfterMs: windowMs,
    });
  }

  return {
    /** Limit by client IP — for public/unauthenticated endpoints. */
    byIp: (prefix = 'ip') => (req: Request, res: Response, next: NextFunction): void => {
      if (check(`${prefix}::${clientIp(req)}`)) {
        deny(res);
        return;
      }
      next();
    },
    /** Limit by authenticated user UID — for authed endpoints. Falls back to IP. */
    byUser: (prefix = 'user') => (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      const key = req.authContext?.uid || req.user?.uid || clientIp(req);
      if (check(`${prefix}::${key}`)) {
        deny(res);
        return;
      }
      next();
    },
    /** Raw check for custom keys (e.g. per-workspace). Returns true when limited. */
    check,
  };
}

/**
 * Sensible presets. Tune per route.
 */
export const strictLimiter = createRateLimiter({
  max: 10,
  windowMs: 60_000,
  message: 'Too many attempts. Please wait a minute before retrying.',
});

export const standardLimiter = createRateLimiter({
  max: 60,
  windowMs: 60_000,
  message: 'Rate limit exceeded. Please wait a moment and try again.',
});

export const exportLimiter = createRateLimiter({
  max: 5,
  windowMs: 60_000,
  message: 'Exports are limited to 5 per minute to protect shared quotas.',
});
