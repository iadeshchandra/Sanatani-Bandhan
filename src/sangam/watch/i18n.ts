/**
 * sangam/watch/i18n.ts — Sangam Watch strings (EN/HI/BN).
 */

export type WatchLang = 'en' | 'hi' | 'bn';

const STRINGS: Record<string, { en: string; hi: string; bn: string }> = {
  'watch.title': {
    en: 'Watch',
    hi: 'देखें',
    bn: 'দেখুন',
  },
  'watch.liveNow': {
    en: '🔴 Live Now',
    hi: '🔴 अभी लाइव',
    bn: '🔴 এখন লাইভ',
  },
  'watch.shared': {
    en: '🎬 Shared Videos',
    hi: '🎬 साझा वीडियो',
    bn: '🎬 শেয়ার করা ভিডিও',
  },
  'watch.sevaDemos': {
    en: '🪔 Seva Demos',
    hi: '🪔 सेवा डेमो',
    bn: '🪔 সেবা ডেমো',
  },
  'watch.noLive': {
    en: 'No temples are live right now. When a temple you follow streams, it appears here.',
    hi: 'अभी कोई मंदिर लाइव नहीं है। जब आपके मंदिर लाइव होंगे, वे यहाँ दिखेंगे।',
    bn: 'এখন কোনো মন্দির লাইভ নেই। আপনার মন্দির লাইভ হলে এখানে দেখা যাবে।',
  },
  'watch.noShared': {
    en: 'No shared videos yet. Share a bhajan, discourse, or yatra moment that uplifted you.',
    hi: 'अभी कोई साझा वीडियो नहीं। कोई भजन, प्रवचन या यात्रा का पल साझा करें।',
    bn: 'এখনও কোনো শেয়ার করা ভিডিও নেই। একটি ভজন, প্রবচন বা যাত্রার মুহূর্ত শেয়ার করুন।',
  },
  'watch.noDemos': {
    en: 'No seva demos yet. Verified providers can share their introduction videos here.',
    hi: 'अभी कोई सेवा डेमो नहीं। सत्यापित प्रदाता अपने परिचय वीडियो यहाँ साझा कर सकते हैं।',
    bn: 'এখনও কোনো সেবা ডেমো নেই। যাচাইকৃত প্রদানকারীরা এখানে পরিচয় ভিডিও শেয়ার করতে পারেন।',
  },
  'watch.share': {
    en: 'Share video',
    hi: 'वीडियो साझा करें',
    bn: 'ভিডিও শেয়ার করুন',
  },
  'watch.shareTitle': {
    en: 'Share a YouTube video',
    hi: 'YouTube वीडियो साझा करें',
    bn: 'YouTube ভিডিও শেয়ার করুন',
  },
  'watch.urlLabel': {
    en: 'YouTube link',
    hi: 'YouTube लिंक',
    bn: 'YouTube লিংক',
  },
  'watch.urlPlaceholder': {
    en: 'Paste a YouTube link…',
    hi: 'YouTube लिंक डालें…',
    bn: 'YouTube লিংক দিন…',
  },
  'watch.titleLabel': {
    en: 'Title',
    hi: 'शीर्षक',
    bn: 'শিরোনাম',
  },
  'watch.captionLabel': {
    en: 'Caption (optional)',
    hi: 'कैप्शन (वैकल्पिक)',
    bn: 'ক্যাপশন (ঐচ্ছিক)',
  },
  'watch.categoryLabel': {
    en: 'Kind',
    hi: 'प्रकार',
    bn: 'ধরন',
  },
  'watch.catShared': {
    en: 'Shared — bhajan, discourse, yatra',
    hi: 'साझा — भजन, प्रवचन, यात्रा',
    bn: 'শেয়ার — ভজন, প্রবচন, যাত্রা',
  },
  'watch.catDemo': {
    en: 'Seva demo — my introduction',
    hi: 'सेवा डेमो — मेरा परिचय',
    bn: 'সেবা ডেমো — আমার পরিচয়',
  },
  'watch.post': {
    en: 'Share',
    hi: 'साझा करें',
    bn: 'শেয়ার করুন',
  },
  'watch.errInvalidUrl': {
    en: 'That does not look like a YouTube video link. Try youtube.com/watch or youtu.be.',
    hi: 'यह YouTube वीडियो लिंक नहीं लगता। youtube.com/watch या youtu.be आज़माएँ।',
    bn: 'এটি YouTube ভিডিও লিংক মনে হচ্ছে না। youtube.com/watch বা youtu.be চেষ্টা করুন।',
  },
  'watch.errTitle': {
    en: 'Please give the video a title.',
    hi: 'कृपया वीडियो को शीर्षक दें।',
    bn: 'ভিডিওটির একটি শিরোনাম দিন।',
  },
  'watch.sharedOk': {
    en: '🙏 Video shared with the sangha.',
    hi: '🙏 वीडियो संघ के साथ साझा किया गया।',
    bn: '🙏 ভিডিওটি সঙ্ঘের সাথে শেয়ার করা হয়েছে।',
  },
  'watch.report': {
    en: 'Report',
    hi: 'रिपोर्ट',
    bn: 'রিপোর্ট',
  },
  'watch.reported': {
    en: 'Thank you — our sevadars will review this.',
    hi: 'धन्यवाद — हमारे सेवादार इसकी समीक्षा करेंगे।',
    bn: 'ধন্যবাদ — আমাদের সেবাদাররা এটি পর্যালোচনা করবেন।',
  },
  'watch.delete': {
    en: 'Remove',
    hi: 'हटाएँ',
    bn: 'সরান',
  },
  'watch.book': {
    en: '🙏 Book',
    hi: '🙏 बुक करें',
    bn: '🙏 বুক করুন',
  },
  'watch.liveFrom': {
    en: 'Live from',
    hi: 'लाइव:',
    bn: 'লাইভ:',
  },
  'watch.tourTitle': {
    en: 'Sangam Watch',
    hi: 'संगम वॉच',
    bn: 'সঙ্গম ওয়াচ',
  },
};

export function wt(key: string, lang: WatchLang): string {
  const s = STRINGS[key];
  if (!s) return key;
  return s[lang] || s.en;
}
