/**
 * margdarshan/releases.ts — the What's New release model (J2).
 * =====================================================================
 * Blueprint §4 (What's New): one entry per shipped version — the
 * REAL production stamp, the real ship date, and plain-language
 * items in sevak voice, grouped by section (New / Improved / Fixed /
 * Good to know). Desk-ref chips deep-link an item into its manual
 * page, so a change and its explanation live one tap apart.
 *
 * Honesty law (the whole point of the wing): every item traces to a
 * real landing — the seeds below are the shipped arc of 2026-10-23 →
 * 2026-10-31, taken from ARCHITECTURE.md §§15–17 and the version
 * stamps those builds wore in production. User-visible changes
 * only: internal plumbing (rules diets, file splits) is NOT an item,
 * however large it loomed for the builders. From J2 on, adding the
 * entry is a step in the ship checklist for every batch (recorded
 * in ARCHITECTURE.md §15) — an entry is written at ship time, never
 * reconstructed later from memory.
 *
 * Pure data + a tiny resolver. No Firestore, no fetching: What's
 * New is bundled content (blueprint §8's bundled/live split), and it
 * ships inside the margdarshan-content chunk with the manual.
 */

import type { Lang3 } from '../moduleGuides';

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

export type ReleaseSectionId = 'new' | 'improved' | 'fixed' | 'docs';

/** Sections render in this order, always. */
export const RELEASE_SECTION_ORDER: readonly ReleaseSectionId[] = [
  'new',
  'improved',
  'fixed',
  'docs',
];

export interface ReleaseItem {
  /** Plain-language, sevak voice — one change a user can feel. */
  text: Lang3;
  /**
   * Manual page slugs this change belongs to (deep-link chips).
   * Only where the manual page genuinely covers the feature —
   * an item with no honest home carries no refs.
   */
  deskRefs?: string[];
}

export interface ReleaseEntry {
  /** The real production version stamp, e.g. 'v2026.10.31-9558c90'. */
  version: string;
  /** The real ship date, ISO 'yyyy-mm-dd'. */
  date: string;
  sections: Partial<Record<ReleaseSectionId, ReleaseItem[]>>;
}

/* ------------------------------------------------------------------ */
/* Seeds — the shipped arc, newest first                               */
/* ------------------------------------------------------------------ */

