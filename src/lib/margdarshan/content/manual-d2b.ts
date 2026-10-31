import type { ManualEntry } from '../manualTypes';

export const MANUAL_D2B: Record<string, ManualEntry> = {
  'karmaLedger': {
    whatItDoes: {
      en: 'The Seva Register honours every volunteer hour as punya, keeping a gentle merit ledger of who served, when, and in what seva. No act of seva, however small, is forgotten here.',
      hi: 'सेवा रजिस्टर हर स्वयंसेवक घंटे को पुण्य के रूप में सम्मान देता है, कौन कब और किस सेवा में लगा — इसका कोमल पुण्य-बही रखता है। यहाँ सेवा का कोई कार्य, कितना भी छोटा हो, भुलाया नहीं जाता।',
      bn: 'সেবা রেজিস্টার প্রতিটি স্বেচ্ছাসেবক ঘণ্টাকে পুণ্য হিসেবে সম্মান করে, কে কখন ও কোন সেবায় ছিলেন — তার কোমল পুণ্য-খাতা রাখে। এখানে সেবার কোনো কাজ, যত ছোটই হোক, ভোলা হয় না।'
    },
    realLifeExample: {
      en: 'An elderly devotee sweeps the courtyard every morning before anyone arrives. In the Seva Register her quiet seva is written with the same respect as the largest donation, and on the annual day she is thanked by name.',
      hi: 'एक वृद्ध भक्त हर सुबह किसी के आने से पहले आँगन में झाड़ू लगाती है। सेवा रजिस्टर में उसकी शांत सेवा सबसे बड़े दान के समान सम्मान से लिखी जाती है, और वार्षिक दिवस पर उसे नाम लेकर धन्यवाद दिया जाता है।',
      bn: 'একজন বয়স্ক ভক্ত প্রতিদিন সকালে কেউ আসার আগে উঠোন ঝাঁট দেন। সেবা রেজিস্টারে তাঁর নীরব সেবা সবচেয়ে বড় দানের মতোই সম্মানে লেখা হয়, এবং বার্ষিক দিনে তাঁকে নাম ধরে ধন্যবাদ জানানো হয়।'
    },
    steps: [
      {
        en: 'Note the volunteer name and the seva they offered.',
        hi: 'स्वयंसेवक का नाम और उन्होंने जो सेवा दी, वह दर्ज करें।',
        bn: 'স্বেচ্ছাসেবকের নাম ও তিনি যে সেবা দিয়েছেন তা লিখুন।'
      },
      {
        en: 'Record the date and the hours of seva given.',
        hi: 'सेवा की तारीख़ और दिए गए घंटे दर्ज करें।',
        bn: 'সেবার তারিখ ও দেওয়া ঘণ্টা লিখুন।'
      },
      {
        en: 'Keep the register updated each week, while the seva is fresh in memory.',
        hi: 'जब सेवा स्मृति में ताज़ा हो, हर सप्ताह रजिस्टर अद्यतन रखें।',
        bn: 'সেবা স্মৃতিতে তাজা থাকতে প্রতি সপ্তাহে রেজিস্টার হালনাগাদ রাখুন।'
      },
      {
        en: 'Use the register to thank and honour volunteers on special days.',
        hi: 'विशेष दिनों पर स्वयंसेवकों को धन्यवाद और सम्मान देने के लिए रजिस्टर का उपयोग करें।',
        bn: 'বিশেষ দিনে স্বেচ্ছাসেবকদের ধন্যবাদ ও সম্মান জানাতে রেজিস্টার ব্যবহার করুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not record only the big sevas — the daily, quiet seva deserves the same place.',
        hi: 'केवल बड़ी सेवाएँ दर्ज न करें — दैनिक, शांत सेवा को भी वही स्थान मिलना चाहिए।',
        bn: 'শুধু বড় সেবা লিখবেন না — দৈনন্দিন, নীরব সেবারও একই জায়গা প্রাপ্য।'
      },
      {
        en: 'Never turn the merit ledger into a competition between volunteers.',
        hi: 'पुण्य-बही को कभी स्वयंसेवकों के बीच प्रतियोगिता न बनाएँ।',
        bn: 'পুণ্য-খাতাকে কখনো স্বেচ্ছাসেবকদের মধ্যে প্রতিযোগিতা বানাবেন না।'
      },
      {
        en: 'Write the seva on the day it is done, not from memory at month-end.',
        hi: 'सेवा जिस दिन हुई उसी दिन लिखें, महीने के अंत में स्मृति से नहीं।',
        bn: 'সেবা যেদিন হয়েছে সেদিনই লিখুন, মাসের শেষে স্মৃতি থেকে নয়।'
      }
    ],
    capabilities: [
      {
        en: 'Record volunteer hours as seva',
        hi: 'स्वयंसेवक घंटों को सेवा के रूप में दर्ज करें',
        bn: 'স্বেচ্ছাসেবক ঘণ্টাকে সেবা হিসেবে লিখুন'
      },
      {
        en: 'Keep a merit ledger that honours seva',
        hi: 'सेवा का सम्मान करने वाला पुण्य-बही रखें',
        bn: 'সেবাকে সম্মান করা পুণ্য-খাতা রাখুন'
      },
      {
        en: 'Find who served in any period',
        hi: 'किसी भी अवधि में किसने सेवा दी, खोजें',
        bn: 'যেকোনো সময়ে কে সেবা দিয়েছেন খুঁজুন'
      }
    ],
    worksOffline: true
  },
  'assets': {
    whatItDoes: {
      en: 'A clear register of everything the institution owns, from sound systems to silver, with where each item is kept. When someone asks what we have and where it is, the answer is here.',
      hi: 'संस्था के स्वामित्व की हर वस्तु का स्पष्ट रजिस्टर, ध्वनि प्रणाली से लेकर चाँदी तक, हर वस्तु कहाँ रखी है इसके साथ। जब कोई पूछे कि हमारे पास क्या है और कहाँ है, तो उत्तर यहीं है।',
      bn: 'প্রতিষ্ঠানের মালিকানার প্রতিটি জিনিসের স্পষ্ট রেজিস্টার, সাউন্ড সিস্টেম থেকে রুপো পর্যন্ত, প্রতিটি জিনিস কোথায় রাখা আছে তাসহ। কেউ জিজ্ঞাসা করলে আমাদের কী আছে ও কোথায় আছে, উত্তর এখানেই আছে।'
    },
    realLifeExample: {
      en: 'Before the annual festival, a small trust needs its sound system, extra lights and silver plates at once. The trustee checks the register, sees where each item is kept, and nothing has to be bought again in a hurry.',
      hi: 'वार्षिक उत्सव से पहले एक छोटे ट्रस्ट को एक साथ ध्वनि प्रणाली, अतिरिक्त बत्तियाँ और चाँदी की थालियाँ चाहिए। ट्रस्टी रजिस्टर देखता है, हर वस्तु कहाँ रखी है जानता है, और कुछ भी जल्दबाज़ी में दोबारा नहीं खरीदना पड़ता।',
      bn: 'বার্ষিক উৎসবের আগে একটি ছোট ট্রাস্টের একসঙ্গে সাউন্ড সিস্টেম, অতিরিক্ত আলো ও রুপোর থালা দরকার। ট্রাস্টি রেজিস্টার দেখেন, প্রতিটি জিনিস কোথায় রাখা আছে জানেন, এবং তাড়াহুড়ো করে কিছুই আবার কিনতে হয় না।'
    },
    steps: [
      {
        en: 'List each asset with a simple name and where it is kept.',
        hi: 'हर संपत्ति को सरल नाम और वह कहाँ रखी है, इसके साथ सूचीबद्ध करें।',
        bn: 'প্রতিটি সম্পদ সহজ নাম ও কোথায় রাখা আছে তাসহ তালিকাভুক্ত করুন।'
      },
      {
        en: 'Add a photo of the item when you list it.',
        hi: 'सूचीबद्ध करते समय वस्तु की फोटो जोड़ें।',
        bn: 'তালিকাভুক্ত করার সময় জিনিসটির ছবি জুড়ুন।'
      },
      {
        en: 'Update the place whenever an item is moved or lent.',
        hi: 'जब भी कोई वस्तु हटाई या उधार दी जाए, उसका स्थान अद्यतन करें।',
        bn: 'যখনই কোনো জিনিস সরানো বা ধার দেওয়া হয়, তার জায়গা হালনাগাদ করুন।'
      },
      {
        en: 'Walk through the register once a year and verify each item in person.',
        hi: 'वर्ष में एक बार रजिस्टर देखकर हर वस्तु को स्वयं जाँचें।',
        bn: 'বছরে একবার রেজিস্টার ধরে প্রতিটি জিনিস নিজে যাচাই করুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not list an asset without its place — a register that cannot find the item helps no one.',
        hi: 'बिना स्थान के संपत्ति सूचीबद्ध न करें — जो रजिस्टर वस्तु खोज न सके, वह किसी के काम का नहीं।',
        bn: 'জায়গা ছাড়া সম্পদ তালিকাভুক্ত করবেন না — যে রেজিস্টার জিনিস খুঁজে পায় না তা কারো কাজে আসে না।'
      },
      {
        en: 'Note when an item is lent out and when it returns, every single time.',
        hi: 'हर बार दर्ज करें कि वस्तु कब उधार दी गई और कब लौटी।',
        bn: 'প্রতিবার লিখুন জিনিসটি কখন ধার দেওয়া হয়েছে ও কখন ফিরেছে।'
      },
      {
        en: 'Do not wait for something to be lost before listing it — list it the day it arrives.',
        hi: 'किसी वस्तु के खोने की प्रतीक्षा न करें — जिस दिन वह आए उसी दिन सूचीबद्ध करें।',
        bn: 'কিছু হারানোর জন্য অপেক্ষা করবেন না — যেদিন আসে সেদিনই তালিকাভুক্ত করুন।'
      }
    ],
    capabilities: [
      {
        en: 'Track every asset and where it is',
        hi: 'हर संपत्ति और उसका स्थान जानें',
        bn: 'প্রতিটি সম্পদ ও তার জায়গা জানুন'
      },
      {
        en: 'Include deity ornaments in the same care',
        hi: 'देव आभूषणों को उसी देखभाल में शामिल करें',
        bn: 'দেব-অলংকারকে একই যত্নে অন্তর্ভুক্ত করুন'
      },
      {
        en: 'Keep a photo with each listed item',
        hi: 'हर सूचीबद्ध वस्तु के साथ फोटो रखें',
        bn: 'প্রতিটি তালিকাভুক্ত জিনিসের সঙ্গে ছবি রাখুন'
      }
    ],
    worksOffline: true
  },
  'inventory': {
    realLifeExample: {
      en: 'Two days before a big utsava, the sevak in charge of the bhandara checks the store and sees ghee and camphor running low. Because the warning came early, everything is bought calmly and the festival is never at risk.',
      hi: 'बड़े उत्सव से दो दिन पहले भंडारा संभालने वाला सेवक भंडार देखता है और पाता है कि घी और कपूर कम हो रहे हैं। चेतावनी समय पर मिलने से सब कुछ शांति से खरीदा जाता है और उत्सव कभी जोखिम में नहीं पड़ता।',
      bn: 'বড় উৎসবের ২ দিন আগে ভান্ডারের দায়িত্বে থাকা সেবক ভান্ডার দেখে বোঝেন ঘি ও কর্পূর কমে আসছে। সতর্কতা আগেভাগে আসায় সবকিছু শান্তভাবে কেনা হয় এবং উৎসব কখনো ঝুঁকিতে পড়ে না।'
    },
    commonMistakes: [
      {
        en: 'Do not wait for the shelf to go empty before buying — festivals do not wait for the market.',
        hi: 'खरीदने के लिए ताक खाली होने की प्रतीक्षा न करें — उत्सव बाज़ार की प्रतीक्षा नहीं करते।',
        bn: 'কেনার জন্য তাক খালি হওয়া পর্যন্ত অপেক্ষা করবেন না — উৎসব বাজারের জন্য অপেক্ষা করে না।'
      },
      {
        en: 'Record what goes out for prasad and puja on the same day, not at the end of the week.',
        hi: 'प्रसाद और पूजा के लिए जो निकले उसे उसी दिन दर्ज करें, सप्ताह के अंत में नहीं।',
        bn: 'প্রসাদ ও পূজার জন্য যা বের হয় তা একই দিনে লিখুন, সপ্তাহের শেষে নয়।'
      },
      {
        en: 'Check expiry dates on stored food items regularly and use the oldest stock first.',
        hi: 'भंडारित खाद्य वस्तुओं की समाप्ति तिथियाँ नियमित जाँचें और सबसे पुराना भंडार पहले उपयोग करें।',
        bn: 'মজুত খাদ্য জিনিসের মেয়াদ শেষের তারিখ নিয়মিত যাচাই করুন এবং সবচেয়ে পুরনো মজুত আগে ব্যবহার করুন।'
      }
    ],
    capabilities: [
      {
        en: 'Keep stock of everything the store consumes',
        hi: 'भंडार की हर खपत वस्तु का भंडार रखें',
        bn: 'ভান্ডারের প্রতিটি খরচের জিনিসের মজুত রাখুন'
      },
      {
        en: 'Get warned before an item runs out',
        hi: 'किसी वस्तु के समाप्त होने से पहले चेतावनी पाएँ',
        bn: 'কোনো জিনিস শেষ হওয়ার আগেই সতর্কতা পান'
      },
      {
        en: 'Record stock taken out for festivals and daily seva',
        hi: 'उत्सवों और दैनिक सेवा के लिए निकाला गया भंडार दर्ज करें',
        bn: 'উৎসব ও দৈনন্দিন সেবার জন্য বের করা মজুত লিখুন'
      }
    ],
    worksOffline: true
  },
  'bhoomi': {
    whatItDoes: {
      en: 'A register of lands and property leases, with rent rolls, so no plot is forgotten and no lease date passes unseen. What the institution holds on paper is held here with the same care.',
      hi: 'भूमि और संपत्ति पट्टों का रजिस्टर, किराए की सूची के साथ, ताकि कोई भूखंड न भूले और कोई पट्टा तिथि अनदेखी न रह जाए। संस्था के पास कागज़ पर जो है, वह यहाँ उसी देखभाल से रखा जाता है।',
      bn: 'জমি ও সম্পত্তি ইজারার রেজিস্টার, ভাড়ার তালিকাসহ, যাতে কোনো প্লট ভোলা না হয় এবং কোনো ইজারার তারিখ অদেখা না যায়। প্রতিষ্ঠানের কাগজে যা আছে, তা এখানে একই যত্নে রাখা হয়।'
    },
    realLifeExample: {
      en: 'A small trust owns a small plot two villages away that no one has visited in years. Because the plot and its lease are listed here, the rent is collected on time and the land is never quietly lost.',
      hi: 'एक छोटे ट्रस्ट के पास दो गाँव दूर एक छोटा भूखंड है जहाँ वर्षों से कोई नहीं गया। भूखंड और उसका पट्टा यहाँ सूचीबद्ध होने से किराया समय पर वसूला जाता है और भूमि चुपचाप कभी खोती नहीं।',
      bn: 'একটি ছোট ট্রাস্টের ২ গ্রাম দূরে একটি ছোট প্লট আছে যেখানে বছরের পর বছর কেউ যায়নি। প্লট ও তার ইজারা এখানে তালিকাভুক্ত থাকায় ভাড়া সময়মতো আদায় হয় এবং জমি কখনো নীরবে হারিয়ে যায় না।'
    },
    steps: [
      {
        en: 'List each plot and property with its basic details.',
        hi: 'हर भूखंड और संपत्ति को उसके मूल विवरण के साथ सूचीबद्ध करें।',
        bn: 'প্রতিটি প্লট ও সম্পত্তি তার প্রাথমিক বিবরণসহ তালিকাভুক্ত করুন।'
      },
      {
        en: 'Add the lease terms and the rent due for each property.',
        hi: 'हर संपत्ति के लिए पट्टे की शर्तें और देय किराया जोड़ें।',
        bn: 'প্রতিটি সম্পত্তির জন্য ইজারার শর্ত ও প্রাপ্য ভাড়া জুড়ুন।'
      },
      {
        en: 'Record rent received against the rent roll as it comes in.',
        hi: 'आने वाले किराए को किराए की सूची के विरुद्ध दर्ज करें।',
        bn: 'আসা ভাড়া ভাড়ার তালিকার বিপরীতে লিখুন।'
      },
      {
        en: 'Review lease dates well before any lease is due to end.',
        hi: 'किसी पट्टे के समाप्त होने से काफी पहले पट्टा तिथियों की समीक्षा करें।',
        bn: 'কোনো ইজারা শেষ হওয়ার অনেক আগেই ইজারার তারিখ পর্যালোচনা করুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not rely on memory for lease end dates — write every date down where all trustees can see it.',
        hi: 'पट्टा समाप्ति तिथियों के लिए स्मृति पर निर्भर न रहें — हर तिथि वहाँ लिखें जहाँ सभी ट्रस्टी देख सकें।',
        bn: 'ইজারা শেষের তারিখের জন্য স্মৃতির উপর নির্ভর করবেন না — প্রতিটি তারিখ এমন জায়গায় লিখুন যেখানে সব ট্রাস্টি দেখতে পারেন।'
      },
      {
        en: 'Keep a copy of every lease paper with its record, not in a single person home.',
        hi: 'हर पट्टा कागज़ की प्रति उसके अभिलेख के साथ रखें, किसी एक व्यक्ति के घर पर नहीं।',
        bn: 'প্রতিটি ইজারা কাগজের কপি তার নথির সঙ্গে রাখুন, কোনো এক ব্যক্তির বাড়িতে নয়।'
      },
      {
        en: 'Record rent when it is received, not when it was promised.',
        hi: 'किराया तब दर्ज करें जब वह प्राप्त हो, तब नहीं जब उसका वादा किया गया था।',
        bn: 'ভাড়া যখন পাওয়া যায় তখন লিখুন, যখন প্রতিশ্রুতি দেওয়া হয়েছিল তখন নয়।'
      }
    ],
    capabilities: [
      {
        en: 'Manage lands and property leases together',
        hi: 'भूमि और संपत्ति पट्टों को एक साथ संभालें',
        bn: 'জমি ও সম্পত্তি ইজারা একসঙ্গে সামলান'
      },
      {
        en: 'Keep a rent roll for every property',
        hi: 'हर संपत्ति के लिए किराए की सूची रखें',
        bn: 'প্রতিটি সম্পত্তির জন্য ভাড়ার তালিকা রাখুন'
      },
      {
        en: 'See lease dates before they pass',
        hi: 'पट्टा तिथियाँ बीतने से पहले देखें',
        bn: 'ইজারার তারিখ পেরোনোর আগেই দেখুন'
      }
    ],
    worksOffline: true
  },
  'vahan': {
    whatItDoes: {
      en: 'A simple home for every vehicle the institution runs, with service and RTO dates kept in view. A vehicle that serves devotees stays road-ready, and no paper expires quietly.',
      hi: 'संस्था द्वारा चलाए जाने वाले हर वाहन के लिए एक सरल स्थान, सेवा और RTO तिथियाँ नज़र में रखी हुई। जो वाहन भक्तों की सेवा करता है वह सड़क के लिए तैयार रहता है, और कोई कागज़ चुपचाप समाप्त नहीं होता।',
      bn: 'প্রতিষ্ঠানের চালানো প্রতিটি যানবাহনের জন্য একটি সহজ জায়গা, সার্ভিস ও আরটিও তারিখ নজরে রাখা। যে যানবাহন ভক্তদের সেবা করে তা রাস্তার জন্য প্রস্তুত থাকে, এবং কোনো কাগজ নীরবে মেয়াদ শেষ হয় না।'
    },
    realLifeExample: {
      en: 'The van that carries elderly devotees to the weekly satsang is due for service just before a big yatra. The alert comes in time, the van is serviced, and the yatra travels without a worry on the road.',
      hi: 'जो वैन वृद्ध भक्तों को साप्ताहिक सत्संग ले जाती है, उसकी सेवा एक बड़ी यात्रा से ठीक पहले देय है। चेतावनी समय पर आती है, वैन की सेवा हो जाती है, और यात्रा सड़क पर बिना चिंता के चलती है।',
      bn: 'যে ভ্যান বয়স্ক ভক্তদের সাপ্তাহিক সৎসঙ্গে নিয়ে যায়, তার সার্ভিস একটি বড় যাত্রার ঠিক আগেই প্রাপ্য। সতর্কতা সময়মতো আসে, ভ্যানের সার্ভিস হয়ে যায়, এবং যাত্রা রাস্তায় দুশ্চিন্তা ছাড়াই চলে।'
    },
    steps: [
      {
        en: 'Add each vehicle with its number and basic details.',
        hi: 'हर वाहन को उसके नंबर और मूल विवरण के साथ जोड़ें।',
        bn: 'প্রতিটি যানবাহন তার নম্বর ও প্রাথমিক বিবরণসহ জুড়ুন।'
      },
      {
        en: 'Note the service date and the RTO paper dates for each vehicle.',
        hi: 'हर वाहन के लिए सेवा तिथि और RTO कागज़ की तिथियाँ दर्ज करें।',
        bn: 'প্রতিটি যানবাহনের জন্য সার্ভিস তারিখ ও আরটিও কাগজের তারিখ লিখুন।'
      },
      {
        en: 'Record each service and repair as it is done.',
        hi: 'हर सेवा और मरम्मत होते ही दर्ज करें।',
        bn: 'প্রতিটি সার্ভিস ও মেরামত হওয়ার সঙ্গে সঙ্গে লিখুন।'
      },
      {
        en: 'Act on alerts before a date expires, not after.',
        hi: 'किसी तिथि के समाप्त होने से पहले चेतावनियों पर कार्य करें, बाद में नहीं।',
        bn: 'কোনো তারিখ শেষ হওয়ার আগে সতর্কতায় কাজ করুন, পরে নয়।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not let insurance or RTO papers expire unnoticed — the fine always costs more than the renewal.',
        hi: 'बीमा या RTO कागज़ों को अनदेखे समाप्त न होने दें — जुर्माना हमेशा नवीनीकरण से अधिक पड़ता है।',
        bn: 'বিমা বা আরটিও কাগজ অদেখা মেয়াদ শেষ হতে দেবেন না — জরিমানা সবসময় নবায়নের চেয়ে বেশি পড়ে।'
      },
      {
        en: 'Keep fuel and repair costs noted per vehicle, so a costly vehicle is seen early.',
        hi: 'ईंधन और मरम्मत खर्च प्रति वाहन दर्ज रखें, ताकि महँगा वाहन समय पर दिखे।',
        bn: 'জ্বালানি ও মেরামত খরচ যানবাহন অনুযায়ী লিখে রাখুন, যাতে ব্যয়বহুল যানবাহন আগেভাগে ধরা পড়ে।'
      },
      {
        en: 'Never send a vehicle on a long yatra without a quick check of its service state.',
        hi: 'किसी वाहन को उसकी सेवा स्थिति की त्वरित जाँच के बिना लंबी यात्रा पर कभी न भेजें।',
        bn: 'কোনো যানবাহনকে তার সার্ভিস অবস্থা দ্রুত যাচাই ছাড়া লম্বা যাত্রায় কখনো পাঠাবেন না।'
      }
    ],
    capabilities: [
      {
        en: 'Keep every vehicle and its papers in one place',
        hi: 'हर वाहन और उसके कागज़ एक ही जगह रखें',
        bn: 'প্রতিটি যানবাহন ও তার কাগজ এক জায়গায় রাখুন'
      },
      {
        en: 'Get service and RTO alerts before expiry',
        hi: 'समाप्ति से पहले सेवा और RTO चेतावनियाँ पाएँ',
        bn: 'মেয়াদ শেষের আগে সার্ভিস ও আরটিও সতর্কতা পান'
      },
      {
        en: 'Record services and repairs per vehicle',
        hi: 'प्रति वाहन सेवा और मरम्मत दर्ज करें',
        bn: 'যানবাহন অনুযায়ী সার্ভিস ও মেরামত লিখুন'
      }
    ],
    worksOffline: true
  },
  'recurring-seva': {
    whatItDoes: {
      en: 'Here a one-time donor can become a monthly supporter through a simple recurring seva mandate. Small, steady dakshina given with love keeps the daily seva running all year.',
      hi: 'यहाँ एक बार का दाता एक सरल आवर्ती सेवा आदेश के माध्यम से मासिक समर्थक बन सकता है। प्रेम से दी गई छोटी, नियमित दक्षिणा दैनिक सेवा को पूरे वर्ष चलाती रहती है।',
      bn: 'এখানে একবারের দাতা একটি সহজ পুনরাবৃত্ত সেবা নির্দেশনার মাধ্যমে মাসিক সমর্থক হতে পারেন। ভালোবাসায় দেওয়া ছোট, নিয়মিত দক্ষিণা দৈনন্দিন সেবাকে সারা বছর চালু রাখে।'
    },
    realLifeExample: {
      en: 'A devotee family living far away gives a small dakshina every month for the daily aarti flowers. They never have to remember or travel — their seva reaches on time, and the flowers are fresh every morning.',
      hi: 'दूर रहने वाला एक भक्त परिवार दैनिक आरती के फूलों के लिए हर महीने छोटी दक्षिणा देता है। उन्हें न याद रखना पड़ता है, न यात्रा करनी पड़ती है — उनकी सेवा समय पर पहुँचती है, और फूल हर सुबह ताज़े रहते हैं।',
      bn: 'দূরে থাকা একটি ভক্ত পরিবার দৈনন্দিন আরতির ফুলের জন্য প্রতি মাসে ছোট দক্ষিণা দেয়। তাদের মনে রাখতেও হয় না, যাতায়াতও করতে হয় না — তাদের সেবা সময়মতো পৌঁছায়, এবং ফুল প্রতি সকালে তাজা থাকে।'
    },
    steps: [
      {
        en: 'Invite the donor to choose a monthly seva amount they are happy with.',
        hi: 'दाता को मासिक सेवा राशि चुनने के लिए आमंत्रित करें जिससे वे प्रसन्न हों।',
        bn: 'দাতাকে এমন মাসিক সেবা পরিমাণ বেছে নিতে আমন্ত্রণ জানান যাতে তিনি খুশি হন।'
      },
      {
        en: 'Set up the recurring mandate with the donor clear consent.',
        hi: 'दाता की स्पष्ट सहमति से आवर्ती आदेश स्थापित करें।',
        bn: 'দাতার স্পষ্ট সম্মতিতে পুনরাবৃত্ত নির্দেশনা সেট করুন।'
      },
      {
        en: 'Check each month that the expected seva has arrived.',
        hi: 'हर महीने जाँचें कि अपेक्षित सेवा पहुँची है।',
        bn: 'প্রতি মাসে যাচাই করুন প্রত্যাশিত সেবা পৌঁছেছে কিনা।'
      },
      {
        en: 'Thank monthly supporters regularly and share how their seva was used.',
        hi: 'मासिक समर्थकों को नियमित धन्यवाद दें और साझा करें कि उनकी सेवा का उपयोग कैसे हुआ।',
        bn: 'মাসিক সমর্থকদের নিয়মিত ধন্যবাদ দিন এবং তাদের সেবা কীভাবে ব্যবহৃত হয়েছে তা শেয়ার করুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Never set up a mandate without the donor fully understanding and agreeing to it.',
        hi: 'दाता के पूरी तरह समझे और सहमत हुए बिना कभी आदेश स्थापित न करें।',
        bn: 'দাতা পুরোপুরি বুঝে সম্মত না হলে কখনো নির্দেশনা সেট করবেন না।'
      },
      {
        en: 'If a monthly payment fails, reach out gently — do not assume the donor has withdrawn their love.',
        hi: 'यदि मासिक भुगतान विफल हो तो कोमलता से संपर्क करें — यह न मानें कि दाता ने अपना प्रेम वापस ले लिया है।',
        bn: 'মাসিক পেমেন্ট ব্যর্থ হলে কোমলভাবে যোগাযোগ করুন — ধরে নেবেন না দাতা তাঁর ভালোবাসা তুলে নিয়েছেন।'
      },
      {
        en: 'Keep the monthly amount easy to change or stop, whenever the donor wishes.',
        hi: 'मासिक राशि को दाता की इच्छा पर कभी भी बदलना या रोकना आसान रखें।',
        bn: 'মাসিক পরিমাণ দাতার ইচ্ছায় যেকোনো সময় বদলানো বা বন্ধ করা সহজ রাখুন।'
      }
    ],
    capabilities: [
      {
        en: 'Turn one-time donors into monthly supporters',
        hi: 'एक बार के दाताओं को मासिक समर्थक बनाएँ',
        bn: 'একবারের দাতাদের মাসিক সমর্থক করুন'
      },
      {
        en: 'Keep recurring seva mandates in one place',
        hi: 'आवर्ती सेवा आदेश एक ही जगह रखें',
        bn: 'পুনরাবৃত্ত সেবা নির্দেশনা এক জায়গায় রাখুন'
      },
      {
        en: 'See expected monthly seva at a glance',
        hi: 'अपेक्षित मासिक सेवा एक नज़र में देखें',
        bn: 'প্রত্যাশিত মাসিক সেবা এক নজরে দেখুন'
      }
    ],
    worksOffline: true
  },
  'bahi-khata': {
    whatItDoes: {
      en: 'Inside the Treasury, Bahi-Khata Seva reads a page from your paper bahi-khata and turns it into draft entries. You check every word yourself, and nothing becomes real until a Trustee approves it.',
      hi: 'कोषागार के भीतर, बही-खाता सेवा आपकी कागज़ की बही-खाता का एक पृष्ठ पढ़ती है और उसे मसौदा प्रविष्टियों में बदलती है। आप हर शब्द स्वयं जाँचते हैं, और जब तक ट्रस्टी स्वीकृति न दे, कुछ भी वास्तविक नहीं बनता।',
      bn: 'কোষাগারের ভিতরে, বহি-খাতা সেবা আপনার কাগজের বহি-খাতার একটি পৃষ্ঠা পড়ে তাকে খসড়া এন্ট্রিতে পরিণত করে। আপনি প্রতিটি শব্দ নিজে যাচাই করেন, এবং ট্রাস্টি অনুমোদন না দেওয়া পর্যন্ত কিছুই বাস্তব হয় না।'
    },
    realLifeExample: {
      en: 'An elderly accountant has kept the bahi-khata in neat handwriting for twenty years and does not want to type. He shows the page, checks the draft line by line, and his paper book and the Treasury finally say the same thing.',
      hi: 'एक वृद्ध लेखाकार ने बीस वर्षों से साफ़ हस्तलेख में बही-खाता रखा है और टाइप नहीं करना चाहता। वह पृष्ठ दिखाता है, मसौदे को पंक्ति-दर-पंक्ति जाँचता है, और उसकी कागज़ की बही व कोषागार अंततः एक ही बात कहते हैं।',
      bn: 'একজন বয়স্ক হিসাবরক্ষক ২০ বছর ধরে সুন্দর হাতের লেখায় বহি-খাতা রেখেছেন এবং টাইপ করতে চান না। তিনি পৃষ্ঠাটি দেখান, খসড়াটি লাইনে লাইনে যাচাই করেন, এবং তাঁর কাগজের খাতা ও কোষাগার শেষ পর্যন্ত একই কথা বলে।'
    },
    steps: [
      {
        en: 'Open Treasury and go through the Bahi-Khata Seva door.',
        hi: 'कोषागार खोलें और बही-खाता सेवा द्वार से जाएँ।',
        bn: 'কোষাগার খুলুন এবং বহি-খাতা সেবা দরজা দিয়ে যান।'
      },
      {
        en: 'Show the paper page clearly so it can be read.',
        hi: 'कागज़ का पृष्ठ स्पष्ट रूप से दिखाएँ ताकि वह पढ़ा जा सके।',
        bn: 'কাগজের পৃষ্ঠাটি স্পষ্টভাবে দেখান যাতে তা পড়া যায়।'
      },
      {
        en: 'Check every word and every amount in the draft against the paper.',
        hi: 'मसौदे के हर शब्द और हर राशि को कागज़ से मिलाकर जाँचें।',
        bn: 'খসড়ার প্রতিটি শব্দ ও প্রতিটি পরিমাণ কাগজের সঙ্গে মিলিয়ে যাচাই করুন।'
      },
      {
        en: 'Send the checked draft for a Trustee approval before it becomes an entry.',
        hi: 'प्रविष्टि बनने से पहले जाँचा हुआ मसौदा ट्रस्टी की स्वीकृति के लिए भेजें।',
        bn: 'এন্ট্রি হওয়ার আগে যাচাই করা খসড়াটি ট্রাস্টির অনুমোদনের জন্য পাঠান।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not approve a draft without reading it against the paper — a misread digit is still your responsibility.',
        hi: 'मसौदे को कागज़ से मिलाए बिना स्वीकृति न दें — ग़लत पढ़ा गया अंक फिर भी आपकी ज़िम्मेदारी है।',
        bn: 'খসড়াটি কাগজের সঙ্গে না মিলিয়ে অনুমোদন দেবেন না — ভুল পড়া অঙ্কও আপনারই দায়িত্ব।'
      },
      {
        en: 'Show one clean page at a time in good light, instead of a blurred photo of many pages.',
        hi: 'अच्छी रोशनी में एक समय में एक साफ़ पृष्ठ दिखाएँ, कई पृष्ठों की धुंधली फोटो नहीं।',
        bn: 'ভালো আলোয় একবারে একটি পরিষ্কার পৃষ্ঠা দেখান, অনেক পৃষ্ঠার ঝাপসা ছবি নয়।'
      },
      {
        en: 'Keep the paper bahi-khata safely even after it is read — the paper remains the original witness.',
        hi: 'पढ़े जाने के बाद भी कागज़ की बही-खाता सुरक्षित रखें — कागज़ ही मूल साक्षी रहता है।',
        bn: 'পড়ার পরও কাগজের বহি-খাতা নিরাপদে রাখুন — কাগজই মূল সাক্ষী থাকে।'
      }
    ],
    capabilities: [
      {
        en: 'Turn a paper bahi-khata page into draft entries',
        hi: 'कागज़ के बही-खाता पृष्ठ को मसौदा प्रविष्टियों में बदलें',
        bn: 'কাগজের বহি-খাতা পৃষ্ঠাকে খসড়া এন্ট্রিতে পরিণত করুন'
      },
      {
        en: 'Check every word before anything is saved',
        hi: 'कुछ भी सहेजने से पहले हर शब्द जाँचें',
        bn: 'কিছু সংরক্ষণের আগে প্রতিটি শব্দ যাচাই করুন'
      },
      {
        en: 'Keep Trustee approval before an entry becomes real',
        hi: 'प्रविष्टि के वास्तविक बनने से पहले ट्रस्टी की स्वीकृति रखें',
        bn: 'এন্ট্রি বাস্তব হওয়ার আগে ট্রাস্টির অনুমোদন রাখুন'
      }
    ],
    worksOffline: true
  },
  'voice-entry': {
    whatItDoes: {
      en: 'Inside Bahi-Khata in the Treasury, Voice Entry lets you speak an entry instead of typing it. You hear and check every word before anything is saved, so speaking stays as careful as writing.',
      hi: 'कोषागार में बही-खाता के भीतर, वॉइस एंट्री आपको प्रविष्टि टाइप करने के बजाय बोलने देती है। कुछ भी सहेजने से पहले आप हर शब्द सुनते और जाँचते हैं, इसलिए बोलना भी लिखने जितना ही सावधान रहता है।',
      bn: 'কোষাগারের বহি-খাতার ভিতরে, ভয়েস এন্ট্রি আপনাকে এন্ট্রি টাইপ করার বদলে বলতে দেয়। কিছু সংরক্ষণের আগে আপনি প্রতিটি শব্দ শুনে যাচাই করেন, তাই বলাও লেখার মতোই যত্নশীল থাকে।'
    },
    realLifeExample: {
      en: 'After the evening aarti, an elderly sevak with tired eyes speaks the day collections one by one instead of typing on a small screen. He listens back, corrects one amount, and only then is the entry ready for approval.',
      hi: 'शाम की आरती के बाद थकी आँखों वाला एक वृद्ध सेवक छोटी स्क्रीन पर टाइप करने के बजाय दिन के संग्रह एक-एक करके बोलता है। वह सुनकर जाँचता है, एक राशि सुधारता है, और तभी प्रविष्टि स्वीकृति के लिए तैयार होती है।',
      bn: 'সন্ধ্যার আরতির পর ক্লান্ত চোখের একজন বয়স্ক সেবক ছোট পর্দায় টাইপ করার বদলে দিনের সংগ্রহ একে একে বলেন। তিনি শুনে যাচাই করেন, একটি পরিমাণ সংশোধন করেন, এবং তখনই এন্ট্রি অনুমোদনের জন্য প্রস্তুত হয়।'
    },
    steps: [
      {
        en: 'Open Treasury, go to Bahi-Khata Seva, and choose Speak it.',
        hi: 'कोषागार खोलें, बही-खाता सेवा में जाएँ और बोलकर दर्ज करें चुनें।',
        bn: 'কোষাগার খুলুন, বহি-খাতা সেবায় যান এবং বলে লিখুন বেছে নিন।'
      },
      {
        en: 'Speak one entry at a time, slowly and clearly, with the amount and purpose.',
        hi: 'एक समय में एक प्रविष्टि धीरे और स्पष्ट रूप से बोलें, राशि और उद्देश्य के साथ।',
        bn: 'একবারে একটি এন্ট্রি ধীরে ও স্পষ্টভাবে বলুন, পরিমাণ ও উদ্দেশ্যসহ।'
      },
      {
        en: 'Read and listen to the draft carefully and correct anything that sounds wrong.',
        hi: 'मसौदे को ध्यान से पढ़ें और सुनें और जो ग़लत लगे उसे सुधारें।',
        bn: 'খসড়াটি মনোযোগ দিয়ে পড়ুন ও শুনুন এবং যা ভুল মনে হয় তা সংশোধন করুন।'
      },
      {
        en: 'Confirm only when every word and amount is exactly as you meant it.',
        hi: 'तभी पुष्टि करें जब हर शब्द और राशि ठीक वैसी हो जैसी आप कहना चाहते थे।',
        bn: 'প্রতিটি শব্দ ও পরিমাণ ঠিক যেমন আপনি বোঝাতে চেয়েছিলেন তেমন হলেই নিশ্চিত করুন।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not speak several entries in one breath — one entry at a time keeps amounts from mixing.',
        hi: 'एक ही साँस में कई प्रविष्टियाँ न बोलें — एक समय में एक प्रविष्टि राशियों को मिलने से रोकती है।',
        bn: 'এক নিঃশ্বাসে অনেক এন্ট্রি বলবেন না — একবারে একটি এন্ট্রি পরিমাণ মিশতে বাধা দেয়।'
      },
      {
        en: 'Never confirm without checking the amount — the voice may hear a number differently than you spoke it.',
        hi: 'राशि जाँचे बिना कभी पुष्टि न करें — आवाज़ किसी संख्या को आपके बोले से अलग सुन सकती है।',
        bn: 'পরিমাণ না যাচাই করে কখনো নিশ্চিত করবেন না — কণ্ঠ আপনি যা বলেছেন তার থেকে আলাদা সংখ্যা শুনতে পারে।'
      },
      {
        en: 'Speak in a quiet place, away from crowd noise, so names and figures stay clear.',
        hi: 'शांत जगह पर बोलें, भीड़ के शोर से दूर, ताकि नाम और आँकड़े स्पष्ट रहें।',
        bn: 'শান্ত জায়গায় বলুন, ভিড়ের শব্দ থেকে দূরে, যাতে নাম ও সংখ্যা স্পষ্ট থাকে।'
      }
    ],
    capabilities: [
      {
        en: 'Speak an entry instead of typing it',
        hi: 'प्रविष्टि टाइप करने के बजाय बोलें',
        bn: 'এন্ট্রি টাইপ করার বদলে বলুন'
      },
      {
        en: 'Check every word before anything is saved',
        hi: 'कुछ भी सहेजने से पहले हर शब्द जाँचें',
        bn: 'কিছু সংরক্ষণের আগে প্রতিটি শব্দ যাচাই করুন'
      },
      {
        en: 'Correct a spoken draft with ease',
        hi: 'बोले गए मसौदे को आसानी से सुधारें',
        bn: 'বলা খসড়া সহজে সংশোধন করুন'
      }
    ],
    worksOffline: true
  },
  'pending-approvals': {
    whatItDoes: {
      en: 'Inside the Treasury, Pending Approvals is the panel where entries waiting for a second pair of eyes are held. Nothing above the limit moves until a second person approves it, so haste never spends the devotees money alone.',
      hi: 'कोषागार के भीतर, लंबित स्वीकृतियाँ वह पैनल है जहाँ दूसरी जोड़ी आँखों की प्रतीक्षा करती प्रविष्टियाँ रुकी रहती हैं। सीमा से ऊपर कुछ भी तब तक नहीं चलता जब तक दूसरा व्यक्ति स्वीकृति न दे, इसलिए जल्दबाज़ी कभी भक्तों का धन अकेले खर्च नहीं करती।',
      bn: 'কোষাগারের ভিতরে, মুলতুবি অনুমোদন হলো সেই প্যানেল যেখানে দ্বিতীয় জোড়া চোখের অপেক্ষায় থাকা এন্ট্রি আটকে থাকে। সীমার উপরে কিছুই চলে না যতক্ষণ না দ্বিতীয় ব্যক্তি অনুমোদন দেন, তাই তাড়াহুড়ো কখনো একা ভক্তদের অর্থ খরচ করে না।'
    },
    realLifeExample: {
      en: 'The accountant enters a large payment for festival supplies, but it waits in Pending Approvals. In the evening the trustee reviews it with the bill photo attached, approves it, and the payment moves — checked by two, trusted by all.',
      hi: 'लेखाकार उत्सव सामग्री के लिए बड़ा भुगतान दर्ज करता है, लेकिन वह लंबित स्वीकृतियों में प्रतीक्षा करता है। शाम को ट्रस्टी संलग्न बिल फोटो के साथ उसकी समीक्षा करता है, स्वीकृति देता है, और भुगतान आगे बढ़ता है — दो द्वारा जाँचा गया, सभी द्वारा विश्वसनीय।',
      bn: 'হিসাবরক্ষক উৎসবের সামগ্রীর জন্য বড় পেমেন্ট লেখেন, কিন্তু তা মুলতুবি অনুমোদনে অপেক্ষা করে। সন্ধ্যায় ট্রাস্টি জোড়া বিলের ছবিসহ তা পর্যালোচনা করেন, অনুমোদন দেন, এবং পেমেন্ট এগিয়ে যায় — ২ জনে যাচাই করা, সবার বিশ্বস্ত।'
    },
    steps: [
      {
        en: 'Open the Treasury and look at the Approvals panel for waiting entries.',
        hi: 'कोषागार खोलें और प्रतीक्षारत प्रविष्टियों के लिए स्वीकृति पैनल देखें।',
        bn: 'কোষাগার খুলুন এবং অপেক্ষমাণ এন্ট্রির জন্য অনুমোদন প্যানেল দেখুন।'
      },
      {
        en: 'Open each waiting entry and read its amount, purpose and attached proof.',
        hi: 'प्रत्येक प्रतीक्षारत प्रविष्टि खोलें और उसकी राशि, उद्देश्य और संलग्न प्रमाण पढ़ें।',
        bn: 'প্রতিটি অপেক্ষমাণ এন্ট্রি খুলুন এবং তার পরিমাণ, উদ্দেশ্য ও জোড়া প্রমাণ পড়ুন।'
      },
      {
        en: 'Ask the person who entered it if anything is unclear, before deciding.',
        hi: 'निर्णय लेने से पहले यदि कुछ अस्पष्ट हो तो दर्ज करने वाले व्यक्ति से पूछें।',
        bn: 'সিদ্ধান্তের আগে কিছু অস্পষ্ট থাকলে যিনি লিখেছেন তাঁকে জিজ্ঞাসা করুন।'
      },
      {
        en: 'Approve what is right, and send back what needs correction, with a clear note.',
        hi: 'जो सही है उसे स्वीकृत करें, और जिसे सुधार चाहिए उसे स्पष्ट टिप्पणी के साथ वापस भेजें।',
        bn: 'যা সঠিক তা অনুমোদন করুন, এবং যা সংশোধন দরকার তা স্পষ্ট নোটসহ ফেরত পাঠান।'
      }
    ],
    commonMistakes: [
      {
        en: 'Do not approve your own entry — the second pair of eyes must belong to a second person.',
        hi: 'अपनी ही प्रविष्टि को स्वीकृत न करें — दूसरी जोड़ी आँखें दूसरे व्यक्ति की ही होनी चाहिए।',
        bn: 'নিজের এন্ট্রি নিজে অনুমোদন করবেন না — দ্বিতীয় জোড়া চোখ দ্বিতীয় ব্যক্তিরই হতে হবে।'
      },
      {
        en: 'Never approve in a hurry without opening the entry and seeing the attached memo or bill.',
        hi: 'प्रविष्टि खोले और संलग्न मेमो या बिल देखे बिना जल्दबाज़ी में कभी स्वीकृति न दें।',
        bn: 'এন্ট্রি না খুলে ও জোড়া মেমো বা বিল না দেখে তাড়াহুড়ো করে কখনো অনুমোদন দেবেন না।'
      },
      {
        en: 'Do not let entries wait for many days — a waiting approval quietly stops someone honest work.',
        hi: 'प्रविष्टियों को कई दिनों तक प्रतीक्षा न करने दें — प्रतीक्षारत स्वीकृति चुपचाप किसी के ईमानदार काम को रोक देती है।',
        bn: 'এন্ট্রিকে অনেক দিন অপেক্ষা করাবেন না — অপেক্ষমাণ অনুমোদন নীরবে কারো সৎ কাজ থামিয়ে দেয়।'
      }
    ],
    capabilities: [
      {
        en: 'Hold entries above the limit for a second approval',
        hi: 'सीमा से ऊपर की प्रविष्टियों को दूसरी स्वीकृति के लिए रोकें',
        bn: 'সীমার উপরের এন্ট্রি দ্বিতীয় অনুমোদনের জন্য আটকে রাখুন'
      },
      {
        en: 'Review amount, purpose and proof before approving',
        hi: 'स्वीकृति से पहले राशि, उद्देश्य और प्रमाण की समीक्षा करें',
        bn: 'অনুমোদনের আগে পরিমাণ, উদ্দেশ্য ও প্রমাণ পর্যালোচনা করুন'
      },
      {
        en: 'Send an entry back with a clear correction note',
        hi: 'प्रविष्टि को स्पष्ट सुधार टिप्पणी के साथ वापस भेजें',
        bn: 'এন্ট্রিকে স্পষ্ট সংশোধন নোটসহ ফেরত পাঠান'
      }
    ],
    worksOffline: true
  }
};
