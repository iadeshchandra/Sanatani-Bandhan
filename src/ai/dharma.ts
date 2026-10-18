/**
 * Sanatani Bandhan — AI Assistant Phase 2 · Dharma corpus matcher
 * =====================================================================
 * Deterministic keyword/phrase matcher over the restricted corpus.
 *
 * Design laws:
 * - NEVER invent: returns an entry only when confidence clears the bar;
 *   otherwise null (the caller escalates to a human purohit).
 * - Pure function: no I/O, no randomness, fully testable.
 * - Multilingual: patterns carry EN/HI/BN (+ transliterations); matching
 *   is on the normalised input regardless of the UI language.
 */

import type { DharmaEntry } from './corpus/types';
import { DHARMA_BY_ID, DHARMA_CORPUS } from './corpus/index';

export type DharmaConfidence = 'high' | 'medium' | 'low' | 'none';

export interface DharmaMatch {
  entry: DharmaEntry;
  confidence: DharmaConfidence;
  /** Matched pattern strings, for debuggability. */
  evidence: string[];
  /** Related entries (resolved) for "you may also ask" chips. */
  related: DharmaEntry[];
}

/** Minimum evidence to answer at all. Below this → escalate, never guess. */
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
function scoreEntry(entry: DharmaEntry, text: string): { score: number; evidence: string[] } {
  let score = 0;
  const evidence: string[] = [];
  const seen = new Set<string>();
  for (const raw of entry.question_patterns) {
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

function confidenceFor(score: number): DharmaConfidence {
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  if (score >= MIN_SCORE) return 'low';
  return 'none';
}

/**
 * Find the best corpus entry for the input. Returns null when nothing
 * clears the bar — the caller must escalate, never improvise.
 */
export function matchDharma(input: string): DharmaMatch | null {
  const text = normalise(input);
  if (!text) return null;

  let best: DharmaEntry | null = null;
  let bestScore = 0;
  let bestEvidence: string[] = [];

  for (const entry of DHARMA_CORPUS) {
    const { score, evidence } = scoreEntry(entry, text);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
      bestEvidence = evidence;
    }
  }

  const confidence = confidenceFor(bestScore);
  if (!best || confidence === 'none') return null;

  const related: DharmaEntry[] = [];
  for (const rid of best.related) {
    const r = DHARMA_BY_ID.get(rid);
    if (r && r.id !== best.id) related.push(r);
  }

  return { entry: best, confidence, evidence: bestEvidence, related: related.slice(0, 3) };
}

/**
 * True when the match is strong enough to answer directly.
 * 'low' confidence → escalate warmly rather than risk inaccuracy.
 */
export function isAnswerable(match: DharmaMatch | null): boolean {
  if (!match) return false;
  if (match.entry.purohit_escalation) return false;
  return match.confidence === 'high' || match.confidence === 'medium';
}

/** Resolve a corpus id to its entry (for tests / deep links). */
export function getDharmaEntry(id: string): DharmaEntry | undefined {
  return DHARMA_BY_ID.get(id);
}
