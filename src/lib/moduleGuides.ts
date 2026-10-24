/**
 * moduleGuides.ts — Quick Guide Library
 * ======================================
 * Warm, jargon-free 30-second introductions to every Sanatani Bandhan module.
 * A first-time trustee should understand each module from this file alone.
 *
 * Pure content — no UI. Consumed later by guide drawers/modals (see
 * src/components/common/QuickGuideModal.tsx and RBACQuickGuideDrawer.tsx).
 *
 * Tone: devotional, welcoming, plain language. EN primary; BN + HI for
 * name / tagline / whatItIs so the guide opens in the user's own tongue.
 */

export interface Lang3 {
  en: string;
  bn: string;
  hi: string;
}

export interface ModuleGuide {
  /** Stable module id (lowercase). */
  id: string;
  name: Lang3;
  tagline: Lang3;
  /** Two lines: what this module is. */
  whatItIs: Lang3;
  /** Two lines: why it matters, with role-aware benefits. */
  whyItMatters: Lang3;
  /** Three concrete first steps. */
  firstSteps: Lang3[];
  /** Two pro tips. */
  proTips: Lang3[];
  /** Related module ids for "see also". */
  relatedModules: string[];
}

const t3 = (en: string, bn: string, hi: string): Lang3 => ({ en, bn, hi });

