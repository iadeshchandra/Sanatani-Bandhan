/**
 * env.d.ts — Typed declarations for Sanatani Bandhan cloud production env vars.
 * All values are strings at runtime (Vite). See .env.example for documentation.
 */
interface ImportMetaEnv {
  /** Cloud control-plane base URL. Empty/undefined = cloud disabled (Firebase-direct mode). */
  readonly VITE_CLOUD_API_BASE_URL?: string;
  /** Per-request timeout in ms. Default: 15000. */
  readonly VITE_CLOUD_REQUEST_TIMEOUT_MS?: string;
  /** Max mutations per POST /v1/sync/mutations batch. Default: 50. */
  readonly VITE_CLOUD_SYNC_BATCH_SIZE?: string;
  /** Seconds before JWT expiry to proactively refresh. Default: 60. */
  readonly VITE_CLOUD_JWT_REFRESH_SKEW_SEC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
