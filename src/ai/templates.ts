/**
 * Sanatani Bandhan — AI Assistant Phase 0 · response templates
 * =====================================================================
 * Every user-facing string the assistant can emit lives here — EN/HI/BN
 * fully authored. The other 7 languages (sa/ta/te/mr/gu/kn/ml) resolve via
 * the fallback chain lang → en and are NEVER shipped as empty strings.
 *
 * TRANSLATION PIPELINE: to add a language, author the keys listed in
 * `ASSISTANT_TEMPLATE_KEYS` for that language, then mark them reviewed in
 * `src/i18n/translationQuality.ts` DRAFT_NAMESPACES (namespace
 * 'assistant.*'). Until then, `translationStatus(lang, 'assistant.…')`
 * reports them as drafts and the renderer serves English. Do NOT add empty
 * strings — the fallback chain is the contract.
 *
 * Culturally-loaded words (temple, priest, offering, blessing, greeting,
 * honorific) resolve through `regionalTerm()` with the asker's region, so a
 * Tamil devotee reads "kovil" and a Bengali devotee reads "মন্দির".
 * Pan-Sanatani terms (tithi, panchang, punya, seva…) never vary.
 */

import { regionalTerm } from '../i18n/regionalTerms';
import type { IntentId, LangCode, TaskParams, TemplateLang } from './types';

export type TemplateKey = IntentId | 'crisis' | 'role_denied' | 'empty_input';

/** Keys the translation pipeline must author per language (namespace 'assistant.'). */
export const ASSISTANT_TEMPLATE_KEYS: string[] = [
  'assistant.navigate',
  'assistant.howto',
  'assistant.tithi_today',
  'assistant.festival_next',
  'assistant.dana_help',
  'assistant.sadhana_summary',
  'assistant.booking_help',
  'assistant.language_help',
  'assistant.sos_help',
  'assistant.voice_upgrade',
  'assistant.dharma_question',
  'assistant.navigation_question',
  'assistant.nearby_temples',
  'assistant.greeting',
  'assistant.fallback_unknown',
  'assistant.crisis',
  'assistant.role_denied',
  'assistant.empty_input',
  'assistant.suggestions',
];

type Ctx = { lang: LangCode; region: string; term: (key: string) => string };
type TFn = (p: TaskParams, c: Ctx) => string;

function ctxFor(lang: LangCode, region: string): Ctx {
  const l = (lang || 'en').toLowerCase();
  const r = region || 'other';
  return { lang: l, region: r, term: (key: string) => regionalTerm(key, l, r) };
}

function pickLang(lang: LangCode): TemplateLang {
  const l = (lang || 'en').toLowerCase();
  return l === 'hi' || l === 'bn' ? l : 'en';
}

/* ------------------------------------------------------------------ */
/* Template table: key → variant → lang → renderer.                    */
/* ------------------------------------------------------------------ */

