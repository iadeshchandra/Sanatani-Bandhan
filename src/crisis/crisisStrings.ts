/**
 * crisis/crisisStrings.ts — Trilingual (EN/BN/HI) copy for Crisis Command.
 * ========================================================================
 * Uses the existing LanguageContext (useLanguage().currentLang). Every entry
 * carries en/bn/hi; resolution falls back en -> en-entry, so a missing
 * language degrades to English, never to a blank string.
 *
 * Tone: Sanatani warmth everywhere. Alerts reassure
 * ("Help is coming. Your sangha has been notified."), never cold
 * corporate copy.
 */

import { useLanguage } from '../context/LanguageContext';

export interface TriString {
  en: string;
  bn: string;
  hi: string;
}

export type LangCode = 'en' | 'bn' | 'hi';

export function normalizeLang(code: string | undefined | null): LangCode {
  if (code === 'bn') return 'bn';
  if (code === 'hi') return 'hi';
  return 'en';
}

export const useCrisisT = (): ((s: TriString) => string) => {
  const { currentLang } = useLanguage();
  const lang = normalizeLang(currentLang);
  return (s: TriString) => s[lang] ?? s.en;
};

export const crisisCopy = {
  panicLabel: { en: 'SOS — Hold for help', bn: 'SOS — সাহায্যের জন্য চেপে ধরুন', hi: 'SOS — सहायता हेतु दबाकर रखें' } as TriString,
  panicExpand: { en: 'Show SOS button', bn: 'SOS বোতাম দেখান', hi: 'SOS बटन दिखाएँ' } as TriString,
  panicCollapse: { en: 'Hide SOS button', bn: 'SOS বোতাম লুকান', hi: 'SOS बटन छिपाएँ' } as TriString,
  panicHoldHint: { en: 'Press and hold 1.5s', bn: '১.৫ সেকেন্ড চেপে ধরুন', hi: '1.5 सेकंड दबाकर रखें' } as TriString,
  releaseToCancel: { en: 'Release to cancel', bn: 'বাতিল করতে ছেড়ে দিন', hi: 'रद्द करने हेतु छोड़ें' } as TriString,

  pickerTitle: { en: 'What is happening?', bn: 'কী ঘটছে?', hi: 'क्या हो रहा है?' } as TriString,
  pickerSubtitle: { en: 'Tap the closest one. Help is on the way.', bn: 'সবচেয়ে কাছেরটি চাপুন। সাহায্য আসছে।', hi: 'सबसे निकट वाला चुनें। सहायता आ रही है।' } as TriString,
  sitMedical: { en: 'Medical', bn: 'চিকিৎসা জরুরি', hi: 'चिकित्सा आपात' } as TriString,
  sitFire: { en: 'Fire / Hazard', bn: 'আগুন / বিপদ', hi: 'आग / खतरा' } as TriString,
  sitRobbery: { en: 'Robbery / Attack', bn: 'ডাকাতি / হামলা', hi: 'डकैती / हमला' } as TriString,
  sitCrowd: { en: 'Crowd / Stampede', bn: 'ভিড় / ঠেলাঠেলি', hi: 'भीड़ / भगदड़' } as TriString,
  sitDisaster: { en: 'Disaster', bn: 'দুর্যোগ', hi: 'आपदा' } as TriString,
  sitOther: { en: 'Other (voice note)', bn: 'অন্যান্য (ভয়েস নোট)', hi: 'अन्य (वॉइस नोट)' } as TriString,
  voiceRecord: { en: 'Tap to record a short voice note', bn: 'সংক্ষিপ্ত ভয়েস নোট রেকর্ড করতে চাপুন', hi: 'संक्षिप्त वॉइस नोट रिकॉर्ड करने हेतु दबाएँ' } as TriString,
  voiceRecording: { en: 'Recording… tap to stop', bn: 'রেকর্ড হচ্ছে… থামাতে চাপুন', hi: 'रिकॉर्ड हो रहा है… रोकने हेतु दबाएँ' } as TriString,
  voiceRecorded: { en: 'Voice note recorded', bn: 'ভয়েস নোট রেকর্ড হয়েছে', hi: 'वॉइस नोट रिकॉर्ड हो गया' } as TriString,
  detailsOptional: { en: 'Anything responders should know? (optional)', bn: 'সাহায্যকারীদের জানা দরকার এমন কিছু? (ঐচ্ছিক)', hi: 'बचावकर्ताओं को क्या जानना चाहिए? (वैकल्पिक)' } as TriString,
  detailsPlaceholder: { en: 'e.g. I am near the north gate…', bn: 'যেমন: আমি উত্তর ফটকের কাছে…', hi: 'जैसे: मैं उत्तरी द्वार के पास हूँ…' } as TriString,
  continue: { en: 'Continue', bn: 'এগিয়ে যান', hi: 'आगे बढ़ें' } as TriString,
  back: { en: 'Back', bn: 'পেছনে', hi: 'पीछे' } as TriString,
  cancel: { en: 'Cancel', bn: 'বাতিল', hi: 'रद्द करें' } as TriString,
  close: { en: 'Close', bn: 'বন্ধ করুন', hi: 'बंद करें' } as TriString,

  confirmTitle: { en: 'Send this SOS?', bn: 'এই SOS পাঠাবেন?', hi: 'यह SOS भेजें?' } as TriString,
  confirmSubtitle: { en: 'Your sangha and nearby Sanatanis will be notified at once.', bn: 'আপনার সংঘ ও কাছাকাছি সনাতনীদের সঙ্গে সঙ্গে জানানো হবে।', hi: 'आपके संघ और निकटवर्ती सनातनियों को तुरंत सूचित किया जाएगा।' } as TriString,
  confirmSituation: { en: 'Situation', bn: 'পরিস্থিতি', hi: 'स्थिति' } as TriString,
  confirmLocation: { en: 'Location', bn: 'অবস্থান', hi: 'स्थान' } as TriString,
  confirmWho: { en: 'Who is notified', bn: 'কাদের জানানো হবে', hi: 'किन्हें सूचित किया जाएगा' } as TriString,
  confirmWhoValue: { en: 'Nearby Sanatanis · your family circle · your sangha', bn: 'কাছাকাছি সনাতনী · আপনার পরিবার বৃত্ত · আপনার সংঘ', hi: 'निकटवर्ती सनातनी · आपका पारिवारिक मंडल · आपका संघ' } as TriString,
  privacyNotice: {
    en: 'Your location is shared ONLY for this SOS. We never track you.',
    bn: 'আপনার অবস্থান শুধুমাত্র এই SOS-এর জন্য ভাগ করা হয়। আমরা কখনোই আপনাকে ট্র্যাক করি না।',
    hi: 'आपका स्थान केवल इस SOS हेतु साझा किया जाता है। हम आपको कभी ट्रैक नहीं करते।',
  } as TriString,
  confirmSend: { en: 'Send SOS', bn: 'SOS পাঠান', hi: 'SOS भेजें' } as TriString,
  sending: { en: 'Sending…', bn: 'পাঠানো হচ্ছে…', hi: 'भेजा जा रहा है…' } as TriString,
  cooldownNudge: {
    en: 'Take a breath — a false alarm was sent recently. Send anyway if this is real.',
    bn: 'একটু শান্ত হোন — সম্প্রতি একটি ভুল অ্যালার্ম পাঠানো হয়েছিল। সত্যিকারের বিপদ হলে তবুও পাঠান।',
    hi: 'शांत हो जाइए — हाल में एक गलत अलार्म भेजा गया था। यदि यह वास्तविक है तो फिर भी भेजें।',
  } as TriString,

  activeTitle: { en: 'Help is coming.', bn: 'সাহায্য আসছে।', hi: 'सहायता आ रही है।' } as TriString,
  activeSubtitle: { en: 'Your sangha has been notified.', bn: 'আপনার সংঘকে জানানো হয়েছে।', hi: 'आपके संघ को सूचित कर दिया गया है।' } as TriString,
  stepSent: { en: 'SOS sent', bn: 'SOS পাঠানো হয়েছে', hi: 'SOS भेजा गया' } as TriString,
  stepAck: { en: 'Acknowledged', bn: 'স্বীকৃত', hi: 'स्वीकृत' } as TriString,
  stepResponding: { en: 'Responders coming', bn: 'সাহায্যকারী আসছেন', hi: 'बचावकर्ता आ रहे हैं' } as TriString,
  stepResolved: { en: 'Resolved', bn: 'সমাধান হয়েছে', hi: 'समाधान हो गया' } as TriString,
  respondersLine: { en: 'people responding', bn: 'জন সাড়া দিয়েছেন', hi: 'लोग आ रहे हैं' } as TriString,
  nearestAway: { en: 'nearest away', bn: 'নিকটতম দূরে', hi: 'निकटतम दूर' } as TriString,
  imSafe: { en: "I'm Safe", bn: 'আমি নিরাপদ', hi: 'मैं सुरक्षित हूँ' } as TriString,
  imSafeConfirm: {
    en: 'Cancel this SOS and tell everyone you are safe?',
    bn: 'এই SOS বাতিল করে সবাইকে জানাবেন যে আপনি নিরাপদ?',
    hi: 'यह SOS रद्द करके सबको बताएँ कि आप सुरक्षित हैं?',
  } as TriString,
  keepActive: { en: 'Keep active', bn: 'সক্রিয় রাখুন', hi: 'सक्रिय रखें' } as TriString,
  yesImSafe: { en: 'Yes, I am safe', bn: 'হ্যাঁ, আমি নিরাপদ', hi: 'हाँ, मैं सुरक्षित हूँ' } as TriString,
  yesImSafeMistake: {
    en: 'Yes, I am safe — it was a mistake',
    bn: 'হ্যাঁ, আমি নিরাপদ — ভুল হয়েছিল',
    hi: 'हाँ, मैं सुरक्षित हूँ — गलती हुई थी',
  } as TriString,
  safeMessage: {
    en: 'Stand-down sent. Everyone has been told you are safe. 🙏',
    bn: 'সবাইকে জানিয়ে দেওয়া হয়েছে যে আপনি নিরাপদ। 🙏',
    hi: 'सबको बता दिया गया है कि आप सुरक्षित हैं। 🙏',
  } as TriString,
  outcomePrompt: { en: 'What happened? (optional, helps your sangha learn)', bn: 'কী ঘটেছিল? (ঐচ্ছিক, আপনার সংঘের শেখার জন্য)', hi: 'क्या हुआ? (वैकल्पिक, आपके संघ के सीखने हेतु)' } as TriString,
  resolve: { en: 'Mark resolved', bn: 'সমাধান চিহ্নিত করুন', hi: 'समाधान चिह्नित करें' } as TriString,

  contactsTitle: { en: 'Family Circle', bn: 'পরিবার বৃত্ত', hi: 'पारिवारिक मंडल' } as TriString,
  contactsSubtitle: { en: 'Who should we call if you are in danger?', bn: 'বিপদে পড়লে আমরা কাকে ফোন করব?', hi: 'खतरे में हों तो हम किसे बुलाएँ?' } as TriString,
  nudgeText: {
    en: 'Who should we call if you are in danger? Add them now — it takes a minute, and it matters.',
    bn: 'বিপদে পড়লে আমরা কাকে ডাকব? এখনই যোগ করুন — এক মিনিট লাগবে, কিন্তু এটা জরুরি।',
    hi: 'खतरे में हों तो हम किसे बुलाएँ? अभी जोड़ें — एक मिनट लगेगा, पर यह बहुत मायने रखता है।',
  } as TriString,
  addContact: { en: 'Add contact', bn: 'যোগাযোগ যোগ করুন', hi: 'संपर्क जोड़ें' } as TriString,
  contactName: { en: 'Name', bn: 'নাম', hi: 'नाम' } as TriString,
  contactPhone: { en: 'Phone', bn: 'ফোন', hi: 'फोन' } as TriString,
  contactRelation: { en: 'Relation', bn: 'সম্পর্ক', hi: 'संबंध' } as TriString,
  save: { en: 'Save', bn: 'সংরক্ষণ', hi: 'सहेजें' } as TriString,
  delete: { en: 'Delete', bn: 'মুছুন', hi: 'हटाएँ' } as TriString,
  edit: { en: 'Edit', bn: 'সম্পাদনা', hi: 'संपादित करें' } as TriString,
  noContacts: {
    en: 'No one added yet. Your SOS still reaches nearby Sanatanis.',
    bn: 'এখনো কেউ যোগ হয়নি। আপনার SOS তবুও কাছাকাছি সনাতনীদের কাছে পৌঁছাবে।',
    hi: 'अभी कोई नहीं जोड़ा गया। आपका SOS फिर भी निकटवर्ती सनातनियों तक पहुँचेगा।',
  } as TriString,
  invalidPhone: { en: 'Please enter a valid phone number.', bn: 'সঠিক ফোন নম্বর দিন।', hi: 'कृपया सही फोन नंबर दर्ज करें।' } as TriString,

  locationUnavailable: { en: 'Location unavailable — SOS still sent', bn: 'অবস্থান পাওয়া যায়নি — তবুও SOS পাঠানো হয়েছে', hi: 'स्थान उपलब्ध नहीं — फिर भी SOS भेजा गया' } as TriString,
  voiceUploadPending: { en: 'Voice note will upload when you are back online', bn: 'অনলাইনে ফিরলে ভয়েস নোট আপলোড হবে', hi: 'ऑनलाइन लौटने पर वॉइस नोट अपलोड होगा' } as TriString,

  ackButton: { en: "I'm coming", bn: 'আমি আসছি', hi: 'मैं आ रहा हूँ' } as TriString,
  ackedMessage: { en: 'They know you are on your way. 🙏', bn: 'তারা জানে আপনি আসছেন। 🙏', hi: 'उन्हें पता है आप आ रहे हैं। 🙏' } as TriString,

  /* -------------------------------------------------- */
  /* Phase 3 — history & management                     */
  /* -------------------------------------------------- */

  historyTitle: { en: 'My safety log', bn: 'আমার নিরাপত্তা লগ', hi: 'मेरा सुरक्षा लॉग' } as TriString,
  historySubtitle: {
    en: 'A quiet record of moments that mattered. Nothing here is scored or shared.',
    bn: 'গুরুত্বপূর্ণ মুহূর্তগুলোর শান্ত রেকর্ড। এখানে কিছুই স্কোর বা শেয়ার করা হয় না।',
    hi: 'महत्वपूर्ण क्षणों का शांत रिकॉर्ड। यहाँ कुछ भी स्कोर या साझा नहीं किया जाता।',
  } as TriString,
  sentSection: { en: 'SOS I sent', bn: 'আমি যে SOS পাঠিয়েছি', hi: 'मेरे भेजे गए SOS' } as TriString,
  respondedSection: { en: 'SOS I responded to', bn: 'আমি যে SOS-এ সাড়া দিয়েছি', hi: 'जिन SOS का मैंने उत्तर दिया' } as TriString,
  noSentYet: {
    en: 'No SOS sent yet. We hope it stays that way.',
    bn: 'এখনো কোনো SOS পাঠানো হয়নি। আশা করি এমনটাই থাকবে।',
    hi: 'अभी तक कोई SOS नहीं भेजा गया। आशा है ऐसा ही बना रहे।',
  } as TriString,
  noResponsesYet: {
    en: 'You have not responded to anyone\u2019s SOS yet.',
    bn: 'আপনি এখনো কারো SOS-এ সাড়া দেননি।',
    hi: 'आपने अभी तक किसी के SOS का उत्तर नहीं दिया है।',
  } as TriString,
  duration: { en: 'Duration', bn: 'সময়কাল', hi: 'अवधि' } as TriString,
  respondedBy: { en: 'Responded by', bn: 'সাড়া দিয়েছেন', hi: 'उत्तर दिया' } as TriString,
  people: { en: 'people', bn: 'জন', hi: 'लोग' } as TriString,
  person: { en: 'person', bn: 'জন', hi: 'व्यक्ति' } as TriString,
  outcome: { en: 'Outcome', bn: 'ফলাফল', hi: 'परिणाम' } as TriString,
  whereLabel: { en: 'Where', bn: 'কোথায়', hi: 'कहाँ' } as TriString,
  whenLabel: { en: 'When', bn: 'কখন', hi: 'कब' } as TriString,
  youHelped: { en: 'You helped', bn: 'আপনি সাহায্য করেছেন', hi: 'आपने सहायता की' } as TriString,
  yourRole: { en: 'Your role', bn: 'আপনার ভূমিকা', hi: 'आपकी भूमिका' } as TriString,
  roleComing: { en: 'On the way', bn: 'পথে ছিলেন', hi: 'रास्ते में थे' } as TriString,
  roleArrived: { en: 'Reached', bn: 'পৌঁছেছিলেন', hi: 'पहुँचे थे' } as TriString,
  loadingHistory: { en: 'Loading your safety log…', bn: 'আপনার নিরাপত্তা লগ লোড হচ্ছে…', hi: 'आपका सुरक्षा लॉग लोड हो रहा है…' } as TriString,
  notSignedIn: {
    en: 'Please sign in to see your safety log.',
    bn: 'আপনার নিরাপত্তা লগ দেখতে সাইন ইন করুন।',
    hi: 'अपना सुरक्षा लॉग देखने हेतु साइन इन करें।',
  } as TriString,

  orgHistoryTitle: { en: 'Incident history', bn: 'ঘটনার ইতিহাস', hi: 'घटना इतिहास' } as TriString,
  orgHistorySubtitle: {
    en: 'Every incident your sangha has faced, and what the response taught us.',
    bn: 'আপনার সংঘ যে সব ঘটনার মুখোমুখি হয়েছে, এবং প্রতিক্রিয়া থেকে আমরা কী শিখেছি।',
    hi: 'आपके संघ ने जिन घटनाओं का सामना किया, और प्रतिक्रिया से हमने क्या सीखा।',
  } as TriString,
  accessDeniedTitle: { en: 'Restricted area', bn: 'সীমাবদ্ধ এলাকা', hi: 'प्रतिबंधित क्षेत्र' } as TriString,
  accessDeniedBody: {
    en: 'Incident history is visible only to Trustees and Crisis Coordinators. Your role does not have access.',
    bn: 'ঘটনার ইতিহাস শুধুমাত্র ট্রাস্টি ও ক্রাইসিস কোঅর্ডিনেটররা দেখতে পারেন। আপনার ভূমিকার অ্যাক্সেস নেই।',
    hi: 'घटना इतिहास केवल ट्रस्टी और क्राइसिस कोऑर्डिनेटरों हेतु दृश्य है। आपकी भूमिका को एक्सेस नहीं है।',
  } as TriString,
  filterSituation: { en: 'Situation', bn: 'পরিস্থিতি', hi: 'स्थिति' } as TriString,
  filterStatus: { en: 'Status', bn: 'অবস্থা', hi: 'स्थिति' } as TriString,
  filterAll: { en: 'All', bn: 'সব', hi: 'सभी' } as TriString,
  filterSearch: { en: 'Search name, SAN id, details…', bn: 'নাম, SAN আইডি, বিবরণ খুঁজুন…', hi: 'नाम, SAN आईडी, विवरण खोजें…' } as TriString,
  colDate: { en: 'Date', bn: 'তারিখ', hi: 'तारीख' } as TriString,
  colSituation: { en: 'Situation', bn: 'পরিস্থিতি', hi: 'स्थिति' } as TriString,
  colSender: { en: 'Sender', bn: 'প্রেরক', hi: 'प्रेषक' } as TriString,
  colSeverity: { en: 'Severity', bn: 'তীব্রতা', hi: 'गंभीरता' } as TriString,
  colFirstAck: { en: 'First response', bn: 'প্রথম সাড়া', hi: 'पहली प्रतिक्रिया' } as TriString,
  colResolvedIn: { en: 'Resolved in', bn: 'সমাধানে সময়', hi: 'समाधान में समय' } as TriString,
  colOutcome: { en: 'Outcome', bn: 'ফলাফল', hi: 'परिणाम' } as TriString,
  colActions: { en: 'Report', bn: 'রিপোর্ট', hi: 'रिपोर्ट' } as TriString,
  noOrgEvents: {
    en: 'No incidents recorded for this sangha yet.',
    bn: 'এই সংঘের জন্য এখনো কোনো ঘটনা রেকর্ড হয়নি।',
    hi: 'इस संघ हेतु अभी तक कोई घटना दर्ज नहीं है।',
  } as TriString,
  statAvgFirstAck: { en: 'Avg. first response', bn: 'গড় প্রথম সাড়া', hi: 'औसत पहली प्रतिक्रिया' } as TriString,
  statAvgResolve: { en: 'Avg. resolution', bn: 'গড় সমাধান সময়', hi: 'औसत समाधान समय' } as TriString,
  statBySituation: { en: 'Incidents by type', bn: 'ধরন অনুযায়ী ঘটনা', hi: 'प्रकार अनुसार घटनाएँ' } as TriString,
  statTrend: { en: 'Last 30 days', bn: 'গত ৩০ দিন', hi: 'पिछले 30 दिन' } as TriString,
  basedOn: { en: 'based on', bn: 'ভিত্তিতে', hi: 'आधारित' } as TriString,
  incidentsWord: { en: 'incidents', bn: 'টি ঘটনা', hi: 'घटनाएँ' } as TriString,
  exportReport: { en: 'Print report', bn: 'রিপোর্ট প্রিন্ট', hi: 'रिपोर्ट प्रिंट करें' } as TriString,
  reportTitle: { en: 'Incident Report — Crisis Command', bn: 'ঘটনা রিপোর্ট — ক্রাইসিস কমান্ড', hi: 'घटना रिपोर्ट — क्राइसिस कमांड' } as TriString,
  reportGeneratedBy: { en: 'Prepared by', bn: 'প্রস্তুতকারক', hi: 'तैयारकर्ता' } as TriString,
  reportOn: { en: 'on', bn: '', hi: '' } as TriString,
  reportTriggeredAt: { en: 'SOS triggered', bn: 'SOS ট্রিগার', hi: 'SOS ट्रिगर' } as TriString,
  reportResolvedAt: { en: 'Resolved', bn: 'সমাধান', hi: 'समाधान' } as TriString,
  reportLocation: { en: 'Location', bn: 'অবস্থান', hi: 'स्थान' } as TriString,
  reportDetails: { en: 'Details', bn: 'বিবরণ', hi: 'विवरण' } as TriString,
  reportOutcome: { en: 'Outcome', bn: 'ফলাফল', hi: 'परिणाम' } as TriString,
  reportResponders: { en: 'Responders', bn: 'সাড়াদানকারী', hi: 'उत्तरदाता' } as TriString,
  reportName: { en: 'Name', bn: 'নাম', hi: 'नाम' } as TriString,
  reportRole: { en: 'Role', bn: 'ভূমিকা', hi: 'भूमिका' } as TriString,
  reportRespondedAt: { en: 'Responded at', bn: 'সাড়া দেওয়ার সময়', hi: 'उत्तर का समय' } as TriString,
  reportFirstAck: { en: 'Time to first response', bn: 'প্রথম সাড়ার সময়', hi: 'पहली प्रतिक्रिया का समय' } as TriString,
  reportResolutionTime: { en: 'Time to resolution', bn: 'সমাধানের সময়', hi: 'समाधान का समय' } as TriString,
  reportNotRecorded: { en: 'Not recorded', bn: 'রেকর্ড হয়নি', hi: 'दर्ज नहीं' } as TriString,
  reportComing: { en: 'Coming', bn: 'আসছেন', hi: 'आ रहे हैं' } as TriString,
  reportArrived: { en: 'Arrived', bn: 'পৌঁছেছেন', hi: 'पहुँचे' } as TriString,
  reportFooter: {
    en: 'This report is a factual record of the incident and its response, generated from the Crisis Command log. Handle with care.',
    bn: 'এই রিপোর্ট ঘটনা ও এর প্রতিক্রিয়ার তথ্যভিত্তিক রেকর্ড, ক্রাইসিস কমান্ড লগ থেকে তৈরি। যত্নে রাখুন।',
    hi: 'यह रिपोर्ट घटना और उसकी प्रतिक्रिया का तथ्यात्मक रिकॉर्ड है, क्राइसिस कमांड लॉग से तैयार। सावधानी से रखें।',
  } as TriString,

  familyTitle: { en: 'Family safety circle', bn: 'পরিবার নিরাপত্তা বৃত্ত', hi: 'पारिवारिक सुरक्षा मंडल' } as TriString,
  familySubtitle: {
    en: 'People you trust, linked with their permission. Nothing is visible without consent — ever.',
    bn: 'যাদের আপনি বিশ্বাস করেন, তাদের সম্মতিতে যুক্ত। সম্মতি ছাড়া কিছুই দৃশ্যমান নয় — কখনোই নয়।',
    hi: 'जिन पर आप भरोसा करते हैं, उनकी अनुमति से जुड़े। सहमति के बिना कुछ भी दृश्य नहीं — कभी नहीं।',
  } as TriString,
  elderNudge: {
    en: 'Link your parents\u2019 profile so you\u2019re alerted if they ever need help. A minute now can matter for a lifetime.',
    bn: 'আপনার বাবা-মায়ের প্রোফাইল যুক্ত করুন, যাতে তাদের কখনো সাহায্য দরকার হলে আপনি জানতে পারেন। এখন এক মিনিট সারাজীবনের জন্য কাজে লাগতে পারে।',
    hi: 'अपने माता-पिता की प्रोफ़ाइल जोड़ें ताकि उन्हें कभी सहायता चाहिए तो आपको पता चले। अभी एक मिनट जीवनभर काम आ सकता है।',
  } as TriString,
  linkNew: { en: 'Link a family member', bn: 'পরিবারের সদস্য যুক্ত করুন', hi: 'परिवार सदस्य जोड़ें' } as TriString,
  linkInputHint: { en: 'Enter their Sanatani ID (SAN-XXXXXX) or phone', bn: 'তাদের Sanatani ID (SAN-XXXXXX) বা ফোন দিন', hi: 'उनका Sanatani ID (SAN-XXXXXX) या फोन दर्ज करें' } as TriString,
  sendInvite: { en: 'Send invite', bn: 'আমন্ত্রণ পাঠান', hi: 'आमंत्रण भेजें' } as TriString,
  inviteSent: {
    en: 'Invite sent. They must accept before anything is shared.',
    bn: 'আমন্ত্রণ পাঠানো হয়েছে। কিছু শেয়ার হওয়ার আগে তাদের গ্রহণ করতে হবে।',
    hi: 'आमंत्रण भेजा गया। कुछ भी साझा होने से पहले उन्हें स्वीकार करना होगा।',
  } as TriString,
  inviteNotFound: {
    en: 'No Sanatani found with that ID or phone. Please check and try again.',
    bn: 'এই আইডি বা ফোনে কোনো সনাতনী পাওয়া যায়নি। যাচাই করে আবার চেষ্টা করুন।',
    hi: 'उस ID या फोन से कोई सनातनी नहीं मिला। जाँचकर पुनः प्रयास करें।',
  } as TriString,
  inviteYourself: {
    en: 'That\u2019s you — you can\u2019t invite yourself.',
    bn: 'এটা তো আপনি — নিজেকে আমন্ত্রণ পাঠাতে পারবেন না।',
    hi: 'यह तो आप हैं — आप स्वयं को आमंत्रित नहीं कर सकते।',
  } as TriString,
  alreadyLinked: {
    en: 'Already in your circle.',
    bn: 'ইতিমধ্যে আপনার বৃত্তে আছেন।',
    hi: 'पहले से आपके मंडल में हैं।',
  } as TriString,
  pendingInvites: { en: 'Invitations waiting for you', bn: 'আপনার জন্য অপেক্ষমান আমন্ত্রণ', hi: 'आपके लिए प्रतीक्षमान आमंत्रण' } as TriString,
  accept: { en: 'Accept', bn: 'গ্রহণ', hi: 'स्वीकार करें' } as TriString,
  decline: { en: 'Decline', bn: 'প্রত্যাখ্যান', hi: 'अस्वीकार करें' } as TriString,
  inviteFrom: { en: 'invites you to their safety circle', bn: 'আপনাকে তাদের নিরাপত্তা বৃত্তে আমন্ত্রণ জানিয়েছেন', hi: 'आपको अपने सुरक्षा मंडल में आमंत्रित करते हैं' } as TriString,
  inviteExplain: {
    en: 'Accepting lets them see your SOS history. You can remove them any time.',
    bn: 'গ্রহণ করলে তারা আপনার SOS ইতিহাস দেখতে পাবেন। যেকোনো সময় সরিয়ে দিতে পারবেন।',
    hi: 'स्वीकार करने पर वे आपका SOS इतिहास देख पाएँगे। आप कभी भी हटा सकते हैं।',
  } as TriString,
  outgoingPending: { en: 'Invite pending', bn: 'আমন্ত্রণ অপেক্ষমান', hi: 'आमंत्रण लंबित' } as TriString,
  linkedMembers: { en: 'Your circle', bn: 'আপনার বৃত্ত', hi: 'आपका मंडल' } as TriString,
  noLinkedMembers: {
    en: 'Your circle is empty. Invite someone you trust.',
    bn: 'আপনার বৃত্ত খালি। বিশ্বস্ত কাউকে আমন্ত্রণ জানান।',
    hi: 'आपका मंडल खाली है। किसी विश्वसनीय को आमंत्रित करें।',
  } as TriString,
  remove: { en: 'Remove', bn: 'সরান', hi: 'हटाएँ' } as TriString,
  removeConfirm: {
    en: 'Remove them from your circle? They will no longer see your SOS history, and you will no longer see theirs.',
    bn: 'তাদের আপনার বৃত্ত থেকে সরাবেন? তারা আর আপনার SOS ইতিহাস দেখতে পাবে না, আপনিও তাদেরটা দেখতে পাবেন না।',
    hi: 'उन्हें अपने मंडल से हटाएँ? वे अब आपका SOS इतिहास नहीं देख पाएँगे, और आप भी उनका नहीं देख पाएँगे।',
  } as TriString,
  memberHistory: { en: 'Their safety log', bn: 'তাদের নিরাপত্তা লগ', hi: 'उनका सुरक्षा लॉग' } as TriString,
  memberNoEvents: {
    en: 'No SOS on their record. A quiet blessing.',
    bn: 'তাদের রেকর্ডে কোনো SOS নেই। শান্ত আশীর্বাদ।',
    hi: 'उनके रिकॉर्ड में कोई SOS नहीं। शांत आशीर्वाद।',
  } as TriString,
  consentNote: {
    en: 'Visible because they consented. Respect it.',
    bn: 'তাদের সম্মতিতে দৃশ্যমান। সম্মান করুন।',
    hi: 'उनकी सहमति से दृश्य है। इसका सम्मान करें।',
  } as TriString,

  /* SOS responder map — Track 1 */
  mapViewTitle: { en: 'Where they need you', bn: 'তাদের কোথায় প্রয়োজন', hi: 'उन्हें आपकी कहाँ आवश्यकता है' } as TriString,
  mapViewMap: { en: 'View map', bn: 'মানচিত্র দেখুন', hi: 'मानचित्र देखें' } as TriString,
  mapActiveAgo: { en: 'SOS active', bn: 'SOS সক্রিয়', hi: 'SOS सक्रिय' } as TriString,
  mapEnded: {
    en: 'This SOS has ended — the location is no longer shared.',
    bn: 'এই SOS শেষ হয়েছে — অবস্থান আর ভাগ করা হচ্ছে না।',
    hi: 'यह SOS समाप्त हो गया है — स्थान अब साझा नहीं किया जा रहा।',
  } as TriString,
  mapNavigate: { en: 'Navigate', bn: 'পথ দেখুন', hi: 'मार्ग देखें' } as TriString,
  mapOfflineNote: {
    en: 'Live map unavailable offline — showing schematic view.',
    bn: 'অফলাইনে লাইভ মানচিত্র নেই — পরিকল্পিত দৃশ্য দেখানো হচ্ছে।',
    hi: 'ऑफ़लाइन लाइव मानचित्र उपलब्ध नहीं — योजनाबद्ध दृश्य दिखाया जा रहा है।',
  } as TriString,
  mapConsentLine: {
    en: 'Responders will see your location until you mark yourself safe.',
    bn: 'আপনি নিরাপদ না জানানো পর্যন্ত সাহায্যকারীরা আপনার অবস্থান দেখতে পাবেন।',
    hi: 'आपके सुरक्षित बताए जाने तक बचावकर्ता आपका स्थान देख पाएँगे।',
  } as TriString,
  mapVisibleTo: {
    en: 'Your location is visible to',
    bn: 'আপনার অবস্থান দৃশ্যমান',
    hi: 'आपका स्थान दिखाई दे रहा है',
  } as TriString,
  mapResponders: { en: 'responders', bn: 'জন সাহায্যকারীর কাছে', hi: 'बचावकर्ताओं को' } as TriString,
  mapStopSharing: {
    en: 'Marking yourself safe stops sharing instantly.',
    bn: 'নিজেকে নিরাপদ ঘোষণা করলেই ভাগ করা তৎক্ষণাৎ বন্ধ হবে।',
    hi: 'स्वयं को सुरक्षित घोषित करते ही साझा करना तुरंत बंद हो जाएगा।',
  } as TriString,
  mapFalseAlarmNote: {
    en: 'A false SOS still shares your location — it counts toward the safety cooldown.',
    bn: 'ভুল SOS-এও আপনার অবস্থান ভাগ হয় — এটি নিরাপত্তা কুলডাউনে গণনা হবে।',
    hi: 'गलत SOS में भी आपका स्थान साझा होता है — यह सुरक्षा कूलडाउन में गिना जाएगा।',
  } as TriString,
};