export const RELEASES: readonly ReleaseEntry[] = [
  {
    version: 'v2026.10.31-d22f97b',
    date: '2026-10-31',
    sections: {
      new: [
        {
          text: {
            en: "The devotee area gains its own doors: a 'Grow with Sanatani Bandhan' card — create or join an organisation — and a Margdarshan row, without leaving the page.",
            hi: "भक्त क्षेत्र को अपने द्वार मिले हैं: 'Grow with Sanatani Bandhan' कार्ड — संस्था बनाएँ या जुड़ें — और एक Margdarshan पंक्ति, पृष्ठ छोड़े बिना।",
            bn: "ভক্ত এলাকা নিজের দরজা পেয়েছে: 'Grow with Sanatani Bandhan' কার্ড — প্রতিষ্ঠান তৈরি করুন বা যোগ দিন — আর একটি Margdarshan সারি, পৃষ্ঠা না ছেড়েই।",
          },
        },
      ],
      improved: [
        {
          text: {
            en: 'Margdarshan now opens inside the app for devotee members too — the manual is for everyone, as promised.',
            hi: 'Margdarshan अब ऐप के अंदर भक्त सदस्यों के लिए भी खुलता है — नियमावली सबके लिए है, जैसा वादा था।',
            bn: 'Margdarshan এখন অ্যাপের ভিতরে ভক্ত সদস্যদের জন্যও খোলে — নিয়মাবলি সবার জন্য, যেমন প্রতিশ্রুতি ছিল।',
          },
        },
      ],
      fixed: [
        {
          text: {
            en: "The locked 'Org' door in the devotee area now explains itself — why it is locked, and the honest ways forward — instead of sitting silent and grey.",
            hi: "भक्त क्षेत्र में बंद 'Org' द्वार अब खुद समझाता है — यह क्यों बंद है, और आगे के ईमानदार रास्ते — पहले की तरह खामोश और धूसर बैठने की जगह।",
            bn: "ভক্ত এলাকায় বন্ধ 'Org' দরজা এখন নিজেই বুঝিয়ে বলে — কেন এটি বন্ধ, আর সামনের সৎ পথগুলি — আগের মতো নীরব ধূসর হয়ে বসে থাকার বদলে।",
          },
          deskRefs: ['membership'],
        },
        {
          text: {
            en: "Your pass now shows your real Sanatani ID — or honestly says 'ID pending'. The placeholder number that used to appear is gone.",
            hi: "आपके पास पर अब आपकी असली Sanatani ID दिखती है — या ईमानदारी से 'ID pending' लिखा आता है। पहले दिखने वाला बनावटी नंबर हटा दिया गया है।",
            bn: "আপনার পাসে এখন আপনার আসল Sanatani ID দেখায় — অথবা সৎভাবে 'ID pending' লেখা থাকে। আগে দেখানো বানানো নম্বরটি সরিয়ে দেওয়া হয়েছে।",
          },
        },
        {
          text: {
            en: "A wrong address on the public website — like /contact/xyz — now meets the proper 'page not found' instead of the home page.",
            hi: "सार्वजनिक वेबसाइट पर गलत पता — जैसे /contact/xyz — अब मुख्य पृष्ठ की जगह सही 'पृष्ठ नहीं मिला' संदेश से मिलता है।",
            bn: "সার্বজনিক ওয়েবসাইটে ভুল ঠিকানা — যেমন /contact/xyz — এখন মূল পৃষ্ঠার বদলে সঠিক 'পৃষ্ঠা পাওয়া যায়নি' বার্তা পায়।",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.10.31-c2485d7',
    date: '2026-10-31',
    sections: {
      new: [
        {
          text: {
            en: 'An organisation can now invite a jyotishi from the marketplace — the invitation loop can finally begin, and the jyotishi answers from their own inbox.',
            hi: 'कोई संस्था अब बाज़ार से किसी ज्योतिषी को आमंत्रित कर सकती है — आमंत्रण की कड़ी अब आखिर शुरू हो सकती है, और ज्योतिषी अपने इनबॉक्स से उत्तर देते हैं।',
            bn: 'কোনো প্রতিষ্ঠান এখন বাজার থেকে কোনো জ্যোতিষীকে আমন্ত্রণ জানাতে পারে — আমন্ত্রণের ধারাটি অবশেষে শুরু হতে পারে, আর জ্যোতিষী নিজের ইনবক্স থেকে উত্তর দেন।',
          },
          deskRefs: ['jyotish'],
        },
        {
          text: {
            en: 'Quiet in-app bells now tell you when a consultation is accepted or completed, and tell the jyotishi when dakshina is released.',
            hi: 'शांत इन-ऐप घंटियाँ अब बताती हैं कि परामर्श कब स्वीकार हुआ या पूरा हुआ, और ज्योतिषी को बताती हैं कि दक्षिणा कब जारी हुई।',
            bn: 'শান্ত ইন-অ্যাপ ঘণ্টা এখন জানিয়ে দেয় পরামর্শ কখন গৃহীত হলো বা শেষ হলো, আর জ্যোতিষীকে জানায় দক্ষিণা কখন ছাড়া হলো।',
          },
          deskRefs: ['jyotish'],
        },
      ],
      improved: [
        {
          text: {
            en: 'Guna Milan in match-making is now the real classical Ashtakoot calculation — all eight kootas, counted from both birth stars. The earlier fixed-score estimate has been removed.',
            hi: 'मिलान में गुण मिलान अब असली शास्त्रीय अष्टकूट गणना है — आठों कूट, दोनों के जन्म-नक्षत्रों से गिने गए। पहले का निश्चित-अंक अनुमान हटा दिया गया है।',
            bn: 'মিলানে গুণ মিলন এখন আসল শাস্ত্রীয় অষ্টকূট গণনা — আটটি কূটই, দুজনের জন্ম-নক্ষত্র থেকে গোনা। আগের নির্দিষ্ট-অঙ্কের অনুমানটি সরিয়ে দেওয়া হয়েছে।',
          },
          deskRefs: ['sanatani-vivah', 'jyotish'],
        },
        {
          text: {
            en: "A jyotishi's verification climbs its ladder honestly — each step asks for its own proof, approvals land on the right step, and profiles approved earlier settle onto the correct step by themselves.",
            hi: 'ज्योतिषी का सत्यापन अपनी सीढ़ी ईमानदारी से चढ़ता है — हर कदम अपना प्रमाण माँगता है, मंज़ूरी सही कदम पर उतरती है, और पहले मंज़ूर प्रोफ़ाइल अपने आप सही कदम पर आ जाते हैं।',
            bn: 'জ্যোতিষীর যাচাই তার সিঁড়ি সৎভাবে ওঠে — প্রতিটি ধাপ নিজের প্রমাণ চায়, অনুমোদন সঠিক ধাপে নামে, আর আগে অনুমোদিত প্রোফাইলগুলি নিজে থেকেই সঠিক ধাপে এসে যায়।',
          },
          deskRefs: ['jyotish'],
        },
        {
          text: {
            en: "A jyotishi's availability is real now: what they save is what devotees see — on their card, their profile and the booking sheet.",
            hi: 'ज्योतिषी की उपलब्धता अब असली है: जो वे सहेजते हैं, वही भक्त देखते हैं — उनके कार्ड पर, प्रोफ़ाइल पर और बुकिंग शीट पर।',
            bn: 'জ্যোতিষীর উপলভ্যতা এখন আসল: যা তিনি সংরক্ষণ করেন, ভক্তরা তাই দেখেন — তাঁর কার্ডে, প্রোফাইলে আর বুকিং শিটে।',
          },
          deskRefs: ['jyotish'],
        },
      ],
      fixed: [
        {
          text: {
            en: "The earnings page told a jyotishi '₹0 released' forever, though the real record lived elsewhere. It now reads the true dakshina record — released amounts, per currency.",
            hi: "आय पृष्ठ ज्योतिषी को हमेशा '₹0 जारी' बताता था, जबकि असली रिकॉर्ड कहीं और था। अब यह सच्चा दक्षिणा रिकॉर्ड पढ़ता है — जारी रकम, हर मुद्रा के हिसाब से।",
            bn: "আয়ের পৃষ্ঠা জ্যোতিষীকে চিরকাল '₹0 ছাড়া হয়েছে' বলত, অথচ আসল রেকর্ড ছিল অন্যত্র। এখন এটি সত্যিকারের দক্ষিণা রেকর্ড পড়ে — ছাড়া অর্থ, প্রতি মুদ্রা অনুযায়ী।",
          },
          deskRefs: ['jyotish'],
        },
      ],
    },
  },
  {
    version: 'v2026.10.31-84cfb5a',
    date: '2026-10-31',
    sections: {
      improved: [
        {
          text: {
            en: 'The open consultation board shows a jyotishi only what a decision needs — the topic, city, language and budget. Birth details and phone never appear on the board.',
            hi: 'खुला परामर्श बोर्ड ज्योतिषी को केवल वही दिखाता है जो निर्णय के लिए चाहिए — विषय, शहर, भाषा और बजट। जन्म-विवरण और फ़ोन बोर्ड पर कभी नहीं आते।',
            bn: 'খোলা পরামর্শ বোর্ড জ্যোতিষীকে শুধু সিদ্ধান্তের জন্য যা দরকার তাই দেখায় — বিষয়, শহর, ভাষা আর বাজেট। জন্ম-বিবরণ আর ফোন বোর্ডে কখনো আসে না।',
          },
          deskRefs: ['jyotish'],
        },
      ],
      fixed: [
        {
          text: {
            en: 'Your birth details in a jyotish consultation — date, time, place, and your phone — are now visible only to you and your jyotishi. Earlier, the consultation record could be read too widely; that door is closed.',
            hi: 'ज्योतिष परामर्श में आपके जन्म-विवरण — तिथि, समय, स्थान और आपका फ़ोन — अब केवल आपको और आपके ज्योतिषी को दिखते हैं। पहले परामर्श रिकॉर्ड ज़रूरत से ज़्यादा खुला पढ़ा जा सकता था; वह द्वार बंद है।',
            bn: 'জ্যোতিষ পরামর্শে আপনার জন্ম-বিবরণ — তারিখ, সময়, স্থান আর আপনার ফোন — এখন শুধু আপনি আর আপনার জ্যোতিষীই দেখতে পান। আগে পরামর্শের রেকর্ড প্রয়োজনের চেয়ে বেশি খোলাভাবে পড়া যেত; সেই দরজা বন্ধ।',
          },
          deskRefs: ['jyotish'],
        },
        {
          text: {
            en: "The 'Become a jyotishi' application opens properly again — it used to break the moment it opened, so no one could apply.",
            hi: "'ज्योतिषी बनें' आवेदन अब फिर ठीक से खुलता है — पहले यह खुलते ही टूट जाता था, इसलिए कोई आवेदन ही नहीं कर पाता था।",
            bn: "'জ্যোতিষী হোন' আবেদন এখন আবার ঠিকমতো খোলে — আগে এটি খুললেই ভেঙে যেত, তাই কেউ আবেদনই করতে পারতেন না।",
          },
          deskRefs: ['jyotish'],
        },
      ],
    },
  },
  {
    version: 'v2026.10.31-9558c90',
    date: '2026-10-31',
    sections: {
      new: [
        {
          text: {
            en: 'Margdarshan opens — a full manual of 95 pages: every desk explained the way an elder would, a real-life example first, then what it does, the steps, and the mistakes to avoid. In English, Hindi and Bengali.',
            hi: 'Margdarshan खुल गया है — 95 पृष्ठों की पूरी नियमावली: हर डेस्क वैसे समझाया गया जैसे कोई बुज़ुर्ग समझाए — पहले असल ज़िंदगी का उदाहरण, फिर यह क्या करता है, चरण, और बचने योग्य गलतियाँ। अंग्रेज़ी, हिंदी और बांग्ला में।',
            bn: 'Margdarshan খুলে গেছে — ৯৫ পৃষ্ঠার পূর্ণ নিয়মাবলি: প্রতিটি ডেস্ক বোঝানো হয়েছে যেভাবে একজন প্রবীণ বোঝাতেন — প্রথমে বাস্তব জীবনের উদাহরণ, তারপর এটি কী করে, ধাপগুলি, আর এড়িয়ে চলার ভুলগুলি। ইংরেজি, হিন্দি আর বাংলায়।',
          },
        },
        {
          text: {
            en: "The Feature Atlas — the whole app on one map, family by family, with every feature's plan named honestly.",
            hi: 'Feature Atlas — पूरा ऐप एक ही नक्शे पर, परिवार-दर-परिवार, हर सुविधा की योजना ईमानदारी से नाम सहित।',
            bn: 'Feature Atlas — পুরো অ্যাপ একটি মানচিত্রে, পরিবার অনুযায়ী, প্রতিটি সুবিধার পরিকল্পনা সৎভাবে নামসহ।',
          },
        },
        {
          text: {
            en: 'The manual also lives on the open web — anyone can read it at /margdarshan, no account needed to read.',
            hi: 'नियमावली खुले वेब पर भी है — कोई भी इसे /margdarshan पर पढ़ सकता है, पढ़ने के लिए खाता नहीं चाहिए।',
            bn: 'নিয়মাবলি খোলা ওয়েবেও আছে — যেকেউ /margdarshan-এ এটি পড়তে পারেন, পড়তে কোনো অ্যাকাউন্ট লাগে না।',
          },
        },
      ],
    },
  },
  {
    version: 'v2026.10.31-19d5125',
    date: '2026-10-31',
    sections: {
      improved: [
        {
          text: {
            en: 'The Sevak — the in-app assistant — now finds every desk and answers how-to questions in all 10 languages. Ask in your own script.',
            hi: "Sevak — ऐप के अंदर का सहायक — अब हर डेस्क ढूँढता है और सभी 10 भाषाओं में 'कैसे करें' का उत्तर देता है। अपनी लिपि में पूछिए।",
            bn: "Sevak — অ্যাপের ভিতরের সহায়ক — এখন প্রতিটি ডেস্ক খুঁজে পায় আর ১০টি ভাষাতেই 'কীভাবে করবেন' প্রশ্নের উত্তর দেয়। নিজের লিপিতে জিজ্ঞাসা করুন।",
          },
          deskRefs: ['dharmicAssistant'],
        },
      ],
      docs: [
        {
          text: {
            en: "The how-to guides are now complete in the seven newer languages as careful drafts — a native reader's polish is the welcome next step.",
            hi: "'कैसे करें' मार्गदर्शिकाएँ अब सात नई भाषाओं में सावधानी से तैयार मसौदों के रूप में पूर्ण हैं — किसी मूल वक्ता की परिष्कृति स्वागतयोग्य अगला कदम है।",
            bn: "'কীভাবে করবেন' নির্দেশিকাগুলি এখন সাতটি নতুন ভাষায় যত্নে তৈরি খসড়া হিসেবে সম্পূর্ণ — কোনো মাতৃভাষীর পরিমার্জন স্বাগত পরবর্তী পদক্ষেপ।",
          },
          deskRefs: ['dharmicAssistant'],
        },
      ],
    },
  },
  {
    version: 'v2026.10.30-45da128',
    date: '2026-10-30',
    sections: {
      improved: [
        {
          text: {
            en: 'When something goes wrong, the app now answers in a full, kind sentence — what happened, and what you can do — instead of a raw technical error.',
            hi: 'जब कुछ गलत होता है, ऐप अब पूरे, कोमल वाक्य में उत्तर देता है — क्या हुआ, और आप क्या कर सकते हैं — कच्ची तकनीकी त्रुटि की जगह।',
            bn: 'যখন কিছু ভুল হয়, অ্যাপ এখন পূর্ণ, কোমল বাক্যে উত্তর দেয় — কী ঘটেছে, আর আপনি কী করতে পারেন — কাঁচা প্রযুক্তিগত ত্রুটির বদলে।',
          },
        },
        {
          text: {
            en: 'The WhatsApp Broadcaster is now honestly labelled a simulation — it sends nothing, and the screen says so plainly.',
            hi: 'WhatsApp Broadcaster अब ईमानदारी से एक अनुकरण (simulation) कहलाता है — यह कुछ नहीं भेजता, और स्क्रीन यह साफ़ कहती है।',
            bn: 'WhatsApp Broadcaster এখন সৎভাবে একটি অনুকরণ (simulation) বলে চিহ্নিত — এটি কিছুই পাঠায় না, আর পর্দা তা স্পষ্ট বলে।',
          },
          deskRefs: ['sandeshBroadcast'],
        },
      ],
      fixed: [
        {
          text: {
            en: 'Five testimonials on the home page were placeholders — not real words from real temples. They have been removed; that space returns only with genuine ones.',
            hi: 'मुख्य पृष्ठ पर पाँच प्रशंसापत्र केवल स्थान-भरक थे — असली मंदिरों के असली शब्द नहीं। वे हटा दिए गए हैं; वह स्थान केवल सच्चे शब्दों के साथ लौटेगा।',
            bn: 'মূল পৃষ্ঠার পাঁচটি প্রশংসাপত্র ছিল শুধু জায়গা-ভরাট — আসল মন্দিরের আসল কথা নয়। সেগুলি সরিয়ে দেওয়া হয়েছে; সেই জায়গা শুধু সত্যিকারের কথার সঙ্গেই ফিরবে।',
          },
        },
      ],
    },
  },
  {
    version: 'v2026.10.29-d6899b7',
    date: '2026-10-29',
    sections: {
      fixed: [
        {
          text: {
            en: 'The language sheet now opens as a full, proper sheet. On some screens it used to squeeze itself into the thin strip at the top of the page.',
            hi: 'भाषा शीट अब पूरी, सही शीट की तरह खुलती है। कुछ स्क्रीन पर यह पहले पृष्ठ के ऊपर की पतली पट्टी में सिमट जाती थी।',
            bn: 'ভাষা শিট এখন পূর্ণ, সঠিক শিট হিসেবে খোলে। কিছু পর্দায় এটি আগে পৃষ্ঠার উপরের সরু ফিতে আটকে যেত।',
          },
        },
      ],
    },
  },
  {
    version: 'v2026.10.23-8f209d9',
    date: '2026-10-23',
    sections: {
      new: [
        {
          text: {
            en: 'Your organisation opens to a Role Home — your morning view, with your usual desks first — and every desk lives in one All-Desks directory. The old App Store is now Plans & Add-ons.',
            hi: 'आपकी संस्था अब Role Home पर खुलती है — आपका सुबह का दृश्य, आपके रोज़ के डेस्क सबसे पहले — और हर डेस्क एक ही All-Desks निर्देशिका में रहता है। पुराना App Store अब Plans & Add-ons है।',
            bn: 'আপনার প্রতিষ্ঠান এখন Role Home-এ খোলে — আপনার সকালের দৃশ্য, আপনার নিয়মিত ডেস্ক সবার আগে — আর প্রতিটি ডেস্ক একটি All-Desks নির্দেশিকায় থাকে। পুরনো App Store এখন Plans & Add-ons।',
          },
          deskRefs: ['dashboard'],
        },
      ],
      improved: [
        {
          text: {
            en: 'Plan names are clearer: the free plan is now called Lite, and the top plan Enterprise. Prices and limits are exactly as before.',
            hi: 'योजनाओं के नाम अब साफ़ हैं: मुफ़्त योजना अब Lite कहलाती है, और शीर्ष योजना Enterprise। कीमतें और सीमाएँ बिल्कुल पहले जैसी हैं।',
            bn: 'পরিকল্পনার নাম এখন পরিষ্কার: বিনামূল্যের পরিকল্পনা এখন Lite, আর শীর্ষ পরিকল্পনা Enterprise। দাম আর সীমা ঠিক আগের মতোই।',
          },
          deskRefs: ['appStore'],
        },
      ],
    },
  },
];

/* ------------------------------------------------------------------ */
/* Resolver                                                            */
/* ------------------------------------------------------------------ */

type Lang3Code = 'en' | 'hi' | 'bn';
function l3(lang: string): Lang3Code {
  const l = (lang || 'en').toLowerCase();
  return l === 'hi' || l === 'bn' ? l : 'en';
}

/** The newest shipped release (RELEASES is newest-first). */
export function latestRelease(): ReleaseEntry {
  return RELEASES[0];
}

export function getRelease(version: string): ReleaseEntry | undefined {
  return RELEASES.find((r) => r.version === version);
}

/**
 * Releases strictly newer than `version`, newest first. The array
 * order IS the chronology (stamps are not orderable strings across
 * days), so "since" is positional: everything above the named
 * release. An unknown or empty version yields [] — a foreign stamp
 * must never mark the whole archive as new.
 */
export function releasesSince(
  version: string | null | undefined
): ReleaseEntry[] {
  if (!version) return [];
  const idx = RELEASES.findIndex((r) => r.version === version);
  if (idx < 0) return [];
  return RELEASES.slice(0, idx);
}

/** Items in one release, across all its sections. */
export function releaseItemCount(release: ReleaseEntry): number {
  return RELEASE_SECTION_ORDER.reduce(
    (n, id) => n + (release.sections[id]?.length ?? 0),
    0
  );
}

/** Items shipped in releases newer than `version`. */
export function countItemsSince(version: string | null | undefined): number {
  return releasesSince(version).reduce((n, r) => n + releaseItemCount(r), 0);
}

/* ------------------------------------------------------------------ */
/* One-language view model                                             */
/* ------------------------------------------------------------------ */

export interface ResolvedReleaseItem {
  text: string;
  deskRefs: string[];
}

export interface ResolvedReleaseSection {
  id: ReleaseSectionId;
  items: ResolvedReleaseItem[];
}

export interface ResolvedRelease {
  version: string;
  date: string;
  sections: ResolvedReleaseSection[];
  itemCount: number;
}

/** A release resolved into one language (Lang3 clamp, as the manual). */
export function resolveRelease(
  release: ReleaseEntry,
  lang: string
): ResolvedRelease {
  const code = l3(lang);
  const sections: ResolvedReleaseSection[] = [];
  for (const id of RELEASE_SECTION_ORDER) {
    const items = release.sections[id];
    if (!items || items.length === 0) continue;
    sections.push({
      id,
      items: items.map((it) => ({
        text: it.text[code],
        deskRefs: it.deskRefs ? [...it.deskRefs] : [],
      })),
    });
  }
  return {
    version: release.version,
    date: release.date,
    sections,
    itemCount: releaseItemCount(release),
  };
}
