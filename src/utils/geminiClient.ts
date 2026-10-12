/**
 * geminiClient.ts — Server-free Gemini access for the Firebase Spark ($0) plan.
 *
 * Calls the Google AI (Gemini) REST API directly from the browser, so the
 * in-app AI features (Vedic Helpdesk, Dharmic Copilot, personal assistant)
 * work with no Cloud Functions / Express server at all.
 *
 * Key resolution order:
 *   1. explicit `apiKey` argument (e.g. a key the user just typed for validation)
 *   2. `import.meta.env.VITE_GEMINI_API_KEY` (build-time config)
 *   3. `localStorage 'user_gemini_api_key'` (user-saved key from Account settings)
 *
 * Throws `Error('GEMINI_KEY_MISSING')` when no key is available — callers must
 * fall back to their offline/local behavior in that case.
 *
 * Zero dependencies: fetch + AbortController only.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = 12_000;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Resolve a Gemini API key from (explicit arg → env → localStorage). */
export function resolveGeminiKey(explicit?: string): string | null {
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
  try {
    const envKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY;
    if (typeof envKey === 'string' && envKey.trim()) return envKey.trim();
  } catch {
    /* import.meta unavailable (SSR/tests) — fall through */
  }
  try {
    const stored = localStorage.getItem('user_gemini_api_key');
    if (typeof stored === 'string' && stored.trim()) return stored.trim();
  } catch {
    /* storage unavailable — fall through */
  }
  return null;
}

/**
 * Call Gemini directly. Returns the concatenated text of the first candidate.
 *
 * @param prompt            User prompt (required, non-empty).
 * @param systemInstruction Optional system instruction prepended to the prompt.
 * @param apiKey            Optional explicit key (takes precedence).
 * @throws Error('GEMINI_KEY_MISSING') when no key resolves.
 * @throws Error('GEMINI_HTTP_<status>') on non-2xx upstream responses.
 * @throws Error('GEMINI_EMPTY_RESPONSE') when the model returns no text.
 * Abort / network failures propagate as the fetch rejection.
 */
export async function callGeminiDirect(
  prompt: string,
  systemInstruction?: string,
  apiKey?: string
): Promise<string> {
  const key = resolveGeminiKey(apiKey);
  if (!key) throw new Error('GEMINI_KEY_MISSING');
  if (!prompt || !prompt.trim()) throw new Error('GEMINI_EMPTY_PROMPT');

  const text =
    typeof systemInstruction === 'string' && systemInstruction.trim()
      ? `${systemInstruction.trim()}\n\n${prompt.trim()}`
      : prompt.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const resp = await fetch(
      `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }] }),
        signal: controller.signal,
      }
    );
    if (!resp.ok) throw new Error(`GEMINI_HTTP_${resp.status}`);
    const data: any = await resp.json().catch(() => null);
    const out: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
        .join('')
        .trim() || '';
    if (!out) throw new Error('GEMINI_EMPTY_RESPONSE');
    return out;
  } finally {
    clearTimeout(timer);
  }
}
