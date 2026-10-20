/**
 * Domain 6 audit (2026-10-20) — suggestion-chip & keyword routing coverage.
 *
 * Every chip the assistant can emit (SUGGESTIONS in templates.ts, plus the
 * hardcoded AssistantSheet starters) must route to a WORKING intent —
 * never fallback_unknown — in all three authored languages. Catches the
 * class of bug where a chip was authored in HI/BN but its keywords only
 * existed in EN.
 */
import { routeIntent } from '../intents';
import { detectCrisis } from '../crisisKeywords';
import { suggestionsFor } from '../templates';
import type { IntentId } from '../types';

interface Case {
  chip: string;
  intent: IntentId;
  slotKey?: string;
  slotValue?: string;
}

/** [chip, expected intent, optional slot key, optional slot value] */
const CASES: Array<[string, IntentId, string?, string?]> = [
  // navigate
  ['Open my profile', 'navigate', 'destination', '/app/profile'],
  ['Show Suchana', 'navigate', 'destination', '/app/suchana'],
  ['Take me home', 'navigate', 'destination', '/app/home'],
  ['मेरी प्रोफ़ाइल खोलो', 'navigate', 'destination', '/app/profile'],
  ['सूचना खोलो', 'navigate', 'destination', '/app/suchana'],
  ['होम ले चलो', 'navigate', 'destination', '/app/home'],
  ['আমার প্রোফাইল খোলো', 'navigate', 'destination', '/app/profile'],
  ['সূচনা খোলো', 'navigate', 'destination', '/app/suchana'],
  ['হোমে নিয়ে চলো', 'navigate', 'destination', '/app/home'],
  // howto
  ['Guide to Panjika', 'howto', 'guideId', 'panjika'],
  ['Guide to Wallet', 'howto', 'guideId', 'wallet'],
  ['Guide to Sangam', 'howto', 'guideId', 'sangam'],
  ['पंचांग मार्गदर्शक', 'howto', 'guideId', 'panjika'],
  ['वॉलेट मार्गदर्शक', 'howto', 'guideId', 'wallet'],
  ['संगम मार्गदर्शक', 'howto', 'guideId', 'sangam'],
  ['পঞ্জিকা নির্দেশিকা', 'howto', 'guideId', 'panjika'],
  ['ওয়ালেট নির্দেশিকা', 'howto', 'guideId', 'wallet'],
  ['সঙ্গম নির্দেশিকা', 'howto', 'guideId', 'sangam'],
  // tithi_today
  ['When is Ekadashi?', 'festival_next'],
  ['Next festival?', 'festival_next'],
  ['What is a tithi?', 'tithi_today'],
  ['एकादशी कब है?', 'festival_next'],
  ['अगला उत्सव?', 'festival_next'],
  ['तिथि क्या है?', 'dharma_question', 'entryId', 'tithi.what_is'],
  ['একাদশী কবে?', 'festival_next'],
  ['পরের উৎসব?', 'festival_next'],
  ['তিথি কী?', 'dharma_question', 'entryId', 'tithi.what_is'],
  // festival_next
  ["Today's tithi?", 'tithi_today'],
  ['आज की तिथि?', 'tithi_today'],
  ['আজকের তিথি?', 'tithi_today'],
  // dana_help
  ['Open the dana sheet', 'dana_help'],
  ['How do I give dana?', 'dana_help'],
  ['What is dakshina?', 'dana_help'],
  ['दान पत्र खोलो', 'dana_help'],
  ['दान कैसे दूँ?', 'dana_help'],
  ['दक्षिणा क्या है?', 'dana_help'],
  ['দান পত্র খোলো', 'dana_help'],
  ['দান কীভাবে দেব?', 'dana_help'],
  ['দক্ষিণা কী?', 'dana_help'],
  // sadhana_summary
  ['Open Sadhana', 'sadhana_summary'],
  ['साधना खोलो', 'sadhana_summary'],
  ['সাধনা খোলো', 'sadhana_summary'],
  // booking_help
  ['Open Seva Journeys', 'navigate', 'destination', '/seva/journeys'],
  ['How to book?', 'booking_help'],
  ['Find a Jyotishi', 'booking_help'],
  ['सेवा यात्रा खोलो', 'navigate', 'destination', '/seva/journeys'],
  ['पंडित कैसे बुक करूँ?', 'booking_help'],
  ['ज्योतिषी बुक करो', 'booking_help'],
  ['সেবা যাত্রা খোলো', 'navigate', 'destination', '/seva/journeys'],
  ['পুরোহিত কীভাবে বুক করব?', 'booking_help'],
  ['জ্যোতিষী বুক করো', 'booking_help'],
  // language_help
  ['Help in Hindi', 'language_help'],
  ['Namaste', 'greeting'],
  ['नमस्ते', 'greeting'],
  ['बांग्ला में बताओ', 'language_help'],
  ['নমস্কার', 'greeting'],
  ['হিন্দিতে বলো', 'language_help'],
  // sos_help
  ['Open Home', 'navigate', 'destination', '/app/home'],
  ['Open Suchana', 'navigate', 'destination', '/app/suchana'],
  ['होम खोलो', 'navigate', 'destination', '/app/home'],
  ['सूचना खोलो', 'navigate', 'destination', '/app/suchana'],
  ['হোম খোলো', 'navigate', 'destination', '/app/home'],
  ['সূচনা খোলো', 'navigate', 'destination', '/app/suchana'],
  // voice_upgrade
  ['Download the AI voice', 'voice_upgrade'],
  ['How big is the voice download?', 'voice_upgrade'],
  ['एआई वॉयस डाउनलोड करो', 'voice_upgrade'],
  ['वॉयस डाउनलोड कितना बड़ा है?', 'voice_upgrade'],
  ['এআই ভয়েস ডাউনলোড করো', 'voice_upgrade'],
  ['ভয়েস ডাউনলোড কত বড়?', 'voice_upgrade'],
  // dharma_question
  ['What is Ekadashi?', 'dharma_question', 'entryId', 'tithi.ekadashi'],
  ['What is karma?', 'dharma_question', 'entryId', 'concept.karma'],
  ['How to do morning puja?', 'dharma_question', 'entryId', 'practice.basic_puja'],
  ['एकादशी क्या है?', 'dharma_question', 'entryId', 'tithi.ekadashi'],
  ['कर्म क्या है?', 'dharma_question', 'entryId', 'concept.karma'],
  ['सुबह पूजा कैसे करें?', 'dharma_question', 'entryId', 'practice.basic_puja'],
  ['একাদশী কী?', 'dharma_question', 'entryId', 'tithi.ekadashi'],
  ['কর্ম কী?', 'dharma_question', 'entryId', 'concept.karma'],
  ['সকালের পূজা কীভাবে করব?', 'dharma_question', 'entryId', 'practice.basic_puja'],
  // navigation_question
  ['Where is my wallet?', 'navigation_question', 'entryId', 'nav.wallet.seva'],
  ['Where is the Tirtha Diary?', 'navigation_question', 'entryId', 'nav.tirtha'],
  ['Where are group chats?', 'navigation_question', 'entryId', 'nav.groups'],
  ['मेरा वॉलेट कहाँ है?', 'navigation_question', 'entryId', 'nav.wallet.seva'],
  ['तीर्थ डायरी कहाँ है?', 'navigation_question', 'entryId', 'nav.tirtha'],
  ['ग्रुप चैट कहाँ हैं?', 'navigation_question', 'entryId', 'nav.groups'],
  ['আমার ওয়ালেট কোথায়?', 'navigation_question', 'entryId', 'nav.wallet.seva'],
  ['তীর্থ ডায়েরি কোথায়?', 'navigation_question', 'entryId', 'nav.tirtha'],
  ['গ্রুপ চ্যাট কোথায়?', 'navigation_question', 'entryId', 'nav.groups'],
  // nearby_temples
  ['Temples near me', 'nearby_temples'],
  ['Nearby mandirs', 'nearby_temples'],
  ['Temples around here?', 'nearby_temples'],
  ['मेरे पास मंदिर', 'nearby_temples'],
  ['आस-पास मंदिर', 'nearby_temples'],
  ['नज़दीकी मंदिर?', 'nearby_temples'],
  ['আমার কাছে মন্দির', 'nearby_temples'],
  ['কাছাকাছি মন্দির', 'nearby_temples'],
  ['আশেপাশে মন্দির?', 'nearby_temples'],
  // tirtha_summary
  ['My Tirtha Diary', 'tirtha_summary'],
  ['मेरी तीर्थ डायरी', 'tirtha_summary'],
  ['আমার তীর্থ ডায়েরি', 'tirtha_summary'],
  // greeting / fallback chips
  ['अगला उत्सव?', 'festival_next'],
  ['परের উৎসব?', 'festival_next'],
  ['दान कैसे दूँ?', 'dana_help'],
  ['দান কীভাবে দেব?', 'dana_help'],
  // admin (owner) chips — all must land on a real copilot intent
  ['Flagged posts', 'admin_moderation_help'],
  ["This week's numbers", 'admin_stats'],
  ['Anything unusual?', 'admin_anomaly'],
  ['Morning briefing', 'admin_briefing'],
  ['फ्लैग पोस्ट', 'admin_moderation_help'],
  ['सप्ताह के आंकड़े', 'admin_stats'],
  ['कुछ असामान्य?', 'admin_anomaly'],
  ['सुबह की जानकारी', 'admin_briefing'],
  ['ফ্ল্যাগ পোস্ট', 'admin_moderation_help'],
  ['সপ্তাহের সংখ্যা', 'admin_stats'],
  ['অস্বাভাবিক কিছু?', 'admin_anomaly'],
  ['সকালের ব্রিফিং', 'admin_briefing'],
  // AssistantSheet hardcoded starters
  ['Where is the dana section?', 'navigation_question', 'entryId', 'nav.giving'],
  ["What's today's tithi?", 'tithi_today'],
  ['How does SOS work?', 'sos_help'],
  ['दान अनुभाग कहाँ है?', 'dana_help'],
  ['आज की तिथि क्या है?', 'tithi_today'],
  ['SOS कैसे काम करता है?', 'sos_help'],
  ['দান বিভাগ কোথায়?', 'navigation_question', 'entryId', 'nav.giving'],
  ['আজকের তিথি কী?', 'tithi_today'],
  ['SOS কীভাবে কাজ করে?', 'sos_help'],
];

