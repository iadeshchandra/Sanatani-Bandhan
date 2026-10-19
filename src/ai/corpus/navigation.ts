/**
 * Sanatani Bandhan — AI Assistant Phase 3 · Navigation corpus
 * =====================================================================
 * 35 destinations. Every route verified against App.tsx /
 * SoloWorkspaceShell.tsx. Answers are 1-2 warm sentences in EN/HI/BN;
 * the deep-link action carries the devotee the rest of the way.
 *
 * Sections within tab pages (Profile cards, Home cards) are named in
 * the answer text — the route takes them to the right tab.
 */
import type { NavigationCorpus } from './navTypes';

const TAKE_ME: Record<'en' | 'hi' | 'bn', string> = {
  en: 'Take me there 🙏',
  hi: 'मुझे वहाँ ले चलें 🙏',
  bn: 'আমাকে সেখানে নিয়ে যান 🙏',
};

export const NAVIGATION_CORPUS: NavigationCorpus = [
  {
    id: 'nav.giving',
    patterns: [
      'donation section', 'donate section', 'giving section', 'where to donate',
      'where is donation', 'where is the donation', 'दान विभाग', 'donation kothay',
      'দান বিভাগ', 'donation kahan', 'दान कहाँ', 'giving', 'daan section',
      'dakshina section', 'where can i donate', 'donate kothay', 'daan kahan',
    ],
    target: { route: '/app/profile', section: 'Giving' },
    answer: {
      en: '🙏 Your Giving section lives in your Profile — look for the 🪔 Give card. It holds your dana history, receipts, and the express dana sheet.',
      hi: '🙏 आपका दान विभाग प्रोफ़ाइल में है — 🪔 Give कार्ड देखें। इसमें आपका दान इतिहास, रसीदें और एक्सप्रेस दान शीट है।',
      bn: '🙏 আপনার দান বিভাগ প্রোফাইলে আছে — 🪔 Give কার্ডটি দেখুন। এখানে আপনার দানের ইতিহাস, রসিদ ও এক্সপ্রেস দান শিট রয়েছে।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.wallet.seva',
    patterns: [
      'seva wallet', 'my wallet', 'wallet balance', 'wallet section',
      'seva wallet kothay', 'सेवा वॉलेट', 'সেবা ওয়ালেট', 'wallet kahan',
      'where is my wallet', 'check balance', 'top up', 'topup', 'recharge wallet',
      'add money', 'wallet topup', 'वॉलेट', 'মেরা ওয়ালেট', 'मेरा वॉलेट',
      'ওয়ালেট',
    ],
    target: { route: '/app/profile', section: 'Wallet' },
    answer: {
      en: '🙏 Your Seva Wallet lives in your Profile — the wallet card shows your balance, top-up options, and transaction history.',
      hi: '🙏 आपका सेवा वॉलेट प्रोफ़ाइल में है — वॉलेट कार्ड में बैलेंस, टॉप-अप और लेनदेन का इतिहास दिखता है।',
      bn: '🙏 আপনার সেবা ওয়ালেট প্রোফাইলে আছে — ওয়ালেট কার্ডে ব্যালেন্স, টপ-আপ ও লেনদেনের ইতিহাস দেখা যায়।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.wallet.personal',
    patterns: [
      'personal wallet', 'p2p wallet', 'personal balance', 'iou wallet',
      'ব্যক্তিগত ওয়ালেট', 'पर्सनल वॉलेट', 'my obligations', 'obligations',
    ],
    target: { route: '/app/profile', section: 'Personal Wallet' },
    answer: {
      en: '🙏 Your Personal Wallet — for private IOUs between you and fellow Sanatanis — lives in your Profile, beside the Seva Wallet. The two never mix.',
      hi: '🙏 आपका पर्सनल वॉलेट — साथी सनातनियों के बीच निजी IOU के लिए — प्रोफ़ाइल में सेवा वॉलेट के पास है। दोनों कभी मिलते नहीं।',
      bn: '🙏 আপনার ব্যক্তিগত ওয়ালেট — সহযাত্রী সনাতনীদের মধ্যে ব্যক্তিগত IOU-এর জন্য — প্রোফাইলে সেবা ওয়ালেটের পাশেই আছে। দুটি কখনো মেশে না।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.messages',
    patterns: [
      'messages', 'chat', 'chats', 'messaging', 'where is chat',
      'message kothay', 'চ্যাট', 'মেসেজ', 'चैट', 'संदेश', 'chat kahan',
      'my conversations', 'conversations', 'inbox',
    ],
    target: { route: '/app/home', section: 'Messages card' },
    answer: {
      en: '🙏 Your Messages live on the Home tab — tap the Messages card. Every conversation is with a verified Sanatani identity.',
      hi: '🙏 आपके संदेश होम टैब पर हैं — Messages कार्ड पर टैप करें। हर बातचीत सत्यापित सनातनी पहचान के साथ है।',
      bn: '🙏 আপনার মেসেজ হোম ট্যাবে আছে — Messages কার্ডে ট্যাপ করুন। প্রতিটি কথোপকথন যাচাইকৃত সনাতনী পরিচয়ের সাথে।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.groups',
    patterns: [
      'group chat', 'group chats', 'groups', 'family group', 'satsang group',
      'create group', 'new group', 'group kothay', 'গ্রুপ চ্যাট', 'ग्रुप चैट',
      'group kahan', 'yatra group',
    ],
    target: { route: '/app/home', section: 'Messages → Groups tab' },
    answer: {
      en: '🙏 Group chats live inside Messages — open Messages from Home, then tap the Groups tab. Create family, satsang, temple, or yatra groups; joining is by invite code only.',
      hi: '🙏 ग्रुप चैट संदेशों के अंदर है — होम से Messages खोलें, फिर Groups टैब पर टैप करें। परिवार, सत्संग, मंदिर या यात्रा ग्रुप बनाएं; जुड़ना केवल आमंत्रण कोड से।',
      bn: '🙏 গ্রুপ চ্যাট মেসেজের ভেতরে আছে — হোম থেকে Messages খুলুন, তারপর Groups ট্যাবে ট্যাপ করুন। পরিবার, সৎসঙ্গ, মন্দির বা যাত্রা গ্রুপ বানান; যোগদান শুধু আমন্ত্রণ কোডে।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.tirtha',
    patterns: [
      'tirtha diary', 'my diary', 'visit journal', 'pilgrimage diary',
      'yatra diary', 'where is my diary', 'tirtha kothay', 'তীর্থ ডায়েরি',
      'तीर्थ डायरी', 'my visits', 'visit history', 'temple visits',
    ],
    target: { route: '/app/profile', section: 'My Tirtha Diary' },
    answer: {
      en: '🙏 Your Tirtha Diary lives in your Profile — the 🪔 My Tirtha Diary card. Every temple visit you chose to record, every yatra, kept private and yours alone.',
      hi: '🙏 आपकी तीर्थ डायरी प्रोफ़ाइल में है — 🪔 My Tirtha Diary कार्ड। हर मंदिर यात्रा जो आपने दर्ज की, हर यात्रा — निजी, केवल आपकी।',
      bn: '🙏 আপনার তীর্থ ডায়েরি প্রোফাইলে আছে — 🪔 My Tirtha Diary কার্ড। প্রতিটি মন্দির সফর যা আপনি লিপিবদ্ধ করেছেন, প্রতিটি যাত্রা — ব্যক্তিগত, শুধু আপনার।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.sos',
    patterns: [
      'sos', 'emergency', 'panic button', 'help button', 'emergency button',
      'where is sos', 'sos kothay', 'জরুরি', 'आपातकाल', 'sos kahan',
      'i need help', 'emergency help',
    ],
    target: { route: '/app/home', section: 'SOS button' },
    answer: {
      en: '🙏 The SOS button is always with you — the red button, bottom-right of every screen. Long-press it for 1.5 seconds in an emergency; your alert reaches your family circle and nearby Sanatanis instantly.',
      hi: '🙏 SOS बटन हमेशा आपके साथ है — हर स्क्रीन के नीचे-दाईं ओर लाल बटन। आपातकाल में 1.5 सेकंड दबाकर रखें; आपका अलर्ट तुरंत परिवार और पास के सनातनियों तक पहुँचेगा।',
      bn: '🙏 SOS বোতাম সবসময় আপনার সাথে আছে — প্রতিটি স্ক্রিনের নিচে-ডানে লাল বোতাম। জরুরি অবস্থায় 1.5 সেকেন্ড চেপে ধরুন; আপনার সতর্কতা তৎক্ষণাৎ পরিবার ও কাছের সনাতনীদের কাছে পৌঁছাবে।',
    },
  },
  {
    id: 'nav.language',
    patterns: [
      'language settings', 'change language', 'switch language', 'bhasha',
      'language kothay', 'ভাষা', 'भाषा', 'language kahan', 'app language',
      'bangla language', 'hindi language', 'tamil language',
    ],
    target: { route: '/app/profile', section: 'Language & Region' },
    answer: {
      en: '🙏 Language lives in your Profile — the 🗣️ Language & Region card. Choose the language your heart speaks; your choice always wins.',
      hi: '🙏 भाषा प्रोफ़ाइल में है — 🗣️ Language & Region कार्ड। अपने दिल की भाषा चुनें; आपकी पसंद ही अंतिम है।',
      bn: '🙏 ভাষা প্রোফাইলে আছে — 🗣️ Language & Region কার্ড। আপনার হৃদয়ের ভাষা বেছে নিন; আপনার পছন্দই চূড়ান্ত।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.spoken_id',
    patterns: [
      'spoken id', 'my spoken id', 'claim id', 'my id', 'sanatani id',
      'vda', 'my alias', 'spoken id kothay', 'স্পোকেন আইডি', 'मेरी आईडी',
    ],
    target: { route: '/app/profile', section: 'Your Spoken ID' },
    answer: {
      en: '🙏 Your Spoken ID lives in your Profile — the 🪪 section near the top. Claim a friendly name like aarav@kashi instead of spelling out SAN-XXXXXX at the temple counter.',
      hi: '🙏 आपकी Spoken ID प्रोफ़ाइल में है — ऊपर 🪪 भाग में। SAN-XXXXXX बताने के बजाय aarav@kashi जैसा आसान नाम चुनें।',
      bn: '🙏 আপনার স্পোকেন আইডি প্রোফাইলে আছে — উপরে 🪪 অংশে। মন্দির কাউন্টারে SAN-XXXXXX বলার বদলে aarav@kashi-এর মতো সহজ নাম নিন।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.samskaras',
    patterns: [
      'samskara', 'samskaras', 'my samskaras', 'life events', 'vivah',
      'samskara kothay', 'সংস্কার', 'संस्कार', 'samskar kahan',
    ],
    target: { route: '/app/profile', section: 'My Samskaras' },
    answer: {
      en: '🙏 Your Samskaras live in your Profile — the 🪔 My Samskaras card. Track life sacraments from Namakarana to Vivah, with gentle reminders as each approaches.',
      hi: '🙏 आपके संस्कार प्रोफ़ाइल में हैं — 🪔 My Samskaras कार्ड। नामकरण से विवाह तक जीवन-संस्कारों का पालन करें, समय पर सज्जन स्मरण के साथ।',
      bn: '🙏 আপনার সংস্কার প্রোফাইলে আছে — 🪔 My Samskaras কার্ড। নামকরণ থেকে বিবাহ পর্যন্ত জীবন-সংস্কার অনুসরণ করুন, সময়মতো মৃদু স্মরণসহ।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.suchana',
    patterns: [
      'suchana', 'notifications', 'notification settings', 'suchana kothay',
      'সূচনা', 'सूचना', 'suchana kahan', 'my notifications', 'alerts',
    ],
    target: { route: '/app/suchana' },
    answer: {
      en: '🙏 Suchana is the third tab at the bottom — 🪔 Suchana. Your practice, your organisations, and gentle reminders, in one calm stream.',
      hi: '🙏 सूचना नीचे तीसरा टैब है — 🪔 Suchana। आपकी साधना, आपके संगठन और सज्जन स्मरण — एक शांत धारा में।',
      bn: '🙏 সূচনা নিচে তৃতীয় ট্যাব — 🪔 Suchana। আপনার সাধনা, আপনার সংগঠন ও মৃদু স্মরণ — এক শান্ত ধারায়।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.orgs',
    patterns: [
      'organisations', 'organizations', 'my orgs', 'my organisations',
      'orgs kothay', 'সংগঠন', 'संगठन', 'orgs kahan', 'temple list',
      'join organisation', 'find organisation',
    ],
    target: { route: '/app/orgs' },
    answer: {
      en: '🙏 Organisations is the second tab at the bottom — 🏛️ Orgs. Your temples, ashrams, and institutions; joining one opens its workspace.',
      hi: '🙏 संगठन नीचे दूसरा टैब है — 🏛️ Orgs। आपके मंदिर, आश्रम और संस्थाएं; किसी से जुड़ते ही उसका कार्यक्षेत्र खुलता है।',
      bn: '🙏 সংগঠন নিচে দ্বিতীয় ট্যাব — 🏛️ Orgs। আপনার মন্দির, আশ্রম ও প্রতিষ্ঠান; একটিতে যোগ দিলেই তার কর্মক্ষেত্র খোলে।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.campus',
    patterns: [
      'campus map', 'temple map', 'campus', 'mandir map', 'temple layout',
      'campus kothay', 'ক্যাম্পাস', 'परिसर', 'campus kahan', 'zone qr',
    ],
    target: { route: '/app/orgs', section: 'Organisation page → Campus' },
    answer: {
      en: '🙏 Campus maps live on each organisation\'s page — open Orgs, choose your temple, and look for the 🗺️ Campus section with its zone map.',
      hi: '🙏 परिसर मानचित्र हर संगठन के पृष्ठ पर है — Orgs खोलें, अपना मंदिर चुनें, 🗺️ Campus भाग देखें।',
      bn: '🙏 ক্যাম্পাস মানচিত্র প্রতিটি সংগঠনের পাতায় আছে — Orgs খুলুন, মন্দির বেছে নিন, 🗺️ Campus অংশটি দেখুন।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.sangam',
    patterns: [
      'sangam', 'feed', 'community feed', 'seva bazar', 'service cards',
      'sangam kothay', 'সঙ্গম', 'संगम', 'sangam kahan', 'community board',
    ],
    target: { route: '/app/home', section: 'Sangam feed' },
    answer: {
      en: '🙏 The Sangam feed — with Seva Bazar service cards from your community — lives on the Home tab. Scroll gently; service cards never exceed a small part of your feed.',
      hi: '🙏 संगम फ़ीड — आपके समुदाय के सेवा बाज़ार कार्ड सहित — होम टैब पर है। धीरे स्क्रॉल करें; सेवा कार्ड फ़ीड का छोटा हिस्सा ही रहते हैं।',
      bn: '🙏 সঙ্গম ফিড — আপনার সম্প্রদায়ের সেবা বাজার কার্ডসহ — হোম ট্যাবে আছে। ধীরে স্ক্রল করুন; সেবা কার্ড ফিডের ক্ষুদ্র অংশই থাকে।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.purohit.booking',
    patterns: [
      'book purohit', 'book pandit', 'find purohit', 'purohit booking',
      'purohit kothay', 'পুরোহিত', 'पुरोहित', 'purohit kahan', 'seva pro',
      'book jyotish', 'find jyotishi', 'jyotish booking',
    ],
    target: { route: '/seva/journeys', section: 'Find a professional' },
    answer: {
      en: '🙏 Verified Purohits and Jyotishis await on Seva Pro — browse profiles, see their lineage and reviews, and book with Dakshina Suraksha. I\'ll take you there now.',
      hi: '🙏 सत्यापित पुरोहित और ज्योतिषी सेवा प्रो पर हैं — प्रोफ़ाइल देखें, वंशावली और समीक्षाएं पढ़ें, दक्षिणा सुरक्षा के साथ बुक करें।',
      bn: '🙏 যাচাইকৃত পুরোহিত ও জ্যোতিষী সেবা প্রো-তে আছেন — প্রোফাইল দেখুন, বংশ ও পর্যালোচনা পড়ুন, দক্ষিণা সুরক্ষাসহ বুক করুন।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.ai_voice',
    patterns: [
      'ai voice', 'voice download', 'download ai', 'on-device ai',
      'voice kothay', 'এআই ভয়েস', 'एआई आवाज', 'voice kahan',
      'warmer voice', 'ai model',
    ],
    target: { route: '/app/profile', section: 'AI voice card' },
    answer: {
      en: '🙏 The on-device AI voice lives in your Profile — the 🗣️ AI voice card. Download it once over WiFi, and it speaks fully offline afterwards. One tap removes it anytime.',
      hi: '🙏 ऑन-डिवाइस AI आवाज़ प्रोफ़ाइल में है — 🗣️ AI voice कार्ड। WiFi पर एक बार डाउनलोड करें, फिर पूरी तरह ऑफ़लाइन बोलेगी। एक टैप से कभी भी हटाएं।',
      bn: '🙏 অন-ডিভাইস এআই ভয়েস প্রোফাইলে আছে — 🗣️ AI voice কার্ড। WiFi-তে একবার ডাউনলোড করুন, তারপর সম্পূর্ণ অফলাইনে কথা বলবে। এক ট্যাপে যেকোনো সময় মুছুন।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.backup',
    patterns: [
      'backup', 'chat backup', 'download backup', 'my data', 'export data',
      'backup kothay', 'ব্যাকআপ', 'बैकअप', 'backup kahan', 'data download',
    ],
    target: { route: '/app/profile', section: 'Data & session' },
    answer: {
      en: '🙏 Backup lives in your Profile — the Data & session card. Your chats back up encrypted to your own Google Drive; the passphrase never leaves your device.',
      hi: '🙏 बैकअप प्रोफ़ाइल में है — Data & session कार्ड। आपके चैट एन्क्रिप्टेड होकर आपके Google Drive में जाते हैं; पासफ़्रेज़ कभी डिवाइस नहीं छोड़ता।',
      bn: '🙏 ব্যাকআপ প্রোফাইলে আছে — Data & session কার্ড। আপনার চ্যাট এনক্রিপ্ট হয়ে আপনার Google Drive-এ যায়; পাসফ্রেজ কখনো ডিভাইস ছাড়ে না।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.home',
    patterns: [
      'home', 'home tab', 'home screen', 'main screen', 'dashboard',
      'home kothay', 'হোম', 'होम', 'home kahan',
    ],
    target: { route: '/app/home' },
    answer: {
      en: '🙏 Home is the first tab at the bottom — 🏠 Home. Your daily companion: greeting, panjika, quick actions, and the Sangam feed.',
      hi: '🙏 होम नीचे पहला टैब है — 🏠 Home। आपका दैनिक साथी: अभिवादन, पंचांग, त्वरित कार्य और संगम फ़ीड।',
      bn: '🙏 হোম নিচে প্রথম ট্যাব — 🏠 Home। আপনার দৈনন্দিন সঙ্গী: শুভেচ্ছা, পঞ্জিকা, দ্রুত কাজ ও সঙ্গম ফিড।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.panjika',
    patterns: [
      'panjika', 'panchang', 'panchangam', 'today tithi', 'calendar',
      'panjika kothay', 'পঞ্জিকা', 'पंचांग', 'panjika kahan',
    ],
    target: { route: '/app/home/panjika' },
    answer: {
      en: '🙏 The Panjika lives on Home — look for the 📿 Panjika card. Tithi, nakshatra, and festival dates, calculated fresh each day.',
      hi: '🙏 पंचांग होम पर है — 📿 Panjika कार्ड देखें। तिथि, नक्षत्र और त्योहार तिथियां, रोज़ ताज़ा गणना।',
      bn: '🙏 পঞ্জিকা হোমে আছে — 📿 Panjika কার্ডটি দেখুন। তিথি, নক্ষত্র ও উৎসবের তারিখ, প্রতিদিন নতুন গণনা।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.sadhana',
    patterns: [
      'sadhana', 'my sadhana', 'japa counter', 'japa', 'mala count',
      'sadhana kothay', 'সাধনা', 'साधना', 'sadhana kahan', 'my practice',
    ],
    target: { route: '/app/home', section: 'Sadhana card' },
    answer: {
      en: '🙏 Your Sadhana lives on Home — the 📿 Sadhana card. Count your japa, track vrata, and watch your practice bloom day by day.',
      hi: '🙏 आपकी साधना होम पर है — 📿 Sadhana कार्ड। जप गिनें, व्रत ट्रैक करें, और अपनी साधना को दिन-ब-दिन खिलते देखें।',
      bn: '🙏 আপনার সাধনা হোমে আছে — 📿 Sadhana কার্ড। জপ গুনুন, ব্রত অনুসরণ করুন, আর দিন দিন সাধনাকে ফুটতে দেখুন।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.events',
    patterns: [
      'events', 'utsav', 'festival events', 'upcoming events', 'temple events',
      'events kothay', 'উৎসব', 'उत्सव', 'events kahan',
    ],
    target: { route: '/app/orgs', section: 'Organisation → Events' },
    answer: {
      en: '🙏 Events live with their organisations — open Orgs, choose a temple, and its Utsav calendar shows festivals, RSVPs, and announcements.',
      hi: '🙏 आयोजन उनके संगठनों के साथ हैं — Orgs खोलें, मंदिर चुनें, उसका उत्सव कैलेंडर त्योहार, RSVP और घोषणाएं दिखाएगा।',
      bn: '🙏 অনুষ্ঠান তাদের সংগঠনের সাথে আছে — Orgs খুলুন, মন্দির বেছে নিন, তার উৎসব ক্যালেন্ডারে উৎসব, RSVP ও ঘোষণা দেখাবে।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.devotees',
    patterns: [
      'devotees', 'devotee list', 'members', 'my members', 'devotee management',
      'devotees kothay', 'ভক্ত', 'भक्त', 'devotees kahan',
    ],
    target: { route: '/app/orgs', section: 'Organisation workspace' },
    answer: {
      en: '🙏 Devotee records live inside your organisation\'s workspace — open Orgs, enter your temple as Sevadar or above, and find them under Devotees.',
      hi: '🙏 भक्तों का विवरण आपके संगठन के कार्यक्षेत्र में है — Orgs खोलें, सेवादार या ऊपर के रूप में मंदिर में प्रवेश करें, Devotees में पाएं।',
      bn: '🙏 ভক্তদের তথ্য আপনার সংগঠনের কর্মক্ষেত্রে আছে — Orgs খুলুন, সেবাদার বা উচ্চ পদে মন্দিরে প্রবেশ করুন, Devotees-এ পাবেন।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.treasury',
    patterns: [
      'treasury', 'hundi', 'temple funds', 'accounts', 'donation records',
      'treasury kothay', 'তহবিল', 'कोष', 'treasury kahan', 'hundi collection',
    ],
    target: { route: '/app/orgs', section: 'Organisation workspace → Treasury' },
    answer: {
      en: '🙏 The Treasury lives inside your organisation\'s workspace — open Orgs, enter as Trustee or Accountant, and every rupee is accounted with an audit trail.',
      hi: '🙏 कोष आपके संगठन के कार्यक्षेत्र में है — Orgs खोलें, ट्रस्टी या अकाउंटेंट के रूप में प्रवेश करें; हर रुपया ऑडिट ट्रेल के साथ हिसाब में है।',
      bn: '🙏 তহবিল আপনার সংগঠনের কর্মক্ষেত্রে আছে — Orgs খুলুন, ট্রাস্টি বা হিসাবরক্ষক হিসেবে প্রবেশ করুন; প্রতিটি টাকা অডিট ট্রেইলসহ হিসাবে আছে।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.qr',
    patterns: [
      'qr code', 'my qr', 'scan qr', 'qr scanner', 'payment qr',
      'qr kothay', 'কিউআর', 'क्यूआर', 'qr kahan',
    ],
    target: { route: '/app/home', section: 'Messages → QR' },
    answer: {
      en: '🙏 QR codes live in Messages — open a conversation and look for the QR button. Scan to pay, or show yours to receive; every code carries your verified Sanatani ID.',
      hi: '🙏 QR कोड संदेशों में हैं — बातचीत खोलें, QR बटन देखें। भुगतान के लिए स्कैन करें या पाने के लिए अपना दिखाएं; हर कोड में आपकी सत्यापित ID है।',
      bn: '🙏 QR কোড মেসেজে আছে — কথোপকথন খুলুন, QR বোতামটি দেখুন। পেমেন্টে স্ক্যান করুন বা পেতে নিজেরটি দেখান; প্রতিটি কোডে আপনার যাচাইকৃত ID আছে।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.p2p',
    patterns: [
      'p2p', 'money request', 'send money', 'request money', 'iou',
      'pay someone', 'p2p kothay', 'টাকা পাঠান', 'पैसे भेजें',
    ],
    target: { route: '/app/home', section: 'Messages → Money' },
    answer: {
      en: '🙏 Money requests live in Messages — open any conversation and tap the money button. We coordinate; we never hold your money — transfers happen over bKash, Nagad, or UPI.',
      hi: '🙏 धन अनुरोध संदेशों में हैं — कोई बातचीत खोलें, money बटन दबाएं। हम समन्वय करते हैं; आपका पैसा कभी नहीं रखते — bKash, Nagad या UPI से transfer होता है।',
      bn: '🙏 টাকার অনুরোধ মেসেজে আছে — যেকোনো কথোপকথন খুলুন, money বোতাম চাপুন। আমরা সমন্বয় করি; আপনার টাকা কখনো রাখি না — bKash, Nagad বা UPI-তে স্থানান্তর হয়।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.settings',
    patterns: [
      'settings', 'app settings', 'notification settings', 'preferences',
      'settings kothay', 'সেটিংস', 'सेटिंग', 'settings kahan',
    ],
    target: { route: '/app/profile', section: 'Preferences' },
    answer: {
      en: '🙏 Settings live in your Profile — scroll to Preferences for notification controls, quiet hours, and display options. Suchana settings have their own ⚙️ on the Suchana tab too.',
      hi: '🙏 सेटिंग प्रोफ़ाइल में है — सूचना नियंत्रण, शांत समय और डिस्प्ले के लिए Preferences देखें। सूचना टैब पर भी ⚙️ है।',
      bn: '🙏 সেটিংস প্রোফাইলে আছে — বিজ্ঞপ্তি নিয়ন্ত্রণ, শান্ত সময় ও ডিসপ্লের জন্য Preferences দেখুন। সূচনা ট্যাবেও ⚙️ আছে।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.jyotish',
    patterns: [
      'jyotish', 'jyotishi', 'astrology', 'horoscope', 'kundli',
      'jyotish kothay', 'জ্যোতিষ', 'ज्योतिष', 'jyotish kahan', 'consult jyotish',
    ],
    target: { route: '/seva/journeys', section: 'Jyotishis' },
    answer: {
      en: '🙏 Verified Jyotishis await on Seva Pro — honest consultations with clear dakshina, no fear-selling, ever. I\'ll take you there now.',
      hi: '🙏 सत्यापित ज्योतिषी सेवा प्रो पर हैं — स्पष्ट दक्षिणा के साथ ईमानदार परामर्श, कभी भय नहीं बेचा जाता।',
      bn: '🙏 যাচাইকৃত জ্যোতিষী সেবা প্রো-তে আছেন — স্পষ্ট দক্ষিণাসহ সৎ পরামর্শ, কখনো ভয় বিক্রি হয় না।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.marketplace',
    patterns: [
      'marketplace', 'buy', 'shop', 'gigs', 'services for sale',
      'marketplace kothay', 'বাজার', 'बाज़ार', 'marketplace kahan',
    ],
    target: { route: '/app/home', section: 'Sangam feed → Seva Bazar' },
    answer: {
      en: '🙏 The marketplace lives as Seva Bazar inside your Sangam feed on Home — service cards from verified providers in your community, with Dakshina Suraksha on every booking.',
      hi: '🙏 बाज़ार होम पर संगम फ़ीड में सेवा बाज़ार के रूप में है — आपके समुदाय के सत्यापित प्रदाताओं के सेवा कार्ड, हर बुकिंग पर दक्षिणा सुरक्षा।',
      bn: '🙏 বাজার হোমে সঙ্গম ফিডে সেবা বাজার হিসেবে আছে — আপনার সম্প্রদায়ের যাচাইকৃত প্রদানকারীদের সেবা কার্ড, প্রতিটি বুকিংয়ে দক্ষিণা সুরক্ষা।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.guide',
    patterns: [
      'guide', 'tour', 'how to use', 'app tour', 'take a tour',
      'guide kothay', 'গাইড', 'मार्गदर्शक', 'guide kahan', 'help me navigate',
    ],
    target: { route: '/app/home' },
    answer: {
      en: '🙏 Every screen has its own gentle guide — look for the 🪔 "Take a tour" pills and "What\'s this?" hints. Two or three steps, plain words, never blocking. Shall I open one for you?',
      hi: '🙏 हर स्क्रीन का अपना सज्जन मार्गदर्शक है — 🪔 "Take a tour" और "What\'s this?" देखें। दो-तीन चरण, सरल शब्द, कभी रुकावट नहीं।',
      bn: '🙏 প্রতিটি স্ক্রিনের নিজস্ব মৃদু নির্দেশিকা আছে — 🪔 "Take a tour" ও "What\'s this?" দেখুন। দু-তিন ধাপ, সহজ কথা, কখনো বাধা নয়।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.contact',
    patterns: [
      'contact', 'contact us', 'support', 'help desk', 'get help',
      'contact kothay', 'যোগাযোগ', 'संपर्क', 'contact kahan',
    ],
    target: { route: '/contact' },
    answer: {
      en: '🙏 You can reach us any time at the Contact page — a form goes straight to our team, or write to Sanatanibandhan@gmail.com.',
      hi: '🙏 आप कभी भी संपर्क पृष्ठ पर हमसे जुड़ सकते हैं — फ़ॉर्म सीधे हमारी टीम तक जाता है, या Sanatanibandhan@gmail.com पर लिखें।',
      bn: '🙏 যেকোনো সময় যোগাযোগ পাতায় আমাদের ধরুন — ফর্ম সরাসরি আমাদের দলে যায়, অথবা Sanatanibandhan@gmail.com-এ লিখুন।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.seva_journeys',
    patterns: [
      'seva journeys', 'seva catalog', 'life events', 'book seva',
      'ceremonies', 'seva kothay', 'সেবা', 'सेवा', 'seva kahan',
    ],
    target: { route: '/seva/journeys' },
    answer: {
      en: '🙏 Seva Journeys — the full catalog of life-event services, from Namakarana to Griha Pravesh — lives at its own page. I\'ll take you there now.',
      hi: '🙏 सेवा यात्राएं — नामकरण से गृह प्रवेश तक जीवन-संस्कार सेवाओं की पूरी सूची — अपने पृष्ठ पर है।',
      bn: '🙏 সেবা যাত্রা — নামকরণ থেকে গৃহ প্রবেশ পর্যন্ত জীবন-সংস্কার সেবার সম্পূর্ণ তালিকা — নিজস্ব পাতায় আছে।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.inventory',
    patterns: [
      'inventory', 'bhandar', 'stock', 'store room', 'inventory kothay',
      'ভান্ডার', 'भंडार', 'inventory kahan',
    ],
    target: { route: '/app/orgs', section: 'Organisation workspace → Inventory' },
    answer: {
      en: '🙏 Inventory lives inside your organisation\'s workspace — open Orgs, enter as Sevadar or above, and find Bhandar under Inventory.',
      hi: '🙏 भंडार आपके संगठन के कार्यक्षेत्र में है — Orgs खोलें, सेवादार या ऊपर के रूप में प्रवेश करें।',
      bn: '🙏 ভান্ডার আপনার সংগঠনের কর্মক্ষেত্রে আছে — Orgs খুলুন, সেবাদার বা উচ্চ পদে প্রবেশ করুন।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.goshala',
    patterns: [
      'goshala', 'gaushala', 'cow', 'cows', 'gau seva', 'goshala kothay',
      'গোশালা', 'गोशाला', 'goshala kahan',
    ],
    target: { route: '/app/orgs', section: 'Goshala workspace' },
    answer: {
      en: '🙏 Goshala management lives in its organisation\'s workspace — open Orgs and enter your goshala to see the herd, seva records, and care schedules.',
      hi: '🙏 गोशाला प्रबंधन उसके संगठन के कार्यक्षेत्र में है — Orgs खोलें, अपनी गोशाला में प्रवेश करें।',
      bn: '🙏 গোশালা ব্যবস্থাপনা তার সংগঠনের কর্মক্ষেত্রে আছে — Orgs খুলুন, গোশালায় প্রবেশ করুন।',
    },
    actionLabel: TAKE_ME,
  },
  {
    id: 'nav.profile',
    patterns: [
      'profile', 'my profile', 'my account', 'account settings',
      'profile kothay', 'প্রোফাইল', 'प्रोफ़ाइल', 'profile kahan',
    ],
    target: { route: '/app/profile' },
    answer: {
      en: '🙏 Your Profile is the fourth tab at the bottom — 👤 Profile. Your identity, spoken ID, samskaras, language, wallet, giving, and diary — your personal space.',
      hi: '🙏 आपकी प्रोफ़ाइल नीचे चौथा टैब है — 👤 Profile। आपकी पहचान, स्पोकन ID, संस्कार, भाषा, वॉलेट, दान और डायरी — आपकी व्यक्तिगत जगह।',
      bn: '🙏 আপনার প্রোফাইল নিচে চতুর্থ ট্যাব — 👤 Profile। আপনার পরিচয়, স্পোকেন আইডি, সংস্কার, ভাষা, ওয়ালেট, দান ও ডায়েরি — আপনার ব্যক্তিগত স্থান।',
    },
    actionLabel: TAKE_ME,
  },
];

export default NAVIGATION_CORPUS;
