/**
 * i18n/regionalTerms.ts — regional vocabulary layer.
 * ===================================================
 * Language + region decides wording. A devotee in Madurai sees கோவில்,
 * தீபாவளி, அர்ச்சகர் — never a northern word wearing Tamil script.
 * A devotee in Dhaka feels Bengali home.
 *
 * Design rules:
 *  1. The user's own choice always outranks detection (enforced by callers).
 *  2. Pan-Sanatani terms NEVER vary — PAN_SANATANI_TERMS is the invariant,
 *     guarded by a jest test. Sacred things don't localize; community
 *     things do.
 *  3. Resolution never blanks: (region,lang) → lang default → (region,en)
 *     → en → key. The (region,en) step is the "English UI in this region"
 *     case (kovil, not temple) — it never overrides a native script.
 *     Unknown keys are logged, never shown raw.
 *  4. Every starter variant is curated-but-unreviewed: hi/bn/en are
 *     high-confidence; sa/ta/te/mr/gu/kn/ml ship as DRAFT in the quality
 *     system so the "🙏 Help us say this better" loop can correct them.
 *     The draft loop is the safety net, not the author's confidence.
 */

import type { SupportedLang } from './translationQuality';

/* ------------------------------------------------------------------ */
/* Region taxonomy                                                      */
/* ------------------------------------------------------------------ */

export type RegionId =
  | 'tamil-nadu'
  | 'karnataka'
  | 'andhra-telangana'
  | 'kerala'
  | 'maharashtra'
  | 'gujarat'
  | 'west-bengal'
  | 'bangladesh'
  | 'hindi-belt'
  | 'punjab'
  | 'odisha'
  | 'assam'
  | 'northeast'
  | 'global-diaspora'
  | 'other';

export interface RegionInfo {
  id: RegionId;
  /** Warm display label. */
  label: string;
  /** Default language for this region. */
  lang: SupportedLang;
  /** Native-feel blurb for the settings UI: "so we can use the words your community uses." */
  blurb: string;
}

export const REGIONS: Record<RegionId, RegionInfo> = {
  'tamil-nadu':      { id: 'tamil-nadu',      label: 'Tamil Nadu',       lang: 'ta', blurb: 'கோவில் · தீபாவளி · வணக்கம்' },
  'karnataka':       { id: 'karnataka',       label: 'Karnataka',        lang: 'kn', blurb: 'ದೇವಸ್ಥಾನ · ದೀಪಾವಳಿ · ನಮಸ್ಕಾರ' },
  'andhra-telangana':{ id: 'andhra-telangana',label: 'Andhra / Telangana', lang: 'te', blurb: 'దేవస్థానం · దీపావళి · నమస్కారం' },
  'kerala':          { id: 'kerala',          label: 'Kerala',           lang: 'ml', blurb: 'ക്ഷേത്രം · ദീപാവലി · നമസ്കാരം' },
  'maharashtra':     { id: 'maharashtra',     label: 'Maharashtra',      lang: 'mr', blurb: 'मंदिर · दिवाळी · नमस्कार' },
  'gujarat':         { id: 'gujarat',         label: 'Gujarat',          lang: 'gu', blurb: 'મંદિર · દિવાળી · નમસ્તે' },
  'west-bengal':     { id: 'west-bengal',     label: 'West Bengal',      lang: 'bn', blurb: 'মন্দির · দীপাবলি · নমস্কার' },
  'bangladesh':      { id: 'bangladesh',      label: 'Bangladesh',       lang: 'bn', blurb: 'মন্দির · দীপাবলি · নমস্কার' },
  'hindi-belt':      { id: 'hindi-belt',      label: 'Hindi belt',       lang: 'hi', blurb: 'मंदिर · दिवाली · नमस्ते' },
  'punjab':          { id: 'punjab',          label: 'Punjab',           lang: 'hi', blurb: 'मंदिर · दिवाली · नमस्ते' },
  'odisha':          { id: 'odisha',          label: 'Odisha',           lang: 'hi', blurb: 'मंदिर · दिवाली · नमस्ते' },
  'assam':           { id: 'assam',           label: 'Assam',            lang: 'bn', blurb: 'মন্দির · দীপাবলি · নমস্কার' },
  'northeast':       { id: 'northeast',       label: 'Northeast',        lang: 'en', blurb: 'temple · Diwali · hello' },
  'global-diaspora': { id: 'global-diaspora', label: 'Global diaspora',  lang: 'en', blurb: 'your language, your words' },
  'other':           { id: 'other',           label: 'Other',            lang: 'en', blurb: 'temple · Diwali · hello' },
};

