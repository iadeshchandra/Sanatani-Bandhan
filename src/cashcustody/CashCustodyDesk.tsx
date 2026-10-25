import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CashCustodyProvider, useCashCustody } from './cashCustodyStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { auditRecorder } from '../context/data/auditStore';
import { resolveActorName } from '../bahikhata/bahikhataStore';
import { recordCustodyEvent } from './custodyAuditBridge';
import { custodyCloudSync } from '../context/data/custodySyncFirestore';
import type { CustodyEvent } from './types';
import { Tabs } from './ui';
import { OfflineSevakStatus } from '../components/common/OfflineSevakStatus';
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
      // Demo seeds (sample boxes + staff) belong to DEMO_ workspaces
      // ONLY. A real mandir's first open must be an empty registry it
      // fills itself — sample custodians in a live money desk read as
      // real people and pollute the chain's first links.
      if (key.startsWith('DEMO_')) ensureSeeded();
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
        {/* VIBE B2 — the offline sevak strip: custody work queues on
            this device; its real state, in the user's language. */}
        <OfflineSevakStatus variant="bar" className="mb-4" />
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
  const { activeWorkspace, currentUser, currentRole, firebaseUser } = useAuthWorkspace();

  /* Blueprint A mirror: every custody event is also recorded into the
   * workspace's master audit stream (auditEvents) via the shared
   * recorder — see custodyAuditBridge.ts. The actor is the SIGNED-IN
   * user (rules bind actorUid to request.auth.uid; the Firebase uid
   * leads, exactly as DataContext / PublishedAccountsPanel resolve
   * it); the typed counting-room names stay inside the event details.
   * The recorder skips DEMO_ workspaces and actorless events itself,
   * and never throws — the counting room cannot break on its mirror. */
  const actorUid =
    (firebaseUser as { uid?: string } | null)?.uid || currentUser?.id || '';
  const actorName = resolveActorName(
    [currentUser?.fullName, currentUser?.name],
    currentUser?.email ||
      (firebaseUser as { email?: string } | null)?.email
  );
  const mirrorToMasterAudit = useCallback(
    (ev: CustodyEvent) => {
      recordCustodyEvent(auditRecorder, ev, {
        workspaceId: activeWorkspace.id,
        actorUid,
        actorName,
        actorRole: currentRole || '',
      });
    },
    [activeWorkspace.id, actorUid, actorName, currentRole]
  );

  return (
    <CashCustodyProvider
      workspaceId={activeWorkspace.id}
      onEvent={mirrorToMasterAudit}
      syncIdentity={{ uid: actorUid, name: actorName }}
      sync={custodyCloudSync}
    >
      <CashCustodyInner />
    </CashCustodyProvider>
  );
};

export default CashCustodyDesk;
