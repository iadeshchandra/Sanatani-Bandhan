/**
 * OrderTimeline.tsx — the seva journey, made visible (QUEUED #26).
 * ================================================================
 * A warm vertical timeline for a marketplace order, rendered from the
 * pure model in `lib/orderTimeline.ts`. Same component on both sides of
 * the order — MyBookings (devotee) and ProviderMarketplace (provider) —
 * with perspective-aware words: "Waiting for Panditji to accept" on one
 * side is "A family awaits your acceptance" on the other.
 *
 * Collapsed by default: the header row itself answers "where is my
 * order?" (current stage + who acts) at a glance; tapping opens the
 * full journey. Terminal states are honest end states — cancelled,
 * disputed and refunded are shown as what they are, never dressed as
 * a happy path.
 */
import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  buildOrderTimeline,
  type OrderLike,
  type StageKey,
  type TimelinePerspective,
} from '../lib/orderTimeline';

type Lang = 'en' | 'bn' | 'hi';
const pick = (lang: string): Lang => (lang === 'bn' || lang === 'hi' ? lang : 'en');
const LOCALES: Record<Lang, string> = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-BD' };

type Tri = Record<Lang, string>;
const tr = (m: Tri, l: Lang) => m[l];

const JOURNEY: Tri = { en: 'Seva journey', bn: 'সেবার যাত্রা', hi: 'सेवा यात्रा' };

const TITLES: Record<StageKey, Tri> = {
  requested: { en: 'Seva requested', bn: 'সেবার অনুরোধ', hi: 'सेवा का अनुरोध' },
  dakshina: { en: 'Dakshina', bn: 'দক্ষিণা', hi: 'दक्षिणा' },
  accepted: { en: 'Accepted with gratitude', bn: 'কৃতজ্ঞতায় গৃহীত', hi: 'कृतज्ञता से स्वीकृत' },
  in_seva: { en: 'Seva offered', bn: 'সেবা অর্পণ', hi: 'सेवा अर्पण' },
  contribution: { en: 'Seva contribution', bn: 'সেবা অবদান', hi: 'सेवा योगदान' },
  blessed: { en: 'Journey complete', bn: 'যাত্রা সম্পূর্ণ', hi: 'यात्रा पूर्ण' },
};

