/**
 * DigestView.tsx — "Your morning Suchana", the gentle digest.
 * ============================================================
 * A calm reading experience, not a notification list: tithi greeting
 * first, then blessings, settlement confirmations, and batched updates.
 * Warm paper, serif display, generous whitespace. No counts, no badges,
 * no urgency — this is the anti-notification-list.
 */

import React from 'react';
import { X, MoonStar, Sparkles, BadgeCheck, Newspaper } from 'lucide-react';
import { NT, pick, useNotifLang } from './NT';
import { timeAgo } from './uiTypes';
import type { DigestItem } from './uiTypes';
import type { TriText } from './types';

export interface DigestViewProps {
  window: 'morning' | 'evening';
  /** e.g. "Suprabhat" / "Shubh sandhya" — trilingual. */
  greeting: TriText;
  /** e.g. "Saturday, 17 October" — trilingual. */
  dateLine: TriText;
  /** Tithi card body — the Panjika greeting for today. */
  tithi: TriText;
  items: DigestItem[];
  onClose: () => void;
  onOpenItem?: (item: DigestItem) => void;
}

const WINDOW_TITLE: Record<'morning' | 'evening', TriText> = {
  morning: { en: 'Your Morning Suchana', bn: 'আপনার সকালের সূচনা', hi: 'आपकी सुबह की सूचना' },
  evening: { en: 'Your Evening Suchana', bn: 'আপনার সন্ধ্যার সূচনা', hi: 'आपकी शाम की सूचना' },
};

const WINDOW_SUB: Record<'morning' | 'evening', TriText> = {
  morning: {
    en: 'Begin the day gently — everything gathered, nothing urgent.',
    bn: 'দিনটি কোমলভাবে শুরু করুন — সব জমা করা, জরুরি কিছু নেই।',
    hi: 'दिन की शुरुआत कोमलता से करें — सब इकट्ठा, कुछ आवश्यक नहीं।',
  },
  evening: {
    en: 'Close the day gently — a quiet look at what ripened.',
    bn: 'দিনটি কোমলভাবে শেষ করুন — যা পেকেছে তার শান্ত দৃষ্টি।',
    hi: 'दिन का समापन कोमलता से करें — जो पका, उस पर शांत दृष्टि।',
  },
};

const KIND_META: Record<DigestItem['kind'], { icon: React.ReactNode; heading: TriText }> = {
  blessing: {
    icon: <Sparkles className="w-4 h-4" aria-hidden />,
    heading: { en: 'Blessings', bn: 'আশীর্বাদ', hi: 'आशीर्वाद' },
  },
  tithi: {
    icon: <MoonStar className="w-4 h-4" aria-hidden />,
    heading: { en: 'Tithi', bn: 'তিথি', hi: 'तिथि' },
  },
  settlement: {
    icon: <BadgeCheck className="w-4 h-4" aria-hidden />,
    heading: { en: 'Settled with grace', bn: 'সসম্মানে নিষ্পত্তি', hi: 'सम्मानपूर्वक निपटान' },
  },
  update: {
    icon: <Newspaper className="w-4 h-4" aria-hidden />,
    heading: { en: 'Quiet updates', bn: 'শান্ত আপডেট', hi: 'शांत अपडेट' },
  },
};

const DigestEntry: React.FC<{ item: DigestItem; onOpen?: (item: DigestItem) => void }> = ({
  item,
  onOpen,
}) => {
  const meta = KIND_META[item.kind];
  const body = (
    <article className="py-4 first:pt-1">
      <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
        <span className="text-amber-600">{meta.icon}</span>
        <NT text={meta.heading} />
        <span className="normal-case font-semibold tracking-normal text-stone-300">·</span>
        <span className="normal-case font-semibold tracking-normal text-stone-400">
          <NT text={timeAgo(new Date(item.timestamp).getTime())} />
        </span>
      </p>
      <h4 className={`mt-1.5 text-stone-800 ${item.kind === 'blessing' ? 'font-serif italic text-[17px]' : 'font-bold text-[15px]'}`}>
        <NT text={item.title} />
      </h4>
      <p className="mt-1 text-[14px] leading-relaxed text-stone-600">
        <NT text={item.body} />
      </p>
    </article>
  );
  if (!onOpen) return body;
  return (
    <button type="button" onClick={() => onOpen(item)} className="w-full text-left min-h-[44px]">
      {body}
    </button>
  );
};

