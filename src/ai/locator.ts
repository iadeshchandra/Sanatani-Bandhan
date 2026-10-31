/**
 * ai/locator.ts — the Copilot feature locator (micro-batch, 2026-10-22).
 * =====================================================================
 * PROBLEM (live production walk, 2026-10-22): asking the Copilot
 * "Where is the Bahi-Khata desk for paper-register digitisation?"
 * answered "🙏 Forgive me — that question is beyond what I've been
 * taught so far." The solo navigation corpus (corpus/navigation.ts)
 * knows devotee destinations, and Blueprint C taught the Copilot the
 * org's DATA — but nobody taught it where the org's FEATURES live.
 * A first-time sevadar asking "where do I…" hit a wall.
 *
 * This module is that knowledge, as static data + a deterministic
 * matcher, in the same shape as navigation.ts / dharma.ts:
 *
 *  - LOCATOR_MAP — every desk in the canonical MODULE_CATALOG
 *    (src/components/common/Sidebar.tsx — id / name / domain traced
 *    row-for-row) PLUS the nested features that are NOT standalone
 *    desks (Bahi-Khata inside Treasury, Practice Mode and Access
 *    Review inside Organisation Settings, the Approvals panel,
 *    Published Accounts, the Festival Journey, voice entry) PLUS
 *    the solo-shell controls org users also ask for (Suchana
 *    controls, Privacy notice) and the public Ask-AI page.
 *  - matchLocator() — Unicode-boundary phrase/keyword scoring with
 *    primary-name weighting; ambiguity is REPORTED (top candidates
 *    within a point of the best), never guessed away.
 *  - canOpenEntry() — the RBAC honesty law: a desk is offered with
 *    a "Take me there" action ONLY when the ONE visibility layer
 *    (lib/deskVisibility, #56) — fed the caller's REAL effective
 *    role + Blueprint B desk scope from CallerScope — says the
 *    caller may open it. Otherwise the executor answers where it
 *    lives and whose desk it is, kindly, with no deep-link into a
 *    desk the app itself would refuse.
 *
 * Isolation law (H1–H5) holds by construction: the map contains
 * only user-facing org/solo/public features. GodMode and platform
 * surfaces are not in it, so the locator can never speak of them.
 *
 * Desk names are the catalog's own labels (what the sidebar shows);
 * sentences around them are authored in EN/HI/BN.
 */

import { ROLE_MIGRATION_MAP } from '../types';
import {
  isDeskVisibleForRole,
  type PermissionCheck,
} from '../lib/deskVisibility';
import type { CallerScope } from './org/port';
import { isWhereQuestion } from './navigation';
import { NAVIGATION_CORPUS } from './corpus/navigation';
import {
  allLocatorEntryOverlays,
  labelFor,
  locatorCatalogOverlay,
  locatorEntryOverlay,
  locatorOverlay,
  overlayWherePatterns,
} from './lang/shared';

export type LocatorLang = 'en' | 'hi' | 'bn';
export type TriText = Record<LocatorLang, string>;

export type LocatorKind = 'desk' | 'nested' | 'solo' | 'public';

export interface LocatorEntry {
  /** Stable id, e.g. 'loc.treasury', 'loc.bahi-khata'. */
  id: string;
  kind: LocatorKind;
  /** Catalog desk id (kind 'desk') or parent desk id (kind 'nested'). */
  deskId?: string;
  /** MODULE_CATALOG domain of deskId (deskVisibility needs it). */
  domain?: number;
  /** The feature's name as the app labels it. */
  name: TriText;
  /** Curated aliases: EN/HI/BN + transliterations + concept words. */
  aliases: string[];
  /** Aliases that ARE the feature's own name (score as primary). */
  primary: string[];
  /** Where it lives — a sentence fragment naming the place. */
  place: TriText;
  /** Who uses it — shown when the caller may not open it. */
  usedBy: TriText;
  /** Real react-router path (kind 'solo' / 'public' only). */
  route?: string;
}

/* ------------------------------------------------------------------ */
/* Authored fragments                                                  */
/* ------------------------------------------------------------------ */

const TAKE_ME: TriText = {
  en: 'Take me there 🙏',
  hi: 'मुझे वहाँ ले चलें 🙏',
  bn: 'আমাকে সেখানে নিয়ে যান 🙏',
};

export function locatorTakeMeLabel(lang: string): string {
  const l = (lang || 'en').toLowerCase();
  if (l === 'hi' || l === 'bn') return TAKE_ME[l];
  // B2-C draft overlays carry their own take-me label (locator.takeMe).
  return labelFor(l, 'locator.takeMe') ?? TAKE_ME.en;
}

/** The four locator sentence-frames in the asker's full language.
 *  B2-C: draft languages resolve through their overlays. The catalogue
 *  fragments (entry name/place/usedBy) likewise resolve through the
 *  per-language catalogue overlays (entryNameFor / entryPlaceFor /
 *  entryUsedByFor below) since the Locator/Howto completion batch;
 *  anything an overlay does not author falls back to English. */
export interface LocatorFrames {
  outOfScope: (usedBy: string) => string;
  viaOrgsSuffix: string;
  clarifyIntro: string;
  dontKnow: string;
}

export function locatorFrames(lang: string): LocatorFrames {
  const o = locatorOverlay(lang);
  if (o) return o;
  const l = (lang || 'en').toLowerCase();
  const tri: LocatorLang = l === 'hi' || l === 'bn' ? l : 'en';
  return {
    outOfScope: LOCATOR_COPY.outOfScope[tri],
    viaOrgsSuffix: LOCATOR_COPY.viaOrgsSuffix[tri],
    clarifyIntro: LOCATOR_COPY.clarifyIntro[tri],
    dontKnow: LOCATOR_COPY.dontKnow[tri],
  };
}

/** Out-of-scope sentence frame: "…that desk is used by {usedBy}…". */
export const LOCATOR_COPY = {
  outOfScope: {
    en: (usedBy: string) =>
      `In this workspace that desk is used by ${usedBy} — it isn't in your desk list. A Trustee can open it together with you. 🙏`,
    hi: (usedBy: string) =>
      `इस कार्यक्षेत्र में यह डेस्क ${usedBy} उपयोग करते हैं — यह आपकी डेस्क सूची में नहीं है। कोई ट्रस्टी इसे आपके साथ खोल सकते हैं। 🙏`,
    bn: (usedBy: string) =>
      `এই কর্মক্ষেত্রে এই ডেস্কটি ${usedBy} ব্যবহার করেন — এটি আপনার ডেস্ক তালিকায় নেই। একজন ট্রাস্টি আপনার সঙ্গে এটি খুলতে পারেন। 🙏`,
  } as Record<LocatorLang, (usedBy: string) => string>,
  /** Solo session, org feature: appended after the place fragment —
   *  the workspace path, corpus-style (cf. nav.treasury). */
  viaOrgsSuffix: {
    en: 'Open Orgs and enter your workspace to reach it. 🙏',
    hi: 'Orgs खोलकर अपने कार्यक्षेत्र में प्रवेश करें। 🙏',
    bn: 'Orgs খুলে আপনার কর্মক্ষেত্রে প্রবেশ করুন। 🙏',
  } as TriText,
  clarifyIntro: {
    en: '🙏 That name lives in more than one place — which one do you mean?',
    hi: '🙏 यह नाम एक से अधिक जगह है — आप किसका मतलब ले रहे हैं?',
    bn: '🙏 এই নামটি একাধিক জায়গায় আছে — আপনি কোনটি বোঝাচ্ছেন?',
  } as TriText,
  dontKnow: {
    en: '🙏 Forgive me — I have not been taught where that lives yet. Try asking for a desk by name, like "where is the Treasury?" 🌼',
    hi: '🙏 क्षमा करें — मुझे अभी यह नहीं सिखाया गया कि वह कहाँ है। किसी डेस्क का नाम लेकर पूछें, जैसे "कोष कहाँ है?" 🌼',
    bn: '🙏 ক্ষমা করবেন — সেটি কোথায় আছে তা আমার এখনও শেখা হয়নি। কোনো ডেস্কের নাম ধরে জিজ্ঞেস করুন, যেমন "তহবিল কোথায়?" 🌼',
  } as TriText,
};

