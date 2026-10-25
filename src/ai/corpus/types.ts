/**
 * Sanatani Bandhan — AI Assistant Phase 2 · Dharma corpus types
 * =====================================================================
 * A restricted, curated knowledge base. Every entry is static data —
 * the matcher reads it, the renderer quotes it. Nothing is generated.
 *
 * Design laws:
 * - Accuracy over coverage: when in doubt, mark purohit_escalation.
 * - Non-sectarian: pan-Sanatani framing; regional variants noted, not ranked.
 * - Concise: 2-4 sentences per answer. Warmth in every line.
 */

export interface DharmaAnswer {
  en: string;
  hi: string;
  bn: string;
  /** B2-C draft overlays (src/ai/lang/<code>.ts), merged at load in
   *  corpus/index.ts. Optional: an unauthored language falls back to en. */
  ta?: string;
  te?: string;
  mr?: string;
  gu?: string;
  kn?: string;
  ml?: string;
  sa?: string;
}

export interface DharmaEntry {
  /** Stable id, e.g. 'tithi.ekadashi'. */
  id: string;
  /** Broad topic bucket for grouping related entries. */
  topic: 'tithi' | 'festival' | 'practice' | 'samskara' | 'concept' | 'etiquette';
  /** Lowercased phrases/keywords in EN/HI/BN (+ transliterations) that trigger this entry. */
  question_patterns: string[];
  answer: DharmaAnswer;
  /** Ids of related entries for "you may also ask" suggestions. */
  related: string[];
  /** True → answer is sensitive/personal enough to route to a human purohit. */
  purohit_escalation: boolean;
}

export type DharmaCorpus = DharmaEntry[];
