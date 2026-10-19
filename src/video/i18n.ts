/**
 * video/i18n.ts — gentle video upload guidance strings (EN/HI/BN).
 */

export type VideoGuideLang = 'en' | 'hi' | 'bn';

const STRINGS: Record<string, { en: string; hi: string; bn: string }> = {
  'vg.title': {
    en: "Your video belongs here — let's get it in.",
    hi: 'आपका वीडियो यहीं का है — चलिए इसे लाते हैं।',
    bn: 'আপনার ভিডিও এখানেই মানায় — চলুন নিয়ে আসি।',
  },
  'vg.why': {
    en: 'We keep Sanatani Bandhan free forever by not storing videos ourselves. But your moment still belongs here — here\'s the 30-second path:',
    hi: 'सनातनी बंधन को हमेशा मुफ़्त रखने के लिए हम वीडियो स्वयं स्टोर नहीं करते। लेकिन आपका पल यहीं का है — ये रहा 30-सेकंड का रास्ता:',
    bn: 'সনাতনী বন্ধন চিরকাল ফ্রি রাখতে আমরা নিজেরা ভিডিও সংরক্ষণ করি না। কিন্তু আপনার মুহূর্ত এখানেই মানায় — এই নিন ৩০ সেকেন্ডের পথ:',
  },
  'vg.step1': {
    en: 'Upload to YouTube (free)',
    hi: 'YouTube पर अपलोड करें (मुफ़्त)',
    bn: 'YouTube-এ আপলোড করুন (ফ্রি)',
  },
  'vg.showHow': {
    en: 'Show me how',
    hi: 'कैसे करें दिखाएं',
    bn: 'কীভাবে দেখান',
  },
  'vg.step2': {
    en: 'Copy the link',
    hi: 'लिंक कॉपी करें',
    bn: 'লিংক কপি করুন',
  },
  'vg.step3': {
    en: "Paste it below — we'll make it beautiful",
    hi: 'नीचे डालें — हम इसे सुंदर बनाएंगे',
    bn: 'নিচে দিন — আমরা এটিকে সুন্দর করে তুলব',
  },
  'vg.how1t': {
    en: 'Open the YouTube app',
    hi: 'YouTube ऐप खोलें',
    bn: 'YouTube অ্যাপ খুলুন',
  },
  'vg.how1b': {
    en: 'Tap the + button at the bottom, then "Upload a video".',
    hi: 'नीचे + बटन दबाएं, फिर "वीडियो अपलोड करें" चुनें।',
    bn: 'নিচে + বোতাম চাপুন, তারপর "ভিডিও আপলোড" বেছে নিন।',
  },
  'vg.how2t': {
    en: 'Choose your video',
    hi: 'अपना वीडियो चुनें',
    bn: 'আপনার ভিডিও বেছে নিন',
  },
  'vg.how2b': {
    en: 'Pick the video from your gallery and tap Upload. It takes a moment.',
    hi: 'गैलरी से वीडियो चुनें और अपलोड दबाएं। थोड़ा समय लगेगा।',
    bn: 'গ্যালারি থেকে ভিডিও বেছে আপলোড চাপুন। একটু সময় নেবে।',
  },
  'vg.how3t': {
    en: 'Share → Copy link',
    hi: 'शेयर → लिंक कॉपी',
    bn: 'শেয়ার → লিংক কপি',
  },
  'vg.how3b': {
    en: 'Open your video, tap Share, then "Copy link". Paste it below. 🙏',
    hi: 'अपना वीडियो खोलें, शेयर दबाएं, फिर "लिंक कॉपी" करें। नीचे डालें। 🙏',
    bn: 'আপনার ভিডিও খুলুন, শেয়ার চাপুন, তারপর "লিংক কপি" করুন। নিচে দিন। 🙏',
  },
  'vg.urlLabel': {
    en: 'YouTube link',
    hi: 'YouTube लिंक',
    bn: 'YouTube লিংক',
  },
  'vg.urlPlaceholder': {
    en: 'Paste your YouTube link…',
    hi: 'अपना YouTube लिंक डालें…',
    bn: 'আপনার YouTube লিংক দিন…',
  },
  'vg.titleLabel': {
    en: 'Give it a title',
    hi: 'इसे एक शीर्षक दें',
    bn: 'একটি শিরোনাম দিন',
  },
  'vg.titlePlaceholder': {
    en: 'e.g. Morning aarti at our temple 🪔',
    hi: 'जैसे — हमारे मंदिर की प्रातः आरती 🪔',
    bn: 'যেমন — আমাদের মন্দিরের প্রভাতী আরতি 🪔',
  },
  'vg.share': {
    en: 'Share to Watch',
    hi: 'Watch में साझा करें',
    bn: 'Watch-এ শেয়ার করুন',
  },
  'vg.send': {
    en: 'Use this link',
    hi: 'इस लिंक का उपयोग करें',
    bn: 'এই লিংক ব্যবহার করুন',
  },
  'vg.remember': {
    en: 'Remember my YouTube channel (next time is one tap)',
    hi: 'मेरा YouTube चैनल याद रखें (अगली बार एक टैप)',
    bn: 'আমার YouTube চ্যানেল মনে রাখুন (পরের বার এক ট্যাপ)',
  },
  'vg.recentUploads': {
    en: 'Your recent uploads',
    hi: 'आपके हाल के अपलोड',
    bn: 'আপনার সাম্প্রতিক আপলোড',
  },
  'vg.openChannel': {
    en: 'Open my channel to copy a link',
    hi: 'लिंक कॉपी करने के लिए मेरा चैनल खोलें',
    bn: 'লিংক কপি করতে আমার চ্যানেল খুলুন',
  },
  'vg.errInvalidUrl': {
    en: "That doesn't look like a YouTube video link — could you check it once more? 🙏",
    hi: 'यह YouTube वीडियो लिंक नहीं लग रहा — एक बार फिर देखेंगे? 🙏',
    bn: 'এটি YouTube ভিডিও লিংক মনে হচ্ছে না — আরেকবার দেখবেন? 🙏',
  },
  'vg.errTitle': {
    en: 'Please give your video a short title (up to 120 characters).',
    hi: 'कृपया अपने वीडियो को छोटा शीर्षक दें (120 अक्षर तक)।',
    bn: 'আপনার ভিডিওর একটি ছোট শিরোনাম দিন (১২০ অক্ষর পর্যন্ত)।',
  },
  'vg.sharedOk': {
    en: 'Your video is shining in Watch 🪔',
    hi: 'आपका वीडियो Watch में चमक रहा है 🪔',
    bn: 'আপনার ভিডিও Watch-এ ঝলমল করছে 🪔',
  },
  'vg.watchNote': {
    en: 'It will appear in Watch — our home for videos — where the whole sangam can find it.',
    hi: 'यह Watch में दिखेगा — वीडियो का हमारा घर — जहां पूरा संगम इसे पाएगा।',
    bn: 'এটি Watch-এ দেখা যাবে — ভিডিওর আমাদের ঘর — যেখানে পুরো সঙ্গম এটি পাবে।',
  },
  'vg.errChannelUrl': {
    en: "That doesn't look like a YouTube channel link — it usually looks like youtube.com/@yourname.",
    hi: 'यह YouTube चैनल लिंक नहीं लग रहा — यह आमतौर पर youtube.com/@आपकानाम जैसा होता है।',
    bn: 'এটি YouTube চ্যানেল লিংক মনে হচ্ছে না — সাধারণত youtube.com/@আপনারনাম এর মতো হয়।',
  },
  'vg.channelLabel': {
    en: 'Your YouTube channel link',
    hi: 'आपके YouTube चैनल का लिंक',
    bn: 'আপনার YouTube চ্যানেলের লিংক',
  },
  'vg.channelPlaceholder': {
    en: 'youtube.com/@yourname',
    hi: 'youtube.com/@आपकानाम',
    bn: 'youtube.com/@আপনারনাম',
  },
  'vg.close': {
    en: 'Close',
    hi: 'बंद करें',
    bn: 'বন্ধ করুন',
  },
};

export function vg(key: string, lang: VideoGuideLang): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[lang] || entry.en;
}