/** "What happens next / who acts" for the CURRENT stage, per perspective. */
const NEXT: Record<string, Record<TimelinePerspective, Tri>> = {
  'dakshina:rail1': {
    client: {
      en: 'Offer the dakshina to Panditji directly (UPI / bKash / cash) — they will confirm receipt here, and the journey moves forward.',
      bn: 'পণ্ডিতজিকে সরাসরি দক্ষিণা অর্পণ করুন (UPI / বিকাশ / নগদ) — তিনি এখানে প্রাপ্তি নিশ্চিত করলেই যাত্রা এগিয়ে যাবে।',
      hi: 'पंडितजी को सीधे दक्षिणा अर्पित करें (UPI / bKash / नकद) — वे यहाँ प्राप्ति की पुष्टि करेंगे और यात्रा आगे बढ़ेगी।',
    },
    provider: {
      en: 'The family offers the dakshina to you directly. When it reaches you, tap “Confirm payment” above.',
      bn: 'পরিবারটি সরাসরি আপনাকে দক্ষিণা অর্পণ করছে। পৌঁছালে উপরে “Confirm payment” চাপুন।',
      hi: 'परिवार सीधे आपको दक्षिणा अर्पित कर रहा है। मिलने पर ऊपर “Confirm payment” दबाएँ।',
    },
  },
  'dakshina:wallet': {
    client: {
      en: 'Complete the dakshina from your Seva Wallet — it rests safely there until the seva is complete.',
      bn: 'আপনার সেবা ওয়ালেট থেকে দক্ষিণা সম্পূর্ণ করুন — সেবা শেষ না হওয়া পর্যন্ত তা নিরাপদে থাকবে।',
      hi: 'अपने सेवा वॉलेट से दक्षिणा पूर्ण करें — सेवा पूर्ण होने तक वह सुरक्षित रहेगी।',
    },
    provider: {
      en: 'The family is completing the dakshina from their Seva Wallet.',
      bn: 'পরিবারটি তাদের সেবা ওয়ালেট থেকে দক্ষিণা সম্পূর্ণ করছে।',
      hi: 'परिवार अपने सेवा वॉलेट से दक्षिणा पूर्ण कर रहा है।',
    },
  },
  'dakshina:rail2': {
    client: {
      en: 'Send the token advance and share the transaction ID — Panditji confirms it, and your muhurat is held with love.',
      bn: 'টোকেন অগ্রিম পাঠিয়ে লেনদেনের আইডি জানান — পণ্ডিতজি নিশ্চিত করলেই আপনার মুহূর্ত সযত্নে রাখা হবে।',
      hi: 'टोकन अग्रिम भेजकर लेनदेन आईडी साझा करें — पंडितजी पुष्टि करेंगे और आपका मुहूर्त स्नेह से सुरक्षित रहेगा।',
    },
    provider: {
      en: 'The family is sending the token advance — confirm their payment proof when it arrives.',
      bn: 'পরিবারটি টোকেন অগ্রিম পাঠাচ্ছে — প্রমাণ এলে নিশ্চিত করুন।',
      hi: 'परिवार टोकन अग्रिम भेज रहा है — प्रमाण आने पर पुष्टि करें।',
    },
  },
  accepted: {
    client: {
      en: 'Waiting for Panditji to accept your request 🙏',
      bn: 'পণ্ডিতজির গ্রহণের অপেক্ষায় 🙏',
      hi: 'पंडितजी की स्वीकृति की प्रतीक्षा है 🙏',
    },
    provider: {
      en: 'A family awaits your acceptance — accept to hold their muhurat.',
      bn: 'একটি পরিবার আপনার গ্রহণের অপেক্ষায় — গ্রহণ করে তাদের মুহূর্তটি ধরে রাখুন।',
      hi: 'एक परिवार आपकी स्वीकृति की प्रतीक्षा कर रहा है — स्वीकार करके उनका मुहूर्त सुरक्षित करें।',
    },
  },
  'in_seva:to_begin': {
    client: {
      en: 'Accepted 🙏 — the seva will be offered at the chosen muhurat.',
      bn: 'গৃহীত হয়েছে 🙏 — নির্ধারিত মুহূর্তে সেবা অর্পণ করা হবে।',
      hi: 'स्वीकृत 🙏 — चुने गए मुहूर्त पर सेवा अर्पित होगी।',
    },
    provider: {
      en: 'Offer the seva at the chosen muhurat, then mark it offered above.',
      bn: 'নির্ধারিত মুহূর্তে সেবা অর্পণ করুন, তারপর উপরে তা চিহ্নিত করুন।',
      hi: 'चुने गए मुहूर्त पर सेवा अर्पित करें, फिर ऊपर उसे चिह्नित करें।',
    },
  },
  'in_seva:underway': {
    client: {
      en: 'The seva is being offered now 🙏',
      bn: 'সেবা এখন অর্পণ করা হচ্ছে 🙏',
      hi: 'सेवा अभी अर्पित हो रही है 🙏',
    },
    provider: {
      en: 'Seva underway — when it is offered, complete it from the button above.',
      bn: 'সেবা চলছে — অর্পণ শেষ হলে উপরের বোতাম থেকে সম্পূর্ণ করুন।',
      hi: 'सेवा चल रही है — अर्पण होने पर ऊपर के बटन से पूर्ण करें।',
    },
  },
  'in_seva:offered': {
    client: {
      en: 'The seva has been offered 🙏 — one closing step remains.',
      bn: 'সেবা অর্পণ করা হয়েছে 🙏 — একটি শেষ ধাপ বাকি।',
      hi: 'सेवा अर्पित हो चुकी है 🙏 — एक अंतिम चरण शेष है।',
    },
    provider: {
      en: 'Seva offered 🙏 — the closing step is on its way.',
      bn: 'সেবা অর্পণ হয়েছে 🙏 — শেষ ধাপটি এগিয়ে আসছে।',
      hi: 'सेवा अर्पित 🙏 — अंतिम चरण प्रगति पर है।',
    },
  },
  contribution: {
    client: {
      en: 'The seva is complete 🙏 — offer the seva contribution above to close the journey and receive ashirvad.',
      bn: 'সেবা সম্পূর্ণ 🙏 — যাত্রা শেষ করতে উপরে সেবা অবদান অর্পণ করুন এবং আশীর্বাদ গ্রহণ করুন।',
      hi: 'सेवा पूर्ण 🙏 — यात्रा संपन्न करने के लिए ऊपर सेवा योगदान अर्पित करें और आशीर्वाद प्राप्त करें।',
    },
    provider: {
      en: 'Seva offered 🙏 — the family offers the platform contribution, and owner verification closes the journey.',
      bn: 'সেবা অর্পণ হয়েছে 🙏 — পরিবার প্ল্যাটফর্ম অবদান অর্পণ করবে, মালিকের যাচাইয়ে যাত্রা সম্পূর্ণ হবে।',
      hi: 'सेवा अर्पित 🙏 — परिवार मंच योगदान अर्पित करेगा, मालिक के सत्यापन से यात्रा पूर्ण होगी।',
    },
  },
  requested: {
    client: {
      en: 'Your request has been placed with love.',
      bn: 'আপনার অনুরোধ সযত্নে রাখা হয়েছে।',
      hi: 'आपका अनुरोध स्नेह से रखा गया है।',
    },
    provider: {
      en: 'A new seva request has arrived.',
      bn: 'একটি নতুন সেবার অনুরোধ এসেছে।',
      hi: 'एक नया सेवा अनुरोध आया है।',
    },
  },
};

