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

  // Provider tiers
  communityTier: { en: 'Community', bn: 'কমিউনিটি', hi: 'समुदाय' },
  verifiedProvider: { en: 'Verified Seva Provider', bn: 'যাচাইকৃত সেবা প্রদানকারী', hi: 'सत्यापित सेवा प्रदाता' },

  // Misc
  dakshinaReceived: { en: 'Dakshina received', bn: 'প্রাপ্ত দক্ষিণা', hi: 'प्राप्त दक्षिणा' },
  noSevasYet: { en: 'No sevas yet.', bn: 'এখনও কোনো সেবা নেই।', hi: 'अभी कोई सेवा नहीं।' },
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
