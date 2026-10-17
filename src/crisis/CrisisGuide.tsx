/**
 * CrisisGuide.tsx — gentle first-run walkthrough for Crisis Command.
 * ===================================================================
 * 3 slides, shown ONCE, dismissable forever (localStorage flag).
 * Tone: Suchana, not notifications — the safety net feels like a warm
 * hand on the shoulder, never an alarm drill.
 *
 *   Slide 1 — Your safety circle: add family contacts.
 *   Slide 2 — One long-press sends help.
 *   Slide 3 — Your location is shared ONLY during SOS.
 *
 * Usage:
 *   import { CrisisGuide } from '../crisis/CrisisGuide';
 *   <CrisisGuide onDone={...} />                 // auto-shows on first run
 *   <CrisisGuide forceShow onDone={...} />       // preview / re-watch
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Users, Hand, MapPin, Lock, X, ChevronLeft, ChevronRight, HeartHandshake } from 'lucide-react';
import { T } from '../solo/ui';
import { useLanguage } from '../context/LanguageContext';
import { CRISIS_COLORS, CRISIS_TOUCH_MIN } from './crisisTheme';

export const CRISIS_GUIDE_SEEN_KEY = 'sb_crisis_guide_seen_v1';

export function hasSeenCrisisGuide(): boolean {
  try {
    return window.localStorage.getItem(CRISIS_GUIDE_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markCrisisGuideSeen(): void {
  try {
    window.localStorage.setItem(CRISIS_GUIDE_SEEN_KEY, '1');
  } catch {
    /* storage unavailable — guide simply shows again next time */
  }
}

/** Dev/preview helper: let the walkthrough show again. */
export function resetCrisisGuide(): void {
  try {
    window.localStorage.removeItem(CRISIS_GUIDE_SEEN_KEY);
  } catch {
    /* noop */
  }
}

const SLIDES = [0, 1, 2] as const;

function SlideArt({ index }: { index: number }) {
  const common = 'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5';
  if (index === 0)
    return (
      <div
        className={`${common} bg-amber-100 border-2 border-amber-300 shadow-[0_0_30px_rgba(217,119,6,0.25)]`}
      >
        <Users className="w-11 h-11 text-amber-700" aria-hidden />
      </div>
    );
  if (index === 1)
    return (
      <div
        className={`${common} bg-gradient-to-br from-amber-500 to-amber-700 shadow-[0_0_40px_rgba(217,119,6,0.55)] animate-pulse`}
      >
        <Hand className="w-11 h-11 text-amber-50" aria-hidden />
      </div>
    );
  return (
    <div
      className={`${common} bg-emerald-50 border-2 border-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.2)] relative`}
    >
      <MapPin className="w-11 h-11 text-emerald-700" aria-hidden />
      <span className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center shadow">
        <Lock className="w-4 h-4 text-emerald-50" aria-hidden />
      </span>
    </div>
  );
}

function SlideBody({ index }: { index: number }) {
  if (index === 0)
    return (
      <>
        <h2 className="text-xl font-extrabold" style={{ color: CRISIS_COLORS.ink }}>
          <T en="Your safety circle" bn="আপনার নিরাপত্তা বলয়" hi="आपका सुरक्षा चक्र" />
        </h2>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: CRISIS_COLORS.inkSoft }}>
          <T
            en="Add the people who love you — family and close friends. If you ever need help, they are the first to know."
            bn="যাঁরা আপনাকে ভালোবাসেন তাঁদের যোগ করুন — পরিবার ও ঘনিষ্ঠ বন্ধু। আপনার কখনো সাহায্য লাগলে তাঁরাই প্রথমে জানবেন।"
            hi="अपनों को जोड़ें — परिवार और घनिष्ठ मित्र। आपको कभी सहायता चाहिए तो सबसे पहले वे जानेंगे।"
          />
        </p>
      </>
    );
  if (index === 1)
    return (
      <>
        <h2 className="text-xl font-extrabold" style={{ color: CRISIS_COLORS.ink }}>
          <T en="One long-press sends help" bn="একবার চেপে ধরলেই সাহায্য" hi="एक देर तक दबाने से सहायता" />
        </h2>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: CRISIS_COLORS.inkSoft }}>
          <T
            en="Press and hold the warm amber button. No confusing menus, no searching — help is already on its way."
            bn="উষ্ণ অ্যাম্বার বোতামটি চেপে ধরে রাখুন। কোনো বিভ্রান্তিকর মেনু নেই, খোঁজাখুঁজি নেই — সাহায্য ইতিমধ্যেই পথে।"
            hi="उष्ण अंबर बटन को दबाकर रखें। कोई उलझन वाला मेनू नहीं, कोई खोज नहीं — सहायता पहले से रास्ते में है।"
          />
        </p>
      </>
    );
  return (
    <>
      <h2 className="text-xl font-extrabold" style={{ color: CRISIS_COLORS.ink }}>
        <T en="Your location stays private" bn="আপনার অবস্থান গোপন থাকে" hi="आपका स्थान निजी रहता है" />
      </h2>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: CRISIS_COLORS.inkSoft }}>
        <T
          en="Your location is shared ONLY during an SOS — and only with your safety circle. Never before, never after."
          bn="শুধু SOS চলাকালীনই আপনার অবস্থান শেয়ার হয় — এবং শুধু আপনার নিরাপত্তা বলয়ের সঙ্গে। আগে নয়, পরেও নয়।"
          hi="आपका स्थान केवल SOS के दौरान ही साझा होता है — और सिर्फ आपके सुरक्षा चक्र के साथ। पहले नहीं, बाद में भी नहीं।"
        />
      </p>
    </>
  );
}