/* "Used by" role phrases (nominative; the frames above carry grammar). */
const FIN: TriText = {
  en: 'Trustees and the Accountant',
  hi: 'ट्रस्टी और अकाउंटेंट',
  bn: 'ট্রাস্টি ও হিসাবরক্ষক',
};
const FINOPS: TriText = {
  en: 'Trustees, the Accountant and managers',
  hi: 'ट्रस्टी, अकाउंटेंट और प्रबंधक',
  bn: 'ট্রাস্টি, হিসাবরক্ষক ও ব্যবস্থাপক',
};
const GOV: TriText = {
  en: 'Trustees',
  hi: 'ट्रस्टी',
  bn: 'ট্রাস্টিরা',
};
const MGR: TriText = {
  en: 'Trustees and managers',
  hi: 'ट्रस्टी और प्रबंधक',
  bn: 'ট্রাস্টি ও ব্যবস্থাপক',
};
const RITUAL: TriText = {
  en: 'the Priest, Purohits and Trustees',
  hi: 'पुजारी, पुरोहित और ट्रस्टी',
  bn: 'পুরোহিত ও ট্রাস্টিরা',
};
const SEC: TriText = {
  en: 'Trustees and the security (CSO) team',
  hi: 'ट्रस्टी और सुरक्षा (CSO) टीम',
  bn: 'ট্রাস্টি ও নিরাপত্তা (CSO) দল',
};
const STAFF: TriText = {
  en: 'the workspace team — Trustees and sevadars',
  hi: 'कार्यक्षेत्र टीम — ट्रस्टी और सेवादार',
  bn: 'কর্মক্ষেত্রের দল — ট্রাস্টি ও সেবাদাররা',
};
const EDU: TriText = {
  en: 'the teachers and Trustees',
  hi: 'शिक्षक और ट्रस्टी',
  bn: 'শিক্ষক ও ট্রাস্টিরা',
};
const CARE: TriText = {
  en: 'the seva team and Trustees',
  hi: 'सेवा टीम और ट्रस्टी',
  bn: 'সেবা দল ও ট্রাস্টিরা',
};
const AUD: TriText = {
  en: 'Trustees and the Auditor',
  hi: 'ट्रस्टी और ऑडिटर',
  bn: 'ট্রাস্টি ও অডিটর',
};
const COUNTER: TriText = {
  en: 'Trustees, the Accountant and the counter team',
  hi: 'ट्रस्टी, अकाउंटेंट और काउंटर टीम',
  bn: 'ট্রাস্টি, হিসাবরক্ষক ও কাউন্টার দল',
};

/** Stable keys for the 11 shared "used by" phrases — the draft-language
 *  catalogue overlays (lang/<code>-locator.ts) key their translations
 *  by these, so an entry's phrase resolves by identity, not by text. */
const USED_BY_KEYS: Array<[string, TriText]> = [
  ['fin', FIN],
  ['finops', FINOPS],
  ['gov', GOV],
  ['mgr', MGR],
  ['ritual', RITUAL],
  ['sec', SEC],
  ['staff', STAFF],
  ['edu', EDU],
  ['care', CARE],
  ['aud', AUD],
  ['counter', COUNTER],
];

export function usedByKeyOf(usedBy: TriText): string | undefined {
  for (const [k, v] of USED_BY_KEYS) if (v === usedBy) return k;
  return undefined;
}

/** Desk place fragment, generated from the catalog's own domain title
 *  (the label the sidebar itself groups desks under). */
const deskPlace = (domainTitle: string): TriText => ({
  en: `is in the desk list, under ${domainTitle}`,
  hi: `डेस्क सूची में है, ${domainTitle} के अंतर्गत`,
  bn: `ডেস্ক তালিকায় আছে, ${domainTitle}-এর অধীনে`,
});

type DeskRow = [
  id: string,
  name: string,
  domain: number,
  domainTitle: string,
  usedBy: TriText,
  aliases: string[],
  primary: string[],
];