export const DigestView: React.FC<DigestViewProps> = ({
  window,
  greeting,
  dateLine,
  tithi,
  items,
  onClose,
  onOpenItem,
}) => {
  const lang = useNotifLang();
  const blessings = items.filter((i) => i.kind === 'blessing');
  const settlements = items.filter((i) => i.kind === 'settlement');
  const updates = items.filter((i) => i.kind === 'update' || i.kind === 'tithi');

  return (
    <div
      className="fixed inset-0 z-[110] bg-stone-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog"
      aria-label={pick(WINDOW_TITLE[window], lang)}
      style={{ colorScheme: 'light' }}
    >
      <div className="bg-[#faf7f2] w-full sm:max-w-xl h-[100dvh] sm:h-[88vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Masthead */}
        <div className="shrink-0 px-6 pt-8 pb-5 text-center relative bg-gradient-to-b from-amber-100/70 to-transparent">
          <button
            type="button"
            onClick={onClose}
            aria-label={pick({ en: 'Close digest', bn: 'সারসংক্ষেপ বন্ধ করুন', hi: 'सारांश बंद करें' }, lang)}
            className="absolute top-4 right-4 w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-stone-600 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
          <span className="text-4xl" aria-hidden>
            🪔
          </span>
          <p className="mt-2 text-[13px] font-bold text-amber-800">
            <NT text={greeting} />
          </p>
          <h2 className="font-serif text-[26px] leading-tight font-bold text-stone-900 mt-1">
            <NT text={WINDOW_TITLE[window]} />
          </h2>
          <p className="text-[13px] text-stone-500 mt-1">
            <NT text={dateLine} />
          </p>
          <p className="text-[13px] italic text-stone-500 mt-2 max-w-[300px] mx-auto leading-relaxed">
            <NT text={WINDOW_SUB[window]} />
          </p>
        </div>

        {/* Reading body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 custom-scrollbar">
          {/* Tithi greeting */}
          <section className="rounded-2xl bg-gradient-to-br from-amber-700 to-orange-800 text-amber-50 p-5 shadow-md">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-200/90 flex items-center gap-1.5">
              <MoonStar className="w-4 h-4" aria-hidden />
              <NT text={{ en: 'Today’s tithi', bn: 'আজকের তিথি', hi: 'आज की तिथि' }} />
            </p>
            <p className="font-serif text-[16px] leading-relaxed mt-2">
              <NT text={tithi} />
            </p>
          </section>

          {/* Blessings */}
          {blessings.length > 0 && (
            <section className="mt-6">
              <div className="divide-y divide-amber-100">
                {blessings.map((item) => (
                  <DigestEntry key={item.id} item={item} onOpen={onOpenItem} />
                ))}
              </div>
            </section>
          )}

          {/* Settlements */}
          {settlements.length > 0 && (
            <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-1">
              <div className="divide-y divide-emerald-100">
                {settlements.map((item) => (
                  <DigestEntry key={item.id} item={item} onOpen={onOpenItem} />
                ))}
              </div>
            </section>
          )}

          {/* Quiet updates */}
          {updates.length > 0 && (
            <section className="mt-6">
              <div className="divide-y divide-stone-200/70">
                {updates.map((item) => (
                  <DigestEntry key={item.id} item={item} onOpen={onOpenItem} />
                ))}
              </div>
            </section>
          )}

          {items.length === 0 && (
            <p className="text-center text-sm text-stone-400 italic mt-10 px-8 leading-relaxed">
              <NT
                text={{
                  en: 'Nothing gathered for this Suchana. The day is yours, uninterrupted.',
                  bn: 'এই সূচনার জন্য কিছুই জমা হয়নি। দিনটি আপনার, অবিচ্ছিন্ন।',
                  hi: 'इस सूचना हेतु कुछ इकट्ठा नहीं हुआ। दिन आपका है, अबाधित।',
                }}
              />
            </p>
          )}

          {/* Gentle close */}
          <div className="mt-8 text-center pb-2">
            <p className="font-serif italic text-stone-500 text-[15px]">
              <NT
                text={
                  window === 'morning'
                    ? { en: 'Shubham bhavatu — may the day be auspicious.', bn: 'শুভম্ ভবতু — দিনটি শুভ হোক।', hi: 'शुभम् भवतु — दिन शुभ हो।' }
                    : { en: 'Shubh ratri — rest in stillness.', bn: 'শুভ রাত্রি — স্থিরতায় বিশ্রাম নিন।', hi: 'शुभ रात्रि — स्थिरता में विश्राम करें।' }
                }
              />
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 min-h-[44px] px-8 rounded-full bg-amber-700 hover:bg-amber-800 text-amber-50 text-sm font-bold transition-colors"
            >
              <NT
                text={
                  window === 'morning'
                    ? { en: 'Begin the day', bn: 'দিন শুরু করুন', hi: 'दिन आरंभ करें' }
                    : { en: 'Rest well', bn: 'ভালোভাবে বিশ্রাম নিন', hi: 'अच्छी तरह विश्राम करें' }
                }
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
