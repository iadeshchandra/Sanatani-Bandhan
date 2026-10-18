/**
 * Sanatani Bandhan — AI Assistant Phase 2 · Corpus: Core Concepts
 * =====================================================================
 * Dharma, karma, moksha, purusharthas — the philosophical heart.
 * Concise, respectful, non-sectarian. Deep personal questions escalate.
 */
import type { DharmaCorpus } from './types';

export const CONCEPT_CORPUS: DharmaCorpus = [
  {
    id: 'concept.dharma',
    topic: 'concept',
    question_patterns: [
      'what is dharma', 'dharma meaning', 'dharma definition',
      'धर्म', 'धर्म क्या है', 'ধর্ম', 'ধর্ম কী', 'dharma kya hai', 'dharma ki',
      'dharma explained', 'meaning of dharma',
    ],
    answer: {
      en: `🙏 Dharma is among humanity's most profound words — often translated as "righteousness," "duty," or "the natural order," yet larger than all three. It is that which upholds: the right action, in the right context, at the right time. Your dharma as a parent differs from your dharma as a friend — and discovering it is itself a spiritual practice. As the Gita teaches: better one's own dharma imperfectly than another's perfectly. 🕉️`,
      hi: `🙏 धर्म मानवता के गहनतम शब्दों में है — प्रायः "धार्मिकता," "कर्तव्य" या "प्राकृतिक व्यवस्था" कहा जाता है, पर तीनों से बड़ा। यह वह है जो धारण करता है: सही कर्म, सही संदर्भ में, सही समय पर। माता-पिता के रूप में आपका धर्म मित्र के रूप में आपके धर्म से भिन्न है — और उसे खोजना स्वयं आध्यात्मिक साधना है। गीता सिखाती है: दूसरे के धर्म को पूर्णता से जीने से अच्छा है अपने धर्म को अपूर्णता से जीना। 🕉️`,
      bn: `🙏 ধর্ম মানবতার গভীরতম শব্দগুলির একটি — প্রায়ই "ধার্মিকতা," "কর্তব্য" বা "প্রাকৃতিক শৃঙ্খলা" বলা হয়, কিন্তু তিনটির চেয়ে বড়। এটি তা যা ধারণ করে: সঠিক কর্ম, সঠিক প্রসঙ্গে, সঠিক সময়ে। পিতামাতা হিসেবে আপনার ধর্ম বন্ধু হিসেবে আপনার ধর্ম থেকে ভিন্ন — আর তা আবিষ্কারই আধ্যাত্মিক সাধনা। গীতা শেখায়: অন্যের ধর্ম পূর্ণতায় পালনের চেয়ে নিজের ধর্ম অপূর্ণতায় পালন শ্রেয়। 🕉️`,
    },
    related: ['concept.karma', 'concept.purushartha', 'concept.gita'],
    purohit_escalation: false,
  },
  {
    id: 'concept.karma',
    topic: 'concept',
    question_patterns: [
      'what is karma', 'karma meaning', 'karma definition', 'karma philosophy',
      'कर्म', 'কর্ম', 'karma kya hai', 'karma ki',
      'law of karma', 'karma explained',
    ],
    answer: {
      en: `🙏 Karma simply means "action" — and the law that every action plants a seed which ripens in time. It is not punishment or reward from outside; it is the natural moral order, as impersonal as gravity. The Gita's great teaching is nishkama karma: act with full dedication, but release attachment to the fruits. You own your effort — the outcome belongs to the larger order. 🌱`,
      hi: `🙏 कर्म का सरल अर्थ है "कर्म" — और वह नियम कि प्रत्येक कर्म एक बीज बोता है जो समय पर पकता है। यह बाहर से दंड या पुरस्कार नहीं है; यह प्राकृतिक नैतिक व्यवस्था है, गुरुत्वाकर्षण जैसी निर्वैयक्तिक। गीता की महान शिक्षा है निष्काम कर्म: पूर्ण निष्ठा से कर्म करो, पर फल की आसक्ति छोड़ दो। प्रयास तुम्हारा है — परिणाम बड़ी व्यवस्था का। 🌱`,
      bn: `🙏 কর্মের সরল অর্থ "কর্ম" — আর সেই নিয়ম যে প্রতিটি কর্ম একটি বীজ বোনে যা সময়ে পাকে। এটি বাইরে থেকে শাস্তি বা পুরস্কার নয়; এটি প্রাকৃতিক নৈতিক শৃঙ্খলা, মাধ্যাকর্ষণের মতো নির্ব্যক্তিক। গীতার মহান শিক্ষা নিষ্কাম কর্ম: পূর্ণ নিষ্ঠায় কর্ম করো, কিন্তু ফলের আসক্তি ছাড়ো। প্রচেষ্টা তোমার — ফল বৃহত্তর শৃঙ্খলার। 🌱`,
    },
    related: ['concept.dharma', 'concept.moksha', 'concept.gita'],
    purohit_escalation: false,
  },
  {
    id: 'concept.moksha',
    topic: 'concept',
    question_patterns: [
      'what is moksha', 'moksha meaning', 'moksha definition', 'liberation hindu',
      'मोक्ष', 'মোক্ষ', 'mukti', 'मुक्ति', 'মুক্তি',
      'how to attain moksha', 'moksha explained',
    ],
    answer: {
      en: `🙏 Moksha is liberation — freedom from the cycle of birth and death (samsara), and the direct realisation of one's true nature. The paths are many: jnana (knowledge), bhakti (devotion), karma (selfless action), and raja (meditation) — different doors to the same freedom. It is not an escape from life but life's fullest flowering. The journey is long; every sincere step counts. 🪷`,
      hi: `🙏 मोक्ष मुक्ति है — जन्म-मृत्यु के चक्र (संसार) से स्वतंत्रता, और अपने सत्य स्वरूप का साक्षात् बोध। मार्ग अनेक हैं: ज्ञान, भक्ति, कर्म (निष्काम कर्म), राजयोग (ध्यान) — एक ही मुक्ति के भिन्न द्वार। यह जीवन से पलायन नहीं, जीवन का पूर्णतम पुष्पन है। यात्रा लंबी है; प्रत्येक निष्ठावान पग गिना जाता है। 🪷`,
      bn: `🙏 মোক্ষ মুক্তি — জন্ম-মৃত্যুর চক্র (সংসার) থেকে স্বাধীনতা, আর নিজ সত্য স্বরূপের সাক্ষাৎ উপলব্ধি। পথ বহু: জ্ঞান, ভক্তি, কর্ম (নিষ্কাম কর্ম), রাজযোগ (ধ্যান) — একই মুক্তির ভিন্ন দ্বার। এটি জীবন থেকে পলায়ন নয়, জীবনের পূর্ণতম প্রস্ফুটন। যাত্রা দীর্ঘ; প্রতিটি নিষ্ঠাবান পদক্ষেপ গোনা হয়। 🪷`,
    },
    related: ['concept.karma', 'concept.atman', 'concept.samsara'],
    purohit_escalation: false,
  },
  {
    id: 'concept.purushartha',
    topic: 'concept',
    question_patterns: [
      'purushartha', 'four purusharthas', 'four aims of life',
      'पुरुषार्थ', 'পুরুষার্থ', 'dharma artha kama moksha',
      'four goals hindu',
    ],
    answer: {
      en: `🙏 The four purusharthas are life's four aims: Dharma (righteousness), Artha (prosperity and security), Kama (pleasure and love, pursued rightly), and Moksha (liberation). A complete life honours all four in balance — dharma guides the pursuit of the other three. It is a profoundly practical philosophy: prosper, love, and enjoy — but never at the cost of what is right. 🌼`,
      hi: `🙏 चार पुरुषार्थ जीवन के चार लक्ष्य हैं: धर्म (धार्मिकता), अर्थ (समृद्धि व सुरक्षा), काम (आनंद व प्रेम, सही रीति से), मोक्ष (मुक्ति)। पूर्ण जीवन चारों का संतुलन साधता है — धर्म अन्य तीनों की साधना का मार्गदर्शन करता है। यह गहन व्यावहारिक दर्शन है: समृद्ध बनो, प्रेम करो, आनंद लो — पर कभी उचित की कीमत पर नहीं। 🌼`,
      bn: `🙏 চার পুরুষার্থ জীবনের চার লক্ষ্য: ধর্ম (ধার্মিকতা), অর্থ (সমৃদ্ধি ও নিরাপত্তা), কাম (আনন্দ ও প্রেম, সঠিকভাবে), মোক্ষ (মুক্তি)। পূর্ণ জীবন চারটির ভারসাম্য সাধে — ধর্ম অন্য তিনটির সাধনার পথ দেখায়। এটি গভীর ব্যবহারিক দর্শন: সমৃদ্ধ হও, ভালোবাসো, আনন্দ করো — কিন্তু কখনও উচিতের মূল্যে নয়। 🌼`,
    },
    related: ['concept.dharma', 'concept.moksha', 'concept.karma'],
    purohit_escalation: false,
  },
  {
    id: 'concept.atman',
    topic: 'concept',
    question_patterns: [
      'atman', 'what is atman', 'atman brahman', 'atman meaning',
      'आत्मन्', 'আত্মন', 'brahman', 'ब्रह्मन्', 'ব্রহ্ম',
      'self vedanta', 'who am i vedanta',
    ],
    answer: {
      en: `🙏 Atman is the true Self — not the body, not the mind, but the witnessing consciousness beneath both. Brahman is the ultimate reality, the ground of all existence. Vedanta's thunderous declaration is "Tat Tvam Asi" — Thou Art That: the Atman and Brahman are one. This is not philosophy for books; it is an invitation to look inward and discover who has been looking all along. 🕉️`,
      hi: `🙏 आत्मन् सत्य स्व है — न शरीर, न मन, बल्कि दोनों के नीचे साक्षी चेतना। ब्रह्मन् परम सत्य है, समस्त अस्तित्व का आधार। वेदांत की गर्जना है "तत् त्वम् असि" — तुम वही हो: आत्मन् व ब्रह्मन् एक हैं। यह पुस्तकों का दर्शन नहीं; अंतर्मुख होकर यह खोजने का निमंत्रण है कि देखता कौन रहा है। 🕉️`,
      bn: `🙏 আত্মন সত্য স্বরূপ — শরীর নয়, মন নয়, বরং দুটোর নীচে সাক্ষী চেতনা। ব্রহ্ম পরম সত্য, সমস্ত অস্তিত্বের ভিত্তি। বেদান্তের গর্জন "তৎ ত্বম্ অসি" — তুমিই তা: আত্মন ও ব্রহ্ম এক। এটি বইয়ের দর্শন নয়; অন্তর্মুখী হয়ে আবিষ্কারের আমন্ত্রণ — কে এতক্ষণ দেখছিল। 🕉️`,
    },
    related: ['concept.moksha', 'concept.samsara'],
    purohit_escalation: false,
  },
  {
    id: 'concept.samsara',
    topic: 'concept',
    question_patterns: [
      'samsara', 'what is samsara', 'rebirth hindu', 'reincarnation',
      'संसार', 'সংসার', 'cycle of birth death', 'punarjanma',
      'पुनर्जन्म', 'পুনর্জন্ম',
    ],
    answer: {
      en: `🙏 Samsara is the cycle of birth, death, and rebirth — the soul's long journey through many lives, shaped by karma. It is neither punishment nor accident: each life is a classroom, each experience a teacher. Liberation (moksha) is the graduation — not by escaping the world, but by seeing through it. The tradition meets death without fear, as a traveller meets a bend in the road. 🔄`,
      hi: `🙏 संसार जन्म, मृत्यु व पुनर्जन्म का चक्र है — कर्म से आकार पाती आत्मा की अनेक जन्मों की लंबी यात्रा। यह न दंड है न दुर्घटना: प्रत्येक जीवन एक पाठशाला, प्रत्येक अनुभव एक गुरु। मोक्ष स्नातक है — जगत से भागकर नहीं, उसे देखकर। परंपरा मृत्यु से भय बिना मिलती है, जैसे यात्री मार्ग के मोड़ से मिलता है। 🔄`,
      bn: `🙏 সংসার জন্ম, মৃত্যু ও পুনর্জন্মের চক্র — কর্মে আকৃতিপ্রাপ্ত আত্মার বহু জন্মের দীর্ঘ যাত্রা। এটি শাস্তিও নয়, দুর্ঘটনাও নয়: প্রতিটি জীবন একটি পাঠশালা, প্রতিটি অভিজ্ঞতা এক গুরু। মোক্ষ স্নাতক — জগৎ থেকে পালিয়ে নয়, তাকে দেখে। পরম্পরা মৃত্যুর সাথে ভয় ছাড়া মেলে, যেমন পথিক পথের বাঁকের সাথে মেলে। 🔄`,
    },
    related: ['concept.karma', 'concept.moksha', 'concept.atman'],
    purohit_escalation: false,
  },
  {
    id: 'concept.ahimsa',
    topic: 'concept',
    question_patterns: [
      'ahimsa', 'what is ahimsa', 'non-violence hindu', 'ahimsa meaning',
      'अहिंसा', 'অহিংসা', 'ahimsa paramo dharma',
    ],
    answer: {
      en: `🙏 Ahimsa is non-violence in thought, word, and deed — the first of the yamas, the ethical foundation of yoga. "Ahimsa paramo dharma": non-violence is the highest dharma. It extends beyond not harming: it is active compassion toward all beings. This is why vegetarianism is cherished in many traditions — the plate, too, is a place of practice. 🕊️`,
      hi: `🙏 अहिंसा मन, वचन व कर्म में अहिंसा है — यमों में प्रथम, योग की नैतिक नींव। "अहिंसा परमो धर्मः": अहिंसा सर्वोच्च धर्म है। यह न हानि पहुँचाने से परे है: यह समस्त प्राणियों के प्रति सक्रिय करुणा है। इसीलिए अनेक परंपराओं में शाकाहार प्रिय है — थाली भी साधना-स्थल है। 🕊️`,
      bn: `🙏 অহিংসা মন, বাক্য ও কর্মে অহিংসা — যমগুলির মধ্যে প্রথম, যোগের নৈতিক ভিত্তি। "অহিংসা পরমো ধর্মঃ": অহিংসা সর্বোচ্চ ধর্ম। এটি ক্ষতি না করার বাইরে: এটি সমস্ত প্রাণীর প্রতি সক্রিয় করুণা। তাই বহু পরম্পরায় নিরামিষাশ প্রিয় — থালাও সাধনাস্থল। 🕊️`,
    },
    related: ['concept.dharma'],
    purohit_escalation: false,
  },
  {
    id: 'concept.vedas',
    topic: 'concept',
    question_patterns: [
      'vedas', 'what are vedas', 'four vedas', 'veda meaning',
      'वेद', 'বেদ', 'rig veda', 'sama veda', 'yajur veda', 'atharva veda',
    ],
    answer: {
      en: `🙏 The four Vedas — Rig, Sama, Yajur, Atharva — are the most ancient sacred texts, composed over 3,000 years ago, preserved by precise oral transmission. They contain hymns, rituals, philosophy, and the Upanishads (their crown, Vedanta). "Veda" means knowledge — they are regarded not as composed but as "heard" (shruti) by rishis in deep meditation. Approach them with a teacher; their depth rewards guidance. 📿`,
      hi: `🙏 चार वेद — ऋग्, साम, यजुर्, अथर्व — प्राचीनतम पवित्र ग्रंथ हैं, 3,000 वर्षों से पूर्व रचित, सटीक मौखिक परंपरा से संरक्षित। इनमें सूक्त, कर्मकांड, दर्शन व उपनिषद् (इनका मुकुट, वेदांत) हैं। "वेद" का अर्थ ज्ञान है — इन्हें रचित नहीं, ऋषियों द्वारा गहन ध्यान में "श्रुत" माना जाता है। आचार्य के साथ इनके पास जाएँ; इनकी गहराई मार्गदर्शन का प्रतिदान देती है। 📿`,
      bn: `🙏 চার বেদ — ঋক্, সাম, যজুর্, অথর্ব — প্রাচীনতম পবিত্র গ্রন্থ, ৩,০০০ বছরেরও আগে রচিত, নিখুঁত মৌখিক পরম্পরায় সংরক্ষিত। এতে সূক্ত, কর্মকাণ্ড, দর্শন ও উপনিষদ্ (এদের মুকুট, বেদান্ত) আছে। "বেদ" অর্থ জ্ঞান — এগুলিকে রচিত নয়, ঋষিদের গভীর ধ্যানে "শ্রুত" বলে মানা হয়। আচার্যের সাথে এদের কাছে যান; এদের গভীরতা পথপ্রদর্শনের প্রতিদান দেয়। 📿`,
    },
    related: ['concept.gita', 'concept.mantra'],
    purohit_escalation: false,
  },
  {
    id: 'concept.gita',
    topic: 'concept',
    question_patterns: [
      'bhagavad gita', 'what is gita', 'gita meaning', 'gita summary',
      'गीता', 'গীতা', 'bhagavadgita', 'gita teachings',
      'krishna arjuna dialogue',
    ],
    answer: {
      en: `🙏 The Bhagavad Gita — 700 verses within the Mahabharata — is Krishna's counsel to Arjuna on the Kurukshetra battlefield: do your duty without attachment to results (nishkama karma), see the divine in all, and surrender with love. It reconciles action and renunciation, and has guided seekers for two millennia. Read even one verse daily with reflection — it is a lifetime's companion. 📿`,
      hi: `🙏 भगवद्गीता — महाभारत के भीतर 700 श्लोक — कुरुक्षेत्र में अर्जुन को कृष्ण का उपदेश है: फल की आसक्ति बिना कर्तव्य करो (निष्काम कर्म), सब में दिव्य को देखो, प्रेम से समर्पण करो। यह कर्म व संन्यास का समन्वय करती है, दो सहस्राब्दियों से साधकों का मार्गदर्शन कर रही है। प्रतिदिन एक श्लोक भी चिंतन सहित पढ़ो — यह जीवनभर की संगिनी है। 📿`,
      bn: `🙏 ভগবদ্গীতা — মহাভারতের মধ্যে ৭০০ শ্লোক — কুরুক্ষেত্রে অর্জুনকে কৃষ্ণের উপদেশ: ফলের আসক্তি ছাড়া কর্তব্য করো (নিষ্কাম কর্ম), সবে দিব্য দেখো, প্রেমে সমর্পণ করো। এটি কর্ম ও সন্ন্যাসের সমন্বয় করে, দুই সহস্রাব্দ ধরে সাধকদের পথ দেখাচ্ছে। প্রতিদিন একটি শ্লোকও চিন্তনসহ পড়ো — এটি জীবনভরের সঙ্গী। 📿`,
    },
    related: ['concept.dharma', 'concept.karma', 'concept.vedas'],
    purohit_escalation: false,
  },
  {
    id: 'concept.mantra',
    topic: 'concept',
    question_patterns: [
      'mantra', 'what is mantra', 'mantra meaning', 'mantra power',
      'मंत्र', 'মন্ত্র', 'how mantras work', 'gayatri mantra',
      'om namah shivaya', 'hare krishna mantra',
    ],
    answer: {
      en: `🙏 A mantra is a sacred sound-formula — "man" (mind) + "tra" (tool): an instrument for the mind. The Gayatri, Om Namah Shivaya, and the Hare Krishna mahamantra are among the most cherished. Mantras work through repetition with devotion (japa), gradually steadying the mind like a flame in still air. Traditionally, a mantra received from a guru carries special potency — the guru's blessing rides the sound. 📿`,
      hi: `🙏 मंत्र एक पवित्र ध्वनि-सूत्र है — "मन" + "त्र" (साधन): मन का साधन। गायत्री, ॐ नमः शिवाय व हरे कृष्ण महामंत्र प्रियतमों में हैं। मंत्र भक्तिपूर्ण पुनरावृत्ति (जप) से कार्य करते हैं, मन को स्थिर वायु में ज्योति-सा स्थिर करते हैं। परंपरागतः गुरु से प्राप्त मंत्र विशेष शक्ति रखता है — ध्वनि पर गुरु का आशीर्वाद सवार होता है। 📿`,
      bn: `🙏 মন্ত্র একটি পবিত্র ধ্বনি-সূত্র — "মন" + "ত্র" (সাধন): মনের সাধন। গায়ত্রী, ওঁ নমঃ শিবায় ও হরে কৃষ্ণ মহামন্ত্র প্রিয়তমদের মধ্যে। মন্ত্র ভক্তিপূর্ণ পুনরাবৃত্তি (জপ) দিয়ে কাজ করে, মনকে স্থির বাতাসে শিখার মতো স্থির করে। ঐতিহ্যগতভাবে গুরুর থেকে পাওয়া মন্ত্র বিশেষ শক্তি রাখে — ধ্বনিতে গুরুর আশীর্বাদ সওয়ার হয়। 📿`,
    },
    related: ['practice.japa', 'concept.vedas', 'concept.om'],
    purohit_escalation: false,
  },
  {
    id: 'concept.om',
    topic: 'concept',
    question_patterns: [
      'om', 'aum', 'what is om', 'om meaning', 'om significance',
      'ॐ', 'ওঁ', 'om symbol meaning', 'pranava',
    ],
    answer: {
      en: `🕉️ Om (Aum) is the pranava — the primordial sound, the vibration from which creation unfolds. Its three sounds (A-U-M) span waking, dreaming, and deep sleep; the silence after is turiya, pure consciousness. It opens every prayer, every Veda, every auspicious beginning. Chant it slowly, feel it resonate in the chest — you are sounding the universe's first note. 🕉️`,
      hi: `🕉️ ॐ (ओम्) प्रणव है — आद्य ध्वनि, वह स्पंदन जिससे सृष्टि खुलती है। इसके तीन स्वर (अ-उ-म्) जाग्रत, स्वप्न व सुषुप्ति को व्याप्त करते हैं; पश्चात् मौन तुरीय है, शुद्ध चेतना। यह हर प्रार्थना, हर वेद, हर शुभारंभ का उद्घाटन करता है। इसे धीरे जपो, वक्ष में गूँज महसूस करो — तुम ब्रह्मांड का प्रथम स्वर नाद कर रहे हो। 🕉️`,
      bn: `🕉️ ওঁ (ওম্) প্রণব — আদ্য ধ্বনি, সেই স্পন্দন যা থেকে সৃষ্টি খোলে। এর তিন ধ্বনি (অ-উ-ম্) জাগ্রত, স্বপ্ন ও সুষুপ্তিকে ব্যাপ্ত করে; পরের নীরবতা তুরীয়, শুদ্ধ চেতনা। এটি প্রতিটি প্রার্থনা, প্রতিটি বেদ, প্রতিটি শুভারম্ভের উদ্বোধন করে। ধীরে জপ করো, বক্ষে গুঞ্জন অনুভব করো — তুমি মহাবিশ্বের প্রথম স্বর বাজাচ্ছ। 🕉️`,
    },
    related: ['concept.mantra', 'concept.atman'],
    purohit_escalation: false,
  },
  {
    id: 'concept.pitra',
    topic: 'concept',
    question_patterns: [
      'pitra', 'pitru', 'ancestors hindu', 'pitra paksha', 'pitru paksha',
      'पितृ', 'পিতৃ', 'tarpana', 'tarpan', 'shraddha',
      'पितृ पक्ष', 'পিতৃপক্ষ', 'honouring ancestors',
    ],
    answer: {
      en: `🙏 Pitras are the ancestors — honoured through tarpana (water offerings) and shraddha rites, especially during Pitru Paksha (the fortnight before Navratri). The tradition teaches that we stand on our ancestors' shoulders; gratitude toward them is a sacred duty. Offering with love matters more than elaborate ritual — remembrance itself is worship. 🪔`,
      hi: `🙏 पितर पूर्वज हैं — तर्पण (जल-अर्पण) व श्राद्ध से सम्मानित, विशेषकर पितृ पक्ष (नवरात्रि से पूर्व पखवाड़ा) में। परंपरा सिखाती है हम पूर्वजों के कंधों पर खड़े हैं; उनके प्रति कृतज्ञता पवित्र कर्तव्य है। विस्तृत विधि से अधिक प्रेमपूर्ण अर्पण महत्वपूर्ण है — स्मरण ही उपासना है। 🪔`,
      bn: `🙏 পিতৃ পূর্বপুরুষ — তর্পণ (জল-অর্পণ) ও শ্রাদ্ধে সম্মানিত, বিশেষত পিতৃপক্ষে (নবরাত্রির আগের পক্ষ)। পরম্পরা শেখায় আমরা পূর্বপুরুষদের কাঁধে দাঁড়িয়ে; তাঁদের প্রতি কৃতজ্ঞতা পবিত্র কর্তব্য। বিস্তারিত বিধির চেয়ে প্রেমপূর্ণ অর্পণ গুরুত্বপূর্ণ — স্মরণই উপাসনা। 🪔`,
    },
    related: ['tithi.amavasya', 'samskara.antyeshti'],
    purohit_escalation: false,
  },
];
