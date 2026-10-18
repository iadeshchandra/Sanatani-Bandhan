/**
 * Sanatani Bandhan — AI Assistant Phase 0 · intent definitions + router
 * =====================================================================
 * Deterministic keyword router (EN / HI / BN + common transliterations).
 *
 * The router is deliberately behind the `IntentRouter` interface: a future
 * embedding/semantic router can REPLACE `routeIntent` without touching a
 * single executor — executors only ever see `RouteResult`.
 *
 * Routing is priority-ordered (first match wins). Crisis scanning happens
 * BEFORE this router, inside assistant.ts — see crisisKeywords.ts.
 */

import type { IntentId, LangCode } from './types';
import { matchDharma } from './dharma';

export interface IntentDef {
  id: IntentId;
  description: string;
}

export const INTENTS: IntentDef[] = [
  { id: 'navigate', description: 'Open a screen or section of the app' },
  { id: 'howto', description: 'Guide for using a module (deep-links to module guides)' },
  { id: 'tithi_today', description: "Today's tithi from the Drik panjika engine" },
  { id: 'festival_next', description: 'Upcoming festivals / next Ekadashi' },
  { id: 'dana_help', description: 'How to give dana via the express dana sheet' },
  { id: 'sadhana_summary', description: "Summary of the devotee's own japa/vrata/sankalpa records" },
  { id: 'booking_help', description: 'How to book a Purohit or Jyotishi on Seva Pro' },
  { id: 'language_help', description: 'How to change the app language' },
  { id: 'sos_help', description: 'Explains the SOS flow (does NOT trigger SOS)' },
  { id: 'voice_upgrade', description: 'Get the warmer on-device AI voice (Settings card)' },
  { id: 'dharma_question', description: 'Answer from the restricted Dharma corpus (or escalate to Purohitji)' },
  { id: 'greeting', description: 'Warm greeting + capability menu' },
  { id: 'fallback_unknown', description: 'Warm honesty for anything unanswerable' },
];

export interface RouteResult {
  intent: IntentId;
  confidence: 'high' | 'medium' | 'low';
  /** Slots captured from the input, e.g. { destination: 'profile' }. */
  slots: Record<string, string>;
  /** The keywords/phrases that fired, for debuggability. */
  evidence: string[];
}

/**
 * Swappable router contract. The deterministic implementation below is the
 * Phase-0 default; a Phase-1 embedding router would implement this same
 * interface and be injected into `ask()` instead.
 */
export interface IntentRouter {
  route(input: string, lang: LangCode): RouteResult;
}

