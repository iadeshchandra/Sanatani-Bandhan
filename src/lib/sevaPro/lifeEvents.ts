/**
 * lifeEvents.ts — Samskara / life-event index for the unified seva catalog.
 * ========================================================================
 * Life events are SAMSKARAS, not "use cases". Each event maps to the services
 * it traditionally calls for across BOTH specializations — jyotish first for
 * timing/counsel, purohit for the ritual itself.
 *
 * Institution-neutral: entries honor dharmic tradition without tying to one
 * sampradaya. Auspicious-timing notes are RESPECTFUL, NEVER prescriptive —
 * only the jyotishi decides the muhurat; this catalog must not read like a
 * date-picking oracle.
 *
 * Trilingual EN / BN / HI throughout. No locale-specific pricing anywhere.
 */

export type DisplayLang = 'en' | 'bn' | 'hi';

export interface TriText {
  en: string;
  bn: string;
  hi: string;
}

export type ServiceRole = 'purohit' | 'jyotish';

export interface LifeEventService {
  /** Stable key for gig matching / bundle items. */
  key: string;
  role: ServiceRole;
  title: TriText;
  /** One line on what the yajman receives. */
  note: TriText;
}

export interface LifeEvent {
  id: string;
  /** Is this a traditional samskara (vs. a counsel occasion like vastu)? */
  samskara: boolean;
  name: TriText;
  /** Warm, dignified one-liner. */
  description: TriText;
  /** Ordered: counsel/timing steps first, ritual steps after. */
  services: LifeEventService[];
  /**
   * Auspicious-timing note — respectful, never prescriptive. Always defers to
   * the jyotishi. Required on every event.
   */
  timingNote: TriText;
}

const t = (en: string, bn: string, hi: string): TriText => ({ en, bn, hi });

const respectTiming = (
  en: string,
  bn: string,
  hi: string,
  extraEn = '', extraBn = '', extraHi = ''
): TriText => t(
  `A learned jyotishi studies the kundali and the panjika to find the shubh muhurat — trust their counsel over any calendar date.${extraEn ? ' ' + extraEn : ''}`,
  `বিজ্ঞ জ্যোতিষী কুণ্ডলী ও পঞ্জিকা দেখে শুভ মুহূর্ত নির্ধারণ করেন — ক্যালেন্ডারের তারিখের চেয়ে তাঁদের পরামর্শেই আস্থা রাখুন।${extraBn ? ' ' + extraBn : ''}`,
  `विद्वान ज्योतिषी कुंडली और पंचांग देखकर शुभ मुहूर्त निकालते हैं — कैलेंडर की तारीख से अधिक उनके परामर्श पर भरोसा रखें।${extraHi ? ' ' + extraHi : ''}`
);

