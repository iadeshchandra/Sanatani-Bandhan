/**
 * darshan/i18n.ts — trilingual strings for Live Darshan.
 * EN/HI/BN. Warm, sacred tone. No alarming language.
 */
export type Lang = 'en' | 'hi' | 'bn';

const STRINGS: Record<string, Record<Lang, string>> = {
  'darshan.live': {
    en: '🔴 Live Darshan',
    hi: '🔴 लाइव दर्शन',
    bn: '🔴 লাইভ দর্শন',
  },
  'darshan.liveFrom': {
    en: '🙏 Live from',
    hi: '🙏 सीधा प्रसारण',
    bn: '🙏 সরাসরি',
  },
  'darshan.offline': {
    en: 'Connect to watch live darshan',
    hi: 'लाइव दर्शन के लिए कनेक्ट करें',
    bn: 'লাইভ দর্শন দেখতে কানেক্ট করুন',
  },
  'darshan.nextAarti': {
    en: 'Next:',
    hi: 'अगला:',
    bn: 'পরবর্তী:',
  },
  'darshan.noSchedule': {
    en: 'No regular schedule published yet',
    hi: 'अभी कोई नियमित समय प्रकाशित नहीं',
    bn: 'এখনও কোনো নিয়মিত সময় প্রকাশিত হয়নি',
  },
  'darshan.linkChannel': {
    en: 'Link YouTube channel',
    hi: 'यूट्यूब चैनल जोड़ें',
    bn: 'ইউটিউব চ্যানেল যুক্ত করুন',
  },
  'darshan.channelHint': {
    en: 'Paste your temple\u2019s YouTube channel ID or channel URL. Devotees will see a \u{1F534} badge when you go live.',
    hi: 'अपने मंदिर का यूट्यूब चैनल ID या URL डालें। लाइव होने पर भक्तों को \u{1F534} बैज दिखेगा।',
    bn: 'আপনার মন্দিরের ইউটিউব চ্যানেল ID বা URL দিন। লাইভ হলে ভক্তরা \u{1F534} ব্যাজ দেখবেন।',
  },
  'darshan.invalidChannel': {
    en: 'That doesn\u2019t look like a channel ID or URL. It should start with \u201CUC\u201D and be 24 characters.',
    hi: 'यह चैनल ID या URL जैसा नहीं लग रहा। यह \u201CUC\u201D से शुरू होकर 24 अक्षरों का होना चाहिए।',
    bn: 'এটি চ্যানেল ID বা URL-এর মতো মনে হচ্ছে না। এটি \u201CUC\u201D দিয়ে শুরু হয়ে 24 অক্ষরের হওয়া উচিত।',
  },
  'darshan.handleNeedsApi': {
    en: '@handles need a YouTube API lookup — please paste the full channel URL instead.',
    hi: '@हैंडल के लिए यूट्यूब API चाहिए — कृपया पूरा चैनल URL डालें।',
    bn: '@handle-এর জন্য ইউটিউব API দরকার — অনুগ্রহ করে পুরো চ্যানেল URL দিন।',
  },
  'darshan.goLive': {
    en: '📹 Go Live',
    hi: '📹 लाइव जाएं',
    bn: '📹 লাইভ করুন',
  },
  'darshan.consentTitle': {
    en: 'Before you go live',
    hi: 'लाइव जाने से पहले',
    bn: 'লাইভ করার আগে',
  },
  'darshan.consentCheck': {
    en: 'Everyone in this booking consents to being on video.',
    hi: 'इस बुकिंग में सभी लोग वीडियो पर आने के लिए सहमत हैं।',
    bn: 'এই বুকিংয়ের সবাই ভিডিওতে আসতে সম্মত আছেন।',
  },
  'darshan.shraddhaWarning': {
    en: '⚠️ This ceremony is private by default (shraddha/funeral). Streaming it is unusual — are you certain the family wants this shared?',
    hi: '⚠️ यह संस्कार डिफ़ॉल्ट रूप से निजी है (श्राद्ध/अंत्येष्टि)। इसे स्ट्रीम करना असामान्य है — क्या परिवार सच में इसे साझा करना चाहता है?',
    bn: '⚠️ এই অনুষ্ঠান ডিফল্টরূপে ব্যক্তিগত (শ্রাদ্ধ/অন্ত্যেষ্টি)। এটি স্ট্রিম করা অস্বাভাবিক — পরিবার কি সত্যিই এটি শেয়ার করতে চায়?',
  },
  'darshan.shraddhaConfirm': {
    en: 'Yes, the family explicitly asked for this stream.',
    hi: 'हाँ, परिवार ने स्पष्ट रूप से इस स्ट्रीम के लिए कहा है।',
    bn: 'হ্যাঁ, পরিবার স্পষ্টভাবে এই স্ট্রিম চেয়েছে।',
  },
  'darshan.startStream': {
    en: 'Start stream',
    hi: 'स्ट्रीम शुरू करें',
    bn: 'স্ট্রিম শুরু করুন',
  },
  'darshan.cancel': {
    en: 'Cancel',
    hi: 'रद्द करें',
    bn: 'বাতিল',
  },
  'darshan.liveNotifTitle': {
    en: '🛕 {temple} is live',
    hi: '🛕 {temple} लाइव है',
    bn: '🛕 {temple} লাইভে আছে',
  },
  'darshan.liveNotifBody': {
    en: 'Join the darshan — {temple} is streaming now.',
    hi: 'दर्शन में जुड़ें — {temple} अभी स्ट्रीम कर रहा है।',
    bn: 'দর্শনে যোগ দিন — {temple} এখন স্ট্রিম করছে।',
  },
};

export function dt(key: string, lang: Lang = 'en'): string {
  return STRINGS[key]?.[lang] ?? STRINGS[key]?.en ?? key;
}

/** Fill {placeholders} in a template string. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
