/**
 * Sanatani Bandhan — Dharmic Termbase (Phase 1)
 *
 * Terminology-based translation policy for 9 display languages:
 * en (Latin), hi/mr (Devanagari), bn (Bengali), ta (Tamil), te (Telugu),
 * gu (Gujarati), kn (Kannada), ml (Malayalam). Sanskrit falls back to
 * Devanagari — it is liturgical-only and not a display language.
 *
 * Three-tier term policy:
 * ─────────────────────────────────────────────────────────────
 * TIER A — SACRED (identical in ALL languages)
 *   Proper nouns and mantric terms that are never translated and never
 *   transliterated. The Devanagari form IS the canonical display form
 *   everywhere, including English UI. This preserves sacredness and
 *   cross-language search consistency.
 *
 * TIER B — TRANSLITERATE (same word, local script — NEVER translate)
 *   Domain terms that carry cultural weight. They keep their Sanskrit/Hindi
 *   lexical root and are rendered in each language's native script.
 *   e.g. Dakshina → दक्षिणा (hi) / দক্ষিণা (bn) / தட்சிணை (ta) / దక్షిణ (te)
 *   NEVER render these as "fee", "service", "client", "rating", etc.
 *   This protects the cultural reframe ("Dakshina not fee") across languages.
 *
 * TIER C — TRANSLATE (ordinary UI chrome)
 *   Standard interface words (Save, Cancel, Search, …). Fully translated
 *   per language. Covered by the per-language dictionaries in src/i18n/lang/.
 * ─────────────────────────────────────────────────────────────
 */

export type TermTier = 'A' | 'B' | 'C';

/** Language codes used by the termbase. `sa` resolves to Devanagari (hi) forms. */
export type TermbaseLang = 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml' | 'sa';

export interface TermEntry {
  /** Canonical key, e.g. 'dakshina'. */
  key: string;
  /** Policy tier. */
  tier: TermTier;
  /** Devanagari canonical form (used as-is for Tier A in every language). */
  devanagari: string;
  /** Latin canonical form (English display + romanisation reference). */
  latin: string;
  /** Tier B transliterations: same word, local script. */
  forms?: Partial<Record<TermbaseLang, string>>;
  /** Optional note for translators/reviewers. */
  note?: string;
}

/* ── TIER A — SACRED (20 terms). Identical in ALL languages. ─────────── */

const TIER_A: TermEntry[] = [
  { key: 'om', tier: 'A', devanagari: 'ॐ', latin: 'Om', note: 'Never translate or transliterate.' },
  { key: 'aarti', tier: 'A', devanagari: 'आरती', latin: 'Aarti' },
  { key: 'prasad', tier: 'A', devanagari: 'प्रसाद', latin: 'Prasad' },
  { key: 'mantra', tier: 'A', devanagari: 'मंत्र', latin: 'Mantra' },
  { key: 'havan', tier: 'A', devanagari: 'हवन', latin: 'Havan' },
  { key: 'yajna', tier: 'A', devanagari: 'यज्ञ', latin: 'Yajna' },
  { key: 'shloka', tier: 'A', devanagari: 'श्लोक', latin: 'Shloka' },
  { key: 'stotra', tier: 'A', devanagari: 'स्तोत्र', latin: 'Stotra' },
  { key: 'bhajan', tier: 'A', devanagari: 'भजन', latin: 'Bhajan' },
  { key: 'kirtan', tier: 'A', devanagari: 'कीर्तन', latin: 'Kirtan' },
  { key: 'aachaman', tier: 'A', devanagari: 'आचमन', latin: 'Aachaman' },
  { key: 'sankalp', tier: 'A', devanagari: 'संकल्प', latin: 'Sankalp' },
  { key: 'tithi', tier: 'A', devanagari: 'तिथि', latin: 'Tithi' },
  { key: 'nakshatra', tier: 'A', devanagari: 'नक्षत्र', latin: 'Nakshatra' },
  { key: 'panchang', tier: 'A', devanagari: 'पंचांग', latin: 'Panchang' },
  { key: 'gau_mata', tier: 'A', devanagari: 'गौमाता', latin: 'Gau Mata' },
  { key: 'tulsi', tier: 'A', devanagari: 'तुलसी', latin: 'Tulsi' },
  { key: 'dhoop', tier: 'A', devanagari: 'धूप', latin: 'Dhoop' },
  { key: 'deep', tier: 'A', devanagari: 'दीप', latin: 'Deep' },
  { key: 'tilak', tier: 'A', devanagari: 'तिलक', latin: 'Tilak' },
];

