import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  Users,
  Sprout,
} from 'lucide-react';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { useSolo } from './SoloContext';
import { useMyPurohitIdentity } from '../components/purohit/useMyPurohitIdentity';
import { useMyJyotishIdentity } from '../jyotish/useMyJyotishIdentity';

interface SoloOnboardingTourProps {
  /** Navigate the solo shell to a tab while a step is active. */
  onNavigate: (tab: string) => void;
}

interface TourStep {
  icon: React.ElementType;
  titleKey: string;
  titleEn: string;
  titleBn: string;
  titleHi: string;
  bodyKey: string;
  bodyEn: string;
  bodyBn: string;
  bodyHi: string;
  /** Solo tab to show while this step is active. */
  navigateTo?: string;
}

/**
 * SoloOnboardingTour — a skippable 3-step first-run coachmark for new Solo users.
 *
 * A freshly signed-up user lands in the Solo dashboard with zero guidance —
 * the highest-churn moment in the app. This walks them through the three
 * things that matter: their personal space, the Sangam community, and the
 * progressive upgrade path (Grow with Sanatani Bandhan).
 *
 * Shows once per browser (localStorage flag `sb_solo_tour_done`), dismissible
 * at any step, and never for users who already have an organisation, purohit
 * or jyotish identity (they are not new). Aesthetic matches the demo tour:
 * a single fixed card, saffron accents, CSS-only entrance animation.
 */
