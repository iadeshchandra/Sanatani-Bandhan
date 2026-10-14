import React, { useEffect, useRef, useState } from 'react';
import { UtsavProvider, useUtsav } from './utsavStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { FestivalsTab } from './FestivalsTab';
import { BudgetTab } from './BudgetTab';
import { CommitteeTab } from './CommitteeTab';
import { VendorsTab } from './VendorsTab';
import { ProgramTab } from './ProgramTab';
import { SafetyTab } from './SafetyTab';
import { ReportsTab } from './ReportsTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Utsav One — Mahotsav Samiti festival management for Mahotsav       */
/* Samiti and Mandir workspaces. Festival registry, budget planner    */
/* (planned vs actual), committee & task roster, vendor management,   */
/* program schedule, crowd & safety checklist, utilisation            */
/* certificate. Offline-first: festival records stay on this device;  */
/* only treasury postings (festival income/expenses, vendor payments)  */
/* go to the cloud ledger. Registered in workspaceRegistry for        */
/* Mahotsav Samiti + Mandir — the App.tsx org-type guard blocks it    */
/* everywhere else.                                                   */
/*                                                                     */
/* HONESTY RULE: planned-vs-actual is a management view, not audited  */
/* accounts. The UC is the samiti's own summary — confirm figures     */
/* with the koshadhyaksh / CA.                                        */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड' },
  { id: 'festivals', bn: 'উৎসব', en: 'Festivals', hi: 'उत्सव' },
  { id: 'budget', bn: 'বাজেট', en: 'Budget', hi: 'बजट' },
  { id: 'committee', bn: 'সমিতি', en: 'Committee', hi: 'समिति' },
  { id: 'vendors', bn: 'বিক্রেতা', en: 'Vendors', hi: 'विक्रेता' },
  { id: 'program', bn: 'কার্যক্রম', en: 'Program', hi: 'कार्यक्रम' },
  { id: 'safety', bn: 'নিরাপত্তা', en: 'Safety', hi: 'सुरक्षा' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट' },
];

const UtsavInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useUtsav();
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
    <div className="min-h-full bg-gradient-to-b from-orange-50/60 via-stone-50 to-stone-100">
      <div className="bg-gradient-to-r from-orange-900 via-red-900 to-orange-900 text-orange-50 px-4 sm:px-6 py-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-400/20 border border-orange-300/40 flex items-center justify-center text-2xl">🪔</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('utsav.title', 'Utsav One', 'উৎসব ওয়ান', 'उत्सव वन')}{' '}
              <span className="font-normal text-orange-200/90 text-sm">(Festival Management)</span>
            </h1>
            <p className="text-xs text-orange-200/80">
              ॥ उत्सवो हि परमानन्दः ॥ —{' '}
              {safeTranslate('utsav.subtitle', 'Budgets, committees, vendors & crowds — honestly managed', 'বাজেট, সমিতি, বিক্রেতা ও ভিড় — সততার সঙ্গে পরিচালিত', 'बजट, समिति, विक्रेता व भीड़ — ईमानदारी से प्रबंधित')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50/70 px-4 py-3 text-xs text-orange-900 no-print">
          <span className="font-bold">📊 {safeTranslate('utsav.honesty.title', 'Honest scope', 'সৎ পরিধি', 'ईमानदार दायरा')}: </span>
          {safeTranslate(
            'utsav.honesty.body',
            'Planned-vs-actual is a management view, not audited accounts. The utilisation certificate is the samiti\u2019s own summary for donors — confirm final figures with your koshadhyaksh / CA.',
            'পরিকল্পিত বনাম প্রকৃত একটি পরিচালন দৃশ্য, নিরীক্ষিত হিসাব নয়। ব্যবহার-শংসাপত্র দাতাদের জন্য সমিতির নিজস্ব সারসংক্ষেপ — চূড়ান্ত অঙ্ক কোষাধ্যক্ষ/সিএ-এর সঙ্গে নিশ্চিত করুন।',
            'योजनाबद्ध बनाम वास्तविक एक प्रबंधन दृश्य है, अंकेक्षित खाते नहीं। उपयोग-प्रमाणपत्र दाताओं के लिए समिति का अपना सारांश है — अंतिम आंकड़े अपने कोषाध्यक्ष/CA से पुष्टि करें।'
          )}
        </div>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'festivals' && <FestivalsTab />}
          {tab === 'budget' && <BudgetTab />}
          {tab === 'committee' && <CommitteeTab />}
          {tab === 'vendors' && <VendorsTab />}
          {tab === 'program' && <ProgramTab />}
          {tab === 'safety' && <SafetyTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
};

export const UtsavDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <UtsavProvider workspaceId={activeWorkspace.id}>
      <UtsavInner />
    </UtsavProvider>
  );
};

export default UtsavDesk;