export const REGION_IDS = Object.keys(REGIONS) as RegionId[];

export function isRegionId(v: string): v is RegionId {
  return (REGION_IDS as string[]).includes(v);
}

/* ------------------------------------------------------------------ */
/* Pan-Sanatani invariant — these NEVER vary by region or language.     */
/* ------------------------------------------------------------------ */

/**
 * Sacred things don't localize. If a key is here, regionalTerm() returns
 * the canonical form for every (lang, region) — guarded by jest.
 */
export const PAN_SANATANI_TERMS: Record<string, string> = {
  prasad: 'prasad',
  mantra: 'mantra',
  shloka: 'shloka',
  stotra: 'stotra',
  bhajan: 'bhajan',
  kirtan: 'kirtan',
  aarti: 'aarti',
  dharma: 'dharma',
  karma: 'karma',
  punya: 'punya',
  seva: 'seva',
  tithi: 'tithi',
  panchang: 'panchang',
  havan: 'havan',
  yajna: 'yajna',
};

export function isPanSanataniTerm(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(PAN_SANATANI_TERMS, key);
}

/* ------------------------------------------------------------------ */
/* Regional term table                                                  */
/* ------------------------------------------------------------------ */

export interface RegionalTermDef {
  /** Term key, e.g. 'temple'. */
  key: string;
  /** English reference. */
  en: string;
  /** Why this term varies — reviewer guidance. */
  note: string;
  /** 'high' = certain; 'medium' = curated, wants a native check. */
  confidence: 'high' | 'medium';
  /**
   * True regional divergences, keyed region → lang → text. Sparse by
   * design: empty means "inherit the language default". The headline
   * use is the `en` transliteration per region — an English-UI devotee
   * in Tamil Nadu reads "kovil", not "temple".
   */
  variants: Partial<Record<RegionId, Partial<Record<SupportedLang, string>>>>;
  /** The language's natural word when the region has no variant. */
  defaults: Record<SupportedLang, string>;
}

/**
 * Starter table — 10 high-visibility community terms. Curated with care;
 * every non-en/hi/bn rendering ships as DRAFT in the quality system.
 */
