/**
 * SuggestionCards.tsx — Progressive feature discovery.
 * =====================================================================
 * The Solo home starts calm. As the user engages, Suchana suggests the
 * next natural feature — dismissable cards, never locked tabs. Each
 * suggestion has a trigger (read from the solo store), content, and a
 * localStorage dismissal key.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { T } from './ui';
import { useSoloStore } from './soloStore';

const DISMISS_KEY = (uid: string, id: string) => `sb_suggest_dismiss_${uid}_${id}`;

interface Suggestion {
  id: string;
  icon: string;
  title: { en: string; bn: string; hi: string };
  body: { en: string; bn: string; hi: string };
  cta: { en: string; bn: string; hi: string };
  route: string;
  /** When true, this card is eligible. */
  trigger: (s: { japa: number; vrata: number; giving: number; samskaras: number }) => boolean;
}

const SUGGESTIONS: Suggestion[] = [
  {
    id: 'sadhana',
    icon: '📿',
    title: { en: 'Deepen your sadhana', bn: 'সাধনা গভীর করুন', hi: 'साधना गहरी करें' },
    body: {
      en: 'You have been recording japa regularly. Track streaks, sankalpas and daily discipline in one place.',
      bn: 'আপনি নিয়মিত জপ রেকর্ড করছেন। এক জায়গায় ধারাবাহিকতা ও সংকল্প ট্র্যাক করুন।',
      hi: 'आप नियमित जप दर्ज कर रहे हैं। एक स्थान पर निरंतरता व संकल्प ट्रैक करें।',
    },
    cta: { en: 'Open Sadhana', bn: 'সাধনা খুলুন', hi: 'साधना खोलें' },
    route: '/app/home/sadhana',
    trigger: (s) => s.japa >= 5,
  },
  {
    id: 'samskara',
    icon: '🪔',
    title: { en: 'Plan a samskara', bn: 'সংস্কারের পরিকল্পনা', hi: 'संस्कार की योजना' },
    body: {
      en: 'From namakarana to vivaha — find shubh muhurats and plan ceremonies with your family.',
      bn: 'নামকরণ থেকে বিবাহ — শুভ মুহূর্ত খুঁজুন ও পরিবারের সঙ্গে অনুষ্ঠান পরিকল্পনা করুন।',
      hi: 'नामकरण से विवाह तक — शुभ मुहूर्त खोजें व परिवार संग समारोह की योजना बनाएँ।',
    },
    cta: { en: 'Explore Samskaras', bn: 'সংস্কার দেখুন', hi: 'संस्कार देखें' },
    route: '/app/home/samskara',
    trigger: (s) => s.vrata >= 3,
  },
  {
    id: 'giving',
    icon: '🤲',
    title: { en: 'Record your dana', bn: 'দান রেকর্ড করুন', hi: 'दान दर्ज करें' },
    body: {
      en: 'Keep a sacred ledger of your giving — every dana remembered, beautifully.',
      bn: 'আপনার দানের পবিত্র হিসাব রাখুন — প্রতিটি দান স্মরণীয়।',
      hi: 'अपने दान का पवित्र लेखा रखें — हर दान स्मरणीय।',
    },
    cta: { en: 'Open Giving', bn: 'দান খুলুন', hi: 'दान खोलें' },
    route: '/app/home/giving',
    trigger: (s) => s.japa >= 10,
  },
];

export const SuggestionCards: React.FC<{ uid: string }> = ({ uid }) => {
  const { state } = useSoloStore();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`sb_suggest_dismissed_${uid}`) || '[]');
    } catch {
      return [];
    }
  });

  const counts = useMemo(
    () => ({
      japa: Array.isArray(state?.japa) ? state.japa.length : 0,
      vrata: Array.isArray(state?.vrata) ? state.vrata.length : 0,
      giving: Array.isArray(state?.giving) ? state.giving.length : 0,
      samskaras: Array.isArray(state?.samskaras) ? state.samskaras.length : 0,
    }),
    [state]
  );

  const eligible = useMemo(
    () => SUGGESTIONS.filter((s) => !dismissed.includes(s.id) && s.trigger(counts)).slice(0, 2),
    [dismissed, counts]
  );

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(`sb_suggest_dismissed_${uid}`, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  if (eligible.length === 0) return null;

  return (
    <div className="space-y-2.5" aria-label="Suggestions for you">
      {eligible.map((s) => (
        <div
          key={s.id}
          className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 flex gap-3"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl" aria-hidden>
            {s.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-stone-900 text-sm">
              <T en={s.title.en} bn={s.title.bn} hi={s.title.hi} />
            </div>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              <T en={s.body.en} bn={s.body.bn} hi={s.body.hi} />
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={() => navigate(s.route)}
                className="px-4 py-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-temple-950 text-xs font-black transition-colors"
              >
                <T en={s.cta.en} bn={s.cta.bn} hi={s.cta.hi} />
              </button>
              <button
                type="button"
                onClick={() => dismiss(s.id)}
                aria-label="Dismiss suggestion"
                className="px-3 py-2 min-h-[44px] min-w-[44px] rounded-xl text-stone-400 hover:text-stone-600 text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
