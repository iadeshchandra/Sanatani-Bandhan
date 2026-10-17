/**
 * FirstRunExplainer.tsx — "How notifications work here".
 * ======================================================
 * One screen, shown once: the 4 priority tiers with honest examples,
 * in the Sanatani voice — calm, respectful, yours to control.
 *
 * Show-once is tracked in localStorage (EXPLAINER_SEEN_KEY); the parent
 * decides when to mount it via `shouldShowExplainer()`.
 */

import React from 'react';
import { Siren, HandCoins, Sunrise, EyeOff, X } from 'lucide-react';
import { NT, pick, useNotifLang } from './NT';
import type { TriText } from './types';

export const EXPLAINER_SEEN_KEY = 'sb-notif-explainer-seen-v1';

export function shouldShowExplainer(storage: Storage | null = null): boolean {
  try {
    const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    return s?.getItem(EXPLAINER_SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

export function markExplainerSeen(storage: Storage | null = null): void {
  try {
    const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
    s?.setItem(EXPLAINER_SEEN_KEY, '1');
  } catch {
    /* calm: never crash on storage */
  }
}

interface TierRow {
  icon: React.ReactNode;
  tone: string;
  name: TriText;
  example: TriText;
}

const TIERS: TierRow[] = [
  {
    icon: <Siren className="w-5 h-5" aria-hidden />,
    tone: 'bg-red-50 text-red-700 border-red-200',
    name: { en: 'Critical', bn: 'জরুরি', hi: 'अति आवश्यक' },
    example: {
      en: 'SOS alerts. Always break through — even in quiet hours.',
      bn: 'SOS সতর্কতা। সবসময় পৌঁছে যায় — শান্ত সময়েও।',
      hi: 'SOS चेतावनियां। हमेशा पहुँचती हैं — शांत समय में भी।',
    },
  },
  {
    icon: <HandCoins className="w-5 h-5" aria-hidden />,
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    name: { en: 'Important', bn: 'গুরুত্বপূর্ণ', hi: 'महत्वपूर्ण' },
    example: {
      en: 'Money requests, replies to you. Prompt, never noisy.',
      bn: 'অর্থ অনুরোধ, আপনার প্রতি উত্তর। দ্রুত, কখনো কোলাহলপূর্ণ নয়।',
      hi: 'धन अनुरोध, आपको उत्तर। शीघ्र, कभी शोरगुल नहीं।',
    },
  },
  {
    icon: <Sunrise className="w-5 h-5" aria-hidden />,
    tone: 'bg-stone-100 text-stone-600 border-stone-200',
    name: { en: 'Gentle', bn: 'মৃদু', hi: 'सौम्य' },
    example: {
      en: 'Festival reminders, settlements. Batched into your morning or evening Suchana.',
      bn: 'উৎসব স্মরণ, নিষ্পত্তি। সকাল বা সন্ধ্যার সূচনায় একসাথে।',
      hi: 'त्योहार स्मरण, निपटान। सुबह या शाम की सूचना में एकत्र।',
    },
  },
  {
    icon: <EyeOff className="w-5 h-5" aria-hidden />,
    tone: 'bg-stone-100 text-stone-500 border-stone-200',
    name: { en: 'Silent', bn: 'নীরব', hi: 'मौन' },
    example: {
      en: 'Quiet blessings and records. In-app only — they never interrupt.',
      bn: 'শান্ত আশীর্বাদ ও রেকর্ড। শুধু অ্যাপে — কখনো ব্যাঘাত নয়।',
      hi: 'शांत आशीर्वाद और अभिलेख। केवल ऐप में — कभी बाधा नहीं।',
    },
  },
];

export const FirstRunExplainer: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const lang = useNotifLang();

  const dismiss = () => {
    markExplainerSeen();
    onDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-stone-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog"
      aria-label={pick({ en: 'How notifications work', bn: 'বিজ্ঞপ্তি কীভাবে কাজ করে', hi: 'सूचनाएं कैसे काम करती हैं' }, lang)}
      style={{ colorScheme: 'light' }}
    >
      <div className="bg-[#faf7f2] w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="shrink-0 px-6 pt-6 pb-4 text-center relative">
          <button
            type="button"
            onClick={dismiss}
            aria-label={pick({ en: 'Skip', bn: 'এড়িয়ে যান', hi: 'छोड़ें' }, lang)}
            className="absolute top-4 right-4 w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
          <span className="text-4xl" aria-hidden>
            🪔
          </span>
          <h2 className="font-serif text-[22px] font-bold text-stone-900 mt-3 leading-snug">
            <NT
              text={{
                en: 'How notifications work here',
                bn: 'এখানে বিজ্ঞপ্তি কীভাবে কাজ করে',
                hi: 'यहाँ सूचनाएं कैसे काम करती हैं',
              }}
            />
          </h2>
          <p className="text-[13px] text-stone-500 mt-1.5 leading-relaxed max-w-[280px] mx-auto">
            <NT
              text={{
                en: 'Suchana, not noise. Calm, respectful, and yours to control.',
                bn: 'সূচনা, কোলাহল নয়। শান্ত, শ্রদ্ধাশীল, এবং আপনার নিয়ন্ত্রণে।',
                hi: 'सूचना, शोर नहीं। शांत, सम्मानपूर्ण, और आपके नियंत्रण में।',
              }}
            />
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2 space-y-2.5 custom-scrollbar">
          {TIERS.map((tier) => (
            <div key={pick(tier.name, 'en')} className={`rounded-2xl border p-4 flex gap-3 ${tier.tone}`}>
              <span className="shrink-0 w-10 h-10 rounded-full bg-white/70 flex items-center justify-center">
                {tier.icon}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[14px]">
                  <NT text={tier.name} />
                </p>
                <p className="text-[13px] leading-relaxed opacity-80 mt-0.5">
                  <NT text={tier.example} />
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 px-6 pb-6 pt-3">
          <button
            type="button"
            onClick={dismiss}
            className="w-full min-h-[52px] rounded-2xl bg-amber-700 hover:bg-amber-800 text-amber-50 text-[15px] font-bold transition-colors"
          >
            <NT
              text={{
                en: 'Begin calmly',
                bn: 'শান্তভাবে শুরু করুন',
                hi: 'शांति से आरंभ करें',
              }}
            />
          </button>
          <p className="text-center text-[11px] text-stone-400 mt-2.5">
            <NT
              text={{
                en: 'You can change all of this anytime in Settings.',
                bn: 'সেটিংস থেকে যেকোনো সময় এগুলো বদলাতে পারেন।',
                hi: 'सेटिंग में जाकर आप इन्हें कभी भी बदल सकते हैं।',
              }}
            />
          </p>
        </div>
      </div>
    </div>
  );
};
