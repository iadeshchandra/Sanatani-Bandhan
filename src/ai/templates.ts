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
  'assistant.org_giving',
  'assistant.org_expenses',
  'assistant.org_pending_approvals',
  'assistant.priest_schedule',
  'assistant.record_donation',
  'assistant.record_expense',
  'assistant.draft_notice',
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

/* Blueprint C — shared org-copilot renderer sets (see the org
 * section inside the table): identical scoped / no-org wording is
 * defined once here and referenced by every table it serves. */
const ORG_SCOPED_TREASURY: Record<TemplateLang, TFn> = {
  en: (p) => `🙏 The treasury of ${p['workspace']} is looked after by its Trustee and Accountant — it isn't part of your desks here. If you help with the accounts, a Trustee can include the Treasury desk in your role.`,
  hi: (p) => `🙏 ${p['workspace']} का कोष उसके ट्रस्टी और अकाउंटेंट संभालते हैं — यह यहाँ आपके डेस्क में नहीं है। यदि आप हिसाब में सहायता करते हैं, तो ट्रस्टी आपकी भूमिका में कोष डेस्क जोड़ सकते हैं।`,
  bn: (p) => `🙏 ${p['workspace']}-এর তহবিল তার ট্রাস্টি ও হিসাবরক্ষক দেখেন — এটি এখানে আপনার ডেস্কের অংশ নয়। আপনি হিসাবে সাহায্য করলে ট্রাস্টি আপনার ভূমিকায় তহবিল ডেস্ক যোগ করতে পারেন।`,
};

const ORG_NO_ORG: Record<TemplateLang, TFn> = {
  en: () => `🙏 I can answer that inside your organisation's workspace — open the org view and ask me there. Here in your personal space I look after your own sadhana and dana.`,
  hi: () => `🙏 इसका उत्तर मैं आपके संगठन के कार्यक्षेत्र में दे सकता हूँ — संगठन दृश्य खोलकर वहाँ पूछें। यहाँ आपके निजी स्थान में मैं आपकी साधना और दान का ध्यान रखता हूँ।`,
  bn: () => `🙏 এটির উত্তর আমি আপনার সংগঠনের ওয়ার্কস্পেসে দিতে পারি — সংগঠন ভিউ খুলে সেখানে জিজ্ঞাসা করুন। এখানে আপনার ব্যক্তিগত জায়গায় আমি আপনার সাধনা ও দানের খেয়াল রাখি।`,
};

const ORG_NO_ORG_SHORT: Record<TemplateLang, TFn> = {
  en: () => `🙏 I can answer that inside your organisation's workspace — open the org view and ask me there.`,
  hi: () => `🙏 इसका उत्तर मैं आपके संगठन के कार्यक्षेत्र में दे सकता हूँ — संगठन दृश्य खोलकर वहाँ पूछें।`,
  bn: () => `🙏 এটির উত্তর আমি আপনার সংগঠনের ওয়ার্কস্পেসে দিতে পারি — সংগঠন ভিউ খুলে সেখানে জিজ্ঞাসা করুন।`,
};

const ORG_GIVING_SUMMARY: Record<TemplateLang, TFn> = {
      en: (p) => `🪔 ${p['period']} at ${p['workspace']}, devotees gave ${p['total']} in ${p['count']} dana.\n${p['lines']}\n(Source: the Treasury of ${p['workspace']})`,
      hi: (p) => `🪔 ${p['period']}, ${p['workspace']} में भक्तों ने ${p['count']} दान में कुल ${p['total']} दिया।\n${p['lines']}\n(स्रोत: ${p['workspace']} का कोष)`,
      bn: (p) => `🪔 ${p['period']} ${p['workspace']}-এ ভক্তরা ${p['count']}টি দানে মোট ${p['total']} দিয়েছেন।\n${p['lines']}\n(উৎস: ${p['workspace']}-এর তহবিল)`,
};

const ORG_EXPENSES_SUMMARY: Record<TemplateLang, TFn> = {
      en: (p) => `📒 ${p['period']} at ${p['workspace']}, ${p['total']} was spent in ${p['count']} expenses.\n${p['lines']}\n(Source: the Treasury of ${p['workspace']})`,
      hi: (p) => `📒 ${p['period']}, ${p['workspace']} में ${p['count']} खर्चों में कुल ${p['total']} व्यय हुआ।\n${p['lines']}\n(स्रोत: ${p['workspace']} का कोष)`,
      bn: (p) => `📒 ${p['period']} ${p['workspace']}-এ ${p['count']}টি খরচে মোট ${p['total']} ব্যয় হয়েছে।\n${p['lines']}\n(উৎস: ${p['workspace']}-এর তহবিল)`,
};

