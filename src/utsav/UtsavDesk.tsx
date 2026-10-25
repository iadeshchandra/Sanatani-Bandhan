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
import { WarRoomTab } from '../components/festival/WarRoomTab';
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
  { id: 'warroom', bn: 'ওয়ার রুম', en: 'War Room', hi: 'वार रूम' },
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड' },
  { id: 'festivals', bn: 'উৎসবসমূহ', en: 'Festivals', hi: 'उत्सव' },
  { id: 'budget', bn: 'বাজেট', en: 'Budget', hi: 'बजट' },
  { id: 'committee', bn: 'কমিটি', en: 'Committee', hi: 'समिति' },
  { id: 'vendors', bn: 'সরবরাহকারী', en: 'Vendors', hi: 'विक्रेता' },
  { id: 'program', bn: 'অনুষ্ঠানসূচি', en: 'Program', hi: 'कार्यक्रम' },
  { id: 'safety', bn: 'নিরাপত্তা', en: 'Safety', hi: 'सुरक्षा' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट' },
];

const UtsavInner: React.FC = () => {
  const [tab, setTab] = useState('warroom');
  const { ensureSeeded, cloudSync } = useUtsav();
  const { activeWorkspace } = useAuthWorkspace();
  const { t } = useLanguage();
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
              {t('ritual.utsav.title')}{' '}
              <span className="font-normal text-orange-200/90 text-sm">(Festival Management)</span>
            </h1>
            <p className="text-xs text-orange-200/80">
              ॥ उत्सवो हि परमानन्दः ॥ —{' '}
              {t('ritual.utsav.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50/70 px-4 py-3 text-xs text-orange-900 no-print">
          <span className="font-bold">📊 {t('ritual.utsav.honesty.title')}: </span>
          {t('ritual.utsav.honesty.body')}
        </div>

        {/* EVENTS P1 — team sharing status: the plan mirrors to the
            whole committee (utsav_stores); state it plainly. */}
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs text-emerald-900 no-print" role="status">
          {cloudSync.status === 'shared' && (
            <>🤝 <span className="font-bold">Shared with your committee.</span> This plan is saved for the whole samiti — any committee member opening Utsav on their own phone sees the same plan. Newest edit wins.</>
          )}
          {cloudSync.status === 'syncing' && (
            <>🤝 <span className="font-bold">Sharing…</span> Saving this plan for your committee.</>
          )}
          {cloudSync.status === 'too-large' && (
            <>⚠️ <span className="font-bold">This plan is very large.</span> It is kept safely on this device but is too large to share as one plan — the committee will not see the newest changes.</>
          )}
          {cloudSync.status === 'error' && (
            <>⚠️ <span className="font-bold">Sharing paused.</span> Your plan is safe on this device; the committee copy could not be updated just now and will catch up on the next change.</>
          )}
          {cloudSync.status === 'local' && (
            <>🤝 <span className="font-bold">Committee sharing is on.</span> Changes you make here are saved for the whole samiti, not only this phone.</>
          )}
        </div>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'warroom' && <WarRoomTab />}
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
