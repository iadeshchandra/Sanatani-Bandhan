/**
 * sevaProCopy.ts — CANONICAL trilingual (EN/BN/HI) copy for the Seva
 * Professional program. Merged Phase 2 (Pratham Seva onboarding) +
 * Phase 3 (commission pre-funding) 2026-10-17: the two modules both
 * exported `SevaProLang` from different paths; they are now one.
 *
 * Conventions:
 *   sp(lang, key, {vars})  — string-keyed lookup, {var} interpolation,
 *                             falls back to English, then the key itself.
 *   sevaProCopy(lang, key, vars) — Phase-2 API, kept for compatibility
 *                             (GodMode Professionals tab).
 *
 * Tone law: warmth and dignity in every screen — verification is "your
 * sacred credentials, honored" (never KYC); money is "seva contribution"
 * (never escrow); referrals are "loving guidance" (never upselling).
 */
export type SevaProLang = 'en' | 'bn' | 'hi';

type Dict = Record<SevaProLang, string>;

const STRINGS: Record<string, Dict> = {

  /* ---- Completion ---- */
  markComplete: {
    en: 'Mark complete',
    bn: 'সম্পূর্ণ করুন',
    hi: 'पूर्ण करें',
  },
  completeBlessing: {
    en: '🪔 Seva complete. Dakshina received with gratitude.',
    bn: '🪔 সেবা সম্পূর্ণ হয়েছে। কৃতজ্ঞতার সঙ্গে দক্ষিণা গৃহীত হলো।',
    hi: '🪔 सेवा पूर्ण हुई। कृतज्ञता के साथ दक्षिणा प्राप्त हुई।',
  },
  confirmCompleteTitle: {
    en: 'Complete this seva?',
    bn: 'এই সেবাটি সম্পূর্ণ করবেন?',
    hi: 'यह सेवा पूर्ण करें?',
  },
  confirmCompleteBody: {
    en: 'Your seva contribution of {amount} will be set aside for the platform, and the seva marked complete — in one step, with no dues left behind.',
    bn: 'আপনার {amount} সেবা অবদান প্ল্যাটফর্মের জন্য আলাদা রাখা হবে, এবং সেবাটি সম্পূর্ণ হিসেবে চিহ্নিত হবে — এক ধাপেই, কোনো বকেয়া ছাড়াই।',
    hi: 'आपका {amount} सेवा योगदान प्लेटफ़ॉर्म के लिए अलग रखा जाएगा, और सेवा पूर्ण चिह्नित होगी — एक ही चरण में, कोई बकाया नहीं रहेगा।',
  },
  freeSevaNote: {
    en: 'This is one of your Pratham Seva welcome sevas — no contribution is due. 🙏',
    bn: 'এটি আপনার প্রথম সেবা স্বাগত সেবাগুলির একটি — কোনো অবদান লাগবে না। 🙏',
    hi: 'यह आपकी प्रथम सेवा स्वागत सेवाओं में से एक है — कोई योगदान देय नहीं। 🙏',
  },
  walletAfterCompletion: {
    en: 'Earning wallet after: {amount}',
    bn: 'সম্পূর্ণ হওয়ার পর আয়ের ওয়ালেট: {amount}',
    hi: 'पूर्ण होने के बाद अर्निंग वॉलेट: {amount}',
  },
  confirmCompleteCta: {
    en: 'Complete seva 🙏',
    bn: 'সেবা সম্পূর্ণ করুন 🙏',
    hi: 'सेवा पूर्ण करें 🙏',
  },
  notYet: {
    en: 'Not yet',
    bn: 'এখন নয়',
    hi: 'अभी नहीं',
  },
  completingEllipsis: {
    en: 'Completing…',
    bn: 'সম্পূর্ণ হচ্ছে…',
    hi: 'पूर्ण हो रहा है…',
  },

  /* ---- Shortfall ---- */
  shortfallTitle: {
    en: 'Almost there 🙏',
    bn: 'প্রায় হয়ে গেছে 🙏',
    hi: 'बस थोड़ा और 🙏',
  },
  shortfallBody: {
    en: 'To complete this seva with dignity, your earning wallet should hold the {amount} seva contribution in advance. It needs {shortfall} more — top up once, and every future seva completes in a single tap.',
    bn: 'মর্যাদার সঙ্গে এই সেবা সম্পূর্ণ করতে, আপনার আয়ের ওয়ালেটে {amount} সেবা অবদান আগাম থাকা উচিত। আরও {shortfall} প্রয়োজন — একবার টপ-আপ করুন, তারপর প্রতিটি সেবা এক ট্যাপেই সম্পূর্ণ হবে।',
    hi: 'गरिमा के साथ यह सेवा पूर्ण करने के लिए, आपके अर्निंग वॉलेट में {amount} सेवा योगदान पहले से होना चाहिए। {shortfall} और चाहिए — एक बार टॉप-अप करें, फिर हर सेवा एक टैप में पूर्ण होगी।',
  },
  shortfallBalance: {
    en: 'Current balance: {amount}',
    bn: 'বর্তমান ব্যালেন্স: {amount}',
    hi: 'वर्तमान बैलेंस: {amount}',
  },
  topUpEarningWallet: {
    en: 'Top up earning wallet',
    bn: 'আয়ের ওয়ালেটে টপ-আপ করুন',
    hi: 'अर्निंग वॉलेट में टॉप-अप करें',
  },

  /* ---- Wallet banner ---- */
  earningWalletTitle: {
    en: 'Your earning wallet',
    bn: 'আপনার আয়ের ওয়ালেট',
    hi: 'आपका अर्निंग वॉलेट',
  },
  walletCoversMany: {
    en: 'Covers the contribution for ~{n} more sevas',
    bn: 'আরও ~{n}টি সেবার অবদান কভার করে',
    hi: '~{n} और सेवाओं का योगदान कवर करता है',
  },
  walletCoversOne: {
    en: 'Covers your next seva’s contribution ✓',
    bn: 'আপনার পরের সেবার অবদান কভার করে ✓',
    hi: 'आपकी अगली सेवा का योगदान कवर करता है ✓',
  },
  walletCoversNone: {
    en: 'Top up to keep one-tap completion ready',
    bn: 'এক-ট্যাপে সম্পূর্ণ করার সুবিধা চালু রাখতে টপ-আপ করুন',
    hi: 'वन-टैप पूर्णता तैयार रखने के लिए टॉप-अप करें',
  },
  walletFreeSevasLeft: {
    en: '{n} welcome seva(s) contribution-free 🙏',
    bn: '{n}টি স্বাগত সেবা অবদান-মুক্ত 🙏',
    hi: '{n} स्वागत सेवा योगदान-मुक्त 🙏',
  },

  /* ---- Onboarding ---- */
  activateWalletTitle: {
    en: 'Activate your earning wallet',
    bn: 'আপনার আয়ের ওয়ালেট সক্রিয় করুন',
    hi: 'अपना अर्निंग वॉलेट सक्रिय करें',
  },
  activateWalletBody: {
    en: 'Keep a small balance ready for your seva contribution. Then every completed seva settles in one tap — no chasing, no dues, no awkwardness. A good start is {amount} (about two sevas’ contribution).',
    bn: 'আপনার সেবা অবদানের জন্য একটি ছোট ব্যালেন্স প্রস্তুত রাখুন। তাহলে প্রতিটি সম্পূর্ণ সেবা এক ট্যাপেই মিটে যাবে — কোনো তাগাদা নয়, কোনো বকেয়া নয়। ভালো শুরু হলো {amount} (প্রায় দুটি সেবার অবদান)।',
    hi: 'अपने सेवा योगदान के लिए एक छोटा बैलेंस तैयार रखें। फिर हर पूर्ण सेवा एक टैप में निपट जाएगी — कोई तकादा नहीं, कोई बकाया नहीं। अच्छी शुरुआत है {amount} (लगभग दो सेवाओं का योगदान)।',
  },
  activateWalletCta: {
    en: 'Top up {amount} to begin',
    bn: '{amount} টপ-আপ করে শুরু করুন',
    hi: '{amount} टॉप-अप करके शुरू करें',
  },
  activateWalletSkip: {
    en: 'I’ll do this later',
    bn: 'পরে করব',
    hi: 'बाद में करूँगा',
  },

  /* ---- Hold / freeze ---- */
  holdTitle: {
    en: 'Contribution on hold',
    bn: 'অবদান স্থগিত রয়েছে',
    hi: 'योगदान होल्ड पर है',
  },
  holdBody: {
    en: 'This seva is under review, so your {amount} contribution is frozen — not taken. It will be released when the review completes.',
    bn: 'এই সেবাটি পর্যালোচনাধীন, তাই আপনার {amount} অবদান স্থগিত রয়েছে — নেওয়া হয়নি। পর্যালোচনা শেষ হলে এটি মুক্ত করা হবে।',
    hi: 'यह सेवा समीक्षाधीन है, इसलिए आपका {amount} योगदान फ्रोज़ है — लिया नहीं गया है। समीक्षा पूर्ण होने पर इसे जारी किया जाएगा।',
  },

  /* ---- Phase 2 — Pratham Seva program ---- */
  /* Verification is "your sacred credentials, honored" — never KYC. */

  // ---- Program name -------------------------------------------------------
  programName: {
    en: 'Pratham Seva',
    bn: 'প্রথম সেবা',
    hi: 'प्रथम सेवा',
  },
  programTagline: {
    en: 'Your first steps of sacred service, blessed and commission-free.',
    bn: 'পবিত্র সেবার প্রথম পদক্ষেপ — আশীর্বাদসহ, কমিশনমুক্ত।',
    hi: 'पवित्र सेवा के प्रथम चरण — आशीर्वाद सहित, कमीशन-मुक्त।',
  },

  // ---- Tier badges ---------------------------------------------------------
  tierRegisteredLabel: { en: 'Registered', bn: 'নিবন্ধিত', hi: 'पंजीकृत' },
  tierRegisteredBlessing: {
    en: 'Welcome to the family. Share your sacred credentials to be honored as Verified.',
    bn: 'পরিবারে স্বাগতম। যাচাইকৃত হিসেবে সম্মানিত হতে আপনার পবিত্র পরিচয়পত্র শেয়ার করুন।',
    hi: 'परिवार में स्वागत है। सत्यापित के रूप में सम्मानित होने हेतु अपने पवित्र परिचय-पत्र साझा करें।',
  },
  tierVerifiedLabel: { en: 'Verified ✓', bn: 'যাচাইকৃত ✓', hi: 'सत्यापित ✓' },
  tierVerifiedBlessing: {
    en: 'Your sacred credentials are honored. Serve with our blessings.',
    bn: 'আপনার পবিত্র পরিচয়পত্র সম্মানিত হয়েছে। আমাদের আশীর্বাদ নিয়ে সেবা করুন।',
    hi: 'आपके पवित्र परिचय-पत्र सम्मानित हुए। हमारे आशीर्वाद सहित सेवा करें।',
  },
  tierTrustedLabel: { en: 'Trusted 🌟', bn: 'বিশ্বস্ত 🌟', hi: 'विश्वसनीय 🌟' },
  tierTrustedBlessing: {
    en: 'The community places its faith in you. Shine like a temple lamp.',
    bn: 'সমাজ আপনার উপর আস্থা রেখেছে। মন্দিরের প্রদীপের মতো উজ্জ্বল হোন।',
    hi: 'समाज ने आप पर विश्वास रखा है। मंदिर के दीप की तरह उज्ज्वल रहें।',
  },

  // ---- Welcome reward ------------------------------------------------------
  welcomeRewardTitle: {
    en: '🪔 Your sacred credentials are honored',
    bn: '🪔 আপনার পবিত্র পরিচয়পত্র সম্মানিত হয়েছে',
    hi: '🪔 आपके पवित्र परिचय-पत्र सम्मानित हुए',
  },
  welcomeRewardBody: {
    en: 'Your first {n} sevas are offered commission-free — may your service bring light.',
    bn: 'আপনার প্রথম {n}টি সেবা কমিশনমুক্ত — আপনার সেবা যেন আলো ছড়ায়।',
    hi: 'आपकी पहली {n} सेवाएँ कमीशन-मुक्त — आपकी सेवा प्रकाश फैलाए।',
  },
  freeSevasRemaining: {
    en: '{n} commission-free sevas remaining',
    bn: 'আরও {n}টি কমিশনমুক্ত সেবা বাকি',
    hi: '{n} कमीशन-मुक्त सेवाएँ शेष',
  },
  lastFreeSeva: {
    en: 'This is your last commission-free seva. May it be blessed.',
    bn: 'এটি আপনার শেষ কমিশনমুক্ত সেবা। শুভ হোক।',
    hi: 'यह आपकी अंतिम कमीशन-मुक्त सेवा है। शुभ हो।',
  },
  graduatedToFullRate: {
    en: 'Your Pratham Seva blessing is complete. From here, a small seva contribution sustains the platform that carries your name.',
    bn: 'আপনার প্রথম সেবার আশীর্বাদ সম্পূর্ণ। এখান থেকে, একটি ছোট সেবা অবদান আপনার নাম বহনকারী প্ল্যাটফর্মকে টিকিয়ে রাখবে।',
    hi: 'आपकी प्रथम सेवा का आशीर्वाद पूर्ण हुआ। यहाँ से, एक छोटा सेवा योगदान उस मंच को चलाएगा जो आपका नाम आगे बढ़ाता है।',
  },

  // ---- Application checklist (professional-facing) --------------------------
  applyHeading: {
    en: 'Share your sacred credentials',
    bn: 'আপনার পবিত্র পরিচয়পত্র শেয়ার করুন',
    hi: 'अपने पवित्र परिचय-पत्र साझा करें',
  },
  applyIntro: {
    en: 'Tell us who you are and how you serve. Our team will honor your credentials — usually within a few days.',
    bn: 'আপনি কে এবং কীভাবে সেবা করেন তা জানান। আমাদের দল আপনার পরিচয়পত্র সম্মান করবে — সাধারণত কয়েক দিনের মধ্যে।',
    hi: 'बताएँ आप कौन हैं और कैसे सेवा करते हैं। हमारी टीम आपके परिचय-पत्र का सम्मान करेगी — आमतौर पर कुछ दिनों में।',
  },
  docGovtId: { en: 'Government ID', bn: 'সরকারি পরিচয়পত্র', hi: 'सरकारी पहचान-पत्र' },
  docGovtIdHint: {
    en: 'Aadhaar, voter ID, or passport — so devotees know you are who you say you are.',
    bn: 'আধার, ভোটার আইডি বা পাসপোর্ট — যাতে ভক্তরা জানেন আপনি যিনি বলছেন তিনিই।',
    hi: 'आधार, मतदाता पहचान-पत्र या पासपोर्ट — ताकि भक्त जान सकें आप वही हैं जो आप कहते हैं।',
  },
  docPhoto: { en: 'Your photograph', bn: 'আপনার ছবি', hi: 'आपकी तस्वीर' },
  docPhotoHint: {
    en: 'A clear, dignified photo — devotees will greet this face.',
    bn: 'একটি স্পষ্ট, মর্যাদাপূর্ণ ছবি — ভক্তরা এই মুখকে প্রণাম জানাবেন।',
    hi: 'एक स्पष्ट, गरिमामय तस्वीर — भक्त इसी चेहरे को प्रणाम करेंगे।',
  },
  docTradition: { en: 'Tradition & parampara', bn: 'ঐতিহ্য ও পরম্পরা', hi: 'परंपरा और परम्परा' },
  docTraditionHint: {
    en: 'Your sampradaya, guru or gurukul, years of practice — the roots of your service.',
    bn: 'আপনার সম্প্রদায়, গুরু বা গুরুকুল, সাধনার বছর — আপনার সেবার শিকড়।',
    hi: 'आपका संप्रदाय, गुरु या गुरुकुल, साधना के वर्ष — आपकी सेवा की जड़ें।',
  },
  docSamples: { en: 'Work samples', bn: 'কাজের নমুনা', hi: 'कार्य के नमूने' },
  docSamplesHint: {
    en: 'Photos or recordings of your rituals, consultations, or discourses (optional, but it helps).',
    bn: 'আপনার পূজা, পরামর্শ বা প্রবচনের ছবি বা রেকর্ডিং (ঐচ্ছিক, তবে সহায়ক)।',
    hi: 'आपके अनुष्ठान, परामर्श या प्रवचन की तस्वीरें या रिकॉर्डिंग (वैकल्पिक, पर सहायक)।',
  },
  docEndorsement: { en: 'Temple endorsement', bn: 'মন্দিরের অনুমোদন', hi: 'मंदिर का समर्थन' },
  docEndorsementHint: {
    en: 'A letter or reference from a temple, matha, or senior acharya — the fastest path to the Trusted 🌟 blessing.',
    bn: 'কোনো মন্দির, মঠ বা জ্যেষ্ঠ আচার্যের চিঠি বা রেফারেন্স — বিশ্বস্ত 🌟 আশীর্বাদের দ্রুততম পথ।',
    hi: 'किसी मंदिर, मठ या वरिष्ठ आचार्य का पत्र या संदर्भ — विश्वसनीय 🌟 आशीर्वाद का सबसे तेज़ मार्ग।',
  },
  uploadLabel: { en: 'Upload', bn: 'আপলোড', hi: 'अपलोड' },
  uploadedLabel: { en: 'Received 🙏', bn: 'পেয়েছি 🙏', hi: 'प्राप्त 🙏' },
  optionalLabel: { en: 'Optional', bn: 'ঐচ্ছিক', hi: 'वैकल्पिक' },
  requiredLabel: { en: 'Needed', bn: 'প্রয়োজন', hi: 'आवश्यक' },
  submitApplication: { en: 'Offer my credentials', bn: 'আমার পরিচয়পত্র অর্পণ করুন', hi: 'मेरे परिचय-पत्र अर्पित करें' },
  applicationSubmitted: {
    en: '🙏 Your credentials are received. We will honor them with care.',
    bn: '🙏 আপনার পরিচয়পত্র পেয়েছি। আমরা যত্নে সম্মান করব।',
    hi: '🙏 आपके परिचय-पत्र प्राप्त हुए। हम ससम्मान विचार करेंगे।',
  },
  applicationPending: {
    en: 'Your credentials are with our team. We will write to you soon.',
    bn: 'আপনার পরিচয়পত্র আমাদের দলের কাছে। আমরা শীঘ্রই জানাব।',
    hi: 'आपके परिचय-पत्र हमारी टीम के पास हैं। हम शीघ्र सूचित करेंगे।',
  },
  applicationRejected: {
    en: 'With respect, we could not honor your credentials this time.',
    bn: 'শ্রদ্ধার সাথে, এবার আমরা আপনার পরিচয়পত্র সম্মান করতে পারিনি।',
    hi: 'सम्मान सहित, इस बार हम आपके परिचय-पत्र का सम्मान नहीं कर सके।',
  },
  progressLabel: {
    en: 'Step {done} of {total}',
    bn: '{total}টির মধ্যে {done}টি ধাপ',
    hi: '{total} में से {done} चरण',
  },

  // ---- GodMode review (admin-facing; warm but honest) ------------------------
  reviewQueueTitle: { en: 'Sacred credentials awaiting honor', bn: 'সম্মানের অপেক্ষায় পবিত্র পরিচয়পত্র', hi: 'सम्मान की प्रतीक्षा में पवित्र परिचय-पत्र' },
  approveLabel: { en: 'Honor & approve', bn: 'সম্মান ও অনুমোদন', hi: 'सम्मान व अनुमोदन' },
  rejectLabel: { en: 'Decline with respect', bn: 'শ্রদ্ধায় প্রত্যাখ্যান', hi: 'सम्मानपूर्वक अस्वीकार' },
  reasonRequired: {
    en: 'A reason is needed — the applicant reads it. Write with kindness.',
    bn: 'একটি কারণ প্রয়োজন — আবেদনকারী এটি পড়বেন। দয়া করে লিখুন।',
    hi: 'एक कारण आवश्यक है — आवेदक इसे पढ़ेगा। करुणा से लिखें।',
  },

  // ---- Trilingual reject reason templates ------------------------------------
  rejectTemplateDocsUnclear: {
    en: 'The documents shared were not clear enough to honor. Please share clearer photos of your ID and credentials.',
    bn: 'শেয়ার করা নথিগুলো সম্মানের জন্য যথেষ্ট স্পষ্ট ছিল না। আপনার আইডি ও পরিচয়পত্রের স্পষ্ট ছবি শেয়ার করুন।',
    hi: 'साझा किए गए दस्तावेज़ सम्मान हेतु पर्याप्त स्पष्ट नहीं थे। कृपया अपनी पहचान व परिचय-पत्र की स्पष्ट तस्वीरें साझा करें।',
  },
  rejectTemplateExperience: {
    en: 'We need a little more evidence of your practice and tradition. Please add details of your guru, gurukul, or years of service.',
    bn: 'আপনার সাধনা ও ঐতিহ্যের আরও কিছু প্রমাণ প্রয়োজন। আপনার গুরু, গুরুকুল বা সেবার বছরের বিবরণ যোগ করুন।',
    hi: 'हमें आपकी साधना और परंपरा का थोड़ा और प्रमाण चाहिए। कृपया अपने गुरु, गुरुकुल या सेवा के वर्षों का विवरण जोड़ें।',
  },
  rejectTemplateDuplicate: {
    en: 'We found an existing honored profile for these credentials. Please sign in with that account instead.',
    bn: 'এই পরিচয়পত্রের জন্য একটি বিদ্যমান সম্মানিত প্রোফাইল পেয়েছি। পরিবর্তে সেই অ্যাকাউন্টে সাইন ইন করুন।',
    hi: 'इन परिचय-पत्रों हेतु एक मौजूदा सम्मानित प्रोफ़ाइल मिली। कृपया उसी खाते से साइन इन करें।',
  },

/* ---- Errors ---- */
  prefundErrorGeneric: {
    en: 'Something didn’t work. Please try again. 🙏',
    bn: 'কিছু একটা কাজ করেনি। আবার চেষ্টা করুন। 🙏',
    hi: 'कुछ काम नहीं किया। कृपया पुनः प्रयास करें। 🙏',
  },
};

/** Normalize any language string to en | bn | hi. */
export function spLang(lang: string | undefined | null): SevaProLang {
  return lang === 'bn' || lang === 'hi' ? lang : 'en';
}

/**
 * Look up a string with {var} interpolation.
 * Falls back to English, then to the key itself — never throws.
 */
export function sp(
  lang: string | undefined | null,
  key: string,
  vars?: Record<string, string | number>
): string {
  const l = spLang(lang);
  const dict = STRINGS[key];
  let s = dict ? dict[l] || dict.en : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

/**
 * Phase-2 API (kept for compatibility): typed-lang variant of sp().
 * Used by the GodMode Professionals tab (AdminTabsJ).
 */
export function sevaProCopy(
  lang: SevaProLang,
  key: string,
  vars?: Record<string, string | number>
): string {
  return sp(lang, key, vars);
}

/** Reject-reason template keys available in the GodMode review UI. */
export const REJECT_TEMPLATE_KEYS = [
  'rejectTemplateDocsUnclear',
  'rejectTemplateExperience',
  'rejectTemplateDuplicate',
] as const;
