/**
 * sangam/stories/i18n.ts — Sangam Stories strings (EN/HI/BN).
 */

export type StoryLang = 'en' | 'hi' | 'bn';

const STRINGS: Record<string, { en: string; hi: string; bn: string }> = {
  'stories.title': {
    en: "🪔 Today's moments",
    hi: '🪔 आज के पल',
    bn: '🪔 আজকের মুহূর্ত',
  },
  'stories.yourStory': {
    en: 'Your story',
    hi: 'आपकी स्टोरी',
    bn: 'আপনার স্টোরি',
  },
  'stories.add': {
    en: 'Add',
    hi: 'जोड़ें',
    bn: 'যোগ করুন',
  },
  'stories.share': {
    en: 'Share to story',
    hi: 'स्टोरी में साझा करें',
    bn: 'স্টোরিতে শেয়ার করুন',
  },
  'stories.photo': {
    en: 'Photo',
    hi: 'फोटो',
    bn: 'ছবি',
  },
  'stories.text': {
    en: 'Text',
    hi: 'टेक्स्ट',
    bn: 'টেক্সট',
  },
  'stories.writeSomething': {
    en: 'Write something uplifting…',
    hi: 'कुछ प्रेरणादायक लिखें…',
    bn: 'কিছু অনুপ্রেরণামূলক লিখুন…',
  },
  'stories.caption': {
    en: 'Caption (optional)',
    hi: 'कैप्शन (वैकल्पिक)',
    bn: 'ক্যাপশন (ঐচ্ছিক)',
  },
  'stories.choosePhoto': {
    en: 'Choose a photo',
    hi: 'फोटो चुनें',
    bn: 'ছবি বেছে নিন',
  },
  'stories.uploading': {
    en: 'Uploading…',
    hi: 'अपलोड हो रहा…',
    bn: 'আপলোড হচ্ছে…',
  },
  'stories.vanish': {
    en: 'Stories vanish after 24 hours — share today\u2019s moment.',
    hi: 'स्टोरी 24 घंटे में गायब हो जाती है — आज का पल साझा करें।',
    bn: 'স্টোরি ২৪ ঘণ্টায় মুছে যায় — আজকের মুহূর্ত শেয়ার করুন।',
  },
  'stories.delete': {
    en: 'Delete story',
    hi: 'स्टोरी हटाएं',
    bn: 'স্টোরি মুছুন',
  },
  'stories.deleteConfirm': {
    en: 'Remove this story? It will vanish for everyone.',
    hi: 'यह स्टोरी हटाएं? यह सभी के लिए गायब हो जाएगी।',
    bn: 'এই স্টোরিটি মুছবেন? এটি সবার জন্য মুছে যাবে।',
  },
  'stories.report': {
    en: 'Report story',
    hi: 'स्टोरी रिपोर्ट करें',
    bn: 'স্টোরি রিপোর্ট করুন',
  },
  'stories.viewCount': {
    en: 'views',
    hi: 'व्यू',
    bn: 'ভিউ',
  },
  'stories.noStories': {
    en: 'No moments yet today. Share the first one — this morning\u2019s aarti, a temple glimpse, a quiet thought.',
    hi: 'आज अभी कोई पल नहीं। पहला साझा करें — सुबह की आरती, मंदिर की झलक, एक शांत विचार।',
    bn: 'আজ এখনও কোনো মুহূর্ত নেই। প্রথমটি শেয়ার করুন — সকালের আরতি, মন্দিরের ঝলক, একটি শান্ত ভাবনা।',
  },
  'stories.expired': {
    en: 'This story has vanished.',
    hi: 'यह स्टोरी गायब हो गई है।',
    bn: 'এই স্টোরিটি মুছে গেছে।',
  },
  'stories.background': {
    en: 'Background',
    hi: 'पृष्ठभूमि',
    bn: 'পটভূমি',
  },
};

export function st(key: string, lang: StoryLang): string {
  const s = STRINGS[key];
  if (!s) return key;
  return s[lang] || s.en;
}
