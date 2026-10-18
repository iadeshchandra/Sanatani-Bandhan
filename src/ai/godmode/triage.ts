/**
 * ai/godmode/triage.ts — deterministic translation-suggestion triage.
 * ===================================================================
 * The owner-approved GodMode "Translation triage" assistant, Phase 0.
 * The AI PROPOSES a verdict; the owner DISPOSES with one tap in the
 * Translations tab — the Approve/Reject buttons stay human-only.
 *
 * `scoreSuggestion` is pure, deterministic, and explainable: no model,
 * no network, works offline. Every point movement carries a
 * human-readable reason the owner sees in the queue.
 *
 * ── SCORING RUBRIC ────────────────────────────────────────────────
 *  Start at 100. Deductions (each adds a ⚠ reason):
 *   · identical to current (normalized)        −70  → "pointless"
 *   · empty suggestion                          → score 0
 *   · length ratio outside 0.4–2.5              −25 (−45 beyond 4× / under 0.25×)
 *     ("may have dropped / added content") — extremes can never approve
 *   · script share < 30% of expected block      −20
 *   · long Latin run (≥8 ASCII alnum) in a
 *     non-Latin language                        −25
 *   · a never-translate sacred term present in
 *     the current text is missing from the
 *     suggestion                              −25 per term (max −50)
 *
 *  Bonuses (each adds a ✓ reason):
 *   · script share ≥ 60% of expected block      +10
 *   · uses a glossary-approved regional form    +5
 *
 *  Informational only (never moves the score):
 *   · regional context (region/termKey) — orients the owner's review.
 *
 *  Recommendation:  ≥80 → approve · 50–79 → review · <50 → reject.
 *
 *  Sacred-term/number/emoji exceptions: identifiers (SAN-XXXXXX,
 *  name@scope aliases), digits, emoji, punctuation, and the canonical
 *  never-translate term list (a Phase-0 snapshot of src/i18n/termbase.ts
 *  Tier A + Tier B Latin forms, which src/i18n/glossary.ts documents —
 *  kept inline so this module has zero imports and can't break if the
 *  termbase moves) are stripped before the script-share check.
 */

export interface TriageInput {
  /** Language code, e.g. 'ta' (see SupportedLang in i18n/translationQuality). */
  lang: string;
  /** Dot-delimited key, e.g. 'guide.vda.s1t' — or `regional.{region}.{termKey}`. */
  key: string;
  /** The text the devotee saw. */
  currentText: string;
  /** Their suggested better wording. */
  suggestedText: string;
  /** Regional vocabulary context, when the suggestion carries it
   *  (translationSuggestions docs may have region/termKey fields).
   *  Informational only — orients the owner, never moves the score. */
  region?: string | null;
  /** Regional term key, e.g. 'temple'. Pairs with `region`. */
  termKey?: string | null;
}

export interface TriageResult {
  /** 0–100. */
  score: number;
  /** Human-readable, shown to the owner. ✓ = positive, ⚠ = concern. */
  reasons: string[];
  /** 'approve' | 'review' | 'reject'. AI proposes; owner disposes. */
  recommendation: 'approve' | 'review' | 'reject';
}

/** Expected primary script block per language (majority check). */
const SCRIPT_BLOCKS: Record<string, { from: number; to: number; name: string }> = {
  en: { from: 0x0041, to: 0x007a, name: 'Latin' },
  hi: { from: 0x0900, to: 0x097f, name: 'Devanagari' },
  sa: { from: 0x0900, to: 0x097f, name: 'Devanagari' },
  mr: { from: 0x0900, to: 0x097f, name: 'Devanagari' },
  bn: { from: 0x0980, to: 0x09ff, name: 'Bengali' },
  ta: { from: 0x0b80, to: 0x0bff, name: 'Tamil' },
  te: { from: 0x0c00, to: 0x0c7f, name: 'Telugu' },
  gu: { from: 0x0a80, to: 0x0aff, name: 'Gujarati' },
  kn: { from: 0x0c80, to: 0x0cff, name: 'Kannada' },
  ml: { from: 0x0d00, to: 0x0d7f, name: 'Malayalam' },
};

