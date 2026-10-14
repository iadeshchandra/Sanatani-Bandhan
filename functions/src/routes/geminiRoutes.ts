import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

// --- Tiny per-IP sliding-window rate limiter (20/min), same pattern as authRoutes ---
interface RLAttempt { count: number; resetAt: number }
const rlMap = new Map<string, RLAttempt>();
const RL_MAX = 20;
const RL_WINDOW_MS = 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rlMap) {
    if (v.resetAt <= now) rlMap.delete(k);
  }
}, RL_WINDOW_MS).unref?.();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rlMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    rlMap.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RL_MAX;
}

function clientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown'
  );
}

const SYSTEM_PROMPT =
  'You are the Vedic and administrative AI helpdesk for a Hindu temple management app. ' +
  'Answer helpfully, reverently, concisely (2-3 sentences).';

/**
 * Shared Gemini call. Returns { ok, text?, status? }.
 * Never throws for upstream failures — they become { ok: false }.
 */
async function callGemini(
  apiKey: string,
  text: string
): Promise<{ ok: boolean; text?: string; status?: number }> {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent' +
    `?key=${encodeURIComponent(apiKey)}`;
  let upstream: globalThis.Response;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text }] }] }),
    });
  } catch (e: any) {
    console.error('[GeminiRoutes] upstream network error:', e?.message || e);
    return { ok: false, status: 0 };
  }
  if (!upstream.ok) {
    console.error(`[GeminiRoutes] upstream error status ${upstream.status}`);
    return { ok: false, status: upstream.status };
  }
  const data: any = await upstream.json().catch(() => null);
  const out: string =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')
      .trim() || '';
  return { ok: true, text: out };
}

/**
 * POST /api/gemini/query
 * ----------------------
 * Powers the in-app Vedic Helpdesk widget. Body: { prompt: string }.
 * Uses the server-side GEMINI_API_KEY so the key never reaches the browser.
 * generativelanguage.googleapis.com is a Google service, callable on the
 * Firebase Spark plan.
 */
router.post('/query', async (req: Request, res: Response): Promise<void> => {
  try {
    if (isRateLimited(clientIp(req))) {
      res.status(429).json({
        error: 'Too Many Requests',
        code: 'RATE_LIMITED',
        message: 'Too many questions. Please wait a minute.',
      });
      return;
    }

    const { prompt } = req.body || {};
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) {
      res.status(400).json({
        error: 'Bad Request',
        code: 'INVALID_INPUT',
        message: 'prompt must be a non-empty string of at most 2000 characters.',
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'Service Unavailable',
        code: 'GEMINI_NOT_CONFIGURED',
        message: 'AI helpdesk is not configured on this server.',
      });
      return;
    }

    const result = await callGemini(apiKey, `${SYSTEM_PROMPT}\n\nUser question: ${prompt.trim()}`);
    if (!result.ok) {
      res.status(502).json({
        error: 'Bad Gateway',
        code: 'GEMINI_ERROR',
        message: 'AI helpdesk is temporarily unavailable.',
      });
      return;
    }

    res.json({ text: result.text || 'Hare Krishna. Our temple sevaks are here to assist with daily Darshan, Pujas, and Annadanam.' });
  } catch (error: any) {
    console.error('[GeminiRoutes] query error:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error', code: 'QUERY_FAILED', message: 'Could not answer right now.' });
  }
});

/**
 * POST /api/gemini/validate-key
 * -----------------------------
 * Verifies a user-supplied Gemini API key with a minimal upstream call.
 * Body: { apiKey: string }. Returns { success: boolean, error?: string }.
 * The key is used once for validation and never stored server-side.
 */
router.post('/validate-key', async (req: Request, res: Response): Promise<void> => {
  try {
    if (isRateLimited(clientIp(req))) {
      res.status(429).json({ success: false, error: 'Too many attempts. Please wait a minute.' });
      return;
    }
    const { apiKey } = req.body || {};
    if (typeof apiKey !== 'string' || !apiKey.trim() || apiKey.length > 200) {
      res.status(400).json({ success: false, error: 'A valid API key is required.' });
      return;
    }
    const result = await callGemini(apiKey.trim(), 'Reply with the single word: OK');
    if (result.ok) {
      res.json({ success: true });
    } else if (result.status === 400 || result.status === 403) {
      res.json({ success: false, error: 'This key was rejected by Google. Check it and try again.' });
    } else {
      res.json({ success: false, error: 'Could not reach Google right now. Try again shortly.' });
    }
  } catch (error: any) {
    console.error('[GeminiRoutes] validate-key error:', error?.message || error);
    res.json({ success: false, error: 'Validation failed. Try again shortly.' });
  }
});

/**
 * POST /api/gemini/dharmic-assistant
 * ----------------------------------
 * Authenticated. Full dharmic assistant with caller-supplied system
 * instruction and context. Body: { prompt, systemInstruction?, customApiKey?, ... }.
 * Requires auth because custom system instructions could otherwise be abused
 * to burn the server's Gemini quota via prompt injection.
 */
router.post('/dharmic-assistant', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (isRateLimited(clientIp(req))) {
      res.status(429).json({ success: false, error: 'Too many questions. Please wait a minute.' });
      return;
    }
    const { prompt, systemInstruction, customApiKey } = req.body || {};
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 4000) {
      res.status(400).json({ success: false, error: 'prompt must be a non-empty string of at most 4000 characters.' });
      return;
    }
    const apiKey =
      (typeof customApiKey === 'string' && customApiKey.trim()) || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ success: false, error: 'AI assistant is not configured on this server.' });
      return;
    }
    const instruction =
      typeof systemInstruction === 'string' && systemInstruction.trim()
        ? systemInstruction.trim().slice(0, 4000)
        : SYSTEM_PROMPT;
    const result = await callGemini(apiKey, `${instruction}\n\nUser question: ${prompt.trim()}`);
    if (!result.ok) {
      res.status(502).json({ success: false, error: 'AI assistant is temporarily unavailable.' });
      return;
    }
    res.json({
      success: true,
      result: result.text || 'Hare Krishna. Please ask about Pujas, Vratas, or temple services.',
    });
  } catch (error: any) {
    console.error('[GeminiRoutes] dharmic-assistant error:', error?.message || error);
    res.status(500).json({ success: false, error: 'Could not answer right now.' });
  }
});

export default router;
