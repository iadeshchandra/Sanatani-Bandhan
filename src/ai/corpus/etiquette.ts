/**
 * Sanatani Bandhan — AI Assistant Phase 2 · Corpus: Temple Etiquette
 * =====================================================================
 * Practical dos and don'ts for temple visits. Respectful, universal.
 */
import type { DharmaCorpus } from './types';

export const ETIQUETTE_CORPUS: DharmaCorpus = [
  {
    id: 'etiquette.temple_dos',
    topic: 'etiquette',
    question_patterns: [
      'temple etiquette', 'temple dos', 'how to behave in temple',
      'मंदिर शिष्टाचार', 'মন্দির শিষ্টাচার', 'temple manners',
      'visiting temple first time', 'temple rules',
    ],
    answer: {
      en: `🙏 Visiting a temple: bathe and wear clean, modest clothes; remove footwear at the designated area; enter quietly with folded hands; accept prasadam with the right hand; maintain silence in the sanctum. Switch off your phone — the divine deserves your full presence. And carry the temple's peace back out with you; that is the real prasadam. 🛕`,
      hi: `🙏 मंदिर दर्शन: स्नान कर स्वच्छ, शालीन वस्त्र पहनें; निर्दिष्ट स्थान पर जूते उतारें; हाथ जोड़कर शांति से प्रवेश करें; दाएँ हाथ से प्रसाद ग्रहण करें; गर्भगृह में मौन रखें। फोन बंद कर दें — दिव्य आपकी पूर्ण उपस्थिति का हकदार है। और मंदिर की शांति साथ लेकर बाहर आएँ; वही सच्चा प्रसाद है। 🛕`,
      bn: `🙏 মন্দির দর্শন: স্নান করে পরিষ্কার, শালীন পোশাক পরুন; নির্দিষ্ট জায়গায় জুতো খুলুন; হাত জোড় করে শান্তিতে প্রবেশ করুন; ডান হাতে প্রসাদ নিন; গর্ভগৃহে নীরবতা রাখুন। ফোন বন্ধ করুন — দিব্য আপনার পূর্ণ উপস্থিতির যোগ্য। আর মন্দিরের শান্তি সাথে নিয়ে বেরিয়ে আসুন; সেটাই সত্যিকারের প্রসাদ। 🛕`,
    },
    related: ['etiquette.temple_donts', 'etiquette.dress', 'etiquette.pradakshina'],
    purohit_escalation: false,
  },
  {
    id: 'etiquette.temple_donts',
    topic: 'etiquette',
    question_patterns: [
      'temple donts', "what not to do in temple", 'temple prohibitions',
      'मंदिर में क्या न करें', 'মন্দিরে কী করবেন না', 'temple mistakes',
    ],
    answer: {
      en: `🙏 In temples, please avoid: touching the main deity or entering the sanctum (unless invited by priests); loud talking or phone calls; photography where prohibited; bringing leather items or non-vegetarian food; pointing feet toward the deity; and rushing — darshan is not a transaction. When unsure, watch the regulars and follow their lead with humility. 🙏`,
      hi: `🙏 मंदिरों में कृपया बचें: मुख्य देवता को स्पर्श या गर्भगृह में प्रवेश (पुजारी के आमंत्रण बिना); ज़ोर से बात या फोन कॉल; जहाँ निषिद्ध हो वहाँ फोटोग्राफी; चमड़े की वस्तुएँ या मांसाहार लाना; देवता की ओर पैर करना; और जल्दबाज़ी — दर्शन लेन-देन नहीं है। संदेह हो तो नियमित भक्तों को देखकर विनम्रता से अनुसरण करें। 🙏`,
      bn: `🙏 মন্দিরে অনুগ্রহ করে এড়িয়ে চলুন: মূল দেবতাকে স্পর্শ বা গর্ভগৃহে প্রবেশ (পুরোহিতের আমন্ত্রণ ছাড়া); জোরে কথা বা ফোন কল; যেখানে নিষেধ সেখানে ফটোগ্রাফি; চামড়ার জিনিস বা আমিষ খাবার আনা; দেবতার দিকে পা করা; আর তাড়াহুড়ো — দর্শন লেনদেন নয়। সন্দেহ হলে নিয়মিত ভক্তদের দেখে বিনম্রতায় অনুসরণ করুন। 🙏`,
    },
    related: ['etiquette.temple_dos', 'etiquette.photography'],
    purohit_escalation: false,
  },
  {
    id: 'etiquette.dress',
    topic: 'etiquette',
    question_patterns: [
      'temple dress code', 'what to wear to temple', 'temple clothing',
      'मंदिर वस्त्र', 'মন্দির পোশাক', 'dress for temple visit',
    ],
    answer: {
      en: `🙏 Dress for temples is simple: clean, modest clothing covering shoulders and knees. Traditional wear — dhoti-kurta, saree, salwar — is always welcome but not mandatory; neat everyday clothes with respect suffice. Avoid shorts, sleeveless tops, and flashy attire. The principle is beautiful: dress as you would to meet someone you deeply revere — because you are. 🌼`,
      hi: `🙏 मंदिर हेतु वस्त्र सरल हैं: कंधे व घुटने ढकने वाले स्वच्छ, शालीन वस्त्र। पारंपरिक परिधान — धोती-कुर्ता, साड़ी, सलवार — सदा स्वागत है पर अनिवार्य नहीं; सम्मान सहित साफ-सुथरे दैनिक वस्त्र पर्याप्त हैं। शॉर्ट्स, स्लीवलेस व भड़कीले परिधान से बचें। सिद्धांत सुंदर है: ऐसे वस्त्र पहनो जैसे किसी अत्यंत श्रद्धेय से मिलने — क्योंकि मिल रहे हो। 🌼`,
      bn: `🙏 মন্দিরের পোশাক সরল: কাঁধ ও হাঁটু ঢাকা পরিষ্কার, শালীন পোশাক। ঐতিহ্যবাহী পোশাক — ধুতি-কুর্তা, শাড়ি, সালোয়ার — সদা স্বাগত কিন্তু বাধ্যতামূলক নয়; সম্মানসহ পরিষ্কার দৈনন্দিন পোশাক যথেষ্ট। শর্টস, স্লিভলেস ও জমকালো পোশাক এড়িয়ে চলুন। নীতি সুন্দর: এমন পোশাক পরুন যেন অতি শ্রদ্ধেয় কারও সাথে দেখা — কারণ করছেন। 🌼`,
    },
    related: ['etiquette.temple_dos'],
    purohit_escalation: false,
  },
  {
    id: 'etiquette.pradakshina',
    topic: 'etiquette',
    question_patterns: [
      'pradakshina', 'what is pradakshina', 'circumambulation temple',
      'प्रदक्षिणा', 'প্রদক্ষিণা', 'parikrama', 'how many rounds temple',
      'pradakshina how many times',
    ],
    answer: {
      en: `🙏 Pradakshina is the clockwise circumambulation of the deity or shrine — keeping the divine to your right, the side of respect. Traditionally 3 rounds for most deities (some traditions prescribe specific numbers for specific gods). Walk slowly, hands folded, mind on the divine — it is meditation in motion, the body itself becoming a prayer. 🛕`,
      hi: `🙏 प्रदक्षिणा देवता या मंदिर की दक्षिणावर्त परिक्रमा है — दिव्य को दाएँ रखते हुए, सम्मान की ओर। परंपरागतः अधिकांश देवताओं हेतु 3 चक्कर (कुछ परंपराएँ विशिष्ट देवताओं हेतु विशिष्ट संख्या बताती हैं)। धीरे चलें, हाथ जोड़े, मन दिव्य में — यह गतिशील ध्यान है, शरीर स्वयं प्रार्थना बन जाता है। 🛕`,
      bn: `🙏 প্রদক্ষিণা দেবতা বা মন্দিরের দক্ষিণাবর্ত পরিক্রমা — দিব্যকে ডানে রেখে, সম্মানের দিকে। ঐতিহ্যগতভাবে অধিকাংশ দেবতার জন্য ৩ চক্কর (কিছু পরম্পরা নির্দিষ্ট দেবতার জন্য নির্দিষ্ট সংখ্যা বলে)। ধীরে হাঁটুন, হাত জোড়, মন দিব্যে — এটি গতিশীল ধ্যান, শরীর স্বয়ং প্রার্থনা হয়ে ওঠে। 🛕`,
    },
    related: ['etiquette.temple_dos'],
    purohit_escalation: false,
  },
  {
    id: 'etiquette.prasadam',
    topic: 'etiquette',
    question_patterns: [
      'prasadam', 'prasad', 'what is prasadam', 'prasad etiquette',
      'प्रसाद', 'প্রসাদ', 'how to take prasad', 'prasadam meaning',
    ],
    answer: {
      en: `🙏 Prasadam is food (or any item) first offered to the deity, then shared — carrying divine blessing. Receive it with the right hand (or both hands cupped), bow slightly, and partake with gratitude — never waste it. If you cannot finish, share it; prasadam multiplies in the sharing. It is not "free food" — it is grace you can taste. 🌼`,
      hi: `🙏 प्रसाद वह अन्न (या कोई वस्तु) है जो पहले देवता को अर्पित होकर फिर बाँटा जाता है — दिव्य आशीर्वाद लिए। दाएँ हाथ (या दोनों हाथों की अंजलि) से ग्रहण करें, हल्का नमन करें, कृतज्ञता से पाएँ — कभी व्यर्थ न करें। समाप्त न कर सकें तो बाँट दें; प्रसाद बाँटने में बढ़ता है। यह "मुफ्त भोजन" नहीं — यह चखी जा सकने वाली कृपा है। 🌼`,
      bn: `🙏 প্রসাদ সেই অন্ন (বা যেকোনো বস্তু) যা প্রথমে দেবতাকে অর্পণ করে পরে ভাগ করা হয় — দিব্য আশীর্বাদ বহন করে। ডান হাতে (বা দুই হাতের অঞ্জলিতে) নিন, হালকা প্রণাম করুন, কৃতজ্ঞতায় গ্রহণ করুন — কখনও নষ্ট করবেন না। শেষ করতে না পারলে ভাগ করুন; প্রসাদ ভাগে বাড়ে। এটি "বিনামূল্যের খাবার" নয় — এটি চাখা যায় এমন কৃপা। 🌼`,
    },
    related: ['etiquette.temple_dos', 'practice.basic_puja'],
    purohit_escalation: false,
  },
  {
    id: 'etiquette.photography',
    topic: 'etiquette',
    question_patterns: [
      'temple photography', 'photos in temple allowed', 'camera in temple',
      'मंदिर फोटोग्राफी', 'মন্দির ফটোগ্রাফি', 'selfie in temple',
    ],
    answer: {
      en: `📵 Photography rules vary by temple — many prohibit cameras and phones in the sanctum, some ban them campus-wide. Always check the signage and ask the staff; when in doubt, keep the phone away. The deeper point: darshan is for the eyes of the heart, not the camera roll. A memory held in devotion outlasts any photograph. 📵`,
      hi: `📵 फोटोग्राफी नियम मंदिरानुसार भिन्न हैं — अनेक गर्भगृह में कैमरा व फोन निषेध करते हैं, कुछ पूरे परिसर में। सदा सूचना-पट्ट देखें व कर्मचारियों से पूछें; संदेह हो तो फोन दूर रखें। गहन सत्य: दर्शन हृदय की आँखों हेतु है, कैमरा रोल हेतु नहीं। भक्ति में धरी स्मृति हर तस्वीर से दीर्घजीवी होती है। 📵`,
      bn: `📵 ফটোগ্রাফির নিয়ম মন্দিরভেদে ভিন্ন — অনেকে গর্ভগৃহে ক্যামেরা ও ফোন নিষেধ করে, কেউ পুরো চত্বরে। সদা সাইনবোর্ড দেখুন ও কর্মীদের জিজ্ঞেস করুন; সন্দেহ হলে ফোন দূরে রাখুন। গভীর সত্য: দর্শন হৃদয়ের চোখের জন্য, ক্যামেরা রোলের জন্য নয়। ভক্তিতে ধরা স্মৃতি যেকোনো ছবির চেয়ে দীর্ঘজীবী। 📵`,
    },
    related: ['etiquette.temple_donts', 'etiquette.temple_dos'],
    purohit_escalation: false,
  },
];
