/**
 * Sanatani Bandhan — AI Assistant Phase 0 · crisis keyword lists
 * =====================================================================
 * DATA SOURCE: curated by the product team, bundled with the app.
 * OFFLINE STORY: fully offline — plain string lists, no network, no model.
 *
 * Design law: ANY match routes to `{ type: 'sos' }` immediately, with no
 * chit-chat and no attempt to answer the original question first. Bare
 * "sos" is intentionally NOT a crisis keyword — it routes to the `sos_help`
 * intent, which explains the SOS flow and still offers the SOS button first.
 * Extend these lists later via the translation pipeline (per-language
 * keyword packs reviewed by native speakers in GodMode → Translations).
 */

export type CrisisLang = 'en' | 'hi' | 'bn';

export const CRISIS_KEYWORDS: Record<CrisisLang, string[]> = {
  en: [
    'help me',
    'emergency',
    'suicide',
    'kill myself',
    'i want to die',
    'i wanna die',
    'end my life',
    'hurt myself',
    'harming myself',
    'attack',
    'attacked',
    'unsafe',
    "i'm not safe",
    'i am not safe',
    'save me',
    'in danger',
    'being harassed',
    'threatened',
  ],
  hi: [
    'बचाओ',
    'मुझे बचाओ',
    'मदद करो',
    'मदद चाहिए',
    'आपातकाल',
    'आपातकालीन',
    'आत्महत्या',
    'मरना चाहता',
    'मरना चाहती',
    'मर जाऊं',
    'हमला',
    'खतरे में',
    'सुरक्षित नहीं',
    'बचा लो',
  ],
  bn: [
    'বাঁচান',
    'আমাকে বাঁচান',
    'বাঁচান আমাকে',
    'সাহায্য করুন',
    'সাহায্য চাই',
    'জরুরি',
    'জরুরী',
    'আত্মহত্যা',
    'মরতে চাই',
    'মরে যাব',
    'আক্রমণ',
    'বিপদে',
    'নিরাপদ নই',
    'বাঁচাও',
  ],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Word-boundary-aware match (Unicode-aware, so Devanagari/Bengali
 * conjuncts are respected). Returns the matched keyword and language,
 * or null when the input is crisis-free.
 */
export function detectCrisis(input: string): { keyword: string; lang: CrisisLang } | null {
  const text = (input || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const langs: CrisisLang[] = ['en', 'hi', 'bn'];
  for (const lang of langs) {
    for (const kw of CRISIS_KEYWORDS[lang]) {
      const re = new RegExp(`(?<!\\p{L})${escapeRegExp(kw.toLowerCase())}(?!\\p{L})`, 'u');
      if (re.test(text)) return { keyword: kw, lang };
    }
  }
  return null;
}

/** Total crisis keywords across all languages (for reporting/QA). */
export function crisisKeywordCount(): Record<CrisisLang, number> {
  return {
    en: CRISIS_KEYWORDS.en.length,
    hi: CRISIS_KEYWORDS.hi.length,
    bn: CRISIS_KEYWORDS.bn.length,
  };
}