export const LIFE_EVENTS: LifeEvent[] = [
  {
    id: 'vivah',
    samskara: true,
    name: t('Vivah · Wedding', 'বিবাহ', 'विवाह'),
    description: t(
      'The sacred union of two souls and two families — the most celebrated samskara of life.',
      'দুই আত্মা ও দুই পরিবারের পবিত্র মিলন — জীবনের সর্বাধিক আনন্দের সংস্কার।',
      'दो आत्माओं और दो परिवारों का पवित्र मिलन — जीवन का सबसे उल्लासमय संस्कार।'
    ),
    services: [
      {
        key: 'kundali-milan',
        role: 'jyotish',
        title: t('Kundali Milan', 'কুণ্ডলী মিলন', 'कुंडली मिलान'),
        note: t('Guna matching and counsel for the couple and families.', 'বর-কনের গুণ মিলন ও পরিবারের জন্য পরামর্শ।', 'वर-वधू का गुण मिलान और परिवार हेतु परामर्श।'),
      },
      {
        key: 'vivah-muhurat',
        role: 'jyotish',
        title: t('Vivah Muhurat', 'বিবাহের শুভ মুহূর্ত', 'विवाह मुहूर्त'),
        note: t('A shubh muhurat chosen from both kundalis and the panjika.', 'উভয়ের কুণ্ডলী ও পঞ্জিকা দেখে শুভ মুহূর্ত নির্বাচন।', 'दोनों कुंडली और पंचांग से शुभ मुहूर्त का चयन।'),
      },
      {
        key: 'vivah-puja',
        role: 'purohit',
        title: t('Vivah Sanskar', 'বিবাহ সংস্কার', 'विवाह संस्कार'),
        note: t('Complete wedding rites — saptapadi, homa, kanyadaan — at home or mandap.', 'সম্পূর্ণ বিবাহ বিধি — সপ্তপদী, হোম, কন্যাদান — বাড়ি বা মণ্ডপে।', 'पूर्ण विवाह विधि — सप्तपदी, होम, कन्यादान — घर या मंडप में।'),
      },
    ],
    timingNote: respectTiming('', '', '',
      'Book the jyotishi first; the muhurat shapes every other plan.',
      'আগে জ্যোতিষীর পরামর্শ নিন; মুহূর্তই অন্য সব পরিকল্পনা নির্ধারণ করে।',
      'पहले ज्योतिषी से परामर्श लें; मुहूर्त ही शेष योजना तय करता है।'),
  },
  {
    id: 'griha-pravesh',
    samskara: true,
    name: t('Griha Pravesh · Housewarming', 'গৃহপ্রবেশ', 'गृह प्रवेश'),
    description: t(
      'Entering a new home with Vastu harmony and divine blessing — may it be filled with shanti and samriddhi.',
      'বাস্তু সামঞ্জস্য ও ঐশ্বরিক আশীর্বাদে নতুন গৃহে প্রবেশ — শান্তি ও সমৃদ্ধিতে ভরে উঠুক।',
      'वास्तु सामंजस्य और दिव्य आशीर्वाद के साथ नए घर में प्रवेश — शांति और समृद्धि से भरा रहे।'
    ),
    services: [
      {
        key: 'vastu-review',
        role: 'jyotish',
        title: t('Vastu Review', 'বাস্তু পর্যালোচনা', 'वास्तु समीक्षा'),
        note: t('Directional harmony of the new home, with gentle remedies.', 'নতুন গৃহের দিকগত সামঞ্জস্য ও স্নেহপূর্ণ উপায়।', 'नए घर की दिशागत समरसता और सौम्य उपाय।'),
      },
      {
        key: 'griha-muhurat',
        role: 'jyotish',
        title: t('Griha Pravesh Muhurat', 'গৃহপ্রবেশের মুহূর্ত', 'गृह प्रवेश मुहूर्त'),
        note: t('The most auspicious day and hour for the first entry.', 'প্রথম প্রবেশের সর্বাধিক শুভ দিন ও মুহূর্ত।', 'प्रथम प्रवेश हेतु सर्वाधिक शुभ दिन और मुहूर्त।'),
      },
      {
        key: 'griha-pravesh-puja',
        role: 'purohit',
        title: t('Griha Pravesh Puja', 'গৃহপ্রবেশ পূজা', 'गृह प्रवेश पूजा'),
        note: t('Ganapati puja, Vastu shanti and homa to sanctify the home.', 'গৃহ পবিত্র করতে গণপতি পূজা, বাস্তু শান্তি ও হোম।', 'घर को पवित्र करने हेतु गणपति पूजा, वास्तु शांति और होम।'),
      },
    ],
    timingNote: respectTiming('', '', '',
      'The first step across the threshold should be at the muhurat — plan backwards from it.',
      'দেহলি পেরোনোর প্রথম পদক্ষেপ মুহূর্তে হওয়া উচিত — সেখান থেকে পেছনে পরিকল্পনা করুন।',
      'देहलीज़ पर पहला कदम मुहूर्त में हो — वहीं से पीछे की ओर योजना बनाएं।'),
  },
  {
    id: 'naamkaran',
    samskara: true,
    name: t('Naamkaran · Naming Ceremony', 'নামকরণ', 'नामकरण'),
    description: t(
      'The child receives a name written in the stars — a first blessing that echoes for a lifetime.',
      'শিশু পায় তারাদের লেখা নাম — জীবনভরের প্রথম আশীর্বাদ।',
      'शिशु को तारों में लिखा नाम मिलता है — जीवनभर गूँजने वाला पहला आशीर्वाद।'
    ),
    services: [
      {
        key: 'naam-suggestion',
        role: 'jyotish',
        title: t('Naam Akshar Guidance', 'নামের অক্ষর নির্দেশনা', 'नाम अक्षर मार्गदर्शन'),
        note: t('Auspicious starting syllables from the janma nakshatra.', 'জন্ম নক্ষত্র থেকে শুভ শুরুর অক্ষর।', 'जन्म नक्षत्र से शुभ आरंभिक अक्षर।'),
      },
      {
        key: 'naamkaran-puja',
        role: 'purohit',
        title: t('Naamkaran Sanskar', 'নামকরণ সংস্কার', 'नामकरण संस्कार'),
        note: t('Whispering the name with Vedic mantras, usually on the 11th day or later.', 'বৈদিক মন্ত্রে নাম উচ্চারণ — সাধারণত ১১তম দিন বা পরে।', 'वैदिक मंत्रों से नामोच्चारण — प्रायः ११वें दिन या बाद में।'),
      },
    ],
    timingNote: respectTiming('', '', ''),
  },
  {
    id: 'annaprashan',
    samskara: true,
    name: t('Annaprashan · First Rice', 'অন্নপ্রাশন', 'अन्नप्राशन'),
    description: t(
      "The child's first taste of solid food — offered first to the divine, then with love to the little one.",
      'শিশুর প্রথম কঠিন খাদ্যের স্বাদ — প্রথমে ঐশ্বরিকের নিবেদন, তারপর ভালোবাসায় ছোট্টটির।',
      'शिशु के पहले ठोस आहार का स्वाद — पहले दिव्य को अर्पण, फिर प्रेम से नन्हे को।'
    ),
    services: [
      {
        key: 'annaprashan-muhurat',
        role: 'jyotish',
        title: t('Annaprashan Muhurat', 'অন্নপ্রাশনের মুহূর্ত', 'अन्नप्राशन मुहूर्त'),
        note: t('Shubh muhurat in the 6th–8th month, per the child\'s kundali.', 'শিশুর কুণ্ডলী অনুযায়ী ৬ষ্ঠ–৮ম মাসে শুভ মুহূর্ত।', 'शिशु की कुंडली अनुसार ६वें–८वें मास में शुभ मुहूर्त।'),
      },
      {
        key: 'annaprashan-puja',
        role: 'purohit',
        title: t('Annaprashan Sanskar', 'অন্নপ্রাশন সংস্কার', 'अन्नप्राशन संस्कार'),
        note: t('Annapurna puja and the first feeding with mantras.', 'অন্নপূর্ণা পূজা ও মন্ত্রে প্রথম খাওয়ানো।', 'अन्नपूर्णा पूजा और मंत्रों से प्रथम भोजन।'),
      },
    ],
    timingNote: respectTiming('', '', ''),
  },
  {
    id: 'mundan',
    samskara: true,
    name: t('Mundan · First Haircut', 'মুণ্ডন / চূড়াকরণ', 'मुंडन'),
    description: t(
      'Shedding the hair of birth — a fresh, pure beginning for the child.',
      'জন্মের কেশ ত্যাগ — শিশুর জন্য নব, পবিত্র সূচনা।',
      'जन्म के केशों का त्याग — शिशु हेतु नवीन, पवित्र आरंभ।'
    ),
    services: [
      {
        key: 'mundan-muhurat',
        role: 'jyotish',
        title: t('Mundan Muhurat', 'মুণ্ডনের মুহূর্ত', 'मुंडन मुहूर्त'),
        note: t('Shubh tithi for the first haircut, often in the 1st or 3rd year.', 'প্রথম চুল কাটার শুভ তিথি — প্রায়শই ১ম বা ৩য় বছরে।', 'प्रथम केशकर्तन हेतु शुभ तिथि — प्रायः प्रथम या तृतीय वर्ष में।'),
      },
      {
        key: 'mundan-puja',
        role: 'purohit',
        title: t('Mundan Sanskar', 'মুণ্ডন সংস্কার', 'मुंडन संस्कार'),
        note: t('Sankalp, hair offering and blessings for the child\'s health.', 'সংকল্প, কেশ নিবেদন ও শিশুর সুস্বাস্থ্যের আশীর্বাদ।', 'संकल्प, केश अर्पण और शिशु के स्वास्थ्य हेतु आशीर्वाद।'),
      },
    ],
    timingNote: respectTiming('', '', ''),
  },
  {
    id: 'upanayanam',
    samskara: true,
    name: t('Upanayanam · Sacred Thread', 'উপনয়ন', 'उपनयन'),
    description: t(
      'The child is led to the guru and to learning — the second birth of the seeker.',
      'শিশু গুরু ও বিদ্যার পথে — সাধকের দ্বিতীয় জন্ম।',
      'शिशु गुरु और विद्या के मार्ग पर — साधक का द्वितीय जन्म।'
    ),
    services: [
      {
        key: 'upanayanam-muhurat',
        role: 'jyotish',
        title: t('Upanayanam Muhurat', 'উপনয়নের মুহূর্ত', 'उपनयन मुहूर्त'),
        note: t('Uttarayana-season muhurat suited to the child\'s kundali.', 'শিশুর কুণ্ডলী অনুযায়ী উত্তরায়ণ ঋতুর মুহূর্ত।', 'शिशु की कुंडली अनुकूल उत्तरायण ऋतु का मुहूर्त।'),
      },
      {
        key: 'upanayanam-puja',
        role: 'purohit',
        title: t('Upanayanam Sanskar', 'উপনয়ন সংস্কার', 'उपनयन संस्कार'),
        note: t('Yajnopaveet dharan, Gayatri upadesh and bhiksha rites.', 'যজ্ঞোপবীত ধারণ, গায়ত্রী উপদেশ ও ভিক্ষা বিধি।', 'यज्ञोपवीत धारण, गायत्री उपदेश और भिक्षा विधि।'),
      },
    ],
    timingNote: respectTiming('', '', '',
      'Traditionally performed in Uttarayana — the jyotishi confirms the year.',
      'ঐতিহ্যগতভাবে উত্তরায়ণে — জ্যোতিষী বছরটি নিশ্চিত করেন।',
      'परंपरागत रूप से उत्तरायण में — ज्योतिषी वर्ष की पुष्टि करते हैं।'),
  },
  {
    id: 'vidyarambham',
    samskara: true,
    name: t('Vidyarambham · First Learning', 'বিদ্যারম্ভ / হাতেখড়ি', 'विद्यारंभ'),
    description: t(
      'The child writes the first letter — Saraswati herself holds the tiny hand.',
      'শিশু লেখে প্রথম অক্ষর — সরস্বতী স্বয়ং ধরেন ছোট্ট হাত।',
      'शिशु पहला अक्षर लिखता है — सरस्वती स्वयं थामती हैं नन्हा हाथ।'
    ),
    services: [
      {
        key: 'saraswati-puja',
        role: 'purohit',
        title: t('Saraswati Puja', 'সরস্বতী পূজা', 'सरस्वती पूजा'),
        note: t('Invocation of Devi Saraswati and the first writing on rice or slate.', 'দেবী সরস্বতীর আহ্বান ও ধান বা শ্লেটে প্রথম লেখা।', 'देवी सरस्वती का आवाहन और चावल या स्लेट पर प्रथम लेखन।'),
      },
    ],
    timingNote: respectTiming('', '', '',
      'Vasant Panchami is beloved for this — the jyotishi confirms the child\'s readiness.',
      'এর জন্য বসন্ত পঞ্চমী প্রিয় — জ্যোতিষী শিশুর প্রস্তুতি নিশ্চিত করেন।',
      'इसके लिए वसंत पंचमी प्रिय है — ज्योतिषी शिशु की तत्परता सुनिश्चित करते हैं।'),
  },
  {
    id: 'navagraha-shanti',
    samskara: false,
    name: t('Navagraha Shanti', 'নবগ্রহ শান্তি', 'नवग्रह शांति'),
    description: t(
      'When the grahas weigh heavy, shanti brings balance — counsel first, then the remedial rites.',
      'গ্রহ ভারী হলে শান্তি আনে ভারসাম্য — আগে পরামর্শ, তারপর প্রতিকার বিধি।',
      'ग्रह भारी हों तो शांति लाती है संतुलन — पहले परामर्श, फिर उपचार विधि।'
    ),
    services: [
      {
        key: 'graha-analysis',
        role: 'jyotish',
        title: t('Graha Analysis', 'গ্রহ বিশ্লেষণ', 'ग्रह विश्लेषण'),
        note: t('Dasha and transit study; honest counsel on what remedy truly fits.', 'দশা ও গোচর অধ্যয়ন; কোন উপায় সত্যিই মানানসই তার সৎ পরামর্শ।', 'दशा और गोचर अध्ययन; कौन-सा उपाय सच में उपयुक्त — ईमानदार परामर्श।'),
      },
      {
        key: 'navagraha-homa',
        role: 'purohit',
        title: t('Navagraha Homa', 'নবগ্রহ হোম', 'नवग्रह होम'),
        note: t('Homa for the nine grahas with the prescribed samagri.', 'নির্ধারিত সামগ্রীতে নবগ্রহের হোম।', 'निर्धारित सामग्री से नवग्रहों का होम।'),
      },
    ],
    timingNote: respectTiming('', '', '',
      'The remedy follows the analysis — never begin rites before the jyotishi\'s counsel.',
      'উপায় আসে বিশ্লেষণের পরে — জ্যোতিষীর পরামর্শের আগে বিধি শুরু করবেন না।',
      'उपाय विश्लेषण के बाद आता है — ज्योतिषी के परामर्श से पहले विधि न शुरू करें।'),
  },
  {
    id: 'kaal-sarp-shanti',
    samskara: false,
    name: t('Kaal Sarp Dosh Shanti', 'কালসর্প দোষ শান্তি', 'कालसर्प दोष शांति'),
    description: t(
      'A much-feared yoga in the kundali, met with calm, proper shanti — not fear.',
      'কুণ্ডলীর বহুভীত যোগ — শান্ত, সঠিক শান্তিতে মোকাবিলা, ভয়ে নয়।',
      'कुंडली का बहुचर्चित योग — शांत, उचित शांति से सामना, भय से नहीं।'
    ),
    services: [
      {
        key: 'dosh-verification',
        role: 'jyotish',
        title: t('Dosh Verification', 'দোষ যাচাই', 'दोष सत्यापन'),
        note: t('Many feared "doshas" dissolve under careful study — verify before any rite.', 'যত্নে অধ্যয়নে বহু ভীত "দোষ" মিলিয়ে যায় — বিধির আগে যাচাই করুন।', 'सावधानीपूर्ण अध्ययन में अनेक भयभीत "दोष" विलीन हो जाते हैं — विधि से पहले सत्यापन करें।'),
      },
      {
        key: 'kaal-sarp-puja',
        role: 'purohit',
        title: t('Kaal Sarp Shanti Puja', 'কালসর্প শান্তি পূজা', 'कालसर्प शांति पूजा'),
        note: t('Naga and Mahamrityunjaya rites as the jyotishi prescribes.', 'জ্যোতিষীর নির্দেশে নাগ ও মহামৃত্যুঞ্জয় বিধি।', 'ज्योतिषी के निर्देशानुसार नाग और महामृत्युंजय विधि।'),
      },
    ],
    timingNote: respectTiming('', '', '',
      'Nag Panchami and Amavasya are traditional windows — the jyotishi chooses.',
      'নাগ পঞ্চমী ও অমাবস্যা ঐতিহ্যগত সুযোগ — জ্যোতিষী বেছে নেন।',
      'नाग पंचमी और अमावस्या पारंपरिक अवसर हैं — ज्योतिषी चुनते हैं।'),
  },
  {
    id: 'pitru-paksha',
    samskara: true,
    name: t('Pitru Paksha · Shradh', 'পিতৃপক্ষ / শ্রাদ্ধ', 'पितृपक्ष / श्राद्ध'),
    description: t(
      'Remembering the ancestors with tarpana and pind — gratitude flowing backward through time.',
      'তর্পণ ও পিণ্ডে পূর্বপুরুষদের স্মরণ — সময়ের পেছনে প্রবাহিত কৃতজ্ঞতা।',
      'तर्पण और पिंड से पूर्वजों का स्मरण — समय के पीछे बहती कृतज्ञता।'
    ),
    services: [
      {
        key: 'tithi-guidance',
        role: 'jyotish',
        title: t('Shradh Tithi Guidance', 'শ্রাদ্ধ তিথি নির্দেশনা', 'श्राद्ध तिथि मार्गदर्शन'),
        note: t('The correct tithi for your pitrus, from the panjika.', 'পঞ্জিকা থেকে আপনার পিতৃদের সঠিক তিথি।', 'पंचांग से आपके पितरों हेतु सही तिथि।'),
      },
      {
        key: 'shradh-puja',
        role: 'purohit',
        title: t('Shradh / Pind Daan', 'শ্রাদ্ধ / পিণ্ডদান', 'श्राद्ध / पिंडदान'),
        note: t('Tarpana and pind daan performed with full vidhi, at home or tirtha.', 'পূর্ণ বিধিতে তর্পণ ও পিণ্ডদান — বাড়ি বা তীর্থে।', 'पूर्ण विधि से तर्पण और पिंडदान — घर या तीर्थ में।'),
      },
    ],
    timingNote: t(
      'Performed on the ancestor\'s tithi during Pitru Paksha (or Amavasya) — the jyotishi confirms the exact tithi for your family.',
      'পিতৃপক্ষে (বা অমাবস্যায়) পূর্বপুরুষের তিথিতে — জ্যোতিষী আপনার পরিবারের সঠিক তিথি নিশ্চিত করেন।',
      'पितृपक्ष में (या अमावस्या को) पूर्वज की तिथि पर — ज्योतिषी आपके परिवार हेतु सटीक तिथि सुनिश्चित करते हैं।'
    ),
  },
  {
    id: 'vastu',
    samskara: false,
    name: t('Vastu Consultation', 'বাস্তু পরামর্শ', 'वास्तु परामर्श'),
    description: t(
      'A home or workplace in harmony with direction and element — counsel before construction or renovation.',
      'দিক ও উপাদানের সঙ্গে সামঞ্জস্যপূর্ণ গৃহ বা কর্মস্থল — নির্মাণ বা সংস্কারের আগে পরামর্শ।',
      'दिशा और तत्व के सामंजस्य में घर या कार्यस्थल — निर्माण या नवीनीकरण से पहले परामर्श।'
    ),
    services: [
      {
        key: 'vastu-consultation',
        role: 'jyotish',
        title: t('Vastu Consultation', 'বাস্তু পরামর্শ', 'वास्तु परामर्श'),
        note: t('Plan review and on-site guidance; remedies that respect your budget and beliefs.', 'নকশা পর্যালোচনা ও স্থানীয় নির্দেশনা; বাজেট ও বিশ্বাসের প্রতি শ্রদ্ধাশীল উপায়।', 'योजना समीक्षा और स्थलीय मार्गदर्शन; बजट और आस्था का सम्मान करने वाले उपाय।'),
      },
      {
        key: 'vastu-shanti-puja',
        role: 'purohit',
        title: t('Vastu Shanti Puja', 'বাস্তু শান্তি পূজা', 'वास्तु शांति पूजा'),
        note: t('Shanti rites to harmonize the space, per the consultant\'s guidance.', 'পরামর্শদাতার নির্দেশে স্থানের সামঞ্জস্যে শান্তি বিধি।', 'परामर्शदाता के निर्देशानुसार स्थान के सामंजस्य हेतु शांति विधि।'),
      },
    ],
    timingNote: respectTiming('', '', '',
      'For plots and new construction, consult before the foundation is laid.',
      'জমি ও নতুন নির্মাণের জন্য ভিত্তি স্থাপনের আগে পরামর্শ নিন।',
      'भूखंड और नए निर्माण हेतु नींव रखने से पहले परामर्श लें।'),
  },
  {
    id: 'business-opening',
    samskara: false,
    name: t('New Venture Blessing', 'নতুন উদ্যোগের আশীর্বাদ', 'नए उद्यम का आशीर्वाद'),
    description: t(
      'Beginning a shop, office or enterprise with Lakshmi\'s grace — dharma and diligence together.',
      'লক্ষ্মীর কৃপায় দোকান, অফিস বা উদ্যোগের সূচনা — ধর্ম ও পরিশ্রম একসাথে।',
      'लक्ष्मी की कृपा से दुकान, कार्यालय या उद्यम का आरंभ — धर्म और परिश्रम साथ-साथ।'
    ),
    services: [
      {
        key: 'business-muhurat',
        role: 'jyotish',
        title: t('Shubh Aarambh Muhurat', 'শুভ আরম্ভ মুহূর্ত', 'शुभ आरंभ मुहूर्त'),
        note: t('Muhurat for opening, signing and first transaction.', 'উদ্বোধন, স্বাক্ষর ও প্রথম লেনদেনের মুহূর্ত।', 'उद्घाटन, हस्ताक्षर और प्रथम लेनदेन का मुहूर्त।'),
      },
      {
        key: 'lakshmi-puja',
        role: 'purohit',
        title: t('Lakshmi-Ganesh Puja', 'লক্ষ্মী-গণেশ পূজা', 'लक्ष्मी-गणेश पूजा'),
        note: t('Opening-day puja for prosperity conducted with dignity.', 'সমৃদ্ধির জন্য উদ্বোধন-দিনের পূজা মর্যাদায়।', 'समृद्धि हेतु उद्घाटन-दिवस की पूजा गरिमा से।'),
      },
    ],
    timingNote: respectTiming('', '', ''),
  },
];

