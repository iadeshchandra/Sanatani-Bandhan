/**
 * groups/i18n.ts — Group chat strings (EN/HI/BN).
 * =================================================
 * Self-contained module: the global schema carries the guide tour
 * strings (guide.groups.*), while all group UI copy lives here so the
 * feature never risks the 10-language type matrix. Other languages
 * fall back to English.
 */

export type GroupLang = 'en' | 'hi' | 'bn';

export function groupLangOf(lang: string | undefined): GroupLang {
  const l = (lang || 'en').toLowerCase();
  if (l.startsWith('hi')) return 'hi';
  if (l.startsWith('bn')) return 'bn';
  return 'en';
}

const STRINGS: Record<string, Record<GroupLang, string>> = {
  'list.title': {
    en: 'Messages',
    hi: 'संदेश',
    bn: 'বার্তা',
  },
  'list.newGroup': {
    en: '👥 New group',
    hi: '👥 नया समूह',
    bn: '👥 নতুন গ্রুপ',
  },
  'list.groups': {
    en: 'Groups',
    hi: 'समूह',
    bn: 'গ্রুপসমূহ',
  },
  'list.chats': {
    en: 'Chats',
    hi: 'बातचीत',
    bn: 'কথোপকথন',
  },
  'list.members': {
    en: 'members',
    hi: 'सदस्य',
    bn: 'সদস্য',
  },
  'list.member': {
    en: 'member',
    hi: 'सदस्य',
    bn: 'সদস্য',
  },
  'create.title': {
    en: 'Create a group',
    hi: 'समूह बनाएँ',
    bn: 'গ্রুপ তৈরি করুন',
  },
  'create.name': {
    en: 'Group name',
    hi: 'समूह का नाम',
    bn: 'গ্রুপের নাম',
  },
  'create.name.ph': {
    en: 'e.g. Sharma Family, Morning Satsang',
    hi: 'जैसे — शर्मा परिवार, प्रातः सत्संग',
    bn: 'যেমন — শর্মা পরিবার, প্রভাতী সৎসঙ্গ',
  },
  'create.name.error': {
    en: 'Give your group a name (2–60 characters).',
    hi: 'अपने समूह को एक नाम दें (2–60 अक्षर)।',
    bn: 'আপনার গ্রুপের একটি নাম দিন (২–৬০ অক্ষর)।',
  },
  'create.type': {
    en: 'What kind of gathering is this?',
    hi: 'यह किस तरह का संगम है?',
    bn: 'এটি কী ধরনের সমাবেশ?',
  },
  'create.about': {
    en: 'About (optional)',
    hi: 'परिचय (वैकल्पिक)',
    bn: 'পরিচিতি (ঐচ্ছিক)',
  },
  'create.about.ph': {
    en: 'What brings this sangha together?',
    hi: 'इस संघ को क्या जोड़ता है?',
    bn: 'এই সংঘকে কী একত্রিত করে?',
  },
  'create.members': {
    en: 'Invite members',
    hi: 'सदस्यों को आमंत्रित करें',
    bn: 'সদস্যদের আমন্ত্রণ জানান',
  },
  'create.members.hint': {
    en: 'Enter a Sanatani ID to invite. You can always invite more later with the group code.',
    hi: 'आमंत्रित करने के लिए सनातनी ID डालें। बाद में समूह कोड से और लोगों को जोड़ सकते हैं।',
    bn: 'আমন্ত্রণ জানাতে সনাতনী আইডি দিন। পরে গ্রুপ কোড দিয়ে আরও যোগ করতে পারবেন।',
  },
  'create.add': {
    en: 'Add',
    hi: 'जोड़ें',
    bn: 'যোগ করুন',
  },
  'create.submit': {
    en: '🪔 Create group',
    hi: '🪔 समूह बनाएँ',
    bn: '🪔 গ্রুপ তৈরি করুন',
  },
  'create.created': {
    en: 'Your group is born! Share the invite code with love. 🙏',
    hi: 'आपका समूह बन गया! प्रेम से आमंत्रण कोड साझा करें। 🙏',
    bn: 'আপনার গ্রুপ তৈরি! ভালোবাসা দিয়ে আমন্ত্রণ কোড শেয়ার করুন। 🙏',
  },
  'invite.title': {
    en: 'Invite to the group',
    hi: 'समूह में आमंत्रित करें',
    bn: 'গ্রুপে আমন্ত্রণ জানান',
  },
  'invite.hint': {
    en: 'Only people with this code can join. Groups are private — never listed anywhere.',
    hi: 'केवल इसी कोड वाले लोग जुड़ सकते हैं। समूह निजी हैं — कहीं सूचीबद्ध नहीं।',
    bn: 'শুধু এই কোড যাদের আছে তারাই যোগ দিতে পারবেন। গ্রুপ ব্যক্তিগত — কোথাও তালিকাভুক্ত নয়।',
  },
  'invite.copy': {
    en: 'Copy code',
    hi: 'कोड कॉपी करें',
    bn: 'কোড কপি করুন',
  },
  'invite.copied': {
    en: 'Copied — share it with love 🙏',
    hi: 'कॉपी हो गया — प्रेम से साझा करें 🙏',
    bn: 'কপি হয়েছে — ভালোবাসা দিয়ে শেয়ার করুন 🙏',
  },
  'invite.regenerate': {
    en: 'New code',
    hi: 'नया कोड',
    bn: 'নতুন কোড',
  },
  'invite.join.title': {
    en: 'Join a group',
    hi: 'समूह से जुड़ें',
    bn: 'গ্রুপে যোগ দিন',
  },
  'invite.join.ph': {
    en: 'Enter the 8-letter invite code',
    hi: '8 अक्षर का आमंत्रण कोड डालें',
    bn: '৮ অক্ষরের আমন্ত্রণ কোড দিন',
  },
  'invite.join.error': {
    en: 'That code did not match any group. Check it and try again.',
    hi: 'यह कोड किसी समूह से नहीं मिला। जाँचकर पुनः प्रयास करें।',
    bn: 'এই কোড কোনো গ্রুপের সাথে মেলেনি। পরীক্ষা করে আবার চেষ্টা করুন।',
  },
  'invite.join.submit': {
    en: 'Join group',
    hi: 'समूह से जुड़ें',
    bn: 'গ্রুপে যোগ দিন',
  },
  'info.title': {
    en: 'Group info',
    hi: 'समूह जानकारी',
    bn: 'গ্রুপের তথ্য',
  },
  'info.members': {
    en: 'Members',
    hi: 'सदस्य',
    bn: 'সদস্যরা',
  },
  'info.admin': {
    en: 'Admin',
    hi: 'प्रबंधक',
    bn: 'পরিচালক',
  },
  'info.you': {
    en: 'You',
    hi: 'आप',
    bn: 'আপনি',
  },
  'info.rename': {
    en: 'Rename group',
    hi: 'समूह का नाम बदलें',
    bn: 'গ্রুপের নাম বদলান',
  },
  'info.addMember': {
    en: 'Add member',
    hi: 'सदस्य जोड़ें',
    bn: 'সদস্য যোগ করুন',
  },
  'info.remove': {
    en: 'Remove',
    hi: 'हटाएँ',
    bn: 'সরান',
  },
  'info.remove.confirm': {
    en: 'Remove this member from the group?',
    hi: 'इस सदस्य को समूह से हटाएँ?',
    bn: 'এই সদস্যকে গ্রুপ থেকে সরাবেন?',
  },
  'info.promote': {
    en: 'Make admin',
    hi: 'प्रबंधक बनाएँ',
    bn: 'পরিচালক করুন',
  },
  'info.leave': {
    en: 'Leave group',
    hi: 'समूह छोड़ें',
    bn: 'গ্রুপ ত্যাগ করুন',
  },
  'info.leave.confirm': {
    en: 'Leave this group? You can rejoin later with the invite code.',
    hi: 'यह समूह छोड़ें? आमंत्रण कोड से बाद में फिर जुड़ सकते हैं।',
    bn: 'এই গ্রুপ ত্যাগ করবেন? আমন্ত্রণ কোড দিয়ে পরে আবার যোগ দিতে পারবেন।',
  },
  'info.delete': {
    en: 'Delete group',
    hi: 'समूह हटाएँ',
    bn: 'গ্রুপ মুছুন',
  },
  'info.delete.confirm': {
    en: 'Delete this group for everyone? This cannot be undone.',
    hi: 'सबके लिए यह समूह हटाएँ? यह वापस नहीं होगा।',
    bn: 'সবার জন্য এই গ্রুপ মুছে ফেলবেন? এটি ফেরানো যাবে না।',
  },
  'info.cancel': {
    en: 'Cancel',
    hi: 'रद्द करें',
    bn: 'বাতিল',
  },
  'info.confirm': {
    en: 'Confirm',
    hi: 'पुष्टि करें',
    bn: 'নিশ্চিত করুন',
  },
  'thread.empty': {
    en: 'Say namaste 🙏 — your words reach every heart here.',
    hi: 'नमस्ते कहें 🙏 — आपके शब्द यहाँ हर हृदय तक पहुँचते हैं।',
    bn: 'নমস্কার বলুন 🙏 — আপনার কথা এখানে প্রতিটি হৃদয়ে পৌঁছায়।',
  },
  'thread.info': {
    en: 'Group info',
    hi: 'समूह जानकारी',
    bn: 'গ্রুপের তথ্য',
  },
  'thread.write': {
    en: 'Write to the group…',
    hi: 'समूह को लिखें…',
    bn: 'গ্রুপে লিখুন…',
  },
  'error.generic': {
    en: 'Something gentle went wrong — please try again.',
    hi: 'कुछ गड़बड़ हुई — कृपया पुनः प्रयास करें।',
    bn: 'কিছু সমস্যা হয়েছে — আবার চেষ্টা করুন।',
  },
  'error.notMember': {
    en: 'You are no longer a member of this group.',
    hi: 'आप अब इस समूह के सदस्य नहीं हैं।',
    bn: 'আপনি আর এই গ্রুপের সদস্য নন।',
  },
};

export function gt(lang: string | undefined, key: string): string {
  const l = groupLangOf(lang);
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[l] ?? entry.en;
}
