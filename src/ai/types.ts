/**
 * Sanatani Bandhan — AI Assistant Phase 0 · shared types
 * =====================================================================
 * Deterministic assistant: intent → executor → template renderer.
 * NO generative model anywhere in this module. Every fact in a response
 * comes from an executor reading app data (Firestore via the user's own
 * authenticated SDK, bundled data, or device-local stores).
 */

/** Roles known to the assistant. Mirrors the workspace RBAC (see rbac.ts). */
export type Role =
  | 'devotee'
  | 'sevadar'
  | 'priest'
  | 'accountant'
  | 'trustee'
  | 'purohit'
  | 'jyotish'
  | 'owner';

/** Intents the deterministic router can produce. */
export type IntentId =
  | 'navigate'
  | 'howto'
  | 'tithi_today'
  | 'festival_next'
  | 'dana_help'
  | 'sadhana_summary'
  | 'booking_help'
  | 'language_help'
  | 'sos_help'
  | 'voice_upgrade'
  | 'dharma_question'
  | 'navigation_question'
  | 'tirtha_summary'
  | 'nearby_temples'
  | 'greeting'
  | 'fallback_unknown'
  | 'admin_briefing'
  | 'admin_stats'
  | 'admin_moderation_help'
  | 'admin_anomaly'
  | 'admin_draft'
  | 'admin_terms'
  | 'admin_history'
  | 'admin_simulate'
  | 'admin_draft_change'
  | 'admin_advise';

/** Languages with fully authored assistant templates today. */
export type TemplateLang = 'en' | 'hi' | 'bn';

/** Any BCP-style language code the app supports (10 langs). */
export type LangCode = string;

/** Context the host app passes for every question. */
export interface AssistantCtx {
  /** Firebase uid of the asker — executors read ONLY this user's data. */
  uid: string;
  /** UI language code, e.g. 'en' | 'hi' | 'bn' | 'ta' … */
  lang: LangCode;
  /** Optional regional id for regionalTerm() honorifics. */
  region?: string;
  /** Primary role of the asker (drives the RBAC gate). */
  role: Role;
  /** All roles held (sessions are mutually exclusive, but keep the door open). */
  roles?: Role[];
}

/** Machine-readable follow-up the host UI may act on. */
export interface AssistantAction {
  kind: 'navigate' | 'openGuide' | 'openSheet' | 'requestLocation';
  /** Route path, guide id, or sheet id — resolved by the host shell. */
  target: string;
}

export type ResponseType = 'answer' | 'action' | 'clarify' | 'escalate' | 'sos' | 'location_consent';

export interface AssistantResponse {
  type: ResponseType;
  /** Fully rendered, Sanatani-vibed text. Never blank (fallback chain enforced). */
  text: string;
  action?: AssistantAction;
  /** Follow-up chips the UI may render as tappable suggestions. */
  suggestions?: string[];
  /**
   * Structured payload from the executor (e.g. moderation item lists).
   * Optional; UIs that don't understand it ignore it and use `text`.
   */
  data?: Record<string, unknown>;
}

/** What an executor receives. Pure data — no UI handles. */
export interface TaskCtx {
  uid: string;
  lang: LangCode;
  region?: string;
  role: Role;
  /** The raw user input (for slot-free reads). */
  input: string;
  /** Slots captured by the router (e.g. { destination: 'profile' }). */
  slots: Record<string, string>;
}

/** Params handed to the template renderer. String/number for text
 * interpolation; structured values (arrays/objects) for UIs that read
 * `AssistantResponse.data`. Templates must cast before use. */
export interface TaskParams {
  [key: string]: string | number | unknown[] | Record<string, unknown>;
}

/**
 * What an executor returns. `variant` selects a template variant
 * (e.g. 'guide' vs 'clarify'); the renderer falls back to the intent's
 * default variant, then to English — so this can never go blank.
 */
export interface TaskOutcome {
  params: TaskParams;
  variant?: string;
  action?: AssistantAction;
  suggestions?: string[];
}

export type TaskExecutor = (ctx: TaskCtx) => TaskOutcome | Promise<TaskOutcome>;
