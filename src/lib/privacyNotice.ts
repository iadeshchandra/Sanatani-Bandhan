/**
 * privacyNotice.ts — Blueprint D, deliverable 7: the short, warm,
 * genuinely-readable privacy notice + its version-stamp consent
 * check (pure content + logic, no React, no Firebase).
 * ============================================================================
 * Research §5: "DPDP-style plain-language consent in the user's own
 * language; withdrawal as easy as giving." The long legal privacy
 * policy already exists on the public pages. This is the IN-APP
 * companion: one screen a devotee can actually read, in their own
 * language, that tells the truth in plain words —
 *
 *   · what the app stores, and where (their devices + Firebase);
 *   · what is NEVER public (the personal wallet, private records);
 *   · what a trustee publishing means (Blueprint A: nothing is
 *     public until a trustee deliberately publishes a month's
 *     accounts, and what is published carries no names);
 *   · the assisted-mode disclosure (Blueprint D: help is declared,
 *     and the record shows whose hands helped);
 *   · which choices are REAL choices (Suchana categories, quiet
 *     hours — changeable anytime) and which are not choices at all
 *     (an account cannot work without storing the account's data —
 *     stated plainly, never dressed up as consent theatre).
 *
 * The version stamp: the notice carries a version; each user's
 * device records the version they have seen. When the version
 * bumps, they see WHAT CHANGED once — one calm screen, never a
 * nag loop. Declining is honest where a choice is real: the gate's
 * secondary action is "Not now" (the notice stays reachable from
 * Profile/Settings forever); there is no fake "reject all" for the
 * storage the account itself requires.
 */

export interface TriText {
  en: string;
  bn: string;
  hi: string;
}

export const PRIVACY_NOTICE_VERSION = 1;

export interface PrivacySection {
  id: string;
  title: TriText;
  body: TriText;
}

