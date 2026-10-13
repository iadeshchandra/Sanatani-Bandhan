import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Coins,
  Receipt,
  Users,
  Sparkles,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';

interface DemoTourProps {
  onNavigate: (mod: string) => void;
  onRegister: () => void;
  onOpenQuickPay: () => void;
}

interface TourStep {
  icon: React.ElementType;
  title: string;
  body: string;
  /** Desk to show while this step is active. */
  navigateTo?: string;
  /** Optional in-step action button. */
  cta?: { label: string; run: () => void };
}

/**
 * DemoTour — a skippable 5-step coachmark for first-time demo visitors.
 *
 * The public demo drops visitors into 66 desks with no guidance; this
 * walks them through the 4 highest-value moments and ends at signup.
 * Shows once per demo session (sessionStorage), dismissible at any step,
 * and never in non-demo workspaces. No videos, no heavy assets — a single
 * fixed card; entrance animation is CSS-only (covered by the global
 * prefers-reduced-motion kill-switch in motion.css).
 */
export const DemoTour: React.FC<DemoTourProps> = ({ onNavigate, onRegister, onOpenQuickPay }) => {
  const { activeWorkspace } = useAuthWorkspace();
  const [visible, setVisible] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const demoId = activeWorkspace?.id || '';
  const isDemo = demoId.startsWith('DEMO_');
  const seenKey = `sb_demo_tour_done_${demoId}`;

  useEffect(() => {
    if (!isDemo) return;
    try {
      if (sessionStorage.getItem(seenKey)) return;
    } catch {
      /* storage unavailable — show the tour anyway */
    }
    // Let the demo paint first — the tour is a welcome, not a wall.
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [isDemo, seenKey]);

  if (!isDemo || !visible) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(seenKey, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const steps: TourStep[] = [
    {
      icon: LayoutDashboard,
      title: 'This is your command center',
      body: 'Live KPIs, today\u2019s tithi and muhurat, your treasury at a glance — the whole institution on one sacred home screen.',
      navigateTo: 'dashboard',
    },
    {
      icon: Coins,
      title: 'Log a donation in 2 taps',
      body: 'Counter-speed chanda entry with automatic receipts — built for the rush after aarti, not for accountants.',
      cta: { label: 'Try Quick Chanda', run: onOpenQuickPay },
    },
    {
      icon: Receipt,
      title: '80G receipts, CA-ready',
      body: 'Sequential receipt numbers with gap detection, plus a one-click audit pack your CA will thank you for.',
      navigateTo: 'taxReceipts',
    },
    {
      icon: Users,
      title: 'Your devotees live here',
      body: 'Directory, households, KYC — and win-back alerts when a donor quietly drifts away.',
      navigateTo: 'devotee-grid',
    },
    {
      icon: Sparkles,
      title: 'Make it yours — free',
      body: 'This sandbox auto-deletes in 24 hours. Create your free workspace and the 60-second setup shapes it around your institution.',
      cta: { label: 'Create Free Account', run: onRegister },
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

  return (
    <div
      className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px] z-[90] anim-fade-up"
      role="dialog"
      aria-label="Demo tour"
      aria-describedby="demo-tour-body"
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
                  Guided tour · {stepIdx + 1} of {steps.length}
                </p>
                <h3 className="text-base font-black text-white mt-0.5">{step.title}</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Skip tour"
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p id="demo-tour-body" className="text-sm text-white/70 leading-relaxed mt-3">
            {step.body}
          </p>

          {step.cta && (
            <button
              type="button"
              onClick={step.cta.run}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-saffron-500 to-amber-500 hover:from-saffron-400 hover:to-amber-400 text-white text-sm font-black shadow-lg shadow-saffron-500/25 transition-all cursor-pointer min-h-[44px] pressable"
            >
              <StepIcon className="w-4 h-4" />
              {step.cta.label}
            </button>
          )}

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-bold text-white/40 hover:text-white/70 transition-colors cursor-pointer min-h-[36px] px-2"
            >
              Skip tour
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
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-h-[36px]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
              {stepIdx < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goTo(stepIdx + 1)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer min-h-[36px]"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={dismiss}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-saffron-500 hover:bg-saffron-400 text-white text-xs font-black transition-colors cursor-pointer min-h-[36px]"
                >
                  Explore freely
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoTour;