const ORG_APPROVALS_LIST: Record<TemplateLang, TFn> = {
      en: (p) => `⏳ ${p['count']} requests are waiting at ${p['workspace']}:\n${p['lines']}\nEach one is decided by a different Trustee or Accountant in the Approvals panel — I can show the queue, but the decision itself stays there.`,
      hi: (p) => `⏳ ${p['workspace']} में ${p['count']} अनुरोध प्रतीक्षारत हैं:\n${p['lines']}\nप्रत्येक का निर्णय अनुमोदन पैनल में कोई अन्य ट्रस्टी या अकाउंटेंट करता है — मैं सूची दिखा सकता हूँ, निर्णय वहीं होता है।`,
      bn: (p) => `⏳ ${p['workspace']}-এ ${p['count']}টি অনুরোধ অপেক্ষমাণ:\n${p['lines']}\nপ্রতিটির সিদ্ধান্ত অনুমোদন প্যানেলে অন্য কোনো ট্রাস্টি বা হিসাবরক্ষক দেন — আমি তালিকা দেখাতে পারি, সিদ্ধান্ত সেখানেই হয়।`,
};

const ORG_SCHEDULE_LIST: Record<TemplateLang, TFn> = {
      en: (p) => `🌅 ${p['day']} at ${p['workspace']} — ${p['count']} puja bookings:\n${p['lines']}`,
      hi: (p) => `🌅 ${p['day']}, ${p['workspace']} — ${p['count']} पूजा बुकिंग:\n${p['lines']}`,
      bn: (p) => `🌅 ${p['day']}, ${p['workspace']} — ${p['count']}টি পূজা বুকিং:\n${p['lines']}`,
};

const ORG_DONATION_DRAFT: Record<TemplateLang, TFn> = {
      en: (p) => `🪔 I have prepared the donation draft below — please check every field. Nothing is recorded until you tap Approve.\n${p['summary']}`,
      hi: (p) => `🪔 दान का मसौदा नीचे तैयार है — कृपया हर विवरण जाँचें। जब तक आप अनुमोदन नहीं दबाते, कुछ भी दर्ज नहीं होगा।\n${p['summary']}`,
      bn: (p) => `🪔 দানের খসড়া নিচে তৈরি — প্রতিটি তথ্য যাচাই করুন। আপনি অনুমোদন না চাপলে কিছুই লেখা হবে না।\n${p['summary']}`,
};

const ORG_EXPENSE_DRAFT: Record<TemplateLang, TFn> = {
      en: (p) => `🧾 I have prepared the expense draft below — please check every field. Nothing is recorded until you tap Approve.\n${p['summary']}`,
      hi: (p) => `🧾 खर्च का मसौदा नीचे तैयार है — कृपया हर विवरण जाँचें। जब तक आप अनुमोदन नहीं दबाते, कुछ भी दर्ज नहीं होगा।\n${p['summary']}`,
      bn: (p) => `🧾 খরচের খসড়া নিচে তৈরি — প্রতিটি তথ্য যাচাই করুন। আপনি অনুমোদন না চাপলে কিছুই লেখা হবে না।\n${p['summary']}`,
};