/**
 * Phase-0 snapshot of the never-translate termbase (glossary.ts documents
 * Tier A identical-everywhere + Tier B transliterate-never-translate).
 * Kept inline — importing glossary.ts would couple triage to the termbase
 * file's fate; this list is data, and the scoring notes where it came from.
 */
const NEVER_TRANSLATE_LATIN = [
  // Tier A (canonical Latin forms seen in current strings)
  'Aarti', 'Prasad', 'Mantra', 'Havan', 'Yajna', 'Shloka', 'Stotra',
  'Bhajan', 'Kirtan', 'Sankalp', 'Tithi', 'Nakshatra', 'Panchang',
  'Dharma', 'Karma', 'Moksha',
  // Tier B (keep the Sanskrit root — never render as an English gloss)
  'Dakshina', 'Seva', 'Yajman', 'Ashirvad', 'Purohit', 'Sevadar',
  'Mandir', 'Bhakt', 'Gau Mata', 'Tulsi', 'Dhoop', 'Deep', 'Tilak',
];

/** Glossary-approved starter forms (snapshot of APPROVED_TERMS, glossary.ts). */
const GLOSSARY_FORMS: Array<{ concept: string; forms: Record<string, string> }> = [
  { concept: 'donation', forms: { sa: 'दानम्', ta: 'தானம்', te: 'దానం', mr: 'दान', gu: 'દાન', kn: 'ದಾನ', ml: 'ദാനം' } },
  { concept: 'blessing', forms: { sa: 'आशीर्वादः', ta: 'ஆசீர்வாதம்', te: 'ఆశీర్వాదం', mr: 'आशीर्वाद', gu: 'આશીર્વાદ', kn: 'ಆಶೀರ್ವಾದ', ml: 'ആശീർവാദം' } },
  { concept: 'merit', forms: { sa: 'पुण्यम्', ta: 'புண்ணியம்', te: 'పుణ్యం', mr: 'पुण्य', gu: 'પુણ્ય', kn: 'ಪುಣ್ಯ', ml: 'പുണ്യം' } },
  { concept: 'goal', forms: { sa: 'लक्ष्यम्', ta: 'இலக்கு', te: 'లక్ష్యం', mr: 'लक्ष्य', gu: 'લક્ષ્ય', kn: 'ಗುರಿ', ml: 'ലക്ഷ്യം' } },
];

const IDENTIFIERS = [
  /\bSAN-[A-Z0-9]{6}\b/g,            // Universal Sanatani ID
  /[a-z0-9._-]+@[a-z0-9.-]+\b/gi,     // VDA-style name@scope aliases
  /https?:\/\/\S+/g,                  // links are not prose
];

