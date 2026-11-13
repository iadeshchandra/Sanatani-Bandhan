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
    version: 'v2026.11.13-20ef885',
    date: '2026-11-13',
    sections: {
      new: [
        {
          text: {
            en: "Every role now opens with its day at a glance: the Priest's home begins with today's pujas, the next puja, those on standby, and the devotees expected — and the Sevadar's home begins with their shifts, the team today, who has checked in, and their own status. The same calm band that trustees and accountants received earlier this week now completes the set, so nobody starts their morning by hunting.",
            hi: "अब हर भूमिका का दिन एक नज़र में खुलता है: पुरोहित का मुखपृष्ठ आज की पूजाओं, अगली पूजा, प्रतीक्षा-सूची और अपेक्षित भक्तों से शुरू होता है — और सेवादार का मुखपृष्ठ उनकी पाली, आज की टीम, उपस्थिति और उनकी अपनी स्थिति से। वही शांत बैंड, जो इस सप्ताह संरक्षकों और लेखाकारों को मिला था, अब सबके लिए पूर्ण हो गया है — अब किसी को अपनी सुबह खोजने से शुरू नहीं करनी पड़ती।",
            bn: "এখন প্রতিটি ভূমিকার দিন এক নজরে খোলে: পুরোহিতের হোম শুরু হয় আজকের পূজা, পরের পূজা, অপেক্ষমাণ তালিকা আর প্রত্যাশিত ভক্তদের দিয়ে — আর সেবাদারের হোম শুরু হয় তাঁর পালা, আজকের দল, উপস্থিতি আর নিজের অবস্থা দিয়ে। এই সপ্তাহে ট্রাস্টি ও হিসাবরক্ষকরা যে শান্ত ব্যান্ডটি পেয়েছিলেন, তা এখন সবার জন্য সম্পূর্ণ — আর কাউকে সকালটা খোঁজাখুঁজি দিয়ে শুরু করতে হয় না।",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.12-d0d6678',
    date: '2026-11-12',
    sections: {
      new: [
        {
          text: {
            en: "A Day Band on your organisation's home: today's collections — with yesterday's figure resting quietly beneath — the net treasury fund, and everything awaiting your decision, all in one glance just under the greeting. The daily shloka now sits just below the band, and morning darshan still opens the page.",
            hi: "आपकी संस्था के मुखपृष्ठ पर अब एक डे बैंड है: आज का संग्रह — कल का आँकड़ा शांति से उसके नीचे — शुद्ध कोषागार राशि, और आपके निर्णय की प्रतीक्षा में सब कुछ, अभिवादन के ठीक नीचे एक ही नज़र में। दैनिक श्लोक अब बैंड के ठीक नीचे है, और पृष्ठ अब भी प्रातः दर्शन से ही खुलता है।",
            bn: "আপনার প্রতিষ্ঠানের হোমে এখন একটি ডে ব্যান্ড: আজকের সংগ্রহ — গতকালের অঙ্ক শান্তভাবে তার নিচে — নিট কোষাগার তহবিল, আর আপনার সিদ্ধান্তের অপেক্ষায় থাকা সবকিছু, শুভেচ্ছার ঠিক নিচে এক নজরে। দৈনিক শ্লোক এখন ব্যান্ডের ঠিক নিচে, আর পৃষ্ঠা এখনও প্রাতঃদর্শন দিয়েই খোলে।",
          },
        },
        {
          text: {
            en: "A gentle Week Shape beneath the band — seven small bars showing the last seven days of collections, so the week's rhythm is visible at a glance. Accountants see income and expenses standing together.",
            hi: "बैंड के नीचे एक सौम्य सप्ताह-आकार — सात छोटे स्तंभ पिछले सात दिनों का संग्रह दिखाते हैं, ताकि सप्ताह की लय एक नज़र में दिखे। लेखाकारों को आय और व्यय साथ-साथ दिखते हैं।",
            bn: "ব্যান্ডের নিচে একটি কোমল সপ্তাহ-আকৃতি — সাতটি ছোট স্তম্ভ গত সাত দিনের সংগ্রহ দেখায়, যাতে সপ্তাহের ছন্দ এক নজরে দেখা যায়। হিসাবরক্ষকরা আয় ও ব্যয় পাশাপাশি দেখেন।",
          },
        },
        {
          text: {
            en: "BahiKhata now greets you with its queue at a glance: drafts in progress, registers awaiting your review, and everything committed to the books — counted honestly, before a single row becomes money.",
            hi: "बहिखाता अब अपनी कतार एक नज़र में दिखाता है: चल रहे ड्राफ़्ट, आपकी समीक्षा की प्रतीक्षा में रजिस्टर, और खातों में दर्ज सब कुछ — ईमानदारी से गिना हुआ, एक भी पंक्ति के धन बनने से पहले।",
            bn: "বহিখাতা এখন তার সারি এক নজরে দেখায়: চলমান খসড়া, আপনার পর্যালোচনার অপেক্ষায় থাকা রেজিস্টার, আর খাতায় তোলা সবকিছু — সততার সঙ্গে গোনা, একটি সারিও অর্থ হয়ে ওঠার আগে।",
          },
        },
      ],
      improved: [
        {
          text: {
            en: "The Treasury desk now opens with its figures, not a paragraph: net available, today's collections and expenses, and this week's net stand at the head of the desk, with the charts moved up to sit with them.",
            hi: "कोषागार डेस्क अब परिचय से नहीं, आँकड़ों से खुलता है: उपलब्ध शुद्ध राशि, आज का संग्रह और व्यय, और इस सप्ताह का शुद्ध — सब डेस्क के शीर्ष पर हैं, और चार्ट भी ऊपर आकर उनके साथ बैठ गए हैं।",
            bn: "কোষাগার ডেস্ক এখন ভূমিকা দিয়ে নয়, অঙ্ক দিয়ে খোলে: প্রাপ্য নিট অর্থ, আজকের সংগ্রহ ও ব্যয়, আর এই সপ্তাহের নিট — সব ডেস্কের মাথায়, আর চার্টগুলোও উপরে উঠে তাদের পাশে বসেছে।",
          },
        },
      ],
      fixed: [
        {
          text: {
            en: "The Treasury desk's More menu could hide its own lower items behind the desk's frame, leaving them untappable. The menu now drops clear of the frame — every action in it can be reached and tapped, including Audit Trail and Print.",
            hi: "कोषागार डेस्क का 'अधिक' मेनू अपने ही निचले विकल्पों को डेस्क के फ़्रेम के पीछे छिपा देता था, जिससे वे छुए नहीं जा सकते थे। मेनू अब फ़्रेम के बाहर खुलकर आता है — ऑडिट ट्रेल और प्रिंट समेत उसका हर विकल्प अब पहुँचा और छुआ जा सकता है।",
            bn: "কোষাগার ডেস্কের 'আরও' মেনু তার নিজের নিচের বিকল্পগুলোকে ডেস্কের ফ্রেমের আড়ালে লুকিয়ে ফেলত, ফলে সেগুলো ছোঁয়া যেত না। মেনু এখন ফ্রেমের বাইরে খোলে — অডিট ট্রেইল ও প্রিন্টসহ তার প্রতিটি বিকল্প এখন পৌঁছানো ও ছোঁয়া যায়।",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.08-295f970',
    date: '2026-11-08',
    sections: {
      new: [
        {
          text: {
            en: "Calmer pages, a calmer SOS, and a home for your requirements: Margdarshan now fits your phone properly — the manual, the atlas and every desk page open without sideways scrolling, even on the smallest screens.",
            hi: "शांत पृष्ठ, शांत SOS, और आपकी आवश्यकताओं का नया घर: मार्गदर्शन अब आपके फ़ोन पर ठीक से खुलता है — नियमावली, एटलस और हर डेस्क पृष्ठ, सबसे छोटी स्क्रीन पर भी, बिना इधर-उधर खिसके खुलते हैं।",
            bn: "শান্ত পৃষ্ঠা, শান্ত SOS, আর আপনার প্রয়োজন জানানোর নতুন ঘর: মার্গদর্শন এখন আপনার ফোনে ঠিকঠাক খোলে — ম্যানুয়াল, অ্যাটলাস আর প্রতিটি ডেস্ক পৃষ্ঠা, সবচেয়ে ছোট স্ক্রিনেও, পাশে সরে যাওয়া ছাড়াই খোলে।",
          },
        },
        {
          text: {
            en: "The emergency SOS in your feed is now a calm, clear pill — always in sight, always one tap from help, without shouting over your darshan.",
            hi: "आपकी फ़ीड में आपातकालीन SOS अब एक शांत, स्पष्ट गोली (पिल) के रूप में है — हमेशा सामने, मदद से हमेशा एक स्पर्श दूर, बिना आपके दर्शन पर चिल्लाए।",
            bn: "আপনার ফিডে জরুরি SOS এখন একটি শান্ত, স্পষ্ট পিল — সবসময় চোখের সামনে, সাহায্য থেকে সবসময় এক ছোঁয়া দূরে, আপনার দর্শনের উপর চিৎকার না করে।",
          },
        },
        {
          text: {
            en: "You can now post a ritual requirement right inside the Seva Bazar marketplace — tell verified purohits what you need, and they can accept it directly.",
            hi: "अब आप सेवा बाज़ार में ही अपनी पूजा-आवश्यकता डाल सकते हैं — सत्यापित पुरोहितों को बताइए कि आपको क्या चाहिए, वे सीधे स्वीकार कर सकते हैं।",
            bn: "এখন আপনি সেবা বাজারের ভিতরেই আপনার পূজার প্রয়োজন জানাতে পারেন — যাচাইকৃত পুরোহিতদের বলুন আপনার কী চাই, তাঁরা সরাসরি গ্রহণ করতে পারবেন।",
          },
        },
        {
          text: {
            en: "Behind the scenes we retired some unused doors, so the app stays light and quick for everyone.",
            hi: "पर्दे के पीछे हमने कुछ अप्रयुक्त द्वार बंद किए हैं, ताकि ऐप सबके लिए हल्का और तेज़ बना रहे।",
            bn: "পর্দার আড়ালে আমরা কিছু অব্যবহৃত দরজা সরিয়েছি, যাতে অ্যাপটি সবার জন্য হালকা ও দ্রুত থাকে।",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.07-b8c940a',
    date: '2026-11-07',
    sections: {
      new: [
        {
          text: {
            en: "Your devotee portal opens in the light now. The Smart Pass rests on warm temple paper, and the SOS PANIC and Call SOS buttons stand at full finger size, ready the moment they are needed. The fingerprint ceremony, the public LOGIN doors, and the footer links across our public pages all welcome you in the same calm sanctum colours, with every tap target a comfortable size.",
            hi: "आपका भक्त पोर्टल अब उजाले में खुलता है। स्मार्ट पास गर्म मंदिर-काग़ज़ पर विराजता है, और SOS PANIC व Call SOS बटन पूरी उँगली के आकार में खड़े हैं — ज़रूरत के क्षण में हमेशा तैयार। फ़िंगरप्रिंट समारोह, सार्वजनिक LOGIN द्वार और हमारे सार्वजनिक पृष्ठों के निचले लिंक — सब आपको उन्हीं शांत गर्भगृह रंगों में स्वागत करते हैं, और हर टैप आरामदायक आकार का है।",
            bn: "আপনার ভক্ত পোর্টাল এখন আলোয় খোলে। স্মার্ট পাস উষ্ণ মন্দির-কাগজে বিরাজ করে, আর SOS PANIC ও Call SOS বোতাম পূর্ণ আঙুলের মাপে দাঁড়িয়ে — প্রয়োজনের মুহূর্তে সবসময় প্রস্তুত। আঙুলের ছাপের অনুষ্ঠান, সর্বজনীন LOGIN দরজা আর আমাদের সর্বজনীন পৃষ্ঠাগুলোর নিচের লিংক — সবই আপনাকে একই শান্ত গর্ভগৃহ রঙে স্বাগত জানায়, আর প্রতিটি ট্যাপ আরামদায়ক মাপের।",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.05-9508421',
    date: '2026-11-05',
    sections: {
      new: [
        {
          text: {
            en: "Sign-in, sign-up and the lost-page door now open into the light: the sign-in and sign-up pages used to open into a dark purple scene that felt like a different app. They now welcome you the way the rest of Sanatani Bandhan does — warm ivory light, a brass hairline, the temple mandala, and the same deep-saffron button as everywhere else. The \"page not found\" door matches too. Desk counts now always show their full number (\"66 of 72 desks\"), and the Sanatani Bandhan name no longer breaks across two lines on small phones. Nothing about how you sign in has changed — only the light.",
            hi: "साइन-इन, साइन-अप और खोया-पृष्ठ द्वार अब उजाले में खुलते हैं: साइन-इन और साइन-अप पेज पहले एक गहरे बैंगनी दृश्य में खुलते थे, जो किसी और ऐप जैसा लगता था। अब वे उसी तरह आपका स्वागत करते हैं जैसे बाकी सनातनी बंधन करता है — गर्म हाथी-दांत जैसी रोशनी, पीतल की महीन रेखा, मंदिर मंडल, और हर जगह वाला वही गहरा केसरिया बटन। \"पृष्ठ नहीं मिला\" वाला द्वार भी अब वैसा ही है। डेस्क की गिनती अब हमेशा पूरी संख्या दिखाती है (\"72 में से 66 डेस्क\"), और छोटे फ़ोनों पर सनातनी बंधन का नाम अब दो पंक्तियों में नहीं टूटता। साइन-इन करने का तरीका बिल्कुल नहीं बदला — सिर्फ़ रोशनी बदली है।",
            bn: "সাইন-ইন, সাইন-আপ আর হারানো-পৃষ্ঠার দরজা এখন আলোয় খোলে: সাইন-ইন ও সাইন-আপ পৃষ্ঠা আগে এক গাঢ় বেগুনি দৃশ্যে খুলত, যা মনে হত অন্য কোনো অ্যাপ। এখন তারা ঠিক সেভাবেই আপনাকে স্বাগত জানায় যেভাবে বাকি সনাতনী বন্ধন জানায় — উষ্ণ হাতির-দাঁতের মতো আলো, পিতলের সরু রেখা, মন্দির মণ্ডল, আর সব জায়গার সেই একই গাঢ় জাফরান বোতাম। \"পৃষ্ঠা পাওয়া যায়নি\" দরজাটিও এখন মিলে গেছে। ডেস্কের সংখ্যা এখন সবসময় পুরো সংখ্যায় দেখায় (\"৭২টির মধ্যে ৬৬টি ডেস্ক\"), আর ছোট ফোনে সনাতনী বন্ধন নামটি আর দুই লাইনে ভাঙে না। সাইন-ইন করার পদ্ধতি একদমই বদলায়নি — শুধু আলোটা বদলেছে।",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.04-cb2170a',
    date: '2026-11-04',
    sections: {
      new: [
        {
          text: {
            en: "One sanctum face for every desk: the Treasury, Puja, Panchang, Utsav and Purohit Management desks now open with the same warm ivory-and-brass hero as your home, instead of five different dark themes — and the Purohit directory cards are repaired, so names, availability and qualifications read in full.",
            hi: "हर डेस्क का एक ही पवित्र मुख: कोषागार, पूजा, पंचांग, उत्सव और पुरोहित प्रबंधन डेस्क अब पाँच अलग गहरे रंगों की जगह आपके होम जैसे ही उष्ण हाथी-दांत और पीतल रंग के आवरण से खुलते हैं — और पुरोहित निर्देशिका के कार्ड ठीक हो गए हैं, जिससे नाम, उपलब्धता और योग्यता पूरी पढ़ी जा सकती है।",
            bn: "প্রতিটি ডেস্কে একই পবিত্র মুখ: কোষাগার, পূজা, পঞ্চাঙ্গ, উৎসব ও পুরোহিত ব্যবস্থাপনা ডেস্ক এখন পাঁচটি আলাদা গাঢ় থিমের বদলে আপনার হোমের মতোই উষ্ণ হাতির-দাঁত ও পিতল রঙের আবরণে খোলে — আর পুরোহিত নির্দেশিকার কার্ড ঠিক হয়েছে, ফলে নাম, উপলব্ধতা ও যোগ্যতা পুরোটা পড়া যায়।",
          },
          deskRefs: ['treasury', 'poojaBooking', 'panchang', 'utsav-one', 'purohitDesk'],
        },
      ],
    },
  },
  {
    version: 'v2026.11.02-82d4113',
    date: '2026-11-02',
    sections: {
      new: [
        {
          text: {
            en: "One button, one tab, everywhere: the app's scattered button and tab styles are now a single sanctum component family — the deep-marigold primary button, one pill tab row and one segmented switch across the shell, Treasury, Utsav, Membership, Purohit Management and your devotee portal, with small desk buttons raised to honest touch sizes.",
            hi: "हर जगह एक ही बटन, एक ही टैब: ऐप की बिखरी हुई बटन और टैब शैलियाँ अब एक ही मंदिर-शैली घटक परिवार हैं — गहरा गेंदा रंग का मुख्य बटन, एक ही गोल टैब पंक्ति और एक ही खंडित स्विच — शेल, कोषागार, उत्सव, सदस्यता, पुरोहित प्रबंधन और आपके भक्त पोर्टल में, और छोटे डेस्क बटन अब सही स्पर्श आकार के हैं।",
            bn: "সব জায়গায় একই বোতাম, একই ট্যাব: অ্যাপের ছড়ানো বোতাম ও ট্যাব শৈলী এখন একটাই মন্দির-ঘরানার উপাদান পরিবার — গাঢ় গাঁদা রঙের প্রধান বোতাম, একই গোল ট্যাব সারি ও একই খণ্ডিত সুইচ — শেল, কোষাগার, উৎসব, সদস্যতা, পুরোহিত ব্যবস্থাপনা ও আপনার ভক্ত পোর্টালে, আর ছোট ডেস্ক বোতাম এখন সঠিক স্পর্শ-মাপের।",
          },
          deskRefs: ['treasury', 'utsav-one', 'membership', 'purohitDesk'],
        },
      ],
    },
  },
  {
    version: 'v2026.11.01-b608a1e',
    date: '2026-11-01',
    sections: {
      fixed: [
        {
          text: {
            en: "The Purohit verification ladder now works end to end: organisation endorsements are recorded as firm evidence, a purohit's claim to the next tier truly goes through (and says so plainly if it cannot), and every badge and ranking reads the real tier — the same certainty the Jyotish ladder received, now on both sides.",
            hi: "पुरोहित सत्यापन-सीढ़ी अब सिरे से सिरे तक कार्य करती है: संस्था के अनुमोदन दृढ़ साक्ष्य के रूप में दर्ज होते हैं, पुरोहित का अगले स्तर का दावा सचमुच पूर्ण होता है (और न हो सके तो स्पष्ट कहता है), और हर बैज व श्रेणी वास्तविक स्तर ही दिखाती है — जो निश्चितता ज्योतिष-सीढ़ी को मिली, अब दोनों ओर।",
            bn: "পুরোহিত যাচাই-সোপান এখন আগাগোড়া কাজ করে: প্রতিষ্ঠানের অনুমোদন দৃঢ় প্রমাণ হিসেবে নথিভুক্ত হয়, পুরোহিতের পরের স্তরের দাবি সত্যিই সম্পন্ন হয় (আর না হলে স্পষ্ট করে বলে), এবং প্রতিটি ব্যাজ ও ক্রম আসল স্তরই দেখায় — জ্যোতিষ-সোপান যে নিশ্চয়তা পেয়েছিল, এখন দুই দিকেই।",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.01-88e081a',
    date: '2026-11-01',
    sections: {
      new: [
        {
          text: {
            en: "The Sevak now answers from Margdarshan itself: ask how to do something, and the answer comes from the manual page that teaches it — with the page named and one tap away. And when the manual has no answer yet, the Sevak offers to carry your question to Your Voice as a suggestion.",
            hi: "सेवक अब मार्गदर्शन से ही उत्तर देता है: पूछें कि कुछ कैसे करें, और उत्तर उसी मार्गदर्शिका-पृष्ठ से आता है जो वह सिखाता है — पृष्ठ का नाम सहित, एक दबाव की दूरी पर। और जब मार्गदर्शिका में उत्तर न हो, तो सेवक आपका प्रश्न सुझाव के रूप में आपकी आवाज़ तक पहुँचाने का प्रस्ताव देता है।",
            bn: "সেবক এখন মার্গদর্শন থেকেই উত্তর দেয়: কিছু কীভাবে করবেন জিজ্ঞেস করুন, উত্তর আসে সেই নির্দেশিকা-পৃষ্ঠা থেকে যেটি তা শেখায় — পৃষ্ঠার নামসহ, এক চাপের দূরত্বে। আর নির্দেশিকায় উত্তর না থাকলে, সেবক আপনার প্রশ্নটি প্রস্তাব হিসেবে আপনার কণ্ঠে পৌঁছে দেওয়ার প্রস্তাব দেয়।",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.01-fea167c',
    date: '2026-11-01',
    sections: {
      new: [
        {
          text: {
            en: "Your Voice is open in Margdarshan: suggest an idea, support the ones you love, and watch each suggestion travel — received, reviewed, planned, shipped. Reading is free for everyone; the team answers on the board itself.",
            hi: "मार्गदर्शन में आपकी आवाज़ खुल गई है: विचार सुझाएँ, जो पसंद आए उसका समर्थन करें, और हर सुझाव की यात्रा देखें — प्राप्त, समीक्षाधीन, नियोजित, पूर्ण। पढ़ना सबके लिए निःशुल्क है; टीम पटल पर ही उत्तर देती है।",
            bn: "মার্গদর্শনে আপনার কণ্ঠ খুলে গেছে: ধারণা প্রস্তাব করুন, পছন্দেরটিকে সমর্থন করুন, এবং প্রতিটি প্রস্তাবের যাত্রা দেখুন — গৃহীত, পর্যালোচনাধীন, পরিকল্পিত, সম্পন্ন। পড়া সবার জন্য বিনামূল্যে; দল পটেই উত্তর দেয়।",
          },
        },
      ],
    },
  },
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
