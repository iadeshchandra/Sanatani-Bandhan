/**
 * Sanatani Bandhan — AI Assistant Phase 2 · Corpus: Tithi & Calendar
 * =====================================================================
 * Lunar timekeeping basics. All dates here are lunar-basis explanations;
 * the app computes actual tithis via the Drik panjika engine (tithi_today).
 */
import type { DharmaCorpus } from './types';

export const TITHI_CORPUS: DharmaCorpus = [
  {
    id: 'tithi.what_is',
    topic: 'tithi',
    question_patterns: [
      'what is tithi', 'what is a tithi', 'tithi meaning', 'tithi mane ki',
      'tithi kya hai', 'तिथि क्या है', 'তিথি কী', 'তিথি মানে কি',
      'tithi ki', 'tithi explanation', 'explain tithi',
    ],
    answer: {
      en: `🙏 A tithi is a lunar day — the time it takes the Moon to move 12° away from the Sun. There are 30 tithis in each lunar month, and they govern festivals, vrats, and auspicious timings. Unlike a solar date, a tithi can begin and end at any hour — which is why the panjika matters. 🌙`,
      hi: `🙏 तिथि एक चंद्र दिवस है — चंद्रमा को सूर्य से 12° दूर जाने में जितना समय लगता है। प्रत्येक चंद्र मास में 30 तिथियाँ होती हैं, और ये उत्सवों, व्रतों व शुभ मुहूर्तों का आधार हैं। सौर तारीख से भिन्न, तिथि किसी भी समय शुरू-समाप्त हो सकती है — इसीलिए पंचांग आवश्यक है। 🌙`,
      bn: `🙏 তিথি হলো একটি চান্দ্র দিন — চাঁদের সূর্য থেকে ১২° দূরে যেতে যত সময় লাগে। প্রতি চান্দ্র মাসে ৩০টি তিথি থাকে, আর এগুলোই উৎসব, ব্রত ও শুভ মুহূর্ত নির্ধারণ করে। সৌর তারিখের মতো নয় — তিথি যেকোনো সময়ে শুরু বা শেষ হতে পারে, তাই পঞ্জিকা জরুরি। 🌙`,
    },
    related: ['tithi.ekadashi', 'tithi.purnima', 'tithi.paksha'],
    purohit_escalation: false,
  },
  {
    id: 'tithi.ekadashi',
    topic: 'tithi',
    question_patterns: [
      'ekadashi', 'what is ekadashi', 'ekadashi vrat', 'ekadashi fasting',
      'एकादशी', 'एकादशी क्या है', 'একাদশী', 'একাদশী কী', 'ekadashi kab hai', 'ekadashi kobe',
      'ekadashi meaning', 'why fast on ekadashi',
    ],
    answer: {
      en: `🙏 Ekadashi is the 11th tithi of each lunar fortnight — there are 24 in a year (26 in leap years). Devotees observe it with fasting and extra japa, dedicating the day to Bhagavan Vishnu. The fast is traditionally broken the next morning after sunrise (parana). Each Ekadashi has its own name and story — like Vaikuntha Ekadashi or Nirjala Ekadashi. 🌼`,
      hi: `🙏 एकादशी प्रत्येक चंद्र पक्ष की 11वीं तिथि है — वर्ष में 24 (अधिक मास में 26) होती हैं। भक्त इस दिन उपवास व अधिक जप करते हैं, दिन भगवान विष्णु को समर्पित होता है। व्रत अगले दिन सूर्योदय के बाद खोला जाता है (पारणा)। प्रत्येक एकादशी का अपना नाम व कथा है — जैसे वैकुंठ एकादशी या निर्जला एकादशी। 🌼`,
      bn: `🙏 একাদশী প্রতি চান্দ্র পক্ষের ১১তম তিথি — বছরে ২৪টি (অধিক মাসে ২৬টি) হয়। ভক্তরা এই দিনে উপবাস ও অতিরিক্ত জপ করেন, দিনটি ভগবান বিষ্ণুকে উৎসর্গ করা হয়। পরদিন সূর্যোদয়ের পর ব্রত ভাঙা হয় (পারণা)। প্রতিটি একাদশীর নিজস্ব নাম ও কাহিনি আছে — যেমন বৈকুণ্ঠ একাদশী বা নির্জলা একাদশী। 🌼`,
    },
    related: ['tithi.what_is', 'practice.japa', 'tithi.purnima'],
    purohit_escalation: false,
  },
  {
    id: 'tithi.purnima',
    topic: 'tithi',
    question_patterns: [
      'purnima', 'what is purnima', 'full moon tithi', 'purnima meaning',
      'पूर्णिमा', 'পূর্ণিমা', 'purnima kab', 'purnima kobe',
      'purnima vrat', 'purnima significance',
    ],
    answer: {
      en: `🙏 Purnima is the full-moon tithi — the 15th day of the bright fortnight (Shukla Paksha), when the Moon shines complete. Many festivals fall on Purnima: Guru Purnima, Buddha Purnima, Kartik Purnima, Sharad Purnima. Devotees often fast, offer arghya to Chandra, and gather for kirtan under the full moon. 🌕`,
      hi: `🙏 पूर्णिमा पूर्ण चंद्र की तिथि है — शुक्ल पक्ष का 15वाँ दिन, जब चंद्रमा पूर्ण प्रकाशित होता है। अनेक उत्सव पूर्णिमा को पड़ते हैं: गुरु पूर्णिमा, बुद्ध पूर्णिमा, कार्तिक पूर्णिमा, शरद पूर्णिमा। भक्त प्रायः उपवास रखते हैं, चंद्र को अर्घ्य देते हैं और पूर्णिमा की रात कीर्तन में जुटते हैं। 🌕`,
      bn: `🙏 পূর্ণিমা পূর্ণচন্দ্রের তিথি — শুক্লপক্ষের ১৫তম দিন, যখন চাঁদ সম্পূর্ণ আলোকিত। অনেক উৎসব পূর্ণিমায় পড়ে: গুরু পূর্ণিমা, বুদ্ধ পূর্ণিমা, কার্তিক পূর্ণিমা, শরৎ পূর্ণিমা। ভক্তরা প্রায়ই উপবাস করেন, চন্দ্রকে অর্ঘ্য দেন এবং পূর্ণিমার রাতে কীর্তনে মিলিত হন। 🌕`,
    },
    related: ['tithi.amavasya', 'tithi.paksha', 'festival.guru_purnima'],
    purohit_escalation: false,
  },
  {
    id: 'tithi.amavasya',
    topic: 'tithi',
    question_patterns: [
      'amavasya', 'what is amavasya', 'new moon tithi', 'amavasya meaning',
      'अमावस्या', 'অমাবস্যা', 'amavasya kab', 'amavasya kobe',
      'amavasya significance', 'no moon day',
    ],
    answer: {
      en: `🙏 Amavasya is the new-moon tithi — the 15th day of the dark fortnight (Krishna Paksha), when the Moon is not visible. It is sacred for pitra-tarpana (honouring ancestors) and for quiet introspection. Diwali's Lakshmi Puja falls on Kartik Amavasya — light conquering darkness on the darkest night. 🌑`,
      hi: `🙏 अमावस्या अमावस की तिथि है — कृष्ण पक्ष का 15वाँ दिन, जब चंद्रमा दिखाई नहीं देता। यह पितृ-तर्पण (पूर्वजों का सम्मान) और आत्म-चिंतन के लिए पवित्र है। दीवाली की लक्ष्मी पूजा कार्तिक अमावस्या को होती है — सबसे अंधेरी रात में प्रकाश की अंधकार पर विजय। 🌑`,
      bn: `🙏 অমাবস্যা অমাবস্যার তিথি — কৃষ্ণপক্ষের ১৫তম দিন, যখন চাঁদ দেখা যায় না। এটি পিতৃ-তর্পণ (পূর্বপুরুষদের সম্মান) ও আত্ম-চিন্তনের জন্য পবিত্র। দীপাবলির লক্ষ্মীপূজা কার্তিক অমাবস্যায় হয় — অন্ধকারতম রাতে আলোর অন্ধকারের উপর বিজয়। 🌑`,
    },
    related: ['tithi.purnima', 'tithi.paksha', 'concept.pitra'],
    purohit_escalation: false,
  },
  {
    id: 'tithi.paksha',
    topic: 'tithi',
    question_patterns: [
      'paksha', 'shukla paksha', 'krishna paksha', 'what is paksha',
      'पक्ष', 'পক্ষ', 'shukla krishna', 'bright fortnight', 'dark fortnight',
      'waxing waning moon hindu',
    ],
    answer: {
      en: `🙏 A paksha is a lunar fortnight of about 15 tithis. Shukla Paksha is the bright fortnight — Moon waxing toward Purnima, considered auspicious for beginnings. Krishna Paksha is the dark fortnight — Moon waning toward Amavasya, sacred for introspection and ancestral rites. Together they make one lunar month. 🌗`,
      hi: `🙏 पक्ष लगभग 15 तिथियों का चंद्र पखवाड़ा है। शुक्ल पक्ष उज्ज्वल पखवाड़ा है — चंद्रमा पूर्णिमा की ओर बढ़ता है, शुभारंभों के लिए मंगलकारी माना जाता है। कृष्ण पक्ष अंधकार पखवाड़ा है — चंद्रमा अमावस्या की ओर घटता है, आत्म-चिंतन व पितृ-कर्मों के लिए पवित्र। दोनों मिलकर एक चंद्र मास बनाते हैं। 🌗`,
      bn: `🙏 পক্ষ প্রায় ১৫ তিথির চান্দ্র পক্ষকাল। শুক্লপক্ষ উজ্জ্বল পক্ষ — চাঁদ পূর্ণিমার দিকে বাড়ে, শুভারম্ভের জন্য মঙ্গলজনক বলে মানা হয়। কৃষ্ণপক্ষ অন্ধকার পক্ষ — চাঁদ অমাবস্যার দিকে কমে, আত্ম-চিন্তন ও পিতৃকর্মের জন্য পবিত্র। দুটো মিলে এক চান্দ্র মাস হয়। 🌗`,
    },
    related: ['tithi.what_is', 'tithi.purnima', 'tithi.amavasya'],
    purohit_escalation: false,
  },
  {
    id: 'tithi.calculated',
    topic: 'tithi',
    question_patterns: [
      'how is tithi calculated', 'tithi calculation', 'how tithi works',
      'tithi ganana', 'तिथि गणना', 'তিথি গণনা', 'how panjika calculates',
    ],
    answer: {
      en: `🙏 A tithi is calculated from the angular distance between the Sun and Moon — every 12° of separation marks one tithi. Because the Moon's speed varies, tithis are not exactly 24 hours; some are "short" and some "long." The panjika tracks this precisely, which is why our app computes your tithi live rather than guessing from the calendar date. 📿`,
      hi: `🙏 तिथि की गणना सूर्य व चंद्रमा के कोणीय अंतर से होती है — हर 12° के अंतर पर एक तिथि। चंद्रमा की गति बदलती रहती है, इसलिए तिथियाँ ठीक 24 घंटे की नहीं होतीं; कुछ "छोटी" और कुछ "लंबी" होती हैं। पंचांग इसे सटीकता से देखता है — इसीलिए हमारा ऐप आपकी तिथि कैलेंडर तारीख से अनुमान लगाने के बजाय लाइव गणना करता है। 📿`,
      bn: `🙏 তিথির গণনা হয় সূর্য ও চাঁদের কৌণিক দূরত্ব থেকে — প্রতি ১২° ব্যবধানে একটি তিথি। চাঁদের গতি বদলায় বলে তিথি ঠিক ২৪ ঘণ্টার হয় না; কিছু "ছোট", কিছু "বড়"। পঞ্জিকা এটি নিখুঁতভাবে ধরে — তাই আমাদের অ্যাপ ক্যালেন্ডার তারিখ থেকে অনুমান না করে আপনার তিথি লাইভ গণনা করে। 📿`,
    },
    related: ['tithi.what_is', 'tithi.paksha'],
    purohit_escalation: false,
  },
  {
    id: 'tithi.sankranti',
    topic: 'tithi',
    question_patterns: [
      'sankranti', 'what is sankranti', 'makar sankranti', 'sankranti meaning',
      'संक्रांति', 'সংক্রান্তি', 'mesha sankranti', 'solar transit',
    ],
    answer: {
      en: `🙏 Sankranti marks the Sun's transit from one rashi (zodiac sign) into the next — it happens roughly monthly. Makar Sankranti (mid-January), when the Sun enters Capricorn, is the most celebrated: it marks the end of winter's darkness and the Sun's northward journey (Uttarayana). In Tamil Nadu it's Pongal, in Assam it's Magh Bihu, in Punjab it's Lohri — one Sun, many celebrations. ☀️`,
      hi: `🙏 संक्रांति सूर्य के एक राशि से दूसरी राशि में प्रवेश का क्षण है — लगभग मासिक होता है। मकर संक्रांति (जनवरी मध्य), जब सूर्य मकर में प्रवेश करता है, सबसे प्रसिद्ध है: यह शीत के अंधकार का अंत और सूर्य की उत्तरायण यात्रा का आरंभ है। तमिलनाडु में यह पोंगल है, असम में माघ बिहू, पंजाब में लोहड़ी — एक सूर्य, अनेक उत्सव। ☀️`,
      bn: `🙏 সংক্রান্তি সূর্যের এক রাশি থেকে পরের রাশিতে প্রবেশের মুহূর্ত — প্রায় মাসিক হয়। মকর সংক্রান্তি (জানুয়ারির মাঝামাঝি), যখন সূর্য মকরে প্রবেশ করে, সবচেয়ে বিখ্যাত: এটি শীতের অন্ধকারের অবসান ও সূর্যের উত্তরায়ণ যাত্রার শুরু। তামিলনাড়ুতে এটি পোঙ্গল, আসামে মাঘ বিহু, পাঞ্জাবে লোহড়ি — এক সূর্য, বহু উৎসব। ☀️`,
    },
    related: ['festival.makar_sankranti', 'tithi.calculated'],
    purohit_escalation: false,
  },
  {
    id: 'tithi.vs_date',
    topic: 'tithi',
    question_patterns: [
      'tithi vs date', 'tithi and english date', 'why tithi different from date',
      'tithi date mismatch', 'তিথি তারিখ পার্থক্য', 'तिथि तारीख अंतर',
    ],
    answer: {
      en: `🙏 A calendar date follows the Sun (midnight to midnight), but a tithi follows the Moon — so they rarely align neatly. One tithi can span parts of two English dates, or two tithis can fall in a single day (rarely, a tithi is skipped entirely — "kshaya tithi"). This is why festivals are announced by tithi, and why our app shows you the live tithi rather than converting from the date. 🌙`,
      hi: `🙏 कैलेंडर तारीख सूर्य का अनुसरण करती है (मध्यरात्रि से मध्यरात्रि), पर तिथि चंद्रमा का — इसलिए दोनों शायद ही कभी सीधे मिलते हैं। एक तिथि दो अंग्रेजी तारीखों में बँट सकती है, या एक ही दिन में दो तिथियाँ पड़ सकती हैं (कभी-कभी तिथि छूट भी जाती है — "क्षय तिथि")। इसीलिए उत्सव तिथि से घोषित होते हैं, और हमारा ऐप तारीख से अनुमान लगाने के बजाय लाइव तिथि दिखाता है। 🌙`,
      bn: `🙏 ক্যালেন্ডার তারিখ সূর্যকে অনুসরণ করে (মধ্যরাত থেকে মধ্যরাত), কিন্তু তিথি চাঁদকে — তাই দুটো কদাচিৎ মেলে। একটি তিথি দুটি ইংরেজি তারিখে ভাগ হতে পারে, বা একদিনে দুটি তিথি পড়তে পারে (কখনও তিথি বাদও যায় — "ক্ষয় তিথি")। তাই উৎসব তিথি দিয়ে ঘোষণা হয়, আর আমাদের অ্যাপ তারিখ থেকে রূপান্তর না করে লাইভ তিথি দেখায়। 🌙`,
    },
    related: ['tithi.what_is', 'tithi.calculated'],
    purohit_escalation: false,
  },
];
