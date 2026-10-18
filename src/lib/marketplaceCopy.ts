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

  // Marketplace empty state (spec §7: acknowledge + bless + guide + action)
  marketEmptyTitle: { en: 'No sevas match — yet.', bn: 'কোনো সেবা মেলেনি — এখনও।', hi: 'कोई सेवा नहीं मिली — अभी।' },
  marketEmptySub: { en: 'Every pandit\u2019s first blessing starts somewhere. Try a different search, or explore a guided journey.', bn: 'প্রতিটি পণ্ডিতের প্রথম আশীর্বাদ কোথাও না কোথাও শুরু হয়। অন্য কিছু খুঁজুন, অথবা একটি নির্দেশিত যাত্রা দেখুন।', hi: 'हर पंडित का पहला आशीर्वाद कहीं न कहीं शुरू होता है। कुछ और खोजें, या निर्देशित यात्रा देखें।' },
  browseAllSevas: { en: 'Browse all sevas', bn: 'সব সেবা দেখুন', hi: 'सभी सेवाएँ देखें' },
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
