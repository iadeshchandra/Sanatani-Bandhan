/**
 * rashifal.ts — Daily Bengali rashifal (horoscope guidance).
 * =====================================================================
 * Tasteful, non-fear-based daily guidance for the 12 rashis. Texts are
 * drawn from a curated bank, selected deterministically by date (seeded),
 * so every user sees the same stable guidance for a given day.
 *
 * RULES: never fear-mongering, health scares, financial doom, or
 * "beware of enemies" style content. Framed as traditional guidance with
 * a standing disclaimer pointing to the user's own jyotishi.
 */

export interface RashiDef {
  id: string;
  bn: string;
  en: string;
  hi: string;
  ta: string;
  dates: string; // approx Gregorian span
  lord: string;
  element: string;
}

export const RASHIS: RashiDef[] = [
  { id: 'mesh', bn: 'মেষ', en: 'Mesh', hi: 'मेष', ta: 'மேஷம்', dates: 'Apr 14 – May 14', lord: 'Mangal', element: 'Agni' },
  { id: 'brish', bn: 'বৃষ', en: 'Brish', hi: 'वृष', ta: 'ரிஷபம்', dates: 'May 15 – Jun 14', lord: 'Shukra', element: 'Prithvi' },
  { id: 'mithun', bn: 'মিথুন', en: 'Mithun', hi: 'मिथुन', ta: 'மிதுனம்', dates: 'Jun 15 – Jul 15', lord: 'Budh', element: 'Vayu' },
  { id: 'karkat', bn: 'কর্কট', en: 'Karkat', hi: 'कर्कट', ta: 'கடகம்', dates: 'Jul 16 – Aug 15', lord: 'Chandra', element: 'Jal' },
  { id: 'singha', bn: 'সিংহ', en: 'Singha', hi: 'सिंह', ta: 'சிம்மம்', dates: 'Aug 16 – Sep 15', lord: 'Surya', element: 'Agni' },
  { id: 'kanya', bn: 'কন্যা', en: 'Kanya', hi: 'कन्या', ta: 'கன்னி', dates: 'Sep 16 – Oct 15', lord: 'Budh', element: 'Prithvi' },
  { id: 'tula', bn: 'তুলা', en: 'Tula', hi: 'तुला', ta: 'துலாம்', dates: 'Oct 16 – Nov 14', lord: 'Shukra', element: 'Vayu' },
  { id: 'brischik', bn: 'বৃশ্চিক', en: 'Brischik', hi: 'वृश्चिक', ta: 'விருச்சிகம்', dates: 'Nov 15 – Dec 14', lord: 'Mangal', element: 'Jal' },
  { id: 'dhanu', bn: 'ধনু', en: 'Dhanu', hi: 'धनु', ta: 'தனுசு', dates: 'Dec 15 – Jan 13', lord: 'Guru', element: 'Agni' },
  { id: 'makar', bn: 'মকর', en: 'Makar', hi: 'मकर', ta: 'மகரம்', dates: 'Jan 14 – Feb 12', lord: 'Shani', element: 'Prithvi' },
  { id: 'kumbha', bn: 'কুম্ভ', en: 'Kumbha', hi: 'कुम्भ', ta: 'கும்பம்', dates: 'Feb 13 – Mar 13', lord: 'Shani', element: 'Vayu' },
  { id: 'meen', bn: 'মীন', en: 'Meen', hi: 'मीन', ta: 'மீனம்', dates: 'Mar 14 – Apr 13', lord: 'Guru', element: 'Jal' },
];

export interface RashifalEntry {
  rashi: RashiDef;
  shubhColor: { en: string; bn: string };
  shubhNumber: number;
  guidance: { en: string; bn: string };
  focus: { en: string; bn: string }; // area of the day: e.g. family, work, sadhana
}

const SHUBH_COLORS = [
  { en: 'Saffron', bn: 'গেরুয়া' }, { en: 'White', bn: 'সাদা' },
  { en: 'Yellow', bn: 'হলুদ' }, { en: 'Green', bn: 'সবুজ' },
  { en: 'Red', bn: 'লাল' }, { en: 'Sky blue', bn: 'আকাশি' },
  { en: 'Cream', bn: 'ক্রিম' }, { en: 'Golden', bn: 'সোনালি' },
];

