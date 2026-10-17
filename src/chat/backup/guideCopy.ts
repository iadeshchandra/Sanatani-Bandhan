/**
 * chat/backup/guideCopy.ts — Quick Guide content for Chat Backup.
 * ==============================================================
 * Pure content, no UI. Shaped to plug into the guide framework owned by
 * the UX program (see src/lib/moduleGuides.ts ModuleGuide + the
 * QuickGuideModal / RBACQuickGuideDrawer consumers).
 *
 * A first-time devotee should understand sealed backup from this file
 * alone. Tone: devotional, welcoming, plain language. EN/BN/HI.
 */

export interface GuideLang3 {
  en: string;
  bn: string;
  hi: string;
}

export interface BackupGuide {
  id: string;
  name: GuideLang3;
  tagline: GuideLang3;
  whatItIs: GuideLang3;
  whyItMatters: GuideLang3;
  firstSteps: GuideLang3[];
  proTips: GuideLang3[];
  relatedModules: string[];
}

const t3 = (en: string, bn: string, hi: string): GuideLang3 => ({ en, bn, hi });

/** The passphrase-onboarding walkthrough, guide-shaped. */
export const CHAT_BACKUP_GUIDE: BackupGuide = {
  id: 'chat-backup',
  name: t3('Chat Backup', 'চ্যাট ব্যাকআপ', 'चैट बैकअप'),
  tagline: t3(
    'Your words are yours — sealed, and kept in your own vault.',
    'আপনার কথা আপনারই — সিলমোহর করা, আপনার নিজের ভান্ডারে রাখা।',
    'आपके शब्द आपके हैं — मुहरबंद, आपके अपने भंडार में रखे।'
  ),
  whatItIs: t3(
    'A sealed copy of your conversations, kept in a hidden folder in your own Google Drive. Your sealing words lock it — not even we can open it. If you ever change phones, your words come home with you.',
    'আপনার কথোপকথনের একটি সিলমোহর করা অনুলিপি, আপনার নিজের Google Drive-এর লুকানো ফোল্ডারে রাখা। আপনার সিলমোহরের শব্দ এটিকে তালা দেয় — আমরা পর্যন্ত খুলতে পারি না। ফোন বদলালে আপনার কথা আপনার সাথেই ফিরবে।',
    'आपकी बातचीत की एक मुहरबंद प्रति, आपके अपने Google Drive के छिपे फ़ोल्डर में रखी। आपके मुहर-शब्द इसे बंद करते हैं — हम भी इसे नहीं खोल सकते। फ़ोन बदलने पर आपके शब्द आपके साथ घर आएँगे।'
  ),
  whyItMatters: t3(
    'Family blessings, condolences, puja plans — these are sacred words. They deserve a vault you own, not a corner of someone else\'s server. And when the phone is lost or changed, nothing precious is lost with it.',
    'পারিবারিক আশীর্বাদ, সমবেদনা, পূজার পরিকল্পনা — এগুলো পবিত্র কথা। এগুলোর জন্য আপনার নিজের ভান্ডার প্রাপ্য, অন্যের সার্ভারের কোনো কোণ নয়। ফোন হারালে বা বদলালে কোনো মূল্যবান জিনিস হারাবে না।',
    'पारिवारिक आशीर्वाद, संवेदनाएँ, पूजा की योजनाएँ — ये पवित्र शब्द हैं। इन्हें आपका अपना भंडार चाहिए, किसी और के सर्वर का कोना नहीं। फ़ोन खोने या बदलने पर कुछ भी कीमती नहीं खोएगा।'
  ),
  firstSteps: [
    t3(
      'Open Messages → the 📦 backup button → "Connect Google Drive". We ask for one small hidden folder only — your photos and files stay untouched.',
      'বার্তা → 📦 ব্যাকআপ বোতাম → "Google Drive সংযুক্ত করুন" খুলুন। আমরা শুধু একটি ছোট লুকানো ফোল্ডার চাই — আপনার ছবি ও ফাইল অস্পৃশ্য থাকবে।',
      'संदेश → 📦 बैकअप बटन → "Google Drive जोड़ें" खोलें। हम केवल एक छोटा छिपा फ़ोल्डर माँगते हैं — आपकी तस्वीरें और फ़ाइलें अछूती रहेंगी।'
    ),
    t3(
      'Choose your sealing words — something you will remember, like a line from a beloved shloka. Only you hold them.',
      'আপনার সিলমোহরের শব্দ বেছে নিন — যা মনে থাকবে, যেমন প্রিয় শ্লোকের একটি পঙ্‌ক্তি। এগুলো শুধু আপনার কাছেই থাকবে।',
      'अपने मुहर-शब्द चुनें — जो याद रहें, जैसे किसी प्रिय श्लोक की पंक्ति। ये केवल आपके पास रहेंगे।'
    ),
    t3(
      'Tap "Back up now". After sealing, write down the one-time recovery key on paper and keep it with precious things.',
      '"এখনই ব্যাকআপ নিন" চাপুন। সিলমোহরের পর একবারের পুনরুদ্ধার চাবিটি কাগজে লিখে মূল্যবান জিনিসের সাথে রাখুন।',
      '"अभी बैकअप लें" दबाएँ। मुहर के बाद एक-बार वाली पुनर्प्राप्ति कुंजी कागज़ पर लिखकर कीमती चीज़ों के साथ रखें।'
    ),
  ],
  proTips: [
    t3(
      'Turn on weekly automatic backup — it seals quietly while the app is open. It cannot wake at night, so open the app and let it protect your words.',
      'সাপ্তাহিক স্বয়ংক্রিয় ব্যাকআপ চালু করুন — অ্যাপ খোলা থাকলে নীরবে সিলমোহর হবে। রাতে নিজে জাগতে পারে না, তাই অ্যাপ খুলে আপনার কথাকে রক্ষা করতে দিন।',
      'साप्ताहिक स्वचालित बैकअप चालू करें — ऐप खुला होने पर चुपचाप मुहर लगेगी। रात में खुद नहीं जाग सकता, इसलिए ऐप खोलें और अपने शब्दों की रक्षा होने दें।'
    ),
    t3(
      'Your sealing words are like the key to a family almirah — if forgotten, only the paper recovery key opens it. Never keep either in a screenshot.',
      'আপনার সিলমোহরের শব্দ পারিবারিক আলমারির চাবির মতো — ভুলে গেলে শুধু কাগজের পুনরুদ্ধার চাবিই খুলবে। কোনোটিই স্ক্রিনশটে রাখবেন না।',
      'आपके मुहर-शब्द पारिवारिक अलमारी की चाबी जैसे हैं — भूल जाने पर केवल कागज़ वाली पुनर्प्राप्ति कुंजी खोलेगी। दोनों में से कोई भी स्क्रीनशॉट में न रखें।'
    ),
  ],
  relatedModules: ['chat', 'suchana', 'profile'],
};