const D = (
  id: string,
  name: string,
  domain: number,
  domainTitle: string,
  usedBy: TriText,
  aliases: string[],
  primary: string[]
): LocatorEntry => ({
  id: `loc.${id}`,
  kind: 'desk',
  deskId: id,
  domain,
  name: { en: name, hi: name, bn: name },
  aliases,
  primary,
  place: deskPlace(domainTitle),
  usedBy,
});
/* The 72 MODULE_CATALOG desks (Sidebar.tsx), row-for-row. */
const DESK_ROWS: DeskRow[] = [
  ['dashboard', 'Command Center', 1, 'Core Command & CRM', STAFF, ['command center', 'কমান্ড সেন্টার', 'कमांड सेंटर', 'org home', 'workspace home'], ['command center']],
  ['checkin', 'Gate Command & Check-In', 1, 'Core Command & CRM', SEC, ['gate check-in', 'check in', 'check-in', 'গেট চেক-ইন', 'गेट चेक-इन', 'biometric check-in'], ['gate command & check-in']],
  ['devotees', 'Devotee & Member Directory', 1, 'Core Command & CRM', STAFF, ['devotee directory', 'member directory', 'devotee list', 'members list', 'ভক্ত তালিকা', 'भक्त सूची', 'bhakta list'], ['devotees', 'devotee & member directory']],
  ['membership', 'Membership: Invites & Requests', 1, 'Core Command & CRM', GOV, ['invites', 'join requests', 'member requests', 'invite requests', 'সদস্যপদ', 'सदस्यता'], ['membership']],
  ['family', 'Household & Kul Parivar', 1, 'Core Command & CRM', STAFF, ['household', 'kul parivar', 'পরিবার', 'परिवार', 'parivar', 'households'], ['household & kul parivar', 'family']],
  ['vanshavali', 'Ancestral Lineage (Vanshavali)', 1, 'Core Command & CRM', STAFF, ['ancestral lineage', 'বংশাবলী', 'वंशावली', 'lineage', 'family tree'], ['vanshavali', 'ancestral lineage (vanshavali)']],
  ['guests', 'Guest & Visitor CRM', 1, 'Core Command & CRM', STAFF, ['guest crm', 'visitor crm', 'visitors', 'অতিথি', 'अतिथि'], ['guests', 'guest & visitor crm']],
  ['donorCare', 'Donor Care & Win-Back', 1, 'Core Command & CRM', STAFF, ['donor care', 'win-back', 'donor win-back', 'দাতা যত্ন', 'दाता देखभाल'], ['donor care', 'donor care & win-back']],
  ['bulkImport', 'Bulk CSV Ingestion', 1, 'Core Command & CRM', FINOPS, ['bulk import', 'csv import', 'csv ingestion', 'বাল্ক ইমপোর্ট', 'excel import', 'bulk csv'], ['bulk import', 'bulk csv ingestion']],
  ['federation', 'Federation & Multi-Branch HQ', 1, 'Core Command & CRM', FINOPS, ['multi-branch', 'multi branch', 'hq rollup', 'ফেডারেশন', 'महासंघ', 'branches', 'head office'], ['federation', 'federation & multi-branch hq']],
  ['sevadar-roster', 'Sevadar HR & Volunteer Roster', 1, 'Core Command & CRM', STAFF, ['volunteer roster', 'hr roster', 'sevadar hr', 'সেবাদার রোস্টার', 'सेवादार रोस्टर', 'volunteers list'], ['sevadar roster', 'sevadar hr & volunteer roster']],
  ['quick-chanda-pos', 'Quick Chanda Counter POS', 2, 'Financials & Assets', COUNTER, ['pos', 'chanda counter', 'quick chanda', 'চাঁদা কাউন্টার', 'चंदा काउंटर', 'counter pos', 'pos counter'], ['quick chanda', 'quick chanda counter pos']],
  ['treasury', 'Treasury & Expense Ledger', 2, 'Financials & Assets', FIN, ['treasury ledger', 'expense ledger', 'তহবিল', 'कोष', 'khajana', 'খাজাঞ্চি', 'accounts ledger', 'ledger'], ['treasury', 'treasury & expense ledger']],
  ['hundi-audit', 'Hundi & Golak Dual Audit', 2, 'Financials & Assets', FIN, ['hundi', 'golak', 'হুন্ডি', 'हुण्डी', 'hundi audit', 'golak audit'], ['hundi & golak dual audit', 'hundi audit']],
  ['cash-custody', 'Cash Custody — Hundi Chain of Custody', 2, 'Financials & Assets', FIN, ['cash custody', 'chain of custody', 'hundi chain', 'নগদ হেফাজত', 'नकद हिरासत'], ['cash custody']],
  ['ratna-bhandar', 'Ratna Bhandar & Bullion Vault', 2, 'Financials & Assets', FIN, ['ratna bhandar', 'bullion vault', 'রত্ন ভান্ডার', 'रत्न भंडार', 'jewellery vault', 'ornaments vault', 'gold vault'], ['ratna bhandar', 'ratna bhandar & bullion vault']],
  ['taxReceipts', 'Tax Certificates (80G/12A)', 2, 'Financials & Assets', FIN, ['tax certificates', '80g', '12a', '80g receipts', 'ট্যাক্স সার্টিফিকেট', 'कर प्रमाणपत्र', 'tax receipts'], ['tax certificates', 'tax certificates (80g/12a)']],
  ['form10bd', 'Form 10BD & CBDT Filing', 2, 'Financials & Assets', FIN, ['form 10bd', '10bd', 'cbdt', 'cbdt filing', 'ফর্ম ১০বিডি', 'फॉर्म 10bd'], ['form 10bd', '10bd']],
  ['tally-export', 'Tally Prime XML Export', 2, 'Financials & Assets', FIN, ['tally', 'tally prime', 'xml export', 'ট্যালি', 'टैली', 'tally export'], ['tally-export', 'tally prime xml export']],
  ['campaigns', 'Crowdfunding & Mandir Nirman', 2, 'Financials & Assets', FIN, ['crowdfunding', 'mandir nirman', 'নির্মাণ', 'निर्माण', 'fundraising', 'mandir construction'], ['campaigns', 'crowdfunding & mandir nirman']],
  ['karmaLedger', 'Seva Register', 2, 'Financials & Assets', FINOPS, ['seva register', 'karma ledger', 'volunteer ledger', 'সেবা খাতা', 'सेवा पंजी'], ['seva register', 'karma ledger']],
  ['assets', 'Fixed Assets & Deity Ornaments', 2, 'Financials & Assets', FIN, ['fixed assets', 'deity ornaments', 'asset register', 'সম্পত্তি', 'संपत्ति'], ['assets', 'fixed assets & deity ornaments']],
  ['inventory', 'Store & Consumables (Bhandara)', 2, 'Financials & Assets', FINOPS, ['store', 'consumables', 'bhandar', 'ভান্ডার', 'भंडार', 'stock', 'store room'], ['inventory', 'store & consumables (bhandara)']],
  ['bhoomi', 'Bhoomi & Property Leases', 2, 'Financials & Assets', FINOPS, ['bhoomi', 'property', 'land leases', 'ভূমি', 'भूमि', 'land', 'property leases'], ['bhoomi', 'bhoomi & property leases']],
  ['vahan', 'Vahan Fleet & Transport', 2, 'Financials & Assets', FINOPS, ['vahan', 'fleet', 'transport', 'vehicles', 'যানবাহন', 'वाहन'], ['vahan', 'vahan fleet & transport']],
  ['recurring-seva', 'Recurring Seva Mandates', 2, 'Financials & Assets', FINOPS, ['recurring seva', 'seva mandates', 'mandates', 'নিয়মিত সেবা', 'नियमित सेवा'], ['recurring seva', 'recurring seva mandates']],
  ['poojaBooking', 'Rituals & Sankalp Hub', 3, 'Vedic Rituals & Ephemeris', RITUAL, ['rituals hub', 'sankalp hub', 'puja booking', 'pooja booking', 'পূজা বুকিং', 'पूजा बुकिंग', 'bookings'], ['pooja booking', 'rituals & sankalp hub']],
  ['mandirPuja', 'Daily Aarti & Pujas', 3, 'Vedic Rituals & Ephemeris', RITUAL, ['daily aarti', 'aarti', 'আরতি', 'आरती', 'daily pujas', 'mandir puja'], ['mandir puja', 'daily aarti & pujas']],
  ['purohitDesk', 'Purohit Diary & Dakshina', 3, 'Vedic Rituals & Ephemeris', RITUAL, ['purohit diary', 'dakshina', 'পুরোহিত ডায়েরি', 'पुरोहित डायरी', 'purohit diary & dakshina'], ['purohit desk', 'purohit diary']],
  ['purohitMarket', 'Global Scholar Marketplace', 3, 'Vedic Rituals & Ephemeris', RITUAL, ['scholar marketplace', 'global scholar marketplace', 'পুরোহিত মার্কেট', 'विद्वान बाज़ार', 'scholar market'], ['purohit market', 'global scholar marketplace']],
  ['pitruShradh', 'Pitru Paksha & Shradh Alerts', 3, 'Vedic Rituals & Ephemeris', RITUAL, ['pitru paksha', 'shradh', 'shradh alerts', 'পিতৃ পক্ষ', 'पितृ पक्ष'], ['pitru shradh', 'pitru paksha & shradh alerts']],
  ['panchang', 'Vedic Panchang & Muhurat', 3, 'Vedic Rituals & Ephemeris', RITUAL, ['panchang', 'muhurat', 'muhurta', 'পঞ্জিকা', 'पंचांग', 'vedic panchang'], ['panchang', 'vedic panchang & muhurat']],
  ['yatranet-gis', 'YatraNet GIS Crowd & SOS', 3, 'Vedic Rituals & Ephemeris', SEC, ['gis', 'yatra gis', 'crowd gis', 'যাত্রা জিআইএস', 'यात्रा जीआईएस'], ['yatranet gis', 'yatranet gis crowd & sos']],
  ['rakthaSeva', 'Raktha Seva (Blood Registry)', 4, 'Specialized Desks', CARE, ['blood registry', 'blood', 'blood seva', 'রক্ত সেবা', 'रक्त सेवा', 'blood donors'], ['raktha seva', 'raktha seva (blood registry)']],
  ['goshala', 'Goshala Sanctuary & Gomata Records', 4, 'Specialized Desks', CARE, ['goshala sanctuary', 'gomata records', 'গোশালা', 'गोशाला', 'gaushala', 'cow records', 'cows'], ['goshala', 'goshala sanctuary & gomata records']],
  ['annadanam', 'Annadanam & Prasad Seva', 4, 'Specialized Desks', CARE, ['annadanam seva', 'prasad seva', 'অন্নদান', 'अन्नदान', 'food seva', 'prasadam'], ['annadanam', 'annadanam & prasad seva']],
  ['annakshetra-one', 'Annakshetra One — Kitchen & Bhandara Management', 4, 'Specialized Desks', CARE, ['annakshetra', 'kitchen', 'kitchen management', 'bhandara management', 'অন্নক্ষেত্র', 'अन्नक्षेत्र'], ['annakshetra one', 'annakshetra']],
  ['nyas-one', 'Nyas One — Compliance & Governance', 4, 'Specialized Desks', GOV, ['nyas', 'compliance', 'compliance & governance', 'ন্যাস', 'न्यास', 'trust compliance'], ['nyas one', 'nyas']],
  ['utsav-one', 'Utsav One — Festival & Mahotsav Management', 4, 'Specialized Desks', CARE, ['utsav', 'festival management', 'mahotsav management', 'উৎসব ব্যবস্থাপনা', 'उत्सव प्रबंधन', 'festival desk'], ['utsav one', 'utsav']],
  ['tirth-one', 'Tirth One — Darshan Queue & Tokens', 4, 'Specialized Desks', CARE, ['tirth', 'darshan queue', 'queue tokens', 'darshan tokens', 'তীর্থ ওয়ান', 'तीर्थ वन'], ['tirth one', 'tirth']],
  ['yoga-one', 'Yoga One — Shala Management', 4, 'Specialized Desks', CARE, ['yoga', 'yoga shala', 'shala management', 'যোগ', 'योग'], ['yoga one', 'yoga']],
  ['matha-one', 'Matha One — Monastic Management', 4, 'Specialized Desks', CARE, ['matha', 'monastic', 'monastic management', 'মঠ', 'मठ'], ['matha one', 'matha']],
  ['satsang-one', 'Satsang One — Mandali Management', 4, 'Specialized Desks', CARE, ['satsang one', 'mandali', 'mandali management', 'সৎসঙ্গ ওয়ান', 'सत्संग वन'], ['satsang one']],
  ['sabha-one', 'Sabha One — Purohit Sabha Management', 4, 'Specialized Desks', RITUAL, ['sabha', 'purohit sabha', 'সভা', 'सभा', 'sabha management'], ['sabha one', 'sabha']],
  ['samskara-one', 'Samskara One — Family Lifecycle', 4, 'Specialized Desks', CARE, ['samskara one', 'family lifecycle', 'lifecycle', 'সংস্কার ওয়ান', 'संस्कार वन'], ['samskara one']],
  ['ashramKutir', 'Ashram Kutir, Residents & Stays', 4, 'Specialized Desks', CARE, ['ashram kutir', 'kutir', 'residents register', 'residents', 'rooms', 'stays', 'accommodation', 'আশ্রম কুটির', 'आश्रम कुटीर'], ['ashram kutir', 'ashram kutir, residents & stays']],
  ['dharamshala', 'Dharamshala Yatri Bhavan', 4, 'Specialized Desks', CARE, ['dharamshala', 'yatri bhavan', 'ধর্মশালা', 'धर्मशाला', 'yatri stays', 'rooms', 'stays', 'accommodation'], ['dharamshala', 'dharamshala yatri bhavan']],
  ['gurukul', 'Gurukul — Shishya Registry & Residential Monitoring', 4, 'Specialized Desks', EDU, ['gurukul registry', 'shishya registry', 'গুরুকুল', 'गुरुकुल', 'students registry', 'brahmachari', 'shishya', 'students', 'enrollment'], ['gurukul']],
  ['gurukulAcademy', 'Shastric Academy & Grading', 4, 'Specialized Desks', EDU, ['shastric academy', 'academy', 'grading', 'শাস্ত্র একাডেমি', 'शास्त्र अकादमी'], ['gurukul academy', 'shastric academy & grading']],
  ['vidyalaya', 'Weekend Heritage School', 4, 'Specialized Desks', EDU, ['heritage school', 'weekend school', 'weekend heritage school', 'বিদ্যালয়', 'विद्यालय'], ['vidyalaya', 'weekend heritage school']],
  ['pathshala', 'Pathshala — Complete School Management', 4, 'Specialized Desks', EDU, ['pathshala', 'school management', 'পাঠশালা', 'पाठशाला', 'school', 'attendance', 'fees', 'exams', 'shishya', 'students', 'certificates'], ['pathshala', 'pathshala — complete school management']],
  ['goshala-one', 'Goshala One — Complete Goshala Operations', 4, 'Specialized Desks', CARE, ['goshala one', 'complete goshala', 'গোশালা ওয়ান', 'गोशाला वन', 'goshala operations'], ['goshala one']],
  ['ashram-one', 'Ashram One — Complete Yatri Stay Management', 4, 'Specialized Desks', CARE, ['ashram one', 'yatri stay management', 'আশ্রম ওয়ান', 'आश्रम वन', 'ashram stays', 'rooms', 'stays', 'bookings', 'guest register'], ['ashram one']],
  ['satsang', 'Satsang, Kirtan & Discourse', 4, 'Specialized Desks', CARE, ['satsang', 'kirtan', 'discourse', 'সৎসঙ্গ', 'सत्संग'], ['satsang', 'satsang, kirtan & discourse']],
  ['sanghaDrills', 'Sangha & Shakha Mobilization', 4, 'Specialized Desks', STAFF, ['sangha', 'shakha', 'sangha mobilization', 'shakha mobilization', 'সংঘ', 'संघ'], ['sangha drills', 'sangha & shakha mobilization']],
  ['granthLibrary', 'Sacred Granth & Manuscript Library', 4, 'Specialized Desks', CARE, ['granth library', 'manuscript library', 'library', 'manuscripts', 'গ্রন্থ লাইব্রেরি', 'ग्रंथ लाइब्रेरी'], ['granth library', 'sacred granth & manuscript library']],
  ['utsavPanjika', 'Festival Calendar & Gate Passes', 5, 'Matrimony & Outreach', CARE, ['festival calendar', 'gate passes', 'festival gate passes', 'উৎসব পঞ্জিকা', 'उत्सव पंजिका'], ['utsav panjika', 'festival calendar & gate passes']],
  ['panchayatPolls', 'Panchayat Voting & Quorum', 5, 'Matrimony & Outreach', GOV, ['panchayat voting', 'voting', 'quorum', 'polls', 'পঞ্চায়েত ভোট', 'पंचायत मतदान'], ['panchayat polls', 'panchayat voting & quorum']],
  ['sandeshBroadcast', 'Sandesh WhatsApp/SMS Broadcast', 5, 'Matrimony & Outreach', MGR, ['sandesh', 'broadcast', 'whatsapp broadcast', 'sms broadcast', 'সম্প্রচার', 'प्रसारण', 'notices broadcast'], ['sandesh broadcast', 'sandesh whatsapp/sms broadcast']],
  ['dharmicAssistant', 'Dharmic AI Query Desk', 5, 'Matrimony & Outreach', STAFF, ['dharmic ai', 'ai query desk', 'dharmic assistant', 'ধর্মীয় এআই', 'धार्मिक एआई'], ['dharmic assistant', 'dharmic ai query desk']],
  ['trusteeGovernance', 'Trustee Board & Governance', 6, 'Governance & Security', GOV, ['trustee board', 'board governance', 'governance', 'ট্রাস্টি বোর্ড', 'ट्रस्टी बोर्ड'], ['trustee governance', 'trustee board & governance']],
  ['legalVault', 'Security & Audit Log', 6, 'Governance & Security', AUD, ['audit log', 'security audit log', 'activity history', 'who did what', 'অডিট লগ', 'ऑडिट लॉग'], ['legal vault', 'security & audit log']],
  ['qrScanner', 'QR Gate Scanner', 6, 'Governance & Security', SEC, ['qr gate scanner', 'qr scanner', 'gate scanner', 'কিউআর স্ক্যানার', 'क्यूआर स्कैनर'], ['qr scanner', 'qr gate scanner']],
  ['appStore', 'Plan & Add-ons', 6, 'Governance & Security', GOV, ['app store', 'add-ons', 'addons', 'plan', 'plans', 'upgrade', 'billing', 'subscription', 'অ্যাপ স্টোর', 'ऐप स्टोर', 'পরিকল্পনা', 'योजना'], ['plan & add-ons', 'app store', 'plans', 'subscription']],
  ['workspace-hub', 'Workspace Hub', 6, 'Governance & Security', GOV, ['workspace hub', 'switch workspace', 'workspace switcher', 'ওয়ার্কস্পেস হাব', 'कार्यक्षेत्र हब'], ['workspace hub', 'workspace-hub']],
  ['masterSettings', 'Organization Settings & Logos', 6, 'Governance & Security', GOV, ['organization settings', 'org settings', 'organisation settings', 'settings', 'logos', 'সংগঠন সেটিংস', 'संगठन सेटिंग'], ['master settings', 'organization settings & logos']],
  ['spiritualSettings', 'Sampradaya & Kuladevata Config', 6, 'Governance & Security', GOV, ['sampradaya config', 'kuladevata config', 'sampradaya', 'সাম্প্রদায় সেটিং', 'संप्रदाय सेटिंग'], ['spiritual settings', 'sampradaya & kuladevata config']],
  ['crisis-command', 'Crisis Command Center', 6, 'Governance & Security', SEC, ['crisis command', 'crisis center', 'crisis command center', 'সংকট কমান্ড', 'संकट कमांड'], ['crisis command', 'crisis command center']],
  ['tactical-radar', 'Tactical Perimeter Radar', 6, 'Governance & Security', SEC, ['tactical radar', 'perimeter radar', 'radar', 'রাডার', 'रडार'], ['tactical radar', 'tactical perimeter radar']],
  ['sadhana-karma', 'Sadhana & Japa Counters', 7, 'Sanatani Life & Connect', STAFF, ['sadhana counters', 'japa counters', 'sadhana', 'সাধনা কাউন্টার', 'साधना काउंटर'], ['sadhana-karma', 'sadhana & japa counters']],
  ['sanatani-vivah', 'Sanatani Vivah Portal', 7, 'Sanatani Life & Connect', STAFF, ['vivah', 'vivah portal', 'marriage portal', 'বিবাহ পোর্টাল', 'विवाह पोर्टल'], ['sanatani vivah', 'sanatani vivah portal']],
  ['yatraNet', 'YatraNet Offline Mesh (P2P)', 7, 'Sanatani Life & Connect', STAFF, ['yatranet', 'offline mesh', 'p2p mesh', 'অফলাইন মেশ', 'ऑफ़लाइन मेश'], ['yatranet', 'yatranet offline mesh (p2p)']],
];

