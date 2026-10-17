/**
 * IosPwaGuide — the iPhone "Add to Home Screen" walkthrough.
 * ==========================================================
 * iOS Safari fires no beforeinstallprompt, so installing the PWA is
 * always a manual three-tap ritual: Share → Add to Home Screen → Add.
 * This guide makes those taps beautiful and foolproof: numbered steps
 * with lucide icons beside an annotated CSS phone mock whose Share
 * button glows. No popups outside this modal, no dark patterns —
 * the visitor opened it by tapping "Add to Home Screen" themselves.
 */
import React, { useEffect } from 'react';
import { X, Share, PlusSquare, Check, Smartphone } from 'lucide-react';
import { Tr } from './tr';
import './appgrowth.css';

export interface IosPwaGuideProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Share,
    en: 'Tap the Share button',
    bn: 'শেয়ার বোতামে ট্যাপ করুন',
    hi: 'शेयर बटन पर टैप करें',
    enDesc: 'In Safari, at the bottom of the screen.',
    bnDesc: 'সাফারিতে, স্ক্রিনের একদম নিচে।',
    hiDesc: 'सफ़ारी में, स्क्रीन के बिल्कुल नीचे।',
  },
  {
    icon: PlusSquare,
    en: 'Tap “Add to Home Screen”',
    bn: '“হোম স্ক্রিনে যোগ করুন”-এ ট্যাপ করুন',
    hi: '“होम स्क्रीन पर जोड़ें” पर टैप करें',
    enDesc: "Scroll down a little in the share sheet if you don't see it.",
    bnDesc: 'দেখতে না পেলে শেয়ার শিটে একটু নিচে স্ক্রল করুন।',
    hiDesc: 'न दिखे तो शेयर शीट में थोड़ा नीचे स्क्रॉल करें।',
  },
  {
    icon: Check,
    en: 'Tap “Add” — done 🙏',
    bn: '“যোগ করুন”-এ ট্যাপ করুন — হয়ে গেছে 🙏',
    hi: '“जोड़ें” पर टैप करें — हो गया 🙏',
    enDesc: 'The diya icon appears on your Home Screen, just like an app.',
    bnDesc: 'অ্যাপের মতোই হোম স্ক্রিনে প্রদীপের আইকন চলে আসবে।',
    hiDesc: 'ऐप की तरह होम स्क्रीन पर दीये का आइकन आ जाएगा।',
  },
];

/** Annotated CSS phone mock — no images, crisp on low-end phones. */
const PhoneMock: React.FC = () => (
  <div
    className="relative mx-auto w-[190px] rounded-[2.2rem] border-[6px] border-stone-900 bg-gradient-to-b from-[#2b1408] to-[#120a05] shadow-2xl shadow-orange-900/40"
    aria-hidden="true"
  >
    {/* notch */}
    <div className="absolute left-1/2 top-1.5 h-5 w-24 -translate-x-1/2 rounded-full bg-stone-900" />
    <div className="px-3 pb-4 pt-10">
      {/* mini page */}
      <div className="rounded-xl bg-[#FFF8F0] px-3 py-4 text-center">
        <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-base">
          🪔
        </div>
        <div className="mx-auto h-2 w-20 rounded-full bg-stone-200" />
        <div className="mx-auto mt-1.5 h-2 w-14 rounded-full bg-stone-200" />
      </div>
      {/* safari toolbar */}
      <div className="mt-2 flex items-center justify-around rounded-xl bg-stone-900/80 px-2 py-2.5">
        <span className="text-stone-500">‹</span>
        <span className="relative">
          <span className="ag-attention absolute -inset-2 rounded-full border-2 border-amber-300" />
          <Share className="relative h-5 w-5 text-amber-300" strokeWidth={2.4} />
        </span>
        <span className="text-stone-500">▢</span>
      </div>
      <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-amber-200/90">
        <Tr en="1 · Share" bn="১ · শেয়ার" hi="१ · शेयर" gloss={false} />
      </p>
    </div>
  </div>
);

export const IosPwaGuide: React.FC<IosPwaGuideProps> = ({ open, onClose }) => {
  // Lock body scroll while the guide is open; restore on close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-pwa-guide-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#FFF8F0] p-6 pb-8 shadow-2xl sm:rounded-3xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/30">
              <Smartphone className="h-5 w-5" />
            </span>
            <h2 id="ios-pwa-guide-title" className="text-lg font-black leading-tight text-stone-900">
              <Tr
                en="Add to your Home Screen"
                bn="হোম স্ক্রিনে যোগ করুন"
                hi="होम स्क्रीन पर जोड़ें"
              />
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-5 text-sm font-medium text-stone-600">
          <Tr
            en="iPhone installs in three taps — no App Store needed."
            bn="তিনটি ট্যাপেই ইনস্টল — অ্যাপ স্টোরের দরকার নেই।"
            hi="तीन टैप में इंस्टॉल — ऐप स्टोर की ज़रूरत नहीं।"
          />
        </p>

        <PhoneMock />

        <ol className="mt-6 space-y-4">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                  <step.icon className="h-5 w-5" />
                </span>
                {i < STEPS.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-orange-100" />}
              </div>
              <div className="pb-1 pt-1">
                <p className="text-[15px] font-extrabold text-stone-900">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-[11px] font-black text-white">
                    {i + 1}
                  </span>
                  <Tr en={step.en} bn={step.bn} hi={step.hi} />
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  <Tr en={step.enDesc} bn={step.bnDesc} hi={step.hiDesc} gloss={false} />
                </p>
              </div>
            </li>
          ))}
        </ol>

        <a
          href="/app"
          className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 px-6 text-base font-black text-white shadow-xl shadow-orange-500/30 transition-transform active:scale-[0.98]"
        >
          <Tr
            en="I've added it — open the app 🙏"
            bn="যোগ করে ফেলেছি — অ্যাপ খুলুন 🙏"
            hi="जोड़ दिया — ऐप खोलें 🙏"
          />
        </a>
        <p className="mt-3 text-center text-xs text-stone-500">
          <Tr
            en="The web app works instantly too — nothing to wait for."
            bn="ওয়েব অ্যাপও সাথে সাথে চলে — অপেক্ষার কিছু নেই।"
            hi="वेब ऐप भी तुरंत चलता है — इंतज़ार की कोई बात नहीं।"
            gloss={false}
          />
        </p>
      </div>
    </div>
  );
};

export default IosPwaGuide;