const T: Record<TemplateKey, Record<string, Record<TemplateLang, TFn>>> = {
  /* ---------------- navigate ---------------- */
  navigate: {
    destination: {
      en: (p, c) => `🙏 With pleasure — opening **${p['destLabel']}** for you now.`,
      hi: (p, c) => `🙏 अवश्य — आपके लिए **${p['destLabel']}** खोल रहा हूँ।`,
      bn: (p, c) => `🙏 অবশ্যই — আপনার জন্য **${p['destLabel']}** খুলছি।`,
    },
    clarify: {
      en: (p, c) =>
        `🙏 I'd love to take you there — which place did you mean?\n${p['places']}\nJust name one, and we'll go together.`,
      hi: (p, c) =>
        `🙏 आपको वहाँ ले चलने में प्रसन्नता होगी — किस स्थान की बात कर रहे हैं?\n${p['places']}\nबस नाम बताइए, हम साथ चलेंगे।`,
      bn: (p, c) =>
        `🙏 আপনাকে সেখানে নিয়ে যেতে পারলে আনন্দ হবে — কোন জায়গার কথা বলছেন?\n${p['places']}\nশুধু নামটি বলুন, আমরা একসাথে যাব।`,
    },
    default: {
      en: (p, c) => `🙏 Tell me where you'd like to go — Home, Organisations, Suchana, or Profile?`,
      hi: (p, c) => `🙏 बताइए कहाँ जाना चाहेंगे — होम, संगठन, सूचना, या प्रोफ़ाइल?`,
      bn: (p, c) => `🙏 বলুন কোথায় যেতে চান — হোম, সংগঠন, সূচনা, না প্রোফাইল?`,
    },
  },

  /* ---------------- howto ---------------- */
  howto: {
    guide: {
      en: (p, c) =>
        `🙏 **${p['guideName']}**\n\n${p['whatItIs']}\n\n**First steps:**\n${p['steps']}\n\n**A gentle tip:**\n${p['tips']}\n\nI've opened the full guide for you — take it one step at a time. 🌼`,
      hi: (p, c) =>
        `🙏 **${p['guideName']}**\n\n${p['whatItIs']}\n\n**पहले कदम:**\n${p['steps']}\n\n**एक सुझाव:**\n${p['tips']}\n\nआपके लिए पूरा मार्गदर्शक खोल दिया है — एक-एक कदम बढ़िए। 🌼`,
      bn: (p, c) =>
        `🙏 **${p['guideName']}**\n\n${p['whatItIs']}\n\n**প্রথম পদক্ষেপ:**\n${p['steps']}\n\n**একটি পরামর্শ:**\n${p['tips']}\n\nআপনার জন্য সম্পূর্ণ নির্দেশিকা খুলে দিয়েছি — এক পা এক পা করে এগোন। 🌼`,
    },
    clarify: {
      en: (p, c) =>
        `🙏 Happy to guide you! Which part of the app shall we explore?\n${p['guides']}\nName any one, and I'll walk you through it.`,
      hi: (p, c) =>
        `🙏 मार्गदर्शन में प्रसन्नता होगी! ऐप के किस भाग को जानें?\n${p['guides']}\nकिसी एक का नाम बताइए।`,
      bn: (p, c) =>
        `🙏 পথ দেখাতে পারলে আনন্দ হবে! অ্যাপের কোন অংশটি জানবেন?\n${p['guides']}\nযেকোনো একটির নাম বলুন।`,
    },
    default: {
      en: (p, c) => `🙏 Tell me which part of the app you'd like guidance on, and I'll walk with you.`,
      hi: (p, c) => `🙏 बताइए ऐप के किस भाग में मार्गदर्शन चाहिए, मैं साथ चलूँगा।`,
      bn: (p, c) => `🙏 বলুন অ্যাপের কোন অংশে পথনির্দেশ চান, আমি সাথে থাকব।`,
    },
  },

  /* ---------------- tithi_today ---------------- */
  tithi_today: {
    default: {
      en: (p, c) =>
        `🙏 Today is **${p['paksha']} ${p['tithiName']}** — the ${p['tithiNumber']}${p['ordinal']} ${c.term('tithi')} of the ${p['paksha']} paksha, by Drik reckoning. May your day be auspicious. 🌼`,
      hi: (p, c) =>
        `🙏 आज **${p['paksha']} ${p['tithiName']}** है — दृक् गणना से ${p['paksha']} पक्ष की ${p['tithiNumber']}वीं तिथि। आपका दिन मंगलमय हो। 🌼`,
      bn: (p, c) =>
        `🙏 আজ **${p['paksha']} ${p['tithiName']}** — দৃক্ গণনা অনুযায়ী ${p['paksha']} পক্ষের ${p['tithiNumber']}তম তিথি। আপনার দিন শুভ হোক। 🌼`,
    },
  },

  /* ---------------- festival_next ---------------- */
  festival_next: {
    list: {
      en: (p, c) =>
        `🙏 The coming sacred days on your ${c.term('panchang')}:\n${p['list']}\n\nShall I remind you as one approaches? 🌼`,
      hi: (p, c) =>
        `🙏 आपके पंचांग में आने वाले पावन दिन:\n${p['list']}\n\nक्या निकट आने पर स्मरण कराऊँ? 🌼`,
      bn: (p, c) =>
        `🙏 আপনার পঞ্জিকায় আসন্ন পবিত্র দিনগুলি:\n${p['list']}\n\nকাছে এলে কি মনে করিয়ে দেব? 🌼`,
    },
    ekadashi: {
      en: (p, c) =>
        `🙏 The next **Ekadashi** falls on **${p['date']}** (${p['name']}). A beautiful day for fasting and remembrance. 🌼`,
      hi: (p, c) =>
        `🙏 अगली **एकादशी** **${p['date']}** को है (${p['name']})। उपवास और स्मरण का पावन दिन। 🌼`,
      bn: (p, c) =>
        `🙏 পরবর্তী **একাদশী** **${p['date']}** তারিখে (${p['name']})। উপবাস ও স্মরণের পবিত্র দিন। 🌼`,
    },
    none: {
      en: (p, c) =>
        `🙏 I don't see festivals marked in the coming weeks of your ${c.term('panchang')}. The daily ${c.term('tithi')} still carries its own quiet ${c.term('blessing')}. 🌼`,
      hi: (p, c) =>
        `🙏 आने वाले हफ़्तों में पंचांग में कोई उत्सव अंकित नहीं दिख रहा। फिर भी प्रतिदिन की तिथि में अपना आशीर्वाद है। 🌼`,
      bn: (p, c) =>
        `🙏 আগামী সপ্তাহগুলিতে পঞ্জিকায় কোনো উৎসব চিহ্নিত দেখছি না। তবু প্রতিদিনের তিথিতেই নিজস্ব আশীর্বাদ আছে। 🌼`,
    },
    default: {
      en: (p, c) => `🙏 Ask me "when is the next festival?" or "when is Ekadashi?" and I'll look it up for you.`,
      hi: (p, c) => `🙏 पूछिए "अगला उत्सव कब है?" या "एकादशी कब है?" — मैं देखकर बताऊँगा।`,
      bn: (p, c) => `🙏 জিজ্ঞেস করুন "পরের উৎসব কবে?" বা "একাদশী কবে?" — আমি দেখে জানাব।`,
    },
  },

  /* ---------------- dana_help ---------------- */
  dana_help: {
    default: {
      en: (p, c) =>
        `🙏 Giving here is simple and honest — **we never hold a rupee**; your ${c.term('offering')} goes straight to the cause.\n\n` +
        `• Tap **Give** on the Home tab to open the express dana sheet\n` +
        `• Choose ₹51, ₹101, ₹501, ₹1100 — or any amount your heart chooses\n` +
        `• Pay in seconds with UPI; every gift is recorded in your punya ledger with a shareable ${c.term('blessing')}\n\n` +
        `Shall I open the dana sheet for you? 🌼`,
      hi: (p, c) =>
        `🙏 यहाँ दान सरल और निष्कपट है — **हम एक रुपया भी नहीं रखते**; आपका दान सीधे कार्य को जाता है।\n\n` +
        `• होम टैब पर **दान दें** दबाकर एक्सप्रेस दान पत्र खोलें\n` +
        `• ₹51, ₹101, ₹501, ₹1100 चुनें — या जो राशि मन करे\n` +
        `• UPI से सेकंडों में भुगतान; हर दान पुण्य-लेखा में आशीर्वाद सहित दर्ज\n\n` +
        `क्या आपके लिए दान पत्र खोल दूँ? 🌼`,
      bn: (p, c) =>
        `🙏 এখানে দান সহজ ও নির্মল — **আমরা একটি টাকাও রাখি না**; আপনার দান সরাসরি কাজে যায়।\n\n` +
        `• হোম ট্যাবে **দান করুন** চেপে এক্সপ্রেস দান পত্র খুলুন\n` +
        `• ₹51, ₹101, ₹501, ₹1100 বেছে নিন — বা মন যা চায়\n` +
        `• UPI-তে সেকেন্ডে পেমেন্ট; প্রতিটি দান পুণ্য-খাতায় আশীর্বাদসহ লেখা থাকে\n\n` +
        `আপনার জন্য দান পত্র খুলে দেব? 🌼`,
    },
  },

  /* ---------------- sadhana_summary ---------------- */
  sadhana_summary: {
    summary: {
      en: (p, c) =>
        `🙏 Your sadhana, dear ${c.term('devotee')}:\n\n` +
        `• **Japa today:** ${p['japaToday']} names\n` +
        `• **Streak:** ${p['streak']} ${p['streak'] === 1 ? 'day' : 'days'} of unbroken practice\n` +
        `• **Vrata observances:** ${p['vrataCount']}\n` +
        `• **Sankalpas:** ${p['sankalpaCount']}\n\n` +
        `Steady as a diya in still air — keep going. 🪔`,
      hi: (p, c) =>
        `🙏 आपकी साधना, प्रिय भक्त:\n\n` +
        `• **आज का जप:** ${p['japaToday']} नाम\n` +
        `• **अटूट क्रम:** ${p['streak']} दिन\n` +
        `• **व्रत:** ${p['vrataCount']}\n` +
        `• **संकल्प:** ${p['sankalpaCount']}\n\n` +
        `शांत वायु में दीये की भाँति स्थिर — लगे रहिए। 🪔`,
      bn: (p, c) =>
        `🙏 আপনার সাধনা, প্রিয় ভক্ত:\n\n` +
        `• **আজকের জপ:** ${p['japaToday']} নাম\n` +
        `• **অবিচ্ছিন্ন ধারা:** ${p['streak']} দিন\n` +
        `• **ব্রত:** ${p['vrataCount']}\n` +
        `• **সংকল্প:** ${p['sankalpaCount']}\n\n` +
        `স্থির বাতাসে প্রদীপের মতো অটল — এগিয়ে যান। 🪔`,
    },
    empty: {
      en: (p, c) =>
        `🙏 Your sadhana journal is still a blank page — and every great journey begins with one name.\n\nOpen **Home → Sadhana** and offer your first japa. I'll be here to count your streaks. 🪔`,
      hi: (p, c) =>
        `🙏 आपकी साधना-पत्रिका अभी कोरा पृष्ठ है — और हर महान यात्रा एक नाम से शुरू होती है।\n\n**होम → साधना** खोलकर पहला जप अर्पित करें। मैं आपके क्रम की गिनती करूँगा। 🪔`,
      bn: (p, c) =>
        `🙏 আপনার সাধনা-খাতা এখনও শূন্য পাতা — আর প্রতিটি মহান যাত্রা শুরু হয় একটি নামে।\n\n**হোম → সাধনা** খুলে প্রথম জপ অর্পণ করুন। আমি আপনার ধারার হিসাব রাখব। 🪔`,
    },
    default: {
      en: (p, c) => `🙏 Ask me "how is my sadhana?" and I'll read your journal for you.`,
      hi: (p, c) => `🙏 पूछिए "मेरी साधना कैसी है?" — मैं आपकी पत्रिका पढ़कर बताऊँगा।`,
      bn: (p, c) => `🙏 জিজ্ঞেস করুন "আমার সাধনা কেমন?" — আমি আপনার খাতা পড়ে জানাব।`,
    },
  },

  /* ---------------- navigation_question ---------------- */
  navigation_question: {
    answer: {
      en: (p, c) => `${p['answer']}`,
      hi: (p, c) => `${p['answer']}`,
      bn: (p, c) => `${p['answer']}`,
    },
    clarify: {
      en: (p, c) =>
        `🙏 I'd love to point you the right way — which part of the app are you looking for? Try "where is my wallet?" or "where is the Tirtha Diary?" 🌼`,
      hi: (p, c) =>
        `🙏 आपको सही रास्ता बताने में प्रसन्नता होगी — ऐप का कौन-सा भाग ढूँढ रहे हैं? "मेरा वॉलेट कहाँ है?" या "तीर्थ डायरी कहाँ है?" पूछकर देखें। 🌼`,
      bn: (p, c) =>
        `🙏 আপনাকে সঠিক পথ দেখাতে পারলে আনন্দ হবে — অ্যাপের কোন অংশটি খুঁজছেন? "আমার ওয়ালেট কোথায়?" বা "তীর্থ ডায়েরি কোথায়?" জিজ্ঞেস করে দেখুন। 🌼`,
    },
    default: {
      en: (p, c) => `🙏 Ask me where anything lives in the app — your wallet, Tirtha Diary, group chats, language settings — and I'll take you there. 🌼`,
      hi: (p, c) => `🙏 ऐप में कुछ भी कहाँ है, पूछिए — आपका वॉलेट, तीर्थ डायरी, ग्रुप चैट, भाषा सेटिंग — मैं आपको वहाँ ले चलूँगा। 🌼`,
      bn: (p, c) => `🙏 অ্যাপে যেকোনো কিছু কোথায় আছে জিজ্ঞেস করুন — আপনার ওয়ালেট, তীর্থ ডায়েরি, গ্রুপ চ্যাট, ভাষা সেটিং — আমি আপনাকে সেখানে নিয়ে যাব। 🌼`,
    },
  },
  /* ---------------- nearby_temples ---------------- */
  nearby_temples: {
    consent: {
      en: (p, c) => `🙏 To find temples near you, I'll need your location — just this once, never stored, never shared. May I access it?`,
      hi: (p, c) => `🙏 आपके पास के मंदिर खोजने के लिए मुझे आपका स्थान चाहिए — सिर्फ इस बार, कभी संग्रहित नहीं, कभी साझा नहीं। क्या मैं एक्सेस कर सकता हूँ?`,
      bn: (p, c) => `🙏 আপনার কাছের মন্দির খুঁজতে আমার আপনার অবস্থান দরকার — শুধু এইবার, কখনো সংরক্ষণ নয়, কখনো ভাগ নয়। আমি কি অ্যাক্সেস করতে পারি?`,
    },
    denied: {
      en: (p, c) =>
        `🙏 I understand completely — your location stays yours. If you'd like, tell me a city name and I'll find the great tirthas near it. Or explore the campus maps of temples in your Organisations. 🌼`,
      hi: (p, c) =>
        `🙏 मैं पूरी तरह समझता हूँ — आपका स्थान आपका ही रहेगा। चाहें तो किसी शहर का नाम बताएँ — मैं उसके पास के प्रमुख तीर्थ बताऊँगा। या अपने संगठनों के मंदिरों के परिसर मानचित्र देखें। 🌼`,
      bn: (p, c) =>
        `🙏 আমি সম্পূর্ণ বুঝি — আপনার অবস্থান আপনারই থাকবে। চাইলে কোনো শহরের নাম বলুন — আমি তার কাছের প্রধান তীর্থগুলো জানাব। অথবা আপনার সংগঠনগুলোর মন্দিরের ক্যাম্পাস মানচিত্র দেখুন। 🌼`,
    },
    results: {
      en: (p, c) => `${p['header']}\n\n${p['list']}\n\n${p['footer']}`,
      hi: (p, c) => `${p['header']}\n\n${p['list']}\n\n${p['footer']}`,
      bn: (p, c) => `${p['header']}\n\n${p['list']}\n\n${p['footer']}`,
    },
    empty: {
      en: (p, c) =>
        `🛕 No mapped temples within 25km of you — but the great tirthas are never far in spirit. Try a city name, or ask your nearest temple to create a campus map so fellow devotees can find it. 🪔`,
      hi: (p, c) =>
        `🛕 आपके 25 किमी के दायरे में कोई मानचित्रित मंदिर नहीं — पर महान तीर्थ आत्मा से कभी दूर नहीं। किसी शहर का नाम बताकर देखें, या अपने निकटतम मंदिर से परिसर मानचित्र बनाने को कहें। 🪔`,
      bn: (p, c) =>
        `🛕 আপনার 25 কিমির মধ্যে কোনো মানচিত্রিত মন্দির নেই — তবে মহান তীর্থ আত্মায় কখনো দূরে নয়। কোনো শহরের নাম বলে দেখুন, অথবা আপনার কাছের মন্দিরকে ক্যাম্পাস মানচিত্র বানাতে বলুন। 🪔`,
    },
    locating: {
      en: (p, c) => `🛕 Finding your location… one moment.`,
      hi: (p, c) => `🛕 आपका स्थान खोज रहा हूँ… एक क्षण।`,
      bn: (p, c) => `🛕 আপনার অবস্থান খুঁজছি… এক মুহূর্ত।`,
    },
    with_coords: {
      en: (p, c) => `🙏 Searching for temples near you…`,
      hi: (p, c) => `🙏 आपके पास मंदिर खोज रहा हूँ…`,
      bn: (p, c) => `🙏 আপনার কাছে মন্দির খুঁজছি…`,
    },
    default: {
      en: (p, c) => `🙏 Ask me "temples near me" and I'll help you find sacred spaces nearby — always with your explicit permission. 🌼`,
      hi: (p, c) => `🙏 "मेरे पास मंदिर" पूछिए — आपकी स्पष्ट अनुमति से पास के पवित्र स्थान खोजने में मदद करूँगा। 🌼`,
      bn: (p, c) => `🙏 "আমার কাছে মন্দির" জিজ্ঞেস করুন — আপনার স্পষ্ট অনুমতিতে কাছের পবিত্র স্থান খুঁজতে সাহায্য করব। 🌼`,
    },
  },
  /* ---------------- tirtha_summary ---------------- */
  tirtha_summary: {
    summary: {
      en: (p, c) =>
        `🙏 Your Tirtha Diary, dear ${c.term('devotee')}:\n\n` +
        `• **Temples visited:** ${p['templeCount']}\n` +
        `• **Visits recorded:** ${p['visitCount']}\n` +
        `• **Yatras:** ${p['yatraCount']}\n` +
        (p['latestTemple'] ? `\nMost recent: **${p['latestTemple']}** (${p['latestAt']})\n` : '') +
        `\nEvery step a prayer. 🪔`,
      hi: (p, c) =>
        `🙏 आपकी तीर्थ डायरी, प्रिय भक्त:\n\n` +
        `• **मंदिरों के दर्शन:** ${p['templeCount']}\n` +
        `• **दर्ज यात्राएँ:** ${p['visitCount']}\n` +
        `• **यात्राएँ:** ${p['yatraCount']}\n` +
        (p['latestTemple'] ? `\nसबसे हाल की: **${p['latestTemple']}** (${p['latestAt']})\n` : '') +
        `\nहर कदम एक प्रार्थना। 🪔`,
      bn: (p, c) =>
        `🙏 আপনার তীর্থ ডায়েরি, প্রিয় ভক্ত:\n\n` +
        `• **মন্দির দর্শন:** ${p['templeCount']}\n` +
        `• **লিপিবদ্ধ ভ্রমণ:** ${p['visitCount']}\n` +
        `• **যাত্রা:** ${p['yatraCount']}\n` +
        (p['latestTemple'] ? `\nসবচেয়ে সাম্প্রতিক: **${p['latestTemple']}** (${p['latestAt']})\n` : '') +
        `\nপ্রতিটি পদক্ষেপ একটি প্রার্থনা। 🪔`,
    },
    empty: {
      en: (p, c) =>
        `🙏 Your Tirtha Diary is still a blank page — and every pilgrimage begins with a single step.\n\nWhen you visit a temple, tap **🪔 Record this visit** and your diary begins. Only you will ever see it. 🪔`,
      hi: (p, c) =>
        `🙏 आपकी तीर्थ डायरी अभी कोरा पृष्ठ है — और हर तीर्थयात्रा एक कदम से शुरू होती है।\n\nजब आप किसी मंदिर जाएँ, **🪔 इस यात्रा को दर्ज करें** दबाएँ — आपकी डायरी शुरू होगी। इसे केवल आप देखेंगे। 🪔`,
      bn: (p, c) =>
        `🙏 আপনার তীর্থ ডায়েরি এখনও শূন্য পাতা — আর প্রতিটি তীর্থযাত্রা শুরু হয় একটি পদক্ষেপে।\n\nমন্দিরে গেলে **🪔 এই ভ্রমণটি লিপিবদ্ধ করুন** চাপুন — আপনার ডায়েরি শুরু হবে। এটি শুধু আপনিই দেখবেন। 🪔`,
    },
    default: {
      en: (p, c) => `🙏 Ask me "how many temples have I visited?" and I'll read your diary for you.`,
      hi: (p, c) => `🙏 पूछिए "मैंने कितने मंदिरों के दर्शन किए?" — मैं आपकी डायरी पढ़कर बताऊँगा।`,
      bn: (p, c) => `🙏 জিজ্ঞেস করুন "আমি কটি মন্দির দর্শন করেছি?" — আমি আপনার ডায়েরি পড়ে জানাব।`,
    },
  },

  /* ---------------- booking_help ---------------- */
  booking_help: {
    default: {
      en: (p, c) =>
        `🙏 To invite a **Purohit** or **Jyotishi** for your sacred occasion:\n\n` +
        `• Open **Seva Journeys** — twelve life events, each with trusted professionals\n` +
        `• Choose your ${c.term('priest')}, pick a time, and confirm — pay by wallet, UPI, or after the seva\n` +
        `• Every booking carries an ${c.term('blessing')} and a clear receipt\n\n` +
        `Shall I take you to Seva Journeys? 🌼`,
      hi: (p, c) =>
        `🙏 अपने पावन अवसर के लिए **पुरोहित** या **ज्योतिषी** को आमंत्रित करें:\n\n` +
        `• **सेवा यात्राएँ** खोलें — बारह जीवन-संस्कार, प्रत्येक में विश्वसनीय आचार्य\n` +
        `• अपने पुरोहित चुनें, समय तय करें — वॉलेट, UPI या सेवा के बाद भुगतान\n` +
        `• हर बुकिंग में आशीर्वाद और स्पष्ट रसीद\n\n` +
        `क्या आपको सेवा यात्राओं तक ले चलूँ? 🌼`,
      bn: (p, c) =>
        `🙏 আপনার পবিত্র অনুষ্ঠানের জন্য **পুরোহিত** বা **জ্যোতিষী** আমন্ত্রণ করুন:\n\n` +
        `• **সেবা যাত্রা** খুলুন — বারোটি জীবন-সংস্কার, প্রতিটিতে বিশ্বস্ত আচার্য\n` +
        `• আপনার পুরোহিত বেছে নিন, সময় ঠিক করুন — ওয়ালেট, UPI বা সেবার পর পেমেন্ট\n` +
        `• প্রতিটি বুকিংয়ে আশীর্বাদ ও স্পষ্ট রসিদ\n\n` +
        `আপনাকে সেবা যাত্রায় নিয়ে যাব? 🌼`,
    },
  },

  /* ---------------- language_help ---------------- */
  language_help: {
    default: {
      en: (p, c) =>
        `🙏 The app speaks **ten languages** — English, हिन्दी, বাংলা, संस्कृतम्, தமிழ், తెలుగు, मराठी, ગુજરાતી, ಕನ್ನಡ, മലയാളം.\n\n` +
        `Your words, your mother tongue: open **Profile → Language**, choose the language of your heart, and the whole app will follow. Your choice is always honoured — we never switch it silently. 🌼\n\n` +
        `Shall I open your Profile?`,
      hi: (p, c) =>
        `🙏 ऐप **दस भाषाएँ** बोलता है — English, हिन्दी, বাংলা, संस्कृतम्, தமிழ், తెలుగు, मराठी, ગુજરાતી, ಕನ್ನಡ, മലയാളം।\n\n` +
        `आपके शब्द, आपकी मातृभाषा: **प्रोफ़ाइल → भाषा** खोलकर मन की भाषा चुनें — पूरा ऐप साथ चलेगा। आपका चुनाव सदा सम्मानित है — हम कभी चुपके से नहीं बदलते। 🌼\n\n` +
        `क्या आपकी प्रोफ़ाइल खोल दूँ?`,
      bn: (p, c) =>
        `🙏 অ্যাপ **দশটি ভাষায়** কথা বলে — English, हिन्दी, বাংলা, संस्कृतम्, தமிழ், తెలుగు, मराठी, ગુજરાતી, ಕನ್ನಡ, മലയാളം।\n\n` +
        `আপনার কথা, আপনার মাতৃভাষা: **প্রোফাইল → ভাষা** খুলে মনের ভাষা বেছে নিন — পুরো অ্যাপ সাথে চলবে। আপনার পছন্দ সর্বদা সম্মানিত — আমরা কখনও নীরবে বদলাই না। 🌼\n\n` +
        `আপনার প্রোফাইল খুলে দেব?`,
    },
  },

  /* ---------------- sos_help ---------------- */
  sos_help: {
    default: {
      en: (p, c) =>
        `🙏 **SOS is here to protect you.**\n\n` +
        `• The SOS button is always within reach on your Home screen\n` +
        `• Three taps send an alert with your location to your trusted circle and nearby responders\n` +
        `• Your location is shared **only at the moment of SOS** — never tracked otherwise\n\n` +
        `⚠️ **If you are in danger right now, press the SOS button immediately.** You don't need me — just press it. May you be safe. 🪔`,
      hi: (p, c) =>
        `🙏 **SOS आपकी रक्षा के लिए है।**\n\n` +
        `• SOS बटन होम स्क्रीन पर सदा आपकी पहुँच में है\n` +
        `• तीन टैप से आपके विश्वस्त जनों और निकट के सहायकों को स्थान सहित सूचना जाती है\n` +
        `• आपका स्थान **केवल SOS के क्षण** साझा होता है — अन्यथा कभी ट्रैक नहीं होता\n\n` +
        `⚠️ **यदि आप अभी खतरे में हैं, तो तुरंत SOS बटन दबाइए।** मेरी आवश्यकता नहीं — बस दबाइए। आप सुरक्षित रहें। 🪔`,
      bn: (p, c) =>
        `🙏 **SOS আপনার রক্ষার জন্য।**\n\n` +
        `• SOS বোতাম হোম স্ক্রিনে সর্বদা আপনার নাগালে\n` +
        `• তিনটি ট্যাপে আপনার বিশ্বস্তজন ও কাছের সহায়কদের কাছে অবস্থানসহ সতর্কতা যায়\n` +
        `• আপনার অবস্থান **শুধু SOS-এর মুহূর্তে** শেয়ার হয় — অন্যথায় কখনও ট্র্যাক হয় না\n\n` +
        `⚠️ **আপনি যদি এখনই বিপদে থাকেন, এখনই SOS বোতাম চাপুন।** আমাকে দরকার নেই — শুধু চাপুন। আপনি নিরাপদে থাকুন। 🪔`,
    },
  },

  /* ---------------- greeting ---------------- */
  greeting: {
    default: {
      en: (p, c) =>
        `${c.term('greeting')}! 🙏 I'm your humble helper in Sanatani Bandhan.\n\n` +
        `I can tell you **today's ${c.term('tithi')}**, the **next festival**, guide you through any part of the app, help with **dana**, read your **sadhana** journal, or help you **book a ${c.term('priest')}**.\n\n` +
        `What would you like to know, dear ${c.term('devotee')}? 🌼`,
      hi: (p, c) =>
        `${c.term('greeting')}! 🙏 मैं सनातनी बंधन में आपका विनम्र सहायक हूँ।\n\n` +
        `मैं आपको **आज की तिथि**, **अगला उत्सव** बता सकता हूँ, ऐप के किसी भी भाग का मार्गदर्शन, **दान** में सहायता, आपकी **साधना** पत्रिका पढ़ना, या **पुरोहित** बुक करने में मदद कर सकता हूँ।\n\n` +
        `प्रिय भक्त, क्या जानना चाहेंगे? 🌼`,
      bn: (p, c) =>
        `${c.term('greeting')}! 🙏 আমি সনাতনী বন্ধনে আপনার বিনম্র সহায়ক।\n\n` +
        `আমি আপনাকে **আজকের তিথি**, **পরের উৎসব** জানাতে পারি, অ্যাপের যেকোনো অংশের পথ দেখাতে পারি, **দানে** সাহায্য করতে পারি, আপনার **সাধনা** খাতা পড়তে পারি, বা **পুরোহিত** বুক করতে সাহায্য করতে পারি।\n\n` +
        `প্রিয় ভক্ত, কী জানতে চান? 🌼`,
    },
  },

  /* ---------------- voice_upgrade ---------------- */
  voice_upgrade: {
    default: {
      en: (p, c) =>
        `🙏 Ah, you'd like a warmer voice! I can live **entirely on your phone** — no internet needed after, nothing ever leaves your device.\\n\\n` +
        `It's a ${p['size']} download (WiFi is kinder), and you can remove it anytime. Shall I take you to it?\\n\\n` +
        `**Profile → 🙏 On-device AI voice** — it's always there, even if you change your mind later. 🌼`,
      hi: (p, c) =>
        `🙏 आह, आपको उष्ण वाणी चाहिए! मैं **पूरी तरह आपके फ़ोन में** रह सकता हूँ — बाद में इंटरनेट की ज़रूरत नहीं, कुछ भी डिवाइस नहीं छोड़ता।\\n\\n` +
        `यह ${p['size']} का डाउनलोड है (WiFi बेहतर), और आप इसे कभी भी हटा सकते हैं। क्या आपको वहाँ ले चलूँ?\\n\\n` +
        `**प्रोफ़ाइल → 🙏 On-device AI voice** — यह हमेशा वहीं रहेगा, बाद में मन बदले तब भी। 🌼`,
      bn: (p, c) =>
        `🙏 আহ, আপনি উষ্ণতর কণ্ঠ চান! আমি **সম্পূর্ণ আপনার ফোনেই** থাকতে পারি — পরে ইন্টারনেট দরকার নেই, কিছুই ডিভাইস ছাড়ে না।\\n\\n` +
        `এটি ${p['size']} ডাউনলোড (WiFi ভালো), এবং আপনি যেকোনো সময় মুছে ফেলতে পারেন। আপনাকে সেখানে নিয়ে যাব?\\n\\n` +
        `**প্রোফাইল → 🙏 On-device AI voice** — এটি সবসময় সেখানেই থাকবে, পরে মন বদলালেও। 🌼`,
    },
  },

  /* ---------------- dharma_question ---------------- */
  dharma_question: {
    answer: {
      en: (p, c) => `${p['answer']}`,
      hi: (p, c) => `${p['answer']}`,
      bn: (p, c) => `${p['answer']}`,
    },
    escalate: {
      en: (p, c) =>
        `🙏 This question deserves a knowledgeable guide — I won't guess at matters of dharma.\n\n` +
        `**Shall I connect you with Purohitji?** A learned ${c.term('priest')} can give you the careful, personal guidance such questions deserve. 🌼`,
      hi: (p, c) =>
        `🙏 यह प्रश्न एक ज्ञानी मार्गदर्शक का हकदार है — धर्म के विषयों पर मैं अनुमान नहीं लगाऊँगा।\n\n` +
        `**क्या मैं आपको पुरोहितजी से जोड़ दूँ?** एक विद्वान पुरोहित ऐसे प्रश्नों के योग्य स्नेहपूर्ण, व्यक्तिगत मार्गदर्शन देंगे। 🌼`,
      bn: (p, c) =>
        `🙏 এই প্রশ্নটি একজন জ্ঞানী পথপ্রদর্শকের যোগ্য — ধর্মের বিষয়ে আমি অনুমান করব না।\n\n` +
        `**আপনাকে কি পুরোহিতজির সাথে যুক্ত করে দেব?** একজন বিদ্বান পুরোহিত এমন প্রশ্নের যোগ্য স্নেহপূর্ণ, ব্যক্তিগত পথনির্দেশ দেবেন। 🌼`,
    },
    default: {
      en: (p, c) => `🙏 Ask me about tithi, festivals, daily practice, samskaras, or the meaning of dharma — I'll share what our verified texts hold. 🌼`,
      hi: (p, c) => `🙏 तिथि, उत्सव, दैनिक साधना, संस्कार या धर्म के अर्थ के बारे में पूछिए — हमारे प्रमाणित ग्रंथों में जो है, वही बाँटूँगा। 🌼`,
      bn: (p, c) => `🙏 তিথি, উৎসব, দৈনিক সাধনা, সংস্কার বা ধর্মের অর্থ নিয়ে জিজ্ঞেস করুন — আমাদের যাচাইকৃত গ্রন্থে যা আছে, তাই ভাগ করব। 🌼`,
    },
  },

  /* ---------------- fallback_unknown ---------------- */
  fallback_unknown: {
    unknown: {
      en: (p, c) =>
        `🙏 Forgive me — that question is beyond what I've been taught so far.\n\n` +
        `Here is what I *can* do with a devoted heart:\n${p['capabilities']}\n\n` +
        `Or ask me anything in your own words — I'll do my best. 🌼`,
      hi: (p, c) =>
        `🙏 क्षमा करें — यह प्रश्न अभी मेरी शिक्षा से परे है।\n\n` +
        `भक्तिभाव से मैं यह सब कर सकता हूँ:\n${p['capabilities']}\n\n` +
        `या अपने शब्दों में कुछ भी पूछिए — मैं यथासंभव प्रयास करूँगा। 🌼`,
      bn: (p, c) =>
        `🙏 ক্ষমা করবেন — এই প্রশ্নটি এখনও আমার শিক্ষার বাইরে।\n\n` +
        `ভক্তিভরে আমি এগুলি করতে পারি:\n${p['capabilities']}\n\n` +
        `বা নিজের ভাষায় যেকোনো কিছু জিজ্ঞেস করুন — আমি যথাসাধ্য চেষ্টা করব। 🌼`,
    },
    dharma: {
      en: (p, c) =>
        `🙏 This touches the sacred texts, and I will not improvise on dharma — that would be disrespectful to the tradition.\n\n` +
        `**This isn't in our verified texts — shall I connect you with Purohitji?** A learned ${c.term('priest')} can guide you properly, with the care such questions deserve. 🌼`,
      hi: (p, c) =>
        `🙏 यह पवित्र ग्रंथों का विषय है, और धर्म पर मैं कल्पना नहीं करूँगा — यह परंपरा का अनादर होगा।\n\n` +
        `**यह हमारे प्रमाणित ग्रंथों में नहीं है — क्या मैं आपको पुरोहितजी से जोड़ दूँ?** एक विद्वान पुरोहित उचित मार्गदर्शन देंगे, जिस स्नेह के ऐसे प्रश्न हकदार हैं। 🌼`,
      bn: (p, c) =>
        `🙏 এটি পবিত্র শাস্ত্রের বিষয়, আর ধর্ম নিয়ে আমি কল্পনা করব না — তা পরম্পরার প্রতি অশ্রদ্ধা হবে।\n\n` +
        `**এটি আমাদের যাচাইকৃত গ্রন্থে নেই — আপনাকে কি পুরোহিতজির সাথে যুক্ত করে দেব?** একজন বিদ্বান পুরোহিত যথাযথ পথ দেখাবেন, যে স্নেহের এমন প্রশ্ন যোগ্য। 🌼`,
    },
    default: {
      en: (p, c) => `🙏 Forgive me — I'm still learning. Ask me about tithi, festivals, dana, sadhana, or booking a priest. 🌼`,
      hi: (p, c) => `🙏 क्षमा करें — मैं अभी सीख रहा हूँ। तिथि, उत्सव, दान, साधना या पुरोहित बुकिंग के बारे में पूछिए। 🌼`,
      bn: (p, c) => `🙏 ক্ষমা করবেন — আমি এখনও শিখছি। তিথি, উৎসব, দান, সাধনা বা পুরোহিত বুকিং নিয়ে জিজ্ঞেস করুন। 🌼`,
    },
  },

  /* ---------------- crisis ---------------- */
  crisis: {
    default: {
      en: (p, c) =>
        `🙏 **You are precious, and your safety matters most right now.**\n\n` +
        `I'm not going anywhere — but I'm only a helper, not a rescuer. Please:\n\n` +
        `• **Press the SOS button** on your Home screen right now — it alerts your trusted circle with your location\n` +
        `• If you can, call someone you trust, or your local emergency number\n` +
        `• If thoughts of harming yourself feel strong, please reach out to a crisis helpline in your country immediately\n\n` +
        `You don't have to face this alone. Press SOS now. 🪔`,
      hi: (p, c) =>
        `🙏 **आप बहुमूल्य हैं, और इस क्षण आपकी सुरक्षा सबसे महत्वपूर्ण है।**\n\n` +
        `मैं यहीं हूँ — पर मैं केवल सहायक हूँ, रक्षक नहीं। कृपया:\n\n` +
        `• **अभी होम स्क्रीन का SOS बटन दबाइए** — यह आपके विश्वस्त जनों को स्थान सहित सूचित करेगा\n` +
        `• संभव हो तो किसी विश्वस्त व्यक्ति या स्थानीय आपातकालीन नंबर पर कॉल करें\n` +
        `• यदि स्वयं को हानि पहुँचाने के विचार प्रबल हों, तो तुरंत अपने देश की संकट हेल्पलाइन से संपर्क करें\n\n` +
        `आपको अकेले इसका सामना नहीं करना है। अभी SOS दबाइए। 🪔`,
      bn: (p, c) =>
        `🙏 **আপনি অমূল্য, আর এই মুহূর্তে আপনার নিরাপত্তাই সবচেয়ে গুরুত্বপূর্ণ।**\n\n` +
        `আমি এখানেই আছি — কিন্তু আমি শুধু সহায়ক, রক্ষক নই। অনুগ্রহ করে:\n\n` +
        `• **এখনই হোম স্ক্রিনের SOS বোতাম চাপুন** — এটি আপনার বিশ্বস্তজনদের অবস্থানসহ জানাবে\n` +
        `• সম্ভব হলে বিশ্বস্ত কাউকে বা স্থানীয় জরুরি নম্বরে কল করুন\n` +
        `• নিজের ক্ষতি করার চিন্তা প্রবল হলে অবিলম্বে আপনার দেশের সংকট হেল্পলাইনে যোগাযোগ করুন\n\n` +
        `একা এর মুখোমুখি হতে হবে না। এখনই SOS চাপুন। 🪔`,
    },
  },

  /* ---------------- role_denied ---------------- */
  role_denied: {
    default: {
      en: (p, c) =>
        `🙏 That corner of the app — **${p['area']}** — is tended by temple sevaks and trustees, so I keep it aside out of respect for their seva.\n\n` +
        `Is there something in your own devotional journey I can help with — tithi, festivals, dana, or sadhana? 🌼`,
      hi: (p, c) =>
        `🙏 ऐप का वह भाग — **${p['area']}** — मंदिर के सेवकों और न्यासियों की सेवा में है, इसलिए मैं उसे उनकी सेवा के सम्मान में अलग रखता हूँ।\n\n` +
        `आपकी अपनी भक्ति-यात्रा में क्या सहायता करूँ — तिथि, उत्सव, दान, या साधना? 🌼`,
      bn: (p, c) =>
        `🙏 অ্যাপের সেই অংশটি — **${p['area']}** — মন্দিরের সেবক ও ট্রাস্টিদের সেবায়, তাই তাঁদের সেবার সম্মানে আমি তা সরিয়ে রাখি।\n\n` +
        `আপনার নিজের ভক্তি-যাত্রায় কী সাহায্য করব — তিথি, উৎসব, দান, না সাধনা? 🌼`,
    },
  },

  /* ---------------- empty_input ---------------- */
  empty_input: {
    default: {
      en: (p, c) =>
        `🙏 ${c.term('greeting')}! I'm listening — what would you like to know? You can ask about today's ${c.term('tithi')}, festivals, dana, your sadhana, or booking a ${c.term('priest')}. 🌼`,
      hi: (p, c) =>
        `🙏 नमस्ते! मैं सुन रहा हूँ — क्या जानना चाहेंगे? आज की तिथि, उत्सव, दान, साधना या पुरोहित बुकिंग के बारे में पूछ सकते हैं। 🌼`,
      bn: (p, c) =>
        `🙏 নমস্কার! আমি শুনছি — কী জানতে চান? আজকের তিথি, উৎসব, দান, সাধনা বা পুরোহিত বুকিং নিয়ে জিজ্ঞেস করতে পারেন। 🌼`,
    },
  },
  /* ---------------- GodMode Copilot ----------------
   * Copilot executors build their own full text in params; these
   * templates pass it through. `text` is always set by the executor. */
  admin_briefing: {
    default: {
      en: (p, c) => `${p['text']}`,
      hi: (p, c) => `${p['text']}`,
      bn: (p, c) => `${p['text']}`,
    },
  },
  admin_stats: {
    default: {
      en: (p, c) => `${p['text']}`,
      hi: (p, c) => `${p['text']}`,
      bn: (p, c) => `${p['text']}`,
    },
  },
  admin_moderation_help: {
    default: {
      en: (p, c) => {
        const items = (p['items'] as Array<{ preview: string; authorName: string; reportCount: number; recommendation: string; reasoning: string }> | undefined) || [];
        if (!items.length) return `${p['text'] || p['headline'] || ''}`;
        const head = `${p['headline'] || ''}`;
        const body = items.map((it, i) =>
          `\n${i + 1}. "${(it.preview || '').slice(0, 100)}" — ${it.authorName} (${it.reportCount} reports)\n   → ${String(it.recommendation).toUpperCase()}: ${it.reasoning}`
        ).join('\n');
        return `${head}${body}`;
      },
      hi: (p, c) => {
        const items = (p['items'] as Array<{ preview: string; authorName: string; reportCount: number; recommendation: string; reasoning: string }> | undefined) || [];
        if (!items.length) return `${p['text'] || p['headline'] || ''}`;
        return `${p['headline'] || ''}\n` + items.map((it, i) =>
          `\n${i + 1}. "${(it.preview || '').slice(0, 100)}" — ${it.authorName} (${it.reportCount} रिपोर्ट)\n   → ${String(it.recommendation).toUpperCase()}: ${it.reasoning}`
        ).join('\n');
      },
      bn: (p, c) => {
        const items = (p['items'] as Array<{ preview: string; authorName: string; reportCount: number; recommendation: string; reasoning: string }> | undefined) || [];
        if (!items.length) return `${p['text'] || p['headline'] || ''}`;
        return `${p['headline'] || ''}\n` + items.map((it, i) =>
          `\n${i + 1}. "${(it.preview || '').slice(0, 100)}" — ${it.authorName} (${it.reportCount} রিপোর্ট)\n   → ${String(it.recommendation).toUpperCase()}: ${it.reasoning}`
        ).join('\n');
      },
    },
  },
  admin_anomaly: {
    default: {
      en: (p, c) => `${p['text']}`,
      hi: (p, c) => `${p['text']}`,
      bn: (p, c) => `${p['text']}`,
    },
  },
  admin_draft: {
    default: {
      en: (p, c) => `${p['text']}\n\n${p['note'] || ''}`,
      hi: (p, c) => `${p['text']}\n\n${p['note'] || ''}`,
      bn: (p, c) => `${p['text']}\n\n${p['note'] || ''}`,
    },
  },
};

