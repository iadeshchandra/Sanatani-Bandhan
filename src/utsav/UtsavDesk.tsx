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
  { id: 'warroom' },
  { id: 'dashboard' },
  { id: 'festivals' },
  { id: 'budget' },
  { id: 'committee' },
  { id: 'vendors' },
  { id: 'program' },
  { id: 'safety' },
  { id: 'reports' },
];

const UtsavInner: React.FC = () => {
  const [tab, setTab] = useState('warroom');
  const { ensureSeeded } = useUtsav();
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
