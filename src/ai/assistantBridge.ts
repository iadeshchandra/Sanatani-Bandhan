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

export type AssistantActionKind = 'navigate' | 'openGuide' | 'openSheet' | 'requestLocation';

export interface AssistantAction {
  kind: AssistantActionKind;
  /** Route path, guide id, or sheet id — interpreted by the UI per kind. */
  target: string;
  /** Optional button label override. */
  label?: string;
}

export type AssistantResponseType = 'answer' | 'action' | 'clarify' | 'escalate' | 'sos' | 'location_consent';

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

/**
 * The core's module specifier — kept in one place for the loader below. */
import { ask as coreAsk } from './assistant';

/**
 * Loads the assistant core. Previously a `@vite-ignore` dynamic import so the
 * build stayed green before the core landed. The core has long since landed
 * at `src/ai/assistant.ts`, and the dynamic import can never resolve at
 * runtime (Vite bundles everything — there is no separate `../ai/assistant`
 * URL to fetch). So we import statically now; the standby remains as a
 * fail-safe if the core ever throws.
 */
function loadCoreAsk(): Promise<AskFn | null> {
  return Promise.resolve(coreAsk as AskFn);
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