const cases: Case[] = CASES.map(([chip, intent, slotKey, slotValue]) => ({
  chip,
  intent,
  slotKey,
  slotValue,
}));

describe('chip routing — every chip lands on a working intent', () => {
  it.each(cases)('"$chip" → $intent', (c) => {
    const r = routeIntent(c.chip, 'en');
    expect(r.intent).toBe(c.intent);
    if (c.slotKey) expect(r.slots[c.slotKey]).toBe(c.slotValue);
  });

  it('no chip is a crisis false positive', () => {
    for (const c of cases) {
      expect(detectCrisis(c.chip)).toBeNull();
    }
  });

  it('no chip falls back to fallback_unknown', () => {
    for (const c of cases) {
      const r = routeIntent(c.chip, 'en');
      expect(r.intent).not.toBe('fallback_unknown');
    }
  });

  it('suggestionsFor tables only contain routed chips', () => {
    // Every chip currently authored in SUGGESTIONS must appear in CASES.
    const known = new Set(cases.map((c) => c.chip));
    const intents: IntentId[] = [
      'navigate', 'howto', 'tithi_today', 'festival_next', 'dana_help',
      'sadhana_summary', 'booking_help', 'language_help', 'sos_help',
      'voice_upgrade', 'dharma_question', 'navigation_question',
      'nearby_temples', 'tirtha_summary', 'greeting', 'fallback_unknown',
    ];
    for (const intent of intents) {
      for (const lang of ['en', 'hi', 'bn'] as const) {
        for (const chip of suggestionsFor(intent, lang)) {
          expect(known.has(chip)).toBe(true);
        }
      }
    }
  });
});
