/**
 * Sanatani Bandhan — AI Assistant Phase 3 · Navigation corpus matcher
 * =====================================================================
 * Deterministic keyword/phrase matcher over the navigation corpus.
 *
 * Design laws (same as dharma.ts):
 * - NEVER invent: returns an entry only when confidence clears the bar;
 *   otherwise null (the caller falls through to other intents).
 * - Pure function: no I/O, no randomness, fully testable.
 * - Multilingual: patterns carry EN/HI/BN (+ transliterations).
 */

import type { NavigationEntry } from './corpus/navTypes';
import { NAVIGATION_CORPUS } from './corpus/navigation';

export type NavigationConfidence = 'high' | 'medium' | 'low' | 'none';

export interface NavigationMatch {
  entry: NavigationEntry;
  confidence: NavigationConfidence;
  /** Matched pattern strings, for debuggability. */
  evidence: string[];
}

/** Minimum evidence to answer at all. Below this → no match, fall through. */
const MIN_SCORE = 2;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalise(input: string): string {
  return (input || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Score one entry against the input.
 * - Exact multi-word phrase hit: +4 per phrase (strong signal)
 * - Single keyword hit: +1 per keyword
 * Word boundaries are Unicode-aware so Devanagari/Bengali match cleanly.
 */
function scoreEntry(entry: NavigationEntry, text: string): { score: number; evidence: string[] } {
  let score = 0;
  const evidence: string[] = [];
  const seen = new Set<string>();
  for (const raw of entry.patterns) {
    const pat = raw.toLowerCase().trim();
    if (!pat || seen.has(pat)) continue;
    seen.add(pat);
    const re = new RegExp(`(?<!\\p{L})${escapeRegExp(pat)}(?!\\p{L})`, 'u');
    if (re.test(text)) {
      const isPhrase = pat.includes(' ');
      score += isPhrase ? 4 : 1;
      evidence.push(raw);
    }
  }
  return { score, evidence };
}

function confidenceFor(score: number): NavigationConfidence {
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  if (score >= MIN_SCORE) return 'low';
  return 'none';
}

/**
 * Find the best navigation entry for the input. Returns null when nothing
 * clears the bar — the caller must fall through to other routing.
 */
export function matchNavigation(input: string): NavigationMatch | null {
  const text = normalise(input);
  if (!text) return null;

  let best: NavigationEntry | null = null;
  let bestScore = 0;
  let bestEvidence: string[] = [];

  for (const entry of NAVIGATION_CORPUS) {
    const { score, evidence } = scoreEntry(entry, text);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
      bestEvidence = evidence;
    }
  }

  const confidence = confidenceFor(bestScore);
  if (!best || confidence === 'none') return null;

  return { entry: best, confidence, evidence: bestEvidence };
}

/**
 * True when the match is strong enough to answer directly with a
 * deep-link. 'low' confidence → fall through rather than risk a wrong
 * destination.
 */
export function isNavigable(match: NavigationMatch | null): boolean {
  if (!match) return false;
  return match.confidence === 'high' || match.confidence === 'medium';
}

/**
 * Interrogative signals that the devotee is asking WHERE something is
 * (vs. HOW to do something). EN/HI/BN + common transliterations.
 */
const WHERE_PATTERNS = [
  'where is', "where's", 'where are', 'where can i find', 'where do i find',
  'how do i find', 'how to find', 'find the', 'locate',
  'কোথায়', 'কোথায়', 'kothay', 'kothai', 'kotay',
  'कहाँ', 'कहां', 'kahan', 'kahaan', 'kidhar', 'किधर',
];

export function isWhereQuestion(input: string): boolean {
  const text = normalise(input);
  if (!text) return false;
  return WHERE_PATTERNS.some((p) => {
    const re = new RegExp(`(?<!\\p{L})${escapeRegExp(p)}(?!\\p{L})`, 'u');
    return re.test(text);
  });
}

/** Resolve a navigation id to its entry (for tests / deep links). */
export function getNavigationEntry(id: string): NavigationEntry | undefined {
  return NAVIGATION_CORPUS.find((e) => e.id === id);
}

/** Corpus size — for tests and diagnostics. */
export function navigationCorpusSize(): number {
  return NAVIGATION_CORPUS.length;
}
