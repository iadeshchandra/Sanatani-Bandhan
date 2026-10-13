import React, { useEffect, useRef, useState } from 'react';
import { PathshalaProvider, usePathshala } from './pathshalaStore';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { ShishyaTab } from './ShishyaTab';
import { UpasthitiTab } from './UpasthitiTab';
import { ParikshaTab } from './ParikshaTab';
import { RoutineTab } from './RoutineTab';
import { FeeTab } from './FeeTab';
import { CertificateTab } from './CertificateTab';
import { NoticeHomeworkTab } from './NoticeHomeworkTab';
import { TrackingTab } from './TrackingTab';
import { VargaTab } from './VargaTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Pathshala One — complete school-management suite for Gurukul +       */
/* Vidyalaya (Pathshala) workspaces. Locale-aware like every other     */
/* desk: English default, Bengali/Hindi/Sanskrit via LanguageContext.  */
/* Domain terms stay Sanatani: Shishya / Guru / Varga / Pathyakram.    */
/* Registered in workspaceRegistry for Gurukul + Vidyalaya ONLY — the  */
/* App.tsx org-type guard blocks it everywhere else.                   */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड' },
  { id: 'shishya', bn: 'শিষ্য', en: 'Shishya', hi: 'शिष्य' },
  { id: 'upasthiti', bn: 'উপস্থিতি', en: 'Attendance', hi: 'उपस्थिति' },
  { id: 'pariksha', bn: 'পরীক্ষা', en: 'Results', hi: 'परीक्षा' },
  { id: 'routine', bn: 'রুটিন', en: 'Routines', hi: 'समय-सारणी' },
  { id: 'fee', bn: 'ফি', en: 'Fees', hi: 'शुल्क' },
  { id: 'certificate', bn: 'সনদপত্র', en: 'Certificates', hi: 'प्रमाण-पत्र' },
  { id: 'suchana', bn: 'নোটিশ', en: 'Notice & HW', hi: 'सूचना' },
  { id: 'tracking', bn: 'অগ্রগতি', en: 'Tracking', hi: 'प्रगति' },
  { id: 'varga', bn: 'বর্গ', en: 'Varga & Subjects', hi: 'वर्ग' },
];

const PathshalaInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = usePathshala();
  const { gurukulStudents } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const seededFor = useRef('');

  // Seed demo school data once per workspace (shishya ids come from DataContext).
  useEffect(() => {
    const key = activeWorkspace.id + ':' + gurukulStudents.length;
    if (seededFor.current !== key && gurukulStudents.length) {
      seededFor.current = key;
      ensureSeeded(gurukulStudents.map((s) => s.id));
    }
  }, [activeWorkspace.id, gurukulStudents, ensureSeeded]);

  return (
    <div className="min-h-full bg-gradient-to-b from-amber-50/60 via-stone-50 to-stone-100">
      {/* Sanatani header */}
      <div className="bg-gradient-to-r from-red-900 via-amber-900 to-red-900 text-amber-50 px-4 sm:px-6 py-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-2xl">ॐ</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('pathshala.title', 'Pathshala', 'পাঠশালা', 'पाठशाला')}{' '}
              <span className="font-normal text-amber-200/90 text-sm">(Pathshala One)</span>
            </h1>
            <p className="text-xs text-amber-200/80">
              ॥ विद्या ददाति विनयम् ॥ —{' '}
              {safeTranslate('pathshala.subtitle', 'Complete school management', 'সম্পূর্ণ স্কুল ব্যবস্থাপনা', 'पूर्ण विद्यालय प्रबंधन')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'shishya' && <ShishyaTab />}
          {tab === 'upasthiti' && <UpasthitiTab />}
          {tab === 'pariksha' && <ParikshaTab />}
          {tab === 'routine' && <RoutineTab />}
          {tab === 'fee' && <FeeTab />}
          {tab === 'certificate' && <CertificateTab />}
          {tab === 'suchana' && <NoticeHomeworkTab />}
          {tab === 'tracking' && <TrackingTab />}
          {tab === 'varga' && <VargaTab />}
        </div>
      </div>
    </div>
  );
};

export const PathshalaDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <PathshalaProvider workspaceId={activeWorkspace.id}>
      <PathshalaInner />
    </PathshalaProvider>
  );
};

export default PathshalaDesk;
