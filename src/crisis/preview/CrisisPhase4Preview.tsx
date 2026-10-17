/**
 * CrisisPhase4Preview.tsx — DEV-ONLY visual showcase for Phase 4.
 * ================================================================
 * Renders every Phase 4 deliverable with mock data for Playwright
 * screenshots (warm theme, CrisisGuide walkthrough, guide registry
 * wiring via the REAL QuickGuideModal, calm Suchana cards, primitives).
 *
 * Bundled standalone via esbuild — never imported by the app shell.
 */
import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from '../../context/LanguageContext';
import { T } from '../../solo/ui';
import { ShieldCheck } from 'lucide-react';
import { CrisisGuide } from '../CrisisGuide';
import { CrisisStatusPill } from '../CrisisStatusPill';
import { CrisisSkeletonList, CrisisSkeletonStats } from '../CrisisSkeleton';
import { CrisisEmptyState } from '../CrisisEmptyState';
import {
  CRISIS_GUIDES,
  CRISIS_GUIDE_ICONS,
  ensureCrisisGuidesRegistered,
} from '../crisisGuides';
import { buildCrisisSuchana } from '../crisisSuchana';
import { getGuide } from '../../lib/moduleGuides';
import { QuickGuideModal } from '../../components/common/QuickGuideModal';
import { CRISIS_CARD_CLASS, CRISIS_TOUCH_MIN } from '../crisisTheme';
/* Phase 1–3 components under test (mock data, DEV-ONLY preview). */
import { PanicButton } from '../PanicButton';
import { SituationPicker } from '../SituationPicker';
import { SOSConfirm } from '../SOSConfirm';
import { SOSTimeline } from '../SOSTimeline';
import { CrisisDashboard } from '../CrisisDashboard';
import { TriageView } from '../TriageView';
import { PersonalHistory } from '../PersonalHistory';
import { MockAuthProvider } from './mocks/mockAuthWorkspace';
import { MOCK_EVENTS, MOCK_ACCESS, MOCK_ACTOR } from './mocks/mockData';

ensureCrisisGuidesRegistered();

