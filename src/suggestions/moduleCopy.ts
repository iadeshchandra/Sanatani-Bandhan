/**
 * Seva Suggestions — outcome-focused module copy.
 * ============================================================================
 * Every module in MODULE_CATALOG gets ONE line that says what it DOES for the
 * institution — no jargon, no "enhance your operational capabilities".
 * Locale-driven: English default, Hindi/Bengali via LanguageContext.
 * Institution-neutral language throughout.
 */

export interface ModuleCopy {
  en: string;
  hi: string;
  bn: string;
}

export const MODULE_COPY: Record<string, ModuleCopy> = {
  'devotee-portal': {
    en: 'Give every devotee their own app — bookings, receipts, and announcements in one place.',
    hi: 'हर भक्त को अपना ऐप दें — बुकिंग, रसीद और सूचनाएं एक जगह।',
    bn: 'প্রত্যেক ভক্তকে নিজস্ব অ্যাপ দিন — বুকিং, রসিদ ও ঘোষণা এক জায়গায়।',
  },
  dashboard: {
    en: 'Your morning command view — collections, footfall, and pending work at a glance.',
    hi: 'आपका प्रातःकालीन कमांड दृश्य — संग्रह, उपस्थिति और लंबित कार्य एक नज़र में।',
    bn: 'আপনার সকালের কমান্ড ভিউ — সংগ্রহ, উপস্থিতি ও বকেয়া কাজ এক নজরে।',
  },
  checkin: {
    en: 'Know exactly who entered and when — no more paper registers at the gate.',
    hi: 'जानें कौन कब आया — गेट पर कागज़ के रजिस्टर की ज़रूरत नहीं।',
    bn: 'জানুন কে কখন এল — গেটে কাগজের রেজিস্টারের দরকার নেই।',
  },
  devotees: {
    en: 'One searchable directory of every devotee, donor, and volunteer — never lose touch.',
    hi: 'हर भक्त, दाता और स्वयंसेवक की एक खोजने योग्य सूची — संपर्क कभी न टूटे।',
    bn: 'প্রত্যেক ভক্ত, দাতা ও স্বেচ্ছাসেবকের একটি খোঁজযোগ্য তালিকা — যোগাযোগ কখনো হারাবে না।',
  },
  membership: {
    en: 'Approve join requests and send invites in one queue — no WhatsApp chaos.',
    hi: 'एक ही कतार में जुड़ने के अनुरोध स्वीकारें और निमंत्रण भेजें — व्हाट्सऐप की अव्यवस्था नहीं।',
    bn: 'একটি সারিতে যোগদানের অনুরোধ অনুমোদন করুন ও আমন্ত্রণ পাঠান — হোয়াটসঅ্যাপের বিশৃঙ্খলা নয়।',
  },
  family: {
    en: 'Map households and kul-parivars so seva reaches the whole family, not just individuals.',
    hi: 'परिवारों और कुल-परिवारों का मानचित्र बनाएं ताकि सेवा व्यक्ति तक नहीं, पूरे परिवार तक पहुंचे।',
    bn: 'পরিবার ও কুল-পরিবারের মানচিত্র তৈরি করুন যাতে সেবা ব্যক্তির কাছে নয়, পুরো পরিবারের কাছে পৌঁছায়।',
  },
  vanshavali: {
    en: 'Preserve ancestral lineages as living family trees the next generation can explore.',
    hi: 'पुश्तैनी वंशावली को जीवंत पारिवारिक वृक्ष के रूप में संरक्षित करें।',
    bn: 'পূর্বপুরুষদের বংশতালিকা জীবন্ত পারিবারিক বৃক্ষ হিসেবে সংরক্ষণ করুন।',
  },
  guests: {
    en: 'Turn first-time visitors into returning devotees with a proper guest pipeline.',
    hi: 'सही अतिथि प्रबंधन से पहली बार आए आगंतुकों को नियमित भक्त बनाएं।',
    bn: 'সঠিক অতিথি ব্যবস্থাপনায় প্রথমবারের দর্শনার্থীদের নিয়মিত ভক্তে পরিণত করুন।',
  },
  donorCare: {
    en: 'Win back lapsed donors automatically — thank them, remind them, keep them close.',
    hi: 'छूटे हुए दाताओं को स्वतः वापस लाएं — धन्यवाद दें, याद दिलाएं, जुड़े रहें।',
    bn: 'হারিয়ে যাওয়া দাতাদের স্বয়ংক্রিয়ভাবে ফিরিয়ে আনুন — ধন্যবাদ দিন, মনে করিয়ে দিন।',
  },
  bulkImport: {
    en: 'Bring years of paper registers and Excel sheets into the app in minutes with CSV import.',
    hi: 'CSV आयात से वर्षों के कागज़ी रजिस्टर मिनटों में ऐप में लाएं।',
    bn: 'CSV আমদানিতে বছরের পর বছরের কাগজের রেজিস্টার মিনিটে অ্যাপে আনুন।',
  },
  federation: {
    en: 'Run many branches as one — consolidated reports and HQ-level rollups.',
    hi: 'कई शाखाओं को एक की तरह चलाएं — समेकित रिपोर्ट और मुख्यालय स्तरीय सारांश।',
    bn: 'অনেক শাখাকে একসাথে চালান — একীভূত প্রতিবেদন ও সদর দপ্তরের সারসংক্ষেপ।',
  },
  'sevadar-roster': {
    en: 'End volunteer scheduling chaos — shifts, check-ins, and SOPs in one roster.',
    hi: 'स्वयंसेवक समय-सारणी की अव्यवस्था समाप्त करें — एक ही सूची में शिफ्ट, उपस्थिति और SOP।',
    bn: 'স্বেচ্ছাসেবক সময়সূচির বিশৃঙ্খলা দূর করুন — এক তালিকায় শিফট, উপস্থিতি ও SOP।',
  },
  'quick-chanda-pos': {
    en: 'Collect donations at the counter in seconds — with instant printed receipts.',
    hi: 'काउंटर पर सेकंडों में चंदा लें — तुरंत मुद्रित रसीद के साथ।',
    bn: 'কাউন্টারে সেকেন্ডে চাঁদা নিন — সঙ্গে সঙ্গে ছাপা রসিদ।',
  },
  treasury: {
    en: 'Every rupee accounted for — audited double-entry ledger the trustees can defend.',
    hi: 'हर रुपये का हिसाब — अंकेक्षित दोहरी प्रविष्टि बही जिसे ट्रस्टी सही ठहरा सकें।',
    bn: 'প্রতিটি টাকার হিসাব — নিরীক্ষিত দুই-দফা খতিয়ান যা ট্রাস্টিরা সমর্থন করতে পারবেন।',
  },
  'treasury-audit': {
    en: 'A second pair of eyes on the treasury — independent audit trail for every entry.',
    hi: 'खज़ाने पर दूसरी नज़र — हर प्रविष्टि के लिए स्वतंत्र अंकेक्षण निशान।',
    bn: 'কোষাগারে দ্বিতীয় দৃষ্টি — প্রতিটি লেনদেনের স্বতন্ত্র নিরীক্ষা-চিহ্ন।',
  },
  'hundi-audit': {
    en: 'Open the hundi with two custodians and a tamper-proof count — trust, documented.',
    hi: 'दो संरक्षकों के साथ हुंडी खोलें और छेड़छाड़-रहित गिनती करें — भरोसा, दस्तावेज़ सहित।',
    bn: 'দুই তত্ত্বাবধায়কের উপস্থিতিতে হুন্ডি খুলুন ও কারচুপি-মুক্ত গণনা করুন — বিশ্বাস, নথিসহ।',
  },
  'ratna-bhandar': {
    en: 'Guard deity ornaments and bullion with dual-PIN vault discipline.',
    hi: 'दोहरे PIN वाली तिजोरी अनुशासन से देव-आभूषण और स्वर्ण की रक्षा करें।',
    bn: 'দ্বৈত-PIN ভল্ট শৃঙ্খলায় দেব-অলংকার ও স্বর্ণ রক্ষা করুন।',
  },
  taxReceipts: {
    en: 'Generate 80G/12A tax certificates in one click — save hundreds of admin hours.',
    hi: 'एक क्लिक में 80G/12A कर प्रमाणपत्र बनाएं — सैकड़ों प्रशासनिक घंटे बचाएं।',
    bn: 'এক ক্লিকে 80G/12A কর শংসাপত্র তৈরি করুন — শত শত প্রশাসনিক ঘণ্টা বাঁচান।',
  },
  form10bd: {
    en: 'File Form 10BD donation statements correctly and on time, every year.',
    hi: 'फॉर्म 10BD दान विवरण हर साल सही और समय पर दाखिल करें।',
    bn: 'ফর্ম 10BD অনুদান বিবরণী প্রতি বছর সঠিকভাবে ও সময়মতো দাখিল করুন।',
  },
  'tally-export': {
    en: 'Hand your CA clean Tally Prime XML — no re-typing the year\'s books.',
    hi: 'अपने CA को साफ Tally Prime XML दें — साल भर की बही दोबारा न लिखें।',
    bn: 'আপনার CA-কে পরিষ্কার Tally Prime XML দিন — বছরের হিসাব আবার লিখতে হবে না।',
  },
  campaigns: {
    en: 'Raise funds for nirman and sevas with transparent, trackable campaigns.',
    hi: 'पारदर्शी, ट्रैक करने योग्य अभियानों से निर्माण और सेवा हेतु धन जुटाएं।',
    bn: 'স্বচ্ছ, ট্র্যাকযোগ্য প্রচারণায় নির্মাণ ও সেবার জন্য তহবিল সংগ্রহ করুন।',
  },
  karmaLedger: {
    en: 'Recognize every volunteer hour as punya — a merit ledger that honors seva.',
    hi: 'हर स्वयंसेवी घंटे को पुण्य के रूप में मान्यता दें — सेवा का सम्मान करने वाला पुण्य-लेखा।',
    bn: 'প্রতিটি স্বেচ্ছাসেবী ঘণ্টাকে পুণ্য হিসেবে স্বীকৃতি দিন — সেবাকে সম্মান জানানো পুণ্য-খতিয়ান।',
  },
  assets: {
    en: 'Track every asset from sound systems to silver — know what you own and where it is.',
    hi: 'साउंड सिस्टम से चांदी तक हर संपत्ति का हिसाब रखें — क्या है और कहां है, जानें।',
    bn: 'সাউন্ড সিস্টেম থেকে রুপো পর্যন্ত প্রতিটি সম্পদের হিসাব রাখুন — কী আছে, কোথায় আছে জানুন।',
  },
  inventory: {
    en: 'Never run out of prasad ingredients mid-festival — smart stock for the bhandara.',
    hi: 'त्योहार के बीच प्रसाद की सामग्री कभी खत्म न हो — भंडार के लिए स्मार्ट स्टॉक।',
    bn: 'উৎসবের মাঝে প্রসাদের উপকরণ কখনো শেষ না হোক — ভাণ্ডারের জন্য স্মার্ট স্টক।',
  },
  bhoomi: {
    en: 'Manage temple lands and leases with rent rolls — no more forgotten plots.',
    hi: 'किराया-सूची के साथ मंदिर की भूमि और पट्टों का प्रबंधन करें — कोई भूखंड भूले नहीं।',
    bn: 'ভাড়া-তালিকাসহ মন্দিরের জমি ও লিজ পরিচালনা করুন — কোনো জমি ভুলে যাবেন না।',
  },
  vahan: {
    en: 'Keep every vehicle road-ready with service and RTO alerts before they expire.',
    hi: 'सेवा और RTO अलर्ट से हर वाहन को सड़क-योग्य रखें — समय सीमा से पहले।',
    bn: 'সার্ভিস ও RTO সতর্কতায় প্রতিটি যানবাহন রাস্তায় চলার উপযোগী রাখুন — মেয়াদ শেষের আগেই।',
  },
  'recurring-seva': {
    en: 'Turn one-time donors into monthly supporters with automatic seva mandates.',
    hi: 'स्वचालित सेवा-अधिदेश से एकमुश्त दाताओं को मासिक समर्थक बनाएं।',
    bn: 'স্বয়ংক্রিয় সেবা-ম্যান্ডেটে এককালীন দাতাদের মাসিক সমর্থকে পরিণত করুন।',
  },
  'sanctum-hud': {
    en: 'A live heads-up view of the sanctum — rituals, rosters, and readiness.',
    hi: 'गर्भगृह का लाइव दृश्य — अनुष्ठान, सूची और तैयारी।',
    bn: 'গর্ভগৃহের লাইভ দৃশ্য — আচার, তালিকা ও প্রস্তুতি।',
  },
  poojaBooking: {
    en: 'Let devotees book pujas and sankalps online — synced with your purohits.',
    hi: 'भक्तों को ऑनलाइन पूजा और संकल्प बुक करने दें — आपके पुरोहितों से समन्वित।',
    bn: 'ভক্তদের অনলাইনে পূজা ও সংকল্প বুক করতে দিন — আপনার পুরোহিতদের সঙ্গে সমন্বিত।',
  },
  mandirPuja: {
    en: 'Never miss an aarti — daily puja schedules with automatic reminders.',
    hi: 'कोई आरती न छूटे — स्वचालित स्मरण के साथ दैनिक पूजा समय-सारणी।',
    bn: 'কোনো আরতি বাদ না যাক — স্বয়ংক্রিয় স্মরণসহ দৈনিক পূজার সময়সূচি।',
  },
  purohitDesk: {
    en: 'A digital diary for purohits — bookings, dakshina, and daily discipline.',
    hi: 'पुरोहितों के लिए डिजिटल डायरी — बुकिंग, दक्षिणा और दैनिक अनुशासन।',
    bn: 'পুরোহিতদের জন্য ডিজিটাল ডায়েরি — বুকিং, দক্ষিণা ও দৈনিক শৃঙ্খলা।',
  },
  purohitMarket: {
    en: 'Find KYC-verified scholars and purohits for any ritual, anywhere.',
    hi: 'किसी भी अनुष्ठान के लिए KYC-सत्यापित विद्वान और पुरोहित खोजें, कहीं भी।',
    bn: 'যেকোনো আচারের জন্য KYC-যাচাইকৃত পণ্ডিত ও পুরোহিত খুঁজুন, যেকোনো জায়গায়।',
  },
  pitruShradh: {
    en: 'Remind families of shradh tithis before they pass — seva that never forgets.',
    hi: 'श्राद्ध तिथियां बीतने से पहले परिवारों को याद दिलाएं — कभी न भूलने वाली सेवा।',
    bn: 'শ্রাদ্ধ তিথি পেরিয়ে যাওয়ার আগেই পরিবারকে মনে করিয়ে দিন — কখনো না ভোলা সেবা।',
  },
  panchang: {
    en: 'Tithi, nakshatra, and muhurat for every day — the calendar your purohit trusts.',
    hi: 'हर दिन की तिथि, नक्षत्र और मुहूर्त — वह पंचांग जिस पर आपके पुरोहित भरोसा करते हैं।',
    bn: 'প্রতিদিনের তিথি, নক্ষত্র ও মুহূর্ত — সেই পঞ্জিকা যাতে আপনার পুরোহিত আস্থা রাখেন।',
  },
  'yatranet-gis': {
    en: 'Watch crowd density live on a map and respond to SOS before it becomes a crisis.',
    hi: 'मानचित्र पर भीड़ घनत्व लाइव देखें और संकट बनने से पहले SOS का जवाब दें।',
    bn: 'মানচিত্রে ভিড়ের ঘনত্ব লাইভ দেখুন ও সংকট হওয়ার আগেই SOS-এর জবাব দিন।',
  },
  rakthaSeva: {
    en: 'Connect blood donors to critical patients in minutes when every second counts.',
    hi: 'जब हर सेकंड मायने रखता है, मिनटों में रक्तदाताओं को गंभीर रोगियों से जोड़ें।',
    bn: 'যখন প্রতিটি সেকেন্ড গুরুত্বপূর্ণ, মিনিটে রক্তদাতাদের সংকটাপন্ন রোগীদের সঙ্গে যুক্ত করুন।',
  },
  goshala: {
    en: 'Complete records for every gomata — health, milk, and fodder in one place.',
    hi: 'हर गोमाता का संपूर्ण रिकॉर्ड — स्वास्थ्य, दूध और चारा एक जगह।',
    bn: 'প্রতিটি গোমাতার সম্পূর্ণ রেকর্ড — স্বাস্থ্য, দুধ ও খাদ্য এক জায়গায়।',
  },
  annadanam: {
    en: 'Serve thousands without waste — plan, track, and account every annadanam.',
    hi: 'बिना बर्बादी हज़ारों को खिलाएं — हर अन्नदान की योजना, ट्रैकिंग और हिसाब।',
    bn: 'অপচয় ছাড়াই হাজারো মানুষকে খাওয়ান — প্রতিটি অন্নদানের পরিকল্পনা, ট্র্যাকিং ও হিসাব।',
  },
  'annakshetra-one': {
    en: 'Recipes that auto-calculate ingredients for 10 or 10,000 plates — and reorder in time.',
    hi: 'ऐसी रेसिपी जो 10 या 10,000 थालियों के लिए सामग्री स्वतः गिने — और समय पर मंगवाए।',
    bn: 'এমন রেসিপি যা ১০ বা ১০,০০০ থালার উপকরণ স্বয়ং হিসাব করে — ও সময়মতো আনায়।',
  },
  'nyas-one': {
    en: 'Never miss a filing again — 12A/80G/FCRA renewals, ITR-7, 10BE and the 85% rule, tracked.',
    hi: 'कोई फाइलिंग फिर कभी न छूटे — 12A/80G/FCRA नवीनीकरण, ITR-7, 10BE और 85% नियम, ट्रैक्ड।',
    bn: 'আর কোনো ফাইলিং মিস নয় — ১২এ/৮০জি/এফসিআরএ নবায়ন, আইটিআর-৭, ১০বিই ও ৮৫% নিয়ম ট্র্যাকড।',
  },
  'utsav-one': {
    en: 'Run the whole mahotsav from one desk — budgets, committees, vendors, program and crowd safety.',
    hi: 'पूरा महोत्सव एक डेस्क से चलाएं — बजट, समिति, विक्रेता, कार्यक्रम और भीड़ सुरक्षा।',
    bn: 'এক ডেস্ক থেকে পুরো মহোৎসব চালান — বাজেট, সমিতি, বিক্রেতা, কার্যক্রম ও ভিড় নিরাপত্তা।',
  },
  'tirth-one': {
    en: 'End the paper-token chaos — darshan slots, live queue board, seva passes and crowd counts.',
    hi: 'कागज़ के टोकन का झंझट खत्म करें — दर्शन स्लॉट, लाइव कतार बोर्ड, सेवा पास और भीड़ गणना।',
    bn: 'কাগজের টোকেনের বিশৃঙ্খলা শেষ করুন — দর্শন স্লট, লাইভ সারি বোর্ড, সেবা পাস ও ভিড় গণনা।',
  },
  'yoga-one': {
    en: 'Run the whole shala from one desk — batches, students, attendance, fees and the class diary.',
    hi: 'पूरी शाला एक डेस्क से चलाएं — बैच, छात्र, उपस्थिति, शुल्क और पाठ डायरी।',
    bn: 'এক ডেস্ক থেকে পুরো শালা চালান — ব্যাচ, শিক্ষার্থী, উপস্থিতি, ফি ও পাঠ-ডায়েরি।',
  },
  'matha-one': {
    en: 'Keep the matha\u2019s sacred record — sannyasi registry, parampara lineage, dinacharya and gurukul.',
    hi: 'मठ का पवित्र रिकॉर्ड रखें — संन्यासी रजिस्टर, परंपरा वंशावली, दिनचर्या और गुरुकुल।',
    bn: 'মঠের পবিত্র রেকর্ড রাখুন — সন্ন্যাসী রেজিস্টার, পরম্পরা বংশ, দিনচর্যা ও গুরুকুল।',
  },
  'satsang-one': {
    en: 'Run the mandali without WhatsApp chaos — members, gatherings, bhajan list, prasad rotation and the fund.',
    hi: 'मंडली को व्हाट्सऐप अव्यवस्था के बिना चलाएं — सदस्य, सभाएं, भजन सूची, प्रसाद बारी और निधि।',
    bn: 'হোয়াটসঅ্যাপ বিশৃঙ্খলা ছাড়াই মণ্ডলী চালান — সদস্য, সমাবেশ, ভজন তালিকা, প্রসাদ পালা ও তহবিল।',
  },
  'sabha-one': {
    en: 'Run the purohit sabha properly — member directory, dues, welfare fund, training and festival duty rosters.',
    hi: 'पुरोहित सभा को व्यवस्थित चलाएं — सदस्य निर्देशिका, शुल्क, कल्याण निधि, प्रशिक्षण और उत्सव कर्तव्य सूची।',
    bn: 'পুরোহিত সভা সুষ্ঠুভাবে চালান — সদস্য নির্দেশিকা, চাঁদা, কল্যাণ তহবিল, প্রশিক্ষণ ও উৎসব দায়িত্ব তালিকা।',
  },
  ashramKutir: {
    en: 'Manage kutir stays and sadhana retreats — bookings, rooms, and silence, organized.',
    hi: 'कुटीर प्रवास और साधना शिविरों का प्रबंधन करें — बुकिंग, कमरे और मौन, व्यवस्थित।',
    bn: 'কুটির অবস্থান ও সাধনা শিবির পরিচালনা করুন — বুকিং, ঘর ও নীরবতা, সুশৃঙ্খল।',
  },
  dharamshala: {
    en: 'Fill every yatri room without double-booking — simple stays, honestly managed.',
    hi: 'बिना दोहरी बुकिंग हर यात्री कमरा भरें — सरल प्रवास, ईमानदारी से प्रबंधित।',
    bn: 'দ্বিগুণ বুকিং ছাড়াই প্রতিটি যাত্রীঘর পূর্ণ করুন — সরল থাকা, সততার সঙ্গে পরিচালিত।',
  },
  gurukul: {
    en: 'Watch over every shishya — attendance, health, and daily discipline in one view.',
    hi: 'हर शिष्य पर नज़र रखें — उपस्थिति, स्वास्थ्य और दैनिक अनुशासन एक दृश्य में।',
    bn: 'প্রতিটি শিষ্যের খেয়াল রাখুন — উপস্থিতি, স্বাস্থ্য ও দৈনিক শৃঙ্খলা এক দৃশ্যে।',
  },
  gurukulAcademy: {
    en: 'Grade shastric learning properly — pariksha, marks, and progress per student.',
    hi: 'शास्त्रीय शिक्षा का सही मूल्यांकन करें — प्रति छात्र परीक्षा, अंक और प्रगति।',
    bn: 'শাস্ত্রীয় শিক্ষার সঠিক মূল্যায়ন করুন — প্রতি ছাত্রের পরীক্ষা, নম্বর ও অগ্রগতি।',
  },
  vidyalaya: {
    en: 'Run your weekend heritage school — classes, students, and fees without paperwork.',
    hi: 'अपना साप्ताहिक संस्कृति विद्यालय चलाएं — कागज़ी कार्रवाई बिना कक्षाएं, छात्र और शुल्क।',
    bn: 'আপনার সাপ্তাহিক ঐতিহ্য বিদ্যালয় চালান — কাগজপত্র ছাড়াই ক্লাস, ছাত্র ও ফি।',
  },
  pathshala: {
    en: 'A complete school in your pocket — admissions, attendance, exams, and report cards.',
    hi: 'आपकी जेब में पूरा विद्यालय — प्रवेश, उपस्थिति, परीक्षा और प्रगति-पत्र।',
    bn: 'আপনার পকেটে সম্পূর্ণ বিদ্যালয় — ভর্তি, উপস্থিতি, পরীক্ষা ও রিপোর্ট কার্ড।',
  },
  'goshala-one': {
    en: 'The complete goshala OS — cattle, milk, fodder, vet care, and sponsorships.',
    hi: 'संपूर्ण गोशाला OS — पशु, दूध, चारा, पशु-चिकित्सा और प्रायोजन।',
    bn: 'সম্পূর্ণ গোশালা OS — গবাদি, দুধ, খাদ্য, পশু-চিকিৎসা ও পৃষ্ঠপোষকতা।',
  },
  'ashram-one': {
    en: 'The complete yatri-stay OS — rooms, bookings, check-in/out, guest register, and bhandara planning.',
    hi: 'संपूर्ण यात्री-निवास OS — कमरे, बुकिंग, चेक-इन/आउट, अतिथि पंजी और भंडारा योजना।',
    bn: 'সম্পূর্ণ যাত্রী-নিবাস OS — কক্ষ, বুকিং, চেক-ইন/আউট, অতিথি নথি ও ভাণ্ডারা পরিকল্পনা।',
  },
  'cash-custody': {
    en: 'Hundi-to-bank chain of custody — dual-custody openings, maker-checker counting, tamper-evident log.',
    hi: 'हुंडी से बैंक तक अभिरक्षा श्रृंखला — द्वि-अभिरक्षा उद्घाटन, निर्माता-परीक्षक गणना।',
    bn: 'হুন্ডি থেকে ব্যাংক পর্যন্ত হেফাজত শৃঙ্খলা — দ্বৈত উদ্বোধন, যাচাইকৃত গণনা।',
  },
  satsang: {
    en: 'Organize kirtans and discourses — schedules, venues, and reminders handled.',
    hi: 'कीर्तन और प्रवचन आयोजित करें — समय, स्थान और स्मरण सब संभाला।',
    bn: 'কীর্তন ও প্রবচন আয়োজন করুন — সময়, স্থান ও স্মরণ সব সামলানো।',
  },
  sanghaDrills: {
    en: 'Mobilize shakhas with drills, attendance, and readiness tracking.',
    hi: 'अभ्यास, उपस्थिति और तत्परता ट्रैकिंग से शाखाओं को संगठित करें।',
    bn: 'মহড়া, উপস্থিতি ও প্রস্তুতি ট্র্যাকিংয়ে শাখাগুলোকে সংগঠিত করুন।',
  },
  sevaTrust: {
    en: 'Run relief and humanitarian programs with transparent fund tracking.',
    hi: 'पारदर्शी निधि ट्रैकिंग के साथ राहत और मानवतावादी कार्यक्रम चलाएं।',
    bn: 'স্বচ্ছ তহবিল ট্র্যাকিংয়ে ত্রাণ ও মানবতাবাদী কর্মসূচি চালান।',
  },
  granthLibrary: {
    en: 'A living library of sacred granths and manuscripts — catalogued and searchable.',
    hi: 'पवित्र ग्रंथों और पांडुलिपियों का जीवंत पुस्तकालय — सूचीबद्ध और खोजने योग्य।',
    bn: 'পবিত্র গ্রন্থ ও পাণ্ডুলিপির জীবন্ত গ্রন্থাগার — তালিকাভুক্ত ও খোঁজযোগ্য।',
  },
  matrimony: {
    en: 'Dharmic matchmaking with gotra verification — families meet with confidence.',
    hi: 'गोत्र सत्यापन के साथ धार्मिक मिलान — परिवार भरोसे से मिलें।',
    bn: 'গোত্র যাচাইসহ ধার্মিক পাত্র-পাত্রী মিলন — পরিবার আস্থার সঙ্গে মিলিত হোক।',
  },
  utsavPanjika: {
    en: 'Every festival planned — dates, gate passes, and checklists in one calendar.',
    hi: 'हर त्योहार नियोजित — एक ही कैलेंडर में तिथियां, गेट पास और चेकलिस्ट।',
    bn: 'প্রতিটি উৎসব পরিকল্পিত — এক ক্যালেন্ডারে তারিখ, গেট পাস ও চেকলিস্ট।',
  },
  panchayatPolls: {
    en: 'Decisions the community trusts — transparent voting with proper quorum.',
    hi: 'समुदाय के भरोसे के निर्णय — उचित कोरम के साथ पारदर्शी मतदान।',
    bn: 'সম্প্রদায়ের আস্থার সিদ্ধান্ত — যথাযথ কোরামসহ স্বচ্ছ ভোট।',
  },
  sandeshBroadcast: {
    en: 'Reach every devotee instantly on WhatsApp and SMS — announcements that land.',
    hi: 'व्हाट्सऐप और SMS पर हर भक्त तक तुरंत पहुंचें — घोषणाएं जो पहुंचें।',
    bn: 'হোয়াটসঅ্যাপ ও SMS-এ প্রত্যেক ভক্তের কাছে তৎক্ষণাৎ পৌঁছান — ঘোষণা যা পৌঁছায়।',
  },
  socialWall: {
    en: 'A beautiful darshan wall — share utsav photos and notices with your community.',
    hi: 'एक सुंदर दर्शन-दीवार — अपने समुदाय से उत्सव की तस्वीरें और सूचनाएं साझा करें।',
    bn: 'এক সুন্দর দর্শন-প্রাচীর — আপনার সম্প্রদায়ের সঙ্গে উৎসবের ছবি ও বিজ্ঞপ্তি শেয়ার করুন।',
  },
  shlokaFeed: {
    en: 'Daily shloka wisdom for your community — one verse, every morning.',
    hi: 'आपके समुदाय के लिए दैनिक श्लोक-ज्ञान — हर सुबह एक श्लोक।',
    bn: 'আপনার সম্প্রদায়ের জন্য দৈনিক শ্লোক-জ্ঞান — প্রতি সকালে একটি শ্লোক।',
  },
  dharmicAssistant: {
    en: 'Ask anything about dharma, rituals, or your records — an AI that knows your institution.',
    hi: 'धर्म, अनुष्ठान या अपने रिकॉर्ड के बारे में कुछ भी पूछें — आपकी संस्था को जानने वाला AI।',
    bn: 'ধর্ম, আচার বা আপনার রেকর্ড সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন — আপনার প্রতিষ্ঠানকে জানা AI।',
  },
  dharmaMarketing: {
    en: 'Festival posters and outreach copy written for you — in your sampradaya\'s voice.',
    hi: 'त्योहार पोस्टर और प्रचार-सामग्री आपके लिए लिखी हुई — आपके संप्रदाय की भाषा में।',
    bn: 'উৎসবের পোস্টার ও প্রচার-লেখা আপনার জন্য লেখা — আপনার সম্প্রদায়ের ভাষায়।',
  },
  trusteeGovernance: {
    en: 'Board meetings with minutes, resolutions, and accountability — governance you can show.',
    hi: 'कार्यवृत्त, प्रस्ताव और जवाबदेही के साथ बोर्ड बैठकें — दिखाने योग्य शासन।',
    bn: 'কার্যবিবরণী, প্রস্তাব ও জবাবদিহিসহ বোর্ড সভা — দেখানোর মতো সুশাসন।',
  },
  legalVault: {
    en: 'Deeds, 80G certificates, and legal papers — encrypted and retrievable in seconds.',
    hi: 'विलेख, 80G प्रमाणपत्र और कानूनी कागज़ — एन्क्रिप्टेड और सेकंडों में उपलब्ध।',
    bn: 'দলিল, 80G শংসাপত্র ও আইনি কাগজ — এনক্রিপ্টেড ও সেকেন্ডে উদ্ধারযোগ্য।',
  },
  qrScanner: {
    en: 'Scan devotee QR passes at the gate — instant, offline-capable verification.',
    hi: 'गेट पर भक्तों के QR पास स्कैन करें — तुरंत, ऑफलाइन-सक्षम सत्यापन।',
    bn: 'গেটে ভক্তদের QR পাস স্ক্যান করুন — তৎক্ষণাৎ, অফলাইন-সক্ষম যাচাই।',
  },
  appStore: {
    en: 'Browse every module and switch on what your institution needs next.',
    hi: 'हर मॉड्यूल देखें और आपकी संस्था को जो चाहिए उसे चालू करें।',
    bn: 'প্রতিটি মডিউল দেখুন ও আপনার প্রতিষ্ঠানের যা দরকার তা চালু করুন।',
  },
  masterSettings: {
    en: 'Your institution\'s identity — name, logo, and preferences in one place.',
    hi: 'आपकी संस्था की पहचान — नाम, लोगो और प्राथमिकताएं एक जगह।',
    bn: 'আপনার প্রতিষ্ঠানের পরিচয় — নাম, লোগো ও পছন্দ এক জায়গায়।',
  },
  spiritualSettings: {
    en: 'Configure your sampradaya, kuladevata, and traditions — the app speaks your parampara.',
    hi: 'अपने संप्रदाय, कुलदेवता और परंपराएं सेट करें — ऐप आपकी परंपरा बोले।',
    bn: 'আপনার সম্প্রদায়, কুলদেবতা ও ঐতিহ্য সেট করুন — অ্যাপ আপনার পরম্পরা বলুক।',
  },
  'crisis-command': {
    en: 'When a child goes missing or a fire breaks out — broadcast and coordinate in seconds.',
    hi: 'जब कोई बच्चा खो जाए या आग लगे — सेकंडों में सूचना दें और समन्वय करें।',
    bn: 'যখন কোনো শিশু হারিয়ে যায় বা আগুন লাগে — সেকেন্ডে প্রচার করুন ও সমন্বয় করুন।',
  },
  'tactical-radar': {
    en: 'A live perimeter view for high-security utsavs — see movement before it matters.',
    hi: 'उच्च-सुरक्षा उत्सवों के लिए लाइव परिधि-दृश्य — महत्वपूर्ण होने से पहले हलचल देखें।',
    bn: 'উচ্চ-নিরাপত্তা উৎসবের জন্য লাইভ পরিধি-দৃশ্য — গুরুত্বপূর্ণ হওয়ার আগেই গতিবিধি দেখুন।',
  },
  'sadhana-karma': {
    en: 'Your personal sadhana companion — japa counters, vratas, and daily discipline.',
    hi: 'आपका व्यक्तिगत साधना साथी — जप-माला, व्रत और दैनिक अनुशासन।',
    bn: 'আপনার ব্যক্তিগত সাধনা-সঙ্গী — জপ-মালা, ব্রত ও দৈনিক শৃঙ্খলা।',
  },
  'sanatani-vivah': {
    en: 'A trusted vivah portal for the community — profiles families can verify.',
    hi: 'समुदाय के लिए विश्वसनीय विवाह पोर्टल — परिवार सत्यापित कर सकें ऐसे प्रोफाइल।',
    bn: 'সম্প্রদায়ের জন্য বিশ্বস্ত বিবাহ পোর্টাল — পরিবার যাচাই করতে পারে এমন প্রোফাইল।',
  },
  yatraNet: {
    en: 'Stay connected with zero internet — an offline mesh for yatras and melas.',
    hi: 'शून्य इंटरनेट पर जुड़े रहें — यात्रा और मेलों के लिए ऑफलाइन जाल।',
    bn: 'শূন্য ইন্টারনেটে যুক্ত থাকুন — যাত্রা ও মেলার জন্য অফলাইন জাল।',
  },
};

/** Fallback copy for a module id with no authored line — never blank. */
export function getModuleCopy(id: string, lang?: string): string {
  const c = MODULE_COPY[id];
  if (!c) {
    const pretty = id.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    return pretty;
  }
  const l = (lang || 'en').toLowerCase();
  if (l.startsWith('bn')) return c.bn;
  if (l.startsWith('hi')) return c.hi;
  return c.en;
}
