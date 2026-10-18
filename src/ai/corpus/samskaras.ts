/**
 * Sanatani Bandhan — AI Assistant Phase 2 · Corpus: Samskaras
 * =====================================================================
 * The 16 sacraments of life. Warm, brief, non-prescriptive —
 * personal timing questions escalate to a purohit.
 */
import type { DharmaCorpus } from './types';

export const SAMSKARA_CORPUS: DharmaCorpus = [
  {
    id: 'samskara.sixteen',
    topic: 'samskara',
    question_patterns: [
      'samskara', 'what are samskaras', '16 samskaras', 'sixteen samskaras',
      'संस्कार', 'সংস্কার', 'samskar list', 'hindu sacraments',
      'samskara meaning', 'life ceremonies hindu',
    ],
    answer: {
      en: `🙏 The 16 samskaras are sacred sacraments marking life's journey — from conception (Garbhadhana) to the final farewell (Antyeshti). They include the naming ceremony (Namakarana), first feeding (Annaprashana), sacred thread (Upanayana), and marriage (Vivaha). Each samskara sanctifies a transition, reminding us that every stage of life is sacred. For personal timing and vidhi, a family purohit is the right guide. 🌼`,
      hi: `🙏 16 संस्कार जीवन-यात्रा के पवित्र संस्कार हैं — गर्भाधान से अंत्येष्टि तक। इनमें नामकरण, अन्नप्राशन, उपनयन (यज्ञोपवीत) व विवाह शामिल हैं। प्रत्येक संस्कार एक संक्रमण को पवित्र करता है, स्मरण कराता है कि जीवन का हर चरण पावन है। व्यक्तिगत समय व विधि हेतु कुल-पुरोहित ही उचित मार्गदर्शक हैं। 🌼`,
      bn: `🙏 ১৬ সংস্কার জীবন-যাত্রার পবিত্র সংস্কার — গর্ভাধান থেকে অন্ত্যেষ্টি পর্যন্ত। এর মধ্যে নামকরণ, অন্নপ্রাশন, উপনয়ন (যজ্ঞোপবীত) ও বিবাহ রয়েছে। প্রতিটি সংস্কার একটি সন্ধিক্ষণকে পবিত্র করে, স্মরণ করায় জীবনের প্রতিটি পর্যায় পবিত্র। ব্যক্তিগত সময় ও বিধির জন্য কুল-পুরোহিতই উপযুক্ত পথপ্রদর্শক। 🌼`,
    },
    related: ['samskara.namakarana', 'samskara.upanayana', 'samskara.vivaha'],
    purohit_escalation: false,
  },
  {
    id: 'samskara.namakarana',
    topic: 'samskara',
    question_patterns: [
      'namakarana', 'naming ceremony', 'namkaran', 'baby naming hindu',
      'नामकरण', 'নামকরণ', 'namkaran vidhi', 'when to name baby',
    ],
    answer: {
      en: `👶 Namakarana is the sacred naming ceremony, traditionally held on the 11th or 12th day after birth (some families wait longer). The name is whispered into the baby's right ear, often chosen from the janma-nakshatra's syllables. It is the child's first samskara of identity — a name carrying blessings, meaning, and ancestral connection. Your family purohit can guide the exact timing and nakshatra-based selection. 🌼`,
      hi: `👶 नामकरण पवित्र नामकरण संस्कार है, परंपरागतः जन्म के 11वें या 12वें दिन (कुछ परिवार अधिक प्रतीक्षा करते हैं)। शिशु के दाएँ कान में नाम फुसफुसाया जाता है, प्रायः जन्म-नक्षत्र के अक्षरों से चुना जाता है। यह शिशु की पहचान का प्रथम संस्कार है — आशीर्वाद, अर्थ व पैतृक संबंध लिए एक नाम। सटीक समय व नक्षत्र-आधारित चयन हेतु कुल-पुरोहित मार्गदर्शन करें। 🌼`,
      bn: `👶 নামকরণ পবিত্র নামকরণ সংস্কার, ঐতিহ্যগতভাবে জন্মের ১১তম বা ১২তম দিনে (কিছু পরিবার বেশি অপেক্ষা করে)। শিশুর ডান কানে নাম ফিসফিসিয়ে বলা হয়, প্রায়ই জন্ম-নক্ষত্রের অক্ষর থেকে বাছা হয়। এটি শিশুর পরিচয়ের প্রথম সংস্কার — আশীর্বাদ, অর্থ ও পৈতৃক সম্পর্ক বহনকারী একটি নাম। সঠিক সময় ও নক্ষত্র-ভিত্তিক নির্বাচনের জন্য কুল-পুরোহিত পথ দেখাবেন। 🌼`,
    },
    related: ['samskara.sixteen', 'samskara.annaprashana'],
    purohit_escalation: true,
  },
  {
    id: 'samskara.annaprashana',
    topic: 'samskara',
    question_patterns: [
      'annaprashana', 'first rice ceremony', 'baby first feeding hindu',
      'अन्नप्राशन', 'অন্নপ্রাশন', 'mukhe bhat', 'choroonu',
    ],
    answer: {
      en: `🍚 Annaprashana is the first-feeding ceremony — usually around 6 months — when the baby tastes solid food (traditionally sweetened rice or kheer) for the first time. Family gathers, the child is dressed beautifully, and the first morsel is offered with mantras and joy. In Bengal it's "mukhe bhat," in Kerala "choroonu" — one love, many names. 🍚`,
      hi: `🍚 अन्नप्राशन प्रथम-अन्न संस्कार है — प्रायः 6 माह के आसपास — जब शिशु पहली बार ठोस आहार (परंपरागतः मीठा भात या खीर) चखता है। परिवार जुटता है, शिशु को सुंदर वस्त्र पहनाए जाते हैं, और प्रथम कौर मंत्रों व आनंद के साथ अर्पित होता है। बंगाल में यह "मुखे भात" है, केरल में "चोरूनु" — एक प्रेम, अनेक नाम। 🍚`,
      bn: `🍚 অন্নপ্রাশন প্রথম-অন্ন সংস্কার — সাধারণত ৬ মাসের দিকে — যখন শিশু প্রথম কঠিন খাবার (ঐতিহ্যগতভাবে মিষ্টি ভাত বা ক্ষীর) চাখে। পরিবার জড়ো হয়, শিশুকে সুন্দর পোশাক পরানো হয়, আর প্রথম গ্রাস মন্ত্র ও আনন্দের সাথে দেওয়া হয়। বাংলায় এটি "মুখে ভাত", কেরালায় "চোরুনু" — এক ভালোবাসা, বহু নাম। 🍚`,
    },
    related: ['samskara.sixteen', 'samskara.namakarana'],
    purohit_escalation: false,
  },
  {
    id: 'samskara.upanayana',
    topic: 'samskara',
    question_patterns: [
      'upanayana', 'sacred thread ceremony', 'yajnopavita', 'janeu',
      'उपनयन', 'উপনয়ন', 'thread ceremony', 'brahmacharya',
      'yajnopaveet', 'poita',
    ],
    answer: {
      en: `🙏 Upanayana is the sacred-thread ceremony marking entry into brahmacharya (studentship) — traditionally for boys, now observed in various forms across communities. The guru whispers the Gayatri mantra into the student's ear, and the three-stranded yajnopavita is worn across the torso. It is a second birth — from the physical into the life of learning and discipline. The vidhi is deeply tradition-specific; your family's acharya should guide it. 📿`,
      hi: `🙏 उपनयन यज्ञोपवीत संस्कार है जो ब्रह्मचर्य (विद्यार्थी-जीवन) में प्रवेश का प्रतीक है — परंपरागतः बालकों हेतु, अब विविध समुदायों में विविध रूपों में। गुरु शिष्य के कान में गायत्री मंत्र फुसफुसाते हैं, और त्रिसूत्री यज्ञोपवीत धारण कराया जाता है। यह दूसरा जन्म है — भौतिक से विद्या व अनुशासन के जीवन में। विधि गहनतः परंपरा-विशिष्ट है; आपके कुलाचार्य ही मार्गदर्शन करें। 📿`,
      bn: `🙏 উপনয়ন যজ্ঞোপবীত সংস্কার যা ব্রহ্মচর্যে (ছাত্রজীবন) প্রবেশের প্রতীক — ঐতিহ্যগতভাবে বালকদের জন্য, এখন নানা সম্প্রদায়ে নানা রূপে। গুরু শিষ্যের কানে গায়ত্রী মন্ত্র বলেন, আর তিনসুতোর যজ্ঞোপবীত পরানো হয়। এটি দ্বিতীয় জন্ম — ভৌতিক থেকে বিদ্যা ও অনুশাসনের জীবনে। বিধি গভীরভাবে পরম্পরা-নির্দিষ্ট; আপনার কুলাচার্যই পথ দেখাবেন। 📿`,
    },
    related: ['samskara.sixteen', 'practice.sandhya'],
    purohit_escalation: true,
  },
  {
    id: 'samskara.vivaha',
    topic: 'samskara',
    question_patterns: [
      'vivaha', 'hindu wedding', 'wedding', 'marriage ceremony', 'wedding ceremony',
      'marriage ceremony hindu', 'vivah samskara',
      'विवाह', 'বিবাহ', 'saptapadi', 'seven steps wedding',
      'hindu marriage rituals',
    ],
    answer: {
      en: `💛 Vivaha is among the most sacred samskaras — not a contract but a spiritual partnership for dharma. The heart of the ceremony is the saptapadi: seven steps together around the sacred fire, each step a vow. Kanyadana, sindoor, and mangalsutra vary beautifully by region. Because every family's customs differ, wedding planning deserves a purohit who knows your tradition — and our Seva Pro can help you find one. 💛`,
      hi: `💛 विवाह पवित्रतम संस्कारों में है — अनुबंध नहीं, धर्म हेतु आध्यात्मिक साझेदारी। समारोह का हृदय सप्तपदी है: पवित्र अग्नि के चारों ओर साथ सात पग, प्रत्येक पग एक व्रत। कन्यादान, सिंदूर व मंगलसूत्र क्षेत्रानुसार सुंदर भिन्नता लिए हैं। हर कुल की रीतियाँ भिन्न होती हैं, इसलिए विवाह-योजना ऐसे पुरोहित की हकदार है जो आपकी परंपरा जानें — और हमारा Seva Pro आपको खोजने में सहायता कर सकता है। 💛`,
      bn: `💛 বিবাহ পবিত্রতম সংস্কারগুলির একটি — চুক্তি নয়, ধর্মের জন্য আধ্যাত্মিক অংশীদারিত্ব। অনুষ্ঠানের হৃদয় সপ্তপদী: পবিত্র অগ্নির চারদিকে একসাথে সাত ধাপ, প্রতিটি ধাপ একটি ব্রত। কন্যাদান, সিঁদুর ও মঙ্গলসূত্র অঞ্চলভেদে সুন্দর ভিন্ন। প্রতিটি কুলের রীতি ভিন্ন বলে বিবাহ-পরিকল্পনা এমন পুরোহিতের যোগ্য যিনি আপনার পরম্পরা জানেন — আর আমাদের Seva Pro খুঁজতে সাহায্য করতে পারে। 💛`,
    },
    related: ['samskara.sixteen'],
    purohit_escalation: true,
  },
  {
    id: 'samskara.antyeshti',
    topic: 'samskara',
    question_patterns: [
      'antyeshti', 'last rites hindu', 'funeral rites', 'cremation hindu',
      'अंत्येष्टि', 'অন্ত্যেষ্টি', 'after death rituals', 'shraddha ceremony',
      'what happens after death hindu',
    ],
    answer: {
      en: `🙏 Antyeshti — the last samskara — is performed with profound reverence, guiding the departed with fire, mantra, and love toward their onward journey. The 13-day mourning period includes pinda-dana and concludes with shraddha rites honouring ancestors. These are tender, family-specific observances; please lean on your family purohit and elders — they will walk beside you with care. You are not alone in grief. 🪔`,
      hi: `🙏 अंत्येष्टि — अंतिम संस्कार — गहन श्रद्धा से की जाती है, दिवंगत को अग्नि, मंत्र व प्रेम से आगे की यात्रा हेतु मार्ग दिखाते हुए। 13 दिवसीय शोक-काल में पिंड-दान होता है, समापन पितरों के सम्मान में श्राद्ध से। ये कोमल, कुल-विशिष्ट अनुष्ठान हैं; कृपया अपने कुल-पुरोहित व वरिष्ठों का सहारा लें — वे स्नेह से आपके साथ चलेंगे। शोक में आप अकेले नहीं हैं। 🪔`,
      bn: `🙏 অন্ত্যেষ্টি — শেষ সংস্কার — গভীর শ্রদ্ধায় করা হয়, প্রয়াতকে অগ্নি, মন্ত্র ও ভালোবাসায় পরের যাত্রায় পথ দেখিয়ে। ১৩ দিনের শোককালে পিণ্ড-দান হয়, সমাপন পিতৃদের সম্মানে শ্রাদ্ধে। এগুলি কোমল, কুল-নির্দিষ্ট অনুষ্ঠান; অনুগ্রহ করে কুল-পুরোহিত ও গুরুজনদের আশ্রয় নিন — তাঁরা স্নেহে আপনার পাশে হাঁটবেন। শোকে আপনি একা নন। 🪔`,
    },
    related: ['samskara.sixteen', 'concept.pitra'],
    purohit_escalation: true,
  },
];
