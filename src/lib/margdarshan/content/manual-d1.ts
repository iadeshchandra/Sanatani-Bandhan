import type { ManualEntry } from '../manualTypes';

export const MANUAL_D1: Record<string, ManualEntry> = {
  'dashboard': {
    whatItDoes: {
      en: 'Your morning command view for the whole institution. In one glance you see collections, footfall and the work still pending, without opening every desk one by one.',
      hi: 'आपकी संस्था का सुबह का मुख्य दृश्य। एक ही झलक में संग्रह, आने वाले भक्तों की संख्या और बाकी बचा काम दिख जाता है — हर डेस्क अलग-अलग खोलने की ज़रूरत नहीं।',
      bn: 'আপনার প্রতিষ্ঠানের সকালের প্রধান দৃশ্য। এক ঝলকে সংগ্রহ, ভক্তদের আগমন আর বাকি থাকা কাজ দেখা যায় — প্রতিটি ডেস্ক আলাদা করে খুলতে হয় না।',
    },
    realLifeExample: {
      en: 'A small trust run by two volunteers opens the Command Center with morning tea on a festival day. Collections, footfall and pending work are all in front of them, so they know where the day stands before the first aarti begins.',
      hi: 'दो स्वयंसेवकों से चलने वाला एक छोटा ट्रस्ट त्योहार के दिन सुबह की चाय के साथ Command Center खोलता है। संग्रह, भक्तों की संख्या और बाकी काम सब सामने होता है, इसलिए पहली आरती से पहले ही उन्हें पता चल जाता है कि दिन की स्थिति क्या है।',
      bn: '২ জন স্বেচ্ছাসেবী দিয়ে চলা একটি ছোট ট্রাস্ট উৎসবের দিন সকালের চায়ের সঙ্গে Command Center খোলে। সংগ্রহ, ভক্তদের সংখ্যা আর বাকি কাজ সব সামনে থাকে, তাই প্রথম আরতির আগেই তারা জেনে যায় দিনের অবস্থা কেমন।',
    },
    steps: [
      {
        en: 'Open the Command Center desk.',
        hi: 'Command Center डेस्क खोलें।',
        bn: 'Command Center ডেস্ক খুলুন।',
      },
      {
        en: 'Review collections, footfall and pending work at a glance.',
        hi: 'संग्रह, भक्तों की संख्या और बाकी काम एक झलक में देखें।',
        bn: 'সংগ্রহ, ভক্তদের আগমন আর বাকি কাজ এক ঝলকে দেখে নিন।',
      },
      {
        en: 'Follow up the pending work that needs attention first.',
        hi: 'जिस बाकी काम पर सबसे पहले ध्यान देना है, उसे आगे बढ़ाएँ।',
        bn: 'যে বাকি কাজে সবার আগে মনোযোগ দরকার, তা এগিয়ে নিন।',
      },
      {
        en: 'Check the view again later in the day to see what has changed.',
        hi: 'दिन में बाद में फिर से दृश्य देखें कि क्या बदला है।',
        bn: 'দিনের পরে আবার দৃশ্যটি দেখুন, কী বদলেছে বুঝতে।',
      },
    ],
    commonMistakes: [
      {
        en: 'Use this glance for the full picture of money — for detailed accounts, open the treasury records themselves and check there.',
        hi: 'पैसे की पूरी जानकारी के लिए सिर्फ इस झलक पर निर्भर न रहें — विस्तृत हिसाब के लिए treasury के रिकॉर्ड खोलकर वहाँ जाँचें।',
        bn: 'অর্থের পুরো ছবির জন্য শুধু এই ঝলকের উপর নির্ভর করবেন না — বিস্তারিত হিসাবের জন্য treasury-র রেকর্ড খুলে সেখানে যাচাই করুন।',
      },
      {
        en: 'Keep the pending list moving — work left sitting here day after day is usually work nobody has taken up.',
        hi: 'बाकी काम की सूची चलती रखें — जो काम दिन-दिन यहाँ पड़ा रहता है, वह आमतौर पर वह काम होता है जिसे किसी ने उठाया ही नहीं।',
        bn: 'বাকি কাজের তালিকা চলমান রাখুন — যে কাজ দিনের পর দিন এখানে পড়ে থাকে, তা সাধারণত সেই কাজ যেটি কেউ হাতে নেয়নি।',
      },
      {
        en: 'Make checking it a morning habit, at roughly the same time, so a sudden change stands out.',
        hi: 'इसे सुबह देखने की आदत बनाएँ, लगभग एक ही समय पर, ताकि अचानक बदलाव साफ दिखे।',
        bn: 'সকালে এটি দেখার অভ্যাস করুন, প্রায় একই সময়ে, যাতে হঠাৎ কোনো বদল স্পষ্ট চোখে পড়ে।',
      },
    ],
    capabilities: [
      {
        en: 'See collections at a glance',
        hi: 'संग्रह एक झलक में देखें',
        bn: 'সংগ্রহ এক ঝলকে দেখুন',
      },
      {
        en: 'See footfall at a glance',
        hi: 'भक्तों की संख्या एक झलक में देखें',
        bn: 'ভক্তদের আগমন এক ঝলকে দেখুন',
      },
      {
        en: 'See pending work that needs attention',
        hi: 'ध्यान देने वाला बाकी काम देखें',
        bn: 'মনোযোগ দরকার এমন বাকি কাজ দেখুন',
      },
    ],
    worksOffline: true,
  },
  'checkin': {
    whatItDoes: {
      en: 'This desk keeps a clear record of who entered and when, at the gate itself. It replaces the paper register, so the entry record stays neat, readable and with the team.',
      hi: 'यह डेस्क द्वार पर ही साफ रिकॉर्ड रखता है कि कौन कब अंदर आया। यह कागज़ के रजिस्टर की जगह लेता है, इसलिए प्रवेश का रिकॉर्ड साफ, पढ़ने योग्य और टीम के पास रहता है।',
      bn: 'এই ডেস্ক গেটেই পরিষ্কার রেকর্ড রাখে কে কখন প্রবেশ করেছেন। এটি কাগজের রেজিস্টারের জায়গা নেয়, তাই প্রবেশের রেকর্ড পরিষ্কার, পড়ার যোগ্য আর দলের কাছে থাকে।',
    },
    realLifeExample: {
      en: 'On a crowded satsang evening at an ashram, the gate sevadar checks devotees in on a phone instead of scribbling in a paper register. Later, the trustees can see exactly who came and when, without hunting through pages.',
      hi: 'आश्रम में भीड़ भरी सत्संग की शाम को द्वार का सेवादार कागज़ के रजिस्टर में लिखने के बजाय फोन पर भक्तों का check-in करता है। बाद में trustees साफ देख सकते हैं कि कौन कब आया — पन्ने पलटने की ज़रूरत नहीं।',
      bn: 'আশ্রমে ভিড়পূর্ণ সৎসঙ্গের সন্ধ্যায় গেটের সেবাদার কাগজের রেজিস্টারে লেখার বদলে ফোনে ভক্তদের check-in করেন। পরে trustees স্পষ্ট দেখতে পারেন কে কখন এসেছিলেন — পাতা উল্টাতে হয় না।',
    },
    steps: [
      {
        en: 'Open the Gate Command & Check-In desk at the gate.',
        hi: 'द्वार पर Gate Command & Check-In डेस्क खोलें।',
        bn: 'গেটে Gate Command & Check-In ডেস্ক খুলুন।',
      },
      {
        en: 'Check in each visitor as they arrive.',
        hi: 'हर आगंतुक के आते ही उनका check-in करें।',
        bn: 'প্রতিটি অতিথি পৌঁছালেই তাঁর check-in করুন।',
      },
      {
        en: 'Review the entry list during the day when you need to know who is inside.',
        hi: 'दिन में जब जानना हो कि अंदर कौन है, तो प्रवेश सूची देखें।',
        bn: 'দিনে যখন জানতে হবে ভিতরে কে আছেন, প্রবেশের তালিকাটি দেখুন।',
      },
      {
        en: 'Check the day’s entries once more before closing the gate.',
        hi: 'द्वार बंद करने से पहले दिन की प्रविष्टियाँ एक बार फिर जाँच लें।',
        bn: 'গেট বন্ধ করার আগে দিনের এন্ট্রিগুলো আরও ১ বার যাচাই করে নিন।',
      },
    ],
    commonMistakes: [
      {
        en: 'Check people in as they arrive — writing entries later from memory is how names and times go wrong.',
        hi: 'लोगों का check-in उनके आते ही करें — बाद में याद से प्रविष्टि लिखने पर ही नाम और समय में गलती होती है।',
        bn: 'মানুষ পৌঁছালেই check-in করুন — পরে স্মৃতি থেকে এন্ট্রি লিখলেই নাম আর সময়ে ভুল হয়।',
      },
      {
        en: 'Confirm the person’s name before you mark the entry, especially when the gate is crowded and rushed.',
        hi: 'प्रविष्टि दर्ज करने से पहले व्यक्ति का नाम पक्का कर लें, खासकर जब द्वार पर भीड़ और जल्दबाज़ी हो।',
        bn: 'এন্ট্রি দেওয়ার আগে ব্যক্তির নাম নিশ্চিত করে নিন, বিশেষ করে গেটে ভিড় আর তাড়া থাকলে।',
      },
    ],
    capabilities: [
      {
        en: 'Record who entered and when',
        hi: 'रिकॉर्ड करें कि कौन कब अंदर आया',
        bn: 'কে কখন প্রবেশ করেছেন তা রেকর্ড করুন',
      },
      {
        en: 'Keep the gate entry record without a paper register',
        hi: 'कागज़ के रजिस्टर के बिना द्वार के प्रवेश का रिकॉर्ड रखें',
        bn: 'কাগজের রেজিস্টার ছাড়াই গেটের প্রবেশের রেকর্ড রাখুন',
      },
      {
        en: 'Review the entries for the day',
        hi: 'दिन की प्रविष्टियाँ देखें',
        bn: 'দিনের এন্ট্রিগুলো দেখুন',
      },
    ],
    worksOffline: true,
  },
  'devotees': {
    realLifeExample: {
      en: 'A village mandir run by two volunteers keeps every devotee, donor and volunteer in this one directory. When an elderly devotee’s family needs to be reached, or a regular donor has not been seen for weeks, they find the person in moments instead of searching old notebooks.',
      hi: 'दो स्वयंसेवकों से चलने वाला एक गाँव का मंदिर हर भक्त, दाता और स्वयंसेवक को इसी एक directory में रखता है। जब किसी बुज़ुर्ग भक्त के परिवार से संपर्क करना हो, या कोई नियमित दाता हफ्तों से न दिखा हो, तो वे पुरानी कॉपियाँ खोजने के बजाय कुछ ही पलों में उस व्यक्ति को पा लेते हैं।',
      bn: '২ জন স্বেচ্ছাসেবী দিয়ে চলা একটি গ্রামের মন্দির প্রতিটি ভক্ত, দাতা আর স্বেচ্ছাসেবীকে এই ১টি directory-তেই রাখে। কোনো প্রবীণ ভক্তের পরিবারের সঙ্গে যোগাযোগ দরকার হলে, বা কোনো নিয়মিত দাতা সপ্তাহ ধরে না এলে, পুরনো খাতা খোঁজার বদলে তারা মুহূর্তে সেই মানুষটিকে পেয়ে যায়।',
    },
    commonMistakes: [
      {
        en: 'Check whether a person is already in the directory before adding them again, so nobody ends up recorded twice.',
        hi: 'किसी व्यक्ति को फिर से जोड़ने से पहले जाँच लें कि वह directory में पहले से है या नहीं, ताकि कोई दो बार दर्ज न हो जाए।',
        bn: 'কোনো ব্যক্তিকে আবার যোগ করার আগে যাচাই করুন তিনি directory-তে আগেই আছেন কিনা, যাতে কেউ ২ বার নথিভুক্ত না হন।',
      },
      {
        en: 'Keep phone numbers and family details up to date when they change — an old number is how a family quietly falls out of touch.',
        hi: 'फोन नंबर और परिवार की जानकारी बदलने पर उसे ताज़ा रखें — पुराना नंबर ही वह रास्ता है जिससे कोई परिवार चुपचाप संपर्क से बाहर हो जाता है।',
        bn: 'ফোন নম্বর আর পরিবারের তথ্য বদলালে তা হালনাগাদ রাখুন — পুরনো নম্বরই সেই পথ যাতে একটি পরিবার নীরবে যোগাযোগের বাইরে চলে যায়।',
      },
      {
        en: 'Add a new devotee on the day you meet them, while the name, gotra and family details are still fresh.',
        hi: 'नए भक्त को उसी दिन जोड़ें जिस दिन आप उनसे मिलें, जब नाम, gotra और परिवार की जानकारी अभी ताज़ा हो।',
        bn: 'নতুন ভক্তকে যেদিন তাঁর সঙ্গে দেখা হয় সেদিনই যোগ করুন, যখন নাম, gotra আর পরিবারের তথ্য তখনও তাজা থাকে।',
      },
    ],
    capabilities: [
      {
        en: 'Keep one searchable directory of devotees, donors and volunteers',
        hi: 'भक्तों, दाताओं और स्वयंसेवकों की एक खोजने योग्य directory रखें',
        bn: 'ভক্ত, দাতা আর স্বেচ্ছাসেবীদের ১টি খোঁজার যোগ্য directory রাখুন',
      },
      {
        en: 'Find a person quickly when you need to reach them',
        hi: 'संपर्क करना हो तो किसी व्यक्ति को जल्दी खोजें',
        bn: 'যোগাযোগ দরকার হলে দ্রুত কোনো ব্যক্তিকে খুঁজুন',
      },
      {
        en: 'Stay in touch with your whole community',
        hi: 'अपने पूरे समुदाय से संपर्क बनाए रखें',
        bn: 'আপনার পুরো সম্প্রদায়ের সঙ্গে যোগাযোগ রাখুন',
      },
    ],
    worksOffline: true,
  },
  'membership': {
    whatItDoes: {
      en: 'All membership work sits in one queue here: trustees review join requests and send invites from the same place. Nobody has to chase approvals across scattered messages any more.',
      hi: 'सदस्यता का सारा काम यहाँ एक ही queue में रहता है: trustees जुड़ने के अनुरोध देखते हैं और उसी जगह से निमंत्रण भेजते हैं। अब किसी को बिखरे हुए संदेशों में मंज़ूरी खोजनी नहीं पड़ती।',
      bn: 'সদস্যপদের সব কাজ এখানে ১টি queue-তেই থাকে: trustees যোগদানের অনুরোধ দেখেন আর একই জায়গা থেকে আমন্ত্রণ পাঠান। এখন আর কাউকে ছড়িয়ে থাকা বার্তায় অনুমোদন খুঁজতে হয় না।',
    },
    realLifeExample: {
      en: 'A devotee family asks a sangha to join, and their request goes to three trustees on three different chats — nobody is sure who approved it. With this queue, one trustee reviews the request in one place and the family gets a clear, warm welcome.',
      hi: 'एक भक्त परिवार किसी sangha से जुड़ने का अनुरोध करता है और वह अनुरोध तीन trustees के पास तीन अलग-अलग chats पर चला जाता है — किसी को पक्का नहीं पता कि मंज़ूरी किसने दी। इस queue के साथ एक trustee एक ही जगह अनुरोध देखता है और परिवार को साफ, स्नेह भरा स्वागत मिलता है।',
      bn: 'একটি ভক্ত পরিবার একটি sangha-তে যোগদানের অনুরোধ করে, আর সেই অনুরোধ ৩ জন trustee-র কাছে ৩টি আলাদা chat-এ চলে যায় — কেউ নিশ্চিত নয় কে অনুমোদন দিয়েছেন। এই queue দিয়ে ১ জন trustee ১টি জায়গায় অনুরোধটি দেখেন আর পরিবারটি স্পষ্ট, আন্তরিক স্বাগত পায়।',
    },
    steps: [
      {
        en: 'Open the Membership desk.',
        hi: 'Membership डेस्क खोलें।',
        bn: 'Membership ডেস্ক খুলুন।',
      },
      {
        en: 'Review the join requests waiting in the queue.',
        hi: 'queue में प्रतीक्षा कर रहे जुड़ने के अनुरोध देखें।',
        bn: 'queue-তে অপেক্ষমাণ যোগদানের অনুরোধগুলো দেখুন।',
      },
      {
        en: 'Approve the requests that are ready.',
        hi: 'जो अनुरोध तैयार हैं, उन्हें मंज़ूरी दें।',
        bn: 'যে অনুরোধগুলো প্রস্তুত, সেগুলো অনুমোদন করুন।',
      },
      {
        en: 'Send an invite when you want to welcome someone new in.',
        hi: 'जब किसी नए व्यक्ति को स्नेह से बुलाना हो, तो निमंत्रण भेजें।',
        bn: 'কাউকে নতুন করে আন্তরিকভাবে ডাকতে চাইলে আমন্ত্রণ পাঠান।',
      },
    ],
    commonMistakes: [
      {
        en: 'Do not leave join requests waiting for long — a family that hears nothing feels quietly turned away.',
        hi: 'जुड़ने के अनुरोधों को लंबे समय तक प्रतीक्षा में न छोड़ें — जिस परिवार को कोई जवाब नहीं मिलता, वह चुपचाप खुद को ठुकराया हुआ महसूस करता है।',
        bn: 'যোগদানের অনুরোধ দীর্ঘদিন অপেক্ষায় ফেলে রাখবেন না — যে পরিবার কোনো উত্তর পায় না, তারা নীরবে নিজেদের প্রত্যাখ্যাত মনে করে।',
      },
      {
        en: 'Check who the person is and which family they belong to before you approve a request.',
        hi: 'अनुरोध मंज़ूर करने से पहले जाँच लें कि व्यक्ति कौन है और किस परिवार से है।',
        bn: 'অনুরোধ অনুমোদনের আগে যাচাই করুন ব্যক্তিটি কে এবং কোন পরিবারের।',
      },
      {
        en: 'Keep approvals in this one queue instead of settling some of them in private chats, so the record stays complete.',
        hi: 'मंज़ूरियाँ इसी एक queue में रखें, कुछ को निजी chats में न निपटाएँ, ताकि रिकॉर्ड पूरा रहे।',
        bn: 'অনুমোদন এই ১টি queue-তেই রাখুন, কিছু ব্যক্তিগত chat-এ মিটিয়ে ফেলবেন না, যাতে রেকর্ড সম্পূর্ণ থাকে।',
      },
    ],
    capabilities: [
      {
        en: 'Approve join requests in one queue',
        hi: 'जुड़ने के अनुरोध एक ही queue में मंज़ूर करें',
        bn: 'যোগদানের অনুরোধ ১টি queue-তে অনুমোদন করুন',
      },
      {
        en: 'Send invites to new members',
        hi: 'नए सदस्यों को निमंत्रण भेजें',
        bn: 'নতুন সদস্যদের আমন্ত্রণ পাঠান',
      },
      {
        en: 'Keep all membership requests together in one place',
        hi: 'सदस्यता के सारे अनुरोध एक ही जगह साथ रखें',
        bn: 'সদস্যপদের সব অনুরোধ ১টি জায়গায় একসঙ্গে রাখুন',
      },
    ],
    worksOffline: true,
  },
  'family': {
    whatItDoes: {
      en: 'This desk maps people into households and kul parivars, instead of treating everyone as a lone name. Seva, invitations and care can then reach the whole family together.',
      hi: 'यह डेस्क लोगों को अकेले नामों की तरह न देखकर उन्हें households और kul parivars में जोड़ता है। फिर seva, निमंत्रण और देखभाल पूरे परिवार तक एक साथ पहुँच सकती है।',
      bn: 'এই ডেস্ক মানুষকে একক নাম হিসেবে না দেখে তাঁদের household আর kul parivar-এ জুড়ে দেয়। তখন seva, আমন্ত্রণ আর যত্ন পুরো পরিবারের কাছে একসঙ্গে পৌঁছাতে পারে।',
    },
    realLifeExample: {
      en: 'In a devotee family of five, only the father’s name was on the mandir list, so his wife and elderly parents were missed whenever prasad or an invitation went out. Once the household is mapped together, the whole parivar is remembered, every time.',
      hi: 'पाँच लोगों के एक भक्त परिवार में मंदिर की सूची में सिर्फ पिता का नाम था, इसलिए जब भी prasad या निमंत्रण जाता, उनकी पत्नी और बुज़ुर्ग माता-पिता छूट जाते थे। जब household एक साथ जुड़ जाता है, तो पूरा parivar हर बार याद रहता है।',
      bn: '৫ জনের একটি ভক্ত পরিবারে মন্দিরের তালিকায় শুধু বাবার নাম ছিল, তাই prasad বা আমন্ত্রণ গেলেই তাঁর স্ত্রী আর প্রবীণ বাবা-মা বাদ পড়তেন। household একসঙ্গে জুড়ে গেলে পুরো parivar প্রতিবার মনে থাকে।',
    },
    steps: [
      {
        en: 'Open the Household & Kul Parivar desk.',
        hi: 'Household & Kul Parivar डेस्क खोलें।',
        bn: 'Household & Kul Parivar ডেস্ক খুলুন।',
      },
      {
        en: 'Add a household, or open one that already exists.',
        hi: 'एक household जोड़ें, या जो पहले से है उसे खोलें।',
        bn: 'একটি household যোগ করুন, অথবা যেটি আগেই আছে তা খুলুন।',
      },
      {
        en: 'Link the family members together under that household.',
        hi: 'परिवार के सदस्यों को उसी household के अंतर्गत एक साथ जोड़ें।',
        bn: 'পরিবারের সদস্যদের সেই household-এর অধীনে একসঙ্গে জুড়ুন।',
      },
      {
        en: 'Review the household before a seva, festival or invitation that involves the family.',
        hi: 'किसी seva, त्योहार या निमंत्रण से पहले, जिसमें परिवार शामिल हो, household देख लें।',
        bn: 'পরিবার জড়িত কোনো seva, উৎসব বা আমন্ত্রণের আগে household-টি দেখে নিন।',
      },
    ],
    commonMistakes: [
      {
        en: 'Check for an existing household before creating a new one, so one family does not end up split across two households.',
        hi: 'नया household बनाने से पहले जाँच लें कि पहले से कोई household है या नहीं, ताकि एक परिवार दो households में न बँट जाए।',
        bn: 'নতুন household তৈরি করার আগে যাচাই করুন আগের কোনো household আছে কিনা, যাতে ১টি পরিবার ২টি household-এ ভাগ না হয়ে যায়।',
      },
      {
        en: 'Add every member of the family to the household, not just the one person who usually visits.',
        hi: 'परिवार के हर सदस्य को household में जोड़ें, सिर्फ उस एक व्यक्ति को नहीं जो आमतौर पर आता है।',
        bn: 'পরিবারের প্রতিটি সদস্যকে household-এ যোগ করুন, শুধু যিনি সাধারণত আসেন তাঁকে নয়।',
      },
      {
        en: 'Update the household when the family changes — a new home, a marriage, a child — so seva keeps reaching the right people.',
        hi: 'परिवार में बदलाव होने पर household ताज़ा करें — नया घर, विवाह, बच्चा — ताकि seva सही लोगों तक पहुँचती रहे।',
        bn: 'পরিবারে বদল হলে household হালনাগাদ করুন — নতুন বাড়ি, বিবাহ, সন্তান — যাতে seva ঠিক মানুষদের কাছে পৌঁছাতে থাকে।',
      },
    ],
    capabilities: [
      {
        en: 'Map households and kul parivars',
        hi: 'households और kul parivars को जोड़ें',
        bn: 'household আর kul parivar জুড়ুন',
      },
      {
        en: 'See a family together as one unit',
        hi: 'परिवार को एक इकाई के रूप में साथ देखें',
        bn: 'পরিবারকে ১টি একক হিসেবে একসঙ্গে দেখুন',
      },
      {
        en: 'Let seva and invitations reach the whole family',
        hi: 'seva और निमंत्रण पूरे परिवार तक पहुँचाएँ',
        bn: 'seva আর আমন্ত্রণ পুরো পরিবারের কাছে পৌঁছে দিন',
      },
    ],
    worksOffline: true,
  },
  'vanshavali': {
    whatItDoes: {
      en: 'This desk preserves ancestral lineages as living family trees. The names and relations your elders carry in memory are kept safely, so the next generation can explore where they come from.',
      hi: 'यह डेस्क ancestral lineages को जीवंत family trees के रूप में संभालकर रखता है। जो नाम और रिश्ते आपके बुज़ुर्ग स्मृति में लिए फिरते हैं, वे सुरक्षित रहते हैं, ताकि अगली पीढ़ी जान सके कि वे कहाँ से आए हैं।',
      bn: 'এই ডেস্ক ancestral lineage-গুলোকে জীবন্ত family tree হিসেবে সংরক্ষণ করে। আপনার প্রবীণরা স্মৃতিতে যে নাম আর সম্পর্ক বয়ে বেড়ান, তা নিরাপদে থাকে, যাতে পরের প্রজন্ম জানতে পারে তারা কোথা থেকে এসেছে।',
    },
    realLifeExample: {
      en: 'The eldest in a devotee family is the only one who still remembers her great-grandparents’ names. Her grandchildren record the lineage with her in Vanshavali, generation by generation, so those names live on in the family tree instead of fading with memory.',
      hi: 'एक भक्त परिवार की सबसे बुज़ुर्ग ही अकेली हैं जिन्हें अपने परदादा-परदादी के नाम अभी भी याद हैं। उनके पोते-पोतियाँ उनके साथ बैठकर Vanshavali में पीढ़ी-दर-पीढ़ी lineage दर्ज करते हैं, ताकि वे नाम स्मृति के साथ मिटने के बजाय family tree में जीवित रहें।',
      bn: 'একটি ভক্ত পরিবারের সবচেয়ে প্রবীণই একমাত্র যিনি তাঁর প্রপিতামহ-প্রপিতামহীর নাম এখনও মনে রেখেছেন। তাঁর নাতি-নাতনিরা তাঁর সঙ্গে বসে Vanshavali-তে প্রজন্ম ধরে lineage লিখে রাখে, যাতে সেই নামগুলো স্মৃতির সঙ্গে মুছে না গিয়ে family tree-তে বেঁচে থাকে।',
    },
    steps: [
      {
        en: 'Open the Ancestral Lineage (Vanshavali) desk.',
        hi: 'Ancestral Lineage (Vanshavali) डेस्क खोलें।',
        bn: 'Ancestral Lineage (Vanshavali) ডেস্ক খুলুন।',
      },
      {
        en: 'Start a family lineage, or open the one already kept for that family.',
        hi: 'एक family lineage शुरू करें, या उस परिवार के लिए पहले से रखी हुई lineage खोलें।',
        bn: 'একটি family lineage শুরু করুন, অথবা সেই পরিবারের জন্য আগেই রাখা lineage-টি খুলুন।',
      },
      {
        en: 'Add ancestors generation by generation, with their relations.',
        hi: 'पूर्वजों को उनके रिश्तों के साथ पीढ़ी-दर-पीढ़ी जोड़ें।',
        bn: 'পূর্বপুরুষদের তাঁদের সম্পর্কসহ প্রজন্ম ধরে যোগ করুন।',
      },
      {
        en: 'Review the tree with the elders of the family while they can still confirm it.',
        hi: 'परिवार के बुज़ुर्गों के साथ tree की समीक्षा करें, जब तक वे इसकी पुष्टि कर सकते हैं।',
        bn: 'পরিবারের প্রবীণদের সঙ্গে tree-টি দেখে নিন, যতদিন তাঁরা তা নিশ্চিত করতে পারেন।',
      },
    ],
    commonMistakes: [
      {
        en: 'Confirm spellings and relations with the elders before you save them — a wrong relation recorded once gets repeated for years.',
        hi: 'नामों की वर्तनी और रिश्ते सहेजने से पहले बुज़ुर्गों से पक्का कर लें — एक बार गलत दर्ज हुआ रिश्ता वर्षों तक दोहराया जाता है।',
        bn: 'নাম আর সম্পর্ক সংরক্ষণের আগে প্রবীণদের দিয়ে নিশ্চিত করে নিন — ১ বার ভুল লেখা সম্পর্ক বছরের পর বছর চলতে থাকে।',
      },
      {
        en: 'Do not wait to record a lineage — this knowledge lives in memory, and memory should be honoured while it is still here.',
        hi: 'lineage दर्ज करने में देर न करें — यह ज्ञान स्मृति में रहता है, और स्मृति का सम्मान तब करना चाहिए जब वह अभी यहाँ है।',
        bn: 'lineage লিখতে দেরি করবেন না — এই জ্ঞান স্মৃতিতে থাকে, আর স্মৃতি থাকতেই তার সম্মান করা উচিত।',
      },
      {
        en: 'Check for an existing lineage before starting a second tree for the same family.',
        hi: 'उसी परिवार के लिए दूसरा tree शुरू करने से पहले जाँच लें कि कोई lineage पहले से है या नहीं।',
        bn: 'একই পরিবারের জন্য দ্বিতীয় tree শুরু করার আগে যাচাই করুন কোনো lineage আগেই আছে কিনা।',
      },
    ],
    capabilities: [
      {
        en: 'Preserve ancestral lineages',
        hi: 'ancestral lineages को संभालकर रखें',
        bn: 'ancestral lineage সংরক্ষণ করুন',
      },
      {
        en: 'Build living family trees',
        hi: 'जीवंत family trees बनाएँ',
        bn: 'জীবন্ত family tree তৈরি করুন',
      },
      {
        en: 'Let the next generation explore their lineage',
        hi: 'अगली पीढ़ी को अपनी lineage खोजने दें',
        bn: 'পরের প্রজন্মকে তাদের lineage অন্বেষণ করতে দিন',
      },
    ],
    worksOffline: true,
  },
  'guests': {
    whatItDoes: {
      en: 'This desk keeps a proper record of guests and first-time visitors, with a simple pipeline for welcoming them back. A first visit can gently become a lasting place in the community.',
      hi: 'यह डेस्क मेहमानों और पहली बार आने वालों का सही रिकॉर्ड रखता है, और उन्हें वापस स्वागत करने की एक सरल प्रक्रिया देता है। पहली मुलाक़ात धीरे-धीरे समुदाय में एक स्थायी स्थान बन सकती है।',
      bn: 'এই ডেস্ক অতিথি আর প্রথমবার আসা দর্শনার্থীদের যথাযথ রেকর্ড রাখে, আর তাঁদের আবার স্বাগত জানানোর একটি সহজ ধারা দেয়। প্রথম সাক্ষাৎ ধীরে ধীরে সম্প্রদায়ে একটি স্থায়ী জায়গা হয়ে উঠতে পারে।',
    },
    realLifeExample: {
      en: 'A family visiting a mandir for the first time during a yatra is welcomed warmly, and their visit is noted in the guest desk. When the next festival comes, the sevadar team remembers them and invites them back — and this time they come as devotees, not strangers.',
      hi: 'yatra के दौरान पहली बार मंदिर आया एक परिवार स्नेह से स्वागत पाता है, और उनकी यात्रा guest desk में दर्ज हो जाती है। जब अगला त्योहार आता है, तो sevadar team उन्हें याद करके वापस बुलाती है — और इस बार वे अजनबियों की तरह नहीं, भक्तों की तरह आते हैं।',
      bn: 'yatra-র সময় প্রথমবার মন্দিরে আসা একটি পরিবার আন্তরিক স্বাগত পায়, আর তাদের সফর guest desk-এ লেখা থাকে। পরের উৎসব এলে sevadar team তাঁদের মনে করে আবার ডাকে — আর এবার তাঁরা অচেনা নয়, ভক্ত হয়ে আসেন।',
    },
    steps: [
      {
        en: 'Open the Guest & Visitor CRM desk.',
        hi: 'Guest & Visitor CRM डेस्क खोलें।',
        bn: 'Guest & Visitor CRM ডেস্ক খুলুন।',
      },
      {
        en: 'Add a new guest when someone visits for the first time.',
        hi: 'जब कोई पहली बार आए, तो नया मेहमान जोड़ें।',
        bn: 'কেউ প্রথমবার এলে নতুন অতিথি যোগ করুন।',
      },
      {
        en: 'Review your guests in the pipeline from time to time.',
        hi: 'समय-समय पर pipeline में अपने मेहमानों को देखें।',
        bn: 'মাঝে মাঝে pipeline-এ আপনার অতিথিদের দেখুন।',
      },
      {
        en: 'Welcome guests back with a warm invitation when the right moment comes.',
        hi: 'सही समय आने पर मेहमानों को स्नेह भरे निमंत्रण से वापस बुलाएँ।',
        bn: 'সঠিক সময় এলে অতিথিদের আন্তরিক আমন্ত্রণে আবার ডাকুন।',
      },
    ],
    commonMistakes: [
      {
        en: 'Record a guest on the day of the visit — a week later, the name and the warmth of the meeting are both hard to recall.',
        hi: 'मेहमान को यात्रा के दिन ही दर्ज करें — एक हफ्ते बाद नाम और उस मुलाक़ात की गर्माहट, दोनों याद करना कठिन हो जाता है।',
        bn: 'অতিথিকে সফরের দিনই লিখুন — ১ সপ্তাহ পরে নাম আর সেই সাক্ষাতের আন্তরিকতা, দুটোই মনে করা কঠিন হয়ে যায়।',
      },
      {
        en: 'Keep the follow-up warm and respectful — a guest should feel invited, never chased.',
        hi: 'अनुवर्ती संपर्क स्नेहपूर्ण और सम्मानजनक रखें — मेहमान को निमंत्रण महसूस होना चाहिए, पीछा कभी नहीं।',
        bn: 'পরবর্তী যোগাযোগ আন্তরিক আর সম্মানজনক রাখুন — অতিথির আমন্ত্রণ অনুভব করা উচিত, তাড়া কখনোই নয়।',
      },
      {
        en: 'Do not treat a first-time guest as a regular member straight away — let the relationship grow through the pipeline, visit by visit.',
        hi: 'पहली बार आए मेहमान को तुरंत नियमित सदस्य न मानें — रिश्ते को pipeline के ज़रिए, यात्रा-दर-यात्रा बढ़ने दें।',
        bn: 'প্রথমবার আসা অতিথিকে সঙ্গে সঙ্গে নিয়মিত সদস্য মনে করবেন না — সম্পর্কটিকে pipeline ধরে, সফরে সফরে বাড়তে দিন।',
      },
    ],
    capabilities: [
      {
        en: 'Keep a proper record of guests and visitors',
        hi: 'मेहमानों और आगंतुकों का सही रिकॉर्ड रखें',
        bn: 'অতিথি আর দর্শনার্থীদের যথাযথ রেকর্ড রাখুন',
      },
      {
        en: 'Follow guests through a simple pipeline',
        hi: 'मेहमानों को एक सरल pipeline में आगे बढ़ाएँ',
        bn: 'অতিথিদের একটি সহজ pipeline ধরে এগিয়ে নিন',
      },
      {
        en: 'Turn first-time visitors into returning devotees',
        hi: 'पहली बार आने वालों को लौटने वाले भक्त बनाएँ',
        bn: 'প্রথমবার আসা দর্শনার্থীদের ফিরে আসা ভক্ত করুন',
      },
    ],
    worksOffline: true,
  },
  'donorCare': {
    whatItDoes: {
      en: 'This desk helps you care for your donors — especially those who have quietly gone silent. It supports winning lapsed donors back: thanking them, reminding them gently and keeping them close.',
      hi: 'यह डेस्क आपके दाताओं की देखभाल में मदद करता है — खासकर उनकी जो चुपचाप दूर हो गए हैं। यह रुके हुए दाताओं को वापस लाने में सहारा देता है: उन्हें धन्यवाद देना, स्नेह से याद दिलाना और उन्हें पास रखना।',
      bn: 'এই ডেস্ক আপনার দাতাদের যত্নে সাহায্য করে — বিশেষ করে যাঁরা নীরবে দূরে সরে গেছেন। এটি থেমে যাওয়া দাতাদের ফিরিয়ে আনতে সহায়তা করে: তাঁদের ধন্যবাদ জানানো, আন্তরিকভাবে মনে করিয়ে দেওয়া আর কাছে রাখা।',
    },
    realLifeExample: {
      en: 'An elderly devotee gave a small dakshina to her sangha every month for years, then stopped after moving to her son’s home in another town. The team notices she has gone quiet, thanks her for her years of seva, and she feels remembered — not forgotten.',
      hi: 'एक बुज़ुर्ग भक्त वर्षों तक हर महीने अपने sangha को छोटी-सी dakshina देती थीं, फिर दूसरे शहर में बेटे के घर जाने के बाद वह रुक गया। team को पता चलता है कि वे चुप हो गई हैं, वे वर्षों की seva के लिए उन्हें धन्यवाद देते हैं — और वे खुद को भूला हुआ नहीं, याद रखा हुआ महसूस करती हैं।',
      bn: 'একজন প্রবীণ ভক্ত বছরের পর বছর প্রতি মাসে তাঁর sangha-কে ছোট dakshina দিতেন, তারপর অন্য শহরে ছেলের বাড়ি যাওয়ার পর তা থেমে যায়। team বুঝতে পারে তিনি নীরব হয়ে গেছেন, তাঁর বছরের seva-র জন্য ধন্যবাদ জানায় — আর তিনি নিজেকে ভুলে যাওয়া নয়, মনে রাখা অনুভব করেন।',
    },
    steps: [
      {
        en: 'Open the Donor Care & Win-Back desk.',
        hi: 'Donor Care & Win-Back डेस्क खोलें।',
        bn: 'Donor Care & Win-Back ডেস্ক খুলুন।',
      },
      {
        en: 'Review the donors who have gone quiet or lapsed.',
        hi: 'उन दाताओं को देखें जो चुप हो गए हैं या रुक गए हैं।',
        bn: 'যে দাতারা নীরব হয়ে গেছেন বা থেমে গেছেন, তাঁদের দেখুন।',
      },
      {
        en: 'Reach out first with gratitude for what they have already given.',
        hi: 'सबसे पहले उन्होंने जो पहले ही दिया है, उसके लिए कृतज्ञता के साथ संपर्क करें।',
        bn: 'সবার আগে তাঁরা যা ইতিমধ্যে দিয়েছেন, তার জন্য কৃতজ্ঞতা নিয়ে যোগাযোগ করুন।',
      },
      {
        en: 'Remind them gently of the seva they supported, and keep them close.',
        hi: 'उन्हें स्नेह से उस seva की याद दिलाएँ जिसका उन्होंने समर्थन किया था, और उन्हें पास रखें।',
        bn: 'তাঁরা যে seva-কে সমর্থন করেছিলেন, তা আন্তরিকভাবে মনে করিয়ে দিন, আর তাঁদের কাছে রাখুন।',
      },
    ],
    commonMistakes: [
      {
        en: 'Thank before you remind — gratitude first, always; a donor who only ever hears requests will drift further away.',
        hi: 'याद दिलाने से पहले धन्यवाद दें — कृतज्ञता हमेशा पहले; जो दाता सिर्फ अनुरोध सुनता है, वह और दूर होता जाएगा।',
        bn: 'মনে করিয়ে দেওয়ার আগে ধন্যবাদ জানান — কৃতজ্ঞতা সবসময় আগে; যে দাতা শুধু অনুরোধই শোনেন, তিনি আরও দূরে সরে যাবেন।',
      },
      {
        en: 'Check a donor’s recent giving before you reach out, so an active donor is never written to as if they had lapsed.',
        hi: 'संपर्क करने से पहले दाता के हाल के दान की जाँच कर लें, ताकि किसी सक्रिय दाता को कभी रुका हुआ समझकर न लिखा जाए।',
        bn: 'যোগাযোগের আগে দাতার সাম্প্রতিক দান যাচাই করে নিন, যাতে কোনো সক্রিয় দাতাকে কখনো থেমে গেছেন ভেবে লেখা না হয়।',
      },
      {
        en: 'Keep the tone respectful and unhurried — dakshina is offered from the heart, never pressed for.',
        hi: 'लहजा सम्मानजनक और बिना जल्दबाज़ी का रखें — dakshina हृदय से दी जाती है, कभी दबाव से नहीं माँगी जाती।',
        bn: 'ভঙ্গি সম্মানজনক আর তাড়াহীন রাখুন — dakshina হৃদয় থেকে দেওয়া হয়, কখনো চাপ দিয়ে চাওয়া হয় না।',
      },
    ],
    capabilities: [
      {
        en: 'See donors who have gone quiet or lapsed',
        hi: 'उन दाताओं को देखें जो चुप हो गए हैं या रुक गए हैं',
        bn: 'নীরব বা থেমে যাওয়া দাতাদের দেখুন',
      },
      {
        en: 'Thank and gently remind your donors',
        hi: 'अपने दाताओं को धन्यवाद दें और स्नेह से याद दिलाएँ',
        bn: 'আপনার দাতাদের ধন্যবাদ জানান আর আন্তরিকভাবে মনে করিয়ে দিন',
      },
      {
        en: 'Win back lapsed donors and keep them close',
        hi: 'रुके हुए दाताओं को वापस लाएँ और उन्हें पास रखें',
        bn: 'থেমে যাওয়া দাতাদের ফিরিয়ে আনুন আর কাছে রাখুন',
      },
    ],
    worksOffline: true,
  },
  'bulkImport': {
    whatItDoes: {
      en: 'This desk brings your old records into the app in bulk, through CSV import. Years of paper registers and Excel sheets can come across in minutes, instead of being typed in one name at a time.',
      hi: 'यह डेस्क CSV import के ज़रिए आपके पुराने रिकॉर्ड एक साथ app में लाता है। वर्षों के कागज़ के रजिस्टर और Excel sheets एक-एक नाम टाइप करने के बजाय कुछ ही मिनटों में आ सकती हैं।',
      bn: 'এই ডেস্ক CSV import দিয়ে আপনার পুরনো রেকর্ড একসঙ্গে app-এ নিয়ে আসে। বছরের পর বছরের কাগজের রেজিস্টার আর Excel sheet একটি একটি নাম টাইপ করার বদলে কয়েক মিনিটে চলে আসতে পারে।',
    },
    realLifeExample: {
      en: 'A small trust has ten years of devotee lists sitting in Excel sheets and paper registers, and nobody has time to type them in. The accountant prepares a CSV from the sheets and imports the records in minutes — the whole parivar is in the app the same day.',
      hi: 'एक छोटे ट्रस्ट के पास दस वर्षों की भक्त-सूचियाँ Excel sheets और कागज़ के रजिस्टरों में पड़ी हैं, और किसी के पास उन्हें टाइप करने का समय नहीं है। accountant sheets से एक CSV तैयार करके कुछ ही मिनटों में रिकॉर्ड import कर देता है — पूरा parivar उसी दिन app में आ जाता है।',
      bn: 'একটি ছোট ট্রাস্টের কাছে ১০ বছরের ভক্ত-তালিকা Excel sheet আর কাগজের রেজিস্টারে পড়ে আছে, আর কারও তা টাইপ করার সময় নেই। accountant sheet থেকে একটি CSV তৈরি করে কয়েক মিনিটে রেকর্ড import করে দেন — পুরো parivar সেই দিনই app-এ চলে আসে।',
    },
    steps: [
      {
        en: 'Prepare your CSV from the paper register or Excel sheet.',
        hi: 'कागज़ के रजिस्टर या Excel sheet से अपना CSV तैयार करें।',
        bn: 'কাগজের রেজিস্টার বা Excel sheet থেকে আপনার CSV তৈরি করুন।',
      },
      {
        en: 'Open the Bulk CSV Ingestion desk and start the import.',
        hi: 'Bulk CSV Ingestion डेस्क खोलें और import शुरू करें।',
        bn: 'Bulk CSV Ingestion ডেস্ক খুলুন আর import শুরু করুন।',
      },
      {
        en: 'Review the imported records carefully once they are in.',
        hi: 'रिकॉर्ड आने के बाद उन्हें ध्यान से देखें।',
        bn: 'রেকর্ড চলে এলে সেগুলো যত্নে দেখে নিন।',
      },
      {
        en: 'Correct any mistakes you spot before the team starts relying on the records.',
        hi: 'team के इन रिकॉर्डों पर निर्भर होने से पहले जो भी गलती दिखे, उसे ठीक करें।',
        bn: 'team এই রেকর্ডের উপর নির্ভর করার আগে যে ভুল চোখে পড়ে, তা ঠিক করুন।',
      },
    ],
    commonMistakes: [
      {
        en: 'Clean the sheet before you import it — duplicates and half-written names in the CSV will come straight into the app.',
        hi: 'import करने से पहले sheet को साफ करें — CSV में दोहरे और आधे-अधूरे नाम सीधे app में आ जाएँगे।',
        bn: 'import করার আগে sheet পরিষ্কার করুন — CSV-তে থাকা দ্বৈত আর অর্ধেক লেখা নাম সরাসরি app-এ চলে আসবে।',
      },
      {
        en: 'Check the columns of your CSV carefully before importing, so names, numbers and other details land in the right place.',
        hi: 'import करने से पहले अपने CSV के columns ध्यान से जाँच लें, ताकि नाम, नंबर और अन्य जानकारी सही जगह पर आए।',
        bn: 'import করার আগে আপনার CSV-এর column-গুলো যত্নে যাচাই করুন, যাতে নাম, নম্বর আর অন্য তথ্য ঠিক জায়গায় বসে।',
      },
      {
        en: 'Keep the original register or sheet safe until you have checked the imported records and are happy with them.',
        hi: 'मूल रजिस्टर या sheet को तब तक सुरक्षित रखें जब तक आप imported records की जाँच करके संतुष्ट न हो जाएँ।',
        bn: 'import করা রেকর্ড যাচাই করে সন্তুষ্ট না হওয়া পর্যন্ত মূল রেজিস্টার বা sheet নিরাপদে রাখুন।',
      },
    ],
    capabilities: [
      {
        en: 'Import records in bulk with CSV',
        hi: 'CSV से रिकॉर्ड एक साथ import करें',
        bn: 'CSV দিয়ে একসঙ্গে রেকর্ড import করুন',
      },
      {
        en: 'Bring paper registers and Excel sheets into the app',
        hi: 'कागज़ के रजिस्टर और Excel sheets app में लाएँ',
        bn: 'কাগজের রেজিস্টার আর Excel sheet app-এ নিয়ে আসুন',
      },
      {
        en: 'Save hours of typing records in one by one',
        hi: 'एक-एक करके रिकॉर्ड टाइप करने के घंटे बचाएँ',
        bn: 'একটি একটি করে রেকর্ড টাইপ করার ঘণ্টা বাঁচান',
      },
    ],
    worksOffline: true,
  },
  'federation': {
    whatItDoes: {
      en: 'This desk lets an institution with many branches run them as one. Headquarters can see consolidated reports and branch rollups together, instead of piecing the whole picture together branch by branch.',
      hi: 'यह डेस्क कई शाखाओं वाली संस्था को उन्हें एक की तरह चलाने देता है। मुख्य कार्यालय consolidated reports और branch rollups एक साथ देख सकता है, बजाय इसके कि पूरी तस्वीर शाखा-दर-शाखा जोड़नी पड़े।',
      bn: 'এই ডেস্ক অনেক শাখা থাকা প্রতিষ্ঠানকে সেগুলোকে ১টির মতো চালাতে দেয়। সদর দপ্তর consolidated report আর branch rollup একসঙ্গে দেখতে পারে, শাখা ধরে ধরে পুরো ছবি জোড়া দেওয়ার বদলে।',
    },
    realLifeExample: {
      en: 'A trust runs three branches in three towns, and every month each branch sends its figures separately, so the trustees never see the whole picture in one place. With federation, the consolidated view is ready for their meeting — all branches, one honest total.',
      hi: 'एक ट्रस्ट तीन शहरों में तीन शाखाएँ चलाता है, और हर महीने हर शाखा अपने आँकड़े अलग-अलग भेजती है, इसलिए trustees को पूरी तस्वीर कभी एक जगह नहीं दिखती। federation के साथ उनकी बैठक के लिए consolidated दृश्य तैयार रहता है — सभी शाखाएँ, एक सच्चा कुल योग।',
      bn: 'একটি ট্রাস্ট ৩টি শহরে ৩টি শাখা চালায়, আর প্রতি মাসে প্রতিটি শাখা তার হিসাব আলাদা পাঠায়, তাই trustees কখনো পুরো ছবি ১টি জায়গায় দেখতে পান না। federation দিয়ে তাদের সভার জন্য consolidated দৃশ্য তৈরি থাকে — সব শাখা, ১টি সৎ মোট।',
    },
    steps: [
      {
        en: 'Open the Federation & Multi-Branch HQ desk.',
        hi: 'Federation & Multi-Branch HQ डेस्क खोलें।',
        bn: 'Federation & Multi-Branch HQ ডেস্ক খুলুন।',
      },
      {
        en: 'Review the consolidated view across all your branches.',
        hi: 'अपनी सभी शाखाओं का consolidated दृश्य देखें।',
        bn: 'আপনার সব শাখার consolidated দৃশ্য দেখুন।',
      },
      {
        en: 'Check the branch-wise figures behind the totals.',
        hi: 'कुल योग के पीछे के शाखा-अनुसार आँकड़े जाँचें।',
        bn: 'মোটের পিছনে থাকা শাখা অনুযায়ী হিসাব যাচাই করুন।',
      },
      {
        en: 'Use the HQ rollup when you plan or report for the whole institution.',
        hi: 'जब पूरी संस्था के लिए योजना या रिपोर्ट बनाएँ, तो HQ rollup का उपयोग करें।',
        bn: 'পুরো প্রতিষ্ঠানের জন্য পরিকল্পনা বা রিপোর্টে HQ rollup ব্যবহার করুন।',
      },
    ],
    commonMistakes: [
      {
        en: 'Keep each branch’s own records up to date — the consolidated view can only be as honest as what each branch has entered.',
        hi: 'हर शाखा के अपने रिकॉर्ड ताज़ा रखें — consolidated दृश्य उतना ही सच्चा होगा जितना हर शाखा ने दर्ज किया है।',
        bn: 'প্রতিটি শাখার নিজের রেকর্ড হালনাগাদ রাখুন — consolidated দৃশ্য ততটাই সৎ হবে যতটা প্রতিটি শাখা লিখেছে।',
      },
      {
        en: 'Check the branch name before you review or compare figures, so one branch’s work is never read as another’s.',
        hi: 'आँकड़े देखने या तुलना करने से पहले शाखा का नाम जाँच लें, ताकि एक शाखा का काम कभी दूसरी का न समझा जाए।',
        bn: 'হিসাব দেখা বা তুলনার আগে শাখার নাম যাচাই করুন, যাতে ১টি শাখার কাজ কখনো অন্য শাখার বলে না ধরা হয়।',
      },
      {
        en: 'Go through the consolidated report with the branch heads before you treat it as final.',
        hi: 'consolidated report को अंतिम मानने से पहले उसे शाखा प्रमुखों के साथ देख लें।',
        bn: 'consolidated report চূড়ান্ত ধরার আগে তা শাখা প্রধানদের সঙ্গে দেখে নিন।',
      },
    ],
    capabilities: [
      {
        en: 'Run many branches as one institution',
        hi: 'कई शाखाओं को एक संस्था की तरह चलाएँ',
        bn: 'অনেক শাখাকে ১টি প্রতিষ্ঠানের মতো চালান',
      },
      {
        en: 'See consolidated reports across branches',
        hi: 'शाखाओं के consolidated reports देखें',
        bn: 'শাখাগুলোর consolidated report দেখুন',
      },
      {
        en: 'See HQ-level rollups for the whole institution',
        hi: 'पूरी संस्था के HQ-level rollups देखें',
        bn: 'পুরো প্রতিষ্ঠানের HQ-level rollup দেখুন',
      },
    ],
    worksOffline: true,
  },
  'sevadar-roster': {
    realLifeExample: {
      en: 'On a big festival day at a mandir, twenty sevadars are needed at the gate, in the kitchen and for prasad — and nobody is sure who is coming when. With the roster, the trustee sees every shift in one place and fills the gaps calmly, days before the festival.',
      hi: 'मंदिर में बड़े त्योहार के दिन बीस सेवादारों की ज़रूरत है — द्वार पर, रसोई में और prasad के लिए — और किसी को पक्का नहीं पता कि कौन कब आएगा। roster के साथ trustee हर shift एक ही जगह देखता है और त्योहार से कई दिन पहले शांति से खाली जगहें भर देता है।',
      bn: 'মন্দিরে বড় উৎসবের দিনে ২০ জন সেবাদার দরকার — গেটে, রান্নাঘরে আর prasad-এর জন্য — আর কেউ নিশ্চিত নয় কে কখন আসবেন। roster দিয়ে trustee প্রতিটি shift ১টি জায়গায় দেখেন আর উৎসবের কয়েক দিন আগেই শান্তিতে ফাঁকগুলো পূরণ করেন।',
    },
    commonMistakes: [
      {
        en: 'Note shift swaps in the roster itself, not only in a chat — a swap that lives in one person’s messages is a shift nobody else knows about.',
        hi: 'shift की अदला-बदली roster में ही दर्ज करें, सिर्फ chat में नहीं — जो अदला-बदली एक व्यक्ति के संदेशों में रहती है, वह shift किसी और को पता ही नहीं होती।',
        bn: 'shift বদল roster-এই লিখুন, শুধু chat-এ নয় — যে বদল ১ জনের বার্তায় থাকে, সেই shift-এর কথা আর কেউ জানেই না।',
      },
      {
        en: 'Confirm each sevadar’s shift well before a festival, not on the morning itself when it is too late to find a replacement.',
        hi: 'हर सेवादार की shift त्योहार से काफी पहले पक्की कर लें, उसी सुबह नहीं जब बदली खोजने में बहुत देर हो चुकी हो।',
        bn: 'প্রতিটি সেবাদারের shift উৎসবের অনেক আগেই নিশ্চিত করুন, সেই সকালে নয় যখন বদলি খোঁজার জন্য অনেক দেরি হয়ে গেছে।',
      },
      {
        en: 'Update the roster when a sevadar tells you they cannot come, so the gap is visible while there is still time to cover it.',
        hi: 'जब कोई सेवादार बताए कि वह नहीं आ सकता, तो roster ताज़ा करें, ताकि खाली जगह तब दिखे जब उसे भरने का समय बाकी हो।',
        bn: 'কোনো সেবাদার আসতে পারবেন না জানালে roster হালনাগাদ করুন, যাতে ফাঁকটি তখনই দেখা যায় যখন তা পূরণের সময় বাকি আছে।',
      },
    ],
    capabilities: [
      {
        en: 'Plan sevadar shifts in one roster',
        hi: 'सेवादारों की shifts एक ही roster में योजनाबद्ध करें',
        bn: 'সেবাদারদের shift ১টি roster-এ পরিকল্পনা করুন',
      },
      {
        en: 'Keep sevadar check-ins in the same place',
        hi: 'सेवादारों के check-ins उसी जगह रखें',
        bn: 'সেবাদারদের check-in একই জায়গায় রাখুন',
      },
      {
        en: 'Keep SOPs with the roster for every shift',
        hi: 'हर shift के लिए SOPs roster के साथ रखें',
        bn: 'প্রতিটি shift-এর জন্য SOP roster-এর সঙ্গে রাখুন',
      },
    ],
    worksOffline: true,
  },
  'festival-journey': {
    whatItDoes: {
      en: 'The Festival Journey is a step-by-step path for a festival, living on the Command Center. It walks the team from the first planning, through the celebration, all the way to publishing the festival’s accounts.',
      hi: 'Festival Journey किसी त्योहार के लिए एक कदम-दर-कदम मार्ग है, जो Command Center पर रहता है। यह team को पहली योजना से, उत्सव के ज़रिए, त्योहार के हिसाब प्रकाशित करने तक ले जाता है।',
      bn: 'Festival Journey একটি উৎসবের জন্য ধাপে ধাপে পথ, যা Command Center-এ থাকে। এটি team-কে প্রথম পরিকল্পনা থেকে, উদ্‌যাপনের মধ্য দিয়ে, উৎসবের হিসাব প্রকাশ করা পর্যন্ত নিয়ে যায়।',
    },
    realLifeExample: {
      en: 'A small trust with two volunteers organises its annual utsav by following the journey one step at a time: plan, prepare, celebrate, and then publish the accounts. Nothing important is forgotten, and every devotee can see an honest account of the festival afterwards.',
      hi: 'दो स्वयंसेवकों वाला एक छोटा ट्रस्ट अपने वार्षिक utsav को journey का एक-एक कदम चलते हुए आयोजित करता है: योजना, तैयारी, उत्सव, और फिर हिसाब प्रकाशित करना। कुछ भी महत्वपूर्ण नहीं भूलता, और हर भक्त बाद में त्योहार का सच्चा हिसाब देख सकता है।',
      bn: '২ জন স্বেচ্ছাসেবীর একটি ছোট ট্রাস্ট তার বার্ষিক utsav journey-র ধাপ ধরে ধরে আয়োজন করে: পরিকল্পনা, প্রস্তুতি, উদ্‌যাপন, তারপর হিসাব প্রকাশ। গুরুত্বপূর্ণ কিছুই ভোলা হয় না, আর প্রতিটি ভক্ত পরে উৎসবের সৎ হিসাব দেখতে পারেন।',
    },
    steps: [
      {
        en: 'Open the Festival Journey on the Command Center, just under the daily Shloka card.',
        hi: 'Command Center पर, दैनिक Shloka card के ठीक नीचे, Festival Journey खोलें।',
        bn: 'Command Center-এ, দৈনিক Shloka card-এর ঠিক নিচে, Festival Journey খুলুন।',
      },
      {
        en: 'Start with the first planning step and work on it together as a team.',
        hi: 'पहले योजना के कदम से शुरू करें और team के रूप में मिलकर उस पर काम करें।',
        bn: 'প্রথম পরিকল্পনার ধাপ দিয়ে শুরু করুন আর team হিসেবে একসঙ্গে তাতে কাজ করুন।',
      },
      {
        en: 'Move to the next step as each part of the work is completed.',
        hi: 'जैसे-जैसे काम का हर हिस्सा पूरा हो, अगले कदम पर बढ़ें।',
        bn: 'কাজের প্রতিটি অংশ শেষ হলেই পরের ধাপে এগিয়ে যান।',
      },
      {
        en: 'Finish the journey by publishing the festival’s accounts.',
        hi: 'त्योहार का हिसाब प्रकाशित करके journey पूरी करें।',
        bn: 'উৎসবের হিসাব প্রকাশ করে journey শেষ করুন।',
      },
    ],
    commonMistakes: [
      {
        en: 'Start the journey early — planning that begins in the last week leaves the team rushing through every step that deserved care.',
        hi: 'journey जल्दी शुरू करें — आखिरी हफ्ते में शुरू हुई योजना team को हर उस कदम में जल्दबाज़ी कराती है जो देखभाल का हकदार था।',
        bn: 'journey আগেভাগে শুরু করুন — শেষ সপ্তাহে শুরু হওয়া পরিকল্পনা team-কে প্রতিটি যত্ন পাওয়ার যোগ্য ধাপে তাড়াহুড়ো করায়।',
      },
      {
        en: 'Do not skip the last step — publishing the accounts is what turns a well-run festival into one the whole community trusts.',
        hi: 'आखिरी कदम न छोड़ें — हिसाब प्रकाशित करना ही वह चीज़ है जो अच्छी तरह हुए त्योहार को पूरे समुदाय के भरोसे वाले त्योहार में बदलती है।',
        bn: 'শেষ ধাপটি বাদ দেবেন না — হিসাব প্রকাশই সেই জিনিস যা সুন্দরভাবে হওয়া উৎসবকে পুরো সম্প্রদায়ের আস্থার উৎসবে পরিণত করে।',
      },
      {
        en: 'Update the journey as work gets done, so the whole team can see where the festival stands without asking around.',
        hi: 'काम होते ही journey ताज़ा करें, ताकि पूरी team बिना पूछताछ के देख सके कि त्योहार कहाँ खड़ा है।',
        bn: 'কাজ হলেই journey হালনাগাদ করুন, যাতে পুরো team জিজ্ঞাসা না করেই দেখতে পারে উৎসব কোথায় দাঁড়িয়ে।',
      },
    ],
    capabilities: [
      {
        en: 'Follow a festival step by step, from planning to accounts',
        hi: 'किसी त्योहार को योजना से हिसाब तक कदम-दर-कदम आगे बढ़ाएँ',
        bn: 'একটি উৎসবকে পরিকল্পনা থেকে হিসাব পর্যন্ত ধাপে ধাপে এগিয়ে নিন',
      },
      {
        en: 'Keep the whole team on the same festival path',
        hi: 'पूरी team को एक ही त्योहार-मार्ग पर रखें',
        bn: 'পুরো team-কে একই উৎসব-পথে রাখুন',
      },
      {
        en: 'Publish the festival’s accounts at the end of the journey',
        hi: 'journey के अंत में त्योहार का हिसाब प्रकाशित करें',
        bn: 'journey-র শেষে উৎসবের হিসাব প্রকাশ করুন',
      },
    ],
    worksOffline: true,
  },
};
