import React, { useEffect, useRef, useState } from 'react';
import { AnnakshetraProvider, useAnnakshetra } from './annakshetraStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { InventoryTab } from './InventoryTab';
import { MenuTab } from './MenuTab';
import { BhandaraTab } from './BhandaraTab';
import { MealsTab } from './MealsTab';
import { WastageTab } from './WastageTab';
import { ReportsTab } from './ReportsTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Annakshetra One — complete kitchen & bhandara management suite for  */
/* Mandir, Ashram, Tirth, Trust/NGO and Akshaya Patra workspaces.     */
/* Replaces the mock 'smartBhandar' desk with the real suite.          */
/* Locale-aware: English default, Bengali/Hindi/Sanskrit via          */
/* LanguageContext. Domain terms stay Sanatani: Annakshetra /         */
/* Bhandara / Prasad.                                                 */
/* Registered in workspaceRegistry for kitchen-running org types —    */
/* the App.tsx org-type guard (isModuleAllowedForOrgMount) blocks it  */
/* everywhere else. Kitchen records are device-local; only bhandara   */
/* sponsorships and kitchen purchases post to treasury (honest 80G).  */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड', sa: 'प्रबन्धनम्' },
  { id: 'inventory', bn: 'মজুত', en: 'Inventory', hi: 'भंडार', sa: 'भाण्डारम्' },
  { id: 'menu', bn: 'মেনু', en: 'Menu & Recipes', hi: 'मेनू व रेसिपी', sa: 'पाकशाला' },
  { id: 'bhandara', bn: 'ভাণ্ডারা', en: 'Bhandara', hi: 'भंडारा', sa: 'भण्डारा' },
  { id: 'meals', bn: 'থালা গণনা', en: 'Meal Counts', hi: 'थाली गणना', sa: 'अन्नगणना' },
  { id: 'wastage', bn: 'অপচয়', en: 'Wastage', hi: 'बर्बादी', sa: 'अपव्ययः' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट', sa: 'प्रतिवेदनम्' },
];

const AnnakshetraInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useAnnakshetra();
  const { activeWorkspace } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const seededFor = useRef('');

  // Seed demo kitchen data once per workspace.
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
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-2xl">🍲</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('anna.title', 'Annakshetra', 'অন্নক্ষেত্র', 'अन्नक्षेत्र', 'अन्नक्षेत्रम्')}{' '}
              <span className="font-normal text-amber-200/90 text-sm">(Annakshetra One)</span>
            </h1>
            <p className="text-xs text-amber-200/80">
              ॥ अन्नं ब्रह्मेति ॥ —{' '}
              {safeTranslate('anna.subtitle', 'Kitchen & bhandara, honestly managed', 'সৎভাবে পরিচালিত রান্নাঘর', 'ईमानदारी से प्रबंधित रसोई', 'पाकशाला-प्रबन्धनम्')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'inventory' && <InventoryTab />}
          {tab === 'menu' && <MenuTab />}
          {tab === 'bhandara' && <BhandaraTab />}
          {tab === 'meals' && <MealsTab />}
          {tab === 'wastage' && <WastageTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
};

export const AnnakshetraDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <AnnakshetraProvider workspaceId={activeWorkspace.id}>
      <AnnakshetraInner />
    </AnnakshetraProvider>
  );
};

export default AnnakshetraDesk;