export const REGIONAL_TERMS: Record<string, RegionalTermDef> = {
  temple: {
    key: 'temple',
    en: 'temple',
    note: 'A Tamil devotee\'s temple is a kovil; calling it "mandir" in Tamil script still feels northern.',
    confidence: 'high',
    variants: {
      'tamil-nadu': { en: 'kovil' },
      'karnataka': { en: 'devasthana' },
      'andhra-telangana': { en: 'devasthanam' },
      'kerala': { en: 'kshetram' },
    },
    defaults: {
      en: 'temple', hi: 'मंदिर', bn: 'মন্দির', sa: 'मन्दिरम्',
      ta: 'கோவில்', te: 'దేవస్థానం', mr: 'मंदिर', gu: 'મંદિર',
      kn: 'ದೇವಸ್ಥಾನ', ml: 'ക്ഷേത്രം',
    },
  },
  priest: {
    key: 'priest',
    en: 'priest',
    note: 'The temple priest\'s title is deeply regional: archakar (TN), shanti (Kerala), pujari/purohit (north).',
    confidence: 'high',
    variants: {
      'tamil-nadu': { en: 'archakar' },
      'kerala': { en: 'shanti' },
      'karnataka': { en: 'archak' },
      'andhra-telangana': { en: 'archakudu' },
    },
    defaults: {
      en: 'priest', hi: 'पुजारी', bn: 'পুরোহিত', sa: 'अर्चकः',
      ta: 'அர்ச்சகர்', te: 'అర్చకుడు', mr: 'पुजारी', gu: 'પૂજારી',
      kn: 'ಅರ್ಚಕ', ml: 'ശാന്തി',
    },
  },
  festivalOfLights: {
    key: 'festivalOfLights',
    en: 'Diwali',
    note: 'Deepavali in the south, Diwali in the north/west. Using the wrong one in season feels alien.',
    confidence: 'high',
    variants: {
      'tamil-nadu': { en: 'Deepavali' },
      'karnataka': { en: 'Deepavali' },
      'andhra-telangana': { en: 'Deepavali' },
      'kerala': { en: 'Deepavali' },
    },
    defaults: {
      en: 'Diwali', hi: 'दिवाली', bn: 'দীপাবলি', sa: 'दीपावलिः',
      ta: 'தீபாவளி', te: 'దీపావళి', mr: 'दिवाळी', gu: 'દિવાળી',
      kn: 'ದೀಪಾವಳಿ', ml: 'ദീപാവലി',
    },
  },
  offering: {
    key: 'offering',
    en: 'offering',
    note: 'Money offered at the temple: kanikkai/kanikka in TN+Kerala, pronami in Bengal. Medium confidence on mr/gu — native check wanted.',
    confidence: 'medium',
    variants: {
      'tamil-nadu': { en: 'kanikkai' },
      'kerala': { en: 'kanikka' },
    },
    defaults: {
      en: 'offering', hi: 'चढ़ावा', bn: 'প্রণামী', sa: 'अर्पणम्',
      ta: 'காணிக்கை', te: 'కానుక', mr: 'देणगी', gu: 'દાન',
      kn: 'ಕಾಣಿಕೆ', ml: 'കാണിക്ക',
    },
  },
  blessing: {
    key: 'blessing',
    en: 'blessing',
    note: 'Ashirvadam in the south, ashirvad in the north — the same warmth, the local music.',
    confidence: 'high',
    variants: {
      'tamil-nadu': { en: 'ashirvadam' },
      'karnataka': { en: 'ashirvada' },
      'andhra-telangana': { en: 'ashirvadam' },
      'kerala': { en: 'ashirvadam' },
    },
    defaults: {
      en: 'blessing', hi: 'आशीर्वाद', bn: 'আশীর্বাদ', sa: 'आशीर्वादः',
      ta: 'ஆசீர்வாதம்', te: 'ఆశీర్వాదం', mr: 'आशीर्वाद', gu: 'આશીર્વાદ',
      kn: 'ಆಶೀರ್ವಾದ', ml: 'ആശീർവാദം',
    },
  },
  devotee: {
    key: 'devotee',
    en: 'devotee',
    note: 'The respectful plural/honorific form differs: bhaktar (TN), bhavik (Maharashtra).',
    confidence: 'high',
    variants: {},
    defaults: {
      en: 'devotee', hi: 'भक्त', bn: 'ভক্ত', sa: 'भक्तः',
      ta: 'பக்தர்', te: 'భక్తుడు', mr: 'भाविक', gu: 'ભક્ત',
      kn: 'ಭಕ್ತ', ml: 'ഭക്തൻ',
    },
  },
  deity: {
    key: 'deity',
    en: 'deity',
    note: 'How the divine is addressed: Thakur in Bengal, Deivam in Tamil Nadu, Devaru in Karnataka.',
    confidence: 'high',
    variants: {
      'tamil-nadu': { en: 'Deivam' },
      'west-bengal': { en: 'Thakur' },
      'bangladesh': { en: 'Thakur' },
    },
    defaults: {
      en: 'deity', hi: 'भगवान', bn: 'ঠাকুর', sa: 'देवः',
      ta: 'தெய்வம்', te: 'దేవుడు', mr: 'देव', gu: 'દેવ',
      kn: 'ದೇವರು', ml: 'ദൈവം',
    },
  },
  greeting: {
    key: 'greeting',
    en: 'Namaste',
    note: 'The single biggest belonging signal. Vanakkam for Tamil, Namaskaram for Telugu/Kannada/Malayalam, Nomoshkar-adjacent নমস্কার for Bengali.',
    confidence: 'high',
    variants: {
      'tamil-nadu': { en: 'Vanakkam' },
    },
    defaults: {
      en: 'Namaste', hi: 'नमस्ते', bn: 'নমস্কার', sa: 'नमस्ते',
      ta: 'வணக்கம்', te: 'నమస్కారం', mr: 'नमस्कार', gu: 'નમસ્તે',
      kn: 'ನಮಸ್ಕಾರ', ml: 'നമസ്കാരം',
    },
  },
  worshipRite: {
    key: 'worshipRite',
    en: 'puja',
    note: 'The temple worship rite: archanai/archana across the south, puja/pooja in the north and Bengal.',
    confidence: 'high',
    variants: {
      'tamil-nadu': { en: 'archanai' },
      'karnataka': { en: 'archane' },
      'andhra-telangana': { en: 'archana' },
      'kerala': { en: 'archana' },
    },
    defaults: {
      en: 'puja', hi: 'पूजा', bn: 'পুজো', sa: 'पूजनम्',
      ta: 'அர்ச்சனை', te: 'అర్చన', mr: 'पूजा', gu: 'પૂજા',
      kn: 'ಅರ್ಚನೆ', ml: 'അർച്ചന',
    },
  },
  honorific: {
    key: 'honorific',
    en: 'Shri',
    note: 'The respectful prefix: Thiru in Tamil Nadu, Shri elsewhere. Small word, huge belonging.',
    confidence: 'high',
    variants: {
      'tamil-nadu': { en: 'Thiru' },
    },
    defaults: {
      en: 'Shri', hi: 'श्री', bn: 'শ্রী', sa: 'श्रीः',
      ta: 'திரு', te: 'శ్రీ', mr: 'श्री', gu: 'શ્રી',
      kn: 'ಶ್ರೀ', ml: 'ശ്രീ',
    },
  },
};

