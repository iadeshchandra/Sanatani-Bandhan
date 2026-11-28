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
    version: 'v2026.11.28-5eb555e',
    date: '2026-11-28',
    sections: {
      fixed: [
        { text: {
          en: 'Behind the scenes, the owner’s console now keeps its promises: the API Keys desk can save the service keys the app runs on — the YouTube connection for live darshan among them — and the Professionals desk accepts the owner’s decisions. A security-rules repair that was approved earlier is now truly in place.',
          hi: 'पर्दे के पीछे, मालिक का कंसोल अब अपने वादे निभाता है: API Keys डेस्क उन सेवा-कुंजियों को सहेज सकता है जिन पर ऐप चलता है — लाइव दर्शन के लिए YouTube कनेक्शन उनमें से एक है — और Professionals डेस्क मालिक के निर्णय स्वीकार करता है। पहले स्वीकृत सुरक्षा-नियम सुधार अब सचमुच लागू है।',
          bn: 'পর্দার আড়ালে, মালিকের কনসোল এখন তার প্রতিশ্রুতি রাখে: API Keys ডেস্ক সেই পরিষেবা-চাবিগুলি সংরক্ষণ করতে পারে যেগুলির ওপর অ্যাপ চলে — লাইভ দর্শনের জন্য YouTube সংযোগ তার মধ্যে একটি — আর Professionals ডেস্ক মালিকের সিদ্ধান্ত গ্রহণ করে। আগে অনুমোদিত নিরাপত্তা-নিয়মের মেরামত এখন সত্যিই কার্যকর।',
        } },
      ],
    },
  },
  {
    version: 'v2026.11.28-baee61a',
    date: '2026-11-28',
    sections: {
      new: [
        { text: {
          en: 'Trustees can now preview the console exactly as an Accountant, Priest, Sevadar or Devotee sees it — from the governance desk’s new Preview doors. A banner stays on screen the whole time, and nothing can be changed while previewing.',
          hi: 'ट्रस्टी अब कंसोल को ठीक वैसे ही देख सकते हैं जैसे एक Accountant, Priest, Sevadar या Devotee देखता है — गवर्नेंस डेस्क के नए Preview द्वारों से। पूरे समय स्क्रीन पर एक बैनर रहता है, और पूर्वावलोकन के दौरान कुछ भी बदला नहीं जा सकता।',
          bn: 'ট্রাস্টিরা এখন কনসোলটি ঠিক সেভাবেই দেখতে পারেন, যেভাবে একজন Accountant, Priest, Sevadar বা Devotee দেখেন — গভর্ন্যান্স ডেস্কের নতুন Preview দরজা থেকে। পুরো সময় স্ক্রিনে একটি ব্যানার থাকে, আর প্রিভিউ চলাকালে কিছুই বদলানো যায় না।',
        } },
        { text: {
          en: 'A devotee opening their organisation’s dashboard now gets a member view — their own giving, bookings and membership — while the organisation’s treasury stays with its trustees and team, where it belongs.',
          hi: 'अपने संगठन का डैशबोर्ड खोलने वाले भक्त को अब सदस्य दृश्य मिलता है — उनका अपना दान, बुकिंग व सदस्यता — जबकि संगठन का कोषागार उसके ट्रस्टियों व दल के पास रहता है, जहाँ उसे होना चाहिए।',
          bn: 'নিজের সংগঠনের ড্যাশবোর্ড খুললে একজন ভক্ত এখন সদস্য দৃশ্য পান — তাঁর নিজের দান, বুকিং ও সদস্যতা — আর সংগঠনের কোষাগার থাকে তার ট্রাস্টি ও দলের কাছে, যেখানে থাকার কথা।',
        } },
      ],
      fixed: [
        { text: {
          en: 'The demo now greets you truthfully: entering works every time, the Exit demo button truly exits, and your demo identity keeps one steady ID on your device instead of a new one on each visit.',
          hi: 'डेमो अब आपको सच के साथ स्वागत करता है: हर बार प्रवेश होता है, Exit demo बटन सचमुच बाहर ले जाता है, और आपकी डेमो पहचान हर यात्रा पर नई बनने के बजाय आपके डिवाइस पर एक स्थिर ID रखती है।',
          bn: 'ডেমো এখন আপনাকে সত্য দিয়ে স্বাগত জানায়: প্রতিবার প্রবেশ হয়, Exit demo বোতাম সত্যিই বের করে দেয়, আর আপনার ডেমো পরিচয় প্রতিবার নতুন না হয়ে আপনার ডিভাইসে একটি স্থির ID ধরে রাখে।',
        } },
        { text: {
          en: 'A staff-permission message that printed a placeholder instead of the organisation’s name now names your organisation properly, and the two demo funds that began below zero now begin honestly in balance.',
          hi: 'एक स्टाफ़-अनुमति संदेश जो संगठन के नाम की जगह एक प्लेसहोल्डर छापता था, अब आपके संगठन का नाम सही ढंग से बताता है, और जो दो डेमो फंड शून्य से नीचे शुरू होते थे, वे अब ईमानदारी से संतुलन में शुरू होते हैं।',
          bn: 'একটি স্টাফ-অনুমতির বার্তা যা সংগঠনের নামের বদলে একটি প্লেসহোল্ডার ছাপত, তা এখন আপনার সংগঠনের নাম ঠিকভাবে বলে, আর যে দুটি ডেমো তহবিল শূন্যের নিচে শুরু হতো, সেগুলো এখন সততার সঙ্গে ভারসাম্যে শুরু হয়।',
        } },
        { text: {
          en: 'Every corner of the app now shows the same real version, the Suchana bell and the Suchana stream count from the same list, and the language confirmation speaks the language you just chose.',
          hi: 'ऐप का हर कोना अब एक ही असली संस्करण दिखाता है, सूचना घंटी व सूचना धारा एक ही सूची से गिनती करती हैं, और भाषा की पुष्टि उसी भाषा में होती है जो आपने अभी चुनी।',
          bn: 'অ্যাপের প্রতিটি কোণ এখন একই আসল সংস্করণ দেখায়, সূচনা ঘণ্টা ও সূচনা ধারা একই তালিকা থেকে গোনে, আর ভাষার নিশ্চিতকরণ সেই ভাষাতেই হয় যেটি আপনি এইমাত্র বেছেছেন।',
        } },
      ],
    },
  },
  {
    version: 'v2026.11.28-38ce987',
    date: '2026-11-28',
    sections: {
      new: [
        { text: {
          en: 'The Users desk in the platform console can now browse people: the first fifty accounts appear as a list, and tapping one opens its management card — no need to know an email address first.',
          hi: 'प्लेटफ़ॉर्म कंसोल का Users डेस्क अब लोगों को ब्राउज़ कर सकता है: पहले पचास खाते सूची के रूप में दिखते हैं, और किसी पर टैप करने से उसका प्रबंधन कार्ड खुलता है — पहले ईमेल पता जानना ज़रूरी नहीं।',
          bn: 'প্ল্যাটফর্ম কনসোলের Users ডেস্ক এখন মানুষ ব্রাউজ করতে পারে: প্রথম পঞ্চাশটি অ্যাকাউন্ট তালিকা হিসেবে দেখায়, আর একটিতে ট্যাপ করলেই তার ব্যবস্থাপনা কার্ড খোলে — আগে ইমেল ঠিকানা জানা জরুরি নয়।',
        } },
        { text: {
          en: 'Every sign-in to the platform console is now written into the Audit Log, so the owner’s own visits leave an honest trail from today onward.',
          hi: 'प्लेटफ़ॉर्म कंसोल में हर साइन-इन अब Audit Log में लिखा जाता है, ताकि आज से मालिक की अपनी यात्राओं का ईमानदार रिकॉर्ड रहे।',
          bn: 'প্ল্যাটফর্ম কনসোলে প্রতিটি সাইন-ইন এখন Audit Log-এ লেখা হয়, যাতে আজ থেকে মালিকের নিজের প্রবেশের সৎ রেকর্ড থাকে।',
        } },
      ],
      fixed: [
        { text: {
          en: 'The platform console now tells the truth: the Workspaces desk lists every workspace (it showed none), the API Keys desk opens for the owner, and the Professionals desk no longer refuses the owner with a permission message.',
          hi: 'प्लेटफ़ॉर्म कंसोल अब सच बताता है: Workspaces डेस्क हर workspace दिखाता है (पहले एक भी नहीं दिखता था), API Keys डेस्क मालिक के लिए खुलता है, और Professionals डेस्क अब मालिक को अनुमति-संदेश दिखाकर नहीं रोकता।',
          bn: 'প্ল্যাটফর্ম কনসোল এখন সত্য বলে: Workspaces ডেস্ক সব workspace দেখায় (আগে একটিও দেখাত না), API Keys ডেস্ক মালিকের জন্য খোলে, আর Professionals ডেস্ক এখন অনুমতির বার্তা দেখিয়ে মালিককে আটকায় না।',
        } },
        { text: {
          en: 'The System desk no longer shows a make-believe server address — it honestly says no separate server is configured — and the Translations desk now labels the bundled starter translations as starters instead of verified.',
          hi: 'System डेस्क अब कोई काल्पनिक सर्वर पता नहीं दिखाता — वह ईमानदारी से बताता है कि कोई अलग सर्वर कॉन्फ़िगर नहीं है, और Translations डेस्क अब साथ आए प्रारंभिक अनुवादों को सत्यापित कहने के बजाय प्रारंभिक ही कहता है।',
          bn: 'System ডেস্ক এখন আর কাল্পনিক সার্ভার ঠিকানা দেখায় না — সৎভাবে বলে কোনো আলাদা সার্ভার কনফিগার করা নেই, আর Translations ডেস্ক এখন সঙ্গে-আসা প্রাথমিক অনুবাদগুলোকে যাচাইকৃত না বলে প্রাথমিকই বলে।',
        } },
        { text: {
          en: 'The platform console now fits phone screens: its desk menu scrolls instead of cutting off names, and the floating SOS and Ask buttons no longer cover the console’s own controls.',
          hi: 'प्लेटफ़ॉर्म कंसोल अब फ़ोन स्क्रीन पर ठीक बैठता है: उसका डेस्क मेनू नाम काटने के बजाय स्क्रॉल होता है, और तैरते SOS व Ask बटन अब कंसोल के अपने नियंत्रणों को नहीं ढकते।',
          bn: 'প্ল্যাটফর্ম কনসোল এখন ফোনের স্ক্রিনে ঠিকমতো বসে: এর ডেস্ক মেনু নাম কেটে না দিয়ে স্ক্রল হয়, আর ভাসমান SOS ও Ask বোতাম এখন কনসোলের নিজের নিয়ন্ত্রণ ঢাকে না।',
        } },
      ],
    },
  },
  {
    version: 'v2026.11.27-fc5e43f',
    date: '2026-11-27',
    sections: {
      fixed: [
        { text: {
          en: 'Fixed the phone layout: popups and sheets now always open above the floating SOS and Ask buttons, so no button is ever covered again — and pages keep a clear space at the bottom so the last controls stay reachable.',
          hi: 'फ़ोन लेआउट ठीक किया गया: पॉपअप और शीट अब हमेशा तैरते SOS और Ask बटनों के ऊपर खुलते हैं, इसलिए कोई बटन फिर कभी ढकेगा नहीं — और पेजों के नीचे स्पष्ट जगह रहती है ताकि आख़िरी नियंत्रण भी हमेशा पहुँच में रहें।',
          bn: 'ফোনের লেআউট ঠিক করা হয়েছে: পপআপ ও শিট এখন সবসময় ভাসমান SOS ও Ask বোতামের উপরে খোলে, তাই কোনো বোতাম আর কখনো ঢাকা পড়বে না — আর পেজের নিচে পরিষ্কার জায়গা থাকে যাতে শেষ নিয়ন্ত্রণগুলোও সবসময় হাতের নাগালে থাকে।',
        } },
        { text: {
          en: 'The organisation console no longer scrolls sideways on phones: wide tables scroll inside their own cards, the header never covers the Exit button, and the Pass screen shows a single bottom bar.',
          hi: 'संगठन कंसोल अब फ़ोन पर बग़ल में नहीं सरकता: चौड़ी तालिकाएँ अपने कार्ड के अंदर ही स्क्रॉल होती हैं, हेडर Exit बटन को कभी नहीं ढकता, और पास स्क्रीन पर एक ही निचली पट्टी दिखती है।',
          bn: 'প্রতিষ্ঠানের কনসোল এখন ফোনে পাশে সরে না: চওড়া টেবিল নিজের কার্ডের ভিতরেই স্ক্রল হয়, হেডার কখনো Exit বোতাম ঢাকে না, আর পাস স্ক্রিনে একটিই নিচের বার দেখায়।',
        } },
      ],
    },
  },
  {
    version: 'v2026.11.27-5fdd219',
    date: '2026-11-27',
    sections: {
      new: [
        { text: {
          en: 'Payouts now keep a full settlement record: if a bank or wallet transfer fails, the provider is told at once — with the exact reason — and the platform can retry or return the amount to their balance.',
          hi: 'भुगतान अब पूरा निपटान रिकॉर्ड रखते हैं: यदि बैंक या वॉलेट ट्रांसफ़र विफल होता है, तो प्रदाता को तुरंत — सटीक कारण सहित — बताया जाता है, और प्लेटफ़ॉर्म पुनः प्रयास कर सकता है या राशि उनके शेष में लौटा सकता है।',
          bn: 'পে-আউটে এখন সম্পূর্ণ নিষ্পত্তির রেকর্ড থাকে: ব্যাংক বা ওয়ালেট ট্রান্সফার ব্যর্থ হলে প্রদাতা সঙ্গে সঙ্গে — সঠিক কারণসহ — জানতে পারেন, আর প্ল্যাটফর্ম আবার চেষ্টা করতে পারে বা টাকা তাঁর ব্যালেন্সে ফিরিয়ে দিতে পারে।',
        } },
        { text: {
          en: 'Managers now receive membership news — new members joining and role changes — alongside Trustees, so the whole board stays informed.',
          hi: 'प्रबंधक अब न्यासियों के साथ सदस्यता समाचार — नए सदस्यों का जुड़ना और भूमिका परिवर्तन — प्राप्त करते हैं, ताकि पूरा बोर्ड सूचित रहे।',
          bn: 'ম্যানেজাররা এখন ট্রাস্টিদের পাশাপাশি সদস্যতার খবর — নতুন সদস্য যোগদান ও ভূমিকা পরিবর্তন — পান, যাতে পুরো বোর্ড অবগত থাকে।',
        } },
        { text: {
          en: 'Purohits and Jyotishis can name their home organisation when requesting a payout, helping the platform team route it — the money always remains the provider’s own.',
          hi: 'पुरोहित और ज्योतिषी भुगतान का अनुरोध करते समय अपनी संस्था का नाम दे सकते हैं, जिससे प्लेटफ़ॉर्म टीम को उसे पहुँचाने में मदद मिलती है — पैसा हमेशा प्रदाता का ही रहता है।',
          bn: 'পুরোহিত ও জ্যোতিষীরা পে-আউট চাওয়ার সময় নিজের প্রতিষ্ঠানের নাম দিতে পারেন, যাতে প্ল্যাটফর্ম টিম তা পৌঁছে দিতে পারে — টাকা সবসময় প্রদাতারই থাকে।',
        } },
      ],
    },
  },
  {
    version: 'v2026.11.26-16e307a',
    date: '2026-11-26',
    sections: {
      new: [
        { text: {
          en: 'My passes: your Smart Pass and every seva pass you hold now rest together on your Personal home — upcoming first, one tap from the gate.',
          hi: 'मेरे पास: आपका स्मार्ट पास और आपके सभी सेवा पास अब आपके व्यक्तिगत मुखपृष्ठ पर एक साथ रहते हैं — आगामी पहले, द्वार से एक टैप दूर।',
          bn: 'আমার পাস: আপনার স্মার্ট পাস এবং আপনার সব সেবা পাস এখন আপনার ব্যক্তিগত হোমে একসঙ্গে থাকে — আসন্ন আগে, ফাটক থেকে এক ট্যাপ দূরে।',
        } },
        { text: {
          en: 'Your pilgrimage footprint is now a true record: GPS check-ins at a shrine are kept in your yatra log and your Tirtha Diary — even offline — and only you can ever see them.',
          hi: 'आपका तीर्थयात्रा पदचिह्न अब सच्चा अभिलेख है: किसी धाम पर जीपीएस चेक-इन आपकी यात्रा सूची और तीर्थ डायरी में रहता है — ऑफ़लाइन भी — और उसे केवल आप ही देख सकते हैं।',
          bn: 'আপনার তীর্থযাত্রার পদচিহ্ন এখন সত্যিকারের রেকর্ড: কোনো ধামে GPS চেক-ইন আপনার যাত্রা খাতা ও তীর্থ ডায়েরিতে থাকে — অফলাইনেও — এবং তা শুধু আপনিই দেখতে পাবেন।',
        } },
      ],
    },
  },
  {
    version: 'v2026.11.26-fc81a68',
    date: '2026-11-26',
    sections: {
      new: [
        { text: {
          en: 'Nilam gains live lots: registered bidders whose earnest money is recorded can now bid live in the app — every bid is public the moment it lands, the highest bid stands on the lot, and a bid in the last five minutes extends the close by five minutes, so no lot is ever snatched at the final second.',
          hi: 'नीलाम में अब लाइव लॉट: जिन पंजीकृत बोलीदाताओं की बयाना राशि दर्ज है, वे अब ऐप में लाइव बोली लगा सकते हैं — हर बोली लगते ही सार्वजनिक होती है, सबसे ऊँची बोली लॉट पर दर्ज रहती है, और अंतिम पाँच मिनट की बोली समापन को पाँच मिनट बढ़ा देती है, ताकि कोई लॉट आख़िरी क्षण में छीना न जा सके।',
          bn: 'নিলামে এখন লাইভ লট: যেসব নিবন্ধিত দরদাতার বায়না নথিভুক্ত আছে, তাঁরা এখন অ্যাপে লাইভ দর দিতে পারেন — প্রতিটি দর পড়ার সঙ্গে সঙ্গে প্রকাশ্য, সর্বোচ্চ দরটি লটে লেখা থাকে, এবং শেষ পাঁচ মিনিটের দর সমাপ্তি পাঁচ মিনিট বাড়িয়ে দেয়, যাতে কোনো লট শেষ মুহূর্তে ছিনিয়ে নেওয়া না যায়।',
        } },
        { text: {
          en: 'Festival stalls can now be allotted by auction: from the Utsav stall register, one tap creates a Nilam lot for the stall, and when the lot settles, the winner is stamped back onto the stall register automatically.',
          hi: 'उत्सव स्टॉल अब नीलामी से आवंटित हो सकते हैं: उत्सव स्टॉल पंजी से एक टैप में स्टॉल के लिए नीलाम लॉट बनता है, और लॉट के निपटान पर विजेता अपने आप स्टॉल पंजी में दर्ज हो जाता है।',
          bn: 'উৎসবের স্টল এখন নিলামে বরাদ্দ করা যায়: উৎসব স্টল খাতা থেকে এক ট্যাপে স্টলের জন্য নিলাম লট তৈরি হয়, এবং লট নিষ্পত্তি হলে বিজয়ীর নাম নিজে নিজে স্টল খাতায় লেখা হয়ে যায়।',
        } },
      ],
    },
  },
  {
    version: 'v2026.11.25-a4f652f',
    date: '2026-11-25',
    sections: {
      fixed: [
        { text: { en: 'Fixed a rare hang where the app could sit on the opening screen forever on a phone holding an older saved copy. If opening ever takes too long now, the opening screen offers a \'Refresh the app\' button — and tries one automatic refresh on its own.', hi: 'एक दुर्लभ अटकाव ठीक किया गया जिसमें पुरानी सहेजी हुई प्रति वाले फ़ोन पर ऐप खुलने वाली स्क्रीन पर हमेशा के लिए रुक सकता था। अब खुलने में देर लगे तो खुलने वाली स्क्रीन पर \'ऐप रीफ़्रेश करें\' बटन आता है — और एक बार अपने आप रीफ़्रेश भी हो जाता है।', bn: 'একটি বিরল আটকে-যাওয়া ঠিক করা হয়েছে যেখানে পুরনো সংরক্ষিত কপি থাকা ফোনে অ্যাপটি খোলার পর্দায় চিরকাল আটকে থাকতে পারত। এখন খুলতে দেরি হলে খোলার পর্দায় \'অ্যাপ রিফ্রেশ করুন\' বোতাম আসে — এবং একবার নিজে নিজে রিফ্রেশও হয়।' } },
      ],
      improved: [
        { text: { en: 'One calm opening screen: the duplicate loading screen inside the app is gone, so the app now opens with a single light splash — the app\'s name in orange, its tagline, and a progress bar.', hi: 'एक ही शांत खुलने वाली स्क्रीन: ऐप के अंदर की दूसरी लोडिंग स्क्रीन हटा दी गई है, इसलिए अब ऐप एक ही हल्की स्प्लैश के साथ खुलता है — नारंगी रंग में ऐप का नाम, उसकी टैगलाइन और एक प्रगति पट्टी।', bn: 'একটাই শান্ত খোলার পর্দা: অ্যাপের ভেতরের দ্বিতীয় লোডিং পর্দাটি সরিয়ে দেওয়া হয়েছে, তাই এখন অ্যাপ একটাই হালকা স্প্ল্যাশ দিয়ে খোলে — কমলা রঙে অ্যাপের নাম, তার ট্যাগলাইন ও একটি অগ্রগতি বার।' } },
      ],
    },
  },
  {
    version: 'v2026.11.24-158167f',
    date: '2026-11-24',
    sections: {
      new: [
        { text: { en: 'Nilam gains sealed lots: for a sealed auction, every bid stays hidden from everyone — other bidders and the committee alike — until the closing moment, when the committee opens them together and the highest bid above the reserve wins through the same checked acceptance as always.', hi: 'नीलाम में अब सीलबंद लॉट: सीलबंद नीलामी में हर बोली समापन क्षण तक सभी से छिपी रहती है — दूसरे बोलीदाताओं और समिति से भी — फिर समिति उन्हें एक साथ खोलती है और आरक्षित मूल्य से ऊपर की सबसे ऊँची बोली हमेशा की जाँची स्वीकृति से जीतती है।', bn: 'নিলামে এখন সিলবদ্ধ লট: সিলবদ্ধ নিলামে প্রতিটি দর সমাপ্তির মুহূর্ত পর্যন্ত সবার কাছ থেকে লুকানো থাকে — অন্য দরদাতা ও কমিটির কাছ থেকেও — তারপর কমিটি একসঙ্গে সেগুলো খোলে এবং সংরক্ষিত মূল্যের ঊর্ধ্বে সর্বোচ্চ দর সবসময়ের যাচাই করা গ্রহণের মাধ্যমে জেতে।' } },
      ],
    },
  },
  {
    version: 'v2026.11.24-add99b0',
    date: '2026-11-24',
    sections: {
      new: [
        { text: { en: 'Polls grow up: rank the options in your order and watch the count go round by round on the certificate; run a 100-points budget poll where everyone shows where the money should lean — the result guides the trustees, it never moves money; ask when shall we meet with real days and times, and turn the winning time into an event in one tap; and see at a glance where your house agrees and where it divides.', hi: 'मतदान और परिपक्व हुए: विकल्पों को अपने क्रम में रखें और प्रमाणपत्र पर चरण-दर-चरण गिनती देखें; 100-अंकों का बजट मतदान चलाएँ जहाँ हर कोई दिखाता है कि धन किधर झुकना चाहिए — परिणाम न्यासियों का मार्गदर्शन करता है, धन कभी नहीं हिलाता; असली दिनों और समयों के साथ पूछें कि हम कब मिलें, और जीतने वाले समय को एक टैप में कार्यक्रम बना दें; और एक नज़र में देखें कि आपका घर कहाँ एकमत है और कहाँ बँटा है।', bn: 'ভোট আরও পরিণত হলো: বিকল্পগুলো নিজের ক্রমে সাজান আর সনদে ধাপে ধাপে গণনা দেখুন; ১০০-পয়েন্টের বাজেট ভোট চালান যেখানে সবাই দেখায় অর্থ কোন দিকে ঝুঁকবে — ফলাফল অছিদের পথ দেখায়, অর্থ কখনো নাড়ায় না; আসল দিন ও সময় দিয়ে জিজ্ঞেস করুন আমরা কখন মিলব, আর জয়ী সময়টিকে এক ট্যাপে অনুষ্ঠান বানিয়ে দিন; এবং এক নজরে দেখুন আপনার ঘর কোথায় একমত আর কোথায় বিভক্ত।' } },
      ],
    },
  },
  {
    version: 'v2026.11.24-0ad5db6',
    date: '2026-11-24',
    sections: {
      new: [
        { text: { en: 'Polls grow up: prepare a poll as a private draft, schedule its opening in advance, save it as a reusable template, and re-run it next season in one step. Polls may now offer up to eight options, and abstaining is its own honest choice that never takes an option\'s place.', hi: 'मतदान अब और परिपक्व: मतदान को निजी प्रारूप के रूप में तैयार करें, उसका खुलना पहले से तय करें, उसे दोबारा उपयोग होने वाले नमूने के रूप में सहेजें, और अगले मौसम में एक कदम में फिर चलाएँ। अब मतदान में आठ विकल्प तक हो सकते हैं, और तटस्थ रहना अपना ईमानदार विकल्प है जो कभी किसी विकल्प की जगह नहीं लेता।', bn: 'ভোট এখন আরও পরিণত: ভোটটি ব্যক্তিগত খসড়া হিসেবে তৈরি করুন, আগাম তার খোলার সময় ঠিক করুন, পুনর্ব্যবহারযোগ্য নমুনা হিসেবে সংরক্ষণ করুন, আর পরের মৌসুমে এক ধাপে আবার চালান। এখন ভোটে আটটি পর্যন্ত বিকল্প থাকতে পারে, এবং বিরত থাকা তার নিজের সৎ পছন্দ যা কখনো কোনো বিকল্পের জায়গা নেয় না।' } },
      ],
    },
  },
  {
    version: 'v2026.11.24-841a08c',
    date: '2026-11-24',
    sections: {
      new: [
        { text: { en: 'Organisations can now speak to the right people: a broadcast can be addressed to followers, members, or staff — and the platform itself can post a notice that reaches every signed-in member once, in their own language.', hi: 'संगठन अब सही लोगों तक बात पहुँचा सकते हैं: एक प्रसारण अनुयायियों, सदस्यों या कर्मचारियों को संबोधित हो सकता है — और मंच स्वयं एक सूचना लगा सकता है जो हर साइन-इन सदस्य तक एक बार, उनकी अपनी भाषा में पहुँचती है।', bn: 'প্রতিষ্ঠান এখন সঠিক মানুষের কাছে কথা পৌঁছে দিতে পারে: একটি প্রচার অনুসারী, সদস্য বা কর্মীদের উদ্দেশ্যে হতে পারে — আর মঞ্চ নিজেই একটি সূচনা দিতে পারে যা প্রতিটি সাইন-ইন সদস্যের কাছে একবার, তাঁর নিজের ভাষায় পৌঁছায়।' } },
      ],
    },
  },
  {
    version: 'v2026.11.24-03d894b',
    date: '2026-11-24',
    sections: {
      new: [
        { text: { en: 'Suchana now speaks all ten languages: every notification — polls, passes, dips, money, resolutions — arrives in the language you chose for the app, not only English, Bangla or Hindi.', hi: 'सूचना अब सभी दस भाषाओं में बोलती है: हर सूचना — मतदान, पास, डिप, धन, प्रस्ताव — उसी भाषा में आती है जो आपने ऐप के लिए चुनी है, केवल अंग्रेज़ी, बांग्ला या हिंदी में नहीं।', bn: 'সূচনা এখন দশটি ভাষাতেই কথা বলে: প্রতিটি সূচনা — ভোট, পাস, ডিপ, অর্থ, প্রস্তাব — আপনি অ্যাপের জন্য যে ভাষা বেছে নিয়েছেন সেই ভাষাতেই আসে, শুধু ইংরেজি, বাংলা বা হিন্দিতে নয়।' } },
      ],
    },
  },
  {
    version: 'v2026.11.24-be97f20',
    date: '2026-11-24',
    sections: {
      new: [
        { text: { en: "Your organisation's money news now finds you: a failed payout, a rejected payment claim, and a large donation become Suchana items for the people whose role they concern — no more learning from the bank's letter a week later.", hi: 'आपके संगठन के धन की खबर अब खुद आप तक पहुँचती है: असफल भुगतान, अस्वीकृत भुगतान-दावा और बड़ा दान — जिनकी भूमिका से ये जुड़े हैं, उनके लिए सूचना की वस्तु बन जाते हैं — अब एक सप्ताह बाद बैंक के पत्र से पता नहीं चलता।', bn: 'আপনার সংগঠনের অর্থের খবর এখন নিজেই আপনার কাছে পৌঁছায়: ব্যর্থ পেআউট, প্রত্যাখ্যাত পেমেন্ট দাবি এবং বড় অনুদান — যাঁদের ভূমিকার সঙ্গে জড়িত, তাঁদের জন্য সূচনার বিষয় হয়ে ওঠে — আর এক সপ্তাহ পরে ব্যাংকের চিঠি থেকে জানতে হয় না।' } },
        { text: { en: 'Trustees hear about their workspace plan before it lapses: a gentle note a week ahead, a firmer one in the grace days, and an honest note if it lapses — and silence the moment it is renewed.', hi: 'ट्रस्टी अपने वर्कस्पेस प्लान के समाप्त होने से पहले सुनते हैं: एक सप्ताह पहले हल्की सूचना, अनुग्रह दिनों में दृढ़ सूचना, और समाप्त हो जाने पर ईमानदार सूचना — और नवीनीकरण होते ही मौन।', bn: 'ট্রাস্টিরা তাঁদের ওয়ার্কস্পেস প্ল্যানের মেয়াদ শেষ হওয়ার আগেই খবর পান: এক সপ্তাহ আগে হালকা নোট, গ্রেসের দিনগুলোতে দৃঢ় নোট, আর মেয়াদ শেষ হলে সৎ নোট — আর নবায়ন হলেই নীরবতা।' } },
        { text: { en: 'Board resolutions awaiting your vote now appear in your Action lane, and stop the moment you vote.', hi: 'आपके मत की प्रतीक्षा करते बोर्ड प्रस्ताव अब आपके एक्शन लेन में दिखते हैं, और आपके मत देते ही रुक जाते हैं।', bn: 'আপনার ভোটের অপেক্ষায় থাকা বোর্ড প্রস্তাব এখন আপনার অ্যাকশন লেনে দেখা যায়, আর আপনি ভোট দিলেই থেমে যায়।' } },
        { text: { en: 'Auction lot settlements, new members, and role changes now reach the staff they concern.', hi: 'नीलामी लॉट के निपटान, नए सदस्य और भूमिका परिवर्तन अब संबंधित कर्मचारियों तक पहुँचते हैं।', bn: 'নিলামের লট নিষ্পত্তি, নতুন সদস্য এবং ভূমিকা পরিবর্তনের খবর এখন সংশ্লিষ্ট কর্মীদের কাছে পৌঁছায়।' } },
        { text: { en: 'New per-organisation notification controls: for each organisation choose All, Actions only, or Muted — safety and approval news always finds its floor, never silence.', hi: 'प्रत्येक संगठन के लिए नए सूचना नियंत्रण: हर संगठन के लिए चुनें — सभी, केवल एक्शन, या मौन — सुरक्षा और अनुमोदन की खबर हमेशा अपना न्यूनतम स्तर पाती है, कभी पूर्ण मौन नहीं।', bn: 'প্রতিটি সংগঠনের জন্য নতুন সূচনা নিয়ন্ত্রণ: প্রতিটি সংগঠনের জন্য বেছে নিন — সব, শুধু অ্যাকশন, বা নীরব — নিরাপত্তা ও অনুমোদনের খবর সবসময় তার সর্বনিম্ন স্তর পায়, কখনো পূর্ণ নীরবতা নয়।' } },
        { text: { en: 'Broadcasts are now honest and disciplined: the composer tells you exactly who receives an announcement and when, and a gentle daily limit keeps any one organisation from crowding your bell.', hi: 'प्रसारण अब ईमानदार और अनुशासित हैं: लिखते समय ही पता चलता है कि घोषणा किसे और कब मिलेगी, और एक हल्की दैनिक सीमा किसी एक संगठन को आपकी घंटी पर भीड़ नहीं लगाने देती।', bn: 'সম্প্রচার এখন সৎ ও শৃঙ্খলাবদ্ধ: লেখার সময়ই জানা যায় ঘোষণাটি কে কখন পাবেন, আর একটি হালকা দৈনিক সীমা কোনো একটি সংগঠনকে আপনার ঘণ্টায় ভিড় করতে দেয় না।' } },
      ],
    },
  },
  {
    version: 'v2026.11.24-da8d5a6',
    date: '2026-11-24',
    sections: {
      new: [
        { text: { en: 'SOS is always in sight: the red SOS button in Personal now shows in full from the moment the app opens — no "Show SOS button" step to hunt for in an emergency. Hold it for a moment to raise the alert, exactly as before.', hi: 'SOS अब हमेशा सामने है: पर्सनल में लाल SOS बटन अब ऐप खुलते ही पूरा दिखता है — आपात स्थिति में "SOS बटन दिखाएँ" वाला कदम खोजना नहीं पड़ता। अलर्ट भेजने के लिए उसे पहले की तरह थोड़ी देर दबाकर रखें।', bn: 'SOS এখন সবসময় চোখের সামনে: পার্সোনালে লাল SOS বোতাম এখন অ্যাপ খুললেই পুরোপুরি দেখা যায় — জরুরি মুহূর্তে "SOS বোতাম দেখান" ধাপটি খুঁজতে হয় না। সতর্কবার্তা পাঠাতে আগের মতোই কিছুক্ষণ চেপে ধরে রাখুন।' } },
        { text: { en: 'Your Personal home, in four clear parts: Personal (your sadhana, pass, wallet and reminders), Social (messages, polls and the community feed), Locations (your organisations and followed temples), and Management (the door to your organisation, when you have one).', hi: 'आपका पर्सनल होम, चार स्पष्ट भागों में: पर्सनल (आपकी साधना, पास, वॉलेट और अनुस्मारक), सोशल (संदेश, मतदान और समुदाय फ़ीड), स्थान (आपके संगठन और अनुसरण किए गए मंदिर), और प्रबंधन (आपके संगठन का द्वार, जब आपका कोई संगठन हो)।', bn: 'আপনার পার্সোনাল হোম, চারটি স্পষ্ট ভাগে: পার্সোনাল (আপনার সাধনা, পাস, ওয়ালেট ও স্মরণিক), সোশ্যাল (বার্তা, ভোট ও সম্প্রদায়ের ফিড), স্থান (আপনার সংগঠন ও অনুসরণ করা মন্দির), এবং ব্যবস্থাপনা (আপনার সংগঠনের দরজা, থাকলে)।' } },
      ],
    },
  },
  {
    version: 'v2026.11.24-7a014ae',
    date: '2026-11-24',
    sections: {
      new: [
        { text: { en: 'Your Suchana now follows your polls: when a poll opens in one of your organisations, when voting is about to close, and when the result is in, your bell tells you — and if you have already voted, it never nags you again.', hi: 'आपकी सूचना अब आपके मतदान का साथ देती है: जब आपके किसी संगठन में मतदान खुलता है, जब मतदान बंद होने वाला होता है और जब परिणाम आ जाता है, आपकी घंटी आपको बता देती है — और यदि आप पहले ही मत दे चुके हैं, तो वह फिर कभी परेशान नहीं करती।', bn: 'আপনার সূচনা এখন আপনার ভোটের খবর রাখে: আপনার কোনো সংগঠনে ভোট খুললে, ভোট শেষ হওয়ার সময় এলে এবং ফলাফল এলে আপনার ঘণ্টা জানিয়ে দেয় — আর আপনি আগেই ভোট দিয়ে থাকলে সে আর কখনো বিরক্ত করে না।' } },
        { text: { en: 'Your passes speak up: buy, cancel or get a refund on a seva pass and the news reaches your bell on its own.', hi: 'आपके पास अब खुद बोलते हैं: सेवा पास खरीदें, रद्द करें या धनवापसी पाएँ — खबर अपने आप आपकी घंटी तक पहुँचती है।', bn: 'আপনার পাস এখন নিজেই খবর দেয়: সেবা পাস কিনুন, বাতিল করুন বা ফেরত পান — খবর নিজে থেকেই আপনার ঘণ্টায় পৌঁছে যায়।' } },
        { text: { en: 'E-dip results come to you: drawn, waitlisted, claimed or lapsed — each result rings once, and a drawn place reminds you before its claim window closes.', hi: 'ई-डिप परिणाम अब आपके पास आते हैं: चयनित, प्रतीक्षा-सूची, दावा किया या समय-सीमा बीती — हर परिणाम एक बार बजता है, और चयनित स्थान दावा-अवधि बंद होने से पहले याद दिलाता है।', bn: 'ই-ডিপের ফলাফল এখন আপনার কাছে আসে: নির্বাচিত, অপেক্ষমাণ, দাবি করা বা মেয়াদ শেষ — প্রতিটি ফলাফল একবার করে বাজে, আর নির্বাচিত আসন দাবির সময় শেষ হওয়ার আগেই মনে করিয়ে দেয়।' } },
        { text: { en: 'Followed temples announce their festivals: when an organisation you follow publishes a new festival, you hear about it in Suchana and can plan your darshan.', hi: 'आप जिन मंदिरों का अनुसरण करते हैं वे अपने उत्सव की घोषणा करते हैं: जब कोई अनुसरण किया गया संगठन नया उत्सव प्रकाशित करता है, सूचना में खबर मिलती है और आप दर्शन की योजना बना सकते हैं।', bn: 'আপনার অনুসরণ করা মন্দির এখন তাদের উৎসবের খবর জানায়: অনুসরণ করা কোনো সংগঠন নতুন উৎসব প্রকাশ করলেই সূচনায় খবর পান, দর্শনের পরিকল্পনা করতে পারেন।' } },
        { text: { en: 'A new Action view in Suchana: one tap shows everything that awaits your decision across all your organisations, with whatever expires soonest standing first.', hi: 'सूचना में नया एक्शन दृश्य: एक टैप में आपके सभी संगठनों में आपके निर्णय की प्रतीक्षा करती हर चीज़ दिखती है, और जिसकी समय-सीमा सबसे पहले बीतती है वह सबसे आगे रहती है।', bn: 'সূচনায় নতুন অ্যাকশন দৃশ্য: এক ছোঁয়ায় আপনার সব সংগঠনে আপনার সিদ্ধান্তের অপেক্ষায় থাকা সবকিছু দেখা যায়, আর যার মেয়াদ সবচেয়ে আগে শেষ হবে সেটি থাকে সবার আগে।' } },
      ],
    },
  },
  {
    version: 'v2026.11.23-60b1056',
    date: '2026-11-23',
    sections: {
      new: [
        { text: { en: 'Nilam — the auction & allotment desk — is here. When an organisation allots a shop, leases land, sells old materials, or auctions any property, the whole affair is now recorded in the open: the lot, its valuation, the public notice, the registered bidders and their deposits, the outcome, and the settlement.', hi: 'नीलाम — नीलामी व आवंटन डेस्क — आ गया है। जब कोई संस्था दुकान आवंटित करे, भूमि पट्टे पर दे, पुरानी सामग्री बेचे, या कोई संपत्ति नीलाम करे, तो पूरा मामला अब खुलकर दर्ज होता है: लॉट, उसका मूल्यांकन, सार्वजनिक सूचना, पंजीकृत बोलीदाता व उनकी जमा राशि, परिणाम, और निपटान।', bn: 'নিলাম — নিলাম ও বরাদ্দ ডেস্ক — এসে গেছে। কোনো প্রতিষ্ঠান দোকান বরাদ্দ দিলে, জমি ইজারা দিলে, পুরনো সামগ্রী বিক্রি করলে, বা কোনো সম্পত্তি নিলাম করলে, পুরো বিষয়টি এখন প্রকাশ্যে লিপিবদ্ধ হয়: লট, তার মূল্যায়ন, প্রকাশ্য বিজ্ঞপ্তি, নিবন্ধিত দরদাতা ও তাঁদের জমা, ফলাফল, আর নিষ্পত্তি।' } },
        { text: { en: 'The guards are built in: no lot can move forward without a recorded valuation behind its reserve price; a property sale needs the official sanction recorded before any notice; notices carry real minimum periods (15 days, 30 for property sales); and an unanswered objection blocks the result from being accepted.', hi: 'सुरक्षा-कवच पहले से बने हैं: कोई लॉट आरक्षित मूल्य के पीछे दर्ज मूल्यांकन के बिना आगे नहीं बढ़ सकता; संपत्ति बिक्री में किसी भी सूचना से पहले आधिकारिक स्वीकृति दर्ज होनी चाहिए; सूचनाओं में असली न्यूनतम अवधि रहती है (15 दिन, संपत्ति बिक्री के लिए 30); और अनुत्तरित आपत्ति परिणाम स्वीकार होने से रोकती है।', bn: 'সুরক্ষা-কবচ আগেই তৈরি: কোনো লট সংরক্ষিত মূল্যের পেছনে লিপিবদ্ধ মূল্যায়ন ছাড়া এগোতে পারে না; সম্পত্তি বিক্রিতে যেকোনো বিজ্ঞপ্তির আগে সরকারি অনুমোদন লিপিবদ্ধ থাকতে হয়; বিজ্ঞপ্তিতে আসল ন্যূনতম সময় থাকে (15 দিন, সম্পত্তি বিক্রিতে 30); আর উত্তরহীন আপত্তি ফলাফল গ্রহণ আটকে দেয়।' } },
        { text: { en: 'Money settles only through the treasury, with the transaction recorded on the lot itself — and the result is published on the Transparency Board for the whole community to see. The desk keeps the record; it cannot grant legal permission, and it says so on its face.', hi: 'पैसा केवल कोषागार के मार्ग से निपटता है, और लेन-देन लॉट पर ही दर्ज रहता है — और परिणाम पारदर्शिता बोर्ड पर पूरे समुदाय के देखने के लिए प्रकाशित होता है। यह डेस्क अभिलेख रखता है; यह कानूनी अनुमति नहीं दे सकता, और यह बात उसके मुख पर ही लिखी है।', bn: 'অর্থ নিষ্পত্তি হয় কেবল কোষাগারের পথে, আর লেনদেন লটের গায়েই লিপিবদ্ধ থাকে — এবং ফলাফল স্বচ্ছতা বোর্ডে পুরো সম্প্রদায়ের দেখার জন্য প্রকাশিত হয়। এই ডেস্ক নথি রাখে; এটি আইনি অনুমতি দিতে পারে না, আর সে কথা তার মুখেই লেখা আছে।' } },
      ],
    },
  },

  {
    version: 'v2026.11.23-f31779d',
    date: '2026-11-23',
    sections: {
      new: [
        { text: { en: 'Polls now come in two kinds: Pulse polls for quick opinion, and Decision polls for real decisions — labelled Binding or Advisory BEFORE anyone votes, so nobody is surprised by what a result means.', hi: 'मतदान अब दो प्रकार के हैं: त्वरित राय के लिए पल्स मतदान, और असली निर्णयों के लिए निर्णय मतदान — किसी के भी वोट देने से पहले बाध्यकारी या सलाहकार लिखा रहता है, ताकि परिणाम का अर्थ किसी को चौंकाए नहीं।', bn: 'ভোট এখন দুই ধরনের: দ্রুত মতামতের জন্য পালস ভোট, আর আসল সিদ্ধান্তের জন্য সিদ্ধান্ত ভোট — কেউ ভোট দেওয়ার আগেই বাধ্যতামূলক না পরামর্শমূলক লেখা থাকে, যাতে ফলাফলের অর্থে কেউ চমকে না যান।' } },
        { text: { en: 'A Decision poll freezes who may vote at launch and carries a quorum mark and a pass mark. When it ends, the result — tallies, turnout, whether quorum was met, and the verdict — is written once on the poll itself and can never be rewritten. A tie is recorded as a tie.', hi: 'निर्णय मतदान शुरू होते ही तय कर देता है कि कौन वोट दे सकता है, और उसमें कोरम व पास का अंक रहता है। समाप्ति पर परिणाम — गिनती, भागीदारी, कोरम पूरा हुआ या नहीं, और फ़ैसला — मतदान पर एक बार लिखा जाता है और फिर कभी बदला नहीं जा सकता। बराबरी को बराबरी ही लिखा जाता है।', bn: 'সিদ্ধান্ত ভোট শুরু হওয়ার সঙ্গে সঙ্গে ঠিক করে দেয় কে ভোট দিতে পারবেন, আর তাতে কোরাম ও পাসের মাপ থাকে। শেষ হলে ফলাফল — গণনা, অংশগ্রহণ, কোরাম পূর্ণ হলো কিনা, আর রায় — ভোটের গায়ে একবার লেখা হয় এবং আর কখনো বদলানো যায় না। সমান-সমান হলে সমান-সমানই লেখা থাকে।' } },
        { text: { en: 'The committee can choose a secret or a named ballot on member Decision polls. Committee polls and written-answer polls stay named, as before — and the poll says so openly.', hi: 'सदस्य निर्णय मतदानों में समिति गुप्त या नाम-युक्त मतपत्र चुन सकती है। समिति मतदान और लिखित-उत्तर मतदान पहले की तरह नाम-युक्त रहते हैं — और मतदान यह खुलकर कहता है।', bn: 'সদস্য সিদ্ধান্ত ভোটে কমিটি গোপন বা নামযুক্ত ব্যালট বেছে নিতে পারে। কমিটি ভোট আর লিখিত-উত্তরের ভোট আগের মতোই নামযুক্ত থাকে — আর ভোটটি তা প্রকাশ্যেই বলে।' } },
      ],
      fixed: [
        { text: { en: 'The poll report is repaired and is now a proper Result Certificate: the question, the counts, turnout against quorum, and the verdict — printable from the poll desk and from the Transparency Board. Earlier, the report wrongly showed no votes at all.', hi: 'मतदान रिपोर्ट ठीक हो गई है और अब यह एक सच्चा परिणाम प्रमाणपत्र है: प्रश्न, गिनती, कोरम के सामने भागीदारी, और फ़ैसला — मतदान डेस्क और पारदर्शिता बोर्ड से छापा जा सकता है। पहले रिपोर्ट ग़लती से कोई वोट ही नहीं दिखाती थी।', bn: 'ভোটের প্রতিবেদন মেরামত হয়েছে এবং এখন এটি একটি যথাযথ ফলাফল সনদ: প্রশ্ন, গণনা, কোরামের বিপরীতে অংশগ্রহণ, আর রায় — ভোট ডেস্ক ও স্বচ্ছতা বোর্ড থেকে ছাপানো যায়। আগে প্রতিবেদনটি ভুল করে কোনো ভোটই দেখাত না।' } },
      ],
    },
  },

  {
    version: 'v2026.11.23-eac3cff',
    date: '2026-11-23',
    sections: {
      new: [
        { text: { en: 'The e-dip is here: when far more devotees want a darshan tier than there are places, the committee can open a dip instead of a rush. Devotees enter once per household during the window — no buying, no racing, no fastest-phone advantage.', hi: 'ई-डिप आ गया है: जब किसी दर्शन श्रेणी के चाहने वाले स्थानों से कहीं अधिक हों, तो समिति भीड़-धक्का की जगह डिप खोल सकती है। भक्त अवधि में प्रति परिवार एक बार प्रवेश करते हैं — कोई खरीद नहीं, कोई दौड़ नहीं, तेज़ फ़ोन का कोई फ़ायदा नहीं।', bn: 'ই-ডিপ এসে গেছে: কোনো দর্শন শ্রেণিতে জায়গার চেয়ে ভক্ত অনেক বেশি হলে, কমিটি হুড়োহুড়ির বদলে ডিপ খুলতে পারে। ভক্তরা সময়সীমায় পরিবারপ্রতি একবার প্রবেশ করেন — কোনো কেনা নয়, কোনো দৌড় নয়, দ্রুত ফোনের কোনো সুবিধা নয়।' } },
        { text: { en: 'A draw the whole community can check: the entry pool is frozen and published before the draw, the seed is announced openly, and the method is named — so anyone can verify the result. Winners claim within their window; everyone else holds a waitlist place in draw order.', hi: 'ऐसा ड्रॉ जिसे पूरा समुदाय जाँच सके: ड्रॉ से पहले प्रवेश-सूची स्थिर करके प्रकाशित की जाती है, बीज खुलकर घोषित होता है, और विधि का नाम दिया जाता है — ताकि कोई भी परिणाम जाँच सके। विजेता अपनी अवधि में दावा करते हैं; बाक़ी सबको ड्रॉ क्रम में प्रतीक्षा-स्थान मिलता है।', bn: 'এমন ড্র যা পুরো সম্প্রদায় যাচাই করতে পারে: ড্রয়ের আগে প্রবেশ-তালিকা স্থির করে প্রকাশ করা হয়, বীজ প্রকাশ্যে ঘোষণা করা হয়, আর পদ্ধতির নাম দেওয়া হয় — যাতে যে কেউ ফলাফল যাচাই করতে পারে। বিজয়ীরা নিজেদের সময়সীমায় দাবি করেন; বাকি সবাই ড্রয়ের ক্রমে অপেক্ষমাণ স্থান পান।' } },
      ],
    },
  },

  {
    version: 'v2026.11.23-77b9297',
    date: '2026-11-23',
    sections: {
      new: [
        { text: { en: 'Fairness you can see: every ticket tier on a festival page now shows its real remaining places — "23 of 100 places left" — counted from the same anchored register the booking itself trusts. No countdowns, no pressure, and prices that never move with demand. No surge. Ever.', hi: 'पारदर्शिता जो दिखती है: उत्सव-पृष्ठ पर हर टिकट श्रेणी अब अपने वास्तविक शेष स्थान दिखाती है — "100 में से 23 स्थान शेष" — उसी पक्के रजिस्टर से गिने गए जिस पर बुकिंग स्वयं भरोसा करती है। कोई उलटी गिनती नहीं, कोई दबाव नहीं, और ऐसे दाम जो माँग के साथ कभी नहीं बदलते। कोई सर्ज नहीं। कभी नहीं।', bn: 'স্বচ্ছতা যা চোখে দেখা যায়: উৎসবের পৃষ্ঠায় প্রতিটি টিকিট শ্রেণি এখন তার আসল অবশিষ্ট জায়গা দেখায় — "১০০টির মধ্যে ২৩টি জায়গা বাকি" — সেই একই পাকা রেজিস্টার থেকে গোনা যার উপর বুকিং নিজে ভরসা করে। কোনো কাউন্টডাউন নয়, কোনো চাপ নয়, আর এমন দাম যা চাহিদার সঙ্গে কখনো বদলায় না। কোনো সার্জ নয়। কখনোই নয়।' } },
        { text: { en: 'After a festival ends, the committee can publish "How booking went" on the public page: places offered and booked per tier, and the waiting list — totals only, never a single name.', hi: 'उत्सव समाप्त होने के बाद, समिति सार्वजनिक पृष्ठ पर "बुकिंग कैसी रही" प्रकाशित कर सकती है: हर श्रेणी में दिए गए और बुक हुए स्थान, और प्रतीक्षा-सूची — केवल योग, कभी कोई नाम नहीं।', bn: 'উৎসব শেষ হওয়ার পর, কমিটি পাবলিক পৃষ্ঠায় "বুকিং কেমন গেল" প্রকাশ করতে পারে: প্রতি শ্রেণিতে দেওয়া ও বুক হওয়া জায়গা, এবং অপেক্ষমাণ তালিকা — শুধু মোট সংখ্যা, কখনো কোনো নাম নয়।' } },
      ],
    },
  },

  {
    version: 'v2026.11.23-27d45fb',
    date: '2026-11-23',
    sections: {
      improved: [
        { text: { en: 'Your Smart Pass now says only what is true: a signed member token that refreshes every minute, scannable at organisations that use Sanatani Bandhan gates, carrying your chosen emergency contact and blood group on its face so sevaks can help you and reach your family. Earlier wording that promised special gates and networks the app does not run has been removed, in all 10 languages.', hi: 'आपका स्मार्ट पास अब केवल वही कहता है जो सत्य है: एक हस्ताक्षरित सदस्य टोकन जो हर मिनट ताज़ा होता है, उन संस्थाओं के द्वार पर स्कैन योग्य जो सनातनी बंधन के गेट उपयोग करती हैं, और जिस पर आपका चुना आपातकालीन संपर्क व रक्त-समूह अंकित है ताकि सेवक आपकी सहायता कर सकें और आपके परिवार तक पहुँच सकें। पहले का वह शब्द-चयन हटा दिया गया है जो ऐसे विशेष द्वारों और नेटवर्कों का वादा करता था जो ऐप चलाता ही नहीं — सभी 10 भाषाओं में।', bn: 'আপনার স্মার্ট পাস এখন শুধু তাই বলে যা সত্য: একটি স্বাক্ষরিত সদস্য টোকেন যা প্রতি মিনিটে সতেজ হয়, যেসব প্রতিষ্ঠান সনাতনী বন্ধনের গেট ব্যবহার করে সেখানে স্ক্যানযোগ্য, এবং যার গায়ে আপনার বেছে নেওয়া জরুরি যোগাযোগ ও রক্তের গ্রুপ লেখা থাকে যাতে সেবকরা আপনাকে সাহায্য করতে পারেন এবং আপনার পরিবারের কাছে পৌঁছতে পারেন। আগের সেই শব্দগুলি সরিয়ে দেওয়া হয়েছে যা এমন বিশেষ গেট ও নেটওয়ার্কের প্রতিশ্রুতি দিত যা অ্যাপ চালায়ই না — সব ১০টি ভাষায়।' } },
        { text: { en: 'The same honesty pass corrected the SOS wording: an alert goes to this temple\'s sevadar desk with your name, blood group, emergency phone and your location at that moment — nothing more is claimed, because nothing more happens.', hi: 'इसी ईमानदारी के साथ SOS का शब्द-चयन भी सुधारा गया: चेतावनी इस मंदिर के सेवक-डेस्क तक जाती है — आपके नाम, रक्त-समूह, आपातकालीन फ़ोन और उस क्षण की आपकी स्थिति के साथ — इससे अधिक का दावा नहीं, क्योंकि इससे अधिक होता भी नहीं।', bn: 'একই সততার সঙ্গে SOS-এর শব্দও ঠিক করা হয়েছে: সতর্কবার্তা এই মন্দিরের সেবক ডেস্কে যায় — আপনার নাম, রক্তের গ্রুপ, জরুরি ফোন ও সেই মুহূর্তে আপনার অবস্থানসহ — এর বেশি দাবি নয়, কারণ এর বেশি ঘটেও না।' } },
      ],
    },
  },

  {
    version: 'v2026.11.23-9f57764',
    date: '2026-11-23',
    sections: {
      improved: [
        { text: { en: 'One home, one name: what the app used to call a separate "devotee app" is now simply your Personal space, everywhere — previews, portals and switches all speak of Personal. The word devotee remains where it belongs: your relationship with your temple, and a role inside it.', hi: 'एक घर, एक नाम: जिसे ऐप पहले अलग "भक्त ऐप" कहता था, वह अब हर जगह बस आपका Personal स्थान है — पूर्वावलोकन, पोर्टल और स्विच, सब Personal कहते हैं। "भक्त" शब्द वहीं रहता है जहाँ उसका स्थान है: आपके मंदिर से आपका संबंध, और उसके भीतर एक भूमिका।', bn: 'একটি ঘর, একটি নাম: অ্যাপ যাকে আগে আলাদা "ভক্ত অ্যাপ" বলত, তা এখন সব জায়গায় শুধুই আপনার Personal জায়গা — প্রিভিউ, পোর্টাল ও সুইচ, সবই Personal বলে। "ভক্ত" শব্দটি সেখানেই থাকে যেখানে তার স্থান: আপনার মন্দিরের সঙ্গে আপনার সম্পর্ক, এবং তার ভিতরে একটি ভূমিকা।' } },
      ],
    },
  },

  {
    version: 'v2026.11.23-53cdd52',
    date: '2026-11-23',
    sections: {
      new: [
        { text: { en: 'Two modes, one clear door: a Personal | Organisation switch now lives in the header in both modes. If you serve an organisation, it is always one tap away; if you do not, the same place invites you to grow — join an organisation, or enrol as Purohit or Jyotishi — instead of showing a locked door.', hi: 'दो मोड, एक स्पष्ट द्वार: अब दोनों मोड में शीर्षक में Personal | Organisation स्विच रहता है। यदि आप किसी संस्था से जुड़े हैं, तो वह हमेशा एक टैप दूर है; यदि नहीं, तो वही स्थान आपको आगे बढ़ने का निमंत्रण देता है — किसी संस्था से जुड़ें, या पुरोहित या ज्योतिषी के रूप में नामांकन करें — बंद द्वार दिखाने के बजाय।', bn: 'দুটি মোড, একটি স্পষ্ট দরজা: এখন দুটি মোডেই হেডারে Personal | Organisation সুইচ থাকে। আপনি কোনো প্রতিষ্ঠানের সঙ্গে যুক্ত থাকলে তা সবসময় এক ট্যাপ দূরে; না থাকলে সেই একই জায়গা আপনাকে এগিয়ে যাওয়ার আমন্ত্রণ জানায় — কোনো প্রতিষ্ঠানে যোগ দিন, অথবা পুরোহিত বা জ্যোতিষী হিসেবে নাম লেখান — বন্ধ দরজা দেখানোর বদলে।' } },
        { text: { en: 'Quick Look: from your Personal space, "My Organisations" lets you peek at each organisation you serve — your role and its next festival — without switching modes, seeing only what your role permits. The full workspace is one tap further, whenever you want it.', hi: 'त्वरित झलक: अपने Personal स्थान से, "मेरी संस्थाएँ" आपको मोड बदले बिना हर संस्था की झलक देता है जिसमें आप सेवा करते हैं — आपकी भूमिका और उसका अगला उत्सव — केवल वही दिखता है जिसकी आपकी भूमिका अनुमति देती है। पूरा कार्यक्षेत्र जब चाहें, एक टैप आगे है।', bn: 'কুইক লুক: আপনার Personal জায়গা থেকে, "আমার প্রতিষ্ঠানসমূহ" মোড না বদলেই প্রতিটি প্রতিষ্ঠানের ঝলক দেয় যেখানে আপনি সেবা করেন — আপনার ভূমিকা ও তার পরের উৎসব — শুধু তাই দেখায় যা আপনার ভূমিকা অনুমতি দেয়। পুরো ওয়ার্কস্পেস যখন চাইবেন, এক ট্যাপ এগিয়ে।' } },
      ],
    },
  },

  {
    version: 'v2026.11.23-c3b4cf0',
    date: '2026-11-23',
    sections: {
      new: [
        { text: { en: 'Every festival now has a live notice board: the committee can post gate notes, announcements and lost-and-found from the War Room, and devotees see them on the festival page as the day unfolds — a found item marked resolved closes with a warm "Reunited" note.', hi: 'हर उत्सव के पास अब एक लाइव सूचना-पट्ट है: समिति युद्ध-कक्ष से गेट-टिप्पणियाँ, घोषणाएँ और खोया-पाया पोस्ट कर सकती है, और भक्त उन्हें उत्सव-पृष्ठ पर दिन भर देखते हैं — मिली हुई वस्तु के हल होते ही एक स्नेहभरा "पुनर्मिलन" संदेश जुड़ता है।', bn: 'প্রতিটি উৎসবের এখন একটি লাইভ নোটিশ বোর্ড আছে: কমিটি ওয়ার রুম থেকে গেট-নোট, ঘোষণা ও হারানো-পাওয়া পোস্ট করতে পারে, আর ভক্তরা উৎসবের পৃষ্ঠায় সারাদিন তা দেখতে পান — পাওয়া জিনিস মিলে গেলে একটি উষ্ণ "পুনর্মিলন" বার্তায় তা শেষ হয়।' } },
        { text: { en: 'Festivals with live notes show a small "Live board" marker on the public events page, so devotees know where to look before they set out.', hi: 'जिन उत्सवों पर लाइव टिप्पणियाँ हैं, उनके सार्वजनिक कार्यक्रम-पृष्ठ पर एक छोटा "लाइव बोर्ड" चिह्न दिखता है, ताकि भक्त निकलने से पहले जान सकें कि कहाँ देखना है।', bn: 'যেসব উৎসবে লাইভ নোট আছে, সেগুলির পাবলিক ইভেন্ট পৃষ্ঠায় একটি ছোট "লাইভ বোর্ড" চিহ্ন দেখায়, যাতে ভক্তরা বেরোনোর আগেই জানতে পারেন কোথায় দেখতে হবে।' } },
      ],
    },
  },

  {
    version: 'v2026.11.22-6512ee9',
    date: '2026-11-22',
    sections: {
      new: [
        { text: { en: 'The War Room now plans with your own history: after a festival\'s gate has closed, the next festival\'s planners show the expected turnout as an honest range, a prasad suggestion and a gate-volunteer hint — each with its basis printed, from your own registers. Nothing is guessed, and a festival whose register was never marked is never counted as zero.', hi: 'युद्ध-कक्ष अब आपके अपने इतिहास से योजना बनाता है: किसी उत्सव का गेट बंद होने के बाद, अगले उत्सव के योजनाकारों को अपेक्षित उपस्थिति एक ईमानदार सीमा में, प्रसाद का सुझाव और गेट-स्वयंसेवक संकेत दिखता है — हर आँकड़े के साथ उसका आधार छपा होता है, आपके अपने रजिस्टरों से। कुछ भी अनुमान नहीं लगाया जाता, और जिस उत्सव का रजिस्टर कभी चिह्नित ही नहीं हुआ, उसे कभी शून्य नहीं गिना जाता।', bn: 'ওয়ার রুম এখন আপনার নিজের ইতিহাস দিয়ে পরিকল্পনা করে: কোনো উৎসবের গেট বন্ধ হওয়ার পর, পরের উৎসবের পরিকল্পনাকারীদের কাছে প্রত্যাশিত উপস্থিতি একটি সৎ পরিসরে, প্রসাদের পরামর্শ ও গেট-স্বেচ্ছাসেবক ইঙ্গিত দেখায় — প্রতিটি সংখ্যার পাশে তার ভিত্তি ছাপা থাকে, আপনার নিজের রেজিস্টার থেকে। কিছুই অনুমান করা হয় না, আর যে উৎসবের রেজিস্টার কখনো চিহ্নিতই হয়নি, তাকে কখনো শূন্য ধরা হয় না।' } },
        { text: { en: 'One tap — "Plan from this forecast" — can prefill the footfall planner from that range; your own number is never overwritten without your tap.', hi: 'एक टैप — "इस पूर्वानुमान से योजना बनाएँ" — उस सीमा से उपस्थिति-योजनाकार को पहले से भर सकता है; आपका अपना आँकड़ा आपके टैप के बिना कभी नहीं बदला जाता।', bn: 'একটি ট্যাপ — "এই পূর্বাভাস থেকে পরিকল্পনা করুন" — সেই পরিসর থেকে উপস্থিতি-পরিকল্পনাটি আগে থেকে ভরে দিতে পারে; আপনার নিজের সংখ্যা আপনার ট্যাপ ছাড়া কখনো বদলায় না।' } },
      ],
    },
  },

  {
    version: 'v2026.11.22-30baa15',
    date: '2026-11-22',
    sections: {
      new: [
        { text: { en: 'Your event pass no longer lives only in a link: add the festival days to your calendar from the pass itself, or save the pass as a picture on your phone — with its real code, ready to show at the gate.', hi: 'आपका कार्यक्रम पास अब केवल एक लिंक में नहीं रहता: पास से ही उत्सव के दिन अपने कैलेंडर में जोड़ें, या पास को अपने फ़ोन में तस्वीर की तरह सहेजें — असली कोड के साथ, गेट पर दिखाने के लिए तैयार।', bn: 'আপনার অনুষ্ঠান পাস এখন শুধু একটি লিঙ্কে থাকে না: পাস থেকেই উৎসবের দিনগুলি আপনার ক্যালেন্ডারে যোগ করুন, অথবা পাসটি ছবি হিসেবে ফোনে সেভ করুন — আসল কোডসহ, গেটে দেখানোর জন্য প্রস্তুত।' } },
        { text: { en: 'Booking and pass-purchase confirmations now carry the same calendar buttons, so the days are saved the moment you book.', hi: 'बुकिंग और पास-खरीद की पुष्टि में अब वही कैलेंडर बटन हैं, ताकि बुक करते ही दिन सहेजे जाएँ।', bn: 'বুকিং ও পাস-কেনার নিশ্চিতকরণে এখন একই ক্যালেন্ডার বোতাম আছে, যাতে বুক করার মুহূর্তেই দিনগুলি সেভ হয়ে যায়।' } },
      ],
    },
  },

  {
    version: 'v2026.11.22-fa58a85',
    date: '2026-11-22',
    sections: {
      new: [
        { text: { en: 'You can now follow a temple and follow a festival — its next events come to you on the events page and in your Solo home, instead of you having to go looking for them.', hi: 'अब आप किसी मंदिर को और किसी उत्सव को फॉलो कर सकते हैं — उसके अगले कार्यक्रम कार्यक्रम पृष्ठ पर और आपके सोलो होम में स्वयं आपके पास आएँगे, आपको खोजने नहीं जाना पड़ेगा।', bn: 'এখন আপনি একটি মন্দির ও একটি উৎসব অনুসরণ করতে পারেন — তার পরবর্তী অনুষ্ঠানগুলি অনুষ্ঠান পৃষ্ঠায় ও আপনার সোলো হোমে নিজে থেকেই আপনার কাছে আসবে, খুঁজতে যেতে হবে না।' } },
        { text: { en: 'The events page now opens with the sacred days ahead — Ekadashi, Purnima and the great festivals of the coming 30 days — showing how many events fall on each day. Tap a day to see them.', hi: 'कार्यक्रम पृष्ठ अब आगे के पवित्र दिनों के साथ खुलता है — एकादशी, पूर्णिमा और आने वाले 30 दिनों के बड़े उत्सव — और दिखाता है कि प्रत्येक दिन कितने कार्यक्रम हैं। देखने के लिए दिन पर टैप करें।', bn: 'অনুষ্ঠান পৃষ্ঠা এখন সামনের পবিত্র দিনগুলি দিয়ে খোলে — একাদশী, পূর্ণিমা ও আগামী ৩০ দিনের বড় উৎসব — এবং দেখায় প্রতিদিন কতগুলি অনুষ্ঠান আছে। দেখতে দিনটিতে ট্যাপ করুন।' } },
      ],
    },
  },

  {
    version: 'v2026.11.22-593b9b4',
    date: '2026-11-22',
    sections: {
      new: [
        { text: { en: 'Festivals now carry their venue and a map link, so devotees can see exactly where to come — on the festival page and in the public events list.', hi: 'उत्सवों में अब स्थान और मानचित्र लिंक जुड़ता है, ताकि भक्त ठीक-ठीक देख सकें कि कहाँ आना है — उत्सव पृष्ठ पर और सार्वजनिक कार्यक्रम सूची में।', bn: 'উৎসবে এখন স্থান ও মানচিত্রের লিঙ্ক যোগ হয়, যাতে ভক্তরা ঠিক কোথায় আসতে হবে তা দেখতে পারেন — উৎসবের পৃষ্ঠায় ও উন্মুক্ত অনুষ্ঠান তালিকায়।' } },
        { text: { en: 'Committees can print a gate register for the day and export the full attendee list — a paper sheet for the entrance desk, with a blank column to tick admissions by hand.', hi: 'समितियाँ दिन का गेट रजिस्टर छाप सकती हैं और पूरी उपस्थिति सूची निर्यात कर सकती हैं — प्रवेश डेस्क के लिए कागज़ की शीट, हाथ से प्रवेश टिक करने के लिए खाली कॉलम के साथ।', bn: 'কমিটি দিনের গেট রেজিস্টার ছাপতে ও পুরো উপস্থিতির তালিকা রপ্তানি করতে পারে — প্রবেশ ডেস্কের জন্য কাগজের শিট, হাতে প্রবেশ টিক দেওয়ার খালি কলামসহ।' } },
        { text: { en: 'The ticket desk can now sell a seva pass to a walk-in devotee who pays cash at the counter — no account needed, and the sale is recorded with the same care as an online booking.', hi: 'टिकट डेस्क अब काउंटर पर नकद देने वाले भक्त को सेवा पास बेच सकता है — खाते की ज़रूरत नहीं, और बिक्री ऑनलाइन बुकिंग जैसी ही सावधानी से दर्ज होती है।', bn: 'টিকিট ডেস্ক এখন কাউন্টারে নগদ দেওয়া ভক্তকে সেবা পাস বিক্রি করতে পারে — অ্যাকাউন্টের দরকার নেই, আর বিক্রিটি অনলাইন বুকিংয়ের মতোই যত্নে লিপিবদ্ধ হয়।' } },
        { text: { en: 'If a festival\'s date or venue changes, organisers get a ready WhatsApp announcement written from the festival\'s real details, to send to booked guests from their own phone.', hi: 'यदि उत्सव की तिथि या स्थान बदले, तो आयोजकों को उत्सव के असली विवरण से बना तैयार WhatsApp संदेश मिलता है, जो वे अपने फ़ोन से बुक किए अतिथियों को भेज सकते हैं।', bn: 'উৎসবের তারিখ বা স্থান বদলালে আয়োজকরা উৎসবের আসল বিবরণ থেকে তৈরি WhatsApp ঘোষণা পান, যা নিজের ফোন থেকে বুক করা অতিথিদের পাঠাতে পারেন।' } },
        { text: { en: 'Sponsors whose gift has been received can now be given a printed receipt, referenced to the treasury entry itself — no separate numbering, nothing invented.', hi: 'जिन प्रायोजकों का दान प्राप्त हो चुका है, उन्हें अब छपी रसीद दी जा सकती है, जो स्वयं कोष प्रविष्टि से जुड़ी है — अलग नंबरिंग नहीं, कुछ भी बनाया नहीं गया।', bn: 'যেসব পৃষ্ঠপোষকের দান গৃহীত হয়েছে, তাঁদের এখন ছাপা রসিদ দেওয়া যায়, যা সরাসরি কোষাগারের এন্ট্রির সঙ্গে যুক্ত — আলাদা নম্বর নয়, কিছু বানানো নয়।' } },
      ],
    },
  },

  {
    version: 'v2026.11.22-00b1030',
    date: '2026-11-22',
    sections: {
      new: [
        {
          text: {
            en: 'Community centres now hold ceremonies at their heart. In Sangha and Samaj workspaces, Samskara One (the family lifecycle — vivah, annaprashan, upanayan and the other samskaras) and Utsav One (festival management — budgets, committees, vendors, crowds) are now core desks: on the home screen, in the directory, in the setup recommendations, and in a new workspace’s starter set. Together with the Sanatani Vivah desk a community centre already had, a wedding can now be cared for properly in one place — from the match, to the ceremony, to the celebration around it.',
            hi: 'सामुदायिक केंद्र अब अपने हृदय में संस्कारों को धारण करते हैं। संघ और समाज कार्यक्षेत्रों में, संस्कार वन (पारिवारिक जीवनचक्र — विवाह, अन्नप्राशन, उपनयन और अन्य संस्कार) और उत्सव वन (उत्सव प्रबंधन — बजट, समितियाँ, विक्रेता, भीड़) अब मुख्य डेस्क हैं: मुखपृष्ठ पर, निर्देशिका में, सेटअप सुझावों में, और नए कार्यक्षेत्र के प्रारंभिक सेट में। सनातनी विवाह डेस्क के साथ, जो सामुदायिक केंद्र के पास पहले से था, अब एक विवाह की देखभाल एक ही स्थान पर ठीक से हो सकती है — मेल से, संस्कार तक, उसके चारों ओर के उत्सव तक।',
            bn: 'সামাজিক কেন্দ্রগুলি এখন তাদের হৃদয়ে সংস্কার ধারণ করে। সংঘ ও সমাজ কর্মক্ষেত্রে, সংস্কার ওয়ান (পারিবারিক জীবনচক্র — বিবাহ, অন্নপ্রাশন, উপনয়ন ও অন্যান্য সংস্কার) এবং উৎসব ওয়ান (উৎসব ব্যবস্থাপনা — বাজেট, কমিটি, বিক্রেতা, ভিড়) এখন মূল ডেস্ক: হোম পর্দায়, নির্দেশিকায়, সেটআপ সুপারিশে, এবং নতুন কর্মক্ষেত্রের প্রারম্ভিক সেটে। সনাতনী বিবাহ ডেস্কের সঙ্গে, যা একটি সামাজিক কেন্দ্রের আগে থেকেই ছিল, এখন একটি বিবাহের যত্ন এক জায়গায় ঠিকমতো হতে পারে — মেল থেকে, সংস্কার পর্যন্ত, তার চারপাশের উৎসব পর্যন্ত।',
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.22-9a9d13e',
    date: '2026-11-22',
    sections: {
      fixed: [
        {
          text: {
            en: 'The app can no longer be trapped on its opening screen by a bad network. If the connection hangs — a captive portal, a dying Wi-Fi — the app now waits a fair while, then opens on the space already saved on your device and finishes signing in quietly in the background when the network returns. Slow networks are untouched; only a true hang is rescued.',
            hi: 'अब खराब नेटवर्क ऐप को उसकी प्रारंभिक स्क्रीन पर नहीं फँसा सकता। यदि कनेक्शन अटक जाए — कैप्टिव पोर्टल, मरता हुआ Wi-Fi — तो ऐप उचित समय प्रतीक्षा करता है, फिर आपके उपकरण पर पहले से सहेजे स्थान के साथ खुलता है, और नेटवर्क लौटने पर पृष्ठभूमि में चुपचाप साइन-इन पूरा करता है। धीमा नेटवर्क अछूता रहता है; केवल सच्ची अटकन ही बचाई जाती है।',
            bn: 'এখন খারাপ নেটওয়ার্ক অ্যাপকে তার শুরুর পর্দায় আটকে রাখতে পারবে না। সংযোগ ঝুলে গেলে — ক্যাপটিভ পোর্টাল, মুমূর্ষু Wi-Fi — অ্যাপ যথাযথ সময় অপেক্ষা করে, তারপর আপনার যন্ত্রে আগে থেকে সেভ করা জায়গা নিয়ে খোলে, আর নেটওয়ার্ক ফিরলে পেছনে নীরবে সাইন-ইন শেষ করে। ধীর নেটওয়ার্ক অক্ষত থাকে; শুধু সত্যিকারের ঝুলনই উদ্ধার পায়।',
          },
        },
        {
          text: {
            en: 'Three smaller repairs from our full-app testing: the language sheet now stays readable at dusk in Sandhya Mode (its heading had nearly vanished), the Treasury “More” menu now closes properly on phones — a tap outside or the back gesture dismisses it — and the short address /whats-new now leads to the What’s New page, as people expect.',
            hi: 'हमारे पूर्ण-ऐप परीक्षण से तीन छोटे सुधार: भाषा-पत्रक अब संध्या मोड में शाम को भी पठनीय रहता है (उसका शीर्षक लगभग गायब हो गया था), कोष “More” मेनू अब फ़ोन पर ठीक से बंद होता है — बाहर टैप या बैक इशारा उसे हटाता है — और छोटा पता /whats-new अब What’s New पृष्ठ पर ले जाता है, जैसा लोग अपेक्षा करते हैं।',
            bn: 'আমাদের পূর্ণ-অ্যাপ পরীক্ষা থেকে তিনটি ছোট মেরামত: ভাষা-পত্রক এখন সন্ধ্যা মোডে সাঁঝেও পড়া যায় (তার শিরোনাম প্রায় হারিয়ে গিয়েছিল), কোষাগারের “More” মেনু এখন ফোনে ঠিকমতো বন্ধ হয় — বাইরে ট্যাপ বা ব্যাক ইশারা তা সরিয়ে দেয় — আর ছোট ঠিকানা /whats-new এখন What’s New পৃষ্ঠায় নিয়ে যায়, যেমনটা মানুষ আশা করেন।',
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.22-907e1fb',
    date: '2026-11-22',
    sections: {
      new: [
        {
          text: {
            en: 'Committees can now invite the whole town in one honest tap: the War Room prepares a warm WhatsApp message from the festival’s real details — name, dates, place, and its own page link — and it is sent from your own WhatsApp, to the people you choose. Nothing is blasted by the app; an invitation stays personal, the way it should be. Devotees get the same gentle tool on the festival page to invite family and friends.',
            hi: 'अब समितियाँ एक ईमानदार टैप में पूरे नगर को निमंत्रण दे सकती हैं: War Room उत्सव के वास्तविक विवरण — नाम, तिथियाँ, स्थान और उसके अपने पृष्ठ का लिंक — से एक स्नेहिल WhatsApp संदेश तैयार करता है, और वह आपके अपने WhatsApp से, आपके चुने लोगों को भेजा जाता है। ऐप कुछ भी एक साथ नहीं भेजता; निमंत्रण व्यक्तिगत रहता है, जैसा होना चाहिए। भक्तों को उत्सव पृष्ठ पर परिवार और मित्रों को बुलाने का वही सौम्य साधन मिलता है।',
            bn: 'এবার কমিটি এক সৎ ট্যাপে পুরো শহরকে নিমন্ত্রণ জানাতে পারেন: War Room উৎসবের আসল বিবরণ — নাম, তারিখ, স্থান আর তার নিজের পৃষ্ঠার লিঙ্ক — দিয়ে একটি আন্তরিক WhatsApp বার্তা তৈরি করে, আর তা পাঠানো হয় আপনার নিজের WhatsApp থেকে, আপনার বেছে নেওয়া মানুষদের কাছে। অ্যাপ কিছুই একসঙ্গে ছড়ায় না; নিমন্ত্রণ ব্যক্তিগতই থাকে, যেমনটা হওয়া উচিত। ভক্তরাও উৎসবের পৃষ্ঠায় পরিবার ও বন্ধুদের ডাকার সেই একই কোমল উপায় পান।',
          },
        },
        {
          text: {
            en: 'And festivals can now announce early, Tirupati-style: set the day and hour when seva passes open, and the page will say “Passes open on…” until that moment — the booking itself stays closed, guarded by the server too, so no one can slip in early. Free darshan booking is never held back; only passes wait for their announced hour. With this, the great festival system is complete — tithi-true calendars, gate passes, honest ticketing, debriefs, feedback, sponsors, departments, discovery, and now invitations.',
            hi: 'और अब उत्सव तिरुपति-शैली में पहले से घोषित हो सकते हैं: वह दिन और घड़ी तय करें जब सेवा पास खुलेंगे, और पृष्ठ उस क्षण तक कहेगा “पास इस दिन खुलेंगे…” — बुकिंग स्वयं बंद रहती है, सर्वर द्वारा भी सुरक्षित, ताकि कोई पहले न घुस सके। निःशुल्क दर्शन बुकिंग कभी नहीं रोकी जाती; केवल पास अपनी घोषित घड़ी की प्रतीक्षा करते हैं। इसके साथ महान उत्सव-प्रणाली पूर्ण होती है — तिथि-सत्य पंचांग, द्वार पास, ईमानदार टिकट, समीक्षा, प्रतिपुष्टि, प्रायोजक, विभाग, खोज, और अब निमंत्रण।',
            bn: 'আর এখন উৎসব তিরুপতি-ধাঁচে আগাম ঘোষণা করা যায়: সেবা পাস খোলার দিন ও ঘণ্টা ঠিক করে দিন, পৃষ্ঠাটি সেই মুহূর্ত পর্যন্ত বলবে “পাস খুলবে এই দিনে…” — বুকিং নিজে বন্ধ থাকে, সার্ভার দিয়েও সুরক্ষিত, যাতে কেউ আগে ঢুকতে না পারে। বিনামূল্যে দর্শন বুকিং কখনো আটকানো হয় না; শুধু পাস তার ঘোষিত ঘণ্টার অপেক্ষা করে। এরই সঙ্গে মহা উৎসব-ব্যবস্থা সম্পূর্ণ হলো — তিথি-সত্য পঞ্জিকা, দ্বার পাস, সৎ টিকিট, পর্যালোচনা, মতামত, পৃষ্ঠপোষক, বিভাগ, আবিষ্কার, আর এখন নিমন্ত্রণ।',
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.22-0d7ee6f',
    date: '2026-11-22',
    sections: {
      new: [
        {
          text: {
            en: 'There is now one public doorway to every celebration: the new Events page gathers upcoming festivals and gatherings from all organisations in one place — today, this week, and coming up — open to everyone, no account needed to look. Each card carries you to that organisation’s own page, where you can join, book a pass, or simply plan your darshan. You will find the doorway on the home page too.',
            hi: 'अब हर उत्सव का एक सार्वजनिक द्वार है: नया Events पृष्ठ सभी संस्थाओं के आगामी उत्सवों और आयोजनों को एक ही स्थान पर इकट्ठा करता है — आज, इस सप्ताह, और आगे आने वाले — सबके लिए खुला, देखने के लिए खाता नहीं चाहिए। हर कार्ड आपको उस संस्था के अपने पृष्ठ पर ले जाता है, जहाँ आप जुड़ सकते हैं, पास बुक कर सकते हैं, या बस अपने दर्शन की योजना बना सकते हैं। यह द्वार मुखपृष्ठ पर भी मिलेगा।',
            bn: 'এখন প্রতিটি উদ্‌যাপনের একটি সর্বজনীন দ্বার আছে: নতুন Events পৃষ্ঠা সব প্রতিষ্ঠানের আসন্ন উৎসব ও আয়োজন এক জায়গায় জড়ো করে — আজ, এই সপ্তাহে, আর আগামীতে — সবার জন্য খোলা, দেখতে অ্যাকাউন্ট লাগে না। প্রতিটি কার্ড আপনাকে সেই প্রতিষ্ঠানের নিজের পৃষ্ঠায় নিয়ে যায়, যেখানে যোগ দিতে, পাস বুক করতে, কিংবা শুধু দর্শনের পরিকল্পনা করতে পারবেন। এই দ্বারটি হোম পৃষ্ঠাতেও পাবেন।',
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.22-e44ac9f',
    date: '2026-11-22',
    sections: {
      new: [
        {
          text: {
            en: 'Every festival now keeps a proper Sponsors & Stalls register in the War Room: who pledged what, what has been received, and one tap that posts the receipt straight into the treasury under the Sponsorships or Stall fees head — no double books. Sponsors are thanked on the public festival page only when they have said yes to being named, and only ever by name, never by amount.',
            hi: 'अब हर उत्सव के War Room में उचित Sponsors & Stalls पंजी रहती है: किसने क्या वचन दिया, कितना प्राप्त हुआ, और एक टैप जो प्राप्ति को सीधे कोष में Sponsorships या Stall fees मद में दर्ज कर देता है — दोहरे बही-खाते नहीं। प्रायोजकों को सार्वजनिक उत्सव पृष्ठ पर केवल तब धन्यवाद दिया जाता है जब उन्होंने नाम आने की सहमति दी हो, और हमेशा केवल नाम से, कभी राशि से नहीं।',
            bn: 'এখন প্রতিটি উৎসবের War Room-এ যথাযথ Sponsors & Stalls খাতা থাকে: কে কী প্রতিশ্রুতি দিলেন, কতটা পাওয়া গেছে, আর এক ট্যাপে সেই প্রাপ্তি সরাসরি কোষাগারে Sponsorships বা Stall fees খাতে নথিভুক্ত হয় — দ্বিগুণ খাতা নয়। পৃষ্ঠপোষকদের সর্বজনীন উৎসব পৃষ্ঠায় ধন্যবাদ জানানো হয় কেবল তখনই, যখন তাঁরা নাম প্রকাশে সম্মতি দিয়েছেন, এবং সবসময় শুধু নামে, কখনো অঙ্কে নয়।',
          },
        },
        {
          text: {
            en: 'Festivals also gain Seva Departments — Kitchen & Prasadam, Darshan & Crowd, Decoration, Medical & Safety and more — each with a lead, a volunteer target, and its own list of sevaks, so a gap shows itself weeks before the day, not on the morning. The department plan carries into next year’s festival; sponsors and stalls, being each year’s own arrangements, begin fresh.',
            hi: 'उत्सवों को Seva Departments भी मिलते हैं — Kitchen & Prasadam, Darshan & Crowd, Decoration, Medical & Safety और अन्य — प्रत्येक का एक प्रमुख, स्वयंसेवक लक्ष्य और अपनी सेवक-सूची, ताकि कमी उस सुबह नहीं, सप्ताहों पहले दिख जाए। विभाग-योजना अगले वर्ष के उत्सव में जाती है; प्रायोजक और स्टॉल, हर वर्ष की अपनी व्यवस्था होने से, नए सिरे से शुरू होते हैं।',
            bn: 'উৎসবগুলো পায় Seva Departments — Kitchen & Prasadam, Darshan & Crowd, Decoration, Medical & Safety আরও অনেক — প্রতিটির একজন প্রধান, স্বেচ্ছাসেবকের লক্ষ্য ও নিজস্ব সেবক-তালিকা, যাতে ঘাটতি সেই সকালে নয়, সপ্তাহখানেক আগেই ধরা পড়ে। বিভাগ-পরিকল্পনা পরের বছরের উৎসবে যায়; পৃষ্ঠপোষক ও স্টল, প্রতি বছরের নিজস্ব ব্যবস্থা বলে, নতুন করে শুরু হয়।',
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.22-65404ea',
    date: '2026-11-22',
    sections: {
      new: [
        {
          text: {
            en: 'After a festival, the devotees who actually came through the gate are gently invited to say how it was — the arrangements, the prasad, the darshan flow, the cleanliness — in words of gratitude, never points or scores. The committee reads every word in the Debrief, can reply, and may publish the averages (only when at least five devotees have spoken, so no one can be guessed). Only those who truly attended can write — the gate record itself is the witness.',
            hi: 'उत्सव के बाद, जो भक्त सचमुच द्वार से आए थे, उन्हें स्नेह से पूछा जाता है कि अनुभव कैसा रहा — व्यवस्था, प्रसाद, दर्शन की धारा, स्वच्छता — कृतज्ञता के शब्दों में, कभी अंक या स्कोर नहीं। समिति हर शब्द Debrief में पढ़ती है, उत्तर दे सकती है, और औसत प्रकाशित कर सकती है (केवल तब, जब कम से कम पाँच भक्तों ने कहा हो, ताकि किसी का अनुमान न लगे)। केवल वे ही लिख सकते हैं जो सचमुच आए थे — द्वार का अभिलेख ही साक्षी है।',
            bn: 'উৎসবের পর, যাঁরা সত্যিই দ্বার দিয়ে এসেছিলেন, তাঁদের স্নেহে জিজ্ঞেস করা হয় অভিজ্ঞতা কেমন ছিল — ব্যবস্থা, প্রসাদ, দর্শনের ধারা, পরিচ্ছন্নতা — কৃতজ্ঞতার কথায়, কখনো নম্বর বা স্কোর নয়। কমিটি প্রতিটি কথা Debrief-এ পড়েন, উত্তর দিতে পারেন, এবং গড় প্রকাশ করতে পারেন (কেবল তখনই, যখন অন্তত পাঁচজন ভক্ত বলেছেন, যাতে কাউকে অনুমান করা না যায়)। শুধু যাঁরা সত্যিই এসেছিলেন তাঁরাই লিখতে পারেন — দ্বারের নথিই সাক্ষী।',
          },
        },
      ],
      improved: [
        {
          text: {
            en: 'Behind the scenes, the app’s safety rulebook was carefully tightened and compressed — the same protections, word for word in effect, now with generous room to grow. Nothing you see changed; everything you trust stands exactly as before, with space for what comes next.',
            hi: 'पर्दे के पीछे, ऐप की सुरक्षा-नियमावली को सावधानी से कसा और संक्षिप्त किया गया — वही सुरक्षाएँ, प्रभाव में शब्दशः वही, अब बढ़ने के लिए पर्याप्त स्थान के साथ। जो आप देखते हैं, कुछ नहीं बदला; जिस पर आप भरोसा करते हैं, वह ठीक वैसा ही खड़ा है, आगे आने वाली चीज़ों के लिए स्थान सहित।',
            bn: 'পর্দার আড়ালে, অ্যাপের নিরাপত্তা-নিয়মাবলি যত্নে গোছানো ও সংক্ষিপ্ত করা হয়েছে — একই সুরক্ষা, কার্যত হুবহু একই, এখন বাড়ার জন্য প্রশস্ত জায়গাসহ। যা দেখেন, কিছুই বদলায়নি; যাতে আস্থা রাখেন, তা ঠিক আগের মতোই আছে, আগামীর জন্য জায়গাসহ।',
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.21-b100d55',
    date: '2026-11-21',
    sections: {
      new: [
        {
          text: {
            en: "After the festival, the committee now gets one honest debrief. How many booked, how many actually came through the gate (counted from the gate's own scans, day by day), who did not turn up; pass money and donation money shown as two separate lines, always; what was planned against what was spent, head by head; and how the prasad plan matched the real crowd. It prints as a one-page record for the committee's file, and the lessons the committee writes down are carried into next year's festival when they clone it \u2014 so next year's team starts from this year's wisdom, not from memory. If the organisation wishes, a totals-only summary (never names) can be published on the festival page for everyone to see.",
            hi: "\u0909\u0924\u094d\u0938\u0935 \u0915\u0947 \u092c\u093e\u0926 \u0905\u092c \u0938\u092e\u093f\u0924\u093f \u0915\u094b \u090f\u0915 \u0908\u092e\u093e\u0928\u0926\u093e\u0930 \u0938\u092e\u0940\u0915\u094d\u0937\u093e \u092e\u093f\u0932\u0924\u0940 \u0939\u0948\u0964 \u0915\u093f\u0924\u0928\u094b\u0902 \u0928\u0947 \u092c\u0941\u0915 \u0915\u093f\u092f\u093e, \u0915\u093f\u0924\u0928\u0947 \u0938\u091a \u092e\u0947\u0902 \u0926\u094d\u0935\u093e\u0930 \u0938\u0947 \u0906\u090f (\u0926\u094d\u0935\u093e\u0930 \u0915\u0947 \u0905\u092a\u0928\u0947 \u0938\u094d\u0915\u0948\u0928 \u0938\u0947 \u0917\u093f\u0928\u093e \u0939\u0941\u0906, \u0926\u093f\u0928-\u0926\u0930-\u0926\u093f\u0928), \u0915\u094c\u0928 \u0928\u0939\u0940\u0902 \u0906\u092f\u093e; \u092a\u093e\u0938 \u0915\u093e \u092a\u0948\u0938\u093e \u0914\u0930 \u0926\u093e\u0928 \u0915\u093e \u092a\u0948\u0938\u093e \u0939\u092e\u0947\u0936\u093e \u0926\u094b \u0905\u0932\u0917 \u092a\u0902\u0915\u094d\u0924\u093f\u092f\u094b\u0902 \u092e\u0947\u0902; \u092f\u094b\u091c\u0928\u093e \u0915\u0947 \u0938\u093e\u092e\u0928\u0947 \u0905\u0938\u0932\u0940 \u0916\u0930\u094d\u091a, \u0939\u0930 \u092e\u0926 \u0915\u0947 \u0938\u093e\u092e\u0928\u0947; \u0914\u0930 \u092a\u094d\u0930\u0938\u093e\u0926 \u0915\u0940 \u092f\u094b\u091c\u0928\u093e \u0905\u0938\u0932\u0940 \u092d\u0940\u0921\u093c \u0938\u0947 \u0915\u093f\u0924\u0928\u0940 \u092e\u0947\u0932 \u0916\u093e\u0908\u0964 \u092f\u0939 \u0938\u092e\u093f\u0924\u093f \u0915\u0940 \u092b\u093c\u093e\u0907\u0932 \u0915\u0947 \u0932\u093f\u090f \u090f\u0915 \u092a\u0943\u0937\u094d\u0920 \u0915\u0947 \u0930\u093f\u0915\u0949\u0930\u094d\u0921 \u0915\u0947 \u0930\u0942\u092a \u092e\u0947\u0902 \u091b\u092a\u0924\u093e \u0939\u0948, \u0914\u0930 \u0938\u092e\u093f\u0924\u093f \u091c\u094b \u0938\u092c\u0915 \u0932\u093f\u0916\u0924\u0940 \u0939\u0948 \u0935\u0939 \u0905\u0917\u0932\u0947 \u0935\u0930\u094d\u0937 \u0915\u0947 \u0909\u0924\u094d\u0938\u0935 \u092e\u0947\u0902 \u0909\u0938\u0947 \u0915\u094d\u0932\u094b\u0928 \u0915\u0930\u0928\u0947 \u092a\u0930 \u0938\u093e\u0925 \u091a\u0932\u093e \u091c\u093e\u0924\u093e \u0939\u0948 \u2014 \u0924\u093e\u0915\u093f \u0905\u0917\u0932\u0947 \u0935\u0930\u094d\u0937 \u0915\u0940 \u091f\u0940\u092e \u092f\u093e\u0926\u0926\u093e\u0936\u094d\u0924 \u0938\u0947 \u0928\u0939\u0940\u0902, \u0907\u0938 \u0935\u0930\u094d\u0937 \u0915\u0947 \u0917\u094d\u092f\u093e\u0928 \u0938\u0947 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0964 \u091a\u093e\u0939\u0947\u0902 \u0924\u094b \u0915\u0947\u0935\u0932-\u092f\u094b\u0917 \u0935\u093e\u0932\u093e \u0938\u093e\u0930 (\u0915\u092d\u0940 \u0928\u093e\u092e \u0928\u0939\u0940\u0902) \u0909\u0924\u094d\u0938\u0935 \u092a\u0943\u0937\u094d\u0920 \u092a\u0930 \u0938\u092c\u0915\u0947 \u0932\u093f\u090f \u092a\u094d\u0930\u0915\u093e\u0936\u093f\u0924 \u0939\u094b \u0938\u0915\u0924\u093e \u0939\u0948\u0964",
            bn: "\u0989\u09ce\u09b8\u09ac\u09c7\u09b0 \u09aa\u09b0 \u098f\u0996\u09a8 \u0995\u09ae\u09bf\u099f\u09bf \u098f\u0995\u099f\u09bf \u09b8\u09ce \u09aa\u09b0\u09cd\u09af\u09be\u09b2\u09cb\u099a\u09a8\u09be \u09aa\u09be\u09af\u09bc\u0964 \u0995\u09a4\u099c\u09a8 \u09ac\u09c1\u0995 \u0995\u09b0\u09c7\u099b\u09bf\u09b2\u09c7\u09a8, \u0995\u09a4\u099c\u09a8 \u09b8\u09a4\u09cd\u09af\u09bf\u0987 \u09a6\u09b0\u099c\u09be \u09a6\u09bf\u09af\u09bc\u09c7 \u098f\u09b8\u09c7\u099b\u09bf\u09b2\u09c7\u09a8 (\u09a6\u09b0\u099c\u09be\u09b0 \u09a8\u09bf\u099c\u09b8\u09cd\u09ac \u09b8\u09cd\u0995\u09cd\u09af\u09be\u09a8 \u09a5\u09c7\u0995\u09c7 \u0997\u09cb\u09a3\u09be, \u09a6\u09bf\u09a8\u09ad\u09bf\u09a4\u09cd\u09a4\u09bf\u0995), \u0995\u09c7 \u0986\u09b8\u09c7\u09a8\u09a8\u09bf; \u09aa\u09be\u09b8\u09c7\u09b0 \u099f\u09be\u0995\u09be \u0993 \u09a6\u09be\u09a8\u09c7\u09b0 \u099f\u09be\u0995\u09be \u09b8\u09ac\u09b8\u09ae\u09af\u09bc \u09a6\u09c1\u099f\u09bf \u0986\u09b2\u09be\u09a6\u09be \u09b2\u09be\u0987\u09a8\u09c7; \u09aa\u09b0\u09bf\u0995\u09b2\u09cd\u09aa\u09a8\u09be\u09b0 \u09ac\u09bf\u09aa\u09b0\u09c0\u09a4\u09c7 \u09aa\u09cd\u09b0\u0995\u09c3\u09a4 \u0996\u09b0\u099a, \u09aa\u09cd\u09b0\u09a4\u09bf \u0996\u09be\u09a4\u09c7; \u0986\u09b0 \u09aa\u09cd\u09b0\u09b8\u09be\u09a6\u09c7\u09b0 \u09aa\u09b0\u09bf\u0995\u09b2\u09cd\u09aa\u09a8\u09be \u0986\u09b8\u09b2 \u09ad\u09bf\u09a1\u09bc\u09c7\u09b0 \u09b8\u0999\u09cd\u0997\u09c7 \u0995\u09a4\u099f\u09be \u09ae\u09bf\u09b2\u09c7\u099b\u09c7\u0964 \u098f\u099f\u09bf \u0995\u09ae\u09bf\u099f\u09bf\u09b0 \u09ab\u09be\u0987\u09b2\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u098f\u0995 \u09aa\u09c3\u09b7\u09cd\u09a0\u09be\u09b0 \u09b0\u09c7\u0995\u09b0\u09cd\u09a1 \u09b9\u09bf\u09b8\u09c7\u09ac\u09c7 \u099b\u09be\u09aa\u09be \u09b9\u09af\u09bc, \u0986\u09b0 \u0995\u09ae\u09bf\u099f\u09bf \u09af\u09c7 \u09b6\u09bf\u0995\u09cd\u09b7\u09be \u09b2\u09bf\u0996\u09c7 \u09b0\u09be\u0996\u09c7 \u09a4\u09be \u09aa\u09b0\u09c7\u09b0 \u09ac\u099b\u09b0\u09c7\u09b0 \u0989\u09ce\u09b8\u09ac \u0995\u09cd\u09b2\u09cb\u09a8 \u0995\u09b0\u09b2\u09c7 \u09b8\u0999\u09cd\u0997\u09c7 \u099a\u09b2\u09c7 \u09af\u09be\u09af\u09bc \u2014 \u09af\u09c7\u09a8 \u09aa\u09b0\u09c7\u09b0 \u09a6\u09b2 \u09b8\u09cd\u09ae\u09c3\u09a4\u09bf \u09a5\u09c7\u0995\u09c7 \u09a8\u09df, \u098f\u0987 \u09ac\u099b\u09b0\u09c7\u09b0 \u099c\u09cd\u099e\u09be\u09a8 \u09a5\u09c7\u0995\u09c7 \u09b6\u09c1\u09b0\u09c1 \u0995\u09b0\u09c7\u0964 \u099a\u09be\u0987\u09b2\u09c7 \u09b6\u09c1\u09a7\u09c1-\u09ae\u09cb\u099f\u09c7\u09b0 \u09b8\u09be\u09b0\u09be\u0982\u09b6 (\u0995\u0996\u09a8\u09cb \u09a8\u09be\u09ae \u09a8\u09af\u09bc) \u0989\u09ce\u09b8\u09ac\u09c7\u09b0 \u09aa\u09be\u09a4\u09be\u09af\u09bc \u09b8\u09ac\u09be\u09b0 \u099c\u09a8\u09cd\u09af \u09aa\u09cd\u09b0\u0995\u09be\u09b6 \u0995\u09b0\u09be \u09af\u09be\u09af\u09bc\u0964",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.21-5c6f5a7',
    date: '2026-11-21',
    sections: {
      new: [
        {
          text: {
            en: "Festivals can now offer seva passes. The committee sets pass types \u2014 free, paid, early-bird \u2014 with a clear refund promise published before anyone pays. A family books together in one go: one person pays, every attendee is named, and the full bill is shown line by line (pass price, discount, fee, tax) before confirming \u2014 no surprises at the end. Pay from the Seva Wallet or at the venue. Plans changed? Cancel under the same published promise and the refund returns to the wallet, or pass your booking to another devotee, who accepts it as their own. The server itself re-checks every bill, so the price the committee published is the price everyone pays.",
            hi: "\u0909\u0924\u094d\u0938\u0935 \u0905\u092c \u0938\u0947\u0935\u093e \u092a\u093e\u0938 \u0926\u0947 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964 \u0938\u092e\u093f\u0924\u093f \u092a\u093e\u0938 \u0915\u0947 \u092a\u094d\u0930\u0915\u093e\u0930 \u0924\u092f \u0915\u0930\u0924\u0940 \u0939\u0948 \u2014 \u092e\u0941\u092b\u093c\u094d\u0924, \u0936\u0941\u0932\u094d\u0915-\u0938\u0939\u093f\u0924, \u0905\u0917\u094d\u0930\u093f\u092e \u2014 \u0914\u0930 \u092d\u0941\u0917\u0924\u093e\u0928 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0939\u0940 \u090f\u0915 \u0938\u094d\u092a\u0937\u094d\u091f \u0930\u093f\u092b\u0902\u0921 \u0935\u093e\u0926\u093e \u092a\u094d\u0930\u0915\u093e\u0936\u093f\u0924 \u0939\u094b\u0924\u093e \u0939\u0948\u0964 \u092a\u0930\u093f\u0935\u093e\u0930 \u090f\u0915 \u0938\u093e\u0925 \u092c\u0941\u0915 \u0915\u0930\u0924\u093e \u0939\u0948: \u090f\u0915 \u0935\u094d\u092f\u0915\u094d\u0924\u093f \u092d\u0941\u0917\u0924\u093e\u0928 \u0915\u0930\u0924\u093e \u0939\u0948, \u0939\u0930 \u0909\u092a\u0938\u094d\u0925\u093f\u0924 \u0915\u093e \u0928\u093e\u092e \u0926\u0930\u094d\u091c \u0939\u094b\u0924\u093e \u0939\u0948, \u0914\u0930 \u092a\u0941\u0937\u094d\u091f\u093f \u0938\u0947 \u092a\u0939\u0932\u0947 \u092a\u0942\u0930\u093e \u092c\u093f\u0932 \u092a\u0902\u0915\u094d\u0924\u093f-\u0926\u0930-\u092a\u0902\u0915\u094d\u0924\u093f \u0926\u093f\u0916\u0924\u093e \u0939\u0948 (\u092a\u093e\u0938 \u0915\u0940 \u0915\u0940\u092e\u0924, \u091b\u0942\u091f, \u0936\u0941\u0932\u094d\u0915, \u0915\u0930) \u2014 \u0905\u0902\u0924 \u092e\u0947\u0902 \u0915\u094b\u0908 \u0905\u091a\u0902\u092d\u093e \u0928\u0939\u0940\u0902\u0964 \u0938\u0947\u0935\u093e \u0935\u0949\u0932\u0947\u091f \u0938\u0947 \u092f\u093e \u0938\u094d\u0925\u0932 \u092a\u0930 \u092d\u0941\u0917\u0924\u093e\u0928 \u0915\u0930\u0947\u0902\u0964 \u092f\u094b\u091c\u0928\u093e \u092c\u0926\u0932 \u0917\u0908? \u0909\u0938\u0940 \u092a\u094d\u0930\u0915\u093e\u0936\u093f\u0924 \u0935\u093e\u0926\u0947 \u0915\u0947 \u0924\u0939\u0924 \u0930\u0926\u094d\u0926 \u0915\u0930\u0947\u0902 \u2014 \u0930\u093f\u092b\u0902\u0921 \u0935\u0949\u0932\u0947\u091f \u092e\u0947\u0902 \u0935\u093e\u092a\u0938 \u0906\u0924\u093e \u0939\u0948 \u2014 \u092f\u093e \u0905\u092a\u0928\u0940 \u092c\u0941\u0915\u093f\u0902\u0917 \u0915\u093f\u0938\u0940 \u0905\u0928\u094d\u092f \u092d\u0915\u094d\u0924 \u0915\u094b \u0926\u0947 \u0926\u0947\u0902, \u091c\u094b \u0907\u0938\u0947 \u0905\u092a\u0928\u0947 \u0928\u093e\u092e \u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0924\u093e \u0939\u0948\u0964 \u0939\u0930 \u092c\u093f\u0932 \u0915\u094b \u0938\u0930\u094d\u0935\u0930 \u0916\u0941\u0926 \u0926\u094b\u092c\u093e\u0930\u093e \u091c\u093e\u0901\u091a\u0924\u093e \u0939\u0948, \u0907\u0938\u0932\u093f\u090f \u091c\u094b \u0915\u0940\u092e\u0924 \u0938\u092e\u093f\u0924\u093f \u0928\u0947 \u092a\u094d\u0930\u0915\u093e\u0936\u093f\u0924 \u0915\u0940, \u0935\u0939\u0940 \u0938\u092d\u0940 \u0926\u0947\u0924\u0947 \u0939\u0948\u0902\u0964",
            bn: "\u0989\u09ce\u09b8\u09ac \u098f\u0996\u09a8 \u09b8\u09c7\u09ac\u09be \u09aa\u09be\u09b8 \u09a6\u09bf\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u0964 \u0995\u09ae\u09bf\u099f\u09bf \u09aa\u09be\u09b8\u09c7\u09b0 \u09a7\u09b0\u09a8 \u09a0\u09bf\u0995 \u0995\u09b0\u09c7 \u2014 \u09ac\u09bf\u09a8\u09be\u09ae\u09c2\u09b2\u09cd\u09af\u09c7, \u09ae\u09c2\u09b2\u09cd\u09af\u09b8\u09b9, \u0986\u0997\u09be\u09ae \u2014 \u0986\u09b0 \u099f\u09be\u0995\u09be \u09a6\u09c7\u0993\u09af\u09bc\u09be\u09b0 \u0986\u0997\u09c7\u0987 \u098f\u0995\u099f\u09bf \u09b8\u09cd\u09aa\u09b7\u09cd\u099f \u09ab\u09c7\u09b0\u09a4\u09c7\u09b0 \u09aa\u09cd\u09b0\u09a4\u09bf\u09b6\u09cd\u09b0\u09c1\u09a4\u09bf \u09aa\u09cd\u09b0\u0995\u09be\u09b6\u09bf\u09a4 \u09b9\u09af\u09bc\u0964 \u09aa\u09b0\u09bf\u09ac\u09be\u09b0 \u098f\u0995\u09b8\u0999\u09cd\u0997\u09c7 \u09ac\u09c1\u0995 \u0995\u09b0\u09c7: \u098f\u0995\u099c\u09a8 \u099f\u09be\u0995\u09be \u09a6\u09c7\u09a8, \u09aa\u09cd\u09b0\u09a4\u09cd\u09af\u09c7\u0995 \u0985\u0982\u09b6\u0997\u09cd\u09b0\u09b9\u09a3\u0995\u09be\u09b0\u09c0\u09b0 \u09a8\u09be\u09ae \u09a5\u09be\u0995\u09c7, \u0986\u09b0 \u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u0995\u09b0\u09be\u09b0 \u0986\u0997\u09c7 \u09aa\u09c1\u09b0\u09cb \u09ac\u09bf\u09b2 \u09b2\u09be\u0987\u09a8 \u09a7\u09b0\u09c7 \u09a6\u09c7\u0996\u09be \u09af\u09be\u09af\u09bc (\u09aa\u09be\u09b8\u09c7\u09b0 \u09a6\u09be\u09ae, \u099b\u09be\u09a1\u09bc, \u09ab\u09bf, \u0995\u09b0) \u2014 \u09b6\u09c7\u09b7\u09c7 \u0995\u09cb\u09a8\u09cb \u099a\u09ae\u0995 \u09a8\u09c7\u0987\u0964 \u09b8\u09c7\u09ac\u09be \u0993\u09af\u09bc\u09be\u09b2\u09c7\u099f \u09a5\u09c7\u0995\u09c7 \u09ac\u09be \u0985\u09a8\u09c1\u09b7\u09cd\u09a0\u09be\u09a8\u09b8\u09cd\u09a5\u09b2\u09c7 \u099f\u09be\u0995\u09be \u09a6\u09bf\u09a8\u0964 \u09aa\u09b0\u09bf\u0995\u09b2\u09cd\u09aa\u09a8\u09be \u09ac\u09a6\u09b2\u09c7\u099b\u09c7? \u09b8\u09c7\u0987 \u09aa\u09cd\u09b0\u0995\u09be\u09b6\u09bf\u09a4 \u09aa\u09cd\u09b0\u09a4\u09bf\u09b6\u09cd\u09b0\u09c1\u09a4\u09bf\u09a4\u09c7\u0987 \u09ac\u09be\u09a4\u09bf\u09b2 \u0995\u09b0\u09c1\u09a8 \u2014 \u09ab\u09c7\u09b0\u09a4 \u0993\u09af\u09bc\u09be\u09b2\u09c7\u099f\u09c7 \u09ab\u09bf\u09b0\u09c7 \u0986\u09b8\u09c7 \u2014 \u09ac\u09be \u0986\u09aa\u09a8\u09be\u09b0 \u09ac\u09c1\u0995\u09bf\u0982 \u0985\u09a8\u09cd\u09af \u09ad\u0995\u09cd\u09a4\u0995\u09c7 \u09a6\u09bf\u09a8, \u09a4\u09bf\u09a8\u09bf \u09a8\u09bf\u099c\u09c7\u09b0 \u09a8\u09be\u09ae\u09c7 \u0997\u09cd\u09b0\u09b9\u09a3 \u0995\u09b0\u09c7\u09a8\u0964 \u09aa\u09cd\u09b0\u09a4\u09cd\u09af\u09c7\u0995 \u09ac\u09bf\u09b2 \u09b8\u09be\u09b0\u09cd\u09ad\u09be\u09b0 \u09a8\u09bf\u099c\u09c7 \u09af\u09be\u099a\u09be\u0987 \u0995\u09b0\u09c7, \u09a4\u09be\u0987 \u0995\u09ae\u09bf\u099f\u09bf \u09af\u09c7 \u09a6\u09be\u09ae \u09aa\u09cd\u09b0\u0995\u09be\u09b6 \u0995\u09b0\u09c7\u099b\u09c7 \u09b8\u09ac\u09be\u0987 \u09b8\u09c7\u0987 \u09a6\u09be\u09ae\u0987 \u09a6\u09c7\u09a8\u0964",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.21-50603a2',
    date: '2026-11-21',
    sections: {
      new: [
        {
          text: {
            en: "Festival entry is now a pass, not a queue argument. When your RSVP for a festival day is confirmed, your event pass appears right there with a QR code in your name. At the gate, the sevadar scans it once \u2014 admitted \u2014 and the same pass can never be used twice for that day; if a phone is lost, the gate can find you by name instead. The gate works without internet, and its count is the same count the festival War Room sees, so the committee and the gate are never telling two different stories.",
            hi: "\u0909\u0924\u094d\u0938\u0935 \u0915\u093e \u092a\u094d\u0930\u0935\u0947\u0936 \u0905\u092c \u0915\u0924\u093e\u0930 \u0915\u0940 \u092c\u0939\u0938 \u0928\u0939\u0940\u0902, \u090f\u0915 \u092a\u093e\u0938 \u0939\u0948\u0964 \u091c\u092c \u0915\u093f\u0938\u0940 \u0909\u0924\u094d\u0938\u0935-\u0926\u093f\u0928 \u0915\u0947 \u0932\u093f\u090f \u0906\u092a\u0915\u093e RSVP \u092a\u0915\u094d\u0915\u093e \u0939\u094b \u091c\u093e\u0924\u093e \u0939\u0948, \u0924\u094b \u0906\u092a\u0915\u093e \u0907\u0935\u0947\u0902\u091f \u092a\u093e\u0938 \u0906\u092a\u0915\u0947 \u0928\u093e\u092e \u0915\u0947 QR \u0915\u094b\u0921 \u0915\u0947 \u0938\u093e\u0925 \u0935\u0939\u0940\u0902 \u0926\u093f\u0916\u0924\u093e \u0939\u0948\u0964 \u0926\u094d\u0935\u093e\u0930 \u092a\u0930 \u0938\u0947\u0935\u093e\u0926\u093e\u0930 \u0907\u0938\u0947 \u090f\u0915 \u092c\u093e\u0930 \u0938\u094d\u0915\u0948\u0928 \u0915\u0930\u0924\u093e \u0939\u0948 \u2014 \u092a\u094d\u0930\u0935\u0947\u0936 \u092e\u093f\u0932\u093e \u2014 \u0914\u0930 \u0935\u0939\u0940 \u092a\u093e\u0938 \u0909\u0938 \u0926\u093f\u0928 \u0926\u094b\u092c\u093e\u0930\u093e \u0915\u092d\u0940 \u0928\u0939\u0940\u0902 \u091a\u0932 \u0938\u0915\u0924\u093e; \u092b\u093c\u094b\u0928 \u0916\u094b \u091c\u093e\u090f \u0924\u094b \u0926\u094d\u0935\u093e\u0930 \u0906\u092a\u0915\u094b \u0928\u093e\u092e \u0938\u0947 \u0922\u0942\u0902\u0922 \u0938\u0915\u0924\u093e \u0939\u0948\u0964 \u0926\u094d\u0935\u093e\u0930 \u0907\u0902\u091f\u0930\u0928\u0947\u091f \u0915\u0947 \u092c\u093f\u0928\u093e \u091a\u0932\u0924\u093e \u0939\u0948, \u0914\u0930 \u0909\u0938\u0915\u0940 \u0917\u093f\u0928\u0924\u0940 \u0935\u0939\u0940 \u0939\u0948 \u091c\u094b \u0909\u0924\u094d\u0938\u0935 War Room \u0926\u0947\u0916\u0924\u093e \u0939\u0948 \u2014 \u0938\u092e\u093f\u0924\u093f \u0914\u0930 \u0926\u094d\u0935\u093e\u0930 \u0915\u092d\u0940 \u0926\u094b \u0905\u0932\u0917 \u0915\u0939\u093e\u0928\u093f\u092f\u093e\u0901 \u0928\u0939\u0940\u0902 \u0938\u0941\u0928\u093e\u0924\u0947\u0964",
            bn: "\u0989\u09ce\u09b8\u09ac\u09c7 \u09aa\u09cd\u09b0\u09ac\u09c7\u09b6 \u098f\u0996\u09a8 \u09b2\u09be\u0987\u09a8\u09c7\u09b0 \u09a4\u09b0\u09cd\u0995 \u09a8\u09af\u09bc, \u098f\u0995\u099f\u09bf \u09aa\u09be\u09b8\u0964 \u09af\u09c7\u09a6\u09bf\u09a8\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u0986\u09aa\u09a8\u09be\u09b0 RSVP \u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4 \u09b9\u09b2\u09c7\u0987 \u0986\u09aa\u09a8\u09be\u09b0 \u09a8\u09be\u09ae\u09c7\u09b0 QR \u0995\u09cb\u09a1\u09b8\u09b9 \u0987\u09ad\u09c7\u09a8\u09cd\u099f \u09aa\u09be\u09b8\u099f\u09bf \u09b8\u09c7\u0996\u09be\u09a8\u09c7\u0987 \u09a6\u09c7\u0996\u09be \u09af\u09be\u09af\u09bc\u0964 \u09a6\u09b0\u099c\u09be\u09af\u09bc \u09b8\u09c7\u09ac\u09be\u09a6\u09be\u09b0 \u098f\u0995\u09ac\u09be\u09b0 \u09b8\u09cd\u0995\u09cd\u09af\u09be\u09a8 \u0995\u09b0\u09c7\u09a8 \u2014 \u09aa\u09cd\u09b0\u09ac\u09c7\u09b6 \u09ae\u09bf\u09b2\u09b2 \u2014 \u0986\u09b0 \u09b8\u09c7\u0987 \u09aa\u09be\u09b8 \u09b8\u09c7\u09a6\u09bf\u09a8 \u0986\u09b0 \u0995\u0996\u09a8\u09cb \u099a\u09b2\u09ac\u09c7 \u09a8\u09be; \u09ab\u09cb\u09a8 \u09b9\u09be\u09b0\u09bf\u09af\u09bc\u09c7 \u0997\u09c7\u09b2\u09c7 \u09a6\u09b0\u099c\u09be \u0986\u09aa\u09a8\u09be\u0995\u09c7 \u09a8\u09be\u09ae \u09a7\u09b0\u09c7 \u0996\u09c1\u0981\u099c\u09c7 \u09a6\u09bf\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u0964 \u09a6\u09b0\u099c\u09be \u0987\u09a8\u09cd\u099f\u09be\u09b0\u09a8\u09c7\u099f \u099b\u09be\u09a1\u09bc\u09be\u0987 \u099a\u09b2\u09c7, \u0986\u09b0 \u09a4\u09be\u09b0 \u0997\u09a3\u09a8\u09be \u09b9\u09c1\u09ac\u09b9\u09c1 \u09b8\u09c7\u0987 \u0997\u09a3\u09a8\u09be \u09af\u09be \u0989\u09ce\u09b8\u09ac War Room \u09a6\u09c7\u0996\u09c7 \u2014 \u0995\u09ae\u09bf\u099f\u09bf \u0993 \u09a6\u09b0\u099c\u09be \u0995\u0996\u09a8\u09cb \u09a6\u09c1\u099f\u09cb \u0986\u09b2\u09be\u09a6\u09be \u0997\u09b2\u09cd\u09aa \u09ac\u09b2\u09c7 \u09a8\u09be\u0964",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.21-627163d',
    date: '2026-11-21',
    sections: {
      new: [
        {
          text: {
            en: "Your observances can now follow the moon itself. Create an event once \u2014 Ekadashi, Purnima, Amavasya, Pradosh, Sankashti, or any tithi you choose \u2014 and the app finds every matching day in both pakshas from the same Panjika that powers your calendar, showing it on your temple's public page, in Sangam and in your own space, always in agreement. Calendar exports honestly note 'Recurs by tithi', because the lunar rhythm is older than any calendar file.",
            hi: "\u0905\u092c \u0906\u092a\u0915\u0947 \u0935\u094d\u0930\u0924 \u0914\u0930 \u092a\u0930\u094d\u0935 \u091a\u0902\u0926\u094d\u0930\u092e\u093e \u0915\u0947 \u0938\u093e\u0925 \u091a\u0932 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964 \u090f\u0915 \u092c\u093e\u0930 \u0906\u092f\u094b\u091c\u0928 \u092c\u0928\u093e\u090f\u0901 \u2014 \u090f\u0915\u093e\u0926\u0936\u0940, \u092a\u0942\u0930\u094d\u0923\u093f\u092e\u093e, \u0905\u092e\u093e\u0935\u0938\u094d\u092f\u093e, \u092a\u094d\u0930\u0926\u094b\u0937, \u0938\u0902\u0915\u0937\u094d\u091f\u0940 \u092f\u093e \u0906\u092a\u0915\u0940 \u091a\u0941\u0928\u0940 \u0915\u094b\u0908 \u092d\u0940 \u0924\u093f\u0925\u093f \u2014 \u0914\u0930 \u0910\u092a \u0909\u0938\u0940 \u092a\u0902\u091a\u093e\u0902\u0917 \u0938\u0947, \u091c\u094b \u0906\u092a\u0915\u0947 \u0915\u0948\u0932\u0947\u0902\u0921\u0930 \u0915\u094b \u091a\u0932\u093e\u0924\u093e \u0939\u0948, \u0926\u094b\u0928\u094b\u0902 \u092a\u0915\u094d\u0937\u094b\u0902 \u0915\u0947 \u0939\u0930 \u092e\u0947\u0932 \u0916\u093e\u0924\u0947 \u0926\u093f\u0928 \u0915\u094b \u0922\u0942\u0902\u0922 \u0932\u0947\u0917\u093e \u2014 \u092e\u0902\u0926\u093f\u0930 \u0915\u0947 \u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u092a\u0943\u0937\u094d\u0920, \u0938\u0902\u0917\u092e \u0914\u0930 \u0906\u092a\u0915\u0947 \u0905\u092a\u0928\u0947 \u0938\u094d\u0925\u093e\u0928 \u092a\u0930, \u0939\u092e\u0947\u0936\u093e \u090f\u0915 \u0938\u093e\u0925\u0964 \u0915\u0948\u0932\u0947\u0902\u0921\u0930 \u0928\u093f\u0930\u094d\u092f\u093e\u0924 \u0908\u092e\u093e\u0928\u0926\u093e\u0930\u0940 \u0938\u0947 'Recurs by tithi' \u0932\u093f\u0916\u0924\u093e \u0939\u0948, \u0915\u094d\u092f\u094b\u0902\u0915\u093f \u091a\u0902\u0926\u094d\u0930 \u0915\u0940 \u0932\u092f \u0915\u093f\u0938\u0940 \u092d\u0940 \u0915\u0948\u0932\u0947\u0902\u0921\u0930 \u092b\u093c\u093e\u0907\u0932 \u0938\u0947 \u092a\u0941\u0930\u093e\u0928\u0940 \u0939\u0948\u0964",
            bn: "\u098f\u0996\u09a8 \u0986\u09aa\u09a8\u09be\u09b0 \u09ac\u09cd\u09b0\u09a4 \u0993 \u09aa\u09b0\u09cd\u09ac \u099a\u09be\u0981\u09a6\u09c7\u09b0 \u09b8\u0999\u09cd\u0997\u09c7\u0987 \u099a\u09b2\u09a4\u09c7 \u09aa\u09be\u09b0\u09c7\u0964 \u098f\u0995\u09ac\u09be\u09b0 \u0985\u09a8\u09c1\u09b7\u09cd\u09a0\u09be\u09a8 \u09a4\u09c8\u09b0\u09bf \u0995\u09b0\u09c1\u09a8 \u2014 \u098f\u0995\u09be\u09a6\u09b6\u09c0, \u09aa\u09c2\u09b0\u09cd\u09a3\u09bf\u09ae\u09be, \u0985\u09ae\u09be\u09ac\u09b8\u09cd\u09af\u09be, \u09aa\u09cd\u09b0\u09a6\u09cb\u09b7, \u09b8\u0982\u0995\u09b7\u09cd\u099f\u09c0 \u09ac\u09be \u0986\u09aa\u09a8\u09be\u09b0 \u09ac\u09be\u099b\u09be \u09af\u09c7\u0995\u09cb\u09a8\u09cb \u09a4\u09bf\u09a5\u09bf \u2014 \u0986\u09b0 \u0985\u09cd\u09af\u09be\u09aa \u09b8\u09c7\u0987 \u09aa\u099e\u09cd\u099c\u09bf\u0995\u09be \u09a5\u09c7\u0995\u09c7, \u09af\u09be \u0986\u09aa\u09a8\u09be\u09b0 \u0995\u09cd\u09af\u09be\u09b2\u09c7\u09a8\u09cd\u09a1\u09be\u09b0 \u099a\u09be\u09b2\u09be\u09af\u09bc, \u09a6\u09c1\u0987 \u09aa\u0995\u09cd\u09b7\u09c7\u09b0\u0987 \u09aa\u09cd\u09b0\u09a4\u09bf\u099f\u09bf \u09ae\u09c7\u09b2 \u0996\u09be\u09cb\u0981\u099c\u09be \u09a6\u09bf\u09a8 \u0996\u09c1\u0981\u099c\u09c7 \u09a6\u09c7\u09ac\u09c7 \u2014 \u09ae\u09a8\u09cd\u09a6\u09bf\u09b0\u09c7\u09b0 \u09aa\u09be\u09ac\u09b2\u09bf\u0995 \u09aa\u09c7\u099c\u09c7, \u09b8\u0999\u09cd\u0997\u09ae\u09c7 \u0993 \u0986\u09aa\u09a8\u09be\u09b0 \u09a8\u09bf\u099c\u09c7\u09b0 \u099c\u09be\u09af\u09bc\u0997\u09be\u09af\u09bc, \u09b8\u09ac\u09b8\u09ae\u09af\u09bc \u098f\u0995\u09ae\u09a4\u0964 \u0995\u09cd\u09af\u09be\u09b2\u09c7\u09a8\u09cd\u09a1\u09be\u09b0 \u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f\u09c7 \u09b8\u09a4\u09a4\u09be\u09b0 \u09b8\u0999\u09cd\u0997\u09c7 'Recurs by tithi' \u09b2\u09c7\u0996\u09be \u09a5\u09be\u0995\u09c7, \u0995\u09be\u09b0\u09a3 \u099a\u09a8\u09cd\u09a6\u09cd\u09b0\u09c7\u09b0 \u099b\u09a8\u09cd\u09a6 \u09af\u09c7\u0995\u09cb\u09a8\u09cb \u0995\u09cd\u09af\u09be\u09b2\u09c7\u09a8\u09cd\u09a1\u09be\u09b0 \u09ab\u09be\u0987\u09b2\u09c7\u09b0 \u099a\u09c7\u09af\u09bc\u09c7 \u09aa\u09cd\u09b0\u09be\u099a\u09c0\u09a8\u0964",
          },
        },
      ],
      improved: [
        {
          text: {
            en: "Festival committees: last year's festival is now this year's starting point. In Utsav, 'Copy for next year' carries the plan forward \u2014 dates moved a year ahead, the budget plan kept with actual spending reset to zero, the checklist reopened \u2014 while last year's vendor payments and gate counts stay in last year's record, where they belong.",
            hi: "\u0909\u0924\u094d\u0938\u0935 \u0938\u092e\u093f\u0924\u093f\u092f\u094b\u0902 \u0915\u0947 \u0932\u093f\u090f: \u092a\u093f\u091b\u0932\u0947 \u0935\u0930\u094d\u0937 \u0915\u093e \u0909\u0924\u094d\u0938\u0935 \u0905\u092c \u0907\u0938 \u0935\u0930\u094d\u0937 \u0915\u0940 \u0936\u0941\u0930\u0941\u0906\u0924 \u0939\u0948\u0964 \u0909\u0924\u094d\u0938\u0935 \u092e\u0947\u0902 'Copy for next year' \u092f\u094b\u091c\u0928\u093e \u0915\u094b \u0906\u0917\u0947 \u0932\u0947 \u091c\u093e\u0924\u093e \u0939\u0948 \u2014 \u0924\u093e\u0930\u0940\u0916\u0947\u0902 \u090f\u0915 \u0935\u0930\u094d\u0937 \u0906\u0917\u0947, \u092c\u091c\u091f \u092f\u094b\u091c\u0928\u093e \u0935\u0948\u0938\u0940 \u0915\u0940 \u0935\u0948\u0938\u0940 \u0914\u0930 \u0935\u093e\u0938\u094d\u0924\u0935\u093f\u0915 \u0916\u0930\u094d\u091a \u0936\u0942\u0928\u094d\u092f \u0938\u0947, \u091c\u093e\u0902\u091a-\u0938\u0942\u091a\u0940 \u092b\u093f\u0930 \u0938\u0947 \u0916\u0941\u0932\u0940 \u2014 \u091c\u092c\u0915\u093f \u092a\u093f\u091b\u0932\u0947 \u0935\u0930\u094d\u0937 \u0915\u0947 \u0935\u093f\u0915\u094d\u0930\u0947\u0924\u093e \u092d\u0941\u0917\u0924\u093e\u0928 \u0914\u0930 \u0926\u094d\u0935\u093e\u0930 \u0917\u093f\u0928\u0924\u0940 \u092a\u093f\u091b\u0932\u0947 \u0935\u0930\u094d\u0937 \u0915\u0947 \u0930\u093f\u0915\u0949\u0930\u094d\u0921 \u092e\u0947\u0902 \u0939\u0940 \u0930\u0939\u0924\u0947 \u0939\u0948\u0902, \u091c\u0939\u093e\u0902 \u0909\u0928\u0915\u0940 \u091c\u0917\u0939 \u0939\u0948\u0964",
            bn: "\u0989\u09ce\u09b8\u09ac \u0995\u09ae\u09bf\u099f\u09bf\u0997\u09c1\u09b2\u09cb\u09b0 \u099c\u09a8\u09cd\u09af: \u0997\u09a4 \u09ac\u099b\u09b0\u09c7\u09b0 \u0989\u09ce\u09b8\u09ac \u098f\u0996\u09a8 \u098f\u09ac\u099b\u09b0\u09c7\u09b0 \u09b6\u09c1\u09b0\u09c1\u0964 \u0989\u09ce\u09b8\u09ac\u09c7 'Copy for next year' \u09aa\u09b0\u09bf\u0995\u09b2\u09cd\u09aa\u09a8\u09be\u0995\u09c7 \u098f\u0997\u09bf\u09af\u09bc\u09c7 \u09a8\u09c7\u09af\u09bc \u2014 \u09a4\u09be\u09b0\u09bf\u0996 \u098f\u0995 \u09ac\u099b\u09b0 \u09aa\u09b0\u09c7, \u09ac\u09be\u099c\u09c7\u099f \u09aa\u09b0\u09bf\u0995\u09b2\u09cd\u09aa\u09a8\u09be \u09af\u09c7\u09ae\u09a8 \u099b\u09bf\u09b2 \u09a4\u09c7\u09ae\u09a8\u0987 \u0986\u09b0 \u09aa\u09cd\u09b0\u0995\u09c3\u09a4 \u0996\u09b0\u099a \u09b6\u09c2\u09a8\u09cd\u09af \u09a5\u09c7\u0995\u09c7, \u099a\u09c7\u0995\u09b2\u09bf\u09b8\u09cd\u099f \u0986\u09ac\u09be\u09b0 \u0996\u09cb\u09b2\u09be \u2014 \u0986\u09b0 \u0997\u09a4 \u09ac\u099b\u09b0\u09c7\u09b0 \u09ac\u09bf\u0995\u09cd\u09b0\u09c7\u09a4\u09be\u09b0 \u09aa\u09be\u0993\u09a8\u09be \u0993 \u09a6\u09b0\u099c\u09be\u09b0 \u0997\u09a3\u09a8\u09be \u09a5\u09be\u0995\u09c7 \u0997\u09a4 \u09ac\u099b\u09b0\u09c7\u09b0 \u09b0\u09c7\u0995\u09b0\u09cd\u09a1\u09c7\u0987, \u09af\u09c7\u0996\u09be\u09a8\u09c7 \u09a4\u09be\u09a6\u09c7\u09b0 \u099c\u09be\u09af\u09bc\u0997\u09be\u0964",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.17-54d83fa',
    date: '2026-11-17',
    sections: {
      improved: [
        {
          text: {
            en: "The temple doors gained stronger locks you will never see: the app now sends strict browser security headers with every page — other sites can no longer frame the app inside their own pages, files cannot be disguised as a different type, and only the app itself may use your camera, microphone and location. A new content-security policy also watches in report-only mode, learning quietly before it ever blocks anything.",
            hi: "मंदिर के द्वारों को अदृश्य मज़बूत ताले मिले हैं: ऐप अब हर पेज के साथ कठोर ब्राउज़र सुरक्षा हेडर भेजता है — दूसरी साइटें ऐप को अपने पेजों के अंदर नहीं घेर सकतीं, फ़ाइलों का प्रकार नहीं छिपाया जा सकता, और कैमरा, माइक्रोफ़ोन व स्थान केवल ऐप ही उपयोग कर सकता है। एक नई सामग्री-सुरक्षा नीति रिपोर्ट-मात्र मोड में चुपचाप निगरानी भी करती है — कुछ भी रोकने से पहले वह पहले सीखती है।",
            bn: "মন্দিরের দরজায় অদৃশ্য শক্ত তালা লাগল: অ্যাপ এখন প্রতিটি পৃষ্ঠার সঙ্গে কঠোর ব্রাউজার-নিরাপত্তা হেডার পাঠায় — অন্য সাইটগুলি আর অ্যাপকে নিজেদের পৃষ্ঠার ভিতরে ফ্রেম করতে পারবে না, ফাইলের ধরন লুকানো যাবে না, এবং ক্যামেরা, মাইক্রোফোন ও অবস্থান শুধু অ্যাপই ব্যবহার করতে পারবে। একটি নতুন কনটেন্ট-নিরাপত্তা নীতিও রিপোর্ট-মাত্র মোডে নিঃশব্দে পর্যবেক্ষণ করছে — কিছু আটকানোর আগে সে প্রথমে শিখে নিচ্ছে।",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.14-0b3267d',
    date: '2026-11-14',
    sections: {
      improved: [
        {
          text: {
            en: "The busiest desks now share one hand: the treasury, the Bahi-Khata register, and the marketplace draw their buttons and switchers from the same house kit, so the whole app feels cut from one cloth — same labels, same taps, nothing about how they work has changed.",
            hi: "सबसे व्यस्त डेस्क अब एक ही हाथ साझा करते हैं: कोषागार, बहिखाता रजिस्टर और बाज़ार अपने बटन और स्विचर एक ही घरेलू किट से लेते हैं, इसलिए पूरा ऐप एक ही कपड़े से कटा लगता है — वही लेबल, वही टैप, काम करने का तरीका बिल्कुल नहीं बदला।",
            bn: "সবচেয়ে ব্যস্ত ডেস্কগুলি এখন একই হাত ভাগ করে: কোষাগার, বহিখাতা রেজিস্টার আর বাজার তাদের বোতাম ও সুইচার একই গৃহ-কিট থেকে নেয়, তাই পুরো অ্যাপটি একই কাপড়ে কাটা মনে হয় — একই লেবেল, একই ছোঁয়া, কাজের ধরনে কোনো বদল নেই।",
          },
        },
        {
          text: {
            en: "Money now speaks in the temple's own type: totals on the Hundi counting desk, the Ratna Bhandar, procurement, and the treasury stand in calm tabular figures — the same type as your Day Band — while the typewriter style remains only where it belongs, on seal codes and reference numbers.",
            hi: "धन अब मंदिर की अपनी लिपि में बोलता है: हुंडी गिनती डेस्क, रत्न भंडार, ख़रीद और कोषागार के योग शांत सारणीबद्ध अंकों में खड़े हैं — वही लिपि जो आपके डे बैंड की है — जबकि टाइपराइटर शैली केवल वहीं रहती है जहाँ उसका स्थान है, मुहर कोड और संदर्भ संख्याओं पर।",
            bn: "অর্থ এখন মন্দিরের নিজের হরফে কথা বলে: হুন্ডি গোনার ডেস্ক, রত্ন ভাণ্ডার, কেনাকাটা আর কোষাগারের যোগফল শান্ত সারণিবদ্ধ অঙ্কে দাঁড়ায় — আপনার ডে ব্যান্ডের সেই একই হরফ — আর টাইপরাইটার ধরনটি থাকে শুধু সেখানেই যেখানে তার স্থান, সিল কোড আর রেফারেন্স নম্বরে।",
          },
        },
      ],
    },
  },
  {
    version: 'v2026.11.14-5c550f5',
    date: '2026-11-14',
    sections: {
      improved: [
        {
          text: {
            en: "A calmer welcome: first visits now open straight onto the page — the language choice waits quietly under the header until you tap it, instead of arriving as a popup. And the little tour hint steps aside whenever a sheet or tour is open, and once you dismiss it, it never returns.",
            hi: "शांत स्वागत: अब पहली बार आने पर पृष्ठ सीधे खुलता है — भाषा का विकल्प पॉपअप बनकर आने के बजाय शीर्षक के नीचे शांति से प्रतीक्षा करता है, जब आप छुएँ तभी खुलता है। और छोटा-सा भ्रमण-संकेत, जब कोई शीट या भ्रमण खुला हो तो हट जाता है, और एक बार हटाने पर फिर कभी नहीं लौटता।",
            bn: "শান্ত স্বাগত: এখন প্রথমবার এলে পৃষ্ঠটি সরাসরি খোলে — ভাষার পছন্দ পপআপ হয়ে আসার বদলে শিরোনামের নিচে শান্তভাবে অপেক্ষা করে, আপনি ছুঁলেই খোলে। আর ছোট্ট ভ্রমণ-ইঙ্গিতটি, কোনো শিট বা ভ্রমণ খোলা থাকলে সরে যায়, এবং একবার সরালে আর কখনো ফেরে না।",
          },
        },
        {
          text: {
            en: "A temple's public page — the one it shares with the world — now wears the same warm ivory and brass as the app itself, with its Verified mark and Transparency Board right in the header. The desk counts and the footer now speak plainly, and agree with each other, everywhere.",
            hi: "मंदिर का सार्वजनिक पृष्ठ — जो वह संसार के साथ साझा करता है — अब ऐप जैसा ही गर्म हाथी-दांत और पीतल का रंग धारण करता है, उसके सत्यापित चिह्न और पारदर्शिता पट्ट शीर्षक में ही। डेस्क की गिनती और पाद-लेख अब हर जगह एक ही, स्पष्ट बात कहते हैं।",
            bn: "মন্দিরের সর্বজনীন পৃষ্ঠ — যেটি সে বিশ্বের সঙ্গে ভাগ করে — এখন অ্যাপের মতোই উষ্ণ হাতির-দাঁত ও পিতলের রঙ ধারণ করেছে, তার যাচাইকৃত চিহ্ন ও স্বচ্ছতা পর্ষদ শিরোনামেই। ডেস্কের সংখ্যা ও পাদটীকা এখন সর্বত্র একই, স্পষ্ট কথা বলে।",
          },
        },
      ],
    },
  },
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