const DESK_ENTRIES: LocatorEntry[] = DESK_ROWS.map((r) => D(...r));

/* ------------------------------------------------------------------ */
/* Nested features — NOT standalone desks. Each names its parent      */
/* desk (traced in NOTES.md) and inherits the parent's visibility.    */
/* ------------------------------------------------------------------ */

const NESTED_ENTRIES: LocatorEntry[] = [
  {
    id: 'loc.bahi-khata',
    kind: 'nested',
    deskId: 'treasury',
    domain: 2,
    name: { en: 'Bahi-Khata Seva', hi: 'Bahi-Khata Seva', bn: 'Bahi-Khata Seva' },
    aliases: [
      'bahi-khata', 'bahi khata', 'bahikhata',
      'বহি খাতা', 'বহিখাতা', 'बही खाता', 'बहीखाता',
      'paper register', 'paper register digitisation', 'register digitisation',
      'register digitization', 'digitise the register', 'digitize the register',
      'কাগজের খাতা', 'কাগজের রেজিস্টার', 'कागज़ खाता', 'कागजी रजिस्टर',
      'dan khata', 'দান খাতা', 'दान खाता', 'khata scan', 'scan the register',
      'photo the page',
    ],
    primary: ['bahi-khata', 'বহিখাতা', 'बहीखाता', 'bahikhata'],
    place: {
      en: 'lives inside the **Treasury & Expense Ledger** desk — open Treasury and tap the 📖 Bahi-Khata Seva door. The app reads the paper page, you check every word, and nothing becomes real until a Trustee approves it',
      hi: '**Treasury & Expense Ledger** डेस्क के अंदर है — Treasury खोलें और 📖 Bahi-Khata Seva द्वार दबाएँ। ऐप कागज़ का पृष्ठ पढ़ता है, आप हर शब्द जाँचते हैं, और ट्रस्टी के अनुमोदन के बिना कुछ भी वास्तविक नहीं बनता',
      bn: '**Treasury & Expense Ledger** ডেস্কের ভিতরে আছে — Treasury খুলে 📖 Bahi-Khata Seva দরজাটি চাপুন। অ্যাপ কাগজের পাতা পড়ে, আপনি প্রতিটি শব্দ যাচাই করেন, এবং ট্রাস্টির অনুমোদন ছাড়া কিছুই বাস্তব হয় না',
    },
    usedBy: FIN,
  },
  {
    id: 'loc.voice-entry',
    kind: 'nested',
    deskId: 'treasury',
    domain: 2,
    name: { en: 'Voice Entry (Speak it)', hi: 'Voice Entry (Speak it)', bn: 'Voice Entry (Speak it)' },
    aliases: [
      'voice entry', 'speak it', 'voice se entry', 'মুখে বলা এন্ট্রি',
      'বলে লিখুন', 'मुँह से लिखें', 'बोलकर लिखें', 'speak entry',
    ],
    primary: ['voice entry', 'speak it'],
    place: {
      en: 'lives inside Bahi-Khata, in the **Treasury & Expense Ledger** desk — open Treasury → 📖 Bahi-Khata Seva → 🎙️ Speak it. You check every word before anything is saved',
      hi: 'Bahi-Khata के अंदर है, **Treasury & Expense Ledger** डेस्क में — Treasury → 📖 Bahi-Khata Seva → 🎙️ Speak it खोलें। सहेजने से पहले आप हर शब्द जाँचते हैं',
      bn: 'Bahi-Khata-র ভিতরে আছে, **Treasury & Expense Ledger** ডেস্কে — Treasury → 📖 Bahi-Khata Seva → 🎙️ Speak it খুলুন। সংরক্ষণের আগে আপনি প্রতিটি শব্দ যাচাই করেন',
    },
    usedBy: FIN,
  },
  {
    id: 'loc.pending-approvals',
    kind: 'nested',
    deskId: 'treasury',
    domain: 2,
    name: { en: 'Pending Approvals', hi: 'Pending Approvals', bn: 'Pending Approvals' },
    aliases: [
      'pending approvals', 'approvals panel', 'approval queue', 'approvals',
      'maker checker', 'maker-checker', 'অনুমোদনের অপেক্ষায়', 'লंबित अनुमोदन',
      'approve payouts', 'approval requests',
    ],
    primary: ['pending approvals', 'approvals panel'],
    place: {
      en: 'wait in the Approvals panel inside the **Treasury & Expense Ledger** desk (role-grant requests also appear in the Membership desk) — nothing above the limit moves until a second person approves it',
      hi: 'Approvals पैनल में प्रतीक्षा करते हैं, **Treasury & Expense Ledger** डेस्क के अंदर (भूमिका-अनुदान अनुरोध Membership डेस्क में भी दिखते हैं) — सीमा से ऊपर कुछ भी दूसरे व्यक्ति के अनुमोदन के बिना नहीं चलता',
      bn: 'Approvals প্যানেলে অপেক্ষা করে, **Treasury & Expense Ledger** ডেস্কের ভিতরে (ভূমিকা-প্রদানের অনুরোধ Membership ডেস্কেও দেখা যায়) — সীমার উপরে কিছুই দ্বিতীয় ব্যক্তির অনুমোদন ছাড়া নড়ে না',
    },
    usedBy: FIN,
  },
  {
    id: 'loc.published-accounts',
    kind: 'nested',
    deskId: 'legalVault',
    domain: 6,
    name: {
      en: 'Published Accounts (Transparency Board)',
      hi: 'Published Accounts (Transparency Board)',
      bn: 'Published Accounts (Transparency Board)',
    },
    aliases: [
      'published accounts', 'transparency board', 'transparency', 'public accounts',
      'প্রকাশিত হিসাব', 'प्रकाशित खाते', 'accounts board', 'transparency accounts',
    ],
    primary: ['published accounts', 'transparency board'],
    place: {
      en: 'are published from the **Security & Audit Log** desk (the Published Accounts panel) — and everyone can read the board on the organisation’s public page',
      hi: '**Security & Audit Log** डेस्क से प्रकाशित होते हैं (Published Accounts पैनल) — और हर कोई संगठन के सार्वजनिक पृष्ठ पर बोर्ड पढ़ सकता है',
      bn: '**Security & Audit Log** ডেস্ক থেকে প্রকাশিত হয় (Published Accounts প্যানেল) — এবং সবাই সংগঠনের সর্বজনীন পৃষ্ঠায় বোর্ডটি পড়তে পারে',
    },
    usedBy: AUD,
  },
  {
    id: 'loc.practice-mode',
    kind: 'nested',
    deskId: 'masterSettings',
    domain: 6,
    name: { en: 'Practice Mode', hi: 'Practice Mode', bn: 'Practice Mode' },
    aliases: [
      'practice mode', 'practise mode', 'practice', 'demo mode',
      'অনুশীলন মোড', 'अभ्यास मोड', 'practice workspace', 'প্র্যাক্টিস মোড', 'प्रैक्टिस मोड',
    ],
    primary: ['practice mode', 'practise mode'],
    place: {
      en: 'is switched on in **Organization Settings & Logos** — the Practice Mode card. While it is on, a Practice banner stays at the top and nothing entered is real',
      hi: '**Organization Settings & Logos** में चालू होता है — Practice Mode कार्ड। जब यह चालू रहता है, ऊपर Practice बैनर रहता है और दर्ज कुछ भी वास्तविक नहीं होता',
      bn: '**Organization Settings & Logos**-এ চালু হয় — Practice Mode কার্ড। এটি চালু থাকলে উপরে Practice ব্যানার থাকে এবং লেখা কিছুই বাস্তব নয়',
    },
    usedBy: GOV,
  },
  {
    id: 'loc.access-review',
    kind: 'nested',
    deskId: 'masterSettings',
    domain: 6,
    name: { en: 'Access Review', hi: 'Access Review', bn: 'Access Review' },
    aliases: [
      'access review', 'who has access', 'access check', 'permissions review',
      'অ্যাক্সেস রিভিউ', 'एक्सेस रिव्यू', 'review access',
    ],
    primary: ['access review'],
    place: {
      en: 'is a card in **Organization Settings & Logos** — it shows who can see the money, whose access never expires, and whose role is about to lapse',
      hi: '**Organization Settings & Logos** में एक कार्ड है — यह दिखाता है कि पैसा कौन देख सकता है, किसकी पहुँच कभी समाप्त नहीं होती, और किसकी भूमिका समाप्त होने वाली है',
      bn: '**Organization Settings & Logos**-এ একটি কার্ড — এটি দেখায় কে টাকা দেখতে পারে, কার প্রবেশাধিকার কখনো শেষ হয় না, এবং কার ভূমিকা শেষ হতে চলেছে',
    },
    usedBy: GOV,
  },
  {
    id: 'loc.festival-journey',
    kind: 'nested',
    deskId: 'dashboard',
    domain: 1,
    name: { en: 'Festival Journey', hi: 'Festival Journey', bn: 'Festival Journey' },
    aliases: [
      'festival journey', 'utsav journey', 'festival checklist', 'festival path',
      'উৎসব যাত্রা', 'उत्सव यात्रा',
    ],
    primary: ['festival journey', 'utsav journey'],
    place: {
      en: 'is on the **Command Center** (the org home), just under the daily Shloka card — a step-by-step path from planning the festival to publishing its accounts',
      hi: '**Command Center** (संगठन मुखपृष्ठ) पर है, दैनिक श्लोक कार्ड के ठीक नीचे — उत्सव की योजना से उसके हिसाब प्रकाशित करने तक का क्रमबद्ध मार्ग',
      bn: '**Command Center**-এ (সংগঠনের হোম) আছে, দৈনিক শ্লোক কার্ডের ঠিক নিচে — উৎসবের পরিকল্পনা থেকে তার হিসাব প্রকাশ পর্যন্ত ধাপে ধাপে পথ',
    },
    usedBy: STAFF,
  },
];

