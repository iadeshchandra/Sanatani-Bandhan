/**
 * ai/assistantBridge.ts — Phase 0 devotee-UI ↔ assistant-core bridge.
 * =====================================================================
 * The assistant CORE (deterministic intent → executor → renderer) is owned
 * by a sibling worker and will land at `src/ai/assistant.ts` exporting:
 *
 *   ask(input, ctx) → Promise<AssistantResponse>
 *   ctx: { uid, lang, region, role }
 *
 * This file is the CONTRACT the devotee UI codes against. `ask` below first
 * tries to load the real core dynamically (so the UI lights up with zero
 * further edits the moment the sibling's file lands); until then it serves
 * a warm, honest standby that NEVER invents facts.
 *
 * RECONCILIATION NOTE (for the parent orchestrator): when `src/ai/assistant.ts`
 * lands, no UI change is required — the dynamic loader picks it up. If the
 * core's exported shapes differ from the types below, update THIS file to
 * re-export the core's types; the UI components only ever import from here.
 */

export type AssistantActionKind = 'navigate' | 'openGuide' | 'openSheet';

export interface AssistantAction {
  kind: AssistantActionKind;
  /** Route path, guide id, or sheet id — interpreted by the UI per kind. */
  target: string;
  /** Optional button label override. */
  label?: string;
}

export type AssistantResponseType = 'answer' | 'action' | 'clarify' | 'escalate' | 'sos';

export interface AssistantResponse {
  type: AssistantResponseType;
  /** Renderer-only text — the core never invents facts; the UI never does either. */
  text: string;
  action?: AssistantAction;
  /** Follow-up chips rendered under the message. */
  suggestions?: string[];
}

export interface AssistantContext {
  uid: string;
  lang: string;
  region: string;
  role: string | null;
}

export type AskFn = (input: string, ctx: AssistantContext) => Promise<AssistantResponse>;

/** The core's module specifier — kept in one place for the loader below. */
const CORE_SPEC = '../ai/assistant';

let coreAskPromise: Promise<AskFn | null> | null = null;

/**
 * Loads the sibling worker's core if it has landed. The `@vite-ignore`
 * comment keeps this a true runtime import: Vite does NOT try to resolve
 * the specifier at build time, so the build stays green whether or not
 * `src/ai/assistant.ts` exists yet. At runtime a missing module simply
 * rejects, and we fall back to the standby.
 */
function loadCoreAsk(): Promise<AskFn | null> {
  if (!coreAskPromise) {
    coreAskPromise = (async (): Promise<AskFn | null> => {
      try {
        const spec: string = CORE_SPEC;
        const mod = (await import(/* @vite-ignore */ spec)) as { ask?: unknown };
        return typeof mod?.ask === 'function' ? (mod.ask as AskFn) : null;
      } catch {
        return null;
      }
    })();
  }
  return coreAskPromise;
}

const standbyText = (lang: string): string => {
  if (lang === 'bn')
    return '🙏 আমি এখনও আমার প্রথম শ্লোকগুলো শিখছি — পূর্ণ সহকারী আসছে। ততক্ষণে, প্রতিটি স্ক্রিনের গাইডগুলো আপনাকে সঠিক পথ দেখাতে পারে।';
  if (lang === 'hi')
    return '🙏 मैं अभी अपने पहले श्लोक सीख रहा हूँ — पूर्ण सहायक आ रहा है। तब तक, हर स्क्रीन पर दिए गए मार्गदर्शक आपको सही दिशा दिखा सकते हैं।';
  return '🙏 I am still learning my first verses — the full assistant is on its way. Until then, the guides on each screen can point you the right way.';
};

/**
 * Warm standby used only until the core lands. It answers nothing factual —
 * inventing answers is forbidden by the Phase 0 design laws — and simply
 * bows out gracefully.
 */
const standbyAsk: AskFn = async (_input, ctx) => ({
  type: 'answer',
  text: standbyText(ctx.lang),
});

/**
 * The UI's single entry point to the assistant. Prefers the real core;
 * falls back to the honest standby.
 */
export const ask: AskFn = async (input, ctx) => {
  const core = await loadCoreAsk();
  if (core) return core(input, ctx);
  return standbyAsk(input, ctx);
};
