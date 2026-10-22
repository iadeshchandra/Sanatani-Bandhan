import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Flower2, X } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { fetchPublishedAccounts } from '../../context/data/publishedAccountsStore';
import { upcomingFestivals } from '../../lib/panjikaFestivals';
import {
  buildJourneySteps,
  journeyDismissKey,
  journeySignals,
  pickJourneyFestival,
  type JourneyStep,
} from '../../lib/festivalJourney';
import { isPracticeModeOn } from '../../lib/practiceMode';

const isoToday = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * FestivalJourneyCard — Blueprint D, deliverable 3 (org home). When
 * a festival is near, this card walks the org through it end to
 * end: plan in Utsav One → budget in the treasury → bookings →
 * volunteers → the day-of queue → publish the month's accounts →
 * a thank-you broadcast. It is GUIDANCE ONLY: every step deep-links
 * an existing desk; nothing new is built and nothing is faked —
 * a checkmark appears only where real records prove the step
 * (an expense in the festival month, bookings in the festival
 * week, published accounts), and link-only steps say so honestly.
 *
 * Dismissible per festival (localStorage, per workspace). Hidden
 * while practice mode is on — a journey belongs to the real books.
 */
export const FestivalJourneyCard: React.FC<{
  onNavigate?: (moduleId: string) => void;
}> = ({ onNavigate }) => {
  const { activeWorkspace } = useAuthWorkspace();
  const data = useData();
  const { safeTranslate } = useLanguage();
  const [publishedMonths, setPublishedMonths] = useState<string[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const festival = useMemo(
    () => pickJourneyFestival(upcomingFestivals(isoToday(), 40), isoToday()),
    []
  );
  const wsId = activeWorkspace?.id;

  useEffect(() => {
    if (!wsId || !festival) return;
    let live = true;
    fetchPublishedAccounts(wsId)
      .then((snaps) => {
        if (live) setPublishedMonths(snaps.map((s) => s.month));
      })
      .catch(() => {
        if (live) setPublishedMonths([]);
      });
    return () => {
      live = false;
    };
  }, [wsId, festival]);

  useEffect(() => {
    if (!wsId || !festival) return;
    try {
      setDismissed(
        localStorage.getItem(journeyDismissKey(wsId, festival.date, festival.nameEn)) === '1'
      );
    } catch {
      setDismissed(false);
    }
  }, [wsId, festival]);

  if (!festival || !activeWorkspace || dismissed) return null;
  if (isPracticeModeOn(activeWorkspace)) return null;

  const date = new Date(festival.date + 'T00:00:00');
  const signals = journeySignals({
    festivalDate: festival.date,
    treasury: data.treasury,
    bookings: data.poojaBookings,
    shifts: data.shifts,
    publishedMonths: publishedMonths ?? [],
  });
  const steps = buildJourneySteps(signals);

  const go = (step: JourneyStep) => {
    if (onNavigate) onNavigate(step.deskId);
    else
      window.dispatchEvent(
        new CustomEvent('sanatani:navigate', { detail: { module: step.deskId } })
      );
  };

  const dismiss = () => {
    try {
      localStorage.setItem(journeyDismissKey(wsId!, festival.date, festival.nameEn), '1');
    } catch {
      /* dismissal is best-effort */
    }
    setDismissed(true);
  };

  const stepCopy: Record<JourneyStep['id'], { title: string; hint: string }> = {
    plan: {
      title: safeTranslate('fj_plan', 'Plan the festival', 'উৎসবের পরিকল্পনা করুন', 'उत्सव की योजना बनाएँ'),
      hint: safeTranslate('fj_plan_hint', 'Dates, programs and duties in Utsav One', 'Utsav One-এ তারিখ, অনুষ্ঠান ও দায়িত্ব', 'Utsav One में तिथियाँ, कार्यक्रम और दायित्व'),
    },
    budget: {
      title: safeTranslate('fj_budget', 'Set the budget', 'বাজেট ঠিক করুন', 'बजट तय करें'),
      hint: safeTranslate(
        'fj_budget_hint',
        'Record a festival expense in the treasury so the budget is real',
        'খাজাঞ্চিতে উৎসবের খরচ লিখুন যাতে বাজেট বাস্তব হয়',
        'खज़ाने में उत्सव का खर्च दर्ज करें ताकि बजट वास्तविक हो',
      ),
    },
    bookings: {
      title: safeTranslate('fj_bookings', 'Take bookings', 'বুকিং নিন', 'बुकिंग लें'),
      hint: safeTranslate('fj_bookings_hint', 'Puja bookings for the festival days', 'উৎসবের দিনগুলোর পূজা বুকিং', 'उत्सव के दिनों की पूजा बुकिंग'),
    },
    volunteers: {
      title: safeTranslate('fj_volunteers', 'Arrange volunteers', 'স্বেচ্ছাসেবক সাজান', 'स्वयंसेवक तय करें'),
      hint: safeTranslate('fj_volunteers_hint', 'Seva shifts for the festival week', 'উৎসবের সপ্তাহের সেবা শিফট', 'उत्सव सप्ताह की सेवा पारियाँ'),
    },
    queue: {
      title: safeTranslate('fj_queue', 'Run the day', 'দিনটি পরিচালনা করুন', 'दिन संचालित करें'),
      hint: safeTranslate('fj_queue_hint', 'Darshan queue and live order on the day', 'সেদিনের দর্শন সারি ও সরাসরি শৃঙ্খলা', 'उस दिन की दर्शन पंक्ति और व्यवस्था'),
    },
    publish: {
      title: safeTranslate('fj_publish', 'Publish the accounts', 'হিসাব প্রকাশ করুন', 'हिसाब प्रकाशित करें'),
      hint: safeTranslate(
        'fj_publish_hint',
        'Share the month\u2019s accounts on the Transparency Board',
        'স্বচ্ছতা বোর্ডে মাসের হিসাব প্রকাশ করুন',
        'पारदर्शिता बोर्ड पर माह का हिसाब साझा करें',
      ),
    },
    thanks: {
      title: safeTranslate('fj_thanks', 'Thank everyone', 'সবাইকে ধন্যবাদ জানান', 'सभी को धन्यवाद दें'),
      hint: safeTranslate('fj_thanks_hint', 'A warm thank-you broadcast closes the festival', 'একটি উষ্ণ ধন্যবাদ বার্তা উৎসবের সমাপ্তি টানে', 'एक स्नेहपूर्ण धन्यवाद संदेश उत्सव का समापन करता है'),
    },
  };

  return (
    <section className="bg-white border border-orange-200 rounded-3xl p-5 sm:p-6 shadow-sm ring-1 ring-black/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-400"></div>
      <div className="flex items-start gap-3 mb-1">
        <Flower2 className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-gray-900 text-lg leading-tight">
            {festival.nameEn} ·{' '}
            {date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
          </h2>
          <p className="text-xs text-gray-500 font-semibold">
            {safeTranslate(
              'fj_subtitle',
              'Your festival journey — each step opens the desk that does it. A tick appears only when real records show it is done.',
              'আপনার উৎসব যাত্রা — প্রতিটি ধাপ সেই ডেস্ক খোলে যেখানে কাজটি হয়। টিক তখনই আসে যখন আসল রেকর্ড তা সম্পন্ন দেখায়।',
              'आपकी उत्सव यात्रा — हर चरण वही डेस्क खोलता है जहाँ कार्य होता है। टिक तभी आता है जब वास्तविक रिकॉर्ड पूर्णता दिखाएँ।',
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={safeTranslate('fj_dismiss', 'Dismiss this journey', 'এই যাত্রা সরিয়ে দিন', 'यह यात्रा हटाएँ')}
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      <ol className="mt-3 divide-y divide-gray-100">
        {steps.map((step) => {
          const copy = stepCopy[step.id];
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => go(step)}
                className="w-full flex items-center gap-3 py-2.5 text-left min-h-[44px] hover:bg-orange-50/60 rounded-lg px-2 -mx-2 transition-colors"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                    step.state === 'done'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-gray-300 text-transparent'
                  }`}
                  aria-hidden
                >
                  <Check size={14} strokeWidth={3} />
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className={`block text-sm font-bold truncate ${
                      step.state === 'done'
                        ? 'text-gray-500 line-through decoration-emerald-400'
                        : 'text-gray-900'
                    }`}
                  >
                    {copy.title}
                  </span>
                  <span className="block text-[11px] text-gray-500 font-semibold truncate">
                    {copy.hint}
                    {step.count != null && step.count > 0 ? ` · ${step.count}` : ''}
                  </span>
                </span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default FestivalJourneyCard;
