/**
 * Sanatani Bandhan — AI Assistant Phase 2 · Corpus: Festivals
 * =====================================================================
 * Major festivals: lunar basis, significance, key observances.
 * Dates are described by lunar basis (the panjika computes actual dates).
 */
import type { DharmaCorpus } from './types';

export const FESTIVAL_CORPUS: DharmaCorpus = [
  {
    id: 'festival.diwali',
    topic: 'festival',
    question_patterns: [
      'diwali', 'deepavali', 'what is diwali', 'diwali meaning', 'when is diwali',
      'दीवाली', 'दीपावली', 'दीवाली कब है', 'দীপাবলি', 'দিওয়ালি', 'দীপাবলি কবে', 'diwali significance',
      'diwali kab hai', 'diwali kobe', 'festival of lights',
    ],
    answer: {
      en: `🪔 Diwali (Deepavali) is the festival of lights, celebrated on Kartik Amavasya — the darkest night, conquered by light. It honours Bhagavan Rama's return to Ayodhya, Lakshmi Puja for prosperity, and in many regions, Kali Puja. Homes glow with diyas, families share mithai, and the night sky fills with joy. In the south it is often called Deepavali and spans several days of celebration. 🪔`,
      hi: `🪔 दीवाली (दीपावली) प्रकाश का उत्सव है, कार्तिक अमावस्या को मनाया जाता है — सबसे अंधेरी रात, प्रकाश से जीती हुई। यह भगवान राम की अयोध्या वापसी, समृद्धि हेतु लक्ष्मी पूजा, और कई क्षेत्रों में काली पूजा का सम्मान है। घर दीयों से जगमगाते हैं, परिवार मिठाई बाँटते हैं। दक्षिण में इसे प्रायः दीपावली कहते हैं और कई दिनों तक उत्सव चलता है। 🪔`,
      bn: `🪔 দীপাবলি আলোর উৎসব, কার্তিক অমাবস্যায় পালিত হয় — অন্ধকারতম রাত, আলোর জয়। এটি ভগবান রামের অযোধ্যা প্রত্যাবর্তন, সমৃদ্ধির জন্য লক্ষ্মীপূজা, এবং বহু অঞ্চলে কালীপূজার সম্মান। ঘর প্রদীপে ঝলমল করে, পরিবার মিষ্টি ভাগ করে। দক্ষিণে একে প্রায়ই দীপাবলি বলা হয় এবং কয়েক দিন ধরে উৎসব চলে। 🪔`,
    },
    related: ['tithi.amavasya', 'festival.kali_puja', 'practice.diya'],
    purohit_escalation: false,
  },
  {
    id: 'festival.kali_puja',
    topic: 'festival',
    question_patterns: [
      'kali puja', 'what is kali puja', 'kali puja meaning', 'kali puja kab',
      'काली पूजा', 'কালীপূজা', 'kali puja vs diwali',
    ],
    answer: {
      en: `🙏 Kali Puja is celebrated on the same Kartik Amavasya night as Diwali, especially in Bengal, Assam, and Odisha. Devotees worship Maa Kali — the fierce, protective mother who destroys darkness and ego. Pandals glow through the night with chanting, and the atmosphere is one of awe mixed with deep love. In Bengal, this night belongs to Maa. 🌺`,
      hi: `🙏 काली पूजा दीवाली वाली कार्तिक अमावस्या की रात को मनाई जाती है, विशेषकर बंगाल, असम व ओडिशा में। भक्त माँ काली की पूजा करते हैं — वे उग्र, रक्षक माँ जो अंधकार व अहंकार का नाश करती हैं। रात भर पंडाल जप से गूँजते हैं, वातावरण में भय-मिश्रित गहरा प्रेम होता है। बंगाल में यह रात माँ की है। 🌺`,
      bn: `🙏 কালীপূজা দীপাবলির কার্তিক অমাবস্যার রাতেই পালিত হয়, বিশেষত বাংলা, আসাম ও ওড়িশায়। ভক্তরা মা কালীর পূজা করেন — সেই উগ্র, রক্ষাকারী মা যিনি অন্ধকার ও অহংকার নাশ করেন। সারারাত প্যান্ডেল জপে মুখরিত থাকে, পরিবেশে ভয়-মেশানো গভীর ভালোবাসা। বাংলায় এই রাত মায়ের। 🌺`,
    },
    related: ['festival.diwali', 'tithi.amavasya'],
    purohit_escalation: false,
  },
  {
    id: 'festival.holi',
    topic: 'festival',
    question_patterns: [
      'holi', 'what is holi', 'holi meaning', 'when is holi', 'holi kab',
      'होली', 'হোলি', 'festival of colours', 'festival of colors',
      'holika dahan', 'holi significance',
    ],
    answer: {
      en: `🎨 Holi is the festival of colours, celebrated on Phalguna Purnima. The eve holds Holika Dahan — the bonfire of devotion triumphing over evil, from Prahlada's story. On the day itself, colours fly, strangers become friends, and Vrindavan's Holi with Krishna and Radha is legendary. It is spring's arrival and joy made visible. 🌈`,
      hi: `🎨 होली रंगों का उत्सव है, फाल्गुन पूर्णिमा को मनाया जाता है। पूर्व संध्या को होलिका दहन होता है — प्रह्लाद की कथा से, भक्ति की बुराई पर विजय की अग्नि। उत्सव के दिन रंग उड़ते हैं, अजनबी मित्र बन जाते हैं, और कृष्ण-राधा की वृंदावन होली प्रसिद्ध है। यह वसंत का आगमन और आनंद का दृश्य रूप है। 🌈`,
      bn: `🎨 হোলি রঙের উৎসব, ফাল্গুন পূর্ণিমায় পালিত হয়। আগের সন্ধ্যায় হোলিকা দহন — প্রহ্লাদের কাহিনি থেকে, ভক্তির মন্দের উপর জয়ের অগ্নি। উৎসবের দিনে রং ওড়ে, অচেনা বন্ধু হয়, আর কৃষ্ণ-রাধার বৃন্দাবন হোলি কিংবদন্তি। এটি বসন্তের আগমন ও আনন্দের দৃশ্য রূপ। 🌈`,
    },
    related: ['tithi.purnima', 'festival.janmashtami'],
    purohit_escalation: false,
  },
  {
    id: 'festival.durga_puja',
    topic: 'festival',
    question_patterns: [
      'durga puja', 'dussehra', 'vijaya dashami', 'what is durga puja',
      'दुर्गा पूजा', 'দুর্গাপূজা', 'दशहरा', 'দশেরা', 'navratri',
      'नवरात्रि', 'নবরাত্রি', 'durga puja kab', 'when is durga puja',
    ],
    answer: {
      en: `🙏 Durga Puja (Navratri in the north and west) celebrates Maa Durga's victory over Mahishasura — good conquering evil — over nine nights, culminating in Vijaya Dashami (Dussehra). In Bengal, grand pandals house the goddess for five days; in the north, Ramlila stages Rama's victory over Ravana. Both tell one truth: dharma always prevails. 🌺`,
      hi: `🙏 दुर्गा पूजा (उत्तर व पश्चिम में नवरात्रि) महिषासुर पर माँ दुर्गा की विजय का उत्सव है — बुराई पर अच्छाई की जीत — नौ रातों तक, विजयादशमी (दशहरा) पर समापन। बंगाल में भव्य पंडालों में देवी पाँच दिन विराजती हैं; उत्तर में रामलीला रावण पर राम की विजय मंचित करती है। दोनों एक ही सत्य कहते हैं: धर्म की सदा जय होती है। 🌺`,
      bn: `🙏 দুর্গাপূজা (উত্তর ও পশ্চিমে নবরাত্রি) মহিষাসুরের উপর মা দুর্গার বিজয়ের উৎসব — মন্দের উপর ভালোর জয় — নয় রাত ধরে, বিজয়া দশমীতে (দশেরা) সমাপন। বাংলায় বিশাল প্যান্ডেলে দেবী পাঁচ দিন বিরাজ করেন; উত্তরে রামলীলা রাবণের উপর রামের বিজয় মঞ্চস্থ করে। দুটোই এক সত্য বলে: ধর্মের সদা জয়। 🌺`,
    },
    related: ['festival.kali_puja', 'concept.dharma'],
    purohit_escalation: false,
  },
  {
    id: 'festival.janmashtami',
    topic: 'festival',
    question_patterns: [
      'janmashtami', 'krishna janmashtami', 'what is janmashtami',
      'जन्माष्टमी', 'জন্মাষ্টমী', 'janmashtami kab', 'krishna birthday',
      'gokulashtami',
    ],
    answer: {
      en: `🦚 Janmashtami celebrates the birth of Bhagavan Krishna on Bhadrapada Krishna Ashtami — at midnight, in a prison cell in Mathura, divinity arrived quietly. Devotees fast till midnight, sing bhajans, and reenact the divine birth; in Maharashtra, dahi-handi pyramids echo Krishna's butter-stealing leelas. It is the night love itself took form. 🦚`,
      hi: `🦚 जन्माष्टमी भाद्रपद कृष्ण अष्टमी को भगवान कृष्ण के जन्म का उत्सव है — मध्यरात्रि में, मथुरा की कारागार में, दिव्यता चुपचाप आई। भक्त मध्यरात्रि तक उपवास रखते हैं, भजन गाते हैं, दिव्य जन्म का अभिनय करते हैं; महाराष्ट्र में दही-हांडी के पिरामिड कृष्ण की माखन-चोरी लीलाओं की गूँज हैं। यह वह रात है जब प्रेम ने स्वयं रूप धरा। 🦚`,
      bn: `🦚 জন্মাষ্টমী ভাদ্রপদ কৃষ্ণ অষ্টমীতে ভগবান কৃষ্ণের জন্মোৎসব — মধ্যরাতে, মথুরার কারাগারে, দিব্যতা নীরবে এল। ভক্তরা মধ্যরাত পর্যন্ত উপবাস করেন, ভজন গান, দিব্য জন্মের অভিনয় করেন; মহারাষ্ট্রে দহি-হাণ্ডির পিরামিড কৃষ্ণের মাখন-চুরি লীলার প্রতিধ্বনি। এটি সেই রাত যখন প্রেম স্বয়ং রূপ নিল। 🦚`,
    },
    related: ['festival.holi', 'tithi.paksha'],
    purohit_escalation: false,
  },
  {
    id: 'festival.shivaratri',
    topic: 'festival',
    question_patterns: [
      'shivaratri', 'maha shivaratri', 'what is shivaratri', 'shivratri',
      'शिवरात्रि', 'শিবরাত্রি', 'mahashivratri kab', 'shivaratri significance',
    ],
    answer: {
      en: `🙏 Maha Shivaratri — the great night of Shiva — falls on Phalguna Krishna Chaturdashi. Devotees keep night-long vigil (jagaran), offer bilva leaves and water to the Shivlinga, and chant "Om Namah Shivaya." It marks the divine wedding of Shiva and Parvati, and the night Shiva performed the tandava — stillness and cosmic dance as one. 🕉️`,
      hi: `🙏 महाशिवरात्रि — शिव की महान रात्रि — फाल्गुन कृष्ण चतुर्दशी को पड़ती है। भक्त रात्रि-जागरण करते हैं, शिवलिंग पर बेलपत्र व जल चढ़ाते हैं, "ॐ नमः शिवाय" जपते हैं। यह शिव-पार्वती के दिव्य विवाह और उस रात्रि का स्मरण है जब शिव ने तांडव किया — स्थिरता व ब्रह्मांडीय नृत्य एक साथ। 🕉️`,
      bn: `🙏 মহাশিবরাত্রি — শিবের মহান রাত্রি — ফাল্গুন কৃষ্ণ চতুর্দশীতে পড়ে। ভক্তরা সারারাত জাগরণ করেন, শিবলিঙ্গে বেলপাতা ও জল দেন, "ওঁ নমঃ শিবায়" জপেন। এটি শিব-পার্বতীর দিব্য বিবাহ এবং সেই রাত্রির স্মরণ যখন শিব তাণ্ডব করেছিলেন — স্থিরতা ও মহাজাগতিক নৃত্য একসাথে। 🕉️`,
    },
    related: ['practice.japa', 'tithi.paksha'],
    purohit_escalation: false,
  },
  {
    id: 'festival.rath_yatra',
    topic: 'festival',
    question_patterns: [
      'rath yatra', 'what is rath yatra', 'ratha yatra', 'puri rath yatra',
      'रथ यात्रा', 'রথযাত্রা', 'jagannath rath', 'car festival',
    ],
    answer: {
      en: `🙏 Rath Yatra is the grand chariot festival of Bhagavan Jagannath, held in Puri (Odisha) on Ashadha Shukla Dwitiya. Three massive wooden chariots carry Jagannath, Balabhadra, and Subhadra to the Gundicha temple — and millions pull the ropes. It is the rare festival where the deity comes out to meet the devotee, blessing even those who cannot enter a temple. 🛕`,
      hi: `🙏 रथ यात्रा भगवान जगन्नाथ का भव्य रथोत्सव है, पुरी (ओडिशा) में आषाढ़ शुक्ल द्वितीया को। तीन विशाल लकड़ी के रथों में जगन्नाथ, बलभद्र व सुभद्रा गुंडिचा मंदिर जाते हैं — और लाखों लोग रस्सियाँ खींचते हैं। यह वह दुर्लभ उत्सव है जहाँ देवता स्वयं भक्त से मिलने बाहर आते हैं, उन्हें भी आशीष देते हैं जो मंदिर नहीं जा सकते। 🛕`,
      bn: `🙏 রথযাত্রা ভগবান জগন্নাথের মহা রথোৎসব, পুরীতে (ওড়িশা) আষাঢ় শুক্ল দ্বিতীয়ায়। তিনটি বিশাল কাঠের রথে জগন্নাথ, বলভদ্র ও সুভদ্রা গুণ্ডিচা মন্দিরে যান — আর লক্ষ লক্ষ মানুষ দড়ি টানে। এটি সেই দুর্লভ উৎসব যেখানে দেবতা স্বয়ং ভক্তের সাথে দেখা করতে বেরিয়ে আসেন, তাঁদেরও আশীর্বাদ দেন যাঁরা মন্দিরে যেতে পারেন না। 🛕`,
    },
    related: ['etiquette.temple_dos'],
    purohit_escalation: false,
  },
  {
    id: 'festival.ganesh_chaturthi',
    topic: 'festival',
    question_patterns: [
      'ganesh chaturthi', 'ganpati', 'vinayaka chaturthi', 'what is ganesh chaturthi',
      'गणेश चतुर्थी', 'গণেশ চতুর্থী', 'ganpati bappa', 'ganesh visarjan',
    ],
    answer: {
      en: `🙏 Ganesh Chaturthi (Vinayaka Chaturthi) welcomes Bhagavan Ganesha on Bhadrapada Shukla Chaturthi — the remover of obstacles, patron of beginnings. Homes and pandals install his murti for 1.5 to 11 days of worship, ending with visarjan (immersion), a bittersweet farewell: "Ganpati Bappa Morya, pudhchya varshi lavkar ya!" — come back soon next year. 🐘`,
      hi: `🙏 गणेश चतुर्थी (विनायक चतुर्थी) भाद्रपद शुक्ल चतुर्थी को भगवान गणेश का स्वागत है — विघ्नहर्ता, शुभारंभों के संरक्षक। घरों व पंडालों में 1.5 से 11 दिनों की पूजा हेतु उनकी मूर्ति स्थापित होती है, विसर्जन पर समापन — एक मीठी विदाई: "गणपति बाप्पा मोरया, पुढच्या वर्षी लवकर या!" — अगले साल जल्दी आना। 🐘`,
      bn: `🙏 গণেশ চতুর্থী (বিনায়ক চতুর্থী) ভাদ্রপদ শুক্ল চতুর্থীতে ভগবান গণেশের আবাহন — বিঘ্নহর্তা, শুভারম্ভের রক্ষক। ঘরে ও প্যান্ডেলে ১.৫ থেকে ১১ দিনের পূজার জন্য তাঁর মূর্তি স্থাপন হয়, বিসর্জনে সমাপন — এক মিষ্টি বিদায়: "গণপতি বাপ্পা মোরয়া, পুঢ়চ্যা বর্ষী লবকর য়া!" — পরের বছর তাড়াতাড়ি এসো। 🐘`,
    },
    related: ['concept.dharma'],
    purohit_escalation: false,
  },
  {
    id: 'festival.makar_sankranti',
    topic: 'festival',
    question_patterns: [
      'makar sankranti', 'pongal', 'what is makar sankranti', 'uttarayana',
      'मकर संक्रांति', 'মকর সংক্রান্তি', 'পোঙ্গল', 'pongal meaning',
      'lohri', 'magh bihu',
    ],
    answer: {
      en: `☀️ Makar Sankranti (mid-January) celebrates the Sun's entry into Capricorn and the start of Uttarayana — the northward journey, the devas' daytime. It is the harvest festival of India: Pongal in Tamil Nadu, Magh Bihu in Assam, Lohri in Punjab. Sesame-jaggery sweets are shared with the words "til-gul ghya, god god bola" — eat sweet, speak sweet. 🪁`,
      hi: `☀️ मकर संक्रांति (जनवरी मध्य) सूर्य के मकर प्रवेश और उत्तरायण — देवताओं के दिन — का आरंभ मनाती है। यह भारत का फसल उत्सव है: तमिलनाडु में पोंगल, असम में माघ बिहू, पंजाब में लोहड़ी। तिल-गुड़ की मिठाई "तिळ-गूळ घ्या, गोड गोड बोला" कहकर बाँटी जाती है — मीठा खाओ, मीठा बोलो। 🪁`,
      bn: `☀️ মকর সংক্রান্তি (জানুয়ারির মাঝামাঝি) সূর্যের মকর প্রবেশ ও উত্তরায়ণ — দেবতাদের দিন — এর সূচনা উদযাপন করে। এটি ভারতের ফসল উৎসব: তামিলনাড়ুতে পোঙ্গল, আসামে মাঘ বিহু, পাঞ্জাবে লোহড়ি। তিল-গুড়ের মিষ্টি "তিল-গুল ঘ্যা, গোড় গোড় বোলা" বলে ভাগ করা হয় — মিষ্টি খাও, মিষ্টি বলো। 🪁`,
    },
    related: ['tithi.sankranti'],
    purohit_escalation: false,
  },
  {
    id: 'festival.raksha_bandhan',
    topic: 'festival',
    question_patterns: [
      'raksha bandhan', 'rakhi', 'what is raksha bandhan', 'rakhi meaning',
      'रक्षाबंधन', 'রাখীবন্ধন', 'রাখি', 'rakhi kab', 'when is rakhi',
    ],
    answer: {
      en: `🙏 Raksha Bandhan falls on Shravana Purnima — the full moon of the sacred month. Sisters tie a rakhi (sacred thread) on their brothers' wrists, praying for their protection; brothers vow to guard their sisters and offer gifts. Beyond siblings, it honours every bond of protection and love — even soldiers and strangers tie rakhis. It is a thread, but it holds the world together. 🧵`,
      hi: `🙏 रक्षाबंधन श्रावण पूर्णिमा को पड़ता है — पवित्र मास की पूर्णिमा। बहनें भाइयों की कलाई पर राखी (पवित्र धागा) बाँधती हैं, उनकी रक्षा की प्रार्थना करती हैं; भाई बहनों की रक्षा का वचन देते हैं और उपहार देते हैं। भाई-बहन से परे, यह रक्षा व प्रेम के हर बंधन का सम्मान है — सैनिकों व अजनबियों को भी राखी बाँधी जाती है। यह एक धागा है, पर दुनिया को जोड़े रखता है। 🧵`,
      bn: `🙏 রাখীবন্ধন শ্রাবণ পূর্ণিমায় পড়ে — পবিত্র মাসের পূর্ণিমা। বোনেরা ভাইদের কব্জিতে রাখি (পবিত্র সুতো) বাঁধেন, তাঁদের রক্ষার প্রার্থনা করেন; ভাইয়েরা বোনদের রক্ষার শপথ নেন ও উপহার দেন। ভাইবোনের বাইরেও, এটি রক্ষা ও ভালোবাসার প্রতিটি বন্ধনের সম্মান — সৈনিক ও অচেনাদেরও রাখি বাঁধা হয়। এটি একটি সুতো, কিন্তু পৃথিবীকে জুড়ে রাখে। 🧵`,
    },
    related: ['tithi.purnima'],
    purohit_escalation: false,
  },
  {
    id: 'festival.ram_navami',
    topic: 'festival',
    question_patterns: [
      'ram navami', 'rama navami', 'what is ram navami', 'ram navami kab',
      'राम नवमी', 'রাম নবমী', 'rama birthday', 'sri rama navami',
    ],
    answer: {
      en: `🏹 Ram Navami celebrates the birth of Bhagavan Rama on Chaitra Shukla Navami — the embodiment of dharma, the ideal king, son, and husband. Devotees read the Ramayana, chant "Sri Rama Jaya Rama," and temples reenact the divine birth at noon. In Ayodhya, the celebration is beyond description — the city where it all began, rejoicing. 🏹`,
      hi: `🏹 राम नवमी चैत्र शुक्ल नवमी को भगवान राम के जन्म का उत्सव है — धर्म के मूर्त रूप, आदर्श राजा, पुत्र व पति। भक्त रामायण पढ़ते हैं, "श्री राम जय राम" जपते हैं, मंदिरों में दोपहर को दिव्य जन्म का अभिनय होता है। अयोध्या में उत्सव अवर्णनीय है — वह नगरी जहाँ सब कुछ शुरू हुआ, आनंद मना रही है। 🏹`,
      bn: `🏹 রাম নবমী চৈত্র শুক্ল নবমীতে ভগবান রামের জন্মোৎসব — ধর্মের মূর্ত রূপ, আদর্শ রাজা, পুত্র ও স্বামী। ভক্তরা রামায়ণ পড়েন, "শ্রী রাম জয় রাম" জপেন, মন্দিরে দুপুরে দিব্য জন্মের অভিনয় হয়। অযোধ্যায় উৎসব অবর্ণনীয় — সেই নগরী যেখানে সব শুরু হয়েছিল, আনন্দে মেতেছে। 🏹`,
    },
    related: ['concept.dharma', 'tithi.paksha'],
    purohit_escalation: false,
  },
  {
    id: 'festival.guru_purnima',
    topic: 'festival',
    question_patterns: [
      'guru purnima', 'what is guru purnima', 'guru purnima meaning',
      'गुरु पूर्णिमा', 'গুরু পূর্ণিমা', 'vyasa purnima', 'teacher day hindu',
    ],
    answer: {
      en: `🙏 Guru Purnima falls on Ashadha Purnima — the full moon dedicated to the guru, the one who dispels darkness. It honours Maharshi Vyasa (compiler of the Vedas, author of the Mahabharata) and every teacher who has lit our path. Devotees offer paduka-puja, seek blessings, and remember: "Guru Brahma, Guru Vishnu, Guru Devo Maheshwara." 🌕`,
      hi: `🙏 गुरु पूर्णिमा आषाढ़ पूर्णिमा को पड़ती है — गुरु को समर्पित पूर्णिमा, जो अंधकार दूर करते हैं। यह महर्षि व्यास (वेदों के संकलनकर्ता, महाभारत के रचयिता) और हर उस आचार्य का सम्मान है जिन्होंने हमारा मार्ग आलोकित किया। भक्त पादुका-पूजा करते हैं, आशीर्वाद लेते हैं, और स्मरण करते हैं: "गुरुर्ब्रह्मा गुरुर्विष्णुः गुरुर्देवो महेश्वरः।" 🌕`,
      bn: `🙏 গুরু পূর্ণিমা আষাঢ় পূর্ণিমায় পড়ে — গুরুর প্রতি উৎসর্গিত পূর্ণিমা, যিনি অন্ধকার দূর করেন। এটি মহর্ষি ব্যাস (বেদের সংকলক, মহাভারতের রচয়িতা) এবং প্রতিটি আচার্যের সম্মান যিনি আমাদের পথ আলোকিত করেছেন। ভক্তরা পাদুকা-পূজা করেন, আশীর্বাদ নেন, এবং স্মরণ করেন: "গুরুর্ব্রহ্মা গুরুর্বিষ্ণুঃ গুরুর্দেবো মহেশ্বরঃ।" 🌕`,
    },
    related: ['tithi.purnima', 'concept.moksha'],
    purohit_escalation: false,
  },
];
