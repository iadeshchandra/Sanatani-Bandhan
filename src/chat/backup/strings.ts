/**
 * chat/backup/strings.ts — Chat Backup copy, trilingual islands.
 * ==============================================================
 * Every user-facing string for the "Your words are yours" backup system.
 * EN/BN/HI minimum, Sanatani tone throughout: warm, dignified, plain words.
 *
 * Consumed via useBackupStrings() which wraps the chat module's existing
 * useLocaleText() island pattern — no schema changes, no new fragments.
 */
import { useLocaleText } from '../../solo/ui';

export interface TriText {
  en: string;
  bn: string;
  hi: string;
}

const s = (en: string, bn: string, hi: string): TriText => ({ en, bn, hi });

export const BACKUP_STRINGS = {
  /* Settings screen */
  title: s('Chat Backup', 'চ্যাট ব্যাকআপ', 'चैट बैकअप'),
  subtitle: s(
    'Your words are yours. Keep a sealed copy in your own Google Drive — not on our servers.',
    'আপনার কথা আপনারই। আপনার নিজের Google Drive-এ একটি সিলমোহর করা অনুলিপি রাখুন — আমাদের সার্ভারে নয়।',
    'आपके शब्द आपके हैं। अपने Google Drive में एक मुहरबंद प्रति रखें — हमारे सर्वर पर नहीं।'
  ),
  connectDrive: s('Connect Google Drive', 'Google Drive সংযুক্ত করুন', 'Google Drive जोड़ें'),
  connectDriveDesc: s(
    'We ask for one small permission: a hidden folder only this app can see. Your photos, documents and other files stay untouched — we cannot see them.',
    'আমরা একটি ছোট অনুমতি চাই: একটি লুকানো ফোল্ডার যা শুধু এই অ্যাপ দেখতে পারে। আপনার ছবি, নথি ও অন্যান্য ফাইল অস্পৃশ্য থাকবে — আমরা সেগুলো দেখতে পারি না।',
    'हम एक छोटी अनुमति माँगते हैं: एक छिपा हुआ फ़ोल्डर जो केवल यह ऐप देख सकता है। आपकी तस्वीरें, दस्तावेज़ और अन्य फ़ाइलें अछूती रहेंगी — हम उन्हें देख नहीं सकते।'
  ),
  driveConnected: s('Drive connected', 'Drive সংযুক্ত', 'Drive जुड़ा है'),
  disconnect: s('Disconnect', 'সংযোগ বিচ্ছিন্ন করুন', 'हटाएँ'),
  backupNow: s('Back up now', 'এখনই ব্যাকআপ নিন', 'अभी बैकअप लें'),
  backingUp: s('Sealing your words…', 'আপনার কথা সিলমোহর করা হচ্ছে…', 'आपके शब्दों पर मुहर लग रही है…'),
  lastBackup: s('Last backup', 'শেষ ব্যাকআপ', 'अंतिम बैकअप'),
  neverBackedUp: s('Not backed up yet', 'এখনও ব্যাকআপ নেওয়া হয়নি', 'अभी तक बैकअप नहीं लिया'),
  chatsSealed: s('{n} conversations sealed', '{n}টি কথোপকথন সিলমোহর করা হয়েছে', '{n} बातचीत मुहरबंद'),
  backupDone: s('Your words are safe in your Drive.', 'আপনার কথা আপনার Drive-এ নিরাপদ।', 'आपके शब्द आपके Drive में सुरक्षित हैं।'),
  backupFailed: s('The backup could not be sealed. Please try again.', 'ব্যাকআপ সিলমোহর করা যায়নি। আবার চেষ্টা করুন।', 'बैकअप मुहरबंद नहीं हो सका। कृपया पुनः प्रयास करें।'),

  /* Schedule */
  scheduleLabel: s('Automatic backup', 'স্বয়ংক্রিয় ব্যাকআপ', 'स्वचालित बैकअप'),
  scheduleOff: s('Off', 'বন্ধ', 'बंद'),
  scheduleDaily: s('Daily', 'প্রতিদিন', 'रोज़'),
  scheduleWeekly: s('Weekly', 'সাপ্তাহিক', 'साप्ताहिक'),
  scheduleMonthly: s('Monthly', 'মাসিক', 'मासिक'),
  scheduleHonest: s(
    'Backs up quietly while the app is open. It cannot wake itself at night — open the app and your words stay protected.',
    'অ্যাপ খোলা থাকলে নীরবে ব্যাকআপ নেয়। রাতে নিজে জাগতে পারে না — অ্যাপ খুলুন, আপনার কথা সুরক্ষিত থাকবে।',
    'ऐप खुला होने पर चुपचाप बैकअप लेता है। रात में खुद नहीं जाग सकता — ऐप खोलें, आपके शब्द सुरक्षित रहेंगे।'
  ),

  /* Passphrase */
  passphraseTitle: s('Seal your words', 'আপনার কথা সিলমোহর করুন', 'अपने शब्दों पर मुहर लगाएँ'),
  passphraseDesc: s(
    'This key seals your words. Only you hold it — not even we can open your backup. Choose words you will remember, like a line from a beloved shloka.',
    'এই চাবি আপনার কথায় সিলমোহর দেয়। এটি শুধু আপনার কাছে থাকবে — আমরা পর্যন্ত আপনার ব্যাকআপ খুলতে পারব না। এমন শব্দ বেছে নিন যা মনে থাকবে, যেমন প্রিয় শ্লোকের একটি পঙ্‌ক্তি।',
    'यह कुंजी आपके शब्दों पर मुहर लगाती है। यह केवल आपके पास रहेगी — हम भी आपका बैकअप नहीं खोल सकते। ऐसे शब्द चुनें जो याद रहें, जैसे किसी प्रिय श्लोक की पंक्ति।'
  ),
  passphrasePlaceholder: s('Enter your sealing words', 'আপনার সিলমোহরের শব্দ লিখুন', 'अपने मुहर-शब्द लिखें'),
  passphraseConfirm: s('Repeat your sealing words', 'আপনার সিলমোহরের শব্দ আবার লিখুন', 'अपने मुहर-शब्द दोहराएँ'),
  passphraseMismatch: s('The two do not match. Please write them once more.', 'দুটি মিলছে না। আরেকবার লিখুন।', 'दोनों मेल नहीं खा रहे। कृपया एक बार और लिखें।'),
  passphraseTooShort: s('A little longer, please — at least 8 characters.', 'আরেকটু বড় করুন — অন্তত ৮টি অক্ষর।', 'थोड़ा लंबा रखें — कम से कम 8 अक्षर।'),
  passphraseSet: s('Your seal is ready.', 'আপনার সিলমোহর প্রস্তুত।', 'आपकी मुहर तैयार है।'),
  continue: s('Continue', 'এগিয়ে যান', 'आगे बढ़ें'),
  back: s('Back', 'পিছনে', 'पीछे'),

  /* Recovery code */
  recoveryTitle: s('Your recovery key', 'আপনার পুনরুদ্ধার চাবি', 'आपकी पुनर्प्राप्ति कुंजी'),
  recoveryDesc: s(
    'If your sealing words are ever forgotten, this key opens your backup. Write it on paper and keep it where you keep precious things — never in a screenshot.',
    'আপনার সিলমোহরের শব্দ কখনও ভুলে গেলে, এই চাবি ব্যাকআপ খুলবে। কাগজে লিখে মূল্যবান জিনিসের সাথে রাখুন — কখনও স্ক্রিনশটে নয়।',
    'यदि आपके मुहर-शब्द कभी भूल जाएँ, तो यह कुंजी आपका बैकअप खोलेगी। इसे कागज़ पर लिखकर कीमती चीज़ों के साथ रखें — कभी स्क्रीनशॉट में नहीं।'
  ),
  recoveryCopied: s('Copied. Now write it on paper too.', 'কপি হয়েছে। এবার কাগজেও লিখে রাখুন।', 'कॉपी हो गया। अब कागज़ पर भी लिख लें।'),
  copyCode: s('Copy', 'কপি', 'कॉपी'),
  iHaveWrittenIt: s('I have written it down', 'আমি লিখে রেখেছি', 'मैंने लिख लिया है'),

  /* Restore */
  restoreFound: s('We found your chat history', 'আমরা আপনার চ্যাট ইতিহাস পেয়েছি', 'हमें आपका चैट इतिहास मिला'),
  restoreDesc: s(
    'Your sealed words are waiting in your Drive from {date}. Bring them home with your sealing words.',
    'আপনার সিলমোহর করা কথা {date} থেকে আপনার Drive-এ অপেক্ষা করছে। আপনার সিলমোহরের শব্দ দিয়ে সেগুলো ফিরিয়ে আনুন।',
    'आपके मुहरबंद शब्द {date} से आपके Drive में प्रतीक्षा कर रहे हैं। अपने मुहर-शब्दों से उन्हें घर लाएँ।'
  ),
  restoreNow: s('Bring my words home', 'আমার কথা ফিরিয়ে আনুন', 'मेरे शब्द घर लाएँ'),
  restoreLater: s('Later', 'পরে', 'बाद में'),
  restoreWrongKey: s('Those words did not open the seal. Try again, gently.', 'সেই শব্দে সিল খোলেনি। ধীরে আবার চেষ্টা করুন।', 'उन शब्दों से मुहर नहीं खुली। धीरे से पुनः प्रयास करें।'),
  restoreDone: s('{n} conversations rest at home again.', '{n}টি কথোপকথন আবার ঘরে ফিরেছে।', '{n} बातचीत फिर घर आ गई।'),
  useRecoveryCode: s('Use recovery key instead', 'পরিবর্তে পুনরুদ্ধার চাবি ব্যবহার করুন', 'बदले में पुनर्प्राप्ति कुंजी उपयोग करें'),
  usePassphrase: s('Use sealing words instead', 'পরিবর্তে সিলমোহরের শব্দ ব্যবহার করুন', 'बदले में मुहर-शब्द उपयोग करें'),

  /* Archive viewer */
  archiveTitle: s('Restored words', 'পুনরুদ্ধার করা কথা', 'पुनर्प्राप्त शब्द'),
  archiveEmpty: s('Nothing restored yet.', 'এখনও কিছু পুনরুদ্ধার হয়নি।', 'अभी कुछ पुनर्प्राप्त नहीं हुआ।'),
  archiveNote: s(
    'These are read-only memories from your backup. New words live in your conversations above.',
    'এগুলো আপনার ব্যাকআপের শুধু-পড়ার স্মৃতি। নতুন কথা উপরের কথোপকথনে থাকে।',
    'ये आपके बैकअप की केवल-पढ़ने योग्य स्मृतियाँ हैं। नए शब्द ऊपर आपकी बातचीत में रहते हैं।'
  ),

  /* Nudge */
  nudgeTitle: s('Your words await their seal', 'আপনার কথা সিলমোহরের অপেক্ষায়', 'आपके शब्द मुहर की प्रतीक्षा में'),
  nudgeBody: s(
    'It has been a while since your conversations were backed up. A quiet moment now keeps them safe.',
    'আপনার কথোপকথন ব্যাকআপ নেওয়ার পর অনেকদিন হয়ে গেছে। এখন একটু শান্ত মুহূর্ত সেগুলো নিরাপদ রাখবে।',
    'आपकी बातचीत का बैकअप लिए हुए काफ़ी समय हो गया। अभी एक शांत क्षण उन्हें सुरक्षित रखेगा।'
  ),

  /* Misc */
  close: s('Close', 'বন্ধ করুন', 'बंद करें'),
  viewHistory: s('View restored history', 'পুনরুদ্ধার করা ইতিহাস দেখুন', 'पुनर्प्राप्त इतिहास देखें'),
  changeSeal: s('Change sealing words', 'সিলমোহরের শব্দ বদলান', 'मुहर-शब्द बदलें'),
  driveNote: s(
    'Backups live in a hidden folder in your own Google Drive. They count against your storage, never ours — your words, your vault.',
    'ব্যাকআপ আপনার নিজের Google Drive-এর একটি লুকানো ফোল্ডারে থাকে। এগুলো আপনার স্টোরেজ থেকে যায়, আমাদের থেকে নয় — আপনার কথা, আপনার ভান্ডার।',
    'बैकअप आपके अपने Google Drive के एक छिपे फ़ोल्डर में रहते हैं। ये आपके स्टोरेज में गिने जाते हैं, हमारे में कभी नहीं — आपके शब्द, आपका भंडार।'
  ),
};

export type BackupStrings = typeof BACKUP_STRINGS;

/** The hook's resolved output: every entry is the plain string for the active language. */
export type ResolvedBackupStrings = { [K in keyof BackupStrings]: string };

/**
 * Hook: resolved trilingual strings for the backup system.
 * Wraps the chat module's existing island pattern.
 */
export function useBackupStrings(): { tr: ResolvedBackupStrings; lang: string } {
  const { lang, tr: safeTranslate } = useLocaleText();
  const resolved = {} as ResolvedBackupStrings;
  for (const key of Object.keys(BACKUP_STRINGS) as Array<keyof BackupStrings>) {
    const entry = BACKUP_STRINGS[key];
    resolved[key] = safeTranslate(key, entry.en, entry.bn, entry.hi);
  }
  return { tr: resolved, lang };
}

/** Format a template like "Hello {name}" with values. */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(values)) {
    out = out.replace(`{${k}}`, String(v));
  }
  return out;
}