/* ── TIER B — TRANSLITERATE (40 terms). Same word, local script. ─────── */

const TIER_B: TermEntry[] = [
  {
    key: 'dakshina', tier: 'B', devanagari: 'दक्षिणा', latin: 'Dakshina',
    forms: { en: 'Dakshina', hi: 'दक्षिणा', bn: 'দক্ষিণা', ta: 'தட்சிணை', te: 'దక్షిణ', mr: 'दक्षिणा', gu: 'દક્ષિણા', kn: 'ದಕ್ಷಿಣೆ', ml: 'ദക്ഷിണ' },
    note: 'NEVER translate as "fee" / "charge" / "payment".',
  },
  {
    key: 'seva', tier: 'B', devanagari: 'सेवा', latin: 'Seva',
    forms: { en: 'Seva', hi: 'सेवा', bn: 'সেবা', ta: 'சேவை', te: 'సేవ', mr: 'सेवा', gu: 'સેવા', kn: 'ಸೇವೆ', ml: 'സേവ' },
    note: 'NEVER translate as "service".',
  },
  {
    key: 'yajman', tier: 'B', devanagari: 'यजमान', latin: 'Yajman',
    forms: { en: 'Yajman', hi: 'यजमान', bn: 'যজমান', ta: 'யஜமான்', te: 'యజమాన్', mr: 'यजमान', gu: 'યજમાન', kn: 'ಯಜಮಾನ್', ml: 'യജമാനൻ' },
    note: 'NEVER translate as "client" / "customer".',
  },
  {
    key: 'ashirvad', tier: 'B', devanagari: 'आशीर्वाद', latin: 'Ashirvad',
    forms: { en: 'Ashirvad', hi: 'आशीर्वाद', bn: 'আশীর্বাদ', ta: 'ஆசீர்வாதம்', te: 'ఆశీర్వాదం', mr: 'आशीर्वाद', gu: 'આશીર્વાદ', kn: 'ಆಶೀರ್ವಾದ', ml: 'ആശീർവാദം' },
    note: 'NEVER translate as "rating" / "stars".',
  },
  {
    key: 'purohit', tier: 'B', devanagari: 'पुरोहित', latin: 'Purohit',
    forms: { en: 'Purohit', hi: 'पुरोहित', bn: 'পুরোহিত', ta: 'புரோகிதர்', te: 'పురోహితుడు', mr: 'पुरोहित', gu: 'પુરોહિત', kn: 'ಪುರೋಹಿತ', ml: 'പുരോഹിതൻ' },
    note: 'NEVER translate as "priest (service provider)".',
  },
  {
    key: 'jyotishi', tier: 'B', devanagari: 'ज्योतिषी', latin: 'Jyotishi',
    forms: { en: 'Jyotishi', hi: 'ज्योतिषी', bn: 'জ্যোতিষী', ta: 'ஜோதிடர்', te: 'జ్యోతిషుడు', mr: 'ज्योतिषी', gu: 'જ્યોતિષી', kn: 'ಜ್ಯೋತಿಷಿ', ml: 'ജ്യോതിഷി' },
  },
  {
    key: 'mandir', tier: 'B', devanagari: 'मंदिर', latin: 'Mandir',
    forms: { en: 'Mandir', hi: 'मंदिर', bn: 'মন্দির', ta: 'கோவில்', te: 'మందిరం', mr: 'मंदिर', gu: 'મંદિર', kn: 'ಮಂದಿರ', ml: 'ക്ഷേത്രം' },
    note: 'Tamil/Malayalam keep the native temple word — accepted regional equivalent.',
  },
  {
    key: 'hundi', tier: 'B', devanagari: 'हुंडी', latin: 'Hundi',
    forms: { en: 'Hundi', hi: 'हुंडी', bn: 'হুন্ডি', ta: 'உண்டியல்', te: 'హుండీ', mr: 'हुंडी', gu: 'હુંડી', kn: 'ಹುಂಡಿ', ml: 'ഉണ്ടിയൽ' },
    note: 'Tamil/Malayalam keep the native offering-box word — accepted regional equivalent.',
  },
  {
    key: 'chanda', tier: 'B', devanagari: 'चंदा', latin: 'Chanda',
    forms: { en: 'Chanda', hi: 'चंदा', bn: 'চাঁদা', ta: 'நன்கொடை', te: 'చందా', mr: 'चंदा', gu: 'ચંદો', kn: 'ಚಂದಾ', ml: 'സംഭാവന' },
    note: 'NEVER translate as "donation fee". Voluntary contribution.',
  },
  {
    key: 'darshan', tier: 'B', devanagari: 'दर्शन', latin: 'Darshan',
    forms: { en: 'Darshan', hi: 'दर्शन', bn: 'দর্শন', ta: 'தரிசனம்', te: 'దర్శనం', mr: 'दर्शन', gu: 'દર્શન', kn: 'ದರ್ಶನ', ml: 'ദർശനം' },
  },
  {
    key: 'satsang', tier: 'B', devanagari: 'सत्संग', latin: 'Satsang',
    forms: { en: 'Satsang', hi: 'सत्संग', bn: 'সৎসঙ্গ', ta: 'சத்சங்கம்', te: 'సత్సంగం', mr: 'सत्संग', gu: 'સત્સંગ', kn: 'ಸತ್ಸಂಗ', ml: 'സത്സംഗം' },
  },
  {
    key: 'pranami', tier: 'B', devanagari: 'प्रणामी', latin: 'Pranami',
    forms: { en: 'Pranami', hi: 'प्रणामी', bn: 'প্রণামী', ta: 'பிரணாமி', te: 'ప్రణామి', mr: 'प्रणामी', gu: 'પ્રણામી', kn: 'ಪ್ರಣಾಮಿ', ml: 'പ്രണാമി' },
  },
  {
    key: 'bhandara', tier: 'B', devanagari: 'भंडारा', latin: 'Bhandara',
    forms: { en: 'Bhandara', hi: 'भंडारा', bn: 'ভান্ডারা', ta: 'அன்னதானம்', te: 'భండారా', mr: 'भंडारा', gu: 'ભંડારો', kn: 'ಭಂಡಾರ', ml: 'ഭണ്ഡാര' },
    note: 'Tamil keeps அன்னதானம் (annadanam) — accepted regional equivalent.',
  },
  {
    key: 'annadanam', tier: 'B', devanagari: 'अन्नदानम्', latin: 'Annadanam',
    forms: { en: 'Annadanam', hi: 'अन्नदान', bn: 'অন্নদান', ta: 'அன்னதானம்', te: 'అన్నదానం', mr: 'अन्नदान', gu: 'અન્નદાન', kn: 'ಅನ್ನದಾನ', ml: 'അന്നദാനം' },
  },
  {
    key: 'gotra', tier: 'B', devanagari: 'गोत्र', latin: 'Gotra',
    forms: { en: 'Gotra', hi: 'गोत्र', bn: 'গোত্র', ta: 'கோத்திரம்', te: 'గోత్రం', mr: 'गोत्र', gu: 'ગોત્ર', kn: 'ಗೋತ್ರ', ml: 'ഗോത്രം' },
  },
  {
    key: 'samskara', tier: 'B', devanagari: 'संस्कार', latin: 'Samskara',
    forms: { en: 'Samskara', hi: 'संस्कार', bn: 'সংস্কার', ta: 'சம்ஸ்காரம்', te: 'సంస్కారం', mr: 'संस्कार', gu: 'સંસ્કાર', kn: 'ಸಂಸ್ಕಾರ', ml: 'സംസ്കാരം' },
  },
  {
    key: 'vivah', tier: 'B', devanagari: 'विवाह', latin: 'Vivah',
    forms: { en: 'Vivah', hi: 'विवाह', bn: 'বিবাহ', ta: 'திருமணம்', te: 'వివాహం', mr: 'विवाह', gu: 'લગ્ન', kn: 'ವಿವಾಹ', ml: 'വിവാഹം' },
    note: 'Tamil/Gujarati keep the native wedding word — accepted regional equivalent.',
  },
  {
    key: 'shraddha', tier: 'B', devanagari: 'श्राद्ध', latin: 'Shraddha',
    forms: { en: 'Shraddha', hi: 'श्राद्ध', bn: 'শ্রাদ্ধ', ta: 'சிரார்த்தம்', te: 'శ్రాద్ధం', mr: 'श्राद्ध', gu: 'શ્રાદ્ધ', kn: 'ಶ್ರಾದ್ಧ', ml: 'ശ്രാദ്ധം' },
  },
  {
    key: 'pitru', tier: 'B', devanagari: 'पितृ', latin: 'Pitru',
    forms: { en: 'Pitru', hi: 'पितृ', bn: 'পিতৃ', ta: 'பித்ரு', te: 'పితృ', mr: 'पितृ', gu: 'પિતૃ', kn: 'ಪಿತೃ', ml: 'പിതൃ' },
  },
  {
    key: 'goshala', tier: 'B', devanagari: 'गोशाला', latin: 'Goshala',
    forms: { en: 'Goshala', hi: 'गोशाला', bn: 'গোশালা', ta: 'கோசாலை', te: 'గోశాల', mr: 'गोशाळा', gu: 'ગૌશાળા', kn: 'ಗೋಶಾಲೆ', ml: 'ഗോശാല' },
  },
  {
    key: 'gurukul', tier: 'B', devanagari: 'गुरुकुल', latin: 'Gurukul',
    forms: { en: 'Gurukul', hi: 'गुरुकुल', bn: 'গুরুকুল', ta: 'குருகுலம்', te: 'గురుకులం', mr: 'गुरुकुल', gu: 'ગુરુકુળ', kn: 'ಗುರುಕುಲ', ml: 'ഗുരുകുലം' },
  },
  {
    key: 'ashram', tier: 'B', devanagari: 'आश्रम', latin: 'Ashram',
    forms: { en: 'Ashram', hi: 'आश्रम', bn: 'আশ্রম', ta: 'ஆசிரமம்', te: 'ఆశ్రమం', mr: 'आश्रम', gu: 'આશ્રમ', kn: 'ಆಶ್ರಮ', ml: 'ആശ്രമം' },
  },
  {
    key: 'dharamshala', tier: 'B', devanagari: 'धर्मशाला', latin: 'Dharamshala',
    forms: { en: 'Dharamshala', hi: 'धर्मशाला', bn: 'ধর্মশালা', ta: 'தர்மசாலா', te: 'ధర్మశాల', mr: 'धर्मशाळा', gu: 'ધર્મશાળા', kn: 'ಧರ್ಮಶಾಲಾ', ml: 'ധർമ്മശാല' },
  },
  {
    key: 'yatra', tier: 'B', devanagari: 'यात्रा', latin: 'Yatra',
    forms: { en: 'Yatra', hi: 'यात्रा', bn: 'যাত্রা', ta: 'யாத்திரை', te: 'యాత్ర', mr: 'यात्रा', gu: 'યાત્રા', kn: 'ಯಾತ್ರೆ', ml: 'യാത്ര' },
  },
  {
    key: 'tirth', tier: 'B', devanagari: 'तीर्थ', latin: 'Tirth',
    forms: { en: 'Tirth', hi: 'तीर्थ', bn: 'তীর্থ', ta: 'தீர்த்தம்', te: 'తీర్థం', mr: 'तीर्थ', gu: 'તીર્થ', kn: 'ತೀರ್ಥ', ml: 'തീർത്ഥം' },
  },
  {
    key: 'vrat', tier: 'B', devanagari: 'व्रत', latin: 'Vrat',
    forms: { en: 'Vrat', hi: 'व्रत', bn: 'ব্রত', ta: 'விரதம்', te: 'వ్రతం', mr: 'व्रत', gu: 'વ્રત', kn: 'ವ್ರತ', ml: 'വ്രതം' },
  },
  {
    key: 'upasana', tier: 'B', devanagari: 'उपासना', latin: 'Upasana',
    forms: { en: 'Upasana', hi: 'उपासना', bn: 'উপাসনা', ta: 'உபாசனை', te: 'ఉపాసన', mr: 'उपासना', gu: 'ઉપાસના', kn: 'ಉಪಾಸನೆ', ml: 'ഉപാസന' },
  },
  {
    key: 'sadhana', tier: 'B', devanagari: 'साधना', latin: 'Sadhana',
    forms: { en: 'Sadhana', hi: 'साधना', bn: 'সাধনা', ta: 'சாதனை', te: 'సాధన', mr: 'साधना', gu: 'સાધના', kn: 'ಸಾಧನೆ', ml: 'സാധന' },
  },
  {
    key: 'dharm', tier: 'B', devanagari: 'धर्म', latin: 'Dharm',
    forms: { en: 'Dharm', hi: 'धर्म', bn: 'ধর্ম', ta: 'தர்மம்', te: 'ధర్మం', mr: 'धर्म', gu: 'ધર્મ', kn: 'ಧರ್ಮ', ml: 'ധർമ്മം' },
    note: 'NEVER translate as "religion".',
  },
  {
    key: 'karma', tier: 'B', devanagari: 'कर्म', latin: 'Karma',
    forms: { en: 'Karma', hi: 'कर्म', bn: 'কর্ম', ta: 'கர்மா', te: 'కర్మ', mr: 'कर्म', gu: 'કર્મ', kn: 'ಕರ್ಮ', ml: 'കർമ്മം' },
  },
  {
    key: 'punya', tier: 'B', devanagari: 'पुण्य', latin: 'Punya',
    forms: { en: 'Punya', hi: 'पुण्य', bn: 'পুণ্য', ta: 'புண்ணியம்', te: 'పుణ్యం', mr: 'पुण्य', gu: 'પુણ્ય', kn: 'ಪುಣ್ಯ', ml: 'പുണ്യം' },
  },
  {
    key: 'moksha', tier: 'B', devanagari: 'मोक्ष', latin: 'Moksha',
    forms: { en: 'Moksha', hi: 'मोक्ष', bn: 'মোক্ষ', ta: 'மோட்சம்', te: 'మోక్షం', mr: 'मोक्ष', gu: 'મોક્ષ', kn: 'ಮೋಕ್ಷ', ml: 'മോക്ഷം' },
  },
  {
    key: 'guru', tier: 'B', devanagari: 'गुरु', latin: 'Guru',
    forms: { en: 'Guru', hi: 'गुरु', bn: 'গুরু', ta: 'குரு', te: 'గురువు', mr: 'गुरु', gu: 'ગુરુ', kn: 'ಗುರು', ml: 'ഗുരു' },
  },
  {
    key: 'shishya', tier: 'B', devanagari: 'शिष्य', latin: 'Shishya',
    forms: { en: 'Shishya', hi: 'शिष्य', bn: 'শিষ্য', ta: 'சிஷ்யன்', te: 'శిష్యుడు', mr: 'शिष्य', gu: 'શિષ્ય', kn: 'ಶಿಷ್ಯ', ml: 'ശിഷ്യൻ' },
  },
  {
    key: 'sevadar', tier: 'B', devanagari: 'सेवादार', latin: 'Sevadar',
    forms: { en: 'Sevadar', hi: 'सेवादार', bn: 'সেবাদার', ta: 'சேவாதார்', te: 'సేవాదార్', mr: 'सेवादार', gu: 'સેવાદાર', kn: 'ಸೇವಾದಾರ್', ml: 'സേവാദാർ' },
    note: 'NEVER translate as "volunteer (staff)".',
  },
  {
    key: 'bhakt', tier: 'B', devanagari: 'भक्त', latin: 'Bhakt',
    forms: { en: 'Bhakt', hi: 'भक्त', bn: 'ভক্ত', ta: 'பக்தர்', te: 'భక్తుడు', mr: 'भक्त', gu: 'ભક્ત', kn: 'ಭಕ್ತ', ml: 'ഭക്തൻ' },
    note: 'NEVER translate as "member / user".',
  },
  {
    key: 'karta', tier: 'B', devanagari: 'कर्ता', latin: 'Karta',
    forms: { en: 'Karta', hi: 'कर्ता', bn: 'কর্তা', ta: 'கர்த்தா', te: 'కర్త', mr: 'कर्ता', gu: 'કર્તા', kn: 'ಕರ್ತ', ml: 'കർത്താവ്' },
    note: 'Ritual sponsor / doer. NEVER "organiser".',
  },
  {
    key: 'samagri', tier: 'B', devanagari: 'सामग्री', latin: 'Samagri',
    forms: { en: 'Samagri', hi: 'सामग्री', bn: 'সামগ্রী', ta: 'சாமக்கிரியை', te: 'సామగ్రి', mr: 'सामग्री', gu: 'સામગ્રી', kn: 'ಸಾಮಗ್ರಿ', ml: 'സാമഗ്രി' },
  },
  {
    key: 'murti', tier: 'B', devanagari: 'मूर्ति', latin: 'Murti',
    forms: { en: 'Murti', hi: 'मूर्ति', bn: 'মূর্তি', ta: 'சிலை', te: 'మూర్తి', mr: 'मूर्ती', gu: 'મૂર્તિ', kn: 'ಮೂರ್ತಿ', ml: 'വിഗ്രഹം' },
    note: 'Tamil/Malayalam keep the native idol word — accepted regional equivalent.',
  },
  {
    key: 'garbhagriha', tier: 'B', devanagari: 'गर्भगृह', latin: 'Garbhagriha',
    forms: { en: 'Garbhagriha', hi: 'गर्भगृह', bn: 'গর্ভগৃহ', ta: 'கர்ப்பக்கிரகம்', te: 'గర్భగుడి', mr: 'गर्भगृह', gu: 'ગર્ભગૃહ', kn: 'ಗರ್ಭಗುಡಿ', ml: 'ഗർഭഗൃഹം' },
  },
  {
    key: 'pradakshina', tier: 'B', devanagari: 'प्रदक्षिणा', latin: 'Pradakshina',
    forms: { en: 'Pradakshina', hi: 'प्रदक्षिणा', bn: 'প্রদক্ষিণা', ta: 'பிரதட்சிணம்', te: 'ప్రదక్షిణ', mr: 'प्रदक्षिणा', gu: 'પ્રદક્ષિણા', kn: 'ಪ್ರದಕ್ಷಿಣೆ', ml: 'പ്രദക്ഷിണം' },
  },
];