export const SoloOnboardingTour: React.FC<SoloOnboardingTourProps> = ({ onNavigate }) => {
  const { workspaces } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const { profile } = useSolo();
  const { identity: purohitIdentity } = useMyPurohitIdentity();
  const { identity: jyotishIdentity } = useMyJyotishIdentity();

  const [visible, setVisible] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const seenKey = 'sb_solo_tour_done';
  // Not a brand-new user: they already have a purohit/jyotish identity, a
  // real (non-seed) organisation, or a Solo profile older than an hour.
  // (INITIAL_WORKSPACES seeds demo data, so workspaces.length is never 0 —
  // we check for user-created workspaces instead.)
  const hasRealOrg = (workspaces || []).some(
    (w: { id?: string }) => w.id && !w.id.startsWith('DEMO_') && !w.id.startsWith('SEED_')
  );
  const profileAgeMs = profile?.createdAt ? Date.now() - profile.createdAt : 0;
  const isNewUser =
    !purohitIdentity && !jyotishIdentity && !hasRealOrg && profileAgeMs < 60 * 60 * 1000;

  useEffect(() => {
    if (!isNewUser) return;
    try {
      if (localStorage.getItem(seenKey)) return;
    } catch {
      /* storage unavailable — show the tour anyway */
    }
    // Let the dashboard paint first — the tour is a welcome, not a wall.
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [isNewUser, seenKey]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(seenKey, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const steps: TourStep[] = [
    {
      icon: Home,
      titleKey: 'solo_tour_step1_title',
      titleEn: 'This is your personal space',
      titleBn: 'এটি আপনার ব্যক্তিগত স্থান',
      titleHi: 'यह आपका व्यक्तिगत स्थान है',
      bodyKey: 'solo_tour_step1_body',
      bodyEn:
        'Track your daily sadhana, check the panchang, and keep your Sanatani profile here. Everything personal lives in My Space — institutions and services are one tap away when you need them.',
      bodyBn:
        'এখানে আপনার দৈনিক সাধনা ট্র্যাক করুন, পঞ্জিকা দেখুন এবং আপনার সনাতনী প্রোফাইল রাখুন। সব ব্যক্তিগত বিষয় আমার স্থানে থাকে — প্রয়োজনে প্রতিষ্ঠান ও সেবা এক ট্যাপ দূরে।',
      bodyHi:
        'यहाँ अपनी दैनिक साधना ट्रैक करें, पंचांग देखें और अपनी सनातनी प्रोफ़ाइल रखें। सब कुछ व्यक्तिगत मेरा स्थान में है — संस्थाएँ और सेवाएँ एक टैप दूर हैं।',
      navigateTo: 'home',
    },
    {
      icon: Users,
      titleKey: 'solo_tour_step2_title',
      titleEn: 'Meet Sangam — the community',
      titleBn: 'সঙ্গমের সাথে পরিচিত হোন — সম্প্রদায়',
      titleHi: 'संगम से मिलें — समुदाय',
      bodyKey: 'solo_tour_step2_body',
      bodyEn:
        'Sangam is where Sanatanis gather: share reflections, offer Ashirvad to others, join satsang circles, and find seva opportunities near you. This is the living heart of the app.',
      bodyBn:
        'সঙ্গম হলো যেখানে সনাতনীরা একত্রিত হন: চিন্তা শেয়ার করুন, অন্যদের আশীর্বাদ দিন, সৎসঙ্গ বৃত্তে যোগ দিন এবং কাছাকাছি সেবার সুযোগ খুঁজুন। এটাই অ্যাপের প্রাণ।',
      bodyHi:
        'संगम वह जगह है जहाँ सनातनी एकत्र होते हैं: विचार साझा करें, दूसरों को आशीर्वाद दें, सत्संग मंडलियों से जुड़ें और पास में सेवा के अवसर खोजें। यही ऐप का हृदय है।',
      navigateTo: 'sangam',
    },
    {
      icon: Sprout,
      titleKey: 'solo_tour_step3_title',
      titleEn: 'Grow when you are ready',
      titleBn: 'প্রস্তুত হলে বৃদ্ধি করুন',
      titleHi: 'जब तैयार हों, आगे बढ़ें',
      bodyKey: 'solo_tour_step3_body',
      bodyEn:
        'No rush — but when the time comes, My Space offers three paths: register your organisation, become a verified Purohit, or become a Jyotishi. Grow with Sanatani Bandhan, at your own pace.',
      bodyBn:
        'তাড়াহুড়ো নেই — তবে সময় এলে, আমার স্থানে তিনটি পথ রয়েছে: আপনার প্রতিষ্ঠান নিবন্ধন করুন, যাচাইকৃত পুরোহিত হন, অথবা জ্যোতিষী হন। নিজের গতিতে সনাতনী বন্ধনের সাথে বৃদ্ধি করুন।',
      bodyHi:
        'जल्दबाजी नहीं — लेकिन जब समय आए, मेरा स्थान तीन रास्ते देता है: अपना संगठन पंजीकृत करें, सत्यापित पुरोहित बनें, या ज्योतिषी बनें। अपनी गति से सनातनी बंधन के साथ बढ़ें।',
      navigateTo: 'home',
    },
  ];

  const step = steps[stepIdx];
  const StepIcon = step.icon;

  const goTo = (idx: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, idx));
    setStepIdx(next);
    const target = steps[next].navigateTo;
    if (target) onNavigate(target);
  };

  const guidedBy = safeTranslate('solo_tour_guided', 'Guided tour', 'গাইডেড ট্যুর', 'मार्गदर्शित दौरा');
  const skipLabel = safeTranslate('solo_tour_skip', 'Skip tour', 'ট্যুর এড়িয়ে যান', 'दौरा छोड़ें');
  const backLabel = safeTranslate('solo_tour_back', 'Back', 'পেছনে', 'पीछे');
  const nextLabel = safeTranslate('solo_tour_next', 'Next', 'পরবর্তী', 'आगे');
  const doneLabel = safeTranslate('solo_tour_done', 'Explore freely', 'মুক্তভাবে ঘুরুন', 'खुलकर देखें');

  return (
    <div
      className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px] z-[90] anim-fade-up"
      role="dialog"
      aria-label="Solo onboarding tour"
      aria-describedby="solo-tour-body"
    >
      <div className="rounded-2xl bg-[#1c1410] border border-saffron-500/30 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-saffron-500 to-amber-400 transition-all duration-300"
            style={{ width: `${((stepIdx + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-saffron-500/15 border border-saffron-500/30 flex items-center justify-center shrink-0">
                <StepIcon className="w-5 h-5 text-saffron-400" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-saffron-400">
                  {guidedBy} · {stepIdx + 1} of {steps.length}
                </p>
                <h3 className="text-base font-black text-white mt-0.5">
                  {safeTranslate(step.titleKey, step.titleEn, step.titleBn, step.titleHi)}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label={skipLabel}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p id="solo-tour-body" className="text-sm text-white/70 leading-relaxed mt-3">
            {safeTranslate(step.bodyKey, step.bodyEn, step.bodyBn, step.bodyHi)}
          </p>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-bold text-white/40 hover:text-white/70 transition-colors cursor-pointer min-h-[44px] px-2"
            >
              {skipLabel}
            </button>
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === stepIdx ? 'bg-saffron-400' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {stepIdx > 0 && (
                <button
                  type="button"
                  onClick={() => goTo(stepIdx - 1)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-h-[44px]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> {backLabel}
                </button>
              )}
              {stepIdx < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goTo(stepIdx + 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
                >
                  {nextLabel} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={dismiss}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-saffron-500 hover:bg-saffron-400 text-white text-xs font-black transition-colors cursor-pointer min-h-[44px]"
                >
                  {doneLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoloOnboardingTour;