const GUIDANCE_BANK: Array<{ en: string; bn: string; focusEn: string; focusBn: string }> = [
  {
    en: 'A steady day for completing pending duties. Offer your work as seva and the results will follow.',
    bn: 'অসমাপ্ত কাজ শেষ করার জন্য স্থির দিন। কাজকে সেবা হিসেবে অর্পণ করুন, ফল আসবেই।',
    focusEn: 'Duty & discipline', focusBn: 'কর্তব্য ও শৃঙ্খলা',
  },
  {
    en: 'Time spent with elders and family brings quiet joy today. Listen more than you speak.',
    bn: 'আজ বয়োজ্যেষ্ঠ ও পরিবারের সঙ্গে সময় শান্ত আনন্দ দেবে। বলার চেয়ে শুনুন বেশি।',
    focusEn: 'Family harmony', focusBn: 'পারিবারিক সম্প্রীতি',
  },
  {
    en: 'A good day for learning and reflection. Reading scripture or a wise book will steady the mind.',
    bn: 'শিক্ষা ও চিন্তনের জন্য শুভ দিন। শাস্ত্র বা জ্ঞানগর্ভ বই পড়লে মন স্থির হবে।',
    focusEn: 'Learning', focusBn: 'বিদ্যা',
  },
  {
    en: 'Charity given quietly today multiplies in merit. Help someone without expecting thanks.',
    bn: 'আজ নীরবে দেওয়া দান পুণ্য বহুগুণ বাড়ায়। কৃতজ্ঞতা আশা না করে কাউকে সাহায্য করুন।',
    focusEn: 'Daan & seva', focusBn: 'দান ও সেবা',
  },
  {
    en: 'Begin that task you have been postponing — the muhurat favours fresh starts made with a clear heart.',
    bn: 'যে কাজ পিছিয়ে রেখেছেন তা আজ শুরু করুন — নির্মল মনে নতুন শুরুর জন্য শুভ সময়।',
    focusEn: 'New beginnings', focusBn: 'নতুন শুরু',
  },
  {
    en: 'Patience in speech protects relationships today. A kind word costs nothing and earns much.',
    bn: 'আজ বাক্যে ধৈর্য সম্পর্ক রক্ষা করে। সদয় কথা বিনামূল্যে, অর্জন অনেক।',
    focusEn: 'Speech & relations', focusBn: 'বাক্য ও সম্পর্ক',
  },
  {
    en: 'Devotion deepens through small, sincere acts — a diya at dawn, a mantra with attention.',
    bn: 'ছোট আন্তরিক কাজে ভক্তি গভীর হয় — ভোরে একটি প্রদীপ, মনোযোগে একটি মন্ত্র।',
    focusEn: 'Sadhana', focusBn: 'সাধনা',
  },
  {
    en: 'Financial matters favour caution over haste. Review, plan, and let decisions ripen.',
    bn: 'অর্থবিষয়ে তাড়াহুড়োর চেয়ে সতর্কতা শ্রেয়। পর্যালোচনা করুন, পরিকল্পনা করুন, সিদ্ধান্ত পাকতে দিন।',
    focusEn: 'Planning', focusBn: 'পরিকল্পনা',
  },
  {
    en: 'An old friend or relative may reconnect — receive them warmly; bonds renewed bring strength.',
    bn: 'পুরনো বন্ধু বা আত্মীয়ের সঙ্গে যোগাযোগ হতে পারে — উষ্ণভাবে গ্রহণ করুন; নবায়িত বন্ধন শক্তি দেয়।',
    focusEn: 'Relationships', focusBn: 'সম্পর্ক',
  },
  {
    en: 'Health favours routine today: simple food, early rest, and a short walk clear the mind.',
    bn: 'আজ স্বাস্থ্যের জন্য নিয়ম শুভ: সাদাসিধে খাবার, তাড়াতাড়ি বিশ্রাম, অল্প হাঁটা মন পরিষ্কার করে।',
    focusEn: 'Wellbeing', focusBn: 'সুস্থতা',
  },
  {
    en: 'Creative work flows well — writing, music, or craft done with devotion carries special grace.',
    bn: 'সৃজনশীল কাজ ভালো হবে — ভক্তিভরে করা লেখা, সঙ্গীত বা হস্তশিল্পে বিশেষ কৃপা।',
    focusEn: 'Creativity', focusBn: 'সৃজনশীলতা',
  },
  {
    en: 'Serve your community in some small way today; shared merit lifts everyone, including you.',
    bn: 'আজ কোনো ছোটভাবে সমাজের সেবা করুন; ভাগ করা পুণ্য সবাইকে উন্নীত করে, আপনাকেও।',
    focusEn: 'Community seva', focusBn: 'সমাজসেবা',
  },
];

/** Deterministic daily pick: same date + rashi → same entry, stable all day. */
function seededPick<T>(items: T[], seed: string): T {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return items[Math.abs(h) % items.length];
}

export function getRashifal(date: Date = new Date()): RashifalEntry[] {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  return RASHIS.map((rashi, i) => {
    const g = seededPick(GUIDANCE_BANK, `${key}:${rashi.id}`);
    const color = seededPick(SHUBH_COLORS, `${key}:${rashi.id}:color`);
    const shubhNumber = (Math.abs(hashStr(`${key}:${rashi.id}:num`)) % 9) + 1;
    void i;
    return {
      rashi,
      shubhColor: color,
      shubhNumber,
      guidance: { en: g.en, bn: g.bn },
      focus: { en: g.focusEn, bn: g.focusBn },
    };
  });
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h;
}

/** Rashi display name in the user's language. */
export function rashiName(r: RashiDef, lang: string): string {
  switch (lang) {
    case 'bn': return r.bn;
    case 'hi': case 'mr': case 'gu': case 'sa': return r.hi;
    case 'ta': return r.ta;
    default: return r.en;
  }
}

export const RASHIFAL_LABEL = {
  en: 'Chandra-gochar general guidance',
  bn: 'চন্দ্র-গোচর সাধারণ নির্দেশনা',
  hi: 'चंद्र-गोचर सामान्य मार्गदर्शन',
};

export const RASHIFAL_DISCLAIMER = {
  en: 'Chandra-gochar general guidance only — never a deterministic prediction. Your jyotishi knows your kundali best.',
  bn: 'শুধুমাত্র চন্দ্র-গোচর সাধারণ নির্দেশনা — কখনোই নিশ্চিত ভবিষ্যদ্বাণী নয়। আপনার জ্যোতিষী আপনার কুণ্ডলী সবচেয়ে ভালো জানেন।',
  hi: 'केवल चंद्र-गोचर सामान्य मार्गदर्शन — निश्चित भविष्यवाणी नहीं। आपके ज्योतिषी आपकी कुंडली सबसे अच्छी तरह जानते हैं।',
};
