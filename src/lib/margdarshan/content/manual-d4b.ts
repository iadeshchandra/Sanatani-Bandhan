import type { ManualEntry } from '../manualTypes';

export const MANUAL_D4B: Record<string, ManualEntry> = {
  'ashramKutir': {
    whatItDoes: { en: 'This desk manages kutir stays and sadhana retreats at an ashram, keeping bookings and rooms organised so silence and rest are protected.', hi: 'यह डेस्क आश्रम में कुटीर निवास और साधना शिविरों का प्रबंधन करता है, बुकिंग और कमरे व्यवस्थित रखकर, ताकि मौन और विश्राम सुरक्षित रहे।', bn: 'এই ডেস্কটি আশ্রমে কুটির অবস্থান ও সাধনা শিবির পরিচালনা করে, বুকিং ও ঘর সাজিয়ে রেখে, যাতে নীরবতা ও বিশ্রাম সুরক্ষিত থাকে।' },
    realLifeExample: { en: 'A small ashram with six kutirs hosts a family that comes every winter for a week of quiet sadhana. Their usual kutir is booked in advance here, and the sevak knows their arrival day without searching old messages.', hi: 'छह कुटीरों वाला एक छोटा आश्रम हर सर्दी में एक परिवार की मेजबानी करता है जो एक सप्ताह की शांत साधना के लिए आता है। उनका नियमित कुटीर यहाँ पहले से बुक रहता है, और सेवक पुराने संदेश खोजे बिना उनके आने का दिन जानता है।', bn: '৬টি কুটিরের একটি ছোট আশ্রম প্রতি শীতে একটি পরিবারকে আতিথ্য দেয়, যারা এক সপ্তাহের শান্ত সাধনার জন্য আসে। তাদের নিয়মিত কুটির এখানে আগে থেকে বুক করা থাকে, আর সেবক পুরনো বার্তা না খুঁজেই তাদের আসার দিন জানেন।' },
    steps: [
      { en: 'List each kutir or room the ashram can offer for stays.', hi: 'आश्रम निवास के लिए जो कुटीर या कमरा दे सकता है, हर एक सूचीबद्ध करें।', bn: 'আশ্রম অবস্থানের জন্য যে কুটির বা ঘর দিতে পারে, প্রতিটি তালিকাভুক্ত করুন।' },
      { en: 'Add a booking with the guest, dates and purpose of the stay.', hi: 'अतिथि, तारीख और निवास के उद्देश्य सहित बुकिंग जोड़ें।', bn: 'অতিথি, তারিখ ও অবস্থানের উদ্দেশ্যসহ বুকিং যোগ করুন।' },
      { en: 'Mark arrival and departure as they happen, so the room state stays true.', hi: 'आगमन और प्रस्थान जैसे-जैसे हो, चिह्नित करें, ताकि कमरे की स्थिति सच्ची रहे।', bn: 'আগমন ও প্রস্থান যেমন যেমন হয় চিহ্নিত করুন, যাতে ঘরের অবস্থা সঠিক থাকে।' },
      { en: 'For a retreat, note the group size and dates well before they arrive.', hi: 'शिविर के लिए समूह का आकार और तारीख उनके आने से काफी पहले लिखें।', bn: 'শিবিরের জন্য দলের আকার ও তারিখ তাদের আসার অনেক আগে লিখুন।' }
    ],
    commonMistakes: [
      { en: 'Do not promise a kutir from memory during a busy season. One double promise breaks the quiet trust an ashram lives by.', hi: 'व्यस्त मौसम में याद से कुटीर का वादा न करें। एक दोहरा वादा उस शांत विश्वास को तोड़ता है जिस पर आश्रम जीता है।', bn: 'ব্যস্ত মরসুমে মনে করে কুটিরের প্রতিশ্রুতি দেবেন না। একটি দ্বৈত প্রতিশ্রুতি সেই শান্ত বিশ্বাস ভাঙে, যার ওপর আশ্রম বেঁচে থাকে।' },
      { en: 'Note special needs, like a ground floor room for an elderly guest, at booking time and not at arrival.', hi: 'विशेष जरूरतें, जैसे बुजुर्ग अतिथि के लिए भूतल का कमरा, बुकिंग के समय लिखें, आगमन पर नहीं।', bn: 'বিশেষ প্রয়োজন, যেমন প্রবীণ অতিথির জন্য নিচতলার ঘর, বুকিংয়ের সময় লিখুন, আগমনের সময় নয়।' }
    ],
    capabilities: [
      { en: 'Manage kutir and room bookings', hi: 'कुटीर और कमरों की बुकिंग का प्रबंधन करें', bn: 'কুটির ও ঘরের বুকিং পরিচালনা করুন' },
      { en: 'Plan sadhana retreat stays in advance', hi: 'साधना शिविर निवास की पहले से योजना बनाएं', bn: 'সাধনা শিবিরের অবস্থান আগে থেকে পরিকল্পনা করুন' },
      { en: 'Track arrivals and departures clearly', hi: 'आगमन और प्रस्थान स्पष्ट देखें', bn: 'আগমন ও প্রস্থান পরিষ্কারভাবে দেখুন' }
    ],
    worksOffline: true
  },
  'dharamshala': {
    whatItDoes: { en: 'This desk manages rooms at a dharamshala or yatri bhavan, so every travelling devotee gets a simple, honest stay without double booking.', hi: 'यह डेस्क धर्मशाला या यात्री भवन के कमरों का प्रबंधन करता है, ताकि हर यात्री भक्त को बिना दोहरी बुकिंग के सरल, ईमानदार निवास मिले।', bn: 'এই ডেস্কটি ধর্মশালা বা যাত্রী ভবনের ঘর পরিচালনা করে, যাতে প্রতিটি ভ্রমণকারী ভক্ত দ্বৈত বুকিং ছাড়া সহজ, সৎ অবস্থান পান।' },
    realLifeExample: { en: 'A family of yatris arrives late at night after a long bus journey, tired and carrying an elderly mother. Because their room was booked here in the morning, the sevak at the desk hands over the key in a minute and they rest.', hi: 'लंबी बस यात्रा के बाद यात्रियों का एक परिवार देर रात थका हुआ और बुजुर्ग माँ के साथ पहुँचता है। क्योंकि उनका कमरा सुबह यहाँ बुक हुआ था, डेस्क पर सेवक एक मिनट में चाबी दे देता है और वे विश्राम करते हैं।', bn: 'দীর্ঘ বাস যাত্রার পর যাত্রীদের একটি পরিবার গভীর রাতে ক্লান্ত হয়ে, প্রবীণ মাকে সঙ্গে নিয়ে পৌঁছায়। কারণ তাদের ঘর সকালে এখানে বুক করা ছিল, ডেস্কের সেবক ১ মিনিটে চাবি দিয়ে দেন এবং তারা বিশ্রাম নেয়।' },
    steps: [
      { en: 'List all rooms with how many guests each can hold.', hi: 'सभी कमरे सूचीबद्ध करें, हर एक में कितने अतिथि रह सकते हैं, इसके साथ।', bn: 'সব ঘর তালিকাভুক্ত করুন, প্রতিটিতে কতজন অতিথি থাকতে পারেন তা সহ।' },
      { en: 'Take each booking with name, dates and number of guests.', hi: 'हर बुकिंग नाम, तारीख और अतिथियों की संख्या सहित लें।', bn: 'প্রতিটি বুকিং নাম, তারিখ ও অতিথির সংখ্যাসহ নিন।' },
      { en: 'Check guests in on arrival and out on departure, the same day.', hi: 'आगमन पर अतिथियों को चेक-इन और प्रस्थान पर चेक-आउट उसी दिन करें।', bn: 'আগমনে অতিথিদের চেক-ইন ও প্রস্থানে চেক-আউট সেদিনই করুন।' },
      { en: 'Before a festival, review bookings so no room is promised twice.', hi: 'त्योहार से पहले बुकिंग जांचें, ताकि कोई कमरा दो बार न दिया जाए।', bn: 'উৎসবের আগে বুকিং পর্যালোচনা করুন, যাতে কোনো ঘর দুবার প্রতিশ্রুত না হয়।' }
    ],
    commonMistakes: [
      { en: 'Do not keep bookings only on paper slips at the desk. One lost slip on a festival night means a family with nowhere to sleep.', hi: 'बुकिंग केवल डेस्क पर कागज की पर्चियों पर न रखें। त्योहार की रात एक खोई पर्ची का अर्थ है एक परिवार जिसके पास सोने की जगह नहीं।', bn: 'বুকিং শুধু ডেস্কে কাগজের চিরকুটে রাখবেন না। উৎসবের রাতে একটি হারানো চিরকুট মানে একটি পরিবারের ঘুমানোর জায়গা নেই।' },
      { en: 'Record a checkout promptly. A room shown occupied after the guest has left turns away a yatri who truly needs it.', hi: 'चेक-आउट तुरंत दर्ज करें। अतिथि के जाने के बाद भरा दिखा कमरा उस यात्री को लौटा देता है जिसे सच में उसकी जरूरत है।', bn: 'চেক-আউট দ্রুত লিখুন। অতিথি চলে যাওয়ার পর ভরা দেখানো ঘর সেই যাত্রীকে ফিরিয়ে দেয়, যার সত্যিই তা দরকার।' }
    ],
    capabilities: [
      { en: 'Book yatri rooms without double booking', hi: 'बिना दोहरी बुकिंग के यात्री कमरे बुक करें', bn: 'দ্বৈত বুকিং ছাড়া যাত্রীর ঘর বুক করুন' },
      { en: 'Manage check-in and check-out simply', hi: 'चेक-इन और चेक-आउट सरलता से संभालें', bn: 'চেক-ইন ও চেক-আউট সহজে সামলান' },
      { en: 'See room availability at a glance', hi: 'कमरों की उपलब्धता एक नजर में देखें', bn: 'ঘরের প্রাপ্যতা এক নজরে দেখুন' }
    ],
    worksOffline: true
  },
  'gurukul': {
    whatItDoes: { en: 'This desk keeps the shishya registry of a gurukul and watches over residential life, with attendance, health and daily discipline in one view for teachers and Trustees.', hi: 'यह डेस्क गुरुकुल की शिष्य पंजी रखता है और आवासीय जीवन का ध्यान रखता है, उपस्थिति, स्वास्थ्य और दैनिक अनुशासन शिक्षकों व न्यासियों के लिए एक ही दृश्य में।', bn: 'এই ডেস্কটি গুরুকুলের শিষ্য নিবন্ধন রাখে এবং আবাসিক জীবনের খেয়াল রাখে, উপস্থিতি, স্বাস্থ্য ও দৈনিক শৃঙ্খলা শিক্ষক ও ট্রাস্টিদের জন্য এক দৃশ্যে।' },
    realLifeExample: { en: 'In a gurukul of 40 boys with two acharyas, a parent calls to ask how his son is doing. The acharya opens one record and can speak honestly about attendance, health and conduct, instead of giving a vague assurance.', hi: '40 लड़कों और दो आचार्यों के गुरुकुल में, एक पिता फोन करके पूछता है कि उसका बेटा कैसा है। आचार्य एक रिकॉर्ड खोलकर उपस्थिति, स्वास्थ्य और आचरण के बारे में ईमानदारी से बता सकता है, अस्पष्ट आश्वासन के बजाय।', bn: '৪০ জন ছেলে ও ২ জন আচার্যের একটি গুরুকুলে, এক বাবা ফোন করে জানতে চান তাঁর ছেলে কেমন আছে। আচার্য একটি রেকর্ড খুলে উপস্থিতি, স্বাস্থ্য ও আচরণ সম্পর্কে সততার সঙ্গে বলতে পারেন, অস্পষ্ট আশ্বাসের বদলে।' },
    steps: [
      { en: 'Register each shishya with guardian contact and joining details.', hi: 'हर शिष्य को अभिभावक संपर्क और प्रवेश विवरण सहित पंजीकृत करें।', bn: 'প্রতিটি শিষ্যকে অভিভাবকের যোগাযোগ ও যোগদানের বিবরণসহ নিবন্ধন করুন।' },
      { en: 'Mark attendance daily, morning and evening, as part of the routine.', hi: 'उपस्थिति रोज, सुबह और शाम, दिनचर्या के हिस्से के रूप में लगाएं।', bn: 'উপস্থিতি প্রতিদিন, সকাল ও সন্ধ্যায়, দিনচর্যার অংশ হিসেবে দিন।' },
      { en: 'Note health concerns and visits to the doctor on the day they arise.', hi: 'स्वास्थ्य संबंधी चिंताएँ और चिकित्सक के पास जाना, जिस दिन हों उसी दिन लिखें।', bn: 'স্বাস্থ্য সংক্রান্ত উদ্বেগ ও চিকিৎসকের কাছে যাওয়া, যেদিন ঘটে সেদিনই লিখুন।' },
      { en: 'Review discipline and progress notes with the acharya regularly.', hi: 'अनुशासन और प्रगति नोट आचार्य के साथ नियमित जांचें।', bn: 'শৃঙ্খলা ও অগ্রগতির নোট আচার্যের সঙ্গে নিয়মিত পর্যালোচনা করুন।' }
    ],
    commonMistakes: [
      { en: 'Do not let health notes wait for a weekly catch up. A fever noted today protects the whole gurukul; noted next week it protects no one.', hi: 'स्वास्थ्य नोट को साप्ताहिक पूर्ति तक न रोकें। आज लिखा बुखार पूरे गुरुकुल की रक्षा करता है; अगले सप्ताह लिखा किसी की नहीं।', bn: 'স্বাস্থ্যের নোট সাপ্তাহিক পূরণ পর্যন্ত আটকে রাখবেন না। আজ লেখা জ্বর পুরো গুরুকুলকে রক্ষা করে; পরের সপ্তাহে লেখা কাউকে রক্ষা করে না।' },
      { en: 'Keep guardian phone numbers current. In a health emergency at night, an old number is a closed door.', hi: 'अभिभावकों के फोन नंबर ताजा रखें। रात में स्वास्थ्य आपातकाल में पुराना नंबर एक बंद द्वार है।', bn: 'অভিভাবকদের ফোন নম্বর হালনাগাদ রাখুন। রাতে স্বাস্থ্য জরুরি অবস্থায় পুরনো নম্বর একটি বন্ধ দরজা।' }
    ],
    capabilities: [
      { en: 'Keep a complete shishya registry', hi: 'पूर्ण शिष्य पंजी रखें', bn: 'সম্পূর্ণ শিষ্য নিবন্ধন রাখুন' },
      { en: 'Watch attendance and daily discipline in one view', hi: 'उपस्थिति और दैनिक अनुशासन एक दृश्य में देखें', bn: 'উপস্থিতি ও দৈনিক শৃঙ্খলা এক দৃশ্যে দেখুন' },
      { en: 'Record health notes for every resident student', hi: 'हर आवासीय छात्र के स्वास्थ्य नोट दर्ज करें', bn: 'প্রতিটি আবাসিক শিক্ষার্থীর স্বাস্থ্য নোট লিখুন' }
    ],
    worksOffline: true
  },
  'gurukulAcademy': {
    whatItDoes: { en: 'This desk handles shastric study and grading, with pariksha, marks and progress recorded properly for each student.', hi: 'यह डेस्क शास्त्रीय अध्ययन और मूल्यांकन संभालता है, हर छात्र के लिए परीक्षा, अंक और प्रगति उचित ढंग से दर्ज करके।', bn: 'এই ডেস্কটি শাস্ত্রীয় অধ্যয়ন ও মূল্যায়ন সামলায়, প্রতিটি শিক্ষার্থীর জন্য পরীক্ষা, নম্বর ও অগ্রগতি যথাযথভাবে লিপিবদ্ধ করে।' },
    realLifeExample: { en: 'A student who has memorised many shlokas but struggles with meaning can be seen clearly here: strong in one part, needing help in another. His acharya then teaches to the real need, not to a single total mark.', hi: 'एक छात्र जिसने कई श्लोक कंठस्थ किए हैं पर अर्थ में कठिनाई है, यहाँ स्पष्ट दिखता है: एक भाग में मजबूत, दूसरे में सहायता की जरूरत। तब उसका आचार्य एक कुल अंक के बजाय असली जरूरत के अनुसार पढ़ाता है।', bn: 'একজন শিক্ষার্থী যে অনেক শ্লোক মুখস্থ করেছে কিন্তু অর্থে কষ্ট পায়, এখানে পরিষ্কার দেখা যায়: এক অংশে শক্তিশালী, অন্য অংশে সাহায্য দরকার। তখন তাঁর আচার্য একটি মোট নম্বরের বদলে আসল প্রয়োজন অনুযায়ী পড়ান।' },
    steps: [
      { en: 'Set up the subjects and levels your academy teaches.', hi: 'आपकी अकादमी जो विषय और स्तर पढ़ाती है, वे तय करें।', bn: 'আপনার অ্যাকাডেমি যে বিষয় ও স্তর পড়ায়, সেগুলো ঠিক করুন।' },
      { en: 'Add each pariksha with its date and subject when it is announced.', hi: 'हर परीक्षा घोषित होने पर उसकी तारीख और विषय सहित जोड़ें।', bn: 'প্রতিটি পরীক্ষা ঘোষণা হলে তার তারিখ ও বিষয়সহ যোগ করুন।' },
      { en: 'Enter marks student by student soon after the pariksha.', hi: 'परीक्षा के तुरंत बाद छात्र अनुसार अंक डालें।', bn: 'পরীক্ষার পরপরই শিক্ষার্থী অনুযায়ী নম্বর দিন।' },
      { en: 'Review progress over time, not only the latest result.', hi: 'प्रगति समय के साथ जांचें, केवल नवीनतम परिणाम नहीं।', bn: 'অগ্রগতি সময়ের সঙ্গে পর্যালোচনা করুন, শুধু সর্বশেষ ফল নয়।' }
    ],
    commonMistakes: [
      { en: 'Do not reduce a student to one total. Shastric learning grows unevenly, and part wise marks show where loving help is needed.', hi: 'छात्र को एक कुल अंक में न समेटें। शास्त्रीय शिक्षा असमान रूप से बढ़ती है, और भाग अनुसार अंक दिखाते हैं कि प्रेमपूर्ण सहायता कहाँ चाहिए।', bn: 'শিক্ষার্থীকে একটি মোট নম্বরে সীমিত করবেন না। শাস্ত্রীয় শিক্ষা অসমভাবে বাড়ে, এবং অংশ অনুযায়ী নম্বর দেখায় কোথায় স্নেহময় সাহায্য দরকার।' },
      { en: 'Enter marks promptly and check them once. A wrong mark discovered by a parent first damages trust in the academy.', hi: 'अंक तुरंत डालें और एक बार जांचें। माता-पिता द्वारा पहले खोजा गया गलत अंक अकादमी के विश्वास को हानि पहुँचाता है।', bn: 'নম্বর দ্রুত দিন এবং একবার যাচাই করুন। অভিভাবকের আগে খুঁজে পাওয়া ভুল নম্বর অ্যাকাডেমির বিশ্বাস ক্ষতিগ্রস্ত করে।' }
    ],
    capabilities: [
      { en: 'Plan pariksha and record marks per student', hi: 'परीक्षा की योजना बनाएं और छात्र अनुसार अंक दर्ज करें', bn: 'পরীক্ষার পরিকল্পনা করুন ও শিক্ষার্থী অনুযায়ী নম্বর লিখুন' },
      { en: 'Follow progress in each subject over time', hi: 'समय के साथ हर विषय में प्रगति देखें', bn: 'সময়ের সঙ্গে প্রতিটি বিষয়ে অগ্রগতি দেখুন' },
      { en: 'Keep grading records clean for report time', hi: 'रिपोर्ट समय के लिए मूल्यांकन रिकॉर्ड स्वच्छ रखें', bn: 'রিপোর্টের সময়ের জন্য মূল্যায়ন রেকর্ড পরিষ্কার রাখুন' }
    ],
    worksOffline: true
  },
  'vidyalaya': {
    whatItDoes: { en: 'This desk runs a weekend heritage school, with classes, students and fees managed simply, without piles of paperwork.', hi: 'यह डेस्क सप्ताहांत धरोहर विद्यालय चलाता है, कक्षाएँ, छात्र और शुल्क सरलता से संभालकर, कागजी काम के ढेर के बिना।', bn: 'এই ডেস্কটি সাপ্তাহিক ছুটির ঐতিহ্য বিদ্যালয় চালায়, ক্লাস, শিক্ষার্থী ও ফি সহজে সামলে, কাগজের স্তূপ ছাড়াই।' },
    realLifeExample: { en: 'On Sunday mornings, children from devotee families gather for shloka, story and language classes taught by volunteers. With students and fees here, the one organising mother spends her time welcoming children, not chasing lists.', hi: 'रविवार सुबह, भक्त परिवारों के बच्चे श्लोक, कथा और भाषा की कक्षाओं के लिए स्वयंसेवकों के पास इकट्ठा होते हैं। छात्र और शुल्क यहाँ होने से, आयोजन करने वाली एक माँ अपना समय सूचियों के पीछे भागने के बजाय बच्चों के स्वागत में लगाती है।', bn: 'রবিবার সকালে, ভক্ত পরিবারের শিশুরা স্বেচ্ছাসেবীদের কাছে শ্লোক, গল্প ও ভাষার ক্লাসের জন্য জড়ো হয়। শিক্ষার্থী ও ফি এখানে থাকায়, আয়োজনকারী এক মা তালিকার পেছনে ছোটার বদলে শিশুদের স্বাগত জানাতে সময় দেন।' },
    steps: [
      { en: 'Create the weekend classes with their teacher and time.', hi: 'सप्ताहांत कक्षाएँ उनके शिक्षक और समय सहित बनाएं।', bn: 'সাপ্তাহিক ছুটির ক্লাসগুলো তাদের শিক্ষক ও সময়সহ তৈরি করুন।' },
      { en: 'Enrol each child in the right class when the family registers.', hi: 'परिवार पंजीकरण करे तो हर बच्चे को सही कक्षा में दाखिल करें।', bn: 'পরিবার নিবন্ধন করলে প্রতিটি শিশুকে সঠিক ক্লাসে ভর্তি করুন।' },
      { en: 'Mark attendance quickly at the start of each class day.', hi: 'हर कक्षा दिवस की शुरुआत में उपस्थिति जल्दी लगाएं।', bn: 'প্রতিটি ক্লাসের দিনের শুরুতে দ্রুত উপস্থিতি দিন।' },
      { en: 'Record fees family by family as they are paid.', hi: 'शुल्क परिवार अनुसार जैसे-जैसे मिले, दर्ज करें।', bn: 'ফি পরিবার অনুযায়ী যেমন যেমন পাওয়া যায় লিখুন।' }
    ],
    commonMistakes: [
      { en: 'Do not let enrolment live in scattered messages. A child missed from the list feels missed from the class itself.', hi: 'दाखिले को बिखरे संदेशों में न रहने दें। सूची से छूटा बच्चा खुद को कक्षा से ही छूटा महसूस करता है।', bn: 'ভর্তিকে ছড়ানো বার্তায় থাকতে দেবেন না। তালিকা থেকে বাদ পড়া শিশু নিজেকে ক্লাস থেকেই বাদ পড়া মনে করে।' },
      { en: 'Tell families about fee changes and holidays early. Weekend schools run on goodwill, and goodwill runs on clear notice.', hi: 'परिवारों को शुल्क बदलाव और छुट्टियों की जानकारी जल्दी दें। सप्ताहांत विद्यालय सद्भाव पर चलते हैं, और सद्भाव स्पष्ट सूचना पर चलता है।', bn: 'পরিবারগুলোকে ফি পরিবর্তন ও ছুটির কথা আগেই জানান। সাপ্তাহিক ছুটির বিদ্যালয় সদ্ভাবে চলে, আর সদ্ভাব চলে পরিষ্কার বিজ্ঞপ্তিতে।' }
    ],
    capabilities: [
      { en: 'Run weekend classes with teachers and times', hi: 'शिक्षकों और समय के साथ सप्ताहांत कक्षाएँ चलाएं', bn: 'শিক্ষক ও সময়সহ সাপ্তাহিক ছুটির ক্লাস চালান' },
      { en: 'Enrol students and mark attendance simply', hi: 'छात्रों को दाखिल करें और उपस्थिति सरलता से लगाएं', bn: 'শিক্ষার্থী ভর্তি করুন ও সহজে উপস্থিতি দিন' },
      { en: 'Track fees without paperwork piles', hi: 'कागजी ढेर के बिना शुल्क देखें', bn: 'কাগজের স্তূপ ছাড়া ফি দেখুন' }
    ],
    worksOffline: true
  },
  'pathshala': {
    realLifeExample: { en: 'In a pathshala where one acharya teaches three levels in a single hall, attendance and shloka scores for every class are marked here in minutes. At exam time, the report for each student is ready without a week of paper work.', hi: 'एक पाठशाला में जहाँ एक आचार्य एक ही हॉल में तीन स्तर पढ़ाता है, हर कक्षा की उपस्थिति और श्लोक अंक यहाँ मिनटों में लग जाते हैं। परीक्षा के समय, हर छात्र की रिपोर्ट एक सप्ताह के कागजी काम के बिना तैयार रहती है।', bn: 'একটি পাঠশালায় যেখানে ১ জন আচার্য একই হলে ৩টি স্তর পড়ান, প্রতিটি ক্লাসের উপস্থিতি ও শ্লোকের নম্বর এখানে মিনিটে দেওয়া হয়ে যায়। পরীক্ষার সময়, প্রতিটি শিক্ষার্থীর রিপোর্ট এক সপ্তাহের কাগজের কাজ ছাড়াই প্রস্তুত থাকে।' },
    commonMistakes: [
      { en: 'Keep fees and marks separate in your notes and your talk. A child should never feel his learning is judged by what his family could pay.', hi: 'शुल्क और अंक अपने नोट और अपनी बातचीत में अलग रखें। बच्चे को कभी यह महसूस न हो कि उसकी शिक्षा उसके परिवार के भुगतान से आंकी जाती है।', bn: 'ফি ও নম্বর আপনার নোটে ও কথায় আলাদা রাখুন। কোনো শিশুর মনে হওয়া উচিত নয় যে তার শিক্ষা তার পরিবারের প্রদানের ওপর বিচার করা হয়।' },
      { en: 'Mark attendance and shloka scores on the day itself. Memory blurs quickly when one teacher carries many classes.', hi: 'उपस्थिति और श्लोक अंक उसी दिन लगाएं। जब एक शिक्षक कई कक्षाएँ संभालता है, याद जल्दी धुंधली होती है।', bn: 'উপস্থিতি ও শ্লোকের নম্বর সেদিনই দিন। এক শিক্ষক অনেক ক্লাস সামলালে স্মৃতি দ্রুত ঝাপসা হয়ে যায়।' }
    ],
    capabilities: [
      { en: 'Manage students from Prathama to Acharya levels', hi: 'प्रथमा से आचार्य स्तर तक छात्रों का प्रबंधन करें', bn: 'প্রথমা থেকে আচার্য স্তর পর্যন্ত শিক্ষার্থী পরিচালনা করুন' },
      { en: 'Track attendance, shloka scores and fees', hi: 'उपस्थिति, श्लोक अंक और शुल्क देखें', bn: 'উপস্থিতি, শ্লোকের নম্বর ও ফি দেখুন' },
      { en: 'Handle examinations in the guru shishya spirit', hi: 'गुरु शिष्य भाव से परीक्षाएँ संभालें', bn: 'গুরু শিষ্য ভাবে পরীক্ষা সামলান' }
    ],
    worksOffline: true
  },
  'goshala-one': {
    whatItDoes: { en: 'This is the complete desk for running a goshala, bringing cattle records, milk, fodder, vet care and sponsorships together in one place.', hi: 'यह गोशाला चलाने का पूर्ण डेस्क है, पशु रिकॉर्ड, दूध, चारा, पशु चिकित्सा देखभाल और प्रायोजन एक जगह लाकर।', bn: 'এটি একটি গোশালা চালানোর সম্পূর্ণ ডেস্ক, গবাদি পশুর রেকর্ড, দুধ, খড়, পশু চিকিৎসা যত্ন ও পৃষ্ঠপোষকতা এক জায়গায় এনে।' },
    realLifeExample: { en: 'A goshala with 60 cows, two sevaks and no office runs its whole day from this desk: milk in the morning, fodder stock at noon, a vet visit in the evening. When a sponsor family visits on Sunday, their gomata and her full care record are ready to show.', hi: '60 गायों, दो सेवकों और बिना कार्यालय वाली गोशाला अपना पूरा दिन इस डेस्क से चलाती है: सुबह दूध, दोपहर चारा स्टॉक, शाम पशु चिकित्सक की यात्रा। जब प्रायोजक परिवार रविवार को आता है, उनकी गोमाता और उसका पूरा देखभाल रिकॉर्ड दिखाने के लिए तैयार रहता है।', bn: '৬০টি গরু, ২ জন সেবক ও অফিস ছাড়া একটি গোশালা তার পুরো দিন এই ডেস্ক থেকে চালায়: সকালে দুধ, দুপুরে খড়ের মজুদ, সন্ধ্যায় পশুচিকিৎসকের পরিদর্শন। পৃষ্ঠপোষক পরিবার রবিবার এলে, তাদের গোমাতা ও তার সম্পূর্ণ যত্নের রেকর্ড দেখানোর জন্য প্রস্তুত থাকে।' },
    steps: [
      { en: 'Add every animal in the goshala with its own record.', hi: 'गोशाला के हर पशु को उसके अपने रिकॉर्ड के साथ जोड़ें।', bn: 'গোশালার প্রতিটি প্রাণীকে তার নিজের রেকর্ডসহ যোগ করুন।' },
      { en: 'Note milk yield and fodder use daily for the whole herd.', hi: 'पूरे झुंड के लिए दूध उत्पादन और चारे का उपयोग रोज लिखें।', bn: 'পুরো পালের জন্য দুধ উৎপাদন ও খড়ের ব্যবহার প্রতিদিন লিখুন।' },
      { en: 'Record vet visits, medicines and follow up dates as they are set.', hi: 'पशु चिकित्सक यात्रा, दवाएँ और अगली जांच की तारीख तय होते ही दर्ज करें।', bn: 'পশুচিকিৎসকের পরিদর্শন, ওষুধ ও পরবর্তী পরীক্ষার তারিখ ঠিক হলেই লিখুন।' },
      { en: 'Link each sponsorship to its gomata, so sponsors see honest care.', hi: 'हर प्रायोजन को उसकी गोमाता से जोड़ें, ताकि प्रायोजक ईमानदार देखभाल देखें।', bn: 'প্রতিটি পৃষ্ঠপোষকতাকে তার গোমাতার সঙ্গে যুক্ত করুন, যাতে পৃষ্ঠপোষকরা সৎ যত্ন দেখেন।' }
    ],
    commonMistakes: [
      { en: 'Do not run the goshala from memory because the herd feels familiar. Familiarity hides a sick cow or a falling fodder stock until it is urgent.', hi: 'झुंड परिचित लगता है इसलिए गोशाला याद से न चलाएं। परिचय बीमार गाय या घटते चारे को तब तक छिपाता है जब तक वह जरूरी न हो जाए।', bn: 'পাল পরিচিত লাগে বলে মনে করে গোশালা চালাবেন না। পরিচিতি অসুস্থ গরু বা কমতে থাকা খড়কে জরুরি না হওয়া পর্যন্ত লুকিয়ে রাখে।' },
      { en: 'Keep sponsorship money and fodder purchase notes clear. Devotees give for gomata with trust, and clear records protect that trust.', hi: 'प्रायोजन धन और चारा खरीद के नोट स्पष्ट रखें। भक्त गोमाता के लिए विश्वास से देते हैं, और स्पष्ट रिकॉर्ड उस विश्वास की रक्षा करते हैं।', bn: 'পৃষ্ঠপোষকতার অর্থ ও খড় কেনার নোট পরিষ্কার রাখুন। ভক্তরা গোমাতার জন্য বিশ্বাসে দেন, আর পরিষ্কার রেকর্ড সেই বিশ্বাস রক্ষা করে।' }
    ],
    capabilities: [
      { en: 'Run complete goshala operations in one desk', hi: 'पूरे गोशाला संचालन एक डेस्क में चलाएं', bn: 'সম্পূর্ণ গোশালা পরিচালনা এক ডেস্কে চালান' },
      { en: 'Track cattle, milk, fodder and vet care', hi: 'पशु, दूध, चारा और पशु देखभाल देखें', bn: 'গবাদি পশু, দুধ, খড় ও পশু যত্ন দেখুন' },
      { en: 'Manage gomata sponsorships with care records', hi: 'देखभाल रिकॉर्ड सहित गोमाता प्रायोजन संभालें', bn: 'যত্নের রেকর্ডসহ গোমাতা পৃষ্ঠপোষকতা সামলান' }
    ],
    worksOffline: true
  },
  'ashram-one': {
    whatItDoes: { en: 'This is the complete desk for yatri stays at an ashram, covering rooms, bookings, check in and check out, the guest register and bhandara planning together.', hi: 'यह आश्रम में यात्री निवास का पूर्ण डेस्क है, कमरे, बुकिंग, चेक-इन व चेक-आउट, अतिथि पंजी और भंडारा योजना एक साथ संभालकर।', bn: 'এটি আশ্রমে যাত্রী অবস্থানের সম্পূর্ণ ডেস্ক, ঘর, বুকিং, চেক-ইন ও চেক-আউট, অতিথি নিবন্ধন ও ভাণ্ডারা পরিকল্পনা একসঙ্গে সামলে।' },
    realLifeExample: { en: 'Before a festival weekend, an ashram with 20 rooms and one sevak at the desk already knows how many yatris are arriving and how many plates the bhandara must serve. Nobody cooks by guess, and no arriving family is turned away by a booking mistake.', hi: 'त्योहार सप्ताहांत से पहले, 20 कमरों और डेस्क पर एक सेवक वाला आश्रम पहले से जानता है कि कितने यात्री आ रहे हैं और भंडारे में कितनी थाली परोसनी है। कोई अंदाजे से नहीं पकाता, और कोई आया परिवार बुकिंग की भूल से नहीं लौटता।', bn: 'উৎসবের সাপ্তাহিক ছুটির আগে, ২০টি ঘর ও ডেস্কে ১ জন সেবক থাকা একটি আশ্রম আগেই জানে কতজন যাত্রী আসছেন এবং ভাণ্ডারায় কত থালা পরিবেশন করতে হবে। কেউ আন্দাজে রান্না করে না, আর কোনো আগত পরিবার বুকিংয়ের ভুলে ফিরে যায় না।' },
    steps: [
      { en: 'Set up all rooms and beds the ashram offers to yatris.', hi: 'आश्रम यात्रियों को जो कमरे और बिस्तर देता है, वे तय करें।', bn: 'আশ্রম যাত্রীদের যে ঘর ও বিছানা দেয়, সেগুলো ঠিক করুন।' },
      { en: 'Take bookings with guest details and dates, and confirm them here.', hi: 'बुकिंग अतिथि विवरण और तारीख सहित लें, और यहाँ पुष्टि करें।', bn: 'বুকিং অতিথির বিবরণ ও তারিখসহ নিন, এবং এখানে নিশ্চিত করুন।' },
      { en: 'Check guests in and out on the day, keeping the guest register complete.', hi: 'अतिथियों को उसी दिन चेक-इन व चेक-आउट करें, अतिथि पंजी पूर्ण रखते हुए।', bn: 'অতিথিদের সেদিনই চেক-ইন ও চেক-আউট করুন, অতিথি নিবন্ধন সম্পূর্ণ রেখে।' },
      { en: 'Use the arrival count to plan the bhandara for each day.', hi: 'आगमन संख्या का उपयोग हर दिन के भंडारे की योजना में करें।', bn: 'আগমনের সংখ্যা ব্যবহার করে প্রতিদিনের ভাণ্ডারার পরিকল্পনা করুন।' }
    ],
    commonMistakes: [
      { en: 'Keep the guest register complete for every stay, not only for large groups. The register protects both the yatri and the ashram.', hi: 'हर निवास के लिए अतिथि पंजी पूर्ण रखें, केवल बड़े समूहों के लिए नहीं। पंजी यात्री और आश्रम दोनों की रक्षा करती है।', bn: 'প্রতিটি অবস্থানের জন্য অতিথি নিবন্ধন সম্পূর্ণ রাখুন, শুধু বড় দলের জন্য নয়। নিবন্ধন যাত্রী ও আশ্রম উভয়কেই রক্ষা করে।' },
      { en: 'Plan bhandara from real bookings, not from hope. Hope either wastes food or leaves a hungry yatri unserved.', hi: 'भंडारे की योजना असली बुकिंग से बनाएं, आशा से नहीं। आशा या तो भोजन बर्बाद करती है या भूखे यात्री को बिना भोजन छोड़ती है।', bn: 'ভাণ্ডারার পরিকল্পনা আসল বুকিং থেকে করুন, আশা থেকে নয়। আশা হয় খাবার নষ্ট করে, নয়তো ক্ষুধার্ত যাত্রীকে অভুক্ত রাখে।' }
    ],
    capabilities: [
      { en: 'Manage rooms, bookings and check in and out', hi: 'कमरे, बुकिंग और चेक-इन व चेक-आउट संभालें', bn: 'ঘর, বুকিং ও চেক-ইন ও চেক-আউট সামলান' },
      { en: 'Keep a complete guest register', hi: 'पूर्ण अतिथि पंजी रखें', bn: 'সম্পূর্ণ অতিথি নিবন্ধন রাখুন' },
      { en: 'Plan the bhandara from real arrival counts', hi: 'असली आगमन संख्या से भंडारे की योजना बनाएं', bn: 'আসল আগমন সংখ্যা থেকে ভাণ্ডারার পরিকল্পনা করুন' }
    ],
    worksOffline: true
  },
  'satsang': {
    whatItDoes: { en: 'This desk helps you organise satsang, kirtan and discourses, with schedules, venues and reminders handled in one place.', hi: 'यह डेस्क सत्संग, कीर्तन और प्रवचन आयोजित करने में मदद करता है, समय-सारणी, स्थान और याद एक जगह संभालकर।', bn: 'এই ডেস্কটি সৎসঙ্গ, কীর্তন ও প্রবচন আয়োজনে সাহায্য করে, সময়সূচি, স্থান ও স্মরণ এক জায়গায় সামলে।' },
    realLifeExample: { en: 'A devotee family that hosts a monthly kirtan at home no longer sends the same details again and again in messages. The schedule and venue sit here once, and regulars check the next satsang day themselves.', hi: 'एक भक्त परिवार जो घर पर मासिक कीर्तन रखता है, अब संदेशों में वही विवरण बार-बार नहीं भेजता। समय-सारणी और स्थान यहाँ एक बार रहता है, और नियमित लोग अगला सत्संग दिन खुद देख लेते हैं।', bn: 'একটি ভক্ত পরিবার যারা বাড়িতে মাসিক কীর্তন রাখে, তারা আর বার্তায় একই বিবরণ বারবার পাঠায় না। সময়সূচি ও স্থান এখানে একবার থাকে, আর নিয়মিতরা পরের সৎসঙ্গের দিন নিজেরাই দেখে নেন।' },
    steps: [
      { en: 'Add the satsang or kirtan with its date, time and venue.', hi: 'सत्संग या कीर्तन उसकी तारीख, समय और स्थान सहित जोड़ें।', bn: 'সৎসঙ্গ বা কীর্তন তার তারিখ, সময় ও স্থানসহ যোগ করুন।' },
      { en: 'Note who will lead the kirtan or give the discourse.', hi: 'कौन कीर्तन का नेतृत्व करेगा या प्रवचन देगा, यह लिखें।', bn: 'কে কীর্তনের নেতৃত্ব দেবেন বা প্রবচন দেবেন তা লিখুন।' },
      { en: 'Send or share the reminder before the gathering day.', hi: 'सभा के दिन से पहले याद भेजें या साझा करें।', bn: 'সমাবেশের দিনের আগে স্মরণ পাঠান বা ভাগ করুন।' },
      { en: 'After the gathering, note attendance and any change for next time.', hi: 'सभा के बाद उपस्थिति और अगली बार के लिए कोई बदलाव लिखें।', bn: 'সমাবেশের পর উপস্থিতি ও পরের বারের জন্য কোনো পরিবর্তন লিখুন।' }
    ],
    commonMistakes: [
      { en: 'Do not announce a change of venue only in one message thread. Update it here, where everyone looks, or some devotees will reach the old place.', hi: 'स्थान बदलाव की घोषणा केवल एक संदेश थ्रेड में न करें। उसे यहाँ अपडेट करें, जहाँ सब देखते हैं, वरना कुछ भक्त पुरानी जगह पहुँच जाएंगे।', bn: 'স্থান পরিবর্তনের ঘোষণা শুধু একটি বার্তা থ্রেডে করবেন না। তা এখানে হালনাগাদ করুন, যেখানে সবাই দেখে, নয়তো কিছু ভক্ত পুরনো জায়গায় পৌঁছে যাবেন।' },
      { en: 'Confirm the speaker or kirtan leader a day early. A satsang without its heart arranged becomes an anxious scramble.', hi: 'वक्ता या कीर्तन नेता की पुष्टि एक दिन पहले करें। हृदय की व्यवस्था बिना सत्संग चिंताजनक भागदौड़ बन जाता है।', bn: 'বক্তা বা কীর্তন নেতার নিশ্চিতকরণ একদিন আগে করুন। হৃদয়ের ব্যবস্থা ছাড়া সৎসঙ্গ উদ্বিগ্ন ছোটাছুটি হয়ে যায়।' }
    ],
    capabilities: [
      { en: 'Schedule satsang, kirtan and discourses', hi: 'सत्संग, कीर्तन और प्रवचन तय करें', bn: 'সৎসঙ্গ, কীর্তন ও প্রবচনের সময়সূচি করুন' },
      { en: 'Keep venue and leader details in one place', hi: 'स्थान और नेता का विवरण एक जगह रखें', bn: 'স্থান ও নেতার বিবরণ এক জায়গায় রাখুন' },
      { en: 'Handle reminders for regular devotees', hi: 'नियमित भक्तों के लिए याद संभालें', bn: 'নিয়মিত ভক্তদের জন্য স্মরণ সামলান' }
    ],
    worksOffline: true
  },
  'sanghaDrills': {
    whatItDoes: { en: 'This desk helps a sangha mobilise its shakhas, with drills, attendance and readiness tracking for Trustees and sevadars.', hi: 'यह डेस्क संघ को अपनी शाखाओं को संगठित करने में मदद करता है, अभ्यास, उपस्थिति और तत्परता की निगरानी न्यासियों व सेवदारों के लिए।', bn: 'এই ডেস্কটি সংঘকে তার শাখাগুলোকে সংগঠিত করতে সাহায্য করে, অনুশীলন, উপস্থিতি ও প্রস্তুতির নজরদারি ট্রাস্টি ও সেবাদারদের জন্য।' },
    realLifeExample: { en: 'When a flood relief call comes, the sangha does not start by asking who is available. The shakha attendance and drill readiness here already show which team can move first, and its sevadar leader gets the call.', hi: 'जब बाढ़ राहत की पुकार आती है, संघ यह पूछने से शुरू नहीं करता कि कौन उपलब्ध है। यहाँ की शाखा उपस्थिति और अभ्यास तत्परता पहले से दिखाती है कि कौन सी टीम पहले चल सकती है, और उसके सेवदार नेता को फोन जाता है।', bn: 'বন্যা ত্রাণের ডাক এলে, সংঘ কে প্রস্তুত আছে তা জিজ্ঞাসা করে শুরু করে না। এখানকার শাখা উপস্থিতি ও অনুশীলন প্রস্তুতি আগেই দেখায় কোন দল প্রথমে এগোতে পারবে, আর তার সেবাদার নেতার কাছে ফোন যায়।' },
    steps: [
      { en: 'List each shakha with its place, meeting rhythm and leader.', hi: 'हर शाखा को उसके स्थान, बैठक क्रम और नेता सहित सूचीबद्ध करें।', bn: 'প্রতিটি শাখাকে তার স্থান, সভার ছন্দ ও নেতাসহ তালিকাভুক্ত করুন।' },
      { en: 'Record attendance at shakha gatherings and drills.', hi: 'शाखा सभाओं और अभ्यासों में उपस्थिति दर्ज करें।', bn: 'শাখা সমাবেশ ও অনুশীলনে উপস্থিতি লিখুন।' },
      { en: 'Note drill practice and readiness honestly for each shakha.', hi: 'हर शाखा के लिए अभ्यास और तत्परता ईमानदारी से लिखें।', bn: 'প্রতিটি শাখার জন্য অনুশীলন ও প্রস্তুতি সততার সঙ্গে লিখুন।' },
      { en: 'When mobilisation is needed, call on the readied shakhas first.', hi: 'जब संगठन की जरूरत हो, तैयार शाखाओं को पहले पुकारें।', bn: 'সংগঠনের প্রয়োজন হলে, প্রস্তুত শাখাগুলোকে প্রথমে ডাকুন।' }
    ],
    commonMistakes: [
      { en: 'Do not mark readiness generously to look good. In a real emergency, an honest readiness note protects both the team and those they go to serve.', hi: 'अच्छा दिखने के लिए तत्परता उदारता से न लगाएं। असली आपातकाल में ईमानदार तत्परता नोट टीम और जिनकी सेवा को वे जाते हैं, दोनों की रक्षा करता है।', bn: 'ভালো দেখানোর জন্য প্রস্তুতি উদারভাবে চিহ্নিত করবেন না। আসল জরুরি অবস্থায় সৎ প্রস্তুতির নোট দল ও যাদের সেবায় তারা যায়, উভয়কেই রক্ষা করে।' },
      { en: 'Keep attendance regular, not only before big events. Readiness is built in ordinary weeks, not in the week of need.', hi: 'उपस्थिति नियमित रखें, केवल बड़े आयोजनों से पहले नहीं। तत्परता साधारण सप्ताहों में बनती है, जरूरत के सप्ताह में नहीं।', bn: 'উপস্থিতি নিয়মিত রাখুন, শুধু বড় অনুষ্ঠানের আগে নয়। প্রস্তুতি সাধারণ সপ্তাহে তৈরি হয়, প্রয়োজনের সপ্তাহে নয়।' }
    ],
    capabilities: [
      { en: 'Organise shakhas with leaders and rhythms', hi: 'नेताओं और क्रम के साथ शाखाएँ संगठित करें', bn: 'নেতা ও ছন্দসহ শাখা সংগঠিত করুন' },
      { en: 'Track drill practice and attendance', hi: 'अभ्यास और उपस्थिति देखें', bn: 'অনুশীলন ও উপস্থিতি দেখুন' },
      { en: 'See readiness before mobilisation', hi: 'संगठन से पहले तत्परता देखें', bn: 'সংগঠনের আগে প্রস্তুতি দেখুন' }
    ],
    worksOffline: true
  },
  'granthLibrary': {
    whatItDoes: { en: 'This desk is a living library of sacred granths and manuscripts, catalogued and searchable, so a needed text can be found instead of remembered vaguely.', hi: 'यह डेस्क पवित्र ग्रंथों और पांडुलिपियों का जीवंत पुस्तकालय है, सूचीबद्ध और खोजने योग्य, ताकि जरूरत का ग्रंथ अस्पष्ट याद के बजाय मिल सके।', bn: 'এই ডেস্কটি পবিত্র গ্রন্থ ও পাণ্ডুলিপির একটি জীবন্ত গ্রন্থাগার, তালিকাভুক্ত ও অনুসন্ধানযোগ্য, যাতে প্রয়োজনীয় গ্রন্থ অস্পষ্ট স্মরণের বদলে খুঁজে পাওয়া যায়।' },
    realLifeExample: { en: 'A young devotee asks for a specific granth for his study, and the small library of a mandir has no librarian. The sevak searches here in a moment and knows whether the book is on the shelf or out with another reader.', hi: 'एक युवा भक्त अपने अध्ययन के लिए एक विशेष ग्रंथ माँगता है, और मंदिर के छोटे पुस्तकालय में कोई पुस्तकालयाध्यक्ष नहीं है। सेवक यहाँ एक क्षण में खोजकर जान लेता है कि पुस्तक ताक पर है या अन्य पाठक के पास है।', bn: 'এক তরুণ ভক্ত তার অধ্যয়নের জন্য একটি নির্দিষ্ট গ্রন্থ চান, আর মন্দিরের ছোট গ্রন্থাগারে কোনো গ্রন্থাগারিক নেই। সেবক এখানে এক মুহূর্তে খুঁজে জেনে নেন বইটি তাকে আছে নাকি অন্য পাঠকের কাছে আছে।' },
    steps: [
      { en: 'Catalogue each granth or manuscript with its name, subject and shelf place.', hi: 'हर ग्रंथ या पांडुलिपि को उसके नाम, विषय और ताख स्थान सहित सूचीबद्ध करें।', bn: 'প্রতিটি গ্রন্থ বা পাণ্ডুলিপিকে তার নাম, বিষয় ও তাকের স্থানসহ তালিকাভুক্ত করুন।' },
      { en: 'Note the condition of rare or old manuscripts honestly.', hi: 'दुर्लभ या पुरानी पांडुलिपियों की स्थिति ईमानदारी से लिखें।', bn: 'বিরল বা পুরনো পাণ্ডুলিপির অবস্থা সততার সঙ্গে লিখুন।' },
      { en: 'When a book is taken for study, record who has it and since when.', hi: 'जब कोई पुस्तक अध्ययन के लिए ली जाए, कौन और कब से के पास है, यह दर्ज करें।', bn: 'কোনো বই অধ্যয়নের জন্য নেওয়া হলে, কার কাছে ও কবে থেকে আছে তা লিখুন।' },
      { en: 'Mark the return when the book comes back to the shelf.', hi: 'पुस्तक ताख पर लौटे तो वापसी चिह्नित करें।', bn: 'বই তাকে ফিরলে প্রত্যাবর্তন চিহ্নিত করুন।' }
    ],
    commonMistakes: [
      { en: 'Do not lend a rare manuscript without a record, however trusted the reader. Trust is honoured best by a clear note that protects the granth itself.', hi: 'कितना भी विश्वसनीय पाठक हो, बिना रिकॉर्ड के दुर्लभ पांडुलिपि न दें। विश्वास का सर्वोत्तम सम्मान एक स्पष्ट नोट है जो ग्रंथ की रक्षा करता है।', bn: 'পাঠক যত বিশ্বস্তই হোন, রেকর্ড ছাড়া বিরল পাণ্ডুলিপি দেবেন না। বিশ্বাসের সর্বোত্তম সম্মান একটি পরিষ্কার নোট, যা গ্রন্থকেই রক্ষা করে।' },
      { en: 'Write the shelf place for every book. A catalogue without a place turns every search back into a hunt.', hi: 'हर पुस्तक के लिए ताख स्थान लिखें। स्थान बिना सूची हर खोज को फिर शिकार बना देती है।', bn: 'প্রতিটি বইয়ের জন্য তাকের স্থান লিখুন। স্থান ছাড়া তালিকা প্রতিটি খোঁজকে আবার শিকারে পরিণত করে।' }
    ],
    capabilities: [
      { en: 'Catalogue granths and manuscripts searchably', hi: 'ग्रंथ और पांडुलिपियाँ खोजने योग्य सूचीबद्ध करें', bn: 'গ্রন্থ ও পাণ্ডুলিপি অনুসন্ধানযোগ্যভাবে তালিকাভুক্ত করুন' },
      { en: 'Note condition and shelf place for each text', hi: 'हर ग्रंथ की स्थिति और ताख स्थान लिखें', bn: 'প্রতিটি গ্রন্থের অবস্থা ও তাকের স্থান লিখুন' },
      { en: 'Record lending and returns clearly', hi: 'लेन-देन और वापसी स्पष्ट दर्ज करें', bn: 'ধার ও প্রত্যাবর্তন পরিষ্কারভাবে লিখুন' }
    ],
    worksOffline: true
  }
};