export const LIFE_EVENT_MAP: Record<string, LifeEvent> = Object.fromEntries(
  LIFE_EVENTS.map((e) => [e.id, e])
);

export function getLifeEvent(id: string): LifeEvent | undefined {
  return LIFE_EVENT_MAP[id];
}

export function tritext(v: TriText, lang: DisplayLang): string {
  return v[lang] ?? v.en;
}

/* ------------------------------------------------------------------ */
/* Bundle model — one devotee journey across both specializations.    */
/* ------------------------------------------------------------------ */

export type BundleItemStatus = 'planned' | 'booked' | 'completed' | 'cancelled';
export type BundleStatus = 'planned' | 'in-progress' | 'complete';

export interface BundleItem {
  itemId: string;
  eventId: string;
  serviceKey: string;
  role: ServiceRole;
  status: BundleItemStatus;
  /** Set when the devotee books a specific professional. */
  providerUid?: string;
  providerName?: string;
}

export interface SevaBundle {
  bundleId: string;
  devoteeUid: string;
  eventId: string;
  items: BundleItem[];
  status: BundleStatus;
  createdAt: number;
  updatedAt: number;
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${rand}`;
}

/**
 * Build a bundle plan from a life event: every curated service becomes one
 * linked item sharing the same bundleId, in the event's suggested order
 * (counsel first, ritual after).
 */
export function createBundlePlan(devoteeUid: string, eventId: string): SevaBundle {
  const event = getLifeEvent(eventId);
  if (!event) throw new Error(`Unknown life event: ${eventId}`);
  const bundleId = makeId('BND');
  const now = Date.now();
  const items: BundleItem[] = event.services.map((s, i) => ({
    itemId: `${bundleId}-I${i + 1}`,
    eventId,
    serviceKey: s.key,
    role: s.role,
    status: 'planned',
  }));
  return { bundleId, devoteeUid, eventId, items, status: 'planned', createdAt: now, updatedAt: now };
}

/** Recompute bundle status from its items. Pure — no storage side effects. */
export function refreshBundleStatus(bundle: SevaBundle): SevaBundle {
  const items = bundle.items;
  let status: BundleStatus = 'planned';
  if (items.length > 0 && items.every((i) => i.status === 'completed')) status = 'complete';
  else if (items.some((i) => i.status === 'booked' || i.status === 'completed')) status = 'in-progress';
  return { ...bundle, status, updatedAt: Date.now() };
}

/** Suggested order label for a service step within an event (1-based). */
export function stepNumber(event: LifeEvent, serviceKey: string): number {
  const idx = event.services.findIndex((s) => s.key === serviceKey);
  return idx >= 0 ? idx + 1 : 0;
}

const BUNDLE_STORAGE_KEY = 'sb_seva_bundles_v1';

/** localStorage persistence (Spark-native; server sync arrives with Phase 6 backend). */
export const bundleStore = {
  list(devoteeUid: string): SevaBundle[] {
    try {
      const raw = localStorage.getItem(BUNDLE_STORAGE_KEY);
      if (!raw) return [];
      const all = JSON.parse(raw) as SevaBundle[];
      return all.filter((b) => b.devoteeUid === devoteeUid);
    } catch {
      return [];
    }
  },
  save(bundle: SevaBundle): void {
    try {
      const raw = localStorage.getItem(BUNDLE_STORAGE_KEY);
      const all = raw ? (JSON.parse(raw) as SevaBundle[]) : [];
      const idx = all.findIndex((b) => b.bundleId === bundle.bundleId);
      const next = refreshBundleStatus(bundle);
      if (idx >= 0) all[idx] = next;
      else all.push(next);
      localStorage.setItem(BUNDLE_STORAGE_KEY, JSON.stringify(all));
    } catch {
      /* storage unavailable — bundle stays in memory for this session */
    }
  },
  remove(bundleId: string): void {
    try {
      const raw = localStorage.getItem(BUNDLE_STORAGE_KEY);
      if (!raw) return;
      const all = (JSON.parse(raw) as SevaBundle[]).filter((b) => b.bundleId !== bundleId);
      localStorage.setItem(BUNDLE_STORAGE_KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
  },
};
