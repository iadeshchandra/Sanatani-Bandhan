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
  | 'auditor'
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
  | 'org_giving'
  | 'org_expenses'
  | 'org_pending_approvals'
  | 'priest_schedule'
  | 'record_donation'
  | 'record_expense'
  | 'draft_notice'
  | 'org_locator'
  | 'admin_briefing'
  | 'admin_stats'
  | 'admin_moderation_help'
  | 'admin_anomaly'
  | 'admin_draft'
  | 'admin_terms'
  | 'admin_history'
  | 'admin_simulate'
  | 'admin_draft_change'
  | 'admin_advise'
  | 'admin_growth';

/**
 * Languages the assistant template system admits. en/hi/bn are fully
 * authored inline in templates.ts; ta/te/mr/gu/kn/ml/sa are AI-authored
 * DRAFT overlays in src/ai/lang/<code>.ts (Language Sweep B2-C), merged
 * at module load. A language with no authored variant for a template
 * falls back to English — never blank, never a wrong-language render.
 */
export type TemplateLang =
  | 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml' | 'sa';

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
  /**
   * Blueprint C — the caller-scoped org context (ai/org/port.ts).
   * Present ONLY in org sessions; built by the host from the real
   * membership edge. Org executors fail closed without it, and the
   * port inside it can serve only the one workspace it was built
   * for — the role/scope it carries come from the session, never
   * from user text.
   */
  org?: import('./org/port').OrgAssistantContext;
}

/** Machine-readable follow-up the host UI may act on. */
export interface AssistantAction {
  kind: 'navigate' | 'openGuide' | 'openSheet' | 'requestLocation' | 'openDesk';
  /** Route path, guide id, sheet id — or, for 'openDesk', a catalog
   *  desk id the host shell switches to via its desk-routing event
   *  ('sanatani:navigate'). Desk ids are NOT routes. */
  target: string;
  /** Optional CTA label (the sheet falls back to a per-kind default). */
  label?: string;
}

export type ResponseType = 'answer' | 'action' | 'clarify' | 'escalate' | 'sos' | 'location_consent' | 'draft';

export interface AssistantResponse {
  type: ResponseType;
  /** Fully rendered, Sanatani-vibed text. Never blank (fallback chain enforced). */
  text: string;
  /**
   * Blueprint C — a DRAFT produced by a write intent (type 'draft').
   * The draft is inert data: nothing is committed until the host's
   * preview card gets an Approve tap and calls commitDraft.ts.
   */
  draft?: import('./org/drafts').CopilotDraft;
  action?: AssistantAction;
  /** Follow-up chips the UI may render as tappable suggestions. */
  suggestions?: string[];
  /**
   * Structured payload from the executor (e.g. moderation item lists).
   * Optional; UIs that don't understand it ignore it and use `text`.
   */
  data?: Record<string, unknown>;
  /**
   * QUEUED #36 — answer provenance (owner surface only). Forwarded from
   * the executor ONLY when the asker is the owner; stripped for every
   * other role so non-owner answers gain no new content.
   */
  sources?: AnswerSource[];
  /**
   * QUEUED #36 — self-verification outcome for this answer (owner only).
   * 'verified' = every cited figure re-checked against the raw values;
   * 'auto-corrected' = a mismatch was found and the displayed text was
   * replaced with the computed figures.
   */
  verification?: VerificationMeta;
}

/* ------------------------------------------------------------------ */
/* QUEUED #36 — accuracy hardening: provenance + figure verification   */
/* ------------------------------------------------------------------ */

/** Where one group of figures in an answer came from, and when it was read. */
export interface AnswerSource {
  /** e.g. 'plans/standard', 'platformConfig/commission', 'audit_logs (terms history)', 'collection sangamPosts'. */
  label: string;
  /** Epoch ms when the underlying read happened (cache read time counts — honesty). */
  readAt: number;
  /** true = live read; false = code-defaults snapshot (live config unreadable). */
  live: boolean;
}

/**
 * One figure an executor cites in its answer. `rendered` is the EXACT
 * string the figure must appear as in the final text — the pipeline
 * verifier re-checks every claim after rendering (and after any voice
 * rephrase) and auto-corrects the answer if one is missing or altered.
 */
export interface FigureClaim {
  /** Stable id, e.g. 'standard.priceMonthlyBDT'. */
  id: string;
  /** Human label for the auto-corrected fallback rendering. */
  label: string;
  /** The raw computed value. */
  value: number;
  /** Exact string the value is rendered as in the answer text. */
  rendered: string;
}

/** Dev-visible verification metadata (owner surface only). */
export interface VerificationMeta {
  status: 'verified' | 'auto-corrected';
  /** How many cited figures were re-checked. */
  figures: number;
  /** Claim ids that failed the re-check (present when auto-corrected). */
  mismatches?: string[];
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
  /** Blueprint C — caller-scoped org context (see AssistantCtx.org). */
  org?: import('./org/port').OrgAssistantContext;
}

/** Params handed to the template renderer. String/number for text
 * interpolation; structured values (arrays/objects) for UIs that read
 * `AssistantResponse.data`. Templates must cast before use. */
export interface TaskParams {
  [key: string]: string | number | unknown[] | Record<string, unknown>;
}

/** Render context handed to every template function: the asker's
 * language/region plus regionalTerm() for culturally-loaded words. */
export interface TemplateCtx {
  lang: LangCode;
  region: string;
  term: (key: string) => string;
}

/** One authored template renderer (templates.ts + src/ai/lang overlays). */
export type TemplateFn = (p: TaskParams, c: TemplateCtx) => string;

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
  /**
   * QUEUED #36 — provenance for factual answers (see AnswerSource).
   * Copilot executors set this on every answer that cites figures.
   * The pipeline forwards it to the response for the owner only.
   */
  sources?: AnswerSource[];
  /**
   * QUEUED #36 — the figures this answer cites (see FigureClaim). The
   * pipeline re-verifies them against the final rendered text; a
   * mismatch auto-corrects the answer to the computed values.
   */
  claims?: FigureClaim[];
  /**
   * QUEUED #36 — when true, verification ALSO rejects any numeric
   * token in the final text that no claim or declared extra explains.
   * Only for fully formatter-controlled answers (admin_simulate).
   */
  strictNumbers?: boolean;
  /** Numeric values allowed in the text beyond the claims (strict mode). */
  extraNumbers?: number[];
  /**
   * Blueprint C — a draft produced by a write intent. The pipeline
   * turns the response into type 'draft'; the host renders the
   * preview card. Executors that set this have committed NOTHING.
   */
  draft?: import('./org/drafts').CopilotDraft;
}

export type TaskExecutor = (ctx: TaskCtx) => TaskOutcome | Promise<TaskOutcome>;
