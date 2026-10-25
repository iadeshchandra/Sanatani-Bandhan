/**
 * Sanatani Bandhan — AI Assistant · curated major tirthas (offline fallback)
 * =====================================================================
 * Static list of major pilgrimage sites with well-established WGS84
 * coordinates. Used ONLY as a fallback when no community campus maps
 * are found near the devotee — always labelled as "major pilgrimage
 * sites" vs "community temples from campus maps".
 *
 * Coordinates are for widely-known sites only. This list NEVER leaves
 * the device; it is bundled data, not a network call.
 */
import { DRAFT_LANGS, tirthaNameOverlay } from '../lang/shared';

export interface CuratedTirtha {
  id: string;
  /** Display names per language. The 7 draft fields are B2-C overlays
   *  (src/ai/lang/<code>.ts), merged at load below; absent → en. */
  name: {
    en: string; hi: string; bn: string;
    ta?: string; te?: string; mr?: string; gu?: string;
    kn?: string; ml?: string; sa?: string;
  };
  lat: number;
  lng: number;
  kind: 'chardham' | 'jyotirlinga';
}

export const CURATED_TIRTHAS: CuratedTirtha[] = [
  // Char Dham (Uttarakhand)
  {
    id: 'yamunotri',
    name: { en: 'Yamunotri', hi: 'यमुनोत्री', bn: 'যমুনোত্রী' },
    lat: 31.0135, lng: 78.4595, kind: 'chardham',
  },
  {
    id: 'gangotri',
    name: { en: 'Gangotri', hi: 'गंगोत्री', bn: 'গঙ্গোত্রী' },
    lat: 30.9948, lng: 78.9398, kind: 'chardham',
  },
  {
    id: 'kedarnath',
    name: { en: 'Kedarnath', hi: 'केदारनाथ', bn: 'কেদারনাথ' },
    lat: 30.7346, lng: 79.0669, kind: 'chardham',
  },
  {
    id: 'badrinath',
    name: { en: 'Badrinath', hi: 'बद्रीनाथ', bn: 'বদ্রীনাথ' },
    lat: 30.7433, lng: 79.4938, kind: 'chardham',
  },
  // 12 Jyotirlingas (Kedarnath already listed above under Char Dham)
  {
    id: 'somnath',
    name: { en: 'Somnath', hi: 'सोमनाथ', bn: 'সোমনাথ' },
    lat: 20.8880, lng: 70.4013, kind: 'jyotirlinga',
  },
  {
    id: 'mallikarjuna',
    name: { en: 'Mallikarjuna (Srisailam)', hi: 'मल्लिकार्जुन (श्रीशैलम)', bn: 'মল্লিকার্জুন (শ্রীশৈলম)' },
    lat: 16.0740, lng: 78.8684, kind: 'jyotirlinga',
  },
  {
    id: 'mahakaleshwar',
    name: { en: 'Mahakaleshwar (Ujjain)', hi: 'महाकालेश्वर (उज्जैन)', bn: 'মহাকালেশ্বর (উজ্জয়িনী)' },
    lat: 23.1765, lng: 75.7885, kind: 'jyotirlinga',
  },
  {
    id: 'omkareshwar',
    name: { en: 'Omkareshwar', hi: 'ओंकारेश्वर', bn: 'ওঙ্কারেশ্বর' },
    lat: 22.2436, lng: 76.1522, kind: 'jyotirlinga',
  },
  {
    id: 'bhimashankar',
    name: { en: 'Bhimashankar', hi: 'भीमाशंकर', bn: 'ভীমাশঙ্কর' },
    lat: 19.0722, lng: 73.5367, kind: 'jyotirlinga',
  },
  {
    id: 'vishwanath',
    name: { en: 'Kashi Vishwanath (Varanasi)', hi: 'काशी विश्वनाथ (वाराणसी)', bn: 'কাশী বিশ্বনাথ (বারাণসী)' },
    lat: 25.3176, lng: 82.9739, kind: 'jyotirlinga',
  },
  {
    id: 'trimbakeshwar',
    name: { en: 'Trimbakeshwar', hi: 'त्र्यंबकेश्वर', bn: 'ত্র্যম্বকেশ্বর' },
    lat: 19.9322, lng: 73.5306, kind: 'jyotirlinga',
  },
  {
    id: 'vaidyanath',
    name: { en: 'Vaidyanath (Deoghar)', hi: 'वैद्यनाथ (देवघर)', bn: 'বৈদ্যনাথ (দেওঘর)' },
    lat: 24.4829, lng: 86.6964, kind: 'jyotirlinga',
  },
  {
    id: 'nageshwar',
    name: { en: 'Nageshwar (Dwarka)', hi: 'नागेश्वर (द्वारका)', bn: 'নাগেশ্বর (দ্বারকা)' },
    lat: 22.3359, lng: 69.0872, kind: 'jyotirlinga',
  },
  {
    id: 'rameshwaram',
    name: { en: 'Rameshwaram', hi: 'रामेश्वरम', bn: 'রামেশ্বরম' },
    lat: 9.2876, lng: 79.3173, kind: 'jyotirlinga',
  },
  {
    id: 'grishneshwar',
    name: { en: 'Grishneshwar', hi: 'घृष्णेश्वर', bn: 'ঘৃষ্ণেশ্বর' },
    lat: 19.7253, lng: 75.1235, kind: 'jyotirlinga',
  },
];

/* B2-C: merge the 7 draft-language tirtha names once at load. */
for (const t of CURATED_TIRTHAS) {
  for (const l of DRAFT_LANGS) {
    const n = tirthaNameOverlay(l, t.id);
    if (n) (t.name as Record<string, string>)[l] = n;
  }
}
