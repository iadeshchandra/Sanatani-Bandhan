/**
 * Sanatani Bandhan — AI Assistant Phase 2 · Corpus index
 * =====================================================================
 * Combines all topic corpora into one registry. The matcher (dharma.ts)
 * reads from here; nothing else imports the topic files directly.
 */
import type { DharmaAnswer, DharmaCorpus, DharmaEntry } from './types';
import { DRAFT_LANGS, dharmaOverlay } from '../lang/shared';
import { TITHI_CORPUS } from './tithi';
import { FESTIVAL_CORPUS } from './festivals';
import { PRACTICE_CORPUS } from './practice';
import { SAMSKARA_CORPUS } from './samskaras';
import { CONCEPT_CORPUS } from './concepts';
import { ETIQUETTE_CORPUS } from './etiquette';

export type { DharmaCorpus, DharmaEntry };

/** All entries in deterministic order (topic files, then entry order). */
export const DHARMA_CORPUS: DharmaCorpus = [
  ...TITHI_CORPUS,
  ...FESTIVAL_CORPUS,
  ...PRACTICE_CORPUS,
  ...SAMSKARA_CORPUS,
  ...CONCEPT_CORPUS,
  ...ETIQUETTE_CORPUS,
];

/* B2-C: merge the 7 draft-language overlays (answers + question
 * patterns) into the corpus once at load. The topic files stay the
 * en/hi/bn source of truth; overlay content lives in src/ai/lang/. */
for (const e of DHARMA_CORPUS) {
  for (const l of DRAFT_LANGS) {
    const o = dharmaOverlay(l, e.id);
    if (!o) continue;
    if (o.answer) (e.answer as DharmaAnswer & Record<string, string>)[l] = o.answer;
    if (Array.isArray(o.patterns) && o.patterns.length) {
      e.question_patterns.push(...o.patterns);
    }
  }
}

/** Fast lookup by id. Built once at module load. */
export const DHARMA_BY_ID: Map<string, DharmaEntry> = new Map(
  DHARMA_CORPUS.map((e) => [e.id, e])
);

/** Entry count by topic — for tests and diagnostics. */
export function corpusStats(): Record<string, number> {
  const stats: Record<string, number> = { total: DHARMA_CORPUS.length };
  for (const e of DHARMA_CORPUS) {
    stats[e.topic] = (stats[e.topic] || 0) + 1;
  }
  return stats;
}
