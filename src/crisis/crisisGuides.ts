/**
 * crisisGuides.ts — Crisis Command entries for the Guide Center.
 * ===============================================================
 * Four warm, trilingual guides in the ModuleGuide shape
 * (src/lib/moduleGuides.ts): emergency contacts, triggering SOS,
 * what happens after SOS, and coordinator triage.
 *
 * REGISTRY WIRING: importing this module self-registers the guides
 * into MODULE_GUIDES (once), so GuideCenter + QuickGuideModal pick
 * them up without any edit to their files. `CRISIS_GUIDE_ICONS` covers
 * the GuideCenter icon map; `crisisGuideIds()` lists the new ids.
 *
 * Tone: Suchana — reassuring, plain, devotional. Never fear-mongering.
 */
import { MODULE_GUIDES, type ModuleGuide } from '../lib/moduleGuides';

type L3 = { en: string; bn: string; hi: string };
const t3 = (en: string, bn: string, hi: string): L3 => ({ en, bn, hi });

export const CRISIS_GUIDES: ModuleGuide[] = [
  {
    id: 'crisis-contacts',
    name: t3('Emergency Contacts', 'জরুরি যোগাযোগ', 'आपातकालीन संपर्क'),
    tagline: t3(
      'Your safety circle — the people who answer when it matters most.',
      'আপনার নিরাপত্তা বলয় — সবচেয়ে প্রয়োজনীয় মুহূর্তে যাঁরা উত্তর দেন।',
      'आपका सुरक्षा चक्र — सबसे आवश्यक क्षण में जो उत्तर देते हैं।'
    ),
    whatItIs: t3(
      'The list of people Crisis Command alerts when you send an SOS — family, close friends, a neighbour you trust. They receive your situation and your live location, nothing else, and only during an emergency.',
      'SOS পাঠালে যাঁদের জানানো হয় — পরিবার, ঘনিষ্ঠ বন্ধু, বিশ্বস্ত প্রতিবেশী। তাঁরা আপনার পরিস্থিতি ও লাইভ অবস্থান পান, আর কিছু নয়, শুধু জরুরি মুহূর্তে।',
      'SOS भेजने पर जिन्हें सूचित किया जाता है — परिवार, घनिष्ठ मित्र, विश्वस्त पड़ोसी। उन्हें आपकी स्थिति व लाइव स्थान मिलता है, और कुछ नहीं, केवल आपात क्षण में।'
    ),
    whyItMatters: t3(
      'An SOS with no one to hear it is a prayer into the wind. Two or three trusted contacts means someone always answers — that is the whole point of the safety net.',
      'যাঁদের শোনার কেউ নেই, সেই SOS বাতাসে প্রার্থনা। দু-তিনজন বিশ্বস্ত যোগাযোগ মানেই কেউ না কেউ উত্তর দেবেন — নিরাপত্তা জালের উদ্দেশ্য এটাই।',
      'जिसे सुनने वाला कोई न हो, वह SOS हवा में प्रार्थना है। दो-तीन विश्वस्त संपर्क का अर्थ है कोई न कोई उत्तर देगा — सुरक्षा जाल का उद्देश्य यही है।'
    ),
    firstSteps: [
      t3('Open your Safety settings and add your first contact — a family member is ideal.', 'নিরাপত্তা সেটিংসে প্রথম যোগাযোগ যোগ করুন — পরিবারের কেউ সবচেয়ে ভালো।', 'सुरक्षा सेटिंग में पहला संपर्क जोड़ें — परिवार का कोई सदस्य सर्वोत्तम।'),
      t3('Add a second contact who lives nearby — a neighbour or close friend.', 'কাছে থাকেন এমন দ্বিতীয়জন যোগ করুন — প্রতিবেশী বা ঘনিষ্ঠ বন্ধু।', 'पास रहने वाला दूसरा संपर्क जोड़ें — पड़ोसी या घनिष्ठ मित्र।'),
      t3('Tell them you have added them — a safety circle works best when it is mutual.', 'তাঁদের জানান — পারস্পরিক হলেই নিরাপত্তা বলয় সবচেয়ে ভালো কাজ করে।', 'उन्हें बताएँ — परस्पर होने पर सुरक्षा चक्र सर्वोत्तम काम करता है।'),
    ],
    proTips: [
      t3('Review your contacts once a year — numbers change, people move.', 'বছরে একবার যোগাযোগ দেখে নিন — নম্বর বদলায়, মানুষ সরে যায়।', 'वर्ष में एक बार संपर्क देख लें — नंबर बदलते हैं, लोग स्थानांतरित होते हैं।'),
      t3('Include one contact outside your city — local networks can fail together.', 'শহরের বাইরের একজন রাখুন — স্থানীয় নেটওয়ার্ক একসঙ্গে বন্ধ হতে পারে।', 'शहर के बाहर का एक संपर्क रखें — स्थानीय नेटवर्क एक साथ बंद हो सकते हैं।'),
    ],
    relatedModules: ['crisis-sos', 'crisis-after-sos', 'p2p-safety'],
  },
  {
    id: 'crisis-sos',
    name: t3('Sending an SOS', 'SOS পাঠানো', 'SOS भेजना'),
    tagline: t3(
      'One long-press. Help is already on its way.',
      'একবার চেপে ধরুন। সাহায্য ইতিমধ্যেই পথে।',
      'एक देर तक दबाएँ। सहायता पहले से रास्ते में।'
    ),
    whatItIs: t3(
      'The warm amber safety button, always within reach. Press and hold it, confirm your situation in one tap, and your safety circle plus your organisation\u2019s coordinators are notified with your live location.',
      'সবসময় হাতের নাগালে উষ্ণ অ্যাম্বার নিরাপত্তা বোতাম। চেপে ধরে রাখুন, এক ট্যাপে পরিস্থিতি নিশ্চিত করুন — আপনার নিরাপত্তা বলয় ও সংস্থার সমন্বয়কারীরা লাইভ অবস্থানসহ জানতে পারবেন।',
      'सदा पहुँच में उष्ण अंबर सुरक्षा बटन। दबाकर रखें, एक टैप से स्थिति निश्चित करें — आपका सुरक्षा चक्र व संस्था के समन्वयक लाइव स्थान सहित जान जाएँगे।'
    ),
    whyItMatters: t3(
      'In a real emergency nobody can navigate menus or type addresses. The long-press is deliberately hard to trigger by accident and impossible to fumble when you need it.',
      'আসল জরুরি অবস্থায় কেউ মেনু ঘাঁটতে বা ঠিকানা টাইপ করতে পারে না। দীর্ঘ-চাপ ভুলে চালু হওয়া কঠিন, প্রয়োজনে ব্যবহার অসম্ভব-সহজ — ইচ্ছাকৃত নকশা।',
      'वास्तविक आपात में कोई मेनू नहीं खोज सकता, पता नहीं लिख सकता। देर तक दबाव गलती से चालू होना कठिन, आवश्यकता में उपयोग अत्यंत सरल — सोचा-समझा डिज़ाइन।'
    ),
    firstSteps: [
      t3('Find the amber button — practise the press-and-hold now, while you are calm.', 'অ্যাম্বার বোতাম খুঁজুন — শান্ত থাকতেই চেপে ধরা অভ্যাস করুন।', 'अंबर बटन खोजें — शांत रहते ही दबाकर रखना अभ्यास करें।'),
      t3('Pick your situation from the gentle list — medical, fire, unsafe, lost, other.', 'তালিকা থেকে পরিস্থিতি বেছে নিন — চিকিৎসা, আগুন, অনিরাপদ, হারিয়ে যাওয়া, অন্যান্য।', 'सूची से स्थिति चुनें — चिकित्सा, आग, असुरक्षा, खो जाना, अन्य।'),
      t3('Confirm once — your location goes out only at this moment, to your circle only.', 'একবার নিশ্চিত করুন — শুধু এই মুহূর্তে, শুধু আপনার বলয়ে অবস্থান যায়।', 'एक बार निश्चित करें — केवल इसी क्षण, केवल आपके चक्र को स्थान जाता है।'),
    ],
    proTips: [
      t3('The button asks you to confirm — a pocket-dial cannot send a false alarm.', 'বোতাম নিশ্চিতকরণ চায় — পকেট-ডায়ালে ভুল সতর্কতা যায় না।', 'बटन पुष्टि माँगता है — जेब-डायल से झूठी चेतावनी नहीं जाती।'),
      t3('After sending, keep your phone on — responders may call you back.', 'পাঠানোর পর ফোন চালু রাখুন — সাহায্যকারীরা ফোন করতে পারেন।', 'भेजने के बाद फ़ोन चालू रखें — सहायक आपको कॉल कर सकते हैं।'),
    ],
    relatedModules: ['crisis-contacts', 'crisis-after-sos', 'crisis-triage'],
  },
  {
    id: 'crisis-after-sos',
    name: t3('After You Send SOS', 'SOS পাঠানোর পর', 'SOS भेजने के बाद'),
    tagline: t3(
      'What happens next — calmly, step by step.',
      'এরপর কী হয় — শান্তভাবে, ধাপে ধাপে।',
      'इसके बाद क्या होता है — शांति से, चरणबद्ध।'
    ),
    whatItIs: t3(
      'Once your SOS goes out, three things happen: your safety circle sees your situation and live location, your organisation\u2019s coordinators open a triage view, and a calm timeline tracks every response — who acknowledged, who is coming, when it resolves.',
      'SOS গেলে তিনটি ঘটনা: আপনার বলয় পরিস্থিতি ও লাইভ অবস্থান দেখেন, সংস্থার সমন্বয়কারীরা ট্রায়াজ ভিউ খোলেন, এবং শান্ত টাইমলাইনে প্রতিটি সাড়া — কে স্বীকার করলেন, কে আসছেন, কখন মিটল।',
      'SOS जाने पर तीन घटनाएँ: आपका चक्र स्थिति व लाइव स्थान देखता है, संस्था के समन्वयक छँटाई दृश्य खोलते हैं, और शांत समयरेखा प्रत्येक प्रतिक्रिया दर्ज करती है — किसने स्वीकारा, कौन आ रहा है, कब सुलझा।'
    ),
    whyItMatters: t3(
      'Emergencies feel chaotic; information should not. The timeline turns panic into a clear picture — everyone sees the same truth, so help arrives organised, not crowded.',
      'জরুরি অবস্থা বিশৃঙ্খল লাগে; তথ্য নয়। টাইমলাইন আতঙ্ককে স্পষ্ট চিত্রে বদলায় — সবাই এক সত্য দেখেন, সাহায্য গোছানো আসে, ভিড় করে নয়।',
      'आपात अव्यवस्थित लगता है; सूचना नहीं। समयरेखा घबराहट को स्पष्ट चित्र में बदलती है — सभी एक सत्य देखते हैं, सहायता व्यवस्थित आती है, भीड़ बनकर नहीं।'
    ),
    firstSteps: [
      t3('Watch the timeline — green ticks mean someone acknowledged your SOS.', 'টাইমলাইন দেখুন — সবুজ টিক মানে কেউ আপনার SOS স্বীকার করেছেন।', 'समयरेखा देखें — हरा टिक माने किसी ने आपका SOS स्वीकारा।'),
      t3('Stay where help can find you, if it is safe to do so.', 'সাহায্য যেখানে পৌঁছাতে পারে সেখানে থাকুন, নিরাপদ হলে।', 'सहायता जहाँ पहुँच सके वहीं रहें, यदि सुरक्षित हो।'),
      t3('Mark it resolved when you are safe — your circle rests easy.', 'নিরাপদ হলে সমাধান চিহ্নিত করুন — আপনার বলয় স্বস্তি পান।', 'सुरक्षित होने पर सुलझा चिह्नित करें — आपका चक्र निश्चिंत होता है।'),
    ],
    proTips: [
      t3('Only you (or a coordinator) can mark your SOS resolved — it never auto-closes.', 'শুধু আপনি (বা সমন্বয়কারী) সমাধান চিহ্নিত করতে পারেন — নিজে বন্ধ হয় না।', 'केवल आप (या समन्वयक) SOS सुलझा चिह्नित कर सकते हैं — स्वतः बंद नहीं होता।'),
      t3('Your history stays private — past SOS events are visible only to you.', 'ইতিহাস ব্যক্তিগত থাকে — পুরনো SOS শুধু আপনিই দেখেন।', 'इतिहास निजी रहता है — पुराने SOS केवल आप देखते हैं।'),
    ],
    relatedModules: ['crisis-sos', 'crisis-contacts', 'crisis-triage'],
  },
  {
    id: 'crisis-triage',
    name: t3('Coordinator Triage', 'সমন্বয়কারীর প্রাথমিক ব্যবস্থা', 'समन्वयक छँटाई'),
    tagline: t3(
      'For safety guardians — respond with a calm head.',
      'নিরাপত্তা প্রহরীদের জন্য — শান্ত মনে সাড়া দিন।',
      'सुरक्षा प्रहरियों हेतु — शांत चित्त से प्रतिक्रिया दें।'
    ),
    whatItIs: t3(
      'The coordinator\u2019s view of every active SOS in the organisation: who needs help, where they are, what the situation is, and who has already responded. Acknowledge, assign, and resolve — with the whole picture in one calm screen.',
      'সংস্থার প্রতিটি সক্রিয় SOS-এর সমন্বয়কারী দৃশ্য: কার সাহায্য লাগে, কোথায়, কী পরিস্থিতি, কে ইতিমধ্যে সাড়া দিয়েছেন। স্বীকার করুন, দায়িত্ব দিন, সমাধান করুন — পুরো চিত্র এক শান্ত পর্দায়।',
      'संस्था के प्रत्येक सक्रिय SOS का समन्वयक दृश्य: किसे सहायता चाहिए, कहाँ हैं, क्या स्थिति है, किसने पहले ही प्रतिक्रिया दी। स्वीकारें, दायित्व दें, सुलझाएँ — पूर्ण चित्र एक शांत स्क्रीन में।'
    ),
    whyItMatters: t3(
      'A coordinator who sees everything responds to the right emergency first. Triage turns many voices into one organised response — the difference between a crowd and a team.',
      'সব দেখা সমন্বয়কারী সঠিক জরুরিতে আগে সাড়া দেন। ট্রায়াজ অনেক কণ্ঠকে এক গোছানো সাড়ায় বদলায় — ভিড় ও দলের পার্থক্য এটাই।',
      'सब देखने वाला समन्वयक सही आपात में पहले प्रतिक्रिया देता है। छँटाई अनेक स्वरों को एक व्यवस्थित प्रतिक्रिया में बदलती है — भीड़ व दल का अंतर यही है।'
    ),
    firstSteps: [
      t3('Open the triage view when an SOS arrives — newest and nearest surface first.', 'SOS এলে ট্রায়াজ ভিউ খুলুন — নতুন ও কাছেরটি আগে দেখায়।', 'SOS आने पर छँटाई दृश्य खोलें — नवीनतम व निकटतम पहले दिखता है।'),
      t3('Acknowledge the SOS so the sender knows help is organised — silence panics.', 'SOS স্বীকার করুন — প্রেরক জানুন সাহায্য গোছানো হচ্ছে; নীরবতা আতঙ্ক বাড়ায়।', 'SOS स्वीकारें — प्रेषक जाने सहायता व्यवस्थित हो रही है; मौन घबराहट बढ़ाता है।'),
      t3('Assign the nearest responder, then mark resolved only when truly safe.', 'নিকটতম সাহায্যকারীকে দায়িত্ব দিন; সত্যিই নিরাপদ হলেই সমাধান চিহ্নিত করুন।', 'निकटतम सहायक को दायित्व दें; वास्तव में सुरक्षित होने पर ही सुलझा चिह्नित करें।'),
    ],
    proTips: [
      t3('Check the responder list before dispatching — avoid sending two teams to one call.', 'পাঠানোর আগে সাড়াদানকারীর তালিকা দেখুন — এক ডাকে দুই দল নয়।', 'भेजने से पहले प्रतिक्रियाकर्ता सूची देखें — एक पुकार पर दो दल नहीं।'),
      t3('After resolving, add a one-line note — the history teaches the next drill.', 'সমাধানের পর এক লাইন নোট — ইতিহাস পরের মহড়া শেখায়।', 'सुलझाने के बाद एक पंक्ति टिप्पणी — इतिहास अगला अभ्यास सिखाता है।'),
    ],
    relatedModules: ['crisis-sos', 'crisis-after-sos', 'crisis-contacts'],
  },
];

/** Icons for the new ids — spread into GuideCenter's GUIDE_ICONS. */
export const CRISIS_GUIDE_ICONS: Record<string, string> = {
  'crisis-contacts': '🧡',
  'crisis-sos': '🟠',
  'crisis-after-sos': '🕊️',
  'crisis-triage': '🛡️',
};

export function crisisGuideIds(): string[] {
  return CRISIS_GUIDES.map((g) => g.id);
}

/**
 * Self-registration into the Guide Center registry. Idempotent — safe to
 * call on every import. GuideCenter reads MODULE_GUIDES at render time,
 * so any import of this module (e.g. from the crisis entry point) wires
 * the four guides in without touching GuideCenter's own files.
 */
export function ensureCrisisGuidesRegistered(): void {
  for (const g of CRISIS_GUIDES) {
    if (!MODULE_GUIDES.some((existing) => existing.id === g.id)) {
      MODULE_GUIDES.push(g);
    }
  }
}

ensureCrisisGuidesRegistered();

export default CRISIS_GUIDES;
