/**
 * Sanatani Bandhan — AI Assistant Phase 1 (on-device voice) · types
 * =====================================================================
 * The on-device voice is an ENHANCEMENT of the Phase-0 deterministic
 * assistant, never a replacement. Every type here serves one rule:
 * the LLM may rephrase prose — it may never decide facts, types,
 * actions, or suggestions. Those always come from the deterministic layer.
 */

/** Lifecycle of the on-device voice on this device. */
export type LLMStatus =
  | 'checking' // capability probe in flight
  | 'available' // WebGPU + storage OK, model not yet downloaded
  | 'downloading' // download in progress (progress 0..1)
  | 'downloaded' // model in cache, ready for warm engine
  | 'unavailable'; // no WebGPU / insufficient storage / iOS-class device

/** Why the voice is unavailable — shown honestly in settings, never nagging. */
export type UnavailableReason =
  | 'no-webgpu'
  | 'low-storage'
  | 'unknown';

/** Result of the capability probe. */
export interface VoiceCapability {
  status: Exclude<LLMStatus, 'checking' | 'downloading'>;
  webgpu: boolean;
  /** Estimated free storage in GB, null when the API is absent. */
  freeStorageGB: number | null;
  reason?: UnavailableReason;
}

/** Download progress events for the settings UI. */
export interface DownloadProgress {
  /** 0..1 across fetch+load. */
  progress: number;
  /** 'fetch' = weights downloading, 'load' = compiling into GPU. */
  phase: 'fetch' | 'load';
  /** Human line from the engine, e.g. "Fetching param cache [12/32]". */
  text: string;
}

/** What the renderer needs: prose in, warmer prose out. Facts untouched. */
export interface RephraseRequest {
  /** The deterministic answer text (already correct). */
  original: string;
  /** BCP-style lang code, e.g. 'ta'. */
  lang: string;
  /** Regional id for honorific-aware phrasing. */
  region?: string;
}

/** Intent mapping result — numeric confidence, gated by the caller. */
export interface IntentMapping {
  intent: string;
  /** 0..1. Below threshold → the deterministic router's answer stands. */
  confidence: number;
}

/** Structured data summarization (sadhana week, dana history…). */
export interface SummarizeRequest {
  /** Short label for the prompt, e.g. 'sadhana-week'. */
  kind: string;
  /** The REAL records — the only facts the model may mention. */
  data: Record<string, string | number | boolean | null>;
  lang: string;
  region?: string;
}