/* ── Registry ────────────────────────────────────────────────────── */

const ALL_TERMS: TermEntry[] = [...TIER_A, ...TIER_B];

const TERM_INDEX: Record<string, TermEntry> = {};
for (const entry of ALL_TERMS) {
  TERM_INDEX[entry.key] = entry;
}

/**
 * Resolve a termbase key to its display form for a language.
 *
 * - Tier A → the Devanagari form, identically, in EVERY language.
 * - Tier B → the transliterated form for that language; falls back to
 *   Devanagari for 'sa', and to the Latin form when a language is missing.
 * - Unknown key → returns the key itself (never blank).
 *
 * @example term('dakshina', 'ta') // 'தட்சிணை'
 * @example term('om', 'en')       // 'ॐ'
 */
export function term(key: string, lang: TermbaseLang | string): string {
  const entry = TERM_INDEX[key];
  if (!entry) return key;

  if (entry.tier === 'A') {
    return entry.devanagari;
  }

  const l = lang as TermbaseLang;
  if (entry.forms?.[l]) return entry.forms[l] as string;
  if (l === 'sa') return entry.devanagari; // Sanskrit → Devanagari
  return entry.latin;
}

/** All registered term keys. */
export function termKeys(): string[] {
  return Object.keys(TERM_INDEX);
}

