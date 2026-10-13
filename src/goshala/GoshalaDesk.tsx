import React, { useEffect, useRef, useState } from 'react';
import { GoshalaProvider, useGoshala } from './goshalaStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { NandiTab } from './NandiTab';
import { SwasthyaTab } from './SwasthyaTab';
import { DugdhaTab } from './DugdhaTab';
import { CharaTab } from './CharaTab';
import { SponsorshipTab } from './SponsorshipTab';
import { RosterTab } from './RosterTab';
import { GrantTab } from './GrantTab';
import { VyayaTab } from './VyayaTab';
import { ReportTab } from './ReportTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Goshala One — complete goshala-operations suite for Goshala          */
/* workspaces. Locale-aware like every other desk: English default,     */
/* Bengali/Hindi/Sanskrit via LanguageContext. Domain terms stay       */
/* Sanatani: Nandi / Vatsa / Gau Mata / Dugdha / Chara / Vyaya.        */
/* Registered in workspaceRegistry for Goshala ONLY — the App.tsx      */
/* org-type guard blocks it everywhere else.                           */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड', sa: 'प्रबन्धनम्' },
  { id: 'nandi', bn: 'নন্দী', en: 'Nandi Registry', hi: 'नंदी पंजी', sa: 'नन्दी-पञ्जी' },
  { id: 'swasthya', bn: 'স্বাস্থ্য', en: 'Health & Vet', hi: 'स्वास्थ्य', sa: 'स्वास्थ्यम्' },
  { id: 'dugdha', bn: 'দুগ্ধ', en: 'Milk Ledger', hi: 'दुग्ध', sa: 'दुग्ध-लेखा' },
  { id: 'chara', bn: 'খাদ্য', en: 'Fodder', hi: 'चारा', sa: 'चारम्' },
  { id: 'sponsorship', bn: 'পৃষ্ঠপোষকতা', en: 'Sponsorships', hi: 'प्रायोजन', sa: 'प्रायोजनम्' },
  { id: 'roster', bn: 'ডিউটি', en: 'Duty Roster', hi: 'ड्यूटी', sa: 'कर्तव्य-सूची' },
  { id: 'grants', bn: 'অনুদান', en: 'Grants', hi: 'अनुदान', sa: 'अनुदानम्' },
  { id: 'vyaya', bn: 'ব্যয়', en: 'Expenses', hi: 'व्यय', sa: 'व्ययः' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट', sa: 'प्रतिवेदनम्' },
];

const GoshalaInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useGoshala();
  const { activeWorkspace } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const seededFor = useRef('');

  // Seed demo goshala data once per workspace.
  useEffect(() => {
    const key = activeWorkspace.id;
    if (seededFor.current !== key) {
      seededFor.current = key;
      ensureSeeded();
    }
  }, [activeWorkspace.id, ensureSeeded]);

  return (
    <div className="min-h-full bg-gradient-to-b from-amber-50/60 via-stone-50 to-stone-100">
      {/* Sanatani header */}
      <div className="bg-gradient-to-r from-red-900 via-amber-900 to-red-900 text-amber-50 px-4 sm:px-6 py-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-2xl">🐄</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('goshala.title', 'Goshala', 'গোশালা', 'गोशाला', 'गोशाला')}{' '}
              <span className="font-normal text-amber-200/90 text-sm">(Goshala One)</span>
            </h1>
            <p className="text-xs text-amber-200/80">
              ॥ गावो विश्वस्य मातरः ॥ —{' '}
              {safeTranslate('goshala.subtitle', 'Complete goshala operations', 'সম্পূর্ণ গোশালা ব্যবস্থাপনা', 'पूर्ण गोशाला प्रबंधन', 'सम्पूर्ण गोशाला-प्रबन्धनम्')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'nandi' && <NandiTab />}
          {tab === 'swasthya' && <SwasthyaTab />}
          {tab === 'dugdha' && <DugdhaTab />}
          {tab === 'chara' && <CharaTab />}
          {tab === 'sponsorship' && <SponsorshipTab />}
          {tab === 'roster' && <RosterTab />}
          {tab === 'grants' && <GrantTab />}
          {tab === 'vyaya' && <VyayaTab />}
          {tab === 'reports' && <ReportTab />}
        </div>
      </div>
    </div>
  );
};

export const GoshalaDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <GoshalaProvider workspaceId={activeWorkspace.id}>
      <GoshalaInner />
    </GoshalaProvider>
  );
};

export default GoshalaDesk;