export const MODULE_GUIDES: ModuleGuide[] = [
  {
    id: 'treasury',
    name: t3('Treasury', 'কোষাগার', 'कोषागार'),
    tagline: t3('Every rupee of seva, accounted with reverence.', 'সেবার প্রতিটি টাকা শ্রদ্ধার সঙ্গে হিসাব রাখুন।', 'सेवा का प्रत्येक रुपया श्रद्धा से हिसाब रखें।'),
    whatItIs: t3(
      'The temple\'s sacred accounts — donations, expenses, hundi collections and receipts, all in one honest ledger. Every entry is audit-trailed, like the ancient temple accountants kept.',
      'মন্দিরের পবিত্র হিসাব — দান, খরচ, হুন্ডি সংগ্রহ ও রসিদ, সব এক সৎ খাতায়। প্রতিটি লেনদেন নিরীক্ষাযোগ্য।',
      'मंदिर का पवित्र हिसाब — दान, खर्च, हुंडी संग्रह और रसीद, सब एक ईमानदार बही में। प्रत्येक प्रविष्टि ऑडिट-योग्य।'
    ),
    whyItMatters: t3(
      'Trustees see the true financial health at a glance. Accountants close months without paper chaos. Donors receive proper 80G receipts — and dharma stays transparent.',
      'ট্রাস্টিরা এক নজরে আর্থিক অবস্থা দেখেন। হিসাবরক্ষক সহজে মাস শেষ করেন। দাতারা সঠিক ৮০জি রসিদ পান — ধর্ম স্বচ্ছ থাকে।',
      'ट्रस्टी एक नज़र में आर्थिक स्थिति देखते हैं। लेखाकार आसानी से मासिक समापन करते हैं। दाताओं को उचित 80G रसीद — धर्म पारदर्शी रहता है।'
    ),
    firstSteps: [
      t3('Record today\'s hundi collection as an Income entry with the counter\'s name.', 'আজকের হুন্ডি সংগ্রহ আয় হিসেবে লিখুন।', 'आज का हुंडी संग्रह आय के रूप में दर्ज करें।'),
      t3('Add your regular expense heads — prasad, flowers, electricity, salaries.', 'নিয়মিত খরচের খাত যোগ করুন — প্রসাদ, ফুল, বিদ্যুৎ, বেতন।', 'नियमित खर्च के मद जोड़ें — प्रसाद, फूल, बिजली, वेतन।'),
      t3('Issue an 80G receipt for your next eligible donation.', 'পরবর্তী যোগ্য দানের জন্য ৮০জি রসিদ দিন।', 'अगले पात्र दान के लिए 80G रसीद जारी करें।'),
    ],
    proTips: [
      t3('Reconcile on every Amavasya — the lunar month-end the old accountants used.', 'প্রতি অমাবস্যায় মিলিয়ে নিন — প্রাচীন হিসাবরক্ষকদের মাস-শেষ।', 'प्रत्येक अमावस्या को मिलान करें — प्राचीन लेखाकारों का मास-अंत।'),
      t3('Attach a photo of every cash memo — the audit trail protects everyone.', 'প্রতিটি ক্যাশ মেমোর ছবি সংযুক্ত করুন — নিরীক্ষা সবাইকে রক্ষা করে।', 'प्रत्येक कैश मेमो की फोटो जोड़ें — ऑडिट सभी की रक्षा करता है।'),
    ],
    relatedModules: ['devotees', 'inventory', 'events', 'godmode'],
  },
  {
    id: 'devotees',
    name: t3('Devotee Directory', 'ভক্ত তালিকা', 'भक्त सूची'),
    tagline: t3('Know your parivar — every member, every family, with care.', 'আপনার পরিবারকে চিনুন — প্রতিটি সদস্য, প্রতিটি পরিবার, যত্নে।', 'अपने परिवार को जानें — प्रत्येक सदस्य, प्रत्येक परिवार, स्नेह से।'),
    whatItIs: t3(
      'The living register of your community — members, families, gotras, anniversaries and seva history. Each devotee carries a Smart ID for temple entry and prasad.',
      'আপনার সমাজের জীবন্ত নথি — সদস্য, পরিবার, গোত্র, বার্ষিকী ও সেবার ইতিহাস। প্রতিটি ভক্তের স্মার্ট পরিচয়পত্র।',
      'आपके समाज का जीवंत रजिस्टर — सदस्य, परिवार, गोत्र, वर्षगाँठ और सेवा इतिहास। प्रत्येक भक्त का स्मार्ट पहचान पत्र।'
    ),
    whyItMatters: t3(
      'Trustees greet members by name, not as strangers. Priests know each family\'s gotra before the sankalp. No devotee ever feels like a number.',
      'ট্রাস্টিরা সদস্যদের নামে চেনেন। পুরোহিতরা সংকল্পের আগেই গোত্র জানেন। কোনো ভক্ত নিজেকে সংখ্যা মনে করেন না।',
      'ट्रस्टी सदस्यों को नाम से जानते हैं। पुरोहित संकल्प से पहले गोत्र जानते हैं। कोई भक्त संख्या नहीं लगता।'
    ),
    firstSteps: [
      t3('Add your first family — head of household, gotra, and members.', 'প্রথম পরিবার যোগ করুন — কর্তা, গোত্র ও সদস্যরা।', 'पहला परिवार जोड़ें — मुखिया, गोत्र और सदस्य।'),
      t3('Record birth dates — the app will remind you of birthdays and tithi anniversaries.', 'জন্মতারিখ লিখুন — জন্মদিন ও তিথি-বার্ষিকীর স্মরণ পাবেন।', 'जन्मतिथि दर्ज करें — जन्मदिन और तिथि-वर्षगाँठ की सूचना मिलेगी।'),
      t3('Generate a Smart ID pass for temple entry.', 'মন্দির প্রবেশের জন্য স্মার্ট পরিচয়পত্র বানান।', 'मंदिर प्रवेश हेतु स्मार्ट पहचान पत्र बनाएँ।'),
    ],
    proTips: [
      t3('Mark inactive members gently — a re-engagement call is seva, not marketing.', 'নিষ্ক্রিয় সদস্যদের স্নেহে চিহ্নিত করুন — ফোন করা সেবা, বিপণন নয়।', 'निष्क्रिय सदस्यों को स्नेह से चिह्नित करें — फ़ोन करना सेवा है, विपणन नहीं।'),
      t3('Keep gotra and kuladevata updated — priests rely on this for every sankalp.', 'গোত্র ও কুলদেবতা হালনাগাদ রাখুন — প্রতিটি সংকল্পে পুরোহিত এটিই দেখেন।', 'गोत्र और कुलदेवता अद्यतन रखें — प्रत्येक संकल्प में पुरोहित यही देखते हैं।'),
    ],
    relatedModules: ['treasury', 'samskara', 'sangam', 'events'],
  },
  {
    id: 'inventory',
    name: t3('Bhandar', 'ভাণ্ডার', 'भण्डार'),
    tagline: t3('The temple storehouse — never run out before an utsava.', 'মন্দিরের ভাণ্ডার — উৎসবের আগে কখনো শেষ হবে না।', 'मंदिर का भण्डार — उत्सव से पहले कभी समाप्त न हो।'),
    whatItIs: t3(
      'Stock of everything the temple consumes — ghee, camphor, flowers, prasad supplies, fodder. Reorder levels warn you before the shelf goes empty.',
      'মন্দিরের সব ভোগ্যপণ্যের মজুত — ঘি, কর্পূর, ফুল, প্রসাদ সামগ্রী, খড়। শেষ হওয়ার আগেই সতর্কবার্তা।',
      'मंदिर की समस्त उपभोग्य वस्तुओं का भंडार — घी, कपूर, फूल, प्रसाद सामग्री, चारा। समाप्ति से पहले चेतावनी।'
    ),
    whyItMatters: t3(
      'Trustees avoid last-minute panic buying at festival prices. Bhandaris know exactly what to order, when. Nothing sacred is ever missing mid-puja.',
      'ট্রাস্টিরা উৎসবের দামে শেষ মুহূর্তের কেনা এড়ান। ভাণ্ডারিরা জানেন কখন কী কিনতে হবে। পূজার মাঝে কিছুই কম পড়ে না।',
      'ट्रस्टी उत्सव के दामों पर अंतिम समय की खरीद से बचते हैं। भण्डारी जानते हैं कब क्या मँगाना है। पूजा के बीच कुछ कम नहीं पड़ता।'
    ),
    firstSteps: [
      t3('Add your top 10 consumables with current stock and unit.', 'শীর্ষ ১০ ভোগ্যপণ্য মজুতসহ যোগ করুন।', 'शीर्ष 10 उपभोग्य वस्तुएँ स्टॉक सहित जोड़ें।'),
      t3('Set a reorder level for each — the app nudges you when stock dips below.', 'প্রতিটির পুনঃক্রয় সীমা দিন — কমলেই স্মরণ পাবেন।', 'प्रत्येक का पुनः-क्रय स्तर तय करें — घटते ही सूचना मिलेगी।'),
      t3('Record your regular suppliers with phone numbers.', 'নিয়মিত সরবরাহকারীদের ফোনসহ লিখুন।', 'नियमित आपूर्तिकर्ताओं को फ़ोन सहित दर्ज करें।'),
    ],
    proTips: [
      t3('Stock up 2 weeks before major utsavs — prices and crowds both rise.', 'বড় উৎসবের ২ সপ্তাহ আগে মজুত করুন — দাম ও ভিড় দুটোই বাড়ে।', 'बड़े उत्सवों से 2 सप्ताह पहले भंडार करें — दाम और भीड़ दोनों बढ़ते हैं।'),
      t3('Review slow-moving stock quarterly — donate surplus before it spoils.', 'ত্রৈমাসিকে ধীর পণ্য দেখুন — নষ্টের আগে উদ্বৃত্ত দান করুন।', 'त्रैमासिक धीमी वस्तुएँ देखें — खराब होने से पहले अधिशेष दान करें।'),
    ],
    relatedModules: ['treasury', 'events', 'goshala', 'panjika'],
  },
  {
    id: 'hr',
    name: t3('Sevadar Management', 'সেবাদার ব্যবস্থাপনা', 'सेवादार प्रबंधन'),
    tagline: t3('Honour those who serve — staff, salaries and volunteer shifts.', 'যাঁরা সেবা করেন তাঁদের সম্মান — কর্মী, বেতন ও স্বেচ্ছাসেবী পালা।', 'जो सेवा करते हैं उनका सम्मान — कर्मचारी, वेतन और स्वयंसेवक पाली।'),
    whatItIs: t3(
      'Everyone who serves the institution — paid staff with salary records, and sevadars with duty rosters for daily seva and festival crowds.',
      'প্রতিষ্ঠানে যাঁরা সেবা দেন — বেতনভুক্ত কর্মী ও উৎসবে স্বেচ্ছাসেবক, পালা-তালিকাসহ।',
      'संस्था में सेवा देने वाले सभी — वेतनभोगी कर्मचारी और उत्सवों में स्वयंसेवक, पाली-सूची सहित।'
    ),
    whyItMatters: t3(
      'Trustees never miss a salary date. Festival coordinators fill rosters before the crowd arrives. Every sevadar\'s hours are kept in the seva register, with gratitude.',
      'ট্রাস্টিরা বেতনের তারিখ ভোলেন না। উৎসব-সমন্বয়করা ভিড়ের আগেই পালা পূর্ণ করেন। প্রতিটি সেবাদারের ঘণ্টা কৃতজ্ঞতায় সেবা-খাতায় থাকে।',
      'ट्रस्टी वेतन तिथि नहीं भूलते। उत्सव समन्वयक भीड़ से पहले पाली भरते हैं। हर सेवादार के घंटे कृतज्ञता से सेवा पंजी में रहते हैं।'
    ),
    firstSteps: [
      t3('List your paid staff with roles and monthly salary dates.', 'বেতনভুক্ত কর্মীদের পদ ও বেতনের তারিখসহ তালিকা করুন।', 'वेतनभोगी कर्मचारियों को पद व वेतन तिथि सहित सूचीबद्ध करें।'),
      t3('Create the next festival\'s volunteer shifts — crowd, prasad, shoe counter.', 'পরের উৎসবের স্বেচ্ছাসেবী পালা বানান।', 'अगले उत्सव की स्वयंसेवक पाली बनाएँ।'),
      t3('Assign sevadars to shifts; completed seva is entered in the register with gratitude.', 'সেবাদারদের পালায় দিন; সম্পন্ন সেবা কৃতজ্ঞতায় খাতায় ওঠে।', 'सेवादारों को पाली सौंपें; पूर्ण सेवा कृतज्ञता से पंजी में दर्ज होती है।'),
    ],
    proTips: [
      t3('Confirm festival rosters 7 days early — volunteers need time to arrange.', 'উৎসবের ৭ দিন আগে পালা নিশ্চিত করুন।', 'उत्सव से 7 दिन पहले पाली सुनिश्चित करें।'),
      t3('Celebrate long-serving sevadars publicly — recognition is also dakshina.', 'দীর্ঘদিনের সেবাদারদের প্রকাশ্যে সম্মান দিন।', 'दीर्घकालिक सेवादारों का सार्वजनिक सम्मान करें।'),
    ],
    relatedModules: ['treasury', 'events', 'devotees', 'sangam'],
  },
  {
    id: 'events',
    name: t3('Utsav Manager', 'উৎসব ব্যবস্থাপনা', 'उत्सव प्रबंधन'),
    tagline: t3('Every festival, planned like the devas themselves were coming.', 'প্রতিটি উৎসব এমনভাবে সাজান যেন দেবতারাই আসছেন।', 'प्रत्येक उत्सव ऐसे सजाएँ मानो देवता ही पधार रहे हों।'),
    whatItIs: t3(
      'Plan each utsava end-to-end — dates, committees, budgets, tasks, vendors and programs. Import festival dates straight from the Panjika.',
      'প্রতিটি উৎসব আগাগোড়া সাজান — তারিখ, কমিটি, বাজেট, কাজ, বিক্রেতা ও অনুষ্ঠান। পঞ্জিকা থেকে তারিখ আনুন।',
      'प्रत्येक उत्सव आदि से अंत तक सजाएँ — तिथि, समिति, बजट, कार्य, विक्रेता और कार्यक्रम। पञ्जिका से तिथि लाएँ।'
    ),
    whyItMatters: t3(
      'Trustees run festivals without chaos. Committees know their duties. Budgets stay honest — every planned rupee traceable to the treasury.',
      'ট্রাস্টিরা বিশৃঙ্খলা ছাড়াই উৎসব চালান। কমিটি দায়িত্ব জানে। বাজেট সৎ থাকে।',
      'ट्रस्टी बिना अव्यवस्था उत्सव चलाते हैं। समिति दायित्व जानती है। बजट ईमानदार रहता है।'
    ),
    firstSteps: [
      t3('Create your next big utsava with start and end dates.', 'পরের বড় উৎসব তারিখসহ তৈরি করুন।', 'अगला बड़ा उत्सव तिथियों सहित बनाएँ।'),
      t3('Form the committee — Adhyaksh, Mantri, Koshadhyaksh, Sevadar leads.', 'কমিটি গঠন করুন — সভাপতি, মন্ত্রী, কোষাধ্যক্ষ।', 'समिति बनाएँ — अध्यक्ष, मंत्री, कोषाध्यक्ष।'),
      t3('Break work into tasks with owners and due dates.', 'কাজ ভাগ করে দায়িত্ব ও সময়সীমা দিন।', 'कार्य बाँटकर दायित्व व समय-सीमा दें।'),
    ],
    proTips: [
      t3('Import from Panjika — festival dates arrive verified, with significance notes.', 'পঞ্জিকা থেকে আনুন — যাচাইকৃত তারিখ ও মাহাত্ম্যসহ।', 'पञ्जिका से लाएँ — सत्यापित तिथि व महात्म्य सहित।'),
      t3('Post actuals against budget after the utsava — next year plans itself.', 'উৎসবের পর প্রকৃত খরচ লিখুন — পরের বছর নিজেই সাজবে।', 'उत्सव के बाद वास्तविक खर्च लिखें — अगला वर्ष स्वयं सजेगा।'),
    ],
    relatedModules: ['panjika', 'treasury', 'hr', 'inventory'],
  },
  {
    id: 'marketplace',
    name: t3('Seva Marketplace', 'সেবা বাজার', 'सेवा बाज़ार'),
    tagline: t3('Invite a purohit or jyotishi — with dignity on both sides.', 'পুরোহিত বা জ্যোতিষীকে আমন্ত্রণ — উভয় পক্ষের মর্যাদায়।', 'पुरोहित या ज्योतिषी को आमंत्रण — दोनों पक्षों की मर्यादा में।'),
    whatItIs: t3(
      'Yajmans discover verified purohits and jyotishis, take sankalp for a seva, and offer dakshina — held safely until the seva completes. Reviews are ashirvad, never star-ratings.',
      'যজমানরা যাচাইকৃত পুরোহিত-জ্যোতিষী খুঁজে সেবার সংকল্প নেন, দক্ষিণা নিরাপদে থাকে। মূল্যায়ন আশীর্বাদ, তারকা-রেটিং নয়।',
      'यजमान सत्यापित पुरोहित-ज्योतिषी खोजकर सेवा का संकल्प लेते हैं, दक्षिणा सुरक्षित रहती है। मूल्यांकन आशीर्वाद है, स्टार-रेटिंग नहीं।'
    ),
    whyItMatters: t3(
      'Devotees find trusted priests without awkward negotiation. Providers earn with dignity and dispute protection. The platform sustains itself on a modest seva contribution.',
      'ভক্তরা সম্মানে পুরোহিত পান। প্রদানকারীরা মর্যাদায় উপার্জন করেন।',
      'भक्त सम्मान से पुरोहित पाते हैं। प्रदाता मर्यादा से कमाते हैं।'
    ),
    firstSteps: [
      t3('Browse sevas by category — puja, hawan, jyotish consultation.', 'শ্রেণি অনুযায়ী সেবা দেখুন — পূজা, হবন, জ্যোতিষ পরামর্শ।', 'श्रेणी अनुसार सेवा देखें — पूजा, हवन, ज्योतिष परामर्श।'),
      t3('Take sankalp — the suggested dakshina is shown, you may offer more.', 'সংকল্প নিন — প্রস্তাবিত দক্ষিণা দেখুন, চাইলে বেশি দিন।', 'संकल्प लें — सुझाई दक्षिणा देखें, चाहें तो अधिक दें।'),
      t3('After the seva, share ashirvad — your words guide future yajmans.', 'সেবার পর আশীর্বাদ জানান।', 'सेवा के बाद आशीर्वाद साझा करें।'),
    ],
    proTips: [
      t3('Providers: complete your verification — verified sevas are booked 3× more.', 'যাচাইকরণ সম্পূর্ণ করুন — যাচাইকৃত সেবা ৩ গুণ বেশি বুক হয়।', 'सत्यापन पूर्ण करें — सत्यापित सेवा 3 गुना अधिक बुक होती है।'),
      t3('Choose platform-rail payment — lower seva contribution, full protection.', 'প্ল্যাটফর্ম-পেমেন্ট নিন — কম অবদান, পূর্ণ সুরক্ষা।', 'प्लेटफ़ॉर्म-भुगतान चुनें — कम योगदान, पूर्ण सुरक्षा।'),
    ],
    relatedModules: ['wallet', 'panjika', 'purohit', 'jyotish'],
  },
  {
    id: 'wallet',
    name: t3('Seva Wallet', 'সেবা ওয়ালেট', 'सेवा वॉलेट'),
    tagline: t3('Your dakshina balance — top up once, offer with ease.', 'আপনার দক্ষিণা ব্যালেন্স — একবার ভরুন, সহজে অর্পণ করুন।', 'आपका दक्षिणा शेष — एक बार भरें, सहज अर्पण करें।'),
    whatItIs: t3(
      'A personal balance for dharmic spending. Top up via your region\'s method — Bangla QR, UPI, or Wise/Payoneer — then book sevas in one tap, no payment friction at puja time.',
      'ধার্মিক খরচের ব্যক্তিগত ব্যালেন্স। বাংলা QR, UPI বা Wise দিয়ে ভরুন — এক ট্যাপে সেবা বুক করুন।',
      'धार्मिक व्यय का व्यक्तिगत शेष। बांग्ला QR, UPI या Wise से भरें — एक टैप में सेवा बुक करें।'
    ),
    whyItMatters: t3(
      'Yajmans never fumble with payments during a sacred moment. Providers receive dakshina settlements cleanly. Owners see every flow, honestly.',
      'পবিত্র মুহূর্তে টাকা নিয়ে ঝামেলা নেই। প্রদানকারীরা পরিচ্ছন্ন নিষ্পত্তি পান।',
      'पवित्र क्षण में भुगतान की झंझट नहीं। प्रदाताओं को स्वच्छ निपटान मिलता है।'
    ),
    firstSteps: [
      t3('Tap "Add to Seva Wallet" and choose your amount.', '"সেবা ওয়ালেটে যোগ করুন" চাপুন।', '"सेवा वॉलेट में जोड़ें" दबाएँ।'),
      t3('Pay with your region\'s method and submit the TrxID.', 'আপনার পদ্ধতিতে পেমেন্ট করে TrxID দিন।', 'अपनी विधि से भुगतान कर TrxID दें।'),
      t3('Book any seva — the dakshina deducts from your balance.', 'যেকোনো সেবা বুক করুন — ব্যালেন্স থেকে কাটবে।', 'कोई भी सेवा बुक करें — शेष से कटेगा।'),
    ],
    proTips: [
      t3('Top up before festival season — one balance covers every utsava offering.', 'উৎসব-মরসুমের আগে ভরুন — এক ব্যালেন্সে সব অর্ঘ্য।', 'उत्सव-मौसम से पहले भरें — एक शेष में सभी अर्घ्य।'),
      t3('Every transaction is listed — your dana history, always visible.', 'প্রতিটি লেনদেন তালিকাভুক্ত — দানের ইতিহাস সর্বদা দৃশ্য।', 'प्रत्येक लेनदेन सूचीबद्ध — दान का इतिहास सदा दृश्य।'),
    ],
    relatedModules: ['marketplace', 'purohit', 'jyotish', 'godmode'],
  },
  {
    id: 'panjika',
    name: t3('Panjika', 'পঞ্জিকা', 'पञ्जिका'),
    tagline: t3('The sacred almanac — ten traditions, one truth of time.', 'পবিত্র পঞ্জিকা — দশ ঐতিহ্য, কালের এক সত্য।', 'पवित्र पञ्जिका — दस परंपराएँ, काल का एक सत्य।'),
    whatItIs: t3(
      'Tithi, nakshatra, festivals, Ekadashi and shubh muhurats — computed with Drik accuracy for your city and your tradition, from Bengal to Tamil Nadu to Nepal.',
      'তিথি, নক্ষত্র, উৎসব, একাদশী ও শুভ মুহূর্ত — আপনার শহর ও ঐতিহ্য অনুযায়ী দৃক-নির্ভুল গণনা।',
      'तिथि, नक्षत्र, उत्सव, एकादशी व शुभ मुहूर्त — आपके शहर व परंपरा हेतु दृक्-शुद्ध गणना।'
    ),
    whyItMatters: t3(
      'Families plan samskaras on truly shubh days. Temples align utsavs with the heavens. No one needs a separate panjika app ever again.',
      'পরিবার শুভ দিনে সংস্কার সাজায়। মন্দির আকাশের সঙ্গে উৎসব মেলায়।',
      'परिवार शुभ दिनों में संस्कार सजाते हैं। मंदिर आकाश से उत्सव मिलाते हैं।'
    ),
    firstSteps: [
      t3('Choose your tradition — Bengali, Vikram Samvat, Tamil, and seven more.', 'ঐতিহ্য বেছে নিন — বাঙালি, বিক্রম সংবৎ, তামিল আরও।', 'परंपरा चुनें — बंगाली, विक्रम संवत्, तमिल आदि।'),
      t3('Set your city — sunrise and muhurats compute for your exact place.', 'শহর দিন — সূর্যোদয় ও মুহূর্ত আপনার স্থানে গণনা হবে।', 'शहर तय करें — सूर्योदय व मुहूर्त आपके स्थान हेतु गिने जाएँगे।'),
      t3('Open the muhurat finder before fixing any ceremony date.', 'সংস্কারের তারিখ ঠিক করার আগে মুহূর্ত-সন্ধানী খুলুন।', 'संस्कार तिथि तय करने से पहले मुहूर्त-संधानी खोलें।'),
    ],
    proTips: [
      t3('Check Ekadashi dates in both Smarta and Vaishnava columns — they sometimes differ.', 'স্মার্ত ও বৈষ্ণব — দুই মতেই একাদশী দেখুন।', 'स्मार्त व वैष्णव — दोनों मतों में एकादशी देखें।'),
      t3('Rashifal here is gentle gochar guidance — your jyotishi knows your kundali best.', 'রাশিফল মৃদু নির্দেশনা — কুণ্ডলী জ্যোতিষীই ভালো জানেন।', 'राशिफल मृदु मार्गदर्शन है — कुंडली ज्योतिषी ही बेहतर जानते हैं।'),
    ],
    relatedModules: ['samskara', 'events', 'jyotish', 'sangam'],
  },
  {
    id: 'samskara',
    name: t3('Samskara', 'সংস্কার', 'संस्कार'),
    tagline: t3('Life\'s sixteen sacred thresholds — planned with care.', 'জীবনের ষোলো পবিত্র দ্বার — যত্নে পরিকল্পিত।', 'जीवन के सोलह पवित्र द्वार — स्नेह से नियोजित।'),
    whatItIs: t3(
      'From namkaran to vivah to antyeshti — track every family member\'s samskaras, find shubh muhurats, plan ceremonies, and keep pitra-shraddha remembrances.',
      'নামকরণ থেকে বিবাহ — প্রতিটি সদস্যের সংস্কার, শুভ মুহূর্ত, অনুষ্ঠান-পরিকল্পনা ও পিতৃ-শ্রাদ্ধ স্মরণ।',
      'नामकरण से विवाह तक — प्रत्येक सदस्य के संस्कार, शुभ मुहूर्त, समारोह-योजना व पितृ-श्राद्ध स्मरण।'
    ),
    whyItMatters: t3(
      'Families never miss a child\'s annaprason window. Elders\' shraddha tithis are remembered yearly. Every ceremony lands on a genuinely shubh day.',
      'শিশুর অন্নপ্রাশনের সময় কেউ ভোলে না। পূর্বপুরুষের শ্রাদ্ধ-তিথি প্রতি বছর স্মরণ হয়।',
      'शिशु के अन्नप्राशन का समय कोई नहीं भूलता। पूर्वजों की श्राद्ध-तिथि प्रतिवर्ष स्मरण होती है।'
    ),
    firstSteps: [
      t3('Add family members with birth dates.', 'জন্মতারিখসহ পরিবারের সদস্য যোগ করুন।', 'जन्मतिथि सहित परिवार के सदस्य जोड़ें।'),
      t3('See which samskaras are due by age — the app suggests them.', 'বয়স অনুযায়ী কোন সংস্কার বাকি — অ্যাপই বলে দেবে।', 'आयु अनुसार कौन से संस्कार शेष — ऐप स्वयं बताएगा।'),
      t3('Tap "Find shubh muhurat" when planning a ceremony.', 'অনুষ্ঠান সাজাতে "শুভ মুহূর্ত খুঁজুন" চাপুন।', 'समारोह हेतु "शुभ मुहूर्त खोजें" दबाएँ।'),
    ],
    proTips: [
      t3('Record ancestors\' shraddha tithis — the app reminds the family every year.', 'পূর্বপুরুষের শ্রাদ্ধ-তিথি লিখুন — প্রতি বছর স্মরণ পাবেন।', 'पूर्वजों की श्राद्ध-तिथि दर्ज करें — प्रतिवर्ष स्मरण मिलेगा।'),
      t3('Post the dakshina to treasury after the ceremony — the circle of seva completes.', 'অনুষ্ঠানের পর দক্ষিণা কোষাগারে তুলুন।', 'समारोह के बाद दक्षिणा कोषागार में चढ़ाएँ।'),
    ],
    relatedModules: ['panjika', 'devotees', 'purohit', 'treasury'],
  },
  {
    id: 'pathshala',
    name: t3('Pathshala', 'পাঠশালা', 'पाठशाला'),
    tagline: t3('Where shastras are learned and character is built.', 'যেখানে শাস্ত্র শেখা হয়, চরিত্র গড়ে ওঠে।', 'जहाँ शास्त्र सीखे जाते हैं, चरित्र गढ़ा जाता है।'),
    whatItIs: t3(
      'The gurukul school manager — students, classes from Prathama to Acharya, attendance, shloka scores, fees and examinations, in the guru-shishya spirit.',
      'গুরুকুল পরিচালনা — ছাত্র, প্রথমা থেকে আচার্য শ্রেণি, উপস্থিতি, শ্লোক-নম্বর, ফি ও পরীক্ষা।',
      'गुरुकुल प्रबंधन — छात्र, प्रथमा से आचार्य श्रेणी, उपस्थिति, श्लोक-अंक, शुल्क व परीक्षा।'
    ),
    whyItMatters: t3(
      'Acharyas track each shishya\'s journey, not just marks. Guardians see attendance and progress. Fees stay orderly — vidya-dana honoured properly.',
      'আচার্যরা প্রতিটি শিষ্যের যাত্রা দেখেন। অভিভাবকরা অগ্রগতি জানেন।',
      'आचार्य प्रत्येक शिष्य की यात्रा देखते हैं। अभिभावक प्रगति जानते हैं।'
    ),
    firstSteps: [
      t3('Enrol students with guardian contacts.', 'অভিভাবকের ফোনসহ ছাত্র ভর্তি করুন।', 'अभिभावक के फ़ोन सहित छात्र प्रवेश दें।'),
      t3('Mark daily attendance and sandhya regularity.', 'দৈনিক উপস্থিতি ও সন্ধ্যা-নিয়ম লিখুন।', 'दैनिक उपस्थिति व संध्या-नियम दर्ज करें।'),
      t3('Set the exam date-sheet and fee schedule.', 'পরীক্ষার রুটিন ও ফির তালিকা দিন।', 'परीक्षा कार्यक्रम व शुल्क सूची दें।'),
    ],
    proTips: [
      t3('Note each student\'s upanayanam date — samskaras are part of the curriculum.', 'প্রতিটি ছাত্রের উপনয়ন তারিখ লিখুন।', 'प्रत्येक छात्र की उपनयन तिथि दर्ज करें।'),
      t3('Share shloka recitation scores with guardians — pride fuels practice.', 'অভিভাবকদের শ্লোক-নম্বর জানান।', 'अभिभावकों को श्लोक-अंक बताएँ।'),
    ],
    relatedModules: ['samskara', 'treasury', 'devotees', 'sangam'],
  },
  {
    id: 'goshala',
    name: t3('Goshala', 'গোশালা', 'गोशाला'),
    tagline: t3('Seva to Gomata — herd, health and milk, with love.', 'গোমাতার সেবা — পাল, স্বাস্থ্য ও দুধ, ভালোবাসায়।', 'गोमाता की सेवा — झुंड, स्वास्थ्य व दूध, स्नेह से।'),
    whatItIs: t3(
      'Care for every cow — health records, vet checkups, milk yields, breeding and fodder. Devotees can adopt a gomata and sponsor her care.',
      'প্রতিটি গরুর যত্ন — স্বাস্থ্য-নথি, চিকিৎসা, দুধ, প্রজনন ও খড়। ভক্তরা গোমাতা দত্তক নিতে পারেন।',
      'प्रत्येक गाय की देखभाल — स्वास्थ्य-अभिलेख, चिकित्सा, दूध, प्रजनन व चारा। भक्त गोमाता गोद ले सकते हैं।'
    ),
    whyItMatters: t3(
      'Gopalaks never miss a vaccination. Trustees see the true cost of gau-seva. Adopters watch their gomata thrive — dana made visible.',
      'গোপালকরা টিকা ভোলেন না। দত্তকদাতারা গোমাতার সুখ দেখেন।',
      'गोपालक टीका नहीं भूलते। गोद लेने वाले गोमाता को फलते देखते हैं।'
    ),
    firstSteps: [
      t3('Register each animal — tag, breed, age, health status.', 'প্রতিটি পশু নথিভুক্ত করুন — ট্যাগ, জাত, বয়স।', 'प्रत्येक पशु पंजीकृत करें — टैग, नस्ल, आयु।'),
      t3('Log vet visits and upcoming vaccinations.', 'চিকিৎসা ও আসন্ন টিকা লিখুন।', 'चिकित्सा व आगामी टीके दर्ज करें।'),
      t3('Record daily milk yield per lactating gomata.', 'দুগ্ধবতী গোমাতার দৈনিক দুধ লিখুন।', 'दुधारू गोमाता का दैनिक दूध दर्ज करें।'),
    ],
    proTips: [
      t3('A vet check every 6 months is the minimum dharma of care.', '৬ মাসে একবার চিকিৎসা — যত্নের ন্যূনতম ধর্ম।', '6 मास में एक बार चिकित्सा — देखभाल का न्यूनतम धर्म।'),
      t3('Share adoption stories in Sangam — one photo inspires ten adopters.', 'দত্তকের গল্প সঙ্গমে দিন — এক ছবি দশ দাতা আনে।', 'गोद लेने की कथाएँ संगम में दें — एक चित्र दस दाता लाता है।'),
    ],
    relatedModules: ['inventory', 'treasury', 'devotees', 'sangam'],
  },
  {
    id: 'matha',
    name: t3('Matha', 'মঠ', 'मठ'),
    tagline: t3('Monastic order — parampara, discipline and daily sadhana.', 'সন্ন্যাস-পরম্পরা — শৃঙ্খলা ও নিত্য সাধনা।', 'संन्यास-परंपरा — अनुशासन व नित्य साधना।'),
    whatItIs: t3(
      'For ashrams and maths — resident sadhaks, daily schedules, parampara lineage, dakshina records and the quiet administration of a contemplative life.',
      'আশ্রম-মঠের জন্য — আবাসিক সাধক, দৈনিক সূচি, পরম্পরা-বংশ, দক্ষিণা-নথি।',
      'आश्रम-मठ हेतु — आवासीय साधक, दैनिक सूची, परंपरा-वंश, दक्षिणा-अभिलेख।'
    ),
    whyItMatters: t3(
      'Mahants keep the parampara\'s records unbroken. Sadhaks follow one shared rhythm. The outer order protects the inner silence.',
      'মহন্তরা পরম্পরার নথি অক্ষুণ্ণ রাখেন। বাইরের শৃঙ্খলা ভেতরের নীরবতা রক্ষা করে।',
      'महंत परंपरा के अभिलेख अक्षुण्ण रखते हैं। बाह्य अनुशासन आंतरिक मौन की रक्षा करता है।'
    ),
    firstSteps: [
      t3('Record the parampara lineage — guru to shishya, unbroken.', 'পরম্পরা-বংশ লিখুন — গুরু থেকে শিষ্য।', 'परंपरा-वंश दर्ज करें — गुरु से शिष्य।'),
      t3('Set the daily schedule — mangal aarti to shayan.', 'দৈনিক সূচি দিন — মঙ্গল আরতি থেকে শয়ন।', 'दैनिक सूची तय करें — मंगल आरती से शयन तक।'),
      t3('List resident sadhaks with their diksha dates.', 'আবাসিক সাধকদের দীক্ষা-তারিখসহ তালিকা করুন।', 'आवासीय साधकों को दीक्षा-तिथि सहित सूचीबद्ध करें।'),
    ],
    proTips: [
      t3('Keep the matha\'s records as carefully as its mantras.', 'মন্ত্রের মতো যত্নে মঠের নথি রাখুন।', 'मंत्रों जैसी सावधानी से मठ के अभिलेख रखें।'),
      t3('Dakshina received flows to treasury — renunciation and accounts both stay pure.', 'দক্ষিণা কোষাগারে যাক — ত্যাগ ও হিসাব দুটোই শুদ্ধ।', 'दक्षिणा कोषागार में जाए — त्याग व हिसाब दोनों शुद्ध।'),
    ],
    relatedModules: ['devotees', 'treasury', 'samskara', 'sangam'],
  },
  {
    id: 'sangam',
    name: t3('Sangam', 'সঙ্গম', 'संगम'),
    tagline: t3('The community\'s confluence — satsang, seva and celebration.', 'সমাজের সঙ্গম — সৎসঙ্গ, সেবা ও উৎসব।', 'समाज का संगम — सत्संग, सेवा व उत्सव।'),
    whatItIs: t3(
      'Your dharmic social circle — share shlokas, organise seva drives, announce satsangs, celebrate utsavs together. Ashirvad, not likes.',
      'আপনার ধার্মিক সমাজ-বৃত্ত — শ্লোক, সেবা-অভিযান, সৎসঙ্গ, উৎসব। আশীর্বাদ, লাইক নয়।',
      'आपका धार्मिक समाज-वृत्त — श्लोक, सेवा-अभियान, सत्संग, उत्सव। आशीर्वाद, लाइक नहीं।'
    ),
    whyItMatters: t3(
      'Devotees stay connected beyond temple visits. Seva finds volunteers in hours. The young discover dharma in their own language.',
      'ভক্তরা মন্দিরের বাইরেও যুক্ত থাকেন। সেবা ঘণ্টায় স্বেচ্ছাসেবক পায়।',
      'भक्त मंदिर के बाहर भी जुड़े रहते हैं। सेवा घंटों में स्वयंसेवक पाती है।'
    ),
    firstSteps: [
      t3('Share your first shloka with its source — Gita 2.47 is a fine start.', 'প্রথম শ্লোক উৎসসহ দিন।', 'पहला श्लोक स्रोत सहित साझा करें।'),
      t3('Post a seva opportunity — beach cleanup, annadanam, tree planting.', 'সেবার সুযোগ দিন — অন্নদান, বৃক্ষরোপণ।', 'सेवा का अवसर दें — अन्नदान, वृक्षारोपण।'),
      t3('Create a satsang event and invite your circle.', 'সৎসঙ্গ অনুষ্ঠান বানিয়ে বৃত্তকে ডাকুন।', 'सत्संग कार्यक्रम बनाकर मंडली को बुलाएँ।'),
    ],
    proTips: [
      t3('Give ashirvad generously — it is the currency of this sangam.', 'উদারমনে আশীর্বাদ দিন — এটিই সঙ্গমের মুদ্রা।', 'उदारता से आशीर्वाद दें — यही संगम की मुद्रा है।'),
      t3('Report unkindness, don\'t return it — the moderators keep this space sacred.', 'অভদ্রতা রিপোর্ট করুন, ফেরত দেবেন না।', 'अशिष्टता की रिपोर्ट करें, लौटाएँ नहीं।'),
    ],
    relatedModules: ['devotees', 'events', 'panjika', 'hr'],
  },
  {
    id: 'jyotish',
    name: t3('Jyotish', 'জ্যোতিষ', 'ज्योतिष'),
    tagline: t3('The science of light — guidance, never fear.', 'জ্যোতির বিজ্ঞান — পথনির্দেশ, ভয় নয়।', 'ज्योति का विज्ञान — मार्गदर्शन, भय नहीं।'),
    whatItIs: t3(
      'Vedic astrology consultations — kundali reading, gochar analysis and muhurat advice from verified jyotishis. Honest guidance rooted in shastra.',
      'বৈদিক জ্যোতিষ পরামর্শ — কুণ্ডলী, গোচর ও মুহূর্ত-উপদেশ, যাচাইকৃত জ্যোতিষীদের থেকে।',
      'वैदिक ज्योतिष परामर्श — कुंडली, गोचर व मुहूर्त-उपदेश, सत्यापित ज्योतिषियों से।'
    ),
    whyItMatters: t3(
      'Seekers get counsel without superstition or fear-mongering. Jyotishis build practice with dignity. Shastra\'s light, not shadow.',
      'ভয় ছাড়াই পরামর্শ। জ্যোতিষীরা মর্যাদায় চর্চা গড়েন।',
      'भय बिना परामर्श। ज्योतिषी मर्यादा से साधना बढ़ाते हैं।'
    ),
    firstSteps: [
      t3('Share your birth details — date, time and place — for accurate reading.', 'জন্ম-বিবরণ দিন — তারিখ, সময়, স্থান।', 'जन्म-विवरण दें — तिथि, समय, स्थान।'),
      t3('Choose a consultation type — kundali, prashna, or muhurat.', 'পরামর্শের ধরন বেছে নিন।', 'परामर्श का प्रकार चुनें।'),
      t3('Book through the Seva Marketplace — dakshina held safely till completion.', 'সেবা বাজার থেকে বুক করুন।', 'सेवा बाज़ार से बुक करें।'),
    ],
    proTips: [
      t3('A good jyotishi explains remedies, not just problems.', 'ভালো জ্যোতিষী উপায় বলেন, শুধু সমস্যা নয়।', 'अच्छे ज्योतिषी उपाय बताते हैं, केवल समस्या नहीं।'),
      t3('Daily rashifal is gentle guidance — life decisions deserve a full reading.', 'দৈনিক রাশিফল মৃদু নির্দেশ — বড় সিদ্ধান্তে পূর্ণ পাঠ নিন।', 'दैनिक राशिफल मृदु मार्गदर्शन है — बड़े निर्णयों हेतु पूर्ण पाठ लें।'),
    ],
    relatedModules: ['panjika', 'marketplace', 'wallet', 'samskara'],
  },
  {
    id: 'purohit',
    name: t3('Purohit', 'পুরোহিত', 'पुरोहित'),
    tagline: t3('The yajman\'s guide — vidhi performed with devotion.', 'যজমানের পথপ্রদর্শক — ভক্তিতে বিধি পালন।', 'यजमान के पथप्रदर्शक — भक्ति से विधि पालन।'),
    whatItIs: t3(
      'Connect with learned purohits for puja, hawan, vivah and all samskaras — at home or temple. Verified credentials, transparent dakshina, ashirvad reviews.',
      'পূজা, হবন, বিবাহ ও সংস্কারে বিদ্বান পুরোহিত — বাড়ি বা মন্দিরে। যাচাইকৃত পরিচয়, স্বচ্ছ দক্ষিণা।',
      'पूजा, हवन, विवाह व संस्कारों हेतु विद्वान पुरोहित — घर या मंदिर में। सत्यापित परिचय, पारदर्शी दक्षिणा।'
    ),
    whyItMatters: t3(
      'Families without a hereditary purohit find trusted vidhi. Purohits earn steadily with dignity. Tradition reaches every home, not just the well-connected.',
      'বংশ-পুরোহিতহীন পরিবার বিশ্বস্ত বিধি পায়। পুরোহিতরা মর্যাদায় উপার্জন করেন।',
      'वंश-पुरोहितहीन परिवार विश्वसनीय विधि पाते हैं। पुरोहित मर्यादा से कमाते हैं।'
    ),
    firstSteps: [
      t3('Describe your need — which puja or samskara, and when.', 'প্রয়োজন লিখুন — কোন পূজা, কবে।', 'आवश्यकता लिखें — कौन सी पूजा, कब।'),
      t3('Browse verified purohits by tradition and language.', 'ঐতিহ্য ও ভাষায় যাচাইকৃত পুরোহিত দেখুন।', 'परंपरा व भाषा से सत्यापित पुरोहित देखें।'),
      t3('Take sankalp — the purohit confirms, and the vidhi is arranged.', 'সংকল্প নিন — পুরোহিত নিশ্চিত করবেন।', 'संकल्प लें — पुरोहित सुनिश्चित करेंगे।'),
    ],
    proTips: [
      t3('Share your gotra and family tradition upfront — the vidhi adapts to it.', 'গোত্র ও কুলাচার আগেই জানান।', 'गोत्र व कुलाचार पहले ही बताएँ।'),
      t3('For providers: keep your calendar updated — festival seasons book out fast.', 'প্রদানকারী: ক্যালেন্ডার হালনাগাদ রাখুন।', 'प्रदाता: कैलेंडर अद्यतन रखें।'),
    ],
    relatedModules: ['marketplace', 'samskara', 'panjika', 'wallet'],
  },
  {
    id: 'godmode',
    name: t3('Owner Console', 'মালিক কনসোল', 'स्वामी कंसोल'),
    tagline: t3('The institution\'s command centre — insight, control, care.', 'প্রতিষ্ঠানের নিয়ন্ত্রণ-কেন্দ্র — দৃষ্টি, নিয়ন্ত্রণ, যত্ন।', 'संस्था का नियंत्रण-केंद्र — दृष्टि, नियंत्रण, देखभाल।'),
    whatItIs: t3(
      'The owner\'s dashboard — live metrics, member management, billing, moderation, finance and content, all governed with a light but firm hand.',
      'মালিকের ড্যাশবোর্ড — সরাসরি পরিমাপ, সদস্য, বিলিং, সংযম, অর্থ ও বিষয়বস্তু।',
      'स्वामी का डैशबोर्ड — सजीव माप, सदस्य, बिलिंग, संयम, वित्त व सामग्री।'
    ),
    whyItMatters: t3(
      'Owners see everything that matters in one calm view. Problems surface before they grow. The institution runs on insight, not anxiety.',
      'মালিক এক দৃষ্টিতে সব দেখেন। সমস্যা বাড়ার আগেই ধরা পড়ে।',
      'स्वामी एक दृष्टि में सब देखते हैं। समस्या बढ़ने से पहले पकड़ी जाती है।'
    ),
    firstSteps: [
      t3('Review the Insights tab — it tells you where attention is needed.', 'ইনসাইট ট্যাব দেখুন — কোথায় দৃষ্টি দরকার বলে দেবে।', 'इनसाइट टैब देखें — कहाँ ध्यान चाहिए बता देगा।'),
      t3('Approve pending verifications and top-up claims daily.', 'প্রতিদিন যাচাইকরণ ও টপ-আপ অনুমোদন করুন।', 'प्रतिदिन सत्यापन व टॉप-अप अनुमोदित करें।'),
      t3('Check Finance for your true cash position, weekly.', 'সাপ্তাহিক অর্থ-অবস্থা দেখুন।', 'साप्ताहिक वित्त-स्थिति देखें।'),
    ],
    proTips: [
      t3('The audit log is append-only — every action leaves a sacred trail.', 'নিরীক্ষা-নথি অপরিবর্তনীয় — প্রতিটি কাজের চিহ্ন থাকে।', 'ऑडिट-लॉग अपरिवर्तनीय है — प्रत्येक कार्य का चिह्न रहता है।'),
      t3('Adjust plan limits and seva contributions here — the whole platform follows.', 'এখানেই সীমা ও অবদান বদলান।', 'यहीं सीमा व योगदान बदलें।'),
    ],
    relatedModules: ['treasury', 'marketplace', 'wallet', 'devotees'],
  },

  /* ------------------------------------------------------------------ */
  /* Money & Chat guides (chat module + P2P money requests)              */
  /* ------------------------------------------------------------------ */
  {
    id: 'chat',
    name: t3('Chat', 'চ্যাট', 'चैट'),
    tagline: t3('Calm conversations — everyone verified by Sanatani ID.', 'শান্ত কথোপকথন — সবাই সনাতনী পরিচয়ে যাচাইকৃত।', 'शांत बातचीत — सभी सनातनी पहचान से सत्यापित।'),
    whatItIs: t3(
      'One-to-one and temple conversations with people you trust. No noise, no strangers — every participant carries a verified Sanatani ID, and temple threads show the sender\'s name and role.',
      'বিশ্বস্ত মানুষের সঙ্গে একান্ত ও মন্দির-কথোপকথন। কোনো কোলাহল নেই, অপরিচিত নেই — প্রত্যেকের যাচাইকৃত সনাতনী পরিচয় আছে।',
      'विश्वसनीय लोगों से एकांत व मंदिर-बातचीत। कोई शोर नहीं, कोई अजनबी नहीं — प्रत्येक की सत्यापित सनातनी पहचान है।'
    ),
    whyItMatters: t3(
      'Families coordinate pujas without WhatsApp chaos. Temples announce to members in one trusted thread. Money requests live inside the conversation they belong to — never lost in a chat scroll.',
      'পরিবার পূজার সমন্বয় করে বিশৃঙ্খলা ছাড়াই। মন্দির এক বিশ্বস্ত থ্রেডে ঘোষণা দেয়। টাকার অনুরোধ সেই কথোপকথনেই থাকে।',
      'परिवार बिना अव्यवस्था पूजा का समन्वय करते हैं। मंदिर एक विश्वसनीय थ्रेड में घोषणा देता है। धन-अनुरोध उसी बातचीत में रहता है।'
    ),
    firstSteps: [
      t3('Open Messages from your home — your conversations wait there.', 'হোম থেকে বার্তা খুলুন — কথোপকথন সেখানেই।', 'होम से संदेश खोलें — बातचीत वहीं है।'),
      t3('Start a chat from any devotee, purohit or jyotishi profile.', 'যেকোনো ভক্ত, পুরোহিত বা জ্যোতিষীর প্রোফাইল থেকে চ্যাট শুরু করুন।', 'किसी भी भक्त, पुरोहित या ज्योतिषी की प्रोफ़ाइल से चैट आरंभ करें।'),
      t3('Temple threads are marked with the organisation\'s name and logo.', 'মন্দির-থ্রেডে সংস্থার নাম ও লোগো থাকে।', 'मंदिर-थ्रेड में संस्था का नाम व लोगो रहता है।'),
    ],
    proTips: [
      t3('Unread counts appear on the Messages button — your sangha is speaking.', 'বার্তা বোতামে অপঠিত সংখ্যা — আপনার সঙ্ঘ কথা বলছে।', 'संदेश बटन पर अपठित संख्या — आपका संघ बोल रहा है।'),
      t3('Archive old threads to keep your list calm — nothing is ever deleted.', 'পুরনো থ্রেড আর্কাইভ করুন — কিছুই মোছে না।', 'पुराने थ्रेड अभिलेखित करें — कुछ मिटता नहीं।'),
    ],
    relatedModules: ['p2p-requests', 'chat-blessings', 'sangam', 'devotees'],
  },
  {
    id: 'chat-blessings',
    name: t3('Blessing Cards', 'আশীর্বাদ কার্ড', 'आशीर्वाद कार्ड'),
    tagline: t3('Send warmth that a forwarded image can never carry.', 'ফরোয়ার্ড ছবি যা দিতে পারে না, সেই উষ্ণতা পাঠান।', 'अग्रेषित चित्र जो न दे सके, वह स्नेह भेजें।'),
    whatItIs: t3(
      'Beautiful festival greeting cards sent inside any chat — Diwali, Durga Puja, Ekadashi, birthdays. They arrive as a special card, not plain text, and the app gently reminds you before big festivals.',
      'যেকোনো চ্যাটে পাঠানো সুন্দর উৎসব-শুভেচ্ছা কার্ড — দীপাবলি, দুর্গাপূজা, একাদশী, জন্মদিন। বড় উৎসবের আগে অ্যাপ মৃদু স্মরণ দেয়।',
      'किसी भी चैट में भेजे जाने वाले सुंदर उत्सव-शुभकामना कार्ड — दीपावली, दुर्गापूजा, एकादशी, जन्मदिन। बड़े उत्सवों से पहले ऐप मृदु स्मरण देता है।'
    ),
    whyItMatters: t3(
      'A personal blessing keeps relationships warm across distance. Elders feel remembered; friends feel seen. It is ashirvad, not a like button.',
      'ব্যক্তিগত আশীর্বাদ দূরত্বেও সম্পর্ক উষ্ণ রাখে। এটিই আশীর্বাদ, লাইক বোতাম নয়।',
      'व्यक्तिगत आशीर्वाद दूरी में भी संबंध उष्ण रखता है। यही आशीर्वाद है, लाइक बटन नहीं।'
    ),
    firstSteps: [
      t3('Open any conversation and tap the blessing button.', 'যেকোনো কথোপকথন খুলে আশীর্বাদ বোতাম চাপুন।', 'कोई भी बातचीत खोलकर आशीर्वाद बटन दबाएँ।'),
      t3('Choose the occasion — the card designs itself.', 'উপলক্ষ বেছে নিন — কার্ড নিজেই সাজে।', 'अवसर चुनें — कार्ड स्वयं सजता है।'),
      t3('Watch for festival reminders in your Suchana feed.', 'সূচনা ফিডে উৎসব-স্মরণ দেখুন।', 'सूचना फ़ीड में उत्सव-स्मरण देखें।'),
    ],
    proTips: [
      t3('Send blessings a day early — yours arrives before the flood of forwards.', 'এক দিন আগে পাঠান — ফরোয়ার্ডের ভিড়ের আগেই পৌঁছাবে।', 'एक दिन पहले भेजें — अग्रेषणों की भीड़ से पहले पहुँचेगा।'),
      t3('A blessing to a recent chat means more than one to a silent thread.', 'সাম্প্রতিক চ্যাটে আশীর্বাদ বেশি অর্থবহ।', 'हाल की चैट में आशीर्वाद अधिक अर्थपूर्ण है।'),
    ],
    relatedModules: ['chat', 'panjika', 'sangam'],
  },
  {
    id: 'p2p-requests',
    name: t3('Money Requests', 'টাকার অনুরোধ', 'धन-अनुरोध'),
    tagline: t3('Ask, agree and track — money with a clear record.', 'চান, সম্মত হন, হিসাব রাখুন — স্পষ্ট নথিতে টাকা।', 'माँगें, सहमत हों, हिसाब रखें — स्पष्ट अभिलेख में धन।'),
    whatItIs: t3(
      'A request card inside any chat: amount, note, and a 48-hour window. The other person accepts, declines, or counters — then pays on their own bKash/Nagad/UPI. The app never holds your money; it only keeps the honest record.',
      'যেকোনো চ্যাটে রিকোয়েস্ট কার্ড — টাকা, নোট, ৪৮ ঘণ্টার সময়। অপরজন গ্রহণ, প্রত্যাখ্যান বা পাল্টা প্রস্তাব দেন — তারপর নিজের বিকাশ/নগদ/UPI-তে দেন। অ্যাপ টাকা রাখে না, শুধু সৎ হিসাব রাখে।',
      'किसी भी चैट में अनुरोध कार्ड — राशि, नोट, 48 घंटे की अवधि। दूसरा व्यक्ति स्वीकार, अस्वीकार या प्रतिप्रस्ताव देता है — फिर अपने bKash/Nagad/UPI से देता है। ऐप धन नहीं रखता, केवल ईमानदार हिसाब रखता है।'
    ),
    whyItMatters: t3(
      'No more "you forgot the 500 taka" arguments — every agreement is written, timestamped, and visible to both sides. Borrowing stays friendly because the record stays clear.',
      '"৫০০ টাকা ভুলে গেছ" ঝগড়া আর নয় — প্রতিটি সম্মতি লিখিত ও সময়-চিহ্নিত। হিসাব স্পষ্ট থাকলে ধার বন্ধুত্বপূর্ণ থাকে।',
      '"500 रुपये भूल गए" जैसे झगड़े नहीं — प्रत्येक सहमति लिखित व समय-अंकित। हिसाब स्पष्ट रहे तो उधार मैत्रीपूर्ण रहता है।'
    ),
    firstSteps: [
      t3('Open a chat, tap "Request money", enter amount and a note.', 'চ্যাট খুলে "টাকা চান" চাপুন, পরিমাণ ও নোট দিন।', 'चैट खोलकर "धन माँगें" दबाएँ, राशि व नोट दें।'),
      t3('The card appears in the conversation — they tap Accept or Decline.', 'কার্ড কথোপকথনে আসে — তাঁরা গ্রহণ বা প্রত্যাখ্যান করেন।', 'कार्ड बातचीत में आता है — वे स्वीकार या अस्वीकार करते हैं।'),
      t3('Share the request as a QR code for in-person settling.', 'সামনাসামনি মেটাতে QR কোড হিসেবে শেয়ার করুন।', 'सामने निपटाने हेतु QR कोड के रूप में साझा करें।'),
    ],
    proTips: [
      t3('Write a clear note — "prasad fund" beats "money" six months later.', 'স্পষ্ট নোট লিখুন — ছয় মাস পরে "প্রসাদ তহবিল" বোঝা যায়।', 'स्पष्ट नोट लिखें — छह मास बाद "प्रसाद निधि" समझ आएगा।'),
      t3('Requests expire after 48 hours — resend rather than chase.', '৪৮ ঘণ্টায় মেয়াদ শেষ — তাড়া না করে আবার পাঠান।', '48 घंटे में अवधि समाप्त — पीछा न करें, पुनः भेजें।'),
    ],
    relatedModules: ['chat', 'p2p-lifecycle', 'p2p-wallet', 'p2p-safety'],
  },
  {
    id: 'p2p-lifecycle',
    name: t3('Request Lifecycle', 'অনুরোধের জীবনচক্র', 'अनुरोध जीवनचक्र'),
    tagline: t3('Request → accept → mark paid → confirm. Four steps, zero confusion.', 'অনুরোধ → গ্রহণ → পরিশোধ চিহ্নিত → নিশ্চিত। চার ধাপ, শূন্য বিভ্রান্তি।', 'अनुरोध → स्वीकार → भुगतान चिह्नित → पुष्टि। चार चरण, शून्य भ्रम।'),
    whatItIs: t3(
      'Every money request walks the same four steps: someone requests, the other accepts, the payer pays on their own bKash/Nagad/UPI and marks paid, and the receiver confirms. At each step both sides see the same status — no "I thought you sent it" ever again.',
      'প্রতিটি অনুরোধ একই চার ধাপে চলে — অনুরোধ, গ্রহণ, নিজের বিকাশ/নগদ/UPI-তে পেমেন্ট ও "পরিশোধিত" চিহ্ন, গ্রহীতার নিশ্চিতকরণ। প্রতিটি ধাপে দুই পক্ষ একই অবস্থা দেখে।',
      'प्रत्येक अनुरोध उन्हीं चार चरणों में चलता है — अनुरोध, स्वीकार, अपने bKash/Nagad/UPI से भुगतान व "भुगतान" चिह्न, प्राप्तकर्ता की पुष्टि। प्रत्येक चरण में दोनों पक्ष एक ही स्थिति देखते हैं।'
    ),
    whyItMatters: t3(
      'Money misunderstandings end friendships. A shared, step-by-step record means both sides always agree on what happened — the app is the calm witness.',
      'টাকার ভুল বোঝাবুঝি বন্ধুত্ব শেষ করে। ধাপে ধাপে যৌথ নথি মানে দুই পক্ষই একমত — অ্যাপই শান্ত সাক্ষী।',
      'धन की गलतफहमी मित्रता समाप्त करती है। चरणबद्ध संयुक्त अभिलेख से दोनों पक्ष सदा सहमत — ऐप ही शांत साक्षी है।'
    ),
    firstSteps: [
      t3('Request: send a card with amount and note from any chat.', 'অনুরোধ: যেকোনো চ্যাট থেকে কার্ড পাঠান।', 'अनुरोध: किसी भी चैट से कार्ड भेजें।'),
      t3('Accept: the other person agrees — a promise is now on record.', 'গ্রহণ: অপরজন সম্মত — প্রতিশ্রুতি নথিভুক্ত।', 'स्वीकार: दूसरा सहमत — वचन दर्ज।'),
      t3('Mark paid + Confirm: payer pays on their own app and marks paid; receiver confirms receipt.', 'পরিশোধ চিহ্নিত + নিশ্চিত: প্রদানকারী দিয়ে চিহ্নিত করেন; গ্রহীতা নিশ্চিত করেন।', 'भुगतान चिह्नित + पुष्टि: भुगतानकर्ता देकर चिह्नित करता है; प्राप्तकर्ता पुष्टि करता है।'),
    ],
    proTips: [
      t3('Enter the bKash TrxID or UPI ref when marking paid — proof without argument.', '"পরিশোধিত" চিহ্নিত করার সময় TrxID দিন — তর্ক ছাড়াই প্রমাণ।', '"भुगतान" चिह्नित करते समय TrxID दें — तर्क बिना प्रमाण।'),
      t3('A counter-offer creates a fresh card — the old one is never edited silently.', 'পাল্টা প্রস্তাবে নতুন কার্ড হয় — পুরনোটি নীরবে বদলায় না।', 'प्रतिप्रस्ताव से नया कार्ड बनता है — पुराना चुपचाप नहीं बदलता।'),
    ],
    relatedModules: ['p2p-requests', 'p2p-wallet', 'p2p-qr', 'chat'],
  },
  {
    id: 'p2p-wallet',
    name: t3('My Wallet', 'আমার ওয়ালেট', 'मेरा वॉलेट'),
    tagline: t3('Your private money map — owed to me, I owe, settled smartly.', 'আপনার ব্যক্তিগত টাকার মানচিত্র — পাওনা, দেনা, বুদ্ধিতে নিষ্পত্তি।', 'आपका निजी धन-मानचित्र — प्राप्य, देय, बुद्धि से निपटान।'),
    whatItIs: t3(
      'A private ledger of every money promise — what others owe you, what you owe others, and the full history. Only you can see it: not the temple, not the platform. When it spots a shortcut (Rahim pays Karim directly instead of through you), it gently suggests netting — it never moves money itself.',
      'প্রতিটি টাকার প্রতিশ্রুতির ব্যক্তিগত খাতা — পাওনা, দেনা ও পূর্ণ ইতিহাস। শুধু আপনি দেখতে পাবেন। সহজ পথ দেখলে (রহিম সরাসরি করিমকে দিলে) মৃদু নেটিং পরামর্শ দেয় — নিজে টাকা নাড়ে না।',
      'प्रत्येक धन-वचन का निजी खाता — प्राप्य, देय व पूर्ण इतिहास। केवल आप देख सकते हैं। आसान रास्ता दिखे तो (रहीम सीधे करीम को दे) मृदु नेटिंग सुझाव देता है — स्वयं धन नहीं हिलाता।'
    ),
    whyItMatters: t3(
      'You always know exactly where you stand — no mental math, no forgotten loans. This is separate from the Seva Wallet (temple/marketplace money); personal promises stay personal.',
      'আপনি সবসময় জানেন কোথায় দাঁড়িয়ে — মানসিক হিসাব নয়, ভোলা ধার নয়। এটি সেবা ওয়ালেট থেকে আলাদা; ব্যক্তিগত প্রতিশ্রুতি ব্যক্তিগতই থাকে।',
      'आप सदा जानते हैं कहाँ खड़े हैं — मानसिक हिसाब नहीं, भूले उधार नहीं। यह सेवा वॉलेट से अलग है; व्यक्तिगत वचन व्यक्तिगत ही रहता है।'
    ),
    firstSteps: [
      t3('Open My Wallet from your home — green card, coin icon.', 'হোম থেকে আমার ওয়ালেট খুলুন — সবুজ কার্ড।', 'होम से मेरा वॉलेट खोलें — हरा कार्ड।'),
      t3('Check "Owed to me" and "I owe" — the two lists tell your whole story.', '"আমার পাওনা" ও "আমার দেনা" দেখুন।', '"मुझे मिलने वाला" व "मुझे देना है" देखें।'),
      t3('Tap any entry to jump straight to its conversation.', 'যেকোনো এন্ট্রিতে চাপুন — সরাসরি কথোপকথনে যান।', 'किसी भी प्रविष्टि पर दबाएँ — सीधे बातचीत में जाएँ।'),
    ],
    proTips: [
      t3('Settle one payment instead of two when netting suggests it — fewer transfers, same trust.', 'নেটিং পরামর্শ দিলে দুটির বদলে একটি পেমেন্ট করুন।', 'नेटिंग सुझाए तो दो के बजाय एक भुगतान करें।'),
      t3('History keeps every settled, declined and expired request — your memory, backed up.', 'ইতিহাসে সব নিষ্পত্তি থাকে — আপনার স্মৃতি, সংরক্ষিত।', 'इतिहास में सभी निपटान रहते हैं — आपकी स्मृति, सुरक्षित।'),
    ],
    relatedModules: ['p2p-requests', 'p2p-lifecycle', 'wallet', 'chat'],
  },
  {
    id: 'org-requests',
    name: t3('Temple Requests', 'মন্দিরের অনুরোধ', 'मंदिर के अनुरोध'),
    tagline: t3('When your temple asks — branded, logged, and accountable.', 'মন্দির চাইলে — ব্র্যান্ডেড, নথিভুক্ত, দায়বদ্ধ।', 'मंदिर माँगे तो — ब्रांडेड, दर्ज, उत्तरदायी।'),
    whatItIs: t3(
      'Temples can send money requests too — for chanda, event contributions, or seva funds. Only trustees and accountants may send them, each carries the temple\'s name and logo plus the sender\'s name, and every one is logged in the org ledger for all to audit.',
      'মন্দিরও টাকা চাইতে পারে — চাঁদা, অনুষ্ঠান-অবদান বা সেবা-তহবিলে। শুধু ট্রাস্টি ও হিসাবরক্ষক পাঠাতে পারেন; প্রতিটিতে মন্দিরের নাম-লোগো ও প্রেরকের নাম থাকে, এবং সংস্থার খাতায় নথিভুক্ত হয়।',
      'मंदिर भी धन माँग सकता है — चंदा, कार्यक्रम-योगदान या सेवा-निधि हेतु। केवल ट्रस्टी व लेखाकार भेज सकते हैं; प्रत्येक में मंदिर का नाम-लोगो व प्रेषक का नाम रहता है, और संस्था-खाते में दर्ज होता है।'
    ),
    whyItMatters: t3(
      'You always know a temple request is genuine — branded, named, and logged. No anonymous "send money" messages; no doubt about where it went.',
      'মন্দিরের অনুরোধ খাঁটি কিনা সবসময় বোঝা যায় — ব্র্যান্ডেড, নামসহ, নথিভুক্ত।',
      'मंदिर का अनुरोध असली है या नहीं, सदा पता चलता है — ब्रांडेड, नाम सहित, दर्ज।'
    ),
    firstSteps: [
      t3('Temple requests arrive in your temple thread — look for the logo.', 'মন্দির-থ্রেডে আসে — লোগো দেখুন।', 'मंदिर-थ्रेड में आते हैं — लोगो देखें।'),
      t3('Check the trustee\'s name on the card before accepting.', 'গ্রহণের আগে কার্ডে ট্রাস্টির নাম দেখুন।', 'स्वीकारने से पहले कार्ड में ट्रस्टी का नाम देखें।'),
      t3('Trustees: review all org requests together in the Org Request Ledger.', 'ট্রাস্টিরা: সংস্থার খাতায় সব অনুরোধ একসঙ্গে দেখুন।', 'ट्रस्टी: संस्था-खाते में सभी अनुरोध एक साथ देखें।'),
    ],
    proTips: [
      t3('A real temple request always shows a logo and a trustee name — both.', 'আসল অনুরোধে লোগো ও ট্রাস্টির নাম — দুটোই থাকে।', 'असली अनुरोध में लोगो व ट्रस्टी का नाम — दोनों रहते हैं।'),
      t3('Your Suchana feed notes when your temple sent several requests this month.', 'মন্দির এক মাসে कई অনুরোধ পাঠালে সূচনা জানায়।', 'मंदिर एक मास में कई अनुरोध भेजे तो सूचना बताती है।'),
    ],
    relatedModules: ['chat', 'p2p-requests', 'p2p-lifecycle', 'treasury'],
  },
  {
    id: 'p2p-qr',
    name: t3('Request QR Codes', 'অনুরোধের QR কোড', 'अनुरोध QR कोड'),
    tagline: t3('Show a code, settle face-to-face — no typing, no mistakes.', 'কোড দেখান, সামনাসামনি মেটান — টাইপ নয়, ভুল নয়।', 'कोड दिखाएँ, सामने निपटाएँ — टाइपिंग नहीं, भूल नहीं।'),
    whatItIs: t3(
      'Every money request can become a QR code. Show it to the other person — they scan it and the exact request (amount, note, who) opens on their phone. Perfect for prasad counters, event desks, and splitting a rickshaw fare.',
      'প্রতিটি অনুরোধ QR কোড হতে পারে। অপরজনকে দেখান — স্ক্যান করলেই সঠিক অনুরোধ তাঁর ফোনে খুলবে। প্রসাদ কাউন্টার, অনুষ্ঠান ও ভাড়া ভাগে উপযোগী।',
      'प्रत्येक अनुरोध QR कोड बन सकता है। दूसरे को दिखाएँ — स्कैन करते ही सही अनुरोध उनके फ़ोन में खुलेगा। प्रसाद काउंटर, कार्यक्रम व किराया बाँटने हेतु उत्तम।'
    ),
    whyItMatters: t3(
      'No misheard amounts, no wrong numbers typed — the code carries the exact truth. Settling in person takes seconds.',
      'ভুল শোনা টাকা নয়, ভুল টাইপ নয় — কোডে সঠিক তথ্য। সামনাসামনি নিষ্পত্তি সেকেন্ডে।',
      'गलत सुनी राशि नहीं, गलत टाइपिंग नहीं — कोड में सही तथ्य। सामने निपटान सेकंडों में।'
    ),
    firstSteps: [
      t3('Open any request card and tap "Share as QR".', 'যেকোনো রিকোয়েস্ট কার্ড খুলে "QR হিসেবে শেয়ার" চাপুন।', 'कोई भी अनुरोध कार्ड खोलकर "QR के रूप में साझा करें" दबाएँ।'),
      t3('Let them scan — the request opens ready to accept.', 'তাঁদের স্ক্যান করতে দিন — অনুরোধ প্রস্তুত খুলবে।', 'उन्हें स्कैन करने दें — अनुरोध तैयार खुलेगा।'),
      t3('They pay on their own bKash/Nagad/UPI as usual.', 'তাঁরা নিজের বিকাশ/নগদ/UPI-তে দেন।', 'वे अपने bKash/Nagad/UPI से देते हैं।'),
    ],
    proTips: [
      t3('One QR = one request. A new request needs a new code — amounts can\'t be edited mid-scan.', 'এক QR = এক অনুরোধ। নতুন অনুরোধে নতুন কোড।', 'एक QR = एक अनुरोध। नए अनुरोध हेतु नया कोड।'),
      t3('Screenshot the QR for the event desk — it works from the gallery too.', 'অনুষ্ঠানের ডেস্কে QR-এর স্ক্রিনশট রাখুন।', 'कार्यक्रम डेस्क हेतु QR का स्क्रीनशॉट रखें।'),
    ],
    relatedModules: ['p2p-requests', 'p2p-lifecycle', 'chat'],
  },
  {
    id: 'p2p-safety',
    name: t3('Chat & Money Safety', 'চ্যাট ও টাকার নিরাপত্তা', 'चैट व धन सुरक्षा'),
    tagline: t3('Trust, with its eyes open.', 'চোখ খোলা রেখে বিশ্বাস।', 'आँखें खोलकर विश्वास।'),
    whatItIs: t3(
      'Simple habits that keep money friendships safe: verify before you pay, keep agreements inside the app\'s record, and know the difference between a real temple request (logo + trustee name + ledger entry) and a stranger\'s message. The app never asks for your bKash PIN — anyone who does is not us.',
      'টাকার বন্ধুত্ব নিরাপদ রাখার সহজ অভ্যাস — দেওয়ার আগে যাচাই, সম্মতি অ্যাপের নথিতে, আসল মন্দির-অনুরোধ (লোগো + ট্রাস্টির নাম) চেনা। অ্যাপ কখনো বিকাশ PIN চায় না — যে চায়, সে আমরা নই।',
      'धन-मित्रता सुरक्षित रखने की सरल आदतें — भुगतान से पहले सत्यापन, सहमति ऐप के अभिलेख में, असली मंदिर-अनुरोध (लोगो + ट्रस्टी नाम) की पहचान। ऐप कभी bKash PIN नहीं माँगता — जो माँगे, वह हम नहीं।'
    ),
    whyItMatters: t3(
      'Most money fraud is not hacking — it is rushing. A calm record, a verified identity, and thirty seconds of checking stop nearly all of it.',
      'বেশিরভাগ টাকার প্রতারণা হ্যাকিং নয় — তাড়াহুড়ো। শান্ত নথি, যাচাইকৃত পরিচয় ও ত্রিশ সেকেন্ড যাচাই প্রায় সব থামায়।',
      'अधिकांश धन-धोखाधड़ी हैकिंग नहीं — जल्दबाजी है। शांत अभिलेख, सत्यापित पहचान व तीस सेकंड की जाँच लगभग सब रोक देती है।'
    ),
    firstSteps: [
      t3('Before paying, match the request card to your chat — same person, same amount.', 'দেওয়ার আগে কার্ড চ্যাটের সঙ্গে মিলান — একই ব্যক্তি, একই টাকা।', 'भुगतान से पहले कार्ड चैट से मिलाएँ — वही व्यक्ति, वही राशि।'),
      t3('Never share bKash/Nagad/UPI PINs or OTPs — not even with "support".', 'PIN বা OTP কাউকে দেবেন না — "সাপোর্ট"কেও নয়।', 'PIN या OTP किसी को न दें — "सपोर्ट" को भी नहीं।'),
      t3('Keep the agreement in the app — a screenshot of a promise is weaker than the record.', 'সম্মতি অ্যাপেই রাখুন — স্ক্রিনশট নথির চেয়ে দুর্বল।', 'सहमति ऐप में ही रखें — स्क्रीनशॉट अभिलेख से कमज़ोर है।'),
    ],
    proTips: [
      t3('If a "temple" message lacks a logo and trustee name, treat it as a stranger\'s.', '"মন্দির" বার্তায় লোগো ও ট্রাস্টির নাম না থাকলে অপরিচিত ধরুন।', '"मंदिर" संदेश में लोगो व ट्रस्टी नाम न हो तो अजनबी समझें।'),
      t3('Decline kindly and quickly — a fast "not now" is kinder than silence.', 'স্নেহে দ্রুত প্রত্যাখ্যান করুন — নীরবতার চেয়ে "এখন নয়" ভালো।', 'स्नेह से शीघ्र अस्वीकार करें — मौन से "अभी नहीं" बेहतर है।'),
    ],
    relatedModules: ['p2p-requests', 'org-requests', 'chat', 'p2p-wallet'],
  },
];

export function getGuide(id: string): ModuleGuide | undefined {
  return MODULE_GUIDES.find((g) => g.id === id);
}

export function guideIds(): string[] {
  return MODULE_GUIDES.map((g) => g.id);
}
