import React, { useEffect, useRef, useState } from 'react';
import { YogaProvider, useYoga } from './yogaStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { BatchesTab } from './BatchesTab';
import { StudentsTab } from './StudentsTab';
import { AttendanceTab } from './AttendanceTab';
import { FeesTab } from './FeesTab';
import { InstructorsTab } from './InstructorsTab';
import { DiaryTab } from './DiaryTab';
import { ReportsTab } from './ReportsTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Yoga One — yoga shala management for Yoga and Ashram workspaces.   */
/* Batches, students, attendance, fees, instructors and the class diary */
/* live on this device; only treasury postings (fee income) go to the */
/* cloud ledger. Registered in workspaceRegistry for Yoga + Ashram —   */
/* the App.tsx org-type guard blocks it everywhere else.               */
/*                                                                     */
/* HONESTY RULE: class fees are generally not 80G-eligible — the UI     */
/* says so plainly. Health notes are private, device-local data.       */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड' },
  { id: 'batches', bn: 'ব্যাচ', en: 'Batches', hi: 'बैच' },
  { id: 'students', bn: 'শিক্ষার্থী', en: 'Students', hi: 'छात्र' },
  { id: 'attendance', bn: 'উপস্থিতি', en: 'Attendance', hi: 'उपस्थिति' },
  { id: 'fees', bn: 'ফি', en: 'Fees', hi: 'शुल्क' },
  { id: 'instructors', bn: 'প্রশিক্ষক', en: 'Instructors', hi: 'प्रशिक्षक' },
  { id: 'diary', bn: 'পাঠ-ডায়েরি', en: 'Class Diary', hi: 'पाठ डायरी' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट' },
];

const YogaInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useYoga();
  const { activeWorkspace } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const seededFor = useRef('');

  useEffect(() => {
    const key = activeWorkspace.id;
    if (seededFor.current !== key) {
      seededFor.current = key;
      ensureSeeded();
    }
  }, [activeWorkspace.id, ensureSeeded]);

  return (
    <div className="min-h-full bg-gradient-to-b from-emerald-50/60 via-stone-50 to-stone-100">
      <div className="bg-gradient-to-r from-emerald-900 via-green-900 to-emerald-900 text-emerald-50 px-4 sm:px-6 py-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center text-2xl">🧘</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('yoga.title', 'Yoga One', 'যোগা ওয়ান', 'योग वन')}{' '}
              <span className="font-normal text-emerald-200/90 text-sm">(Shala Management)</span>
            </h1>
            <p className="text-xs text-emerald-200/80">
              ॥ योगः कर्मसु कौशलम् ॥ —{' '}
              {safeTranslate('yoga.subtitle', 'Batches, students, attendance & fees — honestly managed', 'ব্যাচ, শিক্ষার্থী, উপস্থিতি ও ফি — সততার সঙ্গে পরিচালিত', 'बैच, छात्र, उपस्थिति व शुल्क — ईमानदारी से प्रबंधित')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900 no-print">
          <span className="font-bold">⚖️ {safeTranslate('yoga.honesty.title', 'Honest scope', 'সৎ পরিধি', 'ईमानदार दायरा')}: </span>
          {safeTranslate(
            'yoga.honesty.body',
            'Class fees are generally not 80G-eligible — confirm with your CA. Health notes are private and stay on this device. Attendance here is this device\u2019s record.',
            'ক্লাস ফি সাধারণত 80G-যোগ্য নয় — সিএ-এর সঙ্গে নিশ্চিত করুন। স্বাস্থ্য নোট ব্যক্তিগত, এই ডিভাইসেই থাকে। এখানকার উপস্থিতি এই ডিভাইসের রেকর্ড।',
            'कक्षा शुल्क सामान्यतः 80G-योग्य नहीं है — अपने CA से पुष्टि करें। स्वास्थ्य नोट निजी हैं और इसी डिवाइस पर रहते हैं। यहां की उपस्थिति इस डिवाइस का रिकॉर्ड है।'
          )}
        </div>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'batches' && <BatchesTab />}
          {tab === 'students' && <StudentsTab />}
          {tab === 'attendance' && <AttendanceTab />}
          {tab === 'fees' && <FeesTab />}
          {tab === 'instructors' && <InstructorsTab />}
          {tab === 'diary' && <DiaryTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
};

export const YogaDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <YogaProvider workspaceId={activeWorkspace.id}>
      <YogaInner />
    </YogaProvider>
  );
};

export default YogaDesk;