/* ------------------------------------------------------------------ */
/* Suggestion chips: follow-up questions per intent × language.         */
/* ------------------------------------------------------------------ */

const SUGGESTIONS: Record<IntentId, Record<TemplateLang, string[]>> = {
  navigate: {
    en: ['Open my profile', 'Show Suchana', 'Take me home'],
    hi: ['मेरी प्रोफ़ाइल खोलो', 'सूचना दिखाओ', 'होम ले चलो'],
    bn: ['আমার প্রোফাইল খোলো', 'সূচনা দেখাও', 'হোমে নিয়ে চলো'],
  },
  howto: {
    en: ['Guide to Panjika', 'Guide to Wallet', 'Guide to Sangam'],
    hi: ['पंचांग मार्गदर्शक', 'वॉलेट मार्गदर्शक', 'संगम मार्गदर्शक'],
    bn: ['পঞ্জিকা নির্দেশিকা', 'ওয়ালেট নির্দেশিকা', 'সঙ্গম নির্দেশিকা'],
  },
  tithi_today: {
    en: ['When is Ekadashi?', 'Next festival?', 'What is a tithi?'],
    hi: ['एकादशी कब है?', 'अगला उत्सव?', 'तिथि क्या है?'],
    bn: ['একাদশী কবে?', 'পরের উৎসব?', 'তিথি কী?'],
  },
  festival_next: {
    en: ["Today's tithi?", 'When is Ekadashi?', 'Guide to Panjika'],
    hi: ['आज की तिथि?', 'एकादशी कब है?', 'पंचांग मार्गदर्शक'],
    bn: ['আজকের তিথি?', 'একাদশী কবে?', 'পঞ্জিকা নির্দেশিকা'],
  },
  dana_help: {
    en: ['Open the dana sheet', 'How do I give dana?', 'What is dakshina?'],
    hi: ['दान पत्र खोलो', 'दान कैसे दूँ?', 'दक्षिणा क्या है?'],
    bn: ['দান পত্র খোলো', 'দান কীভাবে দেব?', 'দক্ষিণা কী?'],
  },
  sadhana_summary: {
    en: ['Open Sadhana', 'Guide to Panjika', "Today's tithi?"],
    hi: ['साधना खोलो', 'पंचांग मार्गदर्शक', 'आज की तिथि?'],
    bn: ['সাধনা খোলো', 'পঞ্জিকা নির্দেশিকা', 'আজকের তিথি?'],
  },
  booking_help: {
    en: ['Open Seva Journeys', 'How does payment work?', 'Find a Jyotishi'],
    hi: ['सेवा यात्राएँ खोलो', 'भुगतान कैसे होता है?', 'ज्योतिषी खोजो'],
    bn: ['সেবা যাত্রা খোলো', 'পেমেন্ট কীভাবে হয়?', 'জ্যোতিষী খোঁজো'],
  },
  language_help: {
    en: ['Open my profile', 'Namaste', 'Help in Hindi'],
    hi: ['मेरी प्रोफ़ाइल खोलो', 'नमस्ते', 'बांग्ला में बताओ'],
    bn: ['আমার প্রোফাইল খোলো', 'নমস্কার', 'হিন্দিতে বলো'],
  },
  sos_help: {
    en: ['Open Home', 'What is Suchana?', 'Namaste'],
    hi: ['होम खोलो', 'सूचना क्या है?', 'नमस्ते'],
    bn: ['হোম খোলো', 'সূচনা কী?', 'নমস্কার'],
  },
  voice_upgrade: {
    en: ['Download the AI voice', 'How big is the download?', 'Namaste'],
    hi: ['एआई वॉयस डाउनलोड करो', 'डाउनलोड कितना बड़ा है?', 'नमस्ते'],
    bn: ['এআই ভয়েস ডাউনলোড করো', 'ডাউনলোড কত বড়?', 'নমস্কার'],
  },
  dharma_question: {
    en: ['What is Ekadashi?', 'What is karma?', 'How to do morning puja?'],
    hi: ['एकादशी क्या है?', 'कर्म क्या है?', 'सुबह पूजा कैसे करें?'],
    bn: ['একাদশী কী?', 'কর্ম কী?', 'সকালের পূজা কীভাবে করব?'],
  },
  navigation_question: {
    en: ['Where is my wallet?', 'Where is the Tirtha Diary?', 'Where are group chats?'],
    hi: ['मेरा वॉलेट कहाँ है?', 'तीर्थ डायरी कहाँ है?', 'ग्रुप चैट कहाँ हैं?'],
    bn: ['আমার ওয়ালেট কোথায়?', 'তীর্থ ডায়েরি কোথায়?', 'গ্রুপ চ্যাট কোথায়?'],
  },
  nearby_temples: {
    en: ['Temples near me', 'Nearby mandirs', 'Temples around here?'],
    hi: ['मेरे पास मंदिर', 'आस-पास मंदिर', 'नज़दीकी मंदिर?'],
    bn: ['আমার কাছে মন্দির', 'কাছাকাছি মন্দির', 'আশেপাশে মন্দির?'],
  },
  tirtha_summary: {
    en: ['My Tirtha Diary', "Today's tithi?", 'Next festival?'],
    hi: ['मेरी तीर्थ डायरी', 'आज की तिथि?', 'अगला उत्सव?'],
    bn: ['আমার তীর্থ ডায়েরি', 'আজকের তিথি?', 'পরের উৎসব?'],
  },
  greeting: {
    en: ["Today's tithi?", 'Next festival?', 'How do I give dana?'],
    hi: ['आज की तिथि?', 'अगला उत्सव?', 'दान कैसे दूँ?'],
    bn: ['আজকের তিথি?', 'পরের উৎসব?', 'দান কীভাবে দেব?'],
  },
  fallback_unknown: {
    en: ["Today's tithi?", 'Next festival?', 'How do I give dana?'],
    hi: ['आज की तिथि?', 'अगला उत्सव?', 'दान कैसे दूँ?'],
    bn: ['আজকের তিথি?', 'পরের উৎসব?', 'দান কীভাবে দেব?'],
  },
  admin_briefing: {
    en: ['Flagged posts', "This week's numbers", 'Anything unusual?'],
    hi: ['फ्लैग पोस्ट', 'सप्ताह के आंकड़े', 'कुछ असामान्य?'],
    bn: ['ফ্ল্যাগ পোস্ট', 'সপ্তাহের সংখ্যা', 'অস্বাভাবিক কিছু?'],
  },
  admin_stats: {
    en: ['Morning briefing', 'Flagged posts', 'Anything unusual?'],
    hi: ['सुबह की जानकारी', 'फ्लैग पोस्ट', 'कुछ असामान्य?'],
    bn: ['সকালের ব্রিফিং', 'ফ্ল্যাগ পোস্ট', 'অস্বাভাবিক কিছু?'],
  },
  admin_moderation_help: {
    en: ['Morning briefing', "This week's numbers", 'Anything unusual?'],
    hi: ['सुबह की जानकारी', 'सप्ताह के आंकड़े', 'कुछ असामान्य?'],
    bn: ['সকালের ব্রিফিং', 'সপ্তাহের সংখ্যা', 'অস্বাভাবিক কিছু?'],
  },
  admin_anomaly: {
    en: ['Morning briefing', 'Flagged posts', "This week's numbers"],
    hi: ['सुबह की जानकारी', 'फ्लैग पोस्ट', 'सप्ताह के आंकड़े'],
    bn: ['সকালের ব্রিফিং', 'ফ্ল্যাগ পোস্ট', 'সপ্তাহের সংখ্যা'],
  },
  admin_draft: {
    en: ['Morning briefing', 'Flagged posts', 'Anything unusual?'],
    hi: ['सुबह की जानकारी', 'फ्लैग पोस्ट', 'कुछ असामान्य?'],
    bn: ['সকালের ব্রিফিং', 'ফ্ল্যাগ পোস্ট', 'অস্বাভাবিক কিছু?'],
  },
};

