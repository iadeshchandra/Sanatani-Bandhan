/**
 * BlessingCard.tsx — blessings instead of stickers.
 * =============================================================
 * Warm gradient cards with a Devanagari greeting and a diya motif.
 * Tithi-aware and festival-aware suggestions come from the occasion key;
 * the picker in ChatThread offers the right blessing for the season.
 */
import React from 'react';
import { useLocaleText } from '../solo/ui';

export interface BlessingOccasion {
  key: string;
  /** Devanagari greeting shown large on the card */
  greetingSa: string;
  en: string;
  bn: string;
  hi: string;
  gradient: string;
  accent: string;
  emoji: string;
  /** Short label for the picker grid */
  labelEn: string;
  labelBn: string;
  labelHi: string;
}

export const BLESSING_OCCASIONS: BlessingOccasion[] = [
  {
    key: 'generic',
    greetingSa: '॥ शुभाशीर्वाद ॥',
    en: 'May your home be filled with peace, your heart with devotion, and your path with light.',
    bn: 'আপনার গৃহ শান্তিতে, হৃদয় ভক্তিতে এবং পথ আলোয় পূর্ণ হোক।',
    hi: 'आपका घर शांति से, हृदय भक्ति से और मार्ग प्रकाश से पूर्ण हो।',
    gradient: 'from-amber-600 via-orange-500 to-rose-500',
    accent: 'text-amber-100',
    emoji: '🪔',
    labelEn: 'Blessing',
    labelBn: 'আশীর্বাদ',
    labelHi: 'आशीर्वाद',
  },
  {
    key: 'deepavali',
    greetingSa: '॥ शुभ दीपावली ॥',
    en: 'Wishing you a Deepavali radiant with diyas — may light triumph in every corner of your life.',
    bn: 'আপনাকে দীপাবলির শুভেচ্ছা — প্রদীপের আলোয় উজ্জ্বল হোক আপনার জীবনের প্রতিটি কোণ।',
    hi: 'दीपावली की शुभकामनाएं — दीयों के प्रकाश से आपके जीवन का हर कोना उज्ज्वल हो।',
    gradient: 'from-amber-700 via-orange-600 to-yellow-500',
    accent: 'text-yellow-100',
    emoji: '🪔',
    labelEn: 'Deepavali',
    labelBn: 'দীপাবলি',
    labelHi: 'दीपावली',
  },
  {
    key: 'holi',
    greetingSa: '॥ शुभ होली ॥',
    en: 'Happy Holi! May your life bloom with the colours of joy, love and togetherness.',
    bn: 'শুভ হোলি! আনন্দ, ভালোবাসা ও একতার রঙে রঙিন হোক আপনার জীবন।',
    hi: 'होली की शुभकामनाएं! आनंद, प्रेम और एकता के रंगों से आपका जीवन खिल उठे।',
    gradient: 'from-rose-500 via-fuchsia-500 to-indigo-500',
    accent: 'text-pink-100',
    emoji: '🎨',
    labelEn: 'Holi',
    labelBn: 'হোলি',
    labelHi: 'होली',
  },
  {
    key: 'janmashtami',
    greetingSa: '॥ श्रीकृष्ण जन्माष्टमी ॥',
    en: 'Janmashtami blessings — may Shri Krishna guide your every step with wisdom and love.',
    bn: 'জন্মাষ্টমীর শুভেচ্ছা — শ্রীকৃষ্ণ আপনার প্রতিটি পদক্ষেপে জ্ঞান ও ভালোবাসার পথ দেখান।',
    hi: 'जन्माष्टमी की शुभकामनाएं — श्रीकृष्ण आपके हर कदम पर ज्ञान और प्रेम का मार्ग दिखाएं।',
    gradient: 'from-indigo-700 via-blue-600 to-sky-500',
    accent: 'text-sky-100',
    emoji: '🦚',
    labelEn: 'Janmashtami',
    labelBn: 'জন্মাষ্টমী',
    labelHi: 'जन्माष्टमी',
  },
  {
    key: 'durga_puja',
    greetingSa: '॥ शुभ दुर्गा पूजा ॥',
    en: 'Shubho Durga Puja — may Maa Durga bless you with strength, courage and boundless grace.',
    bn: 'শুভ দুর্গাপূজা — মা দুর্গা আপনাকে শক্তি, সাহস ও অসীম কৃপা দান করুন।',
    hi: 'शुभ दुर्गा पूजा — मां दुर्गा आपको शक्ति, साहस और असीम कृपा प्रदान करें।',
    gradient: 'from-red-700 via-rose-600 to-amber-500',
    accent: 'text-rose-100',
    emoji: '🌺',
    labelEn: 'Durga Puja',
    labelBn: 'দুর্গাপূজা',
    labelHi: 'दुर्गा पूजा',
  },
  {
    key: 'ekadashi',
    greetingSa: '॥ शुभ एकादशी ॥',
    en: 'Ekadashi greetings — may your vrata be steadfast and your mind rest in Hari’s name.',
    bn: 'একাদশীর শুভেচ্ছা — আপনার ব্রত দৃঢ় হোক, মন হরির নামে স্থির থাকুক।',
    hi: 'एकादशी की शुभकामनाएं — आपका व्रत दृढ़ हो, मन हरि के नाम में स्थिर रहे।',
    gradient: 'from-emerald-700 via-teal-600 to-cyan-500',
    accent: 'text-emerald-100',
    emoji: '🌙',
    labelEn: 'Ekadashi',
    labelBn: 'একাদশী',
    labelHi: 'एकादशी',
  },
];

export function blessingFor(key: string): BlessingOccasion {
  return BLESSING_OCCASIONS.find((b) => b.key === key) ?? BLESSING_OCCASIONS[0];
}

export const BlessingCard: React.FC<{ occasion: string; compact?: boolean }> = ({
  occasion,
  compact = false,
}) => {
  const { lang, tr } = useLocaleText();
  const b = blessingFor(occasion);
  const text = lang === 'bn' ? b.bn : lang === 'hi' ? b.hi : b.en;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${b.gradient} text-white shadow-md ${
        compact ? 'p-3 max-w-[240px]' : 'p-5 max-w-[280px]'
      }`}
    >
      {/* soft diya glow */}
      <div className="absolute -top-6 -right-6 text-[72px] opacity-20 select-none" aria-hidden>
        {b.emoji}
      </div>
      <div className={`${compact ? 'text-2xl' : 'text-3xl'}`} aria-hidden>
        {b.emoji}
      </div>
      <div className={`font-extrabold mt-1 ${compact ? 'text-base' : 'text-lg'} ${b.accent}`}>
        {b.greetingSa}
      </div>
      <p className={`${compact ? 'text-xs' : 'text-sm'} mt-1.5 leading-relaxed text-white/95`}>{text}</p>
      <div className={`mt-2 ${compact ? 'text-[10px]' : 'text-[11px]'} font-semibold uppercase tracking-widest text-white/70`}>
        {tr('chat.blessing.sent', 'Sent with blessings', 'আশীর্বাদসহ প্রেরিত', 'आशीर्वाद सहित प्रेषित')}
      </div>
    </div>
  );
};
