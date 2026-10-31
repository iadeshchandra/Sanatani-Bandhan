import type { ManualEntry } from '../manualTypes';

export const MANUAL_D2A: Record<string, ManualEntry> = {
  'quick-chanda-pos': {
    whatItDoes: {
      en: 'A fast counter for receiving chanda and dakshina, where a donation is recorded in seconds and a receipt is given on the spot. It keeps the queue moving even on the busiest festival morning.',
      hi: 'चंदा और दक्षिणा लेने का तेज़ काउंटर, जहाँ दान कुछ ही पलों में दर्ज होता है और रसीद वहीं मिल जाती है। सबसे व्यस्त उत्सव की सुबह भी यहाँ भीड़ आगे बढ़ती रहती है।',
      bn: 'চাঁদা ও দক্ষিণা গ্রহণের দ্রুত কাউন্টার, যেখানে দান কয়েক মুহূর্তে লেখা হয় এবং রসিদ সঙ্গে সঙ্গে দেওয়া হয়। সবচেয়ে ব্যস্ত উৎসবের সকালেও এখানে ভিড় এগিয়ে চলে।'
    },
    realLifeExample: {
      en: 'On a Sunday morning a devotee family offers dakshina at the counter before aarti. The sevak enters the amount, hands over the printed receipt, and the family joins the aarti without waiting in a long line.',
      hi: 'रविवार की सुबह एक भक्त परिवार आरती से पहले काउंटर पर दक्षिणा देता है। सेवक राशि दर्ज करता है, छपी रसीद थमाता है, और परिवार लंबी कतार में खड़े हुए बिना आरती में शामिल हो जाता है।',
      bn: 'রবিবার সকালে একটি ভক্ত পরিবার আরতির আগে কাউন্টারে দক্ষিণা দেয়। সেবক পরিমাণটি লেখেন, ছাপানো রসিদ হাতে দেন, আর পরিবারটি লম্বা লাইনে না দাঁড়িয়ে আরতিতে যোগ দেয়।'
    },
    steps: [
      {
        en: 'Open the counter and enter the donation amount and the donor name.',
        hi: 'काउंटर खोलें और दान की राशि व दाता का नाम दर्ज करें।',
        bn: 'কাউন্টার খুলুন এবং দানের পরিমাণ ও দাতার নাম লিখুন।'
      },
      {
        en: 'Take the cash or payment and confirm the entry before printing.',
        hi: 'नकद या भुगतान लें और छापने से पहले प्रविष्टि की पुष्टि करें।',
        bn: 'নগদ বা পেমেন্ট নিন এবং ছাপানোর আগে এন্ট্রিটি নিশ্চিত করুন।'
      },
      {
        en: 'Print the receipt and hand it to the donor with thanks.',
        hi: 'रसीद छापें और धन्यवाद सहित दाता को दें।',
        bn: 'রসিদ ছাপান এবং ধন্যবাদ জানিয়ে দাতাকে দিন।'
      },
      {
        en: 'At closing, match the counter total with the cash in hand.',
        hi: 'बंद करते समय काउंटर के कुल योग का हाथ की नकदी से मिलान करें।',
        bn: 'বন্ধ করার সময় কাউন্টারের মোট হিসাব হাতে থাকা নগদের সঙ্গে মিলিয়ে নিন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not let the receipt wait till later — give it at the moment the donation is received.',
        hi: 'रसीद बाद के लिए न टालें — दान मिलते ही उसी समय रसीद दें।',
        bn: 'রসিদ পরে দেওয়ার জন্য ফেলে রাখবেন না — দান পাওয়ার মুহূর্তেই রসিদ দিন।'
      },
      {
        en: 'Count the cash with a second person at closing, never alone and never from memory.',
        hi: 'बंद करते समय नकदी दूसरे व्यक्ति के साथ गिनें, कभी अकेले और कभी याद से नहीं।',
        bn: 'বন্ধ করার সময় নগদ দ্বিতীয় ব্যক্তির সঙ্গে গুনুন, কখনো একা বা স্মৃতি থেকে নয়।'
      },
      {
        en: 'If an amount is entered wrong, correct it openly the same day instead of adjusting silently.',
        hi: 'यदि राशि ग़लत दर्ज हो जाए तो उसे चुपचाप समायोजित करने के बजाय उसी दिन खुलकर सुधारें।',
        bn: 'যদি পরিমাণ ভুল লেখা হয়, তাহলে নীরবে মেলানোর বদলে একই দিনে খোলাখুলি সংশোধন করুন।'
      }
    ],
    capabilities: [
      {
        en: 'Record counter donations in seconds',
        hi: 'कुछ पलों में काउंटर दान दर्ज करें',
        bn: 'কয়েক মুহূর্তে কাউন্টারের দান লিখুন'
      },
      {
        en: 'Give an instant printed receipt',
        hi: 'तुरंत छपी रसीद दें',
        bn: 'সঙ্গে সঙ্গে ছাপানো রসিদ দিন'
      },
      {
        en: 'See the day total at the counter',
        hi: 'काउंटर पर दिन का कुल योग देखें',
        bn: 'কাউন্টারে দিনের মোট হিসাব দেখুন'
      },
      {
        en: 'Keep counter collections ready for the Treasury',
        hi: 'काउंटर संग्रह को कोषागार के लिए तैयार रखें',
        bn: 'কাউন্টারের সংগ্রহ কোষাগারের জন্য প্রস্তুত রাখুন'
      }
    ],
    worksOffline: true
  },
  'treasury': {
    realLifeExample: {
      en: 'A small trust with no staff keeps every donation and expense here, so on Sunday evening the trustee opens one honest ledger. Nothing is hidden in loose notebooks, and any question can be answered from the same page.',
      hi: 'बिना कर्मचारी वाला एक छोटा ट्रस्ट हर दान और खर्च यहीं रखता है, इसलिए रविवार शाम ट्रस्टी एक ईमानदार बही खोलता है। कुछ भी बिखरी हुई कॉपियों में छिपा नहीं रहता, और हर सवाल का जवाब उसी पृष्ठ से मिलता है।',
      bn: 'কর্মীহীন একটি ছোট ট্রাস্ট সব দান ও খরচ এখানেই রাখে, তাই রবিবার সন্ধ্যায় ট্রাস্টি একটি সৎ খাতা খোলেন। কিছুই ছড়ানো খাতায় লুকিয়ে থাকে না, আর প্রতিটি প্রশ্নের উত্তর একই পৃষ্ঠা থেকে মেলে।'
    },
    commonMistakes: [
      {
        en: 'Do not keep donations in one notebook and expenses in another — keep one ledger and reconcile it often.',
        hi: 'दान एक कॉपी में और खर्च दूसरी में न रखें — एक ही बही रखें और उसका बार-बार मिलान करें।',
        bn: 'দান এক খাতায় আর খরচ অন্য খাতায় রাখবেন না — একটি খাতাই রাখুন এবং ঘন ঘন মিলিয়ে নিন।'
      },
      {
        en: 'Attach the memo or bill photo to every expense, so the reason for the payment is never in doubt later.',
        hi: 'हर खर्च के साथ मेमो या बिल की फोटो जोड़ें, ताकि बाद में भुगतान का कारण कभी संदेह में न रहे।',
        bn: 'প্রতিটি খরচের সঙ্গে মেমো বা বিলের ছবি জুড়ুন, যাতে পরে পেমেন্টের কারণ নিয়ে কখনো সন্দেহ না থাকে।'
      },
      {
        en: 'Never edit an old entry quietly — note the correction clearly so the audit trail stays honest.',
        hi: 'पुरानी प्रविष्टि को कभी चुपचाप न बदलें — सुधार स्पष्ट रूप से लिखें ताकि ऑडिट का क्रम ईमानदार रहे।',
        bn: 'পুরনো এন্ট্রি কখনো নীরবে বদলাবেন না — সংশোধন স্পষ্টভাবে লিখুন যাতে নিরীক্ষার ধারাটি সৎ থাকে।'
      }
    ],
    capabilities: [
      {
        en: 'Keep donations, expenses and hundi collections in one ledger',
        hi: 'दान, खर्च और हुंडी संग्रह एक ही बही में रखें',
        bn: 'দান, খরচ ও হুন্ডি সংগ্রহ একই খাতায় রাখুন'
      },
      {
        en: 'Give proper receipts for donations',
        hi: 'दान के लिए उचित रसीद दें',
        bn: 'দানের জন্য যথাযথ রসিদ দিন'
      },
      {
        en: 'See the true balance at a glance',
        hi: 'एक नज़र में सही शेष राशि देखें',
        bn: 'এক নজরে সঠিক ব্যালান্স দেখুন'
      },
      {
        en: 'Keep a clear trail for every entry',
        hi: 'हर प्रविष्टि के लिए स्पष्ट क्रम रखें',
        bn: 'প্রতিটি এন্ট্রির জন্য স্পষ্ট ধারা রাখুন'
      }
    ],
    worksOffline: true
  },
  'hundi-audit': {
    whatItDoes: {
      en: 'A careful way to open the hundi and golak with two custodians together and record the count in a tamper-proof way. What was found, who counted it, and when — all of it is written down with reverence.',
      hi: 'हुंडी और गोलक को दो संरक्षकों के साथ मिलकर खोलने और गिनती को छेड़छाड़-रहित ढंग से दर्ज करने का सावधान तरीका। क्या मिला, किसने गिना और कब — यह सब श्रद्धा के साथ लिखा जाता है।',
      bn: 'দুই তত্ত্বাবধায়ক একসঙ্গে হুন্ডি ও গোলক খোলা এবং গণনাটি অপরিবর্তনীয়ভাবে লেখার যত্নশীল পদ্ধতি। কী পাওয়া গেল, কে গুনলেন এবং কখন — সবই শ্রদ্ধার সঙ্গে লেখা থাকে।'
    },
    realLifeExample: {
      en: 'When the hundi is opened on Sunday evening, two volunteers count together at the same table. The total is recorded in both their presence, so no one ever carries a doubt alone.',
      hi: 'जब रविवार शाम हुंडी खोली जाती है, तो दो स्वयंसेवक एक ही मेज़ पर साथ बैठकर गिनते हैं। कुल राशि दोनों की उपस्थिति में दर्ज होती है, इसलिए किसी को अकेले संदेह नहीं ढोना पड़ता।',
      bn: 'রবিবার সন্ধ্যায় হুন্ডি খোলা হলে ২ জন স্বেচ্ছাসেবক একই টেবিলে একসঙ্গে গোনেন। মোট হিসাব ২ জনের উপস্থিতিতেই লেখা হয়, তাই কাউকে একা সন্দেহ বইতে হয় না।'
    },
    steps: [
      {
        en: 'Open the hundi only when both custodians are present together.',
        hi: 'हुंडी तभी खोलें जब दोनों संरक्षक एक साथ उपस्थित हों।',
        bn: '২ জন তত্ত্বাবধায়ক একসঙ্গে উপস্থিত থাকলেই হুন্ডি খুলুন।'
      },
      {
        en: 'Count the notes and coins together and agree on the total aloud.',
        hi: 'नोट और सिक्के साथ गिनें और कुल राशि पर ज़ोर से सहमत हों।',
        bn: 'নোট ও কয়েন একসঙ্গে গুনুন এবং মোট হিসাবে জোরে সম্মত হোন।'
      },
      {
        en: 'Record the count with the date and the names of both custodians.',
        hi: 'गिनती को तारीख़ और दोनों संरक्षकों के नाम के साथ दर्ज करें।',
        bn: 'তারিখ ও ২ জন তত্ত্বাবধায়কের নামসহ গণনাটি লিখুন।'
      },
      {
        en: 'Hand the counted amount onward for safe custody the same day.',
        hi: 'गिनी हुई राशि उसी दिन सुरक्षित अभिरक्षा के लिए आगे सौंपें।',
        bn: 'গোনা অর্থ একই দিনে নিরাপদ হেফাজতের জন্য এগিয়ে দিন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Never open or count the hundi alone, even when the amount looks small.',
        hi: 'हुंडी कभी अकेले न खोलें और न गिनें, भले ही राशि छोटी लगे।',
        bn: 'হুন্ডি কখনো একা খুলবেন না বা গুনবেন না, পরিমাণ ছোট মনে হলেও নয়।'
      },
      {
        en: 'Do not carry the count in your head till evening — write it down at the table itself.',
        hi: 'गिनती को शाम तक मन में न रखें — मेज़ पर ही उसी समय लिख लें।',
        bn: 'গণনা সন্ধ্যা পর্যন্ত মনে রাখবেন না — টেবিলেই তখনই লিখে ফেলুন।'
      },
      {
        en: 'If the count differs from expectation, record what was actually found, not what was expected.',
        hi: 'यदि गिनती अपेक्षा से अलग हो तो वही दर्ज करें जो वास्तव में मिला, न कि जो अपेक्षित था।',
        bn: 'গণনা প্রত্যাশার চেয়ে আলাদা হলে যা সত্যিই পাওয়া গেছে তাই লিখুন, যা প্রত্যাশিত ছিল তা নয়।'
      }
    ],
    capabilities: [
      {
        en: 'Open the hundi with two custodians',
        hi: 'दो संरक्षकों के साथ हुंडी खोलें',
        bn: '২ জন তত্ত্বাবধায়কের সঙ্গে হুন্ডি খুলুন'
      },
      {
        en: 'Record a tamper-proof count',
        hi: 'छेड़छाड़-रहित गिनती दर्ज करें',
        bn: 'অপরিবর্তনীয় গণনা লিখুন'
      },
      {
        en: 'Keep who counted and when, clearly noted',
        hi: 'किसने और कब गिना, स्पष्ट रूप से रखें',
        bn: 'কে ও কখন গুনেছেন, স্পষ্টভাবে রাখুন'
      }
    ],
    worksOffline: true
  },
  'cash-custody': {
    whatItDoes: {
      en: 'The chain of custody for cash, from hundi to bank — who held it, who counted it, and who handed it on. With dual custody and maker-checker counting, every handover leaves a clear, tamper-evident record.',
      hi: 'नकदी की अभिरक्षा-श्रृंखला, हुंडी से बैंक तक — किसके पास रही, किसने गिनी और किसने आगे सौंपी। दोहरी अभिरक्षा और बनाने-जाँचने वाली गिनती से हर हस्तांतरण का स्पष्ट, छेड़छाड़-साक्ष्य रिकॉर्ड रहता है।',
      bn: 'হুন্ডি থেকে ব্যাংক পর্যন্ত নগদের হেফাজতের শৃঙ্খল — কার কাছে ছিল, কে গুনেছেন এবং কে এগিয়ে দিয়েছেন। দ্বৈত হেফাজত ও তৈরি-যাচাই গণনায় প্রতিটি হস্তান্তরের স্পষ্ট, প্রমাণযুক্ত নথি থাকে।'
    },
    realLifeExample: {
      en: 'After the Sunday count, one sevak seals the cash and another carries it to the bank on Monday morning. Each handover is noted, so the money is never in one pair of hands without a witness.',
      hi: 'रविवार की गिनती के बाद एक सेवक नकदी सील करता है और दूसरा सोमवार सुबह उसे बैंक ले जाता है। हर हस्तांतरण दर्ज होता है, इसलिए धन कभी बिना गवाह के एक ही हाथ में नहीं रहता।',
      bn: 'রবিবারের গণনার পর একজন সেবক নগদ সিল করেন এবং আরেকজন সোমবার সকালে তা ব্যাংকে নিয়ে যান। প্রতিটি হস্তান্তর লেখা হয়, তাই অর্থ কখনো সাক্ষী ছাড়া এক হাতে থাকে না।'
    },
    steps: [
      {
        en: 'Seal the counted cash in the presence of the second custodian.',
        hi: 'गिनी हुई नकदी दूसरे संरक्षक की उपस्थिति में सील करें।',
        bn: 'গোনা নগদ দ্বিতীয় তত্ত্বাবধায়কের উপস্থিতিতে সিল করুন।'
      },
      {
        en: 'Record who is holding the cash and for what purpose.',
        hi: 'दर्ज करें कि नकदी किसके पास है और किस उद्देश्य से है।',
        bn: 'কে নগদ রাখছেন এবং কী উদ্দেশ্যে, তা লিখুন।'
      },
      {
        en: 'Note every handover as it happens, with both names.',
        hi: 'हर हस्तांतरण होते ही दोनों नामों के साथ दर्ज करें।',
        bn: 'প্রতিটি হস্তান্তর হওয়ার সঙ্গে সঙ্গে ২ জনের নামসহ লিখুন।'
      },
      {
        en: 'Close the chain when the bank deposit is done and noted.',
        hi: 'बैंक जमा हो जाने और दर्ज हो जाने पर श्रृंखला बंद करें।',
        bn: 'ব্যাংকে জমা হয়ে লেখা হলে শৃঙ্খলটি বন্ধ করুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not keep hundi cash at home overnight — move it to safe custody the same day.',
        hi: 'हुंडी की नकदी रात भर घर पर न रखें — उसी दिन सुरक्षित अभिरक्षा में पहुँचाएँ।',
        bn: 'হুন্ডির নগদ রাতভর বাড়িতে রাখবেন না — একই দিনে নিরাপদ হেফাজতে পৌঁছে দিন।'
      },
      {
        en: 'Never skip a handover note because you trust the person — the note protects the trusted person too.',
        hi: 'भरोसे के कारण हस्तांतरण की प्रविष्टि कभी न छोड़ें — प्रविष्टि भरोसेमंद व्यक्ति की भी रक्षा करती है।',
        bn: 'বিশ্বাসের কারণে হস্তান্তরের নোট কখনো বাদ দেবেন না — নোটটি বিশ্বস্ত ব্যক্তিকেও রক্ষা করে।'
      },
      {
        en: 'Keep the maker and the checker different people for every count.',
        hi: 'हर गिनती के लिए बनाने वाला और जाँचने वाला अलग-अलग व्यक्ति रखें।',
        bn: 'প্রতিটি গণনার জন্য প্রস্তুতকারী ও যাচাইকারী আলাদা ব্যক্তি রাখুন।'
      }
    ],
    capabilities: [
      {
        en: 'Follow cash from hundi to bank',
        hi: 'हुंडी से बैंक तक नकदी का पता रखें',
        bn: 'হুন্ডি থেকে ব্যাংক পর্যন্ত নগদের হদিস রাখুন'
      },
      {
        en: 'Keep dual-custody openings',
        hi: 'दोहरी अभिरक्षा में खोलना रखें',
        bn: 'দ্বৈত হেফাজতে খোলা বজায় রাখুন'
      },
      {
        en: 'Keep maker-checker counting',
        hi: 'बनाने-जाँचने वाली गिनती रखें',
        bn: 'তৈরি-যাচাই গণনা বজায় রাখুন'
      },
      {
        en: 'Keep a tamper-evident custody log',
        hi: 'छेड़छाड़-साक्ष्य अभिरक्षा लॉग रखें',
        bn: 'প্রমাণযুক্ত হেফাজত লগ রাখুন'
      }
    ],
    worksOffline: true
  },
  'ratna-bhandar': {
    whatItDoes: {
      en: 'A guarded record of deity ornaments and bullion kept in the vault, handled with dual-PIN discipline. Every item is listed with care, so what is sacred is also safe.',
      hi: 'तिजोरी में रखे देव आभूषणों और बहुमूल्य धातु का संरक्षित अभिलेख, दोहरे PIN अनुशासन के साथ संभाला गया। हर वस्तु सावधानी से सूचीबद्ध है, ताकि जो पवित्र है वह सुरक्षित भी रहे।',
      bn: 'ভল্টে রাখা দেব-অলংকার ও মূল্যবান ধাতুর সুরক্ষিত নথি, দ্বৈত পিন শৃঙ্খলায় সামলানো। প্রতিটি জিনিস যত্নে তালিকাভুক্ত, যাতে যা পবিত্র তা নিরাপদও থাকে।'
    },
    realLifeExample: {
      en: 'Before a festival, the trustee and the accountant open the vault together to bring out the deity ornaments for abhishek. Each piece taken out and returned is noted, so nothing sacred is ever unaccounted for.',
      hi: 'उत्सव से पहले ट्रस्टी और लेखाकार साथ मिलकर तिजोरी खोलते हैं और अभिषेक के लिए देव आभूषण निकालते हैं। निकाली और लौटाई गई हर वस्तु दर्ज होती है, इसलिए कुछ भी पवित्र कभी बिना हिसाब के नहीं रहता।',
      bn: 'উৎসবের আগে ট্রাস্টি ও হিসাবরক্ষক একসঙ্গে ভল্ট খুলে অভিষেকের জন্য দেব-অলংকার বের করেন। বের করা ও ফেরত দেওয়া প্রতিটি জিনিস লেখা হয়, তাই পবিত্র কিছুই কখনো হিসাবছাড়া থাকে না।'
    },
    steps: [
      {
        en: 'List each ornament and bullion item with its description and weight.',
        hi: 'हर आभूषण और बहुमूल्य वस्तु को उसके विवरण और वज़न के साथ सूचीबद्ध करें।',
        bn: 'প্রতিটি অলংকার ও মূল্যবান জিনিস তার বিবরণ ও ওজনসহ তালিকাভুক্ত করুন।'
      },
      {
        en: 'Open the vault only with both custodians present together.',
        hi: 'तिजोरी तभी खोलें जब दोनों संरक्षक साथ उपस्थित हों।',
        bn: '২ জন তত্ত্বাবধায়ক একসঙ্গে উপস্থিত থাকলেই ভল্ট খুলুন।'
      },
      {
        en: 'Note every item taken out and every item returned, on the same day.',
        hi: 'निकाली गई हर वस्तु और लौटाई गई हर वस्तु उसी दिन दर्ज करें।',
        bn: 'বের করা প্রতিটি জিনিস ও ফেরত দেওয়া প্রতিটি জিনিস একই দিনে লিখুন।'
      },
      {
        en: 'Check the vault list together at regular intervals.',
        hi: 'नियमित अंतराल पर तिजोरी की सूची साथ मिलकर जाँचें।',
        bn: 'নিয়মিত ব্যবধানে ভল্টের তালিকা একসঙ্গে যাচাই করুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Never share the vault PIN or keep it with one person alone.',
        hi: 'तिजोरी का PIN कभी साझा न करें और न ही उसे अकेले एक ही व्यक्ति के पास रखें।',
        bn: 'ভল্টের পিন কখনো শেয়ার করবেন না বা একা একজনের কাছেই রাখবেন না।'
      },
      {
        en: 'Do not take an ornament out for a festival without noting it first.',
        hi: 'उत्सव के लिए कोई आभूषण बिना पहले दर्ज किए न निकालें।',
        bn: 'উৎসবের জন্য আগে না লিখে কোনো অলংকার বের করবেন না।'
      },
      {
        en: 'Photograph each item when it is listed, so its identity is never in doubt.',
        hi: 'सूचीबद्ध करते समय हर वस्तु की फोटो लें, ताकि उसकी पहचान कभी संदेह में न रहे।',
        bn: 'তালিকাভুক্ত করার সময় প্রতিটি জিনিসের ছবি তুলুন, যাতে তার পরিচয় নিয়ে কখনো সন্দেহ না থাকে।'
      }
    ],
    capabilities: [
      {
        en: 'List deity ornaments and bullion with care',
        hi: 'देव आभूषण और बहुमूल्य धातु सावधानी से सूचीबद्ध करें',
        bn: 'দেব-অলংকার ও মূল্যবান ধাতু যত্নে তালিকাভুক্ত করুন'
      },
      {
        en: 'Keep dual-PIN vault discipline',
        hi: 'दोहरे PIN वाली तिजोरी अनुशासन रखें',
        bn: 'দ্বৈত পিনের ভল্ট শৃঙ্খলা বজায় রাখুন'
      },
      {
        en: 'Note items taken out and returned',
        hi: 'निकाली और लौटाई गई वस्तुएँ दर्ज करें',
        bn: 'বের করা ও ফেরত দেওয়া জিনিস লিখুন'
      }
    ],
    worksOffline: true
  },
  'taxReceipts': {
    whatItDoes: {
      en: 'Here you prepare 80G and 12A tax certificates for donors, so their giving is honoured with the right document. A certificate that once took hours of searching can be made in one careful sitting.',
      hi: 'यहाँ आप दाताओं के लिए 80G और 12A कर प्रमाणपत्र तैयार करते हैं, ताकि उनके दान को सही दस्तावेज़ से सम्मान मिले। जो प्रमाणपत्र कभी घंटों की खोज लेता था, वह एक सावधान बैठक में बन सकता है।',
      bn: 'এখানে আপনি দাতাদের জন্য ৮০জি ও ১২এ কর সার্টিফিকেট তৈরি করেন, যাতে তাঁদের দান সঠিক নথিতে সম্মান পায়। যে সার্টিফিকেট একসময় ঘণ্টার খোঁজ নিত, তা এক যত্নশীল বসাতেই তৈরি হতে পারে।'
    },
    realLifeExample: {
      en: 'A devotee family that gave dakshina through the year asks for their 80G certificate before filing their return. The accountant finds their donations together in one place and gives the certificate without a week of searching old books.',
      hi: 'एक भक्त परिवार जिसने पूरे वर्ष दक्षिणा दी, अपना रिटर्न भरने से पहले 80G प्रमाणपत्र माँगता है। लेखाकार उनके दान एक ही जगह एक साथ पाता है और पुरानी बहियों में सप्ताह भर खोजे बिना प्रमाणपत्र दे देता है।',
      bn: 'একটি ভক্ত পরিবার যারা সারা বছর দক্ষিণা দিয়েছে, রিটার্ন জমার আগে তাদের ৮০জি সার্টিফিকেট চায়। হিসাবরক্ষক তাদের দান এক জায়গায় একসঙ্গে পান এবং পুরনো খাতায় ৭ দিন খোঁজা ছাড়াই সার্টিফিকেট দেন।'
    },
    steps: [
      {
        en: 'Find the donor and check their donations for the year.',
        hi: 'दाता को खोजें और वर्ष भर के उनके दान जाँचें।',
        bn: 'দাতাকে খুঁজুন এবং বছরের জন্য তাঁর দান যাচাই করুন।'
      },
      {
        en: 'Confirm the donor details exactly as they should appear on the certificate.',
        hi: 'दाता के विवरण ठीक वैसे ही सुनिश्चित करें जैसे वे प्रमाणपत्र पर आने चाहिए।',
        bn: 'দাতার বিবরণ ঠিক যেমন সার্টিফিকেটে আসা উচিত তেমনই নিশ্চিত করুন।'
      },
      {
        en: 'Prepare the 80G certificate and check the amount once more.',
        hi: '80G प्रमाणपत्र तैयार करें और राशि एक बार फिर जाँचें।',
        bn: '৮০জি সার্টিফিকেট তৈরি করুন এবং পরিমাণ আরও একবার যাচাই করুন।'
      },
      {
        en: 'Give the certificate to the donor and keep its record safely.',
        hi: 'प्रमाणपत्र दाता को दें और उसका अभिलेख सुरक्षित रखें।',
        bn: 'সার্টিফিকেট দাতাকে দিন এবং তার নথি নিরাপদে রাখুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'An 80G receipt number once issued is never reused — if a certificate is cancelled, keep the number retired.',
        hi: 'एक बार जारी किया गया 80G रसीद नंबर कभी दोबारा उपयोग नहीं होता — यदि प्रमाणपत्र रद्द हो तो वह नंबर सेवानिवृत्त ही रखें।',
        bn: 'একবার দেওয়া ৮০জি রসিদ নম্বর কখনো পুনরায় ব্যবহার হয় না — সার্টিফিকেট বাতিল হলেও সেই নম্বর অবসরপ্রাপ্তই রাখুন।'
      },
      {
        en: 'Do not issue a certificate for a donation that is not yet recorded and received.',
        hi: 'ऐसे दान के लिए प्रमाणपत्र न दें जो अभी दर्ज और प्राप्त न हुआ हो।',
        bn: 'যে দান এখনো লেখা ও পাওয়া হয়নি তার জন্য সার্টিফিকেট দেবেন না।'
      },
      {
        en: 'Check the donor name and details letter by letter — a small spelling error creates a big problem at filing time.',
        hi: 'दाता का नाम और विवरण अक्षर-दर-अक्षर जाँचें — छोटी वर्तनी की भूल फाइलिंग के समय बड़ी समस्या बनती है।',
        bn: 'দাতার নাম ও বিবরণ অক্ষরে অক্ষরে যাচাই করুন — ছোট বানান ভুল জমার সময় বড় সমস্যা তৈরি করে।'
      }
    ],
    capabilities: [
      {
        en: 'Prepare 80G and 12A certificates for donors',
        hi: 'दाताओं के लिए 80G और 12A प्रमाणपत्र तैयार करें',
        bn: 'দাতাদের জন্য ৮০জি ও ১২এ সার্টিফিকেট তৈরি করুন'
      },
      {
        en: 'Find a donor donations together for the year',
        hi: 'एक दाता के वर्ष भर के दान एक साथ खोजें',
        bn: 'একজন দাতার বছরের দান একসঙ্গে খুঁজুন'
      },
      {
        en: 'Keep a safe record of every certificate given',
        hi: 'दिए गए हर प्रमाणपत्र का सुरक्षित अभिलेख रखें',
        bn: 'দেওয়া প্রতিটি সার্টিফিকেটের নিরাপদ নথি রাখুন'
      }
    ],
    worksOffline: true
  },
  'form10bd': {
    whatItDoes: {
      en: 'This desk helps you prepare the yearly Form 10BD donation statement for CBDT filing, correctly and on time. Donations gathered through the year come together here, so filing is not a last-week panic.',
      hi: 'यह डेस्क आपको CBDT फाइलिंग के लिए वार्षिक Form 10BD दान विवरण सही ढंग से और समय पर तैयार करने में मदद करता है। वर्ष भर जुटाए गए दान यहीं एकत्र होते हैं, इसलिए फाइलिंग अंतिम सप्ताह की घबराहट नहीं बनती।',
      bn: 'এই ডেস্ক আপনাকে সিবিডিটি জমার জন্য বার্ষিক ফর্ম ১০বিডি দান বিবরণী সঠিকভাবে ও সময়মতো তৈরি করতে সাহায্য করে। সারা বছরের দান এখানে একত্র হয়, তাই জমা দেওয়া শেষ সপ্তাহের তাড়াহুড়ো হয় না।'
    },
    realLifeExample: {
      en: 'A small trust with no staff dreads the yearly filing because donor details live in three notebooks. With donations kept together here, the trustee prepares the statement calmly and the filing is done before the last date.',
      hi: 'बिना कर्मचारी वाला एक छोटा ट्रस्ट वार्षिक फाइलिंग से घबराता है क्योंकि दाताओं के विवरण तीन कॉपियों में रहते हैं। दान यहाँ एक साथ रहने से ट्रस्टी शांति से विवरण तैयार करता है और फाइलिंग अंतिम तिथि से पहले हो जाती है।',
      bn: 'কর্মীহীন একটি ছোট ট্রাস্ট বার্ষিক জমা নিয়ে ভয় পায় কারণ দাতাদের বিবরণ ৩টি খাতায় থাকে। দান এখানে একসঙ্গে থাকায় ট্রাস্টি শান্তভাবে বিবরণী তৈরি করেন এবং শেষ তারিখের আগেই জমা হয়ে যায়।'
    },
    steps: [
      {
        en: 'Review all donations recorded for the filing year.',
        hi: 'फाइलिंग वर्ष के लिए दर्ज सभी दानों की समीक्षा करें।',
        bn: 'জমার বছরের জন্য লেখা সব দান পর্যালোচনা করুন।'
      },
      {
        en: 'Check that every donor detail needed for the statement is complete.',
        hi: 'जाँचें कि विवरण के लिए आवश्यक हर दाता विवरण पूर्ण है।',
        bn: 'বিবরণীর জন্য প্রয়োজনীয় প্রতিটি দাতার বিবরণ সম্পূর্ণ কিনা যাচাই করুন।'
      },
      {
        en: 'Prepare the Form 10BD statement from the reviewed donations.',
        hi: 'समीक्षित दानों से Form 10BD विवरण तैयार करें।',
        bn: 'পর্যালোচিত দান থেকে ফর্ম ১০বিডি বিবরণী তৈরি করুন।'
      },
      {
        en: 'Keep a copy of what was filed, with the filing date noted.',
        hi: 'जो फाइल किया गया उसकी एक प्रति फाइलिंग तिथि सहित रखें।',
        bn: 'যা জমা দেওয়া হয়েছে তার একটি কপি জমার তারিখসহ রাখুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not wait for the last week — missing donor details are hardest to find under time pressure.',
        hi: 'अंतिम सप्ताह की प्रतीक्षा न करें — समय के दबाव में छूटे हुए दाता विवरण खोजना सबसे कठिन होता है।',
        bn: 'শেষ সপ্তাহ পর্যন্ত অপেক্ষা করবেন না — সময়ের চাপে বাদ পড়া দাতার বিবরণ খুঁজে পাওয়া সবচেয়ে কঠিন।'
      },
      {
        en: 'Never file a statement with a donation amount you have not matched to the ledger.',
        hi: 'ऐसी दान राशि के साथ विवरण कभी फाइल न करें जिसका बही से मिलान न हुआ हो।',
        bn: 'যে দানের পরিমাণ খাতার সঙ্গে মেলেনি তা দিয়ে কখনো বিবরণী জমা দেবেন না।'
      },
      {
        en: 'Keep the filed copy and the working copy separate, so no one edits the filed truth by mistake.',
        hi: 'फाइल की गई प्रति और कार्य प्रति अलग रखें, ताकि कोई भूल से फाइल किए गए सत्य को न बदल दे।',
        bn: 'জমা দেওয়া কপি ও কাজের কপি আলাদা রাখুন, যাতে কেউ ভুল করে জমা দেওয়া সত্য বদলে না ফেলে।'
      }
    ],
    capabilities: [
      {
        en: 'Prepare the yearly Form 10BD donation statement',
        hi: 'वार्षिक Form 10BD दान विवरण तैयार करें',
        bn: 'বার্ষিক ফর্ম ১০বিডি দান বিবরণী তৈরি করুন'
      },
      {
        en: 'Bring the year donations together in one place',
        hi: 'वर्ष भर के दान एक ही जगह लाएँ',
        bn: 'বছরের দান এক জায়গায় আনুন'
      },
      {
        en: 'Keep a record of what was filed and when',
        hi: 'क्या और कब फाइल हुआ, उसका अभिलेख रखें',
        bn: 'কী ও কখন জমা হয়েছে তার নথি রাখুন'
      }
    ],
    worksOffline: true
  },
  'tally-export': {
    whatItDoes: {
      en: 'This desk prepares your books as clean Tally Prime XML that you can hand to your CA. The year accounts travel as they are, with no re-typing and no fresh errors.',
      hi: 'यह डेस्क आपकी बहियों को साफ़ Tally Prime XML के रूप में तैयार करता है जिसे आप अपने CA को सौंप सकते हैं। वर्ष भर के हिसाब जैसे हैं वैसे ही जाते हैं, बिना दोबारा टाइप किए और बिना नई भूलों के।',
      bn: 'এই ডেস্ক আপনার খাতাগুলিকে পরিষ্কার ট্যালি প্রাইম এক্সএমএল হিসেবে তৈরি করে যা আপনি আপনার সিএ-কে দিতে পারেন। বছরের হিসাব যেমন আছে তেমনই যায়, পুনরায় টাইপ করা ছাড়া এবং নতুন ভুল ছাড়া।'
    },
    realLifeExample: {
      en: 'At year-end, the accountant of a small trust used to re-type twelve months of entries for the CA. Now the books are handed over as one clean file, and the CA begins the real work on the first day itself.',
      hi: 'वर्ष के अंत में एक छोटे ट्रस्ट का लेखाकार CA के लिए बारह महीनों की प्रविष्टियाँ दोबारा टाइप करता था। अब बहियाँ एक साफ़ फाइल के रूप में सौंपी जाती हैं, और CA पहले दिन से ही असली काम शुरू करता है।',
      bn: 'বছরের শেষে একটি ছোট ট্রাস্টের হিসাবরক্ষক সিএ-র জন্য ১২ মাসের এন্ট্রি পুনরায় টাইপ করতেন। এখন খাতা একটি পরিষ্কার ফাইল হিসেবে দেওয়া হয়, এবং সিএ প্রথম দিন থেকেই আসল কাজ শুরু করেন।'
    },
    steps: [
      {
        en: 'Choose the period whose books you want to hand over.',
        hi: 'वह अवधि चुनें जिसकी बहियाँ आप सौंपना चाहते हैं।',
        bn: 'যে সময়ের খাতা আপনি দিতে চান তা বেছে নিন।'
      },
      {
        en: 'Review the totals once before preparing the export.',
        hi: 'निर्यात तैयार करने से पहले कुल योग की एक बार समीक्षा करें।',
        bn: 'এক্সপোর্ট তৈরি করার আগে মোট হিসাব একবার পর্যালোচনা করুন।'
      },
      {
        en: 'Prepare the Tally Prime XML file for the chosen period.',
        hi: 'चुनी हुई अवधि के लिए Tally Prime XML फाइल तैयार करें।',
        bn: 'বেছে নেওয়া সময়ের জন্য ট্যালি প্রাইম এক্সএমএল ফাইল তৈরি করুন।'
      },
      {
        en: 'Hand the file to your CA and note the date you shared it.',
        hi: 'फाइल अपने CA को सौंपें और साझा करने की तिथि दर्ज करें।',
        bn: 'ফাইলটি আপনার সিএ-কে দিন এবং শেয়ার করার তারিখ লিখুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not export before reconciling the period — errors exported are errors multiplied.',
        hi: 'अवधि का मिलान किए बिना निर्यात न करें — निर्यात की गई भूलें बढ़ती ही जाती हैं।',
        bn: 'সময়ের হিসাব না মিলিয়ে এক্সপোর্ট করবেন না — এক্সপোর্ট করা ভুল বাড়তেই থাকে।'
      },
      {
        en: 'Keep the exported file unchanged after sharing it, so your copy and the CA copy always match.',
        hi: 'साझा करने के बाद निर्यात की गई फाइल को अपरिवर्तित रखें, ताकि आपकी प्रति और CA की प्रति हमेशा मेल खाएँ।',
        bn: 'শেয়ার করার পর এক্সপোর্ট করা ফাইল অপরিবর্তিত রাখুন, যাতে আপনার কপি ও সিএ-র কপি সবসময় মেলে।'
      },
      {
        en: 'Note which period each export covers — two files with the same name cause real confusion.',
        hi: 'दर्ज करें कि प्रत्येक निर्यात किस अवधि का है — एक ही नाम की दो फाइलें वास्तविक भ्रम पैदा करती हैं।',
        bn: 'প্রতিটি এক্সপোর্ট কোন সময়ের তা লিখুন — একই নামের ২টি ফাইল সত্যিকারের বিভ্রান্তি তৈরি করে।'
      }
    ],
    capabilities: [
      {
        en: 'Prepare Tally Prime XML from your books',
        hi: 'अपनी बहियों से Tally Prime XML तैयार करें',
        bn: 'আপনার খাতা থেকে ট্যালি প্রাইম এক্সএমএল তৈরি করুন'
      },
      {
        en: 'Hand the CA a clean file with no re-typing',
        hi: 'CA को बिना दोबारा टाइप किए साफ़ फाइल सौंपें',
        bn: 'সিএ-কে পুনরায় টাইপ ছাড়া পরিষ্কার ফাইল দিন'
      },
      {
        en: 'Choose the exact period to export',
        hi: 'निर्यात के लिए ठीक अवधि चुनें',
        bn: 'এক্সপোর্টের জন্য সঠিক সময় বেছে নিন'
      }
    ],
    worksOffline: true
  },
  'campaigns': {
    whatItDoes: {
      en: 'Here you raise funds for nirman and sevas through open, trackable campaigns. Every devotee can see the goal, what has come in, and how the seva is moving forward.',
      hi: 'यहाँ आप निर्माण और सेवाओं के लिए खुले, पता-योग्य अभियानों के माध्यम से धन जुटाते हैं। हर भक्त लक्ष्य देख सकता है, कितना आया है और सेवा कैसे आगे बढ़ रही है।',
      bn: 'এখানে আপনি নির্মাণ ও সেবার জন্য উন্মুক্ত, অনুসরণযোগ্য প্রচারের মাধ্যমে অর্থ তোলেন। প্রতিটি ভক্ত লক্ষ্য দেখতে পারেন, কত এসেছে এবং সেবা কীভাবে এগোচ্ছে।'
    },
    realLifeExample: {
      en: 'A small trust starts a campaign for a new roof before the rains. Families near and far give dakshina towards it, watch the total grow week by week, and feel part of the nirman they helped build.',
      hi: 'एक छोटा ट्रस्ट वर्षा से पहले नई छत के लिए अभियान शुरू करता है। पास और दूर के परिवार इसके लिए दक्षिणा देते हैं, हर सप्ताह बढ़ते कुल को देखते हैं, और उस निर्माण का हिस्सा महसूस करते हैं जिसे बनाने में उन्होंने मदद की।',
      bn: 'একটি ছোট ট্রাস্ট বর্ষার আগে নতুন ছাদের জন্য প্রচার শুরু করে। কাছের ও দূরের পরিবার এর জন্য দক্ষিণা দেয়, প্রতি সপ্তাহে বাড়তে থাকা মোট দেখে, এবং যে নির্মাণ তৈরিতে তারা সাহায্য করেছে তার অংশ মনে করে।'
    },
    steps: [
      {
        en: 'Start a campaign with a clear goal and a clear purpose.',
        hi: 'स्पष्ट लक्ष्य और स्पष्ट उद्देश्य के साथ अभियान शुरू करें।',
        bn: 'স্পষ্ট লক্ষ্য ও স্পষ্ট উদ্দেশ্য নিয়ে প্রচার শুরু করুন।'
      },
      {
        en: 'Share the campaign with devotees in simple, honest words.',
        hi: 'अभियान को सरल, ईमानदार शब्दों में भक्तों के साथ साझा करें।',
        bn: 'প্রচারটি সহজ, সৎ কথায় ভক্তদের সঙ্গে শেয়ার করুন।'
      },
      {
        en: 'Record every donation against the campaign as it arrives.',
        hi: 'आने वाले हर दान को अभियान के विरुद्ध दर्ज करें।',
        bn: 'আসা প্রতিটি দান প্রচারের বিপরীতে লিখুন।'
      },
      {
        en: 'Share progress openly till the goal is reached and the work is shown.',
        hi: 'लक्ष्य पूरा होने और काम दिखाए जाने तक प्रगति खुलकर साझा करें।',
        bn: 'লক্ষ্য পূরণ ও কাজ দেখানো পর্যন্ত অগ্রগতি খোলাখুলি শেয়ার করুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not promise a completion date you cannot keep — trust grows from honest updates, not big promises.',
        hi: 'ऐसी पूर्णता तिथि का वादा न करें जो आप निभा न सकें — विश्वास ईमानदार जानकारी से बढ़ता है, बड़े वादों से नहीं।',
        bn: 'এমন সমাপ্তির তারিখের প্রতিশ্রুতি দেবেন না যা রাখতে পারবেন না — বিশ্বাস সৎ আপডেটে বাড়ে, বড় প্রতিশ্রুতিতে নয়।'
      },
      {
        en: 'Keep campaign money clearly separate in your records from daily expenses.',
        hi: 'अभियान के धन को अपने अभिलेखों में दैनिक खर्चों से स्पष्ट रूप से अलग रखें।',
        bn: 'প্রচারের অর্থ আপনার নথিতে দৈনন্দিন খরচ থেকে স্পষ্টভাবে আলাদা রাখুন।'
      },
      {
        en: 'Thank every donor, small or large — a campaign lives on gratitude as much as on money.',
        hi: 'हर दाता को धन्यवाद दें, छोटा हो या बड़ा — अभियान कृतज्ञता से उतना ही जीवित रहता है जितना धन से।',
        bn: 'প্রতিটি দাতাকে ধন্যবাদ দিন, ছোট হোক বা বড় — প্রচার অর্থের মতোই কৃতজ্ঞতায় বাঁচে।'
      }
    ],
    capabilities: [
      {
        en: 'Raise funds for nirman and sevas',
        hi: 'निर्माण और सेवाओं के लिए धन जुटाएँ',
        bn: 'নির্মাণ ও সেবার জন্য অর্থ তুলুন'
      },
      {
        en: 'Show the goal and progress openly',
        hi: 'लक्ष्य और प्रगति खुलकर दिखाएँ',
        bn: 'লক্ষ্য ও অগ্রগতি খোলাখুলি দেখান'
      },
      {
        en: 'Track every donation against its campaign',
        hi: 'हर दान को उसके अभियान के साथ जोड़कर रखें',
        bn: 'প্রতিটি দান তার প্রচারের সঙ্গে জুড়ে রাখুন'
      }
    ],
    worksOffline: true
  },
};