export const PRIVACY_NOTICE_SECTIONS: PrivacySection[] = [
  {
    id: 'what',
    title: {
      en: 'What Sanatani Bandhan keeps',
      bn: 'সনাতনী বন্ধন যা রাখে',
      hi: 'सनातनी बंधन क्या रखता है',
    },
    body: {
      en: 'Your profile, your sadhana and seva records, and — for organisations — the member register, bookings, treasury ledger and settings you enter. If you never type it in, the app does not have it.',
      bn: 'আপনার প্রোফাইল, সাধনা ও সেবার রেকর্ড, এবং সংগঠনের ক্ষেত্রে — সদস্য তালিকা, বুকিং, কোষাগারের খাতা ও আপনার দেওয়া সেটিংস। যা আপনি কখনো লিখে দেননি, তা অ্যাপের কাছে নেই।',
      hi: 'आपकी प्रोफ़ाइल, आपकी साधना व सेवा के रिकॉर्ड, और संगठनों के लिए — सदस्य सूची, बुकिंग, कोषागार खाता व आपकी दी गई सेटिंग्स। जो आपने कभी लिखा ही नहीं, वह ऐप के पास नहीं है।',
    },
  },
  {
    id: 'where',
    title: {
      en: 'Where it lives',
      bn: 'এটি থাকে কোথায়',
      hi: 'यह रहता कहाँ है',
    },
    body: {
      en: 'On your own device first (so the app works without internet), and in the organisation\u2019s Firebase cloud account so your team shares the same records. Nothing is kept on paper servers or sold anywhere — there are no ads and no data sales in this app.',
      bn: 'প্রথমে আপনার নিজের ডিভাইসে (যাতে ইন্টারনেট ছাড়াও অ্যাপ চলে), এবং সংগঠনের Firebase ক্লাউড অ্যাকাউন্টে, যাতে আপনার দল একই রেকর্ড ভাগ করে নিতে পারে। কিছুই অন্য কোথাও রাখা হয় না বা বিক্রি হয় না — এই অ্যাপে কোনো বিজ্ঞাপন নেই, ডেটা বিক্রিও নেই।',
      hi: 'पहले आपके अपने डिवाइस पर (ताकि ऐप बिना इंटरनेट के भी चले), और संगठन के Firebase क्लाउड खाते में, ताकि आपकी टीम एक ही रिकॉर्ड साझा कर सके। कुछ भी कहीं और नहीं रखा जाता और न बेचा जाता है — इस ऐप में कोई विज्ञापन नहीं है, कोई डेटा-बिक्री नहीं है।',
    },
  },
  {
    id: 'never-public',
    title: {
      en: 'What is never public',
      bn: 'যা কখনো প্রকাশ্য নয়',
      hi: 'जो कभी सार्वजनिक नहीं होता',
    },
    body: {
      en: 'Your Personal Wallet (your private IOU notes between people), your personal sadhana, your phone number and your private records are never published, never shown to other devotees, and never leave your account. Organisation members see only what their role needs — a sevadar cannot open the treasury, and nobody outside the organisation sees its books.',
      bn: 'আপনার ব্যক্তিগত ওয়ালেট (মানুষের মধ্যে আপনার ব্যক্তিগত ধার-দেনার নোট), ব্যক্তিগত সাধনা, ফোন নম্বর ও ব্যক্তিগত রেকর্ড কখনো প্রকাশিত হয় না, অন্য ভক্তদের দেখানো হয় না, আপনার অ্যাকাউন্টের বাইরে যায় না। সংগঠনের সদস্যরা শুধু তাদের ভূমিকার জন্য যা দরকার তাই দেখেন — একজন সেবাদার কোষাগার খুলতে পারেন না, আর সংগঠনের বাইরের কেউ এর খাতা দেখতে পান না।',
      hi: 'आपका व्यक्तिगत वॉलेट (लोगों के बीच आपके निजी लेन-देन के नोट), आपकी व्यक्तिगत साधना, फ़ोन नंबर व निजी रिकॉर्ड कभी प्रकाशित नहीं होते, अन्य भक्तों को नहीं दिखाए जाते, आपके खाते से बाहर नहीं जाते। संगठन के सदस्य केवल वही देखते हैं जो उनकी भूमिका के लिए ज़रूरी है — एक सेवादार कोषागार नहीं खोल सकता, और संगठन के बाहर कोई इसकी बही नहीं देख सकता।',
    },
  },
  {
    id: 'publishing',
    title: {
      en: 'When a trustee publishes accounts',
      bn: 'ট্রাস্টি যখন হিসাব প্রকাশ করেন',
      hi: 'जब कोई ट्रस्टी हिसाब प्रकाशित करता है',
    },
    body: {
      en: 'Nothing about an organisation is public by itself. A trustee may deliberately publish one month\u2019s accounts to the public Transparency Board — totals and category sums only. Donor names, individual gifts and personal details are never in a published snapshot; the board shows a donor COUNT, never who gave.',
      bn: 'কোনো সংগঠনের কিছুই নিজে থেকে প্রকাশ্য নয়। একজন ট্রাস্টি ইচ্ছাকৃতভাবে এক মাসের হিসাব পাবলিক ট্রান্সপারেন্সি বোর্ডে প্রকাশ করতে পারেন — শুধু মোট অঙ্ক ও বিভাগ অনুযায়ী যোগফল। দাতার নাম, ব্যক্তিগত দান ও ব্যক্তিগত বিবরণ প্রকাশিত স্ন্যাপশটে কখনো থাকে না; বোর্ডে শুধু দাতার সংখ্যা দেখায়, কে দিয়েছেন তা নয়।',
      hi: 'किसी संगठन की कोई बात अपने आप सार्वजनिक नहीं होती। कोई ट्रस्टी जानबूझकर एक महीने का हिसाब सार्वजनिक ट्रांसपेरेंसी बोर्ड पर प्रकाशित कर सकता है — केवल कुल राशि व श्रेणी अनुसार योग। दाता के नाम, व्यक्तिगत दान व निजी विवरण प्रकाशित स्नैपशॉट में कभी नहीं होते; बोर्ड केवल दाताओं की संख्या दिखाता है, किसने दिया यह नहीं।',
    },
  },
  {
    id: 'assisted',
    title: {
      en: 'When someone helps you (assisted mode)',
      bn: 'কেউ আপনাকে সাহায্য করলে (সহায়তা মোড)',
      hi: 'जब कोई आपकी सहायता करता है (सहायता मोड)',
    },
    body: {
      en: 'If a family member or sevadar helps you on your own account, they can declare an "assisted session". While it runs, every action is honestly recorded as done by you WITH their help — their name sits beside the entry in the organisation\u2019s history. They gain no access of their own, nothing moves between accounts, and you can end the session anytime with one tap.',
      bn: 'পরিবারের কেউ বা কোনো সেবাদার আপনার নিজের অ্যাকাউন্টে সাহায্য করলে, তিনি একটি "সহায়তা সেশন" ঘোষণা করতে পারেন। এটি চলাকালীন প্রতিটি কাজ সৎভাবে লিপিবদ্ধ হয় — আপনার দ্বারা, তাঁর সহায়তায়; সংগঠনের ইতিহাসে এন্ট্রির পাশে তাঁর নাম থাকে। তিনি নিজে কোনো প্রবেশাধিকার পান না, অ্যাকাউন্টের মধ্যে কিছুই আদান-প্রদান হয় না, এবং আপনি যেকোনো সময় এক ট্যাপে সেশন শেষ করতে পারেন।',
      hi: 'यदि परिवार का कोई सदस्य या सेवादार आपके अपने खाते पर सहायता करे, तो वे एक "सहायता सत्र" घोषित कर सकते हैं। इसके चलते हर कार्य ईमानदारी से दर्ज होता है — आपके द्वारा, उनकी सहायता से; संगठन के इतिहास में प्रविष्टि के साथ उनका नाम रहता है। उन्हें अपनी कोई पहुँच नहीं मिलती, खातों के बीच कुछ नहीं जाता-आता, और आप कभी भी एक टैप में सत्र समाप्त कर सकते हैं।',
    },
  },
  {
    id: 'choices',
    title: {
      en: 'Your real choices',
      bn: 'আপনার প্রকৃত পছন্দ',
      hi: 'आपके वास्तविक विकल्प',
    },
    body: {
      en: 'Suchana (notifications) are yours to shape: each category can be on, digested or off; quiet hours and a daily limit are yours to set — and SOS alerts always reach you, because safety is not a setting. The records above are what make your account work at all, so they are not optional while the account exists; deleting your data is always available through your organisation\u2019s trustees or the support team.',
      bn: 'সূচনা (নোটিফিকেশন) আপনার মতো করে সাজানো যায়: প্রতিটি বিভাগ চালু, সারসংক্ষেপে বা বন্ধ রাখা যায়; শান্ত সময় ও দৈনিক সীমা আপনার নির্ধারণের। আর SOS সতর্কতা সবসময় পৌঁছায়, কারণ নিরাপত্তা কোনো সেটিং নয়। উপরের রেকর্ডগুলো দিয়েই আপনার অ্যাকাউন্ট চলে, তাই অ্যাকাউন্ট থাকা পর্যন্ত সেগুলো ঐচ্ছিক নয়; আপনার ডেটা মোছা সবসময় সম্ভব — সংগঠনের ট্রাস্টিদের মাধ্যমে বা সাপোর্ট দলের কাছে।',
      hi: 'सूचना (नोटिफ़िकेशन) आपके अनुसार ढलती है: हर श्रेणी चालू, सारांश में या बंद रखी जा सकती है; शांत समय व दैनिक सीमा आप तय करते हैं — और SOS चेतावनी हमेशा पहुँचती है, क्योंकि सुरक्षा कोई सेटिंग नहीं है। ऊपर के रिकॉर्ड ही आपके खाते को चलाते हैं, इसलिए जब तक खाता है वे वैकल्पिक नहीं हैं; आपका डेटा मिटाना हमेशा संभव है — अपने संगठन के ट्रस्टियों के माध्यम से या सहायता टीम से।',
    },
  },
];

