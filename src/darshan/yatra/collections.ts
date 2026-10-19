/**
 * darshan/yatra/collections.ts — curated pilgrimage circuits.
 * ============================================================================
 * Canonical orders for the great yatras. Jyotirlinga + Char Dham metadata
 * comes from src/ai/corpus/tirthas.ts (ids must match CURATED_TIRTHAS).
 * Shakti Peethas are defined here — the corpus only carries chardham and
 * jyotirlinga kinds.
 */
import { CURATED_TIRTHAS } from '../../ai/corpus/tirthas';
import { normalizeTempleName, type YatraCollection, type YatraLang } from './types';

/** Tirtha id -> display names (from corpus, fallback to id). */
export function tirthaNames(id: string): Record<YatraLang, string> {
  const t = CURATED_TIRTHAS.find((c) => c.id === id);
  if (t) return { en: t.name.en, hi: t.name.hi, bn: t.name.bn };
  return { en: id, hi: id, bn: id };
}

/**
 * The 12 Jyotirlingas in traditional canonical order.
 * (Kedarnath appears once — it is both Char Dham and Jyotirlinga.)
 */
export const JYOTIRLINGA_ORDER = [
  'somnath',
  'mallikarjuna',
  'mahakaleshwar',
  'omkareshwar',
  'kedarnath',
  'bhimashankar',
  'vishwanath',
  'trimbakeshwar',
  'vaidyanath',
  'nageshwar',
  'rameshwaram',
  'grishneshwar',
];

/** Chota Char Dham (Uttarakhand) in yatra order. */
export const CHARDHAM_ORDER = ['yamunotri', 'gangotri', 'kedarnath', 'badrinath'];

/** Curated Shakti Peethas (subset of the most-visited). */
export const SHAKTI_PEETHA_META: Record<string, Record<YatraLang, string>> = {
  kamakhya: { en: 'Kamakhya (Guwahati)', hi: 'कामाख्या (गुवाहाटी)', bn: 'কামাখ্যা (গুয়াহাটি)' },
  kalighat: { en: 'Kalighat (Kolkata)', hi: 'कालीघाट (कोलकाता)', bn: 'কালীঘাট (কলকাতা)' },
  tarapith: { en: 'Tarapith', hi: 'तारापीठ', bn: 'তারাপীঠ' },
  vaishnodevi: { en: 'Vaishno Devi (Katra)', hi: 'वैष्णो देवी (कटरा)', bn: 'বৈষ্ণো দেবী (কাটরা)' },
  jwalamukhi: { en: 'Jwalamukhi', hi: 'ज्वालामुखी', bn: 'জ্বালামুখী' },
  hinglaj: { en: 'Hinglaj', hi: 'हिंगलाज', bn: 'হিংলাজ' },
  kolhapur: { en: 'Mahalakshmi (Kolhapur)', hi: 'महालक्ष्मी (कोल्हापुर)', bn: 'মহালক্ষ্মী (কোলহাপুর)' },
  meenakshi: { en: 'Meenakshi (Madurai)', hi: 'मीनाक्षी (मदुरै)', bn: 'মীনাক্ষী (মাদুরাই)' },
};

export const SHAKTI_PEETHA_ORDER = Object.keys(SHAKTI_PEETHA_META);

export const YATRA_COLLECTIONS: YatraCollection[] = [
  {
    id: 'jyotirlinga',
    order: JYOTIRLINGA_ORDER,
    name: { en: '12 Jyotirlingas', hi: '12 ज्योतिर्लिंग', bn: '১২ জ্যোতির্লিঙ্গ' },
  },
  {
    id: 'chardham',
    order: CHARDHAM_ORDER,
    name: { en: 'Char Dham', hi: 'चार धाम', bn: 'চার ধাম' },
  },
  {
    id: 'shaktipeetha',
    order: SHAKTI_PEETHA_ORDER,
    name: { en: 'Shakti Peethas', hi: 'शक्ति पीठ', bn: 'শক্তিপীঠ' },
  },
];

/**
 * Match tokens per tirtha id (any language, will be normalized).
 * Longest-token match wins, so "kashi vishwanath" beats "vishwanath" noise.
 */
export const TIRTHA_MATCH_TOKENS: Record<string, string[]> = {
  yamunotri: ['yamunotri', 'यमुनोत्री', 'যমুনোত্রী'],
  gangotri: ['gangotri', 'गंगोत्री', 'গঙ্গোত্রী'],
  kedarnath: ['kedarnath', 'केदारनाथ', 'কেদারনাথ'],
  badrinath: ['badrinath', 'बद्रीनाथ', 'বদ্রীনাথ'],
  somnath: ['somnath', 'सोमनाथ', 'সোমনাথ'],
  mallikarjuna: ['mallikarjuna', 'srisailam', 'मल्लिकार्जुन', 'श्रीशैलम', 'মল্লিকার্জুন'],
  mahakaleshwar: ['mahakaleshwar', 'mahakal', 'ujjain', 'महाकालेश्वर', 'उज्जैन', 'মহাকালেশ্বর'],
  omkareshwar: ['omkareshwar', 'ओंकारेश्वर', 'ওঙ্কারেশ্বর'],
  bhimashankar: ['bhimashankar', 'भीमाशंकर', 'ভীমাশঙ্কর'],
  vishwanath: ['vishwanath', 'kashi', 'varanasi', 'विश्वनाथ', 'काशी', 'বারাণসী', 'কাশী'],
  trimbakeshwar: ['trimbakeshwar', 'त्र्यंबकेश्वर', 'ত্র্যম্বকেশ্বর'],
  vaidyanath: ['vaidyanath', 'deoghar', 'वैद्यनाथ', 'देवघर', 'বৈদ্যনাথ'],
  nageshwar: ['nageshwar', 'नागेश्वर', 'নাগেশ্বর'],
  rameshwaram: ['rameshwaram', 'रामेश्वरम', 'রামেশ্বরম'],
  grishneshwar: ['grishneshwar', 'घृष्णेश्वर', 'ঘৃষ্ণেশ্বর'],
  kamakhya: ['kamakhya', 'कामाख्या', 'কামাখ্যা', 'guwahati'],
  kalighat: ['kalighat', 'कालीघाट', 'কালীঘাট', 'kolkata'],
  tarapith: ['tarapith', 'तारापीठ', 'তারাপীঠ'],
  vaishnodevi: ['vaishnodevi', 'vaishno', 'वैष्णो', 'বৈষ্ণো', 'katra'],
  jwalamukhi: ['jwalamukhi', 'ज्वालामुखी', 'জ্বালামুখী'],
  hinglaj: ['hinglaj', 'हिंगलाज', 'হিংলাজ'],
  kolhapur: ['kolhapur', 'महालक्ष्मी', 'মহালক্ষ্মী'],
  meenakshi: ['meenakshi', 'madurai', 'मीनाक्षी', 'মীনাক্ষী'],
};

/** Collection id -> member tirtha ids (for "which circuits is this stop on"). */
export function collectionsForTirtha(tirthaId: string): string[] {
  return YATRA_COLLECTIONS.filter((c) => c.order.includes(tirthaId)).map((c) => c.id);
}

/** Display names for a stop: curated when matched, else the org's own name. */
export function stopDisplayName(
  templeName: string,
  tirthaId: string | undefined,
): Record<YatraLang, string> {
  if (tirthaId && SHAKTI_PEETHA_META[tirthaId]) return SHAKTI_PEETHA_META[tirthaId];
  if (tirthaId) return tirthaNames(tirthaId);
  return { en: templeName, hi: templeName, bn: templeName };
}

export { normalizeTempleName };
