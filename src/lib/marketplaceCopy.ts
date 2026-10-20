/**
 * marketplaceCopy.ts — Devotional language for the Seva Marketplace.
 * ==================================================================
 * The marketplace deals in sacred services. Transactional Fiverr-style
 * language ("hire", "gig", "cheap deal") is culturally inappropriate.
 * This module centralizes the reframed copy in EN / BN / HI.
 *
 * Internal code keeps technical names (gig, order, commission).
 * ONLY user-facing strings use these terms.
 */
export type MktLang = 'en' | 'bn' | 'hi';

const COPY: Record<string, { en: string; bn: string; hi: string }> = {
  // Core nouns
  seva: { en: 'Seva', bn: 'সেবা', hi: 'सेवा' },
  sevas: { en: 'Sevas', bn: 'সেবাসমূহ', hi: 'सेवाएँ' },
  sevaMarketplace: { en: 'Seva Marketplace', bn: 'সেবা মার্কেটপ্লেস', hi: 'सेवा बाज़ार' },
  sevaBooking: { en: 'Seva booking', bn: 'সেবা বুকিং', hi: 'सेवा बुकिंग' },
  sevaBookings: { en: 'Seva bookings', bn: 'সেবা বুকিংসমূহ', hi: 'सेवा बुकिंग' },
  mySevas: { en: 'My Sevas', bn: 'আমার সেবা', hi: 'मेरी सेवाएँ' },
  dakshina: { en: 'Dakshina', bn: 'দক্ষিণা', hi: 'दक्षिणा' },
  suggestedDakshina: { en: 'Suggested dakshina', bn: 'প্রস্তাবিত দক্ষিণা', hi: 'सुझाई गई दक्षिणा' },
  yajman: { en: 'Yajman', bn: 'যজমান', hi: 'यजमान' },
  ashirvad: { en: 'ashirvad', bn: 'আশীর্বাদ', hi: 'आशीर्वाद' },
  sevaWallet: { en: 'Seva Wallet', bn: 'সেবা ওয়ালেট', hi: 'सेवा वॉलेट' },
  dakshinaBalance: { en: 'Dakshina balance', bn: 'দক্ষিণা ব্যালেন্স', hi: 'दक्षिणा शेष' },
  sevaContribution: { en: 'Seva contribution', bn: 'সেবা অবদান', hi: 'सेवा योगदान' },

  // Actions
  requestSeva: { en: 'Request Seva', bn: 'সেবার অনুরোধ', hi: 'सेवा का अनुरोध' },
  takeSankalp: { en: 'Take Sankalp', bn: 'সংকল্প নিন', hi: 'संकल्प लें' },
  inviteProvider: { en: 'Invite', bn: 'আমন্ত্রণ', hi: 'आमंत्रण' },
  addToSevaWallet: { en: 'Add to Seva Wallet', bn: 'সেবা ওয়ালেটে যোগ করুন', hi: 'सेवा वॉलेट में जोड़ें' },
  confirmBooking: { en: 'Confirm seva booking', bn: 'সেবা বুকিং নিশ্চিত করুন', hi: 'सेवा बुकिंग की पुष्टि करें' },
  browseSevas: { en: 'Browse sevas', bn: 'সেবা দেখুন', hi: 'सेवाएँ देखें' },

  // Wallet quick actions (home glance + wallet tab)
  quickTopUp: { en: 'Top up', bn: 'টপ আপ', hi: 'टॉप अप' },
  quickGive: { en: '🪔 Give', bn: '🪔 দিন', hi: '🪔 दें' },
  quickObligations: { en: 'Obligations', bn: 'দেনা-পাওনা', hi: 'लेन-देन' },
  quickScan: { en: 'Scan', bn: 'স্ক্যান', hi: 'स्कैन' },
  quickHistory: { en: 'History', bn: 'ইতিহাস', hi: 'इतिहास' },
  showBalance: { en: 'Show balance', bn: 'ব্যালেন্স দেখুন', hi: 'शेष राशि दिखाएँ' },
  hideBalance: { en: 'Hide balance', bn: 'ব্যালেন্স লুকান', hi: 'शेष राशि छिपाएँ' },
  walletEmptyTitle: { en: 'Your Seva Wallet is waiting to be blessed.', bn: 'আপনার সেবা ওয়ালেট আশীর্বাদের অপেক্ষায় রয়েছে।', hi: 'आपका सेवा वॉलेट आशीर्वाद की प्रतीक्षा में है।' },
  walletEmptySub: { en: 'Top up to begin your giving journey.', bn: 'আপনার দানের যাত্রা শুরু করতে টপ আপ করুন।', hi: 'अपनी दान-यात्रा आरंभ करने हेतु टॉप अप करें।' },
  scanValid: { en: 'Valid code scanned. 🙏', bn: 'বৈধ কোড স্ক্যান হয়েছে। 🙏', hi: 'वैध कोड स्कैन हो गया। 🙏' },
  signInForObligations: { en: 'Sign in to view your obligations.', bn: 'আপনার দেনা-পাওনা দেখতে সাইন ইন করুন।', hi: 'अपना लेन-देन देखने हेतु साइन इन करें।' },

  // Provider tiers
  communityTier: { en: 'Community', bn: 'কমিউনিটি', hi: 'समुदाय' },
  verifiedProvider: { en: 'Verified Seva Provider', bn: 'যাচাইকৃত সেবা প্রদানকারী', hi: 'सत्यापित सेवा प्रदाता' },

  // Misc
  dakshinaReceived: { en: 'Dakshina received', bn: 'প্রাপ্ত দক্ষিণা', hi: 'प्राप्त दक्षिणा' },
  noSevasYet: { en: 'No sevas yet.', bn: 'এখনও কোনো সেবা নেই।', hi: 'अभी कोई सेवा नहीं।' },

  // Booking trust (spec §4/§8 — at the decision point, never in a help article)
  escrowNote: { en: 'Held securely until your seva is complete', bn: 'সেবা সম্পূর্ণ না হওয়া পর্যন্ত নিরাপদে সংরক্ষিত', hi: 'सेवा पूर्ण होने तक सुरक्षित रखा जाता है' },

  // AUDIT FIX #4 — rail-1 direct payment confirmation
  confirmPaymentTitle: { en: '💰 Dakshina received?', bn: '💰 দক্ষিণা পেয়েছেন?', hi: '💰 दक्षिणा मिली?' },
  confirmPaymentBody: { en: 'The yajman paid you directly (bKash / Nagad / UPI / cash). Confirm once the dakshina is in your hands.', bn: 'যজমান সরাসরি আপনাকে দিয়েছেন (বিকাশ / নগদ / UPI / নগদ)। দক্ষিণা হাতে পেলেই নিশ্চিত করুন।', hi: 'यजमान ने आपको सीधे भुगतान किया है (bKash / Nagad / UPI / नकद)। दक्षिणा हाथ में आते ही पुष्टि करें।' },
  confirmPaymentBtn: { en: '✓ Confirm payment received', bn: '✓ পেমেন্ট পেয়েছি', hi: '✓ भुगतान मिल गया' },
  paymentNotePh: { en: 'TrxID or note (optional)', bn: 'TrxID বা নোট (ঐচ্ছিক)', hi: 'TrxID या नोट (वैकल्पिक)' },
  awaitingProviderConfirm: { en: '⏳ Waiting for the provider to confirm your payment…', bn: '⏳ প্রদানকারী আপনার পেমেন্ট নিশ্চিত করার অপেক্ষায়…', hi: '⏳ प्रदाता द्वारा आपके भुगतान की पुष्टि की प्रतीक्षा…' },
  awaitingProviderConfirmSub: { en: 'You paid directly. Once they confirm receipt, your seva moves forward.', bn: 'আপনি সরাসরি পেমেন্ট করেছেন। তারা প্রাপ্তি নিশ্চিত করলেই আপনার সেবা এগিয়ে যাবে।', hi: 'आपने सीधे भुगतान किया है। उनके प्राप्ति की पुष्टि करते ही आपकी सेवा आगे बढ़ेगी।' },
  paymentConfirmedToast: { en: 'Payment confirmed. You can start the seva. 🙏', bn: 'পেমেন্ট নিশ্চিত। এবার সেবা শুরু করতে পারেন। 🙏', hi: 'भुगतान की पुष्टि हो गई। अब सेवा आरंभ करें। 🙏' },

  // Marketplace empty state (spec §7: acknowledge + bless + guide + action)
  marketEmptyTitle: { en: 'No sevas match — yet.', bn: 'কোনো সেবা মেলেনি — এখনও।', hi: 'कोई सेवा नहीं मिली — अभी।' },
  marketEmptySub: { en: 'Every pandit\u2019s first blessing starts somewhere. Try a different search, or explore a guided journey.', bn: 'প্রতিটি পণ্ডিতের প্রথম আশীর্বাদ কোথাও না কোথাও শুরু হয়। অন্য কিছু খুঁজুন, অথবা একটি নির্দেশিত যাত্রা দেখুন।', hi: 'हर पंडित का पहला आशीर्वाद कहीं न कहीं शुरू होता है। कुछ और खोजें, या निर्देशित यात्रा देखें।' },
  browseAllSevas: { en: 'Browse all sevas', bn: 'সব সেবা দেখুন', hi: 'सभी सेवाएँ देखें' },

  // Seva Bazar — booking flow (added 2026-10-20, i18n audit)
  bkBack: { en: 'Back', bn: 'পেছনে', hi: 'वापस' },
  bkSevaRequestedEscrow: { en: 'Seva requested! Dakshina held securely until completion.', bn: 'সেবার অনুরোধ গৃহীত! সম্পূর্ণ না হওয়া পর্যন্ত দক্ষিণা নিরাপদে থাকবে।', hi: 'सेवा का अनुरोध हो गया! पूर्ण होने तक दक्षिणा सुरक्षित रहेगी।' },
  bkSevaRequestedDirect: { en: 'Seva requested! Offer dakshina directly after completion, then the seva contribution.', bn: 'সেবার অনুরোধ গৃহীত! সম্পূর্ণ হওয়ার পর সরাসরি দক্ষিণা দিন, তারপর সেবা অবদান।', hi: 'सेवा का अनुरोध हो गया! पूर्ण होने के बाद सीधे दक्षिणा अर्पित करें, फिर सेवा योगदान।' },
  bkEnterPayRef: { en: 'Enter your payment transaction/reference ID.', bn: 'আপনার পেমেন্ট লেনদেন/রেফারেন্স আইডি লিখুন।', hi: 'अपनी भुगतान लेन-देन/संदर्भ आईडी दर्ज करें।' },
  bkBookingSubmitted: { en: 'Booking submitted! The provider will accept shortly.', bn: 'বুকিং জমা হয়েছে! প্রদানকারী শীঘ্রই গ্রহণ করবেন।', hi: 'बुकिंग जमा हो गई! प्रदाता शीघ्र स्वीकार करेगा।' },
  bkBookingFailed: { en: 'Booking failed.', bn: 'বুকিং ব্যর্থ হয়েছে।', hi: 'बुकिंग विफल रही।' },
  bkStep2: { en: 'Step 2 — Submit proof & book', bn: 'ধাপ ২ — প্রমাণ জমা দিন ও বুক করুন', hi: 'चरण 2 — प्रमाण जमा करें और बुक करें' },
  bkPayRefLabel: { en: 'Payment transaction / reference ID*', bn: 'পেমেন্ট লেনদেন / রেফারেন্স আইডি*', hi: 'भुगतान लेन-देन / संदर्भ आईडी*' },
  bkDateLabel: { en: 'Preferred date/time (optional)', bn: 'পছন্দের তারিখ/সময় (ঐচ্ছিক)', hi: 'पसंदीदा तिथि/समय (वैकल्पिक)' },
  bkNotesLabel: { en: 'Notes for provider (optional)', bn: 'প্রদানকারীর জন্য নোট (ঐচ্ছিক)', hi: 'प्रदाता हेतु नोट (वैकल्पिक)' },
  bkNotesPh: { en: 'Gotra, address, special requests…', bn: 'গোত্র, ঠিকানা, বিশেষ অনুরোধ…', hi: 'गोत्र, पता, विशेष अनुरोध…' },
  bkSubmitting: { en: 'Submitting…', bn: 'জমা হচ্ছে…', hi: 'जमा हो रहा है…' },
  bkAvailable: { en: 'available', bn: 'উপলব্ধ', hi: 'उपलब्ध' },
  bkRegionBD: { en: '🇧🇩 BD', bn: '🇧🇩 BD', hi: '🇧🇩 BD' },
  bkRegionIN: { en: '🇮🇳 India', bn: '🇮🇳 ভারত', hi: '🇮🇳 भारत' },
  bkRegionINTL: { en: '🌍 Intl', bn: '🌍 আন্তর্জাতিক', hi: '🌍 अंतरराष्ट्रीय' },
  bkPayHintBD: { en: 'Pay with bKash / Nagad / Rocket or scan the Bangla QR in the Billing section, then paste the Transaction ID below.', bn: 'বিকাশ / নগদ / রকেট দিয়ে পেমেন্ট করুন অথবা বিলিং বিভাগে বাংলা QR স্ক্যান করুন, তারপর নিচে Transaction ID দিন।', hi: 'bKash / Nagad / Rocket से भुगतान करें या बिलिंग अनुभाग में बांग्ला QR स्कैन करें, फिर नीचे Transaction ID लिखें।' },
  bkPayHintINReady: { en: 'Pay via UPI (see the Billing section for the UPI ID / QR), then paste the UPI reference below.', bn: 'UPI দিয়ে পেমেন্ট করুন (UPI ID / QR-এর জন্য বিলিং বিভাগ দেখুন), তারপর নিচে UPI রেফারেন্স দিন।', hi: 'UPI से भुगतान करें (UPI ID / QR हेतु बिलिंग अनुभाग देखें), फिर नीचे UPI संदर्भ लिखें।' },
  bkPayHintINIntl: { en: 'Pay via Payoneer / Wise (see the Billing section), then paste the transfer reference below.', bn: 'Payoneer / Wise দিয়ে পেমেন্ট করুন (বিলিং বিভাগ দেখুন), তারপর নিচে ট্রান্সফার রেফারেন্স দিন।', hi: 'Payoneer / Wise से भुगतान करें (बिलिंग अनुभाग देखें), फिर नीचे ट्रांसफर संदर्भ लिखें।' },
  bkPayHintINTL: { en: 'Pay via Wise / Payoneer (see the Billing section), then paste the transfer reference below.', bn: 'Wise / Payoneer দিয়ে পেমেন্ট করুন (বিলিং বিভাগ দেখুন), তারপর নিচে ট্রান্সফার রেফারেন্স দিন।', hi: 'Wise / Payoneer से भुगतान करें (बिलिंग अनुभाग देखें), फिर नीचे ट्रांसफर संदर्भ लिखें।' },
  // My bookings
  bkLoading: { en: 'Loading…', bn: 'লোড হচ্ছে…', hi: 'लोड हो रहा है…' },
  bkPaidFromWallet: { en: '👛 Paid from wallet — held in escrow', bn: '👛 ওয়ালেট থেকে পরিশোধিত — এসক্রোতে সংরক্ষিত', hi: '👛 वॉलेट से भुगतान — एस्क्रो में सुरक्षित' },
  bkConfirmCompletion: { en: 'Confirm completion', bn: 'সম্পূর্ণতা নিশ্চিত করুন', hi: 'पूर्णता की पुष्टि करें' },
  bkDispute: { en: 'Dispute', bn: 'বিরোধ', hi: 'विवाद' },
  bkRaiseDispute: { en: 'Raise a dispute', bn: 'বিরোধ তুলুন', hi: 'विवाद दर्ज करें' },
  bkReason: { en: 'Reason*', bn: 'কারণ*', hi: 'कारण*' },
  bkReasonPh: { en: 'e.g. Provider never showed up', bn: 'যেমন প্রদানকারী আসেননি', hi: 'जैसे प्रदाता कभी नहीं आया' },
  bkDetails: { en: 'Details', bn: 'বিস্তারিত', hi: 'विवरण' },
  bkSubmitDispute: { en: 'Submit dispute', bn: 'বিরোধ জমা দিন', hi: 'विवाद जमा करें' },
  bkCancel: { en: 'Cancel', bn: 'বাতিল', hi: 'रद्द करें' },
  bkDescribeIssue: { en: 'Describe the issue.', bn: 'সমস্যাটি বর্ণনা করুন।', hi: 'समस्या का वर्णन करें।' },
  bkDisputeRaised: { en: 'Dispute raised. Our team will review.', bn: 'বিরোধ তোলা হয়েছে। আমাদের টিম পর্যালোচনা করবে।', hi: 'विवाद दर्ज किया गया। हमारी टीम समीक्षा करेगी।' },
  // Order statuses (shown as badges — never raw codes)
  bkStatusPendingPayment: { en: 'Pending payment', bn: 'পেমেন্ট বাকি', hi: 'भुगतान शेष' },
  bkStatusPaid: { en: 'Paid', bn: 'পরিশোধিত', hi: 'भुगतान हो गया' },
  bkStatusAccepted: { en: 'Accepted', bn: 'গৃহীত', hi: 'स्वीकृत' },
  bkStatusInProgress: { en: 'In progress', bn: 'চলমান', hi: 'प्रगति पर' },
  bkStatusAwaitingCommission: { en: 'Awaiting contribution', bn: 'অবদানের অপেক্ষায়', hi: 'योगदान की प्रतीक्षा' },
  bkStatusCompleted: { en: 'Completed', bn: 'সম্পূর্ণ', hi: 'पूर्ण' },
  bkStatusCancelled: { en: 'Cancelled', bn: 'বাতিল', hi: 'रद्द' },
  bkStatusDisputed: { en: 'Disputed', bn: 'বিরোধাধীন', hi: 'विवादित' },
  // Browse
  bkSearchPh: { en: 'Search puja, kundli, havan…', bn: 'পূজা, কুণ্ডলী, হবন খুঁজুন…', hi: 'पूजा, कुंडली, हवन खोजें…' },
  bkAllCategories: { en: 'All categories', bn: 'সব বিভাগ', hi: 'सभी श्रेणियाँ' },
  bkCatPuja: { en: 'Puja', bn: 'পূজা', hi: 'पूजा' },
  bkCatHavan: { en: 'Havan', bn: 'হবন', hi: 'हवन' },
  bkCatKatha: { en: 'Katha', bn: 'কথা', hi: 'कथा' },
  bkCatSamskara: { en: 'Samskara', bn: 'সংস্কার', hi: 'संस्कार' },
  bkCatVastu: { en: 'Vastu', bn: 'বাস্তু', hi: 'वास्तु' },
  bkCatKundli: { en: 'Kundli', bn: 'কুণ্ডলী', hi: 'कुंडली' },
  bkCatHoroscope: { en: 'Horoscope', bn: 'রাশিফল', hi: 'राशिफल' },
  bkCatRemedy: { en: 'Remedy', bn: 'প্রতিকার', hi: 'उपाय' },
  bkCatConsultation: { en: 'Consultation', bn: 'পরামর্শ', hi: 'परामर्श' },
  bkCatOther: { en: 'Other', bn: 'অন্যান্য', hi: 'अन्य' },
  bkPtypeAll: { en: 'Purohit + Jyotishi', bn: 'পুরোহিত + জ্যোতিষী', hi: 'पुरोहित + ज्योतिषी' },
  bkPtypePurohit: { en: 'Purohit', bn: 'পুরোহিত', hi: 'पुरोहित' },
  bkPtypeJyotishi: { en: 'Jyotishi', bn: 'জ্যোতিষী', hi: 'ज्योतिषी' },
  bkFeatured: { en: 'FEATURED', bn: 'বিশেষ', hi: 'विशेष' },
};