const ORG_NOTICE_DRAFT: Record<TemplateLang, TFn> = {
      en: (p) => `📣 Your notice draft is ready below — please read it once before approving. It reaches the org's followers only when you tap Approve.\n${p['summary']}`,
      hi: (p) => `📣 आपकी सूचना का मसौदा नीचे तैयार है — अनुमोदन से पहले एक बार पढ़ लें। यह संगठन के अनुयायियों तक तभी पहुँचेगी जब आप अनुमोदन दबाएँगे।\n${p['summary']}`,
      bn: (p) => `📣 আপনার বিজ্ঞপ্তির খসড়া নিচে তৈরি — অনুমোদনের আগে একবার পড়ে নিন। আপনি অনুমোদন চাপলেই এটি সংগঠনের অনুসরণকারীদের কাছে পৌঁছাবে।\n${p['summary']}`,
};

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
  /* ---------------- org_locator ---------------- */
  org_locator: {
    answer: {
      en: (p, c) => `${p['answer']}`,
      hi: (p, c) => `${p['answer']}`,
      bn: (p, c) => `${p['answer']}`,
    },
    clarify: {
      en: (p, c) => `${p['answer']}`,
      hi: (p, c) => `${p['answer']}`,
      bn: (p, c) => `${p['answer']}`,
    },
    default: {
      en: (p, c) =>
        `🙏 Ask me where anything lives — a desk, Bahi-Khata, Practice Mode — and I'll point you there, or take you if it's yours to open. 🌼`,
      hi: (p, c) =>
        `🙏 मुझसे पूछें कि कुछ भी कहाँ है — कोई डेस्क, बही-खाता, प्रैक्टिस मोड — मैं आपको बता दूँगा, या यदि वह आपके खोलने के लिए है तो वहाँ ले चलूँगा। 🌼`,
      bn: (p, c) =>
        `🙏 আমাকে জিজ্ঞেস করুন যেকোনো কিছু কোথায় আছে — কোনো ডেস্ক, বহিখাতা, প্র্যাক্টিস মোড — আমি আপনাকে জানিয়ে দেব, অথবা সেটি আপনার খোলার হলে সেখানে নিয়ে যাব। 🌼`,
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
  admin_terms: {
    default: {
      en: (p, c) => `${p['text']}`,
      hi: (p, c) => `${p['text']}`,
      bn: (p, c) => `${p['text']}`,
    },
  },
  admin_history: {
    default: {
      en: (p, c) => `${p['text']}`,
      hi: (p, c) => `${p['text']}`,
      bn: (p, c) => `${p['text']}`,
    },
  },
  admin_simulate: {
    default: {
      en: (p, c) => `${p['text']}`,
      hi: (p, c) => `${p['text']}`,
      bn: (p, c) => `${p['text']}`,
    },
  },
  admin_draft_change: {
    default: {
      en: (p, c) => `${p['text']}`,
      hi: (p, c) => `${p['text']}`,
      bn: (p, c) => `${p['text']}`,
    },
  },
  admin_advise: {
    default: {
      en: (p, c) => `${p['text']}`,
      hi: (p, c) => `${p['text']}`,
      bn: (p, c) => `${p['text']}`,
    },
  },
  admin_growth: {
    default: {
      en: (p, c) => `${p['text']}`,
      hi: (p, c) => `${p['text']}`,
      bn: (p, c) => `${p['text']}`,
    },
  },

  /* ---------------- Blueprint C: org copilot ----------------
   * Money answers carry their provenance in the text itself (the
   * source surface + workspace), because the structured `sources`
   * channel is owner-only by design. Figures come only from the
   * executor's scoped-port reads — templates never compute.
   * The scoped / no-org renderer sets are SHARED across the treasury
   * tables (identical words, defined once as ORG_* above the table)
   * — the bundle carries each sentence once. */
  org_giving: {
    summary: ORG_GIVING_SUMMARY,
    summary_partial: {
      en: (p) => `🪔 ${p['period']} at ${p['workspace']}, devotees gave ${p['total']} in ${p['count']} dana.\n${p['lines']}\n(Source: the Treasury of ${p['workspace']} — from the most recent entries loaded; older records may add to this.)`,
      hi: (p) => `🪔 ${p['period']}, ${p['workspace']} में भक्तों ने ${p['count']} दान में कुल ${p['total']} दिया।\n${p['lines']}\n(स्रोत: ${p['workspace']} का कोष — हाल में लोड हुई प्रविष्टियों से; पुराने रिकॉर्ड इससे बढ़ सकते हैं।)`,
      bn: (p) => `🪔 ${p['period']} ${p['workspace']}-এ ভক্তরা ${p['count']}টি দানে মোট ${p['total']} দিয়েছেন।\n${p['lines']}\n(উৎস: ${p['workspace']}-এর তহবিল — সাম্প্রতিক লোড হওয়া এন্ট্রি থেকে; পুরনো রেকর্ডে এটি বাড়তে পারে।)`,
    },
    empty: {
      en: (p) => `🙏 ${p['period']} there is no dana recorded yet at ${p['workspace']}. When a donation is entered in the Treasury, it will appear here.`,
      hi: (p) => `🙏 ${p['period']} ${p['workspace']} में अभी कोई दान दर्ज नहीं है। जब कोष में दान दर्ज होगा, वह यहाँ दिखेगा।`,
      bn: (p) => `🙏 ${p['period']} ${p['workspace']}-এ এখনও কোনো দান লেখা হয়নি। তহবিলে দান লেখা হলেই এখানে দেখা যাবে।`,
    },
    scoped: ORG_SCOPED_TREASURY,
    no_org: ORG_NO_ORG,
    default: ORG_GIVING_SUMMARY,
  },
  org_expenses: {
    summary: ORG_EXPENSES_SUMMARY,
    summary_partial: {
      en: (p) => `📒 ${p['period']} at ${p['workspace']}, ${p['total']} was spent in ${p['count']} expenses.\n${p['lines']}\n(Source: the Treasury of ${p['workspace']} — from the most recent entries loaded; older records may add to this.)`,
      hi: (p) => `📒 ${p['period']}, ${p['workspace']} में ${p['count']} खर्चों में कुल ${p['total']} व्यय हुआ।\n${p['lines']}\n(स्रोत: ${p['workspace']} का कोष — हाल में लोड हुई प्रविष्टियों से; पुराने रिकॉर्ड इससे बढ़ सकते हैं।)`,
      bn: (p) => `📒 ${p['period']} ${p['workspace']}-এ ${p['count']}টি খরচে মোট ${p['total']} ব্যয় হয়েছে।\n${p['lines']}\n(উৎস: ${p['workspace']}-এর তহবিল — সাম্প্রতিক লোড হওয়া এন্ট্রি থেকে; পুরনো রেকর্ডে এটি বাড়তে পারে।)`,
    },
    empty: {
      en: (p) => `🙏 ${p['period']} no expense is recorded yet at ${p['workspace']}. Expenses entered in the Treasury will appear here.`,
      hi: (p) => `🙏 ${p['period']} ${p['workspace']} में अभी कोई खर्च दर्ज नहीं है। कोष में दर्ज खर्च यहाँ दिखेगा।`,
      bn: (p) => `🙏 ${p['period']} ${p['workspace']}-এ এখনও কোনো খরচ লেখা হয়নি। তহবিলে লেখা খরচ এখানে দেখা যাবে।`,
    },
    scoped: ORG_SCOPED_TREASURY,
    no_org: ORG_NO_ORG,
    default: ORG_EXPENSES_SUMMARY,
  },
  org_pending_approvals: {
    list: ORG_APPROVALS_LIST,
    empty: {
      en: (p) => `✅ Nothing is waiting for approval at ${p['workspace']} right now. When someone files a payout or a role request, it will appear here.`,
      hi: (p) => `✅ ${p['workspace']} में अभी कोई अनुरोध अनुमोदन के लिए प्रतीक्षारत नहीं है। जब कोई भुगतान या भूमिका का अनुरोध भेजेगा, वह यहाँ दिखेगा।`,
      bn: (p) => `✅ ${p['workspace']}-এ এখন কোনো অনুরোধ অনুমোদনের অপেক্ষায় নেই। কেউ পরিশোধ বা ভূমিকার অনুরোধ পাঠালে এখানে দেখা যাবে।`,
    },
    unavailable: {
      en: (p) => `🙏 I couldn't read the approvals queue at ${p['workspace']} just now — please don't take silence as "all clear". Try again in a moment, or open the Approvals panel.`,
      hi: (p) => `🙏 ${p['workspace']} की अनुमोदन सूची अभी पढ़ी नहीं जा सकी — कृपया मौन को "सब ठीक" न समझें। कुछ देर बाद पुनः प्रयास करें, या अनुमोदन पैनल खोलें।`,
      bn: (p) => `🙏 ${p['workspace']}-এর অনুমোদন তালিকা এখন পড়া যাচ্ছে না — নীরবতাকে "সব ঠিক" ভাববেন না। একটু পরে আবার চেষ্টা করুন, অথবা অনুমোদন প্যানেল খুলুন।`,
    },
    scoped: {
      en: (p) => `🙏 Approvals at ${p['workspace']} aren't part of your desks here. If you filed a request yourself, its decision will reach you as a notice.`,
      hi: (p) => `🙏 ${p['workspace']} के अनुमोदन यहाँ आपके डेस्क का हिस्सा नहीं हैं। यदि आपने स्वयं कोई अनुरोध भेजा है, तो उसका निर्णय आपको सूचना के रूप में मिलेगा।`,
      bn: (p) => `🙏 ${p['workspace']}-এর অনুমোদন এখানে আপনার ডেস্কের অংশ নয়। আপনি নিজে কোনো অনুরোধ পাঠিয়ে থাকলে তার সিদ্ধান্ত বিজ্ঞপ্তি হিসেবে পৌঁছাবে।`,
    },
    no_org: ORG_NO_ORG_SHORT,
    default: ORG_APPROVALS_LIST,
  },
  priest_schedule: {
    list: ORG_SCHEDULE_LIST,
    empty: {
      en: (p) => `🙏 ${p['day']} there are no puja bookings at ${p['workspace']} yet. New bookings will appear here as devotees make them.`,
      hi: (p) => `🙏 ${p['day']} ${p['workspace']} में अभी कोई पूजा बुकिंग नहीं है। भक्तों की नई बुकिंग यहाँ दिखेगी।`,
      bn: (p) => `🙏 ${p['day']} ${p['workspace']}-এ এখনও কোনো পূজা বুকিং নেই। ভক্তদের নতুন বুকিং এখানে দেখা যাবে।`,
    },
    scoped: {
      en: (p) => `🙏 The puja bookings of ${p['workspace']} aren't part of your desks here. A Trustee can include the Pooja Booking desk in your role if you help with bookings.`,
      hi: (p) => `🙏 ${p['workspace']} की पूजा बुकिंग यहाँ आपके डेस्क का हिस्सा नहीं है। यदि आप बुकिंग में सहायता करते हैं, तो ट्रस्टी आपकी भूमिका में पूजा बुकिंग डेस्क जोड़ सकते हैं।`,
      bn: (p) => `🙏 ${p['workspace']}-এর পূজা বুকিং এখানে আপনার ডেস্কের অংশ নয়। আপনি বুকিংয়ে সাহায্য করলে ট্রাস্টি আপনার ভূমিকায় পূজা বুকিং ডেস্ক যোগ করতে পারেন।`,
    },
    no_org: {
      en: () => `🙏 I can show the day's pujas inside the organisation's workspace — open the org view and ask me there.`,
      hi: () => `🙏 मैं दिन की पूजाएँ संगठन के कार्यक्षेत्र में दिखा सकता हूँ — संगठन दृश्य खोलकर वहाँ पूछें।`,
      bn: () => `🙏 দিনের পূজা আমি সংগঠনের ওয়ার্কস্পেসে দেখাতে পারি — সংগঠন ভিউ খুলে সেখানে জিজ্ঞাসা করুন।`,
    },
    default: ORG_SCHEDULE_LIST,
  },
  record_donation: {
    draft_ready: ORG_DONATION_DRAFT,
    need_amount: {
      en: () => `🙏 How much was the donation? Tell me the amount — for example, "Record a donation of ₹501 from Rina Das" — and I will prepare the draft for your approval.`,
      hi: () => `🙏 दान की राशि कितनी थी? राशि बताएं — जैसे, "Rina Das से ₹501 दान दर्ज करें" — और मैं आपके अनुमोदन के लिए मसौदा तैयार कर दूँगा।`,
      bn: () => `🙏 দানের পরিমাণ কত? পরিমাণ বলুন — যেমন, "Rina Das-এর কাছ থেকে ৫০১ টাকা দান লিখুন" — আমি আপনার অনুমোদনের জন্য খসড়া তৈরি করে দেব।`,
    },
    clarify: {
      en: (p) => `🙏 There is more than one ${p['name']} at this workspace:\n${p['candidates']}\nPlease tell me the full name exactly as it appears, or record it from the Treasury desk where you can pick the exact person. I won't guess — the dana must reach the right devotee's record.`,
      hi: (p) => `🙏 इस कार्यक्षेत्र में एक से अधिक ${p['name']} हैं:\n${p['candidates']}\nकृपया पूरा नाम ठीक वैसा बताएं जैसा दर्ज है, या कोष डेस्क से दर्ज करें जहाँ आप सही व्यक्ति चुन सकते हैं। मैं अनुमान नहीं लगाऊँगा — दान सही भक्त के रिकॉर्ड में जाना चाहिए।`,
      bn: (p) => `🙏 এই ওয়ার্কস্পেসে একাধিক ${p['name']} আছেন:\n${p['candidates']}\nঠিক যেভাবে লেখা আছে পুরো নামটি বলুন, অথবা তহবিল ডেস্ক থেকে লিখুন যেখানে সঠিক ব্যক্তিকে বেছে নিতে পারবেন। আমি অনুমান করব না — দান সঠিক ভক্তের রেকর্ডে যাওয়া উচিত।`,
    },
    scoped: {
      en: (p) => `🙏 Recording dana at ${p['workspace']} is part of the Treasury desk, which isn't in your role here. If you collected a donation, please hand it to the Accountant or a Trustee — they will record it with its receipt.`,
      hi: (p) => `🙏 ${p['workspace']} में दान दर्ज करना कोष डेस्क का काम है, जो यहाँ आपकी भूमिका में नहीं है। यदि आपने दान ग्रहण किया है, तो कृपया अकाउंटेंट या ट्रस्टी को सौंपें — वे रसीद सहित दर्ज करेंगे।`,
      bn: (p) => `🙏 ${p['workspace']}-এ দান লেখা তহবিল ডেস্কের কাজ, যা এখানে আপনার ভূমিকায় নেই। আপনি দান গ্রহণ করে থাকলে হিসাবরক্ষক বা ট্রাস্টির কাছে দিন — তাঁরা রসিদসহ লিখবেন।`,
    },
    no_org: {
      en: () => `🙏 Donations are recorded inside the organisation's workspace — open the org view and ask me there, and I will prepare the draft for your approval.`,
      hi: () => `🙏 दान संगठन के कार्यक्षेत्र में दर्ज होता है — संगठन दृश्य खोलकर वहाँ कहें, मैं आपके अनुमोदन के लिए मसौदा तैयार कर दूँगा।`,
      bn: () => `🙏 দান সংগঠনের ওয়ার্কস্পেসে লেখা হয় — সংগঠন ভিউ খুলে সেখানে বলুন, আমি আপনার অনুমোদনের জন্য খসড়া তৈরি করে দেব।`,
    },
    default: ORG_DONATION_DRAFT,
  },
  record_expense: {
    draft_ready: ORG_EXPENSE_DRAFT,
    draft_gated: {
      en: (p) => `🧾 This expense is at or above the amount that needs a second person's approval here. The draft below is ready — when you approve it, I will FILE it for a checker instead of posting it directly. Nothing is posted until a different Trustee or Accountant approves it.\n${p['summary']}`,
      hi: (p) => `🧾 यह खर्च उस राशि के बराबर या उससे अधिक है जिसके लिए यहाँ दूसरे व्यक्ति का अनुमोदन चाहिए। मसौदा नीचे तैयार है — आप अनुमोदन दबाएँगे तो मैं इसे सीधे दर्ज करने के बजाय जाँचकर्ता के पास भेजूँगा। जब तक कोई अन्य ट्रस्टी या अकाउंटेंट स्वीकृत नहीं करता, कुछ भी दर्ज नहीं होगा।\n${p['summary']}`,
      bn: (p) => `🧾 এই খরচ সেই পরিমাণের সমান বা বেশি যার জন্য এখানে দ্বিতীয় ব্যক্তির অনুমোদন লাগে। খসড়া নিচে তৈরি — আপনি অনুমোদন চাপলে আমি সরাসরি না লিখে যাচাইকারীর কাছে পাঠাব। অন্য কোনো ট্রাস্টি বা হিসাবরক্ষক অনুমোদন না দিলে কিছুই লেখা হবে না।\n${p['summary']}`,
    },
    need_amount: {
      en: () => `🙏 How much was the expense? Tell me the amount — for example, "Record an expense of ₹2,000 for puja samagri" — and I will prepare the draft for your approval.`,
      hi: () => `🙏 खर्च कितना था? राशि बताएं — जैसे, "पूजा सामग्री के लिए ₹2,000 खर्च दर्ज करें" — और मैं आपके अनुमोदन के लिए मसौदा तैयार कर दूँगा।`,
      bn: () => `🙏 খরচ কত হয়েছে? পরিমাণ বলুন — যেমন, "পূজা সামগ্রীর জন্য ২,০০০ টাকা খরচ লিখুন" — আমি আপনার অনুমোদনের জন্য খসড়া তৈরি করে দেব।`,
    },
    scoped: {
      en: (p) => `🙏 Recording expenses at ${p['workspace']} is part of the Treasury desk, which isn't in your role here. Please give the bill to the Accountant or a Trustee — they will record it.`,
      hi: (p) => `🙏 ${p['workspace']} में खर्च दर्ज करना कोष डेस्क का काम है, जो यहाँ आपकी भूमिका में नहीं है। कृपया बिल अकाउंटेंट या ट्रस्टी को दें — वे दर्ज करेंगे।`,
      bn: (p) => `🙏 ${p['workspace']}-এ খরচ লেখা তহবিল ডেস্কের কাজ, যা এখানে আপনার ভূমিকায় নেই। বিলটি হিসাবরক্ষক বা ট্রাস্টির কাছে দিন — তাঁরা লিখবেন।`,
    },
    no_org: {
      en: () => `🙏 Expenses are recorded inside the organisation's workspace — open the org view and ask me there, and I will prepare the draft for your approval.`,
      hi: () => `🙏 खर्च संगठन के कार्यक्षेत्र में दर्ज होता है — संगठन दृश्य खोलकर वहाँ कहें, मैं आपके अनुमोदन के लिए मसौदा तैयार कर दूँगा।`,
      bn: () => `🙏 খরচ সংগঠনের ওয়ার্কস্পেসে লেখা হয় — সংগঠন ভিউ খুলে সেখানে বলুন, আমি আপনার অনুমোদনের জন্য খসড়া তৈরি করে দেব।`,
    },
    default: ORG_EXPENSE_DRAFT,
  },
  draft_notice: {
    draft_ready: ORG_NOTICE_DRAFT,
    need_details: {
      en: () => `🙏 What should the notice say? For example: "Draft a notice: Annual general meeting on Sunday at 10 in the morning" — I will prepare it for your approval before anything is posted.`,
      hi: () => `🙏 सूचना में क्या होना चाहिए? जैसे: "सूचना का मसौदा बनाएं: वार्षिक सभा रविवार सुबह 10 बजे" — कुछ भी प्रकाशित होने से पहले मैं इसे आपके अनुमोदन के लिए तैयार करूँगा।`,
      bn: () => `🙏 বিজ্ঞপ্তিতে কী থাকবে? যেমন: "বিজ্ঞপ্তির খসড়া তৈরি করুন: বার্ষিক সভা রবিবার সকাল ১০টায়" — কিছু প্রকাশের আগেই আমি এটি আপনার অনুমোদনের জন্য তৈরি করব।`,
    },
    scoped: {
      en: (p) => `🙏 Drafting the org's notices at ${p['workspace']} is for its Trustee and Manager. If there is something everyone should know, tell a Trustee — they can post it for all followers.`,
      hi: (p) => `🙏 ${p['workspace']} की सूचनाएँ बनाना उसके ट्रस्टी और प्रबंधक का काम है। यदि कोई बात सभी को जाननी चाहिए, तो ट्रस्टी को बताएं — वे सभी अनुयायियों के लिए प्रकाशित कर सकते हैं।`,
      bn: (p) => `🙏 ${p['workspace']}-এর বিজ্ঞপ্তি তৈরি করা তার ট্রাস্টি ও ব্যবস্থাপকের কাজ। সবার জানা দরকার এমন কিছু থাকলে ট্রাস্টিকে বলুন — তিনি সব অনুসরণকারীর জন্য প্রকাশ করতে পারবেন।`,
    },
    no_org: {
      en: () => `🙏 Notices are drafted inside the organisation's workspace — open the org view and ask me there.`,
      hi: () => `🙏 सूचनाएँ संगठन के कार्यक्षेत्र में बनती हैं — संगठन दृश्य खोलकर वहाँ कहें।`,
      bn: () => `🙏 বিজ্ঞপ্তি সংগঠনের ওয়ার্কস্পেসে তৈরি হয় — সংগঠন ভিউ খুলে সেখানে বলুন।`,
    },
    default: ORG_NOTICE_DRAFT,
  },
};

/* ------------------------------------------------------------------ */
/* Suggestion chips: follow-up questions per intent × language.         */
/* ------------------------------------------------------------------ */

const SUGGESTIONS: Record<IntentId, Record<TemplateLang, string[]>> = {
  navigate: {
    en: ['Open my profile', 'Show Suchana', 'Take me home'],
    hi: ['मेरी प्रोफ़ाइल खोलो', 'सूचना खोलो', 'होम ले चलो'],
    bn: ['আমার প্রোফাইল খোলো', 'সূচনা খোলো', 'হোমে নিয়ে চলো'],
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
    en: ['Open Seva Journeys', 'How to book?', 'Find a Jyotishi'],
    hi: ['सेवा यात्रा खोलो', 'पंडित कैसे बुक करूँ?', 'ज्योतिषी बुक करो'],
    bn: ['সেবা যাত্রা খোলো', 'পুরোহিত কীভাবে বুক করব?', 'জ্যোতিষী বুক করো'],
  },
  language_help: {
    en: ['Open my profile', 'Namaste', 'Help in Hindi'],
    hi: ['मेरी प्रोफ़ाइल खोलो', 'नमस्ते', 'बांग्ला में बताओ'],
    bn: ['আমার প্রোফাইল খোলো', 'নমস্কার', 'হিন্দিতে বলো'],
  },
  sos_help: {
    en: ['Open Home', 'Open Suchana', 'Namaste'],
    hi: ['होम खोलो', 'सूचना खोलो', 'नमस्ते'],
    bn: ['হোম খোলো', 'সূচনা খোলো', 'নমস্কার'],
  },
  voice_upgrade: {
    en: ['Download the AI voice', 'How big is the voice download?', 'Namaste'],
    hi: ['एआई वॉयस डाउनलोड करो', 'वॉयस डाउनलोड कितना बड़ा है?', 'नमस्ते'],
    bn: ['এআই ভয়েস ডাউনলোড করো', 'ভয়েস ডাউনলোড কত বড়?', 'নমস্কার'],
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
  org_locator: {
    en: ['Where is Bahi-Khata?', 'Where is Practice Mode?', 'Where are Suchana controls?'],
    hi: ['बही-खाता कहाँ है?', 'प्रैक्टिस मोड कहाँ है?', 'सूचना नियंत्रण कहाँ हैं?'],
    bn: ['বহিখাতা কোথায়?', 'প্র্যাক্টিস মোড কোথায়?', 'সূচনা নিয়ন্ত্রণ কোথায়?'],
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
  org_giving: {
    en: ["This month's expenses", 'Pending approvals', 'Record a donation'],
    hi: ['इस महीने के खर्चे', 'लंबित अनुमोदन', 'दान दर्ज करें'],
    bn: ['এই মাসের খরচ', 'মুলতুবি অনুমোদন', 'দান লিখুন'],
  },
  org_expenses: {
    en: ['Who gave this week?', 'Pending approvals', 'Record an expense'],
    hi: ['इस सप्ताह किसने दान दिया?', 'लंबित अनुमोदन', 'खर्च दर्ज करें'],
    bn: ['এই সপ্তাহে কে দান দিয়েছে?', 'মুলতুবি অনুমোদন', 'খরচ লিখুন'],
  },
  org_pending_approvals: {
    en: ['Who gave this week?', "This month's expenses", 'Pending approvals'],
    hi: ['इस सप्ताह किसने दान दिया?', 'इस महीने के खर्चे', 'लंबित अनुमोदन'],
    bn: ['এই সপ্তাহে কে দান দিয়েছে?', 'এই মাসের খরচ', 'মুলতুবি অনুমোদন'],
  },
  priest_schedule: {
    en: ["Tomorrow's bookings", "Today's pujas", 'Who gave this week?'],
    hi: ['कल की बुकिंग', 'आज की पूजाएँ', 'इस सप्ताह किसने दान दिया?'],
    bn: ['আগামীকালের বুকিং', 'আজকের পূজা', 'এই সপ্তাহে কে দান দিয়েছে?'],
  },
  record_donation: {
    en: ['Who gave this week?', "This month's expenses", 'Record an expense'],
    hi: ['इस सप्ताह किसने दान दिया?', 'इस महीने के खर्चे', 'खर्च दर्ज करें'],
    bn: ['এই সপ্তাহে কে দান দিয়েছে?', 'এই মাসের খরচ', 'খরচ লিখুন'],
  },
  record_expense: {
    en: ['Who gave this week?', "This month's expenses", 'Record a donation'],
    hi: ['इस सप्ताह किसने दान दिया?', 'इस महीने के खर्चे', 'दान दर्ज करें'],
    bn: ['এই সপ্তাহে কে দান দিয়েছে?', 'এই মাসের খরচ', 'দান লিখুন'],
  },
  draft_notice: {
    en: ["Today's pujas", 'Pending approvals', 'Who gave this week?'],
    hi: ['आज की पूजाएँ', 'लंबित अनुमोदन', 'इस सप्ताह किसने दान दिया?'],
    bn: ['আজকের পূজা', 'মুলতুবি অনুমোদন', 'এই সপ্তাহে কে দান দিয়েছে?'],
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
  admin_terms: {
    en: ['What changed?', 'Simulate a change', 'Advise me'],
    hi: ['क्या बदला?', 'सलाह दें', 'सप्ताह के आंकड़े'],
    bn: ['কী বদলেছে?', 'পরামর্শ দিন', 'সপ্তাহের সংখ্যা'],
  },
  admin_history: {
    en: ['What are our terms?', 'Simulate a change', 'Advise me'],
    hi: ['हमारी शर्तें क्या हैं?', 'क्या बदला?', 'सलाह दें'],
    bn: ['আমাদের শর্ত কী?', 'কী বদলেছে?', 'পরামর্শ দিন'],
  },
  admin_simulate: {
    en: ['What are our terms?', 'What changed?', 'Advise me'],
    hi: ['हमारी शर्तें क्या हैं?', 'क्या बदला?', 'सलाह दें'],
    bn: ['আমাদের শর্ত কী?', 'কী বদলেছে?', 'পরামর্শ দিন'],
  },
  admin_draft_change: {
    en: ['What are our terms?', 'What changed?', 'Simulate a change'],
    hi: ['हमारी शर्तें क्या हैं?', 'क्या बदला?', 'सलाह दें'],
    bn: ['আমাদের শর্ত কী?', 'কী বদলেছে?', 'পরামর্শ দিন'],
  },
  admin_advise: {
    en: ['What are our terms?', 'Simulate a change', "This week's numbers"],
    hi: ['हमारी शर्तें क्या हैं?', 'सलाह दें', 'सप्ताह के आंकड़े'],
    bn: ['আমাদের শর্ত কী?', 'পরামর্শ দিন', 'সপ্তাহের সংখ্যা'],
  },
  admin_growth: {
    en: ['Give me a growth plan', "This week's numbers", 'What are our terms?'],
    hi: ['वृद्धि योजना दें', 'सप्ताह के आंकड़े', 'हमारी शर्तें क्या हैं?'],
    bn: ['বৃদ্ধির পরিকল্পনা দিন', 'সপ্তাহের সংখ্যা', 'আমাদের শর্ত কী?'],
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