/* ------------------------------------------------------------------ */
/* Solo-shell + public features org users also ask for. These are     */
/* the caller's OWN surfaces — no org scope gates them.               */
/* ------------------------------------------------------------------ */

const SOLO_PUBLIC_ENTRIES: LocatorEntry[] = [
  {
    id: 'loc.suchana-controls',
    kind: 'solo',
    route: '/app/suchana',
    name: {
      en: 'Suchana Controls (Notification Settings)',
      hi: 'Suchana Controls (Notification Settings)',
      bn: 'Suchana Controls (Notification Settings)',
    },
    aliases: [
      'suchana controls', 'notification settings', 'notification controls',
      'suchana settings', 'সূচনা সেটিংস', 'सूचना सेटिंग', 'daily limit', 'সূচনা নিয়ন্ত্রণ', 'सूचना नियंत्रण',
      'quiet hours', 'notification limit',
    ],
    primary: ['suchana controls', 'notification settings'],
    place: {
      en: 'are in your **Suchana** tab — tap the ⚙ Notification settings button. Every kind of Suchana has its own switch, a daily limit, and quiet hours; SOS always stays on',
      hi: 'आपके **Suchana** टैब में हैं — ⚙ Notification settings बटन दबाएँ। हर प्रकार की सूचना का अपना स्विच, दैनिक सीमा और शांत समय है; SOS हमेशा चालू रहता है',
      bn: 'আপনার **Suchana** ট্যাবে আছে — ⚙ Notification settings বোতামটি চাপুন। প্রতিটি ধরনের সূচনার নিজস্ব সুইচ, দৈনিক সীমা ও নীরব সময় আছে; SOS সবসময় চালু থাকে',
    },
    usedBy: STAFF,
  },
  {
    id: 'loc.privacy-notice',
    kind: 'solo',
    route: '/app/profile',
    name: {
      en: 'Privacy Notice',
      hi: 'Privacy Notice',
      bn: 'Privacy Notice',
    },
    aliases: [
      'privacy notice', 'privacy', 'privacy policy',
      'গোপনীয়তা বিজ্ঞপ্তি', 'गोपनीयता सूचना',
    ],
    primary: ['privacy notice'],
    place: {
      en: 'is in your **Profile** tab — the Privacy Notice card (in an organisation it also lives in Organization Settings). It says, in your own language, what is kept, where it lives, and what is never public',
      hi: 'आपके **Profile** टैब में है — Privacy Notice कार्ड (संगठन में यह Organization Settings में भी रहता है)। यह आपकी अपनी भाषा में बताता है कि क्या रखा जाता है, कहाँ रहता है, और क्या कभी सार्वजनिक नहीं होता',
      bn: 'আপনার **Profile** ট্যাবে আছে — Privacy Notice কার্ড (সংগঠনে এটি Organization Settings-এও থাকে)। এটি আপনার নিজের ভাষায় বলে কী রাখা হয়, কোথায় থাকে, এবং কী কখনো সর্বজনীন হয় না',
    },
    usedBy: STAFF,
  },
  {
    id: 'loc.ask-ai',
    kind: 'public',
    route: '/ask-ai',
    name: { en: 'Ask AI Page', hi: 'Ask AI Page', bn: 'Ask AI Page' },
    aliases: [
      'ask ai', 'ask any ai', 'ask-ai', 'ai page', 'এআই পেজ', 'एआई पेज',
    ],
    primary: ['ask ai', 'ask-ai'],
    place: {
      en: 'is the public **Ask AI** page — open “Ask any AI” from the Contact page, or go straight to /ask-ai',
      hi: 'सार्वजनिक **Ask AI** पृष्ठ है — Contact पृष्ठ से “Ask any AI” खोलें, या सीधे /ask-ai पर जाएँ',
      bn: 'সর্বজনীন **Ask AI** পৃষ্ঠা — Contact পৃষ্ঠা থেকে "Ask any AI" খুলুন, অথবা সরাসরি /ask-ai-এ যান',
    },
    usedBy: STAFF,
  },
];

