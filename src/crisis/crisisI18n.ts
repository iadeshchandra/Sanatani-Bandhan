/**
 * Crisis Command — self-contained trilingual copy (EN / BN / HI).
 * =========================================================================
 * Kept local to src/crisis/ so Phase 2 does not have to touch the shared
 * 10-language taxonomy file. Falls back: currentLang -> en -> key.
 * Tone: Sanatani warmth — "Your community, when you need them most".
 */
import { useLanguage } from '../context/LanguageContext';

type Lang = 'en' | 'bn' | 'hi';

const STRINGS: Record<string, Record<Lang, string>> = {
  /* ---------- dashboard ---------- */
  'dash.title': { en: 'Crisis Command', bn: 'সংকট কমান্ড', hi: 'संकट कमांड' },
  'dash.subtitle': {
    en: 'Your community, when you need them most',
    bn: 'আপনার সম্প্রদায়, যখন আপনার সবচেয়ে প্রয়োজন',
    hi: 'आपका समुदाय, जब आपको सबसे ज़्यादा ज़रूरत हो',
  },
  'tab.map': { en: 'Live Map', bn: 'লাইভ মানচিত্র', hi: 'लाइव मानचित्र' },
  'tab.triage': { en: 'Triage', bn: 'অগ্রাধিকার', hi: 'प्राथमिकता' },
  'tab.history': { en: 'History', bn: 'ইতিহাস', hi: 'इतिहास' },
  'tab.coordinators': { en: 'Coordinators', bn: 'সমন্বয়কারী', hi: 'समन्वयक' },
  'dash.live': { en: 'LIVE', bn: 'লাইভ', hi: 'लाइव' },
  'dash.activeNow': { en: 'active now', bn: 'এখন সক্রিয়', hi: 'अभी सक्रिय' },
  'dash.loading': { en: 'Checking your access…', bn: 'আপনার অনুমতি যাচাই করা হচ্ছে…', hi: 'आपकी पहुँच जाँची जा रही है…' },
  'dash.lockedTitle': { en: 'Restricted area', bn: 'সংরক্ষিত এলাকা', hi: 'प्रतिबंधित क्षेत्र' },
  'dash.lockedDesc': {
    en: 'Only Trustees and designated Crisis Coordinators can open the command dashboard. If you are a sevadar, please contact your trustee to be added.',
    bn: 'শুধুমাত্র ট্রাস্টি এবং মনোনীত সংকট সমন্বয়কারীগণ কমান্ড ড্যাশবোর্ড খুলতে পারবেন। আপনি সেবাদার হলে, যুক্ত হতে আপনার ট্রাস্টির সাথে যোগাযোগ করুন।',
    hi: 'केवल ट्रस्टी और नामित संकट समन्वयक ही कमांड डैशबोर्ड खोल सकते हैं। यदि आप सेवादार हैं, तो जुड़ने के लिए अपने ट्रस्टी से संपर्क करें।',
  },

  /* ---------- situation / status / severity ---------- */
  'sit.medical': { en: 'Medical', bn: 'চিকিৎসা', hi: 'चिकित्सा' },
  'sit.fire': { en: 'Fire', bn: 'আগুন', hi: 'आग' },
  'sit.robbery': { en: 'Robbery', bn: 'ডাকাতি', hi: 'डकैती' },
  'sit.crowd': { en: 'Crowd', bn: 'ভিড়', hi: 'भीड़' },
  'sit.disaster': { en: 'Disaster', bn: 'দুর্যোগ', hi: 'आपदा' },
  'sit.other': { en: 'Other', bn: 'অন্যান্য', hi: 'अन्य' },
  'sev.critical': { en: 'Critical', bn: 'সংকটাপন্ন', hi: 'गंभीर' },
  'sev.high': { en: 'High', bn: 'উচ্চ', hi: 'उच्च' },
  'sev.medium': { en: 'Medium', bn: 'মাঝারি', hi: 'मध्यम' },
  'st.active': { en: 'Active', bn: 'সক্রিয়', hi: 'सक्रिय' },
  'st.acknowledged': { en: 'Acknowledged', bn: 'গৃহীত', hi: 'स्वीकृत' },
  'st.responding': { en: 'Responding', bn: 'সাড়া দিচ্ছে', hi: 'प्रतिक्रिया जारी' },
  'st.resolved': { en: 'Resolved', bn: 'সমাধান হয়েছে', hi: 'समाधान हो गया' },
  'st.cancelled': { en: 'Cancelled', bn: 'বাতিল', hi: 'रद्द' },

  /* ---------- triage ---------- */
  'triage.empty': {
    en: 'All calm. No active emergencies right now. 🪔',
    bn: 'সব শান্ত। এই মুহূর্তে কোনো সক্রিয় জরুরি অবস্থা নেই। 🪔',
    hi: 'सब शांत है। इस समय कोई सक्रिय आपातकाल नहीं। 🪔',
  },
  'triage.waiting': { en: 'waiting', bn: 'অপেক্ষমাণ', hi: 'प्रतीक्षारत' },
  'triage.acks': { en: 'acks', bn: 'স্বীকৃতি', hi: 'स्वीकृतियाँ' },
  'triage.responders': { en: 'responding', bn: 'সাড়া দিচ্ছেন', hi: 'प्रतिक्रिया दे रहे' },
  'triage.autoCrowd': { en: 'Auto-detected crowd risk', bn: 'স্বয়ংক্রিয়ভাবে শনাক্ত ভিড় ঝুঁকি', hi: 'स्वतः-पहचाना भीड़ जोखिम' },
  'triage.tapDetails': { en: 'Tap for details', bn: 'বিস্তারিত জানতে ট্যাপ করুন', hi: 'विवरण के लिए टैप करें' },

  /* ---------- drawer ---------- */
  'drawer.who': { en: 'Who needs help', bn: 'কার সাহায্য প্রয়োজন', hi: 'किसे मदद चाहिए' },
  'drawer.what': { en: 'What happened', bn: 'কী ঘটেছে', hi: 'क्या हुआ' },
  'drawer.where': { en: 'Where', bn: 'কোথায়', hi: 'कहाँ' },
  'drawer.medical': { en: 'Medical information', bn: 'চিকিৎসা তথ্য', hi: 'चिकित्सा जानकारी' },
  'drawer.allergies': { en: 'Allergies', bn: 'অ্যালার্জি', hi: 'एलर्जी' },
  'drawer.conditions': { en: 'Conditions', bn: 'রোগ', hi: 'रोग' },
  'drawer.voiceNote': { en: 'Voice note', bn: 'ভয়েস নোট', hi: 'वॉइस नोट' },
  'drawer.responders': { en: "Who's responding", bn: 'কারা সাড়া দিচ্ছেন', hi: 'कौन प्रतिक्रिया दे रहा है' },
  'drawer.noResponders': {
    en: 'No one is on the way yet — please acknowledge and assign sevadars.',
    bn: 'এখনও কেউ আসছেন না — দয়া করে স্বীকৃতি দিন এবং সেবাদার নিয়োগ করুন।',
    hi: 'अभी तक कोई नहीं आ रहा है — कृपया स्वीकार करें और सेवादार नियुक्त करें।',
  },
  'drawer.bloodGroup': { en: 'Blood group', bn: 'রক্তের গ্রুপ', hi: 'रक्त समूह' },
  'drawer.sanId': { en: 'Sanatani ID', bn: 'সনাতনী আইডি', hi: 'सनातनी आईडी' },
  'drawer.familyNotified': { en: 'Family notified', bn: 'পরিবারকে জানানো হয়েছে', hi: 'परिवार को सूचित किया गया' },
  'drawer.capturedAgo': { en: 'location captured', bn: 'অবস্থান ধারণ করা হয়েছে', hi: 'स्थान दर्ज किया गया' },
  'drawer.timeline': { en: 'Response timeline', bn: 'সাড়ার সময়রেখা', hi: 'प्रतिक्रिया समयरेखा' },
  'drawer.coming': { en: 'On the way', bn: 'আসছেন', hi: 'आ रहे हैं' },
  'drawer.arrived': { en: 'Arrived', bn: 'পৌঁছেছেন', hi: 'पहुँच गए' },
  'drawer.markArrived': { en: 'Mark arrived', bn: 'পৌঁছানো চিহ্নিত করুন', hi: 'पहुँच दर्ज करें' },
  'drawer.imComing': { en: "I'm coming", bn: 'আমি আসছি', hi: 'मैं आ रहा/रही हूँ' },

  /* ---------- actions ---------- */
  'act.acknowledge': { en: 'Acknowledge', bn: 'স্বীকৃতি দিন', hi: 'स्वीकार करें' },
  'act.acknowledged': {
    en: 'Acknowledged — help is being dispatched.',
    bn: 'গৃহীত — সাহায্য পাঠানো হচ্ছে।',
    hi: 'स्वीकृत — मदद भेजी जा रही है।',
  },
  'act.assign': { en: 'Assign sevadars', bn: 'সেবাদার নিয়োগ করুন', hi: 'सेवादार नियुक्त करें' },
  'act.assignTitle': { en: 'Assign sevadars to this emergency', bn: 'এই জরুরি অবস্থায় সেবাদার নিয়োগ করুন', hi: 'इस आपातकाल में सेवादार नियुक्त करें' },
  'act.assigned': { en: 'Sevadars assigned and notified.', bn: 'সেবাদার নিয়োগ ও অবহিত করা হয়েছে।', hi: 'सेवादार नियुक्त और सूचित किए गए।' },
  'act.escalate': { en: 'Escalate — call helpline', bn: 'এসকেলেট — হেল্পলাইনে কল করুন', hi: 'एस्केलेट — हेल्पलाइन पर कॉल करें' },
  'act.callAmbulance': { en: 'Ambulance 108', bn: 'অ্যাম্বুলেন্স ১০৮', hi: 'एंबुलेंस 108' },
  'act.callFire': { en: 'Fire 101', bn: 'ফায়ার ১০১', hi: 'फायर 101' },
  'act.callPolice': { en: 'Police 100', bn: 'পুলিশ ১০০', hi: 'पुलिस 100' },
  'act.smsHelpline': { en: 'Send location via SMS', bn: 'এসএমএসে অবস্থান পাঠান', hi: 'एसएमएस से स्थान भेजें' },
  'act.broadcast': { en: 'Broadcast alert', bn: 'সতর্কবার্তা প্রচার করুন', hi: 'चेतावनी प्रसारित करें' },
  'act.broadcastTitle': { en: 'Alert the whole community', bn: 'সমগ্র সম্প্রদায়কে সতর্ক করুন', hi: 'पूरे समुदाय को सतर्क करें' },
  'act.broadcastHint': {
    en: 'Everyone in the organisation will see: "Please avoid …"',
    bn: 'সংগঠনের সবাই দেখবেন: "অনুগ্রহ করে এড়িয়ে চলুন …"',
    hi: 'संगठन में सभी देखेंगे: "कृपया … से बचें"',
  },
  'act.broadcastPlaceholder': { en: 'e.g. the north gate area', bn: 'যেমন: উত্তর গেট এলাকা', hi: 'जैसे: उत्तरी द्वार क्षेत्र' },
  'act.broadcastSent': { en: 'Alert broadcast to the community.', bn: 'সম্প্রদায়ে সতর্কবার্তা প্রচার করা হয়েছে।', hi: 'समुदाय को चेतावनी प्रसारित की गई।' },
  'act.resolve': { en: 'Resolve', bn: 'সমাধান করুন', hi: 'समाधान करें' },
  'act.resolveTitle': { en: 'Mark as resolved', bn: 'সমাধান হিসেবে চিহ্নিত করুন', hi: 'समाधानित चिह्नित करें' },
  'act.outcomeLabel': { en: 'What happened? (required)', bn: 'কী ঘটেছিল? (আবশ্যক)', hi: 'क्या हुआ? (आवश्यक)' },
  'act.outcomePlaceholder': {
    en: 'Devotee felt dizzy, given water and rest, family took them home.',
    bn: 'ভক্ত মাথা ঘোরা অনুভব করেছিলেন, জল ও বিশ্রাম দেওয়া হয়েছে, পরিবার বাড়ি নিয়ে গেছে।',
    hi: 'भक्त को चक्कर आया, पानी और आराम दिया गया, परिवार घर ले गया।',
  },
  'act.outcomeRequired': {
    en: 'Please write what happened before resolving.',
    bn: 'সমাধানের আগে কী ঘটেছিল লিখুন।',
    hi: 'समाधान से पहले क्या हुआ लिखें।',
  },
  'act.resolved': { en: 'Emergency resolved. 🙏', bn: 'জরুরি অবস্থা সমাধান হয়েছে। 🙏', hi: 'आपातकाल का समाधान हो गया। 🙏' },
  'act.cancel': { en: 'Cancel', bn: 'বাতিল', hi: 'रद्द करें' },
  'act.confirm': { en: 'Confirm', bn: 'নিশ্চিত করুন', hi: 'पुष्टि करें' },
  'act.send': { en: 'Send alert', bn: 'সতর্কতা পাঠান', hi: 'चेतावनी भेजें' },
  'act.save': { en: 'Save', bn: 'সংরক্ষণ', hi: 'सहेजें' },
  'act.close': { en: 'Close', bn: 'বন্ধ করুন', hi: 'बंद करें' },
  'act.noPermission': {
    en: 'You do not have permission for this action.',
    bn: 'এই কাজের জন্য আপনার অনুমতি নেই।',
    hi: 'इस कार्रवाई की अनुमति आपके पास नहीं है।',
  },

  /* ---------- history ---------- */
  'hist.empty': {
    en: 'No past emergencies. May it stay that way. 🪔',
    bn: 'অতীতে কোনো জরুরি অবস্থা নেই। এমনই থাকুক। 🪔',
    hi: 'पिछली कोई आपातकाल नहीं। ऐसा ही बना रहे। 🪔',
  },
  'hist.outcome': { en: 'Outcome', bn: 'ফলাফল', hi: 'परिणाम' },
  'hist.resolvedAt': { en: 'Resolved', bn: 'সমাধান', hi: 'समाधान' },

  /* ---------- map ---------- */
  'map.legendCritical': { en: 'Critical', bn: 'সংকটাপন্ন', hi: 'गंभीर' },
  'map.legendHigh': { en: 'High', bn: 'উচ্চ', hi: 'उच्च' },
  'map.legendMedium': { en: 'Medium', bn: 'মাঝারি', hi: 'मध्यम' },
  'map.empty': {
    en: 'No active emergencies on the map.',
    bn: 'মানচিত্রে কোনো সক্রিয় জরুরি অবস্থা নেই।',
    hi: 'मानचित्र पर कोई सक्रिय आपातकाल नहीं।',
  },
  'map.orgCenter': { en: 'Your location', bn: 'আপনার অবস্থান', hi: 'आपका स्थान' },
  'map.tapPin': { en: 'Tap a pin for details', bn: 'বিস্তারিত জানতে পিনে ট্যাপ করুন', hi: 'विवरण के लिए पिन पर टैप करें' },

  /* ---------- coordinators ---------- */
  'coord.title': { en: 'Crisis Coordinators', bn: 'সংকট সমন্বয়কারী', hi: 'संकट समन्वयक' },
  'coord.desc': {
    en: 'Coordinators can acknowledge, assign sevadars, escalate and resolve emergencies. Only Trustees can add or remove them.',
    bn: 'সমন্বয়কারীগণ জরুরি অবস্থা স্বীকৃতি, সেবাদার নিয়োগ, এসকেলেট ও সমাধান করতে পারেন। শুধুমাত্র ট্রাস্টিগণ তাঁদের যুক্ত বা অপসারণ করতে পারেন।',
    hi: 'समन्वयक आपातकाल स्वीकार कर सकते हैं, सेवादार नियुक्त कर सकते हैं, एस्केलेट और समाधान कर सकते हैं। केवल ट्रस्टी ही उन्हें जोड़ या हटा सकते हैं।',
  },
  'coord.search': { en: 'Search members…', bn: 'সদস্য খুঁজুন…', hi: 'सदस्य खोजें…' },
  'coord.add': { en: 'Make coordinator', bn: 'সমন্বয়কারী করুন', hi: 'समन्वयक बनाएँ' },
  'coord.remove': { en: 'Remove', bn: 'অপসারণ', hi: 'हटाएँ' },
  'coord.added': { en: 'Coordinator added.', bn: 'সমন্বয়কারী যুক্ত হয়েছেন।', hi: 'समन्वयक जोड़ा गया।' },
  'coord.removed': { en: 'Coordinator removed.', bn: 'সমন্বয়কারী অপসারিত হয়েছেন।', hi: 'समन्वयक हटाया गया।' },
  'coord.current': { en: 'Current coordinators', bn: 'বর্তমান সমন্বয়কারীগণ', hi: 'वर्तमान समन्वयक' },
  'coord.members': { en: 'Organisation members', bn: 'সংগঠনের সদস্যগণ', hi: 'संगठन के सदस्य' },
  'coord.assignedBy': { en: 'Assigned by', bn: 'নিয়োগদাতা', hi: 'द्वारा नियुक्त' },
  'coord.none': {
    en: 'No coordinators yet — add trusted sevadars here.',
    bn: 'এখনও কোনো সমন্বয়কারী নেই — এখানে বিশ্বস্ত সেবাদার যুক্ত করুন।',
    hi: 'अभी कोई समन्वयक नहीं — यहाँ विश्वसनीय सेवादार जोड़ें।',
  },
  'coord.trusteeOnly': {
    en: 'Only Trustees can manage coordinators.',
    bn: 'শুধুমাত্র ট্রাস্টিগণ সমন্বয়কারী পরিচালনা করতে পারেন।',
    hi: 'केवल ट्रस्टी ही समन्वयक प्रबंधित कर सकते हैं।',
  },

  /* ---------- misc ---------- */
  'misc.justNow': { en: 'just now', bn: 'এইমাত্র', hi: 'अभी' },
  'misc.minAgo': { en: 'min ago', bn: 'মিনিট আগে', hi: 'मिनट पहले' },
  'misc.hrAgo': { en: 'hr ago', bn: 'ঘণ্টা আগে', hi: 'घंटे पहले' },
  'misc.refreshing': { en: 'Refreshing…', bn: 'রিফ্রেশ হচ্ছে…', hi: 'रिफ़्रेश हो रहा है…' },
};

function normLang(l: string): Lang {
  if (l === 'bn' || l === 'bengali' || l === 'bangla') return 'bn';
  if (l === 'hi' || l === 'hindi') return 'hi';
  return 'en';
}

/** t(key) for the crisis module — currentLang -> en -> key fallback chain. */
export function useCrisisT(): (key: string) => string {
  const { currentLang } = useLanguage();
  const lang = normLang(currentLang || 'en');
  return (key: string) => {
    const entry = STRINGS[key];
    if (!entry) return key;
    return entry[lang] || entry.en || key;
  };
}

/** Non-hook variant for service-layer strings (defaults to English). */
export function crisisT(key: string, lang = 'en'): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[normLang(lang)] || entry.en || key;
}
