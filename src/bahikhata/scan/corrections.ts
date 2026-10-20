/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva Phase 2 — dictionary-constrained repair. Pure.      */
/*                                                                     */
/* The highest-accuracy "AI" in this system is the org's own words:    */
/* villages, gotras, breeds it already uses. When OCR output sits      */
/* within a small edit distance of EXACTLY ONE dictionary entry, we     */
/* PROPOSE the correction (diff-style, one tap) — never apply it, and   */
/* never for people's names: a near-name may be a different person.     */
/*                                                                     */
/* WebLLM clean-up (research §5.3) is deliberately NOT in #34: it was   */
/* designed as a garnish behind the capabilities probe, suggestion-     */
/* only, and layers 1–2 (validators + dictionaries) carry the feature.  */
/* It lands, if ever, as Phase 2.1 behind the same proposal UI.        */
/* ------------------------------------------------------------------ */

import { editDistance } from './cellConfidence';

/** Fields whose values come from a closed vocabulary — the ONLY fields
 *  eligible for dictionary proposals. People names (fullName, name)
 *  are excluded by design and never appear here. */
export const CLOSED_VOCAB_FIELDS: Record<string, string[]> = {
  herd: ['breed'],
  members: ['gotra', 'address'],
  donors: ['gotra', 'address'],
};

export function isClosedVocabField(target: string, field: string): boolean {
  return (CLOSED_VOCAB_FIELDS[target] || []).includes(field);
}

const norm = (s: string) => s.trim().toLowerCase();

export interface CorrectionProposal {
  from: string;
  to: string;
  distance: number;
}

/**
 * Propose a correction for `text` from a closed dictionary.
 * Returns null unless there is a UNIQUE nearest entry within the
 * threshold — ambiguity means a human decides unaided.
 */
export function proposeCorrection(
  text: string,
  dictionary: string[]
): CorrectionProposal | null {
  const t = norm(text || '');
  if (!t || !dictionary.length) return null;
  let best: string | null = null;
  let bestD = Infinity;
  let tied = false;
  for (const entry of dictionary) {
    const e = norm(entry);
    if (!e || e === t) return null; // already exact — nothing to propose
    const d = editDistance(t, e);
    if (d < bestD) { bestD = d; best = entry; tied = false; }
    else if (d === bestD) tied = true;
  }
  if (!best || tied) return null;
  const threshold = Math.max(1, Math.floor(Math.max(t.length, norm(best).length) / 4));
  if (bestD > threshold) return null;
  return { from: text, to: best, distance: bestD };
}

/** A pair the reviewer taught this profile earlier ("last time,
 *  'কসব' was fixed to 'কসবা'") outranks a fresh guess. */
export function learnedProposal(
  text: string,
  learnedPairs: Record<string, string> | undefined
): string | null {
  if (!learnedPairs) return null;
  const hit = learnedPairs[norm(text || '')];
  return hit && norm(hit) !== norm(text) ? hit : null;
}

/** Best available proposal: learned pair first, dictionary second. */
export function bestProposal(
  text: string,
  dictionary: string[],
  learnedPairs?: Record<string, string>
): string | null {
  return learnedProposal(text, learnedPairs)
    ?? proposeCorrection(text, dictionary)?.to
    ?? null;
}
