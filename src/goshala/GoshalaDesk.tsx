import React, { useEffect, useRef, useState } from 'react';
import { GoshalaProvider, useGoshala } from './goshalaStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { NandiTab } from './NandiTab';
import { SwasthyaTab } from './SwasthyaTab';
import { DugdhaTab } from './DugdhaTab';
import { CharaTab } from './CharaTab';
import { SponsorshipTab } from './SponsorshipTab';
import { RosterTab } from './RosterTab';
import { GrantTab } from './GrantTab';
import { VyayaTab } from './VyayaTab';
import { ReportTab } from './ReportTab';
import { BahiKhataDesk } from '../bahikhata/BahiKhataDesk';
import type { Nandi } from './types';
import './print.css';

/* Bahi-Khata Seva door (herd): the wrapper lives inside GoshalaProvider
   so herd dedupe sees the live herd and commit writes through the
   store's own mutator. */
const GoshalaBahiKhata: React.FC = () => {
  const { state, add, remove } = useGoshala();
  return (
    <BahiKhataDesk
      targets={['herd']}
      existingHerd={state.nandis}
      herdCommitter={(nandis: Nandi[]) => nandis.forEach((n) => add('nandis', n))}
      herdRemover={(ids: string[]) => ids.forEach((id) => remove('nandis', id))}
    />
  );
};

/* ------------------------------------------------------------------ */
/* Goshala One — complete goshala-operations suite for Goshala          */
/* workspaces. Locale-aware like every other desk: English default,     */
/* all 10 languages via LanguageContext t('suites.goshala.…'). Domain  */
/* terms stay Sanatani: Nandi / Vatsa / गौमाता / Dugdha / Chara / Vyaya.*/
/* Registered in workspaceRegistry for Goshala ONLY — the App.tsx      */
/* org-type guard blocks it everywhere else.                           */
/* ------------------------------------------------------------------ */

const TABS = [
  'dashboard', 'nandi', 'swasthya', 'dugdha', 'chara',
  'sponsorship', 'roster', 'grants', 'vyaya', 'reports',
];

const GoshalaInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useGoshala();
  const { activeWorkspace } = useAuthWorkspace();
  const { t } = useLanguage();
  const seededFor = useRef('');

  // Seed demo goshala data once per workspace.
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-2xl">🐄</div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-tight">
                {t('suites.goshala.common.deskTitle')}{' '}
                <span className="font-normal text-amber-200/90 text-sm">(Goshala One)</span>
              </h1>
              <p className="text-xs text-amber-200/80">
                ॥ गावो विश्वस्य मातरः ॥ —{' '}
                {t('suites.goshala.common.deskSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTab('bahikhata')}
            className={`self-start sm:self-auto sm:ml-auto shrink-0 min-h-[48px] px-4 py-2.5 rounded-2xl border font-black text-sm transition no-print ${
              tab === 'bahikhata'
                ? 'bg-amber-400 text-amber-950 border-amber-300'
                : 'bg-amber-400/15 text-amber-50 border-amber-300/40 hover:bg-amber-400/25'
            }`}
          >
            📖 Bahi-Khata Seva
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'nandi' && <NandiTab />}
          {tab === 'swasthya' && <SwasthyaTab />}
          {tab === 'dugdha' && <DugdhaTab />}
          {tab === 'chara' && <CharaTab />}
          {tab === 'sponsorship' && <SponsorshipTab />}
          {tab === 'roster' && <RosterTab />}
          {tab === 'grants' && <GrantTab />}
          {tab === 'vyaya' && <VyayaTab />}
          {tab === 'reports' && <ReportTab />}
          {tab === 'bahikhata' && <GoshalaBahiKhata />}
        </div>
      </div>
    </div>
  );
};

export const GoshalaDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <GoshalaProvider workspaceId={activeWorkspace.id}>
      <GoshalaInner />
    </GoshalaProvider>
  );
};

export default GoshalaDesk;
