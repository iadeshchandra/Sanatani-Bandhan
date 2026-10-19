/**
 * sangam/shorts/i18n.ts — Sangam Shorts strings (EN/HI/BN).
 */

export type ShortsLang = 'en' | 'hi' | 'bn';

const STRINGS: Record<string, { en: string; hi: string; bn: string }> = {
  'shorts.title': {
    en: '⚡ Sacred Moments',
    hi: '⚡ पवित्र क्षण',
    bn: '⚡ পবিত্র মুহূর্ত',
  },
  'shorts.tab': {
    en: 'Shorts',
    hi: 'शॉर्ट्स',
    bn: 'শর্টস',
  },
  'shorts.empty': {
    en: 'No sacred moments yet. Share a bhajan clip, a temple glimpse, or a 60-second thought that uplifted you.',
    hi: 'अभी कोई पवित्र क्षण नहीं। कोई भजन, मंदिर की झलक या 60 सेकंड का विचार साझा करें।',
    bn: 'এখনও কোনো পবিত্র মুহূর্ত নেই। একটি ভজন, মন্দিরের ঝলক বা ৬০ সেকেন্ডের চিন্তা শেয়ার করুন।',
  },
  'shorts.share': {
    en: 'Share a short',
    hi: 'शॉर्ट साझा करें',
    bn: 'শর্ট শেয়ার করুন',
  },
  'shorts.shareTitle': {
    en: 'Share a YouTube Short',
    hi: 'YouTube शॉर्ट साझा करें',
    bn: 'YouTube শর্ট শেয়ার করুন',
  },
  'shorts.urlLabel': {
    en: 'YouTube Shorts link',
    hi: 'YouTube शॉर्ट्स लिंक',
    bn: 'YouTube শর্টস লিংক',
  },
  'shorts.urlPlaceholder': {
    en: 'Paste a youtube.com/shorts/ link…',
    hi: 'youtube.com/shorts/ लिंक डालें…',
    bn: 'youtube.com/shorts/ লিংক দিন…',
  },
  'shorts.titleLabel': {
    en: 'Title',
    hi: 'शीर्षक',
    bn: 'শিরোনাম',
  },
  'shorts.titlePlaceholder': {
    en: 'Morning aarti at Kashi Vishwanath 🪔',
    hi: 'काशी विश्वनाथ में प्रातः आरती 🪔',
    bn: 'কাশী বিশ্বনাথে প্রাতঃ আরতি 🪔',
  },
  'shorts.captionLabel': {
    en: 'Caption (optional)',
    hi: 'कैप्शन (वैकल्पिक)',
    bn: 'ক্যাপশন (ঐচ্ছিক)',
  },
  'shorts.captionPlaceholder': {
    en: 'A moment of peace…',
    hi: 'शांति का एक पल…',
    bn: 'শান্তির একটি মুহূর্ত…',
  },
  'shorts.post': {
    en: 'Share moment',
    hi: 'क्षण साझा करें',
    bn: 'মুহূর্ত শেয়ার করুন',
  },
  'shorts.posting': {
    en: 'Sharing…',
    hi: 'साझा हो रहा…',
    bn: 'শেয়ার হচ্ছে…',
  },
  'shorts.errEmpty': {
    en: 'Please paste a YouTube Shorts link first.',
    hi: 'पहले YouTube शॉर्ट्स लिंक डालें।',
    bn: 'প্রথমে একটি YouTube শর্টস লিংক দিন।',
  },
  'shorts.errNotYoutube': {
    en: 'That doesn\'t look like a YouTube link. We only support YouTube Shorts.',
    hi: 'यह YouTube लिंक नहीं लगता। हम केवल YouTube शॉर्ट्स समर्थित करते हैं।',
    bn: 'এটি YouTube লিংক মনে হচ্ছে না। আমরা শুধু YouTube শর্টস সমর্থন করি।',
  },
  'shorts.errTitle': {
    en: 'Please give your moment a title (1–120 characters).',
    hi: 'कृपया अपने क्षण को शीर्षक दें (1–120 अक्षर)।',
    bn: 'আপনার মুহূর্তের একটি শিরোনাম দিন (১–১২০ অক্ষর)।',
  },
  'shorts.errCaption': {
    en: 'Caption is too long — keep it under 200 characters.',
    hi: 'कैप्शन बहुत लंबा है — 200 अक्षरों में रखें।',
    bn: 'ক্যাপশন অনেক লম্বা — ২০০ অক্ষরের মধ্যে রাখুন।',
  },
  'shorts.tapForSound': {
    en: 'Tap for sound',
    hi: 'आवाज़ के लिए टैप करें',
    bn: 'শব্দের জন্য ট্যাপ করুন',
  },
  'shorts.ashirvad': {
    en: 'Ashirvad',
    hi: 'आशीर्वाद',
    bn: 'আশীর্বাদ',
  },
  'shorts.comments': {
    en: 'Comments',
    hi: 'टिप्पणियाँ',
    bn: 'মন্তব্য',
  },
  'shorts.shareAction': {
    en: 'Share',
    hi: 'साझा करें',
    bn: 'শেয়ার করুন',
  },
  'shorts.report': {
    en: 'Report',
    hi: 'रिपोर्ट करें',
    bn: 'রিপোর্ট করুন',
  },
  'shorts.delete': {
    en: 'Delete',
    hi: 'हटाएँ',
    bn: 'মুছুন',
  },
  'shorts.reported': {
    en: 'Thank you — we\'ll take a look. 🙏',
    hi: 'धन्यवाद — हम देखेंगे। 🙏',
    bn: 'ধন্যবাদ — আমরা দেখব। 🙏',
  },
  'shorts.deleted': {
    en: 'Moment deleted.',
    hi: 'क्षण हटा दिया गया।',
    bn: 'মুহূর্ত মুছে ফেলা হয়েছে।',
  },
  'shorts.shared': {
    en: 'Your moment is live. 🪔',
    hi: 'आपका क्षण लाइव है। 🪔',
    bn: 'আপনার মুহূর্ত লাইভ। 🪔',
  },
  'shorts.views': {
    en: 'views',
    hi: 'व्यूज़',
    bn: 'ভিউ',
  },
};

export function st(key: string, lang: ShortsLang): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[lang] || entry.en;
}
