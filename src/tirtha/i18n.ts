/**
 * tirtha/i18n.ts — Tirtha Diary strings (EN/HI/BN).
 * ===================================================
 * Self-contained module: the global schema carries the guide tour
 * strings (guide.tirtha.*), while all diary UI copy lives here so the
 * feature never risks the 10-language type matrix. Other languages
 * fall back to English.
 */

export type TirthaLang = 'en' | 'hi' | 'bn';

export function tirthaLangOf(lang: string | undefined): TirthaLang {
  const l = (lang || 'en').toLowerCase();
  if (l.startsWith('hi')) return 'hi';
  if (l.startsWith('bn')) return 'bn';
  return 'en';
}

const STRINGS: Record<string, Record<TirthaLang, string>> = {
  'diary.title': {
    en: 'My Tirtha Diary',
    hi: 'मेरी तीर्थ डायरी',
    bn: 'আমার তীর্থ ডায়েরি',
  },
  'diary.subtitle': {
    en: 'Your personal pilgrimage journal — only you can see it.',
    hi: 'आपकी व्यक्तिगत तीर्थ यात्रा डायरी — इसे केवल आप देख सकते हैं।',
    bn: 'আপনার ব্যক্তিগত তীর্থ ভ্রমণের ডায়েরি — এটি শুধু আপনিই দেখতে পারবেন।',
  },
  'diary.empty': {
    en: 'No visits recorded yet. When you visit a temple, tap "Record this visit" — your diary begins. 🪔',
    hi: 'अभी कोई यात्रा दर्ज नहीं है। जब आप किसी मंदिर जाएँ, "इस यात्रा को दर्ज करें" दबाएँ — आपकी डायरी शुरू होगी। 🪔',
    bn: 'এখনও কোনো ভ্রমণ লিপিবদ্ধ হয়নি। মন্দিরে গেলে "এই ভ্রমণটি লিপিবদ্ধ করুন" চাপুন — আপনার ডায়েরি শুরু হবে। 🪔',
  },
  'visit.record': {
    en: '🪔 Record this visit',
    hi: '🪔 इस यात्रा को दर्ज करें',
    bn: '🪔 এই ভ্রমণটি লিপিবদ্ধ করুন',
  },
  'visit.templeName': {
    en: 'Temple name',
    hi: 'मंदिर का नाम',
    bn: 'মন্দিরের নাম',
  },
  'visit.templeName.ph': {
    en: 'e.g. Kashi Vishwanath Mandir',
    hi: 'जैसे — काशी विश्वनाथ मंदिर',
    bn: 'যেমন — কাশী বিশ্বনাথ মন্দির',
  },
  'visit.date': {
    en: 'Date of visit',
    hi: 'यात्रा की तिथि',
    bn: 'ভ্রমণের তারিখ',
  },
  'visit.darshan': {
    en: 'Darshan',
    hi: 'दर्शन',
    bn: 'দর্শন',
  },
  'visit.note': {
    en: 'Personal reflection (optional)',
    hi: 'व्यक्तिगत भावना (वैकल्पिक)',
    bn: 'ব্যক্তিগত অনুভূতি (ঐচ্ছিক)',
  },
  'visit.note.ph': {
    en: 'What did this darshan mean to you? Only you will ever read this.',
    hi: 'इस दर्शन का आपके लिए क्या अर्थ था? इसे केवल आप ही पढ़ेंगे।',
    bn: 'এই দর্শন আপনার কাছে কী অর্থ বহন করে? এটি শুধু আপনিই পড়বেন।',
  },
  'visit.photo': {
    en: 'Photo (optional)',
    hi: 'फोटो (वैकल्पिक)',
    bn: 'ছবি (ঐচ্ছিক)',
  },
  'visit.save': {
    en: 'Save to my diary 🙏',
    hi: 'मेरी डायरी में सहेजें 🙏',
    bn: 'আমার ডায়েরিতে সংরক্ষণ করুন 🙏',
  },
  'visit.saved': {
    en: 'Recorded with blessings 🙏',
    hi: 'आशीर्वाद सहित दर्ज 🙏',
    bn: 'আশীর্বাদসহ লিপিবদ্ধ 🙏',
  },
  'visit.forget': {
    en: 'Forget this visit',
    hi: 'इस यात्रा को भूल जाएँ',
    bn: 'এই ভ্রমণটি মুছে ফেলুন',
  },
  'visit.forgotten': {
    en: 'Forgotten — as if it never was.',
    hi: 'भुला दिया — जैसे कभी था ही नहीं।',
    bn: 'মুছে ফেলা হয়েছে — যেন কখনও ছিলই না।',
  },
  'visit.privacyNote': {
    en: 'Private to you. Never shared, never public — only you can see this diary.',
    hi: 'केवल आपके लिए निजी। कभी साझा नहीं, कभी सार्वजनिक नहीं — यह डायरी केवल आप देख सकते हैं।',
    bn: 'শুধু আপনার জন্য ব্যক্তিগত। কখনও শেয়ার হয় না, কখনও প্রকাশ্য নয় — এই ডায়েরি শুধু আপনিই দেখতে পারবেন।',
  },
  'darshan.morning_aarti': { en: 'Morning aarti', hi: 'प्रातः आरती', bn: 'ভোরের আরতি' },
  'darshan.evening_aarti': { en: 'Evening aarti', hi: 'संध्या आरती', bn: 'সন্ধ্যা আরতি' },
  'darshan.festival': { en: 'Festival', hi: 'उत्सव', bn: 'উৎসব' },
  'darshan.quiet_darshan': { en: 'Quiet darshan', hi: 'शांत दर्शन', bn: 'শান্ত দর্শন' },
  'darshan.special_puja': { en: 'Special puja', hi: 'विशेष पूजा', bn: 'বিশেষ পূজা' },
  'darshan.parikrama': { en: 'Parikrama', hi: 'परिक्रमा', bn: 'পরিক্রমা' },
  'darshan.other': { en: 'Other', hi: 'अन्य', bn: 'অন্যান্য' },
  'yatra.title': {
    en: 'My Yatras',
    hi: 'मेरी यात्राएँ',
    bn: 'আমার যাত্রা',
  },
  'yatra.new': {
    en: '+ New yatra',
    hi: '+ नई यात्रा',
    bn: '+ নতুন যাত্রা',
  },
  'yatra.name': {
    en: 'Yatra name',
    hi: 'यात्रा का नाम',
    bn: 'যাত্রার নাম',
  },
  'yatra.name.ph': {
    en: 'e.g. Char Dham 2026',
    hi: 'जैसे — चार धाम 2026',
    bn: 'যেমন — চার ধাম ২০২৬',
  },
  'yatra.reflection': {
    en: 'Reflection on this yatra (optional)',
    hi: 'इस यात्रा पर भावना (वैकल्पिक)',
    bn: 'এই যাত্রা নিয়ে অনুভূতি (ঐচ্ছিক)',
  },
  'yatra.create': {
    en: 'Begin this yatra 🙏',
    hi: 'यह यात्रा आरंभ करें 🙏',
    bn: 'এই যাত্রা শুরু করুন 🙏',
  },
  'yatra.visits': {
    en: 'visits',
    hi: 'यात्राएँ',
    bn: 'ভ্রমণ',
  },
  'yatra.export': {
    en: '📄 Keepsake PDF',
    hi: '📄 स्मृति PDF',
    bn: '📄 স্মৃতি PDF',
  },
  'yatra.exporting': {
    en: 'Preparing your keepsake…',
    hi: 'आपकी स्मृति तैयार हो रही है…',
    bn: 'আপনার স্মৃতি তৈরি হচ্ছে…',
  },
  'yatra.forget': {
    en: 'Forget this yatra',
    hi: 'इस यात्रा को भूल जाएँ',
    bn: 'এই যাত্রা মুছে ফেলুন',
  },
  'stats.temples': {
    en: 'temples visited',
    hi: 'मंदिरों के दर्शन',
    bn: 'মন্দির দর্শন',
  },
  'stats.yatras': {
    en: 'yatras',
    hi: 'यात्राएँ',
    bn: 'যাত্রা',
  },
  'stats.visits': {
    en: 'visits recorded',
    hi: 'यात्राएँ दर्ज',
    bn: 'ভ্রমণ লিপিবদ্ধ',
  },
  'settings.forgetAll': {
    en: 'Forget all visits',
    hi: 'सभी यात्राएँ भूल जाएँ',
    bn: 'সমস্ত ভ্রমণ মুছে ফেলুন',
  },
  'settings.forgetAll.confirm': {
    en: 'This permanently deletes your entire diary. This cannot be undone.',
    hi: 'इससे आपकी पूरी डायरी स्थायी रूप से मिट जाएगी। इसे पूर्ववत नहीं किया जा सकता।',
    bn: 'এতে আপনার সম্পূর্ণ ডায়েরি স্থায়ীভাবে মুছে যাবে। এটি আর ফেরানো যাবে না।',
  },
  'settings.forgetAll.done': {
    en: 'Your diary is empty — a clean new beginning. 🙏',
    hi: 'आपकी डायरी खाली है — एक पवित्र नई शुरुआत। 🙏',
    bn: 'আপনার ডায়েরি খালি — একটি পবিত্র নতুন শুরু। 🙏',
  },
  'common.cancel': { en: 'Cancel', hi: 'रद्द करें', bn: 'বাতিল' },
  'common.close': { en: 'Close', hi: 'बंद करें', bn: 'বন্ধ করুন' },
  'common.delete': { en: 'Delete', hi: 'मिटाएँ', bn: 'মুছুন' },
  'common.save': { en: 'Save', hi: 'सहेजें', bn: 'সংরক্ষণ' },
  'common.loading': { en: 'Loading…', hi: 'लोड हो रहा है…', bn: 'লোড হচ্ছে…' },
};

export function tt(lang: string | undefined, key: string): string {
  const l = tirthaLangOf(lang);
  return STRINGS[key]?.[l] ?? STRINGS[key]?.en ?? key;
}
