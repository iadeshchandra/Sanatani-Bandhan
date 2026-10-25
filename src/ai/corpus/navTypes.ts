/**
 * Sanatani Bandhan — AI Assistant Phase 3 · Navigation corpus types
 * =====================================================================
 * A structured map of where things live in the app. Every entry is
 * static data — the matcher reads it, the renderer quotes it, and the
 * deep-link action navigates via react-router. Nothing is generated.
 *
 * Design laws:
 * - Accuracy over coverage: routes must exist in App.tsx / SoloWorkspaceShell.
 * - Concise: 1-2 warm sentences per answer. The deep-link does the rest.
 * - The action is always a real route the app can navigate to today.
 */

export interface NavAnswer {
  en: string;
  hi: string;
  bn: string;
  /** B2-C draft overlays (src/ai/lang/<code>.ts), merged at load in
   *  corpus/navigation.ts. Optional: unauthored → en fallback. */
  ta?: string;
  te?: string;
  mr?: string;
  gu?: string;
  kn?: string;
  ml?: string;
  sa?: string;
}

export interface NavTarget {
  /** Route path, e.g. '/app/profile'. Must exist in the router. */
  route: string;
  /** Optional human-readable section within the page (for the answer text). */
  section?: string;
}

export interface NavigationEntry {
  /** Stable id, e.g. 'nav.giving'. */
  id: string;
  /** Lowercased phrases/keywords in EN/HI/BN (+ transliterations). */
  patterns: string[];
  /** Where to go. */
  target: NavTarget;
  /** 1-2 warm sentences, naming the location. */
  answer: NavAnswer;
  /**
   * CTA label per language. When omitted, the renderer uses a default
   * "Take me there" label. Omit entirely when there is no route
   * (e.g. the SOS button, which is always on screen).
   */
  actionLabel?: NavAnswer;
}

export type NavigationCorpus = NavigationEntry[];
