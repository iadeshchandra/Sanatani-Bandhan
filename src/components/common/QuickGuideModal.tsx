/**
 * QuickGuideModal.tsx — Upgraded quick guide modal.
 * ===================================================
 * Now powered by the trilingual module guide library
 * (src/lib/moduleGuides.ts): what it is, why it matters,
 * 3 first steps, 2 pro tips, and tappable related modules.
 * Legacy hardcoded guides remain as fallback for ids not
 * present in the library.
 */
import React, { useEffect, useState } from 'react';
import { X, Lightbulb, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getGuide, type ModuleGuide, type Lang3 } from '../../lib/moduleGuides';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: string;
}

function pickL3(v: Lang3 | undefined, lang: string): string {
  if (!v) return '';
  if (lang === 'bn') return v.bn || v.en;
  if (lang === 'hi') return v.hi || v.en;
  return v.en;
}

/** Legacy guides for module ids not in the trilingual library. */
const LEGACY_GUIDES: Record<string, { title: string; description: string; steps: string[] }> = {
  dashboard: {
    title: 'Command Center',
    description: 'The global view of your entire community operations.',
    steps: [
      'View top-level metrics for funds, active campaigns, and members.',
      'Monitor your Organization Resilience Score and personal Seva Karma.',
      'Use the Quick Action buttons to log donations or scan QR codes instantly.',
    ],
  },
  dharamshala: {
    title: 'Yatri Niwas & Dharamshala',
    description: 'Manage room bookings, check-ins, and housekeeping for pilgrims.',
    steps: [
      'View real-time room statuses: Available, Occupied, Cleaning, or Maintenance.',
      'Click "New Booking" to check-in a devotee and assign a room.',
      'Update a room to "Cleaning" after checkout to notify housekeeping staff.',
    ],
  },
  sevadarRoster: {
    title: 'Sevadar Shift Roster',
    description: 'Organize volunteer schedules and assign shifts for major events and daily operations.',
    steps: [
      'Select a date to view available volunteer shifts.',
      'Assign devotees to specific roles (e.g., Crowd Control, Prasadam Distribution).',
      'Volunteers earn Karma Points upon successful completion of their shift.',
    ],
  },
  'crisis-command': {
    title: 'Crisis Command Center',
    description: 'Global emergency response and mesh-network SOS monitoring.',
    steps: [
      'Monitor the live map for flashing red SOS beacons.',
      'Dispatch nearby volunteers or resources to the coordinates.',
      'Mark crises as "RESOLVED" to increase your Organization Resilience Score.',
    ],
  },
  devotees: {
    title: 'Devotee & Member Directory',
    description: 'The central database of all connected members, followers, and volunteers.',
    steps: [
      'Search members by name, phone, or Gotra.',
      'Click on a member to view their full profile, donation history, and family tree.',
      'Generate Smart ID Passes for physical entry.',
    ],
  },
};

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({ isOpen, onClose, activeModule }) => {
  const { currentLang } = useLanguage();
  const lang = currentLang === 'bn' ? 'bn' : currentLang === 'hi' ? 'hi' : 'en';
  const [viewId, setViewId] = useState(activeModule);

  // Reset to the requested module whenever the modal (re)opens.
  useEffect(() => {
    if (isOpen) setViewId(activeModule);
  }, [isOpen, activeModule]);

  if (!isOpen) return null;

  const guide: ModuleGuide | undefined = getGuide(viewId);
  const legacy = !guide ? LEGACY_GUIDES[viewId] : undefined;

  const title = guide ? pickL3(guide.name, lang) : legacy?.title || viewId;
  const tagline = guide ? pickL3(guide.tagline, lang) : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-stone-950/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header — warm dawn gradient */}
        <div className="bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700 p-6 text-amber-50 shrink-0 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="absolute top-4 right-4 w-11 h-11 min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <BookOpen className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
                {lang === 'bn' ? 'নির্দেশিকা' : lang === 'hi' ? 'मार्गदर्शिका' : 'Quick Guide'}
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
            </div>
          </div>
          {tagline && <p className="text-sm text-amber-100/90 italic mt-1">{tagline}</p>}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {guide ? (
            <>
              <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">
                  {lang === 'bn' ? 'এটি কী' : lang === 'hi' ? 'यह क्या है' : 'What it is'}
                </h4>
                <p className="text-sm text-stone-600 leading-relaxed">{pickL3(guide.whatItIs, lang)}</p>
              </section>

              <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">
                  {lang === 'bn' ? 'কেন গুরুত্বপূর্ণ' : lang === 'hi' ? 'यह क्यों ज़रूरी है' : 'Why it matters'}
                </h4>
                <p className="text-sm text-stone-600 leading-relaxed">{pickL3(guide.whyItMatters, lang)}</p>
              </section>

              <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-700 mb-3">
                  {lang === 'bn' ? 'প্রথম ৩ ধাপ' : lang === 'hi' ? 'पहले ३ कदम' : 'First 3 steps'}
                </h4>
                <div className="space-y-3">
                  {guide.firstSteps.map((s, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-sm font-extrabold">
                        {idx + 1}
                      </div>
                      <p className="text-sm text-stone-700 font-medium leading-relaxed pt-0.5">
                        {pickL3(s, lang)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-700 mb-3 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" />
                  {lang === 'bn' ? 'পরামর্শ' : lang === 'hi' ? 'सुझाव' : 'Pro tips'}
                </h4>
                <div className="space-y-2.5">
                  {guide.proTips.map((s, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-stone-600 leading-relaxed">{pickL3(s, lang)}</p>
                    </div>
                  ))}
                </div>
              </section>

              {guide.relatedModules.length > 0 && (
                <section>
                  <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">
                    {lang === 'bn' ? 'সম্পর্কিত' : lang === 'hi' ? 'संबंधित' : 'Related'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {guide.relatedModules.map((relId) => {
                      const rel = getGuide(relId);
                      if (!rel) return null;
                      return (
                        <button
                          key={relId}
                          type="button"
                          onClick={() => setViewId(relId)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-stone-100 hover:bg-amber-100 text-xs font-bold text-stone-600 hover:text-amber-800 transition-colors min-h-[44px]"
                        >
                          {pickL3(rel.name, lang)}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              <p className="text-stone-600 font-medium leading-relaxed">{legacy?.description}</p>
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  How to use this module
                </h4>
                {(legacy?.steps || []).map((step, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-stone-700 font-medium leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-amber-50/60 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-xl transition-colors min-h-[44px]"
          >
            {lang === 'bn' ? 'বুঝেছি 🙏' : lang === 'hi' ? 'समझ गया 🙏' : 'Got it 🙏'}
          </button>
        </div>
      </div>
    </div>
  );
};
