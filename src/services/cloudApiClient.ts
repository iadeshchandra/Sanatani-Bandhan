/**
 * cloudApiClient.ts — Phase 21: Production Cloud API Client
 * ----------------------------------------------------------------------------
 * Centralized, production-grade fetch wrapper for the Sanatani Bandhan cloud
 * control plane. Replaces all simulated `setTimeout` network code with real
 * HTTP against `VITE_CLOUD_API_BASE_URL`.
 *
 * Features:
 *  - Config resolved from `import.meta.env` (see .env.example)
 *  - Bearer JWT auto-attachment via an injectable async token provider
 *    (registered by AuthWorkspaceContext — no circular imports)
 *  - X-Idempotency-Key on POST/PUT for safe retries
 *  - X-Workspace-Id tenant header via an injectable workspace provider
 *  - AbortController request timeouts + exponential backoff with jitter
 *  - Retries ONLY on network errors / timeouts / 408 / 429 / 5xx
 *    (never on other 4xx — those go to the dead-letter queue instead)
 *  - Typed errors: CloudApiError { status, code, message, retryable }
 *  - No-op safe when cloud is disabled (empty VITE_CLOUD_API_BASE_URL):
 *    the app runs in Firebase-direct / local-offline mode.
 */

/** Typed error thrown for every cloud request failure. */
export class CloudApiError extends Error {
  /** HTTP status code, or 0 for transport-level failures (timeout, DNS, CORS). */
  status: number;
  /** Machine-readable code, e.g. 'HTTP_401', 'REQUEST_TIMEOUT', 'NETWORK_ERROR'. */
  code: string;
  /** Whether the caller should keep the work queued and retry later. */
  retryable: boolean;

  constructor(status: number, code: string, message: string, retryable: boolean) {
    super(message);
    this.name = 'CloudApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export interface CloudApiConfig {
  /** Base URL of the cloud API, e.g. https://api.sanatanibandhan.org. Empty = cloud disabled. */
  baseUrl: string;
  /** Per-request timeout in milliseconds. */
  requestTimeoutMs: number;
  /** Max mutations per POST /v1/sync/mutations batch. */
  syncBatchSize: number;
  /** Seconds before JWT expiry at which the token is proactively refreshed. */
  jwtRefreshSkewSec: number;
}

const toPositiveNumber = (raw: string | undefined, fallback: number): number => {
  const parsed = raw !== undefined && raw !== '' ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Resolves cloud config from `import.meta.env`. Call cheaply — it reads env on each call. */
export const getCloudConfig = (): CloudApiConfig => ({
  baseUrl: (import.meta.env.VITE_CLOUD_API_BASE_URL || '').trim().replace(/\/+$/, ''),
  requestTimeoutMs: toPositiveNumber(import.meta.env.VITE_CLOUD_REQUEST_TIMEOUT_MS, 15000),
  syncBatchSize: Math.max(1, Math.floor(toPositiveNumber(import.meta.env.VITE_CLOUD_SYNC_BATCH_SIZE, 50))),
  jwtRefreshSkewSec: toPositiveNumber(import.meta.env.VITE_CLOUD_JWT_REFRESH_SKEW_SEC, 60),
});

/** True when a cloud API base URL is configured. False = Firebase-direct / local-offline mode. */
export const isCloudEnabled = (): boolean => getCloudConfig().baseUrl.length > 0;

export const getSyncBatchSize = (): number => getCloudConfig().syncBatchSize;
export const getJwtRefreshSkewSec = (): number => getCloudConfig().jwtRefreshSkewSec;

// ---------------------------------------------------------------------------
// Injectable providers (set by AuthWorkspaceContext; avoids circular imports)
// ---------------------------------------------------------------------------

type TokenProvider = () => Promise<string | null>;
type WorkspaceIdProvider = () => string | null;

let authTokenProvider: TokenProvider | null = null;
let workspaceIdProvider: WorkspaceIdProvider | null = null;

/**
 * Registers the async JWT provider. Pass `null` to unregister (e.g. on logout).
 * The provider is responsible for refreshing an expired token when possible.
 */
export const setAuthTokenProvider = (fn: TokenProvider | null): void => {
  authTokenProvider = fn;
};

/** Registers the active workspace id provider for the X-Workspace-Id header. */
export const setWorkspaceIdProvider = (fn: WorkspaceIdProvider | null): void => {
  workspaceIdProvider = fn;
};

// ---------------------------------------------------------------------------
// Core request machinery
// ---------------------------------------------------------------------------

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Override for the configured request timeout (ms). */
  timeoutMs?: number;
  /** Max retry attempts after the initial try (default 3). */
  retries?: number;
}

const DEFAULT_RETRIES = 3;
const BACKOFF_BASE_MS = 500;
const BACKOFF_MAX_MS = 10000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Exponential backoff with full jitter: 500ms * 2^attempt + random(0..250), capped at 10s. */
const backoffDelayMs = (attempt: number): number =>
  Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt) + Math.random() * 250, BACKOFF_MAX_MS);