/** The whole map: catalog desks + nested + solo/public. */
export const LOCATOR_MAP: LocatorEntry[] = [
  ...DESK_ENTRIES,
  ...NESTED_ENTRIES,
  ...SOLO_PUBLIC_ENTRIES,
];

export function getLocatorEntry(id: string): LocatorEntry | undefined {
  return LOCATOR_MAP.find((e) => e.id === id);
}

export function locatorMapSize(): number {
  return LOCATOR_MAP.length;
}

/* ------------------------------------------------------------------ */
/* Draft-language resolution (Locator/Howto completion batch).        */
/* For en/hi/bn these return the entry's own TriText fields —         */
/* byte-identical to the old langOf() pick. For a draft language the  */
/* catalogue overlay wins when it authors the field; anything the     */
/* overlay does not author falls back to the English TriText field,   */
/* exactly as before the batch.                                       */
/* ------------------------------------------------------------------ */

function triOf(lang: string): LocatorLang {
  const l = (lang || 'en').toLowerCase();
  return l === 'hi' || l === 'bn' ? l : 'en';
}

export function entryNameFor(entry: LocatorEntry, lang: string): string {
  const o = locatorEntryOverlay(lang, entry.id);
  if (o && o.name) return o.name;
  return entry.name[triOf(lang)];
}

