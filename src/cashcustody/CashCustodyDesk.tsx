import React, { useEffect, useRef, useState } from 'react';
import { CashCustodyProvider, useCashCustody } from './cashCustodyStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { HundiTab } from './HundiTab';
import { CountingTab } from './CountingTab';
import { DepositTab } from './DepositTab';
import { ChainTab } from './ChainTab';
import { RosterTab } from './RosterTab';
import { ReportTab } from './ReportTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Mandir Cash Custody — hundi-to-bank chain of custody for Mandir and */
/* Trust/NGO workspaces. Dual-custody box openings, maker-checker      */
/* counting, SHA-256 hash-chained custody log, bank deposit slips,      */
/* counting-staff roster, trustee dashboard. Offline-first: custody     */
/* records stay on this device; only treasury postings go to cloud.    */
/* Registered in workspaceRegistry for Mandir + Trust + DharmadaTrust  */
/* — the App.tsx org-type guard blocks it everywhere else.             */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड' },
  { id: 'hundi', bn: 'হুন্ডি', en: 'Hundi Boxes', hi: 'हुंडी पेटी' },
  { id: 'counting', bn: 'গণনা', en: 'Counting', hi: 'गणना' },
  { id: 'deposit', bn: 'জমা', en: 'Deposits', hi: 'जमा' },
  { id: 'chain', bn: 'শৃঙ্খল', en: 'Custody Log', hi: 'अभिरक्षा लॉग' },
  { id: 'roster', bn: 'কর্মী', en: 'Staff Roster', hi: 'कर्मचारी' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट' },
];

const CashCustodyInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useCashCustody();
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
    <div className="min-h-full bg-gradient-to-b from-amber-50/60 via-stone-50 to-stone-100">
      <div className="bg-gradient-to-r from-amber-900 via-orange-900 to-amber-900 text-amber-50 px-4 sm:px-6 py-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-2xl">🔐</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('cashcustody.title', 'Cash Custody', 'নগদ হেফাজত', 'नकद अभिरक्षा')}{' '}
              <span className="font-normal text-amber-200/90 text-sm">(Hundi → Bank)</span>
            </h1>
            <p className="text-xs text-amber-200/80">
              ॥ सत्यमेव जयते ॥ —{' '}
              {safeTranslate('cashcustody.subtitle', 'Dual-custody counting, tamper-evident log', 'দ্বৈত-হেফাজতে গণনা', 'द्वि-अभिरक्षा गणना')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'hundi' && <HundiTab />}
          {tab === 'counting' && <CountingTab />}
          {tab === 'deposit' && <DepositTab />}
          {tab === 'chain' && <ChainTab />}
          {tab === 'roster' && <RosterTab />}
          {tab === 'reports' && <ReportTab />}
        </div>
      </div>
    </div>
  );
};

export const CashCustodyDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <CashCustodyProvider workspaceId={activeWorkspace.id}>
      <CashCustodyInner />
    </CashCustodyProvider>
  );
};

export default CashCustodyDesk;
