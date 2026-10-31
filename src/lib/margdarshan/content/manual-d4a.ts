import type { ManualEntry } from '../manualTypes';

export const MANUAL_D4A: Record<string, ManualEntry> = {
  'rakthaSeva': {
    whatItDoes: { en: 'This desk keeps a ready list of blood donors, so when a patient needs blood urgently, the seva team can reach the right person in minutes.', hi: 'यह डेस्क रक्तदाताओं की तैयार सूची रखता है, ताकि जब किसी रोगी को तुरंत रक्त की जरूरत हो, सेवा दल मिनटों में सही व्यक्ति तक पहुँच सके।', bn: 'এই ডেস্কটি রক্তদাতাদের একটি প্রস্তুত তালিকা রাখে, যাতে কোনো রোগীর জরুরি রক্তের প্রয়োজন হলে সেবা দল মিনিটের মধ্যে সঠিক ব্যক্তির কাছে পৌঁছাতে পারে।' },
    realLifeExample: { en: 'When the father of a devotee needs blood before an operation, one sevak searches his blood group and calls three nearby donors at once. For a small trust with no office staff, this one list replaces panic and endless phone calls.', hi: 'जब किसी भक्त के पिता को ऑपरेशन से पहले रक्त चाहिए, एक सेवक उनका रक्त समूह खोजकर पास के तीन दाताओं को एक साथ फोन करता है। बिना कार्यालय कर्मी वाले छोटे ट्रस्ट के लिए यह एक सूची घबराहट और अंतहीन फोन कॉल की जगह ले लेती है।', bn: 'কোনো ভক্তের বাবার অস্ত্রোপচারের আগে রক্তের প্রয়োজন হলে, একজন সেবক তাঁর রক্তের গ্রুপ খুঁজে কাছের ৩ জন দাতাকে একসঙ্গে ফোন করেন। অফিসের কর্মী ছাড়া একটি ছোট ট্রাস্টের জন্য এই একটি তালিকাই আতঙ্ক আর অন্তহীন ফোন কলের জায়গা নেয়।' },
    steps: [
      { en: 'Add each willing donor with blood group and a working phone number.', hi: 'हर इच्छुक दाता को रक्त समूह और चालू फोन नंबर के साथ जोड़ें।', bn: 'প্রতিটি ইচ্ছুক দাতাকে রক্তের গ্রুপ ও চালু ফোন নম্বরসহ যোগ করুন।' },
      { en: 'When a need comes, search by the blood group the patient needs.', hi: 'जब जरूरत आए, रोगी को चाहिए वह रक्त समूह खोजें।', bn: 'প্রয়োজন এলে রোগীর দরকারি রক্তের গ্রুপ দিয়ে খুঁজুন।' },
      { en: 'Call the matched donors and note who has agreed to come.', hi: 'मेल खाने वाले दाताओं को फोन करें और कौन आने को तैयार है, यह लिखें।', bn: 'মিলে যাওয়া দাতাদের ফোন করুন এবং কে আসতে রাজি হয়েছেন তা লিখে রাখুন।' },
      { en: 'After the donation, update the record so the next search stays true.', hi: 'दान के बाद रिकॉर्ड अपडेट करें, ताकि अगली खोज सही रहे।', bn: 'দানের পর রেকর্ড হালনাগাদ করুন, যাতে পরের খোঁজ সঠিক থাকে।' }
    ],
    commonMistakes: [
      { en: 'Do not wait for an emergency to build the list. Add donors in calm times, when people can think clearly.', hi: 'सूची बनाने के लिए आपातकाल का इंतजार न करें। शांत समय में दाता जोड़ें, जब लोग स्पष्ट सोच सकें।', bn: 'তালিকা তৈরির জন্য জরুরি অবস্থার অপেক্ষা করবেন না। শান্ত সময়ে দাতা যোগ করুন, যখন মানুষ পরিষ্কারভাবে ভাবতে পারে।' },
      { en: 'Keep phone numbers fresh. An old number wastes the very minutes this desk is meant to save.', hi: 'फोन नंबर ताजा रखें। पुराना नंबर वही मिनट बर्बाद करता है जो यह डेस्क बचाने के लिए है।', bn: 'ফোন নম্বর হালনাগাদ রাখুন। পুরনো নম্বর সেই মিনিটগুলোই নষ্ট করে, যেগুলো বাঁচানোর জন্যই এই ডেস্ক।' },
      { en: 'Share only what a donor truly needs to know about the patient, and nothing more.', hi: 'दाता को रोगी के बारे में केवल उतना ही बताएं जितना सच में जरूरी है, उससे अधिक नहीं।', bn: 'দাতাকে রোগী সম্পর্কে শুধু ততটুকুই জানান, যতটুকু সত্যিই দরকার, তার বেশি নয়।' }
    ],
    capabilities: [
      { en: 'Keep donors organised by blood group', hi: 'दाताओं को रक्त समूह के अनुसार व्यवस्थित रखें', bn: 'দাতাদের রক্তের গ্রুপ অনুযায়ী সাজিয়ে রাখুন' },
      { en: 'Find matching donors quickly in an urgent need', hi: 'तुरंत जरूरत में मेल खाने वाले दाता जल्दी खोजें', bn: 'জরুরি প্রয়োজনে মিলে যাওয়া দাতা দ্রুত খুঁজুন' },
      { en: 'Record donations and donor availability', hi: 'दान और दाता की उपलब्धता दर्ज करें', bn: 'দান ও দাতার প্রাপ্যতা লিপিবদ্ধ করুন' }
    ],
    worksOffline: true
  },
  'goshala': {
    realLifeExample: { en: 'At a goshala with 12 cows and one sevak, the morning milk record for every gomata takes about a minute on the phone. When a devotee asks about the cow she sponsors, the sevak can show her health and care notes at once.', hi: '12 गायों और एक सेवक वाली गोशाला में, हर गोमाता का सुबह का दूध रिकॉर्ड फोन पर लगभग एक मिनट में हो जाता है। जब कोई भक्त अपनी प्रायोजित गाय के बारे में पूछती है, सेवक तुरंत उसके स्वास्थ्य और देखभाल के नोट दिखा सकता है।', bn: '১২টি গরু ও ১ জন সেবকের একটি গোশালায়, প্রতিটি গোমাতার সকালের দুধের রেকর্ড ফোনে প্রায় ১ মিনিটে হয়ে যায়। কোনো ভক্ত তাঁর পৃষ্ঠপোষকতা করা গরুর কথা জিজ্ঞাসা করলে, সেবক সঙ্গে সঙ্গে তার স্বাস্থ্য ও যত্নের নোট দেখাতে পারেন।' },
    commonMistakes: [
      { en: 'Do not keep vet visits only in memory. Write each checkup and medicine down, so care does not depend on one person.', hi: 'पशु चिकित्सक की यात्रा केवल याद में न रखें। हर जांच और दवा लिखें, ताकि देखभाल एक व्यक्ति पर निर्भर न रहे।', bn: 'পশুচিকিৎসকের পরিদর্শন শুধু মনে রাখবেন না। প্রতিটি পরীক্ষা ও ওষুধ লিখে রাখুন, যাতে যত্ন একজনের ওপর নির্ভর না করে।' },
      { en: 'Note milk and fodder daily, not at the end of the month. Small daily notes reveal a falling yield early.', hi: 'दूध और चारा रोज लिखें, महीने के अंत में नहीं। रोज के छोटे नोट घटती पैदावार को जल्दी दिखा देते हैं।', bn: 'দুধ ও খড় প্রতিদিন লিখুন, মাসের শেষে নয়। প্রতিদিনের ছোট নোট কমে আসা উৎপাদন আগেই দেখিয়ে দেয়।' }
    ],
    capabilities: [
      { en: 'Keep a record for every gomata in the herd', hi: 'झुंड की हर गोमाता का रिकॉर्ड रखें', bn: 'পালের প্রতিটি গোমাতার রেকর্ড রাখুন' },
      { en: 'Track health, vet checkups and milk yield', hi: 'स्वास्थ्य, पशु जांच और दूध की पैदावार देखें', bn: 'স্বাস্থ্য, পশু পরীক্ষা ও দুধের উৎপাদন দেখুন' },
      { en: 'Note fodder use and gomata sponsorships', hi: 'चारे का उपयोग और गोमाता प्रायोजन लिखें', bn: 'খড়ের ব্যবহার ও গোমাতা পৃষ্ঠপোষকতা লিখুন' }
    ],
    worksOffline: true
  },
  'annadanam': {
    whatItDoes: { en: 'This desk helps you plan and account for annadanam and prasad seva, so food is prepared in the right quantity and served to everyone without waste.', hi: 'यह डेस्क अन्नदानम और प्रसाद सेवा की योजना और हिसाब में मदद करता है, ताकि भोजन सही मात्रा में बने और बिना बर्बादी सब तक पहुँचे।', bn: 'এই ডেস্কটি অন্নদানম ও প্রসাদ সেবার পরিকল্পনা ও হিসাব রাখতে সাহায্য করে, যাতে খাবার সঠিক পরিমাণে তৈরি হয় এবং অপচয় ছাড়া সবার কাছে পৌঁছায়।' },
    realLifeExample: { en: 'On an ekadashi, a small mandir expects about 200 devotees for prasad and has only two cooks. Planning the quantity here the day before means enough food for the last family in line, and nothing thrown away.', hi: 'एकादशी पर एक छोटे मंदिर में प्रसाद के लिए लगभग 200 भक्तों की उम्मीद है और केवल दो रसोइए हैं। एक दिन पहले यहाँ मात्रा की योजना बनाने से कतार के अंतिम परिवार तक पर्याप्त भोजन पहुँचता है, और कुछ फेंका नहीं जाता।', bn: 'একাদশীতে একটি ছোট মন্দিরে প্রসাদের জন্য প্রায় ২০০ ভক্তের আশা, আর রাঁধুনি মাত্র ২ জন। একদিন আগে এখানে পরিমাণের পরিকল্পনা করলে সারির শেষ পরিবার পর্যন্ত পর্যাপ্ত খাবার পৌঁছায়, আর কিছুই ফেলা যায় না।' },
    steps: [
      { en: 'Note the day, the occasion and how many people you expect to serve.', hi: 'दिन, अवसर और कितने लोगों को भोजन कराना है, यह लिखें।', bn: 'দিন, উপলক্ষ এবং কতজনকে খাওয়ানো হবে তা লিখুন।' },
      { en: 'Plan the menu and quantity for that count before buying or cooking.', hi: 'खरीद या पकाने से पहले उस संख्या के लिए मेनू और मात्रा तय करें।', bn: 'কেনা বা রান্নার আগে সেই সংখ্যার জন্য পদ ও পরিমাণ ঠিক করুন।' },
      { en: 'Record what was actually served and what remained after the seva.', hi: 'सेवा के बाद सच में कितना परोसा गया और कितना बचा, यह दर्ज करें।', bn: 'সেবার পর সত্যিই কতটা পরিবেশন হলো এবং কতটা বাকি রইল তা লিখুন।' },
      { en: 'Note the cost and the sponsor, if a devotee offered the annadanam.', hi: 'खर्च और प्रायोजक लिखें, यदि किसी भक्त ने अन्नदानम का संकल्प लिया हो।', bn: 'খরচ ও পৃষ্ঠপোষক লিখুন, যদি কোনো ভক্ত অন্নদানমের সংকল্প করে থাকেন।' }
    ],
    commonMistakes: [
      { en: 'Do not guess quantities from habit alone. A festival crowd and a weekday crowd are very different.', hi: 'केवल आदत से मात्रा का अंदाजा न लगाएं। त्योहार की भीड़ और सप्ताह के दिन की भीड़ बहुत अलग होती है।', bn: 'শুধু অভ্যাস থেকে পরিমাণ আন্দাজ করবেন না। উৎসবের ভিড় আর সপ্তাহের দিনের ভিড় অনেক আলাদা।' },
      { en: 'Write down leftovers honestly. That note is what makes the next annadanam better, not a failure.', hi: 'बचा हुआ भोजन ईमानदारी से लिखें। वही नोट अगली अन्नदानम सेवा को बेहतर बनाता है, असफलता नहीं।', bn: 'বেঁচে যাওয়া খাবার সততার সঙ্গে লিখুন। সেই নোটই পরের অন্নদানম সেবাকে আরও ভালো করে, ব্যর্থতা নয়।' }
    ],
    capabilities: [
      { en: 'Plan annadanam and prasad for expected counts', hi: 'अपेक्षित संख्या के लिए अन्नदानम और प्रसाद की योजना बनाएं', bn: 'প্রত্যাশিত সংখ্যার জন্য অন্নদানম ও প্রসাদের পরিকল্পনা করুন' },
      { en: 'Track what was served and what remained', hi: 'कितना परोसा गया और कितना बचा, यह देखें', bn: 'কতটা পরিবেশন হলো ও কতটা বাকি রইল দেখুন' },
      { en: 'Account for cost and sponsors', hi: 'खर्च और प्रायोजकों का हिसाब रखें', bn: 'খরচ ও পৃষ্ঠপোষকদের হিসাব রাখুন' }
    ],
    worksOffline: true
  },
  'annakshetra-one': {
    whatItDoes: { en: 'This desk runs the kitchen and bhandara, with recipes that work out ingredients for a small group or for thousands of plates, and remind you to reorder in time.', hi: 'यह डेस्क रसोई और भंडारा चलाता है, ऐसी रेसिपी के साथ जो छोटे समूह या हजारों थालियों के लिए सामग्री निकाल देती हैं, और समय पर फिर मंगाने की याद दिलाती हैं।', bn: 'এই ডেস্কটি রান্নাঘর ও ভাণ্ডারা চালায়, এমন রন্ধনপ্রণালী দিয়ে যা ছোট দল বা হাজার হাজার থালার জন্য উপকরণ হিসাব করে দেয়, এবং সময়মতো আবার অর্ডার করার কথা মনে করিয়ে দেয়।' },
    realLifeExample: { en: 'A bhandara that usually serves 100 plates suddenly expects 1,000 on a festival day, and the kitchen has no manager. The recipe here scales the rice, dal and oil by itself, so the one sevak in charge shops once and shops right.', hi: 'एक भंडारा जो आमतौर पर 100 थाली परोसता है, त्योहार के दिन अचानक 1,000 की उम्मीद करता है, और रसोई का कोई प्रबंधक नहीं है। यहाँ की रेसिपी चावल, दाल और तेल खुद बढ़ा देती है, ताकि प्रभारी एक सेवक एक बार और सही खरीदारी करे।', bn: 'একটি ভাণ্ডারা যা সাধারণত ১০০ থালা পরিবেশন করে, উৎসবের দিনে হঠাৎ ১,০০০ জনের আশা করে, আর রান্নাঘরের কোনো ব্যবস্থাপক নেই। এখানকার রন্ধনপ্রণালী চাল, ডাল ও তেল নিজেই বাড়িয়ে দেয়, যাতে দায়িত্বে থাকা ১ জন সেবক একবারেই সঠিক কেনাকাটা করেন।' },
    steps: [
      { en: 'Save your regular recipes with ingredients for a base number of plates.', hi: 'अपनी नियमित रेसिपी एक आधार संख्या की थालियों के हिसाब से सामग्री सहित सहेजें।', bn: 'আপনার নিয়মিত রন্ধনপ্রণালী একটি ভিত্তি সংখ্যক থালার উপকরণসহ সংরক্ষণ করুন।' },
      { en: 'Enter how many plates this meal must serve, and check the calculated ingredients.', hi: 'इस भोजन में कितनी थाली चाहिए, यह डालें और निकली हुई सामग्री जांचें।', bn: 'এই খাবারে কত থালা লাগবে তা দিন এবং হিসাব করা উপকরণ যাচাই করুন।' },
      { en: 'Note stock used and stock left, so the reorder reminder stays honest.', hi: 'कितना स्टॉक उपयोग हुआ और कितना बचा, यह लिखें, ताकि फिर मंगाने की याद सच्ची रहे।', bn: 'কত মজুদ ব্যবহার হলো ও কত বাকি রইল লিখুন, যাতে আবার অর্ডারের স্মরণ সৎ থাকে।' },
      { en: 'After the bhandara, record plates served and any waste.', hi: 'भंडारे के बाद परोसी गई थालियाँ और कोई बर्बादी दर्ज करें।', bn: 'ভাণ্ডারার পর পরিবেশিত থালা ও কোনো অপচয় লিপিবদ্ধ করুন।' }
    ],
    commonMistakes: [
      { en: 'Do not scale a recipe in your head for a big day. Small rounding errors become kilos when the count is in thousands.', hi: 'बड़े दिन के लिए रेसिपी मन में न बढ़ाएं। छोटी गोलाई की भूल हजारों की संख्या में किलो बन जाती है।', bn: 'বড় দিনের জন্য মনে মনে রন্ধনপ্রণালী বাড়াবেন না। ছোট গোলকরণের ভুল হাজারের সংখ্যায় কিলো হয়ে যায়।' },
      { en: 'Update stock the same day. A reorder reminder based on last month stock arrives too late.', hi: 'स्टॉक उसी दिन अपडेट करें। पिछले महीने के स्टॉक पर आधारित याद बहुत देर से आती है।', bn: 'মজুদ সেদিনই হালনাগাদ করুন। গত মাসের মজুদের ওপর ভিত্তি করা স্মরণ অনেক দেরিতে আসে।' }
    ],
    capabilities: [
      { en: 'Scale recipes automatically for any plate count', hi: 'किसी भी थाली संख्या के लिए रेसिपी अपने आप बढ़ाएं', bn: 'যেকোনো থালার সংখ্যার জন্য রন্ধনপ্রণালী স্বয়ংক্রিয়ভাবে বাড়ান' },
      { en: 'Plan bhandara ingredients before shopping', hi: 'खरीदारी से पहले भंडारे की सामग्री की योजना बनाएं', bn: 'কেনাকাটার আগে ভাণ্ডারার উপকরণের পরিকল্পনা করুন' },
      { en: 'Track kitchen stock and reorder needs', hi: 'रसोई स्टॉक और फिर मंगाने की जरूरत देखें', bn: 'রান্নাঘরের মজুদ ও পুনরায় অর্ডারের প্রয়োজন দেখুন' }
    ],
    worksOffline: true
  },
  'nyas-one': {
    whatItDoes: { en: 'This desk tracks trust compliance and governance for Trustees, so renewals and filings like 12A, 80G, FCRA and ITR-7 are never missed.', hi: 'यह डेस्क न्यासियों के लिए ट्रस्ट अनुपालन और शासन का ध्यान रखता है, ताकि 12A, 80G, FCRA और ITR-7 जैसे नवीनीकरण और फाइलिंग कभी छूटें नहीं।', bn: 'এই ডেস্কটি ট্রাস্টিদের জন্য ট্রাস্টের অনুবর্তিতা ও শাসন খেয়াল রাখে, যাতে ১২এ, ৮০জি, এফসিআরএ ও আইটিআর-৭-এর মতো নবায়ন ও ফাইলিং কখনো বাদ না পড়ে।' },
    realLifeExample: { en: 'A small trust run by two Trustees with no accountant nearly lost its 80G renewal because the date lived in an old file. With every due date in one desk, the reminder comes early and the renewal is filed calmly.', hi: 'बिना लेखाकार के दो न्यासियों द्वारा चलाया एक छोटा ट्रस्ट अपना 80G नवीनीकरण लगभग खो बैठा, क्योंकि तारीख एक पुरानी फाइल में थी। हर नियत तारीख एक डेस्क में होने से याद जल्दी आती है और नवीनीकरण शांति से दाखिल होता है।', bn: 'হিসাবরক্ষক ছাড়া ২ জন ট্রাস্টি চালিত একটি ছোট ট্রাস্ট প্রায় তার ৮০জি নবায়ন হারাতে বসেছিল, কারণ তারিখটি একটি পুরনো ফাইলে ছিল। প্রতিটি নির্ধারিত তারিখ এক ডেস্কে থাকায় স্মরণ আগেই আসে এবং নবায়ন শান্তভাবে দাখিল হয়।' },
    steps: [
      { en: 'List every registration and approval your trust holds, with its renewal date.', hi: 'आपके ट्रस्ट के पास हर पंजीकरण और अनुमोदन, उसकी नवीनीकरण तारीख सहित, सूचीबद्ध करें।', bn: 'আপনার ট্রাস্টের প্রতিটি নিবন্ধন ও অনুমোদন, তার নবায়নের তারিখসহ, তালিকাভুক্ত করুন।' },
      { en: 'Add each yearly filing, such as ITR-7 and 10BE, as a recurring task.', hi: 'ITR-7 और 10BE जैसी हर वार्षिक फाइलिंग को दोहराए जाने वाले कार्य के रूप में जोड़ें।', bn: 'আইটিআর-৭ ও ১০বিই-এর মতো প্রতিটি বার্ষিক ফাইলিং পুনরাবৃত্ত কাজ হিসেবে যোগ করুন।' },
      { en: 'Check the desk regularly and start each filing well before its due date.', hi: 'डेस्क नियमित जांचें और हर फाइलिंग नियत तारीख से काफी पहले शुरू करें।', bn: 'ডেস্কটি নিয়মিত দেখুন এবং প্রতিটি ফাইলিং নির্ধারিত তারিখের অনেক আগে শুরু করুন।' },
      { en: 'Mark a filing done only after it is truly submitted, and keep the proof noted.', hi: 'फाइलिंग को तभी पूर्ण चिह्नित करें जब वह सच में जमा हो जाए, और प्रमाण लिखकर रखें।', bn: 'ফাইলিং সত্যিই জমা হওয়ার পরই তা সম্পন্ন চিহ্নিত করুন, এবং প্রমাণ লিখে রাখুন।' }
    ],
    commonMistakes: [
      { en: 'Do not rely on one person remembering due dates. Memory retires, moves and forgets; the desk does not.', hi: 'नियत तारीखों के लिए एक व्यक्ति की याद पर निर्भर न रहें। याद सेवानिवृत्त होती है, बदलती है और भूलती है; डेस्क नहीं।', bn: 'নির্ধারিত তারিখের জন্য একজনের স্মৃতির ওপর নির্ভর করবেন না। স্মৃতি অবসর নেয়, বদলায় ও ভোলে; ডেস্ক ভোলে না।' },
      { en: 'Watch the 85 percent rule through the year, not at audit time. Late discovery leaves no honest way to correct course.', hi: '85 प्रतिशत नियम पूरे वर्ष देखें, ऑडिट के समय नहीं। देर से पता चलने पर रास्ता सुधारने का ईमानदार तरीका नहीं बचता।', bn: '৮৫ শতাংশ নিয়মটি সারা বছর দেখুন, নিরীক্ষার সময় নয়। দেরিতে জানলে পথ সংশোধনের সৎ উপায় থাকে না।' },
      { en: 'Keep filing proofs together with the entry. A done mark without proof helps no one during an enquiry.', hi: 'फाइलिंग के प्रमाण प्रविष्टि के साथ रखें। बिना प्रमाण का पूर्ण चिह्न जांच के समय किसी काम का नहीं।', bn: 'ফাইলিংয়ের প্রমাণ এন্ট্রির সঙ্গে রাখুন। প্রমাণ ছাড়া সম্পন্ন চিহ্ন তদন্তের সময় কারো কাজে আসে না।' }
    ],
    capabilities: [
      { en: 'Track 12A, 80G and FCRA renewals', hi: '12A, 80G और FCRA नवीनीकरण का ध्यान रखें', bn: '১২এ, ৮০জি ও এফসিআরএ নবায়নের খেয়াল রাখুন' },
      { en: 'Follow ITR-7, 10BE and other filings', hi: 'ITR-7, 10BE और अन्य फाइलिंग देखें', bn: 'আইটিআর-৭, ১০বিই ও অন্যান্য ফাইলিং দেখুন' },
      { en: 'Keep an eye on the 85 percent rule', hi: '85 प्रतिशत नियम पर नजर रखें', bn: '৮৫ শতাংশ নিয়মের দিকে নজর রাখুন' }
    ],
    worksOffline: true
  },
  'utsav-one': {
    realLifeExample: { en: 'For a three day mahotsav, a small samiti with no paid staff keeps its budget, vendor list and program in this one desk. On the morning of the main day, the head sevak sees what is pending instead of asking five people on the phone.', hi: 'तीन दिन के महोत्सव के लिए, बिना वेतनभोगी कर्मी वाली छोटी समिति अपना बजट, विक्रेता सूची और कार्यक्रम इसी एक डेस्क में रखती है। मुख्य दिन की सुबह, मुख्य सेवक पाँच लोगों को फोन किए बिना देख लेता है कि क्या बाकी है।', bn: '৩ দিনের মহোৎসবের জন্য, বেতনভুক্ত কর্মী ছাড়া একটি ছোট সমিতি তার বাজেট, বিক্রেতার তালিকা ও অনুষ্ঠান এই এক ডেস্কেই রাখে। মূল দিনের সকালে, প্রধান সেবক ৫ জনকে ফোন না করেই দেখে নেন কী বাকি আছে।' },
    commonMistakes: [
      { en: 'Do not plan the festival only in a chat thread. Decisions buried in messages are lost exactly when the crowd arrives.', hi: 'त्योहार की योजना केवल चैट थ्रेड में न बनाएं। संदेशों में दबे निर्णय ठीक उसी समय खो जाते हैं जब भीड़ आती है।', bn: 'উৎসবের পরিকল্পনা শুধু চ্যাট থ্রেডে করবেন না। বার্তায় চাপা পড়া সিদ্ধান্ত ঠিক ভিড় আসার সময়েই হারিয়ে যায়।' },
      { en: 'Note crowd safety and vendor payments before the event, not during it. The day itself leaves no quiet minute for paperwork.', hi: 'भीड़ सुरक्षा और विक्रेता भुगतान कार्यक्रम से पहले लिखें, उसके दौरान नहीं। उस दिन कागजी काम के लिए एक शांत मिनट भी नहीं मिलता।', bn: 'ভিড়ের নিরাপত্তা ও বিক্রেতার পেমেন্ট অনুষ্ঠানের আগে লিখুন, চলাকালীন নয়। সেদিন কাগজের কাজের জন্য এক মিনিটও শান্ত সময় মেলে না।' }
    ],
    capabilities: [
      { en: 'Plan the full mahotsav from one desk', hi: 'पूरा महोत्सव एक डेस्क से योजनाबद्ध करें', bn: 'পুরো মহোৎসব এক ডেস্ক থেকে পরিকল্পনা করুন' },
      { en: 'Track budget, committees and vendors', hi: 'बजट, समितियाँ और विक्रेता देखें', bn: 'বাজেট, কমিটি ও বিক্রেতাদের দেখুন' },
      { en: 'Hold the program and crowd safety plan together', hi: 'कार्यक्रम और भीड़ सुरक्षा योजना एक साथ रखें', bn: 'অনুষ্ঠান ও ভিড় নিরাপত্তা পরিকল্পনা একসঙ্গে রাখুন' }
    ],
    worksOffline: true
  },
  'tirth-one': {
    whatItDoes: { en: 'This desk manages darshan queues with time slots and tokens, a live queue board and seva passes, so devotees wait with dignity instead of in paper token chaos.', hi: 'यह डेस्क समय स्लॉट और टोकन के साथ दर्शन कतार, लाइव कतार बोर्ड और सेवा पास का प्रबंधन करता है, ताकि भक्त कागजी टोकन की अव्यवस्था के बजाय गरिमा से प्रतीक्षा करें।', bn: 'এই ডেস্কটি সময় স্লট ও টোকেনসহ দর্শনের সারি, লাইভ সারি বোর্ড ও সেবা পাস পরিচালনা করে, যাতে ভক্তরা কাগজের টোকেনের বিশৃঙ্খলার বদলে মর্যাদার সঙ্গে অপেক্ষা করেন।' },
    realLifeExample: { en: 'On a festival morning at a busy tirth, an elderly devotee family takes a slot instead of standing for hours in a pushing line. The sevaks at the gate see the same live queue count, so nobody has to shout or guess.', hi: 'किसी व्यस्त तीर्थ में त्योहार की सुबह, एक बुजुर्ग भक्त परिवार धक्का-मुक्की वाली कतार में घंटों खड़े होने के बजाय एक स्लॉट लेता है। द्वार पर सेवक वही लाइव कतार संख्या देखते हैं, इसलिए किसी को चिल्लाना या अंदाजा नहीं लगाना पड़ता।', bn: 'একটি ব্যস্ত তীর্থে উৎসবের সকালে, এক প্রবীণ ভক্ত পরিবার ঠেলাঠেলির সারিতে ঘণ্টার পর ঘণ্টা দাঁড়ানোর বদলে একটি স্লট নেয়। দরজায় সেবকরা একই লাইভ সারির সংখ্যা দেখেন, তাই কাউকে চিৎকার বা আন্দাজ করতে হয় না।' },
    steps: [
      { en: 'Set the darshan slots for the day, with how many devotees each slot can hold.', hi: 'दिन के दर्शन स्लॉट तय करें, हर स्लॉट में कितने भक्त आ सकते हैं, इसके साथ।', bn: 'দিনের দর্শন স্লট ঠিক করুন, প্রতিটি স্লটে কতজন ভক্ত আসতে পারবেন তা সহ।' },
      { en: 'Give each arriving devotee or family a token for a slot.', hi: 'आने वाले हर भक्त या परिवार को एक स्लॉट का टोकन दें।', bn: 'আসা প্রতিটি ভক্ত বা পরিবারকে একটি স্লটের টোকেন দিন।' },
      { en: 'Follow the live queue board and call slots forward in order.', hi: 'लाइव कतार बोर्ड देखें और स्लॉट को क्रम से आगे बुलाएं।', bn: 'লাইভ সারি বোর্ড দেখুন এবং স্লটগুলোকে ক্রমানুসারে এগিয়ে ডাকুন।' },
      { en: 'At close, check the crowd count against the day plan.', hi: 'समापन पर भीड़ की संख्या की दिन की योजना से जांच करें।', bn: 'শেষে ভিড়ের সংখ্যা দিনের পরিকল্পনার সঙ্গে মিলিয়ে দেখুন।' }
    ],
    commonMistakes: [
      { en: 'Do not overfill a slot to please someone in the moment. An overfull slot breaks the wait for every family after it.', hi: 'क्षण भर किसी को खुश करने के लिए स्लॉट अधिक न भरें। भरा हुआ स्लॉट उसके बाद के हर परिवार की प्रतीक्षा बिगाड़ देता है।', bn: 'ক্ষণিকের জন্য কাউকে খুশি করতে স্লট অতিরিক্ত ভরবেন না। অতিরিক্ত ভরা স্লট তার পরের প্রতিটি পরিবারের অপেক্ষা নষ্ট করে।' },
      { en: 'Keep elderly and ailing devotees in mind while setting slots. A fair queue is part of the seva, not separate from it.', hi: 'स्लॉट तय करते समय बुजुर्ग और अस्वस्थ भक्तों का ध्यान रखें। न्यायपूर्ण कतार सेवा का हिस्सा है, उससे अलग नहीं।', bn: 'স্লট ঠিক করার সময় প্রবীণ ও অসুস্থ ভক্তদের কথা মনে রাখুন। ন্যায্য সারি সেবারই অংশ, তার থেকে আলাদা নয়।' }
    ],
    capabilities: [
      { en: 'Set darshan slots and issue tokens', hi: 'दर्शन स्लॉट तय करें और टोकन दें', bn: 'দর্শন স্লট ঠিক করুন ও টোকেন দিন' },
      { en: 'Follow a live queue board', hi: 'लाइव कतार बोर्ड देखें', bn: 'লাইভ সারি বোর্ড দেখুন' },
      { en: 'Manage seva passes and crowd counts', hi: 'सेवा पास और भीड़ संख्या का प्रबंधन करें', bn: 'সেবা পাস ও ভিড়ের সংখ্যা পরিচালনা করুন' }
    ],
    worksOffline: true
  },
  'yoga-one': {
    whatItDoes: { en: 'This desk runs the whole yoga shala from one place, with batches, students, attendance, fees and the class diary kept together.', hi: 'यह डेस्क पूरी योग शाला एक जगह से चलाता है, बैच, छात्र, उपस्थिति, शुल्क और कक्षा डायरी एक साथ रखकर।', bn: 'এই ডেস্কটি পুরো যোগ শালা এক জায়গা থেকে চালায়, ব্যাচ, শিক্ষার্থী, উপস্থিতি, ফি ও ক্লাস ডায়েরি একসঙ্গে রেখে।' },
    realLifeExample: { en: 'A morning shala with two batches and one teacher used to mark attendance in a notebook that kept getting lost. Here the teacher marks the batch in a minute before class, and fee reminders stop being awkward personal requests.', hi: 'दो बैच और एक शिक्षक वाली सुबह की शाला पहले एक कॉपी में उपस्थिति लगाती थी जो खोती रहती थी। यहाँ शिक्षक कक्षा से पहले एक मिनट में बैच की उपस्थिति लगा देता है, और शुल्क की याद व्यक्तिगत अनुरोध जैसी अटपटी नहीं रहती।', bn: '২টি ব্যাচ ও ১ জন শিক্ষকের একটি সকালের শালা আগে একটি খাতায় উপস্থিতি দিত, যা বারবার হারিয়ে যেত। এখানে শিক্ষক ক্লাসের আগে ১ মিনিটে ব্যাচের উপস্থিতি দিয়ে দেন, আর ফির স্মরণ ব্যক্তিগত অনুরোধের মতো অস্বস্তিকর থাকে না।' },
    steps: [
      { en: 'Create each batch with its days, time and teacher.', hi: 'हर बैच उसके दिन, समय और शिक्षक के साथ बनाएं।', bn: 'প্রতিটি ব্যাচ তার দিন, সময় ও শিক্ষকসহ তৈরি করুন।' },
      { en: 'Add students to their batch when they join the shala.', hi: 'छात्र शाला से जुड़ें तो उन्हें उनके बैच में जोड़ें।', bn: 'শিক্ষার্থী শালায় যোগ দিলে তাঁকে তাঁর ব্যাচে যোগ করুন।' },
      { en: 'Mark attendance at each class and note the class in the diary.', hi: 'हर कक्षा में उपस्थिति लगाएं और डायरी में कक्षा का नोट लिखें।', bn: 'প্রতিটি ক্লাসে উপস্থিতি দিন এবং ডায়েরিতে ক্লাসের নোট লিখুন।' },
      { en: 'Record fees as they are paid, batch by batch.', hi: 'शुल्क जैसे-जैसे मिले, बैच अनुसार दर्ज करें।', bn: 'ফি যেমন যেমন পাওয়া যায়, ব্যাচ অনুযায়ী লিখুন।' }
    ],
    commonMistakes: [
      { en: 'Do not mark attendance from memory in the evening. A minute at class time is accurate; an evening guess is not.', hi: 'शाम को याद से उपस्थिति न लगाएं। कक्षा के समय का एक मिनट सटीक है; शाम का अंदाजा नहीं।', bn: 'সন্ধ্যায় মনে করে উপস্থিতি দেবেন না। ক্লাসের সময়ের ১ মিনিট সঠিক; সন্ধ্যার আন্দাজ নয়।' },
      { en: 'Keep the class diary brief and regular. Two honest lines after each class teach more than a page written once a month.', hi: 'कक्षा डायरी छोटी और नियमित रखें। हर कक्षा के बाद दो ईमानदार पंक्तियाँ, महीने में एक बार लिखे पृष्ठ से अधिक सिखाती हैं।', bn: 'ক্লাস ডায়েরি ছোট ও নিয়মিত রাখুন। প্রতিটি ক্লাসের পর ২টি সৎ লাইন, মাসে একবার লেখা এক পৃষ্ঠার চেয়ে বেশি শেখায়।' }
    ],
    capabilities: [
      { en: 'Run batches with days, times and teachers', hi: 'दिन, समय और शिक्षकों के साथ बैच चलाएं', bn: 'দিন, সময় ও শিক্ষকসহ ব্যাচ চালান' },
      { en: 'Keep student lists and attendance', hi: 'छात्र सूची और उपस्थिति रखें', bn: 'শিক্ষার্থীর তালিকা ও উপস্থিতি রাখুন' },
      { en: 'Track fees and keep a class diary', hi: 'शुल्क देखें और कक्षा डायरी रखें', bn: 'ফি দেখুন ও ক্লাস ডায়েরি রাখুন' }
    ],
    worksOffline: true
  },
  'matha-one': {
    realLifeExample: { en: 'In a small matha where the senior sannyasi travels often, the dinacharya and the sannyasi registry stay in this desk for whoever is present. A young brahmachari joining the matha is added once, with his diksha and parampara noted with care.', hi: 'एक छोटे मठ में जहाँ वरिष्ठ संन्यासी अक्सर यात्रा पर रहते हैं, दिनचर्या और संन्यासी पंजी इस डेस्क में रहती है, जो भी उपस्थित हो उसके लिए। मठ से जुड़ने वाला युवा ब्रह्मचारी एक बार जोड़ा जाता है, उसकी दीक्षा और परंपरा सावधानी से लिखी जाती है।', bn: 'একটি ছোট মঠে যেখানে প্রবীণ সন্ন্যাসী প্রায়ই ভ্রমণে থাকেন, দিনচর্যা ও সন্ন্যাসী নিবন্ধন এই ডেস্কে থাকে, যিনিই উপস্থিত থাকুন তাঁর জন্য। মঠে যোগ দেওয়া এক তরুণ ব্রহ্মচারীকে একবার যোগ করা হয়, তাঁর দীক্ষা ও পরম্পরা যত্নে লেখা হয়।' },
    commonMistakes: [
      { en: 'Write parampara and diksha details slowly and check them twice. A lineage record corrected later never carries the same trust.', hi: 'परंपरा और दीक्षा का विवरण धीरे लिखें और दो बार जांचें। बाद में सुधारा वंश रिकॉर्ड वही विश्वास नहीं रखता।', bn: 'পরম্পরা ও দীক্ষার বিবরণ ধীরে লিখুন এবং দুবার যাচাই করুন। পরে সংশোধন করা বংশধারার রেকর্ড সেই একই বিশ্বাস বহন করে না।' },
      { en: 'Keep the dinacharya realistic for the matha as it is today. A schedule nobody follows helps neither sadhana nor guests.', hi: 'दिनचर्या मठ की आज की स्थिति के अनुसार व्यावहारिक रखें। जो समय-सारणी कोई नहीं मानता, वह न साधना में मदद करती है न अतिथियों में।', bn: 'দিনচর্যা মঠের আজকের অবস্থা অনুযায়ী বাস্তবসম্মত রাখুন। যে সময়সূচি কেউ মানে না, তা সাধনা বা অতিথি কারোরই কাজে আসে না।' }
    ],
    capabilities: [
      { en: 'Keep the sannyasi registry of the matha', hi: 'मठ की संन्यासी पंजी रखें', bn: 'মঠের সন্ন্যাসী নিবন্ধন রাখুন' },
      { en: 'Record parampara lineage and diksha details', hi: 'परंपरा वंश और दीक्षा विवरण दर्ज करें', bn: 'পরম্পরা বংশধারা ও দীক্ষার বিবরণ লিখুন' },
      { en: 'Hold the dinacharya and gurukul notes together', hi: 'दिनचर्या और गुरुकुल नोट एक साथ रखें', bn: 'দিনচর্যা ও গুরুকুল নোট একসঙ্গে রাখুন' }
    ],
    worksOffline: true
  },
  'satsang-one': {
    whatItDoes: { en: 'This desk runs a satsang mandali without message chaos, keeping members, gatherings, the bhajan list, prasad rotation and the mandali fund in one place.', hi: 'यह डेस्क संदेशों की अव्यवस्था के बिना सत्संग मंडली चलाता है, सदस्य, सभाएँ, भजन सूची, प्रसाद क्रम और मंडली कोष एक जगह रखकर।', bn: 'এই ডেস্কটি বার্তার বিশৃঙ্খলা ছাড়া সৎসঙ্গ মণ্ডলী চালায়, সদস্য, সমাবেশ, ভজন তালিকা, প্রসাদ পালা ও মণ্ডলীর তহবিল এক জায়গায় রেখে।' },
    realLifeExample: { en: 'A neighbourhood satsang of 30 families meets every Tuesday in a different home, and the prasad duty kept falling on the same two families. With the rotation here, every family takes its turn gladly, and the bhajan list is ready before anyone arrives.', hi: '30 परिवारों का मोहल्ला सत्संग हर मंगलवार अलग घर में मिलता है, और प्रसाद का दायित्व उन्हीं दो परिवारों पर पड़ता रहता था। यहाँ क्रम होने से हर परिवार खुशी से अपनी बारी लेता है, और भजन सूची किसी के आने से पहले तैयार रहती है।', bn: '৩০টি পরিবারের একটি পাড়ার সৎসঙ্গ প্রতি মঙ্গলবার আলাদা বাড়িতে মিলিত হয়, আর প্রসাদের দায়িত্ব একই ২টি পরিবারের ওপরই পড়ত। এখানে পালা থাকায় প্রতিটি পরিবার আনন্দে নিজের পালা নেয়, আর ভজন তালিকা কেউ আসার আগেই প্রস্তুত থাকে।' },
    steps: [
      { en: 'Add the mandali members and the regular gathering day and place.', hi: 'मंडली के सदस्य और नियमित सभा का दिन व स्थान जोड़ें।', bn: 'মণ্ডলীর সদস্য এবং নিয়মিত সমাবেশের দিন ও স্থান যোগ করুন।' },
      { en: 'Prepare the bhajan list for the next gathering in advance.', hi: 'अगली सभा की भजन सूची पहले से तैयार करें।', bn: 'পরের সমাবেশের ভজন তালিকা আগে থেকে প্রস্তুত করুন।' },
      { en: 'Set the prasad rotation so the duty moves fairly from family to family.', hi: 'प्रसाद क्रम तय करें, ताकि दायित्व परिवार से परिवार न्यायपूर्वक घूमे।', bn: 'প্রসাদ পালা ঠিক করুন, যাতে দায়িত্ব পরিবার থেকে পরিবারে ন্যায্যভাবে ঘোরে।' },
      { en: 'Note mandali fund collections and spending as they happen.', hi: 'मंडली कोष का संग्रह और खर्च जैसे-जैसे हो, लिखें।', bn: 'মণ্ডলী তহবিলের সংগ্রহ ও খরচ যেমন যেমন হয় লিখুন।' }
    ],
    commonMistakes: [
      { en: 'Do not let the same willing families carry prasad every week. A fair rotation keeps goodwill alive for years.', hi: 'उन्हीं इच्छुक परिवारों को हर सप्ताह प्रसाद न उठाने दें। न्यायपूर्ण क्रम वर्षों तक सद्भाव बनाए रखता है।', bn: 'একই ইচ্ছুক পরিবারগুলোকে প্রতি সপ্তাহে প্রসাদ বইতে দেবেন না। ন্যায্য পালা বছরের পর বছর সদ্ভাব বাঁচিয়ে রাখে।' },
      { en: 'Write fund notes the same day, however small the amount. Small sums forgotten become big questions later.', hi: 'कोष के नोट उसी दिन लिखें, राशि कितनी भी छोटी हो। भूली हुई छोटी राशि बाद में बड़ा प्रश्न बन जाती है।', bn: 'তহবিলের নোট সেদিনই লিখুন, পরিমাণ যত ছোটই হোক। ভুলে যাওয়া ছোট অঙ্ক পরে বড় প্রশ্ন হয়ে দাঁড়ায়।' }
    ],
    capabilities: [
      { en: 'Keep mandali members and gatherings together', hi: 'मंडली सदस्य और सभाएँ एक साथ रखें', bn: 'মণ্ডলীর সদস্য ও সমাবেশ একসঙ্গে রাখুন' },
      { en: 'Prepare bhajan lists in advance', hi: 'भजन सूची पहले से तैयार करें', bn: 'ভজন তালিকা আগে থেকে প্রস্তুত করুন' },
      { en: 'Rotate prasad duty and track the fund', hi: 'प्रसाद दायित्व घुमाएं और कोष देखें', bn: 'প্রসাদের দায়িত্ব ঘোরান ও তহবিল দেখুন' }
    ],
    worksOffline: true
  },
  'sabha-one': {
    whatItDoes: { en: 'This desk helps a purohit sabha run in an orderly way, with a member directory, dues, a welfare fund, training and festival duty rosters.', hi: 'यह डेस्क पुरोहित सभा को व्यवस्थित ढंग से चलाने में मदद करता है, सदस्य निर्देशिका, देय राशि, कल्याण कोष, प्रशिक्षण और त्योहार ड्यूटी सूची के साथ।', bn: 'এই ডেস্কটি পুরোহিত সভাকে সুশৃঙ্খলভাবে চলতে সাহায্য করে, সদস্য নির্দেশিকা, বকেয়া, কল্যাণ তহবিল, প্রশিক্ষণ ও উৎসবের দায়িত্ব তালিকাসহ।' },
    realLifeExample: { en: 'During the festival season, a sabha of 25 purohits must cover pujas in many homes without double booking anyone. The duty roster here shows who is free, and the welfare fund note shows what help is available when an elderly purohit falls ill.', hi: 'त्योहार के मौसम में, 25 पुरोहितों की सभा को कई घरों में पूजा संभालनी होती है, बिना किसी की दोहरी बुकिंग के। यहाँ की ड्यूटी सूची दिखाती है कौन मुक्त है, और कल्याण कोष का नोट दिखाता है कि बुजुर्ग पुरोहित के बीमार पड़ने पर क्या सहायता उपलब्ध है।', bn: 'উৎসবের মরসুমে, ২৫ জন পুরোহিতের একটি সভাকে অনেক বাড়িতে পূজা সামলাতে হয়, কারো দ্বৈত বুকিং ছাড়াই। এখানকার দায়িত্ব তালিকা দেখায় কে মুক্ত আছেন, আর কল্যাণ তহবিলের নোট দেখায় কোনো প্রবীণ পুরোহিত অসুস্থ হলে কী সাহায্য পাওয়া যাবে।' },
    steps: [
      { en: 'Add every sabha member to the directory with contact and area served.', hi: 'हर सभा सदस्य को संपर्क और सेवा क्षेत्र सहित निर्देशिका में जोड़ें।', bn: 'প্রতিটি সভা সদস্যকে যোগাযোগ ও সেবার এলাকাসহ নির্দেশিকায় যোগ করুন।' },
      { en: 'Record dues as members pay them, and keep the welfare fund separate and clear.', hi: 'सदस्य देय राशि दें तो दर्ज करें, और कल्याण कोष अलग व स्पष्ट रखें।', bn: 'সদস্যরা বকেয়া দিলে তা লিখুন, এবং কল্যাণ তহবিল আলাদা ও পরিষ্কার রাখুন।' },
      { en: 'Before a festival, build the duty roster so every purohit knows his place and day.', hi: 'त्योहार से पहले ड्यूटी सूची बनाएं, ताकि हर पुरोहित को अपना स्थान और दिन पता हो।', bn: 'উৎসবের আগে দায়িত্ব তালিকা তৈরি করুন, যাতে প্রতিটি পুরোহিত নিজের স্থান ও দিন জানেন।' },
      { en: 'Note training sessions and who attended, for the growth of younger purohits.', hi: 'प्रशिक्षण सत्र और कौन उपस्थित था, यह लिखें, युवा पुरोहितों की उन्नति के लिए।', bn: 'প্রশিক্ষণ অধিবেশন ও কে উপস্থিত ছিলেন লিখুন, তরুণ পুরোহিতদের উন্নতির জন্য।' }
    ],
    commonMistakes: [
      { en: 'Do not mix welfare fund money with ordinary dues in one unclear note. Families of purohits trust the sabha because the fund is clean.', hi: 'कल्याण कोष के धन को साधारण देय राशि के साथ एक अस्पष्ट नोट में न मिलाएं। पुरोहितों के परिवार सभा पर इसलिए भरोसा करते हैं क्योंकि कोष स्वच्छ है।', bn: 'কল্যাণ তহবিলের অর্থ সাধারণ বকেয়ার সঙ্গে একটি অস্পষ্ট নোটে মেশাবেন না। পুরোহিতদের পরিবার সভাকে বিশ্বাস করে, কারণ তহবিল পরিষ্কার।' },
      { en: 'Make the festival roster early. A roster made in panic always overloads the most willing purohit.', hi: 'त्योहार सूची जल्दी बनाएं। घबराहट में बनी सूची हमेशा सबसे इच्छुक पुरोहित पर ही बोझ डालती है।', bn: 'উৎসবের তালিকা আগেই তৈরি করুন। আতঙ্কে তৈরি তালিকা সবসময় সবচেয়ে ইচ্ছুক পুরোহিতের ওপরই বোঝা চাপায়।' }
    ],
    capabilities: [
      { en: 'Keep a clear purohit member directory', hi: 'स्पष्ट पुरोहित सदस्य निर्देशिका रखें', bn: 'পরিষ্কার পুরোহিত সদস্য নির্দেশিকা রাখুন' },
      { en: 'Track dues and the welfare fund separately', hi: 'देय राशि और कल्याण कोष अलग-अलग देखें', bn: 'বকেয়া ও কল্যাণ তহবিল আলাদাভাবে দেখুন' },
      { en: 'Plan training and festival duty rosters', hi: 'प्रशिक्षण और त्योहार ड्यूटी सूची की योजना बनाएं', bn: 'প্রশিক্ষণ ও উৎসবের দায়িত্ব তালিকার পরিকল্পনা করুন' }
    ],
    worksOffline: true
  },
  'samskara-one': {
    realLifeExample: { en: 'A devotee family keeps the samskaras of three children in this desk, from namkaran to upanayan, each with its date and purohit noted. When shraddha for the grandfather comes near, the gentle reminder gives the family time to prepare with a calm heart.', hi: 'एक भक्त परिवार तीन बच्चों के संस्कार इस डेस्क में रखता है, नामकरण से उपनयन तक, हर एक की तारीख और पुरोहित के साथ। जब दादाजी का श्राद्ध निकट आता है, कोमल याद परिवार को शांत मन से तैयारी का समय देती है।', bn: 'একটি ভক্ত পরিবার ৩ সন্তানের সংস্কার এই ডেস্কে রাখে, নামকরণ থেকে উপনয়ন পর্যন্ত, প্রতিটির তারিখ ও পুরোহিতসহ। দাদুর শ্রাদ্ধ কাছাকাছি এলে, কোমল স্মরণ পরিবারকে শান্ত মনে প্রস্তুতির সময় দেয়।' },
    commonMistakes: [
      { en: 'Add a samskara soon after it happens, while dates and names are fresh. Reconstructing a family chronicle years later is painful and often wrong.', hi: 'संस्कार होने के तुरंत बाद जोड़ें, जब तारीख और नाम ताजा हों। वर्षों बाद पारिवारिक वृत्तांत फिर बनाना कष्टदायक और अक्सर गलत होता है।', bn: 'সংস্কার হওয়ার পরপরই যোগ করুন, যখন তারিখ ও নাম সতেজ থাকে। বছর পরে পারিবারিক বৃত্তান্ত আবার তৈরি করা কষ্টকর ও প্রায়ই ভুল হয়।' },
      { en: 'Check pitra dates and tithi carefully before saving. A shraddha reminder on the wrong day helps no one.', hi: 'सहेजने से पहले पितृ तारीख और तिथि सावधानी से जांचें। गलत दिन का श्राद्ध स्मरण किसी काम का नहीं।', bn: 'সংরক্ষণের আগে পিতৃ তারিখ ও তিথি যত্নে যাচাই করুন। ভুল দিনের শ্রাদ্ধ স্মরণ কারো কাজে আসে না।' }
    ],
    capabilities: [
      { en: 'Keep the 16 samskaras of each family member', hi: 'हर परिवार सदस्य के 16 संस्कार रखें', bn: 'প্রতিটি পরিবার সদস্যের ১৬টি সংস্কার রাখুন' },
      { en: 'Receive gentle reminders before important days', hi: 'महत्वपूर्ण दिनों से पहले कोमल याद पाएं', bn: 'গুরুত্বপূর্ণ দিনের আগে কোমল স্মরণ পান' },
      { en: 'Keep pitra records and shraddha dates together', hi: 'पितृ रिकॉर्ड और श्राद्ध तारीख एक साथ रखें', bn: 'পিতৃ রেকর্ড ও শ্রাদ্ধের তারিখ একসঙ্গে রাখুন' }
    ],
    worksOffline: true
  },
};