const COMPLETE_LINE: Record<TimelinePerspective, Tri> = {
  client: {
    en: 'This seva journey is complete. Dhanyavaad 🙏',
    bn: 'এই সেবার যাত্রা সম্পূর্ণ। ধন্যবাদ 🙏',
    hi: 'यह सेवा यात्रा पूर्ण है। धन्यवाद 🙏',
  },
  provider: {
    en: 'This seva journey is complete. Dhanyavaad for your seva 🙏',
    bn: 'এই সেবার যাত্রা সম্পূর্ণ। আপনার সেবার জন্য ধন্যবাদ 🙏',
    hi: 'यह सेवा यात्रा पूर्ण है। आपकी सेवा के लिए धन्यवाद 🙏',
  },
};

const TERMINAL: Record<string, Tri> = {
  cancelled: {
    en: 'This seva journey was cancelled before completion. No seva will take place.',
    bn: 'সম্পূর্ণ হওয়ার আগেই এই সেবার যাত্রা বাতিল হয়েছে। কোনো সেবা হবে না।',
    hi: 'यह सेवा यात्रा पूर्ण होने से पहले रद्द हो गई। कोई सेवा नहीं होगी।',
  },
  disputed: {
    en: 'A concern has been raised on this journey — it is being looked into with care, for both sides 🙏',
    bn: 'এই যাত্রা নিয়ে একটি উদ্বেগ জানানো হয়েছে — দুই পক্ষের জন্যই যত্নে তা দেখা হচ্ছে 🙏',
    hi: 'इस यात्रा पर एक चिंता उठाई गई है — दोनों पक्षों के लिए सावधानी से इसकी जाँच हो रही है 🙏',
  },
  refunded: {
    en: 'The dakshina for this journey was returned. 🙏',
    bn: 'এই যাত্রার দক্ষিণা ফেরত দেওয়া হয়েছে। 🙏',
    hi: 'इस यात्रा की दक्षिणा लौटा दी गई है। 🙏',
  },
};

function nextCopy(
  model: ReturnType<typeof buildOrderTimeline>,
  perspective: TimelinePerspective,
  l: Lang,
): string | null {
  if (model.outcome === 'complete') return tr(COMPLETE_LINE[perspective], l);
  if (model.terminal) return tr(TERMINAL[model.terminal.kind], l);
  const cur = model.stages.find((s) => s.state === 'current');
  if (!cur) return null;
  const byDetail = cur.detail ? NEXT[`${cur.key}:${cur.detail}`] : undefined;
  const byPath = cur.key === 'dakshina' ? NEXT[`dakshina:${model.path === 'seva_bazar' ? 'rail2' : model.path}`] : undefined;
  const entry = byDetail || byPath || NEXT[cur.key];
  return entry ? tr(entry[perspective], l) : null;
}