export function mkt(lang: MktLang, key: keyof typeof COPY): string {
  const entry = COPY[key];
  if (!entry) return key;
  return entry[lang] || entry.en;
}

/** Contribution explainer shown to providers (devotional framing of the platform fee). */
export function contributionNote(lang: MktLang, ratePercent: number): string {
  const notes = {
    en: `Seva contribution (${ratePercent}%) — sustains Sanatani Bandhan's dharmic mission. Shown to yajmans at booking; you receive the net dakshina.`,
    bn: `সেবা অবদান (${ratePercent}%) — সনাতনী বন্ধনের ধর্মীয় মিশনকে টিকিয়ে রাখে। বুকিংয়ের সময় যজমানকে দেখানো হয়; আপনি নিট দক্ষিণা পান।`,
    hi: `सेवा योगदान (${ratePercent}%) — सनातनी बंधन के धार्मिक मिशन को बनाए रखता है। बुकिंग पर यजमान को दिखाया जाता है; आपको शुद्ध दक्षिणा मिलती है।`,
  };
  return notes[lang] || notes.en;
}

/** Where the seva contribution goes — for the transparency page (GodMode → Content). */
export const CONTRIBUTION_TRANSPARENCY = {
  en: 'Your seva contribution keeps Sanatani Bandhan free for thousands of temples, goshalas, and ashrams. It funds the servers, the Bangla QR payment rails, verification of purohits and jyotishis, and dispute protection for every yajman. Like dakshina to a temple, it circulates back into dharma.',
  bn: 'আপনার সেবা অবদান হাজার হাজার মন্দির, গোশালা ও আশ্রমের জন্য সনাতনী বন্ধনকে বিনামূল্যে রাখে। এটি সার্ভার, বাংলা QR পেমেন্ট, পুরোহিত-জ্যোতিষী যাচাইকরণ এবং প্রতিটি যজমানের বিরোধ সুরক্ষার খরচ বহন করে। মন্দিরে দক্ষিণার মতো, এটি ধর্মে ফিরে আসে।',
  hi: 'आपका सेवा योगदान हज़ारों मंदिरों, गोशालाओं और आश्रमों के लिए सनातनी बंधन को निःशुल्क रखता है। यह सर्वर, बांग्ला QR भुगतान, पुरोहित-ज्योतिषी सत्यापन और प्रत्येक यजमान की विवाद सुरक्षा का खर्च वहन करता है। मंदिर में दक्षिणा की तरह, यह धर्म में वापस लौटता है।',
};