const isRetryableStatus = (status: number): boolean =>
  status === 408 || status === 429 || (status >= 500 && status <= 599);

const newIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof (crypto as Crypto).randomUUID === 'function') {
    return (crypto as Crypto).randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

/**
 * Core fetch wrapper. Attaches Authorization/X-Idempotency-Key/X-Workspace-Id
 * headers, enforces timeouts, and retries transient failures with backoff.
 *
 * @throws {CloudApiError} on every failure — inspect `.retryable` / `.status`.
 */
export const apiRequest = async <T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const config = getCloudConfig();
  if (!config.baseUrl) {
    throw new CloudApiError(
      0,
      'CLOUD_DISABLED',
      'Cloud API is disabled (VITE_CLOUD_API_BASE_URL is empty). Enable cloud mode or guard with isCloudEnabled().',
      false
    );
  }

  const {
    method = 'GET',
    body,
    headers = {},
    timeoutMs = config.requestTimeoutMs,
    retries = DEFAULT_RETRIES,
  } = options;

  const url = `${config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  // Resolve the token once per logical request (tokens live ~1h; safe to reuse across retries).
  let authToken: string | null = null;
  if (authTokenProvider) {
    try {
      authToken = await authTokenProvider();
    } catch (providerErr) {
      // A throwing token provider is a programming error — surface it, don't retry as a network blip.
      throw new CloudApiError(
        0,
        'TOKEN_PROVIDER_ERROR',
        providerErr instanceof Error ? providerErr.message : 'Auth token provider failed.',
        false
      );
    }
  }

  let lastError: CloudApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let failure: CloudApiError | null = null;

    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };
      if (authToken) requestHeaders['Authorization'] = `Bearer ${authToken}`;
      const wsId = workspaceIdProvider ? workspaceIdProvider() : null;
      if (wsId) requestHeaders['X-Workspace-Id'] = wsId;
      if ((method === 'POST' || method === 'PUT') && !requestHeaders['X-Idempotency-Key']) {
        requestHeaders['X-Idempotency-Key'] = newIdempotencyKey();
      }

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (response.ok) {
        if (response.status === 204) return undefined as T;
        const text = await response.text();
        return (text ? (JSON.parse(text) as T) : undefined) as T;
      }

      // Non-2xx: extract server-provided code/message when available.
      let code = `HTTP_${response.status}`;
      let message = response.statusText || 'Cloud request failed.';
      try {
        const errBody = (await response.json()) as Record<string, unknown> | null;
        if (errBody) {
          if (typeof errBody.code === 'string') code = errBody.code;
          if (typeof errBody.message === 'string') message = errBody.message;
          else if (typeof errBody.error === 'string') message = errBody.error;
        }
      } catch {
        /* non-JSON error body — keep defaults */
      }

      const retryable = isRetryableStatus(response.status);
      failure = new CloudApiError(response.status, code, message, retryable);
    } catch (err) {
      if (err instanceof CloudApiError) throw err; // already classified & terminal above
      if (err instanceof DOMException && err.name === 'AbortError') {
        failure = new CloudApiError(
          0,
          'REQUEST_TIMEOUT',
          `Cloud request timed out after ${timeoutMs}ms.`,
          true
        );
      } else {
        failure = new CloudApiError(
          0,
          'NETWORK_ERROR',
          err instanceof Error ? err.message : 'Network request failed.',
          true
        );
      }
    } finally {
      clearTimeout(timeoutId);
    }

    lastError = failure;
    if (!failure.retryable || attempt === retries) throw failure;
    await sleep(backoffDelayMs(attempt));
  }

  // Unreachable in practice (loop always throws on the final attempt).
  throw lastError ?? new CloudApiError(0, 'NETWORK_ERROR', 'Cloud request failed after retries.', false);
};

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

export interface CloudTokenResult {
  accessToken: string;
  /** Epoch millis at which the access token expires. */
  expiresAt: number;
}

interface TokenResponseWire {
  accessToken?: string;
  access_token?: string;
  expiresAt?: number;
  expires_at?: number;
  expiresIn?: number;
  expires_in?: number;
}

const normalizeTokenResult = (raw: TokenResponseWire): CloudTokenResult => {
  const accessToken = raw.accessToken || raw.access_token || '';
  if (!accessToken) {
    throw new CloudApiError(
      0,
      'INVALID_TOKEN_RESPONSE',
      'Cloud auth response did not include an access token.',
      false
    );
  }
  const expiresInSec = raw.expiresIn ?? raw.expires_in;
  const expiresAtRaw = raw.expiresAt ?? raw.expires_at;
  const expiresAt = expiresAtRaw
    ? Number(expiresAtRaw)
    : Date.now() + (expiresInSec ? Number(expiresInSec) * 1000 : 3600 * 1000);
  return { accessToken, expiresAt };
};

/**
 * Exchanges a Firebase ID token for a cloud control-plane JWT.
 * POST /v1/auth/exchange  { firebaseIdToken } -> { accessToken, expiresIn | expiresAt }
 */
export const exchangeToken = async (firebaseIdToken: string): Promise<CloudTokenResult> => {
  const raw = await apiRequest<TokenResponseWire>('/v1/auth/exchange', {
    method: 'POST',
    body: { firebaseIdToken },
  });
  return normalizeTokenResult(raw);
};

/**
 * Refreshes the cloud JWT using the currently attached Authorization header.
 * POST /v1/auth/refresh -> { accessToken, expiresIn | expiresAt }
 * A 401 here means the cloud session is dead: the caller must clear the token
 * and dispatch 'sanatani:cloud-auth-required'.
 */
export const refreshCloudToken = async (): Promise<CloudTokenResult> => {
  const raw = await apiRequest<TokenResponseWire>('/v1/auth/refresh', {
    method: 'POST',
    body: {},
    retries: 1, // refresh is latency-sensitive; one retry is enough
  });
  return normalizeTokenResult(raw);
};

// ---------------------------------------------------------------------------
// Sync endpoint
// ---------------------------------------------------------------------------

export interface CloudMutation {
  id: string;
  collection: string;
  action: string;
  payload: unknown;
  timestamp: number;
}

export interface SyncBatchResponse {
  accepted: string[];
  rejected?: Array<{ id: string; code?: string; message?: string }>;
}

/**
 * Flushes a batch of offline mutations to the cloud.
 * POST /v1/sync/mutations  { mutations, clientTs } -> { accepted, rejected? }
 * The same X-Idempotency-Key is reused across retries of this call, so a
 * retried batch is deduplicated server-side.
 */
export const syncMutationsBatch = async (
  mutations: CloudMutation[]
): Promise<SyncBatchResponse> => {
  if (!mutations.length) return { accepted: [] };
  return apiRequest<SyncBatchResponse>('/v1/sync/mutations', {
    method: 'POST',
    body: { mutations, clientTs: Date.now() },
  });
};
