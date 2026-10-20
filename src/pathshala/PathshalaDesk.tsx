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
/* desk: all UI strings resolve through t('suites.pathshala.…') with   */
/* English fallback. Domain terms stay Sanatani: Shishya / Guru /       */
/* Varga / Pathyakram (Tier B transliterations, never translated).     */
/* Registered in workspaceRegistry for Gurukul + Vidyalaya ONLY — the  */
/* App.tsx org-type guard blocks it everywhere else.                   */
/* ------------------------------------------------------------------ */

/* Tab ids are stable routing keys; display labels come from
   suites.pathshala.tabs.<id> so every language renders correctly. */
const TABS = [
  { id: 'dashboard', en: 'Dashboard' },
  { id: 'shishya', en: 'Shishya' },
  { id: 'upasthiti', en: 'Attendance' },
  { id: 'pariksha', en: 'Results' },
  { id: 'routine', en: 'Routines' },
  { id: 'fee', en: 'Fees' },
  { id: 'certificate', en: 'Certificates' },
  { id: 'suchana', en: 'Notice & HW' },
  { id: 'tracking', en: 'Tracking' },
  { id: 'varga', en: 'Varga & Subjects' },
];

const PathshalaInner: React.FC = () => {
  // QUEUED #48 — deep-link hand-off: the command palette's Attendance
  // action primes 'sb_pathshala_open_tab' in sessionStorage so the suite
  // opens directly on the requested tab (read once, then cleared).
  const [tab, setTab] = useState<string>(() => {
    try {
      const wanted = sessionStorage.getItem('sb_pathshala_open_tab');
      if (wanted) {
        sessionStorage.removeItem('sb_pathshala_open_tab');
        if (TABS.some((t) => t.id === wanted)) return wanted;
      }
    } catch {
      /* storage unavailable — open on the dashboard */
    }
    return 'dashboard';
  });
  const { ensureSeeded } = usePathshala();
  const { gurukulStudents } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { t } = useLanguage();
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
              {t('suites.pathshala.common.deskTitle')}{' '}
              <span className="font-normal text-amber-200/90 text-sm">{t('suites.pathshala.common.suiteTag')}</span>
            </h1>
            <p className="text-xs text-amber-200/80">
              {t('suites.pathshala.common.shloka')} —{' '}
              {t('suites.pathshala.common.subtitle')}
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