interface Rule {
  intent: IntentId;
  confidence: 'high' | 'medium' | 'low';
  keywords: string[];
  /** Optional slot extractor — first regex with a named hit wins. */
  slots?: Array<{ re: RegExp; name: string }>;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRuleMatcher(rule: Rule) {
  const res = rule.keywords.map(
    (kw) => new RegExp(`(?<!\\p{L})${escapeRegExp(kw.toLowerCase())}(?!\\p{L})`, 'u')
  );
  return { rule, res };
}

/* ------------------------------------------------------------------ */
/* Keyword tables (lowercased at match time). Transliterations included */
/* because devotees often type Sanskrit terms in Latin script.         */
/* ------------------------------------------------------------------ */

const TITHI_KW = [
  'tithi', "today's tithi", 'todays tithi', 'aaj ki tithi', 'ajker tithi',
  'आज तिथि', 'আজ তিথি', 'আজকের তিথি', 'what tithi', 'which tithi',
  'kon tithi', 'kaun si tithi',
];

const FESTIVAL_KW = [
  'festival', 'festivals', 'upcoming festival', 'next festival',
  'utsav', 'parva', 'parv', 'tyohar', 'त्योहार', 'उत्सव', 'আগামী উৎসব',
  'উৎসব', 'পর্ব', 'ekadashi', 'एकादशी', 'একাদশী', 'purnima', 'amavasya',
  'पूर्णिमा', 'अमावस्या', 'পূর্ণিমা', 'অমাবস্যা', 'when is diwali', 'diwali kab',
];

const DANA_KW = [
  'dana', 'daan', 'donate', 'donation', 'donations', 'give', 'giving',
  'how to donate', 'how do i donate', 'make a donation', 'दाना', 'दान',
  'দান', 'ডোনেট', 'dakshina', 'dakshina dena', 'chanda', 'how to give',
];

const SADHANA_KW = [
  'sadhana', 'japa', 'jaap', 'mala', 'streak', 'my japa', 'japa count',
  'साधना', 'जप', 'মালা', 'সাধনা', 'জপ', 'vrata', 'vrat', 'व्रत', 'ব্রত',
  'sankalpa', 'संकल्प', 'সংকল্প', 'my sadhana',
];

const BOOKING_VERB_KW = [
  'book a', 'booking', 'book purohit', 'book jyotish', 'appointment',
  'consultation', 'consult', 'বুকিং', 'बुकिंग', 'बुक कर', 'বুক কর',
  'how to book', 'find a purohit', 'find purohit', 'find a jyotishi',
  'need a purohit', 'need a pandit',
];

const LANGUAGE_KW = [
  'language', 'change language', 'switch language', 'bhasha',
  'ভাষা', 'भाषा', 'bhasha change', 'in hindi', 'in bengali', 'in bangla',
  'hindi me', 'hindi mein', 'bangla te', 'বাংলায়', 'हिंदी में',
  'english me', 'tamil', 'telugu', 'marathi', 'gujarati', 'kannada',
  'malayalam', 'sanskrit',
];

const SOS_HELP_KW = [
  'what is sos', 'how does sos work', 'how to use sos', 'sos button',
  'panic button', 'emergency button', 'how sos', 'sos kaise',
  'এসওএস', 'एसओएस', 'sos feature', 'about sos',
];

const VOICE_UPGRADE_KW = [
  'warmer voice', 'warm voice', 'warm up your voice', 'on-device ai',
  'on device ai', 'offline ai', 'ai voice', 'download the ai',
  'ai download', 'download ai voice', 'voice download', 'voice upgrade',
  'upgrade the assistant', 'smarter assistant', 'ai ta download korte chai',
  'ভয়েস ডাউনলোড', 'এআই ডাউনলোড', 'ভয়েস ডাউনলোড করতে চাই', 'উষ্ণ কণ্ঠ',
  'आवाज़ डाउनलोड', 'एआई डाउनलोड', 'उष्ण वाणी', 'ai download karo',
  'aawaz download',
];

const NAVIGATE_KW = [
  'open', 'go to', 'take me to', 'show me', 'navigate', 'launch',
  'खोलो', 'खोलें', 'जाओ', 'খোলো', 'খুলুন', 'যাও',
];

const HOWTO_KW = [
  'how to', 'how do i', 'how can i', 'guide', 'tutorial', 'kaise',
  'कैसे', 'কীভাবে', 'কিভাবে', 'কেমনে', 'steps to', 'sikh',
];

const GREETING_KW = [
  'namaste', 'namaskar', 'hello', 'hey', 'hi', 'jai shri', 'jai shree',
  'radhe radhe', 'radhe', 'good morning', 'good evening', 'good afternoon',
  'pranam', 'प्रणाम', 'নমস্কার', '🙏', 'hare krishna', 'om namah',
  'suprabhat', 'shubh prabhat', 'sat sri akal',
];

/** Destination keyword → route path. Keep in sync with ARCHITECTURE.md §4. */
const DESTINATION_MAP: Array<{ keywords: string[]; path: string; label: string }> = [
  { keywords: ['home', 'होम', 'হোম', 'dashboard'], path: '/app/home', label: 'Home' },
  { keywords: ['orgs', 'organisations', 'organizations', 'my orgs', 'my organisations'], path: '/app/orgs', label: 'My Organisations' },
  { keywords: ['suchana', 'notifications', 'notification', 'सूचना', 'সূচনা'], path: '/app/suchana', label: 'Suchana' },
  { keywords: ['profile', 'my profile', 'प्रोफ़ाइल', 'প্রোফাইল', 'account'], path: '/app/profile', label: 'Profile' },
  { keywords: ['get app', 'getapp', 'install app', 'download app', 'install', 'app download'], path: '/get-app', label: 'Get the app' },
  { keywords: ['contact', 'support', 'helpdesk', 'contact us'], path: '/contact', label: 'Contact' },
  { keywords: ['seva journeys', 'life events', 'seva catalog'], path: '/seva/journeys', label: 'Seva Journeys' },
];

/** Module keyword → module guide id (see src/lib/moduleGuides.ts). */
const GUIDE_KEYWORD_MAP: Array<{ keywords: string[]; guideId: string }> = [
  { keywords: ['treasury', 'hundi', 'treasury guide', 'कोष', 'তহবিল'], guideId: 'treasury' },
  { keywords: ['wallet', 'वॉलेट', 'ওয়ালেট'], guideId: 'wallet' },
  { keywords: ['panjika', 'panchang', 'पंचांग', 'পঞ্জিকা'], guideId: 'panjika' },
  { keywords: ['samskara', 'samskar', 'संस्कार', 'সংস্কার'], guideId: 'samskara' },
  { keywords: ['pathshala', 'school', 'पाठशाला', 'পাঠশালা'], guideId: 'pathshala' },
  { keywords: ['goshala', 'gaushala', 'गोशाला', 'গোশালা', 'cow shelter'], guideId: 'goshala' },
  { keywords: ['matha', 'मठ', 'মঠ', 'sangha'], guideId: 'matha' },
  { keywords: ['sangam'], guideId: 'sangam' },
  { keywords: ['jyotish', 'jyotishi', 'ज्योतिष', 'জ্যোতিষ'], guideId: 'jyotish' },
  { keywords: ['purohit', 'pandit', 'panda', 'पुरोहित', 'পুরোহিত', 'पंडित'], guideId: 'purohit' },
  { keywords: ['marketplace', 'seva pro', 'gig'], guideId: 'marketplace' },
  { keywords: ['chat', 'चैट', 'চ্যাট', 'messaging'], guideId: 'chat' },
  { keywords: ['p2p', 'money request', 'iou'], guideId: 'p2p-requests' },
  { keywords: ['qr'], guideId: 'p2p-qr' },
  { keywords: ['event', 'utsav planning'], guideId: 'events' },
  { keywords: ['devotee'], guideId: 'devotees' },
  { keywords: ['inventory', 'bhandar'], guideId: 'inventory' },
];

const RULES: Rule[] = [
  { intent: 'tithi_today', confidence: 'high', keywords: TITHI_KW },
  { intent: 'festival_next', confidence: 'high', keywords: FESTIVAL_KW },
  { intent: 'dana_help', confidence: 'high', keywords: DANA_KW },
  { intent: 'sadhana_summary', confidence: 'high', keywords: SADHANA_KW },
  { intent: 'booking_help', confidence: 'high', keywords: BOOKING_VERB_KW },
  { intent: 'language_help', confidence: 'high', keywords: LANGUAGE_KW },
  { intent: 'sos_help', confidence: 'high', keywords: SOS_HELP_KW },
  { intent: 'voice_upgrade', confidence: 'high', keywords: VOICE_UPGRADE_KW },
  { intent: 'navigate', confidence: 'medium', keywords: NAVIGATE_KW },
  { intent: 'howto', confidence: 'medium', keywords: HOWTO_KW },
  { intent: 'greeting', confidence: 'low', keywords: GREETING_KW },
];

const MATCHERS = RULES.map(buildRuleMatcher);

function normalise(input: string): string {
  return (input || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Extract a navigate destination from the input, if any is named. */
export function detectDestination(input: string): { path: string; label: string } | null {
  const text = normalise(input);
  for (const dest of DESTINATION_MAP) {
    for (const kw of dest.keywords) {
      const re = new RegExp(`(?<!\\p{L})${escapeRegExp(kw)}(?!\\p{L})`, 'u');
      if (re.test(text)) return { path: dest.path, label: dest.label };
    }
  }
  return null;
}

/** Extract a module guide id from the input, if any module is named. */
export function detectGuideId(input: string): string | null {
  const text = normalise(input);
  for (const g of GUIDE_KEYWORD_MAP) {
    for (const kw of g.keywords) {
      const re = new RegExp(`(?<!\\p{L})${escapeRegExp(kw)}(?!\\p{L})`, 'u');
      if (re.test(text)) return g.guideId;
    }
  }
  return null;
}

/** True when the input smells like a dharma/scripture question. */
export function detectDharmaQuery(input: string): boolean {
  const text = normalise(input);
  const KW = [
    'gita', 'bhagavad', 'veda', 'vedas', 'upanishad', 'shastra', 'puran',
    'puraan', 'muhurta', 'muhurat', 'shubh muhurat', 'vidhi', 'puja vidhi',
    'mantra', 'paap', 'is it a sin', 'sin to', 'moksha', 'shraddha',
    'after death', 'dosha', 'graha dosh', 'pitra', 'karma',
    'गीता', 'वेद', 'शास्त्र', 'मुहूर्त', 'विधि', 'मंत्र', 'पाप', 'मोक्ष',
    'গীতা', 'বেদ', 'শাস্ত্র', 'মুহূর্ত', 'বিধি', 'মন্ত্র', 'পাপ', 'মোক্ষ',
  ];
  return KW.some((kw) => {
    const re = new RegExp(`(?<!\\p{L})${escapeRegExp(kw)}(?!\\p{L})`, 'u');
    return re.test(text);
  });
}

/**
 * Deterministic keyword router. Pure function — safe to call anywhere.
 * Priority-ordered: first matching rule wins. Greeting is checked last so
 * "namaste, what is today's tithi?" still routes to tithi_today.
 *
 * Phase 2: after the keyword rules, a corpus check offers `dharma_question`
 * as a "second chance" — if the restricted Dharma corpus can answer with
 * confidence, it wins over greeting/fallback. Specific intents (tithi,
 * festival, etc.) always keep priority.
 */
export function routeIntent(input: string, _lang: LangCode): RouteResult {
  const text = normalise(input);
  const fallback: RouteResult = { intent: 'fallback_unknown', confidence: 'low', slots: {}, evidence: [] };
  if (!text) return fallback;

  let result: RouteResult = fallback;
  for (const { rule, res } of MATCHERS) {
    const evidence: string[] = [];
    rule.keywords.forEach((kw, i) => {
      if (res[i].test(text)) evidence.push(kw);
    });
    if (evidence.length === 0) continue;

    const slots: Record<string, string> = {};
    if (rule.intent === 'navigate') {
      const dest = detectDestination(input);
      if (dest) {
        slots['destination'] = dest.path;
        slots['destinationLabel'] = dest.label;
      }
    }
    if (rule.intent === 'howto') {
      const gid = detectGuideId(input);
      if (gid) slots['guideId'] = gid;
    }
    if (rule.intent === 'festival_next' && /ekadashi|एकादशी|একাদশী/.test(text)) {
      slots['festivalQuery'] = 'ekadashi';
    }
    result = { intent: rule.intent, confidence: rule.confidence, slots, evidence };
    break;
  }

  // Phase 2 second chance: if the keyword rules landed on greeting,
  // fallback, or a slot-less howto/navigate, ask the Dharma corpus.
  // A confident corpus match upgrades the route to dharma_question;
  // the task then answers or escalates. Specific intents with useful
  // slots (tithi, festival dates, etc.) always keep priority.
  //
  // Special case: "what is X" definition queries beat festival_next —
  // the devotee wants meaning, not the next date.
  const isDefinitionQuery = /what is|what's|meaning of|kya hai|ki hai|की है|কী|মানে/i.test(text);
  const needsDharmaChance =
    result.intent === 'greeting' ||
    result.intent === 'fallback_unknown' ||
    (result.intent === 'howto' && !result.slots['guideId']) ||
    (result.intent === 'navigate' && !result.slots['destination']) ||
    (result.intent === 'festival_next' && isDefinitionQuery);
  if (needsDharmaChance) {
    const dharma = matchDharma(input);
    if (dharma && (dharma.confidence === 'high' || dharma.confidence === 'medium')) {
      return {
        intent: 'dharma_question',
        confidence: dharma.confidence,
        slots: { entryId: dharma.entry.id },
        evidence: dharma.evidence,
      };
    }
  }
  return result;
}

/** Default Phase-0 router instance. Inject a different implementation to upgrade. */
export const deterministicRouter: IntentRouter = {
  route: (input, lang) => routeIntent(input, lang),
};
