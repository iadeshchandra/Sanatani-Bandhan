import React, { useEffect, useRef, useState } from 'react';
import { AshramProvider, useAshram } from './ashramStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { RoomsTab } from './RoomsTab';
import { BookingsTab } from './BookingsTab';
import { StaysTab } from './StaysTab';
import { YatrisTab } from './YatrisTab';
import { BhandaraTab } from './BhandaraTab';
import { ReportsTab } from './ReportsTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Ashram One — complete dharamshala stay-management suite for Ashram  */
/* and Tirth workspaces. Locale-aware: English default, Bengali/      */
/* Hindi/Sanskrit via LanguageContext. Domain terms stay Sanatani:     */
/* Yatri / Nivas / Bhandara.                                          */
/* Registered in workspaceRegistry for Ashram + Tirth ONLY — the      */
/* App.tsx org-type guard (isModuleAllowedForOrgMount) blocks it       */
/* everywhere else. Stay records are device-local; only stay          */
/* donations post to treasury (non-80G, stated honestly).              */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड', sa: 'प्रबन्धनम्' },
  { id: 'rooms', bn: 'কক্ষ', en: 'Rooms', hi: 'कमरे', sa: 'कक्षम्' },
  { id: 'bookings', bn: 'বুকিং', en: 'Bookings', hi: 'बुकिंग', sa: 'आरक्षणम्' },
  { id: 'stays', bn: 'নিবাস', en: 'Check-in / Out', hi: 'ठहराव', sa: 'निवासः' },
  { id: 'yatris', bn: 'যাত্রী', en: 'Yatris', hi: 'यात्री', sa: 'यात्रिकाः' },
  { id: 'bhandara', bn: 'ভাণ্ডারা', en: 'Bhandara', hi: 'भंडारा', sa: 'भण्डारा' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट', sa: 'प्रतिवेदनम्' },
];

const AshramInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useAshram();
  const { activeWorkspace } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const seededFor = useRef('');

  // Seed demo ashram data once per workspace.
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
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-2xl">🏠</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('ashram.title', 'Ashram Nivas', 'আশ্রম নিবাস', 'आश्रम निवास', 'आश्रम-निवासः')}{' '}
              <span className="font-normal text-amber-200/90 text-sm">(Ashram One)</span>
            </h1>
            <p className="text-xs text-amber-200/80">
              ॥ अतिथि देवो भव ॥ —{' '}
              {safeTranslate('ashram.subtitle', 'Yatri stays, honestly managed', 'সৎভাবে পরিচালিত যাত্রী নিবাস', 'ईमानदारी से प्रबंधित यात्री निवास', 'यात्रि-निवास-प्रबन्धनम्')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'rooms' && <RoomsTab />}
          {tab === 'bookings' && <BookingsTab />}
          {tab === 'stays' && <StaysTab />}
          {tab === 'yatris' && <YatrisTab />}
          {tab === 'bhandara' && <BhandaraTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
};

export const AshramDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <AshramProvider workspaceId={activeWorkspace.id}>
      <AshramInner />
    </AshramProvider>
  );
};

export default AshramDesk;