export function entryPlaceFor(entry: LocatorEntry, lang: string): string {
  const cat = locatorCatalogOverlay(lang);
  if (cat) {
    if (entry.kind === 'desk' && entry.domain != null) {
      const title = cat.domains[String(entry.domain)];
      if (title && cat.placeTemplate) {
        return cat.placeTemplate.replace('{domain}', title);
      }
    }
    const o = cat.entries[entry.id];
    if (o && o.place) return o.place;
  }
  return entry.place[triOf(lang)];
}

export function entryUsedByFor(entry: LocatorEntry, lang: string): string {
  const cat = locatorCatalogOverlay(lang);
  if (cat) {
    const key = usedByKeyOf(entry.usedBy);
    const v = key ? cat.usedBy[key] : undefined;
    if (v) return v;
  }
  return entry.usedBy[triOf(lang)];
}

/* ------------------------------------------------------------------ */
/* Matcher — same scoring family as navigation.ts, with a primary-    */
/* name bonus so one distinctive word ("তহবিল", "বহিখাতা") suffices.   */
/* ------------------------------------------------------------------ */

export type LocatorConfidence = 'high' | 'medium' | 'low' | 'none';

export interface LocatorMatch {
  best: LocatorEntry | null;
  confidence: LocatorConfidence;
  evidence: string[];
  /** When 2+ entries tie at the top: the candidates to clarify
   *  between (best first). Empty when the match is unambiguous. */
  ambiguous: LocatorEntry[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Hyphens/underscores fold to spaces so "bahi-khata" == "bahi khata"
 *  in the question AND in the aliases. */
export function normaliseLocatorText(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hit(text: string, pat: string): boolean {
  return new RegExp(`(?<!\\p{L})${escapeRegExp(pat)}(?!\\p{L})`, 'u').test(text);
}

/**
 * Hindi vocabulary guard for the draft overlays. Marathi and Sanskrit
 * share Devanagari with Hindi, so a single-word mr/sa overlay pattern
 * that is ALSO a Hindi word (तीर्थ, धर्म, मंदिर…) cannot tell a Hindi
 * question from a Marathi/Sanskrit one — and Hindi questions already
 * belong to the base pools and the navigation corpus (a Hindi "तीर्थ
 * डायरी कहाँ है?" is the Solo diary, NOT the Tirth One org desk; the
 * chipRouting pin caught exactly that steal). Such words are skipped
 * in overlay pools: the base hi fields already cover them for the
 * entries they belong to. Genuinely Marathi/Sanskrit words (खजिना,
 * कोषागारम्) are not Hindi tokens, so they still fire — and the five
 * unique-script overlays (ta/te/gu/kn/ml) can never collide with
 * Hindi at all. The vocabulary is the app's own: every Devanagari
 * token in the locator map's hi fields and the navigation corpus's
 * patterns.
 */
const HINDI_VOCAB: Set<string> = (() => {
  const out = new Set<string>();
  const eat = (s: string) => {
    for (const tok of normaliseLocatorText(s).split(' ')) {
      if (tok && /[ऀ-ॿ]/.test(tok)) out.add(tok);
    }
  };
  for (const e of LOCATOR_MAP) {
    eat(e.name.hi);
    for (const a of e.aliases) eat(a);
    for (const p of e.primary) eat(p);
  }
  for (const n of NAVIGATION_CORPUS) for (const p of n.patterns) eat(p);
  return out;
})();

const DEVANAGARI_RE = /[ऀ-ॿ]/;

function scoreEntry(
  entry: LocatorEntry,
  text: string
): { score: number; evidence: string[] } {
  let score = 0;
  const evidence: string[] = [];
  const primary = new Set(entry.primary.map(normaliseLocatorText));
  const seen = new Set<string>();
  const pools: Array<{ pats: string[]; isPrimaryPool: boolean; isOverlay?: boolean }> = [
    { pats: entry.primary, isPrimaryPool: true },
    { pats: entry.aliases, isPrimaryPool: false },
    // The feature's own name is always matchable. The desk id joins
    // the pool ONLY for desk entries — for a nested entry the deskId
    // is the PARENT's, and the parent desk entry owns that token
    // ("treasury" must not tie Bahi-Khata against the Treasury desk).
    {
      pats: [entry.name.en, entry.kind === 'desk' ? entry.deskId ?? '' : ''],
      isPrimaryPool: true,
    },
    // Draft-language overlays: the entry's name-forms score as primary
    // and its concept aliases join the alias pool — unioned across all
    // 7 draft languages, language-agnostic like overlayKeywords. This
    // is what lets a native-script question ("તિજોરી ક્યાં છે?") match
    // at all. One exception, the Hindi-vocabulary guard (HINDI_VOCAB
    // above): a single Devanagari overlay word that is also a Hindi
    // word is skipped — it cannot distinguish a Hindi question, and
    // Hindi questions belong to the base pools / navigation corpus.
    ...allLocatorEntryOverlays(entry.id).map((o) => ({
      pats: [...o.primary, o.name],
      isPrimaryPool: true,
      isOverlay: true,
    })),
    ...allLocatorEntryOverlays(entry.id).map((o) => ({
      pats: o.aliases,
      isPrimaryPool: false,
      isOverlay: true,
    })),
  ];
  for (const { pats, isPrimaryPool, isOverlay } of pools) {
    for (const raw of pats) {
      const pat = normaliseLocatorText(raw);
      if (!pat || seen.has(pat)) continue;
      seen.add(pat);
      if (
        isOverlay &&
        !pat.includes(' ') &&
        DEVANAGARI_RE.test(pat) &&
        HINDI_VOCAB.has(pat)
      ) {
        continue;
      }
      if (!hit(text, pat)) continue;
      const isPhrase = pat.includes(' ');
      let pts = isPhrase ? 4 : 2;
      if (isPrimaryPool || primary.has(pat)) pts += 2;
      // A single word in Bengali/Devanagari script is a whole
      // concept ("তহবিল", "कोष") — as distinctive as a name, unlike
      // a Latin word ("store", "school") which stays a weak signal.
      if (!isPhrase && /[^\x00-\x7F]/.test(pat)) pts += 2;
      score += pts;
      evidence.push(raw);
    }
  }
  return { score, evidence };
}

function confidenceFor(score: number): LocatorConfidence {
  if (score >= 6) return 'high';
  if (score >= 4) return 'medium';
  if (score >= 2) return 'low';
  return 'none';
}

/**
 * Find the best locator entry for the input. Ambiguity law: when a
 * second entry scores within 1 point of the best (and both clear
 * the navigable bar), the match is ambiguous — the executor asks
 * ONE clarifying question listing the candidates, never guesses.
 */
export function matchLocator(input: string): LocatorMatch {
  const text = normaliseLocatorText(input);
  if (!text) return { best: null, confidence: 'none', evidence: [], ambiguous: [] };

  const scored = LOCATOR_MAP.map((entry) => ({
    entry,
    ...scoreEntry(entry, text),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { best: null, confidence: 'none', evidence: [], ambiguous: [] };
  }
  const top = scored[0];
  const confidence = confidenceFor(top.score);
  let ambiguous: LocatorEntry[] = [];
  if (confidence === 'high' || confidence === 'medium') {
    const tied = scored.filter(
      (s) => s.score >= 4 && s.score >= top.score - 1
    );
    if (tied.length >= 2) ambiguous = tied.slice(0, 3).map((s) => s.entry);
  } else if (
    scored.length >= 2 &&
    scored[1].score === top.score &&
    top.score >= 2
  ) {
    // Weak but EXACTLY tied evidence for two features — asking is
    // more honest than the dontKnow fallback.
    ambiguous = scored
      .filter((s) => s.score === top.score)
      .slice(0, 3)
      .map((s) => s.entry);
  }
  return {
    best: top.entry,
    confidence,
    evidence: top.evidence,
    ambiguous,
  };
}

/** True when the match is strong enough to answer directly. */
export function isLocatable(match: LocatorMatch): boolean {
  return (
    !!match.best &&
    (match.confidence === 'high' || match.confidence === 'medium')
  );
}

/* ------------------------------------------------------------------ */
/* Trigger — "where is…" (navigation.ts) + "how do I reach…"          */
/* ------------------------------------------------------------------ */

const REACH_PATTERNS = [
  'how do i reach', 'how to reach', 'how do i get to', 'how can i reach',
  'কীভাবে যাব', 'কিভাবে যাব', 'কেমনে যাব', 'কীভাবে পৌঁছাব', 'কিভাবে পৌঁছাব',
  'कैसे पहुँच', 'कैसे पहुंच', 'कैसे जाऊँ', 'कैसे जाऊं', 'कैसे जाएँ',
  'kaise pahunche', 'kaise jaye', 'kivabe jabo', 'kemone jabo',
];

export function isLocatorQuestion(input: string): boolean {
  if (isWhereQuestion(input)) return true;
  const text = normaliseLocatorText(input);
  if (!text) return false;
  if (REACH_PATTERNS.some((p) => hit(text, normaliseLocatorText(p)))) return true;
  // Draft-language interrogatives (catalogue overlays' `where` lists,
  // unioned): without these a native-script "where is…?" never reached
  // the locator chance in the router at all.
  return overlayWherePatterns().some((p) => hit(text, normaliseLocatorText(p)));
}

/* ------------------------------------------------------------------ */
/* Scope law — may THIS caller open this entry's desk?                */
/*                                                                     */
/* The checkPermission shim replicates AuthWorkspaceContext's        */
/* checkPermission() for the caller's ONE effective role: SuperAdmin */
/* passes; ROLE_MIGRATION_MAP normalises the asked role (MANAGER →   */
/* Sevadar is the app's own collapse); a Trustee inherits the        */
/* operational roles. Fed into lib/deskVisibility — the ONE          */
/* visibility layer the Sidebar and Command Palette consume — with   */
/* the caller's Blueprint B desk scope as the narrowing attribute.    */
/* The locator therefore never promises a desk the app would hide.   */
/* ------------------------------------------------------------------ */

export function locatorPermissionCheck(scope: CallerScope): PermissionCheck {
  const eff = scope.workspaceRole;
  return (allowedRoles) => {
    if (eff === 'SuperAdmin') return true;
    return allowedRoles.some((allowed) => {
      const normalized = ROLE_MIGRATION_MAP[allowed] || allowed;
      if (normalized === eff || allowed === eff) return true;
      if (
        eff === 'Trustee' &&
        ['Priest', 'Accountant', 'Sevadar', 'Devotee', 'CSO'].includes(normalized)
      ) {
        return true;
      }
      return false;
    });
  };
}

/**
 * May the caller open this entry? Solo/public entries are the
 * caller's own surfaces — always openable. Desk/nested entries go
 * through the ONE visibility layer with role + desk scope.
 */
export function canOpenEntry(entry: LocatorEntry, scope: CallerScope): boolean {
  if (entry.kind === 'solo' || entry.kind === 'public') return true;
  if (!entry.deskId || entry.domain == null) return false;
  return isDeskVisibleForRole(
    { id: entry.deskId, domain: entry.domain },
    scope.workspaceRole,
    locatorPermissionCheck(scope),
    { deskScope: scope.deskScope }
  );
}