/** "What changed" lines, keyed by the version they arrived in. Shown
 *  once when a user's seen version is older. */
export const PRIVACY_CHANGES: Record<number, TriText> = {
  1: {
    en: 'This is the first edition of this short notice — the full privacy policy still lives on the public pages.',
    bn: 'এটি এই সংক্ষিপ্ত নোটিশের প্রথম সংস্করণ — পূর্ণ গোপনীয়তা নীতি আগের মতোই পাবলিক পেজে আছে।',
    hi: 'यह इस संक्षिप्त सूचना का पहला संस्करण है — पूर्ण गोपनीयता नीति पहले की तरह सार्वजनिक पेजों पर है।',
  },
};

export const privacySeenKey = (uid: string) => `sb_privacy_seen_${uid || 'anon'}`;

export function privacySeenVersion(
  uid: string,
  storage: Pick<Storage, 'getItem'> | null = null
): number {
  try {
    const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    const v = s?.getItem(privacySeenKey(uid));
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function markPrivacySeen(
  uid: string,
  version: number = PRIVACY_NOTICE_VERSION,
  storage: Pick<Storage, 'setItem'> | null = null
): void {
  try {
    const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    s?.setItem(privacySeenKey(uid), String(version));
  } catch {
    /* storage unavailable — the notice may show again; it stays calm */
  }
}

/** The one-time prompt is due when the user has not seen the current
 *  version (first run: seen 0; a bump: seen < current). */
export function privacyPromptDue(
  uid: string,
  storage: Pick<Storage, 'getItem'> | null = null
): boolean {
  return privacySeenVersion(uid, storage) < PRIVACY_NOTICE_VERSION;
}

/** The "what changed" lines for every version newer than `seen`. */
export function privacyChangesSince(seen: number): TriText[] {
  return Object.keys(PRIVACY_CHANGES)
    .map(Number)
    .filter((v) => v > seen && v <= PRIVACY_NOTICE_VERSION)
    .sort((a, b) => a - b)
    .map((v) => PRIVACY_CHANGES[v]);
}