export function suggestionsFor(intent: IntentId, lang: LangCode): string[] {
  const table = SUGGESTIONS[intent];
  if (!table) return [];
  return table[pickLang(lang)] ?? table.en;
}

/**
 * Render a template. Fallback chain: variant → 'default' variant →
 * English → hard-coded non-blank line. This function NEVER returns ''.
 *
 * Output is passed through formatAssistantText so authored `\\n` and `**`
 * render correctly in the plain-text sheet.
 */
export function formatAssistantText(text: string): string {
  return (text || '')
    .replace(/\\n/g, '\n')
    .replace(/\*\*/g, '');
}

export function renderTemplate(
  key: TemplateKey,
  lang: LangCode,
  params: TaskParams = {},
  variant?: string,
  region = 'other'
): string {
  const table = T[key];
  const l = pickLang(lang);
  const c = ctxFor(lang, region);
  const hardFallback = '🙏 Forgive me — I could not find the right words. Please try asking again. 🌼';

  if (!table) return hardFallback;
  const byVariant =
    (variant && table[variant]) || table['default'] || table[Object.keys(table)[0]];
  if (!byVariant) return hardFallback;
  const fn = byVariant[l] || byVariant.en;
  if (!fn) return hardFallback;
  try {
    const out = fn(params, c);
    const formatted = formatAssistantText(out && out.trim() ? out : hardFallback);
    return formatted && formatted.trim() ? formatted : hardFallback;
  } catch {
    return hardFallback;
  }
}

/** Every template key × variant × authored language — for pipeline QA. */
export function templateInventory(): Array<{ key: TemplateKey; variant: string; langs: TemplateLang[] }> {
  return (Object.keys(T) as TemplateKey[]).map((key) => ({
    key,
    variant: '__all__',
    langs: (Object.keys(T[key]) as string[]).length ? ['en', 'hi', 'bn'] : [],
  }));
}
