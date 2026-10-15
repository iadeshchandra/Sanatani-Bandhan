import React, { useEffect, useRef, useState } from 'react';
import { MathaProvider, useMatha } from './mathaStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { SannyasiTab } from './SannyasiTab';
import { ParamparaTab } from './ParamparaTab';
import { BranchesTab } from './BranchesTab';
import { DinacharyaTab } from './DinacharyaTab';
import { GurukulTab } from './GurukulTab';
import { SevaTab } from './SevaTab';
import { UtsavTab } from './UtsavTab';
import { DakshinaTab } from './DakshinaTab';
import { ReportsTab } from './ReportsTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Matha One — monastic management for Sangha/Matha and Ashram         */
/* workspaces. The sannyasi registry, parampara lineage, branches,    */
/* dinacharya, gurukul students, seva assignments, observances and    */
/* dakshina records live on this device; only treasury postings go    */
/* to the cloud ledger. Registered in workspaceRegistry for Sangha +  */
/* Ashram — the App.tsx org-type guard blocks it everywhere else.     */
/*                                                                     */
/* RESPECT RULE: this is a sacred institution's internal record. The   */
/* UI tone is respectful; nothing here is gamified — no badges, no    */
/* points, no streaks.                                                 */
/*                                                                     */
/* HONESTY RULE: donations post to treasury as income; 80G eligibility */
/* must be confirmed with the CA — the UI says so plainly.            */
/* ------------------------------------------------------------------ */

const TABS = [
  'dashboard',
  'sannyasi',
  'parampara',
  'branches',
  'dinacharya',
  'gurukul',
  'seva',
  'utsav',
  'dakshina',
  'reports',
];

const MathaInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useMatha();
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
      <div className="bg-gradient-to-r from-orange-900 via-amber-900 to-orange-900 text-orange-50 px-4 sm:px-6 py-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-400/20 border border-orange-300/40 flex items-center justify-center text-2xl">🕉️</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {t('suites.matha.common.title')}{' '}
              <span className="font-normal text-orange-200/90 text-sm">{t('suites.matha.common.management')}</span>
            </h1>
            <p className="text-xs text-orange-200/80">
              ॥ गुरुर्ब्रह्मा गुरुर्विष्णुः ॥ — {t('suites.matha.common.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50/70 px-4 py-3 text-xs text-orange-900 no-print">
          <span className="font-bold">⚖️ {t('suites.matha.common.honestyTitle')}: </span>
          {t('suites.matha.common.honestyBody')}
        </div>

        <Tabs tabs={TABS.map((id) => ({ id }))} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'sannyasi' && <SannyasiTab />}
          {tab === 'parampara' && <ParamparaTab />}
          {tab === 'branches' && <BranchesTab />}
          {tab === 'dinacharya' && <DinacharyaTab />}
          {tab === 'gurukul' && <GurukulTab />}
          {tab === 'seva' && <SevaTab />}
          {tab === 'utsav' && <UtsavTab />}
          {tab === 'dakshina' && <DakshinaTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
};

export const MathaDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <MathaProvider workspaceId={activeWorkspace.id}>
      <MathaInner />
    </MathaProvider>
  );
};

export default MathaDesk;