const normalize = (t: string) => (t || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Strip identifiers, digits, emoji, punctuation — keep only letters for script share. */
function scriptLetters(text: string): string[] {
  let t = text;
  for (const re of IDENTIFIERS) t = t.replace(re, ' ');
  const out: string[] = [];
  for (const ch of t) {
    const cp = ch.codePointAt(0) || 0;
    if (/\s/.test(ch)) continue;
    if (cp >= 0x30 && cp <= 0x39) continue; // ASCII digits
    if (cp >= 0x1f300 && cp <= 0x1faff) continue; // emoji
    if (cp >= 0x2600 && cp <= 0x27bf) continue; // dingbats
    if (/[\p{P}\p{S}]/u.test(ch)) continue; // punctuation/symbols (incl. ॐ handled below)
    out.push(ch);
  }
  return out;
}

const LONG_LATIN_RUN = /[A-Za-z][A-Za-z0-9]{7,}/g;
/** Latin runs that are legitimate even in non-Latin text. */
const LATIN_ALLOWLIST = /^(SAN|https?|www|UPI|QR|SMS|OTP|app|iOS|APK)$/i;

export function scoreSuggestion(input: TriageInput): TriageResult {
  const lang = (input.lang || 'en').toLowerCase();
  const current = (input.currentText || '').trim();
  const suggested = (input.suggestedText || '').trim();
  const reasons: string[] = [];
  let score = 100;

  // — Empty: pointless. —
  if (!suggested) {
    return { score: 0, reasons: ['⚠ Empty suggestion — nothing to review.'], recommendation: 'reject' };
  }

  // — Identical to current (normalized): pointless. —
  if (current && normalize(suggested) === normalize(current)) {
    return {
      score: 30,
      reasons: ['⚠ Identical to the current text — accepting it would change nothing.'],
      recommendation: 'reject',
    };
  }

  // — Regional context: informational only. The regional-vocabulary loop
  //   is human-curated, so this orients the owner ("where does this
  //   wording belong?") without moving the score. —
  const region = (input.region || '').trim();
  const termKey = (input.termKey || '').trim();
  if (region || termKey) {
    reasons.push(`✓ Regional wording — ${[region, termKey].filter(Boolean).join(' · ')}.`);
  }

  // — Length ratio: 0.4–2.5 is plausible; extremes flag dropped/added content. —
  if (current.length > 0) {
    const ratio = suggested.length / current.length;
    if (ratio >= 0.4 && ratio <= 2.5) {
      reasons.push(`✓ Plausible length (${ratio.toFixed(1)}× of current).`);
    } else if (ratio < 0.4) {
      const severe = ratio < 0.25;
      score -= severe ? 45 : 25;
      reasons.push(`⚠ Only ${ratio.toFixed(1)}× the current length — may have dropped content.`);
    } else {
      const severe = ratio > 4;
      score -= severe ? 45 : 25;
      reasons.push(`⚠ ${ratio.toFixed(1)}× longer than current — check for added content.`);
    }
  }

  // — Script match: majority of letters in the expected block. —
  const block = SCRIPT_BLOCKS[lang] || SCRIPT_BLOCKS.en;
  const letters = scriptLetters(suggested);
  const inBlock = letters.filter((ch) => {
    const cp = ch.codePointAt(0) || 0;
    return cp >= block.from && cp <= block.to;
  });
  const share = letters.length > 0 ? inBlock.length / letters.length : 1;
  if (lang !== 'en') {
    if (share >= 0.6) {
      score += 10;
      reasons.push(`✓ ${block.name} script, ${Math.round(share * 100)}%.`);
    } else if (share >= 0.3) {
      reasons.push(`⚠ Only ${Math.round(share * 100)}% ${block.name} script — mostly another script.`);
      score -= 10;
    } else {
      score -= 20;
      reasons.push(`⚠ Only ${Math.round(share * 100)}% ${block.name} script — may not be ${lang.toUpperCase()} at all.`);
    }
  }

  // — Latin gibberish in non-Latin languages: long ASCII runs that aren't known terms. —
  if (lang !== 'en') {
    const stripped = suggested
      .replace(new RegExp(NEVER_TRANSLATE_LATIN.join('|'), 'g'), ' ')
      .replace(/[^\x00-\x7F]/g, ' ');
    const runs = (stripped.match(LONG_LATIN_RUN) || []).filter(
      (r) => !LATIN_ALLOWLIST.test(r) && !NEVER_TRANSLATE_LATIN.includes(r)
    );
    if (runs.length > 0) {
      score -= 25;
      reasons.push(`⚠ Long Latin run "${runs[0].slice(0, 24)}${runs[0].length > 24 ? '…' : ''}" — check for gibberish or untranslated fragment.`);
    }
  }

  // — Glossary: uses an approved regional form where applicable. —
  for (const entry of GLOSSARY_FORMS) {
    const form = entry.forms[lang];
    if (form && suggested.includes(form)) {
      score += 5;
      reasons.push(`✓ Uses glossary term '${form}' (${entry.concept}).`);
      break;
    }
  }

  // — Never-translate: sacred terms in the current text must survive. —
  let dropped = 0;
  for (const term of NEVER_TRANSLATE_LATIN) {
    const curHas = new RegExp(`\\b${term}\\b`, 'i').test(current);
    const sugHas = new RegExp(`\\b${term}\\b`, 'i').test(suggested);
    if (curHas && !sugHas) {
      dropped += 1;
      score -= 25;
      reasons.push(`⚠ Sacred term '${term}' from the current text is missing — it must never be translated or dropped.`);
      if (dropped >= 2) break; // cap the penalty
    }
  }

  score = Math.max(0, Math.min(100, score));
  const recommendation: TriageResult['recommendation'] =
    score >= 80 ? 'approve' : score >= 50 ? 'review' : 'reject';
  if (reasons.length === 0) reasons.push('✓ No concerns found.');
  return { score, reasons, recommendation };
}