export const REGIONAL_TERM_KEYS = Object.keys(REGIONAL_TERMS);

/* ------------------------------------------------------------------ */
/* Resolution                                                           */
/* ------------------------------------------------------------------ */

/**
 * Resolve a regional term. Chain: (region,lang) → lang default →
 * (region,en) → en → key. The (region,en) step serves the "English UI in
 * this region" case (kovil, not temple) and never overrides native script.
 * Never blank; unknown keys are logged and return the key (dev error —
 * the table is closed and typed).
 *
 * Pan-Sanatani terms short-circuit to the canonical form — the invariant.
 */
export function regionalTerm(
  key: string,
  lang: string,
  region: string
): string {
  const k = (key || '').trim();
  if (!k) return '';
  if (isPanSanataniTerm(k)) return PAN_SANATANI_TERMS[k];

  const def = REGIONAL_TERMS[k];
  if (!def) {
    if (typeof console !== 'undefined') {
      console.warn(`[regionalTerms] unknown term key "${k}" — add it to REGIONAL_TERMS`);
    }
    return k;
  }
  const l = (lang || 'en').toLowerCase() as SupportedLang;
  const r = (region || 'other') as RegionId;
  return (
    def.variants[r]?.[l] ??
    def.defaults[l] ??
    def.variants[r]?.en ??
    def.en
  );
}

/** The effective (resolved) value — for GodMode display ("what the user sees"). */
export function effectiveRegionalTerm(
  key: string,
  lang: string,
  region: string
): string {
  return regionalTerm(key, lang, region);
}

/* ------------------------------------------------------------------ */
/* Geo → (language, region) pure mapping                                */
/* ------------------------------------------------------------------ */

export interface GeoHint {
  /** BCP-47-ish device locale, e.g. 'ta-IN', 'bn-BD', 'hi'. */
  bcp47?: string | null;
  /** ISO country code, e.g. 'IN', 'BD', 'US'. */
  country?: string | null;
  /** State/region name from IP geolocation, e.g. 'Tamil Nadu'. */
  state?: string | null;
  /** Phone digits, e.g. '8801XXXXXXXX'. */
  phoneDigits?: string | null;
}

const IN_STATE_RULES: Array<{ match: RegExp; region: RegionId; lang: SupportedLang }> = [
  { match: /tamil\s*nadu/i, region: 'tamil-nadu', lang: 'ta' },
  { match: /karnataka/i, region: 'karnataka', lang: 'kn' },
  { match: /andhra|telangana/i, region: 'andhra-telangana', lang: 'te' },
  { match: /kerala/i, region: 'kerala', lang: 'ml' },
  { match: /maharashtra/i, region: 'maharashtra', lang: 'mr' },
  { match: /gujarat/i, region: 'gujarat', lang: 'gu' },
  { match: /west\s*bengal/i, region: 'west-bengal', lang: 'bn' },
  { match: /punjab/i, region: 'punjab', lang: 'hi' },
  { match: /odisha|orissa/i, region: 'odisha', lang: 'hi' },
  { match: /assam/i, region: 'assam', lang: 'bn' },
  { match: /arunachal|manipur|meghalaya|mizoram|nagaland|sikkim/i, region: 'northeast', lang: 'en' },
];

function langFromBcp47(bcp47: string | null | undefined): SupportedLang | null {
  if (!bcp47) return null;
  const primary = bcp47.toLowerCase().split('-')[0];
  const supported: SupportedLang[] = ['en', 'hi', 'bn', 'sa', 'ta', 'te', 'mr', 'gu', 'kn', 'ml'];
  return (supported as string[]).includes(primary) ? (primary as SupportedLang) : null;
}