function LangSwitcher() {
  const { currentLang, setLanguage } = useLanguage();
  const langs = [
    { code: 'en', label: 'EN' },
    { code: 'bn', label: 'বাং' },
    { code: 'hi', label: 'हिं' },
  ];
  return (
    <div className="flex gap-2" role="group" aria-label="Language">
      {langs.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLanguage(l.code)}
          aria-pressed={currentLang === l.code}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${CRISIS_TOUCH_MIN} ${
            currentLang === l.code
              ? 'bg-amber-700 text-amber-50 border-amber-700'
              : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-4">
      <h2 className="text-lg font-extrabold text-[#451A03] mb-4 flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-amber-700 text-amber-50 flex items-center justify-center text-sm font-black">
          ✦
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function GuideCardsSection() {
  const { currentLang } = useLanguage();
  const lang = currentLang === 'bn' ? 'bn' : currentLang === 'hi' ? 'hi' : 'en';
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="guide-cards">
        {CRISIS_GUIDES.map((g) => {
          const resolved = getGuide(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setOpenId(g.id)}
              className="text-left rounded-2xl bg-white border border-amber-200 p-4 hover:border-amber-400 hover:shadow-md transition-all min-h-[44px]"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl" aria-hidden>
                  {CRISIS_GUIDE_ICONS[g.id] || '📖'}
                </span>
                <div className="font-extrabold text-stone-800 text-sm">
                  {(resolved?.name ?? g.name)[lang]}
                </div>
              </div>
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed line-clamp-2">
                {(resolved?.tagline ?? g.tagline)[lang]}
              </p>
              <p className="mt-2 text-[11px] font-bold text-emerald-700">
                ✓ {lang === 'bn' ? 'রেজিস্ট্রিতে পাওয়া গেছে' : lang === 'hi' ? 'रजिस्ट्री में मिला' : 'found in registry'}
              </p>
            </button>
          );
        })}
      </div>
      <QuickGuideModal
        isOpen={!!openId}
        activeModule={openId ?? 'crisis-sos'}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}

function SuchanaCardsSection() {
  const { currentLang } = useLanguage();
  const lang = currentLang === 'bn' ? 'bn' : currentLang === 'hi' ? 'hi' : 'en';
  const sets = [
    { label: 'contactCount=2, coordinator', cards: buildCrisisSuchana({ contactCount: 2, isCoordinator: true, displayName: 'Preview' }) },
    { label: 'contactCount=0', cards: buildCrisisSuchana({ contactCount: 0, isCoordinator: false }) },
  ];
  return (
    <div className="space-y-6">
      {sets.map((s, i) => (
        <div key={i}>
          <p className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">{s.label}</p>
          <div className="space-y-3">
            {s.cards.map((c) => (
              <div key={c.id} className={`${CRISIS_CARD_CLASS} p-4`} data-testid="suchana-card">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      c.severity === 'nudge'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {c.severity}
                  </span>
                  <span className="text-[11px] text-stone-400 font-mono">{c.dedupeKey}</span>
                </div>
                <h3 className="font-extrabold text-[#451A03] text-[15px]">{c.title[lang]}</h3>
                <p className="text-sm text-[#92400E] mt-1 leading-relaxed">{c.message[lang]}</p>
                <button
                  type="button"
                  className={`mt-3 rounded-xl bg-amber-700 text-amber-50 text-sm font-bold px-5 py-2.5 hover:bg-amber-800 transition-colors ${CRISIS_TOUCH_MIN}`}
                >
                  {c.actionLabel[lang]}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const Showcase: React.FC = () => {
  const [guideKey, setGuideKey] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [panicVisible, setPanicVisible] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-stone-100">
      <header className="sticky top-0 z-40 bg-[#FFFBEB]/95 backdrop-blur border-b border-amber-200/70 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.4)]">
              <ShieldCheck className="w-5 h-5 text-amber-50" aria-hidden />
            </span>
            <div>
              <h1 className="font-extrabold text-[#451A03] text-base leading-tight">
                <T en="Crisis Command — Phase 4 Preview" bn="ক্রাইসিস কমান্ড — ধাপ ৪ প্রিভিউ" hi="क्राइसिस कमांड — चरण ४ पूर्वावलोकन" />
              </h1>
              <p className="text-[11px] text-stone-500">dev-only · mock data · no PII</p>
            </div>
          </div>
          <LangSwitcher />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Section id="guide" title={<T en="1 · First-run walkthrough" bn="১ · প্রথমবারের নির্দেশিকা" hi="१ · प्रथम-उपयोग मार्गदर्शिका" />}>
          <div className={`${CRISIS_CARD_CLASS} p-5`}>
            <p className="text-sm text-[#92400E] mb-4">
              <T
                en="Shows once per device (localStorage flag). Click through the slides, or replay it here."
                bn="প্রতি ডিভাইসে একবার দেখায়। স্লাইডগুলো দেখুন, বা এখানে আবার চালান।"
                hi="प्रति डिवाइस एक बार दिखता है। स्लाइड देखें, या यहाँ पुनः चलाएँ।"
              />
            </p>
            <button
              type="button"
              data-testid="replay-guide"
              onClick={() => {
                setGuideKey((k) => k + 1);
                setGuideOpen(true);
              }}
              className={`rounded-2xl bg-amber-700 hover:bg-amber-800 text-amber-50 font-bold px-6 py-3 text-sm shadow-[0_4px_16px_rgba(180,83,9,0.35)] transition-colors ${CRISIS_TOUCH_MIN}`}
            >
              <T en="▶ Replay walkthrough" bn="▶ আবার দেখুন" hi="▶ पुनः देखें" />
            </button>
          </div>
          {guideOpen && (
            <CrisisGuide key={guideKey} forceShow onDone={() => setGuideOpen(false)} />
          )}
        </Section>

        <Section id="primitives" title={<T en="2 · Warm primitives (theme · pills · skeletons · empty states)" bn="২ · উষ্ণ উপাদান" hi="२ · उष्ण घटक" />}>
          <div className={`${CRISIS_CARD_CLASS} p-5 space-y-5`}>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">Status pills</p>
              <div className="flex flex-wrap gap-2" data-testid="status-pills">
                <CrisisStatusPill status="active" />
                <CrisisStatusPill status="acknowledged" />
                <CrisisStatusPill status="resolved" />
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">Loading skeletons</p>
              <CrisisSkeletonStats />
              <div className="mt-3">
                <CrisisSkeletonList rows={2} />
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">Empty state</p>
              <CrisisEmptyState
                actionLabel={<T en="Add emergency contacts" bn="জরুরি যোগাযোগ যোগ করুন" hi="आपातकालीन संपर्क जोड़ें" />}
                onAction={() => {}}
              />
            </div>
          </div>
        </Section>

        <Section id="guides" title={<T en="3 · Guide Center wiring (4 crisis guides)" bn="৩ · নির্দেশিকা কেন্দ্র" hi="३ · मार्गदर्शिका केंद्र" />}>
          <GuideCardsSection />
        </Section>

        <Section id="suchana" title={<T en="4 · Calm Suchana cards (reassurance only)" bn="৪ · শান্ত সূচনা কার্ড" hi="४ · शांत सूचना कार्ड" />}>
          <SuchanaCardsSection />
        </Section>

        <Section id="components" title={<T en="5 · Phase components on mock data" bn="৫ · মক ডেটায় ধাপের উপাদান" hi="५ · मॉक डेटा पर चरण घटक" />}>
          <div className={`${CRISIS_CARD_CLASS} p-5 mb-6`}>
            <p className="text-sm text-[#92400E] mb-4">
              <T
                en="Real Phase 1–3 components, firestore mocked. Open each overlay for its screenshot."
                bn="আসল ধাপ ১–৩ উপাদান, ফায়ারস্টোর মক। স্ক্রিনশটের জন্য প্রতিটি ওভারলে খুলুন।"
                hi="वास्तविक चरण १–३ घटक, फ़ायरस्टोर मॉक। स्क्रीनशॉट हेतु प्रत्येक ओवरले खोलें।"
              />
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['picker', 'SituationPicker'],
                  ['confirm', 'SOSConfirm'],
                  ['timeline', 'SOSTimeline'],
                  ['panic', 'PanicButton'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  data-testid={`open-${key}`}
                  onClick={() => {
                    if (key === 'picker') setPickerOpen(true);
                    if (key === 'confirm') setConfirmOpen(true);
                    if (key === 'timeline') setTimelineOpen(true);
                    if (key === 'panic') setPanicVisible((v) => !v);
                  }}
                  aria-pressed={key === 'panic' ? panicVisible : undefined}
                  className={`rounded-2xl px-5 py-3 text-sm font-bold border transition-colors ${CRISIS_TOUCH_MIN} ${
                    key === 'panic' && panicVisible
                      ? 'bg-amber-700 text-amber-50 border-amber-700'
                      : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <MockAuthProvider>
            <div className="mb-6" data-testid="dashboard-mock">
              <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">
                CrisisDashboard · mock events
              </p>
              <div className="rounded-3xl border border-amber-200/70 overflow-hidden bg-white">
                <CrisisDashboard />
              </div>
            </div>
            <div className="mb-6" data-testid="triage-mock">
              <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">
                TriageView · mock events
              </p>
              <TriageView
                events={MOCK_EVENTS.filter((e) => e.status === 'active')}
                access={MOCK_ACCESS}
                actor={MOCK_ACTOR}
                onSelect={(e) => setSelectedEventId(e.id)}
              />
            </div>
            <div className="mb-6" data-testid="history-mock">
              <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">
                PersonalHistory · mock data
              </p>
              <div className="rounded-3xl border border-amber-200/70 overflow-hidden bg-white">
                <PersonalHistory />
              </div>
            </div>
          </MockAuthProvider>

          {selectedEventId && (
            <p className="text-xs text-stone-500">
              triage select → <span className="font-mono">{selectedEventId}</span>
            </p>
          )}
        </Section>
      </main>

      {/* Overlays under test */}
      {pickerOpen && (
        <SituationPicker onSelect={() => setPickerOpen(false)} onClose={() => setPickerOpen(false)} />
      )}
      {confirmOpen && (
        <SOSConfirm
          selection={{ situation: 'medical', details: 'Preview mock — feeling dizzy', voiceNoteBlob: null }}
          onSent={() => setConfirmOpen(false)}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
      {timelineOpen && <SOSTimeline eventId="evt-preview-1" onClose={() => setTimelineOpen(false)} />}
      {panicVisible && <PanicButton onActivate={() => setPickerOpen(true)} />}
    </div>
  );
};

export const CrisisPhase4Preview: React.FC = () => (
  <LanguageProvider>
    <Showcase />
  </LanguageProvider>
);

export default CrisisPhase4Preview;