function fmtAt(iso: string, l: Lang): string {
  try {
    return new Intl.DateTimeFormat(LOCALES[l], {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

interface Props {
  order: OrderLike & { id?: string };
  perspective: TimelinePerspective;
}

export const OrderTimeline: React.FC<Props> = ({ order, perspective }) => {
  const { currentLang } = useLanguage();
  const l = pick(currentLang);
  const [open, setOpen] = useState(false);
  const model = useMemo(() => buildOrderTimeline(order), [order]);
  const headline = nextCopy(model, perspective, l);
  const current = model.stages.find((s) => s.state === 'current');

  return (
    <div className="mt-3 border-t border-stone-100 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 min-h-[44px] text-left"
      >
        <span aria-hidden>🧭</span>
        <span className="text-[11px] font-black text-stone-700">{tr(JOURNEY, l)}</span>
        {model.outcome === 'in_journey' && current && (
          <span className="text-[10px] font-bold text-amber-700 truncate">
            · {tr(TITLES[current.key], l)}
          </span>
        )}
        {model.outcome === 'complete' && (
          <span className="text-[10px] font-bold text-emerald-700 truncate">· {tr(TITLES.blessed, l)} 🙏</span>
        )}
        {model.terminal && (
          <span className="text-[10px] font-bold text-stone-500 truncate">· {model.terminal.kind}</span>
        )}
        <span className="ml-auto shrink-0 text-stone-400">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {headline && !open && (
        <p className="text-[11px] leading-snug text-stone-600">{headline}</p>
      )}

      {open && (
        <ol className="mt-3 ml-1.5">
          {model.stages.map((s, i) => {
            const last = i === model.stages.length - 1;
            return (
              <li key={s.key} className="relative flex gap-3 pb-4 last:pb-1">
                {!last && (
                  <span
                    aria-hidden
                    className={`absolute left-[9px] top-5 bottom-0 w-0.5 ${s.state === 'done' ? 'bg-emerald-200' : 'bg-stone-200'}`}
                  />
                )}
                <span
                  aria-hidden
                  className={`relative z-10 w-5 h-5 rounded-full shrink-0 flex items-center justify-center border-2 ${
                    s.state === 'done'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : s.state === 'current'
                        ? 'bg-amber-400 border-amber-500 animate-pulse'
                        : s.state === 'skipped'
                          ? 'bg-stone-100 border-stone-300'
                          : 'bg-white border-stone-300'
                  }`}
                >
                  {s.state === 'done' && <Check className="w-3 h-3" strokeWidth={3.5} />}
                  {s.state === 'skipped' && <span className="w-2 h-0.5 bg-stone-400 rounded" />}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p
                    className={`text-xs font-black ${
                      s.state === 'current'
                        ? 'text-amber-800'
                        : s.state === 'done'
                          ? 'text-stone-800'
                          : 'text-stone-400'
                    }`}
                  >
                    {tr(TITLES[s.key], l)}
                    {s.state === 'current' && s.key === 'in_seva' && s.detail === 'underway' && (
                      <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 align-middle">
                        ●
                      </span>
                    )}
                  </p>
                  {s.at && s.state !== 'upcoming' && (
                    <p className="text-[10px] text-stone-400">{fmtAt(s.at, l)}</p>
                  )}
                  {s.state === 'current' && headline && model.outcome === 'in_journey' && (
                    <p className="text-[11px] text-stone-600 leading-snug mt-0.5">{headline}</p>
                  )}
                </div>
              </li>
            );
          })}
          {model.outcome === 'complete' && (
            <li className="pt-1">
              <p className="text-[11px] text-emerald-700 font-bold">{tr(COMPLETE_LINE[perspective], l)}</p>
            </li>
          )}
          {model.terminal && (
            <li className="relative flex gap-3 pb-1">
              <span
                aria-hidden
                className="relative z-10 w-5 h-5 rounded-full shrink-0 flex items-center justify-center border-2 bg-stone-200 border-stone-300 text-stone-600 text-[10px] font-black"
              >
                {model.terminal.kind === 'refunded' ? '↩' : model.terminal.kind === 'disputed' ? '!' : '✕'}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-xs font-black text-stone-700 capitalize">{model.terminal.kind}</p>
                {model.terminal.at && (
                  <p className="text-[10px] text-stone-400">{fmtAt(model.terminal.at, l)}</p>
                )}
                <p className="text-[11px] text-stone-600 leading-snug mt-0.5">
                  {tr(TERMINAL[model.terminal.kind], l)}
                </p>
              </div>
            </li>
          )}
        </ol>
      )}
    </div>
  );
};