export const CrisisGuide: React.FC<{
  /** Force the walkthrough open regardless of the seen-flag (preview). */
  forceShow?: boolean;
  onDone?: () => void;
}> = ({ forceShow = false, onDone }) => {
  const { currentLang } = useLanguage();
  const [open, setOpen] = useState<boolean>(forceShow);
  const [slide, setSlide] = useState(0);
  const last = slide === SLIDES.length - 1;

  useEffect(() => {
    if (forceShow) {
      setOpen(true);
      return;
    }
    if (!hasSeenCrisisGuide()) setOpen(true);
  }, [forceShow]);

  const dismiss = useCallback(() => {
    markCrisisGuideSeen();
    setOpen(false);
    onDone?.();
  }, [onDone]);

  if (!open) return null;

  const skipLabel = currentLang === 'bn' ? 'এড়িয়ে যান' : currentLang === 'hi' ? 'छोड़ें' : 'Skip';
  const nextLabel = currentLang === 'bn' ? 'পরেরটি' : currentLang === 'hi' ? 'आगे' : 'Next';
  const backLabel = currentLang === 'bn' ? 'পেছনে' : currentLang === 'hi' ? 'पीछे' : 'Back';

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-stone-950/55 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Safety guide"
    >
      <div className="bg-[#FFFBEB] w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden border border-amber-200/70">
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 flex items-start justify-between"
          style={{ background: `linear-gradient(135deg, ${CRISIS_COLORS.amberDeep}, ${CRISIS_COLORS.amberGlow})` }}
        >
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-6 h-6 text-amber-50" aria-hidden />
            </span>
            <div>
              <p className="text-amber-50 font-extrabold text-base leading-tight">
                <T en="Your safety net" bn="আপনার নিরাপত্তা জাল" hi="आपका सुरक्षा जाल" />
              </p>
              <p className="text-amber-100/85 text-xs mt-0.5">
                <T en="A calm minute, for your peace of mind" bn="মনের শান্তির জন্য একটু সময়" hi="मन की शांति हेतु एक शांत क्षण" />
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={currentLang === 'bn' ? 'বন্ধ করুন' : currentLang === 'hi' ? 'बंद करें' : 'Close'}
            className={`w-11 h-11 ${CRISIS_TOUCH_MIN} rounded-full bg-white/15 hover:bg-white/25 text-amber-50 flex items-center justify-center transition-colors shrink-0`}
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        {/* Slide */}
        <div className="px-6 pt-6 pb-2 text-center min-h-[240px]" aria-live="polite">
          <SlideArt index={slide} />
          <SlideBody index={slide} />
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-4" aria-hidden>
          {SLIDES.map((i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === slide ? 'w-7 bg-amber-600' : 'w-2 bg-amber-200'
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="px-5 py-5 flex items-center justify-between gap-3">
          {slide > 0 ? (
            <button
              type="button"
              onClick={() => setSlide(slide - 1)}
              className={`flex items-center gap-1 rounded-2xl px-4 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100 transition-colors ${CRISIS_TOUCH_MIN}`}
            >
              <ChevronLeft className="w-4 h-4" aria-hidden />
              {backLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={dismiss}
              className={`rounded-2xl px-4 py-3 text-sm font-bold text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors ${CRISIS_TOUCH_MIN}`}
            >
              {skipLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? dismiss() : setSlide(slide + 1))}
            className={`flex items-center gap-1.5 rounded-2xl px-6 py-3 text-sm font-extrabold text-amber-50 shadow-[0_4px_16px_rgba(180,83,9,0.4)] transition-all hover:brightness-110 ${CRISIS_TOUCH_MIN}`}
            style={{ background: `linear-gradient(135deg, ${CRISIS_COLORS.amberDeep}, ${CRISIS_COLORS.amberGlow})` }}
          >
            {last ? (
              <T en="Begin in peace 🙏" bn="শান্তিতে শুরু করুন 🙏" hi="शांति से आरंभ करें 🙏" />
            ) : (
              <>
                {nextLabel}
                <ChevronRight className="w-4 h-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrisisGuide;