/* ── CI LINT — forbidden translations ──────────────────────────────
 * A future CI step can grep language dictionaries and termbase forms for
 * these strings. They signal a cultural-policy violation: a sacred or
 * domain term that was translated instead of transliterated.
 *
 * Format: [termKey, forbidden English word(s)].
 */
export const FORBIDDEN_TRANSLATIONS: Array<{ term: string; forbidden: string[] }> = [
  { term: 'dakshina', forbidden: ['fee', 'charge', 'payment', 'cost', 'price'] },
  { term: 'seva', forbidden: ['service', 'servicing'] },
  { term: 'yajman', forbidden: ['client', 'customer', 'user'] },
  { term: 'ashirvad', forbidden: ['rating', 'stars', 'review score'] },
  { term: 'purohit', forbidden: ['service provider', 'vendor'] },
  { term: 'chanda', forbidden: ['donation fee', 'subscription'] },
  { term: 'bhakt', forbidden: ['member', 'user', 'subscriber'] },
  { term: 'sevadar', forbidden: ['staff', 'employee', 'worker'] },
  { term: 'dharm', forbidden: ['religion'] },
  { term: 'karta', forbidden: ['organiser', 'organizer', 'host'] },
  { term: 'mandir', forbidden: ['hall', 'center', 'centre'] },
];

export default TERM_INDEX;
