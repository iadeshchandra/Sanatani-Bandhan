/**
 * search/i18n.ts — Universal Search strings (EN/HI/BN).
 */

export type SearchLang = 'en' | 'hi' | 'bn';

const STRINGS: Record<string, { en: string; hi: string; bn: string }> = {
  'search.placeholder': {
    en: 'Search temples, people, videos…',
    hi: 'मंदिर, लोग, वीडियो खोजें…',
    bn: 'মন্দির, মানুষ, ভিডিও খুঁজুন…',
  },
  'search.recent': {
    en: 'Recent searches',
    hi: 'हाल की खोजें',
    bn: 'সাম্প্রতিক খোঁজ',
  },
  'search.clear': {
    en: 'Clear',
    hi: 'साफ़ करें',
    bn: 'মুছুন',
  },
  'search.trending': {
    en: '🪔 Loved this week',
    hi: '🪔 इस सप्ताह प्रिय',
    bn: '🪔 এই সপ্তাহে প্রিয়',
  },
  'search.noResults': {
    en: 'Nothing found — try a different word 🙏',
    hi: 'कुछ नहीं मिला — कोई दूसरा शब्द आज़माएँ 🙏',
    bn: 'কিছু পাওয়া যায়নি — অন্য শব্দ চেষ্টা করুন 🙏',
  },
  'search.typeMore': {
    en: 'Type at least 2 letters to search',
    hi: 'खोजने के लिए कम से कम 2 अक्षर लिखें',
    bn: 'খুঁজতে কমপক্ষে ২টি অক্ষর লিখুন',
  },
  'search.cat.temples': {
    en: '🛕 Temples',
    hi: '🛕 मंदिर',
    bn: '🛕 মন্দির',
  },
  'search.cat.people': {
    en: '👥 People',
    hi: '👥 लोग',
    bn: '👥 মানুষ',
  },
  'search.cat.posts': {
    en: '📝 Posts',
    hi: '📝 पोस्ट',
    bn: '📝 পোস্ট',
  },
  'search.cat.videos': {
    en: '🎬 Videos',
    hi: '🎬 वीडियो',
    bn: '🎬 ভিডিও',
  },
  'search.cat.shorts': {
    en: '⚡ Shorts',
    hi: '⚡ शॉर्ट्स',
    bn: '⚡ শর্টস',
  },
  'search.cat.services': {
    en: '🪔 Services',
    hi: '🪔 सेवाएँ',
    bn: '🪔 সেবা',
  },
  'search.close': {
    en: 'Close search',
    hi: 'खोज बंद करें',
    bn: 'খোঁজ বন্ধ করুন',
  },
  'search.verified': {
    en: 'Verified',
    hi: 'सत्यापित',
    bn: 'যাচাইকৃত',
  },
};

export function st(key: string, lang: string): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  const l = lang === 'hi' ? 'hi' : lang === 'bn' ? 'bn' : 'en';
  return entry[l];
}
