/**
 * Sanatani Bandhan — AI Assistant Phase 2 · Corpus: Daily Practice
 * =====================================================================
 * Sandhya, japa, puja, aarti — the devotional everyday.
 * Specific ritual instructions that vary by tradition → purohit_escalation.
 */
import type { DharmaCorpus } from './types';

export const PRACTICE_CORPUS: DharmaCorpus = [
  {
    id: 'practice.sandhya',
    topic: 'practice',
    question_patterns: [
      'sandhya vandanam', 'sandhyavandanam', 'what is sandhya',
      'संध्या वंदनम', 'সন্ধ্যা বন্দনম', 'sandhya vandana',
      'morning evening prayer', 'trikala sandhya', 'sandhya time',
    ],
    answer: {
      en: `🙏 Sandhya Vandanam is the thrice-daily prayer at the junctions (sandhya) of the day — dawn, noon, and dusk — centred on the Gayatri mantra and arghya to Surya. It is the cornerstone of a dvija's daily discipline. The exact vidhi varies by Veda-shakha and family tradition, so a purohit or elder of your own parampara is the right guide for learning it properly. 🌅`,
      hi: `🙏 संध्या वंदनम् दिन के संध्या-कालों — प्रातः, मध्याह्न व सायं — में त्रिकाल की जाने वाली उपासना है, गायत्री मंत्र व सूर्य को अर्घ्य पर केंद्रित। यह द्विज की दैनिक अनुशासन की आधारशिला है। सटीक विधि वेद-शाखा व कुल-परंपरा से भिन्न होती है, इसलिए इसे सही से सीखने हेतु आपकी अपनी परंपरा के पुरोहित या वरिष्ठ ही उचित मार्गदर्शक हैं। 🌅`,
      bn: `🙏 সন্ধ্যা বন্দনম্ দিনের সন্ধিক্ষণে — প্রাতঃ, মধ্যাহ্ন ও সায়ং — ত্রিকালের উপাসনা, গায়ত্রী মন্ত্র ও সূর্যকে অর্ঘ্য কেন্দ্র করে। এটি দ্বিজের দৈনিক অনুশাসনের ভিত্তি। সঠিক বিধি বেদ-শাখা ও কুল-পরম্পরা ভেদে ভিন্ন হয়, তাই ঠিকমতো শিখতে আপনার নিজ পরম্পরার পুরোহিত বা গুরুজনই উপযুক্ত পথপ্রদর্শক। 🌅`,
    },
    related: ['practice.japa', 'practice.morning'],
    purohit_escalation: true,
  },
  {
    id: 'practice.japa',
    topic: 'practice',
    question_patterns: [
      'japa', 'what is japa', 'japa meaning', 'japa mala', 'how to do japa',
      'जप', 'জপ', 'jaap', 'mala jaap', 'mantra repetition',
      '108 beads why', 'why 108', 'japa mala 108',
    ],
    answer: {
      en: `📿 Japa is the meditative repetition of a mantra or divine name — usually counted on a mala of 108 beads. 108 is sacred: it mirrors the cosmos (27 nakshatras × 4 padas), and each bead is one step inward. Hold the mala in the right hand, turn each bead with the middle finger and thumb (never the index finger), and let the name settle into your heart. Even 11 sincere repetitions a day is a beautiful beginning. 📿`,
      hi: `📿 जप मंत्र या दिव्य नाम का ध्यानपूर्ण पुनरावृत्ति है — प्रायः 108 मनकों की माला पर गिना जाता है। 108 पवित्र है: यह ब्रह्मांड का प्रतिबिंब है (27 नक्षत्र × 4 पद), और प्रत्येक मनका अंतर्मुखी एक पग है। माला दाएँ हाथ में रखें, मध्यमा व अँगूठे से प्रत्येक मनका फेरें (तर्जनी से नहीं), और नाम को हृदय में बसने दें। दिन के 11 निष्ठावान जप भी सुंदर आरंभ हैं। 📿`,
      bn: `📿 জপ মন্ত্র বা দিব্য নামের ধ্যানপূর্ণ পুনরাবৃত্তি — সাধারণত ১০৮ দানার মালায় গোনা হয়। ১০৮ পবিত্র: এটি মহাবিশ্বের প্রতিচ্ছবি (২৭ নক্ষত্র × ৪ পদ), আর প্রতিটি দানা অন্তর্মুখী এক ধাপ। মালা ডান হাতে ধরুন, মধ্যমা ও বৃদ্ধাঙ্গুলি দিয়ে প্রতিটি দানা ঘোরান (তর্জনী দিয়ে নয়), আর নামকে হৃদয়ে বসতে দিন। দিনে ১১টি নিষ্ঠাবান জপও সুন্দর শুরু। 📿`,
    },
    related: ['practice.sandhya', 'practice.morning', 'concept.mantra'],
    purohit_escalation: false,
  },
  {
    id: 'practice.basic_puja',
    topic: 'practice',
    question_patterns: [
      'how to do puja', 'basic puja steps', 'puja vidhi', 'puja at home',
      'morning puja', 'पूजा विधि', 'सुबह पूजा कैसे करें', 'পূজা বিধি', 'সকালের পূজা কীভাবে', 'घर पर पूजा', 'বাড়িতে পূজা',
      'simple puja', 'daily puja steps', 'panchopachara',
    ],
    answer: {
      en: `🙏 A simple daily puja follows the heart of the shodashopachara (16 offerings) in brief: 1) Light the diya and incense, 2) Offer water for washing (achamana), 3) Offer flowers with devotion, 4) Offer naivedya (food), 5) Wave the aarti lamp in circles, 6) Bow and pray from the heart. Cleanliness of space and sincerity of heart matter more than perfect ritual — bhava is the true offering. 🌺`,
      hi: `🙏 सरल दैनिक पूजा षोडशोपचार (16 उपचारों) के सार का संक्षिप्त पालन है: 1) दीया व धूप जलाएँ, 2) आचमन हेतु जल अर्पित करें, 3) भक्तिभाव से पुष्प चढ़ाएँ, 4) नैवेद्य (भोग) अर्पित करें, 5) आरती का दीप घुमाएँ, 6) नमन कर हृदय से प्रार्थना करें। स्थान की शुद्धता व हृदय की निष्ठा पूर्ण विधि से अधिक महत्वपूर्ण हैं — भाव ही सच्चा अर्पण है। 🌺`,
      bn: `🙏 সরল দৈনিক পূজা ষোড়শোপচারের (১৬ উপচার) সারের সংক্ষিপ্ত পালন: ১) প্রদীপ ও ধূপ জ্বালান, ২) আচমনের জন্য জল দিন, ৩) ভক্তিভরে ফুল দিন, ৪) নৈবেদ্য (ভোগ) দিন, ৫) আরতির প্রদীপ ঘোরান, ৬) প্রণাম করে হৃদয় থেকে প্রার্থনা করুন। স্থানের শুদ্ধতা ও হৃদয়ের নিষ্ঠা নিখুঁত বিধির চেয়ে গুরুত্বপূর্ণ — ভাবই সত্যিকারের অর্পণ। 🌺`,
    },
    related: ['practice.aarti', 'practice.diya', 'etiquette.prasadam'],
    purohit_escalation: false,
  },
  {
    id: 'practice.aarti',
    topic: 'practice',
    question_patterns: [
      'aarti', 'what is aarti', 'how to do aarti', 'aarati', 'आरती',
      'আরতি', 'aarti meaning', 'aarti thali', 'aarti song',
    ],
    answer: {
      en: `🪔 Aarti is the waving of light before the deity — flame on a platter, moved in slow clockwise circles — accompanied by song. The flame represents the light of knowledge dispelling ignorance; at the end, devotees cup the warmth over the flame and touch it to their eyes and head, receiving the blessing. Morning and evening aarti bookend the devotional day in temples and homes alike. 🪔`,
      hi: `🪔 आरती देवता के समक्ष प्रकाश घुमाना है — थाली में ज्वाला, धीमी दक्षिणावर्त गति में — गीत के साथ। ज्वाला अज्ञान को दूर करने वाले ज्ञान के प्रकाश का प्रतीक है; अंत में भक्त ज्वाला की ऊष्मा को अंजलि में लेकर आँखों व मस्तक से लगाते हैं, आशीर्वाद ग्रहण करते हैं। प्रातः व सायं आरती मंदिरों व घरों में भक्ति-दिवस की सीमाएँ हैं। 🪔`,
      bn: `🪔 আরতি দেবতার সামনে আলো ঘোরানো — থালায় শিখা, ধীর দক্ষিণাবর্ত গতিতে — গানের সাথে। শিখা অজ্ঞান দূরকারী জ্ঞানের আলোর প্রতীক; শেষে ভক্তরা শিখার উষ্ণতা অঞ্জলিতে নিয়ে চোখে ও মাথায় ছোঁয়ান, আশীর্বাদ গ্রহণ করেন। প্রাতঃ ও সায়ং আরতি মন্দিরে ও বাড়িতে ভক্তি-দিবসের সীমানা। 🪔`,
    },
    related: ['practice.basic_puja', 'practice.diya'],
    purohit_escalation: false,
  },
  {
    id: 'practice.diya',
    topic: 'practice',
    question_patterns: [
      'diya', 'how to light diya', 'diya meaning', 'oil lamp significance',
      'दीया', 'প্রদীপ', 'deepam', 'lighting lamp puja', 'which oil for diya',
    ],
    answer: {
      en: `🪔 Lighting a diya (oil lamp) is among the oldest acts of worship — flame as the visible form of the divine. Traditionally lit with sesame or ghee, facing east or north, it opens every puja and marks every festival. The single flame teaches the deepest lesson: one small light, sincerely tended, can fill a whole room — as one sincere heart can fill a whole life. 🪔`,
      hi: `🪔 दीया (तेल का दीप) जलाना उपासना के प्राचीनतम कर्मों में है — ज्वाला दिव्य का दृश्य रूप। परंपरागतः तिल के तेल या घी से, पूर्व या उत्तर की ओर मुख करके जलाया जाता है; यह हर पूजा का आरंभ और हर उत्सव की पहचान है। एक ज्वाला गहनतम शिक्षा देती है: निष्ठा से सँवारी एक छोटी ज्योति पूरा कमरा भर सकती है — जैसे एक निष्ठावान हृदय पूरा जीवन। 🪔`,
      bn: `🪔 প্রদীপ (তেলের বাতি) জ্বালানো উপাসনার প্রাচীনতম কর্মের একটি — শিখা দিব্যের দৃশ্য রূপ। ঐতিহ্যগতভাবে তিলের তেল বা ঘিয়ে, পূর্ব বা উত্তর দিকে মুখ করে জ্বালানো হয়; এটি প্রতিটি পূজার শুরু ও প্রতিটি উৎসবের পরিচয়। একটি শিখা গভীরতম শিক্ষা দেয়: নিষ্ঠায় লালিত একটি ছোট আলো পুরো ঘর ভরতে পারে — যেমন একটি নিষ্ঠাবান হৃদয় পুরো জীবন। 🪔`,
    },
    related: ['practice.basic_puja', 'practice.aarti', 'festival.diwali'],
    purohit_escalation: false,
  },
  {
    id: 'practice.morning',
    topic: 'practice',
    question_patterns: [
      'brahma muhurta', 'what is brahma muhurta', 'morning routine hindu',
      'ब्रह्म मुहूर्त', 'ব্রাহ্ম মুহূর্ত', 'ideal wake up time',
      'morning sadhana', 'subah uthne ka samay',
    ],
    answer: {
      en: `🌅 Brahma Muhurta is the sacred pre-dawn hour — roughly 96 minutes before sunrise (around 4–5:30 AM). The mind is naturally still, the world quiet, and meditation deepens effortlessly. Tradition says spiritual practice in this hour bears special fruit. Even rising 30 minutes earlier for japa or quiet sitting is a gentle way to begin honouring it. 🌅`,
      hi: `🌅 ब्रह्म मुहूर्त सूर्योदय से पूर्व का पवित्र प्रहर है — लगभग 96 मिनट पूर्व (प्रायः 4–5:30 बजे)। मन स्वाभाविकतः शांत, जगत मौन, और ध्यान सहज ही गहरा होता है। परंपरा कहती है इस प्रहर की साधना विशेष फल देती है। जप या मौन बैठक हेतु 30 मिनट पहले उठना भी इसका सम्मान करने का सौम्य आरंभ है। 🌅`,
      bn: `🌅 ব্রাহ্ম মুহূর্ত সূর্যোদয়ের পূর্বের পবিত্র প্রহর — প্রায় ৯৬ মিনিট আগে (সাধারণত ভোর ৪–৫:৩০)। মন স্বভাবতই স্থির, জগৎ নীরব, আর ধ্যান সহজেই গভীর হয়। পরম্পরা বলে এই প্রহরের সাধনা বিশেষ ফল দেয়। জপ বা নীরব উপবেশনের জন্য ৩০ মিনিট আগে ওঠাও এর সম্মানের সৌম্য শুরু। 🌅`,
    },
    related: ['practice.japa', 'practice.sandhya'],
    purohit_escalation: false,
  },
  {
    id: 'practice.pranayama_basic',
    topic: 'practice',
    question_patterns: [
      'pranayama', 'what is pranayama', 'pranayama basics', 'breathing exercise yoga',
      'प्राणायाम', 'প্রাণায়াম', 'anulom vilom', 'nadi shodhana',
    ],
    answer: {
      en: `🙏 Pranayama is the conscious regulation of breath — "prana" (life-force) + "ayama" (extension). Simple beginnings: sit straight, inhale slowly for 4 counts, exhale for 4 counts, a few minutes daily. Nadi Shodhana (alternate-nostril breathing) gently balances the nervous system. Advanced practices (kumbhaka/retentions, bandhas) should only be learned from a qualified teacher — breath is powerful, and deserves respect. 🌬️`,
      hi: `🙏 प्राणायाम श्वास का सचेतन नियमन है — "प्राण" (जीवन-शक्ति) + "आयाम" (विस्तार)। सरल आरंभ: सीधे बैठें, 4 गिनती में धीरे श्वास लें, 4 गिनती में छोड़ें, प्रतिदिन कुछ मिनट। नाड़ी शोधन (अनुलोम-विलोम) तंत्रिका तंत्र को सौम्यता से संतुलित करता है। उन्नत अभ्यास (कुंभक/धारण, बंध) केवल योग्य आचार्य से सीखें — श्वास शक्तिशाली है, सम्मान की हकदार है। 🌬️`,
      bn: `🙏 প্রাণায়াম শ্বাসের সচেতন নিয়মন — "প্রাণ" (জীবনীশক্তি) + "আয়াম" (বিস্তার)। সরল শুরু: সোজা বসুন, ৪ গুনতিতে ধীরে শ্বাস নিন, ৪ গুনতিতে ছাড়ুন, প্রতিদিন কয়েক মিনিট। নাড়ি শোধন (অনুলোম-বিলোম) স্নায়ুতন্ত্রকে সৌম্যভাবে ভারসাম্য করে। উন্নত অভ্যাস (কুম্ভক/ধারণ, বন্ধ) কেবল যোগ্য আচার্যের কাছে শিখুন — শ্বাস শক্তিশালী, সম্মানের যোগ্য। 🌬️`,
    },
    related: ['practice.morning', 'practice.japa'],
    purohit_escalation: true,
  },
  {
    id: 'practice.meditation_basic',
    topic: 'practice',
    question_patterns: [
      'meditation', 'how to meditate', 'dhyana', 'meditation basics hindu',
      'ध्यान', 'ধ্যান', 'dhyana meaning', 'beginner meditation',
    ],
    answer: {
      en: `🧘 Dhyana (meditation) in the Sanatani tradition is the steady resting of attention — often on the breath, a mantra, or the form of one's ishta-devata. Begin simply: sit comfortably, spine straight, eyes softly closed, and follow the natural breath for 5–10 minutes. When the mind wanders (it will!), gently return — that returning IS the practice. Regularity matters more than duration. 🧘`,
      hi: `🧘 सनातन परंपरा में ध्यान (dhyana) ध्यान का स्थिर विश्राम है — प्रायः श्वास, मंत्र, या अपने इष्ट-देवता के स्वरूप पर। सरल आरंभ: आराम से बैठें, रीढ़ सीधी, आँखें कोमलता से बंद, और 5–10 मिनट प्राकृतिक श्वास का अनुसरण करें। जब मन भटके (भटकेगा!), कोमलता से लौटें — वह लौटना ही साधना है। अवधि से अधिक नियमितता महत्वपूर्ण है। 🧘`,
      bn: `🧘 সনাতন পরম্পরায় ধ্যান মনোযোগের স্থির বিশ্রাম — প্রায়ই শ্বাস, মন্ত্র, বা নিজ ইষ্ট-দেবতার রূপে। সরল শুরু: আরামে বসুন, মেরুদণ্ড সোজা, চোখ কোমলভাবে বন্ধ, আর ৫–১০ মিনিট প্রাকৃতিক শ্বাস অনুসরণ করুন। মন যখন ঘোরে (ঘুরবেই!), কোমলভাবে ফিরুন — সেই ফেরাই সাধনা। সময়ের চেয়ে নিয়মিততা গুরুত্বপূর্ণ। 🧘`,
    },
    related: ['practice.japa', 'practice.pranayama_basic', 'practice.morning'],
    purohit_escalation: false,
  },
];