function langFromPhoneDigits(digits: string | null | undefined): SupportedLang | null {
  if (!digits) return null;
  const d = digits.replace(/\D/g, '');
  if (d.startsWith('880')) return 'bn';
  if (d.startsWith('91')) return null; // India needs state-level signal — don't guess
  return null;
}

/**
 * Pure: geo hints → detected { lang, region }.
 * Priority inside this function: device locale → phone → IP country/state → default.
 * (The caller's saved-choice check outranks all of this.)
 */
export function detectNativeProfile(hint: GeoHint): { lang: SupportedLang; region: RegionId } {
  const bcpLang = langFromBcp47(hint.bcp47);
  // The BCP-47 region subtag is itself a geo signal: 'bn-BD' ⇒ BD.
  const bcpCountry = (() => {
    const parts = (hint.bcp47 || '').split('-');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
  })();
  const country = (hint.country || bcpCountry || '').toUpperCase();
  const state = hint.state || '';

  // 1. Device locale is the strongest ambient signal (ta-IN ⇒ Tamil).
  if (bcpLang && bcpLang !== 'en') {
    if (country === 'BD') return { lang: 'bn', region: 'bangladesh' };
    if (country === 'IN' && state) {
      const st = IN_STATE_RULES.find((r) => r.match.test(state));
      if (st) return { lang: bcpLang, region: st.region };
    }
    // Language-first region guess when geo is vague.
    const regionByLang: Partial<Record<SupportedLang, RegionId>> = {
      ta: 'tamil-nadu', kn: 'karnataka', te: 'andhra-telangana', ml: 'kerala',
      mr: 'maharashtra', gu: 'gujarat', bn: country === 'BD' ? 'bangladesh' : 'west-bengal',
      hi: 'hindi-belt', sa: 'other',
    };
    return { lang: bcpLang, region: regionByLang[bcpLang] || 'other' };
  }

  // 2. Phone country code.
  const phoneLang = langFromPhoneDigits(hint.phoneDigits);
  if (phoneLang === 'bn') {
    return { lang: 'bn', region: country === 'IN' ? 'west-bengal' : 'bangladesh' };
  }

  // 3. IP country / state.
  if (country === 'BD') return { lang: 'bn', region: 'bangladesh' };
  if (country === 'IN') {
    if (state) {
      const st = IN_STATE_RULES.find((r) => r.match.test(state));
      if (st) return { lang: st.lang, region: st.region };
    }
    return { lang: 'hi', region: 'hindi-belt' };
  }
  if (country) {
    // Diaspora: keep the device language when it's an Indian language,
    // otherwise English. Geo never overrides language here.
    return { lang: bcpLang || 'en', region: bcpLang && bcpLang !== 'en' ? regionForLang(bcpLang) : 'global-diaspora' };
  }

  // 4. Nothing known.
  return { lang: 'en', region: 'other' };
}

/** Best-effort region for a language when geo is vague (diaspora case). */
export function regionForLang(lang: SupportedLang): RegionId {
  const map: Record<SupportedLang, RegionId> = {
    ta: 'tamil-nadu', kn: 'karnataka', te: 'andhra-telangana', ml: 'kerala',
    mr: 'maharashtra', gu: 'gujarat', bn: 'west-bengal', hi: 'hindi-belt',
    sa: 'other', en: 'global-diaspora',
  };
  return map[lang] || 'other';
}

/* ------------------------------------------------------------------ */
/* Quality-system bridge                                                */
/* ------------------------------------------------------------------ */

/**
 * Regional term keys that are curated-but-unreviewed per language.
 * en/hi/bn are high-confidence (verified); the 7 draft languages ship
 * as draft so the "🙏 Help us say this better" loop covers them.
 */
export const DRAFT_REGIONAL_TERMS: Record<SupportedLang, string[]> = {
  en: [],
  hi: [],
  bn: [],
  sa: REGIONAL_TERM_KEYS,
  ta: REGIONAL_TERM_KEYS,
  te: REGIONAL_TERM_KEYS,
  mr: REGIONAL_TERM_KEYS,
  gu: REGIONAL_TERM_KEYS,
  kn: REGIONAL_TERM_KEYS,
  ml: REGIONAL_TERM_KEYS,
};

/** True when this regional term is an unreviewed draft in the language. */
export function isDraftRegionalTerm(lang: string, key: string): boolean {
  const list = DRAFT_REGIONAL_TERMS[(lang || 'en').toLowerCase() as SupportedLang];
  return !!list && list.includes(key);
}
